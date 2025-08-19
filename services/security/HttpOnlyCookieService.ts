import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoService, { AdvancedEncryptedData } from './CryptoService';
import DeviceSecurityService from './DeviceSecurityService';

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge?: number;
  domain?: string;
  path?: string;
}

interface SecureCookie {
  name: string;
  value: string | AdvancedEncryptedData;
  options: CookieOptions;
  signature: string;
  deviceBinding: string;
  timestamp: number;
  encrypted: boolean;
  nonce: string;
}

interface CookieSecurityEvent {
  type: 'created' | 'accessed' | 'validated' | 'expired' | 'tampered' | 'security_violation';
  timestamp: number;
  cookieName: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  deviceId?: string;
}

class HttpOnlyCookieService {
  private static instance: HttpOnlyCookieService;
  private cryptoService: CryptoService;
  private deviceSecurity: DeviceSecurityService;
  private cookieStore: Map<string, SecureCookie> = new Map();
  private securityEvents: CookieSecurityEvent[] = [];
  private cookieSigningKey: string = '';
  private encryptionEnabled = true;
  private deviceBindingEnabled = true;
  private signatureValidationEnabled = true;
  private ready: Promise<void>;
  private initialized = false;

  private readonly COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  private readonly SIGNATURE_ALGORITHM = 'HMAC-SHA256';
  private readonly ENCRYPTION_ALGORITHM = 'AES-256-GCM';
  private readonly DEVICE_BINDING_SALT = 'httponly-cookie-device-binding';

  private constructor() {
    this.cryptoService = CryptoService.getInstance();
    this.deviceSecurity = DeviceSecurityService.getInstance();
    this.ready = this.initializeSecureCookieSystem();
  }

  static getInstance(): HttpOnlyCookieService {
    if (!HttpOnlyCookieService.instance) {
      HttpOnlyCookieService.instance = new HttpOnlyCookieService();
    }
    return HttpOnlyCookieService.instance;
  }

  private async ensureReady(): Promise<void> {
    await this.ready;
  }

  async waitUntilReady(): Promise<void> {
    await this.ensureReady();
  }

  private async initializeSecureCookieSystem(): Promise<void> {
    try {
      this.cookieSigningKey = await this.generateCookieSigningKey();
      await this.loadExistingCookies();
      this.startCookieCleanupScheduler();
      this.initialized = true;
      console.log('🍪 HttpOnly Cookie Service initialized with enhanced security');
    } catch (error) {
      this.initialized = false;
      console.error('❌ Failed to initialize HttpOnly Cookie Service:', error);
    }
  }

  private async generateCookieSigningKey(): Promise<string> {
    try {
      const existing = await AsyncStorage.getItem('cookie_signing_key');
      if (existing) {
        return existing;
      }
    } catch {}
    const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
    const deviceId = deviceFingerprint?.securityHash || 'fallback-device';
    const entropy = this.cryptoService.generateSecureRandom(32);
    const key = await this.cryptoService.hash(`${deviceId}:${entropy}:${this.DEVICE_BINDING_SALT}`);
    try { await AsyncStorage.setItem('cookie_signing_key', key); } catch {}
    return key;
  }

  async setJWTAccessToken(token: string): Promise<boolean> {
    try {
      await this.ensureReady();
      const cookieName = 'jwt_access_token';
      const deviceBinding = await this.generateDeviceBinding(cookieName);
      const nonce = this.cryptoService.generateSecureRandom(16);

      const encryptedValue: AdvancedEncryptedData | string = this.encryptionEnabled
        ? await this.cryptoService.encrypt(token)
        : token;

      const signature = await this.generateCookieSignature(cookieName, token, nonce);

      const secureCookie: SecureCookie = {
        name: cookieName,
        value: encryptedValue,
        options: {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 15 * 60 * 1000,
          path: '/'
        },
        signature,
        deviceBinding,
        timestamp: Date.now(),
        encrypted: this.encryptionEnabled,
        nonce
      };

      this.cookieStore.set(cookieName, secureCookie);
      await this.persistCookie(secureCookie);

      if (Platform.OS === 'web') {
        await this.setWebCookie(secureCookie);
      }

      this.logSecurityEvent({
        type: 'created',
        timestamp: Date.now(),
        cookieName,
        details: {
          encrypted: this.encryptionEnabled,
          deviceBound: this.deviceBindingEnabled,
          maxAge: secureCookie.options.maxAge
        },
        severity: 'low'
      });

      console.log('🔐 JWT Access Token stored in HttpOnly cookie');
      return true;
    } catch (error) {
      console.error('❌ Failed to set JWT Access Token cookie:', error);
      this.logSecurityEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        cookieName: 'jwt_access_token',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        severity: 'critical'
      });
      return false;
    }
  }

  async setJWTRefreshToken(token: string): Promise<boolean> {
    try {
      await this.ensureReady();
      const cookieName = 'jwt_refresh_token';
      const deviceBinding = await this.generateDeviceBinding(cookieName);
      const nonce = this.cryptoService.generateSecureRandom(16);

      const encryptedValue: AdvancedEncryptedData | string = this.encryptionEnabled
        ? await this.cryptoService.encrypt(token)
        : token;

      const signature = await this.generateCookieSignature(cookieName, token, nonce);

      const secureCookie: SecureCookie = {
        name: cookieName,
        value: encryptedValue,
        options: {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: this.COOKIE_MAX_AGE,
          path: '/'
        },
        signature,
        deviceBinding,
        timestamp: Date.now(),
        encrypted: this.encryptionEnabled,
        nonce
      };

      this.cookieStore.set(cookieName, secureCookie);
      await this.persistCookie(secureCookie);

      if (Platform.OS === 'web') {
        await this.setWebCookie(secureCookie);
      }

      this.logSecurityEvent({
        type: 'created',
        timestamp: Date.now(),
        cookieName,
        details: {
          encrypted: this.encryptionEnabled,
          deviceBound: this.deviceBindingEnabled,
          maxAge: secureCookie.options.maxAge
        },
        severity: 'low'
      });

      console.log('🔐 JWT Refresh Token stored in HttpOnly cookie');
      return true;
    } catch (error) {
      console.error('❌ Failed to set JWT Refresh Token cookie:', error);
      this.logSecurityEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        cookieName: 'jwt_refresh_token',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        severity: 'critical'
      });
      return false;
    }
  }

  async getJWTAccessToken(): Promise<string | null> {
    try {
      await this.ensureReady();
      const cookieName = 'jwt_access_token';
      const secureCookie = this.cookieStore.get(cookieName);

      if (!secureCookie) {
        return null;
      }

      const validation = await this.validateCookieSecurity(secureCookie);
      if (!validation.valid) {
        this.logSecurityEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          cookieName,
          details: {
            reason: 'cookie_validation_failed',
            violations: validation.violations
          },
          severity: 'critical'
        });

        await this.removeCookie(cookieName);
        return null;
      }

      const token = secureCookie.encrypted
        ? await this.cryptoService.decrypt(secureCookie.value as AdvancedEncryptedData)
        : (secureCookie.value as string);

      this.logSecurityEvent({
        type: 'accessed',
        timestamp: Date.now(),
        cookieName,
        details: { validationPassed: true },
        severity: 'low'
      });

      return token;
    } catch (error) {
      console.error('❌ Failed to get JWT Access Token from cookie:', error);
      this.logSecurityEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        cookieName: 'jwt_access_token',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        severity: 'high'
      });
      return null;
    }
  }

  async getJWTRefreshToken(): Promise<string | null> {
    try {
      await this.ensureReady();
      const cookieName = 'jwt_refresh_token';
      const secureCookie = this.cookieStore.get(cookieName);

      if (!secureCookie) {
        return null;
      }

      const validation = await this.validateCookieSecurity(secureCookie);
      if (!validation.valid) {
        this.logSecurityEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          cookieName,
          details: {
            reason: 'cookie_validation_failed',
            violations: validation.violations
          },
          severity: 'critical'
        });

        await this.removeCookie(cookieName);
        return null;
      }

      const token = secureCookie.encrypted
        ? await this.cryptoService.decrypt(secureCookie.value as AdvancedEncryptedData)
        : (secureCookie.value as string);

      this.logSecurityEvent({
        type: 'accessed',
        timestamp: Date.now(),
        cookieName,
        details: { validationPassed: true },
        severity: 'low'
      });

      return token;
    } catch (error) {
      console.error('❌ Failed to get JWT Refresh Token from cookie:', error);
      this.logSecurityEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        cookieName: 'jwt_refresh_token',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        severity: 'high'
      });
      return null;
    }
  }

  async clearJWTCookies(): Promise<void> {
    try {
      await this.removeCookie('jwt_access_token');
      await this.removeCookie('jwt_refresh_token');
      console.log('🧹 All JWT cookies cleared');
    } catch (error) {
      console.error('❌ Failed to clear JWT cookies:', error);
    }
  }

  private async generateDeviceBinding(cookieName: string): Promise<string> {
    if (!this.deviceBindingEnabled) {
      return 'device-binding-disabled';
    }

    try {
      const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
      const deviceId = deviceFingerprint?.securityHash || 'unknown-device';
      const bindingData = `${cookieName}:${deviceId}:${this.DEVICE_BINDING_SALT}`;
      return await this.cryptoService.hash(bindingData);
    } catch (error) {
      console.error('Failed to generate device binding:', error);
      return 'fallback-device-binding';
    }
  }

  private async generateCookieSignature(cookieName: string, value: string, nonce: string): Promise<string> {
    if (!this.signatureValidationEnabled) {
      return 'signature-disabled';
    }

    try {
      const signatureData = `${cookieName}:${value}:${this.cookieSigningKey}:${nonce}`;
      return await this.cryptoService.hash(signatureData);
    } catch (error) {
      console.error('Failed to generate cookie signature:', error);
      return 'fallback-signature';
    }
  }

  private async validateCookieSecurity(cookie: SecureCookie): Promise<{
    valid: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];

    try {
      if (cookie.options.maxAge && Date.now() - cookie.timestamp > cookie.options.maxAge) {
        violations.push('cookie_expired');
      }

      if (this.deviceBindingEnabled) {
        const currentDeviceBinding = await this.generateDeviceBinding(cookie.name);
        if (cookie.deviceBinding !== currentDeviceBinding) {
          violations.push('device_binding_mismatch');
        }
      }

      if (this.signatureValidationEnabled) {
        const currentValue = cookie.encrypted
          ? await this.cryptoService.decrypt(cookie.value as AdvancedEncryptedData)
          : (cookie.value as string);
        const expectedSignature = await this.generateCookieSignature(cookie.name, currentValue, cookie.nonce);
        if (cookie.signature !== expectedSignature) {
          violations.push('signature_mismatch');
        }
      }

      if (!cookie.options.httpOnly) {
        violations.push('httponly_not_set');
      }
      if (!cookie.options.secure) {
        violations.push('secure_not_set');
      }
      if (cookie.options.sameSite !== 'strict') {
        violations.push('samesite_not_strict');
      }

      return {
        valid: violations.length === 0,
        violations
      };
    } catch (error) {
      console.error('Cookie security validation failed:', error);
      return {
        valid: false,
        violations: ['validation_error']
      };
    }
  }

  private async setWebCookie(secureCookie: SecureCookie): Promise<void> {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    try {
      const cookieString = [
        `${secureCookie.name}=${encodeURIComponent(typeof secureCookie.value === 'string' ? secureCookie.value : JSON.stringify(secureCookie.value))}`,
        `Max-Age=${Math.floor((secureCookie.options.maxAge || this.COOKIE_MAX_AGE) / 1000)}`,
        `Path=${secureCookie.options.path || '/'}`,
        secureCookie.options.secure ? 'Secure' : '',
        `SameSite=${secureCookie.options.sameSite || 'strict'}`
      ].filter(Boolean).join('; ');

      document.cookie = cookieString;
      console.log('🍪 Web cookie set:', secureCookie.name);
    } catch (error) {
      console.error('Failed to set web cookie:', error);
    }
  }

  private async removeCookie(cookieName: string): Promise<void> {
    try {
      this.cookieStore.delete(cookieName);
      await AsyncStorage.removeItem(`secure_cookie_${cookieName}`);

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.cookie = `${cookieName}=; Max-Age=0; Path=/; Secure; SameSite=strict`;
      }

      this.logSecurityEvent({
        type: 'expired',
        timestamp: Date.now(),
        cookieName,
        details: { reason: 'manual_removal' },
        severity: 'low'
      });

      console.log('🗑️ Cookie removed:', cookieName);
    } catch (error) {
      console.error('Failed to remove cookie:', error);
    }
  }

  private async persistCookie(cookie: SecureCookie): Promise<void> {
    try {
      const serialized = JSON.stringify(cookie);
      const encryptedCookie = await this.cryptoService.encrypt(serialized);
      await AsyncStorage.setItem(`secure_cookie_${cookie.name}`, JSON.stringify(encryptedCookie));
    } catch (error) {
      console.error('Failed to persist cookie:', error);
    }
  }

  private async loadExistingCookies(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cookieKeys = keys.filter(key => key.startsWith('secure_cookie_'));

      for (const key of cookieKeys) {
        try {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const encryptedCookie: AdvancedEncryptedData = JSON.parse(stored) as AdvancedEncryptedData;
            const cookieData = await this.cryptoService.decrypt(encryptedCookie);
            const cookie: SecureCookie = JSON.parse(cookieData) as SecureCookie;

            const validation = await this.validateCookieSecurity(cookie);
            if (validation.valid) {
              this.cookieStore.set(cookie.name, cookie);
            } else {
              await AsyncStorage.removeItem(key);
            }
          }
        } catch (error) {
          console.warn('Failed to load cookie:', key, error);
          await AsyncStorage.removeItem(key);
        }
      }

      console.log('🍪 Loaded existing cookies:', this.cookieStore.size);
    } catch (error) {
      console.error('Failed to load existing cookies:', error);
    }
  }

  private startCookieCleanupScheduler(): void {
    setInterval(async () => {
      await this.performCookieCleanup();
    }, 60 * 60 * 1000);
  }

  private async performCookieCleanup(): Promise<void> {
    try {
      let cleanedCount = 0;
      const now = Date.now();

      for (const [cookieName, cookie] of this.cookieStore) {
        if (cookie.options.maxAge && now - cookie.timestamp > cookie.options.maxAge) {
          await this.removeCookie(cookieName);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cookie cleanup completed: ${cleanedCount} cookies removed`);
      }
    } catch (error) {
      console.error('Cookie cleanup failed:', error);
    }
  }

  private logSecurityEvent(event: CookieSecurityEvent): void {
    const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
    event.deviceId = deviceFingerprint?.securityHash || 'unknown';

    this.securityEvents.push(event);

    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    if (event.severity === 'critical') {
      console.error('CRITICAL COOKIE SECURITY EVENT:', event);
    }
  }

  getCookieSecurityStatus(): {
    initialized: boolean;
    totalCookies: number;
    securityEvents: number;
    criticalEvents: number;
    deviceBindingEnabled: boolean;
    encryptionEnabled: boolean;
    signatureValidationEnabled: boolean;
    platform: string;
  } {
    const criticalEvents = this.securityEvents.filter(
      event => event.severity === 'critical' && Date.now() - event.timestamp < 60 * 60 * 1000
    ).length;

    return {
      initialized: this.initialized,
      totalCookies: this.cookieStore.size,
      securityEvents: this.securityEvents.length,
      criticalEvents,
      deviceBindingEnabled: this.deviceBindingEnabled,
      encryptionEnabled: this.encryptionEnabled,
      signatureValidationEnabled: this.signatureValidationEnabled,
      platform: Platform.OS
    };
  }

  getSecurityEvents(): CookieSecurityEvent[] {
    return [...this.securityEvents];
  }

  updateSecurityConfiguration(config: {
    encryptionEnabled?: boolean;
    deviceBindingEnabled?: boolean;
    signatureValidationEnabled?: boolean;
  }): void {
    if (config.encryptionEnabled !== undefined) {
      this.encryptionEnabled = config.encryptionEnabled;
    }
    if (config.deviceBindingEnabled !== undefined) {
      this.deviceBindingEnabled = config.deviceBindingEnabled;
    }
    if (config.signatureValidationEnabled !== undefined) {
      this.signatureValidationEnabled = config.signatureValidationEnabled;
    }

    console.log('🔧 Cookie security configuration updated:', config);
  }

  getAllCookies(): SecureCookie[] {
    return Array.from(this.cookieStore.values());
  }
  
  async clearAllCookies(): Promise<void> {
    try {
      const cookieNames = Array.from(this.cookieStore.keys());
      for (const cookieName of cookieNames) {
        await this.removeCookie(cookieName);
      }
      this.cookieStore.clear();
      console.log('🧹 All cookies cleared');
    } catch (error) {
      console.error('Failed to clear all cookies:', error);
    }
  }

  // Public generic cookie helpers for SecurityManager compatibility
  async setSecureCookie(
    name: string,
    value: string,
    options: {
      maxAge?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
      encrypted?: boolean;
      signed?: boolean;
      path?: string;
    } = {}
  ): Promise<boolean> {
    await this.ensureReady();
    const deviceBinding = await this.generateDeviceBinding(name);
    const encrypted = options.encrypted ?? this.encryptionEnabled;
    const nonce = this.cryptoService.generateSecureRandom(16);
    const storedValue: AdvancedEncryptedData | string = encrypted
      ? await this.cryptoService.encrypt(value)
      : value;

    const signature = options.signed === false ? 'signature-disabled' : await this.generateCookieSignature(name, value, nonce);

    const secureCookie: SecureCookie = {
      name,
      value: storedValue,
      options: {
        httpOnly: options.httpOnly ?? true,
        secure: options.secure ?? true,
        sameSite: options.sameSite ?? 'strict',
        maxAge: options.maxAge ?? this.COOKIE_MAX_AGE,
        path: options.path ?? '/'
      },
      signature,
      deviceBinding,
      timestamp: Date.now(),
      encrypted,
      nonce
    };

    this.cookieStore.set(name, secureCookie);
    await this.persistCookie(secureCookie);
    if (Platform.OS === 'web') {
      await this.setWebCookie(secureCookie);
    }
    return true;
  }

  async getSecureCookie(name: string): Promise<string | null> {
    await this.ensureReady();
    const secureCookie = this.cookieStore.get(name);
    if (!secureCookie) return null;
    const validation = await this.validateCookieSecurity(secureCookie);
    if (!validation.valid) {
      await this.removeCookie(name);
      return null;
    }
    return secureCookie.encrypted
      ? await this.cryptoService.decrypt(secureCookie.value as AdvancedEncryptedData)
      : (secureCookie.value as string);
  }

  async deleteCookie(name: string): Promise<void> {
    await this.removeCookie(name);
  }
}

export default HttpOnlyCookieService;
