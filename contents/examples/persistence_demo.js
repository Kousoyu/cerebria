/**
 * Cerebria Persistence Demo
 * Demonstrates SQLite-backed persistent storage
 */

const Cerebria = require('../src/index.js');

async function persistenceDemo() {
  console.log('Cerebria Persistence Demo');
  console.log('==========================');

  const persistenceAvailable = Cerebria.isPersistenceAvailable();
  console.log('Persistence available: ' + (persistenceAvailable ? 'Yes' : 'No'));

  if (!persistenceAvailable) {
    console.log('To enable persistence, install better-sqlite3:');
    console.log('  npm install better-sqlite3');
    console.log('Falling back to memory-based demo...');
  }

  const cerebria = persistenceAvailable
    ? await Cerebria.initializeWithPersistence({ mode: 'standard', dataDir: './persistence-demo-data' })
    : await Cerebria.initialize({ mode: 'standard', dataDir: './persistence-demo-data' });

  await cerebria.start();

  // Demo 1: Create tasks
  console.log('\nDemo 1: Creating tasks...');
  const taskIds = [];
  for (let i = 1; i <= 3; i++) {
    const taskId = await cerebria.task.createTask(
      'Task ' + i, 'Description for task ' + i,
      { priority: i === 1 ? 'high' : 'medium' }
    );
    taskIds.push(taskId);
    console.log('  Created: ' + taskId);
  }

  // Demo 2: Retrieve and complete
  console.log('\nDemo 2: Retrieving and completing tasks...');
  const firstTask = await cerebria.task.getTask(taskIds[0]);
  console.log('  Title: ' + firstTask.title + ' | Status: ' + firstTask.status);
  await cerebria.task.completeTask(taskIds[0]);
  console.log('  Task ' + taskIds[0] + ' marked as completed');

  // Demo 3: List all tasks
  console.log('\nDemo 3: Listing all tasks...');
  const allTasks = await cerebria.task.getAllTasks();
  console.log('  Total: ' + allTasks.length);
  allTasks.forEach((task, i) => {
    console.log('  ' + (i+1) + '. ' + task.title + ' [' + task.status + '] - ' + task.priority);
  });

  // Demo 4: Task statistics
  console.log('\nDemo 4: Task statistics...');
  const stats = await cerebria.task.getStats();
  console.log('  Total: ' + stats.total + ' | Active: ' + stats.active + ' | Completed: ' + stats.completed);
  if (stats.byPriority) console.log('  By priority:', stats.byPriority);

  // Demo 5: Query tasks
  console.log('\nDemo 5: Querying tasks by status...');
  const activeTasks = await cerebria.task.listTasks({ status: 'active' });
  console.log('  Active tasks: ' + activeTasks.length);

  // Demo 6: Logging
  console.log('\nDemo 6: Logging...');
  await cerebria.log.writeLog('INFO', 'Persistence demo running', { tasksCreated: taskIds.length, persistenceEnabled: persistenceAvailable });
  console.log('  Log entry written');

  // Demo 7: Health report
  console.log('\nDemo 7: Health report...');
  const health = await cerebria.health.generateReport();
  console.log('  Status: ' + health.status + ' | Uptime: ' + health.uptime + 's');
  console.log('  Heap: ' + health.components.memory.heapUsedPercent + '% | System: ' + health.components.memory.systemUsedPercent + '%');
  if (health.recommendations && health.recommendations.length > 0) {
    console.log('  Recommendations:', health.recommendations);
  }

  // Demo 8: Backup
  console.log('\nDemo 8: Creating backup...');
  const backup = await cerebria.backup.createBackup({ name: 'persistence-demo-backup' });
  console.log('  Backup created: ' + backup.id);

  // Demo 9: List backups
  console.log('\nDemo 9: Listing backups...');
  const backups = await cerebria.backup.listBackups();
  console.log('  Total backups: ' + backups.length);

  // Demo 10: Cleanup (simulated)
  console.log('\nDemo 10: Cleanup (simulated)...');
  const cleanupResult = await cerebria.task.cleanupOldTasks({ keepAllTasks: true });
  console.log('  Result: ' + cleanupResult.message);

  await cerebria.close();
  console.log('\nPersistence demo completed successfully!');
  console.log('\nData directory: ./persistence-demo-data');
}

persistenceDemo().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
