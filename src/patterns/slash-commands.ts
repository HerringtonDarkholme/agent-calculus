import type { World, Entity } from "../core/types.js";
import { createEntity } from "../core/entity.js";

// =============================================================================
// Slash Command Types
// =============================================================================

/**
 * Result of slash command execution.
 */
export interface SlashCommandResult {
  /** Result message */
  message: string;
  /** Whether execution succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Updated world state (if modified) */
  world?: World;
}

/**
 * Slash command definition.
 */
export interface SlashCommand {
  /** Command name (without slash) */
  name: string;
  /** Command description */
  description: string;
  /** Command usage example */
  usage?: string;
  /** Command aliases */
  aliases?: string[];
  /** Execute the command */
  execute: (args: string[], world: World) => Promise<SlashCommandResult>;
}

// =============================================================================
// Slash Command Registry
// =============================================================================

/**
 * Registry for managing slash commands.
 */
export class SlashCommandRegistry {
  private commands: Map<string, SlashCommand> = new Map();

  /**
   * Register a slash command.
   */
  register(command: SlashCommand): void {
    this.commands.set(command.name, command);

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.commands.set(alias, command);
      }
    }
  }

  /**
   * Register multiple slash commands.
   */
  registerMany(commands: SlashCommand[]): void {
    for (const command of commands) {
      this.register(command);
    }
  }

  /**
   * Get a command by name.
   */
  get(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }

  /**
   * Check if a command exists.
   */
  has(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * Get all commands (without duplicates from aliases).
   */
  getAll(): SlashCommand[] {
    const seen = new Set<SlashCommand>();
    const commands: SlashCommand[] = [];

    for (const command of this.commands.values()) {
      if (!seen.has(command)) {
        seen.add(command);
        commands.push(command);
      }
    }

    return commands;
  }

  /**
   * List all command names and descriptions.
   */
  list(): Array<{ name: string; description: string; aliases?: string[] }> {
    return this.getAll().map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
      aliases: cmd.aliases,
    }));
  }

  /**
   * Parse a slash command string.
   * Returns null if not a valid slash command.
   */
  parse(input: string): { command: string; args: string[] } | null {
    const trimmed = input.trim();
    if (!trimmed.startsWith("/")) {
      return null;
    }

    // Remove leading slash
    const withoutSlash = trimmed.slice(1);

    // Split by whitespace
    const parts = withoutSlash.split(/\s+/);
    if (parts.length === 0) {
      return null;
    }

    const command = parts[0];
    const args = parts.slice(1);

    return { command, args };
  }

  /**
   * Execute a slash command.
   */
  async execute(input: string, world: World): Promise<SlashCommandResult> {
    const parsed = this.parse(input);

    if (!parsed) {
      return {
        message: "Invalid slash command format. Commands should start with /",
        success: false,
        error: "Invalid format",
      };
    }

    const { command, args } = parsed;

    const slashCommand = this.get(command);
    if (!slashCommand) {
      return {
        message: `Unknown command: /${command}\n\nUse /help to see available commands.`,
        success: false,
        error: "Command not found",
      };
    }

    try {
      return await slashCommand.execute(args, world);
    } catch (error) {
      return {
        message: `Error executing command /${command}: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Create a new slash command registry.
 */
export function createSlashCommandRegistry(): SlashCommandRegistry {
  return new SlashCommandRegistry();
}

// =============================================================================
// Slash Command Entity Creation
// =============================================================================

/**
 * Create an entity from a slash command result.
 * This entity will be injected into the context so the agent sees the command output.
 */
export function createSlashCommandEntity(
  command: string,
  result: SlashCommandResult
): Entity {
  const content = result.success
    ? `Slash command executed: ${command}\n\nResult:\n${result.message}`
    : `Slash command failed: ${command}\n\nError:\n${result.message}`;

  return createEntity({
    content,
    type: "slash_command_result",
    loading: "dynamic",
    summary: `/${command} → ${result.success ? "success" : "failed"}`,
    role: "user", // Command results appear as user messages
  });
}

/**
 * Check if user input is a slash command and execute it.
 * Returns the command result entity if it was a slash command, null otherwise.
 */
export async function interceptSlashCommand(
  input: string,
  world: World,
  registry: SlashCommandRegistry
): Promise<{ entity: Entity; result: SlashCommandResult } | null> {
  const parsed = registry.parse(input);
  if (!parsed) {
    return null;
  }

  // Execute the command
  const result = await registry.execute(input, world);

  // Create entity from result
  const entity = createSlashCommandEntity(parsed.command, result);

  return { entity, result };
}

// =============================================================================
// Built-in Slash Commands
// =============================================================================

/**
 * Create the built-in help command.
 */
export function createHelpCommand(registry: SlashCommandRegistry): SlashCommand {
  return {
    name: "help",
    description: "Show all available slash commands",
    aliases: ["h", "?"],
    usage: "/help [command]",
    async execute(args: string[], _world: World): Promise<SlashCommandResult> {
      // If specific command requested
      if (args.length > 0) {
        const cmdName = args[0];
        const command = registry.get(cmdName);

        if (!command) {
          return {
            message: `Command not found: /${cmdName}`,
            success: false,
            error: "Command not found",
          };
        }

        let msg = `Command: /${command.name}\n`;
        msg += `Description: ${command.description}\n`;
        if (command.usage) {
          msg += `Usage: ${command.usage}\n`;
        }
        if (command.aliases && command.aliases.length > 0) {
          msg += `Aliases: ${command.aliases.map((a) => `/${a}`).join(", ")}\n`;
        }

        return {
          message: msg,
          success: true,
        };
      }

      // List all commands
      const commands = registry.list();
      let msg = "Available slash commands:\n\n";

      for (const cmd of commands) {
        msg += `  /${cmd.name}`;
        if (cmd.aliases && cmd.aliases.length > 0) {
          msg += ` (${cmd.aliases.map((a) => `/${a}`).join(", ")})`;
        }
        msg += `\n    ${cmd.description}\n`;
      }

      msg += "\nUse /help <command> for detailed information.";

      return {
        message: msg,
        success: true,
      };
    },
  };
}

/**
 * Create the built-in list command (alias for help).
 */
export function createListCommand(registry: SlashCommandRegistry): SlashCommand {
  return {
    name: "list",
    description: "List all available slash commands",
    aliases: ["ls", "commands"],
    async execute(_args: string[], _world: World): Promise<SlashCommandResult> {
      const helpCommand = registry.get("help");
      if (helpCommand) {
        return helpCommand.execute([], _world);
      }

      return {
        message: "Help command not available",
        success: false,
        error: "Help command not found",
      };
    },
  };
}

/**
 * Create all built-in slash commands.
 */
export function createBuiltInCommands(registry: SlashCommandRegistry): SlashCommand[] {
  return [createHelpCommand(registry), createListCommand(registry)];
}
