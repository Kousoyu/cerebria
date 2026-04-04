import Cerebria from '../src/index';

/**
 * Demonstrate Temporal-style Durable Execution in Cerebria OS
 * Run via: npx ts-node examples/durable_demo.ts
 */
async function runDurableDemo() {
  // We use Memory Mode here just for local testing
  // But to see real crash recovery, you would use persistent mode!
  const os = await Cerebria.initialize({ persistent: false, concurrency: 2 });
  await os.scheduler.start();

  console.log('--- 🚀 Starting Durable Workflow Demo ---');

  // Register a Workflow Intent
  os.scheduler.workerPool.registerIntentHandler('demo:workflow', async (intent: any, ctx: any) => {
    console.log(`[Workflow] Started Execution Frame for Intent: ${intent.action}`);

    // Step 1
    const rand = await ctx.run('generate_random', async () => {
      console.log('  -> Executing heavy step 1...');
      return Math.floor(Math.random() * 100);
    });
    console.log(`[Workflow] Result of Step 1: ${rand}`);

    // Step 2 (Sleep)
    console.log(`[Workflow] Encountered sleep. Emitting Suspend Signal...`);
    await ctx.sleep('sleep_1', 3000); // Sleep for 3 seconds

    // Step 3
    const finalVal = await ctx.run('calculate_final', async () => {
      console.log('  -> Executing heavy step 3...');
      return rand * 2;
    });
    console.log(`[Workflow] ✅ Final calculation finished: ${finalVal}`);

    return { done: true, finalVal };
  });

  // Submit the workflow job
  await os.taskManager.createTask(
    'Durable Demo Job',
    'Tests event sourcing replay',
    {
      priority: 'high',
      intent: { action: 'demo:workflow' }
    }
  );

  // Leave it running for 5 seconds so we can see the sleep and wake
  setTimeout(async () => {
    console.log('\n--- 🛑 Ending Demo ---');
    process.exit(0);
  }, 5000);
}

runDurableDemo();
