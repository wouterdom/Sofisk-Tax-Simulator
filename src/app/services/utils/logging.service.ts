import { Injectable } from '@angular/core';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  private readonly APP_NAME = 'Sofisk Tax';

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARNING, message, ...args);
  }

  error(message: string, error?: Error, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${this.APP_NAME}] [${timestamp}] [${LogLevel.ERROR}] ${message}`;
    
    if (error) {
      console.error(logMessage, error, ...args);
    } else {
      console.error(logMessage, ...args);
    }
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${this.APP_NAME}] [${timestamp}] [${level}] ${message}`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, ...args);
        break;
      case LogLevel.INFO:
        console.info(logMessage, ...args);
        break;
      case LogLevel.WARNING:
        console.warn(logMessage, ...args);
        break;
      default:
        console.log(logMessage, ...args);
    }
  }
} 