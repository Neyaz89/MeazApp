
import * as Device from 'expo-device';
import Constants from 'expo-constants';

interface ErrorReport {
  error: Error;
  context: string;
  userId?: string;
  deviceInfo: any;
  timestamp: string;
}

class ErrorReporter {
  private static instance: ErrorReporter;
  private isDev = __DEV__;

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  async reportError(error: Error, context: string, userId?: string) {
    const errorReport: ErrorReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } as Error,
      context,
      userId,
      deviceInfo: {
        platform: Device.osName,
        version: Device.osVersion,
        model: Device.modelName,
        appVersion: Constants.expoConfig?.version,
      },
      timestamp: new Date().toISOString(),
    };

    if (this.isDev) {
      console.error('🔴 Error Report:', errorReport);
    } else {
      // Send to your error tracking service (e.g., Sentry, Bugsnag)
      try {
        await this.sendToErrorService(errorReport);
      } catch (reportingError) {
        console.error('Failed to report error:', reportingError);
      }
    }
  }

  private async sendToErrorService(report: ErrorReport) {
    // Implement your error reporting service integration
    // Example: Sentry, Crashlytics, or custom endpoint
    console.log('Error reported:', report);
  }
}

export const errorReporter = ErrorReporter.getInstance();

// Global error handler
export const setupGlobalErrorHandler = () => {
  const originalHandler = ErrorUtils.getGlobalHandler();
  
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    errorReporter.reportError(error, isFatal ? 'Fatal Error' : 'JS Error');
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
};
