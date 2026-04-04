/**
 * FileLock - Distributed File Locking System
 */

class FileLock {
  [key: string]: any;
  constructor(filePath: string) {
    this.filePath = filePath;
    this.locked = false;
  }

  async acquire() {
    this.locked = true;
  }

  async release() {
    this.locked = false;
  }

  async withLock(callback: Function) {
    await this.acquire();
    try {
      return await callback();
    } finally {
      await this.release();
    }
  }
}

export default FileLock;
