/**
 * Agent Calculus - A Unified Framework for AI Agent Design
 *
 * Core Formula: Agent = LLM + Harness
 *
 * This module exports the core primitives and utilities for building
 * agents using the Entity Calculus model.
 */

// =============================================================================
// Core Types
// =============================================================================

export type {
  // Entity types
  Entity,
  EntityType,
  BuiltInEntityType,
  EntityMetadata,
  EntityContent,
  EntityDiscovery,
  Verbosity,
  LoadingStrategy,
  LoadedEntity,

  // Context types
  Context,

  // Action types
  Action,
  ToolCallAction,
  ResponseAction,

  // Tool types
  Tool,
  AnyTool,
  ToolExecutionResult,

  // World types
  World,

  // Harness types
  Harness,
  LLMResponse,

  // Agent types
  AgentConfig,
  ChatResult,
} from "./core/types.js";

// Constants
export { BuiltInEntityTypes } from "./core/types.js";

// =============================================================================
// Core Implementations
// =============================================================================

// Entity
export {
  createEntity,
  createSystemPrompt,
  createUserInput,
  createAssistantMessage,
  createToolResult,
  createToolDescription,
  getEntityContent,
  estimateTokens,
  estimateEntityTokens,
} from "./core/entity.js";

// Context
export {
  createContext,
  appendEntity,
  hasSpace,
  getUtilization,
  removeEntity,
  updateVerbosity,
  contextToMessages,
  findEntity,
  getEntitiesByType,
  getLastEntity,
  countEntities,
} from "./core/context.js";

// World
export { createWorld, getFileStats, listFilesRecursive } from "./core/world.js";

// Harness
export { createHarness, discoverRelevantEntities } from "./core/harness.js";

// Agent
export { Agent, createAgent } from "./core/agent.js";

// =============================================================================
// LLM Provider
// =============================================================================

export { invokeLLM, streamLLM } from "./llm/provider.js";

// =============================================================================
// Built-in Tools
// =============================================================================

export {
  readFileTool,
  writeFileTool,
  listFilesTool,
  fileTools,
  createSkillTools,
} from "./patterns/tools/index.js";

// =============================================================================
// Skills
// =============================================================================

export type { SkillOptions } from "./patterns/skills.js";
export {
  createSkill,
  createSkillRegistry,
  SkillRegistry,
} from "./patterns/skills.js";
