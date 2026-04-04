/**
 * ErrorHandler - Unified Error Handling
 */

class CerebriaError extends Error {
  [key: string]: any;
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'CerebriaError';
  }
}

class ErrorHandler {
  [key: string]: any;
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

export { ErrorHandler, CerebriaError };