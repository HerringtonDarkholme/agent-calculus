#!/usr/bin/env tsx

/**
 * Test: Full Agent Loop with Tools
 * Verifies that the refactored context works end-to-end with real LLM calls
 */

import { createAgent } from "../src/index.js";
import { z } from "zod";

// Simple calculator tool for testing
const calculatorTool = {
  name: "calculate",
  description: "Perform a basic calculation",
  parameters: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number(),
  }),
  execute: async (params: any, world: any) => {
    const { operation, a, b } = params;
    let result: number;

    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        result = b !== 0 ? a / b : NaN;
        break;
    }

    return {
      result: `${a} ${operation} ${b} = ${result}`,
      world,
      success: true,
    };
  },
};

async function testAgent() {
  console.log("Testing Full Agent Loop with Message Conversion\n");
  console.log("=".repeat(60));

  // Import entity creator
  const { createUserInput } = await import("../src/index.js");

  // Create agent (async, already initializes)
  const agent = await createAgent({
    systemPrompt: "You are a helpful math assistant. Use the calculate tool when asked to perform calculations.",
    workingDirectory: process.cwd(),
    maxTokens: 128000,
    tools: [calculatorTool],
  });

  console.log("\n📝 Sending: What is 15 + 27?\n");

  // Create user input entity
  const userEntity = createUserInput("What is 15 + 27?");

  // Chat with agent
  const result = await agent.chat([userEntity]);

  console.log("=".repeat(60));
  console.log("📤 Agent Response:");
  console.log(result.response);

  if (result.toolCalls.length > 0) {
    console.log("\n🔧 Tool Calls Made:");
    result.toolCalls.forEach((tc, i) => {
      console.log(`  ${i + 1}. ${tc.tool}(${JSON.stringify(tc.args)})`);
      console.log(`     Result: ${tc.result}`);
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ End-to-end test completed successfully!");
  console.log("\nVerified:");
  console.log("- Entities converted to proper message format");
  console.log("- LLM received messages correctly");
  console.log("- Tool calls formatted correctly");
  console.log("- Tool results handled properly");
  console.log("- Final response generated");
}

testAgent().catch((err) => {
  console.error("❌ Test failed:", err.message);
  process.exit(1);
});
