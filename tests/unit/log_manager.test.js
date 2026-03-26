const LogManager = require('../../src/log_manager');

describe('LogManager', () => {
  let logManager;

  beforeEach(() => {
    logManager = new LogManager();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should write a log', async () => {
    await logManager.writeLog('INFO', 'Test message');
    const logs = logManager.logs;
    expect(logs.length).toBe(1);
  });

  test('should query logs by level', async () => {
    await logManager.writeLog('INFO', 'Info message');
    await logManager.writeLog('ERROR', 'Error message');
    const logs = await logManager.queryLogs({ level: 'ERROR' });
    expect(logs.length).toBe(1);
  });

  test('should cleanup logs', async () => {
    await logManager.writeLog('INFO', 'Message');
    await logManager.cleanup();
    expect(logManager.logs.length).toBe(0);
  });
});
