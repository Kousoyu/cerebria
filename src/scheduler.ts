/**
 * IntelligentScheduler - Automated Task Scheduling
 */

import EventBus from './core/EventBus';

class IntelligentScheduler {
  [key: string]: any;
  constructor(options: any = {}) {
    this.dataDir = options.dataDir || './data';
    this.tasks = [];
    this.recoveringTasks = [];
    this.isRunning = false;
    
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
  }

  async stop() {
    this.isRunning = false;
    console.log('⏹️ Scheduler stopped');
  }

  async scheduleTask(cron: string, callback: Function) {
    this.tasks.push({
      cron,
      callback,
      createdAt: new Date().toISOString()
    });
    return this.tasks.length - 1;
  }

  /**
   * 恢复僵尸任务接管点
   */
  async resumeTask(task: any) {
    // 将其置入特殊队列，然后尝试立刻拉起 (这里是 mock 的调度抽象)
    this.recoveringTasks.push(task);
    setTimeout(() => {
      if (this.isRunning) {
        console.log(`[Scheduler] 🚀 Resuming execution of recovered task [${task.id}] - ${task.title}`);
        // 实际上此处应当将其调度给 Worker 或执行器执行，为做演示，我们将其挂上日志
        task.status = 'active'; // 解除 recovering 锁定
        EventBus.getInstance().emit('task:resumed', { taskId: task.id });
      }
    }, 1000);
  }
}

export default IntelligentScheduler;
