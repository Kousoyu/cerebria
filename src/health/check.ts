// src/health/check.ts
import { MemoryManager } from '../memory'

export async function checkMemoryHealth(manager: MemoryManager): Promise<{
  status: 'ok' | 'error'
  latency: number
  message?: string
}> {
  const start = Date.now()
  try {
    await manager.remember('health-check-test', 'fact')
    const result = await manager.recall('health-check-test')
    if (result.memories.length === 0) {
      throw new Error('Recall failed after remember')
    }
    return { status: 'ok', latency: Date.now() - start }
  } catch (err) {
    return { 
      status: 'error', 
      latency: Date.now() - start,
      message: String(err) 
    }
  }
}