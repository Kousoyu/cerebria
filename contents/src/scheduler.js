/**
 * IntelligentScheduler - Automated Task Scheduling
 * Supports: delay, interval, at timestamp, cancel
 */
const { setTimeout, setInterval, clearTimeout, clearInterval } = require('timers');
class IntelligentScheduler {
  constructor(options = {}) {
    this.options = options;
    this.tasks = new Map();
    this.isRunning = false;
    this.taskCounter = 0;
    this.eventHandlers = new Map();
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Scheduler started');
    this._emit('scheduler.started', { timestamp: new Date().toISOString() });
  }

  async stop() {
    if (!this.isRunning) return;
    for (const [id] of this.tasks.entries()) await this.cancelTask(id);
    this.isRunning = false;
    console.log('Scheduler stopped');
    this._emit('scheduler.stopped', { timestamp: new Date().toISOString() });
  }

  scheduleDelayed(fn, delay, meta) {
    this._ensureRunning();
    const id = 'scheduled_' + (++this.taskCounter);
    const timeout = setTimeout(async () => {
      try { const result = await fn(); this._emit('task.completed', { id, result }); }
      catch (err) { this._emit('task.failed', { id, error: err.message }); }
      finally { this.tasks.delete(id); }
    }, delay);
    this.tasks.set(id, { type: 'delayed', timeout, meta: meta || {}, fn });
    this._emit('task.scheduled', { id, type: 'delayed', delay, meta: meta || {} });
    return id;
  }

  scheduleInterval(fn, interval, options) {
    this._ensureRunning();
    const id = 'scheduled_' + (++this.taskCounter);
    let count = 0;
    const maxRuns = (options && options.maxRuns) || Infinity;
    const intervalObj = setInterval(async () => {
      count++;
      try { const result = await fn({ count, id }); this._emit('task.completed', { id, count, result }); }
      catch (err) { this._emit('task.failed', { id, count, error: err.message }); }
      if (count >= maxRuns) this.cancelTask(id);
    }, interval);
    this.tasks.set(id, { type: 'interval', interval: intervalObj, count, meta: (options && options.meta) || {}, fn });
    this._emit('task.scheduled', { id, type: 'interval', interval, meta: (options && options.meta) || {} });
    return id;
  }

  scheduleAt(fn, timestamp, meta) {
    const delay = new Date(timestamp).getTime() - Date.now();
    if (delay <= 0) return this.scheduleDelayed(fn, 0, meta);
    return this.scheduleDelayed(fn, delay, meta);
  }

  async cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    if (task.type === 'delayed') clearTimeout(task.timeout);
    else if (task.type === 'interval') clearInterval(task.interval);
    this.tasks.delete(taskId);
    this._emit('task.cancelled', { id: taskId });
    return true;
  }

  async cancelAllTasks() {
    for (const id of Array.from(this.tasks.keys())) await this.cancelTask(id);
  }

  listTasks() {
    return Array.from(this.tasks.entries()).map(([id, task]) => ({ id, type: task.type, meta: task.meta }));
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, []);
    this.eventHandlers.get(event).push(handler);
    return () => this.off(event, handler);
  }

  _emit(event, data) {
    (this.eventHandlers.get(event) || []).forEach(h => { try { h(data); } catch (_) {} });
  }

  _ensureRunning() {
    if (!this.isRunning) throw new Error('Scheduler is not running. Call scheduler.start() first.');
  }
}
module.exports = IntelligentScheduler;
