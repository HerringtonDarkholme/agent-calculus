#!/usr/bin/env tsx

/**
 * Example: Skills System
 *
 * This example demonstrates how to:
 * 1. Create and register skills
 * 2. Use the skill tools (list_skills, load_skill)
 * 3. Dynamically load skills into context when needed
 */

import {
  createAgent,
  createSkill,
  createSkillRegistry,
  createSkillTools,
  fileTools,
} from "../src/index.js";

// =============================================================================
// Define Skills
// =============================================================================

// Skill 1: Code Review
const codeReviewSkill = createSkill({
  name: "code_review",
  description: "Provides guidance for conducting thorough code reviews",
  keywords: ["review", "code quality", "feedback"],
  instructions: `
When conducting a code review, follow these steps:

1. **Readability & Style**
   - Check if the code follows consistent naming conventions
   - Verify proper indentation and formatting
   - Ensure comments are clear and meaningful

2. **Correctness**
   - Verify the logic is sound and handles edge cases
   - Check for potential bugs or race conditions
   - Ensure error handling is appropriate

3. **Performance**
   - Look for unnecessary loops or inefficient algorithms
   - Check for memory leaks or resource management issues
   - Identify opportunities for optimization

4. **Security**
   - Check for SQL injection, XSS, or other vulnerabilities
   - Verify input validation and sanitization
   - Ensure sensitive data is handled securely

5. **Testing**
   - Verify tests cover the main functionality
   - Check for edge cases in tests
   - Ensure tests are maintainable

Provide constructive feedback with specific examples and suggestions for improvement.
`,
});

// Skill 2: Debugging
const debuggingSkill = createSkill({
  name: "debugging",
  description: "Step-by-step debugging methodology for finding and fixing bugs",
  keywords: ["debug", "bug", "error", "troubleshoot"],
  instructions: `
Follow this systematic debugging approach:

1. **Reproduce the Bug**
   - Can you consistently reproduce it?
   - What are the exact steps to reproduce?
   - Under what conditions does it occur?

2. **Isolate the Problem**
   - Binary search: comment out half the code
   - Add logging/print statements at key points
   - Check inputs and outputs at each step

3. **Understand the Code**
   - Read the relevant code carefully
   - Trace the execution path
   - Identify assumptions that might be wrong

4. **Form Hypotheses**
   - What could cause this behavior?
   - List possible causes in order of likelihood
   - Rule out causes systematically

5. **Test Your Hypotheses**
   - Make one change at a time
   - Verify each change
   - Document what works and what doesn't

6. **Fix and Verify**
   - Implement the fix
   - Test thoroughly
   - Add tests to prevent regression

Remember: If you're stuck, explain the problem to someone (rubber duck debugging) or take a break.
`,
});

// Skill 3: API Design
const apiDesignSkill = createSkill({
  name: "api_design",
  description: "Best practices for designing clean and maintainable APIs",
  keywords: ["api", "design", "interface", "rest"],
  instructions: `
When designing an API, follow these principles:

1. **Consistency**
   - Use consistent naming conventions (camelCase, snake_case, etc.)
   - Follow RESTful conventions for HTTP APIs
   - Maintain consistent error response formats

2. **Simplicity**
   - Keep endpoints focused and single-purpose
   - Use clear, descriptive names
   - Minimize the number of parameters

3. **Documentation**
   - Document all endpoints, parameters, and responses
   - Provide examples for common use cases
   - Include error codes and their meanings

4. **Versioning**
   - Include version in the API path or header
   - Maintain backward compatibility when possible
   - Clearly communicate breaking changes

5. **Security**
   - Use authentication and authorization
   - Validate all inputs
   - Rate limit to prevent abuse

6. **Error Handling**
   - Return meaningful error messages
   - Use appropriate HTTP status codes
   - Include error codes for programmatic handling
`,
});

// =============================================================================
// Create Skill Registry
// =============================================================================

const skillRegistry = createSkillRegistry();
skillRegistry.registerMany([codeReviewSkill, debuggingSkill, apiDesignSkill]);

// =============================================================================
// Create Agent with Skills
// =============================================================================

const SYSTEM_PROMPT = `You are a helpful programming assistant.

You have access to file operations and a skill system.

When you need specialized knowledge:
1. Use list_skills to see what skills are available
2. Use load_skill to load relevant skills into your context
3. Apply the skill's instructions to help the user

Available tools:
- File tools: read_file, write_file, list_files
- Skill tools: list_skills, load_skill`;

async function main() {
  // Display registered skills
  console.log("Registered skills:");
  const skills = await skillRegistry.list();
  for (const { name, description } of skills) {
    console.log(`  - ${name}: ${description}`);
  }
  console.log();

  // Create skill tools
  const skillTools = createSkillTools(skillRegistry);

  // Combine file tools and skill tools
  const allTools = [...fileTools, ...skillTools];

  // Create agent
  const agent = await createAgent({
    systemPrompt: SYSTEM_PROMPT,
    workingDirectory: process.cwd(),
    maxTokens: 128000,
    tools: allTools,
    debug: false,
  });

  console.log("=".repeat(60));
  console.log("Skills Example - Interactive Demo");
  console.log("=".repeat(60));
  console.log();

  // Example 1: List skills
  console.log("Example 1: List available skills\n");
  const result1 = await agent.chat("What skills do you have available?");
  console.log("Agent:", result1.response);
  console.log();

  // Example 2: Load and use a skill
  console.log("=".repeat(60));
  console.log("Example 2: Load the code_review skill\n");
  const result2 = await agent.chat(
    "Load the code_review skill and tell me the key areas I should focus on when reviewing code."
  );
  console.log("Agent:", result2.response);
  console.log();

  // Example 3: Use loaded skill
  console.log("=".repeat(60));
  console.log("Example 3: Apply the loaded skill\n");
  const result3 = await agent.chat(
    "I have a function that processes user input without any validation. " +
      "What should I look for in a code review?"
  );
  console.log("Agent:", result3.response);
  console.log();

  console.log("=".repeat(60));
  console.log("Demo complete!");
  console.log();
}

main().catch(console.error);
