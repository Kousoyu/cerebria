/**
 * Cerebria - Main Entry Point v1.2.0
 * A local-first, governed, recoverable agent runtime OS
 */

import TaskManager from './task_manager';
import PersonalityManager from './personality_manager';
import LogManager from './log_manager';
import BackupManager from './backup_manager';
import IntelligentScheduler from './scheduler';
import HealthMonitor from './health_monitor';
import { MemoryManager } from './memory/MemoryManager';
import { MCPRegistry } from './mcp/MCPRegistry';

// Core infrastructure modules
import ConfigManager from './core/ConfigManager';
import EventBus from './core/EventBus';
import FileLock from './core/FileLock';
import RetryManager from './core/RetryManager';
import { AgentEngine } from './engine/AgentEngine';
import { LLMProvider, LLMConfig } from './engine/LLMProvider';
import { DashboardServer } from './server/DashboardServer';
const { ErrorHandler, CerebriaError } = require('./core/ErrorHandler');
import Metrics from './core/Metrics';
const { Validator, ValidationError } = require('./utils/Validator');
import RequestTracing from './utils/RequestTracing';

// Persistent Modules (Late Binding)
let PersistentTaskManager: any = null;
let PersistentLogManager: any = null;
let PersistentPolicyManager: any = null;
let PersistentBackupManager: any = null;
let CogniDatabase: any = null;

try {
  /* eslint-disable global-require */
  PersistentTaskManager = require('./persistence/PersistentTaskManager').default || require('./persistence/PersistentTaskManager');
  PersistentLogManager = require('./persistence/PersistentLogManager').default || require('./persistence/PersistentLogManager');
  PersistentPolicyManager = require('./persistence/PersistentPolicyManager').default || require('./persistence/PersistentPolicyManager');
  PersistentBackupManager = require('./persistence/PersistentBackupManager').default || require('./persistence/PersistentBackupManager');
  CogniDatabase = require('./persistence/Database').default || require('./persistence/Database');
  /* eslint-enable global-require */
} catch (error: any) {
  console.warn('⚠️  Persistent modules not completely available:', error.message);
}

/**
 * Standard teardown sequence for OS components
 */
async function teardownSequence(system: any) {
  console.log('\n🔄 [Cerebria OS] Initiating graceful shutdown sequence...');
  
  if (system.scheduler) {
    await system.scheduler.stop();
  }
  
  if (system.taskManager && system.taskManager.db) {
    system.taskManager.db.close();
    console.log('✅ [Cerebria OS] Persistent SQL storage flushed and safely closed');
  }
  
  if (system.dashboardServer) {
    system.dashboardServer.stop();
  }
  
  console.log('🛑 [Cerebria OS] Kernel Offline. Goodbye.');
}

/**
 * Attach OS interrupt signals to teardown sequence 
 */
function attachProcessListeners(system: any, options: any) {
  if (options.handleProcessShutdown !== false && typeof process !== 'undefined') {
    const handler = async () => {
      await teardownSequence(system);
      process.exit(0);
    };
    process.once('SIGINT', handler);
    process.once('SIGTERM', handler);
  }
}

export default {
  // Manager classes
  TaskManager,
  PersonalityManager,
  LogManager,
  BackupManager,
  IntelligentScheduler,
  HealthMonitor,
  MemoryManager,
  MCPRegistry,
  
  // Persistent classes
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
  AgentEngine,
  LLMProvider,
  
  /**
   * Initialize the Cerebria system (memory-based mode)
   */
  async initialize(options: any = {}) {
    const components: any = {
      taskManager: new TaskManager(options),
      personalityManager: new PersonalityManager(options),
      logManager: new LogManager(options),
      backupManager: new BackupManager(),
      scheduler: new IntelligentScheduler(options),
      healthMonitor: new HealthMonitor(options),
      memoryManager: new MemoryManager(),
      mcpRegistry: new MCPRegistry()
    };
    
    components.startDashboard = async (port: number = 3000) => {
      const server = new DashboardServer(components, port);
      await server.start();
      components.dashboardServer = server;
    };
    
    // Wire up Durable Execution MCP intent to WorkerPool
    components.scheduler.workerPool.registerIntentHandler('mcp:execute', async (intent: any) => {
      try {
        const result = await components.mcpRegistry.executeTool(intent.tool, intent.args);
        return result;
      } catch (err: any) {
        return { isError: true, content: [{ type: 'text', text: `Tool Intent execution failed: ${err.message}` }] };
      }
    });
    
    components.shutdown = async () => teardownSequence(components);
    attachProcessListeners(components, options);
    console.log('🚀 Cerebria Runtime Initialized (Memory Mode)');
    return components;
  },
  
  /**
   * Initialize with LimbicDB Memory Backend
   */
  async initializeWithLimbicDB(options: any = {}) {
    const { createLimbicDBMemoryManager } = require('./memory/MemoryManager');
    const memoryPath = options.memoryPath || './agent.limbic';
    
    const components: any = {
      taskManager: new TaskManager(options),
      personalityManager: new PersonalityManager(options),
      logManager: new LogManager(options),
      backupManager: new BackupManager(),
      scheduler: new IntelligentScheduler(options),
      healthMonitor: new HealthMonitor(options),
      memoryManager: await createLimbicDBMemoryManager(memoryPath),
      mcpRegistry: new MCPRegistry()
    };
    
    // Wire up Durable Execution MCP intent to WorkerPool
    components.scheduler.workerPool.registerIntentHandler('mcp:execute', async (intent: any) => {
      try {
        const result = await components.mcpRegistry.executeTool(intent.tool, intent.args);
        return result;
      } catch (err: any) {
        return { isError: true, content: [{ type: 'text', text: `Tool Intent execution failed: ${err.message}` }] };
      }
    });

    components.shutdown = async () => teardownSequence(components);
    attachProcessListeners(components, options);
    console.log('🚀 Cerebria Runtime Initialized (LimbicDB Engine)');
    return components;
  },
  
  /**
   * Initialize the Cerebria system with full persistence (SQLite)
   */
  async initializeWithPersistence(options: any = {}) {
    const usePersistence = options.persistent !== false;
    
    if (usePersistence && !PersistentTaskManager) {
      console.warn('⚠️  Persistence unavailable, falling back to memory layer.');
      return this.initialize(options);
    }
    
    const components: any = {
      personalityManager: new PersonalityManager(options),
      logManager: new LogManager(options),
      backupManager: new BackupManager(), 
      scheduler: new IntelligentScheduler(options),
      healthMonitor: new HealthMonitor(options),
      mcpRegistry: new MCPRegistry()
    };
    
    // Mount Persistent OS Components
    if (usePersistence && PersistentTaskManager) {
      components.taskManager = new PersistentTaskManager(options);
      await components.taskManager.initialize();
      try {
        const { recovered, tasks } = await components.taskManager.recoverOrphanedTasks();
        if (recovered > 0) {
          EventBus.getInstance().emit('system:recovery', { orphanedTasks: tasks });
        }
      } catch (err: any) {
        console.warn('⚠️  OS Crash Recovery encountered an issue:', err.message);
      }
    } else {
      components.taskManager = new TaskManager(options);
    }
    
    if (usePersistence && PersistentLogManager) {
      components.logManager = new PersistentLogManager(options);
      await components.logManager.initialize();
    }
    
    if (usePersistence && PersistentPolicyManager) {
      components.personalityManager = new PersistentPolicyManager(options);
      await components.personalityManager.initialize();
    }
    
    if (usePersistence && PersistentBackupManager) {
      components.backupManager = new PersistentBackupManager(options);
      await components.backupManager.initialize();
    }
    
    // Wire up Durable Execution MCP intent to WorkerPool
    components.scheduler.workerPool.registerIntentHandler('mcp:execute', async (intent: any) => {
      try {
        const result = await components.mcpRegistry.executeTool(intent.tool, intent.args);
        return result;
      } catch (err: any) {
        return { isError: true, content: [{ type: 'text', text: `Tool Intent execution failed: ${err.message}` }] };
      }
    });

    components.shutdown = async () => teardownSequence(components);
    components.startDashboard = async (port: number = 3000) => {
      const server = new DashboardServer(components, port);
      await server.start();
      components.dashboardServer = server;
    };

    attachProcessListeners(components, options);
    
    console.log('🚀 Cerebria Runtime Initialized (Persistent Enterprise Mode)');
    return components;
  },
  
  isPersistenceAvailable() {
    return !!PersistentTaskManager && !!CogniDatabase;
  }
};
