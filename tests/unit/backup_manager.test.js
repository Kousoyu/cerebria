const BackupManager = require('../../src/backup_manager');

describe('BackupManager', () => {
  let backupManager;

  beforeEach(() => {
    backupManager = new BackupManager();
  });

  test('should create a backup', async () => {
    const backupId = await backupManager.createBackup();
    expect(backupId).toBeDefined();
  });

  test('should list backups', async () => {
    await backupManager.createBackup();
    await backupManager.createBackup();
    const backups = await backupManager.listBackups();
    expect(backups.length).toBe(2);
  });

  test('should restore a backup', async () => {
    const backupId = await backupManager.createBackup();
    const result = await backupManager.restoreBackup(backupId);
    expect(result.success).toBe(true);
  });

  test('should fail to restore non-existent backup', async () => {
    const result = await backupManager.restoreBackup('non-existent');
    expect(result.success).toBe(false);
  });
});
