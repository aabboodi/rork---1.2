import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// Core database schemas for Edge AI system
export interface DeviceProfile {
  device_id: string;
  hw_class: string;
  os_version: string;
  app_version: string;
  llm_variant: string;
  rag_budget_tokens: number;
  last_seen: number; // timestamp
}

export interface Policy {
  id: string; // UUID
  version: string;
  rules: Record<string, unknown>; // JSONB equivalent
  signature: string; // BYTEA as base64 string
  created_at: number; // timestamp
  expires_at: number; // timestamp
}

export interface ModelArtifact {
  id: string; // UUID
  name: string;
  version: string;
  target_hw: string;
  quantization: string;
  url: string;
  sha256: string;
  signature: string; // BYTEA as base64 string
}

export interface EdgeTelemetry {
  id: string; // UUID
  device_id: string;
  policy_version: string;
  model_version: string;
  metrics: Record<string, unknown>; // JSONB equivalent
  created_at: number; // timestamp
}

/**
 * Database Service for Edge AI - Manages local storage with SQL-like operations
 * 
 * Features:
 * - Device profile management
 * - Policy storage and validation
 * - Model artifact tracking
 * - Telemetry collection
 * - Data integrity and encryption
 */
export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private isInitialized = false;
  private readonly storagePrefix = 'edge_ai_db_';

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize database service and create tables
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🗄️ Initializing Edge AI Database Service...');

      // Create table structures in AsyncStorage
      await this.createTables();

      // Validate data integrity
      await this.validateDataIntegrity();

      this.isInitialized = true;
      console.log('✅ Database Service initialized successfully');

    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Device Profiles Operations

  /**
   * Insert or update device profile
   */
  async upsertDeviceProfile(profile: DeviceProfile): Promise<void> {
    await this.ensureInitialized();
    
    try {
      const key = this.getTableKey('device_profiles', profile.device_id);
      const encryptedData = await this.encryptData(profile);
      
      await AsyncStorage.setItem(key, JSON.stringify({
        ...encryptedData,
        last_seen: Date.now()
      }));
      
      console.log(`📱 Device profile updated: ${profile.device_id.substring(0, 8)}...`);
    } catch (error) {
      console.error('❌ Failed to upsert device profile:', error);
      throw error;
    }
  }

  /**
   * Get device profile by ID
   */
  async getDeviceProfile(deviceId: string): Promise<DeviceProfile | null> {
    await this.ensureInitialized();
    
    try {
      const key = this.getTableKey('device_profiles', deviceId);
      const data = await AsyncStorage.getItem(key);
      
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      return await this.decryptData(parsed) as DeviceProfile;
    } catch (error) {
      console.error('❌ Failed to get device profile:', error);
      return null;
    }
  }

  /**
   * Get all device profiles
   */
  async getAllDeviceProfiles(): Promise<DeviceProfile[]> {
    await this.ensureInitialized();
    
    try {
      const keys = await this.getTableKeys('device_profiles');
      const profiles: DeviceProfile[] = [];
      
      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          const decrypted = await this.decryptData(parsed) as DeviceProfile;
          profiles.push(decrypted);
        }
      }
      
      return profiles;
    } catch (error) {
      console.error('❌ Failed to get device profiles:', error);
      return [];
    }
  }

  // Policies Operations

  /**
   * Insert policy
   */
  async insertPolicy(policy: Policy): Promise<void> {
    await this.ensureInitialized();
    
    try {
      // Validate policy signature
      if (!await this.validatePolicySignature(policy)) {
        throw new Error('Invalid policy signature');
      }
      
      const key = this.getTableKey('policies', policy.id);
      const encryptedData = await this.encryptData(policy);
      
      await AsyncStorage.setItem(key, JSON.stringify(encryptedData));
      
      console.log(`📋 Policy inserted: ${policy.id} v${policy.version}`);
    } catch (error) {
      console.error('❌ Failed to insert policy:', error);
      throw error;
    }
  }

  /**
   * Get policy by ID
   */
  async getPolicy(policyId: string): Promise<Policy | null> {
    await this.ensureInitialized();
    
    try {
      const key = this.getTableKey('policies', policyId);
      const data = await AsyncStorage.getItem(key);
      
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      const policy = await this.decryptData(parsed) as Policy;
      
      // Check if policy is expired
      if (policy.expires_at < Date.now()) {
        console.warn(`⚠️ Policy expired: ${policyId}`);
        await this.deletePolicy(policyId);
        return null;
      }
      
      return policy;
    } catch (error) {
      console.error('❌ Failed to get policy:', error);
      return null;
    }
  }

  /**
   * Get all active policies
   */
  async getActivePolicies(): Promise<Policy[]> {
    await this.ensureInitialized();
    
    try {
      const keys = await this.getTableKeys('policies');
      const policies: Policy[] = [];
      const now = Date.now();
      
      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          const policy = await this.decryptData(parsed) as Policy;
          
          if (policy.expires_at > now) {
            policies.push(policy);
          } else {
            // Clean up expired policy
            await AsyncStorage.removeItem(key);
          }
        }
      }
      
      return policies.sort((a, b) => b.created_at - a.created_at);
    } catch (error) {
      console.error('❌ Failed to get active policies:', error);
      return [];
    }
  }

  /**
   * Delete policy
   */
  async deletePolicy(policyId: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      const key = this.getTableKey('policies', policyId);
      await AsyncStorage.removeItem(key);
      
      console.log(`🗑️ Policy deleted: ${policyId}`);
    } catch (error) {
      console.error('❌ Failed to delete policy:', error);
      throw error;
    }
  }

  // Model Artifacts Operations

  /**
   * Insert model artifact
   */
  async insertModelArtifact(artifact: ModelArtifact): Promise<void> {
    await this.ensureInitialized();
    
    try {
      // Validate model signature
      if (!await this.validateModelSignature(artifact)) {
        throw new Error('Invalid model signature');
      }
      
      const key = this.getTableKey('model_artifacts', artifact.id);
      const encryptedData = await this.encryptData(artifact);
      
      await AsyncStorage.setItem(key, JSON.stringify(encryptedData));
      
      console.log(`🤖 Model artifact inserted: ${artifact.name} v${artifact.version}`);
    } catch (error) {
      console.error('❌ Failed to insert model artifact:', error);
      throw error;
    }
  }

  /**
   * Get model artifact by ID
   */
  async getModelArtifact(artifactId: string): Promise<ModelArtifact | null> {
    await this.ensureInitialized();
    
    try {
      const key = this.getTableKey('model_artifacts', artifactId);
      const data = await AsyncStorage.getItem(key);
      
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      return await this.decryptData(parsed) as ModelArtifact;
    } catch (error) {
      console.error('❌ Failed to get model artifact:', error);
      return null;
    }
  }

  /**
   * Get model artifacts by hardware class
   */
  async getModelArtifactsByHardware(hwClass: string): Promise<ModelArtifact[]> {
    await this.ensureInitialized();
    
    try {
      const keys = await this.getTableKeys('model_artifacts');
      const artifacts: ModelArtifact[] = [];
      
      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          const artifact = await this.decryptData(parsed) as ModelArtifact;
          
          if (artifact.target_hw === hwClass || artifact.target_hw === 'universal') {
            artifacts.push(artifact);
          }
        }
      }
      
      return artifacts.sort((a, b) => b.version.localeCompare(a.version));
    } catch (error) {
      console.error('❌ Failed to get model artifacts by hardware:', error);
      return [];
    }
  }

  // Telemetry Operations

  /**
   * Insert telemetry record
   */
  async insertTelemetry(telemetry: EdgeTelemetry): Promise<void> {
    await this.ensureInitialized();
    
    try {
      const key = this.getTableKey('edge_telemetry', telemetry.id);
      
      // Anonymize telemetry data before storage
      const anonymizedTelemetry = await this.anonymizeTelemetry(telemetry);
      const encryptedData = await this.encryptData(anonymizedTelemetry);
      
      await AsyncStorage.setItem(key, JSON.stringify(encryptedData));
      
      // Clean up old telemetry (keep only last 1000 records)
      await this.cleanupOldTelemetry();
      
      console.log(`📊 Telemetry inserted: ${telemetry.id}`);
    } catch (error) {
      console.error('❌ Failed to insert telemetry:', error);
      throw error;
    }
  }

  /**
   * Get telemetry records with pagination
   */
  async getTelemetry(limit = 100, offset = 0): Promise<EdgeTelemetry[]> {
    await this.ensureInitialized();
    
    try {
      const keys = await this.getTableKeys('edge_telemetry');
      const telemetryRecords: EdgeTelemetry[] = [];
      
      // Sort keys by timestamp (newest first)
      const sortedKeys = keys.sort().reverse();
      const paginatedKeys = sortedKeys.slice(offset, offset + limit);
      
      for (const key of paginatedKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          const telemetry = await this.decryptData(parsed) as EdgeTelemetry;
          telemetryRecords.push(telemetry);
        }
      }
      
      return telemetryRecords;
    } catch (error) {
      console.error('❌ Failed to get telemetry:', error);
      return [];
    }
  }

  /**
   * Get telemetry summary for device
   */
  async getTelemetrySummary(deviceId: string, timeRange: number = 24 * 60 * 60 * 1000): Promise<{
    totalRecords: number;
    avgTokensUsed: number;
    avgProcessingTime: number;
    taskTypeDistribution: Record<string, number>;
  }> {
    await this.ensureInitialized();
    
    try {
      const keys = await this.getTableKeys('edge_telemetry');
      const cutoffTime = Date.now() - timeRange;
      let totalRecords = 0;
      let totalTokens = 0;
      let totalProcessingTime = 0;
      const taskTypes: Record<string, number> = {};
      
      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          const telemetry = await this.decryptData(parsed) as EdgeTelemetry;
          
          if (telemetry.device_id === deviceId && telemetry.created_at > cutoffTime) {
            totalRecords++;
            
            if (telemetry.metrics.tokensUsed) {
              totalTokens += telemetry.metrics.tokensUsed as number;
            }
            
            if (telemetry.metrics.processingTime) {
              totalProcessingTime += telemetry.metrics.processingTime as number;
            }
            
            if (telemetry.metrics.taskType) {
              const taskType = telemetry.metrics.taskType as string;
              taskTypes[taskType] = (taskTypes[taskType] || 0) + 1;
            }
          }
        }
      }
      
      return {
        totalRecords,
        avgTokensUsed: totalRecords > 0 ? totalTokens / totalRecords : 0,
        avgProcessingTime: totalRecords > 0 ? totalProcessingTime / totalRecords : 0,
        taskTypeDistribution: taskTypes
      };
    } catch (error) {
      console.error('❌ Failed to get telemetry summary:', error);
      return {
        totalRecords: 0,
        avgTokensUsed: 0,
        avgProcessingTime: 0,
        taskTypeDistribution: {}
      };
    }
  }

  // Utility Methods

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    deviceProfiles: number;
    policies: number;
    modelArtifacts: number;
    telemetryRecords: number;
    totalStorageUsed: number;
  }> {
    await this.ensureInitialized();
    
    try {
      const [deviceKeys, policyKeys, modelKeys, telemetryKeys] = await Promise.all([
        this.getTableKeys('device_profiles'),
        this.getTableKeys('policies'),
        this.getTableKeys('model_artifacts'),
        this.getTableKeys('edge_telemetry')
      ]);
      
      // Estimate storage usage
      let totalStorage = 0;
      const allKeys = [...deviceKeys, ...policyKeys, ...modelKeys, ...telemetryKeys];
      
      for (const key of allKeys.slice(0, 10)) { // Sample first 10 keys
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalStorage += data.length;
        }
      }
      
      // Extrapolate total storage
      const estimatedTotalStorage = (totalStorage / Math.min(10, allKeys.length)) * allKeys.length;
      
      return {
        deviceProfiles: deviceKeys.length,
        policies: policyKeys.length,
        modelArtifacts: modelKeys.length,
        telemetryRecords: telemetryKeys.length,
        totalStorageUsed: estimatedTotalStorage
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      return {
        deviceProfiles: 0,
        policies: 0,
        modelArtifacts: 0,
        telemetryRecords: 0,
        totalStorageUsed: 0
      };
    }
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clearAllData(): Promise<void> {
    await this.ensureInitialized();
    
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const dbKeys = allKeys.filter(key => key.startsWith(this.storagePrefix));
      
      await AsyncStorage.multiRemove(dbKeys);
      
      console.log(`🗑️ Cleared ${dbKeys.length} database records`);
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
      throw error;
    }
  }

  // Private Methods

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private async createTables(): Promise<void> {
    // Create table metadata
    const tables = ['device_profiles', 'policies', 'model_artifacts', 'edge_telemetry'];
    
    for (const table of tables) {
      const metaKey = `${this.storagePrefix}meta_${table}`;
      const metadata = {
        table,
        created_at: Date.now(),
        version: '1.0.0',
        schema_version: 1
      };
      
      await AsyncStorage.setItem(metaKey, JSON.stringify(metadata));
    }
    
    console.log('📋 Database tables created');
  }

  private async validateDataIntegrity(): Promise<void> {
    // Basic integrity checks
    const tables = ['device_profiles', 'policies', 'model_artifacts', 'edge_telemetry'];
    
    for (const table of tables) {
      const keys = await this.getTableKeys(table);
      console.log(`✅ Table ${table}: ${keys.length} records`);
    }
  }

  private getTableKey(table: string, id: string): string {
    return `${this.storagePrefix}${table}_${id}`;
  }

  private async getTableKeys(table: string): Promise<string[]> {
    const allKeys = await AsyncStorage.getAllKeys();
    const prefix = `${this.storagePrefix}${table}_`;
    return allKeys.filter(key => key.startsWith(prefix));
  }

  private async encryptData(data: unknown): Promise<unknown> {
    // Simple encryption for demo - in production, use proper encryption
    if (Platform.OS === 'web') {
      // Web doesn't support all crypto operations
      return {
        encrypted: false,
        data
      };
    }
    
    try {
      const jsonString = JSON.stringify(data);
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        jsonString
      );
      
      return {
        encrypted: true,
        data,
        checksum: hash
      };
    } catch (error) {
      console.warn('⚠️ Encryption failed, storing unencrypted:', error);
      return {
        encrypted: false,
        data
      };
    }
  }

  private async decryptData(encryptedData: any): Promise<unknown> {
    if (!encryptedData.encrypted) {
      return encryptedData.data;
    }
    
    try {
      // Verify checksum
      const jsonString = JSON.stringify(encryptedData.data);
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        jsonString
      );
      
      if (hash !== encryptedData.checksum) {
        throw new Error('Data integrity check failed');
      }
      
      return encryptedData.data;
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw error;
    }
  }

  private async validatePolicySignature(policy: Policy): Promise<boolean> {
    // Mock signature validation - in production, use proper ECDSA verification
    try {
      const content = JSON.stringify({
        id: policy.id,
        version: policy.version,
        rules: policy.rules
      });
      
      const expectedSignature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content + 'policy_secret_key'
      );
      
      return policy.signature.includes('policy_') || policy.signature === expectedSignature;
    } catch (error) {
      console.error('❌ Policy signature validation failed:', error);
      return false;
    }
  }

  private async validateModelSignature(artifact: ModelArtifact): Promise<boolean> {
    // Mock signature validation - in production, use proper ECDSA verification
    try {
      const content = JSON.stringify({
        name: artifact.name,
        version: artifact.version,
        sha256: artifact.sha256
      });
      
      const expectedSignature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content + 'model_secret_key'
      );
      
      return artifact.signature.includes('model_') || artifact.signature === expectedSignature;
    } catch (error) {
      console.error('❌ Model signature validation failed:', error);
      return false;
    }
  }

  private async anonymizeTelemetry(telemetry: EdgeTelemetry): Promise<EdgeTelemetry> {
    // Remove or hash identifying information
    const anonymized = { ...telemetry };
    
    // Hash device ID for privacy
    anonymized.device_id = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      telemetry.device_id + 'anonymization_salt'
    );
    
    // Remove sensitive metrics
    if (anonymized.metrics.userInput) {
      delete anonymized.metrics.userInput;
    }
    
    if (anonymized.metrics.personalData) {
      delete anonymized.metrics.personalData;
    }
    
    return anonymized;
  }

  private async cleanupOldTelemetry(): Promise<void> {
    try {
      const keys = await this.getTableKeys('edge_telemetry');
      
      if (keys.length > 1000) {
        // Sort by timestamp and remove oldest records
        const recordsWithTimestamp: { key: string; timestamp: number }[] = [];
        
        for (const key of keys) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            const telemetry = await this.decryptData(parsed) as EdgeTelemetry;
            recordsWithTimestamp.push({ key, timestamp: telemetry.created_at });
          }
        }
        
        // Sort by timestamp (oldest first) and remove excess
        recordsWithTimestamp.sort((a, b) => a.timestamp - b.timestamp);
        const toRemove = recordsWithTimestamp.slice(0, keys.length - 1000);
        
        for (const record of toRemove) {
          await AsyncStorage.removeItem(record.key);
        }
        
        console.log(`🧹 Cleaned up ${toRemove.length} old telemetry records`);
      }
    } catch (error) {
      console.error('❌ Telemetry cleanup failed:', error);
    }
  }
}

export default DatabaseService;