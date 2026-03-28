/**
 * Cerebria持久化演示
 * 展示如何使用SQLite持久化存储任务和系统状态
 */

const Cerebria = require('../src/index.js');

async function persistenceDemo() {
  console.log('🚀 Cerebria Persistence Demo');
  console.log('==================================');
  
  try {
    // 检查持久化是否可用
    const persistenceAvailable = Cerebria.isPersistenceAvailable();
    console.log(`📊 Persistence available: ${persistenceAvailable ? '✅ Yes' : '❌ No'}`);
    
    if (!persistenceAvailable) {
      console.log('\n💡 To enable persistence, install better-sqlite3:');
      console.log('   npm install better-sqlite3');
      console.log('\nFalling back to memory-based demo...');
    }
    
    // 使用持久化初始化（如果可用）
    const system = persistenceAvailable 
      ? await Cerebria.initializeWithPersistence({
          mode: 'standard',
          dataDir: './persistence-demo-data',
          persistent: true
        })
      : await Cerebria.initialize({
          mode: 'standard',
          dataDir: './persistence-demo-data'
        });
    
    console.log(`✅ System initialized with ${persistenceAvailable ? 'persistent' : 'memory'} storage`);
    
    // 演示1: 创建任务
    console.log('\n📝 Demo 1: Creating tasks...');
    
    const taskIds = [];
    for (let i = 1; i <= 3; i++) {
      const taskId = await system.taskManager.createTask(
        `Task ${i}`,
        `Description for task ${i}`,
        { priority: i === 1 ? 'high' : 'medium' }
      );
      taskIds.push(taskId);
      console.log(`   Created task: ${taskId}`);
    }
    
    // 演示2: 获取和完成任务
    console.log('\n✅ Demo 2: Retrieving and completing tasks...');
    
    const firstTask = await system.taskManager.getTask(taskIds[0]);
    console.log(`   First task details:`);
    console.log(`   - Title: ${firstTask.title}`);
    console.log(`   - Status: ${firstTask.status}`);
    console.log(`   - Created: ${firstTask.createdAt}`);
    
    await system.taskManager.completeTask(taskIds[0]);
    console.log(`   Task ${taskIds[0]} marked as completed`);
    
    // 演示3: 查询所有任务
    console.log('\n📋 Demo 3: Listing all tasks...');
    
    const allTasks = await system.taskManager.getAllTasks();
    console.log(`   Total tasks: ${allTasks.length}`);
    allTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.title} [${task.status}] - ${task.priority} priority`);
    });
    
    // 演示4: 任务统计（如果支持）
    console.log('\n📊 Demo 4: Task statistics...');
    
    if (typeof system.taskManager.getStatistics === 'function') {
      const stats = await system.taskManager.getStatistics();
      console.log(`   Total: ${stats.total}`);
      console.log(`   Active: ${stats.active}`);
      console.log(`   Completed: ${stats.completed}`);
      console.log(`   Storage: ${stats.storage}`);
      
      if (stats.byPriority) {
        console.log(`   By priority:`);
        Object.entries(stats.byPriority).forEach(([priority, count]) => {
          console.log(`     - ${priority}: ${count}`);
        });
      }
    } else {
      console.log('   Statistics not available in memory mode');
    }
    
    // 演示5: 条件查询（如果支持）
    console.log('\n🔍 Demo 5: Querying tasks by criteria...');
    
    if (typeof system.taskManager.queryTasks === 'function') {
      const activeTasks = await system.taskManager.queryTasks({ status: 'active' });
      console.log(`   Active tasks: ${activeTasks.length}`);
      
      const highPriorityTasks = await system.taskManager.queryTasks({ priority: 'high' });
      console.log(`   High priority tasks: ${highPriorityTasks.length}`);
    } else {
      console.log('   Advanced querying not available in memory mode');
    }
    
    // 演示6: 显式持久化（如果支持）
    console.log('\n💾 Demo 6: Explicit persistence...');
    
    if (typeof system.taskManager.persistAll === 'function') {
      const result = await system.taskManager.persistAll();
      console.log(`   Persisted ${result.persisted} tasks to database`);
    } else {
      console.log('   Explicit persistence not available in memory mode');
    }
    
    // 演示7: 日志记录
    console.log('\n📝 Demo 7: Logging...');
    
    await system.logManager.writeLog('INFO', 'Persistence demo completed', {
      tasksCreated: taskIds.length,
      persistenceEnabled: persistenceAvailable,
      demoCompleted: true
    });
    
    console.log('   Log entry written');
    
    // 演示8: 健康检查
    console.log('\n❤️  Demo 8: Health check...');
    
    const health = await system.healthMonitor.generateReport();
    console.log(`   System healthy: ${health.healthy ? '✅ Yes' : '❌ No'}`);
    console.log(`   Memory usage: ${health.metrics.memory}%`);
    console.log(`   CPU usage: ${health.metrics.cpu}%`);
    
    // 演示9: 清理（如果支持）
    console.log('\n🧹 Demo 9: Cleanup...');
    
    if (typeof system.taskManager.cleanupOldTasks === 'function') {
      const cleanupResult = await system.taskManager.cleanupOldTasks({
        keepAllTasks: true // 不清除，仅演示
      });
      console.log(`   Cleanup result: ${cleanupResult.message || 'Not executed'}`);
    }
    
    // 演示10: 关闭连接（如果支持）
    console.log('\n🔌 Demo 10: Closing connections...');
    
    if (typeof system.taskManager.close === 'function') {
      await system.taskManager.close();
      console.log('   Database connection closed');
    } else {
      console.log('   No connection to close (memory mode)');
    }
    
    console.log('\n✨ Persistence demo completed successfully!');
    console.log('\n📁 Data directory:', './persistence-demo-data');
    console.log('💡 Try restarting the demo to see if tasks persist across sessions.');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行演示
persistenceDemo().catch(console.error);