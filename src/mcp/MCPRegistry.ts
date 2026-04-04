/**
 * MCPRegistry - Model Context Protocol Hub
 * Allows registration and execution of LLM-agnostic tools.
 */

export interface MCPToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPTool extends MCPToolSchema {
  handler: (args: any, context?: any) => Promise<any>;
}

export class MCPRegistry {
  private tools: Map<string, MCPTool>;

  constructor() {
    this.tools = new Map();
  }

  /**
   * Mount a new MCP-compliant tool
   */
  public registerTool(tool: MCPTool): void {
    if (!tool.name || !tool.handler) {
      throw new Error('Invalid tool registration. Missing name or handler.');
    }
    this.tools.set(tool.name, tool);
    console.log(`[MCP] Tool [${tool.name}] mounted successfully`);
  }

  /**
   * Mount multiple tools
   */
  public registerTools(tools: MCPTool[]): void {
    tools.forEach((t) => this.registerTool(t));
  }

  /**
   * Output all registered tools matching the MCP spec
   * Use this to format the prompt payload for LLMs
   */
  public getToolsSchema(): MCPToolSchema[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
  }

  /**
   * Execute a tool securely
   */
  public async executeTool(name: string, args: any, context: any = {}): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      console.warn(`[MCP] Tool [${name}] not found in Registry`);
      return { isError: true, content: `Error: Tool [${name}] is not registered.` };
    }

    try {
      console.log(`[MCP] Executing tool [${name}] with args:`, args);
      // Optional: Insert argument validation based on JSON Schema tool.inputSchema here
      const result = await tool.handler(args, context);
      return result;
    } catch (error: any) {
      console.warn(`[MCP] Tool execution failed for [${name}]:`, error.message);
      return { isError: true, content: `Error during tool execution: ${error.message}` };
    }
  }
}
