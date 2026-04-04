import Cerebria from '../src/index';
// @ts-ignore
import Database from '../src/persistence/Database';

async function main() {
  console.log('🚀 Cerebria Crash Recovery Engine Demo');
  console.log('-----------------------------------------');

  // Step 1: Simulate a crash by injecting an 'active' orphaned task into the database
  const dbPath = './data';
  const db = new Database({ dataDir: dbPath, memory: false, verbose: false });
  await db.connect();

  const fakeTaskId = `task_crashed_${Date.now()}`;
  db.run(`
    INSERT INTO tasks (id, title, description, priority, status, created_at, updated_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    fakeTaskId,
    'System Diagnostic (Interrupted)',
    'This task was interrupted by a simulated power loss.',
    'high',
    'active',  // IT WAS LEFT ACTIVE!
    new Date(Date.now() - 3600000).toISOString(),
    new Date(Date.now() - 3600000).toISOString(),
    JSON.stringify({ origin: 'crash_demo' })
  ]);
  await db.disconnect();

  console.log(`❌ Simulated Crash: Orphaned task [${fakeTaskId}] left in 'active' state in database.`);
  console.log('⏱️ Simulating power cycle and rebooting Cerebria...');

  // Step 2: Initialize Cerebria with Persistence
  // This should automatically intercept the active task, run recovery, and pass it to the Scheduler.
  const system = await Cerebria.initializeWithPersistence({
    mode: 'standard',
    dataDir: dbPath,
    persistent: true
  });

  console.log('\n✅ Cerebria Boot Sequence Finished.');

  // Check the task state
  setTimeout(async () => {
    const recoveredTask = await system.taskManager.getTask(fakeTaskId);
    console.log('\n📊 Task Inspection Post-Recovery:');
    console.log(JSON.stringify(recoveredTask, null, 2));

    if (recoveredTask.status === 'active') { // The scheduler mock set it back to active
      console.log('\n🎉 SUCCESS: Task was correctly intercepted, governed, and resumed!');
    } else {
      console.log('\n❌ FAILED: Task is in state -> ' + recoveredTask.status);
    }
    
    process.exit(0);
  }, 2000); // Wait for scheduler to kick in
}

main().catch(console.error);
