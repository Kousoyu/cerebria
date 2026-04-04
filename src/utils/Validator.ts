/**
 * Validator - Parameter Validation System
 */

class ValidationError extends Error {
  [key: string]: any;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class Validator {
  [key: string]: any;
  static validateString(value: any, fieldName: any) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new ValidationError(`${fieldName} must be a non-empty string`);
    }
  }

  static validatePriority(value: any) {
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(value)) {
      throw new ValidationError(`Invalid priority: ${value}`);
    }
  }

  static validateObject(value: any, fieldName: any) {
    if (typeof value !== 'object' || value === null) {
      throw new ValidationError(`${fieldName} must be an object`);
    }
  }
}

export { Validator, ValidationError };
