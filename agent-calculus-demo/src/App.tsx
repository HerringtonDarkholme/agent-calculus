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

  const totalSections = 10

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

  const getButtonText = () => {
    if (loopStep === 0) return 'RUN DEMO'
    if (loopStep === 6) return 'RERUN'
    return 'NEXT STEP'
  }

  const nextStep = () => {
    const baseEntities: Entity[] = [
      { id: '1', type: 'system_prompt', content: 'You are a helpful AI assistant...', verbosity: 'full' },
      { id: '2', type: 'user_input', content: 'Read config.json and fix the database port', verbosity: 'full' },
      { id: '3', type: 'memory', content: 'User is working on database configuration...', verbosity: 'digest' },
    ]

    switch (loopStep) {
      case 0: // Start demo - Step 1: Load
        setLoopStep(1)
        setContextEntities(baseEntities)
        setStepDescription('Harness loads system prompt, user request, and relevant memory into context')
        break

      case 1: // Step 2: Reason
        setLoopStep(2)
        setContextEntities([
          ...baseEntities,
          { id: '4', type: 'reasoning', content: 'I need to read config.json to check the database port...', verbosity: 'full' },
          { id: '5', type: 'tool_call', content: 'read_file("config.json")', verbosity: 'full' }
        ])
        setStepDescription('LLM produces reasoning and requests tool call to read config.json')
        break

      case 2: // Step 3: Execute
        setLoopStep(3)
        setContextEntities([
          ...baseEntities,
          { id: '4', type: 'reasoning', content: 'I need to read config.json to check the database port...', verbosity: 'full' },
          { id: '6', type: 'tool_result', content: '{ "db_port": 3306, "db_host": "localhost" }', verbosity: 'full' }
        ])
        setStepDescription('Harness executes tool call and replaces it with the result')
        break

      case 3: // Step 4: Load again
        setLoopStep(4)
        setContextEntities([
          ...baseEntities,
          { id: '4', type: 'reasoning', content: 'I need to read config.json to check the database port...', verbosity: 'full' },
          { id: '6', type: 'tool_result', content: '{ "db_port": 3306, "db_host": "localhost" }', verbosity: 'full' }
        ])
        setStepDescription('Loop continues with updated context including tool result')
        break

      case 4: // Step 5: Reason again
        setLoopStep(5)
        setContextEntities([
          ...baseEntities,
          { id: '4', type: 'reasoning', content: 'I need to read config.json to check the database port...', verbosity: 'full' },
          { id: '6', type: 'tool_result', content: '{ "db_port": 3306, "db_host": "localhost" }', verbosity: 'full' },
          { id: '7', type: 'reasoning', content: 'Port is 3306 which is correct. Task complete.', verbosity: 'full' }
        ])
        setStepDescription('LLM processes the tool result and determines the task is complete')
        break

      case 5: // Step 6: Complete
        setLoopStep(6)
        setStepDescription('Task completed! The agent verified the database port configuration.')
        break

      case 6: // Restart
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
            So what can we do about this? Well, here's the key insight: what if we treated <em>all</em> inputs
            to an agent as <strong>entities</strong> that flow through a <strong>harness</strong>?
          </p>
          <div className="key-equation">
            <div className="equation">Agent = LLM + Harness</div>
          </div>
          <p className="lecture-text">
            That's it! An agent is just the composition of two components. The beauty here is that we've
            found the right level of abstraction. Not too high, not too low. Just right.
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
              Now, I can hear you protesting: "But Simon, GPT-4 is different from Claude!" Yes, yes, in practice
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

      {/* The Agent Loop */}
      <section
        ref={el => { if (el) sectionsRef.current[7] = el }}
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
              <h3>Context Window</h3>
              <div className="context-entities">
                {contextEntities.length > 0 ? (
                  contextEntities.map(entity => (
                    <div key={entity.id} className={`mini-entity ${entity.type}`}>
                      <span className="mini-type">{entity.type}</span>
                      <span className="mini-content">{entity.content}</span>
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

      {/* Agent Patterns */}
      <section
        ref={el => { if (el) sectionsRef.current[8] = el }}
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
        ref={el => { if (el) sectionsRef.current[9] = el }}
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
