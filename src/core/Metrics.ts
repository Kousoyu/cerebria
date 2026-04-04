/**
 * Metrics - Performance Metrics Collection
 */

class Metrics {
  [key: string]: any;
  constructor() {
    this.counters = new Map();
    this.timers = new Map();
  }

  increment(name: string, value: number = 1) {
    this.counters.set(name, (this.counters.get(name) || 0) + value);
  }

  recordTime(name: string, duration: number) {
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

export default Metrics;
