import type { Entity } from "../core/types.js";
import { BuiltInEntityTypes } from "../core/types.js";
import { createEntity } from "../core/entity.js";

// =============================================================================
// Skill Types
// =============================================================================

/**
 * Skill definition options.
 */
export interface SkillOptions {
  /** Unique skill name */
  name: string;
  /** Skill description (shown when listing skills) */
  description: string;
  /** Detailed instructions for the skill */
  instructions: string;
  /** Optional summary of the skill */
  summary?: string;
  /** Keywords that trigger this skill */
  keywords?: string[];
  /** Semantic description for similarity matching */
  semantic?: string;
  /** Priority for loading (higher = loaded first) */
  priority?: number;
}

/**
 * Create a skill entity.
 *
 * Skills are entities that contain reusable workflows, patterns, or instructions
 * that can be dynamically loaded into context when needed.
 */
export function createSkill(options: SkillOptions): Entity {
  const {
    name,
    description,
    instructions,
    summary,
    keywords: _keywords, // Reserved for future semantic matching
    semantic: _semantic, // Reserved for future semantic matching
    priority = 10,
  } = options;

  const fullContent = `# Skill: ${name}

${description}

## Instructions

${instructions}`;

  const summaryContent = summary ?? `${name}: ${description}`;

  return createEntity({
    content: {
      full: fullContent,
      summary: summaryContent,
      digest: name,
    },
    type: BuiltInEntityTypes.SKILL,
    loading: "dynamic",
    priority,
    id: `skill-${name}`,
  });
}

// =============================================================================
// Skill Registry
// =============================================================================

/**
 * Skill registry for managing available skills.
 */
export class SkillRegistry {
  private skills: Map<string, Entity> = new Map();

  /**
   * Register a skill.
   */
  register(skill: Entity): void {
    const skillName = skill.id.replace("skill-", "");
    this.skills.set(skillName, skill);
  }

  /**
   * Register multiple skills.
   */
  registerMany(skills: Entity[]): void {
    for (const skill of skills) {
      this.register(skill);
    }
  }

  /**
   * Get a skill by name.
   */
  get(name: string): Entity | undefined {
    return this.skills.get(name);
  }

  /**
   * Check if a skill exists.
   */
  has(name: string): boolean {
    return this.skills.has(name);
  }

  /**
   * Get all skills.
   */
  getAll(): Entity[] {
    return Array.from(this.skills.values());
  }

  /**
   * List all skill names and descriptions.
   */
  async list(): Promise<Array<{ name: string; description: string }>> {
    const results = [];

    for (const [name, skill] of this.skills.entries()) {
      // Extract description from the skill content
      const content =
        typeof skill.content === "function"
          ? await skill.content()
          : skill.content;

      // Get summary or digest as description
      const description = content.summary ?? content.digest ?? name;

      results.push({ name, description });
    }

    return results;
  }

  /**
   * Search skills by keywords.
   */
  search(query: string): Entity[] {
    const queryLower = query.toLowerCase();
    const matches: Entity[] = [];

    for (const [name, skill] of this.skills.entries()) {
      // Check if query matches name
      if (name.toLowerCase().includes(queryLower)) {
        matches.push(skill);
        continue;
      }

      // Check if query matches keywords in discovery metadata
      if (skill.metadata.discovery?.keywords) {
        const keywordMatch = skill.metadata.discovery.keywords.some((kw) =>
          kw.toLowerCase().includes(queryLower)
        );
        if (keywordMatch) {
          matches.push(skill);
        }
      }
    }

    return matches;
  }
}

/**
 * Create a new skill registry.
 */
export function createSkillRegistry(): SkillRegistry {
  return new SkillRegistry();
}
