import { z } from "zod";
import type { Tool, World, ToolExecutionResult } from "../../core/types.js";

// =============================================================================
// List Files Tool
// =============================================================================

const ListFilesParams = z.object({
  path: z
    .string()
    .optional()
    .describe("Path to the directory to list (relative to working directory, defaults to current directory)"),
});

type ListFilesParams = z.infer<typeof ListFilesParams>;

/**
 * List files in a directory.
 */
export const listFilesTool: Tool<ListFilesParams, string[]> = {
  name: "list_files",
  description:
    "List files and directories in a given path. Directories are indicated with a trailing slash (/). Returns an array of file and directory names.",
  parameters: ListFilesParams,

  async execute(
    params: ListFilesParams,
    world: World
  ): Promise<ToolExecutionResult<string[]>> {
    try {
      const path = params.path ?? ".";
      const files = await world.listFiles(path);
      return {
        result: files,
        world,
        success: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        result: [],
        world,
        success: false,
        error: message,
      };
    }
  },
};
