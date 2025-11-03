/**
 * Centralized Logging System
 * Provides structured logging with different log levels
 * Replaces console.log statements throughout the application
 */

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

class Logger {
  private serviceName: string;
  private environment: string;

  constructor(serviceName: string = 'agrotrack-plus') {
    this.serviceName = serviceName;
    this.environment = process.env.NODE_ENV || 'development';
  }

  private formatLog(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      environment: this.environment,
      message,
      ...(context && { context }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };

    return JSON.stringify(logEntry);
  }

  private shouldLog(level: LogLevel): boolean {
    const logLevelOrder = {
      [LogLevel.ERROR]: 0,
      [LogLevel.WARN]: 1,
      [LogLevel.INFO]: 2,
      [LogLevel.DEBUG]: 3,
    };

    const currentLevel =
      process.env.LOG_LEVEL || (this.environment === 'production' ? 'INFO' : 'DEBUG');

    return (
      logLevelOrder[level] <=
      logLevelOrder[currentLevel as LogLevel]
    );
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const logMessage = this.formatLog(LogLevel.ERROR, message, context, error);
    console.error(logMessage);

    // In production, send to error tracking service (Sentry, DataDog, etc.)
    if (this.environment === 'production') {
      this.sendToErrorTracking(message, error, context);
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const logMessage = this.formatLog(LogLevel.WARN, message, context);
    console.warn(logMessage);
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const logMessage = this.formatLog(LogLevel.INFO, message, context);
    console.log(logMessage);
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const logMessage = this.formatLog(LogLevel.DEBUG, message, context);
    console.log(logMessage);
  }

  /**
   * Log API requests
   */
  apiRequest(
    method: string,
    path: string,
    context?: LogContext
  ): void {
    this.info(`API Request: ${method} ${path}`, {
      method,
      path,
      ...context,
    });
  }

  /**
   * Log API responses
   */
  apiResponse(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? LogLevel.ERROR :
                  statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;

    const message = `API Response: ${method} ${path} ${statusCode} (${duration}ms)`;

    if (level === LogLevel.ERROR) {
      this.error(message, undefined, { method, path, statusCode, duration, ...context });
    } else if (level === LogLevel.WARN) {
      this.warn(message, { method, path, statusCode, duration, ...context });
    } else {
      this.info(message, { method, path, statusCode, duration, ...context });
    }
  }

  /**
   * Log database queries (development only)
   */
  dbQuery(query: string, duration: number, context?: LogContext): void {
    if (this.environment !== 'development') return;

    this.debug(`DB Query (${duration}ms): ${query}`, context);
  }

  /**
   * Log authentication events
   */
  auth(event: string, userId?: string, success: boolean = true, context?: LogContext): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = `Auth: ${event} - ${success ? 'Success' : 'Failed'}`;

    if (level === LogLevel.WARN) {
      this.warn(message, { event, userId, success, ...context });
    } else {
      this.info(message, { event, userId, success, ...context });
    }
  }

  /**
   * Log security events
   */
  security(event: string, context?: LogContext): void {
    this.warn(`Security Event: ${event}`, context);

    // In production, alert security team
    if (this.environment === 'production') {
      this.sendSecurityAlert(event, context);
    }
  }

  /**
   * Send logs to error tracking service (placeholder)
   */
  private sendToErrorTracking(message: string, error?: Error, context?: LogContext): void {
    // TODO: Integrate with Sentry, DataDog, or other error tracking service
    // Example with Sentry:
    // Sentry.captureException(error, { extra: context });
  }

  /**
   * Send security alerts (placeholder)
   */
  private sendSecurityAlert(event: string, context?: LogContext): void {
    // TODO: Integrate with security alerting system
    // Example: Send to Slack, PagerDuty, etc.
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.serviceName);
    // Store additional context for all future logs
    const originalFormatLog = childLogger.formatLog.bind(childLogger);
    childLogger.formatLog = (level, message, context, error) => {
      return originalFormatLog(level, message, { ...additionalContext, ...context }, error);
    };
    return childLogger;
  }
}

// Export singleton logger instance
export const logger = new Logger();

// Export helper functions for common use cases
export const logError = (message: string, error?: Error, context?: LogContext) =>
  logger.error(message, error, context);

export const logWarn = (message: string, context?: LogContext) =>
  logger.warn(message, context);

export const logInfo = (message: string, context?: LogContext) =>
  logger.info(message, context);

export const logDebug = (message: string, context?: LogContext) =>
  logger.debug(message, context);

export const logApiRequest = (method: string, path: string, context?: LogContext) =>
  logger.apiRequest(method, path, context);

export const logApiResponse = (
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: LogContext
) => logger.apiResponse(method, path, statusCode, duration, context);

export const logAuth = (event: string, userId?: string, success?: boolean, context?: LogContext) =>
  logger.auth(event, userId, success, context);

export const logSecurity = (event: string, context?: LogContext) =>
  logger.security(event, context);

export default logger;
