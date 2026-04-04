/**
 * Cerebria - Main Entry Point v1.2.0
 * A local-first, governed, recoverable agent runtime
 */

// TypeScript Module Loading (with fallback for development without dist/)
let MemoryManager = null;
let MockMemoryBackend = null;
let LimbicDBBackend = null;

function loadMemoryModules() {
  try {
    const distModules = require('./../dist/memory/MemoryManager');
    MemoryManager = distModules.MemoryManager;
    MockMemoryBackend = distModules.MockMemoryBackend;
    LimbicDBBackend = distModules.LimbicDBBackend;
    return true;
  } catch (e) {
    try {
      const tsPath = require.resolve('./memory/MemoryManager.ts');
      if (tsPath) throw new Error('dist/ not found. Run "npm run build" or "npm install" to compile TypeScript.');
    } catch (e2) {
      if (e2.message.includes('npm run build')) console.warn('WARNING: TypeScript not compiled. Run "npm run build" first.');
    }
  }
  return false;
}

loadMemoryModules();

const TaskManager = require('./task_manager');
const PersonalityManager = require('./personality_manager');
const LogManager = require('./log_manager');
const BackupManager = require('./backup_manager');
const IntelligentScheduler = require('./scheduler');
const HealthMonitor = require('./health_monitor');

const ConfigManager = require('./core/ConfigManager');
const EventBus = require('./core/EventBus');
const FileLock = require('./core/FileLock');
const RetryManager = require('./core/RetryManager');
const { ErrorHandler, CerebriaError } = require('./core/ErrorHandler');
const Metrics = require('./core/Metrics');
const { Validator, ValidationError } = require('./utils/Validator');
const RequestTracing = require('./utils/RequestTracing');

let PersistentTaskManager = null;
let PersistentLogManager = null;
let PersistentPolicyManager = null;
let PersistentBackupManager = null;
let CerebriaDatabase = null;

function loadPersistenceModules() {
  try {
    CerebriaDatabase = require('./persistence/Database');
    PersistentTaskManager = require('./persistence/PersistentTaskManager');
    PersistentLogManager = require('./persistence/PersistentLogManager');
    PersistentPolicyManager = require('./persistence/PersistentPolicyManager');
    PersistentBackupManager = require('./persistence/PersistentBackupManager');
    return true;
  } catch (error) {
    console.warn('WARNING: Persistence modules not available:', error.message);
    return false;
  }
}

loadPersistenceModules();

const DEFAULT_OPTIONS = { mode: 'standard', dataDir: './data', memoryPath: './agent.limbic', persistent: true };
const MODE_CONFIGS = {
  light:      { cacheSize: 10,  maxBackups: 3,  logLevel: 'warn', healthCheckInterval: 60000 },
  standard:   { cacheSize: 50,  maxBackups: 10, logLevel: 'info', healthCheckInterval: 30000 },
  performance:{ cacheSize: 200, maxBackups: 20, logLevel: 'info', healthCheckInterval: 15000 },
};

function mergeOptions(options = {}) {
  const mode = options.mode || 'standard';
  const modeConfig = MODE_CONFIGS[mode] || MODE_CONFIGS.standard;
  return Object.assign({}, DEFAULT_OPTIONS, modeConfig, options);
}

class CerebriaRuntime {
  constructor(components, config) {
    this._components = components;
    this._config = config;
    this._eventBus = new EventBus();
    this.task = components.taskManager;
    this.log = components.logManager;
    this.backup = components.backupManager;
    this.memory = components.memoryManager;
    this.health = components.healthMonitor;
    this.scheduler = components.scheduler;
    this.policy = components.policyManager;
    this.personality = components.personalityManager;
    this.events = this._eventBus;
    this.version = '1.2.0';
    this.startedAt = null;
    this.closed = false;
    if (this.health && this.health.setComponents) {
      this.health.setComponents({ taskManager: components.taskManager, logManager: components.logManager, memoryManager: components.memoryManager });
    }
  }

  get mode()  { return this._config.mode; }
  get config(){ return Object.assign({}, this._config); }

  async start() {
    if (this.closed) throw new CerebriaError('Runtime has been closed. Create a new instance.');
    this.startedAt = new Date();
    console.log('Cerebria v1.2.0 started - Mode: ' + this._config.mode + ' | Data: ' + this._config.dataDir);
    this._eventBus.emit('cerebria.started', { version: this.version, mode: this._config.mode, timestamp: this.startedAt });
    if (this.scheduler && typeof this.scheduler.start === 'function') await this.scheduler.start();
    return this;
  }

  async close() {
    if (this.closed) return;
    console.log('Closing Cerebria runtime...');
    this._eventBus.emit('cerebria.closing', { timestamp: new Date() });
    if (this.scheduler && typeof this.scheduler.stop === 'function') await this.scheduler.stop();
    const promises = [];
    for (const [name, component] of Object.entries(this._components)) {
      if (component && typeof component.close === 'function') {
        promises.push(component.close().catch(err => console.warn('Error closing ' + name + ':', err.message)));
      }
    }
    await Promise.all(promises);
    this.closed = true;
    console.log('Cerebria runtime closed');
  }
}

async function createMemoryManager(options) {
  if (!MemoryManager) throw new CerebriaError('MemoryManager not loaded. Run "npm install" or "npm run build" first.');
  if (options.limbicdb) {
    try {
      const { createLimbicDBMemoryManager } = require('./memory/MemoryManager');
      return await createLimbicDBMemoryManager(options.memoryPath);
    } catch (e) {
      console.warn('WARNING: LimbicDB not available, falling back to MockBackend:', e.message);
      return new MemoryManager();
    }
  }
  return new MemoryManager();
}

async function buildComponents(options) {
  const opts = mergeOptions(options);
  const persistenceAvailable = isPersistenceAvailable();
  const usePersistence = opts.persistent !== false && persistenceAvailable;
  const memoryManager = await createMemoryManager({ limbicdb: opts.limbicdb, memoryPath: opts.memoryPath });
  const taskManager = usePersistence && PersistentTaskManager ? new PersistentTaskManager(opts) : new TaskManager(opts);
  const logManager  = usePersistence && PersistentLogManager  ? new PersistentLogManager(opts)  : new LogManager(opts);
  const backupManager= usePersistence && PersistentBackupManager ? new PersistentBackupManager(opts) : new BackupManager(opts);
  const policyManager= usePersistence && PersistentPolicyManager ? new PersistentPolicyManager(opts) : null;
  const personalityManager = new PersonalityManager(opts);
  const scheduler = new IntelligentScheduler(opts);
  const healthMonitor = new HealthMonitor(opts);
  const initPromises = [];
  if (usePersistence) {
    if (taskManager.initialize) initPromises.push(taskManager.initialize());
    if (logManager.initialize)  initPromises.push(logManager.initialize());
    if (backupManager.initialize) initPromises.push(backupManager.initialize());
    if (policyManager && policyManager.initialize) initPromises.push(policyManager.initialize());
  }
  await Promise.all(initPromises);
  return { taskManager, logManager, backupManager, memoryManager, policyManager, personalityManager, scheduler, healthMonitor };
}

async function initialize(options = {}) {
  const components = await buildComponents(Object.assign({}, options, { persistent: false }));
  return new CerebriaRuntime(components, mergeOptions(options));
}

async function initializeWithLimbicDB(options = {}) {
  const components = await buildComponents(Object.assign({}, options, { limbicdb: true }));
  return new CerebriaRuntime(components, mergeOptions(options));
}

async function initializeWithPersistence(options = {}) {
  if (!isPersistenceAvailable()) {
    console.warn('WARNING: Persistence not available, falling back to memory storage');
    return initialize(options);
  }
  const components = await buildComponents(Object.assign({}, options, { persistent: true }));
  return new CerebriaRuntime(components, mergeOptions(options));
}

function isPersistenceAvailable() { return !!(PersistentTaskManager && CerebriaDatabase); }

module.exports = {
  CerebriaRuntime, initialize, initializeWithLimbicDB, initializeWithPersistence, isPersistenceAvailable,
  TaskManager, PersonalityManager, LogManager, BackupManager, IntelligentScheduler, HealthMonitor,
  ...(MemoryManager && { MemoryManager }),
  ...(MockMemoryBackend && { MockMemoryBackend }),
  ...(LimbicDBBackend && { LimbicDBBackend }),
  ...(PersistentTaskManager && { PersistentTaskManager }),
  ...(PersistentLogManager && { PersistentLogManager }),
  ...(PersistentPolicyManager && { PersistentPolicyManager }),
  ...(PersistentBackupManager && { PersistentBackupManager }),
  ...(CerebriaDatabase && { CerebriaDatabase }),
  ConfigManager, EventBus, FileLock, RetryManager, ErrorHandler, CerebriaError,
  Metrics, Validator, ValidationError, RequestTracing,
};
