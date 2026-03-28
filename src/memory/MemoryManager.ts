// src/memory/MemoryManager.ts
import { MemoryBackend, Memory, MemoryType, RecallOptions, RecallResult } from './types'
import { MockMemoryBackend } from './backends/MockBackend'

export class MemoryManager {
  private backend: MemoryBackend

  constructor(backend?: MemoryBackend) {
    this.backend = backend || new MockMemoryBackend()
  }

  async remember(content: string, type?: MemoryType): Promise<Memory> {
    return this.backend.remember(content, type)
  }

  async recall(query: string, options?: RecallOptions): Promise<RecallResult> {
    return this.backend.recall(query, options)
  }

  async forget(id: string): Promise<void> {
    return this.backend.forget(id)
  }

  async close(): Promise<void> {
    return this.backend.close()
  }
}