/**
 * RetryManager - Automatic Retry with Exponential Backoff
 */

class RetryManager {
  static async retry(fn, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const delay = options.delay || 1000;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
      }
    }
  }
}

module.exports = RetryManager;
