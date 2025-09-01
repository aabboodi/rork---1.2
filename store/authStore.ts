import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Language } from '@/types';

import SecurityManager from '@/services/security/SecurityManager';
import SessionManager from '@/services/security/SessionManager';
import BiometricAuthService from '@/services/security/BiometricAuthService';
import KeyManager from '@/services/security/KeyManager';
import HttpOnlyCookieService from '@/services/security/HttpOnlyCookieService';

interface ChatSettings {
  messageNotifications: boolean;
  groupNotifications: boolean;
  channelNotifications: boolean;
  readReceipts: boolean;
  lastSeen: boolean;
  encryptionEnabled: boolean;
  autoDownloadMedia: boolean;
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  chatWallpaper: string;
  // Enhanced E2EE settings
  e2eeByDefault: boolean;
  requireKeyVerification: boolean;
  allowAutomaticKeyRotation: boolean;
  biometricKeyVerification: boolean;
  perfectForwardSecrecy: boolean;
  securityLevel: 'standard' | 'high' | 'maximum';
}

interface E2EEState {
  enabled: boolean;
  keyExchangeCapable: boolean;
  totalSessions: number;
  establishedSessions: number;
  verifiedKeys: number;
  lastKeyRotation: number;
  securityLevel: string;
  // Signal Protocol specific state
  protocolVersion: number;
  doubleRatchetEnabled: boolean;
  perfectForwardSecrecy: boolean;
  x3dhKeyAgreement: boolean;
  signalProtocolSessions: number;
  messageKeysRotated: number;
}

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  phoneNumber: string | null;
  language: Language;

  securityInitialized: boolean;
  biometricEnabled: boolean;
  sessionToken: string | null;
  lastAuthTime: number;
  httpOnlyCookiesEnabled: boolean; // CRITICAL: Track HttpOnly cookie usage

  chatSettings: ChatSettings;
  e2eeState: E2EEState;
  
  // Actions
  setAuthenticated: (userId: string, phoneNumber: string, sessionToken?: string) => Promise<void>;
  setLanguage: (language: Language) => void;
  logout: () => Promise<void>;
  initializeSecurity: () => Promise<void>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  checkSessionValidity: () => Promise<boolean>;

  // OTP controls
  isOTPEnabled: () => boolean;

  updateChatSettings: (settings: Partial<ChatSettings>) => Promise<void>;
  getChatSettings: () => ChatSettings;
  
  // Enhanced E2EE actions
  initializeE2EE: () => Promise<void>;
  updateE2EEState: () => Promise<void>;
  getE2EEStatus: () => E2EEState;
  enableE2EEByDefault: (enabled: boolean) => Promise<void>;
  rotateAllKeys: () => Promise<boolean>;
}

// Enhanced storage using expo-secure-store for sensitive data
const enhancedJSONStorage = createJSONStorage(() => ({
  getItem: async (name: string) => {
    try {
      if (Platform.OS === 'web') {
        const value = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
        return value;
      }
      if (name.includes('auth') || name.includes('session') || name.includes('e2ee')) {
        const value = await SecureStore.getItemAsync(name);
        return value;
      }
      const value = await SecureStore.getItemAsync(name);
      if (!value) return null;
      try {
        JSON.parse(value);
        return value;
      } catch {
        console.warn('Invalid JSON in storage, cleaning up');
        await SecureStore.deleteItemAsync(name);
        return null;
      }
    } catch (error) {
      console.error('Auth storage getItem error:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      JSON.parse(value);
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(name, value);
        }
        return;
      }
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      console.error('Auth storage setItem error:', error);
    }
  },
  removeItem: async (name: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(name);
        }
        return;
      }
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.error('Auth storage removeItem error:', error);
    }
  },
}));

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      userId: null,
      phoneNumber: null,
      language: 'ar',

      securityInitialized: false,
      biometricEnabled: false,
      sessionToken: null,
      lastAuthTime: 0,
      httpOnlyCookiesEnabled: true, // CRITICAL: Enable HttpOnly cookies by default

      chatSettings: {
        messageNotifications: true,
        groupNotifications: true,
        channelNotifications: false,
        readReceipts: true,
        lastSeen: false,
        encryptionEnabled: true,
        autoDownloadMedia: true,
        darkMode: false,
        fontSize: 'medium',
        chatWallpaper: 'default',
        // Enhanced E2EE settings
        e2eeByDefault: true,
        requireKeyVerification: true,
        allowAutomaticKeyRotation: true,
        biometricKeyVerification: true,
        perfectForwardSecrecy: true,
        securityLevel: 'high',
      },

      e2eeState: {
        enabled: false,
        keyExchangeCapable: false,
        totalSessions: 0,
        establishedSessions: 0,
        verifiedKeys: 0,
        lastKeyRotation: 0,
        securityLevel: 'standard',
        // Signal Protocol specific state
        protocolVersion: 3,
        doubleRatchetEnabled: false,
        perfectForwardSecrecy: false,
        x3dhKeyAgreement: false,
        signalProtocolSessions: 0,
        messageKeysRotated: 0
      },

      setAuthenticated: async (userId: string, phoneNumber: string, sessionToken?: string) => {
        try {
          // CRITICAL: Initialize HttpOnly Cookie Service for XSS protection
          const cookieService = HttpOnlyCookieService.getInstance();
          
          // Try to initialize basic security
          let securityInitialized = false;
          let biometricAvailable = false;
          let e2eeInitialized = false;
          let httpOnlyCookiesWorking = false;
          
          try {
            const securityManager = SecurityManager.getInstance();
            const sessionManager = SessionManager.getInstance();
            const keyManager = KeyManager.getInstance();
            
            // Load existing session or create new one
            let session = await sessionManager.loadSession();
            
            if (!session && sessionToken) {
              // Validate provided session token
              const validation = await sessionManager.validateToken(sessionToken);
              if (validation.valid) {
                session = {
                  accessToken: sessionToken,
                  refreshToken: '',
                  expiresAt: validation.payload!.exp * 1000,
                  userId: validation.payload!.userId,
                  deviceBound: true,
                  sessionFingerprint: validation.payload!.sessionFingerprint,
                  serverValidated: true,
                  e2eeEnabled: validation.payload!.e2eeEnabled,
                  keyExchangeCapable: validation.payload!.keyExchangeCapable
                };
                
                // CRITICAL: Store session tokens in HttpOnly cookies
                const accessTokenStored = await cookieService.setJWTAccessToken(sessionToken);
                const refreshTokenStored = await cookieService.setJWTRefreshToken('');
                httpOnlyCookiesWorking = accessTokenStored && refreshTokenStored;
                
                if (!httpOnlyCookiesWorking) {
                  console.warn('HttpOnly cookies failed to store JWT tokens');
                }
              }
            }

            if (session) {
              // Check biometric availability
              const biometricAuth = BiometricAuthService.getInstance();
              biometricAvailable = await biometricAuth.isBiometricAvailable();
              
              // Initialize E2EE capabilities
              if (session.e2eeEnabled) {
                try {
                  await keyManager.generateUserKeyBundle(userId);
                  e2eeInitialized = true;
                } catch (error) {
                  console.warn('E2EE initialization failed:', error);
                }
              }
              
              securityInitialized = true;
              
              // Verify HttpOnly cookies are working
              if (session.accessToken) {
                const storedToken = await cookieService.getJWTAccessToken();
                httpOnlyCookiesWorking = !!storedToken;
              }
            }
          } catch (error) {
            console.warn('Security initialization failed during authentication:', error);
            // Continue with basic authentication
          }

          // Update Signal Protocol E2EE state
          const e2eeStatus = e2eeInitialized ? {
            enabled: true,
            keyExchangeCapable: true,
            totalSessions: 0,
            establishedSessions: 0,
            verifiedKeys: 0,
            lastKeyRotation: Date.now(),
            securityLevel: 'high',
            // Signal Protocol specific state
            protocolVersion: 3,
            doubleRatchetEnabled: true,
            perfectForwardSecrecy: true,
            x3dhKeyAgreement: true,
            signalProtocolSessions: 0,
            messageKeysRotated: 0
          } : get().e2eeState;

          set({ 
            isAuthenticated: true, 
            userId, 
            phoneNumber,
            sessionToken: httpOnlyCookiesWorking ? null : sessionToken, // Don't store in state if using cookies
            securityInitialized,
            biometricEnabled: biometricAvailable,
            lastAuthTime: Date.now(),
            httpOnlyCookiesEnabled: httpOnlyCookiesWorking,
            e2eeState: e2eeStatus
          });

          console.log('User authenticated successfully with E2EE capabilities and HttpOnly cookies:', httpOnlyCookiesWorking);
        } catch (error) {
          console.error('Authentication setup failed:', error);
          // Set basic authentication without security features
          set({ 
            isAuthenticated: true, 
            userId, 
            phoneNumber,
            sessionToken: sessionToken || null,
            securityInitialized: false,
            lastAuthTime: Date.now(),
            httpOnlyCookiesEnabled: false
          });
        }
      },

      setLanguage: (language: Language) => set({ language }),

      logout: async () => {
        try {
          // CRITICAL: Clear HttpOnly cookies first
          const cookieService = HttpOnlyCookieService.getInstance();
          await cookieService.clearJWTCookies();
          
          // Try to perform secure logout with E2EE cleanup
          try {
            const securityManager = SecurityManager.getInstance();
            const keyManager = KeyManager.getInstance();
            
            // Clear all E2EE keys
            await keyManager.clearAllKeys();
            
            // Perform secure logout
            await securityManager.basicLogout();
          } catch (error) {
            console.warn('Secure logout failed, performing basic logout:', error);
          }
          
        } catch (error) {
          console.error('Logout failed:', error);
        } finally {
          set({ 
            isAuthenticated: false, 
            userId: null, 
            phoneNumber: null,
            sessionToken: null,
            securityInitialized: false,
            biometricEnabled: false,
            lastAuthTime: 0,
            httpOnlyCookiesEnabled: false,
            e2eeState: {
              enabled: false,
              keyExchangeCapable: false,
              totalSessions: 0,
              establishedSessions: 0,
              verifiedKeys: 0,
              lastKeyRotation: 0,
              securityLevel: 'standard',
              // Signal Protocol specific state
              protocolVersion: 3,
              doubleRatchetEnabled: false,
              perfectForwardSecrecy: false,
              x3dhKeyAgreement: false,
              signalProtocolSessions: 0,
              messageKeysRotated: 0
            }
          });
          console.log('User logged out with E2EE cleanup and HttpOnly cookies cleared');
        }
      },

      initializeSecurity: async () => {
        try {
          // Try to initialize security manager
          const securityManager = SecurityManager.getInstance();
          
          // Try to load existing session
          const sessionManager = SessionManager.getInstance();
          const session = await sessionManager.loadSession();
          
          if (session) {
            // Restore authentication state
            const state = get();
            await state.setAuthenticated(session.userId, '', session.accessToken);
            
            // Initialize E2EE if enabled
            if (session.e2eeEnabled) {
              await state.initializeE2EE();
            }
          }
          
          set({ securityInitialized: true });
          console.log('Security initialized successfully');
        } catch (error) {
          console.warn('Security initialization failed:', error);
          set({ securityInitialized: false }); // Mark as failed but continue
        }
      },

      // CRITICAL: Initialize Signal Protocol E2EE capabilities
      initializeE2EE: async () => {
        try {
          const { userId } = get();
          if (!userId) {
            throw new Error('No user ID available for Signal Protocol E2EE initialization');
          }

          const keyManager = KeyManager.getInstance();
          
          // Generate Signal Protocol user key bundle if not exists
          const existingKey = await keyManager.getUserPublicKey(userId);
          if (!existingKey) {
            await keyManager.generateUserKeyBundle(userId);
          }

          // Update Signal Protocol E2EE state
          const e2eeStatus = keyManager.getE2EEStatus();
          
          set({
            e2eeState: {
              enabled: true,
              keyExchangeCapable: true,
              totalSessions: e2eeStatus.totalSessions,
              establishedSessions: e2eeStatus.establishedSessions,
              verifiedKeys: e2eeStatus.verifiedKeys,
              lastKeyRotation: e2eeStatus.lastKeyRotation,
              securityLevel: 'high',
              // Signal Protocol specific state
              protocolVersion: 3,
              doubleRatchetEnabled: true,
              perfectForwardSecrecy: true,
              x3dhKeyAgreement: true,
              signalProtocolSessions: e2eeStatus.totalSessions,
              messageKeysRotated: 0
            }
          });

          console.log('Signal Protocol E2EE initialized successfully');
        } catch (error) {
          console.error('Signal Protocol E2EE initialization failed:', error);
          set({
            e2eeState: {
              ...get().e2eeState,
              enabled: false,
              keyExchangeCapable: false,
              doubleRatchetEnabled: false,
              perfectForwardSecrecy: false,
              x3dhKeyAgreement: false
            }
          });
        }
      },

      // Update Signal Protocol E2EE state from KeyManager
      updateE2EEState: async () => {
        try {
          const keyManager = KeyManager.getInstance();
          const e2eeStatus = keyManager.getE2EEStatus();
          const currentState = get().e2eeState;
          
          set({
            e2eeState: {
              enabled: true,
              keyExchangeCapable: true,
              totalSessions: e2eeStatus.totalSessions,
              establishedSessions: e2eeStatus.establishedSessions,
              verifiedKeys: e2eeStatus.verifiedKeys,
              lastKeyRotation: e2eeStatus.lastKeyRotation,
              securityLevel: get().chatSettings.securityLevel,
              // Signal Protocol specific state
              protocolVersion: currentState.protocolVersion,
              doubleRatchetEnabled: currentState.doubleRatchetEnabled,
              perfectForwardSecrecy: currentState.perfectForwardSecrecy,
              x3dhKeyAgreement: currentState.x3dhKeyAgreement,
              signalProtocolSessions: e2eeStatus.totalSessions,
              messageKeysRotated: currentState.messageKeysRotated + 1
            }
          });
        } catch (error) {
          console.error('Failed to update Signal Protocol E2EE state:', error);
        }
      },

      // Get current E2EE status
      getE2EEStatus: () => {
        return get().e2eeState;
      },

      // Enable/disable E2EE by default
      enableE2EEByDefault: async (enabled: boolean) => {
        try {
          const currentSettings = get().chatSettings;
          const updatedSettings = { ...currentSettings, e2eeByDefault: enabled };
          
          await get().updateChatSettings(updatedSettings);
          
          if (enabled && !get().e2eeState.enabled) {
            await get().initializeE2EE();
          }
          
          console.log(`E2EE by default ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
          console.error('Failed to toggle E2EE by default:', error);
          throw error;
        }
      },

      // Rotate all encryption keys
      rotateAllKeys: async () => {
        try {
          const { userId } = get();
          if (!userId) {
            throw new Error('No user ID available for key rotation');
          }

          const keyManager = KeyManager.getInstance();
          
          // Clear existing keys and generate new ones
          await keyManager.clearAllKeys();
          await keyManager.generateUserKeyBundle(userId);
          
          // Update E2EE state
          await get().updateE2EEState();
          
          console.log('All encryption keys rotated successfully');
          return true;
        } catch (error) {
          console.error('Key rotation failed:', error);
          return false;
        }
      },

      enableBiometric: async () => {
        try {
          const biometricAuth = BiometricAuthService.getInstance();
          const result = await biometricAuth.enableBiometricAuth();
          
          if (result.success) {
            set({ biometricEnabled: true });
            return true;
          } else {
            console.error('Failed to enable biometric:', result.error);
            return false;
          }
        } catch (error) {
          console.error('Biometric enable failed:', error);
          return false;
        }
      },

      disableBiometric: async () => {
        try {
          set({ biometricEnabled: false });
          console.log('Biometric authentication disabled');
        } catch (error) {
          console.error('Biometric disable failed:', error);
        }
      },

      authenticateWithBiometric: async () => {
        try {
          const { userId, biometricEnabled } = get();
          
          if (!userId || !biometricEnabled) {
            return false;
          }

          const securityManager = SecurityManager.getInstance();
          const result = await securityManager.authenticateWithBiometrics(userId);
          
          if (result.success) {
            set({ lastAuthTime: Date.now() });
          }
          
          return result.success;
        } catch (error) {
          console.error('Biometric authentication failed:', error);
          return false;
        }
      },

      refreshSession: async () => {
        try {
          const sessionManager = SessionManager.getInstance();
          const cookieService = HttpOnlyCookieService.getInstance();
          const result = await sessionManager.refreshAccessToken();
          
          if (result.success && result.accessToken) {
            // CRITICAL: Update HttpOnly cookie with new access token
            const cookieUpdated = await cookieService.setJWTAccessToken(result.accessToken);
            
            set({ 
              sessionToken: cookieUpdated ? null : result.accessToken, // Don't store in state if using cookies
              lastAuthTime: Date.now(),
              httpOnlyCookiesEnabled: cookieUpdated
            });
            
            console.log('Session refreshed with HttpOnly cookie update:', cookieUpdated);
            return true;
          }
          
          return false;
        } catch (error) {
          console.error('Session refresh failed:', error);
          return false;
        }
      },

      checkSessionValidity: async () => {
        try {
          const sessionManager = SessionManager.getInstance();
          const cookieService = HttpOnlyCookieService.getInstance();
          
          // CRITICAL: Check if JWT tokens exist in HttpOnly cookies
          const accessToken = await cookieService.getJWTAccessToken();
          if (!accessToken && get().httpOnlyCookiesEnabled) {
            console.warn('JWT access token not found in HttpOnly cookies');
            await get().logout();
            return false;
          }
          
          const isValid = await sessionManager.isSessionValid();
          
          if (!isValid) {
            // Try to refresh session
            const refreshed = await get().refreshSession();
            if (!refreshed) {
              // Session cannot be refreshed, logout
              await get().logout();
              return false;
            }
          }
          
          return true;
        } catch (error) {
          console.error('Session validity check failed:', error);
          return false;
        }
      },

      // OTP controls - default enabled; can be wired to remote config later
      isOTPEnabled: () => {
        try {
          return true;
        } catch (e) {
          console.warn('isOTPEnabled check failed, defaulting to true', e);
          return true;
        }
      },

      // Chat settings management with E2EE support
      updateChatSettings: async (newSettings: Partial<ChatSettings>) => {
        try {
          const currentSettings = get().chatSettings;
          const updatedSettings = { ...currentSettings, ...newSettings };
          
          set({ chatSettings: updatedSettings });
          
          // Handle E2EE-specific settings
          if (newSettings.e2eeByDefault !== undefined) {
            if (newSettings.e2eeByDefault && !get().e2eeState.enabled) {
              await get().initializeE2EE();
            }
          }

          if (newSettings.securityLevel !== undefined) {
            set({
              e2eeState: {
                ...get().e2eeState,
                securityLevel: newSettings.securityLevel
              }
            });
          }
          
          // Save to secure storage
          try {
            await SecureStore.setItemAsync('chat_settings', JSON.stringify(updatedSettings));
            console.log('Chat settings saved successfully');
          } catch (error) {
            console.error('Failed to save chat settings to secure storage:', error);
          }
          
        } catch (error) {
          console.error('Failed to update chat settings:', error);
          throw error;
        }
      },

      getChatSettings: () => {
        return get().chatSettings;
      },
    }),
    {
      name: 'auth-storage',
      storage: enhancedJSONStorage,
      // Only persist non-sensitive data
      partialize: (state) => ({
        language: state.language,
        biometricEnabled: state.biometricEnabled,
        chatSettings: state.chatSettings,
        e2eeState: {
          ...state.e2eeState,
          // Don't persist sensitive E2EE data
          totalSessions: 0,
          establishedSessions: 0,
          verifiedKeys: 0
        },
        // Don't persist sensitive authentication data
        // CRITICAL: Never persist sessionToken when using HttpOnly cookies
        sessionToken: state.httpOnlyCookiesEnabled ? null : state.sessionToken,
        httpOnlyCookiesEnabled: state.httpOnlyCookiesEnabled,
      }),
    }
  )
);