#!/usr/bin/env tsx

/**
 * Example: Slash Commands System
 *
 * This example demonstrates how to:
 * 1. Create custom slash commands as entities
 * 2. Handle slash commands OUTSIDE the agent (in application code)
 * 3. Execute commands and create entities from results
 * 4. Pass entities to agent via appendEntity() or show results directly
 *
 * Key insight: Slash commands are just entities. The agent doesn't know about them.
 */

import {
  createAgent,
  createSlashCommandRegistry,
  createBuiltInCommands,
  createEntity,
  fileTools,
} from "../src/index.js";
import { exampleCommands } from "./example-commands.js";

// =============================================================================
// Setup Slash Commands
// =============================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("Slash Commands Example");
  console.log("=".repeat(60));
  console.log();

  // Create slash command registry
  const commandRegistry = createSlashCommandRegistry();

  // Register built-in commands (help, list)
  const builtInCommands = createBuiltInCommands(commandRegistry);
  commandRegistry.registerMany(builtInCommands);

  // Register custom example commands
  commandRegistry.registerMany(exampleCommands);

  console.log("Registered slash commands:");
  const commands = commandRegistry.list();
  for (const cmd of commands) {
    let line = `  /${cmd.name}`;
    if (cmd.aliases && cmd.aliases.length > 0) {
      line += ` (${cmd.aliases.map((a) => `/${a}`).join(", ")})`;
    }
    line += ` - ${cmd.description}`;
    console.log(line);
  }
  console.log();

  // Create agent (no slash command configuration needed)
  const agent = await createAgent({
    systemPrompt: "You are a helpful assistant.",
    workingDirectory: process.cwd(),
    maxTokens: 128000,
    tools: fileTools,
    debug: false,
  });

  console.log("=".repeat(60));
  console.log("Agent created\n");

  // Helper function to handle user input
  async function handleInput(userInput: string): Promise<string> {
    // Check if input is a slash command
    const parsed = commandRegistry.parse(userInput);

    if (parsed) {
      // It's a slash command - execute it outside the agent
      console.log(`[Executing slash command: ${parsed.command}]`);
      const result = await commandRegistry.execute(userInput, agent.getWorld());

      // Create entity from command result
      const commandEntity = createEntity({
        content: result.message,
        type: "slash_command_result",
        loading: "dynamic",
        summary: `/${parsed.command} → ${result.success ? "success" : "failed"}`,
        role: "assistant",
      });

      // Append to agent's context so it knows what happened
      await agent.appendEntity(commandEntity);

      // Return result directly (no LLM processing needed)
      return result.message;
    } else {
      // Normal input - pass to agent
      const result = await agent.chat(userInput);
      return result.response;
    }
  }

  // Example 1: User types /help command
  console.log("Example 1: User types /help\n");
  console.log("User: /help\n");
  const response1 = await handleInput("/help");
  console.log("Result:", response1);
  console.log();

  // Example 2: User types /status command
  console.log("=".repeat(60));
  console.log("\nExample 2: User types /status\n");
  console.log("User: /status\n");
  const response2 = await handleInput("/status");
  console.log("Result:", response2);
  console.log();

  // Example 3: User types /echo with arguments
  console.log("=".repeat(60));
  console.log("\nExample 3: User types /echo with message\n");
  console.log("User: /echo Hello from Agent Calculus!\n");
  const response3 = await handleInput("/echo Hello from Agent Calculus!");
  console.log("Result:", response3);
  console.log();

  // Example 4: User types /time command
  console.log("=".repeat(60));
  console.log("\nExample 4: User types /time\n");
  console.log("User: /time\n");
  const response4 = await handleInput("/time");
  console.log("Result:", response4);
  console.log();

  // Example 5: Normal conversation (not a slash command)
  console.log("=".repeat(60));
  console.log("\nExample 5: Normal conversation\n");
  console.log("User: What is the agent calculus formula?\n");
  const response5 = await handleInput("What is the agent calculus formula?");
  console.log("Agent:", response5);
  console.log();

  console.log("=".repeat(60));
  console.log("Demo complete!");
  console.log();
}

main().catch(console.error);
