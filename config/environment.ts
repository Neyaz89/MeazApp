import Constants from 'expo-constants';

export interface Environment {
  name: 'development' | 'staging' | 'production';
  supabaseUrl: string;
  supabaseAnonKey: string;
  agoraAppId?: string;
  apiBaseUrl: string;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  analyticsKey?: string;
}

const environments: Record<string, Environment> = {
  development: {
    name: 'development',
    supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl || '',
    supabaseAnonKey: Constants.expoConfig?.extra?.supabaseAnonKey || '',
    agoraAppId: Constants.expoConfig?.extra?.agoraAppId,
    apiBaseUrl: 'http://localhost:3000',
    enableAnalytics: false,
    enableCrashReporting: false,
    logLevel: 'debug',
    analyticsKey: Constants.expoConfig?.extra?.analyticsKey,
  },
  staging: {
    name: 'staging',
    supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl || '',
    supabaseAnonKey: Constants.expoConfig?.extra?.supabaseAnonKey || '',
    agoraAppId: Constants.expoConfig?.extra?.agoraAppId,
    apiBaseUrl: 'https://api-staging.meaz.app',
    enableAnalytics: true,
    enableCrashReporting: true,
    logLevel: 'info',
    analyticsKey: Constants.expoConfig?.extra?.analyticsKey,
  },
  production: {
    name: 'production',
    supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl || '',
    supabaseAnonKey: Constants.expoConfig?.extra?.supabaseAnonKey || '',
    agoraAppId: Constants.expoConfig?.extra?.agoraAppId,
    apiBaseUrl: 'https://api.meaz.app',
    enableAnalytics: true,
    enableCrashReporting: true,
    logLevel: 'error',
    analyticsKey: Constants.expoConfig?.extra?.analyticsKey,
  },
};

function getCurrentEnvironment(): Environment {
  const releaseChannel = Constants.expoConfig?.releaseChannel;

  if (releaseChannel === 'production') {
    return environments.production;
  } else if (releaseChannel === 'staging') {
    return environments.staging;
  }

  return environments.development;
}

export const env = getCurrentEnvironment();

export const isDevelopment = env.name === 'development';
export const isProduction = env.name === 'production';
export const isStaging = env.name === 'staging';

// Production validation
export const validateProductionConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!env.supabaseUrl) {
    errors.push('SUPABASE_URL is required for production');
  }

  if (!env.supabaseAnonKey) {
    errors.push('SUPABASE_ANON_KEY is required for production');
  }

  if (env.name === 'production' && !env.agoraAppId) {
    errors.push('AGORA_APP_ID is required for video calls in production');
  }

  if (env.name === 'production' && env.enableAnalytics && !env.analyticsKey) {
    errors.push('Analytics key required when analytics is enabled in production');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Export the configuration
export { env };
export const env = {
  name: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  agoraAppId: process.env.AGORA_APP_ID || '',
  enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
  enableCrashReporting: process.env.ENABLE_CRASH_REPORTING === 'true',
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',
};

export default env;
