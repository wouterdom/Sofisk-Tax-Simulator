import { Injectable } from '@angular/core';

export enum LogLevel {
  Debug = 'DEBUG',
  Info = 'INFO',
  Warning = 'WARNING',
  Error = 'ERROR'
}

@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  private readonly LOG_PREFIX = 'Sofisk Tax';

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.Debug, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.Info, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.Warning, message, ...args);
  }

  error(message: string, error?: Error, ...args: any[]): void {
    this.log(LogLevel.Error, message, ...(error ? [error, ...args] : args));
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${this.LOG_PREFIX}] [${timestamp}] [${level}] ${message}`;

    switch (level) {
      case LogLevel.Debug:
        console.debug(formattedMessage, ...args);
        break;
      case LogLevel.Info:
        console.info(formattedMessage, ...args);
        break;
      case LogLevel.Warning:
        console.warn(formattedMessage, ...args);
        break;
      case LogLevel.Error:
        console.error(formattedMessage, ...args);
        break;
    }
  }
}