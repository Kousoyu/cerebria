import { WorkerPool } from '../../src/core/WorkerPool';

describe('WorkerPool', () => {
  let workerPool: WorkerPool;

  beforeEach(() => {
    workerPool = new WorkerPool(1);
  });

  afterEach(() => {
    workerPool.stop();
  });

  it('should throw if started without a queue hook', async () => {
    await expect(workerPool.start()).rejects.toThrow('Cannot start WorkerPool without a bindQueuePop method');
  });

  it('should pull and execute a task', async () => {
    let executionCount = 0;
    let pulled = false;

    workerPool.bindQueuePop(async () => {
      if (pulled) return null;
      pulled = true;
      return {
        id: 'mock_task_1',
        title: 'Mock Task',
        callback: async () => {
            executionCount++;
            return true;
        }
      };
    });

    await workerPool.start();
    
    // allow worker loop to trigger
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(executionCount).toBe(1);
  });
});
