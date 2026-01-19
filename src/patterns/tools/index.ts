/**
 * Built-in tools for file system operations.
 */

export { readFileTool } from "./read-file.js";
export { writeFileTool } from "./write-file.js";
export { listFilesTool } from "./list-files.js";

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
