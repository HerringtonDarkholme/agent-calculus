import type { CoreMessage, ToolResultPart } from "ai";
import type { Context, Entity, LoadedEntity, Verbosity } from "./types.js";
import { estimateEntityTokens, getEntityContent } from "./entity.js";

// =============================================================================
// Context Implementation
// =============================================================================

/**
 * Create a new empty context.
 */
export function createContext(maxTokens: number = 128000): Context {
  return {
    entities: [],
    maxTokens,
    currentTokens: 0,
  };
}

/**
 * Append an entity to context.
 * Returns a new context (immutable).
 */
export function appendEntity(
  ctx: Context,
  entity: Entity,
  verbosity: Verbosity = "full"
): Context {
  const tokens = estimateEntityTokens(entity, verbosity);

  const loadedEntity: LoadedEntity = {
    entity,
    verbosity,
    tokens,
  };

  return {
    ...ctx,
    entities: [...ctx.entities, loadedEntity],
    currentTokens: ctx.currentTokens + tokens,
  };
}

/**
 * Check if context has space for additional tokens.
 */
export function hasSpace(ctx: Context, tokens: number): boolean {
  return ctx.currentTokens + tokens <= ctx.maxTokens;
}

/**
 * Get context utilization as a percentage.
 */
export function getUtilization(ctx: Context): number {
  return ctx.currentTokens / ctx.maxTokens;
}

/**
 * Remove an entity from context by ID.
 */
export function removeEntity(ctx: Context, entityId: string): Context {
  const entities = ctx.entities.filter((e) => e.entity.id !== entityId);
  const currentTokens = entities.reduce((sum, e) => sum + (e.tokens ?? 0), 0);

  return {
    ...ctx,
    entities,
    currentTokens,
  };
}

/**
 * Update verbosity of an entity in context.
 */
export function updateVerbosity(
  ctx: Context,
  entityId: string,
  verbosity: Verbosity
): Context {
  const entities = ctx.entities.map((e) => {
    if (e.entity.id === entityId) {
      const tokens = estimateEntityTokens(e.entity, verbosity);
      return { ...e, verbosity, tokens };
    }
    return e;
  });

  const currentTokens = entities.reduce((sum, e) => sum + (e.tokens ?? 0), 0);

  return {
    ...ctx,
    entities,
    currentTokens,
  };
}

// =============================================================================
// Message Conversion
// =============================================================================

/**
 * Convert context to messages for Vercel AI SDK.
 *
 * Groups entities by their role and handles tool results specially.
 */
export function contextToMessages(ctx: Context): CoreMessage[] {
  const messages: CoreMessage[] = [];
  let currentToolResults: Array<{ entity: Entity; verbosity: Verbosity }> = [];

  for (const { entity, verbosity } of ctx.entities) {
    const content = getEntityContent(entity, verbosity);
    const role = entity.metadata.role ?? "user";

    // Handle tool results specially - they need to be grouped with their call ID
    if (entity.metadata.type === "tool_result") {
      currentToolResults.push({ entity, verbosity });
      continue;
    }

    // If we have pending tool results and hit a non-tool-result, flush them
    if (currentToolResults.length > 0) {
      messages.push(createToolResultMessage(currentToolResults));
      currentToolResults = [];
    }

    // Handle assistant messages with tool calls
    if (entity.metadata.type === "assistant_with_tools" && entity.data?.toolCalls) {
      messages.push({
        role: "assistant",
        content: [
          { type: "text", text: content },
          ...entity.data.toolCalls.map((tc) => ({
            type: "tool-call" as const,
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            args: tc.args,
          })),
        ],
      });
      continue;
    }

    // Handle based on role
    switch (role) {
      case "system":
        messages.push({
          role: "system",
          content,
        });
        break;
      case "user":
        messages.push({
          role: "user",
          content,
        });
        break;
      case "assistant":
        messages.push({
          role: "assistant",
          content,
        });
        break;
    }
  }

  // Flush any remaining tool results
  if (currentToolResults.length > 0) {
    messages.push(createToolResultMessage(currentToolResults));
  }

  return messages;
}

/**
 * Create a tool result message from accumulated tool results.
 */
function createToolResultMessage(
  results: Array<{ entity: Entity; verbosity: Verbosity }>
): CoreMessage {
  const toolResults: ToolResultPart[] = results.map(({ entity, verbosity }) => {
    const content = getEntityContent(entity, verbosity);
    // Extract tool call ID from entity ID (format: tool-result-{toolCallId})
    const toolCallId = entity.id.replace("tool-result-", "");

    return {
      type: "tool-result" as const,
      toolCallId,
      toolName: "", // Will be filled by the SDK
      result: content,
    };
  });

  return {
    role: "tool",
    content: toolResults,
  };
}

// =============================================================================
// Context Queries
// =============================================================================

/**
 * Find an entity in context by ID.
 */
export function findEntity(ctx: Context, entityId: string): LoadedEntity | undefined {
  return ctx.entities.find((e) => e.entity.id === entityId);
}

/**
 * Get all entities of a specific type.
 */
export function getEntitiesByType(ctx: Context, type: string): LoadedEntity[] {
  return ctx.entities.filter((e) => e.entity.metadata.type === type);
}

/**
 * Get the last entity added to context.
 */
export function getLastEntity(ctx: Context): LoadedEntity | undefined {
  return ctx.entities[ctx.entities.length - 1];
}

/**
 * Count entities in context.
 */
export function countEntities(ctx: Context): number {
  return ctx.entities.length;
}
