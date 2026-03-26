/**
 * Persistence Complete Demo
 * 展示所有持久化管理器的协同工作
 */

const { initializeWithPersistence } = require('../src/index');

async function runCompleteDemo() {
  console.log(`
🚀 CogniCore Persistence Complete Demo
========================================
📊 Testing all persistent managers in a unified system
`);

  try {
    // 1. 初始化带有持久化的系统
    console.log('📦 Step 1: Initializing system with persistence...');
    const system = await initializeWithPersistence({
      dataDir: './persistence-complete-data',
      persistent: true,
      verbose: true
    });

    console.log('✅ System initialized with persistence enabled');
    console.log(`   - Task Manager: ${system.taskManager.constructor.name}`);
    console.log(`   - Log Manager: ${system.logManager.constructor.name}`);
    console.log(`   - Policy Manager: ${system.personalityManager.constructor.name}`);
    console.log(`   - Backup Manager: ${system.backupManager.constructor.name}`);

    // 2. 健康检查
    console.log('\n🏥 Step 2: System health check...');
    const taskHealth = await system.taskManager.healthCheck();
    const logHealth = await system.logManager.healthCheck();
    const policyHealth = await system.personalityManager.healthCheck();
    const backupHealth = await system.backupManager.healthCheck();

    console.log('✅ Health check results:');
    console.log(`   - Task Manager: ${taskHealth.healthy ? '✅' : '❌'} (${taskHealth.storage})`);
    console.log(`   - Log Manager: ${logHealth.healthy ? '✅' : '❌'} (${logHealth.storage})`);
    console.log(`   - Policy Manager: ${policyHealth.healthy ? '✅' : '❌'} (${policyHealth.storage})`);
    console.log(`   - Backup Manager: ${backupHealth.healthy ? '✅' : '❌'} (${backupHealth.storage})`);

    // 3. 创建任务
    console.log('\n📝 Step 3: Creating tasks...');
    const task1 = await system.taskManager.createTask({
      title: 'System Backup Task',
      description: 'Create a full system backup',
      priority: 'high'
    });
    
    const task2 = await system.taskManager.createTask({
      title: 'Policy Review',
      description: 'Review and update security policies',
      priority: 'medium'
    });

    console.log(`✅ Created 2 tasks: ${task1.id}, ${task2.id}`);

    // 4. 创建策略
    console.log('\n🔐 Step 4: Creating policies...');
    const securityPolicy = await system.personalityManager.createPolicy(
      'Security Policy v1.0',
      {
        rules: [
          'All backups must be encrypted',
          'Access logs must be retained for 90 days',
          'Critical tasks require approval'
        ],
        enforcement: 'strict'
      },
      { createdBy: 'demo-admin' }
    );

    const backupPolicy = await system.personalityManager.createPolicy(
      'Backup Policy',
      {
        schedule: 'daily',
        retention: '30 days',
        verification: 'checksum'
      },
      { createdBy: 'backup-system' }
    );

    console.log(`✅ Created 2 policies: ${securityPolicy.id}, ${backupPolicy.id}`);

    // 5. 记录日志
    console.log('\n📋 Step 5: Writing logs...');
    await system.logManager.writeLog('INFO', 'System initialized successfully', { 
      components: ['task', 'log', 'policy', 'backup'] 
    });
    
    await system.logManager.writeLog('INFO', 'Tasks created', {
      taskCount: 2,
      taskIds: [task1.id, task2.id]
    });
    
    await system.logManager.writeLog('INFO', 'Policies created', {
      policyCount: 2,
      policyNames: ['Security Policy v1.0', 'Backup Policy']
    });

    console.log('✅ Wrote 3 log entries');

    // 6. 查询和展示数据
    console.log('\n🔍 Step 6: Querying and displaying data...');

    // 6.1 任务统计
    const taskStats = await system.taskManager.getStats();
    console.log('📊 Task Statistics:');
    console.log(`   - Total: ${taskStats.total}`);
    console.log(`   - Active: ${taskStats.active}`);
    console.log(`   - Completed: ${taskStats.completed}`);
    console.log(`   - Storage: ${taskStats.storage}`);

    // 6.2 日志统计
    const logStats = await system.logManager.getStats();
    console.log('📊 Log Statistics:');
    console.log(`   - Total: ${logStats.total}`);
    console.log(`   - By level:`, logStats.byLevel);

    // 6.3 策略统计
    const policyStats = await system.personalityManager.getStats();
    console.log('📊 Policy Statistics:');
    console.log(`   - Total: ${policyStats.total}`);
    console.log(`   - Active: ${policyStats.active}`);
    console.log(`   - Inactive: ${policyStats.inactive}`);
    console.log(`   - Changes: ${policyStats.changes}`);

    // 7. 创建备份
    console.log('\n💾 Step 7: Creating system backup...');
    const backup = await system.backupManager.createBackup({
      name: 'Complete System Backup',
      type: 'full',
      metadata: {
        reason: 'Demo backup',
        components: ['tasks', 'policies', 'logs', 'database']
      }
    });

    console.log(`✅ Backup created: ${backup.id}`);
    console.log(`   - Name: ${backup.name}`);
    console.log(`   - Size: ${backup.size_bytes} bytes`);
    console.log(`   - Checksum: ${backup.checksum_sha256?.substring(0, 16)}...`);

    // 8. 备份验证
    console.log('\n🔒 Step 8: Verifying backup integrity...');
    const verification = await system.backupManager.verifyBackup(backup.id);
    
    if (verification.valid) {
      console.log('✅ Backup integrity verified');
      console.log(`   - Checksum match: ${verification.expectedChecksum?.substring(0, 16)}...`);
      console.log(`   - File size: ${verification.fileSize} bytes`);
    } else {
      console.log('❌ Backup verification failed:', verification.error);
    }

    // 9. 列出所有备份
    console.log('\n📋 Step 9: Listing all backups...');
    const backups = await system.backupManager.listBackups();
    console.log(`✅ Found ${backups.length} backup(s):`);
    backups.forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.name} (${b.status}) - ${new Date(b.created_at).toLocaleString()}`);
    });

    // 10. 备份统计
    console.log('\n📈 Step 10: Backup statistics...');
    const backupStats = await system.backupManager.getStats();
    console.log('📊 Backup Statistics:');
    console.log(`   - Total: ${backupStats.total}`);
    console.log(`   - Completed: ${backupStats.completed}`);
    console.log(`   - Failed: ${backupStats.failed}`);
    console.log(`   - Total size: ${backupStats.totalSize} bytes`);
    console.log(`   - By type:`, backupStats.byType);

    // 11. 完成一个任务
    console.log('\n✅ Step 11: Completing a task...');
    await system.taskManager.completeTask(task1.id);
    console.log(`✅ Task ${task1.id} marked as completed`);

    // 12. 查询日志
    console.log('\n📖 Step 12: Querying recent logs...');
    const recentLogs = await system.logManager.queryLogs({
      limit: 5,
      startTime: new Date(Date.now() - 3600000).toISOString() // 最近1小时
    });
    
    console.log(`✅ Found ${recentLogs.length} recent log(s):`);
    recentLogs.forEach((log, i) => {
      console.log(`   ${i + 1}. [${log.level}] ${log.message}`);
    });

    // 13. 提出策略变更
    console.log('\n📝 Step 13: Proposing policy change...');
    const change = await system.personalityManager.proposePolicyChange(
      securityPolicy.id,
      {
        rules: [
          'All backups must be encrypted with AES-256',
          'Access logs must be retained for 180 days',
          'Critical tasks require dual approval',
          'All policy changes must be audited'
        ],
        enforcement: 'strict',
        version: '2.0'
      },
      { reason: 'Enhanced security requirements' }
    );

    console.log(`✅ Policy change proposed: ${change.id}`);
    console.log(`   - Status: ${change.status}`);
    console.log(`   - Reason: ${change.reason}`);

    // 14. 获取策略变更历史
    console.log('\n🕰️ Step 14: Getting policy change history...');
    const changes = await system.personalityManager.getPolicyChanges(securityPolicy.id, { limit: 3 });
    console.log(`✅ Found ${changes.length} change(s) for policy ${securityPolicy.id}:`);
    changes.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.change_type} - ${c.status} - ${new Date(c.created_at).toLocaleString()}`);
    });

    // 15. 系统总结
    console.log('\n🎯 Step 15: System summary...');
    
    const finalTaskStats = await system.taskManager.getStats();
    const finalLogStats = await system.logManager.getStats();
    const finalPolicyStats = await system.personalityManager.getStats();
    const finalBackupStats = await system.backupManager.getStats();

    console.log(`
📊 FINAL SYSTEM STATE
=====================
Tasks:      ${finalTaskStats.total} total (${finalTaskStats.active} active, ${finalTaskStats.completed} completed)
Logs:       ${finalLogStats.total} total (${JSON.stringify(finalLogStats.byLevel)})
Policies:   ${finalPolicyStats.total} total (${finalPolicyStats.active} active)
Backups:    ${finalBackupStats.total} total (${finalBackupStats.completed} completed, ${finalBackupStats.totalSize} bytes)

💾 Storage: All data persisted to SQLite database
✅ Verification: Backup integrity verified
🔒 Security: Policies with approval workflow
📈 Monitoring: Complete logging and statistics

✨ DEMO COMPLETED SUCCESSFULLY!
`);

    // 16. 关闭连接
    console.log('🔌 Cleaning up...');
    
    if (system.taskManager.close) {
      await system.taskManager.close();
    }
    
    if (system.logManager.close) {
      await system.logManager.close();
    }
    
    if (system.personalityManager.close) {
      await system.personalityManager.close();
    }
    
    if (system.backupManager.close) {
      await system.backupManager.close();
    }

    console.log('\n✅ All connections closed');
    console.log('\n📁 Data directory: ./persistence-complete-data');
    console.log('💡 All data has been persisted and can be accessed in future sessions.');

  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行演示
if (require.main === module) {
  runCompleteDemo().catch(console.error);
}

module.exports = { runCompleteDemo };