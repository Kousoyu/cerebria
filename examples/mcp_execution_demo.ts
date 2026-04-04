/**
 * Cerebria Execution Demo
 * Shows how to integrate a simulated LLM with the MCP Layer and Worker Pool running in background.
 */

import Cerebria from '../src/index';

async function main() {
  console.log('🚀 Initializing Cerebria OS Kernel...');
  const system = await Cerebria.initialize({
    mode: 'performance',
    persistent: false // Use memory temporarily
  });
  
  await system.scheduler.start();

  // 1. Mount MCP Tool
  console.log('🛠️ Mounting WebSearch Tool into MCP Registry...');
  system.mcpRegistry.registerTool({
    name: 'web_search',
    description: 'Search the internet for up to date information.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query']
    },
    handler: async (args: any) => {
      console.log(`\n=> [MCP Execution] Performing high-speed search for: "${args.query}"`);
      await new Promise(r => setTimeout(r, 700)); // simulate network
      return `[Search Results: "${args.query}" is currently generating lots of hype in the AI ecosystem.]`;
    }
  });

  // 2. Export Schema to the "LLM"
  const schemas = system.mcpRegistry.getToolsSchema();
  console.log('\n💬 Exposing schema to LLM (Model Context Protocol format):');
  console.log(JSON.stringify(schemas, null, 2));

  // 3. Define the LLM Thought Task
  // This simulates an LLM deciding to call the tool, generating a payload, and handing it back.
  const executeResearchTask = async (context: any) => {
    console.log(`\n🧠 [LLM Agent Pipeline] Started processing context inside Worker ${context.workerId}...`);
    
    // (Simulate) LLM decided to use the web_search tool!
    const toolToCall = 'web_search';
    const llmGeneratedArgs = { query: 'Cerebria AI OS Runtime' };

    // Safely route the execution through Cerebria's Hub
    const payload = await system.mcpRegistry.executeTool(toolToCall, llmGeneratedArgs);

    console.log(`\n🧠 [LLM Agent Pipeline] Finished processing. Synthesis:`, payload);
  };

  // 4. Dispatch the payload to the Scheduler Queue!
  console.log('\n⏱️ Enqueuing heavy research task to Intelligent Scheduler...');
  await system.scheduler.enqueueTask({
    id: `research_01`,
    title: 'Self-Research',
    callback: executeResearchTask
  });

  // Give the worker pool a chance to finish executing
  setTimeout(async () => {
    console.log('\n🛑 Shutting down system.');
    await system.scheduler.stop();
    process.exit(0);
  }, 2500);
}

main().catch(console.error);
