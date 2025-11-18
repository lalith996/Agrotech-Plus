/**
 * Server-side initialization
 * This file contains all server initialization logic that should run once when the server starts
 */

import { validateEnv } from './env-validation';
import { setupSoftDeleteMiddleware } from './soft-delete';
import { logInfo } from './logger';

let initialized = false;

/**
 * Initialize all server-side services
 * This should be called once when the server starts
 */
export function initializeServer() {
  if (initialized) {
    return;
  }

  logInfo('Initializing server...');

  try {
    // 1. Validate environment variables
    logInfo('Validating environment variables...');
    validateEnv();
    logInfo('Environment variables validated successfully');

    // 2. Setup Prisma soft delete middleware
    logInfo('Setting up soft delete middleware...');
    setupSoftDeleteMiddleware();
    logInfo('Soft delete middleware initialized successfully');

    // 3. Initialize Redis connection (if needed)
    // TODO: Add Redis initialization when ready
    // logInfo('Connecting to Redis...');
    // await connectRedis();
    // logInfo('Redis connected successfully');

    initialized = true;
    logInfo('Server initialization completed successfully');
  } catch (error) {
    logInfo('Server initialization failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Check if server is initialized
 */
export function isServerInitialized(): boolean {
  return initialized;
}
