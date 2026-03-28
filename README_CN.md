# Cerebria

**一个本地优先、可治理、可恢复的代理运行时**

Cerebria 是一个本地优先的运行时，用于构建持久的、技能驱动的 AI 系统，可以在本地运行、安全演进并可靠恢复。

[![Tests](https://github.com/Kousoyu/cerebria/actions/workflows/test.yml/badge.svg)](https://github.com/Kousoyu/cerebria/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

## 🎯 什么是 Cerebria？

Cerebria 是一个**本地优先的代理运行时**，用于构建具有任务、技能、会话状态、恢复和治理功能的 AI 系统。它为持久代理提供执行和控制层，同时保持与专用子系统（如记忆引擎）的可组合性。

### 核心原则
- **本地优先** — 您的运行时应该先为单个用户工作，然后再扩展到团队。
- **可治理** — 技能、变更和风险操作应该有边界。
- **可恢复** — 长期运行的系统必须能够从中断中干净地重启。
- **可扩展** — 记忆引擎、工具、策略和接口应该是可插拔的。

### Cerebria 是什么
- 一个代理运行时
- 一个认知内核  
- 可插拔记忆引擎和技能的宿主
- 一个策略感知的执行层

### Cerebria 不是什么
- 仅仅是一个提示包装器
- 仅仅是一个技能插件包  
- 仅仅是一个聊天机器人外壳
- 一个巨大的全能框架

## 特性

* **灵活的记忆系统**：内置 `MemoryManager`，支持可插拔的后端架构。
  * **MockBackend**：默认的内存存储，零依赖，适合开发测试。
  * **LimbicDBBackend**：可选的持久化存储，由 [limbicdb](https://github.com/Kousoyu/limbicdb) 驱动（基于 SQLite）。
* **任务管理**：健壮的任务调度与状态管理。
* **治理与恢复**：内置系统稳定性保障机制。

## 🚀 快速开始

### 先决条件
- Node.js 18 或更高版本
- npm 或 yarn

### 安装

```bash
npm install cerebria
```

**可选：持久化记忆支持**
如果你想使用 `LimbicDB` 进行记忆持久化，需要额外安装依赖：

```bash
npm install limbicdb@beta
```

### 从仓库快速开始

```bash
# 克隆仓库
git clone https://github.com/Kousoyu/cerebria.git
cd cerebria

# 安装依赖
npm install

# 运行基本示例
npm start
```

## 📖 基本用法

```javascript
const Cerebria = require('cerebria');

async function main() {
  // 初始化系统
  const system = await Cerebria.initialize({
    mode: 'standard',
    dataDir: './data'
  });

  // 创建任务
  const taskId = await system.taskManager.createTask(
    '示例任务',
    '这是一个示例任务',
    { priority: 'high' }
  );

  // 写入日志
  await system.logManager.writeLog('INFO', '任务已创建', { taskId });

  // 获取健康报告
  const health = await system.healthMonitor.generateReport();
  console.log('系统健康状况:', health);
}

main();
```

## 💾 记忆管理

`cerebria` 提供统一的记忆接口，你可以根据需求选择后端。

**方案 A：Mock 后端（默认）**
适合测试或短期会话，不会生成数据库文件。

```javascript
const { Cerebria } = require('cerebria');

async function main() {
  // 默认使用 MockBackend 初始化
  const system = await Cerebria.initialize(); 
  
  await system.memoryManager.remember('用户喜欢深色模式', 'preference');
  const result = await system.memoryManager.recall('深色模式');
  console.log(result.memories);
}

main();
```

**方案 B：LimbicDB 后端（持久化）**
适合长期记忆存储。需要安装 `limbicdb`。

```javascript
const { Cerebria } = require('cerebria');

async function main() {
  // 使用 LimbicDB 初始化
  const system = await Cerebria.initializeWithLimbicDB({
    memoryPath: './agent_memory.limbic' // 数据库文件路径
  });
  
  await system.memoryManager.remember('项目截止日期是下周一', 'fact');
  
  // ... 其他业务逻辑
}

main();
```

## 🏗️ 架构概览

```
┌─────────────────────────────────────────┐
│           应用层                        │
│  (个人助理, 编码代理)                  │
└─────────────────────────────────────────┘
                   │
┌─────────────────────────────────────────┐
│           治理层                        │
│  (策略管理, 审批流程)                  │
└─────────────────────────────────────────┘
                   │
┌─────────────────────────────────────────┐
│           运行时核心                    │
│  (任务, 技能, 会话状态, 执行)          │
└─────────────────────────────────────────┘
                   │
┌─────────────────────────────────────────┐
│           持久化层                      │
│  (运行时状态, 文件系统, 备份)          │
└─────────────────────────────────────────┘
```

### 关键组件
- **任务管理器** - 持久任务生命周期管理
- **策略管理器** - 治理和审批工作流  
- **日志管理器** - 带查询功能的结构化日志
- **备份管理器** - 可靠的备份和恢复系统
- **健康监控器** - 实时系统健康指标
- **事件总线** - 用于可扩展性的事件驱动架构

## ⚙️ 配置

Cerebria 支持三种操作模式：

| 模式 | 使用场景 | 内存 | 缓存大小 | 最大备份数 |
|------|----------|--------|------------|-------------|
| **轻量** | IoT, 树莓派, 最小资源 | ~20MB | 10 | 3 |
| **标准** | 个人开发, 小团队 | ~50MB | 50 | 10 |
| **性能** | 企业级, 高并发 | ~200MB | 200 | 20 |

通过环境变量配置：
```bash
COGNI_MODE=performance
COGNI_DATA_DIR=/var/lib/cerebria
COGNI_LOGGING_LEVEL=DEBUG
```

或以编程方式：
```javascript
const { ConfigManager } = require('cerebria');
const config = new ConfigManager('standard');
```

## 🔧 开发

### 运行测试
```bash
npm test
npm run test:coverage
```

### 代码质量
```bash
npm run lint
```

### 生产构建
```bash
npm run build
```

## 🐳 Docker 部署

Cerebria 针对容器化部署进行了优化：

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

完整的编排示例请参见 `docker-compose.yml`。

## 📚 文档

### MemoryManager API

* `remember(content: string, type?: MemoryType): Promise<Memory>`
  * 存储新记忆。`type` 支持 `'fact'`（事实）、`'episode'`（事件）、`'preference'`（偏好）、`'procedure'`（过程）或 `'goal'`（目标）。
* `recall(query: string, options?: RecallOptions): Promise<RecallResult>`
  * 根据查询检索记忆。支持按 `types`（类型）和 `limit`（数量）过滤。
* `forget(id: string): Promise<void>`
  * 根据 ID 移除特定记忆。

### 完整文档

- [API 参考](./docs/API_REFERENCE.md) - 完整的 API 文档
- [配置指南](./docs/CONFIGURATION.md) - 配置选项
- [部署指南](./docs/DEPLOYMENT.md) - 生产部署
- [集成指南](./docs/INTEGRATION.md) - 外部系统集成
- [事件参考](./docs/EVENTS.md) - 事件驱动架构

## 🤝 贡献

我们欢迎贡献！详情请参阅我们的 [贡献指南](./CONTRIBUTING.md)。

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 📄 许可证

Cerebria 是根据 [MIT 许可证](./LICENSE) 授权的开源软件。

## 🗺️ 路线图

### 第一阶段：基础（当前）
- ✅ 核心运行时架构
- ✅ 基本任务和会话状态管理  
- ✅ 事件驱动设计
- 🔄 SQLite 持久化集成
- 🔄 策略治理框架

### 第二阶段：治理与恢复
- 带审批工作流的策略管理
- 崩溃恢复和状态还原
- MCP（模型上下文协议）集成
- OpenTelemetry 可观测性

### 第三阶段：生态系统与扩展
- 多模型代理支持
- 团队协作功能
- 企业部署模式
- 商业控制平面选项

## 🙏 致谢

Cerebria 基于更广泛的 AI 代理生态系统的理念构建，包括来自 OpenClaw 记忆系统、LangGraph 的持久执行模式以及 MCP 标准化工作的启发。

---

**先构建运行时，再构建助手。**

*Cerebria 是代理之下的层。*