import { z } from "zod";
import type { AnyTool, World, ToolExecutionResult, Entity } from "../../core/types.js";
import { runAgentLoop } from "../../core/agent-loop.js";
import { createContext } from "../../core/context.js";
import { createHarness } from "../../core/harness.js";
import { createSystemPrompt, createEntity } from "../../core/entity.js";

// =============================================================================
// Subagent Tool
// =============================================================================

export interface SubagentToolOptions {
  /** Default system prompt for subagents */
  defaultSystemPrompt?: string;
  /** Maximum context size for parent agent */
  parentMaxTokens: number;
  /** Tools available to subagents */
  availableTools: AnyTool[];
  /** Maximum recursion depth (default: 3) */
  maxDepth?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Create a spawn_subagent tool.
 *
 * This tool allows the agent to spawn sub-agents for specific tasks.
 * Subagents run independently and return their final response.
 *
 * @param options - Configuration options for the subagent tool
 * @returns The spawn_subagent tool
 */
export function createSubagentTool(options: SubagentToolOptions): AnyTool {
  const {
    defaultSystemPrompt = "You are a helpful assistant. Complete the given task concisely.",
    parentMaxTokens,
    availableTools,
    maxDepth = 3,
    debug = false,
  } = options;

  // Track current recursion depth using world state
  let currentDepth = 0;

  return {
    name: "spawn_subagent",
    description:
      "Spawn a sub-agent to handle a specific task independently. " +
      "The sub-agent will work on the task and return its final response. " +
      "Use this for complex tasks that benefit from focused, isolated processing. " +
      "The sub-agent has access to the same tools as you.",
    parameters: z.object({
      task: z
        .string()
        .describe(
          "The task for the sub-agent to complete. Be specific and clear about what you want."
        ),
      system_prompt: z
        .string()
        .optional()
        .describe(
          "Optional custom system prompt for the sub-agent. Use this to give the sub-agent specific context or instructions."
        ),
      max_turns: z
        .number()
        .optional()
        .describe(
          "Maximum number of turns (LLM calls) the sub-agent can make. Default is 10."
        ),
    }),
    async execute(
      params: { task: string; system_prompt?: string; max_turns?: number },
      world: World
    ): Promise<ToolExecutionResult> {
      try {
        const { task, system_prompt, max_turns = 10 } = params;

        // Check recursion depth
        currentDepth++;
        if (currentDepth > maxDepth) {
          currentDepth--;
          return {
            result: `Error: Maximum subagent recursion depth (${maxDepth}) exceeded. Cannot spawn more subagents.`,
            world,
            success: false,
            error: "Maximum recursion depth exceeded",
          };
        }

        if (debug) {
          console.log(`[Subagent] Spawning at depth ${currentDepth} for task: ${task.slice(0, 50)}...`);
          console.log(`[Subagent] Max turns: ${max_turns}`);
        }

        // Create subagent context with reduced size
        const subagentMaxTokens = Math.floor(parentMaxTokens / 2);
        const systemPrompt = system_prompt ?? defaultSystemPrompt;

        if (debug) {
          console.log(`[Subagent] Creating context with maxTokens: ${subagentMaxTokens}`);
        }

        // Create fresh context for subagent
        const subagentContext = createContext(subagentMaxTokens);

        // Create harness for subagent
        const subagentHarness = createHarness({ debug });

        // Create system prompt entity
        const systemPromptEntity = createSystemPrompt(systemPrompt);

        // Create tool description entities
        const toolEntities: Entity[] = availableTools.map((tool) => ({
          id: `tool-desc-${tool.name}`,
          content: {
            full: `Tool: ${tool.name}\nDescription: ${tool.description}`,
            summary: `${tool.name}: ${tool.description.slice(0, 50)}...`,
          },
          metadata: {
            type: "tool_description",
            loading: "preloaded" as const,
            priority: 50,
            role: "system" as const,
            createdAt: Date.now(),
          },
        }));

        // Available entities for the subagent
        const subagentEntities = [systemPromptEntity, ...toolEntities];

        // Load preloaded entities into subagent context
        let initializedContext = await subagentHarness.load(
          subagentContext,
          [],
          subagentEntities
        );

        if (debug) {
          console.log(`[Subagent] Context initialized, running agent loop`);
        }

        // Create user input entity for the task
        const taskEntity = createEntity({
          content: task,
          type: "user_input",
          loading: "dynamic",
          summary: task.slice(0, 50),
          role: "user",
        });

        // Run the agent loop (reusing the same loop as the main agent!)
        const result = await runAgentLoop({
          context: initializedContext,
          world,
          harness: subagentHarness,
          tools: availableTools,
          availableEntities: subagentEntities,
          llmConfig: {}, // Use default model
          newEntities: [taskEntity],
          maxTurns: max_turns, // Enforce turn limit
          debug,
        });

        if (debug) {
          console.log(`[Subagent] Completed`);
          console.log(`[Subagent] Tool calls: ${result.toolCalls.length}`);
        }

        // Build result summary
        const toolCallsSummary =
          result.toolCalls.length > 0
            ? `\n\nTools used: ${result.toolCalls.map((tc) => tc.tool).join(", ")}`
            : "";

        const finalResult = `Subagent completed task.\n\nResponse:\n${result.response}${toolCallsSummary}`;

        currentDepth--;

        return {
          result: finalResult,
          world: result.world, // Return updated world from subagent
          success: true,
        };
      } catch (error) {
        currentDepth--;
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (debug) {
          console.error(`[Subagent] Error:`, error);
        }
        return {
          result: `Error spawning subagent: ${errorMessage}`,
          world,
          success: false,
          error: errorMessage,
        };
      }
    },
  };
}
