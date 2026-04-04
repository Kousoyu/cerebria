// @ts-nocheck

/**
 * PersistentTaskManager - 持久化任务管理
 * 继承自TaskManager，提供SQLite持久化支持
 */

import TaskManager, { TaskDefinition, TaskOptions }  from '../task_manager';
import CerebriaDatabase  from './Database';

export interface PersistentOptions {
  dataDir?: string;
  memory?: boolean;
  verbose?: boolean;
  persistent?: boolean;
  [key: string]: any;
}

class PersistentTaskManager extends TaskManager {
  private dbOptions: any;
  public db: CerebriaDatabase | null;
  public usePersistentStorage: boolean;
  private cache: Map<string, TaskDefinition>;
  public initialized: boolean;

  constructor(options: PersistentOptions = {}) {
    super(options);

    this.dbOptions = {
      dataDir: options.dataDir || './data',
      memory: options.memory || false,
      readonly: false,
      verbose: options.verbose || false
    };

    this.db = null;
    this.usePersistentStorage = options.persistent !== false; // 默认启用持久化
    this.cache = new Map(); // 内存缓存，提高读取性能

    // 延迟初始化数据库连接
    this.initialized = false;
  }

  /**
   * 初始化数据库连接
   */
  async initialize() {
    if (this.initialized || !this.usePersistentStorage) {
      return;
    }

    try {
      this.db = new CerebriaDatabase(this.dbOptions);
      await this.db.connect();
      this.initialized = true;

      // 从数据库加载现有任务到缓存
      await this.loadTasksIntoCache();

      console.log('✅ PersistentTaskManager initialized with database storage');
    } catch (error: any) {
      console.warn('⚠️  Failed to initialize persistent storage, falling back to memory:', error.message);
      this.usePersistentStorage = false;
      this.initialized = true;
    }
  }

  /**
   * 从数据库加载任务到缓存
   */
  async loadTasksIntoCache() {
    if (!this.initialized || !this.usePersistentStorage) {
      return;
    }

    try {
      const tasks = this.db!.query('SELECT * FROM tasks ORDER BY created_at DESC');

      tasks.forEach((task: any) => {
        // 转换数据库行到任务对象
        const taskObj = this.dbRowToTask(task);
        this.cache.set(task.id, taskObj);
        this.tasks.set(task.id, taskObj); // 同时更新父类的内存存储
      });

      console.log(`✅ Loaded ${tasks.length} tasks from database into cache`);
    } catch (error: any) {
      console.error('❌ Failed to load tasks from database:', error.message);
      throw error;
    }
  }

  /**
   * 转换数据库行到任务对象
   */
  dbRowToTask(row: any): TaskDefinition {
    const md = row.metadata ? JSON.parse(row.metadata) : {};
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      intent: md.intent,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      metadata: md
    };
  }

  /**
   * 转换任务对象到数据库行
   */
  taskToDbRow(task: TaskDefinition): any {
    const md = { ...(task.metadata || {}), intent: task.intent };
    return {
      id: task.id,
      title: task.title,
      description: task.description || null,
      priority: task.priority || 'medium',
      status: task.status || 'active',
      /* eslint-disable camelcase */
      created_at: task.createdAt || new Date().toISOString(),
      updated_at: task.updatedAt || new Date().toISOString(),
      completed_at: task.completedAt || null,
      /* eslint-enable camelcase */
      metadata: JSON.stringify(md)
    };
  }

  /**
   * 创建任务（重写父类方法）
   */
  async createTask(title: string, description: string, options: TaskOptions = {}): Promise<string> {
    // 确保初始化
    if (!this.initialized) {
      await this.initialize();
    }

    // 先调用父类方法创建内存任务
    const taskId = await super.createTask(title, description, options);
    const task = this.tasks.get(taskId);

    // 如果启用持久化，保存到数据库
    if (this.usePersistentStorage && this.db) {
      try {
        const dbRow = this.taskToDbRow(task!);

        this.db.run(`
          INSERT INTO tasks (id, title, description, priority, status, created_at, updated_at, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          dbRow.id,
          dbRow.title,
          dbRow.description,
          dbRow.priority,
          dbRow.status,
          dbRow.created_at,
          dbRow.updated_at,
          dbRow.metadata
        ]);

        // 更新缓存
        this.cache.set(taskId, { ...task! });

        console.log(`✅ Task ${taskId} persisted to database`);
      } catch (error: any) {
        console.error('❌ Failed to persist task to database:', error.message);
        // 不抛出错误，保持内存操作成功
      }
    }

    return taskId;
  }

  /**
   * 获取任务（重写父类方法，优先从缓存/数据库读取）
   */
  async getTask(taskId) {
    // 确保初始化
    if (!this.initialized) {
      await this.initialize();
    }

    // 先从缓存查找
    if (this.cache.has(taskId)) {
      return this.cache.get(taskId);
    }

    // 如果启用持久化，从数据库读取
    if (this.usePersistentStorage && this.db) {
      try {
        const row = this.db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
        if (row) {
          const task = this.dbRowToTask(row);

          // 更新缓存和内存存储
          this.cache.set(taskId, task);
          this.tasks.set(taskId, task);

          return task;
        }
      } catch (error: any) {
        console.error('❌ Failed to fetch task from database:', error.message);
      }
    }

    // 回退到父类方法
    return super.getTask(taskId);
  }

  /**
   * 完成任务（重写父类方法）
   */
  async completeTask(taskId) {
    // 确保初始化
    if (!this.initialized) {
      await this.initialize();
    }

    // 先调用父类方法
    const task = await super.completeTask(taskId);

    if (task && this.usePersistentStorage && this.db) {
      try {
        this.db.run(`
          UPDATE tasks 
          SET status = ?, updated_at = ?, completed_at = ?
          WHERE id = ?
        `, [
          'completed',
          new Date().toISOString(),
          new Date().toISOString(),
          taskId
        ]);

        // 更新缓存
        if (this.cache.has(taskId)) {
          const cached = this.cache.get(taskId);
          cached.status = 'completed';
          cached.updatedAt = new Date().toISOString();
          cached.completedAt = new Date().toISOString();
        }

        console.log(`✅ Task ${taskId} completion persisted to database`);
      } catch (error: any) {
        console.error('❌ Failed to persist task completion to database:', error.message);
      }
    }

    return task;
  }

  /**
   * 获取所有任务（重写父类方法，优先从数据库读取）
   */
  async getAllTasks() {
    // 确保初始化
    if (!this.initialized) {
      await this.initialize();
    }

    // 如果启用持久化，从数据库读取最新数据
    if (this.usePersistentStorage && this.db) {
      try {
        const rows = this.db.query('SELECT * FROM tasks ORDER BY created_at DESC');
        const tasks = rows.map((row) => this.dbRowToTask(row));

        // 更新缓存和内存存储
        tasks.forEach((task) => {
          this.cache.set(task.id, task);
          this.tasks.set(task.id, task);
        });

        return tasks;
      } catch (error: any) {
        console.error('❌ Failed to fetch tasks from database:', error.message);
        // 回退到内存存储
      }
    }

    // 回退到父类方法
    return super.getAllTasks();
  }

  /**
   * 根据条件查询任务
   */
  async queryTasks(filters: any = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.usePersistentStorage || !this.db) {
      // 内存版本的基础过滤
      const allTasks = await super.getAllTasks();
      return this.filterTasksInMemory(allTasks, filters);
    }

    try {
      const { whereClause, params } = this.buildWhereClause(filters);
      const sql = `SELECT * FROM tasks ${whereClause} ORDER BY created_at DESC`;
      const rows = this.db.query(sql, params);

      return rows.map((row) => this.dbRowToTask(row));
    } catch (error: any) {
      console.error('❌ Failed to query tasks:', error.message);
      throw error;
    }
  }

  /**
   * 构建SQL WHERE子句
   */
  buildWhereClause(filters) {
    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters.priority) {
      conditions.push('priority = ?');
      params.push(filters.priority);
    }

    if (filters.createdAfter) {
      conditions.push('created_at > ?');
      params.push(filters.createdAfter);
    }

    if (filters.createdBefore) {
      conditions.push('created_at < ?');
      params.push(filters.createdBefore);
    }

    if (filters.search) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    return { whereClause, params };
  }

  /**
   * 内存过滤（回退方案）
   */
  filterTasksInMemory(tasks, filters) {
    return tasks.filter((task) => {
      if (filters.status && task.status !== filters.status) {
        return false;
      }
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }
      if (filters.createdAfter && new Date(task.createdAt) <= new Date(filters.createdAfter)) {
        return false;
      }
      if (filters.createdBefore && new Date(task.createdAt) >= new Date(filters.createdBefore)) {
        return false;
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(searchLower);
        const descMatch = task.description?.toLowerCase().includes(searchLower) || false;
        if (!titleMatch && !descMatch) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 获取任务统计信息
   */
  async getStatistics() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.usePersistentStorage || !this.db) {
      const allTasks = await super.getAllTasks();
      return {
        total: allTasks.length,
        active: allTasks.filter((t) => t.status === 'active').length,
        completed: allTasks.filter((t) => t.status === 'completed').length,
        byPriority: this.countByPriority(allTasks),
        storage: 'memory'
      };
    }

    try {
      const stats = this.db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          priority,
          COUNT(*) as priority_count
        FROM tasks
        GROUP BY priority
      `);

      const dbStats = this.db.getStats();

      const byPriority = {};
      stats.forEach((row) => {
        if (row.priority) {
          byPriority[row.priority] = row.priority_count;
        }
      });

      return {
        total: stats[0]?.total || 0,
        active: stats[0]?.active || 0,
        completed: stats[0]?.completed || 0,
        byPriority,
        storage: 'database',
        dbStats
      };
    } catch (error: any) {
      console.error('❌ Failed to get task statistics:', error.message);
      throw error;
    }
  }

  /**
   * 按优先级计数（内存版本）
   */
  countByPriority(tasks) {
    const counts = {};
    tasks.forEach((task) => {
      counts[task.priority] = (counts[task.priority] || 0) + 1;
    });
    return counts;
  }

  /**
   * 清理旧任务
   */
  async cleanupOldTasks(options: any = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const defaults = {
      keepCompletedDays: 90, // 保留90天内的已完成任务
      keepAllTasks: false    // 是否保留所有任务（不删除）
    };

    const config = { ...defaults, ...options };

    if (config.keepAllTasks) {
      return { deleted: 0, message: 'Cleanup skipped (keepAllTasks is true)' };
    }

    if (!this.usePersistentStorage || !this.db) {
      // 内存版本的清理（简单实现）
      const beforeCleanup = this.tasks.size;

      for (const [taskId, task] of this.tasks.entries()) {
        if (task.status === 'completed') {
          const completedDate = new Date(task.completedAt || task.updatedAt);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - config.keepCompletedDays);

          if (completedDate < cutoffDate) {
            this.tasks.delete(taskId);
            this.cache.delete(taskId);
          }
        }
      }

      const deleted = beforeCleanup - this.tasks.size;
      return { deleted, storage: 'memory' };
    }

    try {
      const result = this.db.run(`
        DELETE FROM tasks 
        WHERE status = 'completed' 
        AND completed_at < datetime('now', ?)
      `, [`-${config.keepCompletedDays} days`]);

      // 清理缓存
      for (const [taskId] of this.cache.entries()) {
        if (!this.db.get('SELECT 1 FROM tasks WHERE id = ?', [taskId])) {
          this.cache.delete(taskId);
          this.tasks.delete(taskId);
        }
      }

      return {
        deleted: result.changes,
        storage: 'database',
        message: `Deleted ${result.changes} old completed tasks`
      };
    } catch (error: any) {
      console.error('❌ Failed to cleanup old tasks:', error.message);
      throw error;
    }
  }

  /**
   * 显式持久化所有内存中的任务
   */
  async persistAll() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.usePersistentStorage || !this.db) {
      console.warn('⚠️  Cannot persist: persistent storage not enabled');
      return { persisted: 0 };
    }

    try {
      let persisted = 0;

      // 在事务中批量持久化
      this.db.transaction(() => {
        for (const [taskId, task] of this.tasks.entries()) {
          const dbRow = this.taskToDbRow(task);

          // 检查任务是否已存在
          const existing = this.db.get('SELECT 1 FROM tasks WHERE id = ?', [taskId]);

          if (existing) {
            // 更新现有任务
            this.db.run(`
              UPDATE tasks 
              SET title = ?, description = ?, priority = ?, status = ?, 
                  updated_at = ?, completed_at = ?, metadata = ?
              WHERE id = ?
            `, [
              dbRow.title,
              dbRow.description,
              dbRow.priority,
              dbRow.status,
              dbRow.updated_at,
              dbRow.completed_at,
              dbRow.metadata,
              taskId
            ]);
          } else {
            // 插入新任务
            this.db.run(`
              INSERT INTO tasks (id, title, description, priority, status, created_at, updated_at, metadata)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              dbRow.id,
              dbRow.title,
              dbRow.description,
              dbRow.priority,
              dbRow.status,
              dbRow.created_at,
              dbRow.updated_at,
              dbRow.metadata
            ]);
          }

          persisted++;
        }
      })();

      console.log(`✅ Persisted ${persisted} tasks to database`);
      return { persisted };
    } catch (error: any) {
      console.error('❌ Failed to persist tasks:', error.message);
      throw error;
    }
  }

  /**
   * 恢复崩溃/僵尸任务 (Crash Recovery)
   * 搜索上次运行中非正常关闭的 active 任务并将其标记为 recovering
   */
  async recoverOrphanedTasks() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.usePersistentStorage || !this.db) {
      return { recovered: 0, tasks: [] };
    }

    try {
      // 查找所有 active 和 running 的任务（这些在重启时本应是死的）
      const rows = this.db.query(`
        SELECT * FROM tasks 
        WHERE status IN ('active', 'running') AND completed_at IS NULL
      `);
      
      const recoveredTasks = [];

      if (rows.length > 0) {
        this.db.transaction(() => {
          rows.forEach((row) => {
            const task = this.dbRowToTask(row);
            task.status = 'recovering';
            task.updatedAt = new Date().toISOString();
            
            // 写入恢复日志到 metadata 中
            task.metadata = task.metadata || {};
            task.metadata.recoveryCount = (task.metadata.recoveryCount || 0) + 1;
            task.metadata.lastRecoveredAt = new Date().toISOString();
            
            const metadataStr = JSON.stringify(task.metadata);

            this.db.run(`
              UPDATE tasks 
              SET status = 'recovering', updated_at = ?, metadata = ?
              WHERE id = ?
            `, [task.updatedAt, metadataStr, task.id]);

            // 更新缓存
            this.cache.set(task.id, task);
            this.tasks.set(task.id, task);

            recoveredTasks.push(task);
          });
        })();
        
        console.log(`🛡️ Recovery Engine: Intercepted and recovered ${rows.length} orphaned tasks.`);
      }

      return { recovered: recoveredTasks.length, tasks: recoveredTasks };
    } catch (error: any) {
      console.error('❌ Failed to recover orphaned tasks:', error.message);
      return { recovered: 0, tasks: [] };
    }
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    if (this.db) {
      await this.db.disconnect();
      this.db = null;
    }
    this.initialized = false;
    this.cache.clear();
    console.log('✅ PersistentTaskManager closed');
  }
}

export default PersistentTaskManager;