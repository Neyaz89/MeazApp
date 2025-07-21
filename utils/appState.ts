
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from './analytics';

class AppStateManager {
  private static instance: AppStateManager;
  private currentState: AppStateStatus = 'active';
  private backgroundTime: number = 0;

  static getInstance(): AppStateManager {
    if (!AppStateManager.instance) {
      AppStateManager.instance = new AppStateManager();
    }
    return AppStateManager.instance;
  }

  initialize() {
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  private handleAppStateChange(nextAppState: AppStateStatus) {
    const previousState = this.currentState;
    this.currentState = nextAppState;

    if (previousState === 'background' && nextAppState === 'active') {
      this.onAppForegrounded();
    } else if (previousState === 'active' && nextAppState === 'background') {
      this.onAppBackgrounded();
    }
  }

  private onAppForegrounded() {
    const timeInBackground = Date.now() - this.backgroundTime;
    analytics.track({
      name: 'app_foregrounded',
      properties: { timeInBackground }
    });

    // Check for app updates, sync data, etc.
    this.performForegroundTasks();
  }

  private onAppBackgrounded() {
    this.backgroundTime = Date.now();
    analytics.track({ name: 'app_backgrounded' });

    // Save app state, pause unnecessary operations
    this.performBackgroundTasks();
  }

  private async performForegroundTasks() {
    // Refresh authentication
    // Sync pending messages
    // Check for app updates
    console.log('🔄 App foregrounded - refreshing data');
  }

  private async performBackgroundTasks() {
    // Save current app state
    await this.saveAppState();
    // Clear sensitive data from memory if needed
    console.log('💾 App backgrounded - saving state');
  }

  private async saveAppState() {
    const state = {
      lastActiveTime: Date.now(),
      appVersion: '1.0.0'
    };
    await AsyncStorage.setItem('app_state', JSON.stringify(state));
  }

  async getLastActiveTime(): Promise<number | null> {
    try {
      const state = await AsyncStorage.getItem('app_state');
      if (state) {
        const parsed = JSON.parse(state);
        return parsed.lastActiveTime;
      }
    } catch (error) {
      console.error('Error getting last active time:', error);
    }
    return null;
  }
}

export const appStateManager = AppStateManager.getInstance();
