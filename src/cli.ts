#!/usr/bin/env node

import * as readline from "readline";
import { createAgent } from "./core/agent.js";
import { createEntity } from "./core/entity.js";
import {
  fileTools,
  createSkillTools,
  createSubagentTool,
} from "./patterns/tools/index.js";
import { getUtilization } from "./core/context.js";
import {
  createSkill,
  createSkillRegistry,
} from "./patterns/skills.js";
import {
  createSlashCommandRegistry,
  createBuiltInCommands,
  createSlashCommandEntities,
  createSlashCommandTool,
  type SlashCommand,
} from "./patterns/slash-commands.js";

// =============================================================================
// CLI Configuration
// =============================================================================

const SYSTEM_PROMPT = `You are a helpful assistant with access to:
- File tools (list_files, read_file, write_file)
- Skills (use list_skills to discover, load_skill to load)
- Subagents (spawn_subagent to delegate tasks)

Be concise in your responses. When you use a tool, explain what you found or did.`;

// =============================================================================
// Example Skills
// =============================================================================

const codeReviewSkill = createSkill({
  name: "code_review",
  description: "Guidelines for conducting thorough code reviews",
  keywords: ["review", "code quality", "feedback", "best practices"],
  instructions: `
# Code Review Guidelines

When reviewing code, follow these steps:

## 1. Readability & Style
- Check naming conventions (descriptive, consistent)
- Verify proper formatting and indentation
- Ensure comments explain "why", not "what"

## 2. Correctness
- Verify logic handles edge cases
- Check error handling is appropriate
- Test boundary conditions

## 3. Performance
- Look for unnecessary loops or operations
- Check for memory leaks or excessive allocations
- Verify efficient data structures

## 4. Security
- Look for injection vulnerabilities
- Verify input validation
- Check for sensitive data exposure

## 5. Maintainability
- Code should be modular and testable
- Dependencies should be minimal
- Technical debt should be documented
`,
});

const debuggingSkill = createSkill({
  name: "debugging",
  description: "Systematic approach to debugging code issues",
  keywords: ["debug", "troubleshoot", "bug", "error", "fix"],
  instructions: `
# Debugging Methodology

## 1. Reproduce the Issue
- Get exact steps to reproduce
- Identify expected vs actual behavior
- Note any error messages

## 2. Isolate the Problem
- Binary search through code
- Add logging/print statements
- Use debugger breakpoints

## 3. Form Hypothesis
- What could cause this behavior?
- Check recent changes
- Review related code

## 4. Test Hypothesis
- Make minimal changes
- Test one thing at a time
- Keep notes on what you tried

## 5. Fix & Verify
- Apply fix
- Test the fix
- Check for regression
- Document the issue
`,
});

const apiDesignSkill = createSkill({
  name: "api_design",
  description: "Best practices for designing clean APIs",
  keywords: ["api", "interface", "design", "rest", "graphql"],
  instructions: `
# API Design Principles

## 1. Consistency
- Use consistent naming (camelCase or snake_case)
- Consistent error responses
- Consistent versioning

## 2. Clarity
- Descriptive endpoint names
- Clear parameter types
- Comprehensive documentation

## 3. Simplicity
- Minimal required parameters
- Sensible defaults
- Intuitive structure

## 4. Flexibility
- Optional parameters for customization
- Pagination for lists
- Filtering and sorting

## 5. Safety
- Input validation
- Rate limiting
- Authentication/authorization
- Idempotent operations where possible
`,
});

// =============================================================================
// Example Slash Commands
// =============================================================================

const statsCommand: SlashCommand = {
  name: "stats",
  description: "Show agent statistics and performance metrics",
  aliases: ["statistics"],
  async execute(args, world) {
    return {
      message: `Agent Statistics:
- Working Directory: ${world.workingDirectory}
- Status: Running
- Mode: Interactive CLI
- Patterns: Skills, Subagents, Slash Commands
`,
      success: true,
    };
  },
};

const clearCommand: SlashCommand = {
  name: "clear",
  description: "Clear the terminal screen",
  aliases: ["cls"],
  async execute(_args, _world) {
    console.clear();
    return {
      message: "Screen cleared",
      success: true,
    };
  },
};

// =============================================================================
// CLI Implementation
// =============================================================================

async function main() {
  const workingDirectory = process.cwd();

  console.log("=".repeat(60));
  console.log("Agent Calculus - Interactive CLI");
  console.log("=".repeat(60));
  console.log(`Working directory: ${workingDirectory}`);
  console.log();

  // Create skill registry and register skills
  const skillRegistry = createSkillRegistry();
  skillRegistry.register(codeReviewSkill);
  skillRegistry.register(debuggingSkill);
  skillRegistry.register(apiDesignSkill);
  const skills = await skillRegistry.list();
  console.log(`Skills: ${skills.map((s) => s.name).join(", ")}`);

  // Create slash command registry
  const slashCommandRegistry = createSlashCommandRegistry();
  const builtInCommands = createBuiltInCommands(slashCommandRegistry);
  slashCommandRegistry.registerMany(builtInCommands);
  slashCommandRegistry.register(statsCommand);
  slashCommandRegistry.register(clearCommand);
  console.log(
    `Slash commands: ${slashCommandRegistry
      .list()
      .map((c) => `/${c.name}`)
      .join(", ")}`
  );

  // Create skill tools
  const skillTools = createSkillTools(skillRegistry);

  // Create slash command tool
  const slashCommandTool = createSlashCommandTool(slashCommandRegistry);

  // Create subagent tool
  const subagentTool = createSubagentTool({
    defaultSystemPrompt:
      "You are a focused assistant. Complete the task concisely.",
    parentMaxTokens: 128000,
    availableTools: [...fileTools, ...skillTools],
    maxDepth: 3,
    debug: process.env.DEBUG === "true",
  });

  // Combine all tools (including slash command tool)
  const allTools = [...fileTools, ...skillTools, slashCommandTool, subagentTool];
  console.log(`Tools: ${allTools.map((t) => t.name).join(", ")}`);

  // Create slash command entities (to be added to available entities pool)
  const slashCommandEntities = createSlashCommandEntities(slashCommandRegistry);
  console.log(`Slash command entities: ${slashCommandEntities.length}`);

  console.log();
  console.log('Commands: "exit", "quit", "reset", "context", or any slash command');
  console.log("=".repeat(60));
  console.log();

  // Create agent with all tools and slash command entities
  const agent = await createAgent({
    systemPrompt: SYSTEM_PROMPT,
    workingDirectory,
    maxTokens: 128000,
    tools: allTools,
    additionalEntities: slashCommandEntities,
    debug: process.env.DEBUG === "true",
  });

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Helper to handle user input
  // All input (including slash commands) is passed to the agent as user input
  // The load function will detect slash commands and load the appropriate entities
  async function handleUserInput(input: string): Promise<void> {
    try {
      console.log("\nThinking...\n");

      // Create user input entity
      const userEntity = createEntity({
        content: input,
        type: "user_input",
        loading: "dynamic",
        summary: input.slice(0, 50),
        role: "user",
      });

      // Pass entity to agent
      // If it's a slash command, the load function will detect it and load the slash command entity
      // The LLM will then see the command and can call execute_slash_command tool
      const result = await agent.chat([userEntity]);

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
  }

  const prompt = () => {
    const ctx = agent.getContext();
    const utilization = (getUtilization(ctx) * 100).toFixed(1);
    rl.question(`[${utilization}%] > `, async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      // Handle built-in CLI commands
      if (trimmed === "exit" || trimmed === "quit") {
        console.log("Goodbye!");
        rl.close();
        process.exit(0);
      }

      if (trimmed === "reset") {
        await agent.reset();
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

      // Handle user input (slash commands or agent chat)
      await handleUserInput(trimmed);
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
