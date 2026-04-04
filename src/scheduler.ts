/**
 * IntelligentScheduler - Automated Task Executing & Dispatching Engine
 */

import EventBus from './core/EventBus';
import { WorkerPool } from './core/WorkerPool';

class IntelligentScheduler {
  [key: string]: any;
  private workerPool: WorkerPool;

  constructor(options: any = {}) {
    this.dataDir = options.dataDir || './data';
    this.tasks = [];
    this.recoveringTasks = [];
    this.executionQueue = []; // Used for testing & polling mechanism
    this.isRunning = false;
    
    // Wire up the new Event-driven Concurrent Worker Pool
    this.workerPool = new WorkerPool(options.concurrency || 2);
    
    // Bind the worker queue to the scheduler's internal execution queue
    this.workerPool.bindQueuePop(async () => {
      if (this.recoveringTasks.length > 0) {
        return this.recoveringTasks.shift();
      }
      if (this.executionQueue.length > 0) {
        return this.executionQueue.shift();
      }
      return null;
    });

    // 监听系统崩溃恢复事件
    EventBus.getInstance().on('system:recovery', (data: any) => {
      if (data && data.orphanedTasks && data.orphanedTasks.length > 0) {
        console.log(`[Scheduler] Detected ${data.orphanedTasks.length} recovering tasks. Enqueuing for execution...`);
        data.orphanedTasks.forEach((task: any) => this.resumeTask(task));
      }
    });
  }

  async start() {
    this.isRunning = true;
    console.log('✅ Scheduler started');
    await this.workerPool.start();
  }

  async stop() {
    this.isRunning = false;
    this.workerPool.stop();
    console.log('⏹️ Scheduler stopped');
  }

  async scheduleTask(cron: string, callback: Function) {
    const taskDef = {
      id: `task_cron_${Date.now()}`,
      title: `Cron Task`,
      cron,
      callback,
      createdAt: new Date().toISOString()
    };
    
    this.tasks.push(taskDef);
    
    // For now, immediately push cron tasks to execution queue
    this.executionQueue.push(taskDef);

    return this.tasks.length - 1;
  }

  /**
   * 手动推送任务到执行池
   */
  async enqueueTask(task: any) {
    this.executionQueue.push(task);
  }

  /**
   * 恢复僵尸任务接管点
   */
  async resumeTask(task: any) {
    this.recoveringTasks.push(task);
    // WorkerPool will naturally pick this up because recoveringTasks has priority!
  }
}

export default IntelligentScheduler;
