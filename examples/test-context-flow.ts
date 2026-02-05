#!/usr/bin/env tsx

/**
 * Test: Context Flow Without LLM
 * Validates that context properly tracks entities and converts to messages
 */

import {
  createContext,
  appendEntity,
  contextToMessages,
  createUserInput,
  createSystemPrompt,
  createAssistantTextMessage,
  createAssistantToolCall,
  createToolResult,
} from "../src/index.js";

async function testContextFlow() {
  console.log("Testing Context Flow: Entities → Messages\n");
  console.log("=".repeat(60));

  // Simulate a conversation with tool use
  let ctx = createContext(128000);

  // 1. System prompt (preloaded)
  console.log("\n1. System Prompt");
  const systemPrompt = createSystemPrompt("You are a helpful assistant.");
  ctx = await appendEntity(ctx, systemPrompt);
  console.log(`   Entities: ${ctx.entities.length}`);

  // 2. User input
  console.log("\n2. User Input");
  const userMsg = createUserInput("What's 2+2?");
  ctx = await appendEntity(ctx, userMsg);
  console.log(`   Entities: ${ctx.entities.length}`);

  // Convert to messages at this point
  let messages = await contextToMessages(ctx);
  console.log(`   Messages: ${messages.length}`);
  console.log(`   Message roles: ${messages.map(m => m.role).join(", ")}`);

  // 3. Assistant response with tool call (grouped)
  console.log("\n3. Assistant Response with Tool Call");
  const groupId = "msg-1";
  const assistantText = createAssistantTextMessage("Let me calculate that.", { messageGroupId: groupId });
  ctx = await appendEntity(ctx, assistantText);

  const toolCall = createAssistantToolCall("call_1", "calculate", { expr: "2+2" }, groupId);
  ctx = await appendEntity(ctx, toolCall);
  console.log(`   Entities: ${ctx.entities.length} (2 entities with same group ID)`);

  messages = await contextToMessages(ctx);
  console.log(`   Messages: ${messages.length} (grouped into 1 message)`);

  const lastMsg = messages[messages.length - 1];
  console.log(`   Last message role: ${lastMsg.role}`);
  console.log(`   Last message content type: ${Array.isArray(lastMsg.content) ? 'array' : 'string'}`);
  if (Array.isArray(lastMsg.content)) {
    console.log(`   Content parts: ${lastMsg.content.length} (text + tool-call)`);
  }

  // 4. Tool result
  console.log("\n4. Tool Result");
  const toolResultEntity = createToolResult("calculate", "call_1", "4");
  ctx = await appendEntity(ctx, toolResultEntity);
  console.log(`   Entities: ${ctx.entities.length}`);

  messages = await contextToMessages(ctx);
  console.log(`   Messages: ${messages.length}`);

  // 5. Final assistant response
  console.log("\n5. Final Assistant Response");
  const finalMsg = createAssistantTextMessage("The answer is 4.");
  ctx = await appendEntity(ctx, finalMsg);
  console.log(`   Entities: ${ctx.entities.length}`);

  messages = await contextToMessages(ctx);
  console.log(`   Messages: ${messages.length}`);

  // Final validation
  console.log("\n" + "=".repeat(60));
  console.log("Final State:");
  console.log(`  Total Entities: ${ctx.entities.length}`);
  console.log(`  Total Messages: ${messages.length}`);
  console.log(`  Token Usage: ${ctx.currentTokens} / ${ctx.maxTokens}`);

  console.log("\n" + "=".repeat(60));
  console.log("Message Sequence:");
  messages.forEach((msg, i) => {
    const contentType = typeof msg.content === "string" ? "string" : `array[${msg.content.length}]`;
    console.log(`  ${i + 1}. ${msg.role.padEnd(10)} - ${contentType}`);
  });

  // Validate expectations
  console.log("\n" + "=".repeat(60));
  console.log("Validations:");

  const checks = [
    { name: "System message present", pass: messages[0].role === "system" },
    { name: "User message present", pass: messages[1].role === "user" },
    { name: "Assistant message grouped", pass: Array.isArray(messages[2].content) },
    { name: "Tool result present", pass: messages.some(m => m.role === "tool") },
    { name: "Entity count correct", pass: ctx.entities.length === 6 },
    { name: "Message count correct", pass: messages.length === 5 },
    { name: "Entities > Messages", pass: ctx.entities.length > messages.length },
  ];

  checks.forEach(check => {
    const status = check.pass ? "✅" : "❌";
    console.log(`  ${status} ${check.name}`);
  });

  const allPassed = checks.every(c => c.pass);

  console.log("\n" + "=".repeat(60));
  if (allPassed) {
    console.log("✅ All tests passed!");
    console.log("\nKey Features Verified:");
    console.log("- Entities are the single source of truth");
    console.log("- Messages derived from entities via contextToMessages()");
    console.log("- Message grouping works (assistant + tool calls)");
    console.log("- Context properly bridges entities and message format");
  } else {
    console.log("❌ Some tests failed!");
    process.exit(1);
  }
}

testContextFlow().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
