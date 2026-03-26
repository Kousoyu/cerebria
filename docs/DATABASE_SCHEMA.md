# CogniCore 数据库架构设计

## 设计原则

1. **本地优先**: SQLite作为主要存储，零外部依赖
2. **向后兼容**: 保持现有API不变，内部实现升级
3. **优雅迁移**: 从内存存储平滑过渡到持久化存储
4. **性能优化**: 合理的索引设计，支持高效查询
5. **数据完整性**: 外键约束、事务支持

## 数据库表结构

### 1. 任务管理 (tasks)
```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT CHECK(status IN ('active', 'completed', 'failed', 'cancelled')) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  metadata TEXT, -- JSON格式的额外数据
  CHECK (created_at <= updated_at),
  CHECK (completed_at IS NULL OR completed_at >= created_at)
);
```

### 2. 策略管理 (policies) - 原PersonalityManager升级
```sql
CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  content TEXT NOT NULL, -- JSON格式的策略定义
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  CHECK (version >= 1)
);

-- 策略变更历史
CREATE TABLE IF NOT EXISTS policy_changes (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL,
  change_type TEXT CHECK(change_type IN ('create', 'update', 'delete', 'propose', 'approve', 'reject')) NOT NULL,
  previous_content TEXT, -- 变更前内容（JSON）
  new_content TEXT, -- 变更后内容（JSON）
  reason TEXT,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'applied')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by TEXT,
  applied_at TIMESTAMP,
  FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
);
```

### 3. 日志系统 (logs)
```sql
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  level TEXT CHECK(level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')) NOT NULL,
  message TEXT NOT NULL,
  component TEXT, -- 组件名称，如'task_manager', 'policy_manager'等
  operation TEXT, -- 操作类型，如'task_create', 'policy_change'等
  data TEXT, -- JSON格式的额外数据
  trace_id TEXT, -- 请求追踪ID
  INDEX idx_logs_timestamp (timestamp),
  INDEX idx_logs_level (level),
  INDEX idx_logs_component (component),
  INDEX idx_logs_operation (operation)
);

-- 日志分区表（按时间分区，优化查询性能）
CREATE TABLE IF NOT EXISTS logs_daily (
  CHECK (date(timestamp) = CURRENT_DATE)
) INHERITS (logs);
```

### 4. 备份管理 (backups)
```sql
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('full', 'incremental', 'differential')) DEFAULT 'full',
  status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
  size_bytes INTEGER,
  checksum_sha256 TEXT, -- SHA256校验和
  checksum_algorithm TEXT DEFAULT 'SHA256',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  file_path TEXT, -- 备份文件路径（可选）
  metadata TEXT, -- JSON格式的元数据
  FOREIGN KEY (parent_backup_id) REFERENCES backups(id)
);

-- 备份包含的项目
CREATE TABLE IF NOT EXISTS backup_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_id TEXT NOT NULL,
  item_type TEXT NOT NULL, -- 'task', 'policy', 'log'等
  item_id TEXT NOT NULL, -- 对应项目的ID
  item_snapshot TEXT, -- 项目快照（JSON格式）
  FOREIGN KEY (backup_id) REFERENCES backups(id) ON DELETE CASCADE
);
```

### 5. 系统状态 (system_state)
```sql
CREATE TABLE IF NOT EXISTS system_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

-- 健康指标
CREATE TABLE IF NOT EXISTS health_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  unit TEXT,
  tags TEXT -- JSON格式的标签
);

-- 事件记录
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON格式的事件数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  INDEX idx_events_type (event_type),
  INDEX idx_events_created (created_at)
);
```

## 索引设计

```sql
-- 任务查询优化
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created ON tasks(created_at);

-- 策略查询优化
CREATE INDEX idx_policies_active ON policies(is_active);
CREATE INDEX idx_policies_updated ON policies(updated_at);

-- 策略变更查询优化
CREATE INDEX idx_policy_changes_status ON policy_changes(status);
CREATE INDEX idx_policy_changes_policy ON policy_changes(policy_id);
CREATE INDEX idx_policy_changes_created ON policy_changes(created_at);

-- 备份查询优化
CREATE INDEX idx_backups_status ON backups(status);
CREATE INDEX idx_backups_created ON backups(created_at);
```

## 迁移策略

### 阶段1: 双写模式
1. 保持现有内存API不变
2. 新增数据库写入层
3. 所有操作同时写入内存和数据库
4. 读取优先从内存，数据库作为备份

### 阶段2: 数据库为主
1. 读取切换到数据库
2. 内存作为缓存层
3. 实现缓存失效策略

### 阶段3: 纯持久化模式
1. 移除内存存储
2. 完全依赖数据库
3. 优化数据库查询性能

## API兼容性保证

### 现有API保持不变
```javascript
// 现有代码继续工作
const taskId = await taskManager.createTask('标题', '描述', { priority: 'high' });
const task = await taskManager.getTask(taskId);
await taskManager.completeTask(taskId);
const allTasks = await taskManager.getAllTasks();
```

### 新增持久化特性
```javascript
// 新增方法（可选）
await taskManager.persist(); // 显式持久化
await taskManager.restoreFromBackup(backupId);
const stats = await taskManager.getStatistics();
```

## 性能考虑

### 1. 连接池管理
- SQLite连接复用
- 读写分离优化
- 事务批处理

### 2. 缓存策略
- 热点数据内存缓存
- 缓存失效时间控制
- 懒加载机制

### 3. 查询优化
- 分页查询支持
- 条件索引优化
- 预编译语句

### 4. 数据清理
- 日志自动轮转
- 历史数据归档
- 备份清理策略

## 备份与恢复

### 备份策略
1. **全量备份**: 整个数据库文件复制
2. **增量备份**: WAL日志备份
3. **差异备份**: 自上次全量备份以来的变化

### 恢复流程
```sql
-- 1. 停止服务
-- 2. 恢复数据库文件
-- 3. 应用WAL日志（如果使用增量备份）
-- 4. 验证数据完整性
-- 5. 重启服务
```

## 监控与维护

### 监控指标
- 数据库文件大小
- 表空间使用率
- 查询性能统计
- 连接池状态

### 维护任务
```sql
-- 定期清理
VACUUM; -- 清理碎片
ANALYZE; -- 更新统计信息

-- 完整性检查
PRAGMA integrity_check;
PRAGMA foreign_key_check;
```

## 安全性考虑

### 数据加密
- SQLite加密扩展（SQLCipher）
- 应用层加密敏感字段
- 备份文件加密存储

### 访问控制
- 文件系统权限控制
- 连接认证机制
- 审计日志记录

### 注入防护
- 参数化查询
- 输入验证
- 最小权限原则

---

*版本: 1.0*
*最后更新: 2026-03-26*
*状态: 设计阶段*