export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  operation?: string;
  batchId?: string;
  hash?: string;
  statusCode?: number;
  duration?: number;
}

export class Logger {
  private static logLevel: LogLevel = LogLevel.INFO;

  static setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  static debug(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log(this.formatMessage('🔍', message, context));
    }
  }

  static info(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(this.formatMessage('📘', message, context));
    }
  }

  static warn(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage('⚠️', message, context));
    }
  }

  static error(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(this.formatMessage('❌', message, context));
    }
  }

  static success(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(this.formatMessage('✅', message, context));
    }
  }

  static sync(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(this.formatMessage('🔄', message, context));
    }
  }

  static download(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(this.formatMessage('📥', message, context));
    }
  }

  private static formatMessage(emoji: string, message: string, context?: LogContext): string {
    let formatted = `${emoji} [SYNC] ${message}`;
    
    if (context) {
      const contextParts: string[] = [];
      
      if (context.operation) contextParts.push(`op:${context.operation}`);
      if (context.batchId) contextParts.push(`batch:${context.batchId}`);
      if (context.hash) contextParts.push(`hash:${context.hash.substring(0, 8)}...`);
      if (context.statusCode) contextParts.push(`status:${context.statusCode}`);
      if (context.duration) contextParts.push(`${context.duration}ms`);
      
      if (contextParts.length > 0) {
        formatted += ` [${contextParts.join(', ')}]`;
      }
    }
    
    return formatted;
  }
}