/**
 * Metrics - Performance Metrics Collection
 */

class Metrics {
  constructor() {
    this.counters = new Map();
    this.timers = new Map();
  }

  increment(name, value = 1) {
    this.counters.set(name, (this.counters.get(name) || 0) + value);
  }

  recordTime(name, duration) {
    if (!this.timers.has(name)) {
      this.timers.set(name, []);
    }
    this.timers.get(name).push(duration);
  }

  getMetrics() {
    return {
      counters: Object.fromEntries(this.counters),
      timers: Object.fromEntries(this.timers)
    };
  }
}

module.exports = Metrics;
