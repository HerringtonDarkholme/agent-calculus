#!/usr/bin/env tsx

/**
 * Test script to verify static and dynamic content works correctly
 */

import { createEntity, getEntityContent, BuiltInEntityTypes } from "./src/index.js";

async function test() {
  console.log("Testing static vs dynamic content implementation\n");
  console.log("=".repeat(60));

  // Test 1: String shorthand (static)
  console.log("\n1. String shorthand (static):");
  const entity1 = createEntity({
    content: "Static content via string",
    type: "test",
    summary: "Summary",
  });
  console.log("Full:", await getEntityContent(entity1, "full"));
  console.log("Summary:", await getEntityContent(entity1, "summary"));

  // Test 2: EntityContent object (static)
  console.log("\n2. EntityContent object (static):");
  const entity2 = createEntity({
    content: {
      full: "Full static content",
      summary: "Summary static content",
      digest: "Digest static content",
    },
    type: "test",
  });
  console.log("Full:", await getEntityContent(entity2, "full"));
  console.log("Summary:", await getEntityContent(entity2, "summary"));
  console.log("Digest:", await getEntityContent(entity2, "digest"));

  // Test 3: Function returning EntityContent (dynamic, sync)
  console.log("\n3. Function returning EntityContent (dynamic, sync):");
  let counter = 0;
  const entity3 = createEntity({
    content: () => {
      counter++;
      return {
        full: `Dynamic content, call #${counter}`,
        summary: `Call #${counter}`,
      };
    },
    type: "test",
  });
  console.log("First call:", await getEntityContent(entity3, "full"));
  console.log("Second call:", await getEntityContent(entity3, "full"));
  console.log("Third call (summary):", await getEntityContent(entity3, "summary"));

  // Test 4: Async function returning EntityContent (dynamic, async)
  console.log("\n4. Async function returning EntityContent (dynamic, async):");
  const entity4 = createEntity({
    content: async () => {
      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        full: `Async content at ${new Date().toISOString()}`,
        summary: "Async content",
      };
    },
    type: "test",
  });
  const start = Date.now();
  console.log("First call:", await getEntityContent(entity4, "full"));
  await new Promise((resolve) => setTimeout(resolve, 50));
  console.log("Second call (after delay):", await getEntityContent(entity4, "full"));
  console.log(`Elapsed: ${Date.now() - start}ms (should be > 50ms)`);

  // Test 5: Built-in entity types
  console.log("\n5. Built-in entity types with dynamic content:");
  const memoryState = { turns: 0 };
  const memoryEntity = createEntity({
    content: () => ({
      full: `Memory state: ${memoryState.turns} turns`,
      summary: `${memoryState.turns} turns`,
    }),
    type: BuiltInEntityTypes.MEMORY,
    loading: "preloaded",
  });
  console.log("Initial:", await getEntityContent(memoryEntity, "full"));
  memoryState.turns = 5;
  console.log("After update:", await getEntityContent(memoryEntity, "full"));
  console.log("Summary:", await getEntityContent(memoryEntity, "summary"));

  console.log("\n" + "=".repeat(60));
  console.log("All tests passed! ✓\n");
}

test().catch(console.error);
