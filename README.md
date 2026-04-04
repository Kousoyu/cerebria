# Cerebria

> ⚠️ **Experimental**  
> Cerebria is the reference runtime for [LimbicDB](https://github.com/Kousoyu/limbicdb).  
> **New here? Start with LimbicDB first.**

[![npm version](https://img.shields.io/npm/v/cerebria.svg)](https://www.npmjs.com/package/cerebria)
[![Downloads](https://img.shields.io/npm/dm/cerebria.svg)](https://www.npmjs.com/package/cerebria)
[![Tests](https://github.com/Kousoyu/cerebria/actions/workflows/test.yml/badge.svg)](https://github.com/Kousoyu/cerebria/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)

Cerebria is an advanced, local-first runtime acting as the execution kernel beneath persistent AI agents. It provides industrial-grade task scheduling, state recovery, and memory governance powered by LimbicDB.

---

## 🎯 The Philosophy

**LimbicDB** is the memory. It remembers *what happened*.  
**Cerebria** is the operating system. It governs *how things happen, and what happens when they fail*.

If you need your agent to intelligently recall facts, use LimbicDB. If you need your agent to stubbornly survive power outages, execute governed multi-step reasoning, and properly flush state to disk—explore Cerebria.

## ✨ Core Capabilities

- 🛡️ **Crash Recovery & State Restoration (New in 1.2!)**: Built-in "zombie-catching". If the system powers down unexpectedly, Cerebria natively intercepts all orphaned, active tasks upon the next boot sequence, marks their recovery footprint, and intelligently resumes execution.
- 🔒 **100% Strict TypeScript**: Entirely refactored to pure TS ESM for rock-solid compilation without a single loose type error.
- 💾 **Pluggable Architecture**:
  - `MockBackend`: Zero-dependency in-memory mode for frictionless testing.
  - `LimbicDBBackend`: Native SQLite persistent store.
- ⚙️ **Event-Driven Task Control**: Deep architectural integration with an internal `EventBus` to handle complex asynchronous governance workflows.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install cerebria
```

**(Optional) Persistent Memory Support:**  
To use SQLite-backed persistence, install the peer dependency:
```bash
npm install limbicdb
```

### Basic Usage

```typescript
import Cerebria from 'cerebria';

async function main() {
  // Initialize the engine with Persistence and Auto-Recovery enabled
  const system = await Cerebria.initializeWithPersistence({
    mode: 'standard',
    dataDir: './data'
  });

  // Assign a task to the queue
  const taskId = await system.taskManager.createTask(
    'Data Aggregation',
    'Fetch analytics and summarize.',
    { priority: 'high' }
  );

  // Write a governed log
  await system.logManager.writeLog('INFO', 'Pipeline initiated', { taskId });

  // Monitor the Runtime Heartbeat
  const health = await system.healthMonitor.generateReport();
  console.log('Runtime Status:', health);
}

main().catch(console.error);
```

## 🏗️ Architecture Stack

```text
┌─────────────────────────────────────────┐
│           Application Layer             │
│  (Personal Assistants, Coding Agents)   │
└───────────────────┬─────────────────────┘
                    │
┌───────────────────┴─────────────────────┐
│           Governance Layer              │
│  (Policy Management, Approval Flows)    │
└───────────────────┬─────────────────────┘
                    │
┌───────────────────┴─────────────────────┐
│           Cerebria Kernel               │
│  (Tasks, Skills, EventBus, Execution)   │
└───────────────────┬─────────────────────┘
                    │
┌───────────────────┴─────────────────────┐
│           Persistence Layer             │
│  (Crash Recovery, LimbicDB, Backups)    │
└─────────────────────────────────────────┘
```

## ⚙️ Configuration Environments

Configure Cerebria dynamically using environments:

| Mode | Target | Mem Target | Cache Size | Max Backups |
|------|----------|--------|------------|-------------|
| **Light** | IoT, Raspberry Pi | ~20MB | 10 | 3 |
| **Standard** | Developers, Small Teams| ~50MB | 50 | 10 |
| **Performance**| Enterprise scale | ~200MB | 200 | 20 |

```bash
export COGNI_MODE=performance
export COGNI_DATA_DIR=/var/lib/cerebria
npm start
```

## 📚 Complete Documentation

- [API Reference](./docs/API_REFERENCE.md)
- [Configuration Guide](./docs/CONFIGURATION.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Integration Details](./docs/INTEGRATION.md)
- [Events Reference](./docs/EVENTS.md)

## 🗺️ Roadmap

### Phase 1: Foundation (Completed)
- ✅ Core runtime architecture
- ✅ Flexible task and session state management
- ✅ Event-driven messaging bus
- ✅ SQLite persistence integration

### Phase 2: Resilience & Governance (Current)
- ✅ Crash Recovery Engine & State Restoration **(Done!)**
- 🔄 Policy management with human approval workflows
- 🔄 MCP (Model Context Protocol) tool integration
- 🔄 OpenTelemetry observability

### Phase 3: Ecosystem Pipeline
- Multi-model agent dispatch support
- Team collaboration namespaces
- Commercial control plane abstractions

## 🤝 Contributing & License
We welcome contributions! Read our [Contributing Guide](./CONTRIBUTING.md) for pull request workflows.
Licensed under the [MIT License](./LICENSE).

---

**Build the OS first. Build the agent later.**