import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ABTestExperiment,
  ABTestVariant,
  ABTestAssignment,
  ExperimentResults,
  ExperimentStatus,
  ExperimentFilters,
  ExperimentReport,
  MetricResult,
  GuardrailViolation,
  ValidationResult,
  SampleSizeEstimate,
  ABTestingService as IABTestingService,
  VariantConfig,
  ExperimentTargetAudience,
  StatisticalConfig,
  ExperimentMetric,
  AnalysisConfig,
  ExposureEvent,
  VariantResults,
  AlertThreshold
} from '@/types/recommendation';
import SecurityManager from '@/services/security/SecurityManager';
import NetworkSecurity from '@/services/security/NetworkSecurity';
import MLLoggingService from './MLLoggingService';

interface ABTestingConfig {
  enabled: boolean;
  defaultTrafficAllocation: number;
  maxConcurrentExperiments: number;
  minExperimentDuration: number; // days
  maxExperimentDuration: number; // days
  defaultSignificanceLevel: number;
  defaultStatisticalPower: number;
  enableSequentialTesting: boolean;
  enableGuardrailMonitoring: boolean;
  enableAutomatedReporting: boolean;
  reportingFrequency: 'daily' | 'weekly' | 'custom';
}

interface UserAssignmentCache {
  userId: string;
  assignments: Map<string, ABTestAssignment>;
  lastUpdated: number;
  cacheExpiry: number;
}

interface ExperimentCache {
  experiments: Map<string, ABTestExperiment>;
  activeExperiments: string[];
  lastUpdated: number;
  cacheExpiry: number;
}

interface ExperimentMetrics {
  experimentId: string;
  totalUsers: number;
  exposedUsers: number;
  conversionEvents: number;
  guardrailViolations: number;
  lastUpdated: number;
  variantMetrics: Map<string, VariantMetrics>;
}

interface VariantMetrics {
  variantId: string;
  usersAssigned: number;
  usersExposed: number;
  conversionRate: number;
  averageEngagement: number;
  retentionRate: number;
  revenuePerUser: number;
}

class ABTestingService implements IABTestingService {
  private static instance: ABTestingService;
  private config: ABTestingConfig;
  private securityManager: SecurityManager;
  private networkSecurity: NetworkSecurity;
  private mlLoggingService: MLLoggingService;
  
  // Caching and state management
  private userAssignmentCache: Map<string, UserAssignmentCache> = new Map();
  private experimentCache: ExperimentCache | null = null;
  private experimentMetrics: Map<string, ExperimentMetrics> = new Map();
  
  // Assignment and randomization
  private assignmentSeed: string;
  private hashFunction: (input: string) => number;
  
  // Monitoring and alerts
  private alertThresholds: Map<string, AlertThreshold[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.securityManager = SecurityManager.getInstance();
    this.networkSecurity = NetworkSecurity.getInstance();
    this.mlLoggingService = MLLoggingService.getInstance();
    this.assignmentSeed = this.generateAssignmentSeed();
    this.hashFunction = this.createHashFunction();
    
    this.config = {
      enabled: true,
      defaultTrafficAllocation: 0.1, // 10% default
      maxConcurrentExperiments: 10,
      minExperimentDuration: 7, // 1 week minimum
      maxExperimentDuration: 90, // 3 months maximum
      defaultSignificanceLevel: 0.05,
      defaultStatisticalPower: 0.8,
      enableSequentialTesting: true,
      enableGuardrailMonitoring: true,
      enableAutomatedReporting: true,
      reportingFrequency: 'daily'
    };
    
    this.initialize();
  }

  static getInstance(): ABTestingService {
    if (!ABTestingService.instance) {
      ABTestingService.instance = new ABTestingService();
    }
    return ABTestingService.instance;
  }

  private async initialize(): Promise<void> {
    try {
      // Load cached experiments and assignments
      await this.loadExperimentCache();
      await this.loadUserAssignments();
      
      // Start monitoring for active experiments
      this.startExperimentMonitoring();
      
      console.log('A/B Testing Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize A/B Testing Service:', error);
    }
  }

  // ===== EXPERIMENT MANAGEMENT =====

  async createExperiment(experiment: ABTestExperiment): Promise<string> {
    try {
      // Validate experiment configuration
      const validation = await this.validateExperimentConfig(experiment);
      if (!validation.isValid) {
        throw new Error(`Invalid experiment configuration: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Check concurrent experiment limits
      const activeExperiments = await this.getActiveExperiments();
      if (activeExperiments.length >= this.config.maxConcurrentExperiments) {
        throw new Error('Maximum concurrent experiments limit reached');
      }

      // Generate unique experiment ID
      const experimentId = this.generateExperimentId();
      const enhancedExperiment: ABTestExperiment = {
        ...experiment,
        experimentId,
        status: 'draft',
        createdAt: Date.now(),
        lastModified: Date.now()
      };

      // Store experiment
      await this.storeExperiment(enhancedExperiment);
      
      // Update cache
      await this.refreshExperimentCache();
      
      // Log experiment creation
      await this.logExperimentEvent(experimentId, 'experiment_created', {
        experimentName: experiment.experimentName,
        variants: experiment.variants.length,
        trafficAllocation: experiment.trafficAllocation
      });

      console.log(`Created experiment: ${experimentId}`);
      return experimentId;
    } catch (error) {
      console.error('Failed to create experiment:', error);
      throw error;
    }
  }

  async updateExperiment(experimentId: string, updates: Partial<ABTestExperiment>): Promise<void> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      // Prevent updates to running experiments (except status changes)
      if (experiment.status === 'active' && updates.status !== 'paused' && updates.status !== 'completed') {
        throw new Error('Cannot modify active experiment configuration');
      }

      const updatedExperiment: ABTestExperiment = {
        ...experiment,
        ...updates,
        lastModified: Date.now()
      };

      // Validate updated configuration
      const validation = await this.validateExperimentConfig(updatedExperiment);
      if (!validation.isValid) {
        throw new Error(`Invalid experiment update: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Store updated experiment
      await this.storeExperiment(updatedExperiment);
      
      // Update cache
      await this.refreshExperimentCache();
      
      // Log experiment update
      await this.logExperimentEvent(experimentId, 'experiment_updated', updates);

      console.log(`Updated experiment: ${experimentId}`);
    } catch (error) {
      console.error('Failed to update experiment:', error);
      throw error;
    }
  }

  async deleteExperiment(experimentId: string): Promise<void> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      // Prevent deletion of active experiments
      if (experiment.status === 'active') {
        throw new Error('Cannot delete active experiment. Stop it first.');
      }

      // Remove experiment from storage
      await AsyncStorage.removeItem(`experiment_${experimentId}`);
      
      // Clean up user assignments
      await this.cleanupExperimentAssignments(experimentId);
      
      // Update cache
      await this.refreshExperimentCache();
      
      // Log experiment deletion
      await this.logExperimentEvent(experimentId, 'experiment_deleted', {
        experimentName: experiment.experimentName
      });

      console.log(`Deleted experiment: ${experimentId}`);
    } catch (error) {
      console.error('Failed to delete experiment:', error);
      throw error;
    }
  }

  async getExperiment(experimentId: string): Promise<ABTestExperiment | null> {
    try {
      // Check cache first
      if (this.experimentCache?.experiments.has(experimentId)) {
        return this.experimentCache.experiments.get(experimentId)!;
      }

      // Load from storage
      const experimentData = await AsyncStorage.getItem(`experiment_${experimentId}`);
      if (!experimentData) {
        return null;
      }

      const experiment: ABTestExperiment = JSON.parse(experimentData);
      
      // Update cache
      if (this.experimentCache) {
        this.experimentCache.experiments.set(experimentId, experiment);
      }

      return experiment;
    } catch (error) {
      console.error('Failed to get experiment:', error);
      return null;
    }
  }

  async listExperiments(filters?: ExperimentFilters): Promise<ABTestExperiment[]> {
    try {
      // Ensure cache is loaded
      if (!this.experimentCache) {
        await this.loadExperimentCache();
      }

      let experiments = Array.from(this.experimentCache?.experiments.values() || []);

      // Apply filters
      if (filters) {
        if (filters.status) {
          experiments = experiments.filter(exp => filters.status!.includes(exp.status));
        }
        if (filters.category) {
          experiments = experiments.filter(exp => filters.category!.includes(exp.category));
        }
        if (filters.createdBy) {
          experiments = experiments.filter(exp => exp.createdBy === filters.createdBy);
        }
        if (filters.tags) {
          experiments = experiments.filter(exp => 
            filters.tags!.some(tag => exp.tags.includes(tag))
          );
        }
        if (filters.dateRange) {
          experiments = experiments.filter(exp => 
            exp.createdAt >= filters.dateRange!.start && 
            exp.createdAt <= filters.dateRange!.end
          );
        }
      }

      return experiments;
    } catch (error) {
      console.error('Failed to list experiments:', error);
      return [];
    }
  }

  // ===== EXPERIMENT LIFECYCLE =====

  async startExperiment(experimentId: string): Promise<void> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      if (experiment.status !== 'draft') {
        throw new Error('Only draft experiments can be started');
      }

      // Final validation before starting
      const validation = await this.validateExperimentConfig(experiment);
      if (!validation.isValid) {
        throw new Error(`Cannot start experiment: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Update experiment status
      const updatedExperiment: ABTestExperiment = {
        ...experiment,
        status: 'active',
        startDate: Date.now(),
        lastModified: Date.now()
      };

      await this.storeExperiment(updatedExperiment);
      await this.refreshExperimentCache();

      // Initialize experiment metrics
      await this.initializeExperimentMetrics(experimentId);

      // Log experiment start
      await this.logExperimentEvent(experimentId, 'experiment_started', {
        startDate: updatedExperiment.startDate
      });

      console.log(`Started experiment: ${experimentId}`);
    } catch (error) {
      console.error('Failed to start experiment:', error);
      throw error;
    }
  }

  async pauseExperiment(experimentId: string): Promise<void> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      if (experiment.status !== 'active') {
        throw new Error('Only active experiments can be paused');
      }

      // Update experiment status
      const updatedExperiment: ABTestExperiment = {
        ...experiment,
        status: 'paused',
        lastModified: Date.now()
      };

      await this.storeExperiment(updatedExperiment);
      await this.refreshExperimentCache();

      // Log experiment pause
      await this.logExperimentEvent(experimentId, 'experiment_paused', {
        pauseDate: Date.now()
      });

      console.log(`Paused experiment: ${experimentId}`);
    } catch (error) {
      console.error('Failed to pause experiment:', error);
      throw error;
    }
  }

  async stopExperiment(experimentId: string, reason: string): Promise<void> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      if (experiment.status !== 'active' && experiment.status !== 'paused') {
        throw new Error('Only active or paused experiments can be stopped');
      }

      // Generate final results
      const results = await this.generateExperimentResults(experimentId);

      // Update experiment status
      const updatedExperiment: ABTestExperiment = {
        ...experiment,
        status: 'completed',
        endDate: Date.now(),
        lastModified: Date.now(),
        results
      };

      await this.storeExperiment(updatedExperiment);
      await this.refreshExperimentCache();

      // Log experiment stop
      await this.logExperimentEvent(experimentId, 'experiment_stopped', {
        stopDate: Date.now(),
        reason,
        results: results ? 'generated' : 'failed'
      });

      console.log(`Stopped experiment: ${experimentId} - Reason: ${reason}`);
    } catch (error) {
      console.error('Failed to stop experiment:', error);
      throw error;
    }
  }

  async archiveExperiment(experimentId: string): Promise<void> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      if (experiment.status !== 'completed') {
        throw new Error('Only completed experiments can be archived');
      }

      // Update experiment status
      const updatedExperiment: ABTestExperiment = {
        ...experiment,
        status: 'archived',
        lastModified: Date.now()
      };

      await this.storeExperiment(updatedExperiment);
      await this.refreshExperimentCache();

      // Log experiment archive
      await this.logExperimentEvent(experimentId, 'experiment_archived', {
        archiveDate: Date.now()
      });

      console.log(`Archived experiment: ${experimentId}`);
    } catch (error) {
      console.error('Failed to archive experiment:', error);
      throw error;
    }
  }

  // ===== USER ASSIGNMENT =====

  async assignUserToExperiment(userId: string, experimentId: string): Promise<ABTestAssignment> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      if (experiment.status !== 'active') {
        throw new Error('Cannot assign users to inactive experiment');
      }

      // Check if user is already assigned
      const existingAssignment = await this.getUserAssignment(userId, experimentId);
      if (existingAssignment) {
        return existingAssignment;
      }

      // Check if user meets targeting criteria
      const isEligible = await this.checkUserEligibility(userId, experiment.targetAudience);
      if (!isEligible) {
        throw new Error('User does not meet experiment targeting criteria');
      }

      // Determine variant assignment
      const variantId = this.assignUserToVariant(userId, experiment);
      const variant = experiment.variants.find(v => v.variantId === variantId);
      if (!variant) {
        throw new Error('Failed to assign user to variant');
      }

      // Create assignment
      const assignment: ABTestAssignment = {
        userId,
        experimentId,
        variantId,
        variantName: variant.variantName,
        assignmentTimestamp: Date.now(),
        assignmentMethod: 'deterministic',
        assignmentContext: {
          experimentName: experiment.experimentName,
          trafficAllocation: experiment.trafficAllocation
        },
        isExposed: false,
        exposureEvents: []
      };

      // Store assignment
      await this.storeUserAssignment(assignment);

      // Update experiment metrics
      await this.updateExperimentMetrics(experimentId, 'user_assigned', { variantId });

      // Log assignment
      await this.logExperimentEvent(experimentId, 'user_assigned', {
        userId,
        variantId,
        variantName: variant.variantName
      });

      return assignment;
    } catch (error) {
      console.error('Failed to assign user to experiment:', error);
      throw error;
    }
  }

  async getUserAssignments(userId: string): Promise<ABTestAssignment[]> {
    try {
      // Check cache first
      const cached = this.userAssignmentCache.get(userId);
      if (cached && Date.now() < cached.cacheExpiry) {
        return Array.from(cached.assignments.values());
      }

      // Load from storage
      const assignmentsData = await AsyncStorage.getItem(`user_assignments_${userId}`);
      if (!assignmentsData) {
        return [];
      }

      const assignments: ABTestAssignment[] = JSON.parse(assignmentsData);
      
      // Update cache
      this.userAssignmentCache.set(userId, {
        userId,
        assignments: new Map(assignments.map(a => [a.experimentId, a])),
        lastUpdated: Date.now(),
        cacheExpiry: Date.now() + 60 * 60 * 1000 // 1 hour
      });

      return assignments;
    } catch (error) {
      console.error('Failed to get user assignments:', error);
      return [];
    }
  }

  async getVariantConfig(userId: string, experimentId: string): Promise<VariantConfig | null> {
    try {
      const assignment = await this.getUserAssignment(userId, experimentId);
      if (!assignment) {
        return null;
      }

      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        return null;
      }

      const variant = experiment.variants.find(v => v.variantId === assignment.variantId);
      if (!variant) {
        return null;
      }

      // Record exposure if not already exposed
      if (!assignment.isExposed) {
        await this.recordExposure(userId, experimentId, 'impression');
      }

      return variant.config;
    } catch (error) {
      console.error('Failed to get variant config:', error);
      return null;
    }
  }

  // ===== ANALYTICS AND REPORTING =====

  async getExperimentResults(experimentId: string): Promise<ExperimentResults> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      // Return cached results if available
      if (experiment.results) {
        return experiment.results;
      }

      // Generate results
      return await this.generateExperimentResults(experimentId);
    } catch (error) {
      console.error('Failed to get experiment results:', error);
      throw error;
    }
  }

  async generateExperimentReport(experimentId: string, format: 'summary' | 'detailed'): Promise<ExperimentReport> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      const results = await this.getExperimentResults(experimentId);
      
      const report: ExperimentReport = {
        experimentId,
        experimentName: experiment.experimentName,
        reportType: format,
        generatedAt: Date.now(),
        generatedBy: 'system',
        reportPeriod: {
          start: experiment.startDate,
          end: experiment.endDate || Date.now()
        },
        executiveSummary: {
          conclusion: this.generateConclusion(results),
          recommendation: this.generateRecommendation(results),
          keyFindings: this.extractKeyFindings(results),
          businessImpact: this.calculateBusinessImpact(results)
        },
        results,
        charts: this.generateReportCharts(results),
        appendices: {
          methodology: 'Frequentist statistical analysis with sequential testing',
          assumptions: [
            'Random user assignment',
            'Independent observations',
            'Stable user behavior during experiment'
          ],
          limitations: [
            'Limited to current user base',
            'Short-term effects only',
            'Platform-specific results'
          ],
          nextSteps: this.generateNextSteps(results)
        }
      };

      return report;
    } catch (error) {
      console.error('Failed to generate experiment report:', error);
      throw error;
    }
  }

  async getExperimentMetrics(experimentId: string, metricIds: string[]): Promise<MetricResult[]> {
    try {
      const metrics = this.experimentMetrics.get(experimentId);
      if (!metrics) {
        return [];
      }

      // Mock implementation - in real app, this would calculate actual metrics
      return metricIds.map(metricId => ({
        metricId,
        metricName: metricId,
        testStatistic: Math.random() * 2 - 1,
        pValue: Math.random() * 0.1,
        confidenceInterval: [Math.random() * 0.1, Math.random() * 0.2] as [number, number],
        effectSize: Math.random() * 0.1,
        practicalSignificance: Math.random() > 0.5,
        businessImpact: Math.random() * 1000,
        variantComparisons: []
      }));
    } catch (error) {
      console.error('Failed to get experiment metrics:', error);
      return [];
    }
  }

  // ===== REAL-TIME MONITORING =====

  async getExperimentStatus(experimentId: string): Promise<ExperimentStatus> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      const metrics = this.experimentMetrics.get(experimentId);
      const totalUsers = metrics?.totalUsers || 0;
      const exposedUsers = metrics?.exposedUsers || 0;

      return {
        experimentId,
        status: experiment.status,
        usersAssigned: totalUsers,
        usersExposed: exposedUsers,
        exposureRate: totalUsers > 0 ? exposedUsers / totalUsers : 0,
        variantDistribution: this.calculateVariantDistribution(experimentId),
        healthScore: this.calculateHealthScore(experimentId),
        healthIssues: await this.detectHealthIssues(experimentId),
        progressPercentage: this.calculateProgress(experiment),
        estimatedCompletionDate: this.estimateCompletionDate(experiment),
        realtimeMetrics: this.getRealtimeMetrics(experimentId),
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Failed to get experiment status:', error);
      throw error;
    }
  }

  async checkGuardrailViolations(experimentId: string): Promise<GuardrailViolation[]> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        return [];
      }

      const violations: GuardrailViolation[] = [];
      const metrics = this.experimentMetrics.get(experimentId);

      if (!metrics) {
        return violations;
      }

      // Check guardrail metrics
      for (const metric of experiment.guardrailMetrics) {
        if (metric.isGuardrail && metric.guardrailThreshold) {
          // Mock violation detection - in real app, this would check actual metrics
          const currentValue = Math.random();
          const threshold = metric.guardrailThreshold;
          
          if ((metric.guardrailDirection === 'decrease' && currentValue > threshold) ||
              (metric.guardrailDirection === 'increase' && currentValue < threshold)) {
            violations.push({
              metricId: metric.metricId,
              metricName: metric.metricName,
              variantId: 'treatment',
              currentValue,
              thresholdValue: threshold,
              violationType: metric.guardrailDirection === 'decrease' ? 'above_threshold' : 'below_threshold',
              severity: 'high',
              detectedAt: Date.now(),
              recommendedActions: ['Pause experiment', 'Investigate cause', 'Adjust targeting']
            });
          }
        }
      }

      return violations;
    } catch (error) {
      console.error('Failed to check guardrail violations:', error);
      return [];
    }
  }

  // ===== CONFIGURATION MANAGEMENT =====

  async validateExperimentConfig(experiment: ABTestExperiment): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    try {
      // Basic validation
      if (!experiment.experimentName || experiment.experimentName.trim().length === 0) {
        errors.push({ field: 'experimentName', message: 'Experiment name is required', code: 'REQUIRED' });
      }

      if (!experiment.variants || experiment.variants.length < 2) {
        errors.push({ field: 'variants', message: 'At least 2 variants are required', code: 'MIN_VARIANTS' });
      }

      if (experiment.trafficAllocation <= 0 || experiment.trafficAllocation > 1) {
        errors.push({ field: 'trafficAllocation', message: 'Traffic allocation must be between 0 and 1', code: 'INVALID_RANGE' });
      }

      // Variant validation
      if (experiment.variants) {
        const totalAllocation = experiment.variants.reduce((sum, v) => sum + v.allocation, 0);
        if (Math.abs(totalAllocation - 1.0) > 0.001) {
          errors.push({ field: 'variants', message: 'Variant allocations must sum to 1.0', code: 'ALLOCATION_SUM' });
        }

        const controlVariants = experiment.variants.filter(v => v.isControl);
        if (controlVariants.length !== 1) {
          errors.push({ field: 'variants', message: 'Exactly one control variant is required', code: 'CONTROL_VARIANT' });
        }
      }

      // Duration validation
      if (experiment.endDate && experiment.startDate) {
        const duration = (experiment.endDate - experiment.startDate) / (24 * 60 * 60 * 1000);
        if (duration < this.config.minExperimentDuration) {
          warnings.push({ 
            field: 'duration', 
            message: `Experiment duration is less than recommended minimum of ${this.config.minExperimentDuration} days`,
            recommendation: 'Consider extending the experiment duration for more reliable results'
          });
        }
        if (duration > this.config.maxExperimentDuration) {
          warnings.push({ 
            field: 'duration', 
            message: `Experiment duration exceeds recommended maximum of ${this.config.maxExperimentDuration} days`,
            recommendation: 'Consider shortening the experiment or breaking it into phases'
          });
        }
      }

      // Statistical power validation
      if (experiment.statisticalConfig.statisticalPower < 0.8) {
        warnings.push({
          field: 'statisticalPower',
          message: 'Statistical power is below recommended 80%',
          recommendation: 'Increase sample size or effect size for better statistical power'
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Failed to validate experiment config:', error);
      return {
        isValid: false,
        errors: [{ field: 'general', message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        warnings: []
      };
    }
  }

  async estimateSampleSize(config: StatisticalConfig, metrics: ExperimentMetric[]): Promise<SampleSizeEstimate> {
    try {
      // Simplified sample size calculation
      const alpha = config.significanceLevel;
      const beta = 1 - config.statisticalPower;
      const primaryMetric = metrics.find(m => m.metricType === 'conversion') || metrics[0];
      
      if (!primaryMetric) {
        throw new Error('No metrics provided for sample size estimation');
      }

      const effectSize = primaryMetric.minimumDetectableEffect;
      const baseline = primaryMetric.expectedBaseline;
      
      // Cohen's formula for sample size (simplified)
      const zAlpha = 1.96; // for alpha = 0.05
      const zBeta = 0.84; // for beta = 0.2 (power = 0.8)
      
      const variance = baseline * (1 - baseline); // for conversion rate
      const sampleSizePerVariant = Math.ceil(
        (2 * variance * Math.pow(zAlpha + zBeta, 2)) / Math.pow(effectSize, 2)
      );
      
      const totalSampleSize = sampleSizePerVariant * 2; // assuming 2 variants
      
      // Estimate duration based on daily active users
      const dailyActiveUsers = 10000; // mock value
      const trafficAllocation = 0.1; // mock value
      const dailyExperimentUsers = dailyActiveUsers * trafficAllocation;
      const estimatedDuration = Math.ceil(totalSampleSize / dailyExperimentUsers);

      return {
        minimumSampleSize: totalSampleSize,
        recommendedSampleSize: Math.ceil(totalSampleSize * 1.2), // 20% buffer
        estimatedDuration,
        variantSampleSizes: {
          control: sampleSizePerVariant,
          treatment: sampleSizePerVariant
        },
        assumptions: {
          dailyActiveUsers,
          conversionRate: baseline,
          trafficAllocation
        }
      };
    } catch (error) {
      console.error('Failed to estimate sample size:', error);
      throw error;
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private async loadExperimentCache(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem('experiment_cache');
      if (cacheData) {
        const cache = JSON.parse(cacheData);
        this.experimentCache = {
          experiments: new Map(cache.experiments),
          activeExperiments: cache.activeExperiments,
          lastUpdated: cache.lastUpdated,
          cacheExpiry: cache.cacheExpiry
        };
      } else {
        this.experimentCache = {
          experiments: new Map(),
          activeExperiments: [],
          lastUpdated: Date.now(),
          cacheExpiry: Date.now() + 60 * 60 * 1000 // 1 hour
        };
      }
    } catch (error) {
      console.error('Failed to load experiment cache:', error);
      this.experimentCache = {
        experiments: new Map(),
        activeExperiments: [],
        lastUpdated: Date.now(),
        cacheExpiry: Date.now() + 60 * 60 * 1000
      };
    }
  }

  private async refreshExperimentCache(): Promise<void> {
    try {
      // Load all experiments from storage
      const keys = await AsyncStorage.getAllKeys();
      const experimentKeys = keys.filter(key => key.startsWith('experiment_'));
      
      const experiments = new Map<string, ABTestExperiment>();
      const activeExperiments: string[] = [];

      for (const key of experimentKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const experiment: ABTestExperiment = JSON.parse(data);
          experiments.set(experiment.experimentId, experiment);
          
          if (experiment.status === 'active') {
            activeExperiments.push(experiment.experimentId);
          }
        }
      }

      this.experimentCache = {
        experiments,
        activeExperiments,
        lastUpdated: Date.now(),
        cacheExpiry: Date.now() + 60 * 60 * 1000
      };

      // Persist cache
      await AsyncStorage.setItem('experiment_cache', JSON.stringify({
        experiments: Array.from(experiments.entries()),
        activeExperiments,
        lastUpdated: this.experimentCache.lastUpdated,
        cacheExpiry: this.experimentCache.cacheExpiry
      }));
    } catch (error) {
      console.error('Failed to refresh experiment cache:', error);
    }
  }

  private async loadUserAssignments(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const assignmentKeys = keys.filter(key => key.startsWith('user_assignments_'));
      
      for (const key of assignmentKeys) {
        const userId = key.replace('user_assignments_', '');
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const assignments: ABTestAssignment[] = JSON.parse(data);
          this.userAssignmentCache.set(userId, {
            userId,
            assignments: new Map(assignments.map(a => [a.experimentId, a])),
            lastUpdated: Date.now(),
            cacheExpiry: Date.now() + 60 * 60 * 1000
          });
        }
      }
    } catch (error) {
      console.error('Failed to load user assignments:', error);
    }
  }

  private generateExperimentId(): string {
    return 'exp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateAssignmentSeed(): string {
    return 'seed_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  private createHashFunction(): (input: string) => number {
    return (input: string) => {
      let hash = 0;
      for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash);
    };
  }

  private assignUserToVariant(userId: string, experiment: ABTestExperiment): string {
    // Deterministic assignment based on user ID and experiment ID
    const hashInput = `${userId}_${experiment.experimentId}_${this.assignmentSeed}`;
    const hash = this.hashFunction(hashInput);
    const normalizedHash = (hash % 10000) / 10000; // 0-1 range

    // Check if user falls within traffic allocation
    if (normalizedHash > experiment.trafficAllocation) {
      throw new Error('User not in experiment traffic allocation');
    }

    // Assign to variant based on allocation
    let cumulativeAllocation = 0;
    for (const variant of experiment.variants) {
      cumulativeAllocation += variant.allocation;
      if (normalizedHash <= cumulativeAllocation * experiment.trafficAllocation) {
        return variant.variantId;
      }
    }

    // Fallback to control variant
    const controlVariant = experiment.variants.find(v => v.isControl);
    return controlVariant?.variantId || experiment.variants[0].variantId;
  }

  private async checkUserEligibility(userId: string, targetAudience: ExperimentTargetAudience): Promise<boolean> {
    // Mock implementation - in real app, this would check actual user data
    return true;
  }

  private async storeExperiment(experiment: ABTestExperiment): Promise<void> {
    await AsyncStorage.setItem(`experiment_${experiment.experimentId}`, JSON.stringify(experiment));
  }

  private async storeUserAssignment(assignment: ABTestAssignment): Promise<void> {
    const assignments = await this.getUserAssignments(assignment.userId);
    const updatedAssignments = assignments.filter(a => a.experimentId !== assignment.experimentId);
    updatedAssignments.push(assignment);
    
    await AsyncStorage.setItem(`user_assignments_${assignment.userId}`, JSON.stringify(updatedAssignments));
    
    // Update cache
    this.userAssignmentCache.set(assignment.userId, {
      userId: assignment.userId,
      assignments: new Map(updatedAssignments.map(a => [a.experimentId, a])),
      lastUpdated: Date.now(),
      cacheExpiry: Date.now() + 60 * 60 * 1000
    });
  }

  private async getUserAssignment(userId: string, experimentId: string): Promise<ABTestAssignment | null> {
    const assignments = await this.getUserAssignments(userId);
    return assignments.find(a => a.experimentId === experimentId) || null;
  }

  private async recordExposure(userId: string, experimentId: string, eventType: 'impression' | 'interaction' | 'conversion'): Promise<void> {
    try {
      const assignment = await this.getUserAssignment(userId, experimentId);
      if (!assignment) {
        return;
      }

      const exposureEvent: ExposureEvent = {
        eventType,
        timestamp: Date.now(),
        context: {}
      };

      assignment.exposureEvents.push(exposureEvent);
      
      if (!assignment.isExposed) {
        assignment.isExposed = true;
        assignment.exposureTimestamp = Date.now();
      }

      await this.storeUserAssignment(assignment);
      
      // Update experiment metrics
      await this.updateExperimentMetrics(experimentId, 'user_exposed', { 
        variantId: assignment.variantId,
        eventType 
      });
    } catch (error) {
      console.error('Failed to record exposure:', error);
    }
  }

  private async getActiveExperiments(): Promise<ABTestExperiment[]> {
    const experiments = await this.listExperiments({ status: ['active'] });
    return experiments;
  }

  private async cleanupExperimentAssignments(experimentId: string): Promise<void> {
    // Remove assignments for deleted experiment
    for (const [userId, cache] of this.userAssignmentCache.entries()) {
      if (cache.assignments.has(experimentId)) {
        cache.assignments.delete(experimentId);
        const assignments = Array.from(cache.assignments.values());
        await AsyncStorage.setItem(`user_assignments_${userId}`, JSON.stringify(assignments));
      }
    }
  }

  private async initializeExperimentMetrics(experimentId: string): Promise<void> {
    const metrics: ExperimentMetrics = {
      experimentId,
      totalUsers: 0,
      exposedUsers: 0,
      conversionEvents: 0,
      guardrailViolations: 0,
      lastUpdated: Date.now(),
      variantMetrics: new Map()
    };

    this.experimentMetrics.set(experimentId, metrics);
  }

  private async updateExperimentMetrics(experimentId: string, eventType: string, data: any): Promise<void> {
    const metrics = this.experimentMetrics.get(experimentId);
    if (!metrics) {
      return;
    }

    switch (eventType) {
      case 'user_assigned':
        metrics.totalUsers++;
        break;
      case 'user_exposed':
        metrics.exposedUsers++;
        break;
      case 'conversion':
        metrics.conversionEvents++;
        break;
      case 'guardrail_violation':
        metrics.guardrailViolations++;
        break;
    }

    metrics.lastUpdated = Date.now();
    this.experimentMetrics.set(experimentId, metrics);
  }

  private async generateExperimentResults(experimentId: string): Promise<ExperimentResults> {
    // Mock implementation - in real app, this would calculate actual statistical results
    return {
      status: 'completed',
      conclusionDate: Date.now(),
      statisticalSignificance: Math.random() > 0.5,
      pValue: Math.random() * 0.1,
      confidenceInterval: [0.02, 0.08] as [number, number],
      effectSize: Math.random() * 0.1,
      variantResults: [],
      metricResults: [],
      analysisTimestamp: Date.now(),
      sampleSize: 1000,
      actualPower: 0.8
    };
  }

  private startExperimentMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        const activeExperiments = await this.getActiveExperiments();
        
        for (const experiment of activeExperiments) {
          // Check guardrail violations
          const violations = await this.checkGuardrailViolations(experiment.experimentId);
          if (violations.length > 0) {
            console.warn(`Guardrail violations detected for experiment ${experiment.experimentId}:`, violations);
          }

          // Check experiment health
          const status = await this.getExperimentStatus(experiment.experimentId);
          if (status.healthScore < 0.7) {
            console.warn(`Low health score for experiment ${experiment.experimentId}: ${status.healthScore}`);
          }
        }
      } catch (error) {
        console.error('Error in experiment monitoring:', error);
      }
    }, 60000); // Check every minute
  }

  private calculateVariantDistribution(experimentId: string): Record<string, number> {
    // Mock implementation
    return {
      control: 0.5,
      treatment: 0.5
    };
  }

  private calculateHealthScore(experimentId: string): number {
    // Mock implementation - in real app, this would calculate based on various health indicators
    return Math.random() * 0.3 + 0.7; // 0.7-1.0 range
  }

  private async detectHealthIssues(experimentId: string): Promise<string[]> {
    const issues: string[] = [];
    
    // Mock health issue detection
    if (Math.random() < 0.1) {
      issues.push('Low exposure rate');
    }
    if (Math.random() < 0.05) {
      issues.push('Uneven variant distribution');
    }
    
    return issues;
  }

  private calculateProgress(experiment: ABTestExperiment): number {
    if (experiment.status !== 'active' || !experiment.startDate || !experiment.endDate) {
      return 0;
    }

    const now = Date.now();
    const duration = experiment.endDate - experiment.startDate;
    const elapsed = now - experiment.startDate;
    
    return Math.min(elapsed / duration, 1.0) * 100;
  }

  private estimateCompletionDate(experiment: ABTestExperiment): number | undefined {
    if (experiment.status !== 'active' || !experiment.endDate) {
      return undefined;
    }
    
    return experiment.endDate;
  }

  private getRealtimeMetrics(experimentId: string): Record<string, number> {
    // Mock real-time metrics
    return {
      activeUsers: Math.floor(Math.random() * 1000),
      conversions: Math.floor(Math.random() * 100),
      revenue: Math.random() * 10000
    };
  }

  private generateConclusion(results: ExperimentResults): string {
    if (results.statisticalSignificance) {
      return 'The experiment shows statistically significant results with positive impact.';
    } else {
      return 'The experiment did not achieve statistical significance.';
    }
  }

  private generateRecommendation(results: ExperimentResults): string {
    if (results.statisticalSignificance && results.effectSize > 0) {
      return 'Recommend rolling out the treatment variant to all users.';
    } else {
      return 'Recommend keeping the current implementation.';
    }
  }

  private extractKeyFindings(results: ExperimentResults): string[] {
    return [
      `Effect size: ${(results.effectSize * 100).toFixed(2)}%`,
      `P-value: ${results.pValue.toFixed(4)}`,
      `Sample size: ${results.sampleSize} users`
    ];
  }

  private calculateBusinessImpact(results: ExperimentResults): string {
    const impact = results.effectSize * 10000; // Mock calculation
    return `Estimated annual impact: $${impact.toFixed(0)}`;
  }

  private generateReportCharts(results: ExperimentResults): any[] {
    return [
      {
        chartId: 'conversion_rate',
        chartType: 'bar',
        title: 'Conversion Rate by Variant',
        description: 'Comparison of conversion rates across variants',
        data: {},
        config: {}
      }
    ];
  }

  private generateNextSteps(results: ExperimentResults): string[] {
    if (results.statisticalSignificance) {
      return [
        'Plan rollout strategy',
        'Monitor post-rollout metrics',
        'Document learnings'
      ];
    } else {
      return [
        'Analyze why experiment was inconclusive',
        'Consider running follow-up experiments',
        'Review experimental design'
      ];
    }
  }

  private async logExperimentEvent(experimentId: string, eventType: string, data: any): Promise<void> {
    try {
      await this.mlLoggingService.logError(new Error(`AB_TEST_EVENT: ${eventType}`), {
        experimentId,
        eventType,
        data,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to log experiment event:', error);
    }
  }

  // Public configuration methods
  updateConfig(config: Partial<ABTestingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ABTestingConfig {
    return { ...this.config };
  }

  getServiceStatus(): any {
    return {
      enabled: this.config.enabled,
      activeExperiments: this.experimentCache?.activeExperiments.length || 0,
      totalExperiments: this.experimentCache?.experiments.size || 0,
      cachedUsers: this.userAssignmentCache.size,
      monitoringActive: !!this.monitoringInterval,
      lastCacheUpdate: this.experimentCache?.lastUpdated || 0
    };
  }
}

export default ABTestingService;