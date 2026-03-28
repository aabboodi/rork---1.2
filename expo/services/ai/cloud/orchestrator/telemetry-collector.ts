import { TelemetryRecord, DeviceTelemetry, CompressedSummary, HealthStatus } from './types';

/**
 * Telemetry Collector - Collects and analyzes device telemetry data
 */
export class TelemetryCollector {
  private isInitialized = false;
  private telemetryRecords: TelemetryRecord[] = [];
  private deviceTelemetry: Map<string, DeviceTelemetry> = new Map();
  private readonly MAX_RECORDS = 10000;
  private readonly RETENTION_DAYS = 7;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📊 Initializing Telemetry Collector...');

      // Start periodic cleanup and aggregation
      this.startPeriodicTasks();

      this.isInitialized = true;
      console.log('✅ Telemetry Collector initialized');

    } catch (error) {
      console.error('❌ Telemetry Collector initialization failed:', error);
      throw error;
    }
  }

  /**
   * Record processing telemetry
   */
  async recordProcessing(record: Omit<TelemetryRecord, 'timestamp'>): Promise<void> {
    if (!this.isInitialized) {
      return; // Silently fail for telemetry
    }

    try {
      const telemetryRecord: TelemetryRecord = {
        ...record,
        timestamp: Date.now()
      };

      // Add to records
      this.telemetryRecords.push(telemetryRecord);

      // Update device telemetry
      await this.updateDeviceTelemetry(telemetryRecord);

      // Cleanup if too many records
      if (this.telemetryRecords.length > this.MAX_RECORDS) {
        this.cleanupOldRecords();
      }

      console.log(`📊 Recorded telemetry for device ${record.deviceId.substring(0, 8)}... (${record.strategy})`);

    } catch (error) {
      console.error('❌ Failed to record telemetry:', error);
      // Don't throw - telemetry failures shouldn't break the system
    }
  }

  /**
   * Get device telemetry
   */
  async getDeviceTelemetry(deviceId: string): Promise<DeviceTelemetry | null> {
    if (!this.isInitialized) {
      return null;
    }

    return this.deviceTelemetry.get(deviceId) || null;
  }

  /**
   * Get aggregated telemetry statistics
   */
  async getTelemetryStats(): Promise<{
    totalDevices: number;
    totalRequests: number;
    averageSuccessRate: number;
    strategyDistribution: Record<string, number>;
    errorPatterns: Record<string, number>;
    performanceMetrics: {
      averageProcessingTime: number;
      p95ProcessingTime: number;
      p99ProcessingTime: number;
    };
  }> {
    if (!this.isInitialized) {
      return {
        totalDevices: 0,
        totalRequests: 0,
        averageSuccessRate: 0,
        strategyDistribution: {},
        errorPatterns: {},
        performanceMetrics: {
          averageProcessingTime: 0,
          p95ProcessingTime: 0,
          p99ProcessingTime: 0
        }
      };
    }

    const totalDevices = this.deviceTelemetry.size;
    const totalRequests = this.telemetryRecords.length;

    // Calculate success rate
    const successfulRequests = this.telemetryRecords.filter(r => r.success).length;
    const averageSuccessRate = totalRequests > 0 ? successfulRequests / totalRequests : 0;

    // Strategy distribution
    const strategyDistribution: Record<string, number> = {};
    for (const record of this.telemetryRecords) {
      strategyDistribution[record.strategy] = (strategyDistribution[record.strategy] || 0) + 1;
    }

    // Error patterns
    const errorPatterns: Record<string, number> = {};
    for (const record of this.telemetryRecords) {
      if (!record.success && record.error) {
        const errorType = this.categorizeError(record.error);
        errorPatterns[errorType] = (errorPatterns[errorType] || 0) + 1;
      }
    }

    // Performance metrics
    const processingTimes = this.telemetryRecords
      .filter(r => r.success)
      .map(r => r.processingTime)
      .sort((a, b) => a - b);

    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0;

    const p95Index = Math.floor(processingTimes.length * 0.95);
    const p99Index = Math.floor(processingTimes.length * 0.99);

    return {
      totalDevices,
      totalRequests,
      averageSuccessRate,
      strategyDistribution,
      errorPatterns,
      performanceMetrics: {
        averageProcessingTime,
        p95ProcessingTime: processingTimes[p95Index] || 0,
        p99ProcessingTime: processingTimes[p99Index] || 0
      }
    };
  }

  /**
   * Get device performance insights
   */
  async getDeviceInsights(deviceId: string): Promise<{
    recommendations: string[];
    performanceScore: number;
    issues: string[];
  }> {
    const telemetry = await this.getDeviceTelemetry(deviceId);
    
    if (!telemetry) {
      return {
        recommendations: ['No telemetry data available'],
        performanceScore: 0,
        issues: ['Insufficient data']
      };
    }

    const recommendations: string[] = [];
    const issues: string[] = [];
    let performanceScore = 100;

    // Analyze success rate
    if (telemetry.successRate < 0.95) {
      issues.push(`Low success rate: ${(telemetry.successRate * 100).toFixed(1)}%`);
      recommendations.push('Investigate frequent errors and improve error handling');
      performanceScore -= 20;
    }

    // Analyze processing time
    if (telemetry.averageProcessingTime > 2000) {
      issues.push(`High processing time: ${telemetry.averageProcessingTime}ms`);
      recommendations.push('Consider optimizing local models or using cloud processing');
      performanceScore -= 15;
    }

    // Analyze preferred strategies
    const cloudProcessingRatio = (telemetry.preferredStrategies['process_cloud'] || 0) / telemetry.totalRequests;
    if (cloudProcessingRatio > 0.8) {
      recommendations.push('High cloud usage detected - consider upgrading local capabilities');
      performanceScore -= 10;
    }

    // Analyze error patterns
    if (telemetry.errorPatterns.length > 5) {
      issues.push('Multiple error types detected');
      recommendations.push('Review error patterns and implement targeted fixes');
      performanceScore -= 10;
    }

    // Performance metrics analysis
    const avgMemory = telemetry.performanceMetrics.memoryUsage.reduce((a, b) => a + b, 0) / telemetry.performanceMetrics.memoryUsage.length;
    if (avgMemory > 0.8) {
      issues.push('High memory usage detected');
      recommendations.push('Optimize memory usage or increase device memory');
      performanceScore -= 10;
    }

    const avgBatteryDrain = telemetry.performanceMetrics.batteryDrain.reduce((a, b) => a + b, 0) / telemetry.performanceMetrics.batteryDrain.length;
    if (avgBatteryDrain > 0.1) {
      issues.push('High battery drain detected');
      recommendations.push('Optimize processing efficiency or use more cloud processing');
      performanceScore -= 10;
    }

    // Add positive recommendations
    if (telemetry.successRate > 0.98) {
      recommendations.push('Excellent reliability - consider enabling more advanced features');
    }

    if (telemetry.averageProcessingTime < 500) {
      recommendations.push('Great performance - suitable for real-time processing');
    }

    return {
      recommendations,
      performanceScore: Math.max(0, performanceScore),
      issues
    };
  }

  /**
   * Get status
   */
  getStatus(): HealthStatus {
    return {
      status: this.isInitialized ? 'healthy' : 'unhealthy',
      lastCheck: Date.now(),
      details: {
        isInitialized: this.isInitialized,
        totalRecords: this.telemetryRecords.length,
        totalDevices: this.deviceTelemetry.size,
        maxRecords: this.MAX_RECORDS,
        retentionDays: this.RETENTION_DAYS
      }
    };
  }

  // Private methods

  private async updateDeviceTelemetry(record: TelemetryRecord): Promise<void> {
    const deviceId = record.deviceId;
    let telemetry = this.deviceTelemetry.get(deviceId);

    if (!telemetry) {
      telemetry = {
        deviceId,
        totalRequests: 0,
        successRate: 0,
        averageProcessingTime: 0,
        preferredStrategies: {},
        errorPatterns: [],
        lastSeen: Date.now(),
        performanceMetrics: {
          memoryUsage: [],
          batteryDrain: [],
          networkLatency: []
        }
      };
    }

    // Update basic metrics
    telemetry.totalRequests++;
    telemetry.lastSeen = Date.now();

    // Update success rate
    const deviceRecords = this.telemetryRecords.filter(r => r.deviceId === deviceId);
    const successfulRecords = deviceRecords.filter(r => r.success);
    telemetry.successRate = successfulRecords.length / deviceRecords.length;

    // Update average processing time
    const processingTimes = successfulRecords.map(r => r.processingTime);
    telemetry.averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    // Update strategy preferences
    telemetry.preferredStrategies[record.strategy] = (telemetry.preferredStrategies[record.strategy] || 0) + 1;

    // Update error patterns
    if (!record.success && record.error) {
      const errorType = this.categorizeError(record.error);
      if (!telemetry.errorPatterns.includes(errorType)) {
        telemetry.errorPatterns.push(errorType);
      }
    }

    // Update performance metrics (simulate based on device capabilities)
    if (record.summary) {
      const capabilities = record.summary.deviceCapabilities;
      
      // Simulate memory usage based on processing power
      const memoryUsage = capabilities.processingPower === 'high' ? 0.6 : 
                         capabilities.processingPower === 'medium' ? 0.7 : 0.8;
      telemetry.performanceMetrics.memoryUsage.push(memoryUsage);
      
      // Simulate battery drain based on processing time
      const batteryDrain = record.processingTime > 1000 ? 0.05 : 0.02;
      telemetry.performanceMetrics.batteryDrain.push(batteryDrain);
      
      // Simulate network latency based on network quality
      const networkLatency = capabilities.networkQuality === 'excellent' ? 50 :
                            capabilities.networkQuality === 'good' ? 150 : 300;
      telemetry.performanceMetrics.networkLatency.push(networkLatency);
      
      // Keep only recent metrics (last 100 entries)
      const maxMetrics = 100;
      if (telemetry.performanceMetrics.memoryUsage.length > maxMetrics) {
        telemetry.performanceMetrics.memoryUsage = telemetry.performanceMetrics.memoryUsage.slice(-maxMetrics);
        telemetry.performanceMetrics.batteryDrain = telemetry.performanceMetrics.batteryDrain.slice(-maxMetrics);
        telemetry.performanceMetrics.networkLatency = telemetry.performanceMetrics.networkLatency.slice(-maxMetrics);
      }
    }

    this.deviceTelemetry.set(deviceId, telemetry);
  }

  private categorizeError(error: string): string {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('rate limit')) return 'rate_limit';
    if (errorLower.includes('signature')) return 'authentication';
    if (errorLower.includes('network') || errorLower.includes('timeout')) return 'network';
    if (errorLower.includes('memory') || errorLower.includes('resource')) return 'resource';
    if (errorLower.includes('validation') || errorLower.includes('invalid')) return 'validation';
    if (errorLower.includes('policy')) return 'policy';
    
    return 'unknown';
  }

  private cleanupOldRecords(): void {
    const cutoffTime = Date.now() - (this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const initialCount = this.telemetryRecords.length;
    
    this.telemetryRecords = this.telemetryRecords.filter(record => 
      (record.timestamp || 0) > cutoffTime
    );
    
    const removedCount = initialCount - this.telemetryRecords.length;
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} old telemetry records`);
    }
  }

  private startPeriodicTasks(): void {
    // Cleanup old records every hour
    setInterval(() => {
      this.cleanupOldRecords();
    }, 60 * 60 * 1000);

    // Aggregate and analyze telemetry every 5 minutes
    setInterval(async () => {
      try {
        const stats = await this.getTelemetryStats();
        console.log(`📊 Telemetry stats: ${stats.totalDevices} devices, ${stats.totalRequests} requests, ${(stats.averageSuccessRate * 100).toFixed(1)}% success rate`);
      } catch (error) {
        console.error('❌ Failed to generate telemetry stats:', error);
      }
    }, 5 * 60 * 1000);
  }
}