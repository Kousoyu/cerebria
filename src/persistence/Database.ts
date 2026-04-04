// @ts-nocheck
/**
 * CerebriaDatabase - SQLite Persistence Layer
 * Provides unified database access with migrations, transactions, and backup support
 */

import fs  from 'fs';
import path  from 'path';

let DatabaseDriver = null;
try {
  DatabaseDriver = require('better-sqlite3');
} catch (error) {
  console.warn('WARNING: better-sqlite3 not installed, using in-memory fallback mode');
}

class CerebriaDatabase {
  [key: string]: any;
  constructor(options) {
    options = options || {};
    this.options = {
      dataDir: options.dataDir || './data',
      memory: options.memory || false,
      readonly: options.readonly || false,
      verbose: options.verbose || false,
    };
    this.db = null;
    this.isConnected = false;
    this.migrationsApplied = false;
  }

  async connect() {
    if (this.isConnected) {
      return;
    }
    const dbPath = this.options.memory ? ':memory:' : path.join(this.options.dataDir, 'cerebria.db');
    if (!this.options.memory) {
      fs.mkdirSync(this.options.dataDir, { recursive: true });
    }
    try {
      if (DatabaseDriver) {
        this.db = new DatabaseDriver(dbPath, { readonly: this.options.readonly, verbose: this.options.verbose ? console.log : undefined });
        this.db.pragma('foreign_keys = ON');
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.isConnected = true;
        await this.applyMigrations();
        console.log(`Database connected: ${this.options.memory ? 'in-memory' : dbPath}`);
      } else {
        console.warn('WARNING: Database running in in-memory fallback mode');
        this.db = { inMemoryFallback: true };
        this.isConnected = true;
      }
    } catch (error) {
      console.error('Database connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.db && !this.db.inMemoryFallback) {
      this.db.close();
    }
    this.db = null;
    this.isConnected = false;
  }

  async applyMigrations() {
    if (this.migrationsApplied || this.db?.inMemoryFallback) {
      return;
    }
    try {
      this.db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
      const appliedVersions = new Set();
      try {
        this.db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().forEach((row) => appliedVersions.add(row.version)); 
      } catch (_) {}
      const migrations = this.getMigrations();
      for (const migration of migrations) {
        if (!appliedVersions.has(migration.version)) {
          console.log(`Applying migration: ${migration.name} (v${migration.version})`);
          this.db.transaction(() => {
            this.db.exec(migration.sql);
            this.db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
          })();
        }
      }
      this.migrationsApplied = true;
    } catch (error) {
      console.error('Migration failed:', error.message);
      throw error;
    }
  }

  getMigrations() {
    return [
      {
        version: 1, name: 'initial_schema', sql: `
          CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, priority TEXT DEFAULT 'medium', status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), completed_at TEXT, failed_at TEXT, error TEXT, dependencies TEXT DEFAULT '[]', tags TEXT DEFAULT '[]', metadata TEXT);
          CREATE TABLE IF NOT EXISTS policies (id TEXT PRIMARY KEY, name TEXT NOT NULL, version INTEGER DEFAULT 1, content TEXT NOT NULL, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), created_by TEXT);
          CREATE TABLE IF NOT EXISTS policy_changes (id TEXT PRIMARY KEY, policy_id TEXT NOT NULL, change_type TEXT NOT NULL, previous_content TEXT, new_content TEXT, reason TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now')), approved_at TEXT, approved_by TEXT, applied_at TEXT, FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE);
          CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT DEFAULT (datetime('now')), level TEXT NOT NULL, message TEXT NOT NULL, component TEXT, data TEXT);
          CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT DEFAULT 'full', status TEXT DEFAULT 'pending', size_bytes INTEGER, checksum_sha256 TEXT, created_at TEXT DEFAULT (datetime('now')), completed_at TEXT, file_path TEXT, metadata TEXT);
          CREATE TABLE IF NOT EXISTS backup_items (id INTEGER PRIMARY KEY AUTOINCREMENT, backup_id TEXT NOT NULL, item_type TEXT NOT NULL, item_id TEXT NOT NULL, item_snapshot TEXT, FOREIGN KEY (backup_id) REFERENCES backups(id) ON DELETE CASCADE);
          CREATE TABLE IF NOT EXISTS system_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')), description TEXT);
          CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
          CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
          CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);
          CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
          CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
          CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
        `,
      },
      {
        version: 2, name: 'performance_indexes', sql: `
          CREATE INDEX IF NOT EXISTS idx_tasks_updated ON tasks(updated_at);
          CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed_at);
          ANALYZE;
        `,
      },
    ];
  }

  query(sql, params) {
    if (this.db?.inMemoryFallback) {
      return [];
    } try {
      const stmt = this.db.prepare(sql); return (params && params.length) ? stmt.all(...params) : stmt.all(); 
    } catch (e) {
      throw e; 
    } 
  }
  run(sql, params) {
    if (this.db?.inMemoryFallback) {
      return { lastInsertRowid: 0, changes: 0 };
    } try {
      const stmt = this.db.prepare(sql); return (params && params.length) ? stmt.run(...params) : stmt.run(); 
    } catch (e) {
      throw e; 
    } 
  }
  get(sql, params) {
    if (this.db?.inMemoryFallback) {
      return null;
    } try {
      const stmt = this.db.prepare(sql); return (params && params.length) ? stmt.get(...params) : stmt.get(); 
    } catch (e) {
      throw e; 
    } 
  }
  transaction(callback) {
    if (this.db?.inMemoryFallback) {
      return () => callback();
    } return this.db.transaction(callback); 
  }

  async backup(backupPath) {
    if (this.db?.inMemoryFallback) {
      return null;
    }
    const backupDb = new DatabaseDriver(backupPath);
    this.db.backup(backupDb);
    backupDb.close();
    return { path: backupPath, size: fs.statSync(backupPath).size, timestamp: new Date().toISOString() };
  }

  getStats() {
    if (this.db?.inMemoryFallback) {
      return { tables: 0, size: 0, inMemory: true };
    }
    try {
      const tables = this.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      const size = this.get('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()');
      return { tables: tables.length, size: size?.size || 0, inMemory: this.options.memory, path: path.join(this.options.dataDir, 'cerebria.db') };
    } catch (e) {
      return { tables: 0, size: 0, error: e.message }; 
    }
  }

  checkIntegrity() {
    if (this.db?.inMemoryFallback) {
      return { ok: true };
    }
    try {
      const r = this.query('PRAGMA integrity_check'); return { ok: r[0]?.integrity_check === 'ok', timestamp: new Date().toISOString() }; 
    } catch (e) {
      return { ok: false, error: e.message }; 
    }
  }
}

export default CerebriaDatabase;
