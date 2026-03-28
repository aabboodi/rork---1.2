import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import DLPService, { DLPScanResult } from './DLPService';
import E2EEService, { E2EEMessage } from './E2EEService';
import CryptoService from './CryptoService';
import KeyManager from './KeyManager';

// CRITICAL: Phase 4 - Production Hardening & Compliance
// DLP for attachments + E2EE encryption with temporary keys

interface TemporaryKey {
  keyId: string;
  key: string;
  iv: string;
  createdAt: number;
  expiresAt: number;
  usageCount: number;
  maxUsage: number;
  attachmentId: string;
  sessionId: string;
}

interface AttachmentMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  checksum: string;
  uploadedAt: number;
  uploadedBy: string;
  sessionId: string;
  encrypted: boolean;
  keyId?: string;
  dlpScanResult?: DLPScanResult;
  quarantined: boolean;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: number;
}

interface EncryptedAttachment {
  id: string;
  encryptedData: string;
  metadata: AttachmentMetadata;
  keyId: string;
  iv: string;
  authTag: string;
  timestamp: number;
}

interface AttachmentScanResult {
  allowed: boolean;
  quarantined: boolean;
  encrypted: boolean;
  dlpResult: DLPScanResult;
  metadata: AttachmentMetadata;
  temporaryKeyId?: string;
  warnings: string[];
  requiresApproval: boolean;
}

interface DLPAttachmentPolicy {
  id: string;
  name: string;
  enabled: boolean;
  maxFileSize: number; // bytes
  allowedTypes: string[];
  blockedTypes: string[];
  scanContent: boolean;
  requireEncryption: boolean;
  autoQuarantine: boolean;
  requireApproval: boolean;
  retentionDays: number;
}

class AttachmentSecurityService {
  private static instance: AttachmentSecurityService;
  private dlpService: DLPService;
  private e2eeService: E2EEService;
  private cryptoService: CryptoService;
  private keyManager: KeyManager;
  private temporaryKeys: Map<string, TemporaryKey> = new Map();
  private attachmentMetadata: Map<string, AttachmentMetadata> = new Map();
  private encryptedAttachments: Map<string, EncryptedAttachment> = new Map();
  private dlpPolicies: Map<string, DLPAttachmentPolicy> = new Map();
  private serviceActive: boolean = false;

  // CRITICAL: Key rotation interval for temporary keys (15 minutes)
  private readonly KEY_ROTATION_INTERVAL = 15 * 60 * 1000;
  // CRITICAL: Maximum key usage before rotation
  private readonly MAX_KEY_USAGE = 100;
  // CRITICAL: Attachment retention period (30 days)
  private readonly ATTACHMENT_RETENTION_DAYS = 30;

  private constructor() {
    this.dlpService = DLPService.getInstance();
    this.e2eeService = E2EEService.getInstance();
    this.cryptoService = CryptoService.getInstance();
    this.keyManager = KeyManager.getInstance();
    this.initializeDefaultPolicies();
  }

  static getInstance(): AttachmentSecurityService {
    if (!AttachmentSecurityService.instance) {
      AttachmentSecurityService.instance = new AttachmentSecurityService();
    }
    return AttachmentSecurityService.instance;
  }

  // ===== INITIALIZATION =====

  async initialize(): Promise<void> {
    try {
      await this.loadPersistedData();
      await this.startKeyRotationScheduler();
      await this.startCleanupScheduler();
      this.serviceActive = true;
      console.log('Attachment Security Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Attachment Security Service:', error);
      throw error;
    }
  }

  private initializeDefaultPolicies(): void {
    // CRITICAL: Default DLP policy for attachments
    const defaultPolicy: DLPAttachmentPolicy = {
      id: 'default_attachment_policy',
      name: 'Default Attachment Security Policy',
      enabled: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ],
      blockedTypes: [
        'application/x-executable', 'application/x-msdownload',
        'application/x-msdos-program', 'application/x-winexe',
        'application/x-sh', 'application/x-csh'
      ],
      scanContent: true,
      requireEncryption: true,
      autoQuarantine: true,
      requireApproval: false,
      retentionDays: 30
    };

    // CRITICAL: High security policy for sensitive files
    const highSecurityPolicy: DLPAttachmentPolicy = {
      id: 'high_security_policy',
      name: 'High Security Attachment Policy',
      enabled: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: ['application/pdf', 'text/plain'],
      blockedTypes: ['*'], // Block all except allowed
      scanContent: true,
      requireEncryption: true,
      autoQuarantine: true,
      requireApproval: true,
      retentionDays: 7
    };

    this.dlpPolicies.set(defaultPolicy.id, defaultPolicy);
    this.dlpPolicies.set(highSecurityPolicy.id, highSecurityPolicy);
  }

  // ===== ATTACHMENT PROCESSING =====

  async processAttachment(
    fileData: ArrayBuffer | string,
    fileName: string,
    fileType: string,
    mimeType: string,
    uploadedBy: string,
    sessionId: string,
    policyId: string = 'default_attachment_policy'
  ): Promise<AttachmentScanResult> {
    try {
      console.log(`Processing attachment: ${fileName} (${fileType})`);
      
      const policy = this.dlpPolicies.get(policyId);
      if (!policy || !policy.enabled) {
        throw new Error('Invalid or disabled DLP policy');
      }

      // CRITICAL: Generate attachment ID and metadata
      const attachmentId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const checksum = await this.calculateChecksum(fileData);
      
      const metadata: AttachmentMetadata = {
        id: attachmentId,
        fileName,
        fileSize: typeof fileData === 'string' ? fileData.length : fileData.byteLength,
        fileType,
        mimeType,
        checksum,
        uploadedAt: Date.now(),
        uploadedBy,
        sessionId,
        encrypted: false,
        quarantined: false,
        approved: false
      };

      // CRITICAL: Apply DLP policies
      const policyResult = await this.applyDLPPolicy(metadata, policy);
      if (!policyResult.allowed) {
        return {
          allowed: false,
          quarantined: true,
          encrypted: false,
          dlpResult: policyResult.dlpResult,
          metadata,
          warnings: policyResult.warnings,
          requiresApproval: policy.requireApproval
        };
      }

      // CRITICAL: Scan file content with DLP
      let dlpResult: DLPScanResult;
      if (policy.scanContent) {
        const content = typeof fileData === 'string' ? fileData : this.arrayBufferToString(fileData);
        dlpResult = await this.dlpService.scanContent(content, {
          userId: uploadedBy,
          messageType: 'file',
          fileName,
          fileType,
          fileSize: metadata.fileSize
        });
      } else {
        dlpResult = {
          allowed: true,
          violations: [],
          warnings: [],
          requiresUserConfirmation: false,
          suggestedAction: 'proceed'
        };
      }

      metadata.dlpScanResult = dlpResult;

      // CRITICAL: Determine if quarantine is needed
      const shouldQuarantine = !dlpResult.allowed || 
                              dlpResult.suggestedAction === 'block' ||
                              (policy.autoQuarantine && dlpResult.violations.length > 0);

      if (shouldQuarantine) {
        metadata.quarantined = true;
        await this.quarantineAttachment(attachmentId, metadata, fileData);
        
        return {
          allowed: false,
          quarantined: true,
          encrypted: false,
          dlpResult,
          metadata,
          warnings: dlpResult.warnings,
          requiresApproval: policy.requireApproval
        };
      }

      // CRITICAL: Encrypt attachment with temporary key
      let temporaryKeyId: string | undefined;
      if (policy.requireEncryption) {
        temporaryKeyId = await this.encryptAttachment(attachmentId, fileData, sessionId);
        metadata.encrypted = true;
        metadata.keyId = temporaryKeyId;
      }

      // Store metadata
      this.attachmentMetadata.set(attachmentId, metadata);
      await this.persistAttachmentMetadata();

      console.log(`Attachment processed successfully: ${attachmentId}`);
      
      return {
        allowed: true,
        quarantined: false,
        encrypted: policy.requireEncryption,
        dlpResult,
        metadata,
        temporaryKeyId,
        warnings: dlpResult.warnings,
        requiresApproval: policy.requireApproval && dlpResult.violations.length > 0
      };
    } catch (error) {
      console.error('Attachment processing failed:', error);
      throw new Error('Failed to process attachment');
    }
  }

  // CRITICAL: Encrypt attachment with temporary key
  private async encryptAttachment(
    attachmentId: string,
    fileData: ArrayBuffer | string,
    sessionId: string
  ): Promise<string> {
    try {
      // CRITICAL: Generate temporary key for this attachment
      const temporaryKey = await this.generateTemporaryKey(attachmentId, sessionId);
      
      // CRITICAL: Convert data to buffer if needed
      const dataBuffer = typeof fileData === 'string' 
        ? new TextEncoder().encode(fileData)
        : new Uint8Array(fileData);

      // CRITICAL: Encrypt using AES-GCM with temporary key
      const encryptedData = await this.encryptWithTemporaryKey(
        dataBuffer,
        temporaryKey.key,
        temporaryKey.iv
      );

      // CRITICAL: Generate authentication tag
      const authTag = await this.generateAuthTag(encryptedData, temporaryKey.key);

      const encryptedAttachment: EncryptedAttachment = {
        id: attachmentId,
        encryptedData: this.arrayBufferToBase64(encryptedData),
        metadata: this.attachmentMetadata.get(attachmentId)!,
        keyId: temporaryKey.keyId,
        iv: temporaryKey.iv,
        authTag,
        timestamp: Date.now()
      };

      this.encryptedAttachments.set(attachmentId, encryptedAttachment);
      await this.persistEncryptedAttachments();

      console.log(`Attachment encrypted with temporary key: ${temporaryKey.keyId}`);
      return temporaryKey.keyId;
    } catch (error) {
      console.error('Attachment encryption failed:', error);
      throw new Error('Failed to encrypt attachment');
    }
  }

  // CRITICAL: Decrypt attachment using temporary key
  async decryptAttachment(attachmentId: string, requestedBy: string): Promise<ArrayBuffer> {
    try {
      const encryptedAttachment = this.encryptedAttachments.get(attachmentId);
      if (!encryptedAttachment) {
        throw new Error('Encrypted attachment not found');
      }

      const metadata = this.attachmentMetadata.get(attachmentId);
      if (!metadata) {
        throw new Error('Attachment metadata not found');
      }

      // CRITICAL: Verify access permissions
      if (!await this.verifyAttachmentAccess(attachmentId, requestedBy)) {
        throw new Error('Access denied to attachment');
      }

      const temporaryKey = this.temporaryKeys.get(encryptedAttachment.keyId);
      if (!temporaryKey) {
        throw new Error('Temporary key not found or expired');
      }

      // CRITICAL: Check key expiration
      if (Date.now() > temporaryKey.expiresAt) {
        await this.rotateTemporaryKey(temporaryKey.keyId);
        throw new Error('Temporary key expired, please retry');
      }

      // CRITICAL: Verify authentication tag
      const encryptedData = this.base64ToArrayBuffer(encryptedAttachment.encryptedData);
      const isValidAuth = await this.verifyAuthTag(
        encryptedData,
        encryptedAttachment.authTag,
        temporaryKey.key
      );
      
      if (!isValidAuth) {
        throw new Error('Authentication verification failed');
      }

      // CRITICAL: Decrypt using temporary key
      const decryptedData = await this.decryptWithTemporaryKey(
        encryptedData,
        temporaryKey.key,
        temporaryKey.iv
      );

      // CRITICAL: Update key usage count
      temporaryKey.usageCount++;
      if (temporaryKey.usageCount >= temporaryKey.maxUsage) {
        await this.rotateTemporaryKey(temporaryKey.keyId);
      }

      this.temporaryKeys.set(temporaryKey.keyId, temporaryKey);
      await this.persistTemporaryKeys();

      console.log(`Attachment decrypted successfully: ${attachmentId}`);
      return decryptedData;
    } catch (error) {
      console.error('Attachment decryption failed:', error);
      throw new Error('Failed to decrypt attachment');
    }
  }

  // ===== TEMPORARY KEY MANAGEMENT =====

  private async generateTemporaryKey(
    attachmentId: string,
    sessionId: string
  ): Promise<TemporaryKey> {
    try {
      const keyId = `tmpkey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // CRITICAL: Generate cryptographically secure key and IV
      const key = await this.cryptoService.generateSecureKey(32); // 256-bit key
      const iv = await this.cryptoService.generateSecureKey(12); // 96-bit IV for GCM
      
      const temporaryKey: TemporaryKey = {
        keyId,
        key,
        iv,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.KEY_ROTATION_INTERVAL,
        usageCount: 0,
        maxUsage: this.MAX_KEY_USAGE,
        attachmentId,
        sessionId
      };

      this.temporaryKeys.set(keyId, temporaryKey);
      await this.persistTemporaryKeys();

      console.log(`Generated temporary key: ${keyId}`);
      return temporaryKey;
    } catch (error) {
      console.error('Temporary key generation failed:', error);
      throw new Error('Failed to generate temporary key');
    }
  }

  private async rotateTemporaryKey(keyId: string): Promise<string> {
    try {
      const oldKey = this.temporaryKeys.get(keyId);
      if (!oldKey) {
        throw new Error('Temporary key not found for rotation');
      }

      // CRITICAL: Generate new temporary key
      const newKey = await this.generateTemporaryKey(
        oldKey.attachmentId,
        oldKey.sessionId
      );

      // CRITICAL: Re-encrypt attachment with new key
      await this.reencryptAttachment(oldKey.attachmentId, oldKey.keyId, newKey.keyId);

      // CRITICAL: Securely delete old key
      await this.securelyDeleteKey(keyId);

      console.log(`Temporary key rotated: ${keyId} -> ${newKey.keyId}`);
      return newKey.keyId;
    } catch (error) {
      console.error('Key rotation failed:', error);
      throw error;
    }
  }

  private async reencryptAttachment(
    attachmentId: string,
    oldKeyId: string,
    newKeyId: string
  ): Promise<void> {
    try {
      const encryptedAttachment = this.encryptedAttachments.get(attachmentId);
      const oldKey = this.temporaryKeys.get(oldKeyId);
      const newKey = this.temporaryKeys.get(newKeyId);

      if (!encryptedAttachment || !oldKey || !newKey) {
        throw new Error('Required data not found for re-encryption');
      }

      // CRITICAL: Decrypt with old key
      const encryptedData = this.base64ToArrayBuffer(encryptedAttachment.encryptedData);
      const decryptedData = await this.decryptWithTemporaryKey(
        encryptedData,
        oldKey.key,
        oldKey.iv
      );

      // CRITICAL: Encrypt with new key
      const reencryptedData = await this.encryptWithTemporaryKey(
        decryptedData,
        newKey.key,
        newKey.iv
      );

      // CRITICAL: Update encrypted attachment
      encryptedAttachment.encryptedData = this.arrayBufferToBase64(reencryptedData);
      encryptedAttachment.keyId = newKeyId;
      encryptedAttachment.iv = newKey.iv;
      encryptedAttachment.authTag = await this.generateAuthTag(reencryptedData, newKey.key);

      this.encryptedAttachments.set(attachmentId, encryptedAttachment);
      await this.persistEncryptedAttachments();

      console.log(`Attachment re-encrypted: ${attachmentId}`);
    } catch (error) {
      console.error('Attachment re-encryption failed:', error);
      throw error;
    }
  }

  // ===== ENCRYPTION/DECRYPTION HELPERS =====

  private async encryptWithTemporaryKey(
    data: Uint8Array,
    key: string,
    iv: string
  ): Promise<ArrayBuffer> {
    try {
      if (Platform.OS === 'web') {
        // CRITICAL: Web Crypto API AES-GCM encryption
        const keyBuffer = this.base64ToArrayBuffer(key);
        const ivBuffer = this.base64ToArrayBuffer(iv);
        
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyBuffer,
          { name: 'AES-GCM' },
          false,
          ['encrypt']
        );
        
        return await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: ivBuffer },
          cryptoKey,
          data
        );
      } else {
        // CRITICAL: Use CryptoService for native platforms
        const dataBase64 = this.arrayBufferToBase64(data);
        const encrypted = await this.cryptoService.advancedEncrypt(dataBase64, key);
        return this.base64ToArrayBuffer(encrypted);
      }
    } catch (error) {
      console.error('Temporary key encryption failed:', error);
      throw error;
    }
  }

  private async decryptWithTemporaryKey(
    encryptedData: ArrayBuffer,
    key: string,
    iv: string
  ): Promise<ArrayBuffer> {
    try {
      if (Platform.OS === 'web') {
        // CRITICAL: Web Crypto API AES-GCM decryption
        const keyBuffer = this.base64ToArrayBuffer(key);
        const ivBuffer = this.base64ToArrayBuffer(iv);
        
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyBuffer,
          { name: 'AES-GCM' },
          false,
          ['decrypt']
        );
        
        return await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: ivBuffer },
          cryptoKey,
          encryptedData
        );
      } else {
        // CRITICAL: Use CryptoService for native platforms
        const encryptedBase64 = this.arrayBufferToBase64(encryptedData);
        const decrypted = await this.cryptoService.advancedDecrypt(encryptedBase64, key);
        return this.base64ToArrayBuffer(decrypted);
      }
    } catch (error) {
      console.error('Temporary key decryption failed:', error);
      throw error;
    }
  }

  // ===== DLP POLICY APPLICATION =====

  private async applyDLPPolicy(
    metadata: AttachmentMetadata,
    policy: DLPAttachmentPolicy
  ): Promise<{ allowed: boolean; dlpResult: DLPScanResult; warnings: string[] }> {
    const warnings: string[] = [];
    
    // CRITICAL: Check file size
    if (metadata.fileSize > policy.maxFileSize) {
      warnings.push(`File size exceeds limit: ${metadata.fileSize} > ${policy.maxFileSize}`);
      return {
        allowed: false,
        dlpResult: {
          allowed: false,
          violations: [],
          warnings: [`File size too large: ${this.formatFileSize(metadata.fileSize)}`],
          requiresUserConfirmation: false,
          suggestedAction: 'block'
        },
        warnings
      };
    }

    // CRITICAL: Check file type restrictions
    if (policy.blockedTypes.includes('*') && !policy.allowedTypes.includes(metadata.mimeType)) {
      warnings.push(`File type not in allowed list: ${metadata.mimeType}`);
      return {
        allowed: false,
        dlpResult: {
          allowed: false,
          violations: [],
          warnings: [`File type not allowed: ${metadata.mimeType}`],
          requiresUserConfirmation: false,
          suggestedAction: 'block'
        },
        warnings
      };
    }

    if (policy.blockedTypes.includes(metadata.mimeType)) {
      warnings.push(`File type is blocked: ${metadata.mimeType}`);
      return {
        allowed: false,
        dlpResult: {
          allowed: false,
          violations: [],
          warnings: [`File type is blocked: ${metadata.mimeType}`],
          requiresUserConfirmation: false,
          suggestedAction: 'block'
        },
        warnings
      };
    }

    return {
      allowed: true,
      dlpResult: {
        allowed: true,
        violations: [],
        warnings,
        requiresUserConfirmation: false,
        suggestedAction: 'proceed'
      },
      warnings
    };
  }

  // ===== QUARANTINE MANAGEMENT =====

  private async quarantineAttachment(
    attachmentId: string,
    metadata: AttachmentMetadata,
    fileData: ArrayBuffer | string
  ): Promise<void> {
    try {
      // CRITICAL: Store quarantined attachment securely
      const quarantineKey = `quarantine_${attachmentId}`;
      const encryptedData = await this.cryptoService.encrypt(
        typeof fileData === 'string' ? fileData : this.arrayBufferToBase64(fileData)
      );
      
      await AsyncStorage.setItem(quarantineKey, encryptedData);
      
      metadata.quarantined = true;
      this.attachmentMetadata.set(attachmentId, metadata);
      
      console.log(`Attachment quarantined: ${attachmentId}`);
    } catch (error) {
      console.error('Quarantine failed:', error);
      throw error;
    }
  }

  async approveQuarantinedAttachment(
    attachmentId: string,
    approvedBy: string
  ): Promise<void> {
    try {
      const metadata = this.attachmentMetadata.get(attachmentId);
      if (!metadata || !metadata.quarantined) {
        throw new Error('Attachment not found or not quarantined');
      }

      metadata.quarantined = false;
      metadata.approved = true;
      metadata.approvedBy = approvedBy;
      metadata.approvedAt = Date.now();

      this.attachmentMetadata.set(attachmentId, metadata);
      await this.persistAttachmentMetadata();

      console.log(`Quarantined attachment approved: ${attachmentId}`);
    } catch (error) {
      console.error('Attachment approval failed:', error);
      throw error;
    }
  }

  // ===== ACCESS CONTROL =====

  private async verifyAttachmentAccess(
    attachmentId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const metadata = this.attachmentMetadata.get(attachmentId);
      if (!metadata) return false;

      // CRITICAL: Check if user is the uploader
      if (metadata.uploadedBy === userId) return true;

      // CRITICAL: Check session access
      // In production, implement proper session-based access control
      return true; // Simplified for demo
    } catch (error) {
      console.error('Access verification failed:', error);
      return false;
    }
  }

  // ===== SCHEDULERS =====

  private async startKeyRotationScheduler(): Promise<void> {
    setInterval(async () => {
      try {
        await this.rotateExpiredKeys();
      } catch (error) {
        console.error('Key rotation scheduler error:', error);
      }
    }, this.KEY_ROTATION_INTERVAL);
  }

  private async startCleanupScheduler(): Promise<void> {
    // CRITICAL: Run cleanup every 24 hours
    setInterval(async () => {
      try {
        await this.cleanupExpiredAttachments();
      } catch (error) {
        console.error('Cleanup scheduler error:', error);
      }
    }, 24 * 60 * 60 * 1000);
  }

  private async rotateExpiredKeys(): Promise<void> {
    const now = Date.now();
    const expiredKeys = Array.from(this.temporaryKeys.values())
      .filter(key => now > key.expiresAt || key.usageCount >= key.maxUsage);

    for (const key of expiredKeys) {
      try {
        await this.rotateTemporaryKey(key.keyId);
      } catch (error) {
        console.error(`Failed to rotate key ${key.keyId}:`, error);
      }
    }

    console.log(`Rotated ${expiredKeys.length} expired keys`);
  }

  private async cleanupExpiredAttachments(): Promise<void> {
    const now = Date.now();
    const retentionMs = this.ATTACHMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    
    const expiredAttachments = Array.from(this.attachmentMetadata.values())
      .filter(metadata => now - metadata.uploadedAt > retentionMs);

    for (const metadata of expiredAttachments) {
      try {
        await this.securelyDeleteAttachment(metadata.id);
      } catch (error) {
        console.error(`Failed to delete attachment ${metadata.id}:`, error);
      }
    }

    console.log(`Cleaned up ${expiredAttachments.length} expired attachments`);
  }

  // ===== SECURE DELETION =====

  private async securelyDeleteKey(keyId: string): Promise<void> {
    try {
      // CRITICAL: Overwrite key data before deletion
      const key = this.temporaryKeys.get(keyId);
      if (key) {
        // Overwrite sensitive data
        key.key = '0'.repeat(key.key.length);
        key.iv = '0'.repeat(key.iv.length);
      }
      
      this.temporaryKeys.delete(keyId);
      await this.persistTemporaryKeys();
      
      console.log(`Key securely deleted: ${keyId}`);
    } catch (error) {
      console.error('Secure key deletion failed:', error);
    }
  }

  private async securelyDeleteAttachment(attachmentId: string): Promise<void> {
    try {
      // CRITICAL: Delete encrypted attachment
      this.encryptedAttachments.delete(attachmentId);
      
      // CRITICAL: Delete metadata
      this.attachmentMetadata.delete(attachmentId);
      
      // CRITICAL: Delete quarantined data if exists
      const quarantineKey = `quarantine_${attachmentId}`;
      await AsyncStorage.removeItem(quarantineKey);
      
      await this.persistAttachmentMetadata();
      await this.persistEncryptedAttachments();
      
      console.log(`Attachment securely deleted: ${attachmentId}`);
    } catch (error) {
      console.error('Secure attachment deletion failed:', error);
    }
  }

  // ===== UTILITY METHODS =====

  private async calculateChecksum(data: ArrayBuffer | string): Promise<string> {
    const dataString = typeof data === 'string' ? data : this.arrayBufferToBase64(data);
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, dataString);
  }

  private async generateAuthTag(data: ArrayBuffer, key: string): Promise<string> {
    const dataBase64 = this.arrayBufferToBase64(data);
    return await this.cryptoService.calculateHMAC(dataBase64, key);
  }

  private async verifyAuthTag(data: ArrayBuffer, authTag: string, key: string): Promise<boolean> {
    const expectedTag = await this.generateAuthTag(data, key);
    return expectedTag === authTag;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private arrayBufferToString(buffer: ArrayBuffer): string {
    return new TextDecoder().decode(buffer);
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ===== DATA PERSISTENCE =====

  private async persistTemporaryKeys(): Promise<void> {
    try {
      const keysData = Array.from(this.temporaryKeys.entries());
      await AsyncStorage.setItem('attachment_temp_keys', JSON.stringify(keysData));
    } catch (error) {
      console.error('Failed to persist temporary keys:', error);
    }
  }

  private async persistAttachmentMetadata(): Promise<void> {
    try {
      const metadataData = Array.from(this.attachmentMetadata.entries());
      await AsyncStorage.setItem('attachment_metadata', JSON.stringify(metadataData));
    } catch (error) {
      console.error('Failed to persist attachment metadata:', error);
    }
  }

  private async persistEncryptedAttachments(): Promise<void> {
    try {
      const attachmentsData = Array.from(this.encryptedAttachments.entries());
      await AsyncStorage.setItem('encrypted_attachments', JSON.stringify(attachmentsData));
    } catch (error) {
      console.error('Failed to persist encrypted attachments:', error);
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      // Load temporary keys
      const keysData = await AsyncStorage.getItem('attachment_temp_keys');
      if (keysData) {
        const keysArray = JSON.parse(keysData);
        this.temporaryKeys = new Map(keysArray);
      }

      // Load attachment metadata
      const metadataData = await AsyncStorage.getItem('attachment_metadata');
      if (metadataData) {
        const metadataArray = JSON.parse(metadataData);
        this.attachmentMetadata = new Map(metadataArray);
      }

      // Load encrypted attachments
      const attachmentsData = await AsyncStorage.getItem('encrypted_attachments');
      if (attachmentsData) {
        const attachmentsArray = JSON.parse(attachmentsData);
        this.encryptedAttachments = new Map(attachmentsArray);
      }
    } catch (error) {
      console.error('Failed to load persisted data:', error);
    }
  }

  // ===== PUBLIC API =====

  async getAttachmentMetadata(attachmentId: string): Promise<AttachmentMetadata | null> {
    return this.attachmentMetadata.get(attachmentId) || null;
  }

  async getQuarantinedAttachments(): Promise<AttachmentMetadata[]> {
    return Array.from(this.attachmentMetadata.values())
      .filter(metadata => metadata.quarantined);
  }

  async getAttachmentsByUser(userId: string): Promise<AttachmentMetadata[]> {
    return Array.from(this.attachmentMetadata.values())
      .filter(metadata => metadata.uploadedBy === userId);
  }

  getServiceStatus(): {
    active: boolean;
    temporaryKeysCount: number;
    attachmentsCount: number;
    quarantinedCount: number;
    encryptedCount: number;
  } {
    return {
      active: this.serviceActive,
      temporaryKeysCount: this.temporaryKeys.size,
      attachmentsCount: this.attachmentMetadata.size,
      quarantinedCount: Array.from(this.attachmentMetadata.values())
        .filter(m => m.quarantined).length,
      encryptedCount: Array.from(this.attachmentMetadata.values())
        .filter(m => m.encrypted).length
    };
  }

  async cleanup(): Promise<void> {
    await this.persistTemporaryKeys();
    await this.persistAttachmentMetadata();
    await this.persistEncryptedAttachments();
    this.serviceActive = false;
    console.log('Attachment Security Service cleanup completed');
  }
}

export default AttachmentSecurityService;
export type {
  TemporaryKey,
  AttachmentMetadata,
  EncryptedAttachment,
  AttachmentScanResult,
  DLPAttachmentPolicy
};