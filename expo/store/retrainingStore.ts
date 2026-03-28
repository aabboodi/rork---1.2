import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import SecureStorage from '@/services/security/SecureStorage';
import {
  RetrainingDataPoint,
  RetrainingDataBatch,
  RetrainingDataConfig,
  RetrainingDataMetrics
} from '@/types/recommendation';
import RetrainingDataPipeline from '@/services/recommendation/RetrainingDataPipeline';
import ModelRetrainingScheduler from '@/services/recommendation/ModelRetrainingScheduler';
import DataValidationService from '@/utils/dataValidation';
import DataExportService from '@/utils/dataExport';

interface ModelPerformanceMetrics {
  algorithmType: string;
  modelVersion: string;
  evaluationTimestamp: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  ndcg: number;
  map: number;
  mrr: number;
  clickThroughRate: number;
  engagementRate: number;
  sessionDuration: number;
  userSatisfaction: number;
  dataFreshness: number;
  dataVolume: number;
  dataQuality: number;
  predictionLatency: number;
  memoryUsage: number;
  cpuUsage: number;
  dataDrift: number;
  conceptDrift: number;
  confidenceIntervals: {
    accuracy: [number, number];
    precision: [number, number];
    recall: [number, number];
  };
}

interface RetrainingSchedule {
  algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions';
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  lastRun: number;
  nextRun: number;
  minDataPoints: number;
  qualityThreshold: number;
  performanceThreshold: number;
  autoTriggerEnabled: boolean;
}

interface RetrainingJob {
  jobId: string;
  algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  dataPointsProcessed: number;
  qualityScore: number;
  performanceScore?: number;
  improvementScore?: number;
  errorMessage?: string;
  outputPath?: string;
  triggeredBy: 'schedule' | 'manual' | 'condition' | 'performance_degradation';
}

interface RetrainingCondition {
  type: 'performance_degradation' | 'data_drift' | 'time_based' | 'volume_based' | 'quality_based';
  threshold: number;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  timeWindow: number;
  customLogic: string;
}

interface RetrainingTrigger {
  triggerId: string;
  algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions';
  triggerType: 'performance' | 'data_drift' | 'schedule' | 'manual' | 'volume' | 'quality';
  triggered: boolean;
  triggerTime: number;
  currentValue: number;
  thresholdValue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoExecute: boolean;
  condition: RetrainingCondition;
}

interface RetrainingWorkflow {
  workflowId: string;
  algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  currentStep: number;
  totalSteps: number;
  startTime: number;
  endTime?: number;
  progress: number;
}

interface DataQualityReport {
  overallScore: number;
  totalDataPoints: number;
  validDataPoints: number;
  errorCount: number;
  warningCount: number;
  categoryScores: Record<string, number>;
  recommendations: string[];
  timestamp: number;
}

interface ExportedFile {
  fileName: string;
  filePath: string;
  fileSize: number;
  format: string;
  dataPointCount: number;
  timestamp: number;
}

interface RetrainingState {
  // Service instances
  retrainingPipeline: RetrainingDataPipeline | null;
  modelScheduler: ModelRetrainingScheduler | null;
  validationService: DataValidationService | null;
  exportService: DataExportService | null;
  
  // Data Management
  dataBuffer: RetrainingDataPoint[];
  aggregatedBatches: RetrainingDataBatch[];
  qualityMetrics: RetrainingDataMetrics | null;
  qualityReport: DataQualityReport | null;
  
  // Automated Scheduling
  schedules: RetrainingSchedule[];
  activeJobs: RetrainingJob[];
  jobHistory: RetrainingJob[];
  triggers: RetrainingTrigger[];
  activeWorkflows: RetrainingWorkflow[];
  
  // Performance Monitoring
  performanceHistory: Record<string, ModelPerformanceMetrics[]>;
  currentPerformance: Record<string, ModelPerformanceMetrics | null>;
  
  // Export Management
  exportedFiles: ExportedFile[];
  lastExportTime: number;
  
  // Configuration
  pipelineConfig: {
    batchSize: number;
    aggregationWindow: number;
    qualityThreshold: number;
    enableCompression: boolean;
    enableEncryption: boolean;
    enableAutomatedRetraining: boolean;
    enablePerformanceMonitoring: boolean;
    enableTriggerMonitoring: boolean;
  };
  
  // State Management
  isInitialized: boolean;
  isProcessing: boolean;
  lastUpdateTime: number;
  
  // Actions
  initializeRetrainingPipeline: () => Promise<void>;
  
  // Data Aggregation Actions
  aggregateRetrainingData: (timeWindow?: number) => Promise<void>;
  addDataToBuffer: (dataPoint: RetrainingDataPoint) => Promise<void>;
  clearDataBuffer: () => void;
  
  // Data Validation Actions
  validateDataPoint: (dataPoint: RetrainingDataPoint) => Promise<{ isValid: boolean; score: number; errors: string[]; warnings: string[] }>;
  validateBatch: (batch: RetrainingDataBatch) => Promise<{ isValid: boolean; score: number; errors: string[]; warnings: string[] }>;
  generateQualityReport: (dataPoints: RetrainingDataPoint[]) => Promise<void>;
  
  // Data Preprocessing Actions
  preprocessDataForTraining: (batches: RetrainingDataBatch[]) => Promise<{
    trainData: RetrainingDataPoint[];
    validationData: RetrainingDataPoint[];
    testData: RetrainingDataPoint[];
  } | null>;
  
  // Export Actions
  exportTrainingData: (
    dataPoints: RetrainingDataPoint[],
    format: 'json' | 'csv' | 'parquet',
    options?: {
      compression?: 'none' | 'gzip' | 'brotli';
      encryption?: boolean;
      splitByAlgorithm?: boolean;
    }
  ) => Promise<string | null>;
  exportBatches: (batches: RetrainingDataBatch[], format: 'json' | 'csv') => Promise<string | null>;
  getExportedFiles: () => ExportedFile[];
  deleteExportedFile: (fileName: string) => Promise<void>;
  
  // Automated Scheduling Actions
  scheduleRetraining: (
    algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions',
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly',
    options?: { minDataPoints?: number; qualityThreshold?: number; performanceThreshold?: number }
  ) => Promise<void>;
  triggerManualRetraining: (algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions') => Promise<string>;
  updateSchedule: (algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions', updates: Partial<RetrainingSchedule>) => Promise<void>;
  enableSchedule: (algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions') => Promise<void>;
  disableSchedule: (algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions') => Promise<void>;
  
  // Performance Monitoring Actions
  evaluateModelPerformance: (algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions') => Promise<ModelPerformanceMetrics | null>;
  getPerformanceHistory: (algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions') => ModelPerformanceMetrics[];
  getCurrentPerformance: (algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions') => ModelPerformanceMetrics | null;
  
  // Trigger Management Actions
  addTrigger: (trigger: Omit<RetrainingTrigger, 'triggerId' | 'triggered' | 'triggerTime' | 'currentValue'>) => Promise<string>;
  removeTrigger: (triggerId: string) => Promise<void>;
  getActiveTriggers: () => RetrainingTrigger[];
  getTriggeredEvents: () => RetrainingTrigger[];
  
  // Workflow Management Actions
  getActiveWorkflows: () => RetrainingWorkflow[];
  getWorkflowStatus: (workflowId: string) => RetrainingWorkflow | null;
  
  // Job Management Actions
  getActiveJobs: () => RetrainingJob[];
  getJobHistory: () => RetrainingJob[];
  getJobStatus: (jobId: string) => RetrainingJob | null;
  cancelJob: (jobId: string) => Promise<void>;
  
  // Configuration Actions
  updatePipelineConfig: (config: Partial<RetrainingState['pipelineConfig']>) => void;
  
  // Analytics Actions
  getRetrainingMetrics: () => {
    totalDataPoints: number;
    totalBatches: number;
    averageQualityScore: number;
    successfulJobs: number;
    failedJobs: number;
    lastSuccessfulRun: number;
    dataPointsPerAlgorithm: Record<string, number>;
    averagePerformanceImprovement: number;
    triggeredJobs: number;
    scheduledJobs: number;
  };
  
  // System Status
  getSystemStatus: () => {
    isInitialized: boolean;
    isProcessing: boolean;
    dataBufferSize: number;
    aggregatedBatchesCount: number;
    activeJobsCount: number;
    activeWorkflowsCount: number;
    activeTriggerCount: number;
    nextScheduledRun: number;
    performanceStatus: Record<string, number>;
  };
  
  // Utility Actions
  clearAllData: () => Promise<void>;
}

// Simple storage for Zustand
const simpleJSONStorage = createJSONStorage(() => ({
  getItem: async (name: string) => {
    try {
      const secureStorage = SecureStorage.getInstance();
      const value = await secureStorage.getItem(name);
      return value;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      await secureStorage.setItem(name, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  },
  removeItem: async (name: string) => {
    try {
      await secureStorage.removeItem(name);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  },
}));

export const useRetrainingStore = create<RetrainingState>()(
  persist(
    (set, get) => ({
      // Initial State
      retrainingPipeline: null,
      modelScheduler: null,
      validationService: null,
      exportService: null,
      
      dataBuffer: [],
      aggregatedBatches: [],
      qualityMetrics: null,
      qualityReport: null,
      
      schedules: [],
      activeJobs: [],
      jobHistory: [],
      triggers: [],
      activeWorkflows: [],
      
      performanceHistory: {},
      currentPerformance: {},
      
      exportedFiles: [],
      lastExportTime: 0,
      
      pipelineConfig: {
        batchSize: 1000,
        aggregationWindow: 60 * 60 * 1000, // 1 hour
        qualityThreshold: 0.7,
        enableCompression: true,
        enableEncryption: true,
        enableAutomatedRetraining: true,
        enablePerformanceMonitoring: true,
        enableTriggerMonitoring: true
      },
      
      isInitialized: false,
      isProcessing: false,
      lastUpdateTime: 0,

      // Initialize retraining pipeline with automated scheduling
      initializeRetrainingPipeline: async () => {
        try {
          set({ isProcessing: true });
          
          const retrainingPipeline = RetrainingDataPipeline.getInstance();
          const modelScheduler = ModelRetrainingScheduler.getInstance();
          const validationService = DataValidationService.getInstance();
          const exportService = DataExportService.getInstance();
          
          // Get initial data
          const qualityMetrics = retrainingPipeline.getQualityMetrics();
          const schedules = modelScheduler.getSchedules();
          const activeJobs: RetrainingJob[] = []; // Fixed: Explicit typing
          const jobHistory: RetrainingJob[] = []; // Fixed: Explicit typing
          const triggers = modelScheduler.getActiveTriggers();
          const activeWorkflows = modelScheduler.getActiveWorkflows();
          const exportedFiles = await exportService.listExports();
          
          // Get performance data
          const performanceHistory: Record<string, ModelPerformanceMetrics[]> = {};
          const currentPerformance: Record<string, ModelPerformanceMetrics | null> = {};
          
          for (const algorithmType of ['posts_feed', 'clips_feed', 'friend_suggestions']) {
            performanceHistory[algorithmType] = modelScheduler.getPerformanceHistory(algorithmType as any);
            currentPerformance[algorithmType] = modelScheduler.getCurrentPerformance(algorithmType as any);
          }
          
          set({
            retrainingPipeline,
            modelScheduler,
            validationService,
            exportService,
            qualityMetrics,
            schedules: schedules.map(s => ({
              algorithmType: s.algorithmType,
              frequency: s.frequency,
              enabled: s.enabled,
              lastRun: s.lastRun,
              nextRun: s.nextRun,
              minDataPoints: s.minDataPoints,
              qualityThreshold: s.qualityThreshold,
              performanceThreshold: s.performanceThreshold || 0.8,
              autoTriggerEnabled: s.autoTriggerEnabled || false
            })),
            activeJobs, // Fixed: Now properly typed
            jobHistory, // Fixed: Now properly typed
            triggers: triggers.map(t => ({
              triggerId: t.triggerId,
              algorithmType: t.algorithmType,
              triggerType: t.triggerType,
              triggered: t.triggered,
              triggerTime: t.triggerTime,
              currentValue: t.currentValue,
              thresholdValue: t.thresholdValue,
              severity: t.severity,
              autoExecute: t.autoExecute,
              condition: t.condition || {
                type: 'threshold',
                operator: 'gte',
                value: t.thresholdValue
              }
            })),
            activeWorkflows: activeWorkflows.map(w => ({
              workflowId: w.workflowId,
              algorithmType: w.algorithmType,
              status: w.status,
              currentStep: w.currentStep,
              totalSteps: w.steps.length,
              startTime: w.startTime,
              endTime: w.endTime,
              progress: w.currentStep / w.steps.length
            })),
            performanceHistory,
            currentPerformance,
            exportedFiles: exportedFiles.map(metadata => ({
              fileName: metadata.exportId,
              filePath: metadata.exportId,
              fileSize: metadata.totalDataPoints,
              format: metadata.exportConfig.format,
              dataPointCount: metadata.totalDataPoints,
              timestamp: new Date(metadata.timestamp).getTime()
            })),
            isInitialized: true,
            isProcessing: false,
            lastUpdateTime: Date.now()
          });
          
          console.log('Automated retraining pipeline initialized successfully');
        } catch (error) {
          console.error('Failed to initialize automated retraining pipeline:', error);
          set({ isProcessing: false });
        }
      },

      // Data aggregation actions
      aggregateRetrainingData: async (timeWindow?: number) => {
        try {
          const { retrainingPipeline } = get();
          if (!retrainingPipeline) return;
          
          set({ isProcessing: true });
          
          const batches = await retrainingPipeline.aggregateRetrainingData(timeWindow);
          const qualityMetrics = retrainingPipeline.getQualityMetrics();
          
          set({
            aggregatedBatches: batches,
            qualityMetrics,
            isProcessing: false,
            lastUpdateTime: Date.now()
          });
          
          console.log(`Aggregated ${batches.length} retraining data batches`);
        } catch (error) {
          console.error('Failed to aggregate retraining data:', error);
          set({ isProcessing: false });
        }
      },

      addDataToBuffer: async (dataPoint: RetrainingDataPoint) => {
        try {
          const { retrainingPipeline, dataBuffer, pipelineConfig } = get();
          if (!retrainingPipeline) return;
          
          await retrainingPipeline.addDataToBuffer(dataPoint);
          
          const updatedBuffer = [...dataBuffer, dataPoint];
          set({ dataBuffer: updatedBuffer });
          
          // Auto-aggregate if buffer is full
          if (updatedBuffer.length >= pipelineConfig.batchSize) {
            await get().aggregateRetrainingData();
          }
        } catch (error) {
          console.error('Failed to add data to buffer:', error);
        }
      },

      clearDataBuffer: () => {
        set({ dataBuffer: [] });
      },

      // Data validation actions
      validateDataPoint: async (dataPoint: RetrainingDataPoint) => {
        try {
          const { validationService } = get();
          if (!validationService) {
            return { isValid: false, score: 0, errors: ['Validation service not initialized'], warnings: [] };
          }
          
          const result = validationService.validateRetrainingDataPoint(dataPoint);
          
          return {
            isValid: result.isValid,
            score: result.score,
            errors: result.errors.map(e => e.message),
            warnings: result.warnings.map(w => w.message)
          };
        } catch (error) {
          console.error('Failed to validate data point:', error);
          return { isValid: false, score: 0, errors: ['Validation failed'], warnings: [] };
        }
      },

      validateBatch: async (batch: RetrainingDataBatch) => {
        try {
          const { validationService } = get();
          if (!validationService) {
            return { isValid: false, score: 0, errors: ['Validation service not initialized'], warnings: [] };
          }
          
          const result = validationService.validateRetrainingDataBatch(batch);
          
          return {
            isValid: result.isValid,
            score: result.score,
            errors: result.errors.map(e => e.message),
            warnings: result.warnings.map(w => w.message)
          };
        } catch (error) {
          console.error('Failed to validate batch:', error);
          return { isValid: false, score: 0, errors: ['Validation failed'], warnings: [] };
        }
      },

      generateQualityReport: async (dataPoints: RetrainingDataPoint[]) => {
        try {
          const { validationService } = get();
          if (!validationService) return;
          
          const report = validationService.generateDataQualityReport(dataPoints);
          
          set({
            qualityReport: {
              overallScore: report.overallScore,
              totalDataPoints: report.totalDataPoints,
              validDataPoints: report.validDataPoints,
              errorCount: report.errorCount,
              warningCount: report.warningCount,
              categoryScores: report.categoryScores,
              recommendations: report.recommendations,
              timestamp: report.timestamp
            }
          });
        } catch (error) {
          console.error('Failed to generate quality report:', error);
        }
      },

      // Data preprocessing actions
      preprocessDataForTraining: async (batches: RetrainingDataBatch[]) => {
        try {
          const { retrainingPipeline } = get();
          if (!retrainingPipeline) return null;
          
          set({ isProcessing: true });
          
          const dataSplit = await retrainingPipeline.preprocessDataForTraining(batches);
          
          set({ isProcessing: false });
          
          return {
            trainData: dataSplit.trainData,
            validationData: dataSplit.validationData,
            testData: dataSplit.testData
          };
        } catch (error) {
          console.error('Failed to preprocess data for training:', error);
          set({ isProcessing: false });
          return null;
        }
      },

      // Export actions
      exportTrainingData: async (dataPoints, format, options = {}) => {
        try {
          const { exportService } = get();
          if (!exportService) return null;
          
          set({ isProcessing: true });
          
          const exportResult = await exportService.exportTrainingData(dataPoints, {
            format,
            compression: options.compression || 'gzip',
            encryption: options.encryption ?? true,
            anonymization: 'enhanced',
            includeMetadata: true,
            splitByAlgorithm: options.splitByAlgorithm ?? true
          });
          
          if (exportResult.success) {
            const newExportedFile: ExportedFile = {
              fileName: exportResult.metadata.exportId,
              filePath: exportResult.metadata.exportId,
              fileSize: exportResult.metadata.totalDataPoints,
              format,
              dataPointCount: exportResult.metadata.totalDataPoints,
              timestamp: Date.now()
            };
            
            const { exportedFiles } = get();
            set({
              exportedFiles: [...exportedFiles, newExportedFile],
              lastExportTime: Date.now(),
              isProcessing: false
            });
            
            return exportResult.metadata.exportId;
          } else {
            set({ isProcessing: false });
            return null;
          }
        } catch (error) {
          console.error('Failed to export training data:', error);
          set({ isProcessing: false });
          return null;
        }
      },

      exportBatches: async (batches, format) => {
        try {
          const { exportService } = get();
          if (!exportService) return null;
          
          const exportResult = await exportService.exportRetrainingBatches(batches, {
            format,
            compression: 'gzip',
            encryption: true,
            anonymization: 'enhanced',
            includeMetadata: true,
            splitByAlgorithm: true
          });
          
          if (exportResult.success) {
            return exportResult.metadata.exportId;
          } else {
            return null;
          }
        } catch (error) {
          console.error('Failed to export batches:', error);
          return null;
        }
      },

      getExportedFiles: () => {
        return get().exportedFiles;
      },

      deleteExportedFile: async (fileName: string) => {
        try {
          const { exportService, exportedFiles } = get();
          if (!exportService) return;
          
          await exportService.deleteExport(fileName);
          
          const updatedFiles = exportedFiles.filter(file => file.fileName !== fileName);
          set({ exportedFiles: updatedFiles });
        } catch (error) {
          console.error('Failed to delete exported file:', error);
        }
      },

      // Automated scheduling actions
      scheduleRetraining: async (algorithmType, frequency, options = {}) => {
        try {
          const { modelScheduler } = get();
          if (!modelScheduler) return;
          
          // Update schedule with new options
          await modelScheduler.updateSchedule(algorithmType, {
            frequency,
            enabled: true,
            minDataPoints: options.minDataPoints || 1000,
            qualityThreshold: options.qualityThreshold || 0.7,
            performanceThreshold: options.performanceThreshold || 0.8
          });
          
          const schedules = modelScheduler.getSchedules();
          set({ 
            schedules: schedules.map(s => ({
              algorithmType: s.algorithmType,
              frequency: s.frequency,
              enabled: s.enabled,
              lastRun: s.lastRun,
              nextRun: s.nextRun,
              minDataPoints: s.minDataPoints,
              qualityThreshold: s.qualityThreshold,
              performanceThreshold: s.performanceThreshold || 0.8,
              autoTriggerEnabled: s.autoTriggerEnabled || false
            }))
          });
        } catch (error) {
          console.error('Failed to schedule retraining:', error);
        }
      },

      triggerManualRetraining: async (algorithmType) => {
        try {
          const { modelScheduler } = get();
          if (!modelScheduler) return '';
          
          const workflowId = await modelScheduler.triggerManualRetraining(algorithmType);
          
          // Update active workflows
          const activeWorkflows = modelScheduler.getActiveWorkflows();
          set({ 
            activeWorkflows: activeWorkflows.map(w => ({
              workflowId: w.workflowId,
              algorithmType: w.algorithmType,
              status: w.status,
              currentStep: w.currentStep,
              totalSteps: w.steps.length,
              startTime: w.startTime,
              endTime: w.endTime,
              progress: w.currentStep / w.steps.length
            }))
          });
          
          return workflowId;
        } catch (error) {
          console.error('Failed to trigger manual retraining:', error);
          return '';
        }
      },

      updateSchedule: async (algorithmType, updates) => {
        try {
          const { modelScheduler } = get();
          if (!modelScheduler) return;
          
          await modelScheduler.updateSchedule(algorithmType, updates);
          
          const schedules = modelScheduler.getSchedules();
          set({ 
            schedules: schedules.map(s => ({
              algorithmType: s.algorithmType,
              frequency: s.frequency,
              enabled: s.enabled,
              lastRun: s.lastRun,
              nextRun: s.nextRun,
              minDataPoints: s.minDataPoints,
              qualityThreshold: s.qualityThreshold,
              performanceThreshold: s.performanceThreshold || 0.8,
              autoTriggerEnabled: s.autoTriggerEnabled || false
            }))
          });
        } catch (error) {
          console.error('Failed to update schedule:', error);
        }
      },

      enableSchedule: async (algorithmType) => {
        await get().updateSchedule(algorithmType, { enabled: true });
      },

      disableSchedule: async (algorithmType) => {
        await get().updateSchedule(algorithmType, { enabled: false });
      },

      // Performance monitoring actions
      evaluateModelPerformance: async (algorithmType) => {
        try {
          const { modelScheduler } = get();
          if (!modelScheduler) return null;
          
          // This would trigger a performance evaluation
          const performance = modelScheduler.getCurrentPerformance(algorithmType);
          
          if (performance) {
            const { currentPerformance } = get();
            set({
              currentPerformance: {
                ...currentPerformance,
                [algorithmType]: performance
              }
            });
          }
          
          return performance;
        } catch (error) {
          console.error('Failed to evaluate model performance:', error);
          return null;
        }
      },

      getPerformanceHistory: (algorithmType) => {
        const { performanceHistory } = get();
        return performanceHistory[algorithmType] || [];
      },

      getCurrentPerformance: (algorithmType) => {
        const { currentPerformance } = get();
        return currentPerformance[algorithmType] || null;
      },

      // Trigger management actions
      addTrigger: async (trigger) => {
        try {
          const { modelScheduler } = get();
          if (!modelScheduler) return '';
          
          const triggerId = await modelScheduler.addTrigger({
            ...trigger,
            condition: trigger.condition || {
              type: 'performance_degradation',
              threshold: 0.8,
              enabled: true,
              priority: 'medium',
              description: 'Default performance threshold',
              operator: 'gte',
              value: 0.8
            } // Ensure condition is provided
          });
          
          const triggers = modelScheduler.getActiveTriggers();
          set({ 
            triggers: triggers.map(t => ({
              triggerId: t.triggerId,
              algorithmType: t.algorithmType,
              triggerType: t.triggerType,
              triggered: t.triggered,
              triggerTime: t.triggerTime,
              currentValue: t.currentValue,
              thresholdValue: t.thresholdValue,
              severity: t.severity,
              autoExecute: t.autoExecute,
              condition: {
                type: t.condition?.type || 'performance_degradation',
                threshold: t.condition?.threshold || 0.8,
                enabled: t.condition?.enabled ?? true,
                priority: t.condition?.priority || 'medium',
                description: t.condition?.description || 'Default performance threshold',
                operator: t.condition?.operator || 'gte',
                value: t.condition?.value ?? 0,
                timeWindow: t.condition?.timeWindow || 24,
                customLogic: t.condition?.customLogic || ''
              }
            }))
          });
          
          return triggerId;
        } catch (error) {
          console.error('Failed to add trigger:', error);
          return '';
        }
      },

      removeTrigger: async (triggerId) => {
        try {
          const { modelScheduler } = get();
          if (!modelScheduler) return;
          
          await modelScheduler.removeTrigger(triggerId);
          
          const triggers = modelScheduler.getActiveTriggers();
          set({ 
            triggers: triggers.map(t => ({
              triggerId: t.triggerId,
              algorithmType: t.algorithmType,
              triggerType: t.triggerType,
              triggered: t.triggered,
              triggerTime: t.triggerTime,
              currentValue: t.currentValue,
              thresholdValue: t.thresholdValue,
              severity: t.severity,
              autoExecute: t.autoExecute,
              condition: {
                type: t.condition?.type || 'performance_degradation',
                threshold: t.condition?.threshold || 0.8,
                enabled: t.condition?.enabled ?? true,
                priority: t.condition?.priority || 'medium',
                description: t.condition?.description || 'Default performance threshold',
                operator: t.condition?.operator || 'gte',
                value: t.condition?.value ?? 0,
                timeWindow: t.condition?.timeWindow || 24,
                customLogic: t.condition?.customLogic || ''
              }
            }))
          });
        } catch (error) {
          console.error('Failed to remove trigger:', error);
        }
      },

      getActiveTriggers: () => {
        const { triggers } = get();
        return triggers.filter(t => !t.triggered);
      },

      getTriggeredEvents: () => {
        const { triggers } = get();
        return triggers.filter(t => t.triggered);
      },

      // Workflow management actions
      getActiveWorkflows: () => {
        return get().activeWorkflows;
      },

      getWorkflowStatus: (workflowId) => {
        const { activeWorkflows } = get();
        return activeWorkflows.find(w => w.workflowId === workflowId) || null;
      },

      // Job management actions
      getActiveJobs: () => {
        return get().activeJobs;
      },

      getJobHistory: () => {
        return get().jobHistory;
      },

      getJobStatus: (jobId) => {
        const { activeJobs, jobHistory } = get();
        return activeJobs.find(j => j.jobId === jobId) || 
               jobHistory.find(j => j.jobId === jobId) || 
               null;
      },

      cancelJob: async (jobId) => {
        try {
          // Implementation would cancel the job
          console.log(`Cancelled job ${jobId}`);
        } catch (error) {
          console.error('Failed to cancel job:', error);
        }
      },

      // Configuration actions
      updatePipelineConfig: (config) => {
        const { pipelineConfig } = get();
        set({
          pipelineConfig: { ...pipelineConfig, ...config }
        });
      },

      // Analytics actions
      getRetrainingMetrics: () => {
        const { qualityMetrics, aggregatedBatches, jobHistory, schedules, performanceHistory } = get();
        
        const successfulJobs = jobHistory.filter(job => job.status === 'completed').length;
        const failedJobs = jobHistory.filter(job => job.status === 'failed').length;
        const lastSuccessfulJob = jobHistory
          .filter(job => job.status === 'completed')
          .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))[0];
        
        const dataPointsPerAlgorithm: Record<string, number> = {};
        for (const batch of aggregatedBatches) {
          dataPointsPerAlgorithm[batch.algorithmType] = 
            (dataPointsPerAlgorithm[batch.algorithmType] || 0) + batch.batchSize;
        }
        
        // Calculate average performance improvement
        let totalImprovement = 0;
        let improvementCount = 0;
        
        for (const [algorithmType, history] of Object.entries(performanceHistory)) {
          if (history.length >= 2) {
            const recent = history[history.length - 1];
            const previous = history[history.length - 2];
            const improvement = recent.accuracy - previous.accuracy;
            totalImprovement += improvement;
            improvementCount++;
          }
        }
        
        const averagePerformanceImprovement = improvementCount > 0 ? totalImprovement / improvementCount : 0;
        
        const triggeredJobs = jobHistory.filter(job => job.triggeredBy === 'condition').length;
        const scheduledJobs = jobHistory.filter(job => job.triggeredBy === 'schedule').length;
        
        return {
          totalDataPoints: qualityMetrics?.totalDataPointsCollected || 0,
          totalBatches: aggregatedBatches.length,
          averageQualityScore: qualityMetrics?.averageDataQuality || 0,
          successfulJobs,
          failedJobs,
          lastSuccessfulRun: lastSuccessfulJob?.endTime || 0,
          dataPointsPerAlgorithm,
          averagePerformanceImprovement,
          triggeredJobs,
          scheduledJobs
        };
      },

      // System status
      getSystemStatus: () => {
        const { 
          isInitialized, 
          isProcessing, 
          dataBuffer, 
          aggregatedBatches, 
          activeJobs, 
          activeWorkflows,
          triggers,
          schedules,
          currentPerformance
        } = get();
        
        const activeTriggerCount = triggers.filter(t => !t.triggered).length;
        const enabledSchedules = schedules.filter(s => s.enabled);
        const nextRun = enabledSchedules.length > 0 
          ? Math.min(...enabledSchedules.map(s => s.nextRun))
          : 0;
        
        const performanceStatus: Record<string, number> = {};
        for (const [algorithmType, performance] of Object.entries(currentPerformance)) {
          performanceStatus[algorithmType] = performance?.accuracy || 0;
        }
        
        return {
          isInitialized,
          isProcessing,
          dataBufferSize: dataBuffer.length,
          aggregatedBatchesCount: aggregatedBatches.length,
          activeJobsCount: activeJobs.length,
          activeWorkflowsCount: activeWorkflows.length,
          activeTriggerCount,
          nextScheduledRun: nextRun,
          performanceStatus
        };
      },

      // Utility actions
      clearAllData: async () => {
        try {
          set({
            dataBuffer: [],
            aggregatedBatches: [],
            qualityReport: null,
            activeJobs: [],
            jobHistory: [],
            exportedFiles: [],
            lastUpdateTime: Date.now()
          });
          
          console.log('All retraining data cleared');
        } catch (error) {
          console.error('Failed to clear all data:', error);
        }
      }
    }),
    {
      name: 'retraining-storage',
      storage: simpleJSONStorage,
      // Only persist configuration and metadata, not large data structures
      partialize: (state) => ({
        pipelineConfig: state.pipelineConfig,
        lastExportTime: state.lastExportTime,
        lastUpdateTime: state.lastUpdateTime,
        // Don't persist large data structures for performance
      }),
    }
  )
);