/**
 * LLMProvider - Native OpenAI-Compatible Fetch Client
 * Designed for Cerebria Os Kernel with zero external AI-SDK dependencies.
 */

export interface LLMConfig {
  apiKey: string;
  baseURL?: string; // Default to 'https://api.openai.com/v1/chat/completions'
  model?: string;   // Default to 'gpt-4o'
  temperature?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export class LLMProvider {
  private config: LLMConfig;
  private endpoint: string;

  constructor(config: LLMConfig) {
    if (!config.apiKey && config.baseURL && !config.baseURL.includes('localhost')) {
      console.warn('[LLMProvider] Warning: Initializing without an API key.');
    }
    
    this.config = {
      apiKey: config.apiKey || '',
      baseURL: config.baseURL || 'https://api.openai.com/v1/chat/completions',
      model: config.model || 'gpt-4o-mini',
      temperature: config.temperature ?? 0.7
    };

    // Ensure backwards compatibility if base URL is passed without the path
    this.endpoint = this.config.baseURL!;
    if (!this.endpoint.endsWith('/chat/completions') && !this.endpoint.includes('localhost')) {
      this.endpoint = `${this.endpoint.replace(/\/$/, '')}/v1/chat/completions`;
    }
  }

  /**
   * Convert Cerebria MCP Tools definition strictly to OpenAI Tool Schema
   */
  private formatTools(mcpDefinitionList: any[]): any[] {
    return mcpDefinitionList.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));
  }

  /**
   * Perform direct LLM inference
   */
  async invoke(messages: ChatMessage[], tools: any[] = []): Promise<ChatMessage> {
    const payload: any = {
      model: this.config.model,
      messages: messages,
      temperature: this.config.temperature
    };

    if (tools && tools.length > 0) {
      payload.tools = this.formatTools(tools);
      payload.tool_choice = 'auto';
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API Request Failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const choice = data.choices[0].message;

      return {
        role: choice.role,
        content: choice.content,
        tool_calls: choice.tool_calls
      };
    } catch (error: any) {
      console.error('[LLMProvider] Error during completion fetch:', error.message);
      throw error;
    }
  }
}
