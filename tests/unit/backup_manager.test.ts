import BackupManager  from '../../src/backup_manager';

describe('BackupManager', () => {
  let backupManager;

  beforeEach(() => {
    backupManager = new BackupManager();
  });

  test('should create a backup', async () => {
    const backup = await backupManager.createBackup();
    expect(backup).toBeDefined();
  });

  test('should list backups', async () => {
    await backupManager.createBackup();
    await backupManager.createBackup();
    const backups = await backupManager.listBackups();
    expect(backups.length).toBe(2);
  });

  test('should restore a backup', async () => {
    const backup = await backupManager.createBackup();
    const result = await backupManager.restoreBackup(backup.id);
    expect(result.status).toBe('restored');
  });

  test('should fail to restore non-existent backup', async () => {
    await expect(backupManager.restoreBackup('non-existent')).rejects.toThrow('Backup not found');
  });
});
