/**
 * ErrorHandler - Unified Error Handling
 */

class CerebriaError extends Error {
  [key: string]: any;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'CerebriaError';
  }
}

class ErrorHandler {
  [key: string]: any;
  static handle(error: Error | any, _context: any = {}) {
    return new CerebriaError('UNKNOWN', error.message);
  }

  static getSuggestedRecovery(error: any) {
    if (error.code === 'ENOSPC') {
      return 'Free up disk space and retry';
    }
    return 'Check logs for details';
  }
}

export { ErrorHandler, CerebriaError };