import type {
  Context,
  Entity,
  Harness,
  Tool,
  ToolCallAction,
  Verbosity,
  World,
} from "./types.js";
import { BuiltInEntityTypes } from "./types.js";
import { appendEntity, getUtilization, updateVerbosity } from "./context.js";
import { createToolResult } from "./entity.js";

// =============================================================================
// Harness Configuration
// =============================================================================

export interface HarnessConfig {
  /** Context utilization threshold for compression (default: 0.8) */
  compressionThreshold?: number;
  /** Default verbosity for new entities */
  defaultVerbosity?: Verbosity;
  /** Enable debug logging */
  debug?: boolean;
}

const DEFAULT_CONFIG: Required<HarnessConfig> = {
  compressionThreshold: 0.8,
  defaultVerbosity: "full",
  debug: false,
};

// =============================================================================
// Harness Implementation
// =============================================================================

/**
 * Create a new Harness instance.
 *
 * The Harness is the orchestration layer that manages:
 * 1. Loading entities into context (load function)
 * 2. Executing actions in the world (execute function)
 */
export function createHarness(config?: HarnessConfig): Harness {
  const { compressionThreshold, defaultVerbosity, debug } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  function log(...args: unknown[]): void {
    if (debug) {
      console.log("[Harness]", ...args);
    }
  }

  return {
    /**
     * Load entities into context and rebuild messages.
     *
     * Responsibilities:
     * 1. Filter: Select only relevant entities
     * 2. Compress: Choose appropriate verbosity levels
     * 3. Order: Arrange entities optimally
     * 4. Evict: Remove/compress old entities if context is full
     *
     * @param ctx - Current context
     * @param newEntity - New entity to incorporate (or null)
     * @param availableEntities - Pool of available entities
     * @returns Updated context
     */
    load(
      ctx: Context,
      newEntity: Entity | null,
      availableEntities: Entity[]
    ): Context {
      log("Loading entities into context");
      log(`  Current utilization: ${(getUtilization(ctx) * 100).toFixed(1)}%`);

      let updatedCtx = ctx;

      // Step 1: Check if we need to compress existing entities
      if (getUtilization(updatedCtx) > compressionThreshold) {
        log("  Context utilization high, compressing old entities");
        updatedCtx = compressOldEntities(updatedCtx);
      }

      // Step 2: Load preloaded entities that aren't already in context
      for (const entity of availableEntities) {
        if (entity.metadata.loading === "preloaded") {
          const alreadyLoaded = updatedCtx.entities.some(
            (e) => e.entity.id === entity.id
          );
          if (!alreadyLoaded) {
            log(`  Loading preloaded entity: ${entity.metadata.type}`);
            updatedCtx = appendEntity(updatedCtx, entity, defaultVerbosity);
          }
        }
      }

      // Step 3: Add the new entity if provided
      if (newEntity) {
        log(`  Adding new entity: ${newEntity.metadata.type}`);

        // Choose verbosity based on context utilization
        let verbosity = defaultVerbosity;
        if (getUtilization(updatedCtx) > compressionThreshold) {
          // Use summary if available and context is getting full
          if (newEntity.content.summary) {
            verbosity = "summary";
          }
        }

        updatedCtx = appendEntity(updatedCtx, newEntity, verbosity);
      }

      // Step 4: Load dynamically discovered entities based on relevance
      // (For now, we skip this - will be implemented in skills pattern)

      log(`  Final utilization: ${(getUtilization(updatedCtx) * 100).toFixed(1)}%`);
      return updatedCtx;
    },

    /**
     * Execute an action in the world.
     *
     * @param action - Tool call action to execute
     * @param world - Current world state
     * @param tools - Available tools
     * @returns Result entity and updated world
     */
    async execute(
      action: ToolCallAction,
      world: World,
      tools: Tool[]
    ): Promise<{ entity: Entity; world: World }> {
      log(`Executing tool: ${action.name}`);

      // Find the tool
      const tool = tools.find((t) => t.name === action.name);
      if (!tool) {
        log(`  Tool not found: ${action.name}`);
        const errorEntity = createToolResult(
          action.name,
          action.toolCallId,
          `Error: Tool "${action.name}" not found`,
          { summary: `Error: Tool not found` }
        );
        return { entity: errorEntity, world };
      }

      try {
        // Execute the tool
        const result = await tool.execute(action.args, world);

        if (!result.success) {
          log(`  Tool execution failed: ${result.error}`);
          const errorEntity = createToolResult(
            action.name,
            action.toolCallId,
            `Error: ${result.error}`,
            { summary: `Error: ${result.error}` }
          );
          return { entity: errorEntity, world: result.world };
        }

        log(`  Tool executed successfully`);

        // Create result entity with summary
        const resultStr =
          typeof result.result === "string"
            ? result.result
            : JSON.stringify(result.result, null, 2);

        // Generate summary for large results
        let summary: string | undefined;
        if (resultStr.length > 500) {
          summary = resultStr.slice(0, 200) + "... [truncated]";
        }

        const resultEntity = createToolResult(
          action.name,
          action.toolCallId,
          result.result,
          { summary }
        );

        return { entity: resultEntity, world: result.world };
      } catch (error) {
        log(`  Tool execution error:`, error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorEntity = createToolResult(
          action.name,
          action.toolCallId,
          `Error: ${errorMessage}`,
          { summary: `Error: ${errorMessage}` }
        );
        return { entity: errorEntity, world };
      }
    },
  };
}

// =============================================================================
// Context Compression
// =============================================================================

/**
 * Compress old entities in context to free up space.
 *
 * Strategy:
 * 1. Find tool_result entities older than the last 3
 * 2. Reduce their verbosity to summary or digest
 */
function compressOldEntities(ctx: Context): Context {
  let updatedCtx = ctx;

  // Get tool result entities
  const toolResults = ctx.entities
    .map((e, i) => ({ ...e, index: i }))
    .filter((e) => e.entity.metadata.type === BuiltInEntityTypes.TOOL_RESULT);

  // Keep the last 3 tool results at full verbosity, compress the rest
  const toCompress = toolResults.slice(0, -3);

  for (const { entity, verbosity } of toCompress) {
    if (verbosity === "full" && entity.content.summary) {
      updatedCtx = updateVerbosity(updatedCtx, entity.id, "summary");
    } else if (verbosity === "summary" && entity.content.digest) {
      updatedCtx = updateVerbosity(updatedCtx, entity.id, "digest");
    }
  }

  return updatedCtx;
}

// =============================================================================
// Entity Discovery (for future use with skills)
// =============================================================================

/**
 * Discover relevant entities based on user input.
 * This is a placeholder for semantic/keyword matching.
 */
export function discoverRelevantEntities(
  userInput: string,
  availableEntities: Entity[]
): Entity[] {
  const relevant: Entity[] = [];

  for (const entity of availableEntities) {
    const discovery = entity.metadata.discovery;
    if (!discovery) continue;

    // Keyword matching
    if (discovery.keywords) {
      const inputLower = userInput.toLowerCase();
      const matches = discovery.keywords.some((kw) =>
        inputLower.includes(kw.toLowerCase())
      );
      if (matches) {
        relevant.push(entity);
      }
    }
  }

  return relevant;
}
