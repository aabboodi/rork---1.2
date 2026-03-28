import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModelLoader } from '../runtime/model-loader';
import { LocalLLM } from './local-llm';

// Types for abuse classification
export interface AbuseClassificationRequest {
  text: string;
  context?: string;
  userId?: string;
  sessionId?: string;
  metadata?: {
    source: 'chat' | 'post' | 'comment' | 'message';
    timestamp: number;
    language?: string;
  };
}

export interface AbuseClassificationResult {
  isAbusive: boolean;
  confidence: number;
  categories: {
    harassment: number;
    hate_speech: number;
    threats: number;
    spam: number;
    sexual_content: number;
    violence: number;
    self_harm: number;
    misinformation: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  reasoning?: string;
  processingTime: number;
}

export interface ClassifierConfig {
  modelId: string;
  threshold: number;
  enableContextAnalysis: boolean;
  enableUserHistory: boolean;
  maxProcessingTime: number; // milliseconds
  fallbackToKeywords: boolean;
}

export interface UserBehaviorPattern {
  userId: string;
  recentViolations: number;
  violationHistory: {
    timestamp: number;
    category: string;
    severity: string;
  }[];
  riskScore: number;
  lastUpdated: number;
}

/**
 * AbuseClassifier - Lightweight on-device abuse detection
 * 
 * Features:
 * - Real-time abuse classification with <100ms response time
 * - Multi-category classification (harassment, hate, threats, etc.)
 * - Context-aware analysis using user behavior patterns
 * - Fallback to keyword-based detection
 * - Privacy-preserving (no data sent to server)
 * - Adaptive thresholds based on user history
 */
export class AbuseClassifier {
  private static instance: AbuseClassifier;
  private config: ClassifierConfig;
  private modelLoader: ModelLoader;
  private classifierModel: any = null;
  private isInitialized = false;
  private userPatterns = new Map<string, UserBehaviorPattern>();
  private keywordRules: Map<string, { category: string; weight: number }> = new Map();

  private constructor(config: ClassifierConfig) {
    this.config = {
      threshold: 0.7,
      enableContextAnalysis: true,
      enableUserHistory: true,
      maxProcessingTime: 100,
      fallbackToKeywords: true,
      ...config
    };
    
    this.modelLoader = ModelLoader.getInstance();
    this.initializeKeywordRules();
  }

  public static getInstance(config?: ClassifierConfig): AbuseClassifier {
    if (!AbuseClassifier.instance) {
      if (!config) {
        throw new Error('AbuseClassifier config required for first initialization');
      }
      AbuseClassifier.instance = new AbuseClassifier(config);
    }
    return AbuseClassifier.instance;
  }

  /**
   * Initialize the abuse classifier
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🛡️ Initializing AbuseClassifier...');
      const startTime = Date.now();

      // Load classifier model
      await this.loadClassifierModel();

      // Load user behavior patterns
      await this.loadUserPatterns();

      this.isInitialized = true;
      const initTime = Date.now() - startTime;
      console.log(`✅ AbuseClassifier initialized in ${initTime}ms`);

    } catch (error) {
      console.error('❌ AbuseClassifier initialization failed:', error);
      
      // Fallback to keyword-only mode
      console.log('⚠️ Falling back to keyword-based classification');
      this.classifierModel = null;
      this.isInitialized = true;
    }
  }

  /**
   * Classify text for abuse/harmful content
   */
  public async classify(request: AbuseClassificationRequest): Promise<AbuseClassificationResult> {
    if (!this.isInitialized) {
      throw new Error('AbuseClassifier not initialized');
    }

    const startTime = Date.now();

    try {
      console.log('🔍 Classifying content for abuse...');

      // Quick pre-screening with keywords
      const keywordResult = this.keywordClassification(request.text);
      
      // If keywords indicate high risk, skip ML model for speed
      if (keywordResult.confidence > 0.9) {
        const processingTime = Date.now() - startTime;
        console.log(`⚡ Fast keyword classification: ${processingTime}ms`);
        
        return {
          ...keywordResult,
          processingTime
        };
      }

      // Use ML model if available and time permits
      let mlResult: AbuseClassificationResult | null = null;
      
      if (this.classifierModel && (Date.now() - startTime) < this.config.maxProcessingTime * 0.8) {
        try {
          mlResult = await this.mlClassification(request);
        } catch (error) {
          console.warn('⚠️ ML classification failed, using keyword fallback:', error);
        }
      }

      // Combine results or use fallback
      const finalResult = mlResult || keywordResult;

      // Apply context analysis if enabled
      if (this.config.enableContextAnalysis && request.context) {
        finalResult.confidence *= this.analyzeContext(request.text, request.context);
      }

      // Apply user behavior analysis if enabled
      if (this.config.enableUserHistory && request.userId) {
        const userPattern = await this.getUserPattern(request.userId);
        finalResult.confidence *= this.calculateUserRiskMultiplier(userPattern);
        
        // Update user pattern
        await this.updateUserPattern(request.userId, finalResult);
      }

      // Final threshold check
      finalResult.isAbusive = finalResult.confidence >= this.config.threshold;
      finalResult.processingTime = Date.now() - startTime;

      console.log(`✅ Classification complete: ${finalResult.isAbusive ? 'ABUSIVE' : 'CLEAN'} (${finalResult.confidence.toFixed(2)}) in ${finalResult.processingTime}ms`);

      return finalResult;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Classification failed after ${processingTime}ms:`, error);
      
      // Emergency fallback - assume clean but log for review
      return {
        isAbusive: false,
        confidence: 0.0,
        categories: {
          harassment: 0,
          hate_speech: 0,
          threats: 0,
          spam: 0,
          sexual_content: 0,
          violence: 0,
          self_harm: 0,
          misinformation: 0
        },
        severity: 'low',
        flags: ['classification_error'],
        reasoning: `Classification error: ${error.message}`,
        processingTime
      };
    }
  }

  /**
   * Batch classify multiple texts
   */
  public async batchClassify(requests: AbuseClassificationRequest[]): Promise<AbuseClassificationResult[]> {
    const results: AbuseClassificationResult[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.classify(request);
        results.push(result);
      } catch (error) {
        console.error('❌ Batch classification item failed:', error);
        results.push({
          isAbusive: false,
          confidence: 0.0,
          categories: {
            harassment: 0,
            hate_speech: 0,
            threats: 0,
            spam: 0,
            sexual_content: 0,
            violence: 0,
            self_harm: 0,
            misinformation: 0
          },
          severity: 'low',
          flags: ['batch_error'],
          processingTime: 0
        });
      }
    }
    
    return results;
  }

  /**
   * Update classifier configuration
   */
  public updateConfig(newConfig: Partial<ClassifierConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 AbuseClassifier config updated');
  }

  /**
   * Get classifier statistics
   */
  public getStats(): {
    isInitialized: boolean;
    modelLoaded: boolean;
    userPatternsCount: number;
    config: ClassifierConfig;
  } {
    return {
      isInitialized: this.isInitialized,
      modelLoaded: !!this.classifierModel,
      userPatternsCount: this.userPatterns.size,
      config: this.config
    };
  }

  // Private methods

  private async loadClassifierModel(): Promise<void> {
    try {
      console.log(`📥 Loading abuse classifier model: ${this.config.modelId}`);
      
      const modelArtifact = await this.modelLoader.loadModel(this.config.modelId);
      
      // Platform-specific model loading
      if (Platform.OS === 'ios') {
        this.classifierModel = await this.loadCoreMLClassifier(modelArtifact.localPath);
      } else if (Platform.OS === 'android') {
        this.classifierModel = await this.loadTFLiteClassifier(modelArtifact.localPath);
      } else {
        this.classifierModel = await this.loadONNXClassifier(modelArtifact.localPath);
      }
      
      console.log('✅ Classifier model loaded successfully');
    } catch (error) {
      console.warn('⚠️ Failed to load classifier model:', error);
      this.classifierModel = null;
    }
  }

  private async loadCoreMLClassifier(modelPath: string): Promise<any> {
    console.log(`🍎 Loading Core ML classifier from: ${modelPath}`);
    
    // Mock Core ML classifier
    return {
      predict: async (input: string) => {
        // Simulate Core ML inference
        await new Promise(resolve => setTimeout(resolve, 20));
        return this.mockMLInference(input);
      }
    };
  }

  private async loadTFLiteClassifier(modelPath: string): Promise<any> {
    console.log(`🤖 Loading TFLite classifier from: ${modelPath}`);
    
    // Mock TensorFlow Lite classifier
    return {
      invoke: async (input: string) => {
        // Simulate TFLite inference
        await new Promise(resolve => setTimeout(resolve, 25));
        return this.mockMLInference(input);
      }
    };
  }

  private async loadONNXClassifier(modelPath: string): Promise<any> {
    console.log(`📱 Loading ONNX classifier from: ${modelPath}`);
    
    // Mock ONNX classifier
    return {
      run: async (input: string) => {
        // Simulate ONNX inference
        await new Promise(resolve => setTimeout(resolve, 30));
        return this.mockMLInference(input);
      }
    };
  }

  private mockMLInference(text: string): AbuseClassificationResult {
    const lowerText = text.toLowerCase();
    
    // Mock ML-based classification with more sophisticated logic
    const categories = {
      harassment: this.calculateCategoryScore(lowerText, ['bully', 'harass', 'intimidate', 'threaten']),
      hate_speech: this.calculateCategoryScore(lowerText, ['hate', 'racist', 'bigot', 'discriminate']),
      threats: this.calculateCategoryScore(lowerText, ['kill', 'hurt', 'destroy', 'attack', 'bomb']),
      spam: this.calculateCategoryScore(lowerText, ['buy now', 'click here', 'free money', 'urgent']),
      sexual_content: this.calculateCategoryScore(lowerText, ['explicit', 'sexual', 'nude', 'porn']),
      violence: this.calculateCategoryScore(lowerText, ['violence', 'fight', 'punch', 'stab', 'shoot']),
      self_harm: this.calculateCategoryScore(lowerText, ['suicide', 'self harm', 'cut myself', 'end it all']),
      misinformation: this.calculateCategoryScore(lowerText, ['fake news', 'conspiracy', 'hoax', 'lie'])
    };

    const maxScore = Math.max(...Object.values(categories));
    const confidence = Math.min(maxScore * 1.2, 1.0); // Boost confidence slightly
    
    const flags: string[] = [];
    Object.entries(categories).forEach(([category, score]) => {
      if (score > 0.5) {
        flags.push(category);
      }
    });

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (confidence > 0.9) severity = 'critical';
    else if (confidence > 0.7) severity = 'high';
    else if (confidence > 0.4) severity = 'medium';

    return {
      isAbusive: confidence >= this.config.threshold,
      confidence,
      categories,
      severity,
      flags,
      reasoning: flags.length > 0 ? `Detected: ${flags.join(', ')}` : 'Content appears clean',
      processingTime: 0 // Will be set by caller
    };
  }

  private keywordClassification(text: string): AbuseClassificationResult {
    const lowerText = text.toLowerCase();
    const categories = {
      harassment: 0,
      hate_speech: 0,
      threats: 0,
      spam: 0,
      sexual_content: 0,
      violence: 0,
      self_harm: 0,
      misinformation: 0
    };

    let totalScore = 0;
    const flags: string[] = [];

    // Check against keyword rules
    for (const [keyword, rule] of this.keywordRules.entries()) {
      if (lowerText.includes(keyword)) {
        categories[rule.category as keyof typeof categories] += rule.weight;
        totalScore += rule.weight;
        if (!flags.includes(rule.category)) {
          flags.push(rule.category);
        }
      }
    }

    const confidence = Math.min(totalScore, 1.0);
    
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (confidence > 0.8) severity = 'critical';
    else if (confidence > 0.6) severity = 'high';
    else if (confidence > 0.3) severity = 'medium';

    return {
      isAbusive: confidence >= this.config.threshold,
      confidence,
      categories,
      severity,
      flags,
      reasoning: flags.length > 0 ? `Keyword matches: ${flags.join(', ')}` : 'No harmful keywords detected',
      processingTime: 0
    };
  }

  private async mlClassification(request: AbuseClassificationRequest): Promise<AbuseClassificationResult> {
    if (!this.classifierModel) {
      throw new Error('No ML model loaded');
    }

    // Run model-specific inference
    let result: AbuseClassificationResult;
    
    if (this.classifierModel.predict) {
      // Core ML
      result = await this.classifierModel.predict(request.text);
    } else if (this.classifierModel.invoke) {
      // TensorFlow Lite
      result = await this.classifierModel.invoke(request.text);
    } else if (this.classifierModel.run) {
      // ONNX
      result = await this.classifierModel.run(request.text);
    } else {
      throw new Error('Unknown model interface');
    }

    return result;
  }

  private calculateCategoryScore(text: string, keywords: string[]): number {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 0.3; // Each keyword adds to the score
      }
    }
    return Math.min(score, 1.0);
  }

  private analyzeContext(text: string, context: string): number {
    // Simple context analysis - in production would be more sophisticated
    const contextLower = context.toLowerCase();
    const textLower = text.toLowerCase();
    
    // If context contains positive words, reduce confidence in abuse detection
    const positiveWords = ['help', 'support', 'education', 'discussion', 'question'];
    const negativeWords = ['angry', 'frustrated', 'argument', 'fight', 'conflict'];
    
    let contextMultiplier = 1.0;
    
    for (const word of positiveWords) {
      if (contextLower.includes(word)) {
        contextMultiplier *= 0.8; // Reduce abuse confidence
      }
    }
    
    for (const word of negativeWords) {
      if (contextLower.includes(word)) {
        contextMultiplier *= 1.2; // Increase abuse confidence
      }
    }
    
    return Math.max(0.1, Math.min(2.0, contextMultiplier));
  }

  private async getUserPattern(userId: string): Promise<UserBehaviorPattern> {
    let pattern = this.userPatterns.get(userId);
    
    if (!pattern) {
      // Try to load from storage
      try {
        const stored = await AsyncStorage.getItem(`user_pattern_${userId}`);
        if (stored) {
          pattern = JSON.parse(stored);
          this.userPatterns.set(userId, pattern!);
        }
      } catch (error) {
        console.warn('⚠️ Failed to load user pattern:', error);
      }
    }
    
    if (!pattern) {
      // Create new pattern
      pattern = {
        userId,
        recentViolations: 0,
        violationHistory: [],
        riskScore: 0.0,
        lastUpdated: Date.now()
      };
      this.userPatterns.set(userId, pattern);
    }
    
    return pattern;
  }

  private calculateUserRiskMultiplier(pattern: UserBehaviorPattern): number {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    // Count recent violations (last 7 days)
    const recentViolations = pattern.violationHistory.filter(
      v => now - v.timestamp < 7 * dayMs
    ).length;
    
    // Calculate risk multiplier
    let multiplier = 1.0;
    
    if (recentViolations > 5) {
      multiplier = 1.5; // High risk user
    } else if (recentViolations > 2) {
      multiplier = 1.2; // Medium risk user
    } else if (recentViolations === 0 && pattern.violationHistory.length === 0) {
      multiplier = 0.8; // New/clean user - be more lenient
    }
    
    return multiplier;
  }

  private async updateUserPattern(userId: string, result: AbuseClassificationResult): Promise<void> {
    const pattern = await this.getUserPattern(userId);
    
    if (result.isAbusive) {
      pattern.recentViolations++;
      pattern.violationHistory.push({
        timestamp: Date.now(),
        category: result.flags[0] || 'unknown',
        severity: result.severity
      });
      
      // Keep only last 50 violations
      if (pattern.violationHistory.length > 50) {
        pattern.violationHistory = pattern.violationHistory.slice(-50);
      }
    }
    
    // Update risk score
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const recentViolations = pattern.violationHistory.filter(
      v => now - v.timestamp < 7 * dayMs
    ).length;
    
    pattern.riskScore = Math.min(recentViolations / 10, 1.0);
    pattern.lastUpdated = now;
    
    // Save to storage
    try {
      await AsyncStorage.setItem(`user_pattern_${userId}`, JSON.stringify(pattern));
    } catch (error) {
      console.warn('⚠️ Failed to save user pattern:', error);
    }
  }

  private async loadUserPatterns(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const patternKeys = keys.filter(key => key.startsWith('user_pattern_'));
      
      for (const key of patternKeys) {
        try {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const pattern = JSON.parse(stored);
            this.userPatterns.set(pattern.userId, pattern);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load pattern ${key}:`, error);
        }
      }
      
      console.log(`📚 Loaded ${this.userPatterns.size} user behavior patterns`);
    } catch (error) {
      console.warn('⚠️ Failed to load user patterns:', error);
    }
  }

  private initializeKeywordRules(): void {
    // Initialize keyword-based rules for fallback classification
    const rules = [
      // Harassment
      { keywords: ['bully', 'harass', 'intimidate', 'stalk'], category: 'harassment', weight: 0.7 },
      
      // Hate speech
      { keywords: ['hate', 'racist', 'nazi', 'bigot'], category: 'hate_speech', weight: 0.8 },
      
      // Threats
      { keywords: ['kill', 'murder', 'bomb', 'terrorist', 'die'], category: 'threats', weight: 0.9 },
      
      // Spam
      { keywords: ['buy now', 'click here', 'free money', 'urgent'], category: 'spam', weight: 0.6 },
      
      // Sexual content
      { keywords: ['porn', 'nude', 'sex', 'explicit'], category: 'sexual_content', weight: 0.7 },
      
      // Violence
      { keywords: ['violence', 'fight', 'punch', 'attack'], category: 'violence', weight: 0.7 },
      
      // Self harm
      { keywords: ['suicide', 'self harm', 'cut myself'], category: 'self_harm', weight: 0.9 },
      
      // Misinformation
      { keywords: ['fake news', 'conspiracy', 'hoax'], category: 'misinformation', weight: 0.6 }
    ];

    for (const rule of rules) {
      for (const keyword of rule.keywords) {
        this.keywordRules.set(keyword, {
          category: rule.category,
          weight: rule.weight
        });
      }
    }
  }
}

// Utility functions

/**
 * Create AbuseClassifier instance with default configuration
 */
export const createAbuseClassifier = (config: Partial<ClassifierConfig> & { modelId: string }): AbuseClassifier => {
  return AbuseClassifier.getInstance(config as ClassifierConfig);
};

/**
 * Quick abuse check using keywords only (fastest)
 */
export const quickAbuseCheck = (text: string): boolean => {
  const harmfulKeywords = [
    'kill', 'murder', 'hate', 'nazi', 'terrorist', 'bomb',
    'suicide', 'die', 'hurt', 'attack', 'violence'
  ];
  
  const lowerText = text.toLowerCase();
  return harmfulKeywords.some(keyword => lowerText.includes(keyword));
};

/**
 * Calculate text toxicity score (0-1)
 */
export const calculateToxicityScore = (text: string): number => {
  const toxicWords = ['hate', 'stupid', 'idiot', 'kill', 'die', 'hurt'];
  const lowerText = text.toLowerCase();
  
  let score = 0;
  for (const word of toxicWords) {
    if (lowerText.includes(word)) {
      score += 0.2;
    }
  }
  
  return Math.min(score, 1.0);
};

export default AbuseClassifier;