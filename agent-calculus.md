# Agent Calculus: A Unified Framework for AI Agent Design

## Abstract

Let me tell you about something rather exciting. We're going to develop a unified formal framework for understanding AI agents—a kind of calculus, if you will. At the heart of this framework is a beautifully simple idea: **entities** as the fundamental unit of agent computation. And we'll define a **harness** that manages how these entities flow between the LLM's context and the external world.

What's particularly elegant about this, and what I think you'll find quite satisfying, is that this single framework unifies disparate concepts—skills, tools, memory, subagents, dynamic context loading—all under one coherent model. Rather nice, don't you think?

## 1. Introduction & Motivation

### The Problem

Now, let's start by asking ourselves: what's going on in modern AI agent systems? Well, if you look carefully, you'll find we're juggling quite a few distinct concepts:
- **Tools**: Functions the agent can call to interact with the world
- **Skills**: Reusable prompt templates and workflows
- **Rules**: Configuration files (agent.md) defining behavioral constraints and guidelines
- **Slash Commands**: User-invocable shortcuts that trigger specialized workflows
- **Memory**: Persistent state from previous interactions
- **Subagents**: Spawned agents for subtasks
- **Dynamic context loading**: Just-in-time injection of relevant information
- **System prompts**: Static instructions and behavior definitions

And here's the thing that should make us a bit uncomfortable: these concepts are typically treated as completely separate mechanisms. It's a bit of a mess, frankly. What does this lead to?
- Conceptual fragmentation in agent design—we can't see the forest for the trees
- Difficulty reasoning about agent behavior holistically
- Lack of composability between different agent patterns

This is what I call the "bag of tricks" approach. It works, but it's not particularly satisfying intellectually, is it?

### The Solution

So what can we do about this? Well, here's the key insight: what if we had a unified way to think about all these disparate concepts? Let me introduce three fundamental building blocks:

**LLM (Large Language Model)**
- A pure function that takes context as input and produces reasoning and actions as output
- It's the "brain" but critically, it has no direct access to the world
- Cannot see files, networks, databases, or any state unless explicitly loaded into its context

**Harness**
- The orchestration layer that manages what goes into the LLM's context and executes the actions it requests
- Think of it as the "body" that bridges the LLM to the world
- Two primary responsibilities:
  1. **Loading**: Filtering and packing entities into the LLM's limited context
  2. **Execution**: Handling LLM actions and returning new entities

**Entities**
- A unified abstraction for *everything*: tools, skills, memory, user input, results
- They all become entities that flow between the harness and the LLM
- This is the key insight—treating all inputs uniformly

```
Agent = LLM + Harness
```

That's it! An agent is just the composition of these two components with entities flowing between them. The beauty here is that we've found the right level of abstraction. Not too high, not too low. Just right.

Now, why is this a good idea? What does this abstraction give us?
- Unified reasoning about agent behavior—one model, not six
- Compositional design patterns—things snap together nicely
- Systematic approaches to context management
- Formal analysis of multi-agent systems

## 2. Core Assumptions

Now, before we dive into the technical details, let's be absolutely clear about our assumptions. I'm a great believer in making assumptions explicit—it prevents all sorts of confusion later on. We're going to make three foundational assumptions to simplify our calculus:

**Assumption 1: Limited Context**

Here's the first assumption, and it's crucial: *LLM context windows are finite and constrained*. Context is the primary scarce resource in agent systems.

Think about it this way: you've got perhaps 128K tokens to work with. That's it. Everything has to fit in there. This is the bottleneck, the constraint that drives everything else in our design.

Now, you might say, "But hey, won't context windows get larger in the future?" And you'd be absolutely right! There's fascinating work happening—conditional memory lookup systems like Engram (https://github.com/deepseek-ai/Engram?tab=readme-ov-file), and techniques like DroPE that extend context by dropping positional embeddings (https://pub.sakana.ai/DroPE/). But even so, the fundamental constraint remains: context is finite. The limit may move, but there will always *be* a limit.

**Assumption 2: Static Capabilities**

Second assumption: *LLMs do not perform continual learning during inference*. Their capabilities are fixed at deployment.

What do I mean by that? Well, when you're running an agent, the LLM isn't learning new skills on the fly. It's not updating its weights. It's a fixed function—you give it input, you get output, but the function itself doesn't change.

Of course, this might change in the future. There's intriguing research on nested learning (see https://abehrouz.github.io/files/NL.pdf) that could allow routine context loading to be absorbed into model weights. But for now, we'll assume static capabilities. It makes our model much cleaner.

**Assumption 3: LLM Homogeneity**

Third assumption: *For the purposes of this calculus, we treat different LLMs as interchangeable*.

Now, I can hear you protesting: "But  hey, GPT-4 is different from Claude is different from Llama!" Yes, yes, in practice they differ. But for our formal model, we're going to abstract over those differences. This isn't about being sloppy—it's about finding the right level of abstraction to make progress on the core ideas.

## 3. Fundamental Definitions

### 3.1 LLM as Pure Function

Right, let's get formal. How should we model an LLM? Here's my proposal: let's think of it as a *pure function*. What do I mean by that?

```
LLM: Context → (Reasoning, Actions)
```

Look at this signature carefully. The LLM takes one thing as input and produces two things as output:

**Input:**
- `Context`: The text and structured data directly accessible to the LLM

**Outputs:**
- `Reasoning`: Internal thought process, chain-of-thought, analysis
- `Actions`: Structured requests to interact with the world (tool calls, responses, queries)

Now here's the crucial bit: *The LLM has no direct access to anything outside its context*. It cannot see files, networks, databases, or any other state unless that information is explicitly loaded into its context. Think of it as being in a sealed room—the only thing it can see is what's written on the walls of that room (the context).

### 3.2 Context vs World

This distinction is absolutely fundamental, so let me be very precise about it:

**Context**: The observable, directly accessible information within the LLM's attention window.
- Limited in size (e.g., 128K tokens)—remember Assumption 1!
- Directly influences LLM outputs
- Managed by the harness

**World**: Everything outside the context that the agent might need.
- File systems
- Databases
- APIs
- Previous conversation history (not currently in context)
- External knowledge bases

You see the picture? The LLM lives in the context, isolated from the world. The harness acts as the bridge between these two realms. It's rather like the distinction between memory and disk in operating systems—one is fast and limited, the other is vast but inaccessible without mediation.

### 3.3 Agent Decomposition

Now we come to one of the most important equations in this whole framework. Are you ready? Here it is:

```
Agent = LLM + Harness
```

That's it! An agent is just the composition of two components. Let me be clear about their respective responsibilities:

The **LLM** performs reasoning and generates actions. It's the brain, if you like.

The **Harness** manages the agent loop:
- Loads entities into context
- Executes actions in the world
- Handles context window constraints

This separation of concerns is tremendously powerful. The LLM doesn't worry about context management—that's the harness's job. And the harness doesn't do reasoning—that's the LLM's job. Clean separation, clean interfaces.

## 4. The Entity Abstraction

Now we come to the real heart of the matter. Are you ready for the core insight? Here it is:

**Everything that can be loaded into an LLM's context is an entity.**

Let me say that again, because it's so important: *everything*. Tools? Entities. Skills? Entities. Memory? Entities. User input? Entity. Tool results? Entities. All entities! This is the abstraction that unifies the whole framework.

### 4.1 Entity Definition

So what is an entity, precisely? It's wonderfully simple:

An entity is a unit of information with:
- **Content**: The actual data or text
- **Metadata**: How it should be loaded, when it's relevant, its size

That's it! Content and metadata. The content is what goes into the context, and the metadata tells the harness how to manage it.

### 4.2 Entity Types by Loading Strategy

| Entity Type | Content Nature | Loading Strategy | Example |
|-------------|----------------|------------------|---------|
| **System Prompt** | Static | Preloaded | Agent role definition, rules |
| **Tool Description** | Static | Dynamic or preloaded | Function signature, usage docs |
| **Skill** | Static | Dynamic | Reusable prompt templates |
| **Memory** | Dynamic | Preloaded | Conversation summaries |
| **User Input** | Dynamic | Preloaded | Current user message |
| **Tool Result** | Dynamic | Dynamic | Data returned from actions |

### 4.3 Entity Dimensions

Now, entities aren't all the same, are they? We can characterize them along multiple dimensions. Think of this as a design space:

**1. Content Mutability**
- **Static**: Content doesn't change (tool definitions, skills)
- **Dynamic**: Content changes during execution (memory, tool results)

**2. Loading Time**
- **Preloaded**: Always in context (system prompt, current memory)
- **Dynamic**: Loaded on-demand (skills when invoked, tool descriptions when relevant)

**3. Verbosity Levels**—this is particularly clever:
- **Full**: Complete content loaded
- **Summary**: Condensed version (e.g., skill titles only)
- **Digest**: Compressed representation (e.g., large tool results summarized)
- **Reference**: Pointer only (content remains in world, accessed via actions)

You see what we're doing here? We're giving ourselves a knob to turn—we can control how much of each entity we load into the precious, limited context. This is how we'll manage the context window constraint!

### 4.4 Examples

**Example: Tool as Entity**
```
Entity: FileReadTool
  Content (full):
    Name: read_file
    Description: Reads contents of a file from disk
    Parameters:
      - path: string (absolute path)
      - offset: int (optional, start line)
      - limit: int (optional, number of lines)
    Returns: string (file contents)

  Content (summary):
    read_file: Read file contents

  Metadata:
    type: tool_description
    static: true
    loading: dynamic (loaded when file operations relevant)
```

**Example: Memory as Entity**
```
Entity: ConversationMemory
  Content (full):
    [Last 50 conversation turns with full context]

  Content (digest):
    Summary: User is implementing auth system for web app.
    Currently debugging JWT token validation.
    Tech stack: Node.js, Express, PostgreSQL.

  Metadata:
    type: memory
    static: false (updated after each turn)
    loading: preloaded
    compression: digest after 10 turns
```

**Example: Skill as Entity**
```
Entity: GitCommitSkill
  Content (full):
    # Git Commit Workflow
    1. Run git status to see changes
    2. Review git diff for staged changes
    3. Draft commit message following repo conventions
    4. Execute git commit with message
    5. Verify with git log

  Content (summary):
    GitCommitSkill: Create git commits following best practices

  Metadata:
    type: skill
    static: true
    loading: dynamic (loaded when user requests git commit)
```

## 5. The Harness

Right, let's talk about the harness. This is the orchestration layer that manages the agent loop. It has two core responsibilities, and I want to be very precise about them.

### 5.1 Load Function

Here's the first function, and it's a beauty:

```
load: (Context, Entity, List[Entity]) → Context'
```

**Purpose**: Intelligently pack entities into the limited context window.

Now let's break this down. What are the inputs and outputs?

**Inputs:**
- `Context`: Current context state
- `Entity`: New entity to incorporate (e.g., fresh user input, tool result)
- `List[Entity]`: Available entities that could be loaded

**Output:**
- `Context'`: Updated context ready for LLM consumption

But here's the thing—this isn't just blindly stuffing things into context! The load function has some serious responsibilities:

1. **Filtering**: Select only relevant entities from available pool. Don't load file tools if we're doing math!
2. **Compression**: Choose appropriate verbosity level for each entity. Full detail where needed, summaries elsewhere.
3. **Ordering**: Arrange entities for optimal LLM performance. This matters more than you might think!
4. **Eviction**: Remove or compress old entities if context is full. Something's got to go.

This is where all the cleverness happens. The load function is like a skilled editor, deciding what goes in, what stays out, and how much detail to include.

### 5.1.1 Entity Self-Recommendation

Now here's an elegant optimization: **entities can recommend their own loading behavior**!

Each entity can optionally provide a `recommendVerbosity` function:

```python
class Entity:
    # ... other fields ...

    # Optional: Entity recommends how it should be loaded
    recommendVerbosity: Optional[(Context) → Verbosity | None]
```

**How it works:**
1. The load function iterates through available entities
2. For each entity, it calls `entity.recommendVerbosity(ctx)`
3. The entity examines the context and returns:
   - A verbosity level (`full`, `summary`, `digest`) if it should be loaded
   - `None` if it should not be loaded at all
4. The load function respects these recommendations (though it may override based on context constraints)

**Why this is brilliant:**
- **Separation of concerns**: Each entity encapsulates its own loading logic
- **Extensibility**: New entity types can define custom loading behavior without modifying the harness
- **Context-aware**: Entities can examine the full context to make informed decisions
- **Composability**: Loading logic travels with the entity, making patterns reusable

**Example - Slash Command Entity:**
```python
def create_slash_command_entity(command_name: str, workflow: str):
    def recommend_verbosity(ctx: Context) -> Verbosity | None:
        # Check if user input contains this slash command
        last_user_msg = get_last_user_message(ctx)
        if last_user_msg and last_user_msg.startswith(f"/{command_name}"):
            return "full"  # Load the full workflow
        return None  # Don't load if not triggered

    return Entity(
        content=workflow,
        type="slash_command",
        loading="dynamic",
        recommendVerbosity=recommend_verbosity
    )
```

The harness simply asks each entity: "Should you be loaded?" The entity decides based on the context!

### 5.2 Execute Function

Now for the second function:

```
execute: (Action, World) → (Entity, World')
```

**Purpose**: Perform actions in the world and return results as entities.

What's happening here? The LLM generates an action, and the harness makes it happen in the real world.

**Inputs:**
- `Action`: LLM-generated action (tool call, query, response)
- `World`: Current world state

**Outputs:**
- `Entity`: Result data packaged as an entity—notice this! The result comes back as an entity.
- `World'`: Updated world state after action

Let me give you some concrete examples:
- `Action = read_file("config.json")` → `Entity = {type: "tool_result", content: "{...json...}"}`
- `Action = spawn_subagent("research task")` → `Entity = {type: "subagent_result", content: "..."}`
- `Action = respond("Done!")` → `Entity = {type: "agent_response", content: "Done!"}`

You see the pattern? Action goes out, entity comes back. The world might change (that's `World'`), and we get new information as an entity ready to be loaded into context on the next turn.

### 5.3 Context Window Management

The `load` function implements sophisticated strategies to handle context constraints:

#### Strategy 1: Relevance Filtering
Only load entities relevant to current task:
```
if task involves file operations:
  load file-related tool descriptions
else:
  omit file tools (even if available)
```

#### Strategy 2: Progressive Compression
```
# Fresh tool result: load full content
load(entity=tool_result, verbosity=full)

# After LLM reasoning: compress it
load(entity=tool_result, verbosity=digest)

# After several turns: remove entirely if no longer relevant
omit(entity=tool_result)
```

#### Strategy 3: Hierarchical Summarization
```
# If 50 tools available:
Group into categories: [file_ops, network, database, ...]
Load only category summaries initially
Load full descriptions only when category selected
```

#### Strategy 4: Swap Full↔Digest
```
Context before LLM call:
  [system_prompt] [memory_digest] [tool_result_FULL] [user_input]

Context after LLM reasoning:
  [system_prompt] [memory_digest] [tool_result_DIGEST] [llm_reasoning] [new_action]
```

### 5.4 Atomic Load Operations

The `load` function is composed of atomic operations:

| Operation | Purpose | Example |
|-----------|---------|---------|
| **summarize** | Reduce entity size | Compress 50 messages → 1 paragraph |
| **elaborate** | Add more context | Expand terse user input with clarifications |
| **omit** | Remove entity completely | Drop tool result from 10 turns ago |
| **paraphrase** | Rewrite for clarity | Standardize user input phrasing |
| **group** | Combine related entities | Bundle related tool descriptions |

## 6. The Agent Loop

Right, this is where it all comes together! Now we can express the complete agent execution as a beautifully simple loop. This is the payoff for all our careful design.

### 6.1 Pseudocode

Look at this carefully:

```python
def agent_loop(user_input, world):
    ctx = Context()
    entity = Entity(content=user_input, type="user_input")

    # Discover ALL available entities: tools, skills, memory, slash commands, rules, etc.
    # This is the complete pool of entities that load() can choose from
    entities = discover_available_entities(world)

    while not should_stop(ctx):
        # LOAD PHASE
        # The load function decides which entities from the available pool to pack into context
        # For example, if user_input starts with "/commit", load() will include the /commit entity
        ctx = harness.load(ctx, entity, entities)

        # REASONING PHASE
        # LLM processes context and generates action
        reasoning, action = llm(ctx)

        # Add reasoning to context for continuity
        ctx = ctx.append(reasoning)

        # EXECUTION PHASE
        # Execute action in world, get result as new entity
        entity, world = harness.execute(action, world)

        # New entity becomes input for next iteration

    return ctx, world
```

Do you see how clean this is? Three phases: Load, Reason, Execute. Then repeat! The entity flows around the loop—load it into context, LLM reasons and acts, execute the action to get a new entity. Round and round we go until the task is complete.

### 6.2 Example Execution Trace

**User**: "Read config.json and fix the database port"

**Turn 1**
```
Load Phase:
  ctx = [system_prompt, memory_summary, file_tools, user_input]

LLM Phase:
  reasoning: "Need to read config.json first"
  action: read_file("config.json")

Execute Phase:
  entity: {type: "tool_result", content: "{\n  \"db_port\": 3306\n  ...\n}"}
  world: unchanged
```

**Turn 2**
```
Load Phase:
  ctx = [system_prompt, memory_summary, file_tools,
         tool_result_FULL, previous_reasoning, edit_tools]
  # Note: file tool result loaded in full for LLM to analyze

LLM Phase:
  reasoning: "Database port is 3306 but should be 5432 for PostgreSQL"
  action: edit_file("config.json", old="3306", new="5432")

Execute Phase:
  entity: {type: "tool_result", content: "Successfully edited config.json"}
  world: config.json modified
```

**Turn 3**
```
Load Phase:
  ctx = [system_prompt, memory_summary,
         previous_tool_result_DIGEST,  # compressed now!
         current_tool_result,
         previous_reasoning]
  # Note: first tool result compressed to save space

LLM Phase:
  reasoning: "Task complete. Config fixed."
  action: respond("Fixed! Changed database port from 3306 to 5432")

Execute Phase:
  entity: {type: "agent_response"}
  should_stop: true
```

## 7. Multi-Agent Design Patterns

Now here's where things get really interesting! Using our entity calculus, we can formally describe all the common agent patterns you've heard about. And what's beautiful is that they all emerge naturally from our framework. Let me show you.

### 7.1 Pattern: Tool-Use Agent

**Description**: Agent with access to external tools.

How do we implement this? It's almost trivial:

```python
entities = [
    Entity(system_prompt),
    Entity(memory),
    Entity(user_input),
    *[Entity(tool_desc) for tool in available_tools]
]

# Tools are just entities with:
# 1. Description (for LLM to understand)
# 2. Execution handler (for harness.execute)
```

**Key Insight**: Tools are simultaneously entities (their descriptions load into context) and actions (their implementations execute in world). They live in both realms! The description is an entity that the LLM can see, and the implementation is a function that execute() calls. Rather elegant, no?

### 7.2 Pattern: Skill-Enhanced Agent

**Description**: Agent that can load predefined workflows on-demand.

Here's the clever bit:

```python
# Skills available but not preloaded
skill_entities = [
    Entity(GitCommitSkill, loading="dynamic"),
    Entity(DebugWorkflow, loading="dynamic"),
    Entity(RefactorPattern, loading="dynamic")
]

# Harness.load uses semantic search:
if user_input mentions "commit" or "git":
    load(GitCommitSkill, verbosity=full)
else:
    load(GitCommitSkill, verbosity=summary)  # just title
```

**Key Insight**: Skills are just entities loaded at different verbosity levels based on relevance! When the user mentions "git commit", we load the full GitCommitSkill entity. Otherwise, we might just show the title. Same mechanism, different verbosity.

### 7.3 Pattern: Rule-Based Agent (agent.md)

**Description**: Agent that follows persistent rules and guidelines defined in configuration files.

Now here's something rather interesting. Many agent systems use configuration files—often called `agent.md` or similar—to define rules, constraints, and behavioral guidelines. How do these fit into our framework? Well, they're just entities! But with a special twist.

**Implementation**:
```python
# Rule file as static, preloaded entity
agent_rules = Entity(
    type="rules",
    content=read_file("agent.md"),  # Could include:
                                     # - Behavioral guidelines
                                     # - Domain constraints
                                     # - Output formatting rules
                                     # - Safety restrictions
                                     # - Style preferences
    loading="preloaded",             # Always in context
    verbosity="full",                # Never compress
    priority="high"                  # Loaded early in context
)

# Rules are preloaded in every agent loop iteration
entities = [
    Entity(system_prompt),
    agent_rules,  # <- Always present
    Entity(memory),
    Entity(user_input),
    *tool_entities
]
```

**Example Rule File (agent.md)**:
```markdown
# Agent Rules

## Code Style
- Always use TypeScript for new files
- Prefer functional components in React
- Use 2-space indentation

## Behavioral Guidelines
- Ask for clarification before major refactors
- Run tests after code changes
- Never commit directly to main branch

## Safety Constraints
- Never execute shell commands without user approval
- Validate all user inputs
- Don't expose sensitive credentials in logs
```

**Key Insight**: Rules are **static, high-priority entities that are always preloaded**. They shape agent behavior by being permanently present in the context. Think of them as the "constitution" of the agent—fundamental principles that govern all actions.

**Comparison to System Prompt**:
- **System Prompt**: Defines the agent's role and core capabilities (who the agent is)
- **Rules Entity**: Defines constraints, guidelines, and preferences (how the agent should behave)

The distinction is subtle but important. The system prompt says "You are a helpful coding assistant." The rules entity says "When you write code, always include error handling and tests."

### 7.4 Pattern: Slash Commands

**Description**: User-invocable shortcuts that expand into full prompts or trigger specialized workflows.

You know, I find slash commands particularly elegant—they're a beautiful example of progressive disclosure in UI design applied to AI agents. Let me show you what I mean.

**Implementation**:
```python
# Slash commands as entities with self-contained loading logic
def create_slash_command_entity(name: str, description: str, workflow: str):
    """
    Create a slash command entity.
    The entity encapsulates its own loading logic via recommendVerbosity.
    """
    trigger = f"/{name}"

    def recommend_verbosity(ctx: Context) -> Verbosity | None:
        """
        This entity recommends itself for loading when user input starts with its trigger.
        This is where the slash command detection logic lives!
        """
        # Find the most recent user message
        last_user_msg = get_last_user_message(ctx)

        if not last_user_msg:
            return None  # No user input yet

        # Check if user input starts with this command's trigger
        if last_user_msg.strip().startswith(trigger):
            return "full"  # Load the full workflow

        # Don't load if not triggered
        return None

    return Entity(
        type="slash_command",
        content=f"""
        # Slash Command: {trigger}

        {description}

        Workflow:
        {workflow}

        This command has been invoked by the user.
        """,
        metadata={
            "trigger": trigger,
            "commandName": name,
            "loading": "dynamic"
        },
        recommendVerbosity=recommend_verbosity  # Entity decides when to load!
    )

# Create slash command entities
def discover_slash_command_entities():
    return [
        create_slash_command_entity(
            name="commit",
            description="Create git commits following best practices",
            workflow="""
            1. Run git status to see all changes
            2. Run git diff to review modifications
            3. Analyze changes and draft commit message following repo style
            4. Ask user for approval if changes are significant
            5. Execute git add and git commit
            6. Run git log to verify
            """
        ),

        create_slash_command_entity(
            name="review-pr",
            description="Conduct thorough pull request reviews",
            workflow="""
            1. Fetch PR details using GitHub API or gh CLI
            2. Analyze code changes for:
               - Logic errors and bugs
               - Security vulnerabilities
               - Performance issues
               - Style consistency
            3. Check test coverage
            4. Verify documentation updates
            5. Provide structured feedback with severity levels
            """
        ),

        create_slash_command_entity(
            name="explain",
            description="Explain code with clarity and examples",
            workflow="""
            1. Read the target file or function
            2. Analyze:
               - Purpose and functionality
               - Input/output behavior
               - Dependencies and side effects
               - Edge cases and error handling
            3. Generate explanation using analogies and examples
            4. Offer to explain specific parts in more detail
            """
        ),
    ]

# The load function simply asks each entity for recommendations
def load(ctx, new_entities, available_entities):
    """
    The load function asks each entity: "Should you be loaded?"
    No slash command detection logic here - entities decide for themselves!
    """
    entities_to_load = []

    # Load preloaded entities (system prompt, memory, etc.)
    entities_to_load.extend([e for e in available_entities
                            if e.metadata.loading == "preloaded"])

    # Add new entities (user input, tool results, etc.)
    entities_to_load.extend(new_entities)

    # Ask each dynamic entity if it should be loaded
    for entity in available_entities:
        if entity.metadata.loading == "dynamic":
            if entity.recommendVerbosity:
                # Entity decides based on context!
                verbosity = entity.recommendVerbosity(ctx)
                if verbosity is not None:
                    entities_to_load.append((entity, verbosity))

    # Pack entities into context
    return pack_into_context(ctx, entities_to_load)
```

**Example Usage Flow**:
```
User: "/commit"

# Agent loop initialization
def agent_loop(user_input, world):
    ctx = Context()
    entity = Entity(content="/commit", type="user_input")

    # Discover ALL available entities (including slash commands)
    available_entities = discover_available_entities(world)
    # Returns: [system_prompt, memory, rules, tools..., /commit, /review-pr, /explain]

Agent Loop Turn 1:
  Load Phase:
    # load() function detects slash command in user input
    # Loads ONLY the /commit entity from available_entities
    ctx = harness.load(ctx, entity, available_entities)
    # Result: ctx = [system_prompt, rules, /commit entity, git_tools, file_tools, user_input]

  LLM Phase:
    # LLM sees the workflow from /commit entity in context
    reasoning: "Need to check current git status first per the workflow"
    action: git_status()

  Execute Phase:
    entity: {type: "tool_result", content: "modified: src/app.ts\nmodified: README.md"}

Turn 2:
  Load Phase:
    # load() function includes workflow context and new tool result
    ctx = harness.load(ctx, entity, available_entities)
    # Result: ctx = [system_prompt, rules, /commit entity, git_status_result, diff_tools]

  LLM Phase:
    reasoning: "Should review the actual changes"
    action: git_diff()

  ... workflow continues ...
```

**Key Insight**: Slash commands are **entities that encapsulate their own loading logic**. They provide:
1. **Self-Contained Logic**: Each slash command entity has a `recommendVerbosity` function that checks if it should be loaded
2. **Separation of Concerns**: The harness doesn't know about slash commands—it just asks each entity "should you load?"
3. **Extensibility**: New command types can be added without modifying the harness
4. **Context-Aware**: Entities examine the full context to make informed loading decisions
5. **Discoverability**: Users can easily invoke complex workflows with simple commands
6. **Consistency**: Same workflow logic every time
7. **No Preprocessing**: Slash commands are handled entirely within the standard load/execute loop

**Design Variations**:

**Variation 1: Slash Command with Parameters**
```python
User: "/explain src/auth.ts --detail high"

# In the load function:
def load(ctx, entity, available_entities):
    if entity.type == "user_input" and entity.content.startswith("/"):
        # Parse command and arguments
        parts = entity.content.split()
        command_name = parts[0]  # "/explain"
        args = " ".join(parts[1:])  # "src/auth.ts --detail high"

        # Find and load the matching slash command entity
        for e in available_entities:
            if e.type == "slash_command" and e.metadata.get("trigger") == command_name:
                # Inject args into entity metadata for LLM to see
                e_with_args = e.copy()
                e_with_args.metadata["user_args"] = args
                entities_to_load.append(e_with_args)
                break

    # LLM sees: "/explain workflow" + "user_args: src/auth.ts --detail high"
    return pack_into_context(ctx, entity, entities_to_load)
```

**Variation 2: Slash Command as Tool**
```python
# Alternative: Slash commands could be implemented as tools that LLM explicitly invokes
# This allows programmatic invocation rather than only user-triggered

SlashCommandTool = Entity(
    type="tool",
    name="execute_workflow",
    content="""
    execute_workflow(workflow_name: str, args: str) -> result
    Execute predefined workflows like 'commit', 'review-pr', 'explain'
    """,
    execute_handler=lambda workflow_name, args, world: {
        workflow = get_workflow(workflow_name)
        result = execute_workflow(workflow, args, world)
        return Entity(type="workflow_result", content=result), world
    }
)

# LLM can invoke slash command workflows programmatically
action = execute_workflow("commit", args="")
```

**Variation 3: Hierarchical Slash Commands**
```python
# Hierarchical slash commands as entities
def discover_slash_command_entities():
    return [
        Entity(type="slash_command", name="/git commit",
               metadata={"trigger": "/git commit"}, content="..."),
        Entity(type="slash_command", name="/git pr",
               metadata={"trigger": "/git pr"}, content="..."),
        Entity(type="slash_command", name="/git sync",
               metadata={"trigger": "/git sync"}, content="..."),
        Entity(type="slash_command", name="/test run",
               metadata={"trigger": "/test run"}, content="..."),
        Entity(type="slash_command", name="/test debug",
               metadata={"trigger": "/test debug"}, content="..."),
        Entity(type="slash_command", name="/test coverage",
               metadata={"trigger": "/test coverage"}, content="..."),
    ]

# The load function matches hierarchical commands
def load(ctx, entity, available_entities):
    if entity.type == "user_input" and entity.content.startswith("/"):
        # Try to match full command (e.g., "/git commit")
        for e in available_entities:
            if e.type == "slash_command":
                trigger = e.metadata.get("trigger")
                if entity.content.startswith(trigger):
                    entities_to_load.append(e)
                    break
    # ...
```

**Comparison to Skills**:
| | Skills | Slash Commands |
|---|--------|----------------|
| **Trigger** | Semantic relevance detected by load() | Explicit slash prefix in user input detected by load() |
| **Discovery** | load() searches for semantically relevant entities | load() searches for exact trigger match in user input |
| **Loading** | Dynamic based on semantic context analysis | Dynamic based on exact pattern matching |
| **Purpose** | Implicit workflow activation | Explicit workflow activation |
| **Detection** | Requires semantic understanding | Simple string prefix matching |

Think of skills as "the load function discovers what to load based on semantics" and slash commands as "the load function discovers what to load based on explicit user syntax." Both are entities in the available entities pool, both are conditionally loaded by the harness.load() function, but the loading criteria differs.

### 7.5 Pattern: Subagent Spawning

**Description**: Agent delegates subtasks to other agents.

**Implementation**:
```python
# Define subagent spawn as a tool
SubAgentTool = Tool(
    name="spawn_subagent",
    description="Create a new agent for a subtask",
    execute=lambda prompt, world: {
        # Create new agent with fresh context
        subagent_ctx = Context([system_prompt, Entity(prompt)])

        # Run subagent loop until completion
        result_ctx, world' = agent_loop(prompt, world)

        # Return subagent's result as entity
        return Entity(
            type="subagent_result",
            content=extract_result(result_ctx)
        ), world'
    }
)
```

**Key Insight**: Subagents are just recursive invocations of the agent loop. The result is returned as an entity to the parent agent.

**Example Flow**:
```
Parent Agent:
  User: "Research React hooks and write a summary"

  Turn 1:
    action: spawn_subagent("Research React hooks from documentation")

    Subagent Loop:
      Turn 1: search("React hooks documentation")
      Turn 2: read(url)
      Turn 3: summarize(content)
      Turn 4: respond(summary)

    entity: {type: "subagent_result", content: "React hooks are..."}

  Turn 2:
    Context: [subagent_result, user_input]
    action: write_file("react-hooks-summary.md", content=subagent_result)
```

### 7.6 Pattern: RAG (Retrieval-Augmented Generation)

**Description**: Agent retrieves relevant documents before generating responses.

Now, you might have thought RAG was something special, something different. But watch this:

```python
# RAG is just a special load strategy
def rag_load(ctx, entity, entities):
    # Extract query from latest entity (user input or reasoning)
    query = extract_query(entity)

    # Search knowledge base (world operation)
    relevant_docs = semantic_search(world.knowledge_base, query, top_k=5)

    # Convert docs to entities
    doc_entities = [Entity(doc, type="retrieved_doc") for doc in relevant_docs]

    # Standard load with doc entities included
    return load(ctx, entity, entities + doc_entities)
```

**Key Insight**: RAG is just a sophisticated entity discovery mechanism! That's all it is. Retrieved documents are entities loaded into context. There's nothing magical here—it's the same load/execute loop, just with a clever way of discovering which entities to load. Semantic search finds the entities, and we load them. Done!

### 7.7 Pattern: ReAct (Reasoning + Acting)

**Description**: Agent alternates between reasoning and tool use.

Now this is really beautiful. Watch what happens:

```python
# ReAct is the default agent loop!
# The loop naturally alternates:

Turn 1:
  LLM: reasoning → "Need to check database status"
  Action: execute(check_db_status)

Turn 2:
  LLM: reasoning → "Database is down, need to restart"
  Action: execute(restart_db)

Turn 3:
  LLM: reasoning → "Restart successful, task complete"
  Action: respond("Done!")
```

**Key Insight**: ReAct emerges naturally from the agent loop structure! We didn't have to do anything special—it just falls out of our design. The LLM always produces reasoning and actions together (remember our function signature?), and the loop naturally alternates between thinking and acting. This is what I mean when I say we've found the right abstraction—common patterns emerge for free.

### 7.8 Pattern: Reflection

**Description**: Agent reviews and critiques its own work.

**Implementation**:
```python
# Reflection as a tool that spawns a critic subagent
ReflectionTool = Tool(
    name="reflect",
    description="Review your work for errors and improvements",
    execute=lambda work, world: {
        critique_prompt = f"""
        Review this work: {work}

        Identify:
        1. Errors or bugs
        2. Missed requirements
        3. Potential improvements
        """

        # Spawn critic agent with different system prompt
        critic_ctx = Context([critic_system_prompt, Entity(critique_prompt)])
        result_ctx, world' = agent_loop(critique_prompt, world)

        return Entity(type="reflection", content=extract_result(result_ctx)), world'
    }
)
```

**Usage**:
```
Agent:
  Turn 1: write_code(feature)
  Turn 2: reflect(code)
  Turn 3: revise(code, based_on=reflection)
```

**Key Insight**: Reflection is subagent spawning with a specialized critic prompt.

### 7.9 Pattern: Multi-Agent Collaboration

**Description**: Multiple agents work in parallel on different aspects of a task.

**Implementation**:
```python
def parallel_agents(task, world):
    # Decompose task
    subtasks = decompose(task)

    # Spawn agent for each subtask
    results = []
    for subtask in subtasks:
        # Each agent runs independently
        result_ctx, world = agent_loop(subtask, world)
        results.append(extract_result(result_ctx))

    # Coordinator agent synthesizes results
    synthesis_prompt = f"Combine these results: {results}"
    final_ctx, world = agent_loop(synthesis_prompt, world)

    return final_ctx, world
```

**Key Insight**: Multi-agent systems are orchestrated by spawning multiple independent agent loops and synthesizing their results.

## 8. Advanced Topics

Right, now let's dig into some more advanced ideas. These are techniques and optimizations that emerge once you start implementing this framework seriously.

### 8.1 Dynamic Tool Loading

Here's a problem you'll run into immediately: if you have 100+ tools, loading all their descriptions wastes precious context on irrelevant tools. So what do we do?

**Solution**: Treat tool discovery as a two-phase load. Here's the clever bit:

**Implementation**:
```python
# Phase 1: Load tool categories only
tool_categories = [
    Entity("File Operations: read, write, delete, ..."),
    Entity("Network Operations: fetch, post, websocket, ..."),
    Entity("Database Operations: query, insert, update, ..."),
]

ctx = load(ctx, user_input, tool_categories)
reasoning, action = llm(ctx)  # LLM might say "I need file operations"

# Phase 2: Load full tool descriptions only for selected category
if "file" in reasoning.lower():
    file_tools = [Entity(read_tool), Entity(write_tool), ...]
    ctx = load(ctx, Entity(reasoning), file_tools)
```

**Result**: Context usage reduced from O(all_tools) to O(relevant_tools).

### 8.2 Entity Discovery Mechanisms

Entities can specify how they should be discovered:

```python
Entity.metadata = {
    "discovery": {
        "keywords": ["git", "commit", "version control"],  # Keyword match
        "semantic": "Create version control commits",      # Semantic search
        "dependencies": ["read_file", "write_file"],       # Linked entities
        "context_requirements": ["user_in_git_repo"],      # Conditional
    }
}
```

**Use case**: GitCommitSkill specifies it should be loaded when:
- User mentions "commit" or "git" (keyword)
- Current directory is a git repo (context requirement)
- If loaded, also load file reading tools (dependencies)

### 8.3 Tool Data Handling Strategies

**Problem**: Tool returns 10MB JSON response. Loading fully into context is wasteful.

**Strategy 1: Digest on Return**
```python
entity, world = execute(action)

# Immediate digest
if entity.size > 10KB:
    entity.content_full = entity.content
    entity.content = llm_summarize(entity.content, max_tokens=500)
    entity.verbosity = "digest"

    # Store full content in world for re-access if needed
    world.store(entity.id, entity.content_full)
```

**Strategy 2: Streaming / Pagination**
```python
# Don't load entire result
entity = Entity(
    type="tool_result",
    content="Large file detected. Use read_file(offset=N, limit=M) to page through.",
    metadata={"file_size": "10MB", "total_lines": 50000}
)
```

**Strategy 3: Structured Filtering**
```python
# Tool returns structured data with filtering instructions
entity = Entity(
    type="tool_result",
    content={"users": [...]},  # 1000 users
    filter_instructions="Use filter_tool_result(key='users', condition='age > 30') to refine"
)
```

### 8.4 Context Compression Strategies

The `load` function can employ LLM-based compression:

**Summarization Compression**:
```python
# When context is 80% full
old_messages = ctx.messages[:-10]  # All but last 10
summary = llm_summarize(old_messages)
ctx.messages = [summary] + ctx.messages[-10:]
```

**Semantic Deduplication**:
```python
# Remove redundant information
if semantic_similarity(new_entity, existing_entity) > 0.9:
    # Information already in context
    omit(new_entity)
```

**Importance-Based Eviction**:
```python
# Score each entity by relevance to current task
scores = [score_relevance(e, current_task) for e in ctx.entities]

# Remove lowest-scored entities when context is full
if ctx.is_full():
    ctx.entities = [e for e, s in sorted(zip(ctx.entities, scores), key=lambda x: -x[1])][:max_entities]
```

### 8.5 JIT (Just-In-Time) Context Loading

**Concept**: Tool results can include instructions for processing their data.

**Example**:
```python
# Tool execution
entity = execute(search_codebase("authentication"))

# Entity includes loading instructions
entity.content = {
    "results": [
        {"file": "auth.py", "line": 45, "snippet": "..."},
        {"file": "login.py", "line": 12, "snippet": "..."},
        # ... 50 more results
    ],
    "loading_instructions": {
        "default_verbosity": "summary",  # Show only file names + line counts
        "expand_on_request": True,       # Allow LLM to request full snippets
        "expansion_tool": "expand_search_result(index=N)"
    }
}

# Initial load: summary only
load(entity, verbosity="summary")
# Context: "Found authentication code in 52 files. Use expand_search_result(index=N) for details."

# LLM can then selectively expand:
action = expand_search_result(index=0)
# Returns full snippet from auth.py
```

**Benefit**: LLM gets overview first, then drills down only where needed.

### 8.6 Multi-Level Tool Descriptions

Tools can define descriptions at multiple granularities:

```python
Tool.descriptions = {
    "title": "read_file",

    "one_liner": "Read file contents",

    "summary": """
        read_file(path) → string
        Reads and returns file contents from disk.
    """,

    "detailed": """
        read_file(path, offset=0, limit=None) → string

        Reads file contents from the filesystem.

        Parameters:
        - path: Absolute path to file
        - offset: Starting line number (0-indexed)
        - limit: Maximum number of lines to read

        Returns: File contents as string

        Errors: FileNotFoundError, PermissionError

        Example:
            content = read_file("/home/user/config.json")
    """,
}
```

**Load Strategy**:
```python
# When context is spacious: load detailed
# When context is tight: load summary
# When very tight: load one_liner only
# When nearly full: load title only (just function name)

verbosity = choose_verbosity_level(ctx.available_space)
tool_entity.content = tool.descriptions[verbosity]
```

## 9. Integration with Existing Systems

### 9.1 Mapping to Real Agent Frameworks

**LangChain**:
```python
# LangChain concepts → Entity Calculus
Agent = LLM + Harness
Tools = List[Entity(tool_description)] + execute handlers
Memory = Entity(conversation_buffer, type="memory", loading="preloaded")
Chains = Predefined entity sequences
Callbacks = Instrumentation hooks in harness.load and harness.execute
```

**AutoGen**:
```python
# AutoGen concepts → Entity Calculus
ConversableAgent = Agent (LLM + Harness)
UserProxyAgent = Agent with (no LLM, execute only harness)
GroupChat = Multi-agent with shared entity pool
Human-in-loop = User input injected as entity during loop
```

**Cursor / Copilot**:
```python
# IDE agent concepts → Entity Calculus
Codebase Context = List[Entity] from semantic search over code
Active File = Entity(current_file, loading="preloaded", verbosity="full")
Related Files = List[Entity(file, loading="dynamic", verbosity="summary")]
LSP Information = Entity(type_info + references, loading="on-demand")
```

### 9.2 RAG Systems

**Traditional RAG**:
```python
query = user_input
docs = vector_db.search(query)
context = [system_prompt, docs, query]
response = llm(context)
```

**Entity Calculus RAG**:
```python
# Documents are just entities!
entities = [
    Entity(system_prompt, loading="preloaded"),
    Entity(user_input, loading="preloaded"),
    *[Entity(doc, loading="dynamic", discovered_by="semantic_search")
      for doc in vector_db.search(user_input)]
]

# Standard agent loop
ctx = harness.load(Context(), entities)
reasoning, action = llm(ctx)
```

**Key Insight**: RAG is entity discovery via semantic search.

## 10. Future Directions & Open Questions

Now, let's talk about the future. There are some really interesting open questions here—research opportunities, if you will. I'll outline a few that I think are particularly intriguing.

### 10.1 Entity Discovery as a Graph

**Idea**: What if entities could link to related entities, forming a graph?

```python
Entity(GitCommitSkill).links = [
    Link(Entity(ReadFileTool), relation="requires"),
    Link(Entity(WriteFileTool), relation="requires"),
    Link(Entity(GitStatusTool), relation="uses"),
    Link(Entity(PRCreationSkill), relation="related_to"),
]
```

**Use Case**: When GitCommitSkill is loaded, the harness could automatically load linked tools. Rather nice for dependency management!

**Question**: But here's the rub—how do we prevent exponential blow-up of linked entities? If A links to B and C, and B links to D and E, and so on... you can see the problem. This needs careful thought.

### 10.2 Entity-Provided Processing Instructions

**Idea**: Entities specify how they should be processed after use.

```python
Entity(tool_result).processing_hints = {
    "after_llm_reads": "compress_to_digest",
    "after_N_turns": "omit_if_not_referenced",
    "if_context_full": "move_to_world_storage"
}
```

**Benefit**: Declarative context management instead of imperative harness logic.

**Question**: How to balance entity autonomy with global context optimization?

### 10.3 Learned Context Management

**Idea**: Why hand-code the load function? What if we used ML to learn optimal loading strategies?

```python
# Train a model to predict:
# - Which entities to load given task
# - What verbosity level to use
# - When to compress/omit entities

load_policy = train(
    inputs=[task_embedding, available_entities, context_state],
    outputs=[entities_to_load, verbosity_levels],
    objective=maximize(task_success_rate) - penalize(context_usage)
)
```

This is quite appealing, isn't it? Let the system learn from experience what works best.

**Questions**: But there are challenges. How do we collect training data? What are the right features to use? And how do we ensure the learned policy generalizes to new tasks? These are open research questions—worthy problems for a PhD student, I'd say!

### 10.4 Hierarchical Entities

**Idea**: Entities can contain sub-entities.

```python
Entity(Codebase) = {
    "type": "collection",
    "children": [
        Entity(Module1),
        Entity(Module2),
        ...
    ]
}

# Load strategy:
# - Initially load: Entity(Codebase, verbosity="summary")
#   → "Codebase contains 50 modules in 3 categories"
# - On demand: Entity(Module1, verbosity="full")
```

**Use Case**: Representing complex structured knowledge (codebases, documentation sites, databases).

### 10.5 Entity Lifecycle Hooks

**Idea**: Entities can define callbacks for lifecycle events.

```python
Entity.hooks = {
    "on_load": lambda ctx: validate_dependencies(ctx),
    "on_compress": lambda content: custom_summarize(content),
    "on_evict": lambda: persist_to_world(),
    "on_access": lambda: log_usage_analytics(),
}
```

**Benefit**: Entities become active components, not passive data.

### 10.6 Cross-Agent Entity Sharing

**Idea**: Multiple agents share a common entity pool.

```python
# Shared world with entity store
world.entity_store = {
    "current_task": Entity(...),
    "research_results": Entity(...),
    "code_changes": Entity(...),
}

# Agent A updates entity
agent_a.execute(update_entity("research_results"))

# Agent B reads updated entity
ctx_b = load(ctx_b, world.entity_store["research_results"])
```

**Use Case**: Multi-agent collaboration with shared knowledge.

**Question**: How to handle conflicts? Consistency guarantees?

### 10.7 Speculative Entity Loading

**Idea**: Preemptively load entities the LLM might need.

```python
# Predict future entity needs
predicted_entities = predict_next_entities(
    ctx.current_state,
    llm.recent_actions
)

# Load them in background (if context space available)
for e in predicted_entities:
    if ctx.has_space():
        ctx = load(ctx, e, verbosity="summary")
```

**Benefit**: Reduced latency for multi-turn interactions.

**Question**: How to predict accurately without wasting context?

### 10.8 Differential Context Updates

**Idea**: Instead of reloading full context, send only diffs.

```python
# Current approach: send full context every turn
llm(full_context) → action

# Differential approach:
llm.update(
    add=[new_entity],
    remove=[old_entity_id],
    modify=[entity_id, new_content]
)
```

**Benefit**: Reduced token usage, faster inference.

**Challenge**: Requires stateful LLM API (not common yet).

### 10.9 Entity Versioning

**Idea**: Track entity changes over time.

```python
Entity.versions = [
    (timestamp=0, content="Initial user query"),
    (timestamp=5, content="Elaborated with clarifications"),
    (timestamp=10, content="Further refined based on context"),
]

# Load appropriate version based on temporal context
ctx = load(ctx, entity.version_at(time=5))
```

**Use Case**: Understanding how agent's understanding evolved. Debugging. Time-travel debugging.

### 10.10 Meta-Entities

**Idea**: Entities that describe other entities.

```python
MetaEntity(
    target=Entity(large_tool_result),
    metadata={
        "summary": "Database query returned 10K rows",
        "schema": {columns: [...], types: [...]},
        "relevance_to_task": 0.85,
        "recommended_verbosity": "digest",
    }
)
```

**Benefit**: Richer metadata for smarter loading decisions.

## 11. Conclusion

So, let me wrap this up and tell you what we've accomplished. The **Entity Calculus** provides a unified lens for understanding AI agents. Let me count the ways:

1. **Everything is an entity**: Skills, tools, memory, data—all flow through the same abstraction. One concept to rule them all!

2. **Harness manages entity flow**: The `load` and `execute` functions orchestrate entity movement between context and world. Two functions, that's it.

3. **Context is the bottleneck**: All optimizations revolve around the limited context window. Everything else is easy by comparison.

4. **Patterns emerge naturally**: Common agent patterns (ReAct, RAG, multi-agent) are special cases of entity flow. We didn't design them in—they fell out!

5. **Composability**: Because everything is an entity, components compose cleanly. This is what good abstraction gives you.

### Key Insights

Let me highlight the really important bits:

- **Agent = LLM + Harness** cleanly separates reasoning (LLM) from orchestration (harness). This separation is crucial.
- **Entity abstraction** unifies disparate concepts under one model. Tools, skills, memory—all entities.
- **Load/Execute duality** captures the full agent loop: load entities into context, execute actions in world. That's the whole game.
- **Multi-agent systems** are recursive applications of the same calculus. Agents all the way down!

### Practical Value

Now, why should you care? What's this good for?

For **researchers**, this framework provides:
- Formal vocabulary for discussing agent architectures—we can talk precisely now
- Basis for systematic analysis of agent behaviors—no more hand-waving
- Foundation for developing new context management techniques—lots of room for innovation

For **engineers**, this framework provides:
- Clear mental model for designing agents—you know what you're building
- Reusable patterns for common agent tasks—don't reinvent the wheel
- Principled approach to context optimization—engineer it properly

### Next Steps

So what should we do with this? I invite the community to:
1. Implement reference harnesses following this calculus—show us what you can build!
2. Develop benchmarks for entity loading strategies—measure what matters
3. Explore the open questions outlined in Section 10—there's lots to discover
4. Extend the calculus to new domains (e.g., multimodal agents, embodied agents)—push the boundaries

This is just the beginning. The framework gives us a foundation, but there's so much more to explore. I'm rather excited to see where this goes!

---

## References

- [Cursor: Dynamic Context Discovery](https://cursor.com/blog/dynamic-context-discovery)
- [Twitter Discussion on Agent Abstractions](https://x.com/trq212/status/2011523109871108570)

## Appendix: Notation Reference

| Symbol | Meaning |
|--------|---------|
| `LLM: Context → (Reasoning, Actions)` | LLM as pure function |
| `Agent = LLM + Harness` | Agent decomposition |
| `load: (Context, Entity, List[Entity]) → Context'` | Harness load function |
| `execute: (Action, World) → (Entity, World')` | Harness execute function |
| `Entity` | Unit of information loadable into context |
| `Context` | LLM's directly accessible information |
| `World` | External state outside context |
| `verbosity ∈ {full, summary, digest, reference}` | Entity loading granularity |
| `loading ∈ {preloaded, dynamic}` | Entity loading strategy |

---

*Document Version: 1.0*
*Last Updated: January 15, 2026*
