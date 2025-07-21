
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { env } from '../config/environment';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
}

class Analytics {
  private static instance: Analytics;
  private enabled: boolean;

  constructor() {
    this.enabled = env.enableAnalytics;
  }

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  async track(event: AnalyticsEvent) {
    if (!this.enabled) return;

    const payload = {
      ...event,
      timestamp: new Date().toISOString(),
      platform: Device.osName,
      appVersion: Constants.expoConfig?.version,
      deviceId: Constants.sessionId,
    };

    if (__DEV__) {
      console.log('📊 Analytics Event:', payload);
    } else {
      // Send to your analytics service
      try {
        await this.sendToAnalytics(payload);
      } catch (error) {
        console.error('Analytics error:', error);
      }
    }
  }

  private async sendToAnalytics(payload: any) {
    // Implement your analytics service integration
    // Example: Mixpanel, Amplitude, Google Analytics
    console.log('Analytics tracked:', payload);
  }

  // User lifecycle events
  userSignedUp(userId: string) {
    this.track({ name: 'user_signed_up', userId });
  }

  userSignedIn(userId: string) {
    this.track({ name: 'user_signed_in', userId });
  }

  // Feature usage events
  messagesSent(userId: string, messageType: 'text' | 'voice' | 'image') {
    this.track({ 
      name: 'message_sent', 
      userId, 
      properties: { type: messageType } 
    });
  }

  callInitiated(userId: string, callType: 'audio' | 'video') {
    this.track({ 
      name: 'call_initiated', 
      userId, 
      properties: { type: callType } 
    });
  }

  // Performance events
  screenViewed(screenName: string, userId?: string) {
    this.track({ 
      name: 'screen_viewed', 
      userId, 
      properties: { screen: screenName } 
    });
  }
}

export const analytics = Analytics.getInstance();
