import type { CoreMessage } from "ai";
import type { Context, Entity, LoadedEntity, Verbosity } from "./types.js";
import { estimateEntityTokens, getEntityContent } from "./entity.js";

// =============================================================================
// Context Implementation
// =============================================================================

/**
 * Create a new empty context.
 */
export function createContext(maxTokens: number = 128000): Context {
  return {
    entities: [],
    maxTokens,
    currentTokens: 0,
  };
}

/**
 * Append an entity to context.
 * Returns a new context (immutable).
 */
export async function appendEntity(
  ctx: Context,
  entity: Entity,
  verbosity: Verbosity = "full"
): Promise<Context> {
  const tokens = await estimateEntityTokens(entity, verbosity);

  const loadedEntity: LoadedEntity = {
    entity,
    verbosity,
    tokens,
  };

  return {
    ...ctx,
    entities: [...ctx.entities, loadedEntity],
    currentTokens: ctx.currentTokens + tokens,
  };
}

/**
 * Check if context has space for additional tokens.
 */
export function hasSpace(ctx: Context, tokens: number): boolean {
  return ctx.currentTokens + tokens <= ctx.maxTokens;
}

/**
 * Get context utilization as a percentage.
 */
export function getUtilization(ctx: Context): number {
  return ctx.currentTokens / ctx.maxTokens;
}

/**
 * Remove an entity from context by ID.
 */
export function removeEntity(ctx: Context, entityId: string): Context {
  const entities = ctx.entities.filter((e) => e.entity.id !== entityId);
  const currentTokens = entities.reduce((sum, e) => sum + (e.tokens ?? 0), 0);

  return {
    ...ctx,
    entities,
    currentTokens,
  };
}

/**
 * Update verbosity of an entity in context.
 */
export async function updateVerbosity(
  ctx: Context,
  entityId: string,
  verbosity: Verbosity
): Promise<Context> {
  const entities = await Promise.all(
    ctx.entities.map(async (e) => {
      if (e.entity.id === entityId) {
        const tokens = await estimateEntityTokens(e.entity, verbosity);
        return { ...e, verbosity, tokens };
      }
      return e;
    })
  );

  const currentTokens = entities.reduce((sum, e) => sum + (e.tokens ?? 0), 0);

  return {
    ...ctx,
    entities,
    currentTokens,
  };
}

// =============================================================================
// Message Conversion
// =============================================================================

/**
 * Convert context to messages for Vercel AI SDK.
 * Rebuilds messages from entities based on their message metadata.
 */
export async function contextToMessages(ctx: Context): Promise<CoreMessage[]> {
  const messages: CoreMessage[] = [];

  // Filter entities that have message roles
  const messageEntities = ctx.entities.filter((e) => e.entity.metadata.role);

  // Group entities by messageGroupId or process individually
  const processedGroups = new Set<string>();

  for (let i = 0; i < messageEntities.length; i++) {
    const loadedEntity = messageEntities[i];
    const entity = loadedEntity.entity;
    const meta = entity.metadata;

    // Skip if already processed as part of a group
    if (meta.messageGroupId && processedGroups.has(meta.messageGroupId)) {
      continue;
    }

    // If entity has a group ID, collect all entities in the group
    if (meta.messageGroupId) {
      processedGroups.add(meta.messageGroupId);

      const groupEntities = messageEntities.filter(
        (e) => e.entity.metadata.messageGroupId === meta.messageGroupId
      );

      // Build multi-part message
      const message = await buildMultiPartMessage(groupEntities, loadedEntity.verbosity);
      if (message) {
        messages.push(message);
      }
    } else {
      // Single entity message
      const message = await buildSingleMessage(loadedEntity);
      if (message) {
        messages.push(message);
      }
    }
  }

  return messages;
}

/**
 * Build a single message from one entity.
 */
async function buildSingleMessage(
  loadedEntity: LoadedEntity
): Promise<CoreMessage | null> {
  const entity = loadedEntity.entity;
  const meta = entity.metadata;
  const role = meta.role;

  if (!role) {
    return null;
  }

  const content = await getEntityContent(entity, loadedEntity.verbosity);

  // Simple text message
  if (!meta.contentType || meta.contentType === "text") {
    return { role, content } as CoreMessage;
  }

  // Tool result message
  if (meta.contentType === "tool-result" && meta.toolResult) {
    return {
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: meta.toolResult.toolCallId,
          toolName: meta.toolResult.toolName,
          result: content,
        },
      ],
    } as CoreMessage;
  }

  // Default to text
  return { role, content } as CoreMessage;
}

/**
 * Build a multi-part message from grouped entities.
 */
async function buildMultiPartMessage(
  groupEntities: LoadedEntity[],
  defaultVerbosity: import("./types.js").Verbosity
): Promise<CoreMessage | null> {
  if (groupEntities.length === 0) {
    return null;
  }

  const firstEntity = groupEntities[0].entity;
  const role = firstEntity.metadata.role;

  if (!role) {
    return null;
  }

  // Build content array
  const contentParts: any[] = [];

  for (const loadedEntity of groupEntities) {
    const entity = loadedEntity.entity;
    const meta = entity.metadata;
    const content = await getEntityContent(entity, loadedEntity.verbosity);

    if (meta.contentType === "text") {
      contentParts.push({
        type: "text",
        text: content,
      });
    } else if (meta.contentType === "tool-call" && meta.toolCall) {
      contentParts.push({
        type: "tool-call",
        toolCallId: meta.toolCall.toolCallId,
        toolName: meta.toolCall.toolName,
        args: meta.toolCall.args,
      });
    } else if (meta.contentType === "tool-result" && meta.toolResult) {
      contentParts.push({
        type: "tool-result",
        toolCallId: meta.toolResult.toolCallId,
        toolName: meta.toolResult.toolName,
        result: content,
      });
    }
  }

  // If only one text part, return as simple string
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return { role, content: contentParts[0].text } as CoreMessage;
  }

  return { role, content: contentParts } as CoreMessage;
}

// =============================================================================
// Context Queries
// =============================================================================

/**
 * Find an entity in context by ID.
 */
export function findEntity(ctx: Context, entityId: string): LoadedEntity | undefined {
  return ctx.entities.find((e) => e.entity.id === entityId);
}

/**
 * Get all entities of a specific type.
 */
export function getEntitiesByType(ctx: Context, type: string): LoadedEntity[] {
  return ctx.entities.filter((e) => e.entity.metadata.type === type);
}

/**
 * Get the last entity added to context.
 */
export function getLastEntity(ctx: Context): LoadedEntity | undefined {
  return ctx.entities[ctx.entities.length - 1];
}

/**
 * Count entities in context.
 */
export function countEntities(ctx: Context): number {
  return ctx.entities.length;
}
