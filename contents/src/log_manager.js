/**
 * LogManager - Intelligent Multi-Level Logging System
 * Supports: multi-level logging, querying, filtering, export, cleanup, stats
 */
class LogManager {
  constructor(options) {
    this.options = options || {};
    this.logs = [];
    this.logIdCounter = 0;
    this.minLevel = this._parseLevel((options && options.level) || 'INFO');
  }

  _parseLevel(level) { return { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, FATAL: 4 }[String(level).toUpperCase()] || 1; }
  _shouldLog(level) { return this._parseLevel(level) >= this.minLevel; }

  async writeLog(level, message, data) {
    if (!this._shouldLog(level)) return;
    const entry = { id: ++this.logIdCounter, timestamp: new Date().toISOString(), level: String(level).toUpperCase(), message: String(message), data: data || {} };
    this.logs.push(entry);
    console.log('[' + entry.level + '] ' + message);
  }

  async queryLogs(options) {
    options = options || {};
    let results = [].concat(this.logs);
    if (options.level) results = results.filter(l => l.level === options.level.toUpperCase());
    if (options.levels && options.levels.length) {
      const upper = options.levels.map(l => l.toUpperCase());
      results = results.filter(l => upper.includes(l.level));
    }
    if (options.startTime) results = results.filter(l => l.timestamp >= options.startTime);
    if (options.endTime) results = results.filter(l => l.timestamp <= options.endTime);
    if (options.messageContains) {
      const q = options.messageContains.toLowerCase();
      results = results.filter(l => l.message.toLowerCase().includes(q));
    }
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const total = results.length;
    if (options.limit) results = results.slice(options.offset || 0, (options.offset || 0) + options.limit);
    return { logs: results, total, hasMore: options.limit ? total > (options.offset || 0) + results.length : false };
  }

  async getStats() {
    const byLevel = {};
    for (const log of this.logs) byLevel[log.level] = (byLevel[log.level] || 0) + 1;
    return { total: this.logs.length, byLevel };
  }

  async exportLogs(options) {
    options = options || {};
    const format = options.format || 'json';
    const logs = await this.queryLogs(Object.assign({}, options, { limit: undefined }));
    if (format === 'csv') {
      const rows = logs.logs.map(l => [l.id, l.timestamp, l.level, '"' + l.message.replace(/"/g, '""') + '"'].join(','));
      return ['id,timestamp,level,message', ...rows].join('\n');
    }
    return JSON.stringify(logs.logs, null, 2);
  }

  async cleanup(options) {
    options = options || {};
    const { olderThan, keepLast, levels } = options;
    let before = this.logs.length;
    if (olderThan) {
      const cutoff = Date.now() - olderThan;
      this.logs = this.logs.filter(l => new Date(l.timestamp).getTime() >= cutoff);
    } else if (typeof keepLast === 'number') {
      this.logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      this.logs = this.logs.slice(0, keepLast);
    } else if (Array.isArray(levels) && levels.length) {
      const upper = levels.map(l => l.toUpperCase());
      this.logs = this.logs.filter(l => !upper.includes(l.level));
    }
    return before - this.logs.length;
  }
}
module.exports = LogManager;
