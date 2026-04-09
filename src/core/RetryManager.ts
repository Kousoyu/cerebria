/**
 * RetryManager - Automatic Retry with Exponential Backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
}

class RetryManager {
  static async retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    const delay = options.delay ?? 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        await new Promise<void>((r) => setTimeout(r, delay * Math.pow(2, i)));
      }
    }
    // Unreachable, but satisfies the compiler
    throw new Error('RetryManager: exhausted all retries');
  }
}

export default RetryManager;
