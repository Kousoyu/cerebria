/**
 * CogniCore - Main Entry Point v1.1.0
 * A local-first, governed, recoverable agent runtime
 */

const TaskManager = require('./task_manager');
const PersonalityManager = require('./personality_manager');
const LogManager = require('./log_manager');
const BackupManager = require('./backup_manager');
const IntelligentScheduler = require('./scheduler');
const HealthMonitor = require('./health_monitor');

// Core infrastructure modules
const ConfigManager = require('./core/ConfigManager');
const EventBus = require('./core/EventBus');
const FileLock = require('./core/FileLock');
const RetryManager = require('./core/RetryManager');
const { ErrorHandler, CogniCoreError } = require('./core/ErrorHandler');
const Metrics = require('./core/Metrics');
const { Validator, ValidationError } = require('./utils/Validator');
const RequestTracing = require('./utils/RequestTracing');

module.exports = {
  // Manager modules
  TaskManager,
  PersonalityManager,
  LogManager,
  BackupManager,
  IntelligentScheduler,
  HealthMonitor,
  
  // Core infrastructure
  ConfigManager,
  EventBus,
  FileLock,
  RetryManager,
  ErrorHandler,
  CogniCoreError,
  Metrics,
  Validator,
  ValidationError,
  RequestTracing,
  
  /**
   * Initialize the CogniCore system
   * @param {Object} options - Configuration options
   * @param {string} [options.mode='standard'] - Operation mode: 'light', 'standard', or 'performance'
   * @param {string} [options.dataDir='./data'] - Data directory for persistence
   * @returns {Promise<Object>} Initialized system components
   */
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
  
  /**
   * Start the CogniCore runtime
   * @returns {Promise<void>}
   */
  async start() {
    console.log('🚀 CogniCore v1.1.0 started - A local-first, governed, recoverable agent runtime');
  }
};