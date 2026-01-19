import { z } from "zod";
import type { Tool, AnyTool, World, ToolExecutionResult } from "../../core/types.js";
import type { SkillRegistry } from "../skills.js";

// =============================================================================
// Skill Tools
// =============================================================================

/**
 * Create tools for skill management.
 *
 * @param registry - The skill registry to use
 * @returns Array of skill management tools
 */
export function createSkillTools(registry: SkillRegistry): AnyTool[] {
  return [createListSkillsTool(registry), createLoadSkillTool(registry)];
}

/**
 * Tool to list all available skills.
 */
function createListSkillsTool(registry: SkillRegistry): Tool<Record<string, never>, string> {
  return {
    name: "list_skills",
    description:
      "List all available skills. Use this to discover what skills you can load for specialized tasks.",
    parameters: z.object({}),
    async execute(
      _params: Record<string, never>,
      world: World
    ): Promise<ToolExecutionResult<string>> {
      try {
        const skills = await registry.list();

        if (skills.length === 0) {
          return {
            result: "No skills are currently registered.",
            world,
            success: true,
          };
        }

        const skillList = skills
          .map((s, i) => `${i + 1}. ${s.name}: ${s.description}`)
          .join("\n");

        const result = `Available skills (${skills.length}):\n\n${skillList}`;

        return {
          result,
          world,
          success: true,
        };
      } catch (error) {
        return {
          result: `Error listing skills: ${error instanceof Error ? error.message : String(error)}`,
          world,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

const LoadSkillParams = z.object({
  skill_name: z
    .string()
    .describe("The name of the skill to load (e.g., 'code_review', 'debugging')"),
});

type LoadSkillParams = z.infer<typeof LoadSkillParams>;

/**
 * Tool to load a skill into context.
 */
function createLoadSkillTool(registry: SkillRegistry): Tool<LoadSkillParams, string> {
  return {
    name: "load_skill",
    description:
      "Load a skill into context to access its instructions and workflows. " +
      "The skill will provide you with specialized knowledge for specific tasks. " +
      "Use list_skills first to see what skills are available.",
    parameters: LoadSkillParams,
    async execute(
      params: LoadSkillParams,
      world: World
    ): Promise<ToolExecutionResult<string>> {
      try {
        const { skill_name } = params;

        // Check if skill exists
        if (!registry.has(skill_name)) {
          const skillsList = await registry.list();
          const availableSkills = skillsList.map((s) => s.name);
          return {
            result:
              `Skill "${skill_name}" not found.\n\n` +
              `Available skills: ${availableSkills.join(", ")}\n\n` +
              `Use list_skills to see descriptions of all available skills.`,
            world,
            success: false,
            error: `Skill "${skill_name}" not found`,
          };
        }

        // Get the skill entity
        const skill = registry.get(skill_name);
        if (!skill) {
          return {
            result: `Failed to retrieve skill "${skill_name}".`,
            world,
            success: false,
            error: "Skill retrieval failed",
          };
        }

        // Evaluate the skill content (handles both static and dynamic)
        const skillContent =
          typeof skill.content === "function"
            ? await skill.content()
            : skill.content;

        // Return the skill's full instructions as the tool result
        // This loads the skill directly into context via the tool result
        const result = `Loaded skill: ${skill_name}\n\n${skillContent.full}`;

        return {
          result,
          world,
          success: true,
        };
      } catch (error) {
        return {
          result: `Error loading skill: ${error instanceof Error ? error.message : String(error)}`,
          world,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
