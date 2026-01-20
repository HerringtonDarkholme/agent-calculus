#!/usr/bin/env tsx

/**
 * Example: Advanced Patterns - Skills + Subagents
 *
 * This example demonstrates how to combine:
 * 1. Skills - Reusable instructions and workflows
 * 2. Subagents - Task delegation and decomposition
 * 3. File tools - File system operations
 *
 * Together, these create a powerful agent system that can:
 * - Load specialized knowledge on demand
 * - Delegate complex tasks to focused subagents
 * - Operate on the file system
 */

import {
  createAgent,
  createSkill,
  createSkillRegistry,
  createSkillTools,
  createSubagentTool,
  fileTools,
} from "../src/index.js";

// =============================================================================
// Define Skills
// =============================================================================

const analysisSkill = createSkill({
  name: "data_analysis",
  description: "Guidelines for analyzing data and generating insights",
  keywords: ["analysis", "data", "insights"],
  instructions: `
When analyzing data, follow this structured approach:

1. **Data Collection**
   - Identify all relevant data sources
   - Gather and consolidate the data
   - Note any missing or incomplete information

2. **Data Examination**
   - Review the data structure and format
   - Check for patterns, trends, or anomalies
   - Identify key metrics and indicators

3. **Insight Generation**
   - Draw conclusions from the data
   - Identify actionable insights
   - Prioritize findings by importance

4. **Summary**
   - Provide a clear, concise summary
   - Include specific numbers and examples
   - Recommend next steps if applicable
`,
});

const summarySkill = createSkill({
  name: "summarization",
  description: "Best practices for creating effective summaries",
  keywords: ["summary", "brief", "condensed"],
  instructions: `
When creating summaries, follow these principles:

1. **Identify Key Points**
   - Extract the most important information
   - Focus on facts, not opinions
   - Prioritize actionable items

2. **Structure**
   - Start with the main conclusion
   - Support with 2-3 key findings
   - Use bullet points for clarity

3. **Brevity**
   - Aim for 20-30% of original length
   - Remove redundancy and filler
   - Use clear, direct language

4. **Accuracy**
   - Preserve the original meaning
   - Don't add interpretation
   - Cite specific examples when relevant
`,
});

// =============================================================================
// Setup Agent System
// =============================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("Advanced Patterns: Skills + Subagents + File Tools");
  console.log("=".repeat(60));
  console.log();

  // Setup skills
  const skillRegistry = createSkillRegistry();
  skillRegistry.registerMany([analysisSkill, summarySkill]);

  const skills = await skillRegistry.list();
  console.log("Registered skills:");
  for (const skill of skills) {
    console.log(`  - ${skill.name}: ${skill.description}`);
  }
  console.log();

  // Create tools
  const skillTools = createSkillTools(skillRegistry);
  const subagentTool = createSubagentTool({
    defaultSystemPrompt: "You are a focused assistant. Complete tasks efficiently.",
    parentMaxTokens: 128000,
    availableTools: [...fileTools, ...skillTools], // Subagents can use skills!
    maxDepth: 2,
    debug: true,
  });

  // Combine all tools
  const allTools = [...fileTools, ...skillTools, subagentTool];

  // Create main agent
  const agent = await createAgent({
    systemPrompt: `You are a sophisticated assistant with access to:
- File operations (read, write, list files)
- Specialized skills (load skills for expert knowledge)
- Subagents (delegate complex tasks to focused subagents)

When handling complex requests:
1. Break the task into logical subtasks
2. Load relevant skills for specialized knowledge
3. Spawn subagents for independent work
4. Combine results into a coherent response

Be efficient and strategic in your tool use.`,
    workingDirectory: process.cwd(),
    maxTokens: 128000,
    tools: allTools,
    debug: false,
  });

  console.log("Agent created with all tools\n");
  console.log("=".repeat(60));

  // Example: Complex workflow combining all patterns
  console.log("\nExample: Analyze project structure using all patterns\n");

  const result = await agent.chat(
    "I want a comprehensive analysis of this project. Please:\n\n" +
      "1. First, load the data_analysis skill to guide your approach\n" +
      "2. Spawn a subagent to analyze package.json\n" +
      "3. Spawn another subagent to analyze README.md\n" +
      "4. Load the summarization skill\n" +
      "5. Combine the findings into a well-structured summary\n\n" +
      "Give me a clear overview of what this project is and its key characteristics."
  );

  console.log("\n" + "=".repeat(60));
  console.log("Agent Response:");
  console.log("=".repeat(60));
  console.log(result.response);

  console.log("\n" + "=".repeat(60));
  console.log("Tool Calls Made:");
  console.log("=".repeat(60));
  for (let i = 0; i < result.toolCalls.length; i++) {
    const tc = result.toolCalls[i];
    console.log(`${i + 1}. ${tc.tool}`);
    if (tc.tool === "spawn_subagent") {
      const args = tc.args as { task: string };
      console.log(`   Task: ${args.task.slice(0, 60)}...`);
    } else if (tc.tool === "load_skill") {
      const args = tc.args as { skill_name: string };
      console.log(`   Skill: ${args.skill_name}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Demo complete!");
  console.log();
}

main().catch(console.error);
