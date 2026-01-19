#!/usr/bin/env node

import * as readline from "readline";
import { createAgent } from "./core/agent.js";
import { fileTools } from "./patterns/tools/index.js";
import { getUtilization } from "./core/context.js";

// =============================================================================
// CLI Configuration
// =============================================================================

const SYSTEM_PROMPT = `You are a helpful assistant that can read and write files.
You have access to tools for file operations in the working directory.

When asked about files:
- Use list_files to see what files exist
- Use read_file to read file contents
- Use write_file to create or update files

Be concise in your responses. When you use a tool, explain what you found or did.`;

// =============================================================================
// CLI Implementation
// =============================================================================

async function main() {
  const workingDirectory = process.cwd();

  console.log("=".repeat(60));
  console.log("Agent Calculus - Interactive CLI");
  console.log("=".repeat(60));
  console.log(`Working directory: ${workingDirectory}`);
  console.log(`Available tools: ${fileTools.map((t) => t.name).join(", ")}`);
  console.log('Type "exit" or "quit" to exit, "reset" to clear context');
  console.log("=".repeat(60));
  console.log();

  // Create agent
  const agent = createAgent({
    systemPrompt: SYSTEM_PROMPT,
    workingDirectory,
    maxTokens: 128000,
    tools: fileTools,
    debug: process.env.DEBUG === "true",
  });

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    const ctx = agent.getContext();
    const utilization = (getUtilization(ctx) * 100).toFixed(1);
    rl.question(`[${utilization}%] > `, async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      // Handle special commands
      if (trimmed === "exit" || trimmed === "quit") {
        console.log("Goodbye!");
        rl.close();
        process.exit(0);
      }

      if (trimmed === "reset") {
        agent.reset();
        console.log("Context reset.\n");
        prompt();
        return;
      }

      if (trimmed === "context") {
        const ctx = agent.getContext();
        console.log("\n--- Context ---");
        console.log(`Entities: ${ctx.entities.length}`);
        console.log(`Tokens: ${ctx.currentTokens} / ${ctx.maxTokens}`);
        console.log(`Utilization: ${(getUtilization(ctx) * 100).toFixed(1)}%`);
        console.log("\nEntity types:");
        const typeCounts: Record<string, number> = {};
        for (const { entity } of ctx.entities) {
          typeCounts[entity.metadata.type] =
            (typeCounts[entity.metadata.type] ?? 0) + 1;
        }
        for (const [type, count] of Object.entries(typeCounts)) {
          console.log(`  ${type}: ${count}`);
        }
        console.log("---\n");
        prompt();
        return;
      }

      // Process user input
      try {
        console.log("\nThinking...\n");
        const result = await agent.chat(trimmed);

        // Show tool calls if any
        if (result.toolCalls.length > 0) {
          console.log("Tools used:");
          for (const tc of result.toolCalls) {
            console.log(`  - ${tc.tool}(${JSON.stringify(tc.args)})`);
          }
          console.log();
        }

        // Show response
        console.log("Assistant:", result.response);
        console.log();
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
        console.log();
      }

      prompt();
    });
  };

  prompt();
}

// Run CLI
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
