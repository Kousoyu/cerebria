/**
 * PersistentLogManager - 持久化日志管理
 * 继承自LogManager，提供SQLite持久化支持
 */

const LogManager = require('../log_manager');
const CogniDatabase = require('./Database');

class PersistentLogManager extends LogManager {
  constructor(options = {}) {
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
      this.db = new CogniDatabase(this.dbOptions);
      await this.db.connect();
      this.initialized = true;

      // 从数据库加载现有日志到缓存
      await this.loadLogsIntoCache();

      console.log('✅ PersistentLogManager initialized with database storage');
    } catch (error) {
      console.warn('⚠️  Failed to initialize persistent storage, falling back to memory:', error.message);
      this.usePersistentStorage = false;
      this.initialized = true;
    }
  }

  /**
   * 从数据库加载日志到内存缓存
   */
  async loadLogsIntoCache() {
    if (!this.usePersistentStorage) {
      return;
    }

    try {
      await this.ensureInitialized();
      
      const logs = await this.db.getAll('logs');
      this.logs = logs.map(log => ({
        ...log,
        data: log.data ? JSON.parse(log.data) : {}
      }));
      
      // 构建缓存索引
      this.logs.forEach(log => {
        this.cache.set(log.id, log);
      });
      
      console.log(`✅ Loaded ${this.logs.length} logs from database into cache`);
    } catch (error) {
      console.warn('⚠️  Failed to load logs from database:', error.message);
      this.logs = [];
    }
  }

  /**
   * 确保数据库已初始化
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * 写入日志（持久化到数据库）
   */
  async writeLog(level, message, data = {}) {
    // 调用父类方法写入内存
    await super.writeLog(level, message, data);

    // 如果启用了持久化存储，保存到数据库
    if (this.usePersistentStorage) {
      try {
        await this.ensureInitialized();
        
        const logEntry = {
          timestamp: new Date().toISOString(),
          level,
          message,
          data: JSON.stringify(data),
          created_at: Date.now()
        };

        const id = await this.db.insert('logs', logEntry);
        
        // 更新缓存
        const fullLog = { id, ...logEntry, data };
        this.cache.set(id, fullLog);
        
        console.log(`✅ Log ${id} persisted to database`);
      } catch (error) {
        console.warn('⚠️  Failed to persist log to database:', error.message);
      }
    }
  }

  /**
   * 查询日志（支持数据库查询）
   */
  async queryLogs(options = {}) {
    // 如果禁用持久化或查询简单，使用内存查询
    if (!this.usePersistentStorage || (!options.startTime && !options.endTime && !options.limit)) {
      return super.queryLogs(options);
    }

    try {
      await this.ensureInitialized();

      let query = 'SELECT * FROM logs WHERE 1=1';
      const params = [];

      if (options.level) {
        query += ' AND level = ?';
        params.push(options.level);
      }

      if (options.startTime) {
        query += ' AND timestamp >= ?';
        params.push(options.startTime);
      }

      if (options.endTime) {
        query += ' AND timestamp <= ?';
        params.push(options.endTime);
      }

      if (options.messageContains) {
        query += ' AND message LIKE ?';
        params.push(`%${options.messageContains}%`);
      }

      query += ' ORDER BY timestamp DESC';

      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }

      const logs = await this.db.query(query, params);
      
      return logs.map(log => ({
        ...log,
        data: log.data ? JSON.parse(log.data) : {}
      }));
    } catch (error) {
      console.warn('⚠️  Failed to query logs from database:', error.message);
      return super.queryLogs(options);
    }
  }

  /**
   * 清理日志（同时清理数据库）
   */
  async cleanup(options = {}) {
    const { olderThan, keepLast } = options;

    // 调用父类清理内存日志
    super.cleanup();

    if (this.usePersistentStorage) {
      try {
        await this.ensureInitialized();

        let query = 'DELETE FROM logs';
        const params = [];

        if (olderThan) {
          query += ' WHERE timestamp < ?';
          params.push(new Date(Date.now() - olderThan).toISOString());
        } else if (keepLast) {
          // 保留最新的 keepLast 条记录
          const total = await this.db.count('logs');
          if (total > keepLast) {
            const logsToDelete = await this.db.query(
              'SELECT id FROM logs ORDER BY timestamp ASC LIMIT ?',
              [total - keepLast]
            );
            const ids = logsToDelete.map(log => log.id);
            if (ids.length > 0) {
              query = 'DELETE FROM logs WHERE id IN (' + ids.map(() => '?').join(',') + ')';
              params.push(...ids);
            }
          } else {
            return 0; // 无需删除
          }
        }

        const result = await this.db.run(query, params);
        console.log(`✅ Cleaned up ${result.changes} logs from database`);
        
        // 重新加载缓存
        await this.loadLogsIntoCache();
        
        return result.changes;
      } catch (error) {
        console.warn('⚠️  Failed to cleanup logs from database:', error.message);
        return 0;
      }
    }

    return 0;
  }

  /**
   * 获取日志统计信息
   */
  async getStats() {
    if (!this.usePersistentStorage) {
      return {
        total: this.logs.length,
        byLevel: this.logs.reduce((acc, log) => {
          acc[log.level] = (acc[log.level] || 0) + 1;
          return acc;
        }, {})
      };
    }

    try {
      await this.ensureInitialized();

      const total = await this.db.count('logs');
      
      const levelStats = await this.db.query(
        'SELECT level, COUNT(*) as count FROM logs GROUP BY level'
      );

      const stats = {
        total,
        byLevel: {}
      };

      levelStats.forEach(stat => {
        stats.byLevel[stat.level] = stat.count;
      });

      return stats;
    } catch (error) {
      console.warn('⚠️  Failed to get log stats:', error.message);
      return {
        total: this.logs.length,
        byLevel: {}
      };
    }
  }

  /**
   * 导出日志到文件
   */
  async exportLogs(options = {}) {
    const { format = 'json', filePath } = options;
    
    try {
      await this.ensureInitialized();
      
      const logs = await this.queryLogs(options);
      
      let content;
      if (format === 'json') {
        content = JSON.stringify(logs, null, 2);
      } else if (format === 'csv') {
        // 简单CSV转换
        const headers = ['timestamp', 'level', 'message', 'data'];
        const rows = logs.map(log => [
          log.timestamp,
          log.level,
          `"${log.message.replace(/"/g, '""')}"`,
          JSON.stringify(log.data)
        ]);
        content = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      if (filePath) {
        const fs = require('fs');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Logs exported to ${filePath} (${logs.length} entries)`);
        return filePath;
      }

      return content;
    } catch (error) {
      console.warn('⚠️  Failed to export logs:', error.message);
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.initialized = false;
      console.log('✅ PersistentLogManager closed');
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      await this.ensureInitialized();
      
      if (this.usePersistentStorage) {
        const count = await this.db.count('logs');
        return {
          healthy: true,
          storage: 'database',
          logCount: count,
          cacheSize: this.cache.size
        };
      } else {
        return {
          healthy: true,
          storage: 'memory',
          logCount: this.logs.length,
          cacheSize: this.cache.size
        };
      }
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        storage: this.usePersistentStorage ? 'database (error)' : 'memory'
      };
    }
  }
}

module.exports = PersistentLogManager;