/**
 * Cerebria Basic Usage Demo
 * Demonstrates the simplest way to use Cerebria runtime
 */

const Cerebria = require('../src/index.js');

async function main() {
  console.log('Cerebria v1.2.0 - Basic Usage Demo');
  console.log('====================================');

  try {
    // Initialize with memory-only storage
    const cerebria = await Cerebria.initialize({
      mode: 'standard',
      dataDir: './example-data',
    });

    await cerebria.start();

    // Create tasks using unified API
    const taskId1 = await cerebria.task.createTask(
      'Analyze Data',
      'Analyze sales data and generate report',
      { priority: 'high', tags: ['analysis', 'important'] }
    );
    console.log('Task created: ' + taskId1);

    const taskId2 = await cerebria.task.createTask(
      'Send Report',
      'Send analysis report via email',
      { priority: 'medium', dependencies: [taskId1] }
    );
    console.log('Task created: ' + taskId2);

    // Retrieve task
    const task = await cerebria.task.getTask(taskId1);
    console.log('Task details: ' + task.title + ' [' + task.status + ']');

    // Get personality
    const personality = await cerebria.personality.getPersonality();
    console.log('Personality:', personality);

    // Write logs
    await cerebria.log.writeLog('INFO', 'Task execution started', { taskId: taskId1 });
    await cerebria.log.writeLog('INFO', 'Analysis completed');
    await cerebria.log.writeLog('WARN', 'High resource usage', { percent: 78 });

    // Complete a task
    await cerebria.task.completeTask(taskId1);
    console.log('Task ' + taskId1 + ' marked as completed');

    // Get task statistics
    const stats = await cerebria.task.getStats();
    console.log('Task stats: total=' + stats.total + ' active=' + stats.active + ' completed=' + stats.completed);

    // Generate health report
    const health = await cerebria.health.generateReport();
    console.log('Health report: ' + health.status);
    console.log('  Uptime: ' + health.uptime + 's');
    console.log('  Memory: ' + health.components.memory.heapUsedPercent + '%');
    if (health.recommendations && health.recommendations.length > 0) {
      console.log('  Recommendations:', health.recommendations);
    }

    // Clean up
    await cerebria.close();
    console.log('Demo completed successfully!');
  } catch (error) {
    console.error('Demo failed:', error.message);
    process.exit(1);
  }
}

main();
