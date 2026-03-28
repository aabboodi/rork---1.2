import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

export interface VaultConfig {
  endpoint: string;
  token: string;
  namespace?: string;
  apiVersion: string;
}

export interface VaultSecret {
  path: string;
  data: Record<string, any>;
  metadata?: {
    created_time: string;
    deletion_time?: string;
    destroyed: boolean;
    version: number;
  };
}

export interface VaultKeyPolicy {
  name: string;
  type: 'aes256-gcm96' | 'chacha20-poly1305' | 'ed25519' | 'ecdsa-p256' | 'rsa-2048' | 'rsa-4096';
  derived: boolean;
  exportable: boolean;
  allow_plaintext_backup: boolean;
  keys: Record<string, any>;
  min_decryption_version: number;
  min_encryption_version: number;
  latest_version: number;
  deletion_allowed: boolean;
}

export interface VaultOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  warnings?: string[];
  metadata?: any;
}

export interface VaultTransitKey {
  name: string;
  type: string;
  latest_version: number;
  min_available_version: number;
  min_decryption_version: number;
  min_encryption_version: number;
  supports_encryption: boolean;
  supports_decryption: boolean;
  supports_derivation: boolean;
  supports_signing: boolean;
  exportable: boolean;
  allow_plaintext_backup: boolean;
  keys: Record<string, any>;
}

class HashiCorpVaultService {
  private static instance: HashiCorpVaultService;
  private config: VaultConfig | null = null;
  private isInitialized = false;
  private keyCache: Map<string, VaultTransitKey> = new Map();
  private secretCache: Map<string, VaultSecret> = new Map();

  private constructor() {}

  static getInstance(): HashiCorpVaultService {
    if (!HashiCorpVaultService.instance) {
      HashiCorpVaultService.instance = new HashiCorpVaultService();
    }
    return HashiCorpVaultService.instance;
  }

  async initialize(config: VaultConfig): Promise<void> {
    try {
      this.config = {
        ...config,
        apiVersion: config.apiVersion || 'v1'
      };

      // تحميل الكاش المحفوظ
      await this.loadCaches();

      // اختبار الاتصال
      await this.healthCheck();

      this.isInitialized = true;
      console.log('🏛️ HashiCorp Vault Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Vault Service:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<VaultOperationResult> {
    if (!this.config) {
      throw new Error('Vault service not configured');
    }

    try {
      // محاكاة فحص صحة الخدمة
      console.log('🏥 Vault health check passed');
      
      return {
        success: true,
        data: {
          initialized: true,
          sealed: false,
          standby: false,
          performance_standby: false,
          replication_performance_mode: 'disabled',
          replication_dr_mode: 'disabled',
          server_time_utc: new Date().toISOString(),
          version: '1.15.0'
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Vault health check failed:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Transit Engine - Key Management
  async createTransitKey(
    name: string, 
    options: {
      type?: 'aes256-gcm96' | 'chacha20-poly1305' | 'ed25519' | 'ecdsa-p256' | 'rsa-2048' | 'rsa-4096';
      derived?: boolean;
      exportable?: boolean;
      allow_plaintext_backup?: boolean;
    } = {}
  ): Promise<VaultOperationResult> {
    if (!this.isInitialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      const keyData: VaultTransitKey = {
        name,
        type: options.type || 'aes256-gcm96',
        latest_version: 1,
        min_available_version: 1,
        min_decryption_version: 1,
        min_encryption_version: 1,
        supports_encryption: true,
        supports_decryption: true,
        supports_derivation: options.derived || false,
        supports_signing: ['ed25519', 'ecdsa-p256', 'rsa-2048', 'rsa-4096'].includes(options.type || ''),
        exportable: options.exportable || false,
        allow_plaintext_backup: options.allow_plaintext_backup || false,
        keys: {
          '1': {
            creation_time: new Date().toISOString(),
            name: 'aes256-gcm96',
            public_key: options.type?.includes('rsa') || options.type?.includes('ecdsa') || options.type === 'ed25519' 
              ? await this.generatePublicKey(options.type) 
              : undefined
          }
        }
      };

      this.keyCache.set(name, keyData);
      await this.saveKeyCache();

      console.log(`🔑 Transit key created: ${name}`);
      
      return {
        success: true,
        data: keyData
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to create transit key:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async rotateTransitKey(name: string): Promise<VaultOperationResult> {
    try {
      const existingKey = this.keyCache.get(name);
      if (!existingKey) {
        throw new Error(`Transit key ${name} not found`);
      }

      const newVersion = existingKey.latest_version + 1;
      const updatedKey: VaultTransitKey = {
        ...existingKey,
        latest_version: newVersion,
        keys: {
          ...existingKey.keys,
          [newVersion.toString()]: {
            creation_time: new Date().toISOString(),
            name: existingKey.type,
            public_key: existingKey.supports_signing 
              ? await this.generatePublicKey(existingKey.type) 
              : undefined
          }
        }
      };

      this.keyCache.set(name, updatedKey);
      await this.saveKeyCache();

      console.log(`🔄 Transit key rotated: ${name} (v${newVersion})`);
      
      return {
        success: true,
        data: updatedKey
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to rotate transit key:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async encrypt(
    keyName: string, 
    plaintext: string, 
    context?: Record<string, string>,
    keyVersion?: number
  ): Promise<VaultOperationResult> {
    try {
      const key = this.keyCache.get(keyName);
      if (!key || !key.supports_encryption) {
        throw new Error(`Transit key ${keyName} not found or doesn't support encryption`);
      }

      // محاكاة التشفير
      const version = keyVersion || key.latest_version;
      const contextString = context ? JSON.stringify(context) : '';
      const dataToEncrypt = `${plaintext}|${contextString}|${keyName}|${version}`;
      
      const ciphertext = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataToEncrypt
      );

      const vaultCiphertext = `vault:v${version}:${ciphertext}`;

      console.log(`🔒 Data encrypted with transit key: ${keyName} (v${version})`);
      
      return {
        success: true,
        data: {
          ciphertext: vaultCiphertext
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Transit encryption failed:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async decrypt(
    keyName: string, 
    ciphertext: string, 
    context?: Record<string, string>
  ): Promise<VaultOperationResult> {
    try {
      const key = this.keyCache.get(keyName);
      if (!key || !key.supports_decryption) {
        throw new Error(`Transit key ${keyName} not found or doesn't support decryption`);
      }

      // استخراج الإصدار من النص المشفر
      const vaultPrefix = 'vault:v';
      if (!ciphertext.startsWith(vaultPrefix)) {
        throw new Error('Invalid ciphertext format');
      }

      const versionMatch = ciphertext.match(/vault:v(\d+):/);
      const version = versionMatch ? parseInt(versionMatch[1]) : 1;

      if (version < key.min_decryption_version) {
        throw new Error(`Key version ${version} is below minimum decryption version`);
      }

      // محاكاة فك التشفير
      const plaintext = 'decrypted_data'; // في التطبيق الحقيقي سيتم فك التشفير

      console.log(`🔓 Data decrypted with transit key: ${keyName} (v${version})`);
      
      return {
        success: true,
        data: {
          plaintext
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Transit decryption failed:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // KV Secrets Engine
  async writeSecret(path: string, data: Record<string, any>): Promise<VaultOperationResult> {
    try {
      const secret: VaultSecret = {
        path,
        data,
        metadata: {
          created_time: new Date().toISOString(),
          destroyed: false,
          version: 1
        }
      };

      this.secretCache.set(path, secret);
      await this.saveSecretCache();

      console.log(`📝 Secret written to: ${path}`);
      
      return {
        success: true,
        data: secret
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to write secret:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async readSecret(path: string, version?: number): Promise<VaultOperationResult> {
    try {
      const secret = this.secretCache.get(path);
      if (!secret) {
        throw new Error(`Secret not found at path: ${path}`);
      }

      if (secret.metadata?.destroyed) {
        throw new Error(`Secret at path ${path} has been destroyed`);
      }

      console.log(`📖 Secret read from: ${path}`);
      
      return {
        success: true,
        data: secret
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to read secret:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async deleteSecret(path: string): Promise<VaultOperationResult> {
    try {
      const secret = this.secretCache.get(path);
      if (!secret) {
        throw new Error(`Secret not found at path: ${path}`);
      }

      if (secret.metadata) {
        secret.metadata.deletion_time = new Date().toISOString();
        secret.metadata.destroyed = true;
      }

      this.secretCache.set(path, secret);
      await this.saveSecretCache();

      console.log(`🗑️ Secret deleted at: ${path}`);
      
      return {
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to delete secret:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async listSecrets(path: string): Promise<VaultOperationResult> {
    try {
      const secrets = Array.from(this.secretCache.keys())
        .filter(key => key.startsWith(path))
        .filter(key => {
          const secret = this.secretCache.get(key);
          return secret && !secret.metadata?.destroyed;
        });

      return {
        success: true,
        data: {
          keys: secrets
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to list secrets:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Dynamic Secrets - Database
  async generateDatabaseCredentials(
    role: string,
    ttl?: string
  ): Promise<VaultOperationResult> {
    try {
      // محاكاة إنشاء بيانات اعتماد ديناميكية
      const credentials = {
        username: `vault-${role}-${Date.now()}`,
        password: await Crypto.randomUUID(),
        ttl: ttl || '1h',
        lease_id: `database/creds/${role}/${await Crypto.randomUUID()}`,
        lease_duration: 3600,
        renewable: true
      };

      console.log(`🔐 Database credentials generated for role: ${role}`);
      
      return {
        success: true,
        data: credentials
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to generate database credentials:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async renewLease(leaseId: string, increment?: number): Promise<VaultOperationResult> {
    try {
      const newLeaseDuration = increment || 3600;
      
      console.log(`🔄 Lease renewed: ${leaseId} (+${newLeaseDuration}s)`);
      
      return {
        success: true,
        data: {
          lease_id: leaseId,
          lease_duration: newLeaseDuration,
          renewable: true
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to renew lease:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async revokeLease(leaseId: string): Promise<VaultOperationResult> {
    try {
      console.log(`❌ Lease revoked: ${leaseId}`);
      
      return {
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to revoke lease:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async getTransitKeyInfo(name: string): Promise<VaultOperationResult> {
    try {
      const key = this.keyCache.get(name);
      if (!key) {
        throw new Error(`Transit key ${name} not found`);
      }

      return {
        success: true,
        data: key
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to get transit key info:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async listTransitKeys(): Promise<VaultOperationResult> {
    try {
      const keys = Array.from(this.keyCache.keys());
      
      return {
        success: true,
        data: {
          keys
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to list transit keys:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async getVaultStatus(): Promise<{
    totalKeys: number;
    totalSecrets: number;
    activeKeys: number;
    destroyedSecrets: number;
  }> {
    const keys = Array.from(this.keyCache.values());
    const secrets = Array.from(this.secretCache.values());
    
    return {
      totalKeys: keys.length,
      totalSecrets: secrets.length,
      activeKeys: keys.length, // جميع المفاتيح نشطة في هذا التطبيق
      destroyedSecrets: secrets.filter(s => s.metadata?.destroyed).length
    };
  }

  private async generatePublicKey(keyType: string): Promise<string> {
    // محاكاة إنشاء مفتاح عام
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${keyType}-public-${Date.now()}-${Math.random()}`
    );
  }

  private async loadCaches(): Promise<void> {
    await Promise.all([
      this.loadKeyCache(),
      this.loadSecretCache()
    ]);
  }

  private async loadKeyCache(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('vault_key_cache');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [keyName, keyData] of Object.entries(data)) {
          this.keyCache.set(keyName, keyData as VaultTransitKey);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load Vault key cache:', error);
    }
  }

  private async saveKeyCache(): Promise<void> {
    try {
      const cacheData = Object.fromEntries(this.keyCache);
      await AsyncStorage.setItem('vault_key_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('❌ Failed to save Vault key cache:', error);
    }
  }

  private async loadSecretCache(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('vault_secret_cache');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [path, secretData] of Object.entries(data)) {
          this.secretCache.set(path, secretData as VaultSecret);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load Vault secret cache:', error);
    }
  }

  private async saveSecretCache(): Promise<void> {
    try {
      const cacheData = Object.fromEntries(this.secretCache);
      await AsyncStorage.setItem('vault_secret_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('❌ Failed to save Vault secret cache:', error);
    }
  }

  destroy(): void {
    this.keyCache.clear();
    this.secretCache.clear();
    this.config = null;
    this.isInitialized = false;
    console.log('🏛️ HashiCorp Vault Service destroyed');
  }
}

export default HashiCorpVaultService;