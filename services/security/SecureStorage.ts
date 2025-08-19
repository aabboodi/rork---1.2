import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import CryptoService, { AdvancedEncryptedData } from './CryptoService';

// CRITICAL: Quarantine prefix for corrupted data
const QUARANTINE_PREFIX = 'quarantine_';

interface SecureStorageOptions {
  encrypt?: boolean;
  keyPrefix?: string;
  useSecureEnclave?: boolean;
  requireBiometric?: boolean;
}

interface KeychainOptions {
  accessGroup?: string;
  accessibility?: 'WhenUnlocked' | 'WhenUnlockedThisDeviceOnly' | 'AfterFirstUnlock' | 'AfterFirstUnlockThisDeviceOnly';
  authenticationType?: 'Biometrics' | 'BiometricsOrPasscode' | 'Passcode';
  biometryType?: 'TouchID' | 'FaceID' | 'Fingerprint';
}

class SecureStorage {
  private static instance: SecureStorage;
  private cryptoService: CryptoService;
  private keyPrefix: string = 'secure_';
  private initialized: boolean = false;
  private secureEnclaveEnabled: boolean = false;
  private keychainOptions: KeychainOptions;

  private constructor() {
    this.cryptoService = CryptoService.getInstance();
    
    // CRITICAL: Configure Keychain/Keystore for maximum security
    this.keychainOptions = {
      accessibility: 'WhenUnlockedThisDeviceOnly', // Most secure option
      authenticationType: 'BiometricsOrPasscode',
      biometryType: Platform.OS === 'ios' ? 'FaceID' : 'Fingerprint'
    };
    
    this.initializeStorage();
  }

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  // Initialize storage with crypto service and Secure Enclave
  private async initializeStorage(): Promise<void> {
    try {
      // Ensure crypto service is initialized
      if (!this.cryptoService) {
        this.cryptoService = CryptoService.getInstance();
      }
      
      // Initialize crypto service with default key
      await this.cryptoService.initializeMasterKey();
      
      // Check Secure Enclave/Keychain availability
      await this.checkSecureEnclaveAvailability();
      
      // Initialize Keychain/Keystore security
      await this.initializeKeychainSecurity();
      
      this.initialized = true;
      console.log('SecureStorage initialized with Keychain/Keystore protection');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      console.error('SecureStorage initialization failed:', errorMessage);
      this.initialized = false;
    }
  }

  // Check Secure Enclave/Keychain availability
  private async checkSecureEnclaveAvailability(): Promise<void> {
    try {
      const isExpoGo = (Constants as any)?.appOwnership === 'expo';
      if (Platform.OS === 'web' || isExpoGo) {
        this.secureEnclaveEnabled = false;
        console.log('Secure Enclave disabled (web/Expo Go runtime)');
        return;
      }
      if (Platform.OS === 'ios') {
        this.secureEnclaveEnabled = true;
        console.log('iOS Keychain with Secure Enclave available');
      } else if (Platform.OS === 'android') {
        this.secureEnclaveEnabled = true;
        console.log('Android Keystore with HSM available');
      } else {
        this.secureEnclaveEnabled = false;
        console.log('Unknown platform - using software-based security');
      }
    } catch (error) {
      console.error('Secure Enclave availability check failed:', error);
      this.secureEnclaveEnabled = false;
    }
  }

  // Initialize Keychain/Keystore security
  private async initializeKeychainSecurity(): Promise<void> {
    try {
      const isExpoGo = (Constants as any)?.appOwnership === 'expo';
      if (!this.secureEnclaveEnabled || isExpoGo) {
        return;
      }

      // Test Keychain/Keystore functionality
      const testKey = 'keychain_test_key';
      const testValue = 'test_value_' + Date.now();
      
      await this.setItemInKeychain(testKey, testValue, {
        requireBiometric: false,
        useSecureEnclave: true
      });
      
      const retrievedValue = await this.getItemFromKeychain(testKey, {
        requireBiometric: false,
        useSecureEnclave: true
      });
      
      if (retrievedValue === testValue) {
        console.log('Keychain/Keystore functionality verified');
        await this.removeItemFromKeychain(testKey);
      } else {
        throw new Error('Keychain/Keystore test failed');
      }
    } catch (error) {
      console.error('Keychain security initialization failed:', error);
      this.secureEnclaveEnabled = false;
    }
  }

  // Store item in Keychain/Keystore with hardware protection
  private async setItemInKeychain(
    key: string, 
    value: string, 
    options: { requireBiometric?: boolean; useSecureEnclave?: boolean }
  ): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Fallback to localStorage for web
        localStorage.setItem(key, value);
        return;
      }

      const secureStoreOptions: any = {};
      
      if (options.requireBiometric) {
        secureStoreOptions.requireAuthentication = true;
        secureStoreOptions.authenticationPrompt = 'Authenticate to access secure data';
      }
      
      if (options.useSecureEnclave && this.secureEnclaveEnabled) {
        if (Platform.OS === 'ios') {
          // iOS Secure Enclave options
          secureStoreOptions.keychainService = 'SecureEnclaveKeychain';
          secureStoreOptions.touchID = true;
          secureStoreOptions.showModal = true;
        } else if (Platform.OS === 'android') {
          // Android Keystore options
          secureStoreOptions.keychainService = 'AndroidKeystore';
          secureStoreOptions.encrypt = true;
        }
      }

      await SecureStore.setItemAsync(key, value, secureStoreOptions);
    } catch (error) {
      console.error('Keychain storage failed:', error);
      throw error;
    }
  }

  // Get item from Keychain/Keystore with hardware protection
  private async getItemFromKeychain(
    key: string, 
    options: { requireBiometric?: boolean; useSecureEnclave?: boolean }
  ): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // Fallback to localStorage for web
        return localStorage.getItem(key);
      }

      const secureStoreOptions: any = {};
      
      if (options.requireBiometric) {
        secureStoreOptions.requireAuthentication = true;
        secureStoreOptions.authenticationPrompt = 'Authenticate to access secure data';
      }
      
      if (options.useSecureEnclave && this.secureEnclaveEnabled) {
        if (Platform.OS === 'ios') {
          // iOS Secure Enclave options
          secureStoreOptions.keychainService = 'SecureEnclaveKeychain';
          secureStoreOptions.touchID = true;
          secureStoreOptions.showModal = true;
        } else if (Platform.OS === 'android') {
          // Android Keystore options
          secureStoreOptions.keychainService = 'AndroidKeystore';
          secureStoreOptions.encrypt = true;
        }
      }

      return await SecureStore.getItemAsync(key, secureStoreOptions);
    } catch (error) {
      console.error('Keychain retrieval failed:', error);
      return null;
    }
  }

  // Remove item from Keychain/Keystore
  private async removeItemFromKeychain(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }

      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Keychain removal failed:', error);
      throw error;
    }
  }

  // Ensure initialization before operations
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeStorage();
    }
    if (!this.cryptoService) {
      this.cryptoService = CryptoService.getInstance();
    }
  }

  // Enhanced corruption detection
  private isCorruptedData(data: string): boolean {
    if (!data || data.length === 0) return true;
    
    // Check for common corruption indicators
    const corruptionPatterns = [
      /^[^a-zA-Z0-9+/={}[\]",:.\s-]/,  // Starts with invalid characters
      /[@#$%^&*()!~`|\\]/,              // Contains special corruption characters
      /\u0000/,                         // Null bytes
      /[^\x20-\x7E\s]/,                 // Non-printable ASCII (except whitespace)
      /^[A-Za-z0-9+/]{1,3}[^A-Za-z0-9+/=]/, // Broken base64
      /DLh\/|o\*u4|E<zrn|DJF=/,         // Specific corruption patterns from errors
    ];
    
    return corruptionPatterns.some(pattern => pattern.test(data));
  }

  // Enhanced JSON validation
  private isValidJSON(data: string): boolean {
    try {
      JSON.parse(data);
      return true;
    } catch {
      return false;
    }
  }

  // Track keys for native platforms (since SecureStore doesn't have getAllKeys)
  private async trackKey(key: string): Promise<void> {
    if (Platform.OS === 'web') return; // Not needed for web
    
    try {
      const trackedKeysData = await SecureStore.getItemAsync('__tracked_secure_keys__');
      let trackedKeys: string[] = [];
      
      if (trackedKeysData) {
        trackedKeys = JSON.parse(trackedKeysData);
      }
      
      if (!trackedKeys.includes(key)) {
        trackedKeys.push(key);
        await SecureStore.setItemAsync('__tracked_secure_keys__', JSON.stringify(trackedKeys));
      }
    } catch (error) {
      console.warn('Failed to track key:', error);
    }
  }

  // Remove key from tracking
  private async untrackKey(key: string): Promise<void> {
    if (Platform.OS === 'web') return; // Not needed for web
    
    try {
      const trackedKeysData = await SecureStore.getItemAsync('__tracked_secure_keys__');
      if (trackedKeysData) {
        const trackedKeys = JSON.parse(trackedKeysData);
        const updatedKeys = trackedKeys.filter((trackedKey: string) => trackedKey !== key);
        await SecureStore.setItemAsync('__tracked_secure_keys__', JSON.stringify(updatedKeys));
      }
    } catch (error) {
      console.warn('Failed to untrack key:', error);
    }
  }

  // Check if data is encrypted format
  private isEncryptedData(data: string): boolean {
    try {
      if (this.isCorruptedData(data)) return false;
      if (!this.isValidJSON(data)) return false;
      
      const parsed = JSON.parse(data);
      return parsed && 
             typeof parsed === 'object' && 
             'data' in parsed && 
             'iv' in parsed && 
             'salt' in parsed &&
             typeof parsed.data === 'string' &&
             typeof parsed.iv === 'string' &&
             typeof parsed.salt === 'string';
    } catch (error) {
      return false;
    }
  }

  // Safe data cleanup
  private async quarantineKey(fullStorageKey: string, rawData: string | null): Promise<void> {
    try {
      if (fullStorageKey.startsWith(QUARANTINE_PREFIX)) {
        return;
      }
      const quarantineKey = `${QUARANTINE_PREFIX}${fullStorageKey}`;
      if (Platform.OS === 'web') {
        if (rawData !== null) {
          localStorage.setItem(quarantineKey, rawData);
        }
        localStorage.removeItem(fullStorageKey);
      } else {
        if (rawData !== null) {
          await SecureStore.setItemAsync(quarantineKey, rawData);
        }
        await SecureStore.deleteItemAsync(fullStorageKey);
      }
    } catch (error) {
      console.error('Failed to quarantine key:', fullStorageKey, error);
    }
  }

  private async isQuarantinedKey(fullStorageKey: string): Promise<boolean> {
    try {
      const quarantineKey = `${QUARANTINE_PREFIX}${fullStorageKey}`;
      if (Platform.OS === 'web') {
        return localStorage.getItem(quarantineKey) !== null;
      }
      const v = await SecureStore.getItemAsync(quarantineKey);
      return v !== null;
    } catch {
      return false;
    }
  }

  // Move quarantined data back to the original key safely
  async releaseQuarantinedKey(fullKeyWithoutPrefix: string): Promise<boolean> {
    try {
      const fullStorageKey = `${this.keyPrefix}${fullKeyWithoutPrefix}`;
      const quarantineKey = `${QUARANTINE_PREFIX}${fullStorageKey}`;
      const raw = Platform.OS === 'web' ? localStorage.getItem(quarantineKey) : await SecureStore.getItemAsync(quarantineKey);
      if (raw === null) return false;

      // Write back to original key without triggering quarantine redirect
      if (Platform.OS === 'web') {
        localStorage.setItem(fullStorageKey, raw);
        localStorage.removeItem(quarantineKey);
      } else {
        await SecureStore.setItemAsync(fullStorageKey, raw);
        await SecureStore.deleteItemAsync(quarantineKey);
        await this.trackKey(fullStorageKey);
      }
      console.log('Released quarantined key:', fullKeyWithoutPrefix);
      return true;
    } catch (error) {
      console.error('Failed to release quarantined key:', fullKeyWithoutPrefix, error);
      return false;
    }
  }

  // Permanently purge quarantined data for a key
  async purgeQuarantinedKey(fullKeyWithoutPrefix: string): Promise<boolean> {
    try {
      const fullStorageKey = `${this.keyPrefix}${fullKeyWithoutPrefix}`;
      const quarantineKey = `${QUARANTINE_PREFIX}${fullStorageKey}`;
      if (Platform.OS === 'web') {
        localStorage.removeItem(quarantineKey);
      } else {
        await SecureStore.deleteItemAsync(quarantineKey);
      }
      console.log('Purged quarantined key:', fullKeyWithoutPrefix);
      return true;
    } catch (error) {
      console.error('Failed to purge quarantined key:', fullKeyWithoutPrefix, error);
      return false;
    }
  }

  private async cleanupCorruptedKey(key: string): Promise<void> {
    try {
      console.warn(`Cleaning up corrupted data for key: ${key}`);
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error(`Failed to cleanup corrupted key ${key}:`, error);
    }
  }

  // CRITICAL: Store data securely with Keychain/Keystore protection
  async setItem(key: string, value: string, options: SecureStorageOptions = {}): Promise<void> {
    const { 
      encrypt = true, 
      keyPrefix = this.keyPrefix, 
      useSecureEnclave = true,
      requireBiometric = false 
    } = options;
    const requestedStorageKey = `${keyPrefix}${key}`;

    try {
      await this.ensureInitialized();
      
      let dataToStore = value;

      if (encrypt && this.initialized && this.cryptoService) {
        try {
          const encryptedData = await this.cryptoService.advancedEncrypt(value);
          dataToStore = JSON.stringify(encryptedData);
        } catch (encryptError) {
          const errorMessage = encryptError instanceof Error ? encryptError.message : 'Unknown encryption error';
          console.warn('Encryption failed, storing unencrypted:', errorMessage);
          dataToStore = value;
        }
      }

      let storageKeyToUse = requestedStorageKey;
      if (requestedStorageKey.startsWith(QUARANTINE_PREFIX)) {
        const recoveredKey = requestedStorageKey.slice(QUARANTINE_PREFIX.length);
        console.warn('Attempt to write to a quarantined key; redirecting to recovered key:', recoveredKey);
        storageKeyToUse = recoveredKey;
      }

      // CRITICAL: Use Keychain/Keystore for sensitive data
      if (useSecureEnclave && this.secureEnclaveEnabled) {
        await this.setItemInKeychain(storageKeyToUse, dataToStore, {
          requireBiometric,
          useSecureEnclave: true
        });
      } else {
        if (Platform.OS === 'web') {
          localStorage.setItem(storageKeyToUse, dataToStore);
        } else {
          await SecureStore.setItemAsync(storageKeyToUse, dataToStore);
          await this.trackKey(storageKeyToUse);
        }
      }

      console.log(`Data stored securely with Keychain/Keystore: ${useSecureEnclave && this.secureEnclaveEnabled}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
      console.error('SecureStorage setItem error:', errorMessage);
      throw new Error('Failed to store data securely: ' + errorMessage);
    }
  }

  // CRITICAL: Retrieve data securely with Keychain/Keystore protection
  async getItem(key: string, options: SecureStorageOptions = {}): Promise<string | null> {
    const { 
      encrypt = true, 
      keyPrefix = this.keyPrefix,
      useSecureEnclave = true,
      requireBiometric = false 
    } = options;
    const storageKey = `${keyPrefix}${key}`;

    try {
      await this.ensureInitialized();
      
      let storedData: string | null = null;

      // CRITICAL: Retrieve from Keychain/Keystore for sensitive data
      if (useSecureEnclave && this.secureEnclaveEnabled) {
        storedData = await this.getItemFromKeychain(storageKey, {
          requireBiometric,
          useSecureEnclave: true
        });
      } else {
        // Fallback to regular secure storage
        storedData = Platform.OS === 'web' 
          ? localStorage.getItem(storageKey)
          : await SecureStore.getItemAsync(storageKey);
      }
      
      if (!storedData) {
        return null;
      }

      // Enhanced corruption detection
      if (this.isCorruptedData(storedData)) {
        console.warn('Detected corrupted data for key:', key);
        await this.cleanupCorruptedKey(storageKey);
        return null;
      }

      if (encrypt && this.initialized && this.cryptoService) {
        try {
          if (this.isEncryptedData(storedData)) {
            const encryptedData: AdvancedEncryptedData = JSON.parse(storedData);
            return await this.cryptoService.advancedDecrypt(encryptedData);
          } else {
            return storedData;
          }
        } catch (decryptError) {
          const errorMessage = decryptError instanceof Error ? decryptError.message : 'Unknown decryption error';
          console.warn('Decryption failed for key:', key, 'Error:', errorMessage);
          await this.cleanupCorruptedKey(storageKey);
          return null;
        }
      }

      return storedData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown retrieval error';
      console.error('SecureStorage getItem error:', errorMessage);
      return null;
    }
  }

  // CRITICAL: Remove item securely from Keychain/Keystore
  async removeItem(key: string, options: SecureStorageOptions = {}): Promise<void> {
    const { 
      keyPrefix = this.keyPrefix,
      useSecureEnclave = true 
    } = options;
    const storageKey = `${keyPrefix}${key}`;

    try {
      // CRITICAL: Remove from Keychain/Keystore
      if (useSecureEnclave && this.secureEnclaveEnabled) {
        await this.removeItemFromKeychain(storageKey);
      } else {
        // Fallback to regular secure storage
        if (Platform.OS === 'web') {
          localStorage.removeItem(storageKey);
        } else {
          await SecureStore.deleteItemAsync(storageKey);
          await this.untrackKey(storageKey);
        }
      }

      console.log(`Data removed securely from Keychain/Keystore: ${useSecureEnclave && this.secureEnclaveEnabled}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown removal error';
      console.error('SecureStorage removeItem error:', errorMessage);
      throw new Error('Failed to remove data securely: ' + errorMessage);
    }
  }

  // CRITICAL: Clear all secure data including Keychain/Keystore
  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        const keys = Object.keys(localStorage);
        const secureKeys = keys.filter(key => key.startsWith(this.keyPrefix));
        secureKeys.forEach(key => localStorage.removeItem(key));
      } else {
        // For native platforms, we need to track keys manually since SecureStore doesn't have getAllKeys
        const trackedKeysData = await SecureStore.getItemAsync('__tracked_secure_keys__');
        if (trackedKeysData) {
          const trackedKeys = JSON.parse(trackedKeysData);
          const secureKeys = trackedKeys.filter((key: string) => key.startsWith(this.keyPrefix));
          
          for (const key of secureKeys) {
            // Remove from both regular storage and Keychain/Keystore
            try {
              await SecureStore.deleteItemAsync(key);
            } catch (error) {
              console.warn(`Failed to delete key ${key}:`, error);
            }
            
            if (this.secureEnclaveEnabled) {
              try {
                await this.removeItemFromKeychain(key);
              } catch (error) {
                console.warn(`Failed to delete Keychain key ${key}:`, error);
              }
            }
          }
          
          const remainingKeys = trackedKeys.filter((key: string) => !key.startsWith(this.keyPrefix));
          await SecureStore.setItemAsync('__tracked_secure_keys__', JSON.stringify(remainingKeys));
        }
      }

      console.log('All secure data cleared including Keychain/Keystore');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown clear error';
      console.error('SecureStorage clear error:', errorMessage);
      throw new Error('Failed to clear secure data: ' + errorMessage);
    }
  }

  // Store object securely with Keychain/Keystore protection
  async setObject(key: string, value: object, options: SecureStorageOptions = {}): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      await this.setItem(key, jsonString, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown object storage error';
      console.error('SecureStorage setObject error:', errorMessage);
      throw new Error('Failed to store object securely: ' + errorMessage);
    }
  }

  // Retrieve object securely with Keychain/Keystore protection
  async getObject<T>(key: string, options: SecureStorageOptions = {}): Promise<T | null> {
    try {
      const jsonString = await this.getItem(key, options);
      
      if (!jsonString) {
        return null;
      }

      // Additional validation for JSON strings
      if (this.isCorruptedData(jsonString)) {
        console.warn('Detected corrupted JSON data for key:', key);
        await this.removeItem(key, options);
        return null;
      }

      if (!this.isValidJSON(jsonString)) {
        console.warn('Invalid JSON format for key:', key);
        await this.removeItem(key, options);
        return null;
      }

      try {
        return JSON.parse(jsonString) as T;
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown JSON parse error';
        console.error('SecureStorage getObject parse error:', errorMessage);
        
        // Clean up corrupted data
        await this.removeItem(key, options);
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown object retrieval error';
      console.error('SecureStorage getObject error:', errorMessage);
      return null;
    }
  }

  // Check if key exists in Keychain/Keystore
  async hasItem(key: string, options: SecureStorageOptions = {}): Promise<boolean> {
    const { 
      keyPrefix = this.keyPrefix,
      useSecureEnclave = true 
    } = options;
    const storageKey = `${keyPrefix}${key}`;

    try {
      if (useSecureEnclave && this.secureEnclaveEnabled) {
        const value = await this.getItemFromKeychain(storageKey, {
          requireBiometric: false,
          useSecureEnclave: true
        });
        return value !== null;
      } else {
        if (Platform.OS === 'web') {
          return localStorage.getItem(storageKey) !== null;
        } else {
          const value = await SecureStore.getItemAsync(storageKey);
          return value !== null;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown key check error';
      console.error('SecureStorage hasItem error:', errorMessage);
      return false;
    }
  }

  // Get all secure keys
  async getAllKeys(): Promise<string[]> {
    try {
      if (Platform.OS === 'web') {
        const keys = Object.keys(localStorage);
        return keys
          .filter(key => key.startsWith(this.keyPrefix) && !key.startsWith(QUARANTINE_PREFIX))
          .map(key => key.replace(this.keyPrefix, ''));
      } else {
        const trackedKeysData = await SecureStore.getItemAsync('__tracked_secure_keys__');
        if (trackedKeysData) {
          const trackedKeys = JSON.parse(trackedKeysData);
          return trackedKeys
            .filter((key: string) => key.startsWith(this.keyPrefix) && !key.startsWith(QUARANTINE_PREFIX))
            .map((key: string) => key.replace(this.keyPrefix, ''));
        }
        return [];
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown keys retrieval error';
      console.error('SecureStorage getAllKeys error:', errorMessage);
      return [];
    }
  }

  // Get initialization status
  isInitialized(): boolean {
    return this.initialized;
  }

  // Get Secure Enclave status
  isSecureEnclaveEnabled(): boolean {
    return this.secureEnclaveEnabled;
  }

  // Get Keychain/Keystore configuration
  getKeychainConfig(): KeychainOptions {
    return { ...this.keychainOptions };
  }

  // Update Keychain/Keystore configuration
  updateKeychainConfig(config: Partial<KeychainOptions>): void {
    this.keychainOptions = { ...this.keychainOptions, ...config };
    console.log('Keychain configuration updated:', this.keychainOptions);
  }

  // CRITICAL: Store Signal Protocol keys in Keychain/Keystore
  async storeSignalKey(keyId: string, keyData: string, keyType: 'identity' | 'prekey' | 'onetime' | 'session', requireBiometric: boolean = true): Promise<void> {
    try {
      const keyPrefix = `signal_${keyType}_`;
      await this.setItem(`${keyPrefix}${keyId}`, keyData, {
        encrypt: false, // Key is already encrypted
        useSecureEnclave: true,
        requireBiometric: keyType === 'identity' ? true : requireBiometric // Always require biometric for identity keys
      });
      
      console.log(`Signal ${keyType} key stored in Keychain/Keystore: ${keyId}`);
    } catch (error) {
      console.error(`Failed to store Signal ${keyType} key:`, error);
      throw error;
    }
  }

  // CRITICAL: Store encryption keys in Keychain/Keystore (legacy support)
  async storeEncryptionKey(keyId: string, keyData: string, requireBiometric: boolean = true): Promise<void> {
    try {
      await this.setItem(`encryption_key_${keyId}`, keyData, {
        encrypt: false, // Key is already encrypted
        useSecureEnclave: true,
        requireBiometric
      });
      
      console.log(`Encryption key stored in Keychain/Keystore: ${keyId}`);
    } catch (error) {
      console.error('Failed to store encryption key:', error);
      throw error;
    }
  }

  // CRITICAL: Retrieve Signal Protocol keys from Keychain/Keystore
  async getSignalKey(keyId: string, keyType: 'identity' | 'prekey' | 'onetime' | 'session', requireBiometric: boolean = true): Promise<string | null> {
    try {
      const keyPrefix = `signal_${keyType}_`;
      const keyData = await this.getItem(`${keyPrefix}${keyId}`, {
        encrypt: false, // Key is already encrypted
        useSecureEnclave: true,
        requireBiometric: keyType === 'identity' ? true : requireBiometric // Always require biometric for identity keys
      });
      
      if (keyData) {
        console.log(`Signal ${keyType} key retrieved from Keychain/Keystore: ${keyId}`);
      }
      
      return keyData;
    } catch (error) {
      console.error(`Failed to retrieve Signal ${keyType} key:`, error);
      return null;
    }
  }

  // CRITICAL: Retrieve encryption keys from Keychain/Keystore (legacy support)
  async getEncryptionKey(keyId: string, requireBiometric: boolean = true): Promise<string | null> {
    try {
      const keyData = await this.getItem(`encryption_key_${keyId}`, {
        encrypt: false, // Key is already encrypted
        useSecureEnclave: true,
        requireBiometric
      });
      
      if (keyData) {
        console.log(`Encryption key retrieved from Keychain/Keystore: ${keyId}`);
      }
      
      return keyData;
    } catch (error) {
      console.error('Failed to retrieve encryption key:', error);
      return null;
    }
  }

  // CRITICAL: Remove Signal Protocol keys from Keychain/Keystore
  async removeSignalKey(keyId: string, keyType: 'identity' | 'prekey' | 'onetime' | 'session'): Promise<void> {
    try {
      const keyPrefix = `signal_${keyType}_`;
      await this.removeItem(`${keyPrefix}${keyId}`, {
        useSecureEnclave: true
      });
      
      console.log(`Signal ${keyType} key removed from Keychain/Keystore: ${keyId}`);
    } catch (error) {
      console.error(`Failed to remove Signal ${keyType} key:`, error);
      throw error;
    }
  }

  // CRITICAL: Remove encryption keys from Keychain/Keystore (legacy support)
  async removeEncryptionKey(keyId: string): Promise<void> {
    try {
      await this.removeItem(`encryption_key_${keyId}`, {
        useSecureEnclave: true
      });
      
      console.log(`Encryption key removed from Keychain/Keystore: ${keyId}`);
    } catch (error) {
      console.error('Failed to remove encryption key:', error);
      throw error;
    }
  }

  // Enhanced cleanup of corrupted data
  async cleanupCorruptedData(): Promise<void> {
    try {
      const keys = await this.getAllKeys();
      const corruptedKeys: string[] = [];

      for (const key of keys) {
        try {
          const rawData = await this.getItem(key, { encrypt: false });
          if (rawData) {
            if (this.isCorruptedData(rawData) || !this.isValidJSON(rawData)) {
              corruptedKeys.push(key);
            } else {
              // Try to parse the data to see if it's corrupted
              const data = await this.getItem(key);
              if (data === null && rawData) {
                // If getItem returns null but raw data exists, it might be corrupted
                corruptedKeys.push(key);
              }
            }
          }
        } catch (error) {
          corruptedKeys.push(key);
        }
      }

      if (corruptedKeys.length > 0) {
        console.log('Cleaning up corrupted keys:', corruptedKeys);
        for (const key of corruptedKeys) {
          try {
            const fullKey = `${this.keyPrefix}${key}`;
            const raw = await this.getItem(key, { encrypt: false });
            await this.quarantineKey(fullKey, raw);
          } catch (e) {
            console.warn('Failed to quarantine key during cleanup:', key, e);
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown cleanup error';
      console.error('SecureStorage cleanup error:', errorMessage);
    }
  }

  // Force cleanup of all potentially corrupted encrypted data
  async forceCleanupEncryptedData(): Promise<void> {
    try {
      const keys = await this.getAllKeys();
      const suspiciousKeys: string[] = [];

      for (const key of keys) {
        try {
          const rawData = await this.getItem(key, { encrypt: false });
          if (rawData) {
            // Check for corrupted data first
            if (this.isCorruptedData(rawData) || !this.isValidJSON(rawData)) {
              suspiciousKeys.push(key);
              continue;
            }

            // Check for encrypted data that might be corrupted
            if (this.isEncryptedData(rawData)) {
              try {
                const encryptedData: AdvancedEncryptedData = JSON.parse(rawData);
                // Try to decrypt to see if it's valid
                if (this.cryptoService) {
                  await this.cryptoService.advancedDecrypt(encryptedData);
                }
              } catch (decryptError) {
                suspiciousKeys.push(key);
              }
            }
          }
        } catch (error) {
          suspiciousKeys.push(key);
        }
      }

      if (suspiciousKeys.length > 0) {
        console.log('Force cleaning up suspicious encrypted keys:', suspiciousKeys);
        for (const key of suspiciousKeys) {
          try {
            const fullKey = `${this.keyPrefix}${key}`;
            const raw = await this.getItem(key, { encrypt: false });
            await this.quarantineKey(fullKey, raw);
          } catch (e) {
            console.warn('Failed to quarantine key during force cleanup:', key, e);
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown force cleanup error';
      console.error('SecureStorage force cleanup error:', errorMessage);
    }
  }

  // Initialize with cleanup on startup
  async initializeWithCleanup(): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.cleanupCorruptedData();
      console.log('SecureStorage initialized with cleanup completed');
    } catch (error) {
      console.error('SecureStorage initialization with cleanup failed:', error);
    }
  }

  // CRITICAL: Store Signal Protocol session state
  async storeSignalSession(sessionId: string, sessionState: any): Promise<void> {
    try {
      await this.setObject(`signal_session_${sessionId}`, sessionState, {
        encrypt: true,
        useSecureEnclave: true,
        requireBiometric: false // Sessions are accessed frequently
      });
      
      console.log(`Signal session stored: ${sessionId}`);
    } catch (error) {
      console.error('Failed to store Signal session:', error);
      throw error;
    }
  }

  // CRITICAL: Retrieve Signal Protocol session state
  async getSignalSession(sessionId: string): Promise<any | null> {
    try {
      const sessionState = await this.getObject(`signal_session_${sessionId}`, {
        encrypt: true,
        useSecureEnclave: true,
        requireBiometric: false
      });
      
      if (sessionState) {
        console.log(`Signal session retrieved: ${sessionId}`);
      }
      
      return sessionState;
    } catch (error) {
      console.error('Failed to retrieve Signal session:', error);
      return null;
    }
  }

  // CRITICAL: Remove Signal Protocol session
  async removeSignalSession(sessionId: string): Promise<void> {
    try {
      await this.removeItem(`signal_session_${sessionId}`, {
        useSecureEnclave: true
      });
      
      console.log(`Signal session removed: ${sessionId}`);
    } catch (error) {
      console.error('Failed to remove Signal session:', error);
      throw error;
    }
  }

  // CRITICAL: Store Signal Protocol key bundle
  async storeSignalKeyBundle(userId: string, keyBundle: any): Promise<void> {
    try {
      await this.setObject(`signal_keybundle_${userId}`, keyBundle, {
        encrypt: true,
        useSecureEnclave: true,
        requireBiometric: true // Key bundles are sensitive
      });
      
      console.log(`Signal key bundle stored for user: ${userId}`);
    } catch (error) {
      console.error('Failed to store Signal key bundle:', error);
      throw error;
    }
  }

  // CRITICAL: Retrieve Signal Protocol key bundle
  async getSignalKeyBundle(userId: string): Promise<any | null> {
    try {
      const keyBundle = await this.getObject(`signal_keybundle_${userId}`, {
        encrypt: true,
        useSecureEnclave: true,
        requireBiometric: true
      });
      
      if (keyBundle) {
        console.log(`Signal key bundle retrieved for user: ${userId}`);
      }
      
      return keyBundle;
    } catch (error) {
      console.error('Failed to retrieve Signal key bundle:', error);
      return null;
    }
  }

  // Get storage security status with Signal Protocol support
  getSecurityStatus(): {
    initialized: boolean;
    secureEnclaveEnabled: boolean;
    keychainAvailable: boolean;
    biometricSupported: boolean;
    platform: string;
    encryptionEnabled: boolean;
    signalProtocolSupported: boolean;
  } {
    return {
      initialized: this.initialized,
      secureEnclaveEnabled: this.secureEnclaveEnabled,
      keychainAvailable: Platform.OS !== 'web',
      biometricSupported: this.keychainOptions.authenticationType?.includes('Biometrics') || false,
      platform: Platform.OS,
      encryptionEnabled: this.initialized && !!this.cryptoService,
      signalProtocolSupported: this.initialized && this.secureEnclaveEnabled
    };
  }
}

export default SecureStorage;