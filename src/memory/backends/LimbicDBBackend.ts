// src/memory/backends/LimbicDBBackend.ts
import { MemoryBackend, Memory, MemoryType, RecallOptions, RecallResult } from '../types'

// Dynamically require limbicdb to handle peer dependency
function loadLimbicDB() {
  try {
    return require('limbicdb');
  } catch (error) {
    throw new Error('limbicdb is not installed. Please install it with: npm install limbicdb@beta');
  }
}

export class LimbicDBBackend implements MemoryBackend {
  private db: any;

  constructor(path = './agent.limbic') {
    // We'll initialize the database lazily when first used
    // This allows the constructor to succeed even if limbicdb isn't installed
    // The actual initialization happens in the first method call
    this.db = null;
    this.dbPath = path;
  }

  private dbPath: string;
  private initialized = false;

  private ensureInitialized(): void {
    if (!this.initialized) {
      const { open } = loadLimbicDB();
      this.db = open(this.dbPath);
      this.initialized = true;
    }
  }

  async remember(content: string, type: MemoryType = 'fact'): Promise<Memory> {
    await this.ensureInitialized();
    
    // limbicdb automatically classifies memory, but we can override with kind
    const kindMap: Record<MemoryType, string> = {
      fact: 'fact',
      episode: 'episode', 
      preference: 'preference',
      procedure: 'procedure',
      goal: 'goal'
    }
    
    // limbicdb's remember returns the actual memory object with real ID
    const limbicMemory = await this.db.remember(content, { kind: kindMap[type] });
    
    return {
      id: limbicMemory.id,
      content: limbicMemory.content,
      timestamp: limbicMemory.createdAt,
      type: limbicMemory.kind as MemoryType,
      metadata: limbicMemory.meta
    };
  }

  async recall(query: string, options?: RecallOptions): Promise<RecallResult> {
    await this.ensureInitialized();
    
    const start = Date.now();
    
    // Convert our options to limbicdb options
    const limbicOptions: any = {};
    if (options?.limit) {
      limbicOptions.limit = options.limit;
    }
    if (options?.types) {
      // Map our types to limbicdb kinds
      const kindMap: Record<MemoryType, string> = {
        fact: 'fact',
        episode: 'episode',
        preference: 'preference', 
        procedure: 'procedure',
        goal: 'goal'
      };
      limbicOptions.kind = options.types.map(t => kindMap[t]);
    }
    
    // Call limbicdb recall
    const result = await this.db.recall(query, limbicOptions);
    
    // Convert limbicdb memories to our Memory interface
    const memories: Memory[] = result.memories.map((mem: any) => ({
      id: mem.id,
      content: mem.content,
      timestamp: mem.createdAt,
      type: mem.kind as MemoryType,
      metadata: mem.meta
    }));
    
    return {
      memories,
      meta: {
        count: memories.length,
        query,
        latencyMs: Date.now() - start
      }
    };
  }

  async forget(id: string): Promise<void> {
    await this.ensureInitialized();
    // limbicdb's forget requires filters, so we use id filter
    await this.db.forget({ ids: [id] });
  }

  async close(): Promise<void> {
    if (this.initialized) {
      await this.db.close();
      this.initialized = false;
    }
  }
}