import { z } from "zod";
import type { AnyTool, World, ToolExecutionResult } from "../../core/types.js";
import { Agent } from "../../core/agent.js";

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
        const { task, system_prompt, max_turns: _max_turns = 10 } = params;

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
        }

        // Note: max_turns is accepted but not enforced in current implementation
        // The agent.chat() method runs until it gets a response (no tool call)
        // Future enhancement: add turn limit enforcement

        // Create subagent with reduced context size
        const subagentMaxTokens = Math.floor(parentMaxTokens / 2);
        const systemPrompt = system_prompt ?? defaultSystemPrompt;

        // Create the subagent manually to have more control
        const subagent = new Agent({
          systemPrompt,
          workingDirectory: world.workingDirectory,
          maxTokens: subagentMaxTokens,
          tools: availableTools,
          debug,
        });

        // Initialize the subagent
        await subagent.initialize();

        if (debug) {
          console.log(`[Subagent] Initialized with maxTokens: ${subagentMaxTokens}`);
        }

        // Run the subagent with turn limit
        let turnCount = 0;
        let lastResponse = "";

        // We'll run a simple loop: send the task once
        // The agent.chat() already handles the full loop until response
        const result = await subagent.chat(task);
        lastResponse = result.response;
        turnCount = result.toolCalls.length + 1; // Approximate turn count

        if (debug) {
          console.log(`[Subagent] Completed in ${turnCount} turns`);
          console.log(`[Subagent] Tool calls: ${result.toolCalls.length}`);
        }

        // Build result summary
        const toolCallsSummary =
          result.toolCalls.length > 0
            ? `\n\nTools used: ${result.toolCalls.map((tc) => tc.tool).join(", ")}`
            : "";

        const finalResult = `Subagent completed task.\n\nResponse:\n${lastResponse}${toolCallsSummary}`;

        currentDepth--;

        return {
          result: finalResult,
          world,
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
