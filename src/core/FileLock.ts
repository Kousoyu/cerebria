/**
 * FileLock - File-Based Mutual Exclusion
 * Uses an exclusive lock file on disk to coordinate access between callers
 * in the same process. Acquires by creating a `.lock` file with O_EXCL
 * (fails atomically if it already exists) and retries with exponential backoff.
 */

import fs from 'fs';

class FileLock {
  [key: string]: any;
  private readonly lockPath: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(filePath: string, options: { maxRetries?: number; retryDelayMs?: number } = {}) {
    this.lockPath = `${filePath}.lock`;
    this.maxRetries = options.maxRetries ?? 10;
    this.retryDelayMs = options.retryDelayMs ?? 50;
    this.locked = false;
  }

  async acquire(): Promise<void> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // O_EXCL | O_CREAT ensures atomic creation — fails if file already exists
        const fd = fs.openSync(this.lockPath, 'wx');
        fs.closeSync(fd);
        this.locked = true;
        return;
      } catch (err: any) {
        if (err.code !== 'EEXIST' || attempt === this.maxRetries) {
          throw new Error(`FileLock: failed to acquire lock on ${this.lockPath}: ${err.message}`);
        }
        await new Promise<void>((resolve) => setTimeout(resolve, this.retryDelayMs * Math.pow(2, attempt)));
      }
    }
  }

  async release(): Promise<void> {
    try {
      fs.unlinkSync(this.lockPath);
    } catch {
      // Ignore — lock file may have already been removed
    }
    this.locked = false;
  }

  async withLock<T>(callback: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await callback();
    } finally {
      await this.release();
    }
  }
}

export default FileLock;
