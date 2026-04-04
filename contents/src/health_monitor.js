/**
 * HealthMonitor - System Health Monitoring
 * Provides real system metrics and health reporting
 */
const os = require('os');
class HealthMonitor {
  constructor(options = {}) {
    this.options = options;
    this.startTime = Date.now();
    this.checkInterval = options.healthCheckInterval || 30000;
    this._taskManager = null;
    this._logManager = null;
    this._memoryManager = null;
  }

  setComponents(components) {
    this._taskManager = components.taskManager;
    this._logManager = components.logManager;
    this._memoryManager = components.memoryManager;
  }

  async updateMetrics() {
    const memUsage = process.memoryUsage();
    const systemMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = systemMem - freeMem;
    let taskStats = { total: 0, active: 0, completed: 0, failed: 0 };
    let logStats = { total: 0 };
    try { if (this._taskManager && this._taskManager.getStats) taskStats = await this._taskManager.getStats(); } catch (_) {}
    try { if (this._logManager && this._logManager.getStats) logStats = await this._logManager.getStats(); } catch (_) {}
    return {
      memory: { heapUsed: memUsage.heapUsed, heapTotal: memUsage.heapTotal, rss: memUsage.rss, systemTotal: systemMem, systemFree: freeMem, systemUsed: usedMem, heapUsedPercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100), systemUsedPercent: Math.round((usedMem / systemMem) * 100) },
      tasks: taskStats, logs: logStats,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  async generateReport() {
    const m = await this.updateMetrics();
    const heapPercent = m.memory.heapUsedPercent;
    const systemPercent = m.memory.systemUsedPercent;
    const errorLogs = m.logs.byLevel ? (m.logs.byLevel.ERROR || 0) + (m.logs.byLevel.FATAL || 0) : 0;
    let status = 'healthy';
    if (heapPercent > 90 || systemPercent > 90) status = 'unhealthy';
    else if (heapPercent > 75 || systemPercent > 75 || errorLogs > 10) status = 'degraded';
    const recommendations = [];
    if (heapPercent > 75) recommendations.push({ action: 'cleanup_logs', reason: 'Heap usage is ' + heapPercent + '%', priority: heapPercent > 90 ? 'high' : 'medium' });
    if (errorLogs > 5) recommendations.push({ action: 'investigate_errors', reason: errorLogs + ' error logs detected', priority: 'medium' });
    return { status, version: '1.2.0', uptime: m.uptime, components: { tasks: Object.assign({ status: 'ok' }, m.tasks), logs: Object.assign({ status: 'ok' }, m.logs), memory: Object.assign({ status: heapPercent < 90 ? 'ok' : 'critical' }, m.memory) }, recommendations, timestamp: m.timestamp };
  }

  async checkHealth() {
    const memUsage = process.memoryUsage();
    const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    return { status: heapPercent < 90 ? 'ok' : 'degraded', memory: { heapUsedPercent: Math.round(heapPercent), rss: memUsage.rss }, timestamp: new Date().toISOString() };
  }
}
module.exports = HealthMonitor;
