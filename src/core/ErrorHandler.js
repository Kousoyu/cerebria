/**
 * ErrorHandler - Unified Error Handling
 */

class CogniCoreError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'CogniCoreError';
  }
}

class ErrorHandler {
  static handle(error, _context = {}) {
    return new CogniCoreError('UNKNOWN', error.message);
  }

  static getSuggestedRecovery(error) {
    if (error.code === 'ENOSPC') {
      return 'Free up disk space and retry';
    }
    return 'Check logs for details';
  }
}

module.exports = { ErrorHandler, CogniCoreError };