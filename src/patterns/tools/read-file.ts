import { z } from "zod";
import type { Tool, World, ToolExecutionResult } from "../../core/types.js";

// =============================================================================
// Read File Tool
// =============================================================================

const ReadFileParams = z.object({
  path: z.string().describe("Path to the file to read (relative to working directory)"),
});

type ReadFileParams = z.infer<typeof ReadFileParams>;

/**
 * Read file contents from the file system.
 */
export const readFileTool: Tool<ReadFileParams, string> = {
  name: "read_file",
  description:
    "Read the contents of a file from the file system. Returns the file content as text.",
  parameters: ReadFileParams,

  async execute(
    params: ReadFileParams,
    world: World
  ): Promise<ToolExecutionResult<string>> {
    try {
      const content = await world.readFile(params.path);
      return {
        result: content,
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
