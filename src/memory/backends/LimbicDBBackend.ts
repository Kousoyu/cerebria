// src/memory/backends/LimbicDBBackend.ts
import { open } from 'limbicdb'
import { MemoryBackend, Memory, MemoryType, RecallOptions, RecallResult } from '../types'

export class LimbicDBBackend implements MemoryBackend {
  private db: ReturnType<typeof open>

  constructor(path = './agent.limbic') {
    this.db = open(path)
  }

  async remember(content: string, type: MemoryType = 'fact'): Promise<Memory> {
    // limbicdb automatically classifies memory, but we can override with kind
    const kindMap: Record<MemoryType, any> = {
      fact: 'fact',
      episode: 'episode', 
      preference: 'preference',
      procedure: 'procedure',
      goal: 'goal'
    }
    
    await this.db.remember(content, { kind: kindMap[type] })
    
    // Create Memory object that matches our interface
    // Note: We don't have the actual ID from limbicdb, so we use a placeholder
    // In a real implementation, we'd need to get the actual memory ID from limbicdb
    return {
      id: `limbic_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      content,
      timestamp: Date.now(),
      type
    }
  }

  async recall(query: string, options?: RecallOptions): Promise<RecallResult> {
    const start = Date.now()
    
    // Convert our options to limbicdb options
    const limbicOptions: any = {}
    if (options?.limit) {
      limbicOptions.limit = options.limit
    }
    if (options?.types) {
      // Map our types to limbicdb kinds
      const kindMap: Record<MemoryType, string> = {
        fact: 'fact',
        episode: 'episode',
        preference: 'preference', 
        procedure: 'procedure',
        goal: 'goal'
      }
      limbicOptions.kind = options.types.map(t => kindMap[t])
    }
    
    // Call limbicdb recall
    const result = await this.db.recall(query, limbicOptions)
    
    // Convert limbicdb memories to our Memory interface
    const memories: Memory[] = result.memories.map(mem => ({
      id: mem.id,
      content: mem.content,
      timestamp: mem.createdAt,
      type: mem.kind as MemoryType,
      metadata: mem.meta
    }))
    
    return {
      memories,
      meta: {
        count: memories.length,
        query,
        latencyMs: Date.now() - start
      }
    }
  }

  async forget(id: string): Promise<void> {
    // limbicdb's forget requires filters, so we use id filter
    await this.db.forget({ ids: [id] })
  }

  async close(): Promise<void> {
    await this.db.close()
  }
}