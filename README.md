# CogniCore

**A local-first, governed, recoverable agent runtime**

CogniCore is a local-first runtime for building persistent, skill-driven AI systems that can run locally, evolve safely, and recover reliably.

[![Tests](https://github.com/Kousoyu/cogni-core/actions/workflows/test.yml/badge.svg)](https://github.com/Kousoyu/cogni-core/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

## 🎯 What is CogniCore?

CogniCore is a **local-first agent runtime** for building AI systems with tasks, skills, session state, recovery, and governance. It provides the execution and control layer for persistent agents, while remaining composable with dedicated subsystems such as memory engines.

### Core Principles
- **Local-first** — Your runtime should work for a single user before it scales to a team.
- **Governed** — Skills, mutations, and risky actions should have boundaries.
- **Recoverable** — Long-running systems must survive interruption and restart cleanly.
- **Extensible** — Memory engines, tools, policies, and interfaces should be pluggable.

### What CogniCore Is
- An agent runtime
- A cognitive kernel  
- A host for pluggable memory engines and skills
- A policy-aware execution layer

### What CogniCore Is Not
- Just a prompt wrapper
- Just a skill plugin pack  
- Just a chatbot shell
- A giant everything-framework

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Kousoyu/cogni-core.git
cd cogni-core

# Install dependencies
npm install

# Run the basic example
npm start
```

### Docker Quick Start

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or run directly
docker run --rm -it \
  -e COGNI_MODE=standard \
  -v cogni-data:/app/data \
  -p 3000:3000 \
  ghcr.io/kousoyu/cogni-core:latest
```

## 📖 Basic Usage

```javascript
const CogniCore = require('cogni-core');

async function main() {
  // Initialize the system
  const system = await CogniCore.initialize({
    mode: 'standard',
    dataDir: './data'
  });

  // Create a task
  const taskId = await system.taskManager.createTask(
    'Example Task',
    'This is an example task',
    { priority: 'high' }
  );

  // Write a log
  await system.logManager.writeLog('INFO', 'Task created', { taskId });

  // Get health report
  const health = await system.healthMonitor.generateReport();
  console.log('System health:', health);
}

main();
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│           Application Layer             │
│  (Personal Assistants, Coding Agents)  │
└─────────────────────────────────────────┘
                   │
┌─────────────────────────────────────────┐
│           Governance Layer              │
│  (Policy Management, Approval Flows)    │
└─────────────────────────────────────────┘
                   │
┌─────────────────────────────────────────┐
│           Runtime Core                  │
│  (Task, Skill, Session State, Execution)      │
└─────────────────────────────────────────┘
                   │
┌─────────────────────────────────────────┐
│           Persistence Layer             │
│  (Runtime State, File System, Backups)         │
└─────────────────────────────────────────┘
```

### Key Components
- **Task Manager** - Persistent task lifecycle management
- **Policy Manager** - Governance and approval workflows  
- **Log Manager** - Structured logging with query capabilities
- **Backup Manager** - Reliable backup and recovery system
- **Health Monitor** - Real-time system health metrics
- **Event Bus** - Event-driven architecture for extensibility

## ⚙️ Configuration

CogniCore supports three operational modes:

| Mode | Use Case | Memory | Cache Size | Max Backups |
|------|----------|--------|------------|-------------|
| **Light** | IoT, Raspberry Pi, minimal resources | ~20MB | 10 | 3 |
| **Standard** | Personal development, small teams | ~50MB | 50 | 10 |
| **Performance** | Enterprise, high concurrency | ~200MB | 200 | 20 |

Configure via environment variables:
```bash
COGNI_MODE=performance
COGNI_DATA_DIR=/var/lib/cogni-core
COGNI_LOGGING_LEVEL=DEBUG
```

Or programmatically:
```javascript
const { ConfigManager } = require('cogni-core');
const config = new ConfigManager('standard');
```

## 🔧 Development

### Running Tests
```bash
npm test
npm run test:coverage
```

### Code Quality
```bash
npm run lint
```

### Building for Production
```bash
npm run build
```

## 🐳 Docker Deployment

CogniCore is optimized for containerized deployment:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install --production
ENV COGNI_MODE=standard
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["npm", "start"]
```

See `docker-compose.yml` for complete orchestration example.

## 📚 Documentation

- [API Reference](./docs/API_REFERENCE.md) - Complete API documentation
- [Configuration Guide](./docs/CONFIGURATION.md) - Configuration options
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment
- [Integration Guide](./docs/INTEGRATION.md) - External system integration
- [Events Reference](./docs/EVENTS.md) - Event-driven architecture

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

CogniCore is open source software licensed under the [MIT License](./LICENSE).

## 🗺️ Roadmap

### Phase 1: Foundation (Current)
- ✅ Core runtime architecture
- ✅ Basic task and session state management  
- ✅ Event-driven design
- 🔄 SQLite persistence integration
- 🔄 Policy governance framework

### Phase 2: Governance & Recovery
- Policy management with approval workflows
- Crash recovery and state restoration
- MCP (Model Context Protocol) integration
- OpenTelemetry observability

### Phase 3: Ecosystem & Scale
- Multi-model agent support
- Team collaboration features
- Enterprise deployment patterns
- Commercial control plane options

## 🙏 Acknowledgments

CogniCore builds upon ideas from the broader AI agent ecosystem, including inspiration from OpenClaw memory systems, LangGraph's durable execution patterns, and the MCP standardization effort.

---

**Build the assistant later. Build the runtime first.**

*CogniCore is the layer beneath the agent.*