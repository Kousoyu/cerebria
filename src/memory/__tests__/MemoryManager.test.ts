// src/memory/__tests__/MemoryManager.test.ts
import { MemoryManager } from '../MemoryManager';

describe('MemoryManager', () => {
  let manager: MemoryManager;

  beforeEach(() => {
    manager = new MemoryManager();
  });

  afterEach(async () => {
    await manager.close();
  });

  test('should remember and recall memories', async () => {
    const memory = await manager.remember('test content', 'fact');
    expect(memory.content).toBe('test content');
    expect(memory.type).toBe('fact');

    const result = await manager.recall('test');
    expect(result.memories.length).toBe(1);
    expect(result.memories[0].content).toBe('test content');
    expect(result.meta.count).toBe(1);
    expect(result.meta.query).toBe('test');
    expect(result.meta.latencyMs).toBeGreaterThanOrEqual(0);
  });

  test('should support filtering by type', async () => {
    await manager.remember('fact memory', 'fact');
    await manager.remember('preference memory', 'preference');

    const result = await manager.recall('memory', { types: ['fact'], limit: 1 });
    expect(result.memories.length).toBe(1);
    expect(result.memories[0].type).toBe('fact');
  });

  test('should forget memories', async () => {
    const memory = await manager.remember('to be forgotten', 'episode');
    await manager.forget(memory.id);

    const result = await manager.recall('forgotten');
    expect(result.memories.length).toBe(0);
  });
});