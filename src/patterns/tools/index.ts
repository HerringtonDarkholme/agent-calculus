/**
 * Built-in tools for file system operations, skill management, and subagents.
 */

export { readFileTool } from "./read-file.js";
export { writeFileTool } from "./write-file.js";
export { listFilesTool } from "./list-files.js";
export { createSkillTools } from "./skill-tools.js";
export { createSubagentTool } from "./subagent-tool.js";
export type { SubagentToolOptions } from "./subagent-tool.js";

import { readFileTool } from "./read-file.js";
import { writeFileTool } from "./write-file.js";
import { listFilesTool } from "./list-files.js";
import type { AnyTool } from "../../core/types.js";

/**
 * All built-in file tools.
 */
export const fileTools: AnyTool[] = [
  readFileTool,
  writeFileTool,
  listFilesTool,
];
