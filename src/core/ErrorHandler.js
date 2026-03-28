/**
 * ErrorHandler - Unified Error Handling
 */

class CerebriaError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'CerebriaError';
  }
}

class ErrorHandler {
  static handle(error, _context = {}) {
    return new CerebriaError('UNKNOWN', error.message);
  }

  static getSuggestedRecovery(error) {
    if (error.code === 'ENOSPC') {
      return 'Free up disk space and retry';
    }
    return 'Check logs for details';
  }
}

module.exports = { ErrorHandler, CerebriaError };