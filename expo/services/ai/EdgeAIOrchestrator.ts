import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import { TokenBudgetManager } from './TokenBudgetManager';
import { OnDeviceInferenceEngine } from './OnDeviceInferenceEngine';
import { PolicyEngine } from './PolicyEngine';
import { PolicyAgent, PolicyValidationRequest, PolicyValidationResult } from './edge/policy';
import { LocalRAGService } from './LocalRAGService';
import { CentralOrchestrator } from './CentralOrchestrator';
import { FederatedLearningManager } from './FederatedLearningManager';
import { UEBALiteService } from './UEBALiteService';
import { ModelLoader } from './edge/runtime/model-loader';
import SecurityManager from '../security/SecurityManager';
import CentralizedLoggingService from '../security/CentralizedLoggingService';
import DatabaseService, { DeviceProfile, Policy as DBPolicy, ModelArtifact, EdgeTelemetry } from './DatabaseService';

export interface EdgeAIConfig {
  maxTokensPerSession: number;
  modelVersion: string;
  policyVersion: string;
  deviceId: string;
  allowedModels: string[];
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface AITask {
  id: string;
  type: 'chat' | 'classification' | 'moderation' | 'recommendation';
  input: string | object;
  priority: 'low' | 'medium' | 'high' | 'critical';
  maxTokens?: number;
  requiresCloud?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AIResponse {
  taskId: string;
  result: unknown;
  tokensUsed: number;
  processingTime: number;
  source: 'edge' | 'cloud' | 'hybrid';
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface TelemetryData {
  taskType: string;
  tokensUsed: number;
  processingTime: number;
  accuracy?: number;
  errorRate?: number;
  deviceMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    batteryLevel?: number;
  };
  timestamp: number;
}

/**
 * مدى Edge AI Orchestrator - Central coordination for on-device AI with 200k token constraint
 * 
 * Features:
 * - On-device inference with ONNX/TensorFlow Lite
 * - Token budgeting (≤200k per session)
 * - Policy-driven governance
 * - Privacy-preserving telemetry
 * - Federated learning coordination
 * - Hybrid cloud fallback
 */
export class EdgeAIOrchestrator {
  private static instance: EdgeAIOrchestrator | null = null;
  private config: EdgeAIConfig;
  private tokenBudget: TokenBudgetManager;
  private inferenceEngine: OnDeviceInferenceEngine;
  private policyEngine: PolicyEngine;
  private policyAgent: PolicyAgent;
  private ragService: LocalRAGService;
  private centralOrchestrator: CentralOrchestrator;
  private federatedLearning: FederatedLearningManager;
  private uebaLite: UEBALiteService;
  private modelLoader: ModelLoader;
  private databaseService: DatabaseService;
  private isInitialized = false;
  private activeTasks = new Map<string, AITask>();
  private sessionStartTime = Date.now();
  private telemetryBuffer: TelemetryData[] = [];

  private constructor() {
    this.config = {
      maxTokensPerSession: 200000, // 200k token limit
      modelVersion: '1.0.0',
      policyVersion: '1.0.0',
      deviceId: '',
      allowedModels: ['chat-lite', 'moderation-v1', 'classification-v1'],
      securityLevel: 'high'
    };

    this.tokenBudget = new TokenBudgetManager(this.config.maxTokensPerSession);
    this.inferenceEngine = new OnDeviceInferenceEngine();
    this.policyEngine = new PolicyEngine();
    this.policyAgent = new PolicyAgent();
    this.ragService = new LocalRAGService();
    this.centralOrchestrator = new CentralOrchestrator();
    this.federatedLearning = new FederatedLearningManager();
    this.uebaLite = new UEBALiteService();
    this.modelLoader = ModelLoader.getInstance();
    this.databaseService = DatabaseService.getInstance();
  }

  static getInstance(): EdgeAIOrchestrator {
    if (!EdgeAIOrchestrator.instance) {
      EdgeAIOrchestrator.instance = new EdgeAIOrchestrator();
    }
    return EdgeAIOrchestrator.instance;
  }

  /**
   * Initialize the Edge AI system with security validation
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🤖 Initializing Mada Edge AI Orchestrator...');

      // Generate or retrieve device ID
      await this.initializeDeviceId();

      // Validate security requirements
      await this.validateSecurityRequirements();

      // Initialize core components
      await this.databaseService.initialize();
      await this.tokenBudget.initialize();
      await this.inferenceEngine.initialize();
      await this.policyEngine.initialize();
      await this.policyAgent.initialize();
      await this.ragService.initialize();
      await this.centralOrchestrator.initialize(this.config.deviceId);
      await this.federatedLearning.initialize();
      await this.uebaLite.initialize();

      // Initialize device profile in database
      await this.initializeDeviceProfile();

      // Load and validate policies
      await this.loadPolicies();

      // Load models using ModelLoader
      await this.loadModelsWithLoader();

      // Start telemetry collection
      this.startTelemetryCollection();

      this.isInitialized = true;
      console.log('✅ Edge AI Orchestrator initialized successfully');

      // Log initialization
      const loggingService = CentralizedLoggingService.getInstance();
      await loggingService.logSecurity('info', 'edge_ai_init', 'Edge AI system initialized', {
        deviceId: this.config.deviceId,
        modelVersion: this.config.modelVersion,
        policyVersion: this.config.policyVersion,
        maxTokens: this.config.maxTokensPerSession
      });

    } catch (error) {
      console.error('❌ Edge AI initialization failed:', error);
      throw new Error(`Edge AI initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process AI task with token budgeting and policy enforcement
   */
  async processTask(task: AITask): Promise<AIResponse> {
    if (!this.isInitialized) {
      throw new Error('Edge AI not initialized');
    }

    const startTime = Date.now();
    let tokensUsed = 0;
    let source: 'edge' | 'cloud' | 'hybrid' = 'edge';

    try {
      // Validate task against signed policies using PolicyAgent
      const policyRequest: PolicyValidationRequest = {
        taskId: task.id,
        taskType: task.type,
        input: task.input,
        maxTokens: task.maxTokens,
        userContext: {
          userId: 'current-user', // In real implementation, get from auth context
          role: 'user',
          securityLevel: this.config.securityLevel
        },
        deviceContext: {
          deviceId: this.config.deviceId,
          osVersion: Platform.Version.toString(),
          appVersion: '1.0.0', // In real implementation, get from app config
          securityFeatures: await this.getDeviceSecurityFeatures()
        }
      };

      const policyResult = await this.policyAgent.validateTask(policyRequest);
      if (!policyResult.allowed) {
        console.log(`🚫 Task ${task.id} blocked by policy: ${policyResult.reason}`);
        
        // Log policy violation
        await this.logPolicyViolation(task, policyResult);
        
        throw new Error(`Task blocked by policy: ${policyResult.reason}`);
      }

      console.log(`✅ Task ${task.id} approved by policy agent`);
      
      // Handle alternative actions if specified
      if (policyResult.alternativeActions && policyResult.alternativeActions.length > 0) {
        const cloudRedirect = policyResult.alternativeActions.find(action => action.type === 'redirect_cloud');
        if (cloudRedirect) {
          console.log(`☁️ Task ${task.id} redirected to cloud processing`);
          task.requiresCloud = true;
        }
      }

      // Estimate token usage
      const estimatedTokens = this.estimateTokenUsage(task);
      
      // Check token budget
      if (!this.tokenBudget.canAllocate(estimatedTokens)) {
        // Try cloud fallback if allowed
        if (task.requiresCloud !== false && this.config.securityLevel !== 'critical') {
          return await this.processCloudTask(task);
        }
        throw new Error('Token budget exceeded and cloud fallback not available');
      }

      // Reserve tokens
      this.tokenBudget.allocate(estimatedTokens);
      this.activeTasks.set(task.id, task);

      let result: unknown;
      let confidence = 0;

      // Determine processing strategy
      if (this.shouldUseEdgeProcessing(task)) {
        // Process on-device
        result = await this.processEdgeTask(task);
        confidence = 0.9; // High confidence for on-device processing
        source = 'edge';
      } else if (this.shouldUseHybridProcessing(task)) {
        // Hybrid processing
        result = await this.processHybridTask(task);
        confidence = 0.85;
        source = 'hybrid';
      } else {
        // Cloud processing
        result = await this.processCloudTask(task);
        confidence = 0.95;
        source = 'cloud';
      }

      // Calculate actual tokens used
      tokensUsed = this.calculateActualTokens(task, result);
      
      // Update token budget
      this.tokenBudget.release(estimatedTokens - tokensUsed);

      const processingTime = Date.now() - startTime;

      // Record UEBA event for AI task
      await this.uebaLite.recordEvent('ai_task', {
        taskType: task.type,
        tokensUsed,
        processingTime,
        source,
        confidence,
        riskScore: this.calculateTaskRiskScore(task, result)
      });

      // Create response
      const response: AIResponse = {
        taskId: task.id,
        result,
        tokensUsed,
        processingTime,
        source,
        confidence,
        metadata: {
          policyVersion: this.config.policyVersion,
          modelVersion: this.config.modelVersion
        }
      };

      // Collect telemetry
      await this.collectTelemetry(task, response);

      // Clean up
      this.activeTasks.delete(task.id);

      return response;

    } catch (error) {
      // Release allocated tokens on error
      if (tokensUsed > 0) {
        this.tokenBudget.release(tokensUsed);
      }
      this.activeTasks.delete(task.id);

      console.error('❌ Task processing failed:', error);
      throw error;
    }
  }

  /**
   * Get ModelLoader statistics
   */
  getModelLoaderStats() {
    return this.modelLoader.getStats();
  }
  
  /**
   * Get available models from ModelLoader
   */
  async getAvailableModels() {
    return await this.modelLoader.getAvailableModels();
  }
  
  /**
   * Load specific model by ID
   */
  async loadSpecificModel(modelId: string, forceReload = false) {
    try {
      const loadedModel = await this.modelLoader.loadModel(modelId, forceReload);
      
      // Convert to inference engine format and load
      const modelInfo = {
        id: loadedModel.id,
        name: loadedModel.name,
        version: loadedModel.version,
        type: this.getModelType(loadedModel.metadata),
        size: await this.getModelSize(loadedModel.localPath),
        capabilities: this.getModelCapabilities(loadedModel.metadata),
        quantization: loadedModel.metadata.quantization,
        signature: loadedModel.metadata.signature,
        localPath: loadedModel.localPath
      };
      
      await this.inferenceEngine.loadModels([modelInfo]);
      
      console.log(`✅ Specific model loaded: ${modelInfo.name}`);
      return loadedModel;
    } catch (error) {
      console.error(`❌ Failed to load specific model ${modelId}:`, error);
      throw error;
    }
  }
  
  /**
   * Unload specific model
   */
  async unloadSpecificModel(modelId: string) {
    try {
      await this.modelLoader.unloadModel(modelId);
      console.log(`✅ Model unloaded: ${modelId}`);
    } catch (error) {
      console.error(`❌ Failed to unload model ${modelId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get current system status
   */
  getStatus() {
    const uebaStatus = this.uebaLite ? this.uebaLite.getBehaviorSummary() : null;
    
    return {
      isInitialized: this.isInitialized,
      tokenBudget: this.tokenBudget.getStatus(),
      activeTasks: this.activeTasks.size,
      sessionUptime: Date.now() - this.sessionStartTime,
      config: {
        ...this.config,
        deviceId: this.config.deviceId.substring(0, 8) + '...' // Partial for privacy
      },
      modelLoader: this.modelLoader.getStats(),
      telemetryBufferSize: this.telemetryBuffer.length,
      behaviorAnalytics: uebaStatus ? {
        riskScore: uebaStatus.riskAssessment.score,
        riskLevel: uebaStatus.riskAssessment.level,
        recentEvents: uebaStatus.recentEvents,
        recentAnomalies: uebaStatus.recentAnomalies,
        topPatterns: uebaStatus.topPatterns
      } : null
    };
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    if (!this.isInitialized) return null;
    return await this.databaseService.getDatabaseStats();
  }

  /**
   * Get telemetry summary
   */
  async getTelemetrySummary(timeRange?: number) {
    if (!this.isInitialized) return null;
    return await this.databaseService.getTelemetrySummary(this.config.deviceId, timeRange);
  }

  /**
   * Update policies from central orchestrator
   */
  async updatePolicies(): Promise<void> {
    try {
      const newPolicies = await this.centralOrchestrator.fetchPolicies();
      await this.policyEngine.updatePolicies(newPolicies);
      
      console.log('✅ Policies updated successfully');
    } catch (error) {
      console.error('❌ Policy update failed:', error);
      throw error;
    }
  }

  /**
   * Update models from central orchestrator using ModelLoader
   */
  async updateModels(): Promise<void> {
    try {
      const availableModels = await this.centralOrchestrator.fetchAvailableModels();
      
      // Store new model artifacts in database
      for (const model of availableModels) {
        const artifact: ModelArtifact = {
          id: model.id,
          name: model.name,
          version: model.version,
          target_hw: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
          quantization: model.quantization || '8bit',
          url: `https://models.mada.com/${model.name}/${model.version}`,
          sha256: model.signature || 'mock_sha256',
          signature: model.signature || 'model_signature'
        };
        
        await this.databaseService.insertModelArtifact(artifact);
      }
      
      // Update inference engine with new models
      await this.inferenceEngine.updateModels(availableModels);
      
      console.log('✅ Models updated successfully with ModelLoader');
    } catch (error) {
      console.error('❌ Model update failed:', error);
      throw error;
    }
  }

  /**
   * Participate in federated learning
   */
  async participateInFederatedLearning(): Promise<void> {
    if (this.config.securityLevel === 'critical') {
      console.log('🔒 Federated learning disabled for critical security level');
      return;
    }

    try {
      await this.federatedLearning.participateInRound();
      console.log('✅ Federated learning participation completed');
    } catch (error) {
      console.error('❌ Federated learning failed:', error);
    }
  }

  // Private methods

  private async initializeDeviceId(): Promise<void> {
    let deviceId = await AsyncStorage.getItem('edge_ai_device_id');
    
    if (!deviceId) {
      // Generate secure device ID
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      deviceId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        randomBytes.join('') + Date.now().toString()
      );
      await AsyncStorage.setItem('edge_ai_device_id', deviceId);
    }

    this.config.deviceId = deviceId;
  }

  private async validateSecurityRequirements(): Promise<void> {
    const securityManager = SecurityManager.getInstance();
    const securityStatus = await securityManager.forceSecurityCheck();

    if (securityStatus.securityStatus.riskLevel === 'critical') {
      throw new Error('Cannot initialize Edge AI with critical security threats');
    }

    // Adjust security level based on device security
    if (securityStatus.securityStatus.riskLevel === 'high') {
      this.config.securityLevel = 'high';
    }
  }

  private async loadPolicies(): Promise<void> {
    try {
      // Load policies from central orchestrator
      const remotePolicies = await this.centralOrchestrator.fetchPolicies();
      
      // Store policies in database
      for (const policy of remotePolicies) {
        const dbPolicy: DBPolicy = {
          id: policy.id,
          version: policy.version,
          rules: policy.rules || {},
          signature: policy.signature || 'default_signature',
          created_at: Date.now(),
          expires_at: policy.validUntil || (Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
        
        await this.databaseService.insertPolicy(dbPolicy);
      }
      
      await this.policyEngine.loadPolicies(remotePolicies);
    } catch (error) {
      console.warn('⚠️ Failed to load remote policies, using cached/defaults');
      
      // Try to load from database
      const cachedPolicies = await this.databaseService.getActivePolicies();
      if (cachedPolicies.length > 0) {
        console.log(`📋 Loaded ${cachedPolicies.length} cached policies`);
        // Convert DB policies to policy engine format
        const enginePolicies = cachedPolicies.map(p => ({
          id: p.id,
          version: p.version,
          name: `Policy ${p.version}`,
          signature: p.signature,
          validFrom: p.created_at,
          validUntil: p.expires_at,
          securityLevel: 'medium' as const,
          rules: []
        }));
        await this.policyEngine.loadPolicies(enginePolicies);
      } else {
        await this.policyEngine.loadDefaultPolicies();
      }
    }
  }

  /**
   * Load models using the secure ModelLoader with signature verification
   */
  private async loadModelsWithLoader(): Promise<void> {
    try {
      console.log('🔐 Loading models with signature verification...');
      
      // Get compatible models from ModelLoader
      const compatibleModels = await this.modelLoader.getCompatibleModels();
      
      if (compatibleModels.length === 0) {
        console.warn('⚠️ No compatible models found, fetching from central orchestrator');
        await this.fetchAndStoreRemoteModels();
        return;
      }
      
      console.log(`🤖 Found ${compatibleModels.length} compatible models`);
      
      // Load essential models for basic functionality
      const essentialModels = compatibleModels.filter(model => 
        this.config.allowedModels.some(allowed => model.name.includes(allowed))
      );
      
      for (const modelArtifact of essentialModels.slice(0, 3)) { // Load max 3 models initially
        try {
          console.log(`📥 Loading model: ${modelArtifact.name} v${modelArtifact.version}`);
          
          const loadedModel = await this.modelLoader.loadModel(modelArtifact.id);
          
          // Convert to inference engine format
          const modelInfo = {
            id: loadedModel.id,
            name: loadedModel.name,
            version: loadedModel.version,
            type: this.getModelType(loadedModel.metadata),
            size: await this.getModelSize(loadedModel.localPath),
            capabilities: this.getModelCapabilities(loadedModel.metadata),
            quantization: loadedModel.metadata.quantization,
            signature: loadedModel.metadata.signature,
            localPath: loadedModel.localPath
          };
          
          // Load into inference engine
          await this.inferenceEngine.loadModels([modelInfo]);
          
          console.log(`✅ Model loaded successfully: ${modelInfo.name}`);
          
        } catch (error) {
          console.error(`❌ Failed to load model ${modelArtifact.name}:`, error);
          // Continue with other models
        }
      }
      
      // Clean up old model files
      await this.modelLoader.cleanupOldModels(168); // 7 days
      
    } catch (error) {
      console.error('❌ Failed to load models with ModelLoader:', error);
      
      // Fallback to cached models
      await this.loadCachedModels();
    }
  }
  
  /**
   * Fetch and store remote models when no local models are available
   */
  private async fetchAndStoreRemoteModels(): Promise<void> {
    try {
      const remoteModels = await this.centralOrchestrator.fetchAvailableModels();
      
      // Store model artifacts in database with proper signatures
      for (const model of remoteModels) {
        const artifact: ModelArtifact = {
          id: model.id,
          name: model.name,
          version: model.version,
          target_hw: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
          quantization: model.quantization || '8bit',
          url: `https://models.mada.com/${model.name}/${model.version}`,
          sha256: await this.generateModelHash(model),
          signature: model.signature || await this.generateModelSignature(model)
        };
        
        await this.databaseService.insertModelArtifact(artifact);
      }
      
      console.log(`📦 Stored ${remoteModels.length} model artifacts`);
      
      // Now try to load them with ModelLoader
      await this.loadModelsWithLoader();
      
    } catch (error) {
      console.error('❌ Failed to fetch remote models:', error);
      await this.loadCachedModels();
    }
  }
  
  /**
   * Fallback to load cached models without signature verification
   */
  private async loadCachedModels(): Promise<void> {
    try {
      console.log('🔄 Loading cached models as fallback...');
      
      const hwClass = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
      const cachedModels = await this.databaseService.getModelArtifactsByHardware(hwClass);
      
      if (cachedModels.length > 0) {
        console.log(`🤖 Found ${cachedModels.length} cached models`);
        
        const modelInfos = cachedModels.map(a => ({
          id: a.id,
          name: a.name,
          version: a.version,
          type: 'onnx' as const,
          size: 25 * 1024 * 1024, // Default size
          capabilities: ['chat', 'classification'],
          quantization: a.quantization,
          signature: a.signature
        }));
        
        await this.inferenceEngine.loadModels(modelInfos);
      } else {
        console.log('📱 Loading default embedded models...');
        await this.inferenceEngine.loadCachedModels();
      }
    } catch (error) {
      console.error('❌ Failed to load cached models:', error);
      // Load minimal default models
      await this.inferenceEngine.loadCachedModels();
    }
  }
  
  /**
   * Get model type from artifact metadata
   */
  private getModelType(metadata: ModelArtifact): 'onnx' | 'tflite' | 'coreml' {
    const name = metadata.name.toLowerCase();
    if (name.includes('onnx')) return 'onnx';
    if (name.includes('tflite')) return 'tflite';
    if (name.includes('coreml')) return 'coreml';
    return 'onnx'; // default
  }
  
  /**
   * Get model capabilities from metadata
   */
  private getModelCapabilities(metadata: ModelArtifact): string[] {
    const capabilities: string[] = [];
    const name = metadata.name.toLowerCase();
    
    if (name.includes('chat')) capabilities.push('chat');
    if (name.includes('classification')) capabilities.push('classification');
    if (name.includes('moderation')) capabilities.push('moderation');
    if (name.includes('recommendation')) capabilities.push('recommendation');
    if (name.includes('embedding')) capabilities.push('embedding');
    
    return capabilities.length > 0 ? capabilities : ['general'];
  }
  
  /**
   * Get model file size
   */
  private async getModelSize(localPath: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      return fileInfo.size || 0;
    } catch {
      return 0;
    }
  }
  
  /**
   * Generate model hash for verification
   */
  private async generateModelHash(model: any): Promise<string> {
    const modelData = JSON.stringify({
      id: model.id,
      name: model.name,
      version: model.version,
      type: model.type
    });
    
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      modelData
    );
  }
  
  /**
   * Generate model signature (mock implementation)
   */
  private async generateModelSignature(model: any): Promise<string> {
    // In production, this would be done by the central orchestrator with proper signing keys
    const signatureData = `${model.id}-${model.version}-${Date.now()}`;
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      signatureData
    );
  }

  private estimateTokenUsage(task: AITask): number {
    const baseTokens = {
      'chat': 1000,
      'classification': 200,
      'moderation': 300,
      'recommendation': 500
    };

    let estimate = baseTokens[task.type] || 500;

    // Adjust based on input size
    if (typeof task.input === 'string') {
      estimate += Math.ceil(task.input.length / 4); // Rough token estimation
    }

    // Apply safety margin
    return Math.ceil(estimate * 1.2);
  }

  private shouldUseEdgeProcessing(task: AITask): boolean {
    // Use edge for simple tasks and when security level is critical
    return (
      task.type === 'classification' ||
      task.type === 'moderation' ||
      this.config.securityLevel === 'critical' ||
      task.requiresCloud === false
    );
  }

  private shouldUseHybridProcessing(task: AITask): boolean {
    // Use hybrid for medium complexity tasks
    return (
      task.type === 'recommendation' &&
      this.config.securityLevel !== 'critical' &&
      task.requiresCloud !== false
    );
  }

  private async processEdgeTask(task: AITask): Promise<unknown> {
    // Add RAG context if available
    const ragContext = await this.ragService.getRelevantContext(task.input);
    
    return await this.inferenceEngine.process(task, ragContext);
  }

  private async processHybridTask(task: AITask): Promise<unknown> {
    // Process locally first, then enhance with cloud if needed
    const edgeResult = await this.processEdgeTask(task);
    
    // Determine if cloud enhancement is needed
    if (this.needsCloudEnhancement(edgeResult)) {
      const cloudResult = await this.processCloudTask(task);
      return this.mergeResults(edgeResult, cloudResult);
    }

    return edgeResult;
  }

  private async processCloudTask(task: AITask): Promise<unknown> {
    return await this.centralOrchestrator.processTask(task);
  }

  private needsCloudEnhancement(result: unknown): boolean {
    // Simple heuristic - enhance if confidence is low
    if (typeof result === 'object' && result !== null && 'confidence' in result) {
      return (result as { confidence: number }).confidence < 0.8;
    }
    return false;
  }

  private mergeResults(edgeResult: unknown, cloudResult: unknown): unknown {
    // Simple merge strategy - prefer cloud result but keep edge metadata
    return {
      result: cloudResult,
      edgeResult,
      source: 'hybrid'
    };
  }

  private calculateActualTokens(task: AITask, result: unknown): number {
    // Calculate based on input and output size
    let tokens = 0;

    if (typeof task.input === 'string') {
      tokens += Math.ceil(task.input.length / 4);
    }

    if (typeof result === 'string') {
      tokens += Math.ceil(result.length / 4);
    }

    return Math.max(tokens, 50); // Minimum token usage
  }

  private async collectTelemetry(task: AITask, response: AIResponse): Promise<void> {
    const telemetry: TelemetryData = {
      taskType: task.type,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
      deviceMetrics: {
        memoryUsage: this.getMemoryUsage(),
        cpuUsage: this.getCPUUsage(),
        batteryLevel: await this.getBatteryLevel()
      },
      timestamp: Date.now()
    };

    // Store in database
    const dbTelemetry: EdgeTelemetry = {
      id: await Crypto.randomUUID(),
      device_id: this.config.deviceId,
      policy_version: this.config.policyVersion,
      model_version: this.config.modelVersion,
      metrics: {
        taskType: task.type,
        tokensUsed: response.tokensUsed,
        processingTime: response.processingTime,
        source: response.source,
        confidence: response.confidence,
        memoryUsage: telemetry.deviceMetrics.memoryUsage,
        cpuUsage: telemetry.deviceMetrics.cpuUsage,
        batteryLevel: telemetry.deviceMetrics.batteryLevel
      },
      created_at: Date.now()
    };

    await this.databaseService.insertTelemetry(dbTelemetry);
    this.telemetryBuffer.push(telemetry);

    // Send telemetry when buffer is full
    if (this.telemetryBuffer.length >= 10) {
      await this.sendTelemetry();
    }
  }

  private startTelemetryCollection(): void {
    // Send telemetry every 5 minutes
    setInterval(async () => {
      if (this.telemetryBuffer.length > 0) {
        await this.sendTelemetry();
      }
    }, 5 * 60 * 1000);
  }

  private async sendTelemetry(): Promise<void> {
    if (this.telemetryBuffer.length === 0) return;

    try {
      // Anonymize telemetry data
      const anonymizedTelemetry = this.anonymizeTelemetry(this.telemetryBuffer);
      
      await this.centralOrchestrator.sendTelemetry(anonymizedTelemetry);
      
      // Clear buffer after successful send
      this.telemetryBuffer = [];
      
      console.log('📊 Telemetry sent successfully');
    } catch (error) {
      console.error('❌ Telemetry send failed:', error);
      
      // Keep only recent telemetry if send fails
      if (this.telemetryBuffer.length > 50) {
        this.telemetryBuffer = this.telemetryBuffer.slice(-25);
      }
    }
  }

  private anonymizeTelemetry(telemetry: TelemetryData[]): unknown {
    // Remove identifying information and aggregate data
    const aggregated = {
      totalTasks: telemetry.length,
      avgTokensUsed: telemetry.reduce((sum, t) => sum + t.tokensUsed, 0) / telemetry.length,
      avgProcessingTime: telemetry.reduce((sum, t) => sum + t.processingTime, 0) / telemetry.length,
      taskTypes: telemetry.reduce((acc, t) => {
        acc[t.taskType] = (acc[t.taskType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      deviceMetrics: {
        avgMemoryUsage: telemetry.reduce((sum, t) => sum + t.deviceMetrics.memoryUsage, 0) / telemetry.length,
        avgCpuUsage: telemetry.reduce((sum, t) => sum + t.deviceMetrics.cpuUsage, 0) / telemetry.length
      },
      timeRange: {
        start: Math.min(...telemetry.map(t => t.timestamp)),
        end: Math.max(...telemetry.map(t => t.timestamp))
      }
    };

    return aggregated;
  }

  private getMemoryUsage(): number {
    // Platform-specific memory usage
    if (Platform.OS === 'web') {
      return (performance as any).memory?.usedJSHeapSize || 0;
    }
    return 0; // Would use native modules on mobile
  }

  private getCPUUsage(): number {
    // Simplified CPU usage estimation
    return Math.random() * 100; // Would use native modules for real data
  }

  private async getBatteryLevel(): Promise<number | undefined> {
    if (Platform.OS === 'web') {
      try {
        const battery = await (navigator as any).getBattery?.();
        return battery?.level * 100;
      } catch {
        return undefined;
      }
    }
    return undefined; // Would use expo-battery on mobile
  }

  private calculateTaskRiskScore(task: AITask, result: unknown): number {
    let riskScore = 0;

    // Base risk by task type
    const taskRisk = {
      'chat': 30,
      'classification': 10,
      'moderation': 5,
      'recommendation': 20
    };

    riskScore += taskRisk[task.type] || 15;

    // Input size risk
    if (typeof task.input === 'string' && task.input.length > 10000) {
      riskScore += 20;
    }

    // Priority risk
    const priorityRisk = {
      'low': 0,
      'medium': 10,
      'high': 20,
      'critical': 40
    };

    riskScore += priorityRisk[task.priority] || 0;

    // Result confidence (lower confidence = higher risk)
    if (typeof result === 'object' && result !== null && 'confidence' in result) {
      const confidence = (result as { confidence: number }).confidence;
      riskScore += (1 - confidence) * 30;
    }

    return Math.min(riskScore, 100);
  }

  /**
   * Initialize device profile in database
   */
  private async initializeDeviceProfile(): Promise<void> {
    try {
      const profile: DeviceProfile = {
        device_id: this.config.deviceId,
        hw_class: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
        os_version: Platform.Version?.toString() || 'unknown',
        app_version: '1.0.0', // Would get from app.json
        llm_variant: 'chat-lite-v1',
        rag_budget_tokens: this.config.maxTokensPerSession,
        last_seen: Date.now()
      };

      await this.databaseService.upsertDeviceProfile(profile);
      console.log('📱 Device profile initialized in database');
    } catch (error) {
      console.error('❌ Failed to initialize device profile:', error);
    }
  }

  /**
   * Get UEBA behavior summary
   */
  getBehaviorSummary() {
    return this.uebaLite ? this.uebaLite.getBehaviorSummary() : null;
  }

  /**
   * Get recent anomalies from UEBA
   */
  getRecentAnomalies() {
    return this.uebaLite ? this.uebaLite.getRecentAnomalies() : [];
  }

  /**
   * Get device security features for policy validation
   */
  private async getDeviceSecurityFeatures(): Promise<string[]> {
    const features: string[] = [];
    
    try {
      const securityManager = SecurityManager.getInstance();
      const securityStatus = await securityManager.forceSecurityCheck();
      
      // Add security features based on device capabilities
      if (Platform.OS === 'ios') {
        features.push('secure-enclave', 'biometric-auth', 'app-transport-security');
      } else if (Platform.OS === 'android') {
        features.push('hardware-security-module', 'biometric-auth', 'verified-boot');
      } else {
        features.push('web-crypto-api', 'secure-context');
      }
      
      // Add features based on security status
      if (securityStatus.securityStatus.riskLevel === 'low') {
        features.push('high-security-level');
      }
      
      if (securityStatus.securityStatus.deviceBinding) {
        features.push('device-binding');
      }
      
      if (securityStatus.securityStatus.rootDetection === false) {
        features.push('integrity-verified');
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to get device security features:', error);
      // Return minimal features on error
      features.push('basic-security');
    }
    
    return features;
  }

  /**
   * Log policy violation for security monitoring
   */
  private async logPolicyViolation(task: AITask, policyResult: PolicyValidationResult): Promise<void> {
    try {
      const loggingService = CentralizedLoggingService.getInstance();
      
      await loggingService.logSecurity('warning', 'policy_violation', 'AI task blocked by policy', {
        taskId: task.id,
        taskType: task.type,
        reason: policyResult.reason,
        appliedRules: policyResult.appliedRules,
        policyVersion: policyResult.policyVersion,
        deviceId: this.config.deviceId.substring(0, 8) + '...', // Partial for privacy
        timestamp: policyResult.validationTimestamp
      });
      
      // Record UEBA event for policy violation
      await this.uebaLite.recordEvent('policy_violation', {
        taskType: task.type,
        reason: policyResult.reason,
        riskScore: 80, // High risk score for policy violations
        appliedRules: policyResult.appliedRules.length
      });
      
    } catch (error) {
      console.error('❌ Failed to log policy violation:', error);
    }
  }
}

export default EdgeAIOrchestrator;