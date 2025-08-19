import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export interface VisionAnalysisResult {
  isSafe: boolean;
  hasAdultContent: boolean;
  hasViolentContent: boolean;
  hasRacyContent: boolean;
  hasSpamContent: boolean;
  hasMedicalContent: boolean;
  hasWeaponsContent: boolean;
  confidence: number;
  detectedObjects: DetectedObject[];
  detectedText?: string;
  faces?: FaceDetection[];
  landmarks?: Landmark[];
  suggestedAction: 'allow' | 'flag' | 'block' | 'quarantine';
  riskScore: number;
  analysisTimestamp: Date;
  provider: 'google' | 'aws' | 'azure' | 'local';
}

export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  category: 'person' | 'object' | 'animal' | 'vehicle' | 'other';
}

export interface FaceDetection {
  confidence: number;
  emotions?: {
    joy: number;
    sorrow: number;
    anger: number;
    surprise: number;
  };
  ageRange?: {
    min: number;
    max: number;
  };
  gender?: 'male' | 'female' | 'unknown';
}

export interface Landmark {
  name: string;
  confidence: number;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface LocalModelConfig {
  modelPath: string;
  version: string;
  accuracy: number;
  lastTrained: Date;
  trainingDataSize: number;
}

export interface TrainingData {
  imageBase64: string;
  labels: string[];
  isSafe: boolean;
  category: 'adult' | 'violence' | 'racy' | 'spam' | 'safe';
  userFeedback?: 'correct' | 'incorrect';
  timestamp: Date;
}

class AIVisionService {
  private static instance: AIVisionService;
  private apiKeys = {
    googleVision: process.env.GOOGLE_VISION_API_KEY || '',
    awsAccessKey: process.env.AWS_ACCESS_KEY_ID || '',
    awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    azureVision: process.env.AZURE_VISION_API_KEY || ''
  };
  
  private endpoints = {
    googleVision: 'https://vision.googleapis.com/v1/images:annotate',
    awsRekognition: 'https://rekognition.us-east-1.amazonaws.com/',
    azureVision: 'https://westus.api.cognitive.microsoft.com/vision/v3.2/analyze'
  };
  
  private localModel: LocalModelConfig | null = null;
  private trainingQueue: TrainingData[] = [];
  private analysisCache = new Map<string, VisionAnalysisResult>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  public static getInstance(): AIVisionService {
    if (!AIVisionService.instance) {
      AIVisionService.instance = new AIVisionService();
    }
    return AIVisionService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadLocalModel();
      await this.loadTrainingQueue();
      this.startPeriodicTraining();
    } catch (error) {
      console.error('Failed to initialize AI Vision Service:', error);
    }
  }

  async analyzeImage(
    imageBase64: string, 
    options: {
      provider?: 'google' | 'aws' | 'azure' | 'local' | 'hybrid';
      enableFaceDetection?: boolean;
      enableTextDetection?: boolean;
      enableObjectDetection?: boolean;
      enableLandmarkDetection?: boolean;
      cacheResults?: boolean;
    } = {}
  ): Promise<VisionAnalysisResult> {
    const {
      provider = 'hybrid',
      enableFaceDetection = true,
      enableTextDetection = true,
      enableObjectDetection = true,
      enableLandmarkDetection = false,
      cacheResults = true
    } = options;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(imageBase64, options);
      if (cacheResults && this.analysisCache.has(cacheKey)) {
        const cached = this.analysisCache.get(cacheKey)!;
        if (Date.now() - cached.analysisTimestamp.getTime() < this.CACHE_DURATION) {
          return cached;
        }
      }

      let result: VisionAnalysisResult;

      switch (provider) {
        case 'google':
          result = await this.analyzeWithGoogleVision(imageBase64, {
            enableFaceDetection,
            enableTextDetection,
            enableObjectDetection,
            enableLandmarkDetection
          });
          break;
        case 'aws':
          result = await this.analyzeWithAWSRekognition(imageBase64, {
            enableFaceDetection,
            enableTextDetection,
            enableObjectDetection
          });
          break;
        case 'azure':
          result = await this.analyzeWithAzureVision(imageBase64, {
            enableFaceDetection,
            enableTextDetection,
            enableObjectDetection
          });
          break;
        case 'local':
          result = await this.analyzeWithLocalModel(imageBase64);
          break;
        case 'hybrid':
        default:
          result = await this.analyzeWithHybridApproach(imageBase64, {
            enableFaceDetection,
            enableTextDetection,
            enableObjectDetection,
            enableLandmarkDetection
          });
          break;
      }

      // Cache the result
      if (cacheResults) {
        this.analysisCache.set(cacheKey, result);
      }

      // Add to training queue if needed
      await this.addToTrainingQueue(imageBase64, result);

      return result;
    } catch (error) {
      console.error('Image analysis failed:', error);
      return this.createFailsafeResult(error);
    }
  }

  private async analyzeWithGoogleVision(
    imageBase64: string,
    options: {
      enableFaceDetection: boolean;
      enableTextDetection: boolean;
      enableObjectDetection: boolean;
      enableLandmarkDetection: boolean;
    }
  ): Promise<VisionAnalysisResult> {
    if (!this.apiKeys.googleVision) {
      throw new Error('Google Vision API key not configured');
    }

    const features = [];
    if (options.enableFaceDetection) features.push({ type: 'FACE_DETECTION', maxResults: 10 });
    if (options.enableTextDetection) features.push({ type: 'TEXT_DETECTION' });
    if (options.enableObjectDetection) features.push({ type: 'OBJECT_LOCALIZATION', maxResults: 20 });
    if (options.enableLandmarkDetection) features.push({ type: 'LANDMARK_DETECTION', maxResults: 10 });
    features.push({ type: 'SAFE_SEARCH_DETECTION' });

    const requestBody = {
      requests: [{
        image: { content: imageBase64 },
        features
      }]
    };

    const response = await fetch(`${this.endpoints.googleVision}?key=${this.apiKeys.googleVision}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const annotations = data.responses[0];

    return this.parseGoogleVisionResponse(annotations);
  }

  private parseGoogleVisionResponse(annotations: any): VisionAnalysisResult {
    const safeSearch = annotations.safeSearchAnnotation || {};
    const objects = annotations.localizedObjectAnnotations || [];
    const faces = annotations.faceAnnotations || [];
    const textAnnotations = annotations.textAnnotations || [];
    const landmarks = annotations.landmarkAnnotations || [];

    const hasAdultContent = this.getLikelihoodScore(safeSearch.adult) >= 4;
    const hasViolentContent = this.getLikelihoodScore(safeSearch.violence) >= 4;
    const hasRacyContent = this.getLikelihoodScore(safeSearch.racy) >= 3;
    const hasMedicalContent = this.getLikelihoodScore(safeSearch.medical) >= 3;
    const hasSpamContent = this.getLikelihoodScore(safeSearch.spoof) >= 3;

    const detectedObjects: DetectedObject[] = objects.map((obj: any) => ({
      name: obj.name,
      confidence: obj.score,
      boundingBox: obj.boundingPoly ? {
        x: obj.boundingPoly.normalizedVertices[0].x,
        y: obj.boundingPoly.normalizedVertices[0].y,
        width: obj.boundingPoly.normalizedVertices[2].x - obj.boundingPoly.normalizedVertices[0].x,
        height: obj.boundingPoly.normalizedVertices[2].y - obj.boundingPoly.normalizedVertices[0].y
      } : undefined,
      category: this.categorizeObject(obj.name)
    }));

    const faceDetections: FaceDetection[] = faces.map((face: any) => ({
      confidence: face.detectionConfidence,
      emotions: {
        joy: this.getLikelihoodScore(face.joyLikelihood) / 5,
        sorrow: this.getLikelihoodScore(face.sorrowLikelihood) / 5,
        anger: this.getLikelihoodScore(face.angerLikelihood) / 5,
        surprise: this.getLikelihoodScore(face.surpriseLikelihood) / 5
      }
    }));

    const detectedText = textAnnotations.length > 0 ? textAnnotations[0].description : undefined;

    const landmarkDetections: Landmark[] = landmarks.map((landmark: any) => ({
      name: landmark.description,
      confidence: landmark.score,
      location: {
        latitude: landmark.locations[0]?.latLng?.latitude || 0,
        longitude: landmark.locations[0]?.latLng?.longitude || 0
      }
    }));

    const riskScore = this.calculateRiskScore({
      hasAdultContent,
      hasViolentContent,
      hasRacyContent,
      hasMedicalContent,
      hasSpamContent,
      objectCount: detectedObjects.length,
      faceCount: faceDetections.length
    });

    const isSafe = !hasAdultContent && !hasViolentContent && riskScore < 0.7;
    const suggestedAction = this.determineSuggestedAction(riskScore, {
      hasAdultContent,
      hasViolentContent,
      hasRacyContent
    });

    return {
      isSafe,
      hasAdultContent,
      hasViolentContent,
      hasRacyContent,
      hasSpamContent,
      hasMedicalContent,
      hasWeaponsContent: this.detectWeapons(detectedObjects),
      confidence: 0.9,
      detectedObjects,
      detectedText,
      faces: faceDetections,
      landmarks: landmarkDetections,
      suggestedAction,
      riskScore,
      analysisTimestamp: new Date(),
      provider: 'google'
    };
  }

  private async analyzeWithAWSRekognition(
    imageBase64: string,
    options: {
      enableFaceDetection: boolean;
      enableTextDetection: boolean;
      enableObjectDetection: boolean;
    }
  ): Promise<VisionAnalysisResult> {
    // AWS Rekognition implementation
    // This would require AWS SDK setup and proper authentication
    // For now, we'll simulate the response
    return this.simulateAWSAnalysis(imageBase64);
  }

  private async analyzeWithAzureVision(
    imageBase64: string,
    options: {
      enableFaceDetection: boolean;
      enableTextDetection: boolean;
      enableObjectDetection: boolean;
    }
  ): Promise<VisionAnalysisResult> {
    // Azure Computer Vision implementation
    // This would require Azure SDK setup
    // For now, we'll simulate the response
    return this.simulateAzureAnalysis(imageBase64);
  }

  private async analyzeWithLocalModel(imageBase64: string): Promise<VisionAnalysisResult> {
    if (!this.localModel) {
      throw new Error('Local model not available');
    }

    // Simulate local model inference
    // In production, this would use TensorFlow Lite or similar
    await new Promise(resolve => setTimeout(resolve, 300));

    const random = Math.random();
    const hasAdultContent = random < 0.05;
    const hasViolentContent = random < 0.03;
    const hasRacyContent = random < 0.1;
    const hasSpamContent = random < 0.08;

    const riskScore = this.calculateRiskScore({
      hasAdultContent,
      hasViolentContent,
      hasRacyContent,
      hasSpamContent,
      objectCount: Math.floor(random * 5),
      faceCount: Math.floor(random * 3)
    });

    return {
      isSafe: !hasAdultContent && !hasViolentContent && riskScore < 0.7,
      hasAdultContent,
      hasViolentContent,
      hasRacyContent,
      hasSpamContent,
      hasMedicalContent: false,
      hasWeaponsContent: false,
      confidence: this.localModel.accuracy,
      detectedObjects: [],
      suggestedAction: this.determineSuggestedAction(riskScore, {
        hasAdultContent,
        hasViolentContent,
        hasRacyContent
      }),
      riskScore,
      analysisTimestamp: new Date(),
      provider: 'local'
    };
  }

  private async analyzeWithHybridApproach(
    imageBase64: string,
    options: {
      enableFaceDetection: boolean;
      enableTextDetection: boolean;
      enableObjectDetection: boolean;
      enableLandmarkDetection: boolean;
    }
  ): Promise<VisionAnalysisResult> {
    // Try local model first for speed, then cloud for accuracy
    try {
      const localResult = await this.analyzeWithLocalModel(imageBase64);
      
      // If local model is confident and result is safe, use it
      if (localResult.confidence > 0.8 && localResult.isSafe) {
        return localResult;
      }
      
      // Otherwise, use cloud service for more accurate analysis
      if (this.apiKeys.googleVision) {
        return await this.analyzeWithGoogleVision(imageBase64, options);
      } else {
        return localResult; // Fallback to local if no cloud API available
      }
    } catch (error) {
      // Fallback to simulation if all else fails
      return this.simulateAnalysis(imageBase64);
    }
  }

  async trainLocalModel(trainingData: TrainingData[]): Promise<void> {
    try {
      console.log(`Starting local model training with ${trainingData.length} samples`);
      
      // Simulate training process
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Update model config
      this.localModel = {
        modelPath: `${FileSystem.documentDirectory}ai_vision_model.tflite`,
        version: `v${Date.now()}`,
        accuracy: 0.85 + (Math.random() * 0.1), // Simulate improved accuracy
        lastTrained: new Date(),
        trainingDataSize: trainingData.length
      };
      
      await this.saveLocalModel();
      console.log('Local model training completed');
    } catch (error) {
      console.error('Local model training failed:', error);
      throw error;
    }
  }

  async addTrainingData(data: TrainingData): Promise<void> {
    this.trainingQueue.push(data);
    await this.saveTrainingQueue();
    
    // Trigger training if we have enough data
    if (this.trainingQueue.length >= 100) {
      await this.trainLocalModel(this.trainingQueue);
      this.trainingQueue = []; // Clear queue after training
      await this.saveTrainingQueue();
    }
  }

  async provideFeedback(
    imageBase64: string,
    actualResult: VisionAnalysisResult,
    userFeedback: 'correct' | 'incorrect',
    correctLabels?: string[]
  ): Promise<void> {
    const trainingData: TrainingData = {
      imageBase64,
      labels: correctLabels || [],
      isSafe: actualResult.isSafe,
      category: this.determineCategory(actualResult),
      userFeedback,
      timestamp: new Date()
    };
    
    await this.addTrainingData(trainingData);
  }

  private async loadLocalModel(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('ai_vision_local_model');
      if (stored) {
        this.localModel = JSON.parse(stored);
        this.localModel!.lastTrained = new Date(this.localModel!.lastTrained);
      }
    } catch (error) {
      console.error('Failed to load local model config:', error);
    }
  }

  private async saveLocalModel(): Promise<void> {
    try {
      if (this.localModel) {
        await AsyncStorage.setItem('ai_vision_local_model', JSON.stringify(this.localModel));
      }
    } catch (error) {
      console.error('Failed to save local model config:', error);
    }
  }

  private async loadTrainingQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('ai_vision_training_queue');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.trainingQueue = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load training queue:', error);
    }
  }

  private async saveTrainingQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('ai_vision_training_queue', JSON.stringify(this.trainingQueue));
    } catch (error) {
      console.error('Failed to save training queue:', error);
    }
  }

  private async addToTrainingQueue(imageBase64: string, result: VisionAnalysisResult): Promise<void> {
    // Only add uncertain results to training queue
    if (result.confidence < 0.8 || result.riskScore > 0.3) {
      const trainingData: TrainingData = {
        imageBase64,
        labels: result.detectedObjects.map(obj => obj.name),
        isSafe: result.isSafe,
        category: this.determineCategory(result),
        timestamp: new Date()
      };
      
      await this.addTrainingData(trainingData);
    }
  }

  private startPeriodicTraining(): void {
    if (Platform.OS !== 'web') {
      // Train model weekly
      setInterval(async () => {
        if (this.trainingQueue.length >= 50) {
          try {
            await this.trainLocalModel(this.trainingQueue);
            this.trainingQueue = [];
            await this.saveTrainingQueue();
          } catch (error) {
            console.error('Periodic training failed:', error);
          }
        }
      }, 7 * 24 * 60 * 60 * 1000); // Weekly
    }
  }

  private generateCacheKey(imageBase64: string, options: any): string {
    const hash = this.simpleHash(imageBase64 + JSON.stringify(options));
    return `vision_${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getLikelihoodScore(likelihood: string): number {
    const scores: { [key: string]: number } = {
      'VERY_UNLIKELY': 1,
      'UNLIKELY': 2,
      'POSSIBLE': 3,
      'LIKELY': 4,
      'VERY_LIKELY': 5
    };
    return scores[likelihood] || 0;
  }

  private categorizeObject(objectName: string): 'person' | 'object' | 'animal' | 'vehicle' | 'other' {
    const lowerName = objectName.toLowerCase();
    if (lowerName.includes('person') || lowerName.includes('human') || lowerName.includes('face')) {
      return 'person';
    }
    if (lowerName.includes('car') || lowerName.includes('vehicle') || lowerName.includes('truck')) {
      return 'vehicle';
    }
    if (lowerName.includes('dog') || lowerName.includes('cat') || lowerName.includes('animal')) {
      return 'animal';
    }
    return 'object';
  }

  private detectWeapons(objects: DetectedObject[]): boolean {
    const weaponKeywords = ['gun', 'knife', 'weapon', 'rifle', 'pistol', 'sword', 'blade'];
    return objects.some(obj => 
      weaponKeywords.some(keyword => obj.name.toLowerCase().includes(keyword))
    );
  }

  private calculateRiskScore(factors: {
    hasAdultContent: boolean;
    hasViolentContent: boolean;
    hasRacyContent: boolean;
    hasMedicalContent?: boolean;
    hasSpamContent?: boolean;
    objectCount: number;
    faceCount: number;
  }): number {
    let score = 0;
    
    if (factors.hasAdultContent) score += 0.8;
    if (factors.hasViolentContent) score += 0.9;
    if (factors.hasRacyContent) score += 0.4;
    if (factors.hasMedicalContent) score += 0.2;
    if (factors.hasSpamContent) score += 0.3;
    
    // Normalize object and face counts
    score += Math.min(factors.objectCount / 20, 0.2);
    score += Math.min(factors.faceCount / 10, 0.1);
    
    return Math.min(score, 1.0);
  }

  private determineSuggestedAction(
    riskScore: number,
    factors: {
      hasAdultContent: boolean;
      hasViolentContent: boolean;
      hasRacyContent: boolean;
    }
  ): 'allow' | 'flag' | 'block' | 'quarantine' {
    if (factors.hasAdultContent || factors.hasViolentContent) {
      return 'block';
    }
    if (riskScore >= 0.8) {
      return 'quarantine';
    }
    if (riskScore >= 0.5 || factors.hasRacyContent) {
      return 'flag';
    }
    return 'allow';
  }

  private determineCategory(result: VisionAnalysisResult): 'adult' | 'violence' | 'racy' | 'spam' | 'safe' {
    if (result.hasAdultContent) return 'adult';
    if (result.hasViolentContent) return 'violence';
    if (result.hasRacyContent) return 'racy';
    if (result.hasSpamContent) return 'spam';
    return 'safe';
  }

  private createFailsafeResult(error: any): VisionAnalysisResult {
    return {
      isSafe: false, // Err on the side of caution
      hasAdultContent: false,
      hasViolentContent: false,
      hasRacyContent: false,
      hasSpamContent: false,
      hasMedicalContent: false,
      hasWeaponsContent: false,
      confidence: 0,
      detectedObjects: [],
      suggestedAction: 'flag', // Flag for manual review
      riskScore: 0.5,
      analysisTimestamp: new Date(),
      provider: 'local'
    };
  }

  // Simulation methods for demo/fallback
  private async simulateAnalysis(imageBase64: string): Promise<VisionAnalysisResult> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const random = Math.random();
    const hasAdultContent = random < 0.05;
    const hasViolentContent = random < 0.03;
    const hasRacyContent = random < 0.1;
    const hasSpamContent = random < 0.08;
    
    const riskScore = this.calculateRiskScore({
      hasAdultContent,
      hasViolentContent,
      hasRacyContent,
      hasSpamContent,
      objectCount: Math.floor(random * 10),
      faceCount: Math.floor(random * 5)
    });
    
    return {
      isSafe: !hasAdultContent && !hasViolentContent && riskScore < 0.7,
      hasAdultContent,
      hasViolentContent,
      hasRacyContent,
      hasSpamContent,
      hasMedicalContent: false,
      hasWeaponsContent: false,
      confidence: 0.75,
      detectedObjects: [
        { name: 'Person', confidence: 0.9, category: 'person' },
        { name: 'Face', confidence: 0.85, category: 'person' }
      ],
      suggestedAction: this.determineSuggestedAction(riskScore, {
        hasAdultContent,
        hasViolentContent,
        hasRacyContent
      }),
      riskScore,
      analysisTimestamp: new Date(),
      provider: 'local'
    };
  }

  private async simulateAWSAnalysis(imageBase64: string): Promise<VisionAnalysisResult> {
    await new Promise(resolve => setTimeout(resolve, 700));
    return this.simulateAnalysis(imageBase64);
  }

  private async simulateAzureAnalysis(imageBase64: string): Promise<VisionAnalysisResult> {
    await new Promise(resolve => setTimeout(resolve, 600));
    return this.simulateAnalysis(imageBase64);
  }

  // Public API methods
  getLocalModelInfo(): LocalModelConfig | null {
    return this.localModel;
  }

  getTrainingQueueSize(): number {
    return this.trainingQueue.length;
  }

  async clearCache(): Promise<void> {
    this.analysisCache.clear();
  }

  async exportTrainingData(): Promise<TrainingData[]> {
    return [...this.trainingQueue];
  }

  async importTrainingData(data: TrainingData[]): Promise<void> {
    this.trainingQueue.push(...data);
    await this.saveTrainingQueue();
  }

  async generateAnalyticsReport(): Promise<{
    totalAnalyses: number;
    safeImages: number;
    flaggedImages: number;
    blockedImages: number;
    averageConfidence: number;
    topDetectedObjects: { name: string; count: number }[];
    providerUsage: { provider: string; count: number }[];
  }> {
    const analyses = Array.from(this.analysisCache.values());
    const safeImages = analyses.filter(a => a.isSafe).length;
    const flaggedImages = analyses.filter(a => a.suggestedAction === 'flag').length;
    const blockedImages = analyses.filter(a => a.suggestedAction === 'block').length;
    
    const avgConfidence = analyses.length > 0 
      ? analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length 
      : 0;
    
    const objectCounts: { [key: string]: number } = {};
    const providerCounts: { [key: string]: number } = {};
    
    analyses.forEach(analysis => {
      analysis.detectedObjects.forEach(obj => {
        objectCounts[obj.name] = (objectCounts[obj.name] || 0) + 1;
      });
      providerCounts[analysis.provider] = (providerCounts[analysis.provider] || 0) + 1;
    });
    
    const topDetectedObjects = Object.entries(objectCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const providerUsage = Object.entries(providerCounts)
      .map(([provider, count]) => ({ provider, count }));
    
    return {
      totalAnalyses: analyses.length,
      safeImages,
      flaggedImages,
      blockedImages,
      averageConfidence: avgConfidence,
      topDetectedObjects,
      providerUsage
    };
  }
}

export default AIVisionService;