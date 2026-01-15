# Agent Calculus: A Unified Framework for AI Agent Design

## Abstract

This document presents a unified formal framework for understanding AI agents through a calculus-like model. We introduce the concept of **entities** as the fundamental unit of agent computation, and define a **harness** that manages the flow of entities between the LLM's context and the external world. This framework elegantly unifies disparate concepts such as skills, tools, memory, subagents, and dynamic context loading under a single coherent model.

## 1. Introduction & Motivation

### The Problem

Modern AI agent systems involve numerous distinct concepts:
- **Tools**: Functions the agent can call to interact with the world
- **Skills**: Reusable prompt templates and workflows
- **Memory**: Persistent state from previous interactions
- **Subagents**: Spawned agents for subtasks
- **Dynamic context loading**: Just-in-time injection of relevant information
- **System prompts**: Static instructions and behavior definitions

These concepts are typically treated as separate mechanisms, leading to:
- Conceptual fragmentation in agent design
- Difficulty reasoning about agent behavior holistically
- Lack of composability between different agent patterns

### The Solution

We propose treating all inputs to an agent as **entities** that flow through a **harness** which manages:
1. **Loading**: Filtering and packing entities into the LLM's limited context
2. **Execution**: Handling LLM actions and returning new entities

This abstraction enables:
- Unified reasoning about agent behavior
- Compositional design patterns
- Systematic approaches to context management
- Formal analysis of multi-agent systems

## 2. Core Assumptions

To simplify our calculus, we make three foundational assumptions:

**Assumption 1: Limited Context**
> LLM context windows are finite and constrained. Context is the primary scarce resource in agent systems.

**Assumption 2: Static Capabilities**
> LLMs do not perform continual learning during inference. Their capabilities are fixed at deployment.

**Assumption 3: LLM Homogeneity**
> For the purposes of this calculus, we treat different LLMs as interchangeable. (In practice they differ, but this simplifies our model.)

## 3. Fundamental Definitions

### 3.1 LLM as Pure Function

We model an LLM as a pure function:

```
LLM: Context → (Reasoning, Actions)
```

**Inputs:**
- `Context`: The text and structured data directly accessible to the LLM

**Outputs:**
- `Reasoning`: Internal thought process, chain-of-thought, analysis
- `Actions`: Structured requests to interact with the world (tool calls, responses, queries)

The LLM has no direct access to anything outside its context. It cannot see files, networks, databases, or any other state unless that information is explicitly loaded into its context.

### 3.2 Context vs World

**Context**: The observable, directly accessible information within the LLM's attention window.
- Limited in size (e.g., 128K tokens)
- Directly influences LLM outputs
- Managed by the harness

**World**: Everything outside the context that the agent might need.
- File systems
- Databases
- APIs
- Previous conversation history (not currently in context)
- External knowledge bases

The harness acts as the bridge between Context and World.

### 3.3 Agent Decomposition

An agent is the composition of two components:

```
Agent = LLM + Harness
```

The **LLM** performs reasoning and generates actions.

The **Harness** manages the agent loop:
- Loads entities into context
- Executes actions in the world
- Handles context window constraints

## 4. The Entity Abstraction

**Core Insight**: Everything that can be loaded into an LLM's context is an **entity**.

### 4.1 Entity Definition

An entity is a unit of information with:
- **Content**: The actual data or text
- **Metadata**: How it should be loaded, when it's relevant, its size

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

Entities can be characterized along multiple dimensions:

**1. Content Mutability**
- **Static**: Content doesn't change (tool definitions, skills)
- **Dynamic**: Content changes during execution (memory, tool results)

**2. Loading Time**
- **Preloaded**: Always in context (system prompt, current memory)
- **Dynamic**: Loaded on-demand (skills when invoked, tool descriptions when relevant)

**3. Verbosity Levels**
- **Full**: Complete content loaded
- **Summary**: Condensed version (e.g., skill titles only)
- **Digest**: Compressed representation (e.g., large tool results summarized)
- **Reference**: Pointer only (content remains in world, accessed via actions)

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

The harness is the orchestration layer that manages the agent loop. It has two core responsibilities:

### 5.1 Load Function

```
load: (Context, Entity, List[Entity]) → Context'
```

**Purpose**: Intelligently pack entities into the limited context window.

**Inputs:**
- `Context`: Current context state
- `Entity`: New entity to incorporate (e.g., fresh user input, tool result)
- `List[Entity]`: Available entities that could be loaded

**Output:**
- `Context'`: Updated context ready for LLM consumption

**Responsibilities:**
1. **Filtering**: Select only relevant entities from available pool
2. **Compression**: Choose appropriate verbosity level for each entity
3. **Ordering**: Arrange entities for optimal LLM performance
4. **Eviction**: Remove or compress old entities if context is full

### 5.2 Execute Function

```
execute: (Action, World) → (Entity, World')
```

**Purpose**: Perform actions in the world and return results as entities.

**Inputs:**
- `Action`: LLM-generated action (tool call, query, response)
- `World`: Current world state

**Outputs:**
- `Entity`: Result data packaged as an entity
- `World'`: Updated world state after action

**Examples:**
- `Action = read_file("config.json")` → `Entity = {type: "tool_result", content: "{...json...}"}`
- `Action = spawn_subagent("research task")` → `Entity = {type: "subagent_result", content: "..."}`
- `Action = respond("Done!")` → `Entity = {type: "agent_response", content: "Done!"}`

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

Now we can express the complete agent execution as a simple loop:

### 6.1 Pseudocode

```python
def agent_loop(user_input, world):
    ctx = Context()
    entity = Entity(content=user_input, type="user_input")
    entities = discover_available_entities(world)  # tools, skills, memory, etc.
    
    while not should_stop(ctx):
        # LOAD PHASE
        # Pack relevant entities into context
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

Using the entity calculus, we can formally describe common agent patterns.

### 7.1 Pattern: Tool-Use Agent

**Description**: Agent with access to external tools.

**Implementation**:
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

**Key Insight**: Tools are simultaneously entities (their descriptions load into context) and actions (their implementations execute in world).

### 7.2 Pattern: Skill-Enhanced Agent

**Description**: Agent that can load predefined workflows on-demand.

**Implementation**:
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

**Key Insight**: Skills are entities loaded at different verbosity levels based on relevance.

### 7.3 Pattern: Subagent Spawning

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

### 7.4 Pattern: RAG (Retrieval-Augmented Generation)

**Description**: Agent retrieves relevant documents before generating responses.

**Implementation**:
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

**Key Insight**: RAG is just a sophisticated entity discovery mechanism. Retrieved documents are entities loaded into context.

### 7.5 Pattern: ReAct (Reasoning + Acting)

**Description**: Agent alternates between reasoning and tool use.

**Implementation**:
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

**Key Insight**: ReAct emerges naturally from the agent loop structure. No special implementation needed.

### 7.6 Pattern: Reflection

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

### 7.7 Pattern: Multi-Agent Collaboration

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

### 8.1 Dynamic Tool Loading

**Problem**: Loading descriptions of 100+ tools wastes context on irrelevant tools.

**Solution**: Treat tool discovery as a two-phase load.

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

### 10.1 Entity Discovery as a Graph

**Idea**: Entities can link to related entities, forming a graph.

```python
Entity(GitCommitSkill).links = [
    Link(Entity(ReadFileTool), relation="requires"),
    Link(Entity(WriteFileTool), relation="requires"),
    Link(Entity(GitStatusTool), relation="uses"),
    Link(Entity(PRCreationSkill), relation="related_to"),
]
```

**Use Case**: When GitCommitSkill is loaded, harness can automatically load linked tools.

**Question**: How to prevent exponential blow-up of linked entities?

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

**Idea**: Use ML to learn optimal loading strategies.

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

**Question**: How to collect training data? What are the right features?

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

The **Entity Calculus** provides a unified lens for understanding AI agents:

1. **Everything is an entity**: Skills, tools, memory, data—all flow through the same abstraction.

2. **Harness manages entity flow**: The `load` and `execute` functions orchestrate entity movement between context and world.

3. **Context is the bottleneck**: All optimizations revolve around the limited context window.

4. **Patterns emerge naturally**: Common agent patterns (ReAct, RAG, multi-agent) are special cases of entity flow.

5. **Composability**: Because everything is an entity, components compose cleanly.

### Key Insights

- **Agent = LLM + Harness** cleanly separates reasoning (LLM) from orchestration (harness).
- **Entity abstraction** unifies disparate concepts under one model.
- **Load/Execute duality** captures the full agent loop: load entities into context, execute actions in world.
- **Multi-agent systems** are recursive applications of the same calculus.

### Practical Value

For **researchers**, this framework provides:
- Formal vocabulary for discussing agent architectures
- Basis for systematic analysis of agent behaviors
- Foundation for developing new context management techniques

For **engineers**, this framework provides:
- Clear mental model for designing agents
- Reusable patterns for common agent tasks
- Principled approach to context optimization

### Next Steps

We invite the community to:
1. Implement reference harnesses following this calculus
2. Develop benchmarks for entity loading strategies
3. Explore the open questions outlined in Section 10
4. Extend the calculus to new domains (e.g., multimodal agents, embodied agents)

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
