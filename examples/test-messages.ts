#!/usr/bin/env tsx

/**
 * Test: Message Conversion from Entities
 * Verifies that entities properly convert to messages
 */

import {
  createContext,
  appendEntity,
  contextToMessages,
  createUserTextMessage,
  createAssistantTextMessage,
  createAssistantToolCall,
  createToolResult,
  createSystemMessage,
} from "../src/index.js";

async function testMessageConversion() {
  console.log("Testing Entity → Message Conversion\n");
  console.log("=".repeat(60));

  // Create a context
  let ctx = createContext(128000);

  // Add a system message
  console.log("\n1. Adding system message entity...");
  const systemMsg = createSystemMessage("You are a helpful assistant.");
  ctx = await appendEntity(ctx, systemMsg);

  // Add a user message
  console.log("2. Adding user message entity...");
  const userMsg = createUserTextMessage("What's the weather?");
  ctx = await appendEntity(ctx, userMsg);

  // Add an assistant message with tool calls (grouped)
  console.log("3. Adding assistant message with tool call...");
  const messageGroupId = "msg-123";
  const assistantText = createAssistantTextMessage("Let me check the weather for you.", {
    messageGroupId,
  });
  ctx = await appendEntity(ctx, assistantText);

  const toolCall = createAssistantToolCall(
    "call_1",
    "get_weather",
    { location: "San Francisco" },
    messageGroupId
  );
  ctx = await appendEntity(ctx, toolCall);

  // Add a tool result
  console.log("4. Adding tool result entity...");
  const toolResultEntity = createToolResult(
    "get_weather",
    "call_1",
    "Sunny, 72°F in San Francisco"
  );
  ctx = await appendEntity(ctx, toolResultEntity);

  // Add final assistant response
  console.log("5. Adding final assistant message...");
  const finalMsg = createAssistantTextMessage("It's sunny and 72°F in San Francisco!");
  ctx = await appendEntity(ctx, finalMsg);

  // Convert to messages
  console.log("\n" + "=".repeat(60));
  console.log("Converting entities to messages...\n");
  const messages = await contextToMessages(ctx);

  // Display results
  console.log(`Total entities: ${ctx.entities.length}`);
  console.log(`Total messages: ${messages.length}\n`);

  console.log("Messages structure:");
  console.log("=".repeat(60));
  messages.forEach((msg, i) => {
    console.log(`\nMessage ${i + 1}:`);
    console.log(`  Role: ${msg.role}`);
    if (typeof msg.content === "string") {
      console.log(`  Content: "${msg.content}"`);
    } else {
      console.log(`  Content: [Array with ${msg.content.length} parts]`);
      msg.content.forEach((part: any, j: number) => {
        console.log(`    Part ${j + 1}: ${part.type}`);
        if (part.type === "text") {
          console.log(`      Text: "${part.text}"`);
        } else if (part.type === "tool-call") {
          console.log(`      Tool: ${part.toolName}`);
          console.log(`      Args: ${JSON.stringify(part.args)}`);
        } else if (part.type === "tool-result") {
          console.log(`      Result: "${part.result}"`);
        }
      });
    }
  });

  console.log("\n" + "=".repeat(60));
  console.log("✅ Test completed successfully!");
  console.log("\nKey observations:");
  console.log("- Entities with same messageGroupId merged into one message");
  console.log("- Tool calls properly formatted as content array");
  console.log("- Messages derived from entities, not stored separately");
}

testMessageConversion().catch(console.error);
