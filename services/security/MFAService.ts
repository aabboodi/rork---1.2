import { Platform } from 'react-native';
import CryptoService from './CryptoService';
import SecureStorage from './SecureStorage';
import NetworkSecurity from './NetworkSecurity';

interface MFAConfig {
  enabled: boolean;
  methods: MFAMethod[];
  backupCodes: string[];
  lastVerified: number;
}

interface MFAMethod {
  type: 'sms' | 'email' | 'totp' | 'backup_code';
  identifier: string; // phone number, email, or secret key
  verified: boolean;
  createdAt: number;
}

interface TOTPSecret {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

interface MFAChallenge {
  challengeId: string;
  method: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
}

class MFAService {
  private static instance: MFAService;
  private cryptoService: CryptoService;
  private secureStorage: SecureStorage;
  private networkSecurity: NetworkSecurity;
  private activeChallenges: Map<string, MFAChallenge> = new Map();

  private constructor() {
    this.cryptoService = CryptoService.getInstance();
    this.secureStorage = SecureStorage.getInstance();
    this.networkSecurity = NetworkSecurity.getInstance();
  }

  static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService();
    }
    return MFAService.instance;
  }

  // Initialize MFA for user
  async initializeMFA(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const mfaConfig: MFAConfig = {
        enabled: false,
        methods: [],
        backupCodes: this.generateBackupCodes(),
        lastVerified: 0
      };

      await this.secureStorage.setObject(`mfa_config_${userId}`, mfaConfig);
      
      return { success: true };
    } catch (error) {
      console.error('MFA initialization failed:', error);
      return { success: false, error: 'Failed to initialize MFA' };
    }
  }

  // Enable MFA for user
  async enableMFA(userId: string, method: 'sms' | 'email' | 'totp', identifier: string): Promise<{ success: boolean; secret?: TOTPSecret; error?: string }> {
    try {
      const mfaConfig = await this.getMFAConfig(userId);
      
      if (!mfaConfig) {
        await this.initializeMFA(userId);
      }

      const newMethod: MFAMethod = {
        type: method,
        identifier,
        verified: false,
        createdAt: Date.now()
      };

      let totpSecret: TOTPSecret | undefined;

      if (method === 'totp') {
        totpSecret = await this.generateTOTPSecret(userId);
        newMethod.identifier = totpSecret.secret;
      }

      // Add method to config
      const updatedConfig = mfaConfig || {
        enabled: false,
        methods: [],
        backupCodes: this.generateBackupCodes(),
        lastVerified: 0
      };

      updatedConfig.methods.push(newMethod);
      await this.secureStorage.setObject(`mfa_config_${userId}`, updatedConfig);

      return { 
        success: true, 
        secret: totpSecret 
      };
    } catch (error) {
      console.error('MFA enable failed:', error);
      return { success: false, error: 'Failed to enable MFA' };
    }
  }

  // Generate TOTP secret and QR code
  private async generateTOTPSecret(userId: string): Promise<TOTPSecret> {
    const secret = this.cryptoService.generateSecureRandom(16);
    const appName = 'ConnectApp';
    const qrCodeData = `otpauth://totp/${appName}:${userId}?secret=${secret}&issuer=${appName}`;
    
    return {
      secret,
      qrCode: qrCodeData,
      backupCodes: this.generateBackupCodes()
    };
  }

  // Generate backup codes
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  // Start MFA challenge
  async startMFAChallenge(userId: string, method?: 'sms' | 'email' | 'totp'): Promise<{ success: boolean; challengeId?: string; error?: string }> {
    try {
      const mfaConfig = await this.getMFAConfig(userId);
      
      if (!mfaConfig || !mfaConfig.enabled) {
        return { success: false, error: 'MFA not enabled' };
      }

      // Find available method
      let selectedMethod = mfaConfig.methods.find(m => m.verified && (!method || m.type === method));
      
      if (!selectedMethod) {
        selectedMethod = mfaConfig.methods.find(m => m.verified);
      }

      if (!selectedMethod) {
        return { success: false, error: 'No verified MFA method available' };
      }

      const challengeId = this.cryptoService.generateSecureRandom(16);
      const challenge: MFAChallenge = {
        challengeId,
        method: selectedMethod.type,
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
        attempts: 0,
        maxAttempts: 3
      };

      this.activeChallenges.set(challengeId, challenge);

      // Send challenge based on method
      if (selectedMethod.type === 'sms') {
        await this.sendSMSChallenge(selectedMethod.identifier, challengeId);
      } else if (selectedMethod.type === 'email') {
        await this.sendEmailChallenge(selectedMethod.identifier, challengeId);
      }
      // TOTP doesn't need to send anything

      return { success: true, challengeId };
    } catch (error) {
      console.error('MFA challenge start failed:', error);
      return { success: false, error: 'Failed to start MFA challenge' };
    }
  }

  // Send SMS challenge
  private async sendSMSChallenge(phoneNumber: string, challengeId: string): Promise<void> {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code temporarily
    await this.secureStorage.setItem(`mfa_code_${challengeId}`, code);
    
    // In a real implementation, send SMS via API
    console.log(`SMS MFA code for ${phoneNumber}: ${code}`);
  }

  // Send email challenge
  private async sendEmailChallenge(email: string, challengeId: string): Promise<void> {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code temporarily
    await this.secureStorage.setItem(`mfa_code_${challengeId}`, code);
    
    // In a real implementation, send email via API
    console.log(`Email MFA code for ${email}: ${code}`);
  }

  // Verify MFA challenge
  async verifyMFAChallenge(challengeId: string, code: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const challenge = this.activeChallenges.get(challengeId);
      
      if (!challenge) {
        return { success: false, error: 'Invalid challenge ID' };
      }

      if (Date.now() > challenge.expiresAt) {
        this.activeChallenges.delete(challengeId);
        return { success: false, error: 'Challenge expired' };
      }

      if (challenge.attempts >= challenge.maxAttempts) {
        this.activeChallenges.delete(challengeId);
        return { success: false, error: 'Too many attempts' };
      }

      challenge.attempts++;

      let isValid = false;

      if (challenge.method === 'totp') {
        isValid = await this.verifyTOTPCode(userId, code);
      } else if (challenge.method === 'backup_code') {
        isValid = await this.verifyBackupCode(userId, code);
      } else {
        // SMS or Email
        const storedCode = await this.secureStorage.getItem(`mfa_code_${challengeId}`);
        isValid = storedCode === code;
      }

      if (isValid) {
        // Update last verified time
        const mfaConfig = await this.getMFAConfig(userId);
        if (mfaConfig) {
          mfaConfig.lastVerified = Date.now();
          await this.secureStorage.setObject(`mfa_config_${userId}`, mfaConfig);
        }

        // Clean up
        this.activeChallenges.delete(challengeId);
        await this.secureStorage.removeItem(`mfa_code_${challengeId}`);

        return { success: true };
      } else {
        return { success: false, error: 'Invalid code' };
      }
    } catch (error) {
      console.error('MFA verification failed:', error);
      return { success: false, error: 'Verification failed' };
    }
  }

  // Verify TOTP code
  private async verifyTOTPCode(userId: string, code: string): Promise<boolean> {
    try {
      const mfaConfig = await this.getMFAConfig(userId);
      const totpMethod = mfaConfig?.methods.find(m => m.type === 'totp' && m.verified);
      
      if (!totpMethod) {
        return false;
      }

      // Simple TOTP verification (in real implementation, use proper TOTP library)
      const timeStep = Math.floor(Date.now() / 30000);
      const expectedCode = this.generateTOTPCode(totpMethod.identifier, timeStep);
      
      return code === expectedCode;
    } catch (error) {
      console.error('TOTP verification failed:', error);
      return false;
    }
  }

  // Generate TOTP code (simplified implementation)
  private generateTOTPCode(secret: string, timeStep: number): string {
    // This is a simplified implementation
    // In production, use a proper TOTP library
    const hash = this.cryptoService.hash(`${secret}${timeStep}`);
    const code = parseInt(hash.substring(0, 6), 16) % 1000000;
    return code.toString().padStart(6, '0');
  }

  // Verify backup code
  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const mfaConfig = await this.getMFAConfig(userId);
      
      if (!mfaConfig) {
        return false;
      }

      const codeIndex = mfaConfig.backupCodes.indexOf(code.toUpperCase());
      
      if (codeIndex !== -1) {
        // Remove used backup code
        mfaConfig.backupCodes.splice(codeIndex, 1);
        await this.secureStorage.setObject(`mfa_config_${userId}`, mfaConfig);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Backup code verification failed:', error);
      return false;
    }
  }

  // Get MFA configuration
  private async getMFAConfig(userId: string): Promise<MFAConfig | null> {
    return await this.secureStorage.getObject<MFAConfig>(`mfa_config_${userId}`);
  }

  // Check if MFA is required
  async isMFARequired(userId: string): Promise<boolean> {
    const mfaConfig = await this.getMFAConfig(userId);
    return mfaConfig?.enabled || false;
  }

  // Get MFA status
  async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    methods: string[];
    lastVerified: number;
    backupCodesRemaining: number;
  }> {
    const mfaConfig = await this.getMFAConfig(userId);
    
    if (!mfaConfig) {
      return {
        enabled: false,
        methods: [],
        lastVerified: 0,
        backupCodesRemaining: 0
      };
    }

    return {
      enabled: mfaConfig.enabled,
      methods: mfaConfig.methods.filter(m => m.verified).map(m => m.type),
      lastVerified: mfaConfig.lastVerified,
      backupCodesRemaining: mfaConfig.backupCodes.length
    };
  }

  // Disable MFA
  async disableMFA(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.secureStorage.removeItem(`mfa_config_${userId}`);
      return { success: true };
    } catch (error) {
      console.error('MFA disable failed:', error);
      return { success: false, error: 'Failed to disable MFA' };
    }
  }
}

export default MFAService;