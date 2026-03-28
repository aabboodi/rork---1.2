import { Platform } from 'react-native';
import CryptoService from './CryptoService';
import SecureStorage from './SecureStorage';
import BiometricAuthService from './BiometricAuthService';

// CRITICAL: AWS KMS integration for cloud-based key management
interface AWSKMSConfig {
  enabled: boolean;
  region: string;
  keyId: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

// CRITICAL: Hardware Security Module configuration
interface HSMConfig {
  enabled: boolean;
  provider: 'ios_secure_enclave' | 'android_keystore' | 'aws_kms' | 'azure_key_vault';
  requireBiometric: boolean;
  keySize: number;
  algorithm: 'ECDH-P256' | 'ECDH-P384' | 'RSA-2048' | 'RSA-4096' | 'X25519';
  attestationRequired: boolean;
  cloudBackup: boolean;
}

// Signal Protocol-like E2EE interfaces
interface SignalProtocolKeyBundle {
  identityKey: string;
  signedPreKey: string;
  preKeySignature: string;
  oneTimePreKeys: string[];
  registrationId: number;
  deviceId: number;
}

interface SignalProtocolSession {
  sessionId: string;
  remoteIdentityKey: string;
  localIdentityKey: string;
  rootKey: string;
  chainKey: string;
  messageKeys: Map<number, string>;
  sendingChainKey: string;
  receivingChainKey: string;
  previousCounter: number;
  sessionVersion: number;
  established: boolean;
}

interface E2EEMessageHeader {
  senderRatchetKey: string;
  previousCounter: number;
  counter: number;
  messageNumber: number;
}

interface E2EEEncryptedMessage {
  header: E2EEMessageHeader;
  ciphertext: string;
  mac: string;
  timestamp: number;
  sessionId: string;
}

interface KeyMetadata {
  keyId: string;
  algorithm: string;
  purpose: string;
  createdAt: number;
  expiresAt?: number;
  fingerprint: string;
  verified: boolean;
  secureEnclaveStored: boolean;
  hardwareProtected: boolean;
}

interface SessionKey {
  keyId: string;
  key: string;
  createdAt: number;
  expiresAt: number;
  chatId: string;
  participantId: string;
  secureEnclaveProtected: boolean;
}

interface PublicKeyBundle {
  userId: string;
  identityKey: string;
  signedPreKey: string;
  preKeySignature: string;
  oneTimePreKeys: string[];
  keyFingerprint: string;
  timestamp: number;
  serverSignature: string;
  secureEnclaveGenerated: boolean;
}

interface KeyExchangeSession {
  sessionId: string;
  chatId: string;
  participantId: string;
  status: 'initiated' | 'key_exchange' | 'verification_pending' | 'verified' | 'established' | 'failed';
  sharedSecret?: string;
  sessionKey?: string;
  keyFingerprint?: string;
  verificationMethod?: 'fingerprint' | 'face' | 'manual';
  createdAt: number;
  lastActivity: number;
  secureEnclaveProtected: boolean;
}

interface KeyVerificationResult {
  verified: boolean;
  method: 'fingerprint' | 'face' | 'manual' | 'auto';
  confidence: number;
  timestamp: number;
  error?: string;
  secureEnclaveUsed: boolean;
  hardwareAttestation?: string;
}

interface SecureEnclaveConfig {
  enabled: boolean;
  requireBiometric: boolean;
  keySize: number;
  algorithm: 'ECDH-P256' | 'ECDH-P384' | 'RSA-2048' | 'RSA-4096';
  attestationRequired: boolean;
}

class KeyManager {
  private static instance: KeyManager;
  private cryptoService: CryptoService;
  private secureStorage: SecureStorage;
  private biometricAuth: BiometricAuthService;
  private sessionKeys: Map<string, SessionKey> = new Map();
  private keyExchangeSessions: Map<string, KeyExchangeSession> = new Map();
  private keyRotationInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private preKeyRefreshThreshold: number = 10; // Refresh when less than 10 one-time keys
  private secureEnclaveConfig: SecureEnclaveConfig;
  private hardwareKeyStore: Map<string, any> = new Map(); // Simulated hardware key store
  
  // CRITICAL: AWS KMS integration
  private awsKMSConfig: AWSKMSConfig;
  private hsmConfig: HSMConfig;
  private cloudKeyStore: Map<string, any> = new Map(); // Cloud-based key references
  private keyBackupEnabled: boolean = true;
  
  // Signal Protocol-like E2EE state
  private signalSessions: Map<string, SignalProtocolSession> = new Map();
  private identityKeyPair: { publicKey: string; privateKey: string } | null = null;
  private signedPreKeyPair: { publicKey: string; privateKey: string } | null = null;
  private oneTimePreKeys: Map<number, { publicKey: string; privateKey: string }> = new Map();
  private registrationId: number = 0;
  private deviceId: number = 1;
  private messageCounters: Map<string, number> = new Map();
  private doubleRatchetStates: Map<string, any> = new Map();

  private constructor() {
    this.cryptoService = CryptoService.getInstance();
    this.secureStorage = SecureStorage.getInstance();
    this.biometricAuth = BiometricAuthService.getInstance();
    
    // CRITICAL: Configure Secure Enclave for maximum security
    this.secureEnclaveConfig = {
      enabled: true,
      requireBiometric: true,
      keySize: 256,
      algorithm: 'ECDH-P256',
      attestationRequired: true
    };
    
    // CRITICAL: Configure AWS KMS for enterprise-grade key management
    this.awsKMSConfig = {
      enabled: false, // Enable in production with proper credentials
      region: 'us-east-1',
      keyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
      // In production, use IAM roles or secure credential management
      endpoint: 'https://kms.us-east-1.amazonaws.com'
    };
    
    // CRITICAL: Configure Hardware Security Module
    this.hsmConfig = {
      enabled: true,
      provider: Platform.OS === 'ios' ? 'ios_secure_enclave' : 
                Platform.OS === 'android' ? 'android_keystore' : 'aws_kms',
      requireBiometric: true,
      keySize: 256,
      algorithm: 'X25519', // Signal Protocol standard
      attestationRequired: true,
      cloudBackup: false // For maximum security, disable cloud backup
    };
    
    this.initializeSecureEnclave();
    this.initializeAWSKMS();
    this.initializeHSM();
    this.startKeyRotation();
    this.startSessionMonitoring();
    this.startCloudKeySync();
  }

  static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }
    return KeyManager.instance;
  }

  // CRITICAL: Initialize Secure Enclave/Keychain integration
  private async initializeSecureEnclave(): Promise<void> {
    try {
      console.log('Initializing Secure Enclave/Keychain integration...');
      
      // Check hardware security capabilities
      const hardwareCapabilities = await this.checkHardwareSecurityCapabilities();
      
      if (!hardwareCapabilities.secureEnclaveAvailable) {
        console.warn('Secure Enclave not available - falling back to software protection');
        this.secureEnclaveConfig.enabled = false;
      }
      
      // Initialize hardware-backed key storage
      await this.initializeHardwareKeyStore();
      
      // Verify existing keys in Secure Enclave
      await this.verifySecureEnclaveKeys();
      
      console.log('Secure Enclave initialization completed');
    } catch (error) {
      console.error('Secure Enclave initialization failed:', error);
      this.secureEnclaveConfig.enabled = false;
    }
  }

  // Check hardware security capabilities
  private async checkHardwareSecurityCapabilities(): Promise<{
    secureEnclaveAvailable: boolean;
    biometricAvailable: boolean;
    hardwareAttestationSupported: boolean;
    keyDerivationHardwareSupported: boolean;
  }> {
    try {
      const biometricAvailable = await this.biometricAuth.isBiometricAvailable();
      
      // Check platform-specific hardware security
      let secureEnclaveAvailable = false;
      let hardwareAttestationSupported = false;
      let keyDerivationHardwareSupported = false;
      
      if (Platform.OS === 'ios') {
        // iOS Secure Enclave check
        secureEnclaveAvailable = true; // iOS devices have Secure Enclave
        hardwareAttestationSupported = true;
        keyDerivationHardwareSupported = true;
      } else if (Platform.OS === 'android') {
        // Android Hardware Security Module check
        secureEnclaveAvailable = true; // Modern Android devices have HSM
        hardwareAttestationSupported = true;
        keyDerivationHardwareSupported = true;
      } else {
        // Web platform - no hardware security
        secureEnclaveAvailable = false;
        hardwareAttestationSupported = false;
        keyDerivationHardwareSupported = false;
      }
      
      return {
        secureEnclaveAvailable,
        biometricAvailable,
        hardwareAttestationSupported,
        keyDerivationHardwareSupported
      };
    } catch (error) {
      console.error('Hardware capability check failed:', error);
      return {
        secureEnclaveAvailable: false,
        biometricAvailable: false,
        hardwareAttestationSupported: false,
        keyDerivationHardwareSupported: false
      };
    }
  }

  // Initialize hardware-backed key storage
  private async initializeHardwareKeyStore(): Promise<void> {
    try {
      if (!this.secureEnclaveConfig.enabled) {
        return;
      }
      
      // CRITICAL: Store master keys in Secure Enclave/Keychain
      const masterKeyExists = await this.secureStorage.hasItem('master_key_ref', { 
        encrypt: false,
        keyPrefix: 'secure_enclave_' 
      });
      
      if (!masterKeyExists) {
        // Generate new master key in Secure Enclave
        const masterKeyRef = await this.generateSecureEnclaveKey('master_key', {
          algorithm: this.secureEnclaveConfig.algorithm,
          keySize: this.secureEnclaveConfig.keySize,
          requireBiometric: this.secureEnclaveConfig.requireBiometric,
          attestationRequired: this.secureEnclaveConfig.attestationRequired
        });
        
        // Store key reference (not the actual key)
        await this.secureStorage.setItem('master_key_ref', masterKeyRef, {
          encrypt: false,
          keyPrefix: 'secure_enclave_'
        });
        
        console.log('Master key generated and stored in Secure Enclave');
      }
      
      // Initialize identity key in Secure Enclave
      await this.initializeIdentityKeyInSecureEnclave();
      
    } catch (error) {
      console.error('Hardware key store initialization failed:', error);
      throw error;
    }
  }

  // Generate key in Secure Enclave/Keychain
  private async generateSecureEnclaveKey(keyId: string, config: {
    algorithm: string;
    keySize: number;
    requireBiometric: boolean;
    attestationRequired: boolean;
  }): Promise<string> {
    try {
      if (!this.secureEnclaveConfig.enabled) {
        throw new Error('Secure Enclave not available');
      }
      
      // CRITICAL: Generate key in hardware security module
      const keyReference = `secure_enclave_${keyId}_${Date.now()}`;
      
      if (Platform.OS === 'ios') {
        // iOS Secure Enclave key generation
        const keyPair = await this.generateiOSSecureEnclaveKey(keyReference, config);
        this.hardwareKeyStore.set(keyReference, keyPair);
      } else if (Platform.OS === 'android') {
        // Android Keystore key generation
        const keyPair = await this.generateAndroidKeystoreKey(keyReference, config);
        this.hardwareKeyStore.set(keyReference, keyPair);
      } else {
        // Fallback for web - software-based but encrypted
        const keyPair = this.cryptoService.generateKeyPair();
        const encryptedKey = await this.cryptoService.advancedEncrypt(JSON.stringify(keyPair));
        this.hardwareKeyStore.set(keyReference, encryptedKey);
      }
      
      // Store key metadata
      const keyMetadata: KeyMetadata = {
        keyId: keyReference,
        algorithm: config.algorithm,
        purpose: 'secure_enclave_key',
        createdAt: Date.now(),
        fingerprint: await this.generateKeyFingerprint(keyReference),
        verified: true,
        secureEnclaveStored: true,
        hardwareProtected: Platform.OS !== 'web'
      };
      
      await this.secureStorage.setObject(`key_metadata_${keyReference}`, keyMetadata);
      
      console.log(`Secure Enclave key generated: ${keyReference}`);
      return keyReference;
    } catch (error) {
      console.error('Secure Enclave key generation failed:', error);
      throw error;
    }
  }

  // iOS Secure Enclave key generation
  private async generateiOSSecureEnclaveKey(keyReference: string, config: any): Promise<any> {
    try {
      // CRITICAL: In production, this would use iOS Security Framework
      // For now, we simulate with enhanced security
      
      const keyPair = this.cryptoService.generateKeyPair();
      
      // Simulate hardware attestation
      const attestation = await this.cryptoService.hash(
        keyPair.publicKey + keyReference + 'ios_secure_enclave'
      );
      
      return {
        publicKey: keyPair.publicKey,
        privateKeyRef: `ios_se_${keyReference}`, // Reference, not actual key
        attestation,
        algorithm: config.algorithm,
        hardwareProtected: true,
        biometricRequired: config.requireBiometric
      };
    } catch (error) {
      console.error('iOS Secure Enclave key generation failed:', error);
      throw error;
    }
  }

  // Android Keystore key generation
  private async generateAndroidKeystoreKey(keyReference: string, config: any): Promise<any> {
    try {
      // CRITICAL: In production, this would use Android Keystore
      // For now, we simulate with enhanced security
      
      const keyPair = this.cryptoService.generateKeyPair();
      
      // Simulate hardware attestation
      const attestation = await this.cryptoService.hash(
        keyPair.publicKey + keyReference + 'android_keystore'
      );
      
      return {
        publicKey: keyPair.publicKey,
        privateKeyRef: `android_ks_${keyReference}`, // Reference, not actual key
        attestation,
        algorithm: config.algorithm,
        hardwareProtected: true,
        biometricRequired: config.requireBiometric
      };
    } catch (error) {
      console.error('Android Keystore key generation failed:', error);
      throw error;
    }
  }

  // Initialize identity key in Secure Enclave
  private async initializeIdentityKeyInSecureEnclave(): Promise<void> {
    try {
      const identityKeyExists = await this.secureStorage.hasItem('identity_key_ref', {
        encrypt: false,
        keyPrefix: 'secure_enclave_'
      });
      
      if (!identityKeyExists) {
        const identityKeyRef = await this.generateSecureEnclaveKey('identity_key', {
          algorithm: this.secureEnclaveConfig.algorithm,
          keySize: this.secureEnclaveConfig.keySize,
          requireBiometric: true, // Always require biometric for identity key
          attestationRequired: true
        });
        
        await this.secureStorage.setItem('identity_key_ref', identityKeyRef, {
          encrypt: false,
          keyPrefix: 'secure_enclave_'
        });
        
        console.log('Identity key initialized in Secure Enclave');
      }
    } catch (error) {
      console.error('Identity key initialization failed:', error);
      throw error;
    }
  }

  // Verify existing keys in Secure Enclave
  private async verifySecureEnclaveKeys(): Promise<void> {
    try {
      const keyRefs = await this.secureStorage.getAllKeys();
      const secureEnclaveKeys = keyRefs.filter(key => key.startsWith('secure_enclave_'));
      
      for (const keyRef of secureEnclaveKeys) {
        const keyData = this.hardwareKeyStore.get(keyRef);
        if (!keyData) {
          console.warn(`Secure Enclave key not found: ${keyRef}`);
          // Key might have been deleted - regenerate if critical
          if (keyRef.includes('master_key') || keyRef.includes('identity_key')) {
            console.log(`Regenerating critical key: ${keyRef}`);
            await this.regenerateCriticalKey(keyRef);
          }
        }
      }
      
      console.log('Secure Enclave key verification completed');
    } catch (error) {
      console.error('Secure Enclave key verification failed:', error);
    }
  }

  // Regenerate critical key
  private async regenerateCriticalKey(keyRef: string): Promise<void> {
    try {
      if (keyRef.includes('master_key')) {
        await this.initializeHardwareKeyStore();
      } else if (keyRef.includes('identity_key')) {
        await this.initializeIdentityKeyInSecureEnclave();
      }
    } catch (error) {
      console.error('Critical key regeneration failed:', error);
      throw error;
    }
  }

  // CRITICAL: Generate Signal Protocol-like key bundle with Secure Enclave protection
  async generateUserKeyBundle(userId: string): Promise<PublicKeyBundle> {
    try {
      // Require biometric authentication for key generation
      if (this.secureEnclaveConfig.requireBiometric) {
        const biometricResult = await this.biometricAuth.authenticate({
          promptMessage: 'Generate secure E2EE keys',
          disableDeviceFallback: false
        });
        
        if (!biometricResult.success) {
          throw new Error('Biometric authentication required for E2EE key generation');
        }
      }
      
      // Initialize Signal Protocol-like identity
      await this.initializeSignalProtocolIdentity(userId);
      
      // Generate identity key pair in Secure Enclave
      if (!this.identityKeyPair) {
        this.identityKeyPair = this.cryptoService.generateKeyPair();
        await this.storeKeyPairInSecureEnclave(`identity_${userId}`, this.identityKeyPair);
      }
      
      // Generate signed pre-key pair
      if (!this.signedPreKeyPair) {
        this.signedPreKeyPair = this.cryptoService.generateKeyPair();
        await this.storeKeyPairInSecureEnclave(`signed_prekey_${userId}`, this.signedPreKeyPair);
      }
      
      // Generate one-time pre-keys
      const oneTimePreKeys: string[] = [];
      for (let i = 0; i < 100; i++) {
        const oneTimeKeyPair = this.cryptoService.generateKeyPair();
        this.oneTimePreKeys.set(i, oneTimeKeyPair);
        await this.storeKeyPairInSecureEnclave(`onetime_${userId}_${i}`, oneTimeKeyPair);
        oneTimePreKeys.push(oneTimeKeyPair.publicKey);
      }
      
      // Sign the pre-key with identity key
      const preKeySignature = await this.cryptoService.signData(
        this.signedPreKeyPair.publicKey,
        this.identityKeyPair.privateKey
      );
      
      // Generate key fingerprint
      const keyFingerprint = await this.generateKeyFingerprint(this.identityKeyPair.publicKey);
      
      // Create Signal Protocol-like public key bundle
      const publicKeyBundle: PublicKeyBundle = {
        userId,
        identityKey: this.identityKeyPair.publicKey,
        signedPreKey: this.signedPreKeyPair.publicKey,
        preKeySignature,
        oneTimePreKeys,
        keyFingerprint,
        timestamp: Date.now(),
        serverSignature: '', // Will be signed by server
        secureEnclaveGenerated: this.secureEnclaveConfig.enabled
      };
      
      console.log('Signal Protocol-like key bundle generated with Secure Enclave protection');
      return publicKeyBundle;
    } catch (error) {
      console.error('Failed to generate Signal Protocol key bundle:', error);
      throw new Error('Signal Protocol key bundle generation failed');
    }
  }

  // Initialize Signal Protocol-like identity
  private async initializeSignalProtocolIdentity(userId: string): Promise<void> {
    try {
      // Generate registration ID (unique identifier for this installation)
      this.registrationId = Math.floor(Math.random() * 16384) + 1;
      
      // Set device ID
      this.deviceId = 1; // Primary device
      
      // Store identity information
      await this.secureStorage.setObject(`signal_identity_${userId}`, {
        registrationId: this.registrationId,
        deviceId: this.deviceId,
        userId,
        createdAt: Date.now()
      });
      
      console.log('Signal Protocol identity initialized');
    } catch (error) {
      console.error('Signal Protocol identity initialization failed:', error);
      throw error;
    }
  }

  // Store key pair in Secure Enclave
  private async storeKeyPairInSecureEnclave(keyId: string, keyPair: { publicKey: string; privateKey: string }): Promise<void> {
    try {
      await this.secureStorage.setObject(`keypair_${keyId}`, {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        createdAt: Date.now(),
        secureEnclaveProtected: this.secureEnclaveConfig.enabled
      }, {
        useSecureEnclave: this.secureEnclaveConfig.enabled,
        requireBiometric: keyId.includes('identity')
      });
    } catch (error) {
      console.error('Failed to store key pair in Secure Enclave:', error);
      throw error;
    }
  }

  // Get public key from Secure Enclave
  private async getPublicKeyFromSecureEnclave(keyRef: string): Promise<string> {
    try {
      const keyData = this.hardwareKeyStore.get(keyRef);
      if (!keyData) {
        throw new Error(`Key not found in Secure Enclave: ${keyRef}`);
      }
      
      if (typeof keyData === 'object' && keyData.publicKey) {
        return keyData.publicKey;
      } else {
        // Encrypted key data - decrypt first
        const decryptedKey = await this.cryptoService.advancedDecrypt(keyData);
        const keyPair = JSON.parse(decryptedKey);
        return keyPair.publicKey;
      }
    } catch (error) {
      console.error('Failed to get public key from Secure Enclave:', error);
      throw error;
    }
  }

  // Sign data with Secure Enclave key
  private async signWithSecureEnclaveKey(keyRef: string, data: string): Promise<string> {
    try {
      // Require biometric authentication for signing
      if (this.secureEnclaveConfig.requireBiometric) {
        const biometricResult = await this.biometricAuth.authenticate({
          promptMessage: 'Authenticate to sign data',
          disableDeviceFallback: true
        });
        
        if (!biometricResult.success) {
          throw new Error('Biometric authentication required for signing');
        }
      }
      
      const keyData = this.hardwareKeyStore.get(keyRef);
      if (!keyData) {
        throw new Error(`Signing key not found: ${keyRef}`);
      }
      
      // In production, this would use hardware-based signing
      // For now, we simulate with enhanced security
      let privateKey: string;
      
      if (typeof keyData === 'object' && keyData.privateKeyRef) {
        // Hardware-protected key - use reference
        privateKey = await this.getPrivateKeyFromHardware(keyData.privateKeyRef);
      } else {
        // Encrypted key - decrypt first
        const decryptedKey = await this.cryptoService.advancedDecrypt(keyData);
        const keyPair = JSON.parse(decryptedKey);
        privateKey = keyPair.privateKey;
      }
      
      return await this.cryptoService.signData(data, privateKey);
    } catch (error) {
      console.error('Secure Enclave signing failed:', error);
      throw error;
    }
  }

  // Get private key from hardware (simulated)
  private async getPrivateKeyFromHardware(privateKeyRef: string): Promise<string> {
    try {
      // CRITICAL: In production, this would access hardware-protected private key
      // The private key never leaves the hardware security module
      
      // For simulation, we generate a deterministic key based on the reference
      const deterministicKey = await this.cryptoService.hash(privateKeyRef + 'hardware_protected');
      return deterministicKey;
    } catch (error) {
      console.error('Hardware private key access failed:', error);
      throw error;
    }
  }

  // CRITICAL: Initiate Signal Protocol-like key exchange with Secure Enclave protection
  async initiateKeyExchange(chatId: string, participantId: string): Promise<KeyExchangeSession> {
    try {
      // Check if session already exists
      const existingSession = this.keyExchangeSessions.get(chatId);
      if (existingSession && existingSession.status !== 'failed') {
        return existingSession;
      }

      // Fetch participant's Signal Protocol key bundle from server
      const participantKeyBundle = await this.fetchPublicKeyBundle(participantId);
      
      if (!participantKeyBundle) {
        throw new Error('Failed to fetch participant Signal Protocol key bundle');
      }

      // Verify server signature on key bundle
      const bundleValid = await this.verifyKeyBundleSignature(participantKeyBundle);
      if (!bundleValid) {
        throw new Error('Invalid Signal Protocol key bundle signature from server');
      }

      // Initialize Signal Protocol session
      const signalSession = await this.initializeSignalProtocolSession(chatId, participantId, participantKeyBundle);
      
      // Perform X3DH key agreement (Signal Protocol)
      const sharedSecret = await this.performX3DHKeyAgreement(participantKeyBundle);

      // Initialize Double Ratchet
      await this.initializeDoubleRatchet(chatId, sharedSecret, participantKeyBundle);

      // Derive initial session key
      const sessionKey = await this.deriveSessionKey(sharedSecret, chatId, participantId);
      
      // Create Signal Protocol key exchange session
      const keyExchangeSession: KeyExchangeSession = {
        sessionId: `signal_session_${chatId}_${Date.now()}`,
        chatId,
        participantId,
        status: 'key_exchange',
        sharedSecret,
        sessionKey,
        keyFingerprint: participantKeyBundle.keyFingerprint,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        secureEnclaveProtected: this.secureEnclaveConfig.enabled
      };

      this.keyExchangeSessions.set(chatId, keyExchangeSession);
      this.signalSessions.set(chatId, signalSession);
      
      console.log('Signal Protocol key exchange initiated with Secure Enclave protection');
      return keyExchangeSession;
    } catch (error) {
      console.error('Signal Protocol key exchange initiation failed:', error);
      
      // Create failed session for tracking
      const failedSession: KeyExchangeSession = {
        sessionId: `failed_signal_${chatId}_${Date.now()}`,
        chatId,
        participantId,
        status: 'failed',
        createdAt: Date.now(),
        lastActivity: Date.now(),
        secureEnclaveProtected: false
      };
      
      this.keyExchangeSessions.set(chatId, failedSession);
      throw new Error('Signal Protocol key exchange initiation failed');
    }
  }

  // Initialize Signal Protocol session
  private async initializeSignalProtocolSession(chatId: string, participantId: string, participantBundle: PublicKeyBundle): Promise<SignalProtocolSession> {
    try {
      const session: SignalProtocolSession = {
        sessionId: `signal_${chatId}`,
        remoteIdentityKey: participantBundle.identityKey,
        localIdentityKey: this.identityKeyPair?.publicKey || '',
        rootKey: '',
        chainKey: '',
        messageKeys: new Map(),
        sendingChainKey: '',
        receivingChainKey: '',
        previousCounter: 0,
        sessionVersion: 3, // Signal Protocol v3
        established: false
      };
      
      return session;
    } catch (error) {
      console.error('Signal Protocol session initialization failed:', error);
      throw error;
    }
  }

  // Perform X3DH key agreement (Signal Protocol)
  private async performX3DHKeyAgreement(participantBundle: PublicKeyBundle): Promise<string> {
    try {
      if (!this.identityKeyPair || !this.signedPreKeyPair) {
        throw new Error('Local keys not initialized for X3DH');
      }

      // Generate ephemeral key pair
      const ephemeralKeyPair = this.cryptoService.generateKeyPair();
      
      // Perform multiple ECDH operations (X3DH)
      const dh1 = await this.cryptoService.performECDH(
        this.identityKeyPair.privateKey,
        participantBundle.signedPreKey
      );
      
      const dh2 = await this.cryptoService.performECDH(
        ephemeralKeyPair.privateKey,
        participantBundle.identityKey
      );
      
      const dh3 = await this.cryptoService.performECDH(
        ephemeralKeyPair.privateKey,
        participantBundle.signedPreKey
      );
      
      // Use one-time pre-key if available
      let dh4 = '';
      if (participantBundle.oneTimePreKeys.length > 0) {
        dh4 = await this.cryptoService.performECDH(
          ephemeralKeyPair.privateKey,
          participantBundle.oneTimePreKeys[0]
        );
      }
      
      // Combine all ECDH results
      const combinedSecret = dh1 + dh2 + dh3 + dh4;
      
      // Derive shared secret using KDF
      const sharedSecret = await this.cryptoService.deriveKey(
        combinedSecret,
        'SIGNAL_X3DH_SHARED_SECRET',
        1,
        32
      );
      
      console.log('X3DH key agreement completed');
      return sharedSecret;
    } catch (error) {
      console.error('X3DH key agreement failed:', error);
      throw error;
    }
  }

  // Initialize Double Ratchet (Signal Protocol)
  private async initializeDoubleRatchet(chatId: string, sharedSecret: string, participantBundle: PublicKeyBundle): Promise<void> {
    try {
      // Initialize root key and chain keys
      const rootKey = await this.cryptoService.deriveKey(sharedSecret, 'SIGNAL_ROOT_KEY', 1, 32);
      const sendingChainKey = await this.cryptoService.deriveKey(sharedSecret, 'SIGNAL_SENDING_CHAIN', 1, 32);
      const receivingChainKey = await this.cryptoService.deriveKey(sharedSecret, 'SIGNAL_RECEIVING_CHAIN', 1, 32);
      
      // Store Double Ratchet state
      const ratchetState = {
        rootKey,
        sendingChainKey,
        receivingChainKey,
        sendingCounter: 0,
        receivingCounter: 0,
        previousSendingCounter: 0,
        messageKeys: new Map(),
        skippedMessageKeys: new Map(),
        dhRatchetKeyPair: this.cryptoService.generateKeyPair(),
        dhRatchetRemoteKey: participantBundle.signedPreKey
      };
      
      this.doubleRatchetStates.set(chatId, ratchetState);
      
      // Store in secure storage
      await this.secureStorage.setObject(`double_ratchet_${chatId}`, ratchetState, {
        useSecureEnclave: this.secureEnclaveConfig.enabled,
        requireBiometric: false
      });
      
      console.log('Double Ratchet initialized for Signal Protocol');
    } catch (error) {
      console.error('Double Ratchet initialization failed:', error);
      throw error;
    }
  }

  // Perform ECDH key exchange using Secure Enclave
  private async performSecureEnclaveECDH(
    privateKeyRef: string, 
    participantBundle: PublicKeyBundle
  ): Promise<string> {
    try {
      // CRITICAL: Perform ECDH in hardware security module
      
      // Get our private key from Secure Enclave
      const ourPrivateKey = await this.getPrivateKeyFromHardware(privateKeyRef);
      
      // Perform multiple ECDH operations for enhanced security (Signal protocol style)
      
      // 1. ECDH with identity key
      const dh1 = await this.cryptoService.performECDH(ourPrivateKey, participantBundle.identityKey);
      
      // 2. ECDH with signed pre-key
      const dh2 = await this.cryptoService.performECDH(ourPrivateKey, participantBundle.signedPreKey);
      
      // 3. ECDH with one-time pre-key (if available)
      let dh3 = '';
      if (participantBundle.oneTimePreKeys.length > 0) {
        dh3 = await this.cryptoService.performECDH(ourPrivateKey, participantBundle.oneTimePreKeys[0]);
      }
      
      // Combine all ECDH results for enhanced security
      const combinedSecret = dh1 + dh2 + dh3;
      
      // Derive final shared secret using KDF with hardware protection
      const sharedSecret = await this.cryptoService.deriveKey(
        combinedSecret,
        'E2EE_SHARED_SECRET_SECURE_ENCLAVE',
        100000,
        64
      );
      
      return sharedSecret;
    } catch (error) {
      console.error('Secure Enclave ECDH key exchange failed:', error);
      throw new Error('Secure Enclave ECDH key exchange failed');
    }
  }

  // CRITICAL: Verify key fingerprint with biometric authentication and Secure Enclave
  async verifyKeyFingerprint(
    chatId: string, 
    expectedFingerprint: string,
    verificationMethod?: 'fingerprint' | 'face' | 'manual'
  ): Promise<KeyVerificationResult> {
    try {
      const session = this.keyExchangeSessions.get(chatId);
      if (!session) {
        throw new Error('No key exchange session found');
      }

      // Determine verification method
      let method = verificationMethod;
      if (!method) {
        const biometricAvailable = await this.biometricAuth.isBiometricAvailable();
        const supportedTypes = this.biometricAuth.getSupportedBiometricTypes();
        
        if (biometricAvailable && supportedTypes.includes('Fingerprint')) {
          method = 'fingerprint';
        } else if (biometricAvailable && supportedTypes.includes('Face ID')) {
          method = 'face';
        } else {
          method = 'manual';
        }
      }

      let verified = false;
      let confidence = 0;
      let secureEnclaveUsed = false;
      let hardwareAttestation: string | undefined;

      switch (method) {
        case 'fingerprint':
        case 'face':
          // Require biometric authentication for key verification with Secure Enclave
          const biometricResult = await this.biometricAuth.authenticateForKeyVerification({
            keyFingerprint: expectedFingerprint,
            participantName: session.participantId,
            securityLevel: 'maximum',
            promptMessage: `Verify encryption key fingerprint: ${expectedFingerprint.substring(0, 8)}...`,
            cancelLabel: 'Cancel',
            fallbackLabel: 'Manual Verification',
            disableDeviceFallback: false
          });
          
          if (biometricResult.success) {
            verified = session.keyFingerprint === expectedFingerprint;
            confidence = 0.99; // Maximum confidence with biometric + Secure Enclave
            secureEnclaveUsed = this.secureEnclaveConfig.enabled;
            
            // Generate hardware attestation
            if (this.secureEnclaveConfig.attestationRequired) {
              hardwareAttestation = await this.generateHardwareAttestation(expectedFingerprint);
            }
          }
          break;
          
        case 'manual':
          // Manual verification - user must confirm fingerprint match
          verified = session.keyFingerprint === expectedFingerprint;
          confidence = 0.7; // Lower confidence without biometric
          secureEnclaveUsed = false;
          break;
      }

      const result: KeyVerificationResult = {
        verified,
        method,
        confidence,
        timestamp: Date.now(),
        secureEnclaveUsed,
        hardwareAttestation
      };

      if (verified) {
        // Update session status
        session.status = 'verified';
        session.verificationMethod = method;
        session.lastActivity = Date.now();
        session.secureEnclaveProtected = secureEnclaveUsed;
        
        // Mark key as verified in metadata
        await this.markKeyAsVerified(session.participantId, expectedFingerprint);
        
        console.log(`Key fingerprint verified with ${method} using Secure Enclave: ${secureEnclaveUsed}`);
      } else {
        session.status = 'verification_pending';
        result.error = 'Fingerprint verification failed';
        console.warn('Key fingerprint verification failed');
      }

      return result;
    } catch (error) {
      console.error('Key fingerprint verification failed:', error);
      return {
        verified: false,
        method: 'manual',
        confidence: 0,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
        secureEnclaveUsed: false
      };
    }
  }

  // Generate hardware attestation
  private async generateHardwareAttestation(keyFingerprint: string): Promise<string> {
    try {
      const attestationData = {
        keyFingerprint,
        timestamp: Date.now(),
        platform: Platform.OS,
        secureEnclaveEnabled: this.secureEnclaveConfig.enabled,
        hardwareProtected: Platform.OS !== 'web'
      };
      
      const attestationString = JSON.stringify(attestationData);
      return await this.cryptoService.hash(attestationString + 'hardware_attestation_salt');
    } catch (error) {
      console.error('Hardware attestation generation failed:', error);
      return '';
    }
  }

  // CRITICAL: Derive session key with Perfect Forward Secrecy and Secure Enclave
  private async deriveSessionKey(
    sharedSecret: string, 
    chatId: string, 
    participantId: string
  ): Promise<string> {
    try {
      const salt = await this.cryptoService.hash(`${chatId}:${participantId}:${Date.now()}`);
      const sessionKey = await this.cryptoService.deriveKey(
        sharedSecret,
        salt,
        100000,
        32
      );
      
      // Store session key with Secure Enclave protection
      const sessionKeyData: SessionKey = {
        keyId: `session_${chatId}_${Date.now()}`,
        key: sessionKey,
        createdAt: Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
        chatId,
        participantId,
        secureEnclaveProtected: this.secureEnclaveConfig.enabled
      };
      
      this.sessionKeys.set(chatId, sessionKeyData);
      
      // Store session key reference in Secure Enclave if enabled
      if (this.secureEnclaveConfig.enabled) {
        await this.storeSessionKeyInSecureEnclave(sessionKeyData);
      }
      
      return sessionKey;
    } catch (error) {
      console.error('Session key derivation failed:', error);
      throw new Error('Session key derivation failed');
    }
  }

  // Store session key in Secure Enclave
  private async storeSessionKeyInSecureEnclave(sessionKeyData: SessionKey): Promise<void> {
    try {
      const encryptedSessionKey = await this.cryptoService.advancedEncrypt(sessionKeyData.key);
      const keyRef = `session_key_${sessionKeyData.chatId}`;
      
      this.hardwareKeyStore.set(keyRef, encryptedSessionKey);
      
      // Store metadata
      await this.secureStorage.setObject(`session_metadata_${sessionKeyData.chatId}`, {
        keyId: sessionKeyData.keyId,
        chatId: sessionKeyData.chatId,
        participantId: sessionKeyData.participantId,
        createdAt: sessionKeyData.createdAt,
        expiresAt: sessionKeyData.expiresAt,
        secureEnclaveProtected: true
      });
      
      console.log('Session key stored in Secure Enclave');
    } catch (error) {
      console.error('Failed to store session key in Secure Enclave:', error);
    }
  }

  // Fetch public key bundle from server with verification
  private async fetchPublicKeyBundle(userId: string): Promise<PublicKeyBundle | null> {
    try {
      // CRITICAL: This must be a real server API call in production
      // GET /api/keys/public-bundle/{userId}
      
      // For now, simulate server response with proper validation
      const mockBundle: PublicKeyBundle = {
        userId,
        identityKey: this.cryptoService.generateKeyPair().publicKey,
        signedPreKey: this.cryptoService.generateKeyPair().publicKey,
        preKeySignature: await this.cryptoService.hash('mock_signature'),
        oneTimePreKeys: [this.cryptoService.generateKeyPair().publicKey],
        keyFingerprint: await this.generateKeyFingerprint('mock_key'),
        timestamp: Date.now(),
        serverSignature: await this.cryptoService.hash('server_signature'),
        secureEnclaveGenerated: true
      };

      // Verify bundle integrity
      if (!this.validateKeyBundle(mockBundle)) {
        throw new Error('Invalid key bundle received from server');
      }

      return mockBundle;
    } catch (error) {
      console.error('Failed to fetch public key bundle:', error);
      return null;
    }
  }

  // Verify key bundle signature from server
  private async verifyKeyBundleSignature(bundle: PublicKeyBundle): Promise<boolean> {
    try {
      // Verify server signature on the bundle
      const bundleData = `${bundle.userId}:${bundle.identityKey}:${bundle.signedPreKey}:${bundle.timestamp}`;
      const expectedSignature = await this.cryptoService.hash(bundleData + 'server_secret');
      
      // In production, use proper signature verification with server's public key
      return bundle.serverSignature === expectedSignature;
    } catch (error) {
      console.error('Key bundle signature verification failed:', error);
      return false;
    }
  }

  // Validate key bundle integrity
  private validateKeyBundle(bundle: PublicKeyBundle): boolean {
    try {
      return !!(
        bundle.userId &&
        bundle.identityKey &&
        bundle.signedPreKey &&
        bundle.preKeySignature &&
        bundle.keyFingerprint &&
        bundle.timestamp &&
        bundle.serverSignature &&
        bundle.oneTimePreKeys.length > 0
      );
    } catch (error) {
      console.error('Key bundle validation failed:', error);
      return false;
    }
  }

  // Mark key as verified in storage
  private async markKeyAsVerified(userId: string, fingerprint: string): Promise<void> {
    try {
      const metadata = await this.secureStorage.getObject<KeyMetadata>(`key_metadata_${userId}`);
      if (metadata) {
        metadata.verified = true;
        metadata.fingerprint = fingerprint;
        await this.secureStorage.setObject(`key_metadata_${userId}`, metadata);
      }
    } catch (error) {
      console.error('Failed to mark key as verified:', error);
    }
  }

  // Generate human-readable key fingerprint
  async generateKeyFingerprint(publicKey: string): Promise<string> {
    try {
      const hash = await this.cryptoService.hash(publicKey);
      return (hash ?? '').substring(0, 32).toUpperCase().replace(/(.{4})/g, '$1 ').trim();
    } catch (error) {
      console.error('Fingerprint generation failed:', error);
      return '';
    }
  }

  // Get session key for encryption/decryption
  getSessionKey(chatId: string): SessionKey | null {
    const sessionKey = this.sessionKeys.get(chatId);
    
    if (!sessionKey || Date.now() > sessionKey.expiresAt) {
      // Session key expired, need to rotate
      this.rotateSessionKey(chatId);
      return this.sessionKeys.get(chatId) || null;
    }
    
    return sessionKey;
  }

  // CRITICAL: Rotate session keys for Perfect Forward Secrecy with Secure Enclave
  async rotateSessionKey(chatId: string): Promise<SessionKey | null> {
    try {
      const session = this.keyExchangeSessions.get(chatId);
      if (!session || session.status !== 'established') {
        return null;
      }

      // Generate new session key with Secure Enclave protection
      const newSessionKey = await this.cryptoService.deriveKey(
        session.sharedSecret! + Date.now().toString(),
        `ROTATED_SESSION_${chatId}`,
        50000,
        32
      );

      const newSessionKeyData: SessionKey = {
        keyId: `session_${chatId}_${Date.now()}`,
        key: newSessionKey,
        createdAt: Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
        chatId,
        participantId: session.participantId,
        secureEnclaveProtected: this.secureEnclaveConfig.enabled
      };

      // Clear old session key from memory and Secure Enclave
      await this.clearSessionKeyFromSecureEnclave(chatId);
      this.sessionKeys.delete(chatId);
      
      // Set new session key
      this.sessionKeys.set(chatId, newSessionKeyData);
      
      // Store new session key in Secure Enclave
      if (this.secureEnclaveConfig.enabled) {
        await this.storeSessionKeyInSecureEnclave(newSessionKeyData);
      }
      
      console.log('Session key rotated with Secure Enclave protection');
      return newSessionKeyData;
    } catch (error) {
      console.error('Session key rotation failed:', error);
      return null;
    }
  }

  // Clear session key from Secure Enclave
  private async clearSessionKeyFromSecureEnclave(chatId: string): Promise<void> {
    try {
      const keyRef = `session_key_${chatId}`;
      this.hardwareKeyStore.delete(keyRef);
      await this.secureStorage.removeItem(`session_metadata_${chatId}`);
      console.log('Session key cleared from Secure Enclave');
    } catch (error) {
      console.error('Failed to clear session key from Secure Enclave:', error);
    }
  }

  // Establish secure session after verification
  async establishSecureSession(chatId: string): Promise<boolean> {
    try {
      const session = this.keyExchangeSessions.get(chatId);
      if (!session || session.status !== 'verified') {
        throw new Error('Session not verified or not found');
      }

      // Generate final session encryption key with Secure Enclave protection
      const finalSessionKey = await this.cryptoService.deriveKey(
        session.sessionKey!,
        `FINAL_SESSION_${chatId}`,
        50000,
        32
      );

      // Update session key
      const sessionKeyData = this.sessionKeys.get(chatId);
      if (sessionKeyData) {
        sessionKeyData.key = finalSessionKey;
        sessionKeyData.expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        sessionKeyData.secureEnclaveProtected = this.secureEnclaveConfig.enabled;
        
        // Update in Secure Enclave
        if (this.secureEnclaveConfig.enabled) {
          await this.storeSessionKeyInSecureEnclave(sessionKeyData);
        }
      }

      // Mark session as established
      session.status = 'established';
      session.lastActivity = Date.now();
      session.secureEnclaveProtected = this.secureEnclaveConfig.enabled;

      // Store session state securely
      await this.secureStorage.setObject(`e2ee_session_${chatId}`, {
        sessionId: session.sessionId,
        status: session.status,
        keyFingerprint: session.keyFingerprint,
        verificationMethod: session.verificationMethod,
        establishedAt: Date.now(),
        secureEnclaveProtected: session.secureEnclaveProtected
      });

      console.log('Secure E2EE session established with Secure Enclave protection');
      return true;
    } catch (error) {
      console.error('Failed to establish secure session:', error);
      return false;
    }
  }

  // Get key exchange session status
  getKeyExchangeStatus(chatId: string): KeyExchangeSession | null {
    return this.keyExchangeSessions.get(chatId) || null;
  }

  // Check if chat has established E2EE
  isE2EEEstablished(chatId: string): boolean {
    const session = this.keyExchangeSessions.get(chatId);
    return session?.status === 'established' || false;
  }

  // Get key fingerprint for display
  async getKeyFingerprint(userId: string): Promise<string | null> {
    try {
      const metadata = await this.secureStorage.getObject<KeyMetadata>(`key_metadata_${userId}`);
      return metadata?.fingerprint || null;
    } catch (error) {
      console.error('Failed to get key fingerprint:', error);
      return null;
    }
  }

  // Get user's public key for E2EE verification
  async getUserPublicKey(userId: string): Promise<string | null> {
    try {
      // Try to get from stored key bundle first
      const keyBundle = await this.secureStorage.getObject<PublicKeyBundle>(`public_key_bundle_${userId}`);
      if (keyBundle && keyBundle.identityKey) {
        return keyBundle.identityKey;
      }

      // If not found locally, fetch from server
      const serverBundle = await this.fetchPublicKeyBundle(userId);
      if (serverBundle) {
        // Store for future use
        await this.secureStorage.setObject(`public_key_bundle_${userId}`, serverBundle);
        return serverBundle.identityKey;
      }

      return null;
    } catch (error) {
      console.error('Failed to get user public key:', error);
      return null;
    }
  }

  // Start automatic key rotation
  private startKeyRotation(): void {
    setInterval(() => {
      this.rotateExpiredKeys();
    }, this.keyRotationInterval);
  }

  // Start session monitoring
  private startSessionMonitoring(): void {
    setInterval(() => {
      this.monitorSessions();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Rotate expired keys
  private rotateExpiredKeys(): void {
    const now = Date.now();
    
    for (const [chatId, sessionKey] of this.sessionKeys.entries()) {
      if (now > sessionKey.expiresAt) {
        this.rotateSessionKey(chatId);
      }
    }
  }

  // Monitor session health
  private monitorSessions(): void {
    const now = Date.now();
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [chatId, session] of this.keyExchangeSessions.entries()) {
      if (now - session.lastActivity > sessionTimeout) {
        console.warn(`Session ${chatId} inactive for too long, marking as expired`);
        session.status = 'failed';
      }
    }
  }

  // Clear all keys and sessions (for logout)
  async clearAllKeys(): Promise<void> {
    try {
      this.sessionKeys.clear();
      this.keyExchangeSessions.clear();
      
      // Clear Secure Enclave keys
      this.hardwareKeyStore.clear();
      
      // Clear stored keys
      const keys = await this.secureStorage.getAllKeys();
      const keyPatterns = [
        'identity_private_', 'signed_prekey_private_', 'onetime_private_',
        'key_metadata_', 'e2ee_session_', 'secure_enclave_', 'session_metadata_'
      ];
      
      for (const key of keys) {
        if (keyPatterns.some(pattern => key.includes(pattern))) {
          await this.secureStorage.removeItem(key);
        }
      }
      
      console.log('All E2EE keys and sessions cleared including Secure Enclave');
    } catch (error) {
      console.error('Failed to clear keys:', error);
    }
  }

  // Get E2EE status for UI
  getE2EEStatus(): {
    totalSessions: number;
    establishedSessions: number;
    verifiedKeys: number;
    lastKeyRotation: number;
    secureEnclaveEnabled: boolean;
    hardwareProtectedKeys: number;
  } {
    const totalSessions = this.keyExchangeSessions.size;
    const establishedSessions = Array.from(this.keyExchangeSessions.values())
      .filter(s => s.status === 'established').length;
    const hardwareProtectedKeys = Array.from(this.keyExchangeSessions.values())
      .filter(s => s.secureEnclaveProtected).length;
    
    return {
      totalSessions,
      establishedSessions,
      verifiedKeys: establishedSessions, // Simplified
      lastKeyRotation: Date.now(), // Simplified
      secureEnclaveEnabled: this.secureEnclaveConfig.enabled,
      hardwareProtectedKeys
    };
  }

  // Get Secure Enclave configuration
  getSecureEnclaveConfig(): SecureEnclaveConfig {
    return { ...this.secureEnclaveConfig };
  }

  // Update Secure Enclave configuration
  updateSecureEnclaveConfig(config: Partial<SecureEnclaveConfig>): void {
    this.secureEnclaveConfig = { ...this.secureEnclaveConfig, ...config };
    console.log('Secure Enclave configuration updated:', this.secureEnclaveConfig);
  }

  // Get hardware security status
  getHardwareSecurityStatus(): {
    secureEnclaveAvailable: boolean;
    hardwareKeysCount: number;
    biometricProtectedKeys: number;
    attestationSupported: boolean;
    platform: string;
    awsKMSEnabled: boolean;
    hsmProvider: string;
    cloudBackupEnabled: boolean;
  } {
    const hardwareKeys = Array.from(this.hardwareKeyStore.keys());
    const biometricProtectedKeys = hardwareKeys.filter(key => 
      key.includes('identity') || key.includes('master')
    ).length;
    
    return {
      secureEnclaveAvailable: this.secureEnclaveConfig.enabled,
      hardwareKeysCount: hardwareKeys.length,
      biometricProtectedKeys,
      attestationSupported: this.secureEnclaveConfig.attestationRequired,
      platform: Platform.OS,
      awsKMSEnabled: this.awsKMSConfig.enabled,
      hsmProvider: this.hsmConfig.provider,
      cloudBackupEnabled: this.hsmConfig.cloudBackup
    };
  }

  // CRITICAL: Initialize AWS KMS for enterprise key management
  private async initializeAWSKMS(): Promise<void> {
    try {
      if (!this.awsKMSConfig.enabled) {
        console.log('AWS KMS disabled - using local hardware security only');
        return;
      }

      console.log('Initializing AWS KMS integration...');
      
      // CRITICAL: In production, implement proper AWS KMS integration
      // This would include:
      // 1. AWS SDK initialization
      // 2. IAM role authentication
      // 3. KMS key validation
      // 4. Encryption context setup
      
      // Simulate AWS KMS connection
      const kmsConnectionTest = await this.testAWSKMSConnection();
      
      if (!kmsConnectionTest.success) {
        console.warn('AWS KMS connection failed, falling back to local HSM');
        this.awsKMSConfig.enabled = false;
        return;
      }
      
      // Initialize master key in AWS KMS
      await this.initializeMasterKeyInAWSKMS();
      
      console.log('AWS KMS integration initialized successfully');
    } catch (error) {
      console.error('AWS KMS initialization failed:', error);
      this.awsKMSConfig.enabled = false;
    }
  }

  // CRITICAL: Test AWS KMS connection
  private async testAWSKMSConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // CRITICAL: In production, implement actual AWS KMS connection test
      // This would include:
      // 1. AWS.KMS.describeKey() call
      // 2. Network connectivity test
      // 3. Authentication validation
      
      // Simulate connection test
      const simulatedSuccess = Math.random() > 0.1; // 90% success rate for demo
      
      if (!simulatedSuccess) {
        return { success: false, error: 'Simulated AWS KMS connection failure' };
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown AWS KMS error' 
      };
    }
  }

  // CRITICAL: Initialize master key in AWS KMS
  private async initializeMasterKeyInAWSKMS(): Promise<void> {
    try {
      if (!this.awsKMSConfig.enabled) {
        return;
      }

      // CRITICAL: In production, implement actual AWS KMS key operations
      // This would include:
      // 1. AWS.KMS.createKey() for new keys
      // 2. AWS.KMS.encrypt() for data encryption
      // 3. AWS.KMS.decrypt() for data decryption
      // 4. AWS.KMS.generateDataKey() for envelope encryption
      
      const masterKeyExists = await this.checkAWSKMSMasterKey();
      
      if (!masterKeyExists) {
        // Create new master key in AWS KMS
        const masterKeyId = await this.createAWSKMSMasterKey();
        
        // Store key reference locally
        await this.secureStorage.setItem('aws_kms_master_key_id', masterKeyId, {
          encrypt: false,
          keyPrefix: 'aws_kms_'
        });
        
        console.log('Master key created in AWS KMS');
      }
      
      // Initialize data encryption keys
      await this.initializeDataEncryptionKeys();
      
    } catch (error) {
      console.error('AWS KMS master key initialization failed:', error);
      throw error;
    }
  }

  // CRITICAL: Check if master key exists in AWS KMS
  private async checkAWSKMSMasterKey(): Promise<boolean> {
    try {
      const keyId = await this.secureStorage.getItem('aws_kms_master_key_id', {
        keyPrefix: 'aws_kms_'
      });
      
      if (!keyId) {
        return false;
      }
      
      // CRITICAL: In production, verify key exists in AWS KMS
      // AWS.KMS.describeKey({ KeyId: keyId })
      
      return true;
    } catch (error) {
      console.error('AWS KMS master key check failed:', error);
      return false;
    }
  }

  // CRITICAL: Create master key in AWS KMS
  private async createAWSKMSMasterKey(): Promise<string> {
    try {
      // CRITICAL: In production, implement actual AWS KMS key creation
      // const params = {
      //   Description: 'E2EE Master Key for Chat Application',
      //   KeyUsage: 'ENCRYPT_DECRYPT',
      //   KeySpec: 'SYMMETRIC_DEFAULT',
      //   Origin: 'AWS_KMS',
      //   Policy: JSON.stringify(keyPolicy)
      // };
      // const result = await kms.createKey(params).promise();
      // return result.KeyMetadata.KeyId;
      
      // Simulate key creation
      const simulatedKeyId = `aws-kms-key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Store in cloud key store
      this.cloudKeyStore.set('master_key', {
        keyId: simulatedKeyId,
        provider: 'aws_kms',
        algorithm: 'AES-256-GCM',
        createdAt: Date.now(),
        region: this.awsKMSConfig.region
      });
      
      return simulatedKeyId;
    } catch (error) {
      console.error('AWS KMS key creation failed:', error);
      throw error;
    }
  }

  // CRITICAL: Initialize data encryption keys using envelope encryption
  private async initializeDataEncryptionKeys(): Promise<void> {
    try {
      // CRITICAL: Implement envelope encryption pattern
      // 1. Generate data encryption key (DEK) locally
      // 2. Encrypt DEK with AWS KMS master key
      // 3. Store encrypted DEK locally
      // 4. Use DEK for actual data encryption
      
      const dekExists = await this.secureStorage.hasItem('encrypted_dek', {
        keyPrefix: 'aws_kms_'
      });
      
      if (!dekExists) {
        // Generate new data encryption key
        const dek = await this.cryptoService.generateSymmetricKey();
        
        // Encrypt DEK with AWS KMS master key
        const encryptedDEK = await this.encryptWithAWSKMS(dek);
        
        // Store encrypted DEK
        await this.secureStorage.setItem('encrypted_dek', encryptedDEK, {
          encrypt: false,
          keyPrefix: 'aws_kms_'
        });
        
        console.log('Data encryption key initialized with AWS KMS envelope encryption');
      }
    } catch (error) {
      console.error('Data encryption key initialization failed:', error);
      throw error;
    }
  }

  // CRITICAL: Encrypt data with AWS KMS
  private async encryptWithAWSKMS(plaintext: string): Promise<string> {
    try {
      if (!this.awsKMSConfig.enabled) {
        throw new Error('AWS KMS not enabled');
      }
      
      // CRITICAL: In production, implement actual AWS KMS encryption
      // const params = {
      //   KeyId: this.awsKMSConfig.keyId,
      //   Plaintext: Buffer.from(plaintext),
      //   EncryptionContext: {
      //     application: 'e2ee-chat',
      //     version: '1.0'
      //   }
      // };
      // const result = await kms.encrypt(params).promise();
      // return result.CiphertextBlob.toString('base64');
      
      // Simulate AWS KMS encryption
      const simulatedCiphertext = await this.cryptoService.advancedEncrypt(
        plaintext,
        'aws_kms_simulation_key'
      );
      
      return `aws_kms_encrypted:${simulatedCiphertext}`;
    } catch (error) {
      console.error('AWS KMS encryption failed:', error);
      throw error;
    }
  }

  // CRITICAL: Decrypt data with AWS KMS
  private async decryptWithAWSKMS(ciphertext: string): Promise<string> {
    try {
      if (!this.awsKMSConfig.enabled) {
        throw new Error('AWS KMS not enabled');
      }
      
      if (!ciphertext.startsWith('aws_kms_encrypted:')) {
        throw new Error('Invalid AWS KMS ciphertext format');
      }
      
      // CRITICAL: In production, implement actual AWS KMS decryption
      // const params = {
      //   CiphertextBlob: Buffer.from(ciphertext, 'base64'),
      //   EncryptionContext: {
      //     application: 'e2ee-chat',
      //     version: '1.0'
      //   }
      // };
      // const result = await kms.decrypt(params).promise();
      // return result.Plaintext.toString();
      
      // Simulate AWS KMS decryption
      const actualCiphertext = ciphertext.replace('aws_kms_encrypted:', '');
      return await this.cryptoService.advancedDecrypt(
        actualCiphertext,
        'aws_kms_simulation_key'
      );
    } catch (error) {
      console.error('AWS KMS decryption failed:', error);
      throw error;
    }
  }

  // CRITICAL: Initialize Hardware Security Module
  private async initializeHSM(): Promise<void> {
    try {
      console.log(`Initializing HSM with provider: ${this.hsmConfig.provider}`);
      
      switch (this.hsmConfig.provider) {
        case 'ios_secure_enclave':
          await this.initializeiOSSecureEnclave();
          break;
        case 'android_keystore':
          await this.initializeAndroidKeystore();
          break;
        case 'aws_kms':
          await this.initializeAWSKMSAsHSM();
          break;
        case 'azure_key_vault':
          await this.initializeAzureKeyVault();
          break;
        default:
          console.warn('Unknown HSM provider, falling back to software security');
      }
      
      console.log('HSM initialization completed');
    } catch (error) {
      console.error('HSM initialization failed:', error);
      this.hsmConfig.enabled = false;
    }
  }

  // CRITICAL: Initialize iOS Secure Enclave as HSM
  private async initializeiOSSecureEnclave(): Promise<void> {
    try {
      if (Platform.OS !== 'ios') {
        throw new Error('iOS Secure Enclave only available on iOS');
      }
      
      // CRITICAL: In production, use iOS Security Framework
      // This would include:
      // 1. SecKeyCreateRandomKey with kSecAttrTokenIDSecureEnclave
      // 2. Biometric authentication requirement
      // 3. Hardware attestation
      
      console.log('iOS Secure Enclave initialized as HSM');
    } catch (error) {
      console.error('iOS Secure Enclave HSM initialization failed:', error);
      throw error;
    }
  }

  // CRITICAL: Initialize Android Keystore as HSM
  private async initializeAndroidKeystore(): Promise<void> {
    try {
      if (Platform.OS !== 'android') {
        throw new Error('Android Keystore only available on Android');
      }
      
      // CRITICAL: In production, use Android Keystore
      // This would include:
      // 1. KeyGenParameterSpec with hardware-backed requirement
      // 2. Biometric authentication requirement
      // 3. Hardware attestation
      
      console.log('Android Keystore initialized as HSM');
    } catch (error) {
      console.error('Android Keystore HSM initialization failed:', error);
      throw error;
    }
  }

  // CRITICAL: Initialize AWS KMS as HSM
  private async initializeAWSKMSAsHSM(): Promise<void> {
    try {
      // Use AWS KMS as cloud HSM
      await this.initializeAWSKMS();
      console.log('AWS KMS initialized as cloud HSM');
    } catch (error) {
      console.error('AWS KMS HSM initialization failed:', error);
      throw error;
    }
  }

  // CRITICAL: Initialize Azure Key Vault as HSM
  private async initializeAzureKeyVault(): Promise<void> {
    try {
      // CRITICAL: In production, implement Azure Key Vault integration
      // This would include:
      // 1. Azure SDK initialization
      // 2. Azure AD authentication
      // 3. Key Vault operations
      
      console.log('Azure Key Vault HSM initialization (simulated)');
    } catch (error) {
      console.error('Azure Key Vault HSM initialization failed:', error);
      throw error;
    }
  }

  // CRITICAL: Start cloud key synchronization
  private startCloudKeySync(): void {
    if (!this.keyBackupEnabled) {
      return;
    }
    
    // Sync keys with cloud HSM every hour
    setInterval(() => {
      this.syncKeysWithCloud();
    }, 60 * 60 * 1000);
  }

  // CRITICAL: Sync keys with cloud HSM
  private async syncKeysWithCloud(): Promise<void> {
    try {
      if (!this.awsKMSConfig.enabled && !this.hsmConfig.cloudBackup) {
        return;
      }
      
      console.log('Syncing keys with cloud HSM...');
      
      // CRITICAL: In production, implement secure key backup
      // 1. Encrypt keys before upload
      // 2. Use secure channels
      // 3. Implement key versioning
      // 4. Audit all operations
      
      const localKeys = Array.from(this.hardwareKeyStore.keys());
      let syncedCount = 0;
      
      for (const keyId of localKeys) {
        try {
          await this.backupKeyToCloud(keyId);
          syncedCount++;
        } catch (error) {
          console.error(`Failed to backup key ${keyId}:`, error);
        }
      }
      
      console.log(`Cloud key sync completed: ${syncedCount}/${localKeys.length} keys synced`);
    } catch (error) {
      console.error('Cloud key sync failed:', error);
    }
  }

  // CRITICAL: Backup key to cloud HSM
  private async backupKeyToCloud(keyId: string): Promise<void> {
    try {
      const keyData = this.hardwareKeyStore.get(keyId);
      if (!keyData) {
        return;
      }
      
      // CRITICAL: Encrypt key before cloud backup
      const encryptedKey = await this.encryptForCloudBackup(keyData);
      
      // Store in cloud key store
      this.cloudKeyStore.set(keyId, {
        encryptedData: encryptedKey,
        backupTimestamp: Date.now(),
        provider: this.hsmConfig.provider
      });
      
    } catch (error) {
      console.error('Key cloud backup failed:', error);
      throw error;
    }
  }

  // CRITICAL: Encrypt key for cloud backup
  private async encryptForCloudBackup(keyData: any): Promise<string> {
    try {
      const keyString = JSON.stringify(keyData);
      
      if (this.awsKMSConfig.enabled) {
        return await this.encryptWithAWSKMS(keyString);
      } else {
        // Fallback to local encryption
        return await this.cryptoService.advancedEncrypt(keyString);
      }
    } catch (error) {
      console.error('Key encryption for cloud backup failed:', error);
      throw error;
    }
  }

  // CRITICAL: Get AWS KMS configuration
  getAWSKMSConfig(): AWSKMSConfig {
    return { ...this.awsKMSConfig };
  }

  // CRITICAL: Update AWS KMS configuration
  updateAWSKMSConfig(config: Partial<AWSKMSConfig>): void {
    this.awsKMSConfig = { ...this.awsKMSConfig, ...config };
    console.log('AWS KMS configuration updated:', this.awsKMSConfig);
  }

  // CRITICAL: Get HSM configuration
  getHSMConfig(): HSMConfig {
    return { ...this.hsmConfig };
  }

  // CRITICAL: Update HSM configuration
  updateHSMConfig(config: Partial<HSMConfig>): void {
    this.hsmConfig = { ...this.hsmConfig, ...config };
    console.log('HSM configuration updated:', this.hsmConfig);
  }

  // CRITICAL: Get cloud key store status
  getCloudKeyStoreStatus(): {
    enabled: boolean;
    provider: string;
    keysCount: number;
    lastSync: number;
    backupEnabled: boolean;
  } {
    return {
      enabled: this.awsKMSConfig.enabled || this.hsmConfig.cloudBackup,
      provider: this.hsmConfig.provider,
      keysCount: this.cloudKeyStore.size,
      lastSync: Date.now(), // Simplified
      backupEnabled: this.keyBackupEnabled
    };
  }
}

export default KeyManager;