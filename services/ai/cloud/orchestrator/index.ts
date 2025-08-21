import { CompressedSummary, OrchestratorStrategy, ProcessingResult } from './types';
import { PolicyManager } from './policy-manager';
import { TaskRouter } from './task-router';
import { SecurityValidator } from './security-validator';
import { TelemetryCollector } from './telemetry-collector';

/**
 * Central Orchestrator API
 * 
 * Receives compressed summaries from edge devices and returns
 * processing strategies or results based on dynamic policies.
 */
export class CloudOrchestrator {
  private policyManager: PolicyManager;
  private taskRouter: TaskRouter;
  private securityValidator: SecurityValidator;
  private telemetryCollector: TelemetryCollector;
  private isInitialized = false;

  constructor() {
    this.policyManager = new PolicyManager();
    this.taskRouter = new TaskRouter();
    this.securityValidator = new SecurityValidator();
    this.telemetryCollector = new TelemetryCollector();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🌐 Initializing Cloud Orchestrator...');

      await Promise.all([
        this.policyManager.initialize(),
        this.taskRouter.initialize(),
        this.securityValidator.initialize(),
        this.telemetryCollector.initialize()
      ]);

      this.isInitialized = true;
      console.log('✅ Cloud Orchestrator initialized');

    } catch (error) {
      console.error('❌ Cloud orchestrator initialization failed:', error);
      throw error;
    }
  }

  /**
   * Process compressed summary and return strategy or result
   */
  async processCompressedSummary(
    summary: CompressedSummary,
    deviceId: string,
    signature: string
  ): Promise<OrchestratorStrategy | ProcessingResult> {
    if (!this.isInitialized) {
      throw new Error('Cloud orchestrator not initialized');
    }

    const startTime = Date.now();

    try {
      // 1. Security validation
      await this.securityValidator.validateRequest(summary, deviceId, signature);

      // 2. Get current policies for device
      const policies = await this.policyManager.getPoliciesForDevice(deviceId);

      // 3. Determine processing strategy
      const strategy = await this.taskRouter.determineStrategy(
        summary,
        policies,
        deviceId
      );

      // 4. Execute strategy
      let result: OrchestratorStrategy | ProcessingResult;

      if (strategy.type === 'process_cloud') {
        // Process in cloud and return result
        result = await this.processInCloud(summary, strategy);
      } else {
        // Return strategy for edge processing
        result = strategy;
      }

      // 5. Collect telemetry
      await this.telemetryCollector.recordProcessing({
        deviceId,
        summary,
        strategy: strategy.type,
        processingTime: Date.now() - startTime,
        success: true
      });

      return result;

    } catch (error) {
      console.error('❌ Failed to process compressed summary:', error);
      
      // Record failure telemetry
      await this.telemetryCollector.recordProcessing({
        deviceId,
        summary,
        strategy: 'error',
        processingTime: Date.now() - startTime,
        success: false,
        error: String(error)
      });

      throw error;
    }
  }

  /**
   * Update device policies
   */
  async updateDevicePolicies(
    deviceId: string,
    policies: unknown[],
    signature: string
  ): Promise<void> {
    await this.securityValidator.validatePolicyUpdate(deviceId, policies, signature);
    await this.policyManager.updatePoliciesForDevice(deviceId, policies);
  }

  /**
   * Get device status and recommendations
   */
  async getDeviceStatus(deviceId: string): Promise<{
    status: string;
    policies: unknown[];
    recommendations: string[];
    telemetry: unknown;
  }> {
    const [policies, telemetry] = await Promise.all([
      this.policyManager.getPoliciesForDevice(deviceId),
      this.telemetryCollector.getDeviceTelemetry(deviceId)
    ]);

    const recommendations = await this.generateRecommendations(deviceId, telemetry);

    return {
      status: 'active',
      policies,
      recommendations,
      telemetry
    };
  }

  /**
   * Process task in cloud
   */
  private async processInCloud(
    summary: CompressedSummary,
    strategy: OrchestratorStrategy
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      let result: unknown;
      let tokensUsed = 0;
      let modelUsed = '';

      switch (summary.taskType) {
        case 'chat':
          result = await this.processCloudChat(summary, strategy);
          tokensUsed = this.estimateTokens(String(result));
          modelUsed = 'cloud-chat-gpt4';
          break;

        case 'classification':
          result = await this.processCloudClassification(summary, strategy);
          tokensUsed = 200;
          modelUsed = 'cloud-classifier-v2';
          break;

        case 'moderation':
          result = await this.processCloudModeration(summary, strategy);
          tokensUsed = 150;
          modelUsed = 'cloud-moderation-v3';
          break;

        case 'recommendation':
          result = await this.processCloudRecommendation(summary, strategy);
          tokensUsed = 500;
          modelUsed = 'cloud-recommendation-v2';
          break;

        default:
          throw new Error(`Unsupported task type: ${summary.taskType}`);
      }

      return {
        type: 'result',
        taskId: summary.taskId,
        result,
        processingTime: Date.now() - startTime,
        tokensUsed,
        modelUsed,
        confidence: 0.95,
        metadata: {
          processedInCloud: true,
          strategy: strategy.type
        }
      };

    } catch (error) {
      console.error('❌ Cloud processing failed:', error);
      throw error;
    }
  }

  private async processCloudChat(
    summary: CompressedSummary,
    strategy: OrchestratorStrategy
  ): Promise<string> {
    // Use the existing AI API for chat processing
    const response = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant. Respond based on the compressed context provided.'
          },
          {
            role: 'user',
            content: `Context: ${summary.compressedContext}\n\nQuery: ${summary.query}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Chat API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.completion;
  }

  private async processCloudClassification(
    summary: CompressedSummary,
    strategy: OrchestratorStrategy
  ): Promise<{
    category: string;
    confidence: number;
    scores: Record<string, number>;
  }> {
    // Simulate advanced cloud classification
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    const categories = ['business', 'personal', 'urgent', 'spam', 'social'];
    const scores = categories.map(() => Math.random());
    const maxIndex = scores.indexOf(Math.max(...scores));

    return {
      category: categories[maxIndex],
      confidence: Math.max(...scores),
      scores: Object.fromEntries(categories.map((cat, i) => [cat, scores[i]]))
    };
  }

  private async processCloudModeration(
    summary: CompressedSummary,
    strategy: OrchestratorStrategy
  ): Promise<{
    flagged: boolean;
    categories: Record<string, number>;
    severity: string;
  }> {
    // Simulate advanced cloud moderation
    await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 150));

    const categories = ['harassment', 'hate', 'violence', 'sexual', 'spam', 'misinformation'];
    const scores = categories.map(() => Math.random() * 0.3); // Generally safe content

    const maxScore = Math.max(...scores);
    const flagged = maxScore > 0.2;

    return {
      flagged,
      categories: Object.fromEntries(categories.map((cat, i) => [cat, scores[i]])),
      severity: flagged ? (maxScore > 0.25 ? 'high' : 'medium') : 'low'
    };
  }

  private async processCloudRecommendation(
    summary: CompressedSummary,
    strategy: OrchestratorStrategy
  ): Promise<{
    recommendations: Array<{
      id: string;
      type: string;
      score: number;
      title: string;
      reason: string;
    }>;
    totalCount: number;
  }> {
    // Simulate advanced cloud recommendation
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    const recommendations = Array.from({ length: 15 }, (_, i) => ({
      id: `cloud_rec_${i + 1}`,
      type: ['content', 'user', 'topic', 'product'][Math.floor(Math.random() * 4)],
      score: Math.random() * 0.4 + 0.6, // High quality scores
      title: `Advanced Recommendation ${i + 1}`,
      reason: 'Based on advanced ML analysis and user behavior patterns'
    }));

    recommendations.sort((a, b) => b.score - a.score);

    return {
      recommendations: recommendations.slice(0, 8),
      totalCount: recommendations.length
    };
  }

  private async generateRecommendations(
    deviceId: string,
    telemetry: unknown
  ): Promise<string[]> {
    // Generate recommendations based on device telemetry
    const recommendations = [
      'Consider updating local models for better performance',
      'Enable advanced privacy mode for sensitive tasks',
      'Optimize local processing for frequently used features'
    ];

    return recommendations;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get orchestrator health status
   */
  getHealthStatus() {
    return {
      isInitialized: this.isInitialized,
      components: {
        policyManager: this.policyManager.getStatus(),
        taskRouter: this.taskRouter.getStatus(),
        securityValidator: this.securityValidator.getStatus(),
        telemetryCollector: this.telemetryCollector.getStatus()
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const cloudOrchestrator = new CloudOrchestrator();