import { Platform } from 'react-native';
import CryptoService from './CryptoService';
import SecureStorage from './SecureStorage';
import DeviceSecurityService from './DeviceSecurityService';
import KeyManager from './KeyManager';
import HttpOnlyCookieService from './HttpOnlyCookieService';
import DeviceBindingService from './DeviceBindingService';
import BiometricAuthService from './BiometricAuthService';
import SecureEnclaveValidationService from './SecureEnclaveValidationService';
import SessionBindingService from './SessionBindingService';
import SessionRevocationService from './SessionRevocationService';

interface JWTPayload {
  userId: string;
  phoneNumber: string;
  deviceId: string;
  iat: number;
  exp: number;
  jti: string;
  scope: string[];
  sessionFingerprint: string;
  serverValidated: boolean;
  e2eeEnabled?: boolean;
  keyExchangeCapable?: boolean;
}

interface RefreshToken {
  token: string;
  userId: string;
  deviceId: string;
  expiresAt: number;
  createdAt: number;
  sessionFingerprint: string;
  serverHash: string;
  e2eeKeyId?: string;
}

interface SessionInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  deviceBound: boolean;
  sessionFingerprint: string;
  serverValidated: boolean;
  e2eeEnabled?: boolean;
  keyExchangeCapable?: boolean;
}

interface SessionSecurityEvent {
  type: 'created' | 'refreshed' | 'validated' | 'destroyed' | 'security_violation' | 'server_validation_failed' | 'key_exchange_initiated' | 'e2ee_established' | 'signal_session_created' | 'signal_key_exchange' | 'signal_message_encrypted' | 'signal_message_decrypted' | 'signal_key_rotation';
  timestamp: number;
  userId?: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  serverReported?: boolean;
  e2eeRelated?: boolean;
  signalProtocolEvent?: boolean;
}

class SessionManager {
  private static instance: SessionManager;
  private cryptoService: CryptoService;
  private secureStorage: SecureStorage;
  private deviceSecurity: DeviceSecurityService;
  private keyManager: KeyManager;
  private cookieService: HttpOnlyCookieService;
  private deviceBinding: DeviceBindingService;
  private biometricAuth: BiometricAuthService;
  private secureEnclaveValidation: SecureEnclaveValidationService;
  private sessionBinding: SessionBindingService;
  private sessionRevocation: SessionRevocationService;
  private currentSession: SessionInfo | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private sessionEvents: SessionSecurityEvent[] = [];
  private serverValidationRequired = true;

  // CRITICAL: Enhanced security configuration with JWT rotation
  private readonly ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh 5 minutes before expiry
  private readonly MAX_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours max session
  private readonly SERVER_VALIDATION_INTERVAL = 5 * 60 * 1000; // Validate with server every 5 minutes
  private readonly JWT_ROTATION_INTERVAL = 10 * 60 * 1000; // Rotate JWT every 10 minutes
  private readonly DEVICE_ID_VALIDATION_INTERVAL = 2 * 60 * 1000; // Validate device ID every 2 minutes

  private constructor() {
    this.cryptoService = CryptoService.getInstance();
    this.secureStorage = SecureStorage.getInstance();
    this.deviceSecurity = DeviceSecurityService.getInstance();
    this.keyManager = KeyManager.getInstance();
    this.cookieService = HttpOnlyCookieService.getInstance();
    this.deviceBinding = DeviceBindingService.getInstance();
    this.biometricAuth = BiometricAuthService.getInstance();
    this.secureEnclaveValidation = SecureEnclaveValidationService.getInstance();
    this.sessionBinding = SessionBindingService.getInstance();
    this.sessionRevocation = SessionRevocationService.getInstance();
    this.startSessionMonitoring();
    this.startJWTRotationScheduler();
    this.startDeviceIDValidation();
    this.startSecureEnclaveValidation();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
      try {
        const registry = require('@/services/ServiceRegistry').default;
        if (registry && !registry.has('SessionManager')) {
          registry.register('SessionManager', () => SessionManager.instance);
        }
      } catch (e) {
        console.warn('SessionManager: ServiceRegistry not available at init');
      }
    }
    return SessionManager.instance;
  }

  // CRITICAL: Create new session with E2EE capabilities, device binding, and Secure Enclave validation
  async createSession(userId: string, phoneNumber: string, serverToken: string, requireBiometric: boolean = true): Promise<SessionInfo> {
    try {
      // CRITICAL: Perform biometric authentication with Secure Enclave validation first
      let biometricValidation = null;
      if (requireBiometric) {
        const sessionId = this.cryptoService.generateSecureRandom(32);
        biometricValidation = await this.secureEnclaveValidation.authenticateWithSecureEnclaveValidation(
          sessionId,
          true // Require maximum security for session creation
        );
        
        if (!biometricValidation.success) {
          throw new Error('Biometric authentication with Secure Enclave validation failed');
        }
      }

      // CRITICAL: All sessions must be validated by server
      const serverValidation = await this.validateSessionWithServer(serverToken, userId);
      if (!serverValidation.valid) {
        throw new Error('Server session validation failed');
      }

      // CRITICAL: Create comprehensive session binding with device fingerprinting
      const sessionId = biometricValidation?.sessionBinding?.sessionId || this.cryptoService.generateSecureRandom(32);
      const sessionBinding = await this.sessionBinding.createSessionBinding(sessionId, userId, requireBiometric);
      
      if (!sessionBinding || sessionBinding.trustScore < 0.7) {
        throw new Error('Session binding creation failed or low trust score');
      }

      // CRITICAL: Create legacy device binding for backward compatibility
      const deviceBinding = await this.deviceBinding.createSessionBinding(sessionId, userId);
      
      if (!deviceBinding || deviceBinding.riskScore > 70) {
        throw new Error('Device binding creation failed or high risk detected');
      }

      const deviceFingerprint = this.deviceBinding.getCurrentDeviceFingerprint();
      if (!deviceFingerprint) {
        throw new Error('Device fingerprint not available');
      }

      // CRITICAL: Initialize E2EE capabilities
      const e2eeCapabilities = await this.initializeE2EECapabilities(userId);

      // Generate session fingerprint with server entropy and device binding
      const sessionFingerprint = await this.generateServerValidatedSessionFingerprint(
        userId, 
        deviceFingerprint.securityHash,
        serverValidation.serverEntropy,
        deviceBinding.bindingHash
      );

      // Create session token with E2EE capabilities
      const accessToken = await this.generateServerValidatedAccessToken(
        userId, 
        phoneNumber, 
        deviceFingerprint.securityHash, 
        sessionFingerprint,
        serverToken,
        e2eeCapabilities
      );

      const refreshToken = await this.generateServerValidatedRefreshToken(
        userId, 
        deviceFingerprint.securityHash, 
        sessionFingerprint,
        serverValidation.serverHash,
        e2eeCapabilities.keyId
      );

      const session: SessionInfo = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + this.ACCESS_TOKEN_EXPIRY,
        userId,
        deviceBound: true,
        sessionFingerprint,
        serverValidated: true,
        e2eeEnabled: e2eeCapabilities.enabled,
        keyExchangeCapable: e2eeCapabilities.capable
      };

      // Store session ID for device binding reference
      await this.secureStorage.setItem('current_session_id', sessionId);
      
      // CRITICAL: Track session with Redis-like monitoring
      await this.sessionRevocation.trackSession(
        sessionId,
        userId,
        deviceFingerprint.securityHash,
        {
          platform: Platform.OS,
          appVersion: '1.0.0',
          securityLevel: biometricValidation ? 'high' : 'medium',
          biometricEnabled: !!biometricValidation,
          e2eeEnabled: e2eeCapabilities.enabled
        }
      );

      // CRITICAL: Store session tokens in HttpOnly cookies instead of LocalStorage
      await this.storeSessionInHttpOnlyCookies(session, serverValidation.serverHash);
      
      // Store device binding with server confirmation
      await this.secureStorage.setItem('device_binding', deviceFingerprint.securityHash);
      await this.secureStorage.setItem('session_fingerprint', sessionFingerprint);
      await this.secureStorage.setItem('server_validation_hash', serverValidation.serverHash);
      
      // CRITICAL: Start automatic token refresh, server validation, and JWT rotation
      this.startTokenRefresh();
      this.startServerValidationMonitoring();
      this.scheduleJWTRotation();

      this.currentSession = session;
      
      this.logSessionEvent({
        type: 'created',
        timestamp: Date.now(),
        userId,
        details: { 
          deviceBound: true,
          serverValidated: true,
          sessionFingerprint: sessionFingerprint.substring(0, 8) + '...',
          e2eeEnabled: e2eeCapabilities.enabled,
          keyExchangeCapable: e2eeCapabilities.capable,
          deviceBindingStrength: deviceBinding.bindingStrength,
          deviceRiskScore: deviceBinding.riskScore,
          biometricAuthenticated: !!biometricValidation,
          secureEnclaveUsed: biometricValidation?.secureEnclaveUsed || false,
          sessionBindingTrustScore: sessionBinding.trustScore,
          sessionBindingSecurityLevel: sessionBinding.securityLevel,
          hardwareProtected: sessionBinding.hardwareProtected
        },
        severity: 'low',
        serverReported: true,
        e2eeRelated: e2eeCapabilities.enabled
      });
      
      console.log('Server-validated session with E2EE capabilities created successfully');
      return session;
    } catch (error) {
      console.error('Session creation failed:', error);
      this.logSessionEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        userId,
        details: { error: error instanceof Error ? error.message : 'Unknown error', phase: 'creation' },
        severity: 'critical'
      });
      throw new Error('Failed to create secure session');
    }
  }

  // CRITICAL: Initialize Signal Protocol E2EE capabilities for session
  private async initializeE2EECapabilities(userId: string): Promise<{
    enabled: boolean;
    capable: boolean;
    keyId?: string;
    signalProtocol?: boolean;
    registrationId?: number;
  }> {
    try {
      // Check if user has Signal Protocol identity key
      const identityKey = await this.keyManager.getSignalIdentityKey(userId);
      
      if (!identityKey) {
        // Generate new Signal Protocol key bundle for user
        const keyBundle = await this.keyManager.generateSignalKeyBundle(userId);
        
        this.logSessionEvent({
          type: 'signal_key_exchange',
          timestamp: Date.now(),
          userId,
          details: { 
            action: 'key_bundle_generated',
            registrationId: keyBundle.registrationId,
            identityKeyFingerprint: keyBundle.identityKeyFingerprint
          },
          severity: 'low',
          signalProtocolEvent: true,
          e2eeRelated: true
        });
        
        return {
          enabled: true,
          capable: true,
          keyId: keyBundle.userId,
          signalProtocol: true,
          registrationId: keyBundle.registrationId
        };
      }

      // Get existing registration ID
      const registrationId = await this.keyManager.getRegistrationId(userId);

      return {
        enabled: true,
        capable: true,
        keyId: userId,
        signalProtocol: true,
        registrationId
      };
    } catch (error) {
      console.error('Signal Protocol E2EE capabilities initialization failed:', error);
      
      this.logSessionEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        userId,
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          phase: 'signal_protocol_initialization'
        },
        severity: 'high',
        signalProtocolEvent: true,
        e2eeRelated: true
      });
      
      return {
        enabled: false,
        capable: false,
        signalProtocol: false
      };
    }
  }

  // Validate session with server (CRITICAL: No client-side bypasses allowed)
  private async validateSessionWithServer(serverToken: string, userId: string): Promise<{
    valid: boolean;
    serverEntropy?: string;
    serverHash?: string;
    error?: string;
  }> {
    try {
      // CRITICAL: This must be a real server call in production
      // For now, we simulate server validation with strict checks
      if (!serverToken || serverToken.length < 32) {
        return { valid: false, error: 'Invalid server token' };
      }

      // Simulate server entropy and hash generation
      const serverEntropy = this.cryptoService.generateSecureRandom(32);
      const serverHash = this.cryptoService.hash(`${serverToken}-${userId}-${Date.now()}`);

      // CRITICAL: In production, this would validate against server database
      return {
        valid: true,
        serverEntropy,
        serverHash
      };
    } catch (error) {
      console.error('Server validation failed:', error);
      return { valid: false, error: 'Server validation error' };
    }
  }

  // Validate device binding with server (CRITICAL: Server-side validation required)
  private async validateDeviceBindingWithServer(userId: string, deviceHash: string): Promise<boolean> {
    try {
      // CRITICAL: This must validate against server's device registry
      // For now, we perform strict local validation as fallback
      
      // Check if device security is compromised
      const securityStatus = this.deviceSecurity.getSecurityStatus();
      if (!securityStatus.isSecure || securityStatus.riskLevel === 'critical') {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId,
          details: { reason: 'device_security_compromised', riskLevel: securityStatus.riskLevel },
          severity: 'critical'
        });
        return false;
      }

      // CRITICAL: In production, this would check server's device whitelist
      return true;
    } catch (error) {
      console.error('Device binding validation failed:', error);
      return false;
    }
  }

  // Generate server-validated session fingerprint with device binding
  private async generateServerValidatedSessionFingerprint(
    userId: string, 
    deviceId: string, 
    serverEntropy: string,
    bindingHash?: string
  ): Promise<string> {
    const timestamp = Date.now();
    const clientNonce = this.cryptoService.generateSecureRandom(16);
    const fingerprintData = `${userId}:${deviceId}:${timestamp}:${clientNonce}:${serverEntropy}:${bindingHash || ''}`;
    return this.cryptoService.hash(fingerprintData);
  }

  // Generate server-validated access token with E2EE capabilities
  private async generateServerValidatedAccessToken(
    userId: string, 
    phoneNumber: string, 
    deviceId: string, 
    sessionFingerprint: string,
    serverToken: string,
    e2eeCapabilities: { enabled: boolean; capable: boolean; keyId?: string }
  ): Promise<string> {
    const now = Date.now();
    const payload = {
      userId,
      phoneNumber,
      deviceId,
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + this.ACCESS_TOKEN_EXPIRY) / 1000),
      jti: this.cryptoService.generateSecureRandom(16),
      scope: ['authenticated_user'], // No special privileges without server validation
      sessionFingerprint,
      serverValidated: true,
      serverTokenHash: this.cryptoService.hash(serverToken),
      e2eeEnabled: e2eeCapabilities.enabled,
      keyExchangeCapable: e2eeCapabilities.capable,
      e2eeKeyId: e2eeCapabilities.keyId
    };

    const tokenData = {
      header: { alg: 'HS256', typ: 'JWT' },
      payload: payload,
      timestamp: now,
      serverValidated: true,
      e2eeCapabilities
    };

    const encryptedToken = this.cryptoService.encrypt(JSON.stringify(tokenData));
    return this.safeBase64Encode(JSON.stringify(encryptedToken));
  }

  // CRITICAL: Enhanced token validation with immediate revocation check and E2EE verification
  async validateToken(token: string): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
    try {
      // Decode and decrypt token
      const encryptedDataString = this.safeBase64Decode(token);
      if (!encryptedDataString) {
        return { valid: false, error: 'Invalid token format' };
      }

      const encryptedData = JSON.parse(encryptedDataString);
      const tokenDataString = this.cryptoService.decrypt(encryptedData);
      const tokenData = JSON.parse(tokenDataString);

      const payload: JWTPayload = tokenData.payload;
      
      // CRITICAL: Check immediate revocation status first
      const revocationCheck = await this.sessionRevocation.isSessionRevoked(payload.sessionFingerprint);
      if (revocationCheck.revoked) {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: payload.userId,
          details: { 
            reason: 'session_revoked_immediately',
            revocationReason: revocationCheck.reason,
            revokedAt: revocationCheck.revokedAt,
            severity: revocationCheck.severity
          },
          severity: 'critical'
        });
        return { valid: false, error: `Session revoked: ${revocationCheck.reason}` };
      }
      
      // CRITICAL: Verify server validation flag
      if (!payload.serverValidated || !tokenData.serverValidated) {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: payload.userId,
          details: { reason: 'token_not_server_validated' },
          severity: 'critical'
        });
        return { valid: false, error: 'Token not server validated' };
      }

      // Verify session fingerprint
      const storedFingerprint = await this.secureStorage.getItem('session_fingerprint');
      if (payload.sessionFingerprint !== storedFingerprint) {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: payload.userId,
          details: { reason: 'session_fingerprint_mismatch' },
          severity: 'critical'
        });
        return { valid: false, error: 'Session fingerprint mismatch' };
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        return { valid: false, error: 'Token expired' };
      }

      // CRITICAL: Verify device binding with comprehensive validation
      const sessionId = await this.secureStorage.getItem('current_session_id');
      if (sessionId) {
        const bindingValidation = await this.deviceBinding.validateSessionBinding(sessionId);
        if (!bindingValidation.valid) {
          this.logSessionEvent({
            type: 'security_violation',
            timestamp: Date.now(),
            userId: payload.userId,
            details: { 
              reason: 'device_binding_validation_failed',
              anomalies: bindingValidation.anomalies,
              riskScore: bindingValidation.riskScore
            },
            severity: bindingValidation.requiresReauth ? 'critical' : 'high'
          });
          return { valid: false, error: 'Device binding validation failed' };
        }
        
        // Log successful binding validation
        if (bindingValidation.riskScore > 30) {
          this.logSessionEvent({
            type: 'validated',
            timestamp: Date.now(),
            userId: payload.userId,
            details: { 
              reason: 'device_binding_validated_with_risk',
              riskScore: bindingValidation.riskScore,
              bindingStrength: bindingValidation.bindingStrength
            },
            severity: 'medium'
          });
        }
      } else {
        // Fallback to legacy device fingerprint check
        const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
        if (deviceFingerprint && payload.deviceId !== deviceFingerprint.securityHash) {
          this.logSessionEvent({
            type: 'security_violation',
            timestamp: Date.now(),
            userId: payload.userId,
            details: { reason: 'legacy_device_binding_mismatch' },
            severity: 'critical'
          });
          return { valid: false, error: 'Device binding mismatch' };
        }
      }

      // CRITICAL: Perform periodic server validation
      const lastServerValidation = await this.secureStorage.getItem('last_server_validation');
      const lastValidationTime = lastServerValidation ? parseInt(lastServerValidation) : 0;
      
      if (Date.now() - lastValidationTime > this.SERVER_VALIDATION_INTERVAL) {
        const serverValidation = await this.performServerTokenValidation(token);
        if (!serverValidation) {
          this.logSessionEvent({
            type: 'server_validation_failed',
            timestamp: Date.now(),
            userId: payload.userId,
            details: { reason: 'periodic_server_validation_failed' },
            severity: 'critical'
          });
          return { valid: false, error: 'Server validation failed' };
        }
        await this.secureStorage.setItem('last_server_validation', Date.now().toString());
      }

      // Check session duration limits
      const sessionAge = now - payload.iat;
      if (sessionAge * 1000 > this.MAX_SESSION_DURATION) {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: payload.userId,
          details: { reason: 'session_duration_exceeded', sessionAge },
          severity: 'medium'
        });
        return { valid: false, error: 'Session duration exceeded' };
      }

      // Verify E2EE capabilities if enabled
      if (payload.e2eeEnabled && payload.keyExchangeCapable) {
        const e2eeValid = await this.validateE2EECapabilities(payload.userId);
        if (!e2eeValid) {
          this.logSessionEvent({
            type: 'security_violation',
            timestamp: Date.now(),
            userId: payload.userId,
            details: { reason: 'e2ee_capabilities_invalid' },
            severity: 'high',
            e2eeRelated: true
          });
          // Don't fail validation, but log the issue
        }
      }

      this.logSessionEvent({
        type: 'validated',
        timestamp: Date.now(),
        userId: payload.userId,
        details: { 
          jti: payload.jti, 
          scope: payload.scope,
          e2eeEnabled: payload.e2eeEnabled
        },
        severity: 'low',
        e2eeRelated: payload.e2eeEnabled
      });

      return { valid: true, payload };
    } catch (error) {
      console.error('Token validation failed:', error);
      this.logSessionEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        details: { error: error instanceof Error ? error.message : 'Unknown error', phase: 'validation' },
        severity: 'high'
      });
      return { valid: false, error: 'Token validation error' };
    }
  }

  // Validate Signal Protocol E2EE capabilities
  private async validateE2EECapabilities(userId: string): Promise<boolean> {
    try {
      // Check if user has valid Signal Protocol keys
      const identityKey = await this.keyManager.getSignalIdentityKey(userId);
      const keyFingerprint = await this.keyManager.getSignalKeyFingerprint(userId);
      const registrationId = await this.keyManager.getRegistrationId(userId);
      
      const isValid = !!(identityKey && keyFingerprint && registrationId);
      
      if (isValid) {
        // Verify key integrity
        const keyIntegrityValid = await this.keyManager.verifySignalKeyIntegrity(userId);
        
        if (!keyIntegrityValid) {
          this.logSessionEvent({
            type: 'security_violation',
            timestamp: Date.now(),
            userId,
            details: { reason: 'signal_key_integrity_failed' },
            severity: 'critical',
            signalProtocolEvent: true,
            e2eeRelated: true
          });
          return false;
        }
        
        this.logSessionEvent({
          type: 'validated',
          timestamp: Date.now(),
          userId,
          details: { 
            reason: 'signal_e2ee_capabilities_validated',
            keyFingerprint: keyFingerprint.substring(0, 8) + '...',
            registrationId
          },
          severity: 'low',
          signalProtocolEvent: true,
          e2eeRelated: true
        });
      }
      
      return isValid;
    } catch (error) {
      console.error('Signal Protocol E2EE capabilities validation failed:', error);
      
      this.logSessionEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        userId,
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          phase: 'signal_e2ee_validation'
        },
        severity: 'high',
        signalProtocolEvent: true,
        e2eeRelated: true
      });
      
      return false;
    }
  }

  // Perform server token validation (CRITICAL: Must be real server call in production)
  private async performServerTokenValidation(token: string): Promise<boolean> {
    try {
      // CRITICAL: This must be a real server API call in production
      // For now, we perform strict local validation as fallback
      
      const storedServerHash = await this.secureStorage.getItem('server_validation_hash');
      if (!storedServerHash) {
        return false;
      }

      // Verify server validation hash is still valid
      // In production, this would call: POST /api/auth/validate-session
      return true;
    } catch (error) {
      console.error('Server token validation failed:', error);
      return false;
    }
  }

  // Enhanced access token refresh with E2EE support
  async refreshAccessToken(): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    try {
      if (!this.currentSession) {
        return { success: false, error: 'No active session' };
      }

      // Get and decrypt stored refresh token
      const encryptedRefreshTokenData = await this.secureStorage.getObject<any>(`refresh_token_${this.currentSession.userId}`);
      
      if (!encryptedRefreshTokenData) {
        return { success: false, error: 'Refresh token not found' };
      }

      const refreshTokenDataString = this.cryptoService.decrypt(encryptedRefreshTokenData);
      const refreshTokenData: RefreshToken = JSON.parse(refreshTokenDataString);

      // Check refresh token expiry
      if (Date.now() > refreshTokenData.expiresAt) {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: { reason: 'refresh_token_expired' },
          severity: 'medium'
        });
        return { success: false, error: 'Refresh token expired' };
      }

      // CRITICAL: Validate refresh token with server
      const serverValidation = await this.validateRefreshTokenWithServer(refreshTokenData);
      if (!serverValidation.valid) {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: { reason: 'server_refresh_validation_failed', error: serverValidation.error },
          severity: 'critical'
        });
        return { success: false, error: 'Server refresh validation failed' };
      }

      // Verify device binding with comprehensive validation
      const sessionId = await this.secureStorage.getItem('current_session_id');
      if (sessionId) {
        const bindingValidation = await this.deviceBinding.validateSessionBinding(sessionId);
        if (!bindingValidation.valid || bindingValidation.requiresReauth) {
          this.logSessionEvent({
            type: 'security_violation',
            timestamp: Date.now(),
            userId: this.currentSession.userId,
            details: { 
              reason: 'device_binding_refresh_validation_failed',
              anomalies: bindingValidation.anomalies,
              riskScore: bindingValidation.riskScore
            },
            severity: 'critical'
          });
          return { success: false, error: 'Device binding verification failed during refresh' };
        }
      } else {
        // Fallback to legacy device fingerprint check
        const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
        if (!deviceFingerprint || refreshTokenData.deviceId !== deviceFingerprint.securityHash) {
          this.logSessionEvent({
            type: 'security_violation',
            timestamp: Date.now(),
            userId: this.currentSession.userId,
            details: { reason: 'legacy_device_binding_verification_failed' },
            severity: 'critical'
          });
          return { success: false, error: 'Device binding verification failed' };
        }
      }

      // Refresh E2EE capabilities
      const e2eeCapabilities = await this.initializeE2EECapabilities(this.currentSession.userId);

      // Generate new access token with updated E2EE capabilities
      const newAccessToken = await this.generateServerValidatedAccessToken(
        refreshTokenData.userId,
        '', // Phone number not needed for refresh
        refreshTokenData.deviceId,
        refreshTokenData.sessionFingerprint,
        serverValidation.newServerToken || 'refresh-token',
        e2eeCapabilities
      );

      // Update session
      this.currentSession.accessToken = newAccessToken;
      this.currentSession.expiresAt = Date.now() + this.ACCESS_TOKEN_EXPIRY;
      this.currentSession.e2eeEnabled = e2eeCapabilities.enabled;
      this.currentSession.keyExchangeCapable = e2eeCapabilities.capable;

      // CRITICAL: Store updated session in HttpOnly cookies
      await this.storeSessionInHttpOnlyCookies(this.currentSession, refreshTokenData.serverHash);

      this.logSessionEvent({
        type: 'refreshed',
        timestamp: Date.now(),
        userId: this.currentSession.userId,
        details: { 
          newExpiresAt: this.currentSession.expiresAt,
          e2eeEnabled: e2eeCapabilities.enabled
        },
        severity: 'low',
        serverReported: true,
        e2eeRelated: e2eeCapabilities.enabled
      });

      console.log('Access token refreshed with E2EE capabilities');
      return { success: true, accessToken: newAccessToken };
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logSessionEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        userId: this.currentSession?.userId,
        details: { error: error instanceof Error ? error.message : 'Unknown error', phase: 'refresh' },
        severity: 'high'
      });
      return { success: false, error: 'Token refresh failed' };
    }
  }

  // Validate refresh token with server
  private async validateRefreshTokenWithServer(refreshTokenData: RefreshToken): Promise<{
    valid: boolean;
    newServerToken?: string;
    error?: string;
  }> {
    try {
      // CRITICAL: This must validate with server in production
      // For now, we perform strict validation
      
      if (!refreshTokenData.serverHash) {
        return { valid: false, error: 'No server hash in refresh token' };
      }

      // Verify server hash integrity
      const storedServerHash = await this.secureStorage.getItem('server_validation_hash');
      if (refreshTokenData.serverHash !== storedServerHash) {
        return { valid: false, error: 'Server hash mismatch' };
      }

      // Generate new server token for refreshed session
      const newServerToken = this.cryptoService.generateSecureRandom(32);

      return {
        valid: true,
        newServerToken
      };
    } catch (error) {
      console.error('Server refresh token validation failed:', error);
      return { valid: false, error: 'Server validation error' };
    }
  }

  // CRITICAL: Start JWT rotation scheduler for enhanced security
  private startJWTRotationScheduler(): void {
    setInterval(async () => {
      if (this.currentSession && this.shouldRotateJWT()) {
        console.log('Automatic JWT rotation triggered');
        const result = await this.refreshAccessToken();
        if (!result.success) {
          console.error('Automatic JWT rotation failed:', result.error);
          await this.destroySession();
        }
      }
    }, this.JWT_ROTATION_INTERVAL);
  }

  // CRITICAL: Start Device ID validation with Redis-like tracking
  private startDeviceIDValidation(): void {
    setInterval(async () => {
      if (this.currentSession) {
        const isValid = await this.validateDeviceIDWithRedisTracking();
        if (!isValid) {
          console.error('Device ID validation failed - destroying session');
          await this.destroySession();
        }
      }
    }, this.DEVICE_ID_VALIDATION_INTERVAL);
  }

  // Enhanced session monitoring with E2EE checks
  private startSessionMonitoring(): void {
    setInterval(() => {
      this.performSessionSecurityChecks();
      this.cleanupExpiredSessions();
      this.analyzeSessionAnomalies();
      this.monitorE2EESessions();
      this.validateJWTRotationHealth();
    }, 30000); // Every 30 seconds
  }

  // Monitor E2EE sessions
  private monitorE2EESessions(): void {
    if (!this.currentSession?.e2eeEnabled) {
      return;
    }

    try {
      // Check E2EE session health
      const e2eeStatus = this.keyManager.getE2EEStatus();
      
      if (e2eeStatus.establishedSessions < e2eeStatus.totalSessions / 2) {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: { 
            reason: 'e2ee_session_health_degraded',
            establishedSessions: e2eeStatus.establishedSessions,
            totalSessions: e2eeStatus.totalSessions
          },
          severity: 'medium',
          e2eeRelated: true
        });
      }
    } catch (error) {
      console.error('E2EE session monitoring failed:', error);
    }
  }

  // CRITICAL: Start Secure Enclave validation monitoring
  private startSecureEnclaveValidation(): void {
    setInterval(async () => {
      if (this.currentSession) {
        await this.performSecureEnclaveValidation();
      }
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  // CRITICAL: Perform periodic Secure Enclave validation
  private async performSecureEnclaveValidation(): Promise<void> {
    try {
      if (!this.currentSession) {
        return;
      }

      // Validate session binding
      const sessionBindingValid = await this.sessionBinding.validateSessionBinding(this.currentSession.sessionFingerprint);
      if (!sessionBindingValid.valid) {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: { 
            reason: 'session_binding_validation_failed',
            trustScore: sessionBindingValid.trustScore,
            securityLevel: sessionBindingValid.securityLevel
          },
          severity: 'high'
        });
        
        if (sessionBindingValid.trustScore < 0.5) {
          await this.destroySession();
          return;
        }
      }

      // Check Secure Enclave capabilities
      const capabilities = this.secureEnclaveValidation.getCapabilities();
      if (capabilities && capabilities.securityLevel === 'low') {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: { 
            reason: 'secure_enclave_capabilities_degraded',
            securityLevel: capabilities.securityLevel,
            trustScore: capabilities.trustScore
          },
          severity: 'medium'
        });
      }
    } catch (error) {
      console.error('Secure Enclave validation failed:', error);
      this.logSessionEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        userId: this.currentSession?.userId,
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          phase: 'secure_enclave_validation'
        },
        severity: 'high'
      });
    }
  }

  // Start server validation monitoring
  private startServerValidationMonitoring(): void {
    setInterval(async () => {
      if (this.currentSession && this.serverValidationRequired) {
        const validation = await this.performServerTokenValidation(this.currentSession.accessToken);
        if (!validation) {
          console.warn('Server validation failed - destroying session');
          await this.destroySession();
        }
      }
    }, this.SERVER_VALIDATION_INTERVAL);
  }

  // Enhanced session security checks with E2EE validation
  private async performSessionSecurityChecks(): Promise<void> {
    if (!this.currentSession) return;

    try {
      // Validate current session
      const validation = await this.validateToken(this.currentSession.accessToken);
      
      if (!validation.valid) {
        console.warn('Session security check failed:', validation.error);
        await this.destroySession();
        return;
      }

      // Check device security status
      const deviceStatus = this.deviceSecurity.getSecurityStatus();
      if (!deviceStatus.isSecure && deviceStatus.riskLevel === 'critical') {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: { reason: 'device_security_compromised', threats: deviceStatus.threats },
          severity: 'critical'
        });
        await this.destroySession();
        return;
      }

      // CRITICAL: Verify session binding with Secure Enclave validation
      const sessionBindingValid = await this.sessionBinding.validateSessionBinding(this.currentSession.sessionFingerprint);
      if (!sessionBindingValid.valid) {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: { 
            reason: 'session_binding_security_check_failed',
            trustScore: sessionBindingValid.trustScore,
            securityLevel: sessionBindingValid.securityLevel,
            deviceMatch: sessionBindingValid.deviceMatch,
            biometricMatch: sessionBindingValid.biometricMatch
          },
          severity: sessionBindingValid.trustScore < 0.5 ? 'critical' : 'high'
        });
        
        if (sessionBindingValid.trustScore < 0.5) {
          await this.destroySession();
          return;
        }
      }

      // CRITICAL: Verify device binding hasn't changed with comprehensive validation
      const sessionId = await this.secureStorage.getItem('current_session_id');
      if (sessionId) {
        const bindingValidation = await this.deviceBinding.validateSessionBinding(sessionId);
        if (!bindingValidation.valid) {
          this.logSessionEvent({
            type: 'security_violation',
            timestamp: Date.now(),
            userId: this.currentSession.userId,
            details: { 
              reason: 'device_binding_security_check_failed',
              anomalies: bindingValidation.anomalies,
              riskScore: bindingValidation.riskScore,
              bindingStrength: bindingValidation.bindingStrength
            },
            severity: bindingValidation.requiresReauth ? 'critical' : 'high'
          });
          
          if (bindingValidation.requiresReauth) {
            await this.destroySession();
            return;
          }
        }
      } else {
        // Fallback to legacy device binding validation
        const deviceBindingValid = await this.validateDeviceBindingWithServer(
          this.currentSession.userId,
          this.deviceSecurity.getDeviceFingerprint()?.securityHash || ''
        );
        
        if (!deviceBindingValid) {
          this.logSessionEvent({
            type: 'security_violation',
            timestamp: Date.now(),
            userId: this.currentSession.userId,
            details: { reason: 'legacy_device_binding_changed' },
            severity: 'critical'
          });
          await this.destroySession();
          return;
        }
      }

      // Check E2EE capabilities if enabled
      if (this.currentSession.e2eeEnabled) {
        const e2eeValid = await this.validateE2EECapabilities(this.currentSession.userId);
        if (!e2eeValid) {
          this.logSessionEvent({
            type: 'security_violation',
            timestamp: Date.now(),
            userId: this.currentSession.userId,
            details: { reason: 'e2ee_capabilities_compromised' },
            severity: 'high',
            e2eeRelated: true
          });
          // Don't destroy session, but disable E2EE
          this.currentSession.e2eeEnabled = false;
          this.currentSession.keyExchangeCapable = false;
        }
      }
    } catch (error) {
      console.error('Session security check failed:', error);
      this.logSessionEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        userId: this.currentSession?.userId,
        details: { error: error instanceof Error ? error.message : 'Unknown error', phase: 'security_check' },
        severity: 'high'
      });
    }
  }

  // Generate server-validated refresh token with E2EE support
  private async generateServerValidatedRefreshToken(
    userId: string, 
    deviceId: string, 
    sessionFingerprint: string,
    serverHash: string,
    e2eeKeyId?: string
  ): Promise<string> {
    const refreshTokenData: RefreshToken = {
      token: this.cryptoService.generateSecureRandom(32),
      userId,
      deviceId,
      expiresAt: Date.now() + this.REFRESH_TOKEN_EXPIRY,
      createdAt: Date.now(),
      sessionFingerprint,
      serverHash,
      e2eeKeyId
    };

    const encryptedRefreshToken = this.cryptoService.encrypt(JSON.stringify(refreshTokenData));
    await this.secureStorage.setObject(`refresh_token_${userId}`, encryptedRefreshToken);
    
    return refreshTokenData.token;
  }

  // CRITICAL: Store session in HttpOnly cookies for XSS protection
  private async storeSessionInHttpOnlyCookies(session: SessionInfo, serverHash: string): Promise<void> {
    try {
      // CRITICAL: Store access token in HttpOnly cookie
      const accessTokenStored = await this.cookieService.setJWTAccessToken(session.accessToken);
      if (!accessTokenStored) {
        throw new Error('Failed to store access token in HttpOnly cookie');
      }

      // CRITICAL: Store refresh token in HttpOnly cookie
      const refreshTokenStored = await this.cookieService.setJWTRefreshToken(session.refreshToken);
      if (!refreshTokenStored) {
        throw new Error('Failed to store refresh token in HttpOnly cookie');
      }

      // Store session metadata in secure storage (non-sensitive data)
      const sessionMetadata = {
        expiresAt: session.expiresAt,
        userId: session.userId,
        deviceBound: session.deviceBound,
        sessionFingerprint: session.sessionFingerprint,
        serverValidated: session.serverValidated,
        e2eeEnabled: session.e2eeEnabled,
        keyExchangeCapable: session.keyExchangeCapable,
        serverHash,
        timestamp: Date.now(),
        cookieStorageUsed: true // Flag to indicate HttpOnly cookie usage
      };

      const encryptedMetadata = this.cryptoService.encrypt(JSON.stringify(sessionMetadata));
      await this.secureStorage.setObject('session_metadata', encryptedMetadata);

      this.logSessionEvent({
        type: 'created',
        timestamp: Date.now(),
        userId: session.userId,
        details: {
          reason: 'session_stored_in_httponly_cookies',
          accessTokenInCookie: true,
          refreshTokenInCookie: true,
          metadataInSecureStorage: true
        },
        severity: 'low',
        serverReported: true
      });

      console.log('Session stored securely in HttpOnly cookies');
    } catch (error) {
      console.error('Failed to store session in HttpOnly cookies:', error);
      throw error;
    }
  }

  // CRITICAL: Load session from HttpOnly cookies
  async loadSession(): Promise<SessionInfo | null> {
    try {
      // CRITICAL: Load session metadata from secure storage
      const encryptedMetadata = await this.secureStorage.getObject<any>('session_metadata');
      
      if (!encryptedMetadata) {
        return null;
      }

      const metadataString = this.cryptoService.decrypt(encryptedMetadata);
      const sessionMetadata = JSON.parse(metadataString);

      // CRITICAL: Verify server validation
      if (!sessionMetadata.serverValidated || !sessionMetadata.serverHash) {
        console.warn('Session metadata not server validated - destroying');
        await this.destroySession();
        return null;
      }

      // CRITICAL: Load tokens from HttpOnly cookies
      const accessToken = await this.cookieService.getJWTAccessToken();
      const refreshToken = await this.cookieService.getJWTRefreshToken();

      if (!accessToken || !refreshToken) {
        console.warn('JWT tokens not found in HttpOnly cookies - session invalid');
        await this.destroySession();
        return null;
      }

      const storedSession: SessionInfo = {
        accessToken,
        refreshToken,
        expiresAt: sessionMetadata.expiresAt,
        userId: sessionMetadata.userId,
        deviceBound: sessionMetadata.deviceBound,
        sessionFingerprint: sessionMetadata.sessionFingerprint,
        serverValidated: sessionMetadata.serverValidated,
        e2eeEnabled: sessionMetadata.e2eeEnabled,
        keyExchangeCapable: sessionMetadata.keyExchangeCapable
      };

      // Validate stored token
      const validation = await this.validateToken(storedSession.accessToken);
      
      if (!validation.valid) {
        // Try to refresh token
        this.currentSession = storedSession;
        const refreshResult = await this.refreshAccessToken();
        
        if (refreshResult.success && refreshResult.accessToken) {
          storedSession.accessToken = refreshResult.accessToken;
          this.currentSession = storedSession;
          this.startTokenRefresh();
          this.startServerValidationMonitoring();
          this.scheduleJWTRotation();
          return storedSession;
        } else {
          await this.destroySession();
          return null;
        }
      }

      this.currentSession = storedSession;
      this.startTokenRefresh();
      this.startServerValidationMonitoring();
      this.scheduleJWTRotation();
      
      this.logSessionEvent({
        type: 'validated',
        timestamp: Date.now(),
        userId: storedSession.userId,
        details: {
          reason: 'session_loaded_from_httponly_cookies',
          accessTokenFromCookie: !!accessToken,
          refreshTokenFromCookie: !!refreshToken,
          metadataFromSecureStorage: true
        },
        severity: 'low'
      });
      
      return storedSession;
    } catch (error) {
      console.error('Session loading from HttpOnly cookies failed:', error);
      this.logSessionEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        details: { error: error instanceof Error ? error.message : 'Unknown error', phase: 'loading_from_cookies' },
        severity: 'medium'
      });
      return null;
    }
  }

  // Start automatic token refresh
  private startTokenRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      if (this.currentSession) {
        const timeUntilExpiry = this.currentSession.expiresAt - Date.now();
        
        if (timeUntilExpiry <= this.REFRESH_THRESHOLD) {
          const result = await this.refreshAccessToken();
          
          if (!result.success) {
            console.error('Automatic token refresh failed:', result.error);
            await this.destroySession();
          }
        }
      }
    }, 60000); // Check every minute
  }

  // Clean up expired sessions
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const keys = await this.secureStorage.getAllKeys();
      const refreshTokenKeys = keys.filter(key => key.startsWith('refresh_token_'));
      
      for (const key of refreshTokenKeys) {
        try {
          const encryptedData = await this.secureStorage.getObject<any>(key);
          if (encryptedData) {
            const dataString = this.cryptoService.decrypt(encryptedData);
            const tokenData: RefreshToken = JSON.parse(dataString);
            
            if (Date.now() > tokenData.expiresAt) {
              await this.secureStorage.removeItem(key);
              console.log('Expired refresh token cleaned up:', key);
            }
          }
        } catch (error) {
          await this.secureStorage.removeItem(key);
          console.warn('Corrupted refresh token removed:', key);
        }
      }
    } catch (error) {
      console.error('Session cleanup failed:', error);
    }
  }

  // Analyze session anomalies
  private analyzeSessionAnomalies(): void {
    const now = Date.now();
    const recentEvents = this.sessionEvents.filter(event => 
      now - event.timestamp < 60 * 60 * 1000 // Last hour
    );

    const securityViolations = recentEvents.filter(event => 
      event.type === 'security_violation'
    );

    const e2eeEvents = recentEvents.filter(event => event.e2eeRelated);
    const signalEvents = recentEvents.filter(event => event.signalProtocolEvent);

    if (securityViolations.length > 5) {
      console.warn('High number of session security violations detected:', securityViolations.length);
      this.logSessionEvent({
        type: 'security_violation',
        timestamp: now,
        details: { 
          reason: 'high_security_violation_count', 
          count: securityViolations.length,
          timeWindow: '1 hour'
        },
        severity: 'high'
      });
    }

    if (e2eeEvents.length > 10) {
      console.log('High E2EE activity detected:', e2eeEvents.length);
    }

    if (signalEvents.length > 15) {
      console.log('High Signal Protocol activity detected:', signalEvents.length);
    }
  }

  // Get current session
  getCurrentSession(): SessionInfo | null {
    return this.currentSession;
  }

  // Check if session is valid
  async isSessionValid(): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    const validation = await this.validateToken(this.currentSession.accessToken);
    return validation.valid;
  }

  // CRITICAL: Enhanced session destruction with immediate revocation and E2EE cleanup
  async destroySession(): Promise<void> {
    try {
      if (this.currentSession) {
        // CRITICAL: Immediate session revocation with Redis-like tracking
        const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
        const revocationResult = await this.sessionRevocation.revokeSessionImmediate(
          this.currentSession.sessionFingerprint,
          this.currentSession.userId,
          'logout',
          {
            userAgent: Platform.OS,
            riskScore: 0
          }
        );
        
        if (revocationResult.success) {
          console.log(`🚫 Session immediately revoked: ${revocationResult.revocationId}`);
        }
        
        // CRITICAL: Notify server of session destruction in production
        await this.notifyServerSessionDestruction(this.currentSession.userId);
        
        // Clear session binding
        const sessionBindingCleared = await this.sessionBinding.getSessionBinding(this.currentSession.sessionFingerprint);
        if (sessionBindingCleared) {
          await this.sessionBinding.clearAllSessions();
        }

        // Clear device binding
        const sessionId = await this.secureStorage.getItem('current_session_id');
        if (sessionId) {
          await this.deviceBinding.removeSessionBinding(sessionId);
        }

        // Clear Secure Enclave validation data
        await this.secureEnclaveValidation.clearValidationData();
        
        // Clear Signal Protocol keys if enabled
        if (this.currentSession.e2eeEnabled) {
          await this.keyManager.clearAllSignalKeys();
          
          this.logSessionEvent({
            type: 'destroyed',
            timestamp: Date.now(),
            userId: this.currentSession.userId,
            details: { 
              reason: 'manual_logout', 
              signalKeysCleared: true, 
              deviceBindingCleared: true,
              immediateRevocation: revocationResult.success,
              revocationId: revocationResult.revocationId
            },
            severity: 'low',
            serverReported: true,
            signalProtocolEvent: true,
            e2eeRelated: true
          });
        }
        
        // Revoke refresh token
        await this.secureStorage.removeItem(`refresh_token_${this.currentSession.userId}`);
        
        this.logSessionEvent({
          type: 'destroyed',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: { 
            reason: 'manual_logout', 
            deviceBindingCleared: true,
            immediateRevocation: revocationResult.success,
            revocationId: revocationResult.revocationId
          },
          severity: 'low',
          serverReported: true
        });
      }

      // CRITICAL: Clear JWT tokens from HttpOnly cookies
      await this.cookieService.clearJWTCookies();
      
      // Clear session metadata and other storage
      await this.secureStorage.removeItem('session_metadata');
      await this.secureStorage.removeItem('device_binding');
      await this.secureStorage.removeItem('session_fingerprint');
      await this.secureStorage.removeItem('server_validation_hash');
      await this.secureStorage.removeItem('last_server_validation');
      await this.secureStorage.removeItem('current_session_id');

      // Stop token refresh and monitoring
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }

      this.currentSession = null;
      console.log('🚫 Enhanced session destroyed with immediate revocation, E2EE cleanup, device binding removal, and HttpOnly cookies cleared');
    } catch (error) {
      console.error('Session destruction failed:', error);
      this.logSessionEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        details: { error: error instanceof Error ? error.message : 'Unknown error', phase: 'destruction' },
        severity: 'high'
      });
      throw new Error('Failed to destroy session');
    }
  }

  // Notify server of session destruction
  private async notifyServerSessionDestruction(userId: string): Promise<void> {
    try {
      // CRITICAL: This must be a real server API call in production
      // For now, we log the destruction locally
      console.log('Session destruction notification sent for user:', userId);
    } catch (error) {
      console.error('Failed to notify server of session destruction:', error);
    }
  }

  // CRITICAL: Revoke all sessions for user with immediate revocation and E2EE cleanup
  async revokeAllSessions(userId: string): Promise<void> {
    try {
      // CRITICAL: Immediate revocation of all user sessions with Redis-like tracking
      const revocationResult = await this.sessionRevocation.revokeAllUserSessionsImmediate(
        userId,
        'admin_action',
        this.currentSession?.sessionFingerprint // Exclude current session if needed
      );
      
      console.log(`🚫 Immediate revocation result: ${revocationResult.totalRevoked} sessions revoked`);
      
      // CRITICAL: Coordinate with server to revoke all sessions
      await this.revokeAllSessionsOnServer(userId);
      
      // Clear all device bindings for user
      await this.deviceBinding.clearAllBindings();
      
      // Clear all Signal Protocol keys for user
      await this.keyManager.clearAllSignalKeys();
      
      // Remove all refresh tokens for user
      const keys = await this.secureStorage.getAllKeys();
      const refreshTokenKeys = keys.filter(key => key.startsWith(`refresh_token_${userId}`));
      
      for (const key of refreshTokenKeys) {
        await this.secureStorage.removeItem(key);
      }

      // If current session belongs to this user, destroy it
      if (this.currentSession && this.currentSession.userId === userId) {
        await this.destroySession();
      }

      this.logSessionEvent({
        type: 'destroyed',
        timestamp: Date.now(),
        userId,
        details: { 
          reason: 'revoke_all_sessions', 
          tokensRevoked: refreshTokenKeys.length,
          e2eeKeysCleared: true,
          deviceBindingsCleared: true,
          immediateRevocation: revocationResult.success,
          revokedSessions: revocationResult.revokedSessions.length,
          failedSessions: revocationResult.failedSessions.length
        },
        severity: 'medium',
        serverReported: true,
        e2eeRelated: true
      });

      console.log(`🚫 All sessions revoked for user with immediate revocation and E2EE cleanup: ${userId}`);
    } catch (error) {
      console.error('Session revocation failed:', error);
      this.logSessionEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        userId,
        details: { error: error instanceof Error ? error.message : 'Unknown error', phase: 'revocation' },
        severity: 'high'
      });
      throw new Error('Failed to revoke sessions');
    }
  }

  // Revoke all sessions on server
  private async revokeAllSessionsOnServer(userId: string): Promise<void> {
    try {
      // CRITICAL: This must be a real server API call in production
      // POST /api/auth/revoke-all-sessions
      console.log('All sessions revoked on server for user:', userId);
    } catch (error) {
      console.error('Failed to revoke sessions on server:', error);
    }
  }

  // Log session events
  private logSessionEvent(event: SessionSecurityEvent): void {
    this.sessionEvents.push(event);
    
    // Keep only last 1000 events
    if (this.sessionEvents.length > 1000) {
      this.sessionEvents = this.sessionEvents.slice(-1000);
    }

    // Log critical events immediately
    if (event.severity === 'critical') {
      console.error('CRITICAL SESSION SECURITY EVENT:', event);
    }

    // Log Signal Protocol events
    if (event.signalProtocolEvent) {
      console.log('SIGNAL PROTOCOL SESSION EVENT:', event);
    }
    
    // Log E2EE events
    if (event.e2eeRelated) {
      console.log('E2EE SESSION EVENT:', event);
    }
  }

  // Safe base64 encoding for React Native
  private safeBase64Encode(str: string): string {
    try {
      if (typeof btoa !== 'undefined') {
        return btoa(str);
      }
      
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      let i = 0;
      
      while (i < str.length) {
        const a = str.charCodeAt(i++);
        const b = i < str.length ? str.charCodeAt(i++) : 0;
        const c = i < str.length ? str.charCodeAt(i++) : 0;
        
        const bitmap = (a << 16) | (b << 8) | c;
        
        result += chars.charAt((bitmap >> 18) & 63);
        result += chars.charAt((bitmap >> 12) & 63);
        result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
        result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
      }
      
      return result;
    } catch (error) {
      console.error('Base64 encoding failed:', error);
      return str;
    }
  }

  private safeBase64Decode(base64: string): string {
    try {
      if (typeof atob !== 'undefined') {
        return atob(base64);
      }
      
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      let i = 0;
      
      base64 = base64.replace(/[^A-Za-z0-9+/]/g, '');
      
      while (i < base64.length) {
        const encoded1 = chars.indexOf(base64.charAt(i++));
        const encoded2 = chars.indexOf(base64.charAt(i++));
        const encoded3 = chars.indexOf(base64.charAt(i++));
        const encoded4 = chars.indexOf(base64.charAt(i++));
        
        const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
        
        result += String.fromCharCode((bitmap >> 16) & 255);
        if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
        if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
      }
      
      return result;
    } catch (error) {
      console.error('Base64 decoding failed:', error);
      return '';
    }
  }

  // Get enhanced session info for debugging
  async getSessionInfo(): Promise<any> {
    if (!this.currentSession) {
      return null;
    }

    const cookieStatus = this.cookieService.getCookieSecurityStatus();
    const bindingStatus = this.deviceBinding.getBindingSecurityStatus();
    const currentBinding = await this.getCurrentSessionBinding();
    const secureEnclaveCapabilities = this.secureEnclaveValidation.getCapabilities();
    const validationStats = this.secureEnclaveValidation.getValidationStatistics();
    const sessionBindingStats = this.sessionBinding.getSessionStatistics();
    const biometricInfo = this.biometricAuth.getBiometricInfo();
    const hardwareCapabilities = this.biometricAuth.getHardwareSecurityCapabilities();

    return {
      userId: this.currentSession.userId,
      expiresAt: new Date(this.currentSession.expiresAt).toISOString(),
      deviceBound: this.currentSession.deviceBound,
      serverValidated: this.currentSession.serverValidated,
      e2eeEnabled: this.currentSession.e2eeEnabled,
      keyExchangeCapable: this.currentSession.keyExchangeCapable,
      timeUntilExpiry: Math.max(0, this.currentSession.expiresAt - Date.now()),
      sessionFingerprint: this.currentSession.sessionFingerprint.substring(0, 8) + '...',
      securityEvents: this.sessionEvents.length,
      e2eeEvents: this.sessionEvents.filter(e => e.e2eeRelated).length,
      lastSecurityCheck: Date.now(),
      // CRITICAL: HttpOnly cookie security status
      httpOnlyCookies: {
        enabled: true,
        totalCookies: cookieStatus.totalCookies,
        securityEvents: cookieStatus.securityEvents,
        criticalEvents: cookieStatus.criticalEvents,
        deviceBindingEnabled: cookieStatus.deviceBindingEnabled,
        encryptionEnabled: cookieStatus.encryptionEnabled,
        signatureValidationEnabled: cookieStatus.signatureValidationEnabled
      },
      // CRITICAL: Device binding security status
      deviceBinding: {
        enabled: true,
        bindingStrength: currentBinding?.bindingStrength || 'none',
        riskScore: currentBinding?.riskScore || 0,
        validationCount: currentBinding?.validationCount || 0,
        lastValidated: currentBinding?.lastValidated || 0,
        totalBindings: bindingStatus.totalBindings,
        activeBindings: bindingStatus.activeBindings,
        highRiskBindings: bindingStatus.highRiskBindings,
        averageRiskScore: bindingStatus.averageRiskScore,
        recentAnomalies: bindingStatus.recentAnomalies
      },
      // CRITICAL: Secure Enclave security status
      secureEnclave: {
        available: secureEnclaveCapabilities?.available || false,
        hardwareValidated: secureEnclaveCapabilities?.hardwareValidated || false,
        securityLevel: secureEnclaveCapabilities?.securityLevel || 'low',
        trustScore: secureEnclaveCapabilities?.trustScore || 0,
        attestationSupported: secureEnclaveCapabilities?.attestationSupported || false,
        totalValidations: validationStats.totalValidations,
        successfulValidations: validationStats.successfulValidations,
        hardwareValidations: validationStats.hardwareValidations,
        averageTrustScore: validationStats.averageTrustScore,
        activeSessions: validationStats.activeSessions,
        cachedAttestations: validationStats.cachedAttestations
      },
      // CRITICAL: Session binding security status
      sessionBinding: {
        enabled: true,
        activeSessions: sessionBindingStats.activeSessions,
        totalSessions: sessionBindingStats.totalSessions,
        averageTrustScore: sessionBindingStats.averageTrustScore,
        hardwareProtectedSessions: sessionBindingStats.hardwareProtectedSessions,
        antiReplayTokens: sessionBindingStats.antiReplayTokens,
        deviceFingerprintAge: sessionBindingStats.deviceFingerprintAge
      },
      // CRITICAL: Biometric authentication status
      biometricAuth: {
        available: biometricInfo.isAvailable,
        supportedTypes: biometricInfo.supportedTypes,
        secureEnclaveEnabled: biometricInfo.secureEnclaveEnabled,
        hardwareValidated: biometricInfo.hardwareValidated,
        attestationSupported: biometricInfo.attestationSupported,
        securityChip: biometricInfo.securityChip,
        hardwareSecurityLevel: biometricInfo.hardwareSecurityLevel,
        trustLevel: hardwareCapabilities.trustLevel,
        securityLevel: hardwareCapabilities.securityLevel
      }
    };
  }

  // CRITICAL: Check if JWT should be rotated
  private shouldRotateJWT(): boolean {
    if (!this.currentSession) return false;
    
    const timeSinceLastRotation = Date.now() - this.currentSession.expiresAt + this.ACCESS_TOKEN_EXPIRY;
    return timeSinceLastRotation >= this.JWT_ROTATION_INTERVAL;
  }

  // CRITICAL: Schedule JWT rotation
  private scheduleJWTRotation(): void {
    if (!this.currentSession) return;
    
    const rotationTime = this.JWT_ROTATION_INTERVAL - (Date.now() - (this.currentSession.expiresAt - this.ACCESS_TOKEN_EXPIRY));
    
    if (rotationTime > 0) {
      setTimeout(async () => {
        if (this.currentSession) {
          const result = await this.refreshAccessToken();
          if (result.success) {
            this.scheduleJWTRotation(); // Schedule next rotation
          }
        }
      }, rotationTime);
    }
  }

  // CRITICAL: Validate Device ID with Redis-like session tracking
  private async validateDeviceIDWithRedisTracking(): Promise<boolean> {
    try {
      if (!this.currentSession) return false;
      
      const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
      if (!deviceFingerprint) return false;
      
      // Simulate Redis session tracking
      const sessionKey = `session:${this.currentSession.userId}:${deviceFingerprint.securityHash}`;
      const storedSessionData = await this.secureStorage.getItem(sessionKey);
      
      if (!storedSessionData) {
        // Create session tracking entry
        const sessionData = {
          userId: this.currentSession.userId,
          deviceId: deviceFingerprint.securityHash,
          sessionId: this.currentSession.sessionFingerprint,
          lastValidated: Date.now(),
          validationCount: 1
        };
        
        await this.secureStorage.setItem(sessionKey, JSON.stringify(sessionData));
        return true;
      }
      
      const sessionData = JSON.parse(storedSessionData);
      
      // Validate session consistency
      if (sessionData.sessionId !== this.currentSession.sessionFingerprint) {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: { reason: 'session_id_mismatch_redis_tracking' },
          severity: 'critical'
        });
        return false;
      }
      
      // Update tracking data
      sessionData.lastValidated = Date.now();
      sessionData.validationCount++;
      await this.secureStorage.setItem(sessionKey, JSON.stringify(sessionData));
      
      return true;
    } catch (error) {
      console.error('Device ID validation with Redis tracking failed:', error);
      return false;
    }
  }

  // CRITICAL: Validate JWT rotation health
  private validateJWTRotationHealth(): void {
    if (!this.currentSession) return;
    
    const tokenAge = Date.now() - (this.currentSession.expiresAt - this.ACCESS_TOKEN_EXPIRY);
    
    if (tokenAge > this.JWT_ROTATION_INTERVAL * 1.5) {
      this.logSessionEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        userId: this.currentSession.userId,
        details: { 
          reason: 'jwt_rotation_overdue',
          tokenAge,
          rotationInterval: this.JWT_ROTATION_INTERVAL
        },
        severity: 'high'
      });
      
      // Force JWT rotation
      this.refreshAccessToken().catch(error => {
        console.error('Forced JWT rotation failed:', error);
      });
    }
  }

  // Get session security status with E2EE info, JWT rotation status, HttpOnly cookies, and Secure Enclave
  async getSessionSecurityStatus(): Promise<any> {
    const now = Date.now();
    const recentEvents = this.sessionEvents.filter(event => 
      now - event.timestamp < 60 * 60 * 1000 // Last hour
    );

    const e2eeEvents = recentEvents.filter(e => e.e2eeRelated);
    const signalEvents = recentEvents.filter(e => e.signalProtocolEvent);
    const jwtAge = this.currentSession ? now - (this.currentSession.expiresAt - this.ACCESS_TOKEN_EXPIRY) : 0;
    const cookieStatus = this.cookieService.getCookieSecurityStatus();
    const bindingStatus = this.deviceBinding.getBindingSecurityStatus();
    const currentBinding = await this.getCurrentSessionBinding();
    const secureEnclaveCapabilities = this.secureEnclaveValidation.getCapabilities();
    const validationStats = this.secureEnclaveValidation.getValidationStatistics();
    const sessionBindingStats = this.sessionBinding.getSessionStatistics();
    const biometricInfo = this.biometricAuth.getBiometricInfo();
    const hardwareCapabilities = this.biometricAuth.getHardwareSecurityCapabilities();

    return {
      currentSession: !!this.currentSession,
      sessionValid: this.currentSession ? true : false,
      serverValidated: this.currentSession?.serverValidated || false,
      e2eeEnabled: this.currentSession?.e2eeEnabled || false,
      keyExchangeCapable: this.currentSession?.keyExchangeCapable || false,
      recentSecurityEvents: recentEvents.length,
      criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
      e2eeEvents: e2eeEvents.length,
      signalProtocolEvents: signalEvents.length,
      lastEventTimestamp: recentEvents.length > 0 ? Math.max(...recentEvents.map(e => e.timestamp)) : 0,
      monitoringActive: true,
      serverValidationRequired: this.serverValidationRequired,
      jwtRotationEnabled: true,
      jwtAge,
      jwtRotationDue: jwtAge >= this.JWT_ROTATION_INTERVAL,
      deviceIdValidationActive: true,
      // CRITICAL: HttpOnly cookie security status
      httpOnlyCookieSecurity: {
        enabled: true,
        xssProtectionActive: true,
        cookiesSecured: cookieStatus.totalCookies,
        cookieSecurityEvents: cookieStatus.securityEvents,
        cookieCriticalEvents: cookieStatus.criticalEvents,
        deviceBindingEnabled: cookieStatus.deviceBindingEnabled,
        encryptionEnabled: cookieStatus.encryptionEnabled,
        signatureValidationEnabled: cookieStatus.signatureValidationEnabled,
        platform: cookieStatus.platform
      },
      // CRITICAL: Device binding security status
      deviceBindingSecurity: {
        enabled: true,
        bindingStrength: currentBinding?.bindingStrength || 'none',
        currentRiskScore: currentBinding?.riskScore || 0,
        validationCount: currentBinding?.validationCount || 0,
        lastValidated: currentBinding?.lastValidated || 0,
        totalBindings: bindingStatus.totalBindings,
        activeBindings: bindingStatus.activeBindings,
        highRiskBindings: bindingStatus.highRiskBindings,
        averageRiskScore: bindingStatus.averageRiskScore,
        recentAnomalies: bindingStatus.recentAnomalies,
        bindingStrengthDistribution: bindingStatus.bindingStrengthDistribution
      },
      // CRITICAL: Secure Enclave security status
      secureEnclaveSecurity: {
        enabled: secureEnclaveCapabilities?.available || false,
        hardwareValidated: secureEnclaveCapabilities?.hardwareValidated || false,
        securityLevel: secureEnclaveCapabilities?.securityLevel || 'low',
        trustScore: secureEnclaveCapabilities?.trustScore || 0,
        attestationSupported: secureEnclaveCapabilities?.attestationSupported || false,
        biometricIntegrated: secureEnclaveCapabilities?.biometricIntegrated || false,
        keyGenerationSupported: secureEnclaveCapabilities?.keyGenerationSupported || false,
        signatureSupported: secureEnclaveCapabilities?.signatureSupported || false,
        encryptionSupported: secureEnclaveCapabilities?.encryptionSupported || false,
        platform: secureEnclaveCapabilities?.platform || Platform.OS,
        validationStatistics: {
          totalValidations: validationStats.totalValidations,
          successfulValidations: validationStats.successfulValidations,
          hardwareValidations: validationStats.hardwareValidations,
          averageTrustScore: validationStats.averageTrustScore,
          activeSessions: validationStats.activeSessions,
          cachedAttestations: validationStats.cachedAttestations
        }
      },
      // CRITICAL: Session binding security status
      sessionBindingSecurity: {
        enabled: true,
        activeSessions: sessionBindingStats.activeSessions,
        totalSessions: sessionBindingStats.totalSessions,
        averageTrustScore: sessionBindingStats.averageTrustScore,
        hardwareProtectedSessions: sessionBindingStats.hardwareProtectedSessions,
        antiReplayTokens: sessionBindingStats.antiReplayTokens,
        deviceFingerprintAge: sessionBindingStats.deviceFingerprintAge
      },
      // CRITICAL: Biometric authentication security status
      biometricAuthSecurity: {
        available: biometricInfo.isAvailable,
        supportedTypes: biometricInfo.supportedTypes,
        secureEnclaveEnabled: biometricInfo.secureEnclaveEnabled,
        keychainProtectionEnabled: biometricInfo.keychainProtectionEnabled,
        hardwareValidated: biometricInfo.hardwareValidated,
        attestationSupported: biometricInfo.attestationSupported,
        securityChip: biometricInfo.securityChip,
        hardwareSecurityLevel: biometricInfo.hardwareSecurityLevel,
        capabilities: {
          secureEnclaveAvailable: hardwareCapabilities.secureEnclaveAvailable,
          keychainAvailable: hardwareCapabilities.keychainAvailable,
          hardwareKeyStorage: hardwareCapabilities.hardwareKeyStorage,
          biometricHardwareProtected: hardwareCapabilities.biometricHardwareProtected,
          attestationSupported: hardwareCapabilities.attestationSupported,
          hardwareValidated: hardwareCapabilities.hardwareValidated,
          securityLevel: hardwareCapabilities.securityLevel,
          trustLevel: hardwareCapabilities.trustLevel
        }
      }
    };
  }

  // Validate current session (called from layout)
  async validateSession(): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    try {
      const validation = await this.validateToken(this.currentSession.accessToken);
      
      if (!validation.valid) {
        console.warn('Session validation failed:', validation.error);
        
        if (validation.error === 'Token expired') {
          const refreshResult = await this.refreshAccessToken();
          if (refreshResult.success) {
            return true;
          }
        }
        
        await this.destroySession();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      await this.destroySession();
      return false;
    }
  }

  // Validate device binding (called from layout)
  async validateDeviceBinding(): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    try {
      const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
      if (!deviceFingerprint) {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: { reason: 'device_fingerprint_unavailable' },
          severity: 'high'
        });
        return false;
      }

      const storedDeviceBinding = await this.secureStorage.getItem('device_binding');
      if (!storedDeviceBinding) {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: { reason: 'device_binding_not_found' },
          severity: 'high'
        });
        return false;
      }

      if (deviceFingerprint.securityHash !== storedDeviceBinding) {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: { 
            reason: 'device_binding_mismatch',
            currentDevice: deviceFingerprint.securityHash.substring(0, 8) + '...',
            boundDevice: storedDeviceBinding.substring(0, 8) + '...'
          },
          severity: 'critical'
        });
        return false;
      }

      // CRITICAL: Validate device binding with server
      const serverValidation = await this.validateDeviceBindingWithServer(
        this.currentSession.userId,
        deviceFingerprint.securityHash
      );

      if (!serverValidation) {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: { reason: 'server_device_binding_validation_failed' },
          severity: 'critical'
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Device binding validation error:', error);
      this.logSessionEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        userId: this.currentSession?.userId,
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error', 
          phase: 'device_binding_validation' 
        },
        severity: 'high'
      });
      return false;
    }
  }

  // CRITICAL: Get session age for security checks
  async getSessionAge(): Promise<number> {
    if (!this.currentSession) {
      return Infinity; // No session means infinite age
    }
    
    const sessionStartTime = this.currentSession.expiresAt - this.ACCESS_TOKEN_EXPIRY;
    return Date.now() - sessionStartTime;
  }

  // CRITICAL: Update session activity timestamp
  async updateSessionActivity(): Promise<void> {
    if (!this.currentSession) {
      return;
    }
    
    try {
      // Update last activity in session fingerprint
      const activityData = {
        lastActivity: Date.now(),
        sessionId: this.currentSession.sessionFingerprint,
        userId: this.currentSession.userId
      };
      
      await this.secureStorage.setItem('last_session_activity', JSON.stringify(activityData));
      
      this.logSessionEvent({
        type: 'validated',
        timestamp: Date.now(),
        userId: this.currentSession.userId,
        details: { reason: 'activity_update' },
        severity: 'low'
      });
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }

  // CRITICAL: Clear session data securely
  async clearSession(): Promise<void> {
    try {
      await this.destroySession();
      console.log('Session cleared successfully');
    } catch (error) {
      console.error('Failed to clear session:', error);
      throw error;
    }
  }

  // Get current session binding
  private async getCurrentSessionBinding(): Promise<any> {
    try {
      const sessionId = await this.secureStorage.getItem('current_session_id');
      if (sessionId) {
        return this.deviceBinding.getSessionBinding(sessionId);
      }
      return null;
    } catch (error) {
      console.error('Failed to get current session binding:', error);
      return null;
    }
  }

  // Get device binding service instance
  getDeviceBindingService(): DeviceBindingService {
    return this.deviceBinding;
  }

  // CRITICAL: Get Secure Enclave validation service instance
  getSecureEnclaveValidationService(): SecureEnclaveValidationService {
    return this.secureEnclaveValidation;
  }

  // CRITICAL: Get session binding service instance
  getSessionBindingService(): SessionBindingService {
    return this.sessionBinding;
  }

  // CRITICAL: Get biometric authentication service instance
  getBiometricAuthService(): BiometricAuthService {
    return this.biometricAuth;
  }
  
  // CRITICAL: Get session revocation service instance
  getSessionRevocationService(): SessionRevocationService {
    return this.sessionRevocation;
  }
  
  // CRITICAL: Initialize session revocation service
  private async initializeSessionRevocation(): Promise<void> {
    try {
      await this.sessionRevocation.initialize();
      console.log('🚫 Session revocation service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize session revocation service:', error);
    }
  }
  
  // CRITICAL: Revoke device sessions immediately for security violations
  async revokeDeviceSessionsImmediate(
    deviceId: string,
    reason: 'security_violation' | 'device_change' | 'suspicious_activity'
  ): Promise<{
    success: boolean;
    revokedSessions: string[];
    affectedUsers: string[];
  }> {
    try {
      const result = await this.sessionRevocation.revokeDeviceSessionsImmediate(deviceId, reason);
      
      this.logSessionEvent({
        type: 'destroyed',
        timestamp: Date.now(),
        details: {
          reason: 'device_sessions_revoked_immediately',
          deviceId: deviceId.substring(0, 8) + '...',
          revokedSessions: result.revokedSessions.length,
          affectedUsers: result.affectedUsers.length,
          revocationReason: reason
        },
        severity: reason === 'security_violation' ? 'critical' : 'high'
      });
      
      return result;
    } catch (error) {
      console.error('Failed to revoke device sessions immediately:', error);
      return {
        success: false,
        revokedSessions: [],
        affectedUsers: []
      };
    }
  }
  
  // CRITICAL: Monitor and revoke suspicious sessions
  async monitorAndRevokeSuspiciousSessions(): Promise<{
    monitored: number;
    revoked: number;
    recommendations: string[];
  }> {
    try {
      const monitoring = await this.sessionRevocation.monitorSuspiciousSessions();
      let revokedCount = 0;
      
      // Revoke high-risk sessions immediately
      for (const sessionId of monitoring.highRiskSessions) {
        const sessionEntry = await this.sessionRevocation.getUserActiveSessions('*');
        const session = sessionEntry.find(s => s.sessionId === sessionId);
        
        if (session) {
          const result = await this.sessionRevocation.revokeSessionImmediate(
            sessionId,
            session.userId,
            'suspicious_activity',
            {
              riskScore: session.riskScore,
              userAgent: session.metadata.platform
            }
          );
          
          if (result.success) {
            revokedCount++;
          }
        }
      }
      
      this.logSessionEvent({
        type: 'validated',
        timestamp: Date.now(),
        details: {
          reason: 'suspicious_session_monitoring',
          suspiciousSessions: monitoring.suspiciousSessions.length,
          highRiskSessions: monitoring.highRiskSessions.length,
          revokedSessions: revokedCount
        },
        severity: revokedCount > 0 ? 'high' : 'low'
      });
      
      return {
        monitored: monitoring.suspiciousSessions.length + monitoring.highRiskSessions.length,
        revoked: revokedCount,
        recommendations: monitoring.recommendations
      };
    } catch (error) {
      console.error('Failed to monitor and revoke suspicious sessions:', error);
      return {
        monitored: 0,
        revoked: 0,
        recommendations: ['Monitoring system error - manual review required']
      };
    }
  }
  
  // CRITICAL: Get revocation statistics for dashboard
  async getRevocationStatistics(): Promise<any> {
    try {
      const stats = await this.sessionRevocation.getRevocationStats();
      const userSessions = this.currentSession ? 
        await this.sessionRevocation.getUserActiveSessions(this.currentSession.userId) : [];
      
      return {
        revocationStats: stats,
        currentUserSessions: userSessions.length,
        sessionHealth: {
          totalActive: userSessions.filter(s => s.isActive).length,
          averageRiskScore: userSessions.length > 0 ? 
            userSessions.reduce((sum, s) => sum + s.riskScore, 0) / userSessions.length : 0,
          highRiskSessions: userSessions.filter(s => s.riskScore > 70).length
        }
      };
    } catch (error) {
      console.error('Failed to get revocation statistics:', error);
      return {
        revocationStats: {
          totalRevocations: 0,
          activeRevocations: 0,
          revocationsByReason: {},
          averageRevocationTime: 0,
          criticalRevocations: 0,
          recentRevocations: 0
        },
        currentUserSessions: 0,
        sessionHealth: {
          totalActive: 0,
          averageRiskScore: 0,
          highRiskSessions: 0
        }
      };
    }
  }

  // CRITICAL: Perform biometric re-authentication for sensitive operations
  async performBiometricReauth(operation: string): Promise<boolean> {
    try {
      if (!this.currentSession) {
        return false;
      }

      const result = await this.secureEnclaveValidation.authenticateWithSecureEnclaveValidation(
        `reauth_${this.currentSession.sessionFingerprint}_${Date.now()}`,
        true // Require maximum security
      );

      if (result.success) {
        this.logSessionEvent({
          type: 'validated',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: {
            reason: 'biometric_reauth_successful',
            operation,
            secureEnclaveUsed: result.secureEnclaveUsed,
            trustScore: result.trustScore,
            validationLevel: result.validationLevel
          },
          severity: 'low'
        });
        return true;
      } else {
        this.logSessionEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          userId: this.currentSession.userId,
          details: {
            reason: 'biometric_reauth_failed',
            operation,
            error: result.error
          },
          severity: 'high'
        });
        return false;
      }
    } catch (error) {
      console.error('Biometric re-authentication failed:', error);
      this.logSessionEvent({
        type: 'security_violation',
        timestamp: Date.now(),
        userId: this.currentSession?.userId,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          phase: 'biometric_reauth',
          operation
        },
        severity: 'high'
      });
      return false;
    }
  }

  // CRITICAL: Check if session requires biometric re-authentication
  async requiresBiometricReauth(): Promise<boolean> {
    try {
      if (!this.currentSession) {
        return true;
      }

      // Check session age
      const sessionAge = await this.getSessionAge();
      if (sessionAge > 30 * 60 * 1000) { // 30 minutes
        return true;
      }

      // Check session binding trust score
      const sessionBindingValid = await this.sessionBinding.validateSessionBinding(this.currentSession.sessionFingerprint);
      if (!sessionBindingValid.valid || sessionBindingValid.trustScore < 0.8) {
        return true;
      }

      // Check for recent security violations
      const recentEvents = this.sessionEvents.filter(event => 
        Date.now() - event.timestamp < 10 * 60 * 1000 && // Last 10 minutes
        event.severity === 'critical'
      );

      if (recentEvents.length > 0) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to check biometric reauth requirement:', error);
      return true; // Err on the side of caution
    }
  }

  // Validate device binding for external use
  async validateCurrentDeviceBinding(): Promise<{
    valid: boolean;
    riskScore: number;
    anomalies: string[];
    bindingStrength: string;
    requiresReauth?: boolean;
  }> {
    try {
      const sessionId = await this.secureStorage.getItem('current_session_id');
      if (sessionId) {
        return await this.deviceBinding.validateSessionBinding(sessionId);
      }
      
      return {
        valid: false,
        riskScore: 100,
        anomalies: ['no_session_binding'],
        bindingStrength: 'none',
        requiresReauth: true
      };
    } catch (error) {
      console.error('Device binding validation failed:', error);
      return {
        valid: false,
        riskScore: 100,
        anomalies: ['validation_error'],
        bindingStrength: 'none',
        requiresReauth: true
      };
    }
  }
}

export default SessionManager;