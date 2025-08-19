import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SystemMonitoringService from './SystemMonitoringService';

interface PerformanceMetric {
  id: string;
  name: string;
  category: 'response_time' | 'throughput' | 'error_rate' | 'resource_usage' | 'user_experience' | 'business';
  value: number;
  unit: string;
  timestamp: number;
  tags: Record<string, string>;
  threshold?: PerformanceThreshold;
}

interface PerformanceThreshold {
  warning: number;
  critical: number;
  operator: 'gt' | 'lt' | 'eq';
}

interface SLA {
  id: string;
  name: string;
  description: string;
  metrics: SLAMetric[];
  timeWindow: number; // milliseconds
  target: number; // percentage (0-1)
  currentValue: number;
  status: 'meeting' | 'at_risk' | 'breached';
  lastCalculated: number;
  breachHistory: SLABreach[];
}

interface SLAMetric {
  metricName: string;
  weight: number; // 0-1
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
}

interface SLABreach {
  timestamp: number;
  duration: number;
  severity: 'minor' | 'major' | 'critical';
  impact: string;
  rootCause?: string;
  resolution?: string;
  resolvedAt?: number;
}

interface PerformanceDashboard {
  overview: {
    overallHealth: 'healthy' | 'degraded' | 'critical';
    responseTime: number;
    throughput: number;
    errorRate: number;
    availability: number;
  };
  slas: {
    total: number;
    meeting: number;
    atRisk: number;
    breached: number;
  };
  trends: {
    responseTimeTrend: 'improving' | 'stable' | 'degrading';
    throughputTrend: 'improving' | 'stable' | 'degrading';
    errorRateTrend: 'improving' | 'stable' | 'degrading';
  };
  alerts: {
    active: number;
    critical: number;
    warnings: number;
  };
  topIssues: PerformanceIssue[];
}

interface PerformanceIssue {
  id: string;
  type: 'high_latency' | 'high_error_rate' | 'resource_exhaustion' | 'sla_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedServices: string[];
  detectedAt: number;
  impact: string;
  suggestedActions: string[];
  status: 'open' | 'investigating' | 'resolved';
}

interface PerformanceReport {
  id: string;
  period: { start: number; end: number };
  generatedAt: number;
  summary: {
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
    availability: number;
    slaCompliance: number;
  };
  trends: PerformanceTrend[];
  incidents: PerformanceIncident[];
  recommendations: string[];
}

interface PerformanceTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number; // percentage change
  significance: 'low' | 'medium' | 'high';
}

interface PerformanceIncident {
  id: string;
  title: string;
  startTime: number;
  endTime?: number;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers: number;
  rootCause: string;
  resolution: string;
}

class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metrics: PerformanceMetric[] = [];
  private slas: Map<string, SLA> = new Map();
  private issues: Map<string, PerformanceIssue> = new Map();
  private reports: PerformanceReport[] = [];
  
  // Monitoring state
  private serviceMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private systemMonitoring: SystemMonitoringService;
  
  // Performance baselines
  private baselines: Map<string, number> = new Map();
  private anomalyThreshold: number = 2.0; // Standard deviations

  private constructor() {
    this.systemMonitoring = SystemMonitoringService.getInstance();
    this.initializeDefaultSLAs();
  }

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  // ===== INITIALIZATION =====

  async initialize(): Promise<void> {
    try {
      await this.loadPersistedData();
      await this.calculateBaselines();
      await this.startPerformanceMonitoring();
      this.serviceMonitoring = true;
      console.log('Performance Monitoring Service initialized');
    } catch (error) {
      console.error('Failed to initialize Performance Monitoring Service:', error);
      throw error;
    }
  }

  private initializeDefaultSLAs(): void {
    const slas: SLA[] = [
      {
        id: 'api_response_time',
        name: 'API Response Time SLA',
        description: '95% of API requests should complete within 500ms',
        metrics: [
          {
            metricName: 'response_time',
            weight: 1.0,
            threshold: 500,
            operator: 'lt'
          }
        ],
        timeWindow: 5 * 60 * 1000, // 5 minutes
        target: 0.95, // 95%
        currentValue: 0,
        status: 'meeting',
        lastCalculated: Date.now(),
        breachHistory: []
      },
      {
        id: 'system_availability',
        name: 'System Availability SLA',
        description: '99.9% system uptime',
        metrics: [
          {
            metricName: 'error_rate',
            weight: 0.6,
            threshold: 1,
            operator: 'lt'
          },
          {
            metricName: 'response_time',
            weight: 0.4,
            threshold: 1000,
            operator: 'lt'
          }
        ],
        timeWindow: 60 * 60 * 1000, // 1 hour
        target: 0.999, // 99.9%
        currentValue: 0,
        status: 'meeting',
        lastCalculated: Date.now(),
        breachHistory: []
      },
      {
        id: 'user_experience',
        name: 'User Experience SLA',
        description: 'Maintain high user satisfaction metrics',
        metrics: [
          {
            metricName: 'user_satisfaction',
            weight: 0.5,
            threshold: 0.8,
            operator: 'gt'
          },
          {
            metricName: 'session_duration',
            weight: 0.3,
            threshold: 300000, // 5 minutes
            operator: 'gt'
          },
          {
            metricName: 'recommendation_ctr',
            weight: 0.2,
            threshold: 0.05, // 5%
            operator: 'gt'
          }
        ],
        timeWindow: 24 * 60 * 60 * 1000, // 24 hours
        target: 0.85, // 85%
        currentValue: 0,
        status: 'meeting',
        lastCalculated: Date.now(),
        breachHistory: []
      }
    ];

    slas.forEach(sla => {
      this.slas.set(sla.id, sla);
    });
  }

  // ===== PERFORMANCE MONITORING =====

  private async startPerformanceMonitoring(): Promise<void> {
    this.monitoringInterval = setInterval(async () => {
      await this.collectPerformanceMetrics();
      await this.calculateSLAs();
      await this.detectPerformanceIssues();
      await this.updateBaselines();
    }, 30000); // Every 30 seconds

    console.log('Performance monitoring started');
  }

  async stopPerformanceMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.serviceMonitoring = false;
    await this.persistData();
    console.log('Performance monitoring stopped');
  }

  private async collectPerformanceMetrics(): Promise<void> {
    try {
      const timestamp = Date.now();
      const systemMetrics = this.systemMonitoring.getLatestMetrics();
      
      if (!systemMetrics) return;

      // Convert system metrics to performance metrics
      const performanceMetrics: PerformanceMetric[] = [
        {
          id: `response_time_${timestamp}`,
          name: 'response_time',
          category: 'response_time',
          value: systemMetrics.responseTime,
          unit: 'ms',
          timestamp,
          tags: { service: 'api' }
        },
        {
          id: `throughput_${timestamp}`,
          name: 'throughput',
          category: 'throughput',
          value: systemMetrics.throughput,
          unit: 'rps',
          timestamp,
          tags: { service: 'api' }
        },
        {
          id: `error_rate_${timestamp}`,
          name: 'error_rate',
          category: 'error_rate',
          value: systemMetrics.errorRate,
          unit: 'percentage',
          timestamp,
          tags: { service: 'api' }
        },
        {
          id: `cpu_usage_${timestamp}`,
          name: 'cpu_usage',
          category: 'resource_usage',
          value: systemMetrics.cpuUsage,
          unit: 'percentage',
          timestamp,
          tags: { resource: 'cpu' }
        },
        {
          id: `memory_usage_${timestamp}`,
          name: 'memory_usage',
          category: 'resource_usage',
          value: systemMetrics.memoryUsage,
          unit: 'percentage',
          timestamp,
          tags: { resource: 'memory' }
        },
        {
          id: `user_satisfaction_${timestamp}`,
          name: 'user_satisfaction',
          category: 'user_experience',
          value: systemMetrics.userSatisfaction,
          unit: 'score',
          timestamp,
          tags: { category: 'ux' }
        },
        {
          id: `recommendation_ctr_${timestamp}`,
          name: 'recommendation_ctr',
          category: 'business',
          value: systemMetrics.recommendationCTR,
          unit: 'percentage',
          timestamp,
          tags: { category: 'ml' }
        }
      ];

      // Add metrics to collection
      this.metrics.push(...performanceMetrics);
      
      // Keep only last 1000 metrics per type
      this.pruneMetrics();

    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
    }
  }

  private pruneMetrics(): void {
    const metricsByName = new Map<string, PerformanceMetric[]>();
    
    // Group metrics by name
    this.metrics.forEach(metric => {
      if (!metricsByName.has(metric.name)) {
        metricsByName.set(metric.name, []);
      }
      metricsByName.get(metric.name)!.push(metric);
    });

    // Keep only last 1000 metrics per name
    this.metrics = [];
    metricsByName.forEach(metrics => {
      const sorted = metrics.sort((a, b) => b.timestamp - a.timestamp);
      this.metrics.push(...sorted.slice(0, 1000));
    });
  }

  // ===== SLA MONITORING =====

  private async calculateSLAs(): Promise<void> {
    for (const sla of this.slas.values()) {
      try {
        await this.calculateSLA(sla);
      } catch (error) {
        console.error(`Failed to calculate SLA ${sla.id}:`, error);
      }
    }
  }

  private async calculateSLA(sla: SLA): Promise<void> {
    const now = Date.now();
    const windowStart = now - sla.timeWindow;
    
    // Get metrics within the time window
    const relevantMetrics = this.metrics.filter(metric => 
      metric.timestamp >= windowStart &&
      sla.metrics.some(slaMetric => slaMetric.metricName === metric.name)
    );

    if (relevantMetrics.length === 0) {
      return;
    }

    // Calculate SLA compliance for each metric
    let totalWeight = 0;
    let weightedCompliance = 0;

    for (const slaMetric of sla.metrics) {
      const metricData = relevantMetrics.filter(m => m.name === slaMetric.metricName);
      
      if (metricData.length === 0) continue;

      const compliance = this.calculateMetricCompliance(metricData, slaMetric);
      weightedCompliance += compliance * slaMetric.weight;
      totalWeight += slaMetric.weight;
    }

    // Calculate overall SLA value
    const slaValue = totalWeight > 0 ? weightedCompliance / totalWeight : 0;
    sla.currentValue = slaValue;
    sla.lastCalculated = now;

    // Update SLA status
    const previousStatus = sla.status;
    if (slaValue >= sla.target) {
      sla.status = 'meeting';
    } else if (slaValue >= sla.target * 0.9) { // Within 10% of target
      sla.status = 'at_risk';
    } else {
      sla.status = 'breached';
    }

    // Record breach if status changed to breached
    if (previousStatus !== 'breached' && sla.status === 'breached') {
      const breach: SLABreach = {
        timestamp: now,
        duration: 0, // Will be updated when resolved
        severity: slaValue < sla.target * 0.5 ? 'critical' : 
                 slaValue < sla.target * 0.7 ? 'major' : 'minor',
        impact: `SLA ${sla.name} breached. Current: ${(slaValue * 100).toFixed(2)}%, Target: ${(sla.target * 100).toFixed(2)}%`
      };
      
      sla.breachHistory.push(breach);
      
      // Create performance issue
      await this.createPerformanceIssue({
        type: 'sla_breach',
        severity: breach.severity === 'critical' ? 'critical' : 
                 breach.severity === 'major' ? 'high' : 'medium',
        description: breach.impact,
        affectedServices: [sla.name],
        impact: `SLA breach affecting ${sla.name}`,
        suggestedActions: [
          'Investigate root cause',
          'Scale resources if needed',
          'Review performance bottlenecks'
        ]
      });
    }

    // Update breach duration if resolved
    if (previousStatus === 'breached' && sla.status !== 'breached') {
      const lastBreach = sla.breachHistory[sla.breachHistory.length - 1];
      if (lastBreach && !lastBreach.resolvedAt) {
        lastBreach.duration = now - lastBreach.timestamp;
        lastBreach.resolvedAt = now;
      }
    }
  }

  private calculateMetricCompliance(
    metricData: PerformanceMetric[], 
    slaMetric: SLAMetric
  ): number {
    const compliantCount = metricData.filter(metric => {
      switch (slaMetric.operator) {
        case 'gt': return metric.value > slaMetric.threshold;
        case 'lt': return metric.value < slaMetric.threshold;
        case 'eq': return metric.value === slaMetric.threshold;
        default: return false;
      }
    }).length;

    return metricData.length > 0 ? compliantCount / metricData.length : 0;
  }

  // ===== ISSUE DETECTION =====

  private async detectPerformanceIssues(): Promise<void> {
    await this.detectHighLatency();
    await this.detectHighErrorRate();
    await this.detectResourceExhaustion();
    await this.detectAnomalies();
  }

  private async detectHighLatency(): Promise<void> {
    const recentMetrics = this.getRecentMetrics('response_time', 5 * 60 * 1000); // Last 5 minutes
    
    if (recentMetrics.length === 0) return;

    const averageLatency = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
    const highLatencyThreshold = 1000; // 1 second

    if (averageLatency > highLatencyThreshold) {
      await this.createPerformanceIssue({
        type: 'high_latency',
        severity: averageLatency > 2000 ? 'critical' : 'high',
        description: `High average response time: ${averageLatency.toFixed(2)}ms`,
        affectedServices: ['api'],
        impact: 'Users experiencing slow response times',
        suggestedActions: [
          'Check database performance',
          'Review API endpoint performance',
          'Consider scaling resources'
        ]
      });
    }
  }

  private async detectHighErrorRate(): Promise<void> {
    const recentMetrics = this.getRecentMetrics('error_rate', 5 * 60 * 1000);
    
    if (recentMetrics.length === 0) return;

    const averageErrorRate = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
    const errorRateThreshold = 5; // 5%

    if (averageErrorRate > errorRateThreshold) {
      await this.createPerformanceIssue({
        type: 'high_error_rate',
        severity: averageErrorRate > 10 ? 'critical' : 'high',
        description: `High error rate: ${averageErrorRate.toFixed(2)}%`,
        affectedServices: ['api'],
        impact: 'Users experiencing errors',
        suggestedActions: [
          'Check application logs',
          'Review recent deployments',
          'Monitor error patterns'
        ]
      });
    }
  }

  private async detectResourceExhaustion(): Promise<void> {
    const cpuMetrics = this.getRecentMetrics('cpu_usage', 5 * 60 * 1000);
    const memoryMetrics = this.getRecentMetrics('memory_usage', 5 * 60 * 1000);

    // Check CPU usage
    if (cpuMetrics.length > 0) {
      const avgCpu = cpuMetrics.reduce((sum, m) => sum + m.value, 0) / cpuMetrics.length;
      if (avgCpu > 80) {
        await this.createPerformanceIssue({
          type: 'resource_exhaustion',
          severity: avgCpu > 95 ? 'critical' : 'high',
          description: `High CPU usage: ${avgCpu.toFixed(2)}%`,
          affectedServices: ['system'],
          impact: 'System performance degradation',
          suggestedActions: [
            'Scale CPU resources',
            'Optimize CPU-intensive operations',
            'Review process efficiency'
          ]
        });
      }
    }

    // Check memory usage
    if (memoryMetrics.length > 0) {
      const avgMemory = memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length;
      if (avgMemory > 85) {
        await this.createPerformanceIssue({
          type: 'resource_exhaustion',
          severity: avgMemory > 95 ? 'critical' : 'high',
          description: `High memory usage: ${avgMemory.toFixed(2)}%`,
          affectedServices: ['system'],
          impact: 'Risk of out-of-memory errors',
          suggestedActions: [
            'Scale memory resources',
            'Check for memory leaks',
            'Optimize memory usage'
          ]
        });
      }
    }
  }

  private async detectAnomalies(): Promise<void> {
    const metricNames = ['response_time', 'throughput', 'error_rate'];
    
    for (const metricName of metricNames) {
      const baseline = this.baselines.get(metricName);
      if (!baseline) continue;

      const recentMetrics = this.getRecentMetrics(metricName, 10 * 60 * 1000); // Last 10 minutes
      if (recentMetrics.length === 0) continue;

      const currentValue = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
      const deviation = Math.abs(currentValue - baseline) / baseline;

      if (deviation > this.anomalyThreshold) {
        await this.createPerformanceIssue({
          type: 'high_latency', // Generic type for anomalies
          severity: deviation > 3 ? 'critical' : 'medium',
          description: `Anomaly detected in ${metricName}: ${deviation.toFixed(2)}x deviation from baseline`,
          affectedServices: ['system'],
          impact: `Unusual ${metricName} pattern detected`,
          suggestedActions: [
            'Investigate recent changes',
            'Check for external factors',
            'Review system logs'
          ]
        });
      }
    }
  }

  private async createPerformanceIssue(
    issueData: Omit<PerformanceIssue, 'id' | 'detectedAt' | 'status'>
  ): Promise<string> {
    const issueId = `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const issue: PerformanceIssue = {
      ...issueData,
      id: issueId,
      detectedAt: Date.now(),
      status: 'open'
    };

    this.issues.set(issueId, issue);
    await this.persistData();

    console.log(`Performance issue detected: ${issue.description}`);
    return issueId;
  }

  // ===== BASELINE CALCULATION =====

  private async calculateBaselines(): Promise<void> {
    const metricNames = ['response_time', 'throughput', 'error_rate', 'cpu_usage', 'memory_usage'];
    const baselineWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();

    for (const metricName of metricNames) {
      const historicalMetrics = this.metrics.filter(metric => 
        metric.name === metricName &&
        metric.timestamp >= (now - baselineWindow)
      );

      if (historicalMetrics.length > 0) {
        const average = historicalMetrics.reduce((sum, m) => sum + m.value, 0) / historicalMetrics.length;
        this.baselines.set(metricName, average);
      }
    }
  }

  private async updateBaselines(): Promise<void> {
    // Update baselines every hour
    const lastUpdate = await AsyncStorage.getItem('baseline_last_update');
    const now = Date.now();
    
    if (!lastUpdate || (now - parseInt(lastUpdate)) > 60 * 60 * 1000) {
      await this.calculateBaselines();
      await AsyncStorage.setItem('baseline_last_update', now.toString());
    }
  }

  // ===== REPORTING =====

  async generatePerformanceReport(period: { start: number; end: number }): Promise<PerformanceReport> {
    const reportId = `perf_report_${Date.now()}`;
    
    // Get metrics for the period
    const periodMetrics = this.metrics.filter(metric => 
      metric.timestamp >= period.start && metric.timestamp <= period.end
    );

    // Calculate summary statistics
    const responseTimeMetrics = periodMetrics.filter(m => m.name === 'response_time');
    const throughputMetrics = periodMetrics.filter(m => m.name === 'throughput');
    const errorRateMetrics = periodMetrics.filter(m => m.name === 'error_rate');

    const summary = {
      averageResponseTime: responseTimeMetrics.length > 0 
        ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length 
        : 0,
      totalRequests: throughputMetrics.reduce((sum, m) => sum + m.value, 0),
      errorRate: errorRateMetrics.length > 0 
        ? errorRateMetrics.reduce((sum, m) => sum + m.value, 0) / errorRateMetrics.length 
        : 0,
      availability: this.calculateAvailability(period),
      slaCompliance: this.calculateSLACompliance(period)
    };

    // Calculate trends
    const trends = this.calculateTrends(period);

    // Get incidents for the period
    const incidents = this.getIncidentsForPeriod(period);

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, trends, incidents);

    const report: PerformanceReport = {
      id: reportId,
      period,
      generatedAt: Date.now(),
      summary,
      trends,
      incidents,
      recommendations
    };

    this.reports.push(report);
    await this.persistData();

    return report;
  }

  private calculateAvailability(period: { start: number; end: number }): number {
    // Calculate availability based on error rate and response time
    const errorRateMetrics = this.metrics.filter(m => 
      m.name === 'error_rate' &&
      m.timestamp >= period.start && 
      m.timestamp <= period.end
    );

    if (errorRateMetrics.length === 0) return 1.0;

    const avgErrorRate = errorRateMetrics.reduce((sum, m) => sum + m.value, 0) / errorRateMetrics.length;
    return Math.max(0, 1 - (avgErrorRate / 100));
  }

  private calculateSLACompliance(period: { start: number; end: number }): number {
    const slaValues = Array.from(this.slas.values()).map(sla => sla.currentValue);
    return slaValues.length > 0 ? slaValues.reduce((sum, val) => sum + val, 0) / slaValues.length : 0;
  }

  private calculateTrends(period: { start: number; end: number }): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    const metricNames = ['response_time', 'throughput', 'error_rate'];

    for (const metricName of metricNames) {
      const metrics = this.metrics.filter(m => 
        m.name === metricName &&
        m.timestamp >= period.start && 
        m.timestamp <= period.end
      );

      if (metrics.length < 2) continue;

      const sortedMetrics = metrics.sort((a, b) => a.timestamp - b.timestamp);
      const firstHalf = sortedMetrics.slice(0, Math.floor(sortedMetrics.length / 2));
      const secondHalf = sortedMetrics.slice(Math.floor(sortedMetrics.length / 2));

      const firstAvg = firstHalf.reduce((sum, m) => sum + m.value, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, m) => sum + m.value, 0) / secondHalf.length;

      const change = ((secondAvg - firstAvg) / firstAvg) * 100;
      
      let direction: 'up' | 'down' | 'stable';
      if (Math.abs(change) < 5) direction = 'stable';
      else direction = change > 0 ? 'up' : 'down';

      trends.push({
        metric: metricName,
        direction,
        change: Math.abs(change),
        significance: Math.abs(change) > 20 ? 'high' : Math.abs(change) > 10 ? 'medium' : 'low'
      });
    }

    return trends;
  }

  private getIncidentsForPeriod(period: { start: number; end: number }): PerformanceIncident[] {
    // Convert performance issues to incidents
    return Array.from(this.issues.values())
      .filter(issue => issue.detectedAt >= period.start && issue.detectedAt <= period.end)
      .map(issue => ({
        id: issue.id,
        title: issue.description,
        startTime: issue.detectedAt,
        endTime: issue.status === 'resolved' ? issue.detectedAt + 3600000 : undefined, // Mock 1 hour resolution
        duration: issue.status === 'resolved' ? 3600000 : Date.now() - issue.detectedAt,
        severity: issue.severity,
        affectedUsers: this.estimateAffectedUsers(issue),
        rootCause: 'Under investigation',
        resolution: issue.status === 'resolved' ? 'Issue resolved' : 'In progress'
      }));
  }

  private estimateAffectedUsers(issue: PerformanceIssue): number {
    // Mock estimation based on severity
    switch (issue.severity) {
      case 'critical': return Math.floor(Math.random() * 1000) + 500;
      case 'high': return Math.floor(Math.random() * 500) + 100;
      case 'medium': return Math.floor(Math.random() * 100) + 10;
      default: return Math.floor(Math.random() * 10) + 1;
    }
  }

  private generateRecommendations(
    summary: PerformanceReport['summary'],
    trends: PerformanceTrend[],
    incidents: PerformanceIncident[]
  ): string[] {
    const recommendations: string[] = [];

    // Response time recommendations
    if (summary.averageResponseTime > 500) {
      recommendations.push('Consider optimizing API response times - current average exceeds 500ms');
    }

    // Error rate recommendations
    if (summary.errorRate > 1) {
      recommendations.push('Investigate and reduce error rate - currently above 1%');
    }

    // Availability recommendations
    if (summary.availability < 0.999) {
      recommendations.push('Improve system availability - currently below 99.9%');
    }

    // Trend-based recommendations
    const degradingTrends = trends.filter(t => 
      (t.metric === 'response_time' && t.direction === 'up') ||
      (t.metric === 'error_rate' && t.direction === 'up') ||
      (t.metric === 'throughput' && t.direction === 'down')
    );

    if (degradingTrends.length > 0) {
      recommendations.push('Monitor degrading performance trends and investigate root causes');
    }

    // Incident-based recommendations
    if (incidents.length > 5) {
      recommendations.push('High number of incidents detected - consider implementing preventive measures');
    }

    return recommendations;
  }

  // ===== UTILITY METHODS =====

  private getRecentMetrics(metricName: string, timeWindow: number): PerformanceMetric[] {
    const now = Date.now();
    return this.metrics.filter(metric => 
      metric.name === metricName &&
      metric.timestamp >= (now - timeWindow)
    );
  }

  // ===== DATA PERSISTENCE =====

  private async persistData(): Promise<void> {
    try {
      await AsyncStorage.setItem('performance_metrics', JSON.stringify(this.metrics.slice(-1000))); // Last 1000 metrics
      await AsyncStorage.setItem('performance_slas', JSON.stringify(Array.from(this.slas.entries())));
      await AsyncStorage.setItem('performance_issues', JSON.stringify(Array.from(this.issues.entries())));
      await AsyncStorage.setItem('performance_reports', JSON.stringify(this.reports.slice(-10))); // Last 10 reports
      await AsyncStorage.setItem('performance_baselines', JSON.stringify(Array.from(this.baselines.entries())));
    } catch (error) {
      console.error('Failed to persist performance data:', error);
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      const metricsData = await AsyncStorage.getItem('performance_metrics');
      const slasData = await AsyncStorage.getItem('performance_slas');
      const issuesData = await AsyncStorage.getItem('performance_issues');
      const reportsData = await AsyncStorage.getItem('performance_reports');
      const baselinesData = await AsyncStorage.getItem('performance_baselines');

      if (metricsData) {
        this.metrics = JSON.parse(metricsData);
      }
      if (slasData) {
        this.slas = new Map(JSON.parse(slasData));
      }
      if (issuesData) {
        this.issues = new Map(JSON.parse(issuesData));
      }
      if (reportsData) {
        this.reports = JSON.parse(reportsData);
      }
      if (baselinesData) {
        this.baselines = new Map(JSON.parse(baselinesData));
      }
    } catch (error) {
      console.error('Failed to load persisted performance data:', error);
    }
  }

  // ===== PUBLIC API =====

  getPerformanceDashboard(): PerformanceDashboard {
    const latestMetrics = this.systemMonitoring.getLatestMetrics();
    const systemStatus = this.systemMonitoring.getSystemStatus();
    const activeAlerts = this.systemMonitoring.getActiveAlerts();

    // Calculate SLA statistics
    const slaArray = Array.from(this.slas.values());
    const slaStats = {
      total: slaArray.length,
      meeting: slaArray.filter(sla => sla.status === 'meeting').length,
      atRisk: slaArray.filter(sla => sla.status === 'at_risk').length,
      breached: slaArray.filter(sla => sla.status === 'breached').length
    };

    // Calculate trends
    const trends = {
      responseTimeTrend: this.calculateMetricTrend('response_time'),
      throughputTrend: this.calculateMetricTrend('throughput'),
      errorRateTrend: this.calculateMetricTrend('error_rate')
    };

    // Get top issues
    const topIssues = Array.from(this.issues.values())
      .filter(issue => issue.status === 'open')
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 5);

    // Map system status to dashboard health
    let overallHealth: 'healthy' | 'degraded' | 'critical';
    switch (systemStatus.overall) {
      case 'unhealthy':
        overallHealth = 'critical';
        break;
      case 'degraded':
        overallHealth = 'degraded';
        break;
      default:
        overallHealth = 'healthy';
        break;
    }

    return {
      overview: {
        overallHealth,
        responseTime: latestMetrics?.responseTime || 0,
        throughput: latestMetrics?.throughput || 0,
        errorRate: latestMetrics?.errorRate || 0,
        availability: systemStatus.uptime
      },
      slas: slaStats,
      trends,
      alerts: {
        active: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        warnings: activeAlerts.filter(a => a.severity === 'medium' || a.severity === 'low').length
      },
      topIssues
    };
  }

  private calculateMetricTrend(metricName: string): 'improving' | 'stable' | 'degrading' {
    const recentMetrics = this.getRecentMetrics(metricName, 30 * 60 * 1000); // Last 30 minutes
    
    if (recentMetrics.length < 6) return 'stable';

    const firstHalf = recentMetrics.slice(0, Math.floor(recentMetrics.length / 2));
    const secondHalf = recentMetrics.slice(Math.floor(recentMetrics.length / 2));

    const firstAvg = firstHalf.reduce((sum, m) => sum + m.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.value, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    // For response time and error rate, lower is better
    if (metricName === 'response_time' || metricName === 'error_rate') {
      if (change < -0.1) return 'improving';
      if (change > 0.1) return 'degrading';
    } else {
      // For throughput, higher is better
      if (change > 0.1) return 'improving';
      if (change < -0.1) return 'degrading';
    }

    return 'stable';
  }

  getMetrics(timeRange?: { start: number; end: number }): PerformanceMetric[] {
    if (!timeRange) {
      return [...this.metrics];
    }
    
    return this.metrics.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  getSLAs(): SLA[] {
    return Array.from(this.slas.values());
  }

  getIssues(): PerformanceIssue[] {
    return Array.from(this.issues.values());
  }

  getReports(): PerformanceReport[] {
    return [...this.reports];
  }

  async resolveIssue(issueId: string, resolution: string): Promise<void> {
    const issue = this.issues.get(issueId);
    if (issue) {
      issue.status = 'resolved';
      await this.persistData();
    }
  }

  async createSLA(sla: Omit<SLA, 'currentValue' | 'status' | 'lastCalculated' | 'breachHistory'>): Promise<string> {
    const newSLA: SLA = {
      ...sla,
      currentValue: 0,
      status: 'meeting',
      lastCalculated: Date.now(),
      breachHistory: []
    };

    this.slas.set(sla.id, newSLA);
    await this.persistData();

    return sla.id;
  }

  async updateSLA(slaId: string, updates: Partial<SLA>): Promise<void> {
    const sla = this.slas.get(slaId);
    if (sla) {
      Object.assign(sla, updates);
      await this.persistData();
    }
  }

  async deleteSLA(slaId: string): Promise<void> {
    this.slas.delete(slaId);
    await this.persistData();
  }

  isMonitoring(): boolean {
    return this.serviceMonitoring;
  }

  async cleanup(): Promise<void> {
    await this.stopPerformanceMonitoring();
    console.log('Performance Monitoring Service cleanup completed');
  }
}

export default PerformanceMonitoringService;