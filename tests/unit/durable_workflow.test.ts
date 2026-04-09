import Cerebria from '../../src/index';

describe('Durable Execution Engine', () => {
  let os: any;

  beforeAll(async () => {
    os = await Cerebria.initialize({ persistent: false, concurrency: 1 });
    await os.scheduler.start();
  });

  afterAll(async () => {
    await os.shutdown();
  });

  it('should fast-forward through previously completed steps', async () => {
    const step1Spy = jest.fn().mockResolvedValue('data1');
    const step2Spy = jest.fn().mockResolvedValue('data2');

    os.scheduler.workerPool.registerIntentHandler('test:workflow', async (intent: any, ctx: any) => {
      const res1 = await ctx.run('step_1', step1Spy);
      const res2 = await ctx.run('step_2', step2Spy);
      return { res1, res2 };
    });

    // Simulate an orphaned task that already finished step_1 and crashed
    const taskId = await os.taskManager.createTask('Crash Test', 'Simulating a crash');
    const task = await os.taskManager.getTask(taskId);
    task.intent = { action: 'test:workflow' };
    task.workflowState = {
      status: 'running',
      history: {
        'step_1': 'data1_cached' // We manually seed the history to simulate a restored database row
      }
    };

    // Force run the worker logic manually for testing
    const workerMethod = (os.scheduler.workerPool as any).intentHandlers['test:workflow'];
    const { DurableContext } = require('../../src/core/DurableContext');
    
    const ctx = new DurableContext(taskId, task.workflowState.history);
    const result = await workerMethod(task.intent, ctx);

    // Verify
    expect(step1Spy).not.toHaveBeenCalled(); // Fast-forwarded!
    expect(step2Spy).toHaveBeenCalledTimes(1);
    expect(result.res1).toBe('data1_cached');
    expect(result.res2).toBe('data2');
  });

  it('should suspend and resume on sleep', async () => {
    let executionCount = 0;

    os.scheduler.workerPool.registerIntentHandler('test:sleep', async (intent: any, ctx: any) => {
      executionCount++;
      await ctx.sleep('sleep_step', 100);
      return 'done';
    });

    const taskId = await os.taskManager.createTask('Sleep Test', 'Sleeping');
    const task = await os.taskManager.getTask(taskId);
    task.intent = { action: 'test:sleep' };

    // Fake execute
    const workerMethod = (os.scheduler.workerPool as any).intentHandlers['test:sleep'];
    const { DurableContext, SuspendSignal } = require('../../src/core/DurableContext');
    
    // Attempt 1: Should throw SuspendSignal
    let ctx = new DurableContext(taskId, task.workflowState?.history || {});
    await expect(workerMethod(task.intent, ctx)).rejects.toThrow(SuspendSignal);
    expect(executionCount).toBe(1);

    // Capture the history written by ctx.sleep before reassigning ctx.
    // This simulates reloading workflowState from the database after a crash:
    // the history is retrieved from the ctx that was alive during the first run.
    const savedHistory = ctx.getHistory();

    // Wait 150ms for the sleep timer to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // Attempt 2: Re-executing should fast-forward the sleep
    ctx = new DurableContext(taskId, savedHistory);
    const result = await workerMethod(task.intent, ctx);

    expect(result).toBe('done');
    expect(executionCount).toBe(2); // The outer function runs again because of replay
  });
});
