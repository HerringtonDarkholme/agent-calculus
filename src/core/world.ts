import * as fs from "fs/promises";
import * as path from "path";
import type { World } from "./types.js";

// =============================================================================
// File System World Implementation
// =============================================================================

/**
 * Create a World instance with file system access.
 *
 * The World represents everything outside the LLM's context.
 * The harness bridges the LLM to the world through tool execution.
 */
export function createWorld(workingDirectory: string): World {
  // Ensure working directory is absolute
  const absWorkingDir = path.resolve(workingDirectory);

  return {
    workingDirectory: absWorkingDir,

    /**
     * Resolve a path relative to the working directory.
     * Returns absolute path, safely contained within working directory.
     */
    resolvePath(filePath: string): string {
      // If already absolute, use as-is but validate it's under working dir
      if (path.isAbsolute(filePath)) {
        const resolved = path.normalize(filePath);
        if (!resolved.startsWith(absWorkingDir)) {
          throw new Error(
            `Path ${filePath} is outside working directory ${absWorkingDir}`
          );
        }
        return resolved;
      }

      // Resolve relative path
      const resolved = path.resolve(absWorkingDir, filePath);

      // Security: ensure resolved path is within working directory
      if (!resolved.startsWith(absWorkingDir)) {
        throw new Error(
          `Path ${filePath} resolves outside working directory ${absWorkingDir}`
        );
      }

      return resolved;
    },

    /**
     * Read a file's contents.
     */
    async readFile(filePath: string): Promise<string> {
      const resolved = this.resolvePath(filePath);
      try {
        return await fs.readFile(resolved, "utf-8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          throw new Error(`File not found: ${filePath}`);
        }
        throw error;
      }
    },

    /**
     * Write content to a file.
     * Creates parent directories if they don't exist.
     */
    async writeFile(filePath: string, content: string): Promise<void> {
      const resolved = this.resolvePath(filePath);
      const dir = path.dirname(resolved);

      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(resolved, content, "utf-8");
    },

    /**
     * List files in a directory.
     * Returns relative paths from the directory.
     */
    async listFiles(dirPath: string): Promise<string[]> {
      const resolved = this.resolvePath(dirPath);

      try {
        const entries = await fs.readdir(resolved, { withFileTypes: true });
        return entries.map((entry) => {
          const name = entry.name;
          return entry.isDirectory() ? `${name}/` : name;
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          throw new Error(`Directory not found: ${dirPath}`);
        }
        throw error;
      }
    },

    /**
     * Check if a file exists.
     */
    async fileExists(filePath: string): Promise<boolean> {
      const resolved = this.resolvePath(filePath);
      try {
        await fs.access(resolved);
        return true;
      } catch {
        return false;
      }
    },
  };
}

// =============================================================================
// World Utilities
// =============================================================================

/**
 * Get file stats (size, modification time, etc.)
 */
export async function getFileStats(
  world: World,
  filePath: string
): Promise<{
  size: number;
  modifiedAt: Date;
  isDirectory: boolean;
}> {
  const resolved = world.resolvePath(filePath);
  const stats = await fs.stat(resolved);

  return {
    size: stats.size,
    modifiedAt: stats.mtime,
    isDirectory: stats.isDirectory(),
  };
}

/**
 * Recursively list all files in a directory.
 */
export async function listFilesRecursive(
  world: World,
  dirPath: string,
  options?: { maxDepth?: number; filter?: (name: string) => boolean }
): Promise<string[]> {
  const { maxDepth = 10, filter } = options ?? {};
  const results: string[] = [];

  async function walk(currentPath: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    const entries = await world.listFiles(currentPath);

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry);
      const isDir = entry.endsWith("/");
      const cleanPath = isDir ? fullPath.slice(0, -1) : fullPath;

      if (filter && !filter(cleanPath)) continue;

      results.push(cleanPath);

      if (isDir) {
        await walk(cleanPath, depth + 1);
      }
    }
  }

  await walk(dirPath, 0);
  return results;
}
