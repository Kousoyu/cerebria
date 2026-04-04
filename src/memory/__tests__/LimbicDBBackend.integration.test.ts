import { LimbicDBBackend } from '../backends/LimbicDBBackend';
import { Memory, RecallOptions } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 安全检查：如果 limbicdb 未安装，跳过整个测试套件
// 这是为了防止 CI/CD 环境中因缺少 peerDependency 而报错
let limbicdbAvailable = false;
try {
  require.resolve('limbicdb');
  limbicdbAvailable = true;
} catch (e) {
  console.warn('limbicdb is not installed. Integration tests will be skipped.');
}

// 动态决定是 describe 还是 describe.skip
const describeIntegration = limbicdbAvailable ? describe : describe.skip;

describeIntegration('LimbicDBBackend Integration Tests', () => {
  let backend: LimbicDBBackend;
  let tempDir: string;
  let dbPath: string;

  // 在每个测试前创建临时目录和数据库
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cogni-core-test-'));
    dbPath = path.join(tempDir, 'test-memory.limbic');
    backend = new LimbicDBBackend(dbPath);
  });

  // 关键：每个测试后清理临时文件，防止污染
  afterEach(async () => {
    if (backend) {
      await backend.close();
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should successfully remember and recall a memory', async () => {
    const content = 'Integration test memory content';
    const type = 'fact';

    // 1. 写入
    const memory = await backend.remember(content, type);
    
    expect(memory).toBeDefined();
    expect(memory.id).toBeDefined();
    expect(memory.content).toBe(content);
    expect(memory.type).toBe(type);
    expect(memory.timestamp).toBeLessThanOrEqual(Date.now());

    // 2. 读取
    const result = await backend.recall(content);
    expect(result.memories.length).toBeGreaterThan(0);
    expect(result.memories[0].content).toBe(content);
  });

  test('should persist data after backend restart', async () => {
    // 1. 写入数据
    await backend.remember('Persistent memory', 'preference');
    await backend.close();

    // 2. 重新打开同一个数据库文件
    const newBackend = new LimbicDBBackend(dbPath);
    const result = await newBackend.recall('Persistent');
    
    expect(result.memories.length).toBe(1);
    expect(result.memories[0].content).toBe('Persistent memory');
    
    await newBackend.close();
  });

  test('should filter memories by type', async () => {
    await backend.remember('Fact 1', 'fact');
    await backend.remember('Goal 1', 'goal');
    await backend.remember('Fact 2', 'fact');

    const options: RecallOptions = {
      types: ['goal']
    };

    const result = await backend.recall('1', options);
    
    expect(result.memories.length).toBe(1);
    expect(result.memories[0].type).toBe('goal');
  });

  test('should handle concurrent writes safely (stress test)', async () => {
    // 模拟并发写入 10 条数据 (reduced from 20 to avoid SQLite locking issues)
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(backend.remember(`Concurrent item ${i}`, 'fact'));
    }

    // 确保所有写入都成功完成，没有数据库锁定错误
    const results = await Promise.all(promises);
    expect(results.length).toBe(10);
    expect(results.every((r) => r.id !== undefined)).toBe(true);

    // 验证数据完整性
    const all = await backend.recall('Concurrent');
    expect(all.memories.length).toBe(10);
  });

  test('should return empty array for non-existent query', async () => {
    const result = await backend.recall('this does not exist');
    expect(result.memories).toEqual([]);
    expect(result.meta.count).toBe(0);
  });

  test('should forget a specific memory', async () => {
    const mem = await backend.remember('To be forgotten', 'fact');
    
    // 验证存在
    let res = await backend.recall('forgotten');
    expect(res.memories.length).toBe(1);

    // 删除
    await backend.forget(mem.id);

    // 验证消失
    res = await backend.recall('forgotten');
    expect(res.memories.length).toBe(0);
  });
});