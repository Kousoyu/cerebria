/**
 * LogManager - Intelligent Multi-Level Logging System
 */

class LogManager {
  constructor(options = {}) {
    this.dataDir = options.dataDir || './data';
    this.logs = [];
    this.level = options.level || 'INFO';
  }

  async writeLog(level, message, data = {}) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    });
    console.log(`[${level}] ${message}`);
  }

  async queryLogs(options = {}) {
    return this.logs.filter(log => 
      log.level === (options.level || log.level)
    );
  }

  async cleanup() {
    this.logs = [];
  }
}

module.exports = LogManager;
