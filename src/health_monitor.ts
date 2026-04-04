/**
 * HealthMonitor - System Health Monitoring
 */

import os from 'os';

class HealthMonitor {
  private dataDir: string;
  public metrics: any;
  private readonly CAUTION_MEMORY_THRESHOLD = 80;

  constructor(options: any = {}) {
    this.dataDir = options.dataDir || './data';
    this.metrics = {
      memory: 0,
      cpu: 0,
      tasks: 0,
      uptime: 0
    };
  }

  async updateMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;
    
    // CPU load average over 1 minute (divided by core count for normalized percentage)
    const cpus = os.cpus().length;
    const loadAvg = os.loadavg()[0];
    const cpuPercent = (loadAvg / cpus) * 100;

    this.metrics.memory = Math.floor(usedMemPercent);
    this.metrics.cpu = Math.floor(Math.min(cpuPercent, 100)); // Cap at 100%
    this.metrics.uptime = process.uptime();
  }

  async generateReport() {
    await this.updateMetrics();
    return {
      healthy: this.metrics.memory < this.CAUTION_MEMORY_THRESHOLD,
      metrics: this.metrics,
      timestamp: new Date().toISOString()
    };
  }
}

export default HealthMonitor;
