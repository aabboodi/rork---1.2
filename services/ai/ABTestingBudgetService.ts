import AsyncStorage from '@react-native-async-storage/async-storage';

interface BudgetStrategy {
  id: string;
  name: string;
  description: string;
  ragTokenLimit: number;
  contextCompressionRatio: number;
  localProcessingThreshold: number;
  offloadThreshold: number;
  batteryOptimization: boolean;
  adaptiveScaling: boolean;
}

interface DeviceSegment {
  id: string;
  name: string;
  criteria: {
    deviceType?: string[];
    batteryLevel?: { min: number; max: number };
    networkType?: string[];
    performanceClass?: string[];
  };
}

interface ABTestMetrics {
  strategyId: string;
  deviceSegment: string;
  timestamp: number;
  metrics: {
    accuracy: number;
    satisfaction: number;
    batteryUsage: number; // mAh consumed
    responseTime: number; // ms
    tokensProcessed: number;
    localProcessingRatio: number;
    errorRate: number;
  };
  sessionId: string;
}

interface ABTestResult {
  strategyId: string;
  deviceSegment: string;
  sampleSize: number;
  metrics: {
    avgAccuracy: number;
    avgSatisfaction: number;
    avgBatteryUsage: number;
    avgResponseTime: number;
    avgTokensProcessed: number;
    avgLocalProcessingRatio: number;
    avgErrorRate: number;
  };
  confidenceInterval: {
    accuracy: { lower: number; upper: number };
    satisfaction: { lower: number; upper: number };
    batteryUsage: { lower: number; upper: number };
  };
  statisticalSignificance: boolean;
  improvementOverBaseline: {
    accuracy: number;
    satisfaction: number;
    batteryEfficiency: number;
  };
}

export class ABTestingBudgetService {
  private strategies: BudgetStrategy[] = [
    {
      id: 'conservative',
      name: 'Conservative Budget',
      description: 'Minimal token usage, maximum battery life',
      ragTokenLimit: 50000,
      contextCompressionRatio: 0.3,
      localProcessingThreshold: 100000,
      offloadThreshold: 150000,
      batteryOptimization: true,
      adaptiveScaling: false
    },
    {
      id: 'balanced',
      name: 'Balanced Strategy',
      description: 'Optimal balance between performance and efficiency',
      ragTokenLimit: 100000,
      contextCompressionRatio: 0.5,
      localProcessingThreshold: 180000,
      offloadThreshold: 250000,
      batteryOptimization: true,
      adaptiveScaling: true
    },
    {
      id: 'performance',
      name: 'Performance First',
      description: 'Maximum accuracy and response quality',
      ragTokenLimit: 200000,
      contextCompressionRatio: 0.7,
      localProcessingThreshold: 300000,
      offloadThreshold: 400000,
      batteryOptimization: false,
      adaptiveScaling: true
    },
    {
      id: 'adaptive',
      name: 'Adaptive Intelligence',
      description: 'Dynamic adjustment based on context and device state',
      ragTokenLimit: 150000,
      contextCompressionRatio: 0.6,
      localProcessingThreshold: 200000,
      offloadThreshold: 300000,
      batteryOptimization: true,
      adaptiveScaling: true
    }
  ];

  private deviceSegments: DeviceSegment[] = [
    {
      id: 'mobile_premium',
      name: 'Premium Mobile Devices',
      criteria: {
        deviceType: ['mobile_ios', 'mobile_android'],
        performanceClass: ['high', 'premium'],
        batteryLevel: { min: 30, max: 100 }
      }
    },
    {
      id: 'mobile_standard',
      name: 'Standard Mobile Devices',
      criteria: {
        deviceType: ['mobile_ios', 'mobile_android'],
        performanceClass: ['medium', 'standard'],
        batteryLevel: { min: 20, max: 100 }
      }
    },
    {
      id: 'mobile_budget',
      name: 'Budget Mobile Devices',
      criteria: {
        deviceType: ['mobile_ios', 'mobile_android'],
        performanceClass: ['low', 'budget'],
        batteryLevel: { min: 10, max: 100 }
      }
    },
    {
      id: 'web_desktop',
      name: 'Web Desktop',
      criteria: {
        deviceType: ['web'],
        networkType: ['wifi', 'ethernet']
      }
    },
    {
      id: 'web_mobile',
      name: 'Web Mobile',
      criteria: {
        deviceType: ['web'],
        networkType: ['cellular', 'wifi']
      }
    }
  ];

  private currentTests: Map<string, string> = new Map(); // deviceSegment -> strategyId
  private metrics: ABTestMetrics[] = [];
  private baselineStrategy = 'balanced';

  constructor() {
    this.loadStoredData();
    this.initializeABTests();
  }

  private async loadStoredData(): Promise<void> {
    try {
      const storedMetrics = await AsyncStorage.getItem('ab_test_metrics');
      if (storedMetrics) {
        this.metrics = JSON.parse(storedMetrics);
      }

      const storedTests = await AsyncStorage.getItem('current_ab_tests');
      if (storedTests) {
        const testsData = JSON.parse(storedTests);
        this.currentTests = new Map(Object.entries(testsData));
      }
    } catch (error) {
      console.error('Failed to load AB testing data:', error);
    }
  }

  private async saveData(): Promise<void> {
    try {
      await AsyncStorage.setItem('ab_test_metrics', JSON.stringify(this.metrics));
      await AsyncStorage.setItem('current_ab_tests', JSON.stringify(Object.fromEntries(this.currentTests)));
    } catch (error) {
      console.error('Failed to save AB testing data:', error);
    }
  }

  private initializeABTests(): void {
    // Randomly assign strategies to device segments if not already assigned
    this.deviceSegments.forEach(segment => {
      if (!this.currentTests.has(segment.id)) {
        const availableStrategies = this.strategies.filter(s => s.id !== this.baselineStrategy);
        const randomStrategy = availableStrategies[Math.floor(Math.random() * availableStrategies.length)];
        this.currentTests.set(segment.id, randomStrategy.id);
      }
    });
    this.saveData();
  }

  public getStrategyForDevice(deviceInfo: {
    type: string;
    batteryLevel?: number;
    networkType?: string;
    performanceClass?: string;
  }): BudgetStrategy {
    const segment = this.classifyDevice(deviceInfo);
    const strategyId = this.currentTests.get(segment.id) || this.baselineStrategy;
    return this.strategies.find(s => s.id === strategyId) || this.strategies.find(s => s.id === this.baselineStrategy)!;
  }

  private classifyDevice(deviceInfo: {
    type: string;
    batteryLevel?: number;
    networkType?: string;
    performanceClass?: string;
  }): DeviceSegment {
    for (const segment of this.deviceSegments) {
      let matches = true;

      if (segment.criteria.deviceType && !segment.criteria.deviceType.includes(deviceInfo.type)) {
        matches = false;
      }

      if (segment.criteria.batteryLevel && deviceInfo.batteryLevel !== undefined) {
        const { min, max } = segment.criteria.batteryLevel;
        if (deviceInfo.batteryLevel < min || deviceInfo.batteryLevel > max) {
          matches = false;
        }
      }

      if (segment.criteria.networkType && deviceInfo.networkType && 
          !segment.criteria.networkType.includes(deviceInfo.networkType)) {
        matches = false;
      }

      if (segment.criteria.performanceClass && deviceInfo.performanceClass && 
          !segment.criteria.performanceClass.includes(deviceInfo.performanceClass)) {
        matches = false;
      }

      if (matches) {
        return segment;
      }
    }

    // Default fallback
    return this.deviceSegments[0];
  }

  public recordMetrics(deviceInfo: {
    type: string;
    batteryLevel?: number;
    networkType?: string;
    performanceClass?: string;
  }, metrics: {
    accuracy: number;
    satisfaction: number;
    batteryUsage: number;
    responseTime: number;
    tokensProcessed: number;
    localProcessingRatio: number;
    errorRate: number;
  }, sessionId: string): void {
    const segment = this.classifyDevice(deviceInfo);
    const strategyId = this.currentTests.get(segment.id) || this.baselineStrategy;

    const testMetric: ABTestMetrics = {
      strategyId,
      deviceSegment: segment.id,
      timestamp: Date.now(),
      metrics,
      sessionId
    };

    this.metrics.push(testMetric);
    
    // Keep only last 1000 metrics per strategy-segment combination
    const key = `${strategyId}_${segment.id}`;
    const segmentMetrics = this.metrics.filter(m => `${m.strategyId}_${m.deviceSegment}` === key);
    if (segmentMetrics.length > 1000) {
      const toRemove = segmentMetrics.slice(0, segmentMetrics.length - 1000);
      this.metrics = this.metrics.filter(m => !toRemove.includes(m));
    }

    this.saveData();
  }

  public getABTestResults(): ABTestResult[] {
    const results: ABTestResult[] = [];
    const baselineMetrics = this.getMetricsForStrategy(this.baselineStrategy);

    for (const strategy of this.strategies) {
      if (strategy.id === this.baselineStrategy) continue;

      for (const segment of this.deviceSegments) {
        const strategyMetrics = this.getMetricsForStrategyAndSegment(strategy.id, segment.id);
        const baselineSegmentMetrics = baselineMetrics.filter(m => m.deviceSegment === segment.id);

        if (strategyMetrics.length < 10 || baselineSegmentMetrics.length < 10) {
          continue; // Need minimum sample size
        }

        const result = this.calculateABTestResult(strategy.id, segment.id, strategyMetrics, baselineSegmentMetrics);
        results.push(result);
      }
    }

    return results;
  }

  private getMetricsForStrategy(strategyId: string): ABTestMetrics[] {
    return this.metrics.filter(m => m.strategyId === strategyId);
  }

  private getMetricsForStrategyAndSegment(strategyId: string, segmentId: string): ABTestMetrics[] {
    return this.metrics.filter(m => m.strategyId === strategyId && m.deviceSegment === segmentId);
  }

  private calculateABTestResult(
    strategyId: string, 
    segmentId: string, 
    testMetrics: ABTestMetrics[], 
    baselineMetrics: ABTestMetrics[]
  ): ABTestResult {
    const testAvg = this.calculateAverageMetrics(testMetrics);
    const baselineAvg = this.calculateAverageMetrics(baselineMetrics);

    // Calculate confidence intervals (simplified 95% CI)
    const testStd = this.calculateStandardDeviation(testMetrics);
    const confidenceInterval = {
      accuracy: {
        lower: testAvg.avgAccuracy - 1.96 * testStd.accuracy / Math.sqrt(testMetrics.length),
        upper: testAvg.avgAccuracy + 1.96 * testStd.accuracy / Math.sqrt(testMetrics.length)
      },
      satisfaction: {
        lower: testAvg.avgSatisfaction - 1.96 * testStd.satisfaction / Math.sqrt(testMetrics.length),
        upper: testAvg.avgSatisfaction + 1.96 * testStd.satisfaction / Math.sqrt(testMetrics.length)
      },
      batteryUsage: {
        lower: testAvg.avgBatteryUsage - 1.96 * testStd.batteryUsage / Math.sqrt(testMetrics.length),
        upper: testAvg.avgBatteryUsage + 1.96 * testStd.batteryUsage / Math.sqrt(testMetrics.length)
      }
    };

    // Statistical significance test (simplified t-test)
    const accuracyTStat = Math.abs(testAvg.avgAccuracy - baselineAvg.avgAccuracy) / 
                         Math.sqrt((testStd.accuracy ** 2 / testMetrics.length) + (testStd.accuracy ** 2 / baselineMetrics.length));
    const statisticalSignificance = accuracyTStat > 1.96; // 95% confidence

    // Calculate improvements
    const improvementOverBaseline = {
      accuracy: ((testAvg.avgAccuracy - baselineAvg.avgAccuracy) / baselineAvg.avgAccuracy) * 100,
      satisfaction: ((testAvg.avgSatisfaction - baselineAvg.avgSatisfaction) / baselineAvg.avgSatisfaction) * 100,
      batteryEfficiency: ((baselineAvg.avgBatteryUsage - testAvg.avgBatteryUsage) / baselineAvg.avgBatteryUsage) * 100
    };

    return {
      strategyId,
      deviceSegment: segmentId,
      sampleSize: testMetrics.length,
      metrics: testAvg,
      confidenceInterval,
      statisticalSignificance,
      improvementOverBaseline
    };
  }

  private calculateAverageMetrics(metrics: ABTestMetrics[]) {
    const sum = metrics.reduce((acc, m) => ({
      accuracy: acc.accuracy + m.metrics.accuracy,
      satisfaction: acc.satisfaction + m.metrics.satisfaction,
      batteryUsage: acc.batteryUsage + m.metrics.batteryUsage,
      responseTime: acc.responseTime + m.metrics.responseTime,
      tokensProcessed: acc.tokensProcessed + m.metrics.tokensProcessed,
      localProcessingRatio: acc.localProcessingRatio + m.metrics.localProcessingRatio,
      errorRate: acc.errorRate + m.metrics.errorRate
    }), {
      accuracy: 0, satisfaction: 0, batteryUsage: 0, responseTime: 0,
      tokensProcessed: 0, localProcessingRatio: 0, errorRate: 0
    });

    const count = metrics.length;
    return {
      avgAccuracy: sum.accuracy / count,
      avgSatisfaction: sum.satisfaction / count,
      avgBatteryUsage: sum.batteryUsage / count,
      avgResponseTime: sum.responseTime / count,
      avgTokensProcessed: sum.tokensProcessed / count,
      avgLocalProcessingRatio: sum.localProcessingRatio / count,
      avgErrorRate: sum.errorRate / count
    };
  }

  private calculateStandardDeviation(metrics: ABTestMetrics[]) {
    const avg = this.calculateAverageMetrics(metrics);
    const squaredDiffs = metrics.map(m => ({
      accuracy: (m.metrics.accuracy - avg.avgAccuracy) ** 2,
      satisfaction: (m.metrics.satisfaction - avg.avgSatisfaction) ** 2,
      batteryUsage: (m.metrics.batteryUsage - avg.avgBatteryUsage) ** 2
    }));

    const avgSquaredDiffs = squaredDiffs.reduce((acc, diff) => ({
      accuracy: acc.accuracy + diff.accuracy,
      satisfaction: acc.satisfaction + diff.satisfaction,
      batteryUsage: acc.batteryUsage + diff.batteryUsage
    }), { accuracy: 0, satisfaction: 0, batteryUsage: 0 });

    const count = metrics.length;
    return {
      accuracy: Math.sqrt(avgSquaredDiffs.accuracy / count),
      satisfaction: Math.sqrt(avgSquaredDiffs.satisfaction / count),
      batteryUsage: Math.sqrt(avgSquaredDiffs.batteryUsage / count)
    };
  }

  public generateSimulatedMetrics(deviceInfo: {
    type: string;
    batteryLevel?: number;
    networkType?: string;
    performanceClass?: string;
  }, count: number = 50): void {
    const strategy = this.getStrategyForDevice(deviceInfo);
    const segment = this.classifyDevice(deviceInfo);

    for (let i = 0; i < count; i++) {
      // Simulate realistic metrics based on strategy characteristics
      const baseAccuracy = strategy.batteryOptimization ? 0.75 : 0.85;
      const baseSatisfaction = strategy.adaptiveScaling ? 0.8 : 0.7;
      const baseBatteryUsage = strategy.batteryOptimization ? 15 : 25;

      const metrics = {
        accuracy: Math.max(0, Math.min(1, baseAccuracy + (Math.random() - 0.5) * 0.2)),
        satisfaction: Math.max(0, Math.min(1, baseSatisfaction + (Math.random() - 0.5) * 0.2)),
        batteryUsage: Math.max(5, baseBatteryUsage + (Math.random() - 0.5) * 10),
        responseTime: Math.max(100, 500 + (Math.random() - 0.5) * 300),
        tokensProcessed: Math.max(1000, strategy.ragTokenLimit * (0.3 + Math.random() * 0.4)),
        localProcessingRatio: Math.max(0, Math.min(1, 0.6 + (Math.random() - 0.5) * 0.4)),
        errorRate: Math.max(0, Math.min(0.1, 0.02 + (Math.random() - 0.5) * 0.03))
      };

      this.recordMetrics(deviceInfo, metrics, `sim_session_${i}_${Date.now()}`);
    }
  }

  public getStrategies(): BudgetStrategy[] {
    return [...this.strategies];
  }

  public getDeviceSegments(): DeviceSegment[] {
    return [...this.deviceSegments];
  }

  public getCurrentTestAssignments(): Map<string, string> {
    return new Map(this.currentTests);
  }

  public reassignStrategy(segmentId: string, strategyId: string): void {
    this.currentTests.set(segmentId, strategyId);
    this.saveData();
  }

  public clearMetrics(): void {
    this.metrics = [];
    this.saveData();
  }

  public exportMetrics(): string {
    const results = this.getABTestResults();
    const csvHeader = 'Strategy,Segment,SampleSize,Accuracy,Satisfaction,BatteryUsage,AccuracyImprovement,SatisfactionImprovement,BatteryEfficiencyImprovement,StatisticallySignificant\n';
    
    const csvRows = results.map(result => [
      result.strategyId,
      result.deviceSegment,
      result.sampleSize,
      result.metrics.avgAccuracy.toFixed(3),
      result.metrics.avgSatisfaction.toFixed(3),
      result.metrics.avgBatteryUsage.toFixed(1),
      result.improvementOverBaseline.accuracy.toFixed(1),
      result.improvementOverBaseline.satisfaction.toFixed(1),
      result.improvementOverBaseline.batteryEfficiency.toFixed(1),
      result.statisticalSignificance ? 'Yes' : 'No'
    ].join(','));

    return csvHeader + csvRows.join('\n');
  }
}