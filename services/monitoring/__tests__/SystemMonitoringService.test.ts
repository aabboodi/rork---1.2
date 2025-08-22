/**
 * SystemMonitoringService Unit Tests - Phase D Implementation
 * Tests monitoring functionality, alerting, and error paths
 * Ensures no native dependencies are required
 */

import SystemMonitoringService from '../SystemMonitoringService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}));

// Mock MLLoggingService
jest.mock('@/services/recommendation/MLLoggingService', () => ({
  getInstance: jest.fn(() => ({
    getMetrics: jest.fn(() => ({
      performanceMetrics: {
        logGenerationTime: 50
      }
    })),
    getRetrainingDataMetrics: jest.fn(() => ({
      averageDataQuality: 0.85,
      totalDataPointsCollected: 1000
    })),
    getServiceStatus: jest.fn(() => ({
      isInitialized: true
    }))
  }))
}));

// Mock ServiceRegistry
jest.mock('@/services/ServiceRegistry', () => ({
  default: {
    has: jest.fn(() => false),
    register: jest.fn(),
    get: jest.fn(() => null)
  }
}));

// Mock SecurityManager
const mockSecurityManager = {
  getSecurityStatus: jest.fn(() => ({
    monitoring: {
      recentSecurityEvents: 5,
      criticalEvents: 2
    },
    cryptography: {
      masterKeyInitialized: true
    }
  }))
};

jest.mock('@/services/security/SecurityManager', () => ({
  default: {
    getInstance: jest.fn(() => mockSecurityManager)
  }
}));

// Mock DevSecOpsIntegrationService
const mockDevSecOpsService = {
  getSecurityDashboard: jest.fn(() => ({
    status: 'operational'
  }))
};

jest.mock('@/services/security/DevSecOpsIntegrationService', () => ({
  default: {
    getInstance: jest.fn(() => mockDevSecOpsService)
  }
}));

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

// Mock timers
jest.useFakeTimers();

describe('SystemMonitoringService', () => {
  let monitoringService: SystemMonitoringService;
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    // Replace console methods
    console.log = mockConsole.log;
    console.warn = mockConsole.warn;
    console.error = mockConsole.error;

    // Reset mocks
    jest.clearAllMocks();
    
    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();

    // Get fresh instance
    monitoringService = SystemMonitoringService.getInstance();
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;

    // Stop monitoring if running
    if (monitoringService.isMonitoring()) {
      monitoringService.stopMonitoring();
    }
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SystemMonitoringService.getInstance();
      const instance2 = SystemMonitoringService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = SystemMonitoringService.getInstance();
      const instance2 = SystemMonitoringService.getInstance();
      
      expect(instance1.getSystemStatus()).toEqual(instance2.getSystemStatus());
    });
  });

  describe('Monitoring Lifecycle', () => {
    it('should start monitoring successfully', async () => {
      expect(monitoringService.isMonitoring()).toBe(false);
      
      await monitoringService.startMonitoring();
      
      expect(monitoringService.isMonitoring()).toBe(true);
      expect(mockConsole.log).toHaveBeenCalledWith('System monitoring started');
    });

    it('should not start monitoring if already running', async () => {
      await monitoringService.startMonitoring();
      mockConsole.log.mockClear();
      
      await monitoringService.startMonitoring();
      
      expect(mockConsole.log).toHaveBeenCalledWith('Monitoring already started');
    });

    it('should stop monitoring successfully', async () => {
      await monitoringService.startMonitoring();
      expect(monitoringService.isMonitoring()).toBe(true);
      
      await monitoringService.stopMonitoring();
      
      expect(monitoringService.isMonitoring()).toBe(false);
      expect(mockConsole.log).toHaveBeenCalledWith('System monitoring stopped');
    });

    it('should handle stop monitoring when not running', async () => {
      expect(monitoringService.isMonitoring()).toBe(false);
      
      await monitoringService.stopMonitoring();
      
      expect(monitoringService.isMonitoring()).toBe(false);
    });
  });

  describe('Metrics Collection', () => {
    it('should collect metrics when monitoring starts', async () => {
      await monitoringService.startMonitoring();
      
      // Wait for initial metrics collection
      await jest.runOnlyPendingTimersAsync();
      
      const metrics = monitoringService.getLatestMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.timestamp).toBeGreaterThan(0);
      expect(typeof metrics?.cpuUsage).toBe('number');
      expect(typeof metrics?.memoryUsage).toBe('number');
    });

    it('should collect metrics periodically', async () => {
      await monitoringService.startMonitoring();
      
      // Fast-forward time to trigger periodic collection
      jest.advanceTimersByTime(30000); // 30 seconds
      await jest.runOnlyPendingTimersAsync();
      
      const metrics = monitoringService.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should limit stored metrics to prevent memory issues', async () => {
      await monitoringService.startMonitoring();
      
      // Simulate collecting many metrics
      for (let i = 0; i < 1200; i++) {
        jest.advanceTimersByTime(30000);
        await jest.runOnlyPendingTimersAsync();
      }
      
      const metrics = monitoringService.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });

    it('should handle metrics collection errors gracefully', async () => {
      // Mock a collection error
      const originalMethod = monitoringService['collectPerformanceMetrics'];
      monitoringService['collectPerformanceMetrics'] = jest.fn().mockRejectedValue(new Error('Collection failed'));
      
      await expect(monitoringService['collectMetrics']()).rejects.toThrow('Collection failed');
      
      // Restore original method
      monitoringService['collectPerformanceMetrics'] = originalMethod;
    });

    it('should collect metrics with proper structure', async () => {
      await monitoringService.startMonitoring();
      await jest.runOnlyPendingTimersAsync();
      
      const metrics = monitoringService.getLatestMetrics();
      
      expect(metrics).toMatchObject({
        cpuUsage: expect.any(Number),
        memoryUsage: expect.any(Number),
        diskUsage: expect.any(Number),
        networkLatency: expect.any(Number),
        responseTime: expect.any(Number),
        throughput: expect.any(Number),
        errorRate: expect.any(Number),
        activeUsers: expect.any(Number),
        sessionDuration: expect.any(Number),
        apiCallsPerSecond: expect.any(Number),
        databaseConnections: expect.any(Number),
        cacheHitRate: expect.any(Number),
        securityEvents: expect.any(Number),
        failedLogins: expect.any(Number),
        suspiciousActivity: expect.any(Number),
        encryptionStatus: expect.any(Boolean),
        modelAccuracy: expect.any(Number),
        predictionLatency: expect.any(Number),
        dataQuality: expect.any(Number),
        retrainingFrequency: expect.any(Number),
        userEngagement: expect.any(Number),
        contentQuality: expect.any(Number),
        recommendationCTR: expect.any(Number),
        userSatisfaction: expect.any(Number),
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Alert System', () => {
    it('should have default alert rules configured', () => {
      const alertRules = monitoringService.getAlertRules();
      
      expect(alertRules.length).toBeGreaterThan(0);
      expect(alertRules.some(rule => rule.id === 'high_cpu_usage')).toBe(true);
      expect(alertRules.some(rule => rule.id === 'high_memory_usage')).toBe(true);
      expect(alertRules.some(rule => rule.id === 'high_error_rate')).toBe(true);
    });

    it('should trigger alerts when thresholds are exceeded', async () => {
      // Mock high CPU usage
      const originalCollectPerformance = monitoringService['collectPerformanceMetrics'];
      monitoringService['collectPerformanceMetrics'] = jest.fn().mockResolvedValue({
        cpuUsage: 90, // Above 80% threshold
        memoryUsage: 50,
        diskUsage: 30,
        networkLatency: 20,
        responseTime: 100,
        throughput: 500,
        errorRate: 1
      });
      
      await monitoringService.startMonitoring();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      const activeAlerts = monitoringService.getActiveAlerts();
      expect(activeAlerts.some(alert => alert.ruleId === 'high_cpu_usage')).toBe(true);
      
      // Restore original method
      monitoringService['collectPerformanceMetrics'] = originalCollectPerformance;
    });

    it('should respect cooldown periods for alerts', async () => {
      // Mock high CPU usage
      const originalCollectPerformance = monitoringService['collectPerformanceMetrics'];
      monitoringService['collectPerformanceMetrics'] = jest.fn().mockResolvedValue({
        cpuUsage: 90,
        memoryUsage: 50,
        diskUsage: 30,
        networkLatency: 20,
        responseTime: 100,
        throughput: 500,
        errorRate: 1
      });
      
      await monitoringService.startMonitoring();
      
      // First trigger
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      const alertsAfterFirst = monitoringService.getActiveAlerts();
      const firstAlertCount = alertsAfterFirst.length;
      
      // Second trigger within cooldown period
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      const alertsAfterSecond = monitoringService.getActiveAlerts();
      expect(alertsAfterSecond.length).toBe(firstAlertCount); // Should not increase
      
      // Restore original method
      monitoringService['collectPerformanceMetrics'] = originalCollectPerformance;
    });

    it('should execute alert actions', async () => {
      // Mock critical error rate
      const originalCollectPerformance = monitoringService['collectPerformanceMetrics'];
      monitoringService['collectPerformanceMetrics'] = jest.fn().mockResolvedValue({
        cpuUsage: 50,
        memoryUsage: 50,
        diskUsage: 30,
        networkLatency: 20,
        responseTime: 100,
        throughput: 500,
        errorRate: 10 // Above 5% threshold
      });
      
      await monitoringService.startMonitoring();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      // Check that alert actions were logged
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('ALERT:')
      );
      
      // Restore original method
      monitoringService['collectPerformanceMetrics'] = originalCollectPerformance;
    });

    it('should handle alert action execution errors', async () => {
      // Create a custom alert rule with invalid action
      await monitoringService.addAlertRule({
        name: 'Test Alert',
        description: 'Test alert with failing action',
        metric: 'cpuUsage',
        operator: 'gt',
        threshold: 1,
        severity: 'low',
        enabled: true,
        cooldownPeriod: 1000,
        actions: [
          { type: 'webhook' as any, config: { url: 'invalid-url' } }
        ]
      });
      
      // Mock high CPU to trigger alert
      const originalCollectPerformance = monitoringService['collectPerformanceMetrics'];
      monitoringService['collectPerformanceMetrics'] = jest.fn().mockResolvedValue({
        cpuUsage: 90,
        memoryUsage: 50,
        diskUsage: 30,
        networkLatency: 20,
        responseTime: 100,
        throughput: 500,
        errorRate: 1
      });
      
      await monitoringService.startMonitoring();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      // Should not crash and should log the action execution
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('WEBHOOK:')
      );
      
      // Restore original method
      monitoringService['collectPerformanceMetrics'] = originalCollectPerformance;
    });
  });

  describe('Alert Management', () => {
    it('should add new alert rules', async () => {
      const initialRules = monitoringService.getAlertRules();
      const initialCount = initialRules.length;
      
      const ruleId = await monitoringService.addAlertRule({
        name: 'Custom Alert',
        description: 'Custom alert rule',
        metric: 'networkLatency',
        operator: 'gt',
        threshold: 200,
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 60000,
        actions: [{ type: 'log', config: { level: 'warn' } }]
      });
      
      const updatedRules = monitoringService.getAlertRules();
      expect(updatedRules.length).toBe(initialCount + 1);
      expect(ruleId).toBeDefined();
      expect(updatedRules.some(rule => rule.id === ruleId)).toBe(true);
    });

    it('should update existing alert rules', async () => {
      const rules = monitoringService.getAlertRules();
      const ruleToUpdate = rules[0];
      
      await monitoringService.updateAlertRule(ruleToUpdate.id, {
        threshold: 999,
        enabled: false
      });
      
      const updatedRules = monitoringService.getAlertRules();
      const updatedRule = updatedRules.find(rule => rule.id === ruleToUpdate.id);
      
      expect(updatedRule?.threshold).toBe(999);
      expect(updatedRule?.enabled).toBe(false);
    });

    it('should delete alert rules', async () => {
      const rules = monitoringService.getAlertRules();
      const ruleToDelete = rules[0];
      const initialCount = rules.length;
      
      await monitoringService.deleteAlertRule(ruleToDelete.id);
      
      const updatedRules = monitoringService.getAlertRules();
      expect(updatedRules.length).toBe(initialCount - 1);
      expect(updatedRules.some(rule => rule.id === ruleToDelete.id)).toBe(false);
    });

    it('should acknowledge alerts', async () => {
      // Create an alert first
      const originalCollectPerformance = monitoringService['collectPerformanceMetrics'];
      monitoringService['collectPerformanceMetrics'] = jest.fn().mockResolvedValue({
        cpuUsage: 90,
        memoryUsage: 50,
        diskUsage: 30,
        networkLatency: 20,
        responseTime: 100,
        throughput: 500,
        errorRate: 1
      });
      
      await monitoringService.startMonitoring();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      const alerts = monitoringService.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const alertToAck = alerts[0];
      expect(alertToAck.acknowledged).toBe(false);
      
      await monitoringService.acknowledgeAlert(alertToAck.id);
      
      const updatedAlerts = monitoringService.getAllAlerts();
      const acknowledgedAlert = updatedAlerts.find(alert => alert.id === alertToAck.id);
      expect(acknowledgedAlert?.acknowledged).toBe(true);
      
      // Restore original method
      monitoringService['collectPerformanceMetrics'] = originalCollectPerformance;
    });

    it('should resolve alerts', async () => {
      // Create an alert first
      const originalCollectPerformance = monitoringService['collectPerformanceMetrics'];
      monitoringService['collectPerformanceMetrics'] = jest.fn().mockResolvedValue({
        cpuUsage: 90,
        memoryUsage: 50,
        diskUsage: 30,
        networkLatency: 20,
        responseTime: 100,
        throughput: 500,
        errorRate: 1
      });
      
      await monitoringService.startMonitoring();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      const alerts = monitoringService.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const alertToResolve = alerts[0];
      expect(alertToResolve.resolved).toBe(false);
      
      await monitoringService.resolveAlert(alertToResolve.id);
      
      const activeAlerts = monitoringService.getActiveAlerts();
      expect(activeAlerts.some(alert => alert.id === alertToResolve.id)).toBe(false);
      
      const allAlerts = monitoringService.getAllAlerts();
      const resolvedAlert = allAlerts.find(alert => alert.id === alertToResolve.id);
      expect(resolvedAlert?.resolved).toBe(true);
      expect(resolvedAlert?.resolvedAt).toBeDefined();
      
      // Restore original method
      monitoringService['collectPerformanceMetrics'] = originalCollectPerformance;
    });
  });

  describe('Service Health Monitoring', () => {
    it('should initialize service health status', () => {
      const serviceHealth = monitoringService.getServiceHealth();
      
      expect(serviceHealth.size).toBeGreaterThan(0);
      expect(serviceHealth.has('SecurityManager')).toBe(true);
      expect(serviceHealth.has('MLLoggingService')).toBe(true);
    });

    it('should update service health periodically', async () => {
      await monitoringService.startMonitoring();
      
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      const serviceHealth = monitoringService.getServiceHealth();
      const securityManagerHealth = serviceHealth.get('SecurityManager');
      
      expect(securityManagerHealth?.lastCheck).toBeGreaterThan(0);
      expect(securityManagerHealth?.status).toBeDefined();
    });

    it('should handle service health check errors', async () => {
      // Mock SecurityManager to throw error
      mockSecurityManager.getSecurityStatus.mockImplementation(() => {
        throw new Error('Service unavailable');
      });
      
      await monitoringService.startMonitoring();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      const serviceHealth = monitoringService.getServiceHealth();
      const securityManagerHealth = serviceHealth.get('SecurityManager');
      
      expect(securityManagerHealth?.status).toBe('unhealthy');
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Health check failed for SecurityManager')
      );
      
      // Restore mock
      mockSecurityManager.getSecurityStatus.mockReturnValue({
        monitoring: { recentSecurityEvents: 5, criticalEvents: 2 },
        cryptography: { masterKeyInitialized: true }
      });
    });
  });

  describe('Performance Baselines', () => {
    it('should calculate performance baselines with sufficient data', async () => {
      await monitoringService.startMonitoring();
      
      // Generate enough metrics for baseline calculation
      for (let i = 0; i < 12; i++) {
        jest.advanceTimersByTime(30000);
        await jest.runOnlyPendingTimersAsync();
      }
      
      const baselines = monitoringService.getPerformanceBaselines();
      expect(baselines.size).toBeGreaterThan(0);
      
      const cpuBaseline = baselines.get('cpuUsage');
      expect(cpuBaseline).toBeDefined();
      expect(cpuBaseline?.baseline).toBeGreaterThan(0);
      expect(cpuBaseline?.variance).toBeGreaterThanOrEqual(0);
      expect(['improving', 'stable', 'degrading']).toContain(cpuBaseline?.trend);
    });

    it('should not calculate baselines with insufficient data', async () => {
      await monitoringService.startMonitoring();
      
      // Only generate a few metrics
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      const baselines = monitoringService.getPerformanceBaselines();
      expect(baselines.size).toBe(0);
    });
  });

  describe('Data Persistence', () => {
    it('should persist monitoring data', async () => {
      await monitoringService.startMonitoring();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      await monitoringService.stopMonitoring();
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'system_metrics',
        expect.any(String)
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'alert_rules',
        expect.any(String)
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'active_alerts',
        expect.any(String)
      );
    });

    it('should load persisted data on startup', async () => {
      const mockMetrics = JSON.stringify([{
        cpuUsage: 50,
        memoryUsage: 60,
        timestamp: Date.now()
      }]);
      
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'system_metrics') return Promise.resolve(mockMetrics);
        return Promise.resolve(null);
      });
      
      await monitoringService.startMonitoring();
      
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('system_metrics');
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('alert_rules');
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('active_alerts');
    });

    it('should handle persistence errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      await monitoringService.startMonitoring();
      await monitoringService.stopMonitoring();
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to persist monitoring data:',
        expect.any(Error)
      );
    });

    it('should handle load errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Load error'));
      
      await monitoringService.startMonitoring();
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to load persisted monitoring data:',
        expect.any(Error)
      );
    });
  });

  describe('System Status', () => {
    it('should provide comprehensive system status', async () => {
      await monitoringService.startMonitoring();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      const systemStatus = monitoringService.getSystemStatus();
      
      expect(systemStatus).toMatchObject({
        overall: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        services: {
          healthy: expect.any(Number),
          degraded: expect.any(Number),
          unhealthy: expect.any(Number)
        },
        alerts: {
          critical: expect.any(Number),
          high: expect.any(Number),
          medium: expect.any(Number),
          low: expect.any(Number)
        },
        uptime: expect.any(Number)
      });
    });

    it('should calculate overall status based on services and alerts', async () => {
      // Mock unhealthy service
      const originalCheckServiceHealth = monitoringService['checkServiceHealth'];
      monitoringService['checkServiceHealth'] = jest.fn().mockResolvedValue('unhealthy');
      
      await monitoringService.startMonitoring();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      const systemStatus = monitoringService.getSystemStatus();
      expect(systemStatus.overall).toBe('unhealthy');
      
      // Restore original method
      monitoringService['checkServiceHealth'] = originalCheckServiceHealth;
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing dependencies gracefully', async () => {
      // Mock import failures
      const originalEnsureDependencies = monitoringService['ensureDependencies'];
      monitoringService['ensureDependencies'] = jest.fn().mockResolvedValue(undefined);
      
      await monitoringService.startMonitoring();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      // Should not crash
      const metrics = monitoringService.getLatestMetrics();
      expect(metrics).toBeDefined();
      
      // Restore original method
      monitoringService['ensureDependencies'] = originalEnsureDependencies;
    });

    it('should handle metrics collection with partial failures', async () => {
      // Mock partial failure in security metrics
      mockSecurityManager.getSecurityStatus.mockReturnValue(null);
      
      await monitoringService.startMonitoring();
      jest.advanceTimersByTime(30000);
      await jest.runOnlyPendingTimersAsync();
      
      const metrics = monitoringService.getLatestMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.securityEvents).toBe(0); // Should default to 0
      
      // Restore mock
      mockSecurityManager.getSecurityStatus.mockReturnValue({
        monitoring: { recentSecurityEvents: 5, criticalEvents: 2 },
        cryptography: { masterKeyInitialized: true }
      });
    });

    it('should handle invalid alert rule operations', async () => {
      // Try to update non-existent rule
      await monitoringService.updateAlertRule('non-existent-id', { threshold: 100 });
      
      // Try to delete non-existent rule
      await monitoringService.deleteAlertRule('non-existent-id');
      
      // Try to acknowledge non-existent alert
      await monitoringService.acknowledgeAlert('non-existent-id');
      
      // Try to resolve non-existent alert
      await monitoringService.resolveAlert('non-existent-id');
      
      // Should not crash
      expect(monitoringService.getAlertRules()).toBeDefined();
    });

    it('should handle time range queries correctly', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      
      // Get metrics in time range (should be empty initially)
      const metrics = monitoringService.getMetrics({
        start: oneHourAgo,
        end: now
      });
      
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('Integration without Native Dependencies', () => {
    it('should work without Node.js modules', () => {
      expect(() => {
        const service = SystemMonitoringService.getInstance();
        service.getSystemStatus();
      }).not.toThrow();
    });

    it('should work in React Native Web environment', () => {
      const originalPlatform = process.env.PLATFORM;
      process.env.PLATFORM = 'web';
      
      try {
        const service = SystemMonitoringService.getInstance();
        const status = service.getSystemStatus();
        expect(status).toBeDefined();
      } finally {
        process.env.PLATFORM = originalPlatform;
      }
    });

    it('should handle high-frequency monitoring without performance issues', async () => {
      // Reduce monitoring interval for testing
      const originalInterval = 30000;
      
      await monitoringService.startMonitoring();
      
      // Simulate rapid monitoring cycles
      for (let i = 0; i < 100; i++) {
        jest.advanceTimersByTime(100); // Very fast cycles
        await jest.runOnlyPendingTimersAsync();
      }
      
      // Should still be responsive
      const status = monitoringService.getSystemStatus();
      expect(status).toBeDefined();
    });
  });
});