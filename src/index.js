/**
 * Cerebria - Main Entry Point v1.2.0
 * A local-first, governed, recoverable agent runtime
 */

const TaskManager = require('./task_manager');
const PersonalityManager = require('./personality_manager');
const LogManager = require('./log_manager');
const BackupManager = require('./backup_manager');
const IntelligentScheduler = require('./scheduler');
const HealthMonitor = require('./health_monitor');
const path = require('path');

// Core infrastructure modules
const ConfigManager = require('./core/ConfigManager');
const EventBus = require('./core/EventBus');
const FileLock = require('./core/FileLock');
const RetryManager = require('./core/RetryManager');
const { ErrorHandler, CerebriaError } = require('./core/ErrorHandler');
const Metrics = require('./core/Metrics');
const { Validator, ValidationError } = require('./utils/Validator');
const RequestTracing = require('./utils/RequestTracing');

const MEMORY_MANAGER_DIST_PATH = './../dist/memory/MemoryManager';
const MEMORY_MANAGER_TS_PATH = './memory/MemoryManager.ts';

function createMemoryModuleLoadError({ attemptedTargets, distError, tsNodeError, tsSourceError }) {
  const error = new Error(
    `Failed to load MemoryManager module. Tried compiled output and development fallback.`
  );
  error.name = 'CerebriaMemoryModuleLoadError';
  error.code = 'CEREBRIA_MEMORY_MANAGER_LOAD_FAILED';
  error.details = {
    attemptedTargets,
    remediation: [
      'Run `npm run build` to generate dist artifacts.',
      'If you run from source, install dev dependencies and ensure `ts-node/register/transpile-only` is available.'
    ],
    distError: distError ? { name: distError.name, message: distError.message, code: distError.code } : null,
    tsNodeError: tsNodeError ? { name: tsNodeError.name, message: tsNodeError.message, code: tsNodeError.code } : null,
    tsSourceError: tsSourceError ? { name: tsSourceError.name, message: tsSourceError.message, code: tsSourceError.code } : null
  };
  return error;
}

function loadMemoryModule() {
  const attemptedTargets = [];
  let distError = null;
  let tsNodeError = null;
  let tsSourceError = null;

  attemptedTargets.push(path.resolve(__dirname, MEMORY_MANAGER_DIST_PATH));
  try {
    // eslint-disable-next-line global-require
    return require(MEMORY_MANAGER_DIST_PATH);
  } catch (error) {
    distError = error;
  }

  attemptedTargets.push('ts-node/register/transpile-only');
  try {
    // eslint-disable-next-line global-require
    require('ts-node/register/transpile-only');
  } catch (error) {
    tsNodeError = error;
  }

  if (!tsNodeError) {
    attemptedTargets.push(path.resolve(__dirname, MEMORY_MANAGER_TS_PATH));
    try {
      // eslint-disable-next-line global-require
      return require(MEMORY_MANAGER_TS_PATH);
    } catch (error) {
      tsSourceError = error;
    }
  }

  throw createMemoryModuleLoadError({ attemptedTargets, distError, tsNodeError, tsSourceError });
}

function getCreateLimbicDBMemoryManager(memoryModule) {
  if (typeof memoryModule.createLimbicDBMemoryManager !== 'function') {
    const error = new Error('createLimbicDBMemoryManager is not available in loaded MemoryManager module.');
    error.name = 'CerebriaMemoryModuleLoadError';
    error.code = 'CEREBRIA_MEMORY_MANAGER_EXPORT_MISSING';
    error.details = {
      expectedExport: 'createLimbicDBMemoryManager',
      remediation: [
        'Run `npm run build` to generate dist artifacts.',
        'Verify memory module exports in dist and source are aligned.'
      ]
    };
    throw error;
  }

  return memoryModule.createLimbicDBMemoryManager;
}

const memoryModule = loadMemoryModule();
const { MemoryManager } = memoryModule;
const createLimbicDBMemoryManager = getCreateLimbicDBMemoryManager(memoryModule);

// 持久化模块（可能不可用）
let PersistentTaskManager = null;
let PersistentLogManager = null;
let PersistentPolicyManager = null;
let PersistentBackupManager = null;
let CogniDatabase = null;

try {
  // eslint-disable-next-line global-require
  PersistentTaskManager = require('./persistence/PersistentTaskManager');
  // eslint-disable-next-line global-require
  PersistentLogManager = require('./persistence/PersistentLogManager');
  // eslint-disable-next-line global-require
  PersistentPolicyManager = require('./persistence/PersistentPolicyManager');
  // eslint-disable-next-line global-require
  PersistentBackupManager = require('./persistence/PersistentBackupManager');
  // eslint-disable-next-line global-require
  CogniDatabase = require('./persistence/Database');
} catch (error) {
  // 持久化模块可能不可用（缺少依赖或文件）
  console.warn('⚠️  Persistent modules not available:', error.message);
}

// Main Cerebria class
class Cerebria {
  static async initialize(options = {}) {
    const config = options.mode || 'standard';
    const memoryManager = new MemoryManager();
    return {
      taskManager: new TaskManager(options),
      personalityManager: new PersonalityManager(options),
      logManager: new LogManager(options),
      backupManager: new BackupManager(options),
      scheduler: new IntelligentScheduler(options),
      healthMonitor: new HealthMonitor(options),
      memoryManager,
      get memory() { return memoryManager; }
    };
  }
  
  static async initializeWithLimbicDB(options = {}) {
    const config = options.mode || 'standard';
    const memoryPath = options.memoryPath || './agent.limbic';
    const memoryManager = await createLimbicDBMemoryManager(memoryPath);
    
    return {
      taskManager: new TaskManager(options),
      personalityManager: new PersonalityManager(options),
      logManager: new LogManager(options),
      backupManager: new BackupManager(options),
      scheduler: new IntelligentScheduler(options),
      healthMonitor: new HealthMonitor(options),
      memoryManager,
      get memory() { return memoryManager; }
    };
  }
  
  static async initializeWithPersistence(options = {}) {
    const config = options.mode || 'standard';
    const usePersistence = options.persistent !== false;
    
    // 检查持久化是否可用
    if (usePersistence && !PersistentTaskManager) {
      console.warn('⚠️  Persistence not available, falling back to memory storage');
      return this.initialize(options);
    }
    
    const components = {
      personalityManager: new PersonalityManager(options),
      logManager: new LogManager(options),
      backupManager: new BackupManager(options), // 默认内存版，下面可能被覆盖
      scheduler: new IntelligentScheduler(options),
      healthMonitor: new HealthMonitor(options)
    };
    
    // 使用持久化或内存版TaskManager
    if (usePersistence && PersistentTaskManager) {
      components.taskManager = new PersistentTaskManager(options);
      await components.taskManager.initialize();
    } else {
      components.taskManager = new TaskManager(options);
    }
    
    // 使用持久化或内存版LogManager
    if (usePersistence && PersistentLogManager) {
      components.logManager = new PersistentLogManager(options);
      await components.logManager.initialize();
    }
    
    // 使用持久化或内存版PolicyManager
    if (usePersistence && PersistentPolicyManager) {
      components.personalityManager = new PersistentPolicyManager(options);
      await components.personalityManager.initialize();
    }
    
    // 使用持久化或内存版BackupManager
    if (usePersistence && PersistentBackupManager) {
      components.backupManager = new PersistentBackupManager(options);
      await components.backupManager.initialize();
    }
    
    return components;
  }
  
  static isPersistenceAvailable() {
    return !!PersistentTaskManager && !!CogniDatabase;
  }
  
  static async start() {
    console.log('🚀 Cerebria v1.2.0 started - A local-first, governed, recoverable agent runtime');
  }
}

module.exports = {
  // Main class
  Cerebria,
  
  // Manager modules
  TaskManager,
  PersonalityManager,
  LogManager,
  BackupManager,
  IntelligentScheduler,
  HealthMonitor,
  MemoryManager,
  
  // 持久化模块（如果可用）
  ...(PersistentTaskManager && { PersistentTaskManager }),
  ...(PersistentLogManager && { PersistentLogManager }),
  ...(PersistentPolicyManager && { PersistentPolicyManager }),
  ...(PersistentBackupManager && { PersistentBackupManager }),
  ...(CogniDatabase && { CogniDatabase }),
  
  // Core infrastructure
  ConfigManager,
  EventBus,
  FileLock,
  RetryManager,
  ErrorHandler,
  CerebriaError,
  Metrics,
  Validator,
  ValidationError,
  RequestTracing,
  
  /**
   * Initialize the Cerebria system (memory-based)
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
      healthMonitor: new HealthMonitor(options),
      memoryManager: new MemoryManager()
    };
  },
  
  /**
   * Initialize the Cerebria system with LimbicDB memory backend
   * @param {Object} options - Configuration options
   * @param {string} [options.mode='standard'] - Operation mode
   * @param {string} [options.dataDir='./data'] - Data directory
   * @param {string} [options.memoryPath='./agent.limbic'] - LimbicDB file path
   * @returns {Promise<Object>} Initialized system components
   */
  async initializeWithLimbicDB(options = {}) {
    const config = options.mode || 'standard';
    const memoryPath = options.memoryPath || './agent.limbic';
    
    return {
      taskManager: new TaskManager(options),
      personalityManager: new PersonalityManager(options),
      logManager: new LogManager(options),
      backupManager: new BackupManager(options),
      scheduler: new IntelligentScheduler(options),
      healthMonitor: new HealthMonitor(options),
      memoryManager: await createLimbicDBMemoryManager(memoryPath)
    };
  },
  
  /**
   * Initialize the Cerebria system with persistence (if available)
   * @param {Object} options - Configuration options
   * @param {string} [options.mode='standard'] - Operation mode
   * @param {string} [options.dataDir='./data'] - Data directory
   * @param {boolean} [options.persistent=true] - Enable persistence
   * @returns {Promise<Object>} Initialized system components
   */
  async initializeWithPersistence(options = {}) {
    const config = options.mode || 'standard';
    const usePersistence = options.persistent !== false;
    
    // 检查持久化是否可用
    if (usePersistence && !PersistentTaskManager) {
      console.warn('⚠️  Persistence not available, falling back to memory storage');
      return this.initialize(options);
    }
    
    const components = {
      personalityManager: new PersonalityManager(options),
      logManager: new LogManager(options),
      backupManager: new BackupManager(options), // 默认内存版，下面可能被覆盖
      scheduler: new IntelligentScheduler(options),
      healthMonitor: new HealthMonitor(options)
    };
    
    // 使用持久化或内存版TaskManager
    if (usePersistence && PersistentTaskManager) {
      components.taskManager = new PersistentTaskManager(options);
      await components.taskManager.initialize();
    } else {
      components.taskManager = new TaskManager(options);
    }
    
    // 使用持久化或内存版LogManager
    if (usePersistence && PersistentLogManager) {
      components.logManager = new PersistentLogManager(options);
      await components.logManager.initialize();
    }
    
    // 使用持久化或内存版PolicyManager
    if (usePersistence && PersistentPolicyManager) {
      components.personalityManager = new PersistentPolicyManager(options);
      await components.personalityManager.initialize();
    }
    
    // 使用持久化或内存版BackupManager
    if (usePersistence && PersistentBackupManager) {
      components.backupManager = new PersistentBackupManager(options);
      await components.backupManager.initialize();
    }
    
    return components;
  },
  
  /**
   * Check if persistence is available
   * @returns {boolean} True if persistent storage is available
   */
  isPersistenceAvailable() {
    return !!PersistentTaskManager && !!CogniDatabase;
  },
  
  /**
   * Start the Cerebria runtime
   * @returns {Promise<void>}
   */
  async start() {
    console.log('🚀 Cerebria v1.2.0 started - A local-first, governed, recoverable agent runtime');
  }
};
