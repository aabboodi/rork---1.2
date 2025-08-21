import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { DatabaseService } from '../../DatabaseService';
import { PolicyVerifier } from '../policy/verifier';

export interface ModelArtifact {
  id: string;
  name: string;
  version: string;
  target_hw: string;
  quantization: string;
  url: string;
  sha256: string;
  signature: string;
  created_at: string;
  expires_at?: string;
}

export interface LoadedModel {
  id: string;
  name: string;
  version: string;
  localPath: string;
  metadata: ModelArtifact;
  loadedAt: Date;
}

export class ModelLoader {
  private static instance: ModelLoader;
  private loadedModels: Map<string, LoadedModel> = new Map();
  private db: DatabaseService;
  private verifier: PolicyVerifier;
  private modelDir: string;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.verifier = new PolicyVerifier();
    this.modelDir = `${FileSystem.documentDirectory}models/`;
    this.ensureModelDirectory();
  }

  public static getInstance(): ModelLoader {
    if (!ModelLoader.instance) {
      ModelLoader.instance = new ModelLoader();
    }
    return ModelLoader.instance;
  }

  private async ensureModelDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.modelDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.modelDir, { intermediates: true });
        console.log('[ModelLoader] Created models directory');
      }
    } catch (error) {
      console.error('[ModelLoader] Failed to create models directory:', error);
      throw new Error('Failed to initialize model storage');
    }
  }

  /**
   * Load model from registry with signature verification
   */
  public async loadModel(modelId: string, forceReload = false): Promise<LoadedModel> {
    try {
      // Check if model is already loaded and valid
      if (!forceReload && this.loadedModels.has(modelId)) {
        const loaded = this.loadedModels.get(modelId)!;
        if (await this.isModelValid(loaded)) {
          console.log(`[ModelLoader] Using cached model: ${modelId}`);
          return loaded;
        }
      }

      // Get model artifact from database
      const artifact = await this.getModelArtifact(modelId);
      if (!artifact) {
        throw new Error(`Model artifact not found: ${modelId}`);
      }

      // Verify model signature and expiration
      await this.verifyModelArtifact(artifact);

      // Check if model is compatible with current hardware
      this.validateHardwareCompatibility(artifact);

      // Download and verify model file
      const localPath = await this.downloadAndVerifyModel(artifact);

      // Create loaded model instance
      const loadedModel: LoadedModel = {
        id: artifact.id,
        name: artifact.name,
        version: artifact.version,
        localPath,
        metadata: artifact,
        loadedAt: new Date()
      };

      // Cache the loaded model
      this.loadedModels.set(modelId, loadedModel);

      console.log(`[ModelLoader] Successfully loaded model: ${artifact.name} v${artifact.version}`);
      return loadedModel;

    } catch (error) {
      console.error(`[ModelLoader] Failed to load model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get model artifact from database
   */
  private async getModelArtifact(modelId: string): Promise<ModelArtifact | null> {
    try {
      return await this.db.getModelArtifact(modelId);
    } catch (error) {
      console.error('[ModelLoader] Failed to get model artifact:', error);
      throw error;
    }
  }

  /**
   * Verify model artifact signature and expiration
   */
  private async verifyModelArtifact(artifact: ModelArtifact): Promise<void> {
    try {
      // Check expiration
      if (artifact.expires_at) {
        const expiresAt = new Date(artifact.expires_at);
        if (expiresAt < new Date()) {
          throw new Error(`Model artifact expired: ${artifact.name}`);
        }
      }

      // Verify signature
      const payload = JSON.stringify({
        id: artifact.id,
        name: artifact.name,
        version: artifact.version,
        target_hw: artifact.target_hw,
        quantization: artifact.quantization,
        url: artifact.url,
        sha256: artifact.sha256
      });

      const isValid = await this.verifier.verifySignature(
        payload,
        artifact.signature
      );

      if (!isValid) {
        throw new Error(`Invalid model signature: ${artifact.name}`);
      }

      console.log(`[ModelLoader] Model signature verified: ${artifact.name}`);
    } catch (error) {
      console.error('[ModelLoader] Model verification failed:', error);
      throw error;
    }
  }

  /**
   * Validate hardware compatibility
   */
  private validateHardwareCompatibility(artifact: ModelArtifact): void {
    const currentPlatform = Platform.OS;
    const targetHw = artifact.target_hw.toLowerCase();

    // Check platform compatibility
    if (targetHw.includes('ios') && currentPlatform !== 'ios') {
      throw new Error(`Model incompatible with ${currentPlatform}: ${artifact.name}`);
    }

    if (targetHw.includes('android') && currentPlatform !== 'android') {
      throw new Error(`Model incompatible with ${currentPlatform}: ${artifact.name}`);
    }

    // Web compatibility check
    if (currentPlatform === 'web' && !targetHw.includes('web')) {
      console.warn(`[ModelLoader] Model may not be optimized for web: ${artifact.name}`);
    }

    console.log(`[ModelLoader] Hardware compatibility verified: ${artifact.name}`);
  }

  /**
   * Download and verify model file
   */
  private async downloadAndVerifyModel(artifact: ModelArtifact): Promise<string> {
    const fileName = `${artifact.name}_${artifact.version}.${this.getFileExtension(artifact)}`;
    const localPath = `${this.modelDir}${fileName}`;

    try {
      // Check if file already exists and is valid
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        const isValid = await this.verifyFileHash(localPath, artifact.sha256);
        if (isValid) {
          console.log(`[ModelLoader] Using existing model file: ${fileName}`);
          return localPath;
        } else {
          console.log(`[ModelLoader] Existing file hash mismatch, re-downloading: ${fileName}`);
          await FileSystem.deleteAsync(localPath);
        }
      }

      // Download model file
      console.log(`[ModelLoader] Downloading model: ${artifact.url}`);
      const downloadResult = await FileSystem.downloadAsync(artifact.url, localPath);

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }

      // Verify downloaded file hash
      const isValid = await this.verifyFileHash(localPath, artifact.sha256);
      if (!isValid) {
        await FileSystem.deleteAsync(localPath);
        throw new Error(`Downloaded file hash verification failed: ${fileName}`);
      }

      console.log(`[ModelLoader] Model downloaded and verified: ${fileName}`);
      return localPath;

    } catch (error) {
      console.error(`[ModelLoader] Failed to download model ${artifact.name}:`, error);
      // Clean up partial download
      try {
        await FileSystem.deleteAsync(localPath);
      } catch {}
      throw error;
    }
  }

  /**
   * Verify file SHA256 hash
   */
  private async verifyFileHash(filePath: string, expectedHash: string): Promise<boolean> {
    try {
      const fileHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        await FileSystem.readAsStringAsync(filePath, { encoding: FileSystem.EncodingType.Base64 }),
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      return fileHash.toLowerCase() === expectedHash.toLowerCase();
    } catch (error) {
      console.error('[ModelLoader] Hash verification failed:', error);
      return false;
    }
  }

  /**
   * Get file extension based on model type
   */
  private getFileExtension(artifact: ModelArtifact): string {
    const name = artifact.name.toLowerCase();
    if (name.includes('onnx')) return 'onnx';
    if (name.includes('tflite')) return 'tflite';
    if (name.includes('coreml')) return 'mlmodel';
    return 'bin'; // fallback
  }

  /**
   * Check if loaded model is still valid
   */
  private async isModelValid(loadedModel: LoadedModel): Promise<boolean> {
    try {
      // Check if file still exists
      const fileInfo = await FileSystem.getInfoAsync(loadedModel.localPath);
      if (!fileInfo.exists) {
        return false;
      }

      // Check if model has expired
      if (loadedModel.metadata.expires_at) {
        const expiresAt = new Date(loadedModel.metadata.expires_at);
        if (expiresAt < new Date()) {
          return false;
        }
      }

      // Check if loaded too long ago (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - loadedModel.loadedAt.getTime() > maxAge) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ModelLoader] Model validation failed:', error);
      return false;
    }
  }

  /**
   * Get all available models from registry
   */
  public async getAvailableModels(): Promise<ModelArtifact[]> {
    try {
      // This is a simplified approach - in a real implementation,
      // we would need to add a method to DatabaseService to get all model artifacts
      // For now, we'll return an empty array and log a warning
      console.warn('[ModelLoader] getAvailableModels not fully implemented - returning empty array');
      return [];
    } catch (error) {
      console.error('[ModelLoader] Failed to get available models:', error);
      throw error;
    }
  }

  /**
   * Get models compatible with current hardware
   */
  public async getCompatibleModels(): Promise<ModelArtifact[]> {
    try {
      const allModels = await this.getAvailableModels();
      const currentPlatform = Platform.OS;

      return allModels.filter(model => {
        const targetHw = model.target_hw.toLowerCase();
        
        // Universal models
        if (targetHw.includes('universal') || targetHw.includes('cross-platform')) {
          return true;
        }

        // Platform-specific models
        if (currentPlatform === 'ios' && targetHw.includes('ios')) {
          return true;
        }

        if (currentPlatform === 'android' && targetHw.includes('android')) {
          return true;
        }

        if (currentPlatform === 'web' && targetHw.includes('web')) {
          return true;
        }

        return false;
      });
    } catch (error) {
      console.error('[ModelLoader] Failed to get compatible models:', error);
      throw error;
    }
  }

  /**
   * Unload model from memory
   */
  public async unloadModel(modelId: string): Promise<void> {
    try {
      if (this.loadedModels.has(modelId)) {
        this.loadedModels.delete(modelId);
        console.log(`[ModelLoader] Unloaded model: ${modelId}`);
      }
    } catch (error) {
      console.error(`[ModelLoader] Failed to unload model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Clear all loaded models
   */
  public async clearCache(): Promise<void> {
    try {
      this.loadedModels.clear();
      console.log('[ModelLoader] Cleared model cache');
    } catch (error) {
      console.error('[ModelLoader] Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Clean up old model files
   */
  public async cleanupOldModels(maxAgeHours = 168): Promise<void> { // 7 days default
    try {
      const files = await FileSystem.readDirectoryAsync(this.modelDir);
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      const now = Date.now();

      for (const file of files) {
        const filePath = `${this.modelDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists && fileInfo.modificationTime) {
          const fileAge = now - fileInfo.modificationTime * 1000;
          
          if (fileAge > maxAge) {
            await FileSystem.deleteAsync(filePath);
            console.log(`[ModelLoader] Cleaned up old model file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('[ModelLoader] Failed to cleanup old models:', error);
    }
  }

  /**
   * Get model loading statistics
   */
  public getStats(): {
    loadedModels: number;
    totalSize: number;
    oldestModel: Date | null;
  } {
    let totalSize = 0;
    let oldestModel: Date | null = null;

    for (const model of this.loadedModels.values()) {
      if (!oldestModel || model.loadedAt < oldestModel) {
        oldestModel = model.loadedAt;
      }
    }

    return {
      loadedModels: this.loadedModels.size,
      totalSize,
      oldestModel
    };
  }
}

export default ModelLoader;