import { randomUUID } from "crypto";
import type {
  Entity,
  EntityContent,
  EntityMetadata,
  EntityType,
  LoadingStrategy,
  Verbosity,
} from "./types.js";
import { BuiltInEntityTypes } from "./types.js";

// =============================================================================
// Entity Creation
// =============================================================================

/**
 * Options for creating an entity.
 */
export interface CreateEntityOptions {
  /** Entity content - static object or dynamic function */
  content:
    | EntityContent
    | (() => EntityContent)
    | (() => Promise<EntityContent>)
    | string; // Allow string shorthand for { full: string }
  /** Entity type */
  type: EntityType;
  /** Summary content (for string shorthand) */
  summary?: string;
  /** Digest content (for string shorthand) */
  digest?: string;
  /** Loading strategy (default: dynamic) */
  loading?: LoadingStrategy;
  /** Priority for loading (default: 0) */
  priority?: number;
  /** Role for message conversion */
  role?: "user" | "assistant" | "system" | "tool";
  /** Custom ID (optional, will generate UUID if not provided) */
  id?: string;
  /** Additional custom metadata (can include contentType, toolCall, toolResult, messageGroupId) */
  metadata?: Record<string, unknown>;
  /** Function to recommend verbosity based on context */
  recommendVerbosity?: (ctx: import("./types.js").Context) => Verbosity | null | Promise<Verbosity | null>;
}

/**
 * Create a new entity.
 */
export function createEntity(options: CreateEntityOptions): Entity {
  const {
    content,
    type,
    summary,
    digest,
    loading = "dynamic",
    priority = 0,
    role,
    id = randomUUID(),
    metadata: customMetadata = {},
    recommendVerbosity,
  } = options;

  // Determine role based on type if not provided
  const entityRole = role ?? getRoleForType(type);

  // Handle content - can be string, EntityContent, or function
  let entityContent: EntityContent | (() => EntityContent) | (() => Promise<EntityContent>);

  if (typeof content === "string") {
    // String shorthand: convert to EntityContent object
    entityContent = {
      full: content,
      summary,
      digest,
    };
  } else if (typeof content === "function") {
    // Function: store as is (dynamic content)
    entityContent = content;
  } else {
    // EntityContent object: use as is (static content)
    entityContent = content;
  }

  const metadata: EntityMetadata = {
    type,
    loading,
    priority,
    role: entityRole,
    createdAt: Date.now(),
    ...customMetadata,
  };

  return {
    id,
    content: entityContent,
    metadata,
    recommendVerbosity,
  };
}

/**
 * Get the message role for an entity type.
 * For unknown types, defaults to "user".
 */
function getRoleForType(type: EntityType): "user" | "assistant" | "system" | "tool" {
  switch (type) {
    case BuiltInEntityTypes.SYSTEM_PROMPT:
      return "system";
    case BuiltInEntityTypes.USER_INPUT:
      return "user";
    case BuiltInEntityTypes.ASSISTANT_MESSAGE:
    case BuiltInEntityTypes.REASONING:
      return "assistant";
    case BuiltInEntityTypes.TOOL_RESULT:
      return "tool";
    default:
      // Unknown types default to "user"
      return "user";
  }
}

// =============================================================================
// Entity Content Access
// =============================================================================

/**
 * Evaluate entity content - if it's a function, call it; otherwise return the EntityContent.
 * Handles both sync and async functions.
 */
async function evaluateEntityContent(
  entity: Entity
): Promise<EntityContent> {
  const content = entity.content;

  if (typeof content === "function") {
    const result = content();
    // Handle both sync and async functions
    return result instanceof Promise ? await result : result;
  }

  // Static EntityContent object
  return content;
}

/**
 * Get entity content at a specific verbosity level.
 * Falls back to more detailed levels if requested level is not available.
 * Evaluates dynamic content (functions) when accessed.
 */
export async function getEntityContent(entity: Entity, verbosity: Verbosity): Promise<string> {
  // Reference verbosity doesn't need content evaluation
  if (verbosity === "reference") {
    return `[Entity: ${entity.id}]`;
  }

  // Evaluate the entity content (static or dynamic)
  const entityContent = await evaluateEntityContent(entity);

  switch (verbosity) {
    case "digest": {
      if (entityContent.digest) return entityContent.digest;
      if (entityContent.summary) return entityContent.summary;
      return entityContent.full;
    }
    case "summary": {
      if (entityContent.summary) return entityContent.summary;
      return entityContent.full;
    }
    case "full":
    default:
      return entityContent.full;
  }
}

/**
 * Estimate token count for entity content.
 * Uses a simple heuristic: ~4 characters per token.
 */
export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

/**
 * Estimate tokens for an entity at a given verbosity.
 * Evaluates dynamic content to get the actual string for counting.
 */
export async function estimateEntityTokens(entity: Entity, verbosity: Verbosity): Promise<number> {
  const content = await getEntityContent(entity, verbosity);
  return estimateTokens(content);
}

// =============================================================================
// Convenience Creators
// =============================================================================

/**
 * Create a system prompt entity.
 */
export function createSystemPrompt(content: string): Entity {
  return createEntity({
    content,
    type: BuiltInEntityTypes.SYSTEM_PROMPT,
    loading: "preloaded",
    priority: 100,
    role: "system",
  });
}

/**
 * Create a user input entity.
 */
export function createUserInput(content: string): Entity {
  return createEntity({
    content,
    type: BuiltInEntityTypes.USER_INPUT,
    loading: "dynamic",
    role: "user",
  });
}

/**
 * Create an assistant message entity.
 */
export function createAssistantMessage(content: string): Entity {
  return createEntity({
    content,
    type: BuiltInEntityTypes.ASSISTANT_MESSAGE,
    loading: "dynamic",
    role: "assistant",
  });
}

/**
 * Create a tool result entity.
 */
export function createToolResult(
  toolName: string,
  toolCallId: string,
  result: unknown,
  options?: { summary?: string; digest?: string }
): Entity {
  const content = typeof result === "string" ? result : JSON.stringify(result, null, 2);

  return createEntity({
    content,
    type: BuiltInEntityTypes.TOOL_RESULT,
    loading: "dynamic",
    summary: options?.summary,
    digest: options?.digest,
    id: `tool-result-${toolCallId}`,
    role: "tool",
    metadata: {
      contentType: "tool-result" as const,
      toolResult: {
        toolCallId,
        toolName,
      },
    },
  });
}

/**
 * Create a tool description entity.
 */
export function createToolDescription(
  name: string,
  description: string,
  parameters: Record<string, unknown>
): Entity {
  const fullContent = `Tool: ${name}
Description: ${description}
Parameters: ${JSON.stringify(parameters, null, 2)}`;

  const summaryContent = `${name}: ${description}`;

  return createEntity({
    content: fullContent,
    type: BuiltInEntityTypes.TOOL_DESCRIPTION,
    loading: "preloaded",
    summary: summaryContent,
    priority: 50,
  });
}

// =============================================================================
// Message Entity Creators
// =============================================================================

/**
 * Create an assistant text message entity.
 * Can be grouped with tool calls using messageGroupId.
 */
export function createAssistantTextMessage(
  content: string,
  options?: { messageGroupId?: string }
): Entity {
  return createEntity({
    content,
    type: BuiltInEntityTypes.ASSISTANT_MESSAGE,
    loading: "dynamic",
    role: "assistant",
    metadata: {
      contentType: "text" as const,
      messageGroupId: options?.messageGroupId,
    },
  });
}

/**
 * Create an assistant tool call entity.
 * Should be grouped with the assistant text message using the same messageGroupId.
 */
export function createAssistantToolCall(
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>,
  messageGroupId: string
): Entity {
  return createEntity({
    content: `[Tool call: ${toolName}]`,
    type: BuiltInEntityTypes.ASSISTANT_MESSAGE,
    loading: "dynamic",
    role: "assistant",
    id: `tool-call-${toolCallId}`,
    metadata: {
      contentType: "tool-call" as const,
      toolCall: {
        toolCallId,
        toolName,
        args,
      },
      messageGroupId,
    },
  });
}

/**
 * Create a user text message entity.
 */
export function createUserTextMessage(content: string): Entity {
  return createEntity({
    content,
    type: BuiltInEntityTypes.USER_INPUT,
    loading: "dynamic",
    role: "user",
    metadata: {
      contentType: "text" as const,
    },
  });
}

/**
 * Create a system message entity.
 */
export function createSystemMessage(content: string): Entity {
  return createEntity({
    content,
    type: BuiltInEntityTypes.SYSTEM_PROMPT,
    loading: "preloaded",
    role: "system",
    priority: 100,
    metadata: {
      contentType: "text" as const,
    },
  });
}
