import EventBus from './EventBus';

export class SuspendSignal extends Error {
  public resumeAt: number;
  public stepId: string;

  constructor(stepId: string, durationMs: number) {
    super(`Workflow Suspended at ${stepId}`);
    this.name = 'SuspendSignal';
    this.stepId = stepId;
    this.resumeAt = Date.now() + durationMs;
  }
}

export type ExecutionHistory = Record<string, any>;

export class DurableContext {
  private taskId: string;
  private history: ExecutionHistory;

  constructor(taskId: string, history: ExecutionHistory = {}) {
    this.taskId = taskId;
    this.history = history;
  }

  /**
   * Run a step durably.
   * If stepId exists in history, return the cached result instead of executing.
   * If not, execute it, emit completion for the database, and return.
   */
  public async run<T>(stepId: string, fn: () => Promise<T>): Promise<T> {
    if (stepId in this.history) {
      console.log(`[DurableContext] ⏪ Fast-forwarding step: [${stepId}]`);
      return this.history[stepId] as T;
    }

    console.log(`[DurableContext] ▶️ Executing step: [${stepId}]`);
    const result = await fn();

    // Cache Locally
    this.history[stepId] = result;

    // Fire Event to prompt persistence manager to patch DB immediately
    EventBus.getInstance().emit('workflow:step:completed', {
      taskId: this.taskId,
      stepId,
      result
    });

    return result;
  }

  /**
   * Pause the workflow.
   * Throws a SuspendSignal if the wake-up time hasn't been reached.
   * Fast-forwards if the wake-up time has elapsed.
   */
  public async sleep(stepId: string, durationMs: number): Promise<void> {
    if (stepId in this.history) {
      const resumeAt = this.history[stepId];
      if (Date.now() >= resumeAt) {
        console.log(`[DurableContext] ⏰ Sleep [${stepId}] finished. Resuming.`);
        return; // Fast-forward past the sleep because time passed
      } else {
        // Sleep was already initiated but we were woken up too early (or crashed immediately after sleeping)
        // Just re-suspend
        throw new SuspendSignal(stepId, resumeAt - Date.now());
      }
    }

    // We never slept here before. Record the intent to wake up in `durationMs`
    const resumeAt = Date.now() + durationMs;
    this.history[stepId] = resumeAt;
    
    // Commit to DB so we know when to wake up on reboot
    EventBus.getInstance().emit('workflow:step:completed', {
      taskId: this.taskId,
      stepId,
      result: resumeAt
    });

    // Abort current execution frame
    throw new SuspendSignal(stepId, durationMs);
  }
}
