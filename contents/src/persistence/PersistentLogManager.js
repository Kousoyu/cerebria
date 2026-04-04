/**
 * PersistentLogManager - SQLite-backed Log Management
 * Extends in-memory LogManager with SQLite persistence
 */

const LogManager = require('../log_manager');
const CerebriaDatabase = require('./Database');

class PersistentLogManager extends LogManager {
  constructor(options) {
    super(options);
    this.dbOptions = {
      dataDir: options && options.dataDir || './data',
      memory: options && options.memory || false,
    };
    this.db = null;
    this.usePersistence = (options && options.persistent) !== false;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized || !this.usePersistence) return;
    try {
      this.db = new CerebriaDatabase(this.dbOptions);
      await this.db.connect();
      await this.loadLogsIntoMemory();
      this.initialized = true;
      console.log('PersistentLogManager initialized with database storage');
    } catch (error) {
      console.warn('Failed to initialize persistent log storage, falling back to memory:', error.message);
      this.usePersistence = false;
      this.initialized = true;
    }
  }

  async loadLogsIntoMemory() {
    if (!this.initialized || !this.db) return;
    try {
      const rows = this.db.query('SELECT * FROM logs ORDER BY timestamp DESC');
      this.logIdCounter = 0;
      this.logs = rows.map(row => {
        if (row.id > this.logIdCounter) this.logIdCounter = row.id;
        return {
          id: row.id, timestamp: row.timestamp, level: row.level,
          message: row.message, data: row.data ? JSON.parse(row.data) : {},
        };
      });
      console.log('Loaded ' + this.logs.length + ' logs from database into memory');
    } catch (error) {
      console.error('Failed to load logs from database:', error.message);
    }
  }

  async writeLog(level, message, data) {
    await super.writeLog(level, message, data);
    if (this.usePersistence && this.db) {
      try {
        const entry = this.logs[this.logs.length - 1];
        if (entry) {
          this.db.run(
            'INSERT INTO logs (timestamp, level, message, data) VALUES (?, ?, ?, ?)',
            [entry.timestamp, entry.level, entry.message, JSON.stringify(entry.data)]
          );
        }
      } catch (error) {
        console.error('Failed to persist log:', error.message);
      }
    }
  }

  async close() {
    if (this.db) { await this.db.disconnect(); this.db = null; }
    this.initialized = false;
  }
}

module.exports = PersistentLogManager;
