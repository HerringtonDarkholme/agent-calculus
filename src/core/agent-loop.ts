import type {
  Context,
  Entity,
  Harness,
  ToolCallAction,
  World,
  ChatResult,
} from "./types.js";
import { invokeLLM, type LLMConfig } from "../llm/provider.js";
import {
  getEntityContent,
  createAssistantTextMessage,
  createAssistantToolCall,
} from "./entity.js";
import { appendEntity } from "./context.js";
import { randomUUID } from "crypto";

// =============================================================================
// Agent Loop
// =============================================================================

export interface AgentLoopOptions {
  /** Initial context */
  context: Context;
  /** World state */
  world: World;
  /** Harness for load/execute */
  harness: Harness;
  /** Available tools */
  tools: import("./types.js").AnyTool[];
  /** Available entities for loading */
  availableEntities: Entity[];
  /** LLM configuration */
  llmConfig: LLMConfig;
  /** New entities to process (e.g., user input, slash command results, etc.) */
  newEntities: Entity[];
  /** Maximum number of LLM calls (iterations) allowed */
  maxTurns?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface AgentLoopResult {
  /** Final response */
  response: string;
  /** Tool calls made during execution */
  toolCalls: ChatResult["toolCalls"];
  /** Updated context */
  context: Context;
  /** Updated world */
  world: World;
}

/**
 * Execute the core agent loop.
 *
 * This is the fundamental agent algorithm:
 * while (true):
 *   1. LOAD: Pack entities into context
 *   2. REASON: LLM processes and generates actions
 *   3. EXECUTE: Run tools in world
 *   4. If no tool call, return response
 *
 * This function is pure and reusable - it can be called by:
 * - Agent.chat() for normal agent execution
 * - Subagent tool for spawning sub-agents
 * - Any other pattern that needs the agent loop
 */
export async function runAgentLoop(options: AgentLoopOptions): Promise<AgentLoopResult> {
  const {
    context: initialContext,
    world: initialWorld,
    harness,
    tools,
    availableEntities,
    llmConfig,
    newEntities,
    maxTurns,
    debug = false,
  } = options;

  const log = (...args: unknown[]) => {
    if (debug) {
      console.log("[AgentLoop]", ...args);
    }
  };

  log(`Processing ${newEntities.length} new entities`);
  if (maxTurns !== undefined) {
    log(`Max turns: ${maxTurns}`);
  }

  let ctx = initialContext;
  let world = initialWorld;
  const toolCallsMade: ChatResult["toolCalls"] = [];
  let turnCount = 0;

  // Load new entities (harness will filter and add to context + messages)
  ctx = await harness.load(ctx, newEntities, availableEntities);

  // Agent loop: process until we get a response (no tool call)
  while (true) {
    // Check max turns limit
    if (maxTurns !== undefined && turnCount >= maxTurns) {
      log(`Max turns (${maxTurns}) reached, stopping`);
      const truncatedResponse =
        `[Agent stopped after ${maxTurns} turns]\n\n` +
        `The agent reached the maximum number of allowed turns without completing the task. ` +
        `This may indicate the task is too complex or the turn limit is too low.`;

      // Add a final assistant message entity indicating truncation
      const truncationEntity = createAssistantTextMessage(truncatedResponse);
      ctx = await appendEntity(ctx, truncationEntity);

      return {
        response: truncatedResponse,
        toolCalls: toolCallsMade,
        context: ctx,
        world,
      };
    }

    turnCount++;
    log(`Turn ${turnCount}${maxTurns !== undefined ? `/${maxTurns}` : ""}`);

    // REASONING PHASE
    log("Invoking LLM...");
    const llmResponse = await invokeLLM(ctx, tools, llmConfig);

    log(`LLM text: ${llmResponse.text.slice(0, 100)}...`);
    log(`Tool calls: ${llmResponse.toolCalls.length}`);

    // If no tool calls, just a text response - we're done
    if (llmResponse.toolCalls.length === 0) {
      log("No tool calls, returning response");

      // Add assistant message entity to context
      const assistantEntity = createAssistantTextMessage(llmResponse.text);
      ctx = await appendEntity(ctx, assistantEntity);

      return {
        response: llmResponse.text,
        toolCalls: toolCallsMade,
        context: ctx,
        world,
      };
    }

    // LLM made tool calls - create entities for assistant message with tool calls
    // Use a message group ID to group text and tool calls into one message
    const messageGroupId = randomUUID();

    // Add assistant text entity
    const assistantTextEntity = createAssistantTextMessage(llmResponse.text, { messageGroupId });
    ctx = await appendEntity(ctx, assistantTextEntity);

    // Add tool call entities (all part of the same message group)
    for (const toolCall of llmResponse.toolCalls) {
      const toolCallEntity = createAssistantToolCall(
        toolCall.toolCallId,
        toolCall.toolName,
        toolCall.args,
        messageGroupId
      );
      ctx = await appendEntity(ctx, toolCallEntity);
    }

    // EXECUTION PHASE - execute all tool calls
    for (const toolCall of llmResponse.toolCalls) {
      log(`Executing tool: ${toolCall.toolName}`);

      const action: ToolCallAction = {
        type: "tool_call",
        name: toolCall.toolName,
        args: toolCall.args,
        toolCallId: toolCall.toolCallId,
      };

      // Execute the tool
      const result = await harness.execute(action, world, tools);

      // Update world
      world = result.world;

      // Get the actual content (evaluates if dynamic)
      const resultContent = await getEntityContent(result.entity, "full");

      // Track the tool call
      toolCallsMade.push({
        tool: toolCall.toolName,
        args: toolCall.args,
        result: resultContent,
      });

      // Store result as entity (which includes message metadata for conversion)
      ctx = await appendEntity(ctx, result.entity);

      log(`Tool result: ${resultContent.slice(0, 100)}...`);
    }

    // Continue loop to process tool results
  }
}
