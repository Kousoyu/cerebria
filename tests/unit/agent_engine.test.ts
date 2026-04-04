import { AgentEngine } from '../../src/engine/AgentEngine';
import { LLMProvider } from '../../src/engine/LLMProvider';
import Cerebria from '../../src/index';

// Mock LLMProvider's invoke method
jest.mock('../../src/engine/LLMProvider');

describe('AgentEngine Orchestration Loop', () => {
  let os: any;
  let engine: AgentEngine;

  beforeAll(async () => {
    os = await Cerebria.initialize({ persistent: false, concurrency: 1 });
    await os.scheduler.start();
    
    os.mcpRegistry.registerTool({
      name: 'add_numbers',
      description: 'Add two numbers',
      inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } } },
      handler: async (args: any) => args.a + args.b
    });
  });

  afterAll(async () => {
    await os.shutdown();
  });

  beforeEach(() => {
    engine = new AgentEngine(os, { apiKey: 'test_key' });
  });

  it('should iteratively resolve tool calls via the OS and return final output', async () => {
    const mockInvoke = jest.fn();
    (engine as any).llm.invoke = mockInvoke;

    // Turn 1: LLM decides to call a tool
    mockInvoke.mockResolvedValueOnce({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'call_123',
          type: 'function',
          function: { name: 'add_numbers', arguments: '{"a": 10, "b": 15}' }
        }
      ]
    });

    // Turn 2: LLM formulates final answer
    mockInvoke.mockResolvedValueOnce({
      role: 'assistant',
      content: 'The sum is 25.',
      tool_calls: undefined
    });

    const result = await engine.run('What is 10 + 15?');
    
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(result).toBe('The sum is 25.');

    // Extract the mock calls to verify the context propagation
    const secondCallContext = mockInvoke.mock.calls[1][0]; // messages array passed to second invoke
    
    // Check if the OS successfully injected the tool block
    const toolMessage = secondCallContext.find((m: any) => m.role === 'tool');
    expect(toolMessage).toBeDefined();
    expect(toolMessage.content).toBe('25'); // The handler evaluates to integer 25
    expect(toolMessage.name).toBe('add_numbers');
  });
});
