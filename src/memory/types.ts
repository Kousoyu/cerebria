// src/memory/types.ts

export interface Memory {
  id: string
  content: string
  timestamp: number
  type: MemoryType
  metadata?: Record<string, unknown> // 预留扩展字段
}

export type MemoryType = 
  | 'fact' 
  | 'episode' 
  | 'preference' 
  | 'procedure' 
  | 'goal'

export interface RecallOptions {
  limit?: number // 限制返回数量
  types?: MemoryType[] // 按类型过滤
  timeRange?: { // 时间范围过滤（limbicdb 未来可能支持）
    start?: number
    end?: number
  }
}

export interface RecallResult {
  memories: Memory[]
  meta: {
    count: number
    query: string
    latencyMs?: number // 预留性能监控字段
  }
}

export interface MemoryBackend {
  remember(content: string, type?: MemoryType): Promise<Memory>
  recall(query: string, options?: RecallOptions): Promise<RecallResult>
  forget(id: string): Promise<void>
  close(): Promise<void>
}