import { MCPRegistry, MCPTool } from '../../src/mcp/MCPRegistry';

describe('MCP Registry', () => {
  let registry: MCPRegistry;

  beforeEach(() => {
    registry = new MCPRegistry();
  });

  describe('Registration & Schemas', () => {
    it('should register a valid tool and allow schema retrieval', () => {
      const dbTool: MCPTool = {
        name: 'fetch_user',
        description: 'Fetch user from DB',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        },
        handler: async (args) => {
          return { name: 'Alice', id: args.id };
        }
      };

      registry.registerTool(dbTool);

      const schemas = registry.getToolsSchema();
      expect(schemas.length).toBe(1);
      expect(schemas[0].name).toBe('fetch_user');
      expect(schemas[0]).not.toHaveProperty('handler'); // ensure handler is stripped for output
    });

    it('should throw when registering invalid tool', () => {
      expect(() => registry.registerTool({} as any)).toThrow();
    });
  });

  describe('Execution Engine', () => {
    it('should cleanly execute bound handler', async () => {
      registry.registerTool({
        name: 'sum',
        description: 'Sum numbers',
        inputSchema: { type: 'object', properties: {} },
        handler: async (args) => args.a + args.b
      });

      const result = await registry.executeTool('sum', { a: 10, b: 20 });
      expect(result).toBe(30);
    });

    it('should throw an error for non-existent tools', async () => {
      await expect(registry.executeTool('ghost', {})).rejects.toThrow('not found');
    });

    it('should safely propagate handler errors', async () => {
      registry.registerTool({
        name: 'thrower',
        description: 'Throws',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => { throw new Error('Boom'); }
      });

      await expect(registry.executeTool('thrower', {})).rejects.toThrow('Boom');
    });
  });
});
