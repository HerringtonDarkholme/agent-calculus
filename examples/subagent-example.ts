#!/usr/bin/env tsx

/**
 * Example: Subagent Pattern
 *
 * This example demonstrates how to:
 * 1. Create a spawn_subagent tool
 * 2. Use subagents to handle specific subtasks
 * 3. Compose complex workflows by delegating to subagents
 */

import {
  createAgent,
  createSubagentTool,
  fileTools,
} from "../src/index.js";

// =============================================================================
// Create Agent with Subagent Tool
// =============================================================================

const SYSTEM_PROMPT = `You are a helpful assistant that can delegate work to subagents.

When you encounter a complex task that has distinct subtasks, you can:
1. Break it down into smaller tasks
2. Use spawn_subagent to handle each subtask independently
3. Combine the results

For example:
- If asked to analyze multiple files, spawn a subagent for each file
- If asked to research and then write, spawn one subagent to research and another to write
- If a task requires specialized focus, spawn a subagent with a custom system prompt

Use spawn_subagent when delegation makes the task clearer and more organized.`;

async function main() {
  console.log("=".repeat(60));
  console.log("Subagent Example - Delegation Pattern");
  console.log("=".repeat(60));
  console.log();

  // Create subagent tool
  const subagentTool = createSubagentTool({
    defaultSystemPrompt: "You are a focused assistant. Complete the given task concisely.",
    parentMaxTokens: 128000,
    availableTools: fileTools, // Subagents can use file tools
    maxDepth: 2, // Allow up to 2 levels of nesting
    debug: true,
  });

  // Combine with file tools
  const allTools = [...fileTools, subagentTool];

  // Create agent
  const agent = await createAgent({
    systemPrompt: SYSTEM_PROMPT,
    workingDirectory: process.cwd(),
    maxTokens: 128000,
    tools: allTools,
    debug: false,
  });

  console.log("Created agent with spawn_subagent tool\n");
  console.log("=".repeat(60));

  // Example 1: Simple delegation
  console.log("\nExample 1: Delegate a specific calculation\n");
  const result1 = await agent.chat(
    "I need you to calculate the fibonacci sequence up to 10 numbers. " +
      "Please spawn a subagent to handle this calculation."
  );
  console.log("Agent:", result1.response);
  console.log("\nTool calls made:", result1.toolCalls.length);

  // Example 2: Multiple subagents for parallel work
  console.log("\n" + "=".repeat(60));
  console.log("\nExample 2: Spawn subagents for analysis\n");
  const result2 = await agent.chat(
    "I want to understand this project. Please:\n" +
      "1. Spawn a subagent to read and summarize package.json\n" +
      "2. Spawn another subagent to read and summarize README.md\n" +
      "3. Give me a combined overview based on their findings"
  );
  console.log("Agent:", result2.response);
  console.log("\nTool calls made:", result2.toolCalls.length);

  // Example 3: Specialized subagent
  console.log("\n" + "=".repeat(60));
  console.log("\nExample 3: Subagent with custom system prompt\n");
  const result3 = await agent.chat(
    "Spawn a subagent with expertise in TypeScript best practices. " +
      "Ask them: What are the top 3 TypeScript best practices for writing maintainable code?"
  );
  console.log("Agent:", result3.response);
  console.log("\nTool calls made:", result3.toolCalls.length);

  console.log("\n" + "=".repeat(60));
  console.log("Demo complete!");
  console.log();
}

main().catch(console.error);
