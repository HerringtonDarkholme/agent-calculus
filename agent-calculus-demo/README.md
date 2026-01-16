# Agent Calculus Interactive Demo

An interactive web application demonstrating the **Agent Calculus** framework - a unified formal framework for understanding AI agents.

🚀 **Live Demo**: https://agent-calculus-demo-bb7kgx7sx-herringtondarkholmes-projects.vercel.app

## Overview

This interactive demo visualizes the core concepts of the Agent Calculus framework:

- **Agent = LLM + Harness**: The fundamental decomposition of an AI agent
- **Entity Abstraction**: Everything (tools, skills, memory, user input) as entities that flow through the system
- **The Agent Loop**: Load → Reason → Execute cycle
- **Common Patterns**: Tool-use, Skills, RAG, ReAct, Subagents, and Reflection

## Features

### 📚 Introduction Tab
- Visual explanation of core concepts
- Entity type examples with different verbosity levels
- Interactive agent loop diagram

### 🔄 Agent Loop Tab
- Step-by-step simulation of an agent solving a task
- Real-time context window visualization
- Execution log showing Load/Reason/Execute phases
- Animated phase transitions

### 🎯 Patterns Tab
- Overview of 6 common agent patterns
- Shows how all patterns emerge naturally from the entity calculus

## Tech Stack

- **React** + **TypeScript** for type-safe component development
- **Vite** for fast development and optimized production builds
- **CSS3** with custom properties for theming and animations
- **Vercel** for hosting and deployment

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── App.tsx          # Main application component
├── App.css          # Styling and animations
├── index.css        # Global styles
└── main.tsx         # Application entry point
```

## Deployment

This project is configured for automatic deployment to Vercel:

```bash
# Deploy to production
vercel --prod
```

## Key Components

### Entity Types
- `system_prompt` - Agent instructions
- `user_input` - User requests
- `tool_description` - Available tools
- `tool_result` - Tool execution results
- `memory` - Conversation history

### Verbosity Levels
- `full` - Complete content
- `summary` - Condensed version
- `digest` - Compressed representation
- `reference` - Pointer only

## Learn More

- Read the [Agent Calculus paper](../agent-calculus.md)
- Explore the framework concepts in the live demo
- Built with inspiration from Simon Peyton Jones' teaching style

## License

MIT

---

Built with the Agent Calculus framework • A unified approach to AI agent design
