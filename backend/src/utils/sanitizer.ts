import validator from 'validator';

export interface FieldSanitizeResult {
  isValid: boolean;
  sanitized?: string;
  error?: string;
}

/**
 * Field sanitization & validation utility leveraging validator.js
 */
export class Sanitizer {
  /**
   * Sanitizes & validates First or Last Name
   * 
   * Rules:
   * 1. Trimmed length must be between 1 and 50 characters.
   * 2. Must contain only valid name characters (Unicode letters in any language, spaces, hyphens, apostrophes).
   * 3. Sanitizes input by escaping HTML special characters to prevent XSS.
   */
  static validateName(
    input: unknown,
    fieldName: string,
    options: { required?: boolean } = { required: false }
  ): FieldSanitizeResult {
    if (input === undefined || input === null || input === '') {
      if (options.required) {
        return { isValid: false, error: `${fieldName} is required` };
      }
      return { isValid: true, sanitized: '' };
    }

    if (typeof input !== 'string') {
      return { isValid: false, error: `${fieldName} must be a string` };
    }

    const trimmed = validator.trim(input);

    if (trimmed.length === 0) {
      if (options.required) {
        return { isValid: false, error: `${fieldName} cannot be empty` };
      }
      return { isValid: true, sanitized: '' };
    }

    if (!validator.isLength(trimmed, { min: 1, max: 50 })) {
      return { isValid: false, error: `${fieldName} must be between 1 and 50 characters` };
    }

    const namePattern = /^[\p{L}\s'\-]+$/u;
    if (!namePattern.test(trimmed)) {
      return { isValid: false, error: `${fieldName} contains invalid characters` };
    }

    const sanitized = validator.escape(trimmed);
    return { isValid: true, sanitized };
  }

  /**
   * Sanitizes & validates Email Address
   */
  static validateEmail(input: unknown, required = true): FieldSanitizeResult {
    if (input === undefined || input === null || input === '') {
      if (required) return { isValid: false, error: 'Email address is required' };
      return { isValid: true, sanitized: '' };
    }
    if (typeof input !== 'string') return { isValid: false, error: 'Email must be a string' };

    const trimmed = validator.trim(input).toLowerCase();

    if (!validator.isEmail(trimmed)) {
      return { isValid: false, error: 'Invalid email address format' };
    }

    const sanitized = validator.normalizeEmail(trimmed) as string;
    return { isValid: true, sanitized };
  }

  /**
   * Sanitizes & validates Phone Number (E.164 / international)
   */
  static validatePhone(input: unknown, required = false): FieldSanitizeResult {
    if (input === undefined || input === null || input === '') {
      if (required) return { isValid: false, error: 'Phone number is required' };
      return { isValid: true, sanitized: '' };
    }
    if (typeof input !== 'string') return { isValid: false, error: 'Phone number must be a string' };

    const trimmed = validator.trim(input);

    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    if (!phoneRegex.test(trimmed)) {
      return { isValid: false, error: 'Invalid phone number format' };
    }

    return { isValid: true, sanitized: validator.escape(trimmed) };
  }

  /**
   * Sanitizes & validates Postal / ZIP Code
   */
  static validatePostalCode(input: unknown, country = 'US', required = true): FieldSanitizeResult {
    if (input === undefined || input === null || input === '') {
      if (required) return { isValid: false, error: 'Postal code is required' };
      return { isValid: true, sanitized: '' };
    }
    if (typeof input !== 'string') return { isValid: false, error: 'Postal code must be a string' };

    const trimmed = validator.trim(input).toUpperCase();

    const isValidPostal = validator.isPostalCode(trimmed, 'any');
    if (!isValidPostal) {
      return { isValid: false, error: 'Invalid postal/ZIP code format' };
    }

    return { isValid: true, sanitized: validator.escape(trimmed) };
  }

  /**
   * Sanitizes & validates General Text Field (Street, City, State, Description)
   */
  static validateText(input: unknown, fieldName: string, maxLen = 100, required = true): FieldSanitizeResult {
    if (input === undefined || input === null || input === '') {
      if (required) return { isValid: false, error: `${fieldName} is required` };
      return { isValid: true, sanitized: '' };
    }
    if (typeof input !== 'string') return { isValid: false, error: `${fieldName} must be a string` };

    const trimmed = validator.trim(input);

    if (trimmed.length === 0 && required) {
      return { isValid: false, error: `${fieldName} cannot be empty` };
    }

    if (!validator.isLength(trimmed, { max: maxLen })) {
      return { isValid: false, error: `${fieldName} cannot exceed ${maxLen} characters` };
    }

    const sanitized = validator.escape(trimmed);
    return { isValid: true, sanitized };
  }

  /**
   * Sanitizes & validates Password Strength
   */
  static validatePassword(input: unknown, minLen = 8): FieldSanitizeResult {
    if (typeof input !== 'string') return { isValid: false, error: 'Password must be a string' };

    if (!validator.isLength(input, { min: minLen })) {
      return { isValid: false, error: `Password must be at least ${minLen} characters long` };
    }

    return { isValid: true, sanitized: input };
  }

  /**
   * Sanitizes & validates Predefined Address Label (Home, Work, Other)
   */
  static validateAddressLabel(input: unknown): FieldSanitizeResult {
    const ALLOWED_LABELS = ['Home', 'Work', 'Other'];
    if (input === undefined || input === null || input === '') {
      return { isValid: true, sanitized: 'Home' };
    }
    if (typeof input !== 'string') {
      return { isValid: false, error: 'Address label must be a string' };
    }
    const trimmed = validator.trim(input);
    const matchedLabel = ALLOWED_LABELS.find(
      (lbl) => lbl.toLowerCase() === trimmed.toLowerCase()
    );
    if (!matchedLabel) {
      return { isValid: false, error: `Address label must be one of: ${ALLOWED_LABELS.join(', ')}` };
    }
    return { isValid: true, sanitized: matchedLabel };
  }
}
