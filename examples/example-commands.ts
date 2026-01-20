/**
 * Example custom slash commands
 */

import type { SlashCommand, SlashCommandResult } from "../src/patterns/slash-commands.js";
import type { World } from "../src/core/types.js";

// =============================================================================
// Example Custom Commands
// =============================================================================

/**
 * Echo command - echoes back the arguments.
 */
export const echoCommand: SlashCommand = {
  name: "echo",
  description: "Echo back the provided arguments",
  usage: "/echo <message>",
  aliases: ["say"],
  async execute(args: string[], _world: World): Promise<SlashCommandResult> {
    if (args.length === 0) {
      return {
        message: "Usage: /echo <message>",
        success: false,
        error: "No arguments provided",
      };
    }

    const message = args.join(" ");
    return {
      message: `Echo: ${message}`,
      success: true,
    };
  },
};

/**
 * Status command - shows current working directory.
 */
export const statusCommand: SlashCommand = {
  name: "status",
  description: "Show current system status",
  usage: "/status",
  aliases: ["stat"],
  async execute(_args: string[], world: World): Promise<SlashCommandResult> {
    const message = `System Status:
- Working Directory: ${world.workingDirectory}
- Status: Active
- Ready for commands`;

    return {
      message,
      success: true,
    };
  },
};

/**
 * Info command - shows file information.
 */
export const infoCommand: SlashCommand = {
  name: "info",
  description: "Show information about a file",
  usage: "/info <filename>",
  async execute(args: string[], world: World): Promise<SlashCommandResult> {
    if (args.length === 0) {
      return {
        message: "Usage: /info <filename>",
        success: false,
        error: "No filename provided",
      };
    }

    const filename = args[0];

    try {
      const exists = await world.fileExists(filename);
      if (!exists) {
        return {
          message: `File not found: ${filename}`,
          success: false,
          error: "File not found",
        };
      }

      const content = await world.readFile(filename);
      const lines = content.split("\n").length;
      const bytes = content.length;

      const message = `File Information: ${filename}
- Lines: ${lines}
- Size: ${bytes} bytes
- Exists: Yes`;

      return {
        message,
        success: true,
      };
    } catch (error) {
      return {
        message: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Greet command - personalized greeting.
 */
export const greetCommand: SlashCommand = {
  name: "greet",
  description: "Greet the user",
  usage: "/greet [name]",
  aliases: ["hello", "hi"],
  async execute(args: string[], _world: World): Promise<SlashCommandResult> {
    const name = args.length > 0 ? args.join(" ") : "there";
    const message = `Hello, ${name}! Welcome to Agent Calculus.`;

    return {
      message,
      success: true,
    };
  },
};

/**
 * Time command - shows current time.
 */
export const timeCommand: SlashCommand = {
  name: "time",
  description: "Show current time",
  usage: "/time",
  aliases: ["now", "date"],
  async execute(_args: string[], _world: World): Promise<SlashCommandResult> {
    const now = new Date();
    const message = `Current Time: ${now.toLocaleString()}`;

    return {
      message,
      success: true,
    };
  },
};

/**
 * All example commands.
 */
export const exampleCommands: SlashCommand[] = [
  echoCommand,
  statusCommand,
  infoCommand,
  greetCommand,
  timeCommand,
];
