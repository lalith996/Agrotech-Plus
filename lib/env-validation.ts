/**
 * Environment Variable Validation
 * Validates required environment variables at application startup
 * Prevents runtime errors from missing configuration
 */

import { z } from 'zod';

// Define the schema for environment variables
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // NextAuth
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET must be at least 32 characters')
    .refine(
      (val) => val !== 'your-secret-key-here-change-in-production',
      'NEXTAUTH_SECRET must be changed from default value'
    ),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),

  // Security Keys (CRITICAL - No defaults allowed)
  CSRF_SECRET: z
    .string()
    .min(32, 'CSRF_SECRET must be at least 32 characters')
    .optional()
    .refine(
      (val) => !val || val !== 'default-csrf-secret',
      'CSRF_SECRET must not use default value'
    ),
  ENCRYPTION_KEY: z
    .string()
    .min(32, 'ENCRYPTION_KEY must be at least 32 characters')
    .optional()
    .refine(
      (val) => !val || val !== 'default-encryption-key',
      'ENCRYPTION_KEY must not use default value'
    ),

  // Node Environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Optional: AWS S3 (grouped - all or none)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Optional: Email
  EMAIL_SERVER_HOST: z.string().optional(),
  EMAIL_SERVER_PORT: z.string().optional(),
  EMAIL_SERVER_USER: z.string().optional(),
  EMAIL_SERVER_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),

  // Optional: SMS
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Optional: Payment
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Optional: OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Optional: Redis
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().optional(),

  // Optional: Search
  ELASTICSEARCH_URL: z.string().url().optional(),
  ELASTICSEARCH_USERNAME: z.string().optional(),
  ELASTICSEARCH_PASSWORD: z.string().optional(),
  ELASTICSEARCH_AUTH: z.string().optional(),

  // Optional: Maps
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),

  // Optional: Monitoring
  SENTRY_DSN: z.string().url().optional(),

  // Optional: Replit
  REPLIT_DEV_DOMAIN: z.string().optional(),
  REPLIT_DOMAINS: z.string().optional(),

  // Optional: Contact
  CONTACT_FORM_TO_EMAIL: z.string().email().optional(),
});

// Infer TypeScript type from schema
export type Env = z.infer<typeof envSchema>;

// Validate and parse environment variables
export function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);

    // Additional cross-field validations
    const warnings: string[] = [];

    // Check if AWS S3 is partially configured
    const s3Fields = [
      parsed.AWS_ACCESS_KEY_ID || parsed.S3_ACCESS_KEY_ID,
      parsed.AWS_SECRET_ACCESS_KEY || parsed.S3_SECRET_ACCESS_KEY,
      parsed.AWS_REGION || parsed.S3_REGION,
      parsed.AWS_S3_BUCKET || parsed.S3_BUCKET_NAME,
    ];
    const s3Configured = s3Fields.filter(Boolean).length;
    if (s3Configured > 0 && s3Configured < 4) {
      warnings.push(
        'AWS S3 is partially configured. All of AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET should be set.'
      );
    }

    // Check if email is partially configured
    const emailFields = [
      parsed.EMAIL_SERVER_HOST,
      parsed.EMAIL_SERVER_PORT,
      parsed.EMAIL_SERVER_USER,
      parsed.EMAIL_SERVER_PASSWORD,
    ];
    const emailConfigured = emailFields.filter(Boolean).length;
    if (emailConfigured > 0 && emailConfigured < 4) {
      warnings.push(
        'Email is partially configured. All email server fields should be set.'
      );
    }

    // Check if SendGrid is configured as alternative
    if (!parsed.SENDGRID_API_KEY && emailConfigured === 0) {
      warnings.push(
        'No email service configured. Either configure SMTP or SendGrid.'
      );
    }

    // Check if Twilio is partially configured
    const twilioFields = [
      parsed.TWILIO_ACCOUNT_SID,
      parsed.TWILIO_AUTH_TOKEN,
      parsed.TWILIO_PHONE_NUMBER,
    ];
    const twilioConfigured = twilioFields.filter(Boolean).length;
    if (twilioConfigured > 0 && twilioConfigured < 3) {
      warnings.push(
        'Twilio is partially configured. All Twilio fields should be set.'
      );
    }

    // Check if Stripe is partially configured
    const stripeFields = [parsed.STRIPE_SECRET_KEY, parsed.STRIPE_PUBLISHABLE_KEY];
    const stripeConfigured = stripeFields.filter(Boolean).length;
    if (stripeConfigured > 0 && stripeConfigured < 2) {
      warnings.push(
        'Stripe is partially configured. Both STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY should be set.'
      );
    }

    // Production-specific checks
    if (parsed.NODE_ENV === 'production') {
      const productionWarnings: string[] = [];

      if (!parsed.CSRF_SECRET) {
        productionWarnings.push('CSRF_SECRET is not set in production');
      }

      if (!parsed.ENCRYPTION_KEY) {
        productionWarnings.push('ENCRYPTION_KEY is not set in production');
      }

      if (!s3Fields.every(Boolean)) {
        productionWarnings.push(
          'AWS S3 is not fully configured in production. File uploads may fail.'
        );
      }

      if (productionWarnings.length > 0) {
        console.error('❌ PRODUCTION ENVIRONMENT ERRORS:');
        productionWarnings.forEach((warning) => {
          console.error(`   - ${warning}`);
        });
        throw new Error(
          'Critical environment variables missing for production. See errors above.'
        );
      }
    }

    // Log warnings if any
    if (warnings.length > 0) {
      console.warn('⚠️  Environment Configuration Warnings:');
      warnings.forEach((warning) => {
        console.warn(`   - ${warning}`);
      });
    }

    console.log('✅ Environment variables validated successfully');
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment Variable Validation Failed:');
      console.error('');
      error.errors.forEach((err) => {
        console.error(`   ${err.path.join('.')}: ${err.message}`);
      });
      console.error('');
      console.error('Please check your .env file and ensure all required variables are set.');
      console.error('See .env.example for reference.');
    } else {
      console.error('❌ Environment validation error:', error);
    }

    // Exit process in production to prevent running with invalid config
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }

    throw error;
  }
}

// Export validated environment
export const env = validateEnv();

// Type-safe environment variable access
export function getEnvVar(key: keyof Env): string | undefined {
  return env[key];
}

// Require an environment variable (throws if not set)
export function requireEnvVar(key: keyof Env): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}
