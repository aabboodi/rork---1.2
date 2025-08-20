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
}

interface AttestationApi extends GenericModule {
  getAttestation?: (nonce: string) => Promise<string | null> | string | null;
}

const isDev: boolean = (typeof __DEV__ !== 'undefined' ? __DEV__ : (typeof process !== 'undefined' ? process?.env?.NODE_ENV !== 'production' : true)) ?? true;

function makeNoop<T extends object>(name: string, shape: T): T {
  const handler: ProxyHandler<any> = {
    get(_t, p) {
      return (..._args: any[]) => {
        if (!isDev) {
          throw new Error(`${String(name)} missing in production`);
        }
        console.warn(`[DEV] ${String(name)} missing → no-op for method ${String(p)}`);
        return undefined;
      };
    },
  };
  return new Proxy(shape as any, handler);
}

function pickModule<T extends object>(nativeKey: string, shape: T): T {
  const mod: any = (NativeModules as any)?.[nativeKey] ?? null;
  if (mod) return mod as T;
  return makeNoop<T>(nativeKey, shape);
}

export const UEBASafe: UEBAApi = pickModule<UEBAApi>('UEBAService', {
  init: async () => undefined,
  analyze: async () => ({}),
  isAvailable: async () => false,
});

export const RASPSafe: RASPApi = pickModule<RASPApi>('RASPService', {
  init: async () => undefined,
  protect: async () => undefined,
  isAvailable: async () => false,
});

export const BiometricSafe: BiometricApi = pickModule<BiometricApi>('BiometricService', {
  init: async () => undefined,
  isHardwareAvailable: async () => Platform.OS !== 'web' ? false : false,
  authenticate: async () => ({ success: false, error: 'unavailable' }),
});

export const AttestationSafe: AttestationApi = pickModule<AttestationApi>('AttestationService', {
  init: async () => undefined,
  getAttestation: async () => null,
  isAvailable: async () => false,
});
