import Cerebria from '../src/index';

async function main() {
  console.log('🚀 Cerebria v1.2.0 - Basic Usage');
  console.log('==================================');

  try {
    const system = await Cerebria.initialize({
      mode: 'standard',
      dataDir: './example-data'
    });

    console.log('✅ System initialized');

    const taskId = await system.taskManager.createTask(
      'Example Task',
      'This is an example task',
      { priority: 'high' }
    );
    console.log('✅ Task created:', taskId);

    const task = await system.taskManager.getTask(taskId);
    console.log('Task details:');
    console.log(JSON.stringify(task, null, 2));

    const personality = await system.personalityManager.getPersonality();
    console.log('✅ Personality retrieved');

    await system.logManager.writeLog('INFO', 'Example operation completed', { taskId });
    console.log('✅ Log written');

    const report = await system.healthMonitor.generateReport();
    console.log('Health report:');
    console.log(JSON.stringify(report, null, 2));

    console.log('✨ Example completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
