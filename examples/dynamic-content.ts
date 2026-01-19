/**
 * Example: Static vs Dynamic Entity Content
 *
 * This example demonstrates how entity content can be either:
 * - Static: A string that never changes
 * - Dynamic: A function that computes content when accessed
 */

import { createEntity, getEntityContent, BuiltInEntityTypes } from "../src/index.js";

// =============================================================================
// Static Content Example
// =============================================================================

const staticEntity = createEntity({
  content: "This is static content that never changes",
  type: "static_example",
});

console.log("Static entity content:");
console.log(await getEntityContent(staticEntity, "full"));
console.log(await getEntityContent(staticEntity, "full")); // Same every time
console.log();

// =============================================================================
// Dynamic Content Example
// =============================================================================

let callCount = 0;

const dynamicEntity = createEntity({
  content: () => {
    callCount++;
    return {
      full: `This is dynamic content, computed ${callCount} time(s)`,
    };
  },
  type: "dynamic_example",
});

console.log("Dynamic entity content:");
console.log(await getEntityContent(dynamicEntity, "full")); // Computed: 1 time
console.log(await getEntityContent(dynamicEntity, "full")); // Computed: 2 times
console.log(await getEntityContent(dynamicEntity, "full")); // Computed: 3 times
console.log();

// =============================================================================
// Practical Example: Dynamic Memory
// =============================================================================

interface ConversationState {
  turns: number;
  topics: string[];
}

const state: ConversationState = {
  turns: 0,
  topics: [],
};

const memoryEntity = createEntity({
  content: () => {
    return {
      full: `Conversation Summary:
- Total turns: ${state.turns}
- Topics discussed: ${state.topics.join(", ") || "none yet"}
- Last updated: ${new Date().toLocaleTimeString()}`,
      summary: `${state.turns} turns, ${state.topics.length} topics`,
    };
  },
  type: BuiltInEntityTypes.MEMORY,
  loading: "preloaded",
});

console.log("Initial memory:");
console.log(await getEntityContent(memoryEntity, "full"));
console.log();

// Simulate conversation progress
state.turns = 3;
state.topics = ["weather", "sports"];

console.log("After conversation:");
console.log(await getEntityContent(memoryEntity, "full"));
console.log();

console.log("Memory summary:");
console.log(await getEntityContent(memoryEntity, "summary"));
console.log();

// =============================================================================
// Practical Example: Time-based Content
// =============================================================================

const timestampEntity = createEntity({
  content: () => ({
    full: `Current timestamp: ${new Date().toISOString()}`,
    summary: "Current time",
  }),
  type: "timestamp",
});

console.log("Timestamp entity (called twice with delay):");
console.log(await getEntityContent(timestampEntity, "full"));

// Wait a bit
await new Promise((resolve) => setTimeout(resolve, 100));

console.log(await getEntityContent(timestampEntity, "full")); // Different time!
console.log();

// =============================================================================
// Key Insights
// =============================================================================

console.log("Key insights:");
console.log("1. Static content (string) - Evaluated once, never changes");
console.log("2. Dynamic content (function) - Computed fresh every access");
console.log("3. Use dynamic for: memory, timestamps, computed summaries");
console.log("4. Use static for: prompts, tool descriptions, user input");
