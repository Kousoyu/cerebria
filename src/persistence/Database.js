/**
 * Database - SQLite持久化层
 * 提供统一的数据库访问接口，支持事务、迁移和备份
 */

const fs = require('fs');
const path = require('path');

// 延迟加载better-sqlite3，避免硬依赖
let Database = null;
try {
  // eslint-disable-next-line global-require
  Database = require('better-sqlite3');
} catch (error) {
  // 如果未安装better-sqlite3，使用虚拟实现
  console.warn('better-sqlite3 not installed, using in-memory fallback');
}

class CogniDatabase {
  constructor(options = {}) {
    this.options = {
      dataDir: options.dataDir || './data',
      memory: options.memory || false,
      readonly: options.readonly || false,
      verbose: options.verbose || false,
      ...options
    };

    this.db = null;
    this.isConnected = false;
    this.migrationsApplied = false;
  }

  /**
   * 连接数据库
   */
  async connect() {
    if (this.isConnected) {
      return;
    }

    const dbPath = this.options.memory
      ? ':memory:'
      : path.join(this.options.dataDir, 'cogni-core.db');

    // 确保数据目录存在
    if (!this.options.memory) {
      fs.mkdirSync(this.options.dataDir, { recursive: true });
    }

    try {
      if (Database) {
        this.db = new Database(dbPath, {
          readonly: this.options.readonly,
          verbose: this.options.verbose ? console.log : undefined
        });

        // 启用外键和WAL模式
        this.db.pragma('foreign_keys = ON');
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');

        this.isConnected = true;

        // 应用schema迁移
        await this.applyMigrations();

        console.log(`✅ Database connected: ${this.options.memory ? 'in-memory' : dbPath}`);
      } else {
        console.warn('⚠️  Database running in fallback mode (no better-sqlite3)');
        this.db = { inMemoryFallback: true };
        this.isConnected = true;
      }
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect() {
    if (this.db && !this.db.inMemoryFallback) {
      this.db.close();
    }
    this.db = null;
    this.isConnected = false;
  }

  /**
   * 应用数据库迁移
   */
  async applyMigrations() {
    if (this.migrationsApplied || this.db?.inMemoryFallback) {
      return;
    }

    try {
      // 创建迁移记录表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 获取已应用的迁移版本
      const appliedVersions = new Set();
      try {
        const rows = this.db.prepare('SELECT version FROM schema_migrations ORDER BY version').all();
        rows.forEach((row) => appliedVersions.add(row.version));
      } catch (e) {
        // 表可能不存在，继续执行
      }

      // 按顺序应用迁移
      const migrations = this.getMigrations();
      for (const migration of migrations) {
        if (!appliedVersions.has(migration.version)) {
          console.log(`🔄 Applying migration: ${migration.name} (v${migration.version})`);

          // 在事务中执行迁移
          const transaction = this.db.transaction(() => {
            this.db.exec(migration.sql);
            this.db.prepare(
              'INSERT INTO schema_migrations (version, name) VALUES (?, ?)'
            ).run(migration.version, migration.name);
          });

          transaction();
          console.log(`✅ Migration applied: ${migration.name}`);
        }
      }

      this.migrationsApplied = true;
      console.log('✅ All migrations applied');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  /**
   * 获取迁移定义
   */
  getMigrations() {
    return [
      {
        version: 1,
        name: 'initial_schema',
        sql: `
          -- 任务管理
          CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
            status TEXT CHECK(status IN ('active', 'completed', 'failed', 'cancelled')) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            metadata TEXT,
            CHECK (created_at <= updated_at),
            CHECK (completed_at IS NULL OR completed_at >= created_at)
          );

          -- 策略管理
          CREATE TABLE IF NOT EXISTS policies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            content TEXT NOT NULL,
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
            previous_content TEXT,
            new_content TEXT,
            reason TEXT,
            status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'applied')) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            approved_at TIMESTAMP,
            approved_by TEXT,
            applied_at TIMESTAMP,
            FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
          );

          -- 日志系统
          CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            level TEXT CHECK(level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')) NOT NULL,
            message TEXT NOT NULL,
            component TEXT,
            operation TEXT,
            data TEXT,
            trace_id TEXT
          );

          -- 备份管理
          CREATE TABLE IF NOT EXISTS backups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT CHECK(type IN ('full', 'incremental', 'differential')) DEFAULT 'full',
            status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
            size_bytes INTEGER,
            checksum_sha256 TEXT,
            checksum_algorithm TEXT DEFAULT 'SHA256',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            file_path TEXT,
            metadata TEXT
          );

          -- 备份包含的项目
          CREATE TABLE IF NOT EXISTS backup_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            backup_id TEXT NOT NULL,
            item_type TEXT NOT NULL,
            item_id TEXT NOT NULL,
            item_snapshot TEXT,
            FOREIGN KEY (backup_id) REFERENCES backups(id) ON DELETE CASCADE
          );

          -- 系统状态
          CREATE TABLE IF NOT EXISTS system_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            description TEXT
          );

          -- 创建索引
          CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
          CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
          CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);
          CREATE INDEX IF NOT EXISTS idx_policies_active ON policies(is_active);
          CREATE INDEX IF NOT EXISTS idx_policies_updated ON policies(updated_at);
          CREATE INDEX IF NOT EXISTS idx_policy_changes_status ON policy_changes(status);
          CREATE INDEX IF NOT EXISTS idx_policy_changes_policy ON policy_changes(policy_id);
          CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
          CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
          CREATE INDEX IF NOT EXISTS idx_logs_component ON logs(component);
          CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
        `
      },
      {
        version: 2,
        name: 'performance_optimizations',
        sql: `
          -- 性能优化索引
          CREATE INDEX IF NOT EXISTS idx_tasks_updated ON tasks(updated_at);
          CREATE INDEX IF NOT EXISTS idx_policy_changes_created ON policy_changes(created_at);
          CREATE INDEX IF NOT EXISTS idx_backups_created ON backups(created_at);
          CREATE INDEX IF NOT EXISTS idx_logs_operation ON logs(operation);
          
          -- 添加更多约束
          ALTER TABLE backups ADD COLUMN IF NOT EXISTS parent_backup_id TEXT REFERENCES backups(id);
          
          -- 更新统计信息
          ANALYZE;
        `
      }
    ];
  }

  /**
   * 执行查询（返回结果）
   */
  query(sql, params = []) {
    if (this.db?.inMemoryFallback) {
      return [];
    }

    try {
      const stmt = this.db.prepare(sql);
      return params.length > 0 ? stmt.all(...params) : stmt.all();
    } catch (error) {
      console.error('Query error:', error.message, { sql, params });
      throw error;
    }
  }

  /**
   * 执行更新（返回最后ID）
   */
  run(sql, params = []) {
    if (this.db?.inMemoryFallback) {
      return { lastInsertRowid: 0, changes: 0 };
    }

    try {
      const stmt = this.db.prepare(sql);
      const result = params.length > 0 ? stmt.run(...params) : stmt.run();
      return result;
    } catch (error) {
      console.error('Run error:', error.message, { sql, params });
      throw error;
    }
  }

  /**
   * 获取单行结果
   */
  get(sql, params = []) {
    if (this.db?.inMemoryFallback) {
      return null;
    }

    try {
      const stmt = this.db.prepare(sql);
      return params.length > 0 ? stmt.get(...params) : stmt.get();
    } catch (error) {
      console.error('Get error:', error.message, { sql, params });
      throw error;
    }
  }

  /**
   * 在事务中执行操作
   */
  transaction(callback) {
    if (this.db?.inMemoryFallback) {
      return callback();
    }

    try {
      const tx = this.db.transaction(callback);
      return tx();
    } catch (error) {
      console.error('Transaction error:', error.message);
      throw error;
    }
  }

  /**
   * 备份数据库
   */
  async backup(backupPath) {
    if (this.db?.inMemoryFallback) {
      console.warn('⚠️  Cannot backup in-memory database');
      return null;
    }

    try {
      const backupDb = new Database(backupPath);
      this.db.backup(backupDb);
      backupDb.close();

      // 计算校验和
      const checksum = await this.calculateChecksum(backupPath);

      return {
        path: backupPath,
        size: fs.statSync(backupPath).size,
        checksum,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Backup error:', error.message);
      throw error;
    }
  }

  /**
   * 计算文件SHA256校验和
   */
  async calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * 获取数据库统计信息
   */
  getStats() {
    if (this.db?.inMemoryFallback) {
      return { tables: 0, size: 0, inMemory: true };
    }

    try {
      const tables = this.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);

      const size = this.get('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()');

      return {
        tables: tables.length,
        size: size?.size || 0,
        inMemory: this.options.memory,
        path: this.options.memory ? ':memory:' : path.join(this.options.dataDir, 'cogni-core.db')
      };
    } catch (error) {
      console.error('Stats error:', error.message);
      return { tables: 0, size: 0, error: error.message };
    }
  }

  /**
   * 检查数据库完整性
   */
  checkIntegrity() {
    if (this.db?.inMemoryFallback) {
      return { ok: true, errors: [] };
    }

    try {
      const integrity = this.query('PRAGMA integrity_check');
      const foreignKey = this.query('PRAGMA foreign_key_check');

      return {
        ok: integrity[0]?.integrity_check === 'ok',
        integrityCheck: integrity,
        foreignKeyErrors: foreignKey,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Integrity check error:', error.message);
      return { ok: false, error: error.message };
    }
  }

  /**
   * 清理旧数据
   */
  async cleanupOldData(options = {}) {
    if (this.db?.inMemoryFallback) {
      return { cleaned: 0 };
    }

    const defaults = {
      keepLogsDays: 30,
      keepBackups: 10,
      vacuum: true
    };

    const config = { ...defaults, ...options };
    let cleaned = 0;

    try {
      // 清理旧日志
      if (config.keepLogsDays > 0) {
        const result = this.run(`
          DELETE FROM logs 
          WHERE timestamp < datetime('now', ?)
        `, [`-${config.keepLogsDays} days`]);
        cleaned += result.changes;
      }

      // 清理旧备份（保留最新的N个）
      if (config.keepBackups > 0) {
        const oldBackups = this.query(`
          SELECT id FROM backups 
          WHERE status = 'completed'
          ORDER BY created_at DESC
          LIMIT -1 OFFSET ?
        `, [config.keepBackups]);

        if (oldBackups.length > 0) {
          const placeholders = oldBackups.map(() => '?').join(',');
          const result = this.run(`
            DELETE FROM backups 
            WHERE id IN (${placeholders})
          `, oldBackups.map((b) => b.id));
          cleaned += result.changes;
        }
      }

      // 执行VACUUM（如果需要）
      if (config.vacuum) {
        this.run('VACUUM');
      }

      return { cleaned };
    } catch (error) {
      console.error('Cleanup error:', error.message);
      throw error;
    }
  }
}

module.exports = CogniDatabase;