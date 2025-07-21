
import { env, validateProductionConfig } from '../config/environment';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface HealthCheck {
  category: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  impact: 'high' | 'medium' | 'low';
}

export class AppHealthChecker {
  static async runHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Configuration Health
    const configValidation = validateProductionConfig();
    checks.push({
      category: 'Configuration',
      name: 'Environment Variables',
      status: configValidation.valid ? 'healthy' : 'critical',
      message: configValidation.valid 
        ? 'All required environment variables configured'
        : configValidation.errors.join(', '),
      impact: 'high'
    });

    // Network Health
    try {
      const netInfo = await NetInfo.fetch();
      checks.push({
        category: 'Network',
        name: 'Connectivity',
        status: netInfo.isConnected ? 'healthy' : 'critical',
        message: netInfo.isConnected 
          ? `Connected via ${netInfo.type}` 
          : 'No network connection',
        impact: 'high'
      });
    } catch (error) {
      checks.push({
        category: 'Network',
        name: 'Connectivity',
        status: 'warning',
        message: 'Unable to check network status',
        impact: 'medium'
      });
    }

    // Storage Health
    try {
      await AsyncStorage.setItem('health_check', Date.now().toString());
      const value = await AsyncStorage.getItem('health_check');
      await AsyncStorage.removeItem('health_check');
      
      checks.push({
        category: 'Storage',
        name: 'AsyncStorage',
        status: value ? 'healthy' : 'critical',
        message: value ? 'Storage read/write working' : 'Storage not functioning',
        impact: 'high'
      });
    } catch (error) {
      checks.push({
        category: 'Storage',
        name: 'AsyncStorage',
        status: 'critical',
        message: `Storage error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        impact: 'high'
      });
    }

    // Memory Health
    if (Platform.OS !== 'web') {
      try {
        // @ts-ignore
        const memoryInfo = performance.memory;
        if (memoryInfo) {
          const usedMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
          const limitMB = Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024);
          const usage = (usedMB / limitMB) * 100;
          
          checks.push({
            category: 'Performance',
            name: 'Memory Usage',
            status: usage > 80 ? 'warning' : usage > 95 ? 'critical' : 'healthy',
            message: `${usedMB}MB used of ${limitMB}MB (${usage.toFixed(1)}%)`,
            impact: usage > 80 ? 'medium' : 'low'
          });
        }
      } catch (error) {
        checks.push({
          category: 'Performance',
          name: 'Memory Usage',
          status: 'warning',
          message: 'Unable to check memory usage',
          impact: 'low'
        });
      }
    }

    // Database Health (Supabase)
    if (env.supabaseUrl && env.supabaseAnonKey) {
      try {
        const response = await fetch(`${env.supabaseUrl}/rest/v1/`, {
          headers: {
            'apikey': env.supabaseAnonKey,
            'authorization': `Bearer ${env.supabaseAnonKey}`
          }
        });
        
        checks.push({
          category: 'Database',
          name: 'Supabase Connection',
          status: response.ok ? 'healthy' : 'critical',
          message: response.ok ? 'Database connection working' : 'Database connection failed',
          impact: 'high'
        });
      } catch (error) {
        checks.push({
          category: 'Database',
          name: 'Supabase Connection',
          status: 'critical',
          message: `Database error: ${error instanceof Error ? error.message : 'Connection failed'}`,
          impact: 'high'
        });
      }
    }

    return checks;
  }

  static getHealthScore(checks: HealthCheck[]): number {
    const weights = { healthy: 100, warning: 50, critical: 0 };
    const totalWeight = checks.reduce((sum, check) => sum + weights[check.status], 0);
    return Math.round(totalWeight / checks.length);
  }

  static logHealthReport(checks: HealthCheck[]) {
    const score = this.getHealthScore(checks);
    const categories = [...new Set(checks.map(c => c.category))];
    
    console.log('\n🏥 APP HEALTH CHECK REPORT');
    console.log('==========================');
    console.log(`📊 Overall Health Score: ${score}/100`);
    console.log('');

    categories.forEach(category => {
      console.log(`📂 ${category.toUpperCase()}`);
      console.log('─'.repeat(25));
      
      const categoryChecks = checks.filter(c => c.category === category);
      categoryChecks.forEach(check => {
        const icon = check.status === 'healthy' ? '💚' : 
                    check.status === 'warning' ? '🟡' : '🔴';
        const impact = check.impact === 'high' ? '🔴' :
                      check.impact === 'medium' ? '🟡' : '🟢';
        console.log(`${icon} ${impact} ${check.name}: ${check.message}`);
      });
      console.log('');
    });

    const criticalIssues = checks.filter(c => c.status === 'critical').length;
    const warnings = checks.filter(c => c.status === 'warning').length;
    
    if (score >= 90) {
      console.log('🎉 EXCELLENT HEALTH!');
    } else if (score >= 70) {
      console.log('✅ GOOD HEALTH');
    } else if (score >= 50) {
      console.log('⚠️ NEEDS ATTENTION');
    } else {
      console.log('🚨 CRITICAL ISSUES');
    }
    
    console.log(`Critical Issues: ${criticalIssues}`);
    console.log(`Warnings: ${warnings}`);
    console.log('==========================\n');
  }
}
