const TaskManager = require('../../src/task_manager');

describe('TaskManager', () => {
  let taskManager;

  beforeEach(() => {
    taskManager = new TaskManager();
  });

  test('should create a task', async () => {
    const taskId = await taskManager.createTask('Test', 'Test task');
    expect(taskId).toBeDefined();
  });

  test('should get a task', async () => {
    const taskId = await taskManager.createTask('Test', 'Test task');
    const task = await taskManager.getTask(taskId);
    expect(task.title).toBe('Test');
  });

  test('should complete a task', async () => {
    const taskId = await taskManager.createTask('Test', 'Test task');
    const completed = await taskManager.completeTask(taskId);
    expect(completed.status).toBe('completed');
  });

  test('should get all tasks', async () => {
    await taskManager.createTask('Task 1', 'Description 1');
    await taskManager.createTask('Task 2', 'Description 2');
    const tasks = await taskManager.getAllTasks();
    expect(tasks.length).toBe(2);
  });
});
