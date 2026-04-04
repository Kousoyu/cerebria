/**
 * WorkerPool - Concurrent Task Execution Engine
 */

import EventBus from './EventBus';

export interface TaskContext {
  taskId: string;
  workerId: number;
  memoryData: any;
  [key: string]: any;
}

export class WorkerPool {
  private concurrency: number;
  private activeWorkers: number;
  private isRunning: boolean;
  private pullQueueMethod?: () => Promise<any>;
  private intentHandlers: Record<string, Function> = {};

  constructor(concurrency: number = 2) {
    this.concurrency = concurrency;
    this.activeWorkers = 0;
    this.isRunning = false;
  }

  /**
   * Provide a callback that pops tasks from the persistent storage
   */
  public bindQueuePop(method: () => Promise<any>) {
    this.pullQueueMethod = method;
  }

  /**
   * Register a durable intent handler for crash-proof execution
   */
  public registerIntentHandler(action: string, handler: Function) {
    this.intentHandlers[action] = handler;
  }

  public async start() {
    if (this.isRunning) {
      return;
    }
    if (!this.pullQueueMethod) {
      throw new Error('Cannot start WorkerPool without a bindQueuePop method');
    }
    
    this.isRunning = true;
    console.log(`[WorkerPool] Started with concurrency ${this.concurrency}`);
    
    // Bootstrap workers
    for (let i = 0; i < this.concurrency; i++) {
      this.spawnWorker(i);
    }
  }

  public stop() {
    this.isRunning = false;
    console.log('[WorkerPool] Stopped');
  }

  private async spawnWorker(workerId: number) {
    console.log(`[WorkerPool] Worker ${workerId} idling...`);
    
    while (this.isRunning) {
      try {
        if (this.activeWorkers >= this.concurrency) {
          await this.sleep(1000);
          continue;
        }

        const task = await this.pullQueueMethod!();
        if (!task) {
          await this.sleep(1000); // Polling throttle
          continue;
        }

        this.activeWorkers++;
        await this.executeTask(workerId, task);
        this.activeWorkers--;

      } catch (error: any) {
        console.error(`[WorkerPool] Worker ${workerId} error:`, error);
        await this.sleep(2000);
      }
    }
  }

  private async executeTask(workerId: number, task: any) {
    const context: TaskContext = {
      taskId: task.id,
      workerId,
      memoryData: {}
    };

    console.log(`[WorkerPool] Worker ${workerId} securely executing Task [${task.id}] - ${task.title}`);
    EventBus.getInstance().emit('task:started', { taskId: task.id, workerId });

    try {
      const timeoutPromise = new Promise((_, reject) => {
        const t = setTimeout(() => reject(new Error('Task execution timed out after 60s')), 60000);
        if (t.unref) {
          t.unref(); 
        }
      });

      let result;
      // 1. Prioritize durable intent execution (Crash-proof logic)
      if (task.intent && this.intentHandlers[task.intent.action]) {
        result = await Promise.race([
          this.intentHandlers[task.intent.action](task.intent, context),
          timeoutPromise
        ]);
        EventBus.getInstance().emit('task:resumed', { taskId: task.id, workerId, result });
      } else if (typeof task.callback === 'function') {
        // Legacy Ephemeral Callbacks
        result = await Promise.race([
          task.callback(context),
          timeoutPromise
        ]);
        EventBus.getInstance().emit('task:resumed', { taskId: task.id, workerId, result });
      } else {
        // Task resumed from DB without an intent mapping and no callback
        console.warn(`[WorkerPool] Task ${task.id} has no reliable callback or intent. Cannot reconstruct execution frame. Recovery halted.`);
        await this.sleep(500);
        EventBus.getInstance().emit('task:failed', { taskId: task.id, workerId, error: 'Context Lost' });
      }
    } catch (error: any) {
      console.error('[WorkerPool] Task execution failed:', error.message);
      EventBus.getInstance().emit('task:failed', { taskId: task.id, error: error.message });
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      if (timer.unref) {
        timer.unref(); // Prevent Jest and Node loop from hanging
      }
    });
  }
}
