/**
 * Validator - Parameter Validation System
 */

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class Validator {
  static validateString(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new ValidationError(`${fieldName} must be a non-empty string`);
    }
  }

  static validatePriority(value) {
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(value)) {
      throw new ValidationError(`Invalid priority: ${value}`);
    }
  }

  static validateObject(value, fieldName) {
    if (typeof value !== 'object' || value === null) {
      throw new ValidationError(`${fieldName} must be an object`);
    }
  }
}

module.exports = { Validator, ValidationError };
