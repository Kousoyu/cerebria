import Cerebria from '../src/index';
// @ts-ignore
import { AgentEngine } from '../src';

/**
 * Run this example via:
 * npx ts-node examples/agent_demo.ts
 * 
 * NOTE: Needs deepseek / openai endpoint env vars
 */
async function runAgent() {
  // 1. Boot up the Cerebria OS in memory mode (No SQLite needed for quick demo)
  const os = await Cerebria.initialize({
    persistent: false,
    concurrency: 2
  });

  await os.scheduler.start();

  // 2. Mount some OS-level capabilities (MCP Sandbox)
  os.mcpRegistry.registerTool({
    name: 'calculate_revenue',
    description: 'Calculate the total revenue given price and volume.',
    inputSchema: {
      type: 'object',
      properties: {
        price: { type: 'number', description: 'Price per unit' },
        volume: { type: 'number', description: 'Total units sold' }
      },
      required: ['price', 'volume']
    },
    handler: async (args: any) => {
      const { price, volume } = args;
      console.log(`[OS Tool Execution] Calculating ${price} * ${volume}...`);
      return `The total revenue is $${price * volume}`;
    }
  });

  os.mcpRegistry.registerTool({
    name: 'fetch_weather',
    description: 'Get weather for a city',
    inputSchema: {
      type: 'object',
      properties: { city: { type: 'string' } },
      required: ['city']
    },
    handler: async (args: any) => {
      console.log(`[OS Tool Execution] Fetching weather for ${args.city}...`);
      return `The weather in ${args.city} is sunny, 25°C.`;
    }
  });

  // 3. Connect the native Brain wrapper
  const engine = new AgentEngine(os, {
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key_bypass', // Fallback to avoid crash if env missing (wont work without real key)
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
  });

  // 4. Dispatch the goal
  console.log('\n--- 🚀 Starting Agent Run ---\n');
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ WARNING: OPENAI_API_KEY is not set. The LLM fetch call will fail!');
    console.warn('Please run: export OPENAI_API_KEY=your_key && npx ts-node examples/agent_demo.ts\n');
  } else {
    try {
      const finalThought = await engine.run(
        'I plan to sell 1452 shares of my stock which is priced at 67 dollars each. Also check the weather in Tokyo.'
      );
      console.log('\n=============================');
      console.log('🤖 Agent Final Output:');
      console.log(finalThought);
      console.log('=============================\n');
    } catch (e: any) {
      console.error('Agent Loop Terminated Erroneously:', e.message);
    }
  }

  // 5. Safely shutdown the OS
  await os.shutdown();
}

runAgent();
