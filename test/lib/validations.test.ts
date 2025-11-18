import { describe, it, expect } from 'vitest';
import {
  productSchema,
  addressSchema,
  signUpSchema,
  signInSchema,
  changePasswordSchema,
  passwordSchema,
} from '@/lib/validations';
import { UserRole } from '@prisma/client';

describe('Password Validation', () => {
  it('should accept strong passwords', () => {
    const validPasswords = [
      'Password123!',
      'MyP@ssw0rd',
      'Str0ng!Pass',
      'Complex1@Password',
    ];

    validPasswords.forEach(password => {
      expect(() => passwordSchema.parse(password)).not.toThrow();
    });
  });

  it('should reject weak passwords', () => {
    const invalidPasswords = [
      'password',  // No uppercase, number, or special char
      'PASSWORD123!',  // No lowercase
      'Password!',  // No number
      'Password123',  // No special char
      'Pass1!',  // Too short
    ];

    invalidPasswords.forEach(password => {
      expect(() => passwordSchema.parse(password)).toThrow();
    });
  });
});

describe('Sign Up Validation', () => {
  it('should accept valid signup data', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      role: UserRole.CUSTOMER,
    };

    expect(() => signUpSchema.parse(validData)).not.toThrow();
  });

  it('should reject invalid email', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'invalid-email',
      password: 'Password123!',
      role: UserRole.CUSTOMER,
    };

    expect(() => signUpSchema.parse(invalidData)).toThrow();
  });
});

describe('Address Validation', () => {
  it('should accept valid address', () => {
    const validAddress = {
      name: 'Home',
      street: '123 Main St',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      isDefault: false,
    };

    expect(() => addressSchema.parse(validAddress)).not.toThrow();
  });
});
