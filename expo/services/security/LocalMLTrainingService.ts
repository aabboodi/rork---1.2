import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export interface TrainingDataset {
  id: string;
  name: string;
  description: string;
  samples: TrainingSample[];
  createdAt: Date;
  lastModified: Date;
  version: string;
}

export interface TrainingSample {
  id: string;
  imageBase64: string;
  labels: string[];
  category: 'safe' | 'adult' | 'violence' | 'racy' | 'spam' | 'weapons';
  confidence: number;
  userVerified: boolean;
  metadata: {
    source: 'user_feedback' | 'auto_generated' | 'imported';
    timestamp: Date;
    deviceInfo?: string;
  };
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: number[][];
  trainingLoss: number[];
  validationLoss: number[];
  trainingTime: number; // in milliseconds
}

export interface TrainingConfig {
  batchSize: number;
  epochs: number;
  learningRate: number;
  validationSplit: number;
  augmentData: boolean;
  transferLearning: boolean;
  baseModel: 'mobilenet' | 'efficientnet' | 'resnet';
  optimizer: 'adam' | 'sgd' | 'rmsprop';
}

export interface LocalModel {
  id: string;
  name: string;
  version: string;
  modelPath: string;
  configPath: string;
  metrics: ModelMetrics;
  trainingConfig: TrainingConfig;
  createdAt: Date;
  lastUsed: Date;
  isActive: boolean;
  size: number; // in bytes
}

class LocalMLTrainingService {
  private static instance: LocalMLTrainingService;
  private datasets: Map<string, TrainingDataset> = new Map();
  private models: Map<string, LocalModel> = new Map();
  private activeModel: LocalModel | null = null;
  private isTraining = false;
  private trainingProgress = 0;

  public static getInstance(): LocalMLTrainingService {
    if (!LocalMLTrainingService.instance) {
      LocalMLTrainingService.instance = new LocalMLTrainingService();
    }
    return LocalMLTrainingService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadDatasets();
      await this.loadModels();
      await this.loadActiveModel();
    } catch (error) {
      console.error('Failed to initialize Local ML Training Service:', error);
    }
  }

  // Dataset Management
  async createDataset(name: string, description: string): Promise<string> {
    const dataset: TrainingDataset = {
      id: `dataset_${Date.now()}`,
      name,
      description,
      samples: [],
      createdAt: new Date(),
      lastModified: new Date(),
      version: '1.0.0'
    };

    this.datasets.set(dataset.id, dataset);
    await this.saveDatasets();
    return dataset.id;
  }

  async addSampleToDataset(
    datasetId: string, 
    imageBase64: string, 
    labels: string[], 
    category: TrainingSample['category'],
    source: TrainingSample['metadata']['source'] = 'user_feedback'
  ): Promise<void> {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error('Dataset not found');
    }

    const sample: TrainingSample = {
      id: `sample_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      imageBase64,
      labels,
      category,
      confidence: 1.0,
      userVerified: source === 'user_feedback',
      metadata: {
        source,
        timestamp: new Date(),
        deviceInfo: Platform.OS
      }
    };

    dataset.samples.push(sample);
    dataset.lastModified = new Date();
    await this.saveDatasets();
  }

  async removeDataset(datasetId: string): Promise<void> {
    this.datasets.delete(datasetId);
    await this.saveDatasets();
  }

  async getDataset(datasetId: string): Promise<TrainingDataset | null> {
    return this.datasets.get(datasetId) || null;
  }

  async getAllDatasets(): Promise<TrainingDataset[]> {
    return Array.from(this.datasets.values());
  }

  // Model Training
  async trainModel(
    datasetId: string, 
    config: Partial<TrainingConfig> = {}
  ): Promise<string> {
    if (this.isTraining) {
      throw new Error('Training already in progress');
    }

    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error('Dataset not found');
    }

    if (dataset.samples.length < 50) {
      throw new Error('Insufficient training data. Need at least 50 samples.');
    }

    this.isTraining = true;
    this.trainingProgress = 0;

    try {
      const trainingConfig: TrainingConfig = {
        batchSize: 32,
        epochs: 10,
        learningRate: 0.001,
        validationSplit: 0.2,
        augmentData: true,
        transferLearning: true,
        baseModel: 'mobilenet',
        optimizer: 'adam',
        ...config
      };

      const modelId = await this.performTraining(dataset, trainingConfig);
      return modelId;
    } finally {
      this.isTraining = false;
      this.trainingProgress = 0;
    }
  }

  private async performTraining(
    dataset: TrainingDataset, 
    config: TrainingConfig
  ): Promise<string> {
    const startTime = Date.now();
    
    // Simulate training process with realistic progress updates
    const totalSteps = config.epochs * Math.ceil(dataset.samples.length / config.batchSize);
    let currentStep = 0;

    // Data preprocessing simulation
    this.trainingProgress = 5;
    await this.delay(1000);

    // Model architecture setup
    this.trainingProgress = 10;
    await this.delay(500);

    // Training loop simulation
    for (let epoch = 0; epoch < config.epochs; epoch++) {
      const epochSteps = Math.ceil(dataset.samples.length / config.batchSize);
      
      for (let step = 0; step < epochSteps; step++) {
        currentStep++;
        this.trainingProgress = 10 + (currentStep / totalSteps) * 80;
        
        // Simulate training step delay
        await this.delay(100 + Math.random() * 200);
      }
    }

    // Model compilation and saving
    this.trainingProgress = 95;
    await this.delay(1000);

    const trainingTime = Date.now() - startTime;
    
    // Generate realistic metrics
    const metrics = this.generateTrainingMetrics(dataset, config, trainingTime);
    
    // Create model record
    const model: LocalModel = {
      id: `model_${Date.now()}`,
      name: `${dataset.name}_model_v${Date.now()}`,
      version: '1.0.0',
      modelPath: `${FileSystem.documentDirectory}models/model_${Date.now()}.tflite`,
      configPath: `${FileSystem.documentDirectory}models/config_${Date.now()}.json`,
      metrics,
      trainingConfig: config,
      createdAt: new Date(),
      lastUsed: new Date(),
      isActive: false,
      size: Math.floor(Math.random() * 10000000) + 5000000 // 5-15MB
    };

    // Save model files (simulated)
    await this.saveModelFiles(model, dataset);
    
    this.models.set(model.id, model);
    await this.saveModels();

    this.trainingProgress = 100;
    await this.delay(500);

    return model.id;
  }

  private generateTrainingMetrics(
    dataset: TrainingDataset, 
    config: TrainingConfig, 
    trainingTime: number
  ): ModelMetrics {
    // Generate realistic metrics based on dataset size and configuration
    const baseAccuracy = 0.7 + (Math.min(dataset.samples.length, 1000) / 1000) * 0.2;
    const noise = (Math.random() - 0.5) * 0.1;
    
    const accuracy = Math.max(0.5, Math.min(0.98, baseAccuracy + noise));
    const precision = accuracy * (0.95 + Math.random() * 0.05);
    const recall = accuracy * (0.90 + Math.random() * 0.10);
    const f1Score = 2 * (precision * recall) / (precision + recall);

    // Generate confusion matrix (simplified 6x6 for our categories)
    const categories = ['safe', 'adult', 'violence', 'racy', 'spam', 'weapons'];
    const confusionMatrix = categories.map(() => 
      categories.map(() => Math.floor(Math.random() * 20))
    );

    // Generate loss curves
    const trainingLoss = Array.from({ length: config.epochs }, (_, i) => {
      const baseLoss = 2.0;
      const decay = Math.exp(-i * 0.3);
      return baseLoss * decay + Math.random() * 0.1;
    });

    const validationLoss = trainingLoss.map(loss => 
      loss + Math.random() * 0.2 - 0.1
    );

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix,
      trainingLoss,
      validationLoss,
      trainingTime
    };
  }

  private async saveModelFiles(model: LocalModel, dataset: TrainingDataset): Promise<void> {
    try {
      // Ensure models directory exists
      const modelsDir = `${FileSystem.documentDirectory}models/`;
      const dirInfo = await FileSystem.getInfoAsync(modelsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
      }

      // Save model configuration
      const config = {
        modelId: model.id,
        version: model.version,
        trainingConfig: model.trainingConfig,
        metrics: model.metrics,
        categories: ['safe', 'adult', 'violence', 'racy', 'spam', 'weapons'],
        inputShape: [224, 224, 3], // Standard image input
        outputShape: [6], // Number of categories
        createdAt: model.createdAt.toISOString()
      };

      await FileSystem.writeAsStringAsync(
        model.configPath,
        JSON.stringify(config, null, 2)
      );

      // In a real implementation, you would save the actual TensorFlow Lite model here
      // For now, we'll create a placeholder file
      await FileSystem.writeAsStringAsync(
        model.modelPath,
        `# TensorFlow Lite Model Placeholder\n# Model ID: ${model.id}\n# Created: ${new Date().toISOString()}`
      );

    } catch (error) {
      console.error('Failed to save model files:', error);
      throw error;
    }
  }

  // Model Management
  async setActiveModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error('Model not found');
    }

    // Deactivate current active model
    if (this.activeModel) {
      this.activeModel.isActive = false;
    }

    // Activate new model
    model.isActive = true;
    model.lastUsed = new Date();
    this.activeModel = model;

    await this.saveModels();
    await this.saveActiveModel();
  }

  async deleteModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error('Model not found');
    }

    // Delete model files
    try {
      await FileSystem.deleteAsync(model.modelPath, { idempotent: true });
      await FileSystem.deleteAsync(model.configPath, { idempotent: true });
    } catch (error) {
      console.warn('Failed to delete model files:', error);
    }

    // Remove from memory and storage
    this.models.delete(modelId);
    
    if (this.activeModel?.id === modelId) {
      this.activeModel = null;
    }

    await this.saveModels();
  }

  async getAllModels(): Promise<LocalModel[]> {
    return Array.from(this.models.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  getActiveModel(): LocalModel | null {
    return this.activeModel;
  }

  // Model Inference (placeholder for actual TensorFlow Lite integration)
  async predictImage(imageBase64: string): Promise<{
    category: string;
    confidence: number;
    probabilities: { [category: string]: number };
  }> {
    if (!this.activeModel) {
      throw new Error('No active model available');
    }

    // Simulate inference
    await this.delay(200 + Math.random() * 300);

    const categories = ['safe', 'adult', 'violence', 'racy', 'spam', 'weapons'];
    const probabilities: { [category: string]: number } = {};
    
    // Generate realistic probability distribution
    let total = 0;
    categories.forEach(category => {
      const prob = Math.random();
      probabilities[category] = prob;
      total += prob;
    });

    // Normalize probabilities
    Object.keys(probabilities).forEach(category => {
      probabilities[category] /= total;
    });

    // Find category with highest probability
    const maxCategory = Object.entries(probabilities)
      .reduce((max, [category, prob]) => prob > max.prob ? { category, prob } : max, 
              { category: 'safe', prob: 0 });

    return {
      category: maxCategory.category,
      confidence: maxCategory.prob,
      probabilities
    };
  }

  // Training Progress
  getTrainingProgress(): number {
    return this.trainingProgress;
  }

  isCurrentlyTraining(): boolean {
    return this.isTraining;
  }

  // Data Export/Import
  async exportDataset(datasetId: string): Promise<string> {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error('Dataset not found');
    }

    return JSON.stringify(dataset, null, 2);
  }

  async importDataset(datasetJson: string): Promise<string> {
    try {
      const dataset: TrainingDataset = JSON.parse(datasetJson);
      
      // Generate new ID to avoid conflicts
      dataset.id = `dataset_${Date.now()}`;
      dataset.createdAt = new Date(dataset.createdAt);
      dataset.lastModified = new Date();
      
      // Validate samples
      dataset.samples = dataset.samples.map(sample => ({
        ...sample,
        metadata: {
          ...sample.metadata,
          timestamp: new Date(sample.metadata.timestamp)
        }
      }));

      this.datasets.set(dataset.id, dataset);
      await this.saveDatasets();
      
      return dataset.id;
    } catch (error) {
      throw new Error('Invalid dataset format');
    }
  }

  // Analytics
  async getTrainingAnalytics(): Promise<{
    totalDatasets: number;
    totalSamples: number;
    totalModels: number;
    averageAccuracy: number;
    categoryDistribution: { [category: string]: number };
    trainingHistory: { date: string; accuracy: number; modelId: string }[];
  }> {
    const datasets = Array.from(this.datasets.values());
    const models = Array.from(this.models.values());
    
    const totalSamples = datasets.reduce((sum, dataset) => sum + dataset.samples.length, 0);
    const averageAccuracy = models.length > 0 
      ? models.reduce((sum, model) => sum + model.metrics.accuracy, 0) / models.length 
      : 0;

    const categoryDistribution: { [category: string]: number } = {};
    datasets.forEach(dataset => {
      dataset.samples.forEach(sample => {
        categoryDistribution[sample.category] = (categoryDistribution[sample.category] || 0) + 1;
      });
    });

    const trainingHistory = models.map(model => ({
      date: model.createdAt.toISOString().split('T')[0],
      accuracy: model.metrics.accuracy,
      modelId: model.id
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalDatasets: datasets.length,
      totalSamples,
      totalModels: models.length,
      averageAccuracy,
      categoryDistribution,
      trainingHistory
    };
  }

  // Storage Management
  private async loadDatasets(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('ml_training_datasets');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([id, data]: [string, any]) => {
          const dataset: TrainingDataset = {
            ...data,
            createdAt: new Date(data.createdAt),
            lastModified: new Date(data.lastModified),
            samples: data.samples.map((sample: any) => ({
              ...sample,
              metadata: {
                ...sample.metadata,
                timestamp: new Date(sample.metadata.timestamp)
              }
            }))
          };
          this.datasets.set(id, dataset);
        });
      }
    } catch (error) {
      console.error('Failed to load datasets:', error);
    }
  }

  private async saveDatasets(): Promise<void> {
    try {
      const datasetsObj = Object.fromEntries(this.datasets);
      await AsyncStorage.setItem('ml_training_datasets', JSON.stringify(datasetsObj));
    } catch (error) {
      console.error('Failed to save datasets:', error);
    }
  }

  private async loadModels(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('ml_training_models');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([id, data]: [string, any]) => {
          const model: LocalModel = {
            ...data,
            createdAt: new Date(data.createdAt),
            lastUsed: new Date(data.lastUsed)
          };
          this.models.set(id, model);
        });
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }

  private async saveModels(): Promise<void> {
    try {
      const modelsObj = Object.fromEntries(this.models);
      await AsyncStorage.setItem('ml_training_models', JSON.stringify(modelsObj));
    } catch (error) {
      console.error('Failed to save models:', error);
    }
  }

  private async loadActiveModel(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('ml_active_model_id');
      if (stored) {
        const model = this.models.get(stored);
        if (model) {
          this.activeModel = model;
        }
      }
    } catch (error) {
      console.error('Failed to load active model:', error);
    }
  }

  private async saveActiveModel(): Promise<void> {
    try {
      const activeModelId = this.activeModel?.id || '';
      await AsyncStorage.setItem('ml_active_model_id', activeModelId);
    } catch (error) {
      console.error('Failed to save active model:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default LocalMLTrainingService;