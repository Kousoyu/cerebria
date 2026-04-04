/**
 * PersistentPolicyManager - SQLite-backed Policy Management
 * Extends policy management with persistent storage
 */

const CerebriaDatabase = require('./Database');

class PersistentPolicyManager {
  constructor(options) {
    this.dbOptions = { dataDir: (options && options.dataDir) || './data', memory: (options && options.memory) || false };
    this.db = null;
    this.policies = new Map();
    this.usePersistence = (options && options.persistent) !== false;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized || !this.usePersistence) return;
    try {
      this.db = new CerebriaDatabase(this.dbOptions);
      await this.db.connect();
      await this.loadPolicies();
      this.initialized = true;
      console.log('PersistentPolicyManager initialized');
    } catch (error) {
      console.warn('Failed to initialize persistent policy storage:', error.message);
      this.usePersistence = false;
      this.initialized = true;
    }
  }

  async loadPolicies() {
    if (!this.db) return;
    try {
      const rows = this.db.query('SELECT * FROM policies WHERE is_active = 1');
      this.policies.clear();
      rows.forEach(row => {
        this.policies.set(row.id, { id: row.id, name: row.name, version: row.version, content: row.content, isActive: row.is_active === 1, createdAt: row.created_at, updatedAt: row.updated_at });
      });
    } catch (error) {
      console.error('Failed to load policies:', error.message);
    }
  }

  async getPolicy(id) { return this.policies.get(id) || null; }
  async getAllPolicies() { return Array.from(this.policies.values()); }

  async createPolicy(policy) {
    const id = 'policy_' + Date.now();
    const p = { id, name: (policy && policy.name) || 'Unnamed Policy', version: 1, content: JSON.stringify((policy && policy.content) || {}), isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.policies.set(id, p);
    if (this.db && this.usePersistence) { try { this.db.run('INSERT INTO policies (id, name, version, content, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [p.id, p.name, p.version, p.content, 1, p.createdAt, p.updatedAt]); } catch (_) {} }
    return p;
  }

  async updatePolicy(id, updates) {
    const p = this.policies.get(id);
    if (!p) return null;
    if (updates && updates.name) p.name = updates.name;
    if (updates && updates.content) p.content = JSON.stringify(updates.content);
    p.version++;
    p.updatedAt = new Date().toISOString();
    if (this.db) { try { this.db.run('UPDATE policies SET name=?, content=?, version=?, updated_at=? WHERE id=?', [p.name, p.content, p.version, p.updatedAt, id]); } catch (_) {} }
    return p;
  }

  async deletePolicy(id) {
    this.policies.delete(id);
    if (this.db) { try { this.db.run('UPDATE policies SET is_active=0 WHERE id=?', [id]); } catch (_) {} }
    return true;
  }

  async close() { if (this.db) { await this.db.disconnect(); this.db = null; } this.initialized = false; }
}

module.exports = PersistentPolicyManager;
