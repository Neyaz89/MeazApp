
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Fallback to a simple encryption for demo purposes
// In production, use proper key management and encryption libraries
const simpleEncrypt = (text: string, key: string): string => {
  return btoa(text + key);
};

const simpleDecrypt = (encryptedText: string, key: string): string => {
  try {
    const decoded = atob(encryptedText);
    return decoded.replace(key, '');
  } catch {
    return '';
  }
};

class SecurityManager {
  private static instance: SecurityManager;
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = 'your-encryption-key'; // Use a proper key management system
  }

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  // Encrypt sensitive data before storing
  encryptData(data: string): string {
    return simpleEncrypt(data, this.encryptionKey);
  }

  // Decrypt sensitive data
  decryptData(encryptedData: string): string {
    return simpleDecrypt(encryptedData, this.encryptionKey);
  }

  // Secure storage
  async secureStore(key: string, value: string): Promise<void> {
    const encrypted = this.encryptData(value);
    await AsyncStorage.setItem(key, encrypted);
  }

  async secureRetrieve(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    return this.decryptData(encrypted);
  }

  // Input sanitization
  sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .trim();
  }

  // Rate limiting for API calls
  private rateLimits = new Map<string, { count: number; resetTime: number }>();

  isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(key);

    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return false;
    }

    if (limit.count >= maxRequests) {
      return true;
    }

    limit.count++;
    return false;
  }
}

export const securityManager = SecurityManager.getInstance();
