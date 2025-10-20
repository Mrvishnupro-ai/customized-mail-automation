export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
}

export class Logger {
  private logs: LogEntry[] = [];
  private sessionId: string;
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private currentLevel: LogLevel = LogLevel.INFO;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadLogsFromStorage();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setLogLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private addLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    this.logs.push({
      ...entry,
      sessionId: this.sessionId,
      requestId: entry.requestId || this.generateRequestId(),
    });

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Save to localStorage for persistence
    this.saveLogsToStorage();
    
    // Also console log for development
    this.consoleLog(entry);
  }

  private consoleLog(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] ${LogLevel[entry.level]}:`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.data || '');
        break;
    }
  }

  private saveLogsToStorage(): void {
    try {
      localStorage.setItem('app_logs', JSON.stringify(this.logs.slice(-100))); // Save last 100 logs
    } catch (error) {
      console.warn('Failed to save logs to localStorage:', error);
    }
  }

  private loadLogsFromStorage(): void {
    try {
      const savedLogs = localStorage.getItem('app_logs');
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
    } catch (error) {
      console.warn('Failed to load logs from localStorage:', error);
      this.logs = [];
    }
  }

  debug(message: string, data?: any, meta?: Partial<LogEntry>): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      data,
      ...meta,
    });
  }

  info(message: string, data?: any, meta?: Partial<LogEntry>): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      data,
      ...meta,
    });
  }

  warn(message: string, data?: any, meta?: Partial<LogEntry>): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      data,
      ...meta,
    });
  }

  error(message: string, data?: any, meta?: Partial<LogEntry>): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      data,
      ...meta,
    });
  }

  // Log API calls specifically
  apiCall(endpoint: string, method: string, requestData?: any, requestId?: string): void {
    this.info('API Call Started', {
      endpoint,
      method,
      requestData,
      timestamp: Date.now(),
    }, {
      component: 'API',
      action: 'request',
      requestId,
    });
  }

  apiResponse(endpoint: string, status: number, responseData?: any, requestId?: string, duration?: number): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.addLog({
      timestamp: new Date().toISOString(),
      level,
      message: `API Response: ${status}`,
      data: {
        endpoint,
        status,
        responseData,
        duration,
      },
      component: 'API',
      action: 'response',
      requestId,
    });
  }

  // Log email sending operations
  emailSendStart(emailData: any, requestId?: string): void {
    this.info('Email Send Started', {
      to: emailData.to_email,
      subject: emailData.subject,
      timestamp: Date.now(),
    }, {
      component: 'EmailService',
      action: 'send_start',
      requestId,
    });
  }

  emailSendSuccess(emailData: any, messageId?: string, requestId?: string): void {
    this.info('Email Send Success', {
      to: emailData.to_email,
      messageId,
      timestamp: Date.now(),
    }, {
      component: 'EmailService',
      action: 'send_success',
      requestId,
    });
  }

  emailSendError(emailData: any, error: string, requestId?: string): void {
    this.error('Email Send Error', {
      to: emailData.to_email,
      error,
      timestamp: Date.now(),
    }, {
      component: 'EmailService',
      action: 'send_error',
      requestId,
    });
  }

  // Get logs for display
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
    this.saveLogsToStorage();
    this.info('Logs cleared');
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      exportTime: new Date().toISOString(),
      logs: this.logs,
    }, null, 2);
  }

  // Get performance metrics
  getMetrics(): {
    totalLogs: number;
    errorCount: number;
    warnCount: number;
    apiCalls: number;
    sessionDuration: number;
  } {
    const errorCount = this.logs.filter(log => log.level === LogLevel.ERROR).length;
    const warnCount = this.logs.filter(log => log.level === LogLevel.WARN).length;
    const apiCalls = this.logs.filter(log => log.component === 'API').length;
    
    const firstLog = this.logs[0];
    const sessionDuration = firstLog 
      ? Date.now() - new Date(firstLog.timestamp).getTime() 
      : 0;

    return {
      totalLogs: this.logs.length,
      errorCount,
      warnCount,
      apiCalls,
      sessionDuration,
    };
  }
}

export const logger = new Logger();

// Set log level based on environment
if (import.meta.env.DEV) {
  logger.setLogLevel(LogLevel.DEBUG);
} else {
  logger.setLogLevel(LogLevel.INFO);
}