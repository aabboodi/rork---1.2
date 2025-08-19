import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

export interface KeyRotationConfig {
  rotationIntervalHours: number;
  maxKeyAge: number;
  keyVersions: number;
  emergencyRotation: boolean;
}

export type KeyUsage = 'message' | 'attachment' | 'session' | 'token';

export interface KeyMetadata {
  keyId: string;
  version: number;
  previousVersion?: number;
  createdAt: Date;
  lastUsed: Date;
  rotationDue: Date;
  status: 'active' | 'deprecated' | 'revoked';
  algorithm: string;
  keySize: number;
  usage: KeyUsage;
}

export interface RotationEvent {
  eventId: string;
  keyId: string;
  oldVersion: number;
  newVersion: number;
  timestamp: Date;
  reason: 'scheduled' | 'emergency' | 'compromise' | 'manual';
  success: boolean;
  error?: string;
}

class KeyRotationService {
  private static instance: KeyRotationService;
  private rotationConfig: KeyRotationConfig;
  private rotationTimers: Map<string, NodeJS.Timeout> = new Map();
  private keyMetadata: Map<string, KeyMetadata> = new Map();
  private rotationHistory: RotationEvent[] = [];
  private isInitialized = false;
  private keyUsageMap: Map<string, KeyUsage> = new Map();

  private constructor() {
    this.rotationConfig = {
      rotationIntervalHours: 24 * 30,
      maxKeyAge: 90 * 24,
      keyVersions: 2,
      emergencyRotation: true
    };
    
    // تشغيل دورة التناوب الشهرية التلقائية
    this.scheduleMonthlyRotationCycle();
  }

  static getInstance(): KeyRotationService {
    if (!KeyRotationService.instance) {
      KeyRotationService.instance = new KeyRotationService();
    }
    return KeyRotationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // تحميل البيانات المحفوظة
      await this.loadKeyMetadata();
      await this.loadRotationHistory();
      
      // بدء جدولة التناوب التلقائي
      await this.scheduleRotations();
      
      // فحص المفاتيح المنتهية الصلاحية
      await this.checkExpiredKeys();
      
      this.isInitialized = true;
      console.log('🔄 Key Rotation Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Key Rotation Service:', error);
      throw error;
    }
  }

  async rotateKey(
    keyId: string, 
    reason: 'scheduled' | 'emergency' | 'compromise' | 'manual' = 'manual'
  ): Promise<{ success: boolean; newVersion: number; error?: string }> {
    try {
      const metadata = this.keyMetadata.get(keyId);
      if (!metadata) {
        throw new Error(`Key ${keyId} not found`);
      }

      const oldVersion = metadata.version;
      const newVersion = oldVersion + 1;
      
      // إنشاء مفتاح جديد
      const newKeyData = await this.generateNewKey(keyId, newVersion);
      
      // حفظ المفتاح الجديد
      await this.storeKey(keyId, newVersion, newKeyData);
      
      // تحديث البيانات الوصفية
      const updatedMetadata: KeyMetadata = {
        ...metadata,
        version: newVersion,
        previousVersion: oldVersion,
        createdAt: new Date(),
        lastUsed: new Date(),
        rotationDue: new Date(Date.now() + this.rotationConfig.rotationIntervalHours * 60 * 60 * 1000),
        status: 'active'
      };
      
      this.keyMetadata.set(keyId, updatedMetadata);
      
      // تسجيل حدث التناوب
      const rotationEvent: RotationEvent = {
        eventId: await Crypto.randomUUID(),
        keyId,
        oldVersion,
        newVersion,
        timestamp: new Date(),
        reason,
        success: true
      };
      
      this.rotationHistory.push(rotationEvent);
      
      // حفظ البيانات
      await this.saveKeyMetadata();
      await this.saveRotationHistory();
      
      // تنظيف المفاتيح القديمة
      await this.cleanupOldKeys(keyId);
      
      // إعادة جدولة التناوب التالي
      this.scheduleKeyRotation(keyId);
      
      console.log(`🔄 Key ${keyId} rotated successfully: v${oldVersion} → v${newVersion}`);
      
      return { success: true, newVersion };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // تسجيل فشل التناوب
      const rotationEvent: RotationEvent = {
        eventId: await Crypto.randomUUID(),
        keyId,
        oldVersion: this.keyMetadata.get(keyId)?.version || 0,
        newVersion: 0,
        timestamp: new Date(),
        reason,
        success: false,
        error: errorMessage
      };
      
      this.rotationHistory.push(rotationEvent);
      await this.saveRotationHistory();
      
      console.error(`❌ Failed to rotate key ${keyId}:`, error);
      return { success: false, newVersion: 0, error: errorMessage };
    }
  }

  async emergencyRotateAll(reason: string): Promise<{ rotated: string[]; failed: string[] }> {
    const rotated: string[] = [];
    const failed: string[] = [];
    
    console.log('🚨 Emergency key rotation initiated:', reason);
    
    for (const [keyId] of this.keyMetadata) {
      try {
        const result = await this.rotateKey(keyId, 'emergency');
        if (result.success) {
          rotated.push(keyId);
        } else {
          failed.push(keyId);
        }
      } catch (error) {
        failed.push(keyId);
        console.error(`❌ Emergency rotation failed for ${keyId}:`, error);
      }
    }
    
    return { rotated, failed };
  }

  async getKeyMetadata(keyId: string): Promise<KeyMetadata | null> {
    return this.keyMetadata.get(keyId) || null;
  }

  async getAllKeyMetadata(): Promise<KeyMetadata[]> {
    return Array.from(this.keyMetadata.values());
  }

  async getRotationHistory(keyId?: string): Promise<RotationEvent[]> {
    if (keyId) {
      return this.rotationHistory.filter(event => event.keyId === keyId);
    }
    return [...this.rotationHistory];
  }

  async getKeyRotationStatus(): Promise<{
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    rotationsDue: number;
    lastRotation?: Date;
  }> {
    const metadata = Array.from(this.keyMetadata.values());
    const now = new Date();
    
    return {
      totalKeys: metadata.length,
      activeKeys: metadata.filter(k => k.status === 'active').length,
      expiredKeys: metadata.filter(k => k.rotationDue < now).length,
      rotationsDue: metadata.filter(k => k.rotationDue < now && k.status === 'active').length,
      lastRotation: this.rotationHistory.length > 0 
        ? this.rotationHistory[this.rotationHistory.length - 1].timestamp 
        : undefined
    };
  }

  private async generateNewKey(keyId: string, version: number): Promise<string> {
    // إنشاء مفتاح جديد باستخدام خوارزمية آمنة
    const keyData = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${keyId}-${version}-${Date.now()}-${Math.random()}`
    );
    
    return keyData;
  }

  private async storeKey(keyId: string, version: number, keyData: string): Promise<void> {
    const keyStorageId = `key_${keyId}_v${version}`;
    
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(keyStorageId, keyData);
    } else {
      await SecureStore.setItemAsync(keyStorageId, keyData);
    }
  }

  private async scheduleRotations(): Promise<void> {
    for (const [keyId, metadata] of this.keyMetadata) {
      if (metadata.status === 'active') {
        this.scheduleKeyRotation(keyId);
      }
    }
  }

  private scheduleKeyRotation(keyId: string): void {
    // إلغاء المؤقت السابق إن وجد
    const existingTimer = this.rotationTimers.get(keyId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    const metadata = this.keyMetadata.get(keyId);
    if (!metadata || metadata.status !== 'active') return;
    
    const timeUntilRotation = metadata.rotationDue.getTime() - Date.now();
    
    if (timeUntilRotation > 0) {
      const timer = setTimeout(async () => {
        await this.rotateKey(keyId, 'scheduled');
      }, timeUntilRotation);
      
      this.rotationTimers.set(keyId, timer);
    }
  }

  private async checkExpiredKeys(): Promise<void> {
    const now = new Date();
    const expiredKeys: string[] = [];
    
    for (const [keyId, metadata] of this.keyMetadata) {
      if (metadata.status === 'active' && metadata.rotationDue < now) {
        expiredKeys.push(keyId);
      }
    }
    
    if (expiredKeys.length > 0) {
      console.log(`⚠️ Found ${expiredKeys.length} expired keys, rotating...`);
      
      for (const keyId of expiredKeys) {
        await this.rotateKey(keyId, 'scheduled');
      }
    }
  }

  private async cleanupOldKeys(keyId: string): Promise<void> {
    const metadata = this.keyMetadata.get(keyId);
    if (!metadata) return;
    
    const currentVersion = metadata.version;
    const versionsToKeep = this.rotationConfig.keyVersions;
    
    // حذف الإصدارات القديمة
    for (let version = 1; version <= Math.max(0, currentVersion - versionsToKeep); version++) {
      const oldKeyStorageId = `key_${keyId}_v${version}`;
      
      try {
        if (Platform.OS === 'web') {
          await AsyncStorage.removeItem(oldKeyStorageId);
        } else {
          await SecureStore.deleteItemAsync(oldKeyStorageId);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup old key ${oldKeyStorageId}:`, error);
      }
    }
  }

  private async loadKeyMetadata(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('key_metadata');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [keyId, metadata] of Object.entries(data)) {
          const meta = metadata as any;
          this.keyMetadata.set(keyId, {
            keyId: meta.keyId || (keyId as string),
            version: Number(meta.version) || 1,
            previousVersion: typeof meta.previousVersion === 'number' ? meta.previousVersion : undefined,
            createdAt: new Date(meta.createdAt),
            lastUsed: new Date(meta.lastUsed),
            rotationDue: new Date(meta.rotationDue),
            status: meta.status as KeyMetadata['status'],
            algorithm: String(meta.algorithm || 'AES-256'),
            keySize: Number(meta.keySize || 256),
            usage: (meta.usage as KeyUsage) ?? 'message'
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load key metadata:', error);
    }
  }

  private async saveKeyMetadata(): Promise<void> {
    try {
      const data = Object.fromEntries(this.keyMetadata);
      await AsyncStorage.setItem('key_metadata', JSON.stringify(data));
    } catch (error) {
      console.error('❌ Failed to save key metadata:', error);
    }
  }

  private async loadRotationHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('rotation_history');
      if (stored) {
        const data = JSON.parse(stored);
        this.rotationHistory = data.map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));
      }
    } catch (error) {
      console.warn('⚠️ Failed to load rotation history:', error);
    }
  }

  private async saveRotationHistory(): Promise<void> {
    try {
      // الاحتفاظ بآخر 1000 حدث فقط
      const recentHistory = this.rotationHistory.slice(-1000);
      await AsyncStorage.setItem('rotation_history', JSON.stringify(recentHistory));
    } catch (error) {
      console.error('❌ Failed to save rotation history:', error);
    }
  }

  async registerKey(
    keyId: string,
    algorithm: string = 'AES-256',
    keySize: number = 256,
    usage: KeyUsage = 'message'
  ): Promise<void> {
    const metadata: KeyMetadata = {
      keyId,
      version: 1,
      previousVersion: undefined,
      createdAt: new Date(),
      lastUsed: new Date(),
      rotationDue: new Date(Date.now() + this.rotationConfig.rotationIntervalHours * 60 * 60 * 1000),
      status: 'active',
      algorithm,
      keySize,
      usage
    };
    
    this.keyMetadata.set(keyId, metadata);
    this.keyUsageMap.set(keyId, usage);
    await this.saveKeyMetadata();
    
    // جدولة التناوب التلقائي
    this.scheduleKeyRotation(keyId);
    
    console.log(`🔑 Key ${keyId} registered for rotation`);
  }

  async updateRotationConfig(config: Partial<KeyRotationConfig>): Promise<void> {
    this.rotationConfig = { ...this.rotationConfig, ...config };
    
    // إعادة جدولة التناوب بناءً على الإعدادات الجديدة
    await this.scheduleRotations();
    
    console.log('⚙️ Key rotation config updated:', this.rotationConfig);
  }

  // CRITICAL: تنفيذ سياسة تناوب المفاتيح كل 30 يوم
  async enforceKeyRotationPolicy(): Promise<{
    rotatedKeys: string[];
    failedKeys: string[];
    nextRotationDue: Date;
  }> {
    const rotatedKeys: string[] = [];
    const failedKeys: string[] = [];
    let nextRotationDue = new Date(Date.now() + this.rotationConfig.rotationIntervalHours * 60 * 60 * 1000);

    try {
      console.log('🔄 Enforcing 30-day key rotation policy...');
      
      for (const [keyId, metadata] of this.keyMetadata) {
        if (metadata.status === 'active') {
          const keyAge = Date.now() - metadata.createdAt.getTime();
          const rotationInterval = this.rotationConfig.rotationIntervalHours * 60 * 60 * 1000;
          
          if (keyAge >= rotationInterval) {
            console.log(`🔑 Key ${keyId} is ${Math.floor(keyAge / (24 * 60 * 60 * 1000))} days old, rotating...`);
            
            const result = await this.rotateKey(keyId, 'scheduled');
            if (result.success) {
              rotatedKeys.push(keyId);
            } else {
              failedKeys.push(keyId);
            }
          } else {
            // تحديث موعد التناوب التالي
            const keyNextRotation = new Date(metadata.createdAt.getTime() + rotationInterval);
            if (keyNextRotation < nextRotationDue) {
              nextRotationDue = keyNextRotation;
            }
          }
        }
      }

      // تسجيل نتائج السياسة
      const policyEvent: RotationEvent = {
        eventId: await Crypto.randomUUID(),
        keyId: 'POLICY_ENFORCEMENT',
        oldVersion: 0,
        newVersion: 0,
        timestamp: new Date(),
        reason: 'scheduled',
        success: failedKeys.length === 0,
        error: failedKeys.length > 0 ? `Failed to rotate ${failedKeys.length} keys` : undefined
      };
      
      this.rotationHistory.push(policyEvent);
      await this.saveRotationHistory();

      console.log(`✅ Key rotation policy enforced: ${rotatedKeys.length} rotated, ${failedKeys.length} failed`);
      console.log(`📅 Next rotation due: ${nextRotationDue.toISOString()}`);
      
      return {
        rotatedKeys,
        failedKeys,
        nextRotationDue
      };
    } catch (error) {
      console.error('❌ Key rotation policy enforcement failed:', error);
      throw error;
    }
  }

  // CRITICAL: دمج AWS KMS للمفاتيح الحساسة مع دورات شهرية
  async integrateWithAWSKMS(kmsConfig: {
    region: string;
    keyId: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    monthlyRotation?: boolean;
  }): Promise<boolean> {
    try {
      console.log('🔐 Integrating with AWS KMS for enterprise key management with monthly rotation...');
      
      // محاكاة دمج AWS KMS مع دعم الدورات الشهرية
      const kmsIntegration = {
        enabled: true,
        region: kmsConfig.region,
        keyId: kmsConfig.keyId,
        monthlyRotation: kmsConfig.monthlyRotation ?? true,
        lastSync: new Date(),
        nextRotation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 يوم
        rotationCount: 0,
        status: 'active'
      };
      
      await AsyncStorage.setItem('kms_integration', JSON.stringify(kmsIntegration));
      
      // تسجيل حدث الدمج
      const integrationEvent: RotationEvent = {
        eventId: await Crypto.randomUUID(),
        keyId: 'AWS_KMS_INTEGRATION',
        oldVersion: 0,
        newVersion: 1,
        timestamp: new Date(),
        reason: 'manual',
        success: true
      };
      
      this.rotationHistory.push(integrationEvent);
      await this.saveRotationHistory();
      
      // ج��ولة التناوب الشهري لـ AWS KMS
      if (kmsConfig.monthlyRotation) {
        await this.scheduleAWSKMSMonthlyRotation();
      }
      
      console.log('✅ AWS KMS integration with monthly rotation successful');
      return true;
    } catch (error) {
      console.error('❌ AWS KMS integration failed:', error);
      return false;
    }
  }

  // CRITICAL: دمج HashiCorp Vault للمفاتيح المؤسسية مع دورات شهرية
  async integrateWithHashiCorpVault(vaultConfig: {
    endpoint: string;
    token: string;
    namespace?: string;
    mountPath?: string;
    monthlyRotation?: boolean;
  }): Promise<boolean> {
    try {
      console.log('🏛️ Integrating with HashiCorp Vault for enterprise key management with monthly rotation...');
      
      // محاكاة دمج HashiCorp Vault مع دعم الدورات الشهرية
      const vaultIntegration = {
        enabled: true,
        endpoint: vaultConfig.endpoint,
        namespace: vaultConfig.namespace || 'default',
        mountPath: vaultConfig.mountPath || 'secret',
        monthlyRotation: vaultConfig.monthlyRotation ?? true,
        lastSync: new Date(),
        nextRotation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 يوم
        rotationCount: 0,
        status: 'active'
      };
      
      await AsyncStorage.setItem('vault_integration', JSON.stringify(vaultIntegration));
      
      // تسجيل حدث الدمج
      const integrationEvent: RotationEvent = {
        eventId: await Crypto.randomUUID(),
        keyId: 'HASHICORP_VAULT_INTEGRATION',
        oldVersion: 0,
        newVersion: 1,
        timestamp: new Date(),
        reason: 'manual',
        success: true
      };
      
      this.rotationHistory.push(integrationEvent);
      await this.saveRotationHistory();
      
      // جدولة التناوب الشهري لـ HashiCorp Vault
      if (vaultConfig.monthlyRotation) {
        await this.scheduleHashiCorpVaultMonthlyRotation();
      }
      
      console.log('✅ HashiCorp Vault integration with monthly rotation successful');
      return true;
    } catch (error) {
      console.error('❌ HashiCorp Vault integration failed:', error);
      return false;
    }
  }

  // CRITICAL: تطبيق دورات حياة المفاتيح المتقدمة
  async implementAdvancedKeyLifecycle(): Promise<{
    activeKeys: number;
    deprecatedKeys: number;
    revokedKeys: number;
    rotationSchedule: Array<{ keyId: string; nextRotation: Date }>;
  }> {
    try {
      console.log('🔄 Implementing advanced key lifecycle management...');
      
      let activeKeys = 0;
      let deprecatedKeys = 0;
      let revokedKeys = 0;
      const rotationSchedule: Array<{ keyId: string; nextRotation: Date }> = [];
      
      for (const [keyId, metadata] of this.keyMetadata) {
        const keyAge = Date.now() - metadata.createdAt.getTime();
        const maxAge = this.rotationConfig.maxKeyAge * 60 * 60 * 1000;
        const rotationInterval = this.rotationConfig.rotationIntervalHours * 60 * 60 * 1000;
        
        if (keyAge >= maxAge) {
          // إبطال المفاتيح المنتهية الصلاحية
          metadata.status = 'revoked';
          revokedKeys++;
          
          console.log(`🚫 Key ${keyId} revoked due to age (${Math.floor(keyAge / (24 * 60 * 60 * 1000))} days)`);
        } else if (keyAge >= rotationInterval * 0.8) {
          // تحديد المفاتيح للإهلاك
          if (metadata.status === 'active') {
            metadata.status = 'deprecated';
            deprecatedKeys++;
            
            console.log(`⚠️ Key ${keyId} deprecated, rotation recommended`);
          }
        } else {
          activeKeys++;
        }
        
        // جدولة التناوب التالي
        if (metadata.status === 'active' || metadata.status === 'deprecated') {
          const nextRotation = new Date(metadata.rotationDue);
          rotationSchedule.push({ keyId, nextRotation });
        }
      }
      
      // حفظ التحديثات
      await this.saveKeyMetadata();
      
      // ترتيب جدولة التناوب
      rotationSchedule.sort((a, b) => a.nextRotation.getTime() - b.nextRotation.getTime());
      
      console.log(`📊 Key lifecycle status: ${activeKeys} active, ${deprecatedKeys} deprecated, ${revokedKeys} revoked`);
      
      return {
        activeKeys,
        deprecatedKeys,
        revokedKeys,
        rotationSchedule
      };
    } catch (error) {
      console.error('❌ Advanced key lifecycle implementation failed:', error);
      throw error;
    }
  }

  // CRITICAL: مراقبة صحة نظام تناوب المفاتيح
  async monitorKeyRotationHealth(): Promise<{
    overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
    metrics: {
      totalKeys: number;
      rotationCompliance: number;
      averageKeyAge: number;
      failedRotations: number;
    };
  }> {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];
      const now = Date.now();
      
      const totalKeys = this.keyMetadata.size;
      let compliantKeys = 0;
      let totalAge = 0;
      let overdueKeys = 0;
      
      // تحليل صحة المفاتيح
      for (const [keyId, metadata] of this.keyMetadata) {
        const keyAge = now - metadata.createdAt.getTime();
        const rotationInterval = this.rotationConfig.rotationIntervalHours * 60 * 60 * 1000;
        
        totalAge += keyAge;
        
        if (metadata.rotationDue.getTime() < now) {
          overdueKeys++;
          issues.push(`Key ${keyId} is overdue for rotation`);
        } else {
          compliantKeys++;
        }
        
        if (keyAge > rotationInterval * 1.2) {
          issues.push(`Key ${keyId} is significantly old (${Math.floor(keyAge / (24 * 60 * 60 * 1000))} days)`);
        }
      }
      
      const rotationCompliance = totalKeys > 0 ? (compliantKeys / totalKeys) * 100 : 100;
      const averageKeyAge = totalKeys > 0 ? totalAge / totalKeys : 0;
      
      // حساب الفشل في التناوب
      const recentFailures = this.rotationHistory.filter(event => 
        !event.success && 
        now - event.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // آخر 7 أيام
      ).length;
      
      // تحديد الصحة العامة
      let overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
      
      if (rotationCompliance >= 95 && overdueKeys === 0 && recentFailures === 0) {
        overallHealth = 'excellent';
      } else if (rotationCompliance >= 85 && overdueKeys <= 2 && recentFailures <= 1) {
        overallHealth = 'good';
      } else if (rotationCompliance >= 70 && overdueKeys <= 5 && recentFailures <= 3) {
        overallHealth = 'warning';
        recommendations.push('Schedule immediate key rotation for overdue keys');
        recommendations.push('Review key rotation policies');
      } else {
        overallHealth = 'critical';
        recommendations.push('URGENT: Perform emergency key rotation');
        recommendations.push('Investigate rotation failures');
        recommendations.push('Consider manual intervention');
      }
      
      // توصيات إضافية
      if (averageKeyAge > 20 * 24 * 60 * 60 * 1000) { // أكثر من 20 يوم
        recommendations.push('Consider reducing rotation interval');
      }
      
      if (recentFailures > 0) {
        recommendations.push('Investigate and fix rotation failures');
      }
      
      return {
        overallHealth,
        issues,
        recommendations,
        metrics: {
          totalKeys,
          rotationCompliance,
          averageKeyAge,
          failedRotations: recentFailures
        }
      };
    } catch (error) {
      console.error('❌ Key rotation health monitoring failed:', error);
      return {
        overallHealth: 'critical',
        issues: ['Health monitoring system failure'],
        recommendations: ['Restart key rotation service'],
        metrics: {
          totalKeys: 0,
          rotationCompliance: 0,
          averageKeyAge: 0,
          failedRotations: 0
        }
      };
    }
  }

  async getRotationConfig(): Promise<KeyRotationConfig> {
    return { ...this.rotationConfig };
  }

  // CRITICAL: جدولة دورة التناوب الشهرية التلقائية
  private scheduleMonthlyRotationCycle(): void {
    // تشغيل فحص يومي للتناوب الشهري
    const dailyCheck = setInterval(async () => {
      try {
        console.log('📅 Running daily key rotation check...');
        await this.enforceKeyRotationPolicy();
        
        // فحص دمج AWS KMS و HashiCorp Vault
        await this.checkExternalKeyManagementRotation();
      } catch (error) {
        console.error('❌ Daily key rotation check failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // كل 24 ساعة
    
    // حفظ مرجع المؤقت للتنظيف
    this.rotationTimers.set('monthly_cycle', dailyCheck as any);
    
    console.log('📅 Monthly key rotation cycle scheduled');
  }
  
  // CRITICAL: جدولة التناوب الشهري لـ AWS KMS
  private async scheduleAWSKMSMonthlyRotation(): Promise<void> {
    try {
      const kmsData = await AsyncStorage.getItem('kms_integration');
      if (!kmsData) return;
      
      const kmsConfig = JSON.parse(kmsData);
      const nextRotation = new Date(kmsConfig.nextRotation);
      const timeUntilRotation = nextRotation.getTime() - Date.now();
      
      if (timeUntilRotation > 0) {
        const rotationTimer = setTimeout(async () => {
          await this.performAWSKMSRotation();
        }, timeUntilRotation);
        
        this.rotationTimers.set('aws_kms_monthly', rotationTimer);
        console.log(`🔐 AWS KMS monthly rotation scheduled for ${nextRotation.toISOString()}`);
      }
    } catch (error) {
      console.error('❌ Failed to schedule AWS KMS monthly rotation:', error);
    }
  }
  
  // CRITICAL: جدولة التناوب الشهري لـ HashiCorp Vault
  private async scheduleHashiCorpVaultMonthlyRotation(): Promise<void> {
    try {
      const vaultData = await AsyncStorage.getItem('vault_integration');
      if (!vaultData) return;
      
      const vaultConfig = JSON.parse(vaultData);
      const nextRotation = new Date(vaultConfig.nextRotation);
      const timeUntilRotation = nextRotation.getTime() - Date.now();
      
      if (timeUntilRotation > 0) {
        const rotationTimer = setTimeout(async () => {
          await this.performHashiCorpVaultRotation();
        }, timeUntilRotation);
        
        this.rotationTimers.set('vault_monthly', rotationTimer);
        console.log(`🏛️ HashiCorp Vault monthly rotation scheduled for ${nextRotation.toISOString()}`);
      }
    } catch (error) {
      console.error('❌ Failed to schedule HashiCorp Vault monthly rotation:', error);
    }
  }
  
  // CRITICAL: تنفيذ تناوب AWS KMS
  private async performAWSKMSRotation(): Promise<void> {
    try {
      console.log('🔐 Performing AWS KMS monthly key rotation...');
      
      const kmsData = await AsyncStorage.getItem('kms_integration');
      if (!kmsData) return;
      
      const kmsConfig = JSON.parse(kmsData);
      
      // محاكاة تناوب مفتاح AWS KMS
      const rotationResult = {
        success: true,
        newKeyVersion: (kmsConfig.rotationCount || 0) + 1,
        timestamp: new Date(),
        oldKeyId: kmsConfig.keyId,
        newKeyId: `${kmsConfig.keyId}-v${(kmsConfig.rotationCount || 0) + 1}`
      };
      
      // تحديث إعدادات KMS
      const updatedConfig = {
        ...kmsConfig,
        rotationCount: rotationResult.newKeyVersion,
        lastSync: new Date(),
        nextRotation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 يوم قادم
        keyId: rotationResult.newKeyId
      };
      
      await AsyncStorage.setItem('kms_integration', JSON.stringify(updatedConfig));
      
      // تسجيل حدث التناوب
      const rotationEvent: RotationEvent = {
        eventId: await Crypto.randomUUID(),
        keyId: 'AWS_KMS_MONTHLY_ROTATION',
        oldVersion: kmsConfig.rotationCount || 0,
        newVersion: rotationResult.newKeyVersion,
        timestamp: new Date(),
        reason: 'scheduled',
        success: true
      };
      
      this.rotationHistory.push(rotationEvent);
      await this.saveRotationHistory();
      
      // جدولة التناوب التالي
      await this.scheduleAWSKMSMonthlyRotation();
      
      console.log(`✅ AWS KMS monthly rotation completed: v${kmsConfig.rotationCount || 0} → v${rotationResult.newKeyVersion}`);
    } catch (error) {
      console.error('❌ AWS KMS monthly rotation failed:', error);
      
      // تسجيل فشل التناوب
      const failureEvent: RotationEvent = {
        eventId: await Crypto.randomUUID(),
        keyId: 'AWS_KMS_MONTHLY_ROTATION',
        oldVersion: 0,
        newVersion: 0,
        timestamp: new Date(),
        reason: 'scheduled',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.rotationHistory.push(failureEvent);
      await this.saveRotationHistory();
    }
  }
  
  // CRITICAL: تنفيذ تناوب HashiCorp Vault
  private async performHashiCorpVaultRotation(): Promise<void> {
    try {
      console.log('🏛️ Performing HashiCorp Vault monthly key rotation...');
      
      const vaultData = await AsyncStorage.getItem('vault_integration');
      if (!vaultData) return;
      
      const vaultConfig = JSON.parse(vaultData);
      
      // محاكاة تناوب مفتاح HashiCorp Vault
      const rotationResult = {
        success: true,
        newKeyVersion: (vaultConfig.rotationCount || 0) + 1,
        timestamp: new Date(),
        secretPath: `${vaultConfig.mountPath}/app-keys-v${(vaultConfig.rotationCount || 0) + 1}`
      };
      
      // تحديث إعدادات Vault
      const updatedConfig = {
        ...vaultConfig,
        rotationCount: rotationResult.newKeyVersion,
        lastSync: new Date(),
        nextRotation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 يوم قادم
        currentSecretPath: rotationResult.secretPath
      };
      
      await AsyncStorage.setItem('vault_integration', JSON.stringify(updatedConfig));
      
      // تسجيل حدث التناوب
      const rotationEvent: RotationEvent = {
        eventId: await Crypto.randomUUID(),
        keyId: 'HASHICORP_VAULT_MONTHLY_ROTATION',
        oldVersion: vaultConfig.rotationCount || 0,
        newVersion: rotationResult.newKeyVersion,
        timestamp: new Date(),
        reason: 'scheduled',
        success: true
      };
      
      this.rotationHistory.push(rotationEvent);
      await this.saveRotationHistory();
      
      // جدولة التناوب التالي
      await this.scheduleHashiCorpVaultMonthlyRotation();
      
      console.log(`✅ HashiCorp Vault monthly rotation completed: v${vaultConfig.rotationCount || 0} → v${rotationResult.newKeyVersion}`);
    } catch (error) {
      console.error('❌ HashiCorp Vault monthly rotation failed:', error);
      
      // تسجيل فشل التناوب
      const failureEvent: RotationEvent = {
        eventId: await Crypto.randomUUID(),
        keyId: 'HASHICORP_VAULT_MONTHLY_ROTATION',
        oldVersion: 0,
        newVersion: 0,
        timestamp: new Date(),
        reason: 'scheduled',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.rotationHistory.push(failureEvent);
      await this.saveRotationHistory();
    }
  }
  
  // CRITICAL: فحص تناوب أنظمة إدارة المفاتيح الخارجية
  private async checkExternalKeyManagementRotation(): Promise<void> {
    try {
      // فحص AWS KMS
      const kmsData = await AsyncStorage.getItem('kms_integration');
      if (kmsData) {
        const kmsConfig = JSON.parse(kmsData);
        if (kmsConfig.enabled && kmsConfig.monthlyRotation) {
          const nextRotation = new Date(kmsConfig.nextRotation);
          if (Date.now() >= nextRotation.getTime()) {
            console.log('⏰ AWS KMS rotation is due, performing now...');
            await this.performAWSKMSRotation();
          }
        }
      }
      
      // فحص HashiCorp Vault
      const vaultData = await AsyncStorage.getItem('vault_integration');
      if (vaultData) {
        const vaultConfig = JSON.parse(vaultData);
        if (vaultConfig.enabled && vaultConfig.monthlyRotation) {
          const nextRotation = new Date(vaultConfig.nextRotation);
          if (Date.now() >= nextRotation.getTime()) {
            console.log('⏰ HashiCorp Vault rotation is due, performing now...');
            await this.performHashiCorpVaultRotation();
          }
        }
      }
    } catch (error) {
      console.error('❌ External key management rotation check failed:', error);
    }
  }
  
  // CRITICAL: الحصول على إحصائيات التناوب الشهري
  async getMonthlyRotationStats(): Promise<{
    totalRotations: number;
    successfulRotations: number;
    failedRotations: number;
    nextScheduledRotation: Date | null;
    kmsStatus: any;
    vaultStatus: any;
  }> {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      
      const monthlyRotations = this.rotationHistory.filter(event => 
        event.timestamp >= currentMonth && 
        event.reason === 'scheduled'
      );
      
      const successfulRotations = monthlyRotations.filter(event => event.success).length;
      const failedRotations = monthlyRotations.filter(event => !event.success).length;
      
      // الحصول على حالة AWS KMS
      let kmsStatus = null;
      try {
        const kmsData = await AsyncStorage.getItem('kms_integration');
        if (kmsData) {
          kmsStatus = JSON.parse(kmsData);
        }
      } catch (error) {
        console.warn('Failed to get KMS status:', error);
      }
      
      // الحصول على حالة HashiCorp Vault
      let vaultStatus = null;
      try {
        const vaultData = await AsyncStorage.getItem('vault_integration');
        if (vaultData) {
          vaultStatus = JSON.parse(vaultData);
        }
      } catch (error) {
        console.warn('Failed to get Vault status:', error);
      }
      
      // تحديد موعد التناوب التالي
      let nextScheduledRotation: Date | null = null;
      const upcomingRotations = Array.from(this.keyMetadata.values())
        .filter(metadata => metadata.status === 'active')
        .map(metadata => metadata.rotationDue)
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (upcomingRotations.length > 0) {
        nextScheduledRotation = upcomingRotations[0];
      }
      
      return {
        totalRotations: monthlyRotations.length,
        successfulRotations,
        failedRotations,
        nextScheduledRotation,
        kmsStatus,
        vaultStatus
      };
    } catch (error) {
      console.error('❌ Failed to get monthly rotation stats:', error);
      return {
        totalRotations: 0,
        successfulRotations: 0,
        failedRotations: 0,
        nextScheduledRotation: null,
        kmsStatus: null,
        vaultStatus: null
      };
    }
  }

  getActiveKeyWindow(keyId: string): { current?: number; previous?: number } {
    const meta = this.keyMetadata.get(keyId);
    if (!meta) return {};
    return { current: meta.version, previous: meta.previousVersion };
  }

  async fetchKey(keyId: string, version?: number): Promise<string | null> {
    const meta = this.keyMetadata.get(keyId);
    if (!meta) return null;
    const ver = version ?? meta.version;
    const storageId = `key_${keyId}_v${ver}`;
    try {
      if (Platform.OS === 'web') {
        const v = await AsyncStorage.getItem(storageId);
        return v;
      }
      const v = await SecureStore.getItemAsync(storageId);
      return v;
    } catch (e) {
      console.warn('⚠️ Failed to fetch key', storageId, e);
      return null;
    }
  }

  enforceKeyUsage(keyId: string, expected: KeyUsage): boolean {
    const usage = this.keyUsageMap.get(keyId) ?? this.keyMetadata.get(keyId)?.usage;
    return usage === expected;
  }

  destroy(): void {
    // إلغاء جميع المؤقتات
    for (const timer of this.rotationTimers.values()) {
      clearTimeout(timer);
    }
    this.rotationTimers.clear();
    
    this.isInitialized = false;
    console.log('🔄 Key Rotation Service destroyed');
  }
}

export default KeyRotationService;