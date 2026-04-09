/**
 * Unit tests for core utility modules:
 * FileLock, RetryManager, ConfigManager, ErrorHandler, Metrics,
 * Validator, RequestTracing, HealthMonitor
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

// ─── FileLock ────────────────────────────────────────────────────────────────

import FileLock from '../../src/core/FileLock';

describe('FileLock', () => {
  let tmpDir: string;
  let lockBase: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebria-lock-'));
    lockBase = path.join(tmpDir, 'test-resource');
  });

  afterEach(() => {
    // Clean up any leftover lock files
    const lockFile = `${lockBase}.lock`;
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('acquires and releases a lock', async () => {
    const lock = new FileLock(lockBase);
    await lock.acquire();
    expect(lock.locked).toBe(true);
    await lock.release();
    expect(lock.locked).toBe(false);
  });

  it('creates a .lock file on disk when acquired', async () => {
    const lock = new FileLock(lockBase);
    await lock.acquire();
    expect(fs.existsSync(`${lockBase}.lock`)).toBe(true);
    await lock.release();
    expect(fs.existsSync(`${lockBase}.lock`)).toBe(false);
  });

  it('withLock executes the callback and releases on success', async () => {
    const lock = new FileLock(lockBase);
    let ran = false;
    const result = await lock.withLock(async () => {
      ran = true;
      return 42;
    });
    expect(ran).toBe(true);
    expect(result).toBe(42);
    expect(fs.existsSync(`${lockBase}.lock`)).toBe(false);
  });

  it('withLock releases the lock even when the callback throws', async () => {
    const lock = new FileLock(lockBase);
    await expect(
      lock.withLock(async () => {
        throw new Error('cb error');
      })
    ).rejects.toThrow('cb error');
    expect(fs.existsSync(`${lockBase}.lock`)).toBe(false);
  });

  it('a second acquire fails if the lock file already exists (no retry)', async () => {
    const lock1 = new FileLock(lockBase, { maxRetries: 0 });
    await lock1.acquire();

    const lock2 = new FileLock(lockBase, { maxRetries: 0 });
    await expect(lock2.acquire()).rejects.toThrow('FileLock');

    await lock1.release();
  });

  it('retries and acquires after the lock is released by another holder', async () => {
    const lock1 = new FileLock(lockBase);
    await lock1.acquire();

    // Schedule release after 80ms — well within lock2's retry window
    // (maxRetries=10 × retryDelayMs=20 gives up to ~10s of attempts).
    const releaseTimer = setTimeout(() => lock1.release(), 80);

    const lock2 = new FileLock(lockBase, { maxRetries: 10, retryDelayMs: 20 });
    await expect(lock2.acquire()).resolves.toBeUndefined();
    clearTimeout(releaseTimer);
    await lock2.release();
  }, 5000); // explicit 5s timeout so slow CI boxes still have headroom
});

// ─── RetryManager ────────────────────────────────────────────────────────────

import RetryManager from '../../src/core/RetryManager';

describe('RetryManager', () => {
  it('returns immediately on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await RetryManager.retry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds on the second attempt', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('recovered');
    const result = await RetryManager.retry(fn, { maxRetries: 2, delay: 1 });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws the last error after exhausting all retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('persistent'));
    await expect(RetryManager.retry(fn, { maxRetries: 3, delay: 1 })).rejects.toThrow('persistent');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// ─── ConfigManager ───────────────────────────────────────────────────────────

import ConfigManager from '../../src/core/ConfigManager';

describe('ConfigManager', () => {
  it('loads standard config by default', () => {
    const cm = new ConfigManager();
    expect(cm.get('cacheSize')).toBe(50);
    expect(cm.get('maxBackups')).toBe(10);
  });

  it('loads light config', () => {
    const cm = new ConfigManager('light');
    expect(cm.get('cacheSize')).toBe(10);
  });

  it('loads performance config', () => {
    const cm = new ConfigManager('performance');
    expect(cm.get('cacheSize')).toBe(200);
  });

  it('falls back to standard for unknown mode', () => {
    const cm = new ConfigManager('unknown');
    expect(cm.get('cacheSize')).toBe(50);
  });

  it('set and get a custom key', () => {
    const cm = new ConfigManager();
    cm.set('myKey', 'myValue');
    expect(cm.get('myKey')).toBe('myValue');
  });
});

// ─── ErrorHandler ────────────────────────────────────────────────────────────

const { ErrorHandler, CerebriaError } = require('../../src/core/ErrorHandler');

describe('ErrorHandler', () => {
  it('wraps an error in CerebriaError', () => {
    const original = new Error('something broke');
    const wrapped = ErrorHandler.handle(original);
    expect(wrapped).toBeInstanceOf(CerebriaError);
    expect(wrapped.message).toBe('something broke');
    expect(wrapped.code).toBe('UNKNOWN');
  });

  it('returns ENOSPC recovery suggestion', () => {
    const msg = ErrorHandler.getSuggestedRecovery({ code: 'ENOSPC' });
    expect(msg).toMatch(/disk space/i);
  });

  it('returns generic recovery suggestion for unknown codes', () => {
    const msg = ErrorHandler.getSuggestedRecovery({ code: 'OTHER' });
    expect(msg).toMatch(/logs/i);
  });

  it('CerebriaError has correct name and code properties', () => {
    const err = new CerebriaError('DB_FAIL', 'database error');
    expect(err.name).toBe('CerebriaError');
    expect(err.code).toBe('DB_FAIL');
    expect(err.message).toBe('database error');
  });
});

// ─── Metrics ─────────────────────────────────────────────────────────────────

import Metrics from '../../src/core/Metrics';

describe('Metrics', () => {
  let metrics: Metrics;

  beforeEach(() => {
    metrics = new Metrics();
  });

  it('increments a counter', () => {
    metrics.increment('req.count');
    metrics.increment('req.count', 4);
    expect(metrics.getMetrics().counters['req.count']).toBe(5);
  });

  it('records timings', () => {
    metrics.recordTime('db.query', 12);
    metrics.recordTime('db.query', 8);
    const timers = metrics.getMetrics().timers;
    expect(timers['db.query']).toEqual([12, 8]);
  });

  it('getMetrics returns both counters and timers', () => {
    metrics.increment('a');
    metrics.recordTime('b', 1);
    const m = metrics.getMetrics();
    expect(m).toHaveProperty('counters');
    expect(m).toHaveProperty('timers');
  });
});

// ─── Validator ───────────────────────────────────────────────────────────────

const { Validator, ValidationError } = require('../../src/utils/Validator');

describe('Validator', () => {
  it('validateString passes for non-empty string', () => {
    expect(() => Validator.validateString('hello', 'field')).not.toThrow();
  });

  it('validateString throws for empty string', () => {
    expect(() => Validator.validateString('', 'field')).toThrow(ValidationError);
  });

  it('validateString throws for non-string value', () => {
    expect(() => Validator.validateString(123, 'field')).toThrow(ValidationError);
  });

  it('validatePriority passes for valid values', () => {
    ['low', 'medium', 'high', 'critical'].forEach((p) => {
      expect(() => Validator.validatePriority(p)).not.toThrow();
    });
  });

  it('validatePriority throws for invalid value', () => {
    expect(() => Validator.validatePriority('urgent')).toThrow(ValidationError);
  });

  it('validateObject passes for plain object', () => {
    expect(() => Validator.validateObject({}, 'opts')).not.toThrow();
  });

  it('validateObject throws for null', () => {
    expect(() => Validator.validateObject(null, 'opts')).toThrow(ValidationError);
  });

  it('validateObject throws for non-object', () => {
    expect(() => Validator.validateObject('string', 'opts')).toThrow(ValidationError);
  });
});

// ─── RequestTracing ──────────────────────────────────────────────────────────

import RequestTracing from '../../src/utils/RequestTracing';

describe('RequestTracing', () => {
  it('generateTraceId produces a unique non-empty string', () => {
    const id1 = RequestTracing.generateTraceId();
    const id2 = RequestTracing.generateTraceId();
    expect(id1).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('createSpan returns a span with correct fields', () => {
    const span = RequestTracing.createSpan('trace_1', 'db.query');
    expect(span.traceId).toBe('trace_1');
    expect(span.operationName).toBe('db.query');
    expect(span.logs).toEqual([]);
    expect(typeof span.startTime).toBe('number');
  });

  it('recordLog appends to span logs', () => {
    const span = RequestTracing.createSpan('t', 'op');
    RequestTracing.recordLog(span, 'step 1');
    RequestTracing.recordLog(span, 'step 2');
    expect(span.logs).toHaveLength(2);
    expect((span.logs[1] as any).message).toBe('step 2');
  });

  it('finishSpan sets duration', () => {
    const span = RequestTracing.createSpan('t', 'op');
    const finished = RequestTracing.finishSpan(span);
    expect(typeof finished.duration).toBe('number');
    expect(finished.duration).toBeGreaterThanOrEqual(0);
  });
});

// ─── HealthMonitor ───────────────────────────────────────────────────────────

import HealthMonitor from '../../src/health_monitor';

describe('HealthMonitor', () => {
  it('generates a report with healthy flag and metrics', async () => {
    const monitor = new HealthMonitor();
    const report = await monitor.generateReport();
    expect(report).toHaveProperty('healthy');
    expect(typeof report.healthy).toBe('boolean');
    expect(report.metrics).toHaveProperty('memory');
    expect(report.metrics).toHaveProperty('cpu');
    expect(report.metrics).toHaveProperty('uptime');
    expect(report.timestamp).toBeTruthy();
  });

  it('updateMetrics populates cpu and memory fields', async () => {
    const monitor = new HealthMonitor();
    await monitor.updateMetrics();
    expect(monitor.metrics.memory).toBeGreaterThanOrEqual(0);
    expect(monitor.metrics.memory).toBeLessThanOrEqual(100);
    expect(monitor.metrics.cpu).toBeGreaterThanOrEqual(0);
    expect(monitor.metrics.cpu).toBeLessThanOrEqual(100);
  });
});
