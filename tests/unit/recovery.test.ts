import PersistentTaskManager from '../../src/persistence/PersistentTaskManager';
import EventBus from '../../src/core/EventBus';
import IntelligentScheduler from '../../src/scheduler';

describe('Crash Recovery Engine', () => {
  let taskManager: PersistentTaskManager;
  let scheduler: IntelligentScheduler;

  beforeEach(() => {
    // Mock the EventBus
    jest.spyOn(EventBus.getInstance(), 'emit');
    
    taskManager = new PersistentTaskManager({ persistent: true, dataDir: './data' });
    scheduler = new IntelligentScheduler();
    scheduler.start(); // Set isRunning to true so it processes tasks

    jest.useFakeTimers();

    // Mock DB layer manually to simulate a crash scenario
    taskManager.initialized = true;
    taskManager.usePersistentStorage = true;
    taskManager.db = {
      query: jest.fn().mockReturnValue([
        {
          id: 'task_crashed_1',
          title: 'Interrupted Task',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]),
      run: jest.fn(),
      transaction: (cb: any) => cb
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should recover orphaned active tasks from the database', async () => {
    const { recovered, tasks } = await taskManager.recoverOrphanedTasks();
    
    expect(recovered).toBe(1);
    expect(tasks[0].id).toBe('task_crashed_1');
    expect(tasks[0].status).toBe('recovering'); // Locked for recovery
    expect(taskManager.db.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE tasks'),
      expect.any(Array)
    );
  });

  it('should emit recovery events and trigger the scheduler', () => {
    const mockCallback = jest.fn();
    EventBus.getInstance().on('task:resumed', mockCallback);

    // Simulate the system:recovery broadcast from index.ts
    EventBus.getInstance().emit('system:recovery', {
      orphanedTasks: [{ id: 'task_crashed_1', title: 'Interrupted Task' }]
    });

    // Fast-forward timers to trigger the setTimeout in scheduler.ts
    jest.advanceTimersByTime(1100);

    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task_crashed_1' }));
  });
});
