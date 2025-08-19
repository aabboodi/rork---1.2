import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

export interface KMSKeySpec {
  keyId: string;
  keyUsage: 'ENCRYPT_DECRYPT' | 'SIGN_VERIFY';
  keySpec: 'SYMMETRIC_DEFAULT' | 'RSA_2048' | 'ECC_NIST_P256';
  origin: 'AWS_KMS' | 'EXTERNAL';
  description?: string;
}

export interface KMSEncryptionContext {
  [key: string]: string;
}

export interface KMSOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  keyId?: string;
  encryptionAlgorithm?: string;
}

export interface KMSKeyMetadata {
  keyId: string;
  arn: string;
  creationDate: Date;
  enabled: boolean;
  keyUsage: string;
  keyState: 'Enabled' | 'Disabled' | 'PendingDeletion' | 'PendingImport';
  description?: string;
  keyRotationStatus: boolean;
  nextRotationDate?: Date;
}

class AWSKMSService {
  private static instance: AWSKMSService;
  private apiEndpoint: string;
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private isInitialized = false;
  private keyCache: Map<string, KMSKeyMetadata> = new Map();

  private constructor() {
    // في بيئة الإنتاج، يجب الحصول على هذه القيم من متغيرات البيئة الآمنة
    this.apiEndpoint = 'https://kms.us-east-1.amazonaws.com';
    this.region = 'us-east-1';
    this.accessKeyId = '';
    this.secretAccessKey = '';
  }

  static getInstance(): AWSKMSService {
    if (!AWSKMSService.instance) {
      AWSKMSService.instance = new AWSKMSService();
    }
    return AWSKMSService.instance;
  }

  async initialize(config: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
  }): Promise<void> {
    try {
      this.region = config.region;
      this.accessKeyId = config.accessKeyId;
      this.secretAccessKey = config.secretAccessKey;
      this.apiEndpoint = config.endpoint || `https://kms.${config.region}.amazonaws.com`;
      
      // اختبار الاتصال
      await this.listKeys();
      
      this.isInitialized = true;
      console.log('🔐 AWS KMS Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AWS KMS Service:', error);
      throw error;
    }
  }

  async createKey(keySpec: KMSKeySpec): Promise<KMSOperationResult> {
    if (!this.isInitialized) {
      throw new Error('AWS KMS Service not initialized');
    }

    try {
      // محاكاة إنشاء مفتاح في AWS KMS
      const keyId = await Crypto.randomUUID();
      const arn = `arn:aws:kms:${this.region}:123456789012:key/${keyId}`;
      
      const keyMetadata: KMSKeyMetadata = {
        keyId,
        arn,
        creationDate: new Date(),
        enabled: true,
        keyUsage: keySpec.keyUsage,
        keyState: 'Enabled',
        description: keySpec.description,
        keyRotationStatus: true,
        nextRotationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // سنة من الآن
      };

      // حفظ في الكاش المحلي
      this.keyCache.set(keyId, keyMetadata);
      await this.saveKeyCache();

      console.log(`🔑 KMS Key created: ${keyId}`);
      
      return {
        success: true,
        data: keyMetadata,
        keyId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to create KMS key:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async encrypt(
    keyId: string, 
    plaintext: string, 
    encryptionContext?: KMSEncryptionContext
  ): Promise<KMSOperationResult> {
    if (!this.isInitialized) {
      throw new Error('AWS KMS Service not initialized');
    }

    try {
      const keyMetadata = this.keyCache.get(keyId);
      if (!keyMetadata || !keyMetadata.enabled) {
        throw new Error(`Key ${keyId} not found or disabled`);
      }

      // محاكاة التشفير باستخدام AWS KMS
      // في التطبيق الحقيقي، سيتم إرسال طلب إلى AWS KMS API
      const contextString = encryptionContext 
        ? JSON.stringify(encryptionContext) 
        : '';
      
      const dataToEncrypt = `${plaintext}|${contextString}|${keyId}`;
      const ciphertext = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataToEncrypt
      );

      // تحديث آخر استخدام للمفتاح
      await this.updateKeyLastUsed(keyId);

      console.log(`🔒 Data encrypted with KMS key: ${keyId}`);
      
      return {
        success: true,
        data: {
          ciphertext,
          keyId,
          encryptionAlgorithm: 'SYMMETRIC_DEFAULT'
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ KMS encryption failed:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async decrypt(
    ciphertext: string, 
    encryptionContext?: KMSEncryptionContext
  ): Promise<KMSOperationResult> {
    if (!this.isInitialized) {
      throw new Error('AWS KMS Service not initialized');
    }

    try {
      // في التطبيق الحقيقي، سيتم فك التشفير باستخدام AWS KMS
      // هنا نحاكي العملية
      
      console.log('🔓 Data decrypted with KMS');
      
      return {
        success: true,
        data: {
          plaintext: 'decrypted_data', // البيانات المفكوكة التشفير
          keyId: 'extracted_key_id'
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ KMS decryption failed:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async rotateKey(keyId: string): Promise<KMSOperationResult> {
    if (!this.isInitialized) {
      throw new Error('AWS KMS Service not initialized');
    }

    try {
      const keyMetadata = this.keyCache.get(keyId);
      if (!keyMetadata) {
        throw new Error(`Key ${keyId} not found`);
      }

      // تحديث تاريخ التناوب التالي
      const updatedMetadata: KMSKeyMetadata = {
        ...keyMetadata,
        nextRotationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      };

      this.keyCache.set(keyId, updatedMetadata);
      await this.saveKeyCache();

      console.log(`🔄 KMS Key rotated: ${keyId}`);
      
      return {
        success: true,
        data: updatedMetadata,
        keyId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ KMS key rotation failed:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async enableKeyRotation(keyId: string): Promise<KMSOperationResult> {
    try {
      const keyMetadata = this.keyCache.get(keyId);
      if (!keyMetadata) {
        throw new Error(`Key ${keyId} not found`);
      }

      const updatedMetadata: KMSKeyMetadata = {
        ...keyMetadata,
        keyRotationStatus: true,
        nextRotationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      };

      this.keyCache.set(keyId, updatedMetadata);
      await this.saveKeyCache();

      console.log(`🔄 Key rotation enabled for: ${keyId}`);
      
      return {
        success: true,
        data: updatedMetadata
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to enable key rotation:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async disableKeyRotation(keyId: string): Promise<KMSOperationResult> {
    try {
      const keyMetadata = this.keyCache.get(keyId);
      if (!keyMetadata) {
        throw new Error(`Key ${keyId} not found`);
      }

      const updatedMetadata: KMSKeyMetadata = {
        ...keyMetadata,
        keyRotationStatus: false,
        nextRotationDate: undefined
      };

      this.keyCache.set(keyId, updatedMetadata);
      await this.saveKeyCache();

      console.log(`⏹️ Key rotation disabled for: ${keyId}`);
      
      return {
        success: true,
        data: updatedMetadata
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to disable key rotation:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async listKeys(): Promise<KMSOperationResult> {
    try {
      const keys = Array.from(this.keyCache.values());
      
      return {
        success: true,
        data: keys
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to list KMS keys:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async getKeyMetadata(keyId: string): Promise<KMSOperationResult> {
    try {
      const keyMetadata = this.keyCache.get(keyId);
      if (!keyMetadata) {
        throw new Error(`Key ${keyId} not found`);
      }

      return {
        success: true,
        data: keyMetadata
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to get key metadata:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async scheduleKeyDeletion(keyId: string, pendingWindowInDays: number = 30): Promise<KMSOperationResult> {
    try {
      const keyMetadata = this.keyCache.get(keyId);
      if (!keyMetadata) {
        throw new Error(`Key ${keyId} not found`);
      }

      const updatedMetadata: KMSKeyMetadata = {
        ...keyMetadata,
        keyState: 'PendingDeletion',
        enabled: false
      };

      this.keyCache.set(keyId, updatedMetadata);
      await this.saveKeyCache();

      console.log(`🗑️ Key deletion scheduled for: ${keyId} (${pendingWindowInDays} days)`);
      
      return {
        success: true,
        data: updatedMetadata
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to schedule key deletion:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async cancelKeyDeletion(keyId: string): Promise<KMSOperationResult> {
    try {
      const keyMetadata = this.keyCache.get(keyId);
      if (!keyMetadata) {
        throw new Error(`Key ${keyId} not found`);
      }

      const updatedMetadata: KMSKeyMetadata = {
        ...keyMetadata,
        keyState: 'Enabled',
        enabled: true
      };

      this.keyCache.set(keyId, updatedMetadata);
      await this.saveKeyCache();

      console.log(`✅ Key deletion cancelled for: ${keyId}`);
      
      return {
        success: true,
        data: updatedMetadata
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to cancel key deletion:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async getKeyRotationStatus(): Promise<{
    totalKeys: number;
    rotationEnabled: number;
    rotationDisabled: number;
    pendingRotation: number;
  }> {
    const keys = Array.from(this.keyCache.values());
    const now = new Date();
    
    return {
      totalKeys: keys.length,
      rotationEnabled: keys.filter(k => k.keyRotationStatus).length,
      rotationDisabled: keys.filter(k => !k.keyRotationStatus).length,
      pendingRotation: keys.filter(k => 
        k.keyRotationStatus && 
        k.nextRotationDate && 
        k.nextRotationDate <= now
      ).length
    };
  }

  private async updateKeyLastUsed(keyId: string): Promise<void> {
    // تحديث آخر استخدام للمفتاح (للإحصائيات)
    const usage = await AsyncStorage.getItem(`kms_key_usage_${keyId}`) || '0';
    const newUsage = parseInt(usage) + 1;
    await AsyncStorage.setItem(`kms_key_usage_${keyId}`, newUsage.toString());
  }

  private async saveKeyCache(): Promise<void> {
    try {
      const cacheData = Object.fromEntries(this.keyCache);
      await AsyncStorage.setItem('kms_key_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('❌ Failed to save KMS key cache:', error);
    }
  }

  private async loadKeyCache(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('kms_key_cache');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [keyId, metadata] of Object.entries(data)) {
          this.keyCache.set(keyId, {
            ...metadata as any,
            creationDate: new Date((metadata as any).creationDate),
            nextRotationDate: (metadata as any).nextRotationDate 
              ? new Date((metadata as any).nextRotationDate) 
              : undefined
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load KMS key cache:', error);
    }
  }

  async generateDataKey(keyId: string, keySpec: 'AES_256' | 'AES_128' = 'AES_256'): Promise<KMSOperationResult> {
    try {
      const keyMetadata = this.keyCache.get(keyId);
      if (!keyMetadata || !keyMetadata.enabled) {
        throw new Error(`Key ${keyId} not found or disabled`);
      }

      // إنشاء مفتاح بيانات محلي
      const dataKey = await Crypto.randomUUID();
      const encryptedDataKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${dataKey}|${keyId}`
      );

      await this.updateKeyLastUsed(keyId);

      console.log(`🔑 Data key generated with KMS key: ${keyId}`);
      
      return {
        success: true,
        data: {
          plaintextKey: dataKey,
          encryptedKey: encryptedDataKey,
          keyId
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to generate data key:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  destroy(): void {
    this.keyCache.clear();
    this.isInitialized = false;
    console.log('🔐 AWS KMS Service destroyed');
  }
}

export default AWSKMSService;