import { useState, useEffect, useRef } from 'react'
import './App.css'

type Entity = {
  id: string
  type: string
  content: string
  verbosity: 'full' | 'summary' | 'digest' | 'reference'
}

function App() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [activeSection, setActiveSection] = useState(0)
  const [loopStep, setLoopStep] = useState(0)
  const [contextEntities, setContextEntities] = useState<Entity[]>([])
  const [stepDescription, setStepDescription] = useState('')
  const sectionsRef = useRef<HTMLElement[]>([])

  const totalSections = 15

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight - windowHeight
      const scrolled = window.scrollY
      const progress = (scrolled / documentHeight) * 100
      setScrollProgress(progress)

      // Determine active section
      const currentSection = Math.round(scrolled / windowHeight)
      setActiveSection(Math.min(currentSection, totalSections - 1))
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (index: number) => {
    const section = sectionsRef.current[index]
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const contextCapacity = 8

  const getButtonText = () => {
    if (loopStep === 0) return 'RUN DEMO'
    if (loopStep === 5) return 'RERUN'
    return 'NEXT STEP'
  }

  const getCapacityPercentage = () => {
    return Math.round((contextEntities.length / contextCapacity) * 100)
  }

  const nextStep = () => {
    const baseEntities: Entity[] = [
      { id: '1', type: 'system_prompt', content: 'You are a helpful AI assistant...', verbosity: 'full' },
      { id: '2', type: 'user_input', content: 'Read config.json and update database port', verbosity: 'full' },
      { id: '3', type: 'tools', content: 'Available: read_file, write_file, http_request', verbosity: 'full' },
    ]

    switch (loopStep) {
      case 0: // Step 1: Initial Load
        setLoopStep(1)
        setContextEntities(baseEntities)
        setStepDescription('Fresh start. Plenty of context space.')
        break

      case 1: // Step 2: Reason & Act
        setLoopStep(2)
        setContextEntities([
          ...baseEntities,
          { id: '4', type: 'reasoning', content: 'I need to read config.json to check the current port...', verbosity: 'full' },
          { id: '5', type: 'tool_call', content: 'read_file("config.json")', verbosity: 'full' }
        ])
        setStepDescription('LLM produces reasoning and action. Context filling up.')
        break

      case 2: // Step 3: Execute & Add Result
        setLoopStep(3)
        setContextEntities([
          ...baseEntities,
          { id: '4', type: 'reasoning', content: 'I need to read config.json to check the current port...', verbosity: 'full' },
          { id: '6', type: 'tool_result', content: '{ "db_port": 3306, "app_name": "MyApp", "timeout": 30... }', verbosity: 'full' }
        ])
        setStepDescription('Action executed. Tool result now in context.')
        break

      case 3: // Step 4: Context Pressure
        setLoopStep(4)
        setContextEntities([
          ...baseEntities,
          { id: '4', type: 'reasoning', content: '...read config...', verbosity: 'summary' },
          { id: '6', type: 'tool_result', content: '{ "db_port": 3306 }', verbosity: 'summary' },
          { id: '7', type: 'reasoning', content: "Now I'll update the port to 5432 in the config", verbosity: 'full' },
          { id: '8', type: 'tool_call', content: 'write_file("config.json", {db_port: 5432...})', verbosity: 'full' }
        ])
        setStepDescription('Context pressure! Load function compressed old reasoning and tool_result.')
        break

      case 4: // Step 5: Completion
        setLoopStep(5)
        setContextEntities([
          ...baseEntities,
          { id: '7', type: 'reasoning', content: "Now I'll update...", verbosity: 'summary' },
          { id: '9', type: 'tool_result', content: 'Successfully updated config.json', verbosity: 'full' }
        ])
        setStepDescription('Task complete. Load function evicted old tool interactions to free space.')
        break

      case 5: // Restart
        setLoopStep(0)
        setContextEntities([])
        setStepDescription('')
        break
    }
  }

  return (
    <div className="app">
      <div className="progress-bar" style={{ width: `${scrollProgress}%` }} />

      {/* Navigation Dots */}
      <div className="nav-dots">
        {Array.from({ length: totalSections }).map((_, index) => (
          <button
            key={index}
            className={`nav-dot ${activeSection === index ? 'active' : ''}`}
            onClick={() => scrollToSection(index)}
            aria-label={`Go to section ${index + 1}`}
          />
        ))}
      </div>

      <div className="noise-overlay" />

      {/* Hero Section */}
      <section
        ref={el => { if (el) sectionsRef.current[0] = el }}
        className="hero-section"
      >
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="emoji">🤖</span>
            Agent <span className="accent-word">Calculus</span>
          </h1>
          <p className="hero-subtitle">A Unified Framework for AI Agent Design</p>
          <div className="hero-description">
            <p>Let me tell you about something rather exciting. We're going to develop a unified formal framework for understanding AI agents—a kind of calculus, if you will.</p>
          </div>
          <div className="scroll-indicator">
            <span>Scroll to explore</span>
            <div className="scroll-arrow">↓</div>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section
        ref={el => { if (el) sectionsRef.current[1] = el }}
        className="content-section"
      >
        <div className="section-content">
          <h2 className="section-title">1. The Problem</h2>
          <p className="lecture-text">
            Now, let's start by asking ourselves: what's going on in modern AI agent systems?
            Well, if you look carefully, you'll find we're juggling quite a few distinct concepts:
          </p>
          <ul className="concept-list">
            <li><strong>Tools</strong>: Functions the agent can call to interact with the world</li>
            <li><strong>Skills</strong>: Reusable prompt templates and workflows</li>
            <li><strong>Rules</strong>: Configuration files (agent.md) defining behavioral constraints and guidelines</li>
            <li><strong>Slash Commands</strong>: User-invocable shortcuts that trigger specialized workflows</li>
            <li><strong>Memory</strong>: Persistent state from previous interactions</li>
            <li><strong>Subagents</strong>: Spawned agents for subtasks</li>
            <li><strong>Dynamic context loading</strong>: Just-in-time injection of relevant information</li>
            <li><strong>System prompts</strong>: Static instructions and behavior definitions</li>
          </ul>
          <p className="lecture-text">
            And here's the thing that should make us a bit uncomfortable: these concepts are typically
            treated as completely separate mechanisms. It's a bit of a mess, frankly. This is what I call
            the "bag of tricks" approach. It works, but it's not particularly satisfying intellectually, is it?
          </p>
        </div>
      </section>

      {/* The Solution */}
      <section
        ref={el => { if (el) sectionsRef.current[2] = el }}
        className="content-section highlight-section"
      >
        <div className="section-content">
          <h2 className="section-title">The Solution</h2>
          <p className="lecture-text">
            So what can we do about this? Well, here's the key insight: what if we had a unified way to think about all these disparate concepts?
            Let me introduce three fundamental building blocks:
          </p>

          <div className="two-column">
            <div className="column-card">
              <h3>LLM</h3>
              <p>The Large Language Model—a pure function that takes context as input and produces reasoning and actions as output.
              It's the "brain" but critically, it has no direct access to the world.</p>
            </div>
            <div className="column-card">
              <h3>Harness</h3>
              <p>The orchestration layer that manages what goes into the LLM's context and executes the actions it requests.
              Think of it as the "body" that bridges the LLM to the world.</p>
            </div>
          </div>

          <p className="lecture-text">
            Now here's where it gets interesting. What flows between the harness and the LLM? <strong>Entities</strong>—
            a unified abstraction for <em>everything</em>: tools, skills, memory, user input, results. They all become entities!
          </p>

          <div className="key-equation">
            <div className="equation">Agent = LLM + Harness</div>
          </div>
          <p className="lecture-text">
            That's it! An agent is just the composition of these two components with entities flowing between them.
            The beauty here is that we've found the right level of abstraction. Not too high, not too low. Just right.
          </p>
        </div>
      </section>

      {/* Core Assumptions */}
      <section
        ref={el => { if (el) sectionsRef.current[3] = el }}
        className="content-section"
      >
        <div className="section-content">
          <h2 className="section-title">2. Core Assumptions</h2>
          <p className="lecture-text">
            Now, before we dive into the technical details, let's be absolutely clear about our assumptions.
            I'm a great believer in making assumptions explicit—it prevents all sorts of confusion later on.
          </p>

          <div className="assumption-card">
            <h3>Assumption 1: Limited Context</h3>
            <p>
              <em>LLM context windows are finite and constrained.</em> Context is the primary scarce resource
              in agent systems.
            </p>
            <p className="lecture-text">
              Think about it this way: you've got perhaps 128K tokens to work with. That's it. Everything has
              to fit in there. This is the bottleneck, the constraint that drives everything else in our design.
            </p>
          </div>

          <div className="assumption-card">
            <h3>Assumption 2: Static Capabilities</h3>
            <p>
              <em>LLMs do not perform continual learning during inference.</em> Their capabilities are fixed at deployment.
            </p>
            <p className="lecture-text">
              When you're running an agent, the LLM isn't learning new skills on the fly. It's not updating its
              weights. It's a fixed function—you give it input, you get output, but the function itself doesn't change.
            </p>
          </div>

          <div className="assumption-card">
            <h3>Assumption 3: LLM Homogeneity</h3>
            <p>
              <em>For the purposes of this calculus, we treat different LLMs as interchangeable.</em>
            </p>
            <p className="lecture-text">
              Now, I can hear you protesting: "But, Hey, GPT-4 is different from Claude!" Yes, yes, in practice
              they differ. But for our formal model, we're going to abstract over those differences.
            </p>
          </div>
        </div>
      </section>

      {/* LLM as Pure Function */}
      <section
        ref={el => { if (el) sectionsRef.current[4] = el }}
        className="content-section highlight-section"
      >
        <div className="section-content">
          <h2 className="section-title">3. LLM as Pure Function</h2>
          <p className="lecture-text">
            Right, let's get formal. How should we model an LLM? Here's my proposal: let's think of it as a <em>pure function</em>.
          </p>
          <div className="code-block">
            <code>LLM: Context → (Reasoning, Actions)</code>
          </div>
          <p className="lecture-text">
            Look at this signature carefully. The LLM takes one thing as input and produces two things as output.
          </p>
          <div className="info-box">
            <div className="info-row">
              <strong>Input:</strong>
              <span>Context — The text and structured data directly accessible to the LLM</span>
            </div>
            <div className="info-row">
              <strong>Outputs:</strong>
              <span>Reasoning — Internal thought process, chain-of-thought, analysis</span>
            </div>
            <div className="info-row">
              <strong></strong>
              <span>Actions — Structured requests to interact with the world</span>
            </div>
          </div>
          <p className="lecture-text">
            Now here's the crucial bit: <em>The LLM has no direct access to anything outside its context</em>.
            Think of it as being in a sealed room—the only thing it can see is what's written on the walls
            of that room (the context).
          </p>
        </div>
      </section>

      {/* Context vs World */}
      <section
        ref={el => { if (el) sectionsRef.current[5] = el }}
        className="content-section"
      >
        <div className="section-content">
          <h2 className="section-title">Context vs World</h2>
          <p className="lecture-text">
            This distinction is absolutely fundamental, so let me be very precise about it:
          </p>
          <div className="two-column">
            <div className="column-card context-card">
              <h3>Context</h3>
              <p>The observable, directly accessible information within the LLM's attention window.</p>
              <ul>
                <li>Limited in size (e.g., 128K tokens)</li>
                <li>Directly influences LLM outputs</li>
                <li>Managed by the harness</li>
              </ul>
            </div>
            <div className="column-card world-card">
              <h3>World</h3>
              <p>Everything outside the context that the agent might need.</p>
              <ul>
                <li>File systems</li>
                <li>Databases</li>
                <li>APIs</li>
                <li>Previous conversation history</li>
                <li>External knowledge bases</li>
              </ul>
            </div>
          </div>
          <p className="lecture-text">
            You see the picture? The LLM lives in the context, isolated from the world. The harness acts as
            the bridge between these two realms. It's rather like the distinction between memory and disk in
            operating systems—one is fast and limited, the other is vast but inaccessible without mediation.
          </p>
        </div>
      </section>

      {/* Entity Abstraction */}
      <section
        ref={el => { if (el) sectionsRef.current[6] = el }}
        className="content-section highlight-section"
      >
        <div className="section-content">
          <h2 className="section-title">4. The Entity Abstraction</h2>
          <p className="lecture-text">
            Now we come to the real heart of the matter. Are you ready for the core insight? Here it is:
          </p>
          <div className="key-equation">
            <div className="equation-large">Everything is an Entity</div>
          </div>
          <p className="lecture-text">
            Let me say that again, because it's so important: <em>everything</em>. Tools? Entities. Skills?
            Entities. Memory? Entities. User input? Entity. Tool results? Entities. All entities! This is
            the abstraction that unifies the whole framework.
          </p>

          <div className="entity-grid">
            <div className="entity-card system-prompt-entity">
              <div className="entity-type">system_prompt</div>
              <div className="entity-content">You are a helpful AI assistant...</div>
              <div className="entity-badges">
                <span className="badge">full</span>
                <span className="badge">preloaded</span>
              </div>
            </div>
            <div className="entity-card user-input-entity">
              <div className="entity-type">user_input</div>
              <div className="entity-content">Read config.json and fix the database port</div>
              <div className="entity-badges">
                <span className="badge">full</span>
                <span className="badge">preloaded</span>
              </div>
            </div>
            <div className="entity-card tool-entity">
              <div className="entity-type">tool_description</div>
              <div className="entity-content">read_file: Read file contents</div>
              <div className="entity-badges">
                <span className="badge">summary</span>
                <span className="badge">dynamic</span>
              </div>
            </div>
            <div className="entity-card memory-entity">
              <div className="entity-type">memory</div>
              <div className="entity-content">User is working on database configuration...</div>
              <div className="entity-badges">
                <span className="badge">digest</span>
                <span className="badge">preloaded</span>
              </div>
            </div>
          </div>

          <p className="lecture-text">
            Entities can be characterized along multiple dimensions. Think of this as a design space with three axes:
          </p>
          <div className="dimension-list">
            <div className="dimension-item">
              <strong>Content Mutability:</strong> Static (tool definitions, skills) or Dynamic (memory, tool results)
            </div>
            <div className="dimension-item">
              <strong>Loading Time:</strong> Preloaded (always in context) or Dynamic (loaded on-demand)
            </div>
            <div className="dimension-item">
              <strong>Verbosity Levels:</strong> Full, Summary, Digest, or Reference
            </div>
          </div>
        </div>
      </section>

      {/* The Load Function */}
      <section
        ref={el => { if (el) sectionsRef.current[7] = el }}
        className="content-section"
      >
        <div className="section-content">
          <h2 className="section-title">The Load Function</h2>
          <p className="lecture-text">
            Now, let's talk about something absolutely critical: how does the harness actually manage the limited context window?
            This is where the rubber meets the road. The <strong>load</strong> function has four key responsibilities:
          </p>

          <div className="load-responsibilities-grid">
            <div className="load-responsibility-card">
              <div className="responsibility-icon">🔍</div>
              <h3>FILTERING</h3>
              <p className="responsibility-subtitle">What Goes In?</p>
              <ul>
                <li>Evaluates relevance of each entity</li>
                <li>Considers: recency, type priority, user intent</li>
                <li>Example: Tool results more relevant than old reasoning</li>
              </ul>
            </div>

            <div className="load-responsibility-card">
              <div className="responsibility-icon">🗜️</div>
              <h3>COMPRESSION</h3>
              <p className="responsibility-subtitle">How Much Detail?</p>
              <ul>
                <li>Adjusts verbosity based on context pressure</li>
                <li>Uses atomic operations: summarize, omit, paraphrase</li>
                <li>Example: "full" reasoning → "summary"</li>
              </ul>
            </div>

            <div className="load-responsibility-card">
              <div className="responsibility-icon">📑</div>
              <h3>ORDERING</h3>
              <p className="responsibility-subtitle">What Sequence?</p>
              <ul>
                <li>Determines entity position in context</li>
                <li>System prompt always first, user input near end</li>
                <li>Example: [system, memory, history, current_task, tools]</li>
              </ul>
            </div>

            <div className="load-responsibility-card">
              <div className="responsibility-icon">🗑️</div>
              <h3>EVICTION</h3>
              <p className="responsibility-subtitle">What Gets Removed?</p>
              <ul>
                <li>Decides what to drop when context is full</li>
                <li>Strategies: FIFO, LRU, importance-based</li>
                <li>Example: Drop old tool results before current reasoning</li>
              </ul>
            </div>
          </div>

          <div className="function-signature">
            <code>load(world_state, entities, config) → Context</code>
          </div>

          <p className="lecture-text">
            You see, the load function is the gatekeeper. It's constantly making decisions about what information
            the LLM needs to see, and crucially, at what level of detail. This is where the art meets the science!
          </p>
        </div>
      </section>

      {/* The Execute Function */}
      <section
        ref={el => { if (el) sectionsRef.current[8] = el }}
        className="content-section highlight-section"
      >
        <div className="section-content">
          <h2 className="section-title">The Execute Function</h2>
          <p className="lecture-text">
            Now let's look at the other side of the coin: the <strong>execute</strong> function. While load brings
            entities into context, execute takes actions out into the world and brings the results back as new entities.
          </p>

          <div className="execute-section">
            <div className="execute-explanation">
              <h3>Responsibilities</h3>
              <ul>
                <li>Takes LLM output (reasoning + actions)</li>
                <li>Executes actions in the world (API calls, file operations, etc.)</li>
                <li>Converts results into entities</li>
                <li>Updates world state</li>
                <li>Returns new entities to the load function</li>
              </ul>

              <div className="function-signature">
                <code>execute(action, world_state) → (new_entities, updated_world_state)</code>
              </div>
            </div>

            <div className="state-transition-diagram">
              <h3>State Transition</h3>
              <div className="diagram-flow">
                <div className="diagram-box">World State (t)</div>
                <div className="diagram-arrow">↓</div>
                <div className="diagram-box accent">Execute</div>
                <div className="diagram-arrow">↓</div>
                <div className="diagram-box">World State (t+1)</div>
                <div className="diagram-arrow side">→ New Entities →</div>
              </div>

              <div className="example-flow">
                <p><strong>Example Flow:</strong></p>
                <ol>
                  <li>LLM outputs: tool_call("read_file", "config.json")</li>
                  <li>Execute runs: fs.readFile("config.json")</li>
                  <li>Result becomes: Entity(type=tool_result, content="&#123; db_port: 3306 &#125;")</li>
                  <li>World state updated: files_accessed += ["config.json"]</li>
                  <li>Entity added to entities pool</li>
                </ol>
              </div>
            </div>
          </div>

          <p className="lecture-text">
            So you see, execute is the bridge from the LLM's world of text back to the real world of actions and state changes.
            It closes the loop, turning outputs into inputs for the next iteration. Elegant, isn't it?
          </p>
        </div>
      </section>

      {/* Atomic Load Operations */}
      <section
        ref={el => { if (el) sectionsRef.current[9] = el }}
        className="content-section"
      >
        <div className="section-content">
          <h2 className="section-title">Atomic Load Operations</h2>
          <p className="lecture-text">
            Right, now let me show you the building blocks of compression. These are the five fundamental operations
            that the load function uses to manage context pressure:
          </p>

          <div className="atomic-operations-grid">
            <div className="operation-card">
              <h3>SUMMARIZE</h3>
              <div className="operation-transform">
                <div className="transform-line">Full reasoning (200 tokens)</div>
                <div className="transform-arrow">→</div>
                <div className="transform-line">Summary (50 tokens)</div>
              </div>
              <p className="operation-use"><strong>Use:</strong> When context pressure is high, preserve meaning while reducing tokens</p>
            </div>

            <div className="operation-card">
              <h3>ELABORATE</h3>
              <div className="operation-transform">
                <div className="transform-line">Compressed summary (50 tokens)</div>
                <div className="transform-arrow">→</div>
                <div className="transform-line">Full detail (200 tokens)</div>
              </div>
              <p className="operation-use"><strong>Use:</strong> When context is available, restore detail for important entities</p>
            </div>

            <div className="operation-card">
              <h3>OMIT</h3>
              <div className="operation-transform">
                <div className="transform-line">Entity with content</div>
                <div className="transform-arrow">→</div>
                <div className="transform-line">Metadata reference only</div>
              </div>
              <p className="operation-use"><strong>Use:</strong> When content not immediately relevant, keep reference for retrieval</p>
            </div>

            <div className="operation-card">
              <h3>PARAPHRASE</h3>
              <div className="operation-transform">
                <div className="transform-line">Original phrasing</div>
                <div className="transform-arrow">→</div>
                <div className="transform-line">Equivalent but shorter</div>
              </div>
              <p className="operation-use"><strong>Use:</strong> Reduce tokens while keeping identical semantics</p>
            </div>

            <div className="operation-card">
              <h3>GROUP</h3>
              <div className="operation-transform">
                <div className="transform-line">Multiple similar entities</div>
                <div className="transform-arrow">→</div>
                <div className="transform-line">Single combined entity</div>
              </div>
              <p className="operation-use"><strong>Use:</strong> Merge repeated or related information to save space</p>
            </div>
          </div>

          <div className="function-signature">
            <code>Operation(entity_in, verbosity_target) → entity_out</code>
          </div>

          <p className="lecture-text">
            These atomic operations are the tools in the load function's toolbox. They're simple individually,
            but combined strategically, they allow sophisticated context management. It's rather like having
            a compression algorithm, but one that's semantic rather than syntactic!
          </p>
        </div>
      </section>

      {/* The Agent Loop */}
      <section
        ref={el => { if (el) sectionsRef.current[10] = el }}
        className="content-section demo-section"
      >
        <div className="section-content">
          <h2 className="section-title">5. The Agent Loop</h2>
          <p className="lecture-text">
            Right, this is where it all comes together! Now we can express the complete agent execution as a
            beautifully simple loop. This is the payoff for all our careful design.
          </p>

          <div className="demo-controls">
            <button
              className="demo-button"
              onClick={nextStep}
            >
              {getButtonText()}
            </button>
            <div className="step-description">
              {stepDescription || 'Click the button above to start the interactive demo'}
            </div>
          </div>

          <div className="demo-container">
            <div className="loop-steps-column">
              <div className={`loop-step ${loopStep === 1 || loopStep === 4 ? 'active' : ''}`}>
                <div className="step-number">1</div>
                <div className="step-name">LOAD</div>
                <div className="step-desc">Pack entities into context</div>
              </div>
              <div className="loop-arrow-down">↓</div>
              <div className={`loop-step ${loopStep === 2 || loopStep === 5 ? 'active' : ''}`}>
                <div className="step-number">2</div>
                <div className="step-name">REASON</div>
                <div className="step-desc">LLM processes context</div>
              </div>
              <div className="loop-arrow-down">↓</div>
              <div className={`loop-step ${loopStep === 3 || loopStep === 6 ? 'active' : ''}`}>
                <div className="step-number">3</div>
                <div className="step-name">EXECUTE</div>
                <div className="step-desc">Perform action in world</div>
              </div>
              <div className="loop-back">↺</div>
            </div>

            <div className="context-visualization">
              <div className="context-header">
                <h3>Context Window</h3>
                {contextEntities.length > 0 && (
                  <div className="capacity-indicator">
                    <div className="capacity-text">
                      Entities: {contextEntities.length}/{contextCapacity} ({getCapacityPercentage()}% full)
                    </div>
                    <div className="capacity-bar">
                      <div
                        className={`capacity-fill ${getCapacityPercentage() > 70 ? 'pressure' : ''}`}
                        style={{ width: `${getCapacityPercentage()}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="context-entities">
                {contextEntities.length > 0 ? (
                  contextEntities.map(entity => (
                    <div key={entity.id} className={`mini-entity ${entity.type} ${entity.verbosity !== 'full' ? 'compressed' : ''}`}>
                      <span className="mini-type">{entity.type}</span>
                      <span className="mini-content">{entity.content}</span>
                      {entity.verbosity !== 'full' && (
                        <span className="compression-badge">{entity.verbosity}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="context-empty">
                    Click "Run Demo" to see entities flow through the context...
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="lecture-text">
            Do you see how clean this is? Three phases: Load, Reason, Execute. Then repeat! The entity flows
            around the loop—load it into context, LLM reasons and acts, execute the action to get a new entity.
            Round and round we go until the task is complete.
          </p>
        </div>
      </section>

      {/* Context Management Strategies */}
      <section
        ref={el => { if (el) sectionsRef.current[11] = el }}
        className="content-section highlight-section"
      >
        <div className="section-content">
          <h2 className="section-title">Context Management Strategies</h2>
          <p className="lecture-text">
            Now, here's a practical question: when should you compress, when should you omit, and when should you evict?
            Let me show you three fundamental strategies for context management:
          </p>

          <div className="strategy-comparison-grid">
            <div className="strategy-card">
              <h3>Recency-Based</h3>
              <div className="strategy-description">
                <p><strong>Principle:</strong> Time matters most</p>
                <ul>
                  <li>Keep recent entities in full verbosity</li>
                  <li>Compress entities older than N turns</li>
                  <li>Evict entities older than M turns</li>
                </ul>
                <p className="strategy-best-for"><strong>Best for:</strong> Linear tasks, sequential workflows</p>
              </div>
            </div>

            <div className="strategy-card">
              <h3>Importance-Based</h3>
              <div className="strategy-description">
                <p><strong>Principle:</strong> Relevance matters most</p>
                <ul>
                  <li>Rank entities by relevance score</li>
                  <li>Keep high-importance entities full</li>
                  <li>Compress/evict low-importance</li>
                </ul>
                <p className="strategy-best-for"><strong>Best for:</strong> Complex reasoning, long sessions</p>
              </div>
            </div>

            <div className="strategy-card">
              <h3>Type-Priority</h3>
              <div className="strategy-description">
                <p><strong>Principle:</strong> Entity type determines treatment</p>
                <ul>
                  <li>System prompts: always full</li>
                  <li>User input: always full</li>
                  <li>Reasoning: compress after use</li>
                  <li>Tool results: evict after acknowledged</li>
                </ul>
                <p className="strategy-best-for"><strong>Best for:</strong> Resource-constrained environments</p>
              </div>
            </div>
          </div>

          <div className="decision-tree">
            <h3>Decision Thresholds</h3>
            <div className="threshold-flow">
              <div className="threshold-item">
                <span className="threshold-condition">Context &lt; 70% full</span>
                <span className="threshold-arrow">→</span>
                <span className="threshold-action">Keep all entities at full verbosity</span>
              </div>
              <div className="threshold-item">
                <span className="threshold-condition">Context 70-90% full</span>
                <span className="threshold-arrow">→</span>
                <span className="threshold-action">Start compressing old reasoning</span>
              </div>
              <div className="threshold-item">
                <span className="threshold-condition">Context &gt; 90% full</span>
                <span className="threshold-arrow">→</span>
                <span className="threshold-action">Evict old tool results, compress everything</span>
              </div>
            </div>
          </div>

          <p className="lecture-text">
            You see, context management isn't just about space—it's about making strategic decisions about what
            information the LLM needs at each moment. It's rather like paging in an operating system, isn't it?
          </p>
        </div>
      </section>

      {/* Entity Dimensions Explorer */}
      <section
        ref={el => { if (el) sectionsRef.current[12] = el }}
        className="content-section"
      >
        <div className="section-content">
          <h2 className="section-title">Entity Dimensions</h2>
          <p className="lecture-text">
            Let's explore the design space of entities. Think of this as a three-dimensional space where each
            entity can be positioned along multiple axes:
          </p>

          <div className="dimension-cards">
            <div className="dimension-card-detail">
              <h3>Content Verbosity</h3>
              <div className="verbosity-scale">
                <div className="verbosity-level">
                  <strong>full</strong> → Complete content (100% tokens)
                </div>
                <div className="verbosity-level">
                  <strong>summary</strong> → Key points only (30-50% tokens)
                </div>
                <div className="verbosity-level">
                  <strong>digest</strong> → Just the headline (10% tokens)
                </div>
                <div className="verbosity-level">
                  <strong>reference</strong> → Metadata only (0% content tokens)
                </div>
              </div>
            </div>

            <div className="dimension-card-detail">
              <h3>Metadata Richness</h3>
              <div className="metadata-scale">
                <div className="metadata-level">
                  <strong>minimal</strong> → type, content
                </div>
                <div className="metadata-level">
                  <strong>standard</strong> → + timestamp, id
                </div>
                <div className="metadata-level">
                  <strong>rich</strong> → + verbosity, source, dependencies
                </div>
                <div className="metadata-level">
                  <strong>full</strong> → + custom fields, embeddings
                </div>
              </div>
            </div>

            <div className="dimension-card-detail">
              <h3>Structural Complexity</h3>
              <div className="structure-scale">
                <div className="structure-level">
                  <strong>atomic</strong> → Single piece of information
                </div>
                <div className="structure-level">
                  <strong>composite</strong> → Combines multiple entities
                </div>
                <div className="structure-level">
                  <strong>hierarchical</strong> → Nested structure
                </div>
                <div className="structure-level">
                  <strong>graph</strong> → Cross-referenced entities
                </div>
              </div>
            </div>
          </div>

          <div className="entity-evolution-example">
            <h3>Example: Entity Evolution</h3>
            <div className="evolution-steps">
              <div className="evolution-step">
                <strong>Full (500 tokens)</strong>
                <code>"I need to read the config.json file to check the current database port setting, then compare it with the expected value..."</code>
              </div>
              <div className="evolution-arrow">↓</div>
              <div className="evolution-step">
                <strong>Summary (150 tokens)</strong>
                <code>"Check db port in config.json"</code>
              </div>
              <div className="evolution-arrow">↓</div>
              <div className="evolution-step">
                <strong>Digest (20 tokens)</strong>
                <code>"Read config"</code>
              </div>
              <div className="evolution-arrow">↓</div>
              <div className="evolution-step">
                <strong>Reference (metadata only)</strong>
                <code>&#123; id: "reasoning_42", type: "reasoning", omitted: true &#125;</code>
              </div>
            </div>
          </div>

          <p className="lecture-text">
            This dimensional thinking gives us precise control over how entities occupy context space. It's
            rather elegant, don't you think?
          </p>
        </div>
      </section>

      {/* Agent Patterns */}
      <section
        ref={el => { if (el) sectionsRef.current[13] = el }}
        className="content-section"
      >
        <div className="section-content">
          <h2 className="section-title">6. Multi-Agent Design Patterns</h2>
          <p className="lecture-text">
            Now here's where things get really interesting! Using our entity calculus, we can formally describe
            all the common agent patterns you've heard about. And what's beautiful is that they all emerge
            naturally from our framework. Let me show you.
          </p>

          <div className="patterns-grid">
            <div className="pattern-card">
              <div className="pattern-icon">🔧</div>
              <h3>Tool-Use Agent</h3>
              <p>Tools are simultaneously entities (their descriptions load into context) and actions
              (their implementations execute in world). They live in both realms!</p>
              <div className="pattern-code">
                entities = [system_prompt, memory, *tool_descriptions]
              </div>
            </div>

            <div className="pattern-card">
              <div className="pattern-icon">🎯</div>
              <h3>Skill-Enhanced Agent</h3>
              <p>Skills are just entities loaded at different verbosity levels based on relevance!
              Same mechanism, different verbosity.</p>
              <div className="pattern-code">
                load(GitCommitSkill, verbosity=full)
              </div>
            </div>

            <div className="pattern-card">
              <div className="pattern-icon">📋</div>
              <h3>Rule-Based Agent</h3>
              <p>Rules are static, high-priority entities that are always preloaded. They shape agent behavior
              by being permanently present in the context—like a constitution.</p>
              <div className="pattern-code">
                Entity(agent.md, loading=preloaded, verbosity=full)
              </div>
            </div>

            <div className="pattern-card">
              <div className="pattern-icon">⚡</div>
              <h3>Slash Commands</h3>
              <p>User-triggered skill entities that expand into full workflows. They provide discoverability,
              consistency, and efficiency for complex operations.</p>
              <div className="pattern-code">
                /commit → load(GitCommitSkill); execute_workflow()
              </div>
            </div>

            <div className="pattern-card">
              <div className="pattern-icon">🤝</div>
              <h3>Subagent Spawning</h3>
              <p>Subagents are just recursive invocations of the agent loop. The result is returned
              as an entity to the parent agent.</p>
              <div className="pattern-code">
                spawn_subagent("research task") → Entity
              </div>
            </div>

            <div className="pattern-card">
              <div className="pattern-icon">📚</div>
              <h3>RAG</h3>
              <p>RAG is just a sophisticated entity discovery mechanism! Retrieved documents are
              entities loaded into context. There's nothing magical here.</p>
              <div className="pattern-code">
                docs = semantic_search(query); load(doc_entities)
              </div>
            </div>

            <div className="pattern-card">
              <div className="pattern-icon">💭</div>
              <h3>ReAct</h3>
              <p>ReAct emerges naturally from the agent loop structure! We didn't have to do anything
              special—it just falls out of our design.</p>
              <div className="pattern-code">
                LLM: Context → (Reasoning, Actions)
              </div>
            </div>

            <div className="pattern-card">
              <div className="pattern-icon">🔍</div>
              <h3>Reflection</h3>
              <p>Reflection is subagent spawning with a specialized critic prompt. The critic reviews
              the work and returns feedback as an entity.</p>
              <div className="pattern-code">
                reflect(work) → Entity(critique)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conclusion */}
      <section
        ref={el => { if (el) sectionsRef.current[14] = el }}
        className="content-section conclusion-section"
      >
        <div className="section-content">
          <h2 className="section-title">Conclusion</h2>
          <p className="lecture-text">
            So, let me wrap this up and tell you what we've accomplished. The <strong>Entity Calculus</strong>
            provides a unified lens for understanding AI agents. Let me count the ways:
          </p>

          <div className="key-insights">
            <div className="insight-card">
              <div className="insight-number">1</div>
              <div className="insight-text">
                <strong>Everything is an entity</strong> — Skills, tools, memory, data—all flow through the
                same abstraction. One concept to rule them all!
              </div>
            </div>
            <div className="insight-card">
              <div className="insight-number">2</div>
              <div className="insight-text">
                <strong>Harness manages entity flow</strong> — The load and execute functions orchestrate
                entity movement between context and world. Two functions, that's it.
              </div>
            </div>
            <div className="insight-card">
              <div className="insight-number">3</div>
              <div className="insight-text">
                <strong>Context is the bottleneck</strong> — All optimizations revolve around the limited
                context window. Everything else is easy by comparison.
              </div>
            </div>
            <div className="insight-card">
              <div className="insight-number">4</div>
              <div className="insight-text">
                <strong>Patterns emerge naturally</strong> — Common agent patterns (ReAct, RAG, multi-agent)
                are special cases of entity flow. We didn't design them in—they fell out!
              </div>
            </div>
            <div className="insight-card">
              <div className="insight-number">5</div>
              <div className="insight-text">
                <strong>Composability</strong> — Because everything is an entity, components compose cleanly.
                This is what good abstraction gives you.
              </div>
            </div>
          </div>

          <p className="lecture-text">
            This is just the beginning. The framework gives us a foundation, but there's so much more to explore.
            I'm rather excited to see where this goes!
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>Built with the Agent Calculus framework</p>
        <p className="footer-small">A unified approach to AI agent design • Inspired by Simon Peyton Jones</p>
      </footer>
    </div>
  )
}

export default App
