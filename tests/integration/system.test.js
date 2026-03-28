const Cerebria = require('../../src/index');

describe('Cerebria Integration', () => {
  let system;

  beforeEach(async () => {
    system = await Cerebria.initialize({
      mode: 'standard',
      dataDir: './test-data'
    });
  });

  test('should initialize system', () => {
    expect(system.taskManager).toBeDefined();
    expect(system.backupManager).toBeDefined();
    expect(system.logManager).toBeDefined();
  });

  test('should create and retrieve task', async () => {
    const taskId = await system.taskManager.createTask('Test', 'Test task');
    const task = await system.taskManager.getTask(taskId);
    expect(task.id).toBe(taskId);
  });

  test('should create backup', async () => {
    const backupId = await system.backupManager.createBackup();
    expect(backupId).toBeDefined();
  });
});
