
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedOperation {
  id: string;
  operation: () => Promise<any>;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
}

class NetworkManager {
  private static instance: NetworkManager;
  private isConnected = true;
  private operationQueue: QueuedOperation[] = [];
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly OFFLINE_STORAGE_KEY = 'offline_operations';

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  async initialize() {
    // Listen to network state changes
    NetInfo.addEventListener(this.handleNetworkChange.bind(this));
    
    // Load queued operations from storage
    await this.loadQueuedOperations();
  }

  private async handleNetworkChange(state: NetInfoState) {
    const wasConnected = this.isConnected;
    this.isConnected = state.isConnected ?? false;

    if (!wasConnected && this.isConnected) {
      console.log('📶 Network reconnected, processing queued operations');
      await this.processQueue();
    } else if (wasConnected && !this.isConnected) {
      console.log('📵 Network disconnected, queuing operations');
    }
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    if (this.isConnected) {
      try {
        return await operation();
      } catch (error) {
        if (this.isNetworkError(error)) {
          return this.queueOperation(operation, maxRetries, priority);
        }
        throw error;
      }
    } else {
      return this.queueOperation(operation, maxRetries, priority);
    }
  }

  private async queueOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    priority: 'high' | 'medium' | 'low'
  ): Promise<T> {
    if (this.operationQueue.length >= this.MAX_QUEUE_SIZE) {
      // Remove lowest priority operations if queue is full
      this.operationQueue = this.operationQueue
        .sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority))
        .slice(0, this.MAX_QUEUE_SIZE - 1);
    }

    const queuedOp: QueuedOperation = {
      id: Date.now().toString(),
      operation,
      retryCount: 0,
      maxRetries,
      priority,
    };

    this.operationQueue.push(queuedOp);
    await this.saveQueuedOperations();

    // Return a rejected promise for offline operations
    throw new Error('Operation queued for when network is available');
  }

  private async processQueue() {
    if (!this.isConnected || this.operationQueue.length === 0) return;

    // Sort by priority
    this.operationQueue.sort((a, b) => 
      this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority)
    );

    const operationsToProcess = [...this.operationQueue];
    this.operationQueue = [];

    for (const queuedOp of operationsToProcess) {
      try {
        await queuedOp.operation();
        console.log(`✅ Queued operation ${queuedOp.id} completed`);
      } catch (error) {
        console.log(`❌ Queued operation ${queuedOp.id} failed:`, error);
        
        if (queuedOp.retryCount < queuedOp.maxRetries && this.isNetworkError(error)) {
          queuedOp.retryCount++;
          this.operationQueue.push(queuedOp);
        }
      }
    }

    await this.saveQueuedOperations();
  }

  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  private isNetworkError(error: any): boolean {
    return error?.message?.includes('Network') || 
           error?.code === 'NETWORK_ERROR' ||
           error?.name === 'TypeError';
  }

  private async saveQueuedOperations() {
    try {
      await AsyncStorage.setItem(
        this.OFFLINE_STORAGE_KEY,
        JSON.stringify(this.operationQueue.length)
      );
    } catch (error) {
      console.error('Failed to save queued operations:', error);
    }
  }

  private async loadQueuedOperations() {
    try {
      const stored = await AsyncStorage.getItem(this.OFFLINE_STORAGE_KEY);
      if (stored) {
        // Note: We can't serialize functions, so this is just for count tracking
        console.log(`📦 Found ${stored} queued operations from previous session`);
      }
    } catch (error) {
      console.error('Failed to load queued operations:', error);
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getQueueSize(): number {
    return this.operationQueue.length;
  }
}

export const networkManager = NetworkManager.getInstance();
