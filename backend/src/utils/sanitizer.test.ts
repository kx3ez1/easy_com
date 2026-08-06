import { describe, it, expect } from '@jest/globals';
import { Sanitizer } from './sanitizer.ts';

describe('Sanitizer (100% full coverage test suite)', () => {

  describe('validateName', () => {
    it('should return empty sanitized when input is empty/undefined and not required', () => {
      expect(Sanitizer.validateName(undefined, 'Name')).toEqual({ isValid: true, sanitized: '' });
      expect(Sanitizer.validateName(null, 'Name')).toEqual({ isValid: true, sanitized: '' });
      expect(Sanitizer.validateName('', 'Name')).toEqual({ isValid: true, sanitized: '' });
    });

    it('should return error when required name is missing or whitespace only', () => {
      expect(Sanitizer.validateName('', 'Name', { required: true })).toEqual({
        isValid: false,
        error: 'Name is required',
      });
      expect(Sanitizer.validateName('   ', 'Name', { required: true })).toEqual({
        isValid: false,
        error: 'Name cannot be empty',
      });
    });

    it('should return error if name is not a string', () => {
      expect(Sanitizer.validateName(12345, 'Name')).toEqual({
        isValid: false,
        error: 'Name must be a string',
      });
    });

    it('should return sanitized empty string if whitespace only and not required', () => {
      expect(Sanitizer.validateName('   ', 'Name', { required: false })).toEqual({
        isValid: true,
        sanitized: '',
      });
    });

    it('should reject names containing emojis', () => {
      const res = Sanitizer.validateName('John 😀', 'First Name');
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('First Name contains invalid characters');
    });

    it('should reject names longer than 50 characters', () => {
      expect(Sanitizer.validateName('John', 'First Name')).toEqual({ isValid: true, sanitized: 'John' });
      expect(Sanitizer.validateName('A'.repeat(51), 'First Name')).toEqual({
        isValid: false,
        error: 'First Name must be between 1 and 50 characters',
      });
      expect(Sanitizer.validateName('John123', 'First Name')).toEqual({
        isValid: false,
        error: 'First Name contains invalid characters',
      });
    });
  });

  describe('validateEmail', () => {
    it('should handle missing email required vs optional', () => {
      expect(Sanitizer.validateEmail(undefined, true)).toEqual({ isValid: false, error: 'Email address is required' });
      expect(Sanitizer.validateEmail('', false)).toEqual({ isValid: true, sanitized: '' });
    });

    it('should reject non-string email', () => {
      expect(Sanitizer.validateEmail(123)).toEqual({ isValid: false, error: 'Email must be a string' });
    });

    it('should normalize and validate valid email', () => {
      expect(Sanitizer.validateEmail(' USER@Domain.COM ')).toEqual({
        isValid: true,
        sanitized: 'user@domain.com',
      });
    });

    it('should reject invalid email format', () => {
      expect(Sanitizer.validateEmail('invalid-email')).toEqual({
        isValid: false,
        error: 'Invalid email address format',
      });
    });
  });

  describe('validatePhone', () => {
    it('should handle missing phone required vs optional', () => {
      expect(Sanitizer.validatePhone(undefined, true)).toEqual({ isValid: false, error: 'Phone number is required' });
      expect(Sanitizer.validatePhone('', false)).toEqual({ isValid: true, sanitized: '' });
    });

    it('should reject non-string phone', () => {
      expect(Sanitizer.validatePhone(999)).toEqual({ isValid: false, error: 'Phone number must be a string' });
    });

    it('should validate correct and incorrect phone format', () => {
      expect(Sanitizer.validatePhone('+1 555 123 4567')).toEqual({
        isValid: true,
        sanitized: '+1 555 123 4567',
      });
      expect(Sanitizer.validatePhone('phone-abc')).toEqual({
        isValid: false,
        error: 'Invalid phone number format',
      });
    });
  });

  describe('validatePostalCode', () => {
    it('should handle missing postal code required vs optional', () => {
      expect(Sanitizer.validatePostalCode(undefined, 'US', true)).toEqual({ isValid: false, error: 'Postal code is required' });
      expect(Sanitizer.validatePostalCode('', 'US', false)).toEqual({ isValid: true, sanitized: '' });
    });

    it('should reject non-string postal code', () => {
      expect(Sanitizer.validatePostalCode(90210)).toEqual({ isValid: false, error: 'Postal code must be a string' });
    });

    it('should validate correct and incorrect postal code format', () => {
      expect(Sanitizer.validatePostalCode('90210')).toEqual({ isValid: true, sanitized: '90210' });
      expect(Sanitizer.validatePostalCode('INVALID_ZIP')).toEqual({
        isValid: false,
        error: 'Invalid postal/ZIP code format',
      });
    });
  });

  describe('validateText', () => {
    it('should handle missing text required vs optional', () => {
      expect(Sanitizer.validateText(undefined, 'Street', 100, true)).toEqual({ isValid: false, error: 'Street is required' });
      expect(Sanitizer.validateText('', 'Street', 100, false)).toEqual({ isValid: true, sanitized: '' });
    });

    it('should reject non-string text', () => {
      expect(Sanitizer.validateText(123, 'Street')).toEqual({ isValid: false, error: 'Street must be a string' });
    });

    it('should reject whitespace-only when required', () => {
      expect(Sanitizer.validateText('   ', 'Street', 100, true)).toEqual({ isValid: false, error: 'Street cannot be empty' });
    });

    it('should enforce max length', () => {
      expect(Sanitizer.validateText('abc', 'Street', 2)).toEqual({
        isValid: false,
        error: 'Street cannot exceed 2 characters',
      });
    });

    it('should sanitize HTML characters', () => {
      expect(Sanitizer.validateText('Main St <script>', 'Street')).toEqual({
        isValid: true,
        sanitized: 'Main St &lt;script&gt;',
      });
    });
  });

  describe('validatePassword', () => {
    it('should reject non-string passwords', () => {
      expect(Sanitizer.validatePassword(12345678)).toEqual({ isValid: false, error: 'Password must be a string' });
    });

    it('should enforce minimum length', () => {
      expect(Sanitizer.validatePassword('short', 8)).toEqual({
        isValid: false,
        error: 'Password must be at least 8 characters long',
      });
    });

    it('should accept valid passwords without altering special characters', () => {
      expect(Sanitizer.validatePassword('SecretPass123!@#')).toEqual({
        isValid: true,
        sanitized: 'SecretPass123!@#',
      });
    });
  });

});
