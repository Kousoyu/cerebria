# API Reference

## TaskManager

### createTask(title, description, options)
Create a new task.

const taskId = await taskManager.createTask(
  'Process Data',
  'Analyze user data',
  { priority: 'high', timeout: 300 }
);

### getTask(taskId)
Get task by ID.

const task = await taskManager.getTask(taskId);

### completeTask(taskId)
Mark task as completed.

await taskManager.completeTask(taskId);

## BackupManager

### createBackup()
Create a backup.

const backupId = await backupManager.createBackup();

### listBackups()
List all backups.

const backups = await backupManager.listBackups();

## LogManager

### writeLog(level, message, data)
Write a log entry.

await logManager.writeLog('INFO', 'Task completed', { taskId });
