import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModelLoader } from '../runtime/model-loader';
import { PolicyAgent, PolicyValidationRequest } from '../policy/agent';
import { getEdgeRAGService } from '../rag/index';

// Types for LLM interface
export interface LLMConfig {
  modelId: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  maxResponseTime: number; // milliseconds
  enableRAG: boolean;
  enableModeration: boolean;
}

export interface LLMRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  context?: string;
  taskType: string;
  userId?: string;
}

export interface LLMResponse {
  text: string;
  tokensUsed: number;
  responseTime: number;
  model: string;
  confidence?: number;
  moderationFlags?: string[];
  ragUsed: boolean;
}

export interface ModerationResult {
  isClean: boolean;
  flags: string[];
  confidence: number;
  categories: {
    harassment: number;
    hate: number;
    selfHarm: number;
    sexual: number;
    violence: number;
  };
}

// Platform-specific model interfaces
interface ONNXModel {
  type: 'onnx';
  session: any; // ONNX Runtime session
}

interface TFLiteModel {
  type: 'tflite';
  interpreter: any; // TensorFlow Lite interpreter
}

interface CoreMLModel {
  type: 'coreml';
  model: any; // Core ML model
}

type LoadedModel = ONNXModel | TFLiteModel | CoreMLModel;

/**
 * LocalLLM - Lightweight on-device LLM with unified interface
 * 
 * Features:
 * - 4-8bit quantized models for mobile efficiency
 * - <300ms response time for short conversations (≤256 tokens)
 * - Cross-platform support (ONNX/TFLite/CoreML)
 * - Built-in content moderation
 * - RAG integration for context enhancement
 * - Policy enforcement integration
 */
export class LocalLLM {
  private static instance: LocalLLM;
  private config: LLMConfig;
  private modelLoader: ModelLoader;
  private policyAgent: PolicyAgent;
  private loadedModel: LoadedModel | null = null;
  private isInitialized = false;
  private moderationModel: LoadedModel | null = null;
  private ragService = getEdgeRAGService();

  private constructor(config: LLMConfig) {
    this.config = {
      maxTokens: 256,
      temperature: 0.7,
      topP: 0.9,
      maxResponseTime: 300,
      enableRAG: true,
      enableModeration: true,
      ...config
    };
    
    this.modelLoader = ModelLoader.getInstance();
    this.policyAgent = new PolicyAgent();
  }

  public static getInstance(config?: LLMConfig): LocalLLM {
    if (!LocalLLM.instance) {
      if (!config) {
        throw new Error('LocalLLM config required for first initialization');
      }
      LocalLLM.instance = new LocalLLM(config);
    }
    return LocalLLM.instance;
  }

  /**
   * Initialize the LLM system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🤖 Initializing LocalLLM...');
      const startTime = Date.now();

      // Initialize dependencies
      await this.policyAgent.initialize();
      await this.ragService.initialize();

      // Load main LLM model
      await this.loadMainModel();

      // Load moderation model if enabled
      if (this.config.enableModeration) {
        await this.loadModerationModel();
      }

      this.isInitialized = true;
      const initTime = Date.now() - startTime;
      console.log(`✅ LocalLLM initialized in ${initTime}ms`);

    } catch (error) {
      console.error('❌ LocalLLM initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate text response with policy enforcement
   */
  public async generate(request: LLMRequest): Promise<LLMResponse> {
    if (!this.isInitialized) {
      throw new Error('LocalLLM not initialized');
    }

    const startTime = Date.now();
    let ragUsed = false;

    try {
      console.log(`🎯 Generating response for task: ${request.taskType}`);

      // Policy validation
      const policyRequest: PolicyValidationRequest = {
        taskId: `llm-${Date.now()}`,
        taskType: request.taskType,
        input: request.prompt,
        maxTokens: request.maxTokens || this.config.maxTokens,
        userContext: request.userId ? {
          userId: request.userId,
          role: 'user',
          securityLevel: 'standard'
        } : undefined
      };

      const policyResult = await this.policyAgent.validateTask(policyRequest);
      
      if (!policyResult.allowed) {
        throw new Error(`Policy violation: ${policyResult.reason}`);
      }

      // Content moderation on input
      if (this.config.enableModeration) {
        const moderationResult = await this.moderateContent(request.prompt);
        if (!moderationResult.isClean) {
          throw new Error(`Content moderation failed: ${moderationResult.flags.join(', ')}`);
        }
      }

      // RAG context enhancement
      let enhancedContext = request.context || '';
      if (this.config.enableRAG && request.prompt.length > 10) {
        const ragContext = await this.ragService.generateContext(
          request.prompt,
          Math.floor((request.maxTokens || this.config.maxTokens) * 0.3) // 30% of tokens for context
        );
        if (ragContext) {
          enhancedContext = ragContext + '\n\n' + enhancedContext;
          ragUsed = true;
        }
      }

      // Generate response
      const response = await this.runInference({
        ...request,
        context: enhancedContext
      });

      // Content moderation on output
      if (this.config.enableModeration) {
        const outputModeration = await this.moderateContent(response.text);
        if (!outputModeration.isClean) {
          console.warn('⚠️ Generated content flagged by moderation');
          response.moderationFlags = outputModeration.flags;
        }
      }

      const responseTime = Date.now() - startTime;
      console.log(`✅ Response generated in ${responseTime}ms (${response.tokensUsed} tokens)`);

      return {
        ...response,
        responseTime,
        ragUsed
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Generation failed after ${responseTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Moderate content for safety
   */
  public async moderateContent(text: string): Promise<ModerationResult> {
    if (!this.moderationModel) {
      // Fallback to simple keyword-based moderation
      return this.simpleModeration(text);
    }

    try {
      // Run moderation model inference
      const result = await this.runModerationInference(text);
      return result;
    } catch (error) {
      console.warn('⚠️ Moderation model failed, using fallback:', error);
      return this.simpleModeration(text);
    }
  }

  /**
   * Get model information and statistics
   */
  public getModelInfo(): {
    modelId: string;
    type: string;
    isLoaded: boolean;
    config: LLMConfig;
    platform: string;
  } {
    return {
      modelId: this.config.modelId,
      type: this.loadedModel?.type || 'none',
      isLoaded: !!this.loadedModel,
      config: this.config,
      platform: Platform.OS
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 LocalLLM config updated');
  }

  // Private methods

  private async loadMainModel(): Promise<void> {
    try {
      console.log(`📥 Loading main LLM model: ${this.config.modelId}`);
      
      const modelArtifact = await this.modelLoader.loadModel(this.config.modelId);
      
      // Platform-specific model loading
      if (Platform.OS === 'ios') {
        this.loadedModel = await this.loadCoreMLModel(modelArtifact.localPath);
      } else if (Platform.OS === 'android') {
        this.loadedModel = await this.loadTFLiteModel(modelArtifact.localPath);
      } else {
        // Web fallback to ONNX
        this.loadedModel = await this.loadONNXModel(modelArtifact.localPath);
      }
      
      console.log(`✅ Main model loaded: ${this.loadedModel.type}`);
    } catch (error) {
      console.error('❌ Failed to load main model:', error);
      throw error;
    }
  }

  private async loadModerationModel(): Promise<void> {
    try {
      console.log('📥 Loading moderation model...');
      
      // Try to load a lightweight moderation model
      const moderationModelId = 'moderation-model-v1';
      
      try {
        const modelArtifact = await this.modelLoader.loadModel(moderationModelId);
        
        if (Platform.OS === 'ios') {
          this.moderationModel = await this.loadCoreMLModel(modelArtifact.localPath);
        } else if (Platform.OS === 'android') {
          this.moderationModel = await this.loadTFLiteModel(modelArtifact.localPath);
        } else {
          this.moderationModel = await this.loadONNXModel(modelArtifact.localPath);
        }
        
        console.log('✅ Moderation model loaded');
      } catch (error) {
        console.warn('⚠️ Moderation model not available, using fallback');
        this.moderationModel = null;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load moderation model:', error);
      this.moderationModel = null;
    }
  }

  private async loadONNXModel(modelPath: string): Promise<ONNXModel> {
    // Placeholder for ONNX Runtime integration
    console.log(`📱 Loading ONNX model from: ${modelPath}`);
    
    // In production, would use actual ONNX Runtime
    const mockSession = {
      run: async (inputs: any) => {
        // Mock inference
        return { output: new Float32Array(256) };
      }
    };
    
    return {
      type: 'onnx',
      session: mockSession
    };
  }

  private async loadTFLiteModel(modelPath: string): Promise<TFLiteModel> {
    // Placeholder for TensorFlow Lite integration
    console.log(`🤖 Loading TFLite model from: ${modelPath}`);
    
    // In production, would use actual TensorFlow Lite
    const mockInterpreter = {
      invoke: async (inputs: any) => {
        // Mock inference
        return new Float32Array(256);
      }
    };
    
    return {
      type: 'tflite',
      interpreter: mockInterpreter
    };
  }

  private async loadCoreMLModel(modelPath: string): Promise<CoreMLModel> {
    // Placeholder for Core ML integration
    console.log(`🍎 Loading Core ML model from: ${modelPath}`);
    
    // In production, would use actual Core ML
    const mockModel = {
      predict: async (inputs: any) => {
        // Mock inference
        return { output: new Float32Array(256) };
      }
    };
    
    return {
      type: 'coreml',
      model: mockModel
    };
  }

  private async runInference(request: LLMRequest): Promise<Omit<LLMResponse, 'responseTime' | 'ragUsed'>> {
    if (!this.loadedModel) {
      throw new Error('No model loaded');
    }

    const startTime = Date.now();
    
    try {
      // Prepare input
      const input = this.prepareInput(request);
      
      // Run model-specific inference
      let output: any;
      switch (this.loadedModel.type) {
        case 'onnx':
          output = await this.loadedModel.session.run(input);
          break;
        case 'tflite':
          output = await this.loadedModel.interpreter.invoke(input);
          break;
        case 'coreml':
          output = await this.loadedModel.model.predict(input);
          break;
        default:
          throw new Error('Unknown model type');
      }
      
      // Process output
      const response = this.processOutput(output, request);
      
      const inferenceTime = Date.now() - startTime;
      console.log(`⚡ Inference completed in ${inferenceTime}ms`);
      
      return response;
      
    } catch (error) {
      console.error('❌ Inference failed:', error);
      throw error;
    }
  }

  private prepareInput(request: LLMRequest): any {
    // Tokenize and prepare input for the model
    const fullPrompt = [
      request.systemPrompt && `System: ${request.systemPrompt}`,
      request.context && `Context: ${request.context}`,
      `User: ${request.prompt}`,
      'Assistant:'
    ].filter(Boolean).join('\n\n');
    
    // Mock tokenization - in production would use actual tokenizer
    const tokens = this.mockTokenize(fullPrompt);
    
    return {
      input_ids: new Int32Array(tokens),
      attention_mask: new Int32Array(tokens.map(() => 1))
    };
  }

  private processOutput(output: any, request: LLMRequest): Omit<LLMResponse, 'responseTime' | 'ragUsed'> {
    // Mock text generation - in production would decode actual model output
    const responses = [
      "I understand your question. Let me help you with that.",
      "That's an interesting point. Here's what I think about it.",
      "Based on the information provided, I can suggest the following.",
      "I'd be happy to assist you with this request.",
      "Let me provide you with a helpful response."
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    const tokensUsed = this.mockTokenize(randomResponse).length;
    
    return {
      text: randomResponse,
      tokensUsed,
      model: this.config.modelId,
      confidence: 0.85 + Math.random() * 0.1 // Mock confidence
    };
  }

  private async runModerationInference(text: string): Promise<ModerationResult> {
    if (!this.moderationModel) {
      throw new Error('No moderation model loaded');
    }

    // Mock moderation inference
    const input = { text };
    
    let output: any;
    switch (this.moderationModel.type) {
      case 'onnx':
        output = await this.moderationModel.session.run(input);
        break;
      case 'tflite':
        output = await this.moderationModel.interpreter.invoke(input);
        break;
      case 'coreml':
        output = await this.moderationModel.model.predict(input);
        break;
    }
    
    // Mock moderation result
    return {
      isClean: Math.random() > 0.1, // 90% clean rate
      flags: [],
      confidence: 0.9,
      categories: {
        harassment: Math.random() * 0.1,
        hate: Math.random() * 0.1,
        selfHarm: Math.random() * 0.05,
        sexual: Math.random() * 0.1,
        violence: Math.random() * 0.1
      }
    };
  }

  private simpleModeration(text: string): ModerationResult {
    const flags: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Simple keyword-based moderation
    const harmfulKeywords = ['hate', 'violence', 'harm', 'illegal'];
    
    for (const keyword of harmfulKeywords) {
      if (lowerText.includes(keyword)) {
        flags.push(keyword);
      }
    }
    
    return {
      isClean: flags.length === 0,
      flags,
      confidence: 0.7,
      categories: {
        harassment: flags.includes('hate') ? 0.8 : 0.1,
        hate: flags.includes('hate') ? 0.9 : 0.1,
        selfHarm: flags.includes('harm') ? 0.7 : 0.05,
        sexual: 0.05,
        violence: flags.includes('violence') ? 0.8 : 0.1
      }
    };
  }

  private mockTokenize(text: string): number[] {
    // Simple mock tokenization - split by spaces and convert to numbers
    return text.split(/\s+/).map((word, index) => {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash + word.charCodeAt(i)) & 0xffffffff;
      }
      return Math.abs(hash) % 50000; // Mock vocab size
    });
  }
}

// Utility functions

/**
 * Create LocalLLM instance with default configuration
 */
export const createLocalLLM = (config: Partial<LLMConfig> & { modelId: string }): LocalLLM => {
  return LocalLLM.getInstance(config as LLMConfig);
};

/**
 * Get available LLM models for current platform
 */
export const getAvailableLLMModels = async (): Promise<string[]> => {
  const modelLoader = ModelLoader.getInstance();
  const models = await modelLoader.getCompatibleModels();
  
  return models
    .filter(model => model.name.includes('llm') || model.name.includes('chat'))
    .map(model => model.id);
};

/**
 * Estimate token count for text
 */
export const estimateTokenCount = (text: string): number => {
  // Rough estimation: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
};

/**
 * Check if model supports current platform
 */
export const isModelCompatible = (modelName: string): boolean => {
  const platform = Platform.OS;
  
  // Platform compatibility rules
  if (platform === 'ios' && modelName.includes('coreml')) return true;
  if (platform === 'android' && modelName.includes('tflite')) return true;
  if (platform === 'web' && modelName.includes('onnx')) return true;
  if (modelName.includes('universal')) return true;
  
  return false;
};

export default LocalLLM;