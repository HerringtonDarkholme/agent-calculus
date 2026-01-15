Please reorganize this

* start with core Assumption
* start with the definition of LLM
* introduce Harness, define their core functions
* introduce entity
* introduce load
* introduce execute
* put all together in pseudo code
* use this model to explain multiple agent design patterns
* discuss more patterns

-----

I'm thinking about the calculus of AI agent.

What thing can unify skill, agent tool, commands, dynamic loading tool definition, system prompts, subagents, memory

So that these concepts/entities can be loaded into agent's context?


Assumption:
* LLM context is limited, constrained
* LLM is relatively stable, not able to do continual learning
* LLMs are the same (they are not, just assume they are here to simplify the calculus)

Think about them, they are all about

some text to be loaded in context
should it be in a new agent or not

tool/spawning should accept llm's action and return new text/data

Agent is two things:

Agent = LLM + Harness
LLM, in terms of agentic dev, is a pure function like
LLM: (Context) -> (Reasoning, Actions)

Context is what LLM can directly access.

Besides context, there is also a thing called World, where LLM cannot directly see and needs Harness to bridge.

Harness needs to handle LLM's returning actions, read world, and assemble context for LLM.

* Tool: has description, to be called in Actions, returns data or change the world
* Skill: predefined prompts for context building
* SubAgent: how to spawn one?
* Memory: a context summary for previous converstaions/interactions
* User Input: a context injected by user's intention/interaction/input

Let's discuss, how can Harness load these stuff, call llm, handle tool call, and repeat?

----

We need something like `load` function

Given a set of entities, the load fucntion should filter entity and summarize their description

and pack them into context


Consider each input is a kind of entity:

* skill is an entity with static content, loaded dynamically
* tool's description is an entity with static content, loaded dynamically or preloaded (builtin tool)
* memory is an entity with dynamic content (summarized), preloaded
* system prompt is an entity with static content, preloaded
* data (tool call return data) is an entity with dynamic content, loaded dynamically.

Another dimension of entity is their verbosity

* skill can be loaded into context with only their summary/title
* data can be loaded into context fully, or just digest, and put full text on disk (in world, accessed with newer tool call like bash)


Reference:
* https://cursor.com/blog/dynamic-context-discovery
* https://x.com/trq212/status/2011523109871108570

-----

Use the harness:

Agent: (Context, World) -> (Context', World')

Harness does two things:
* load entities into context
* call actions

Note action is something like `Action: (Input, World) -> (Entity, World)`

Tool is both `Action` and `Entity` at the same time

Takes input

```
Harness:
  load: (Context, Entity, List[Entity]) -> Context
  call: (Action) -> (Entity, World)
```

-----

Make things work together

```
Agent:
  ctx = new Context
  entity = userInput
  world = new World
  loop:
    ctx = Harness.load(ctx, entity, entities)
    reasoning, action = llm(ctx)
    ctx += reasoning
    entity, world = Harness.call(action, world)
```


---

Load should also handle context window management

* filter only relevant data into context
* rephrase/polish user input
* compress relevant entity list (e.g. a huge list of entity may be grouped, and only load group description)
* compress context (by summarization, or replacing some message)

Consider, Harness can load full data returned by tool into context at first. after LLM reasoning, the previous data loaded can be swapped by its digest.

---

There are multiple atomic processing to handle entity's load

* summarize: reduce context usage. it can summarize multiple messages in context
* elaborate: include more context/more instructions (e.g. user's input is not sufficient)
* omit: remove the entity at all (maybe not relevant to task/reasoning any more)
* paraphrase: ???

---

Use this framework to mock skill, memory, dynamic loaded tool, rag

Dynamic loaded tool: tool description is not loaded by default. only when LLM request it or search it

----

Using this calculus, we can ideate more(new value not found):

1. can entity provides entity discovery mechanism? e.g. a skill can linked other tools to use
2. tool call return data now. can it return instructions for processing data? this is another kind of JIT context loading
3. how to define tool? a tool can define multiple level of docs/description
4. how to load tool data? if the data is too large, it can be loaded into
5. how to manage tool data filtering? semantic search/rag/graph/fuzzy search/rule based search....
