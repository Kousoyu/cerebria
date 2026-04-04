// src/memory/backends/MockBackend.ts
import { randomUUID } from 'crypto';
import { MemoryBackend, Memory, MemoryType, RecallOptions, RecallResult } from '../types';

export class MockMemoryBackend implements MemoryBackend {
  private store: Map<string, Memory> = new Map();

  async remember(content: string, type: MemoryType = 'fact'): Promise<Memory> {
    const mem: Memory = {
      id: randomUUID(),
      content,
      timestamp: Date.now(),
      type,
    };
    this.store.set(mem.id, mem);
    return mem;
  }

  async recall(query: string, options?: RecallOptions): Promise<RecallResult> {
    const start = Date.now();
    let results = Array.from(this.store.values())
      .filter((m) => m.content.includes(query));

    // 支持基础过滤（验证接口设计合理性）
    if (options?.types) {
      results = results.filter((m) => options.types!.includes(m.type));
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return {
      memories: results,
      meta: { 
        count: results.length, 
        query,
        latencyMs: Date.now() - start 
      }
    };
  }

  async forget(id: string): Promise<void> {
    this.store.delete(id);
  }

  async close(): Promise<void> {
    this.store.clear();
  }
}