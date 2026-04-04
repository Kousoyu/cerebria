// @ts-nocheck
/**
 * Cerebria - Main Entry Point v1.2.0
 * A local-first, governed, recoverable agent runtime
 */

import TaskManager  from './task_manager';
import PersonalityManager  from './personality_manager';
import LogManager  from './log_manager';
import BackupManager  from './backup_manager';
import IntelligentScheduler  from './scheduler';
import HealthMonitor  from './health_monitor';
import { MemoryManager  } from './memory/MemoryManager';

// Core infrastructure modules
import ConfigManager  from './core/ConfigManager';
import EventBus  from './core/EventBus';
import FileLock  from './core/FileLock';
import RetryManager  from './core/RetryManager';
const { ErrorHandler, CerebriaError } = require('./core/ErrorHandler');
import Metrics  from './core/Metrics';
const { Validator, ValidationError } = require('./utils/Validator');
import RequestTracing  from './utils/RequestTracing';

// 持久化模块（可能不可用）
let PersistentTaskManager: any = null;
let PersistentLogManager: any = null;
let PersistentPolicyManager: any = null;
let PersistentBackupManager: any = null;
let CogniDatabase: any = null;

try {
  // eslint-disable-next-line global-require
  PersistentTaskManager = require('./persistence/PersistentTaskManager').default || require('./persistence/PersistentTaskManager');
  // eslint-disable-next-line global-require
  PersistentLogManager = require('./persistence/PersistentLogManager').default || require('./persistence/PersistentLogManager');
  // eslint-disable-next-line global-require
  PersistentPolicyManager = require('./persistence/PersistentPolicyManager').default || require('./persistence/PersistentPolicyManager');
  // eslint-disable-next-line global-require
  PersistentBackupManager = require('./persistence/PersistentBackupManager').default || require('./persistence/PersistentBackupManager');
  // eslint-disable-next-line global-require
  CogniDatabase = require('./persistence/Database').default || require('./persistence/Database');
} catch (error) {
  // 持久化模块可能不可用（缺少依赖或文件�?  console.warn('⚠️  Persistent modules not available:', error.message);
}

// Main Cerebria class
class Cerebria {
  [key: string]: any;
  static async initialize(options: any = {}) {
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
  
  static async initializeWithLimbicDB(options: any = {}) {
    const { MemoryManager, createLimbicDBMemoryManager } = require('./memory/MemoryManager');
    
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
  
  static async initializeWithPersistence(options: any = {}) {
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
      backupManager: new BackupManager(options), // 默认内存版，下面可能被覆�?      scheduler: new IntelligentScheduler(options),
      healthMonitor: new HealthMonitor(options)
    };
    
    // 使用持久化或内存版TaskManager
    if (usePersistence && PersistentTaskManager) {
      components.taskManager = new PersistentTaskManager(options);
      await components.taskManager.initialize();
      try {
        const { recovered, tasks } = await components.taskManager.recoverOrphanedTasks();
        if (recovered > 0) {
          EventBus.getInstance().emit('system:recovery', { orphanedTasks: tasks });
        }
      } catch (err: any) {
        console.warn('⚠️  Failed to run recovery sequence:', err.message);
      }
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

export default {
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
  
  // 持久化模块（如果可用�?  ...(PersistentTaskManager && { PersistentTaskManager }),
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
  async initialize(options: any = {}) {
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
  async initializeWithLimbicDB(options: any = {}) {
    const { MemoryManager, createLimbicDBMemoryManager } = require('./memory/MemoryManager');
    
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
  async initializeWithPersistence(options: any = {}) {
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
      backupManager: new BackupManager(options), // 默认内存版，下面可能被覆�?      scheduler: new IntelligentScheduler(options),
      healthMonitor: new HealthMonitor(options)
    };
    
    // 使用持久化或内存版TaskManager
    if (usePersistence && PersistentTaskManager) {
      components.taskManager = new PersistentTaskManager(options);
      await components.taskManager.initialize();
      try {
        const { recovered, tasks } = await components.taskManager.recoverOrphanedTasks();
        if (recovered > 0) {
          EventBus.getInstance().emit('system:recovery', { orphanedTasks: tasks });
        }
      } catch (err: any) {
        console.warn('⚠️  Failed to run recovery sequence:', err.message);
      }
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
