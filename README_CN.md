# Cerebria

> ⚠️ **实验性项目**  
> Cerebria 是作为 [LimbicDB](https://github.com/Kousoyu/limbicdb) 的参考运行时环境。  
> **初来乍到？请先去了解 LimbicDB。**

[![npm version](https://img.shields.io/npm/v/cerebria.svg)](https://www.npmjs.com/package/cerebria)
[![Downloads](https://img.shields.io/npm/dm/cerebria.svg)](https://www.npmjs.com/package/cerebria)
[![Tests](https://github.com/Kousoyu/cerebria/actions/workflows/test.yml/badge.svg)](https://github.com/Kousoyu/cerebria/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)

Cerebria 是一个极其高级的、本地优先的运行时环境，它是持久化 AI Agent 底层的“执行内核”。它由 LimbicDB 提供强力记忆支撑，专为工业级的任务调度、状态快恢以及人类治理流而生。

---

## 🎯 核心哲学

**LimbicDB** 是记忆系统。它负责记住 *发生过什么知识事实*。  
**Cerebria** 则是操作系统。它统管 *事情该如何发生，而且当事情崩溃出错时系统该怎么办*。

如果你需要让你的 Agent 具备敏锐地回溯回忆和知识图谱的能力，请使用 LimbicDB。如果你需要你的 Agent 在面临意外断电时能自救、需要遵循强边界的安全策略以及将执行状态无缝地存入硬盘闪存中——请拥抱 Cerebria。

## ✨ 核心战斗力

- 🛡️ **崩溃恢复与状态还原引擎 (1.2 更新！)**：内建“僵尸任务捕获器”。如果系统意外蓝屏或强杀，在下次重启引导阶段时，Cerebria 会原生拦截之前被迫遗留在数据库的所有处于活跃态的孤儿任务，并打上接管印记，智能且自动地拉起并恢复执行！
- 🔒 **100% 严格的 TypeScript**：整体底座被全面重构成纯 TS ESM 规范。享受如同装甲般坚固的编译检测及类型提示体系。
- 💾 **可拔插持久化架构**：
  - `MockBackend`：零外部依赖的纯内存存储结构，专供无摩擦快速测试与探索。
  - `LimbicDBBackend`：原生的 SQLite 持久化接入仓。
- ⚙️ **事件驱动指令引擎**：所有的管理与调度通过底层的 `EventBus` 高速总线进行深度的异步钩子流转。

## 🚀 极速启动

### 前提条件
- Node.js 18+
- npm 或者 yarn

### 本地安装

```bash
npm install cerebria
```

**(可选项) 安装持久化存储引擎:**  
如果您想激活基于 SQLite 的持久化支持，需要额外安装同伴依赖:
```bash
npm install limbicdb
```

### 基础调用演示

```typescript
import Cerebria from 'cerebria';

async function main() {
  // 引导系统并开启 持久化与自动崩溃接管引擎
  const system = await Cerebria.initializeWithPersistence({
    mode: 'standard',
    dataDir: './data'
  });

  // 向队列指派一个任务
  const taskId = await system.taskManager.createTask(
    '数据聚合清洗',
    '获取三方服务器数据并脱敏摘要。',
    { priority: 'high' }
  );

  // 写下一条受控安全日志
  await system.logManager.writeLog('INFO', '流水线被系统激活启动', { taskId });

  // 侦测系统运行时心跳
  const health = await system.healthMonitor.generateReport();
  console.log('当前运行时脉搏:', health);
}

main().catch(console.error);
```

## 🏗️ 引擎分层堆栈

```text
┌─────────────────────────────────────────┐
│           应用实现层                      │
│  (各类个人助理机器人, AI自动补全代理)       │
└───────────────────┬─────────────────────┘
                    │
┌───────────────────┴─────────────────────┐
│           人类治理阀室                    │
│  (策略红线圈定, 人类同意审批流调度)         │
└───────────────────┬─────────────────────┘
                    │
┌───────────────────┴─────────────────────┐
│           Cerebria 执行心脏              │
│  (底层任务指派, 技能下发, 事件总线广播)     │
└───────────────────┬─────────────────────┘
                    │
┌───────────────────┴─────────────────────┐
│           持久化落地模块                  │
│  (崩溃恢复协议, LimbicDB引擎, 容灾备份库)   │
└─────────────────────────────────────────┘
```

## ⚙️ 模型环境配置

支持根据宿主服务器的能力动态配置压榨程度：

| 模式 | 宿主目标 | 内存限值 | 缓存容量 | 快恢槽位 |
|------|----------|--------|------------|-------------|
| **Light** | 树莓派, IoT | ~20MB | 10 | 3 |
| **Standard** | 个人电脑, 实验室小队伍| ~50MB | 50 | 10 |
| **Performance**| 业务级应用大集群 | ~200MB | 200 | 20 |

```bash
export COGNI_MODE=performance
export COGNI_DATA_DIR=/var/lib/cerebria
npm start
```

## 📚 阅读完整的文档簇

- [API 参考手册](./docs/API_REFERENCE.md)
- [核心配置指南](./docs/CONFIGURATION.md)
- [服务器部署纲要](./docs/DEPLOYMENT.md)
- [集成式连接细节](./docs/INTEGRATION.md)
- [内部事件驱动辞典](./docs/EVENTS.md)

## 🗺️ 产品里程碑 (Roadmap)

### 第一阶段：地基基础 (成就达成)
- ✅ 核心的运行时引擎架构
- ✅ 韧性的任务分配引擎与生命周期管理
- ✅ 消息异步事件处理总线机制
- ✅ SQLite 持久化存储深度融合

### 第二阶段：弹性抗灾与治理规则 (进行中)
- ✅ 意外崩溃接管与引擎热还原 **(实装完毕！)**
- 🔄 将人类意志与审批流结合到安全策略系统
- 🔄 MCP (Model Context Protocol / 模型上下文协议) 外挂工具链互融
- 🔄 接入 OpenTelemetry 执行观测系统

### 第三阶段：生态群落
- 多模多路代理任务分发支持
- 团队级云端隔离存储空间
- 商用控制平台的开放基座

## 🤝 贡献与开源许可
非常欢迎来参与！提交拉取请求或者探讨前请阅读 [贡献说明书](./CONTRIBUTING.md)。
本作遵循 [MIT License](./LICENSE) 许可并完全开源。

---

**无骨不立。请先搭建好运行时的骸骨，再去打造花哨的助理。**