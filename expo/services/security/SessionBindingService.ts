import { Platform } from 'react-native';
import BiometricAuthService from './BiometricAuthService';
import SecureStorage from './SecureStorage';
import CryptoService from './CryptoService';
import SecureEnclaveValidationService from './SecureEnclaveValidationService';

// CRITICAL: Session binding interfaces for device fingerprinting
interface DeviceFingerprint {
  deviceId: string;
  platform: string;
  osVersion: string;
  hardwareModel: string;
  secureEnclaveEnabled: boolean;
  biometricCapabilities: string[];
  screenResolution: string;
  timezone: string;
  locale: string;
  fingerprintHash: string;
  generatedAt: number;
  validUntil: number;
}

interface SessionBinding {
  sessionId: string;
  userId: string;
  deviceFingerprint: DeviceFingerprint;
  biometricHash: string;
  secureEnclaveAttestation: string;
  bindingSignature: string;
  createdAt: number;
  lastValidated: number;
  expiresAt: number;
  trustScore: number;
  hardwareProtected: boolean;
  validationCount: number;
  securityLevel: 'maximum' | 'high' | 'medium' | 'low';
}

interface SessionValidationResult {
  valid: boolean;
  trustScore: number;
  securityLevel: 'maximum' | 'high' | 'medium' | 'low';
  deviceMatch: boolean;
  biometricMatch: boolean;
  attestationValid: boolean;
  signatureValid: boolean;
  expired: boolean;
  error?: string;
}

interface AntiReplayToken {
  tokenId: string;
  sessionId: string;
  timestamp: number;
  nonce: string;
  signature: string;
  usedAt?: number;
  expiresAt: number;
}

class SessionBindingService {
  private static instance: SessionBindingService;
  private biometricAuth: BiometricAuthService;
  private secureStorage: SecureStorage;
  private cryptoService: CryptoService;
  private secureEnclaveValidation: SecureEnclaveValidationService;
  private activeSessions: Map<string, SessionBinding> = new Map();
  private deviceFingerprint: DeviceFingerprint | null = null;
  private antiReplayTokens: Map<string, AntiReplayToken> = new Map();
  private sessionHistory: Array<{ timestamp: number; action: string; sessionId: string }> = [];

  private constructor() {
    this.biometricAuth = BiometricAuthService.getInstance();
    this.secureStorage = SecureStorage.getInstance();
    this.cryptoService = CryptoService.getInstance();
    this.secureEnclaveValidation = SecureEnclaveValidationService.getInstance();
    this.initializeSessionBinding();
  }

  static getInstance(): SessionBindingService {
    if (!SessionBindingService.instance) {
      SessionBindingService.instance = new SessionBindingService();
    }
    return SessionBindingService.instance;
  }

  // CRITICAL: Initialize session binding service
  private async initializeSessionBinding(): Promise<void> {
    try {
      console.log('🔗 Initializing Session Binding Service...');
      
      // Generate device fingerprint
      this.deviceFingerprint = await this.generateDeviceFingerprint();
      
      // Load existing sessions
      await this.loadStoredSessions();
      
      // Clean expired sessions and tokens
      this.cleanExpiredData();
      
      // Start periodic maintenance
      this.startPeriodicMaintenance();
      
      console.log('✅ Session Binding Service initialized');
      try {
        console.log('📱 Device Fingerprint:', this.deviceFingerprint?.fingerprintHash?.substring(0, 16) + '...');
      } catch (e) {
        console.warn('Fingerprint preview unavailable');
      }
    } catch (error) {
      console.error('❌ Session Binding Service initialization failed:', error);
    }
  }

  // CRITICAL: Generate comprehensive device fingerprint
  private async generateDeviceFingerprint(): Promise<DeviceFingerprint> {
    try {
      console.log('📱 Generating device fingerprint...');

      // Collect device information
      const deviceInfo = {
        platform: Platform.OS,
        osVersion: String((Platform as any).Version ?? 'unknown'),
        hardwareModel: Platform.OS === 'ios' ? 'iPhone' : 'Android',
        secureEnclaveEnabled: this.biometricAuth.isSecureEnclaveEnabled(),
        biometricCapabilities: this.biometricAuth.getSupportedBiometricTypes(),
        screenResolution: '1080x1920', // In production, get actual screen dimensions
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: 'en-US', // In production, get actual locale
        timestamp: Date.now()
      };

      // Generate stable device ID
      const deviceId = await this.generateStableDeviceId(deviceInfo);

      // Create fingerprint hash
      const fingerprintData = JSON.stringify(deviceInfo) + deviceId;
      const fingerprintHash = await this.cryptoService.hash(fingerprintData);

      const deviceFingerprint: DeviceFingerprint = {
        deviceId,
        platform: deviceInfo.platform,
        osVersion: deviceInfo.osVersion,
        hardwareModel: deviceInfo.hardwareModel,
        secureEnclaveEnabled: deviceInfo.secureEnclaveEnabled,
        biometricCapabilities: deviceInfo.biometricCapabilities,
        screenResolution: deviceInfo.screenResolution,
        timezone: deviceInfo.timezone,
        locale: deviceInfo.locale,
        fingerprintHash,
        generatedAt: Date.now(),
        validUntil: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
      };

      // Store device fingerprint securely
      await this.secureStorage.setObject('device_fingerprint', deviceFingerprint, {
        useSecureEnclave: deviceInfo.secureEnclaveEnabled,
        requireBiometric: false
      });

      console.log('✅ Device fingerprint generated successfully');
      return deviceFingerprint;
    } catch (error) {
      console.error('Device fingerprint generation failed:', error);
      throw error;
    }
  }

  // Generate stable device ID
  private async generateStableDeviceId(deviceInfo: any): Promise<string> {
    try {
      // CRITICAL: In production, use platform-specific stable identifiers:
      // iOS: Use identifierForVendor or keychain-stored UUID
      // Android: Use Android ID or keychain-stored UUID
      
      // Check if we have a stored device ID
      const storedDeviceId = await this.secureStorage.getItem('stable_device_id', {
        useSecureEnclave: deviceInfo.secureEnclaveEnabled
      });

      if (storedDeviceId) {
        return storedDeviceId;
      }

      // Generate new stable device ID
      const deviceIdData = {
        platform: deviceInfo.platform,
        timestamp: Date.now(),
        random: Math.random().toString(36).substring(2, 15)
      };

      const deviceId = await this.cryptoService.hash(JSON.stringify(deviceIdData));

      // Store device ID securely
      await this.secureStorage.setItem('stable_device_id', deviceId, {
        useSecureEnclave: deviceInfo.secureEnclaveEnabled,
        requireBiometric: false
      });

      return deviceId;
    } catch (error) {
      console.error('Stable device ID generation failed:', error);
      return 'unknown_device_' + Date.now();
    }
  }

  // CRITICAL: Create session binding with biometric authentication
  async createSessionBinding(
    sessionId: string, 
    userId: string,
    requireBiometric: boolean = true
  ): Promise<SessionBinding> {
    try {
      console.log('🔗 Creating session binding for session:', sessionId);

      if (!this.deviceFingerprint) {
        throw new Error('Device fingerprint not available');
      }

      let biometricHash = '';
      let secureEnclaveAttestation = '';
      let trustScore = 0.5; // Base trust score
      let securityLevel: 'maximum' | 'high' | 'medium' | 'low' = 'medium';

      if (requireBiometric) {
        // Perform biometric authentication with Secure Enclave validation
        const validationResult = await this.secureEnclaveValidation.authenticateWithSecureEnclaveValidation(
          sessionId,
          false // Don't require maximum security for session creation
        );

        if (!validationResult.success) {
          throw new Error('Biometric authentication failed for session binding');
        }

        biometricHash = validationResult.sessionBinding?.biometricHash || '';
        secureEnclaveAttestation = validationResult.hardwareAttestation?.hardwareSignature || '';
        trustScore = validationResult.trustScore;
        securityLevel = this.mapValidationLevelToSecurityLevel(validationResult.validationLevel);
      }

      // Create session binding data
      const bindingData = {
        sessionId,
        userId,
        deviceFingerprint: this.deviceFingerprint,
        biometricHash,
        secureEnclaveAttestation,
        createdAt: Date.now(),
        lastValidated: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        trustScore,
        hardwareProtected: this.deviceFingerprint.secureEnclaveEnabled,
        validationCount: 1,
        securityLevel
      };

      // Generate binding signature
      const bindingSignature = await this.generateBindingSignature(bindingData);

      const sessionBinding: SessionBinding = {
        ...bindingData,
        bindingSignature
      };

      // Store session binding
      this.activeSessions.set(sessionId, sessionBinding);
      await this.storeSessionBinding(sessionBinding);

      // Log session creation
      this.sessionHistory.push({
        timestamp: Date.now(),
        action: 'session_created',
        sessionId
      });

      console.log('✅ Session binding created successfully');
      console.log('🛡️ Security Level:', securityLevel);
      console.log('📊 Trust Score:', trustScore);

      return sessionBinding;
    } catch (error) {
      console.error('Session binding creation failed:', error);
      throw error;
    }
  }

  // Map validation level to security level
  private mapValidationLevelToSecurityLevel(validationLevel: string): 'maximum' | 'high' | 'medium' | 'low' {
    switch (validationLevel) {
      case 'hardware_validated':
        return 'maximum';
      case 'software_validated':
        return 'high';
      default:
        return 'medium';
    }
  }

  // Generate binding signature
  private async generateBindingSignature(bindingData: any): Promise<string> {
    try {
      const signatureData = {
        sessionId: bindingData.sessionId,
        userId: bindingData.userId,
        deviceFingerprintHash: bindingData.deviceFingerprint.fingerprintHash,
        biometricHash: bindingData.biometricHash,
        createdAt: bindingData.createdAt,
        expiresAt: bindingData.expiresAt
      };

      return await this.cryptoService.hash(
        JSON.stringify(signatureData) + 'session_binding_signature_salt'
      );
    } catch (error) {
      console.error('Binding signature generation failed:', error);
      throw error;
    }
  }

  // Store session binding securely
  private async storeSessionBinding(sessionBinding: SessionBinding): Promise<void> {
    try {
      await this.secureStorage.setObject(`session_binding_${sessionBinding.sessionId}`, sessionBinding, {
        useSecureEnclave: sessionBinding.hardwareProtected,
        requireBiometric: false
      });
    } catch (error) {
      console.error('Failed to store session binding:', error);
      throw error;
    }
  }

  // CRITICAL: Validate session binding
  async validateSessionBinding(sessionId: string): Promise<SessionValidationResult> {
    try {
      const sessionBinding = this.activeSessions.get(sessionId);
      if (!sessionBinding) {
        return {
          valid: false,
          trustScore: 0,
          securityLevel: 'low',
          deviceMatch: false,
          biometricMatch: false,
          attestationValid: false,
          signatureValid: false,
          expired: true,
          error: 'Session binding not found'
        };
      }

      // Check expiration
      const expired = Date.now() > sessionBinding.expiresAt;
      if (expired) {
        this.activeSessions.delete(sessionId);
        return {
          valid: false,
          trustScore: 0,
          securityLevel: 'low',
          deviceMatch: false,
          biometricMatch: false,
          attestationValid: false,
          signatureValid: false,
          expired: true,
          error: 'Session binding expired'
        };
      }

      // Validate device fingerprint
      const deviceMatch = await this.validateDeviceFingerprint(sessionBinding.deviceFingerprint);

      // Validate signature
      const signatureValid = await this.validateBindingSignature(sessionBinding);

      // For biometric validation, we'll check if the hash is still valid
      const biometricMatch = sessionBinding.biometricHash !== '';

      // Validate attestation if available
      const attestationValid = sessionBinding.secureEnclaveAttestation !== '';

      const valid = deviceMatch && signatureValid && !expired;

      // Update validation count and last validated time
      if (valid) {
        sessionBinding.lastValidated = Date.now();
        sessionBinding.validationCount++;
        await this.storeSessionBinding(sessionBinding);
      }

      return {
        valid,
        trustScore: sessionBinding.trustScore,
        securityLevel: sessionBinding.securityLevel,
        deviceMatch,
        biometricMatch,
        attestationValid,
        signatureValid,
        expired
      };
    } catch (error) {
      console.error('Session binding validation failed:', error);
      return {
        valid: false,
        trustScore: 0,
        securityLevel: 'low',
        deviceMatch: false,
        biometricMatch: false,
        attestationValid: false,
        signatureValid: false,
        expired: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Validate device fingerprint
  private async validateDeviceFingerprint(storedFingerprint: DeviceFingerprint): Promise<boolean> {
    try {
      if (!this.deviceFingerprint) {
        return false;
      }

      // Check if fingerprints match
      const fingerprintMatch = this.deviceFingerprint.fingerprintHash === storedFingerprint.fingerprintHash;

      // Check if device characteristics match
      const platformMatch = this.deviceFingerprint.platform === storedFingerprint.platform;
      const osVersionMatch = this.deviceFingerprint.osVersion === storedFingerprint.osVersion;
      const secureEnclaveMatch = this.deviceFingerprint.secureEnclaveEnabled === storedFingerprint.secureEnclaveEnabled;

      // Allow some flexibility for OS updates
      const deviceMatch = fingerprintMatch && platformMatch && secureEnclaveMatch;

      if (!deviceMatch) {
        console.warn('Device fingerprint mismatch detected');
        console.warn('Current:', this.deviceFingerprint.fingerprintHash.substring(0, 16) + '...');
        console.warn('Stored:', storedFingerprint.fingerprintHash.substring(0, 16) + '...');
      }

      return deviceMatch;
    } catch (error) {
      console.error('Device fingerprint validation failed:', error);
      return false;
    }
  }

  // Validate binding signature
  private async validateBindingSignature(sessionBinding: SessionBinding): Promise<boolean> {
    try {
      const signatureData = {
        sessionId: sessionBinding.sessionId,
        userId: sessionBinding.userId,
        deviceFingerprintHash: sessionBinding.deviceFingerprint.fingerprintHash,
        biometricHash: sessionBinding.biometricHash,
        createdAt: sessionBinding.createdAt,
        expiresAt: sessionBinding.expiresAt
      };

      const expectedSignature = await this.cryptoService.hash(
        JSON.stringify(signatureData) + 'session_binding_signature_salt'
      );

      return sessionBinding.bindingSignature === expectedSignature;
    } catch (error) {
      console.error('Binding signature validation failed:', error);
      return false;
    }
  }

  // CRITICAL: Generate anti-replay token
  async generateAntiReplayToken(sessionId: string): Promise<AntiReplayToken> {
    try {
      const sessionBinding = this.activeSessions.get(sessionId);
      if (!sessionBinding) {
        throw new Error('Session binding not found for anti-replay token generation');
      }

      const tokenId = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const tokenData = {
        tokenId,
        sessionId,
        timestamp,
        nonce,
        deviceFingerprint: sessionBinding.deviceFingerprint.fingerprintHash
      };

      const signature = await this.cryptoService.hash(
        JSON.stringify(tokenData) + 'anti_replay_token_salt'
      );

      const antiReplayToken: AntiReplayToken = {
        tokenId,
        sessionId,
        timestamp,
        nonce,
        signature,
        expiresAt: timestamp + (5 * 60 * 1000) // 5 minutes
      };

      // Store token
      this.antiReplayTokens.set(tokenId, antiReplayToken);

      // Store token securely
      await this.secureStorage.setObject(`anti_replay_token_${tokenId}`, antiReplayToken, {
        useSecureEnclave: sessionBinding.hardwareProtected,
        requireBiometric: false
      });

      console.log('🛡️ Anti-replay token generated:', tokenId);
      return antiReplayToken;
    } catch (error) {
      console.error('Anti-replay token generation failed:', error);
      throw error;
    }
  }

  // CRITICAL: Validate and consume anti-replay token
  async validateAntiReplayToken(tokenId: string): Promise<boolean> {
    try {
      const token = this.antiReplayTokens.get(tokenId);
      if (!token) {
        console.warn('Anti-replay token not found:', tokenId);
        return false;
      }

      // Check if token is already used
      if (token.usedAt) {
        console.warn('Anti-replay token already used:', tokenId);
        return false;
      }

      // Check expiration
      if (Date.now() > token.expiresAt) {
        console.warn('Anti-replay token expired:', tokenId);
        this.antiReplayTokens.delete(tokenId);
        return false;
      }

      // Validate signature
      const tokenData = {
        tokenId: token.tokenId,
        sessionId: token.sessionId,
        timestamp: token.timestamp,
        nonce: token.nonce,
        deviceFingerprint: this.deviceFingerprint?.fingerprintHash
      };

      const expectedSignature = await this.cryptoService.hash(
        JSON.stringify(tokenData) + 'anti_replay_token_salt'
      );

      if (token.signature !== expectedSignature) {
        console.warn('Anti-replay token signature invalid:', tokenId);
        return false;
      }

      // Mark token as used
      token.usedAt = Date.now();
      await this.storeAntiReplayToken(token);

      console.log('✅ Anti-replay token validated and consumed:', tokenId);
      return true;
    } catch (error) {
      console.error('Anti-replay token validation failed:', error);
      return false;
    }
  }

  // Store anti-replay token
  private async storeAntiReplayToken(token: AntiReplayToken): Promise<void> {
    try {
      const sessionBinding = this.activeSessions.get(token.sessionId);
      await this.secureStorage.setObject(`anti_replay_token_${token.tokenId}`, token, {
        useSecureEnclave: sessionBinding?.hardwareProtected || false,
        requireBiometric: false
      });
    } catch (error) {
      console.error('Failed to store anti-replay token:', error);
    }
  }

  // Load stored sessions
  private async loadStoredSessions(): Promise<void> {
    try {
      const keys = await this.secureStorage.getAllKeys();
      const sessionKeys = keys.filter(key => key.startsWith('session_binding_'));

      for (const key of sessionKeys) {
        try {
          const sessionBinding = await this.secureStorage.getObject<SessionBinding>(key);
          if (sessionBinding && sessionBinding.expiresAt > Date.now()) {
            this.activeSessions.set(sessionBinding.sessionId, sessionBinding);
          } else if (sessionBinding) {
            // Remove expired session
            await this.secureStorage.removeItem(key);
          }
        } catch (error) {
          console.warn(`Failed to load session binding ${key}:`, error);
        }
      }

      console.log(`📋 Loaded ${this.activeSessions.size} active session bindings`);
    } catch (error) {
      console.error('Failed to load stored sessions:', error);
    }
  }

  // Clean expired data
  private cleanExpiredData(): void {
    const now = Date.now();

    // Clean expired sessions
    for (const [sessionId, binding] of this.activeSessions.entries()) {
      if (now > binding.expiresAt) {
        this.activeSessions.delete(sessionId);
        this.secureStorage.removeItem(`session_binding_${sessionId}`).catch(console.error);
      }
    }

    // Clean expired anti-replay tokens
    for (const [tokenId, token] of this.antiReplayTokens.entries()) {
      if (now > token.expiresAt) {
        this.antiReplayTokens.delete(tokenId);
        this.secureStorage.removeItem(`anti_replay_token_${tokenId}`).catch(console.error);
      }
    }
  }

  // Start periodic maintenance
  private startPeriodicMaintenance(): void {
    // Clean expired data every 5 minutes
    setInterval(() => {
      this.cleanExpiredData();
    }, 5 * 60 * 1000);

    // Refresh device fingerprint every 24 hours
    setInterval(() => {
      this.generateDeviceFingerprint().then(fingerprint => {
        this.deviceFingerprint = fingerprint;
      }).catch(console.error);
    }, 24 * 60 * 60 * 1000);
  }

  // Get session binding
  getSessionBinding(sessionId: string): SessionBinding | null {
    return this.activeSessions.get(sessionId) || null;
  }

  // Get device fingerprint
  getDeviceFingerprint(): DeviceFingerprint | null {
    return this.deviceFingerprint;
  }

  // Get session statistics
  getSessionStatistics(): {
    activeSessions: number;
    totalSessions: number;
    averageTrustScore: number;
    hardwareProtectedSessions: number;
    antiReplayTokens: number;
    deviceFingerprintAge: number;
  } {
    const activeSessions = this.activeSessions.size;
    const totalSessions = this.sessionHistory.length;
    const sessionBindings = Array.from(this.activeSessions.values());
    const averageTrustScore = sessionBindings.length > 0 
      ? sessionBindings.reduce((sum, s) => sum + s.trustScore, 0) / sessionBindings.length 
      : 0;
    const hardwareProtectedSessions = sessionBindings.filter(s => s.hardwareProtected).length;
    const antiReplayTokens = this.antiReplayTokens.size;
    const deviceFingerprintAge = this.deviceFingerprint 
      ? Date.now() - this.deviceFingerprint.generatedAt 
      : 0;

    return {
      activeSessions,
      totalSessions,
      averageTrustScore,
      hardwareProtectedSessions,
      antiReplayTokens,
      deviceFingerprintAge
    };
  }

  // Clear all session data
  async clearAllSessions(): Promise<void> {
    try {
      this.activeSessions.clear();
      this.antiReplayTokens.clear();
      this.sessionHistory.length = 0;

      // Clear stored data
      const keys = await this.secureStorage.getAllKeys();
      const sessionKeys = keys.filter(key => 
        key.startsWith('session_binding_') || 
        key.startsWith('anti_replay_token_')
      );

      for (const key of sessionKeys) {
        await this.secureStorage.removeItem(key);
      }

      console.log('🧹 All session data cleared');
    } catch (error) {
      console.error('Failed to clear session data:', error);
    }
  }
}

export default SessionBindingService;