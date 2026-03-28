import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import KeyRotationService from './KeyRotationService';
import AWSKMSService from './AWSKMSService';
import HashiCorpVaultService from './HashiCorpVaultService';

export interface EnterpriseKeyMetadata {
  id: string;
  algorithm: string;
  keySize: number;
  createdAt: Date;
  lastUsed: Date;
  purpose: 'encryption' | 'signing' | 'authentication';
  status: 'active' | 'deprecated' | 'revoked';
  provider: 'local' | 'aws-kms' | 'vault' | 'hardware';
  externalKeyId?: string;
  rotationEnabled: boolean;
  lastRotation?: Date;
  nextRotation?: Date;
  complianceLevel: 'standard' | 'high' | 'critical';
  auditTrail: KeyAuditEvent[];
}

export interface KeyLifecyclePolicy {
  maxAge: number; // بالساعات
  rotationInterval: number; // بالساعات
  deprecationPeriod: number; // بالساعات
  autoCleanup: boolean;
  requiresApproval: boolean;
  complianceRequirements: string[];
  backupRequired: boolean;
  geographicRestrictions?: string[];
}

export interface KeyUsageStats {
  keyId: string;
  encryptionCount: number;
  decryptionCount: number;
  signingCount: number;
  verificationCount: number;
  lastUsed: Date;
  averageUsagePerDay: number;
  peakUsageHour: number;
  errorCount: number;
  successRate: number;
}

export interface KeyAuditEvent {
  eventId: string;
  keyId: string;
  operation: 'create' | 'use' | 'rotate' | 'revoke' | 'backup' | 'restore';
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface KeyBackupConfig {
  enabled: boolean;
  provider: 'aws-s3' | 'azure-blob' | 'gcp-storage' | 'vault';
  encryptionKey: string;
  retentionDays: number;
  geographicLocation: string;
  compressionEnabled: boolean;
}

export interface ComplianceReport {
  reportId: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  totalKeys: number;
  activeKeys: number;
  rotatedKeys: number;
  expiredKeys: number;
  complianceViolations: ComplianceViolation[];
  recommendations: string[];
  riskScore: number;
}

export interface ComplianceViolation {
  violationId: string;
  keyId: string;
  violationType: 'expired' | 'weak_algorithm' | 'missing_rotation' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

class EnterpriseKeyManager {
  private static instance: EnterpriseKeyManager;
  private keys: Map<string, EnterpriseKeyMetadata> = new Map();
  private keyPolicies: Map<string, KeyLifecyclePolicy> = new Map();
  private usageStats: Map<string, KeyUsageStats> = new Map();
  private auditEvents: KeyAuditEvent[] = [];
  private complianceViolations: ComplianceViolation[] = [];
  private isInitialized = false;
  
  // External Services
  private rotationService: KeyRotationService;
  private kmsService: AWSKMSService;
  private vaultService: HashiCorpVaultService;
  
  // Configuration
  private backupConfig: KeyBackupConfig;
  private complianceConfig: {
    enabledStandards: string[];
    auditRetentionDays: number;
    alertThresholds: Record<string, number>;
  };

  private constructor() {
    this.rotationService = KeyRotationService.getInstance();
    this.kmsService = AWSKMSService.getInstance();
    this.vaultService = HashiCorpVaultService.getInstance();
    
    this.backupConfig = {
      enabled: true,
      provider: 'vault',
      encryptionKey: '',
      retentionDays: 2555, // 7 سنوات للامتثال
      geographicLocation: 'us-east-1',
      compressionEnabled: true
    };
    
    this.complianceConfig = {
      enabledStandards: ['FIPS-140-2', 'Common Criteria', 'SOC2', 'ISO27001'],
      auditRetentionDays: 2555, // 7 سنوات
      alertThresholds: {
        keyAge: 365, // أيام
        rotationOverdue: 7, // أيام
        failureRate: 0.05 // 5%
      }
    };
  }

  static getInstance(): EnterpriseKeyManager {
    if (!EnterpriseKeyManager.instance) {
      EnterpriseKeyManager.instance = new EnterpriseKeyManager();
    }
    return EnterpriseKeyManager.instance;
  }

  async initialize(config?: {
    aws?: { region: string; accessKeyId: string; secretAccessKey: string };
    vault?: { endpoint: string; token: string; namespace?: string };
    compliance?: { standards: string[]; auditRetention: number };
  }): Promise<void> {
    if (this.isInitialized) return;

    try {
      // تهيئة الخدمات الخارجية
      if (config?.aws) {
        await this.kmsService.initialize({
          ...config.aws,
          endpoint: `https://kms.${config.aws.region}.amazonaws.com`
        });
      }

      if (config?.vault) {
        await this.vaultService.initialize({
          ...config.vault,
          apiVersion: 'v1'
        });
      }

      // تهيئة خدمة التناوب
      await this.rotationService.initialize();

      // تحميل البيانات المحفوظة
      await this.loadAllData();

      // بدء المراقبة والامتثال
      this.startComplianceMonitoring();
      this.startAuditEventCleanup();
      this.startBackupSchedule();

      // تحديث إعدادات الامتثال
      if (config?.compliance) {
        this.complianceConfig.enabledStandards = config.compliance.standards;
        this.complianceConfig.auditRetentionDays = config.compliance.auditRetention;
      }

      this.isInitialized = true;
      await this.logAuditEvent('system', 'initialize', true, { 
        standards: this.complianceConfig.enabledStandards 
      });
      
      console.log('🏢 Enterprise Key Manager initialized with compliance standards:', 
        this.complianceConfig.enabledStandards);
    } catch (error) {
      await this.logAuditEvent('system', 'initialize', false, { error: error.message });
      console.error('❌ Failed to initialize Enterprise Key Manager:', error);
      throw error;
    }
  }

  async generateKey(
    id: string,
    options: {
      algorithm?: string;
      keySize?: number;
      purpose?: 'encryption' | 'signing' | 'authentication';
      provider?: 'local' | 'aws-kms' | 'vault' | 'hardware';
      complianceLevel?: 'standard' | 'high' | 'critical';
      rotationEnabled?: boolean;
      policy?: Partial<KeyLifecyclePolicy>;
      userId?: string;
    } = {}
  ): Promise<string> {
    try {
      const {
        algorithm = 'AES-256',
        keySize = 256,
        purpose = 'encryption',
        provider = 'vault', // افتراضياً Vault للمؤسسات
        complianceLevel = 'high',
        rotationEnabled = true,
        policy,
        userId
      } = options;

      // التحقق من متطلبات الامتثال
      await this.validateComplianceRequirements(algorithm, keySize, complianceLevel);

      let keyData: string;
      let externalKeyId: string | undefined;

      // إنشاء المفتاح حسب المزود
      switch (provider) {
        case 'aws-kms':
          const kmsResult = await this.kmsService.createKey({
            keyId: id,
            keyUsage: purpose === 'signing' ? 'SIGN_VERIFY' : 'ENCRYPT_DECRYPT',
            keySpec: 'SYMMETRIC_DEFAULT',
            origin: 'AWS_KMS',
            description: `Enterprise key for ${purpose} - Compliance: ${complianceLevel}`
          });
          if (!kmsResult.success) {
            throw new Error(kmsResult.error);
          }
          keyData = kmsResult.keyId!;
          externalKeyId = kmsResult.keyId;
          break;

        case 'vault':
          const vaultResult = await this.vaultService.createTransitKey(id, {
            type: 'aes256-gcm96',
            exportable: false,
            allow_plaintext_backup: complianceLevel !== 'critical'
          });
          if (!vaultResult.success) {
            throw new Error(vaultResult.error);
          }
          keyData = id;
          externalKeyId = id;
          break;

        case 'hardware':
          // استخدام HSM أو Secure Enclave
          keyData = await this.generateHardwareKey(id, algorithm, keySize);
          break;

        default: // local
          keyData = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            `${id}-${Date.now()}-${Math.random()}`
          );
          break;
      }

      // إنشاء البيانات الوصفية المتقدمة
      const now = new Date();
      const rotationInterval = policy?.rotationInterval || this.getDefaultRotationInterval(complianceLevel);
      
      const metadata: EnterpriseKeyMetadata = {
        id,
        algorithm,
        keySize,
        createdAt: now,
        lastUsed: now,
        purpose,
        status: 'active',
        provider,
        externalKeyId,
        rotationEnabled,
        lastRotation: now,
        nextRotation: rotationEnabled 
          ? new Date(now.getTime() + rotationInterval * 60 * 60 * 1000)
          : undefined,
        complianceLevel,
        auditTrail: []
      };

      this.keys.set(id, metadata);

      // تعيين سياسة دورة الحياة
      if (policy || complianceLevel !== 'standard') {
        const lifecyclePolicy: KeyLifecyclePolicy = {
          maxAge: policy?.maxAge || this.getDefaultMaxAge(complianceLevel),
          rotationInterval: rotationInterval,
          deprecationPeriod: policy?.deprecationPeriod || 24 * 7, // أسبوع
          autoCleanup: policy?.autoCleanup ?? true,
          requiresApproval: policy?.requiresApproval ?? (complianceLevel === 'critical'),
          complianceRequirements: this.getComplianceRequirements(complianceLevel),
          backupRequired: complianceLevel !== 'standard',
          geographicRestrictions: policy?.geographicRestrictions
        };
        this.keyPolicies.set(id, lifecyclePolicy);
      }

      // تهيئة إحصائيات الاستخدام
      const usageStats: KeyUsageStats = {
        keyId: id,
        encryptionCount: 0,
        decryptionCount: 0,
        signingCount: 0,
        verificationCount: 0,
        lastUsed: now,
        averageUsagePerDay: 0,
        peakUsageHour: 0,
        errorCount: 0,
        successRate: 1.0
      };
      this.usageStats.set(id, usageStats);

      // حفظ البيانات
      await this.saveAllData();

      // تخزين المفتاح المحلي إذا لزم الأمر
      if (provider === 'local' || provider === 'hardware') {
        await this.storeKey(id, keyData);
      }

      // تسجيل المفتاح في خدمة التناوب
      if (rotationEnabled) {
        await this.rotationService.registerKey(id, algorithm, keySize);
      }

      // إنشاء نسخة احتياطية إذا كانت مطلوبة
      if (this.backupConfig.enabled && lifecyclePolicy?.backupRequired) {
        await this.createKeyBackup(id, keyData);
      }

      // تسجيل حدث المراجعة
      await this.logAuditEvent(id, 'create', true, {
        algorithm,
        keySize,
        purpose,
        provider,
        complianceLevel,
        userId
      });

      console.log(`🔑 Enterprise key generated: ${id} (${provider}, ${complianceLevel})`);
      return keyData;
    } catch (error) {
      await this.logAuditEvent(id, 'create', false, { 
        error: error.message,
        userId: options.userId 
      });
      console.error(`❌ Failed to generate enterprise key ${id}:`, error);
      throw error;
    }
  }

  async rotateKey(
    id: string, 
    reason: 'scheduled' | 'emergency' | 'compliance' | 'manual' = 'manual',
    userId?: string
  ): Promise<string> {
    try {
      const metadata = this.keys.get(id);
      if (!metadata) {
        throw new Error(`Key ${id} not found`);
      }

      // التحقق من متطلبات الامتثال للتناوب
      if (metadata.complianceLevel === 'critical' && reason === 'manual') {
        const policy = this.keyPolicies.get(id);
        if (policy?.requiresApproval) {
          throw new Error('Manual rotation of critical keys requires approval');
        }
      }

      let newKeyData: string;

      switch (metadata.provider) {
        case 'aws-kms':
          const kmsResult = await this.kmsService.rotateKey(id);
          if (!kmsResult.success) {
            throw new Error(kmsResult.error);
          }
          newKeyData = kmsResult.keyId!;
          break;

        case 'vault':
          const vaultResult = await this.vaultService.rotateTransitKey(id);
          if (!vaultResult.success) {
            throw new Error(vaultResult.error);
          }
          newKeyData = id;
          break;

        case 'hardware':
          newKeyData = await this.rotateHardwareKey(id);
          break;

        default: // local
          newKeyData = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            `${id}-rotated-${Date.now()}-${Math.random()}`
          );
          await this.storeKey(id, newKeyData);
          break;
      }

      // تحديث البيانات الوصفية
      const now = new Date();
      const policy = this.keyPolicies.get(id);
      const rotationInterval = policy?.rotationInterval || this.getDefaultRotationInterval(metadata.complianceLevel);
      
      metadata.lastRotation = now;
      metadata.nextRotation = metadata.rotationEnabled 
        ? new Date(now.getTime() + rotationInterval * 60 * 60 * 1000)
        : undefined;
      
      this.keys.set(id, metadata);

      // إنشاء نسخة احتياطية للمفتاح الجديد
      if (this.backupConfig.enabled && policy?.backupRequired) {
        await this.createKeyBackup(id, newKeyData);
      }

      // تحديث إحصائيات الاستخدام
      await this.updateUsageStats(id, 'rotation');

      // حفظ البيانات
      await this.saveAllData();

      // تسجيل في خدمة التناوب
      await this.rotationService.rotateKey(id, reason);

      // تسجيل حدث المراجعة
      await this.logAuditEvent(id, 'rotate', true, {
        reason,
        provider: metadata.provider,
        complianceLevel: metadata.complianceLevel,
        userId
      });

      console.log(`🔄 Enterprise key rotated: ${id} (${reason})`);
      return newKeyData;
    } catch (error) {
      await this.logAuditEvent(id, 'rotate', false, { 
        error: error.message,
        reason,
        userId 
      });
      console.error(`❌ Failed to rotate enterprise key ${id}:`, error);
      throw error;
    }
  }

  async generateComplianceReport(
    period: { start: Date; end: Date },
    standards?: string[]
  ): Promise<ComplianceReport> {
    try {
      const reportId = await Crypto.randomUUID();
      const enabledStandards = standards || this.complianceConfig.enabledStandards;
      
      // جمع البيانات للتقرير
      const keys = Array.from(this.keys.values());
      const auditEvents = this.auditEvents.filter(event => 
        event.timestamp >= period.start && event.timestamp <= period.end
      );
      
      const totalKeys = keys.length;
      const activeKeys = keys.filter(k => k.status === 'active').length;
      const rotatedKeys = auditEvents.filter(e => e.operation === 'rotate' && e.success).length;
      const expiredKeys = this.getExpiredKeys().length;
      
      // تحليل انتهاكات الامتثال
      const violations = await this.analyzeComplianceViolations(keys, enabledStandards);
      
      // إنشاء التوصيات
      const recommendations = this.generateRecommendations(keys, violations);
      
      // حساب نقاط المخاطر
      const riskScore = this.calculateRiskScore(violations, keys);
      
      const report: ComplianceReport = {
        reportId,
        generatedAt: new Date(),
        period,
        totalKeys,
        activeKeys,
        rotatedKeys,
        expiredKeys,
        complianceViolations: violations,
        recommendations,
        riskScore
      };

      // حفظ التقرير
      await AsyncStorage.setItem(
        `compliance_report_${reportId}`,
        JSON.stringify(report)
      );

      // تسجيل حدث المراجعة
      await this.logAuditEvent('system', 'compliance_report', true, {
        reportId,
        standards: enabledStandards,
        riskScore
      });

      console.log(`📊 Compliance report generated: ${reportId} (Risk Score: ${riskScore})`);
      return report;
    } catch (error) {
      await this.logAuditEvent('system', 'compliance_report', false, { 
        error: error.message 
      });
      console.error('❌ Failed to generate compliance report:', error);
      throw error;
    }
  }

  async getKeyLifecycleStatus(): Promise<{
    totalKeys: number;
    activeKeys: number;
    deprecatedKeys: number;
    revokedKeys: number;
    rotationsDue: number;
    expiredKeys: number;
    complianceViolations: number;
    riskScore: number;
  }> {
    const keys = Array.from(this.keys.values());
    const now = new Date();
    
    const violations = this.complianceViolations.filter(v => !v.resolved);
    const riskScore = this.calculateRiskScore(violations, keys);
    
    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.status === 'active').length,
      deprecatedKeys: keys.filter(k => k.status === 'deprecated').length,
      revokedKeys: keys.filter(k => k.status === 'revoked').length,
      rotationsDue: keys.filter(k => 
        k.status === 'active' && 
        k.rotationEnabled && 
        k.nextRotation && 
        k.nextRotation <= now
      ).length,
      expiredKeys: this.getExpiredKeys().length,
      complianceViolations: violations.length,
      riskScore
    };
  }

  private async validateComplianceRequirements(
    algorithm: string, 
    keySize: number, 
    complianceLevel: string
  ): Promise<void> {
    const requirements = this.getComplianceRequirements(complianceLevel);
    
    // FIPS 140-2 validation
    if (requirements.includes('FIPS-140-2')) {
      const approvedAlgorithms = ['AES-256', 'RSA-2048', 'RSA-4096', 'ECDSA-P256', 'ECDSA-P384'];
      if (!approvedAlgorithms.includes(algorithm)) {
        throw new Error(`Algorithm ${algorithm} not FIPS 140-2 approved`);
      }
      
      if (algorithm.includes('AES') && keySize < 256) {
        throw new Error('FIPS 140-2 requires minimum AES-256');
      }
    }
    
    // Common Criteria validation
    if (requirements.includes('Common Criteria')) {
      if (keySize < 256) {
        throw new Error('Common Criteria requires minimum 256-bit keys');
      }
    }
  }

  private getComplianceRequirements(complianceLevel: string): string[] {
    switch (complianceLevel) {
      case 'critical':
        return ['FIPS-140-2', 'Common Criteria', 'SOC2', 'ISO27001'];
      case 'high':
        return ['FIPS-140-2', 'SOC2'];
      default:
        return ['SOC2'];
    }
  }

  private getDefaultRotationInterval(complianceLevel: string): number {
    switch (complianceLevel) {
      case 'critical':
        return 24 * 7; // أسبوع
      case 'high':
        return 24 * 30; // شهر
      default:
        return 24 * 90; // 3 أشهر
    }
  }

  private getDefaultMaxAge(complianceLevel: string): number {
    switch (complianceLevel) {
      case 'critical':
        return 24 * 30; // شهر
      case 'high':
        return 24 * 90; // 3 أشهر
      default:
        return 24 * 365; // سنة
    }
  }

  private async generateHardwareKey(id: string, algorithm: string, keySize: number): Promise<string> {
    // محاكاة إنشاء مفتاح في HSM
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `hardware-${id}-${algorithm}-${keySize}-${Date.now()}`
    );
  }

  private async rotateHardwareKey(id: string): Promise<string> {
    // محاكاة تناوب مفتاح في HSM
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `hardware-rotated-${id}-${Date.now()}`
    );
  }

  private async createKeyBackup(keyId: string, keyData: string): Promise<void> {
    try {
      const backupData = {
        keyId,
        keyData: await this.encryptForBackup(keyData),
        timestamp: new Date(),
        provider: this.backupConfig.provider,
        location: this.backupConfig.geographicLocation
      };

      // حفظ النسخة الاحتياطية
      await AsyncStorage.setItem(
        `key_backup_${keyId}_${Date.now()}`,
        JSON.stringify(backupData)
      );

      console.log(`💾 Key backup created: ${keyId}`);
    } catch (error) {
      console.error(`❌ Failed to create key backup for ${keyId}:`, error);
    }
  }

  private async encryptForBackup(keyData: string): Promise<string> {
    if (this.backupConfig.encryptionKey) {
      // استخدام مفتاح التشفير المخصص للنسخ الاحتياطية
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        keyData + this.backupConfig.encryptionKey
      );
    }
    return keyData;
  }

  private async analyzeComplianceViolations(
    keys: EnterpriseKeyMetadata[], 
    standards: string[]
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const now = new Date();

    for (const key of keys) {
      const policy = this.keyPolicies.get(key.id);
      
      // فحص انتهاء صلاحية المفاتيح
      if (policy) {
        const maxAge = policy.maxAge * 60 * 60 * 1000;
        const keyAge = now.getTime() - key.createdAt.getTime();
        
        if (keyAge > maxAge) {
          violations.push({
            violationId: await Crypto.randomUUID(),
            keyId: key.id,
            violationType: 'expired',
            severity: key.complianceLevel === 'critical' ? 'critical' : 'high',
            description: `Key ${key.id} has exceeded maximum age of ${policy.maxAge} hours`,
            detectedAt: now,
            resolved: false
          });
        }
      }

      // فحص التناوب المتأخر
      if (key.rotationEnabled && key.nextRotation && key.nextRotation < now) {
        violations.push({
          violationId: await Crypto.randomUUID(),
          keyId: key.id,
          violationType: 'missing_rotation',
          severity: key.complianceLevel === 'critical' ? 'critical' : 'medium',
          description: `Key ${key.id} rotation is overdue`,
          detectedAt: now,
          resolved: false
        });
      }

      // فحص الخوارزميات الضعيفة
      if (standards.includes('FIPS-140-2')) {
        const weakAlgorithms = ['DES', 'MD5', 'SHA1', 'RC4'];
        if (weakAlgorithms.some(alg => key.algorithm.includes(alg))) {
          violations.push({
            violationId: await Crypto.randomUUID(),
            keyId: key.id,
            violationType: 'weak_algorithm',
            severity: 'high',
            description: `Key ${key.id} uses non-FIPS approved algorithm: ${key.algorithm}`,
            detectedAt: now,
            resolved: false
          });
        }
      }
    }

    return violations;
  }

  private generateRecommendations(
    keys: EnterpriseKeyMetadata[], 
    violations: ComplianceViolation[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (violations.some(v => v.violationType === 'expired')) {
      recommendations.push('Rotate or revoke expired keys immediately');
    }
    
    if (violations.some(v => v.violationType === 'weak_algorithm')) {
      recommendations.push('Upgrade keys using weak algorithms to FIPS-approved algorithms');
    }
    
    if (violations.some(v => v.violationType === 'missing_rotation')) {
      recommendations.push('Enable automatic key rotation for overdue keys');
    }
    
    const criticalKeys = keys.filter(k => k.complianceLevel === 'critical');
    if (criticalKeys.length > 0) {
      recommendations.push(`Monitor ${criticalKeys.length} critical keys more frequently`);
    }
    
    return recommendations;
  }

  private calculateRiskScore(
    violations: ComplianceViolation[], 
    keys: EnterpriseKeyMetadata[]
  ): number {
    let score = 0;
    
    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          score += 25;
          break;
        case 'high':
          score += 15;
          break;
        case 'medium':
          score += 10;
          break;
        case 'low':
          score += 5;
          break;
      }
    }
    
    // تطبيع النقاط (0-100)
    const maxPossibleScore = keys.length * 25;
    return Math.min(100, Math.round((score / Math.max(maxPossibleScore, 1)) * 100));
  }

  private getExpiredKeys(): EnterpriseKeyMetadata[] {
    const now = new Date();
    return Array.from(this.keys.values()).filter(key => {
      const policy = this.keyPolicies.get(key.id);
      if (!policy) return false;
      
      const maxAge = policy.maxAge * 60 * 60 * 1000;
      const keyAge = now.getTime() - key.createdAt.getTime();
      return keyAge > maxAge;
    });
  }

  private async updateUsageStats(
    keyId: string, 
    operation: 'encryption' | 'decryption' | 'signing' | 'verification' | 'rotation'
  ): Promise<void> {
    const stats = this.usageStats.get(keyId);
    if (!stats) return;

    switch (operation) {
      case 'encryption':
        stats.encryptionCount++;
        break;
      case 'decryption':
        stats.decryptionCount++;
        break;
      case 'signing':
        stats.signingCount++;
        break;
      case 'verification':
        stats.verificationCount++;
        break;
    }

    stats.lastUsed = new Date();
    
    // حساب معدل النجاح
    const totalOps = stats.encryptionCount + stats.decryptionCount + 
                    stats.signingCount + stats.verificationCount;
    stats.successRate = totalOps > 0 ? (totalOps - stats.errorCount) / totalOps : 1.0;

    this.usageStats.set(keyId, stats);
  }

  private async logAuditEvent(
    keyId: string,
    operation: 'create' | 'use' | 'rotate' | 'revoke' | 'backup' | 'restore' | 'initialize' | 'compliance_report',
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: KeyAuditEvent = {
      eventId: await Crypto.randomUUID(),
      keyId,
      operation,
      timestamp: new Date(),
      userId: metadata?.userId,
      ipAddress: '127.0.0.1', // في التطبيق الحقيقي، احصل على IP الفعلي
      userAgent: Platform.OS,
      success,
      error: metadata?.error,
      metadata
    };

    this.auditEvents.push(event);
    
    // الاحتفاظ بآخر 10000 حدث فقط
    if (this.auditEvents.length > 10000) {
      this.auditEvents = this.auditEvents.slice(-10000);
    }
  }

  private startComplianceMonitoring(): void {
    // فحص دوري كل ساعة
    setInterval(async () => {
      await this.performComplianceCheck();
    }, 60 * 60 * 1000);

    // فحص فوري عند البدء
    setTimeout(() => this.performComplianceCheck(), 5000);
  }

  private async performComplianceCheck(): Promise<void> {
    try {
      const keys = Array.from(this.keys.values());
      const violations = await this.analyzeComplianceViolations(keys, this.complianceConfig.enabledStandards);
      
      // تحديث انتهاكات الامتثال
      this.complianceViolations = violations;
      
      // إنشاء تنبيهات للانتهاكات الحرجة
      const criticalViolations = violations.filter(v => v.severity === 'critical');
      if (criticalViolations.length > 0) {
        console.warn(`🚨 ${criticalViolations.length} critical compliance violations detected`);
        
        // في التطبيق الحقيقي، أرسل تنبيهات للمسؤولين
        for (const violation of criticalViolations) {
          await this.logAuditEvent(violation.keyId, 'compliance_violation', false, {
            violationType: violation.violationType,
            severity: violation.severity
          });
        }
      }
      
      console.log(`✅ Compliance check completed: ${violations.length} violations found`);
    } catch (error) {
      console.error('❌ Compliance monitoring error:', error);
    }
  }

  private startAuditEventCleanup(): void {
    // تنظيف أحداث المراجعة القديمة يومياً
    setInterval(async () => {
      await this.cleanupOldAuditEvents();
    }, 24 * 60 * 60 * 1000);
  }

  private async cleanupOldAuditEvents(): Promise<void> {
    try {
      const retentionPeriod = this.complianceConfig.auditRetentionDays * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - retentionPeriod);
      
      const originalCount = this.auditEvents.length;
      this.auditEvents = this.auditEvents.filter(event => event.timestamp >= cutoffDate);
      
      const removedCount = originalCount - this.auditEvents.length;
      if (removedCount > 0) {
        console.log(`🧹 Cleaned up ${removedCount} old audit events`);
      }
    } catch (error) {
      console.error('❌ Audit event cleanup failed:', error);
    }
  }

  private startBackupSchedule(): void {
    if (!this.backupConfig.enabled) return;
    
    // نسخ احتياطية يومية
    setInterval(async () => {
      await this.performScheduledBackup();
    }, 24 * 60 * 60 * 1000);
  }

  private async performScheduledBackup(): Promise<void> {
    try {
      const keysRequiringBackup = Array.from(this.keys.values()).filter(key => {
        const policy = this.keyPolicies.get(key.id);
        return policy?.backupRequired && key.status === 'active';
      });
      
      let backedUpCount = 0;
      for (const key of keysRequiringBackup) {
        try {
          const keyData = await this.getKey(key.id);
          if (keyData) {
            await this.createKeyBackup(key.id, keyData);
            backedUpCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to backup key ${key.id}:`, error);
        }
      }
      
      console.log(`💾 Scheduled backup completed: ${backedUpCount}/${keysRequiringBackup.length} keys backed up`);
    } catch (error) {
      console.error('❌ Scheduled backup failed:', error);
    }
  }

  private async storeKey(id: string, keyData: string): Promise<void> {
    const keyId = `enterprise_key_${id}`;
    
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(keyId, keyData);
    } else {
      await SecureStore.setItemAsync(keyId, keyData);
    }
  }

  private async getKey(id: string): Promise<string | null> {
    const keyId = `enterprise_key_${id}`;
    
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(keyId);
    } else {
      return await SecureStore.getItemAsync(keyId);
    }
  }

  private async loadAllData(): Promise<void> {
    await Promise.all([
      this.loadKeys(),
      this.loadKeyPolicies(),
      this.loadUsageStats(),
      this.loadAuditEvents(),
      this.loadComplianceViolations()
    ]);
  }

  private async saveAllData(): Promise<void> {
    await Promise.all([
      this.saveKeys(),
      this.saveKeyPolicies(),
      this.saveUsageStats(),
      this.saveAuditEvents(),
      this.saveComplianceViolations()
    ]);
  }

  private async loadKeys(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('enterprise_keys');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [id, metadata] of Object.entries(data)) {
          this.keys.set(id, {
            ...metadata as any,
            createdAt: new Date((metadata as any).createdAt),
            lastUsed: new Date((metadata as any).lastUsed),
            lastRotation: (metadata as any).lastRotation 
              ? new Date((metadata as any).lastRotation) 
              : undefined,
            nextRotation: (metadata as any).nextRotation 
              ? new Date((metadata as any).nextRotation) 
              : undefined,
            auditTrail: ((metadata as any).auditTrail || []).map((event: any) => ({
              ...event,
              timestamp: new Date(event.timestamp)
            }))
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load enterprise keys:', error);
    }
  }

  private async saveKeys(): Promise<void> {
    try {
      const data = Object.fromEntries(this.keys);
      await AsyncStorage.setItem('enterprise_keys', JSON.stringify(data));
    } catch (error) {
      console.error('❌ Failed to save enterprise keys:', error);
    }
  }

  private async loadKeyPolicies(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('enterprise_key_policies');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [id, policy] of Object.entries(data)) {
          this.keyPolicies.set(id, policy as KeyLifecyclePolicy);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load key policies:', error);
    }
  }

  private async saveKeyPolicies(): Promise<void> {
    try {
      const data = Object.fromEntries(this.keyPolicies);
      await AsyncStorage.setItem('enterprise_key_policies', JSON.stringify(data));
    } catch (error) {
      console.error('❌ Failed to save key policies:', error);
    }
  }

  private async loadUsageStats(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('enterprise_usage_stats');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [id, stats] of Object.entries(data)) {
          this.usageStats.set(id, {
            ...stats as any,
            lastUsed: new Date((stats as any).lastUsed)
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load usage stats:', error);
    }
  }

  private async saveUsageStats(): Promise<void> {
    try {
      const data = Object.fromEntries(this.usageStats);
      await AsyncStorage.setItem('enterprise_usage_stats', JSON.stringify(data));
    } catch (error) {
      console.error('❌ Failed to save usage stats:', error);
    }
  }

  private async loadAuditEvents(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('enterprise_audit_events');
      if (stored) {
        const data = JSON.parse(stored);
        this.auditEvents = data.map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));
      }
    } catch (error) {
      console.warn('⚠️ Failed to load audit events:', error);
    }
  }

  private async saveAuditEvents(): Promise<void> {
    try {
      await AsyncStorage.setItem('enterprise_audit_events', JSON.stringify(this.auditEvents));
    } catch (error) {
      console.error('❌ Failed to save audit events:', error);
    }
  }

  private async loadComplianceViolations(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('enterprise_compliance_violations');
      if (stored) {
        const data = JSON.parse(stored);
        this.complianceViolations = data.map((violation: any) => ({
          ...violation,
          detectedAt: new Date(violation.detectedAt),
          resolvedAt: violation.resolvedAt ? new Date(violation.resolvedAt) : undefined
        }));
      }
    } catch (error) {
      console.warn('⚠️ Failed to load compliance violations:', error);
    }
  }

  private async saveComplianceViolations(): Promise<void> {
    try {
      await AsyncStorage.setItem('enterprise_compliance_violations', JSON.stringify(this.complianceViolations));
    } catch (error) {
      console.error('❌ Failed to save compliance violations:', error);
    }
  }

  // Public API methods
  async getAuditEvents(keyId?: string, limit: number = 100): Promise<KeyAuditEvent[]> {
    let events = [...this.auditEvents];
    
    if (keyId) {
      events = events.filter(event => event.keyId === keyId);
    }
    
    return events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getComplianceViolations(resolved?: boolean): Promise<ComplianceViolation[]> {
    let violations = [...this.complianceViolations];
    
    if (resolved !== undefined) {
      violations = violations.filter(v => v.resolved === resolved);
    }
    
    return violations.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  async resolveComplianceViolation(violationId: string, userId?: string): Promise<void> {
    const violation = this.complianceViolations.find(v => v.violationId === violationId);
    if (violation) {
      violation.resolved = true;
      violation.resolvedAt = new Date();
      
      await this.saveComplianceViolations();
      await this.logAuditEvent(violation.keyId, 'compliance_resolution', true, {
        violationId,
        violationType: violation.violationType,
        userId
      });
    }
  }

  destroy(): void {
    this.keys.clear();
    this.keyPolicies.clear();
    this.usageStats.clear();
    this.auditEvents.length = 0;
    this.complianceViolations.length = 0;
    
    this.rotationService.destroy();
    this.kmsService.destroy();
    this.vaultService.destroy();
    
    this.isInitialized = false;
    console.log('🏢 Enterprise Key Manager destroyed');
  }
}

export default EnterpriseKeyManager;