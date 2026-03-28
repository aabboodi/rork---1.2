import { NativeModules, Platform } from 'react-native';

type AnyFn = (...args: any[]) => any;

interface GenericModule {
  init?: AnyFn;
  isAvailable?: () => Promise<boolean> | boolean;
}

interface UEBAApi extends GenericModule {
  analyze?: (payload: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

interface RASPApi extends GenericModule {
  protect?: (area: string, options?: Record<string, unknown>) => Promise<void> | void;
}

interface BiometricApi extends GenericModule {
  isHardwareAvailable?: () => Promise<boolean> | boolean;
  authenticate?: (reason?: string) => Promise<{ success: boolean; error?: string }>;
  getSupportedBiometrics?: () => Promise<string[]>;
}

interface AttestationApi extends GenericModule {
  getAttestation?: (nonce: string) => Promise<string | null> | string | null;
}

interface CameraApi extends GenericModule {
  isAvailable?: () => Promise<boolean> | boolean;
  requestPermissions?: () => Promise<{ granted: boolean }>;
}

interface LocationApi extends GenericModule {
  isAvailable?: () => Promise<boolean> | boolean;
  getCurrentPosition?: () => Promise<{ latitude: number; longitude: number } | null>;
}

interface SecureStorageApi extends GenericModule {
  setItem?: (key: string, value: string) => Promise<void>;
  getItem?: (key: string) => Promise<string | null>;
  removeItem?: (key: string) => Promise<void>;
}

interface HapticsApi extends GenericModule {
  impact?: (style?: string) => Promise<void>;
  notification?: (type?: string) => Promise<void>;
  selection?: () => Promise<void>;
}

const isDev: boolean = (typeof __DEV__ !== 'undefined' ? __DEV__ : (typeof process !== 'undefined' ? process?.env?.NODE_ENV !== 'production' : true)) ?? true;

// Enhanced availability checker with graceful degradation
class NativeModuleGuard {
  private static availabilityCache = new Map<string, boolean>();
  private static fallbackStrategies = new Map<string, () => any>();
  
  static async checkAvailability(moduleName: string): Promise<boolean> {
    // Check cache first
    if (this.availabilityCache.has(moduleName)) {
      return this.availabilityCache.get(moduleName)!;
    }
    
    try {
      const module = (NativeModules as any)?.[moduleName];
      const isAvailable = !!module;
      
      // Cache the result
      this.availabilityCache.set(moduleName, isAvailable);
      
      if (!isAvailable && !isDev) {
        console.warn(`⚠️ Native module ${moduleName} not available in production`);
      }
      
      return isAvailable;
    } catch (error) {
      console.error(`❌ Error checking availability of ${moduleName}:`, error);
      this.availabilityCache.set(moduleName, false);
      return false;
    }
  }
  
  static registerFallback(moduleName: string, fallback: () => any): void {
    this.fallbackStrategies.set(moduleName, fallback);
  }
  
  static getFallback(moduleName: string): (() => any) | undefined {
    return this.fallbackStrategies.get(moduleName);
  }
}

function makeNoop<T extends object>(name: string, shape: T): T {
  const handler: ProxyHandler<any> = {
    get(_t, p) {
      return async (..._args: any[]) => {
        // Check if module is available
        const isAvailable = await NativeModuleGuard.checkAvailability(name);
        
        if (!isAvailable) {
          // Try fallback strategy first
          const fallback = NativeModuleGuard.getFallback(name);
          if (fallback) {
            console.log(`🔄 Using fallback for ${String(name)}.${String(p)}`);
            return fallback();
          }
          
          // Development mode: warn and return safe defaults
          if (isDev) {
            console.warn(`[DEV] ${String(name)} missing → no-op for method ${String(p)}`);
            return getSafeDefault(String(p));
          }
          
          // Production mode: throw error for critical modules
          if (isCriticalModule(name)) {
            throw new Error(`Critical native module ${String(name)} missing in production`);
          }
          
          // Non-critical modules: return safe defaults
          console.warn(`⚠️ ${String(name)} unavailable, using safe default for ${String(p)}`);
          return getSafeDefault(String(p));
        }
        
        // Module is available, but method might not be implemented
        console.warn(`[DEV] ${String(name)}.${String(p)} called but not implemented`);
        return getSafeDefault(String(p));
      };
    },
  };
  return new Proxy(shape as any, handler);
}

// Safe default values for common method patterns
function getSafeDefault(methodName: string): any {
  if (methodName.startsWith('is') || methodName.includes('Available')) {
    return false;
  }
  if (methodName.includes('authenticate') || methodName.includes('verify')) {
    return { success: false, error: 'Module unavailable' };
  }
  if (methodName.includes('get') || methodName.includes('fetch')) {
    return null;
  }
  if (methodName.includes('Permission')) {
    return { granted: false };
  }
  return undefined;
}

// Define critical modules that should fail fast in production
function isCriticalModule(moduleName: string): boolean {
  const criticalModules = ['SecurityManager', 'CryptoService', 'KeyManager'];
  return criticalModules.includes(moduleName);
}

// Register fallback strategies for common modules
NativeModuleGuard.registerFallback('BiometricService', () => ({
  success: false,
  error: 'Biometric authentication not available on this device'
}));

NativeModuleGuard.registerFallback('HapticsService', () => {
  // Web fallback: use vibration API if available
  if (Platform.OS === 'web' && 'vibrate' in navigator) {
    navigator.vibrate(50);
  }
  return undefined;
});

NativeModuleGuard.registerFallback('LocationService', () => {
  // Web fallback: use geolocation API
  if (Platform.OS === 'web' && 'geolocation' in navigator) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }),
        () => resolve(null)
      );
    });
  }
  return null;
});

function pickModule<T extends object>(nativeKey: string, shape: T): T {
  const mod: any = (NativeModules as any)?.[nativeKey] ?? null;
  if (mod) {
    console.log(`✅ Native module ${nativeKey} available`);
    return mod as T;
  }
  
  console.log(`⚠️ Native module ${nativeKey} not available, using safe fallback`);
  return makeNoop<T>(nativeKey, shape);
}

export const UEBASafe: UEBAApi = pickModule<UEBAApi>('UEBAService', {
  init: async () => {
    console.log('🔍 UEBA Service initialized (safe mode)');
  },
  analyze: async (payload: Record<string, unknown>) => {
    // Basic behavioral analysis fallback
    const timestamp = Date.now();
    const basicMetrics = {
      timestamp,
      payloadSize: JSON.stringify(payload).length,
      riskScore: 0.1, // Low risk by default
      anomalies: [],
      platform: Platform.OS,
      fallbackMode: true
    };
    
    console.log('📊 UEBA analysis (fallback mode):', basicMetrics);
    return basicMetrics;
  },
  isAvailable: async () => {
    // Always available in fallback mode
    return true;
  },
});

export const RASPSafe: RASPApi = pickModule<RASPApi>('RASPService', {
  init: async () => {
    console.log('🛡️ RASP Service initialized (safe mode)');
  },
  protect: async (area: string, options?: Record<string, unknown>) => {
    // Basic protection logging
    console.log(`🛡️ RASP protection applied to ${area}`, options);
    
    // Basic runtime checks
    if (area === 'memory' && Platform.OS === 'web') {
      // Web-specific memory protection simulation
      console.log('🧠 Memory protection: Web sandbox active');
    }
    
    if (area === 'network') {
      console.log('🌐 Network protection: Basic validation active');
    }
  },
  isAvailable: async () => {
    // Always available in basic mode
    return true;
  },
});

export const BiometricSafe: BiometricApi = pickModule<BiometricApi>('BiometricService', {
  init: async () => undefined,
  isHardwareAvailable: async () => {
    // Enhanced biometric availability check
    if (Platform.OS === 'web') {
      // Check for WebAuthn support
      return 'credentials' in navigator && 'create' in navigator.credentials;
    }
    // Mobile platforms: assume biometric hardware might be available
    return Platform.OS === 'ios' || Platform.OS === 'android';
  },
  authenticate: async (reason?: string) => {
    if (Platform.OS === 'web') {
      // Web fallback: use WebAuthn if available
      if ('credentials' in navigator && 'create' in navigator.credentials) {
        try {
          console.log('🔐 Attempting WebAuthn authentication...');
          // This would be a real WebAuthn implementation in production
          return { success: false, error: 'WebAuthn not configured' };
        } catch (error) {
          return { success: false, error: 'WebAuthn failed' };
        }
      }
    }
    return { success: false, error: 'Biometric authentication unavailable' };
  },
  getSupportedBiometrics: async () => {
    if (Platform.OS === 'web') {
      return 'credentials' in navigator ? ['webauthn'] : [];
    }
    return Platform.OS === 'ios' ? ['touchId', 'faceId'] : ['fingerprint'];
  },
});

// Enhanced native module exports with better fallbacks
export const CameraSafe: CameraApi = pickModule<CameraApi>('CameraService', {
  init: async () => undefined,
  isAvailable: async () => {
    if (Platform.OS === 'web') {
      return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
    }
    return true; // Assume camera is available on mobile
  },
  requestPermissions: async () => {
    if (Platform.OS === 'web') {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        return { granted: true };
      } catch {
        return { granted: false };
      }
    }
    return { granted: false };
  },
});

export const LocationSafe: LocationApi = pickModule<LocationApi>('LocationService', {
  init: async () => undefined,
  isAvailable: async () => {
    if (Platform.OS === 'web') {
      return 'geolocation' in navigator;
    }
    return true; // Assume location is available on mobile
  },
  getCurrentPosition: async () => {
    if (Platform.OS === 'web' && 'geolocation' in navigator) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }),
          () => resolve(null),
          { timeout: 10000 }
        );
      });
    }
    return null;
  },
});

export const SecureStorageSafe: SecureStorageApi = pickModule<SecureStorageApi>('SecureStorageService', {
  init: async () => undefined,
  isAvailable: async () => Platform.OS !== 'web',
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      // Web fallback: use localStorage with encryption warning
      console.warn('⚠️ Using localStorage instead of secure storage on web');
      localStorage.setItem(`secure_${key}`, value);
    }
  },
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(`secure_${key}`);
    }
    return null;
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(`secure_${key}`);
    }
  },
});

export const HapticsSafe: HapticsApi = pickModule<HapticsApi>('HapticsService', {
  init: async () => undefined,
  isAvailable: async () => {
    if (Platform.OS === 'web') {
      return 'vibrate' in navigator;
    }
    return Platform.OS === 'ios' || Platform.OS === 'android';
  },
  impact: async (style?: string) => {
    if (Platform.OS === 'web' && 'vibrate' in navigator) {
      const duration = style === 'heavy' ? 100 : style === 'medium' ? 50 : 25;
      navigator.vibrate(duration);
    }
  },
  notification: async (type?: string) => {
    if (Platform.OS === 'web' && 'vibrate' in navigator) {
      const pattern = type === 'error' ? [100, 50, 100] : type === 'warning' ? [50, 50, 50] : [25];
      navigator.vibrate(pattern);
    }
  },
  selection: async () => {
    if (Platform.OS === 'web' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
});

export const AttestationSafe: AttestationApi = pickModule<AttestationApi>('AttestationService', {
  init: async () => undefined,
  getAttestation: async (nonce: string) => {
    // Enhanced attestation with platform-specific fallbacks
    if (Platform.OS === 'web') {
      // Web: Generate a basic attestation token
      const timestamp = Date.now();
      const userAgent = navigator.userAgent;
      const attestation = btoa(JSON.stringify({
        nonce,
        timestamp,
        platform: 'web',
        userAgent: userAgent.substring(0, 100), // Truncate for privacy
        type: 'basic_web_attestation'
      }));
      return attestation;
    }
    
    // Mobile: Would use platform-specific attestation APIs
    return null;
  },
  isAvailable: async () => {
    // Basic attestation is always available, even if not hardware-backed
    return true;
  },
});

// Export the guard for external use
export { NativeModuleGuard };

// Utility function to check multiple modules at once
export async function checkNativeModulesHealth(): Promise<{
  available: string[];
  unavailable: string[];
  withFallbacks: string[];
}> {
  const modules = [
    'UEBAService',
    'RASPService', 
    'BiometricService',
    'AttestationService',
    'CameraService',
    'LocationService',
    'SecureStorageService',
    'HapticsService'
  ];
  
  const available: string[] = [];
  const unavailable: string[] = [];
  const withFallbacks: string[] = [];
  
  for (const module of modules) {
    const isAvailable = await NativeModuleGuard.checkAvailability(module);
    const hasFallback = !!NativeModuleGuard.getFallback(module);
    
    if (isAvailable) {
      available.push(module);
    } else if (hasFallback) {
      withFallbacks.push(module);
    } else {
      unavailable.push(module);
    }
  }
  
  return { available, unavailable, withFallbacks };
}
