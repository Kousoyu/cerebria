// @ts-nocheck
/**
 * PersistentBackupManager - SQLite-backed Backup Management
 * Extends in-memory BackupManager with persistent backup registry
 */

import BackupManager  from '../backup_manager';
import CerebriaDatabase  from './Database';
import fs  from 'fs';
import path  from 'path';

class PersistentBackupManager extends BackupManager {
  [key: string]: any;
  constructor(options) {
    super(options);
    this.dbOptions = { dataDir: (options && options.dataDir) || './data', memory: (options && options.memory) || false };
    this.db = null;
    this.usePersistence = (options && options.persistent) !== false;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized || !this.usePersistence) {
      return;
    }
    try {
      this.db = new CerebriaDatabase(this.dbOptions);
      await this.db.connect();
      await this.loadBackups();
      this.initialized = true;
      console.log('PersistentBackupManager initialized');
    } catch (error) {
      console.warn('Failed to initialize persistent backup storage, falling back to memory:', error.message);
      this.usePersistence = false;
      this.initialized = true;
    }
  }

  async loadBackups() {
    if (!this.db) {
      return;
    }
    try {
      const rows = this.db.query('SELECT * FROM backups ORDER BY created_at DESC');
      this.backups.clear();
      this.backupCounter = 0;
      rows.forEach((row) => {
        if (row.id) {
          const numPart = row.id.split('_').pop();
          const num = parseInt(numPart) || 0;
          if (num > this.backupCounter) {
            this.backupCounter = num;
          }
          this.backups.set(row.id, { id: row.id, name: row.name, type: row.type, status: row.status, timestamp: row.created_at, size: row.size_bytes || 0, checksum: row.checksum_sha256, path: row.file_path, metadata: row.metadata ? JSON.parse(row.metadata) : {} });
        }
      });
    } catch (error) {
      console.error('Failed to load backups:', error.message);
    }
  }

  async createBackup(options) {
    const backup = await super.createBackup(options);
    if (this.usePersistence && this.db) {
      try {
        this.db.run('INSERT INTO backups (id, name, type, status, size_bytes, checksum_sha256, file_path, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [backup.id, backup.name, backup.type, backup.status, backup.size || 0, backup.checksum, backup.path, JSON.stringify(backup.metadata || {}), backup.timestamp]); 
      } catch (e) {
        console.error('Failed to persist backup record:', e.message); 
      } 
    }
    return backup;
  }

  async deleteBackup(backupId) {
    const result = await super.deleteBackup(backupId);
    if (result && this.db) {
      try {
        this.db.run('DELETE FROM backups WHERE id = ?', [backupId]); 
      } catch (_) {} 
    }
    return result;
  }

  async close() {
    if (this.db) {
      await this.db.disconnect(); this.db = null; 
    } this.initialized = false; 
  }
}

export default PersistentBackupManager;
