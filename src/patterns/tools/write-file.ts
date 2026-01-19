import { z } from "zod";
import type { Tool, World, ToolExecutionResult } from "../../core/types.js";

// =============================================================================
// Write File Tool
// =============================================================================

const WriteFileParams = z.object({
  path: z
    .string()
    .describe("Path to the file to write (relative to working directory)"),
  content: z.string().describe("Content to write to the file"),
});

type WriteFileParams = z.infer<typeof WriteFileParams>;

/**
 * Write content to a file on the file system.
 */
export const writeFileTool: Tool<WriteFileParams, string> = {
  name: "write_file",
  description:
    "Write content to a file. Creates the file if it doesn't exist, or overwrites if it does. Creates parent directories as needed.",
  parameters: WriteFileParams,

  async execute(
    params: WriteFileParams,
    world: World
  ): Promise<ToolExecutionResult<string>> {
    try {
      await world.writeFile(params.path, params.content);
      return {
        result: `Successfully wrote ${params.content.length} characters to ${params.path}`,
        world,
        success: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        result: "",
        world,
        success: false,
        error: message,
      };
    }
  },
};
