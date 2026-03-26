/**
 * CogniCore - Main Entry Point v1.0.0
 */

const TaskManager = require('./task_manager');
const PersonalityManager = require('./personality_manager');
const LogManager = require('./log_manager');
const BackupManager = require('./backup_manager');
const IntelligentScheduler = require('./scheduler');
const HealthMonitor = require('./health_monitor');

module.exports = {
  TaskManager,
  PersonalityManager,
  LogManager,
  BackupManager,
  IntelligentScheduler,
  HealthMonitor,
  
  async initialize(options = {}) {
    const config = options.mode || 'standard';
    return {
      taskManager: new TaskManager(options),
      personalityManager: new PersonalityManager(options),
      logManager: new LogManager(options),
      backupManager: new BackupManager(options),
      scheduler: new IntelligentScheduler(options),
      healthMonitor: new HealthMonitor(options)
    };
  },
  
  async start() {
    console.log('🚀 CogniCore v1.0.0 started');
  }
};
