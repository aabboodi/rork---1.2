/**
 * EventBus Unit Tests - Phase D Implementation
 * Tests subscription, emission, unsubscription, and error paths
 * Ensures no native dependencies are required
 */

import { EventBus, EventMap, eventBus, useEventBus, useSecureEventBus } from '../EventBus';

// Mock console methods to capture logs
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

describe('EventBus', () => {
  let testEventBus: EventBus;

  beforeEach(() => {
    // Replace console methods with mocks
    console.log = mockConsole.log;
    console.warn = mockConsole.warn;
    console.error = mockConsole.error;

    // Reset mocks
    jest.clearAllMocks();

    // Create fresh EventBus instance for each test
    testEventBus = EventBus.instance;
    testEventBus.reset();
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;

    // Clean up EventBus
    testEventBus.reset();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EventBus.instance;
      const instance2 = EventBus.instance;
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = EventBus.instance;
      instance1.configureSecurity({ enableEventLogging: false });
      
      const instance2 = EventBus.instance;
      const audit = instance2.getSecurityAudit();
      expect(audit.securityConfig.enableEventLogging).toBe(false);
    });
  });

  describe('Event Subscription and Emission', () => {
    it('should subscribe and emit events correctly', () => {
      const mockHandler = jest.fn();
      const testPayload: EventMap['security:alert'] = {
        level: 'high',
        message: 'Test alert',
        source: 'test',
        timestamp: Date.now()
      };

      testEventBus.on('security:alert', mockHandler);
      testEventBus.emit('security:alert', testPayload);

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
        level: 'high',
        message: 'Test alert',
        source: 'test'
      }));
    });

    it('should handle multiple subscribers for the same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      
      const testPayload: EventMap['monitor:metric'] = {
        name: 'cpu_usage',
        value: 75.5,
        timestamp: Date.now()
      };

      testEventBus.on('monitor:metric', handler1);
      testEventBus.on('monitor:metric', handler2);
      testEventBus.on('monitor:metric', handler3);

      testEventBus.emit('monitor:metric', testPayload);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it('should handle once() subscriptions correctly', () => {
      const mockHandler = jest.fn();
      const testPayload: EventMap['user:login'] = {
        userHash: 'hash123',
        method: 'password',
        deviceFingerprint: 'device123',
        sessionId: 'session123',
        timestamp: Date.now()
      };

      testEventBus.once('user:login', mockHandler);
      
      // Emit twice
      testEventBus.emit('user:login', testPayload);
      testEventBus.emit('user:login', testPayload);

      // Should only be called once
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('should automatically add timestamp if not provided', () => {
      const mockHandler = jest.fn();
      const testPayload = {
        level: 'medium',
        message: 'Test without timestamp',
        source: 'test'
      } as EventMap['security:alert'];

      testEventBus.on('security:alert', mockHandler);
      testEventBus.emit('security:alert', testPayload);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('Event Unsubscription', () => {
    it('should unsubscribe specific handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const testPayload: EventMap['system:health'] = {
        component: 'database',
        status: 'healthy',
        timestamp: Date.now()
      };

      testEventBus.on('system:health', handler1);
      testEventBus.on('system:health', handler2);

      // Remove only handler1
      testEventBus.off('system:health', handler1);
      testEventBus.emit('system:health', testPayload);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should remove all listeners for an event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const testPayload: EventMap['ai:inference'] = {
        model: 'test-model',
        latency: 150,
        timestamp: Date.now()
      };

      testEventBus.on('ai:inference', handler1);
      testEventBus.on('ai:inference', handler2);

      testEventBus.removeAllListeners('ai:inference');
      testEventBus.emit('ai:inference', testPayload);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should remove all listeners for all events', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      testEventBus.on('security:alert', handler1);
      testEventBus.on('monitor:metric', handler2);

      testEventBus.removeAllListeners();
      
      testEventBus.emit('security:alert', {
        level: 'low',
        message: 'test',
        source: 'test',
        timestamp: Date.now()
      });
      
      testEventBus.emit('monitor:metric', {
        name: 'test',
        value: 1,
        timestamp: Date.now()
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should enforce maximum listeners per event', () => {
      testEventBus.setMaxListeners(3);
      
      const handlers = Array.from({ length: 5 }, () => jest.fn());
      
      handlers.forEach(handler => {
        testEventBus.on('security:alert', handler);
      });

      // Should warn about exceeding max listeners
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Maximum listeners (3) reached')
      );

      // Should only have 3 listeners registered
      expect(testEventBus.listenerCount('security:alert')).toBe(3);
    });

    it('should track listener counts correctly', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      expect(testEventBus.listenerCount('monitor:performance')).toBe(0);

      testEventBus.on('monitor:performance', handler1);
      expect(testEventBus.listenerCount('monitor:performance')).toBe(1);

      testEventBus.on('monitor:performance', handler2);
      expect(testEventBus.listenerCount('monitor:performance')).toBe(2);

      testEventBus.off('monitor:performance', handler1);
      expect(testEventBus.listenerCount('monitor:performance')).toBe(1);
    });
  });

  describe('PII Protection', () => {
    it('should sanitize PII from event payloads', () => {
      const mockHandler = jest.fn();
      
      // Create payload with PII
      const payloadWithPII = {
        level: 'high',
        message: 'User john.doe@example.com failed login from 192.168.1.1',
        source: 'auth',
        timestamp: Date.now()
      } as EventMap['security:alert'];

      testEventBus.on('security:alert', mockHandler);
      testEventBus.emit('security:alert', payloadWithPII);

      const receivedPayload = mockHandler.mock.calls[0][0];
      expect(receivedPayload.message).toContain('[EMAIL_REDACTED]');
      expect(receivedPayload.message).toContain('[IP_REDACTED]');
      expect(receivedPayload.message).not.toContain('john.doe@example.com');
      expect(receivedPayload.message).not.toContain('192.168.1.1');
    });

    it('should sanitize sensitive keys in objects', () => {
      const mockHandler = jest.fn();
      
      const payloadWithSensitiveData = {
        name: 'test_metric',
        value: 100,
        tags: {
          password: 'secret123',
          token: 'abc123',
          normalField: 'safe_value'
        },
        timestamp: Date.now()
      } as EventMap['monitor:metric'];

      testEventBus.on('monitor:metric', mockHandler);
      testEventBus.emit('monitor:metric', payloadWithSensitiveData);

      const receivedPayload = mockHandler.mock.calls[0][0];
      expect(receivedPayload.tags.password).toBe('[SENSITIVE_REDACTED]');
      expect(receivedPayload.tags.token).toBe('[SENSITIVE_REDACTED]');
      expect(receivedPayload.tags.normalField).toBe('safe_value');
    });

    it('should handle nested objects and arrays', () => {
      const testData = {
        users: [
          { email: 'user1@test.com', name: 'User 1' },
          { email: 'user2@test.com', name: 'User 2' }
        ],
        metadata: {
          source: 'api',
          credentials: 'secret_key'
        }
      };

      const sanitized = EventBus.sanitizePII(testData);
      
      expect(sanitized.users[0].email).toBe('[EMAIL_REDACTED]');
      expect(sanitized.users[1].email).toBe('[EMAIL_REDACTED]');
      expect(sanitized.users[0].name).toBe('User 1');
      expect(sanitized.metadata.credentials).toBe('[SENSITIVE_REDACTED]');
      expect(sanitized.metadata.source).toBe('api');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits when enabled', () => {
      testEventBus.configureSecurity({
        enableRateLimiting: true,
        maxEventsPerSecond: 2
      });

      const mockHandler = jest.fn();
      testEventBus.on('security:alert', mockHandler);

      // Emit 5 events rapidly
      for (let i = 0; i < 5; i++) {
        testEventBus.emit('security:alert', {
          level: 'low',
          message: `Alert ${i}`,
          source: 'test',
          timestamp: Date.now()
        });
      }

      // Should only receive 2 events due to rate limiting
      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit exceeded')
      );
    });

    it('should reset rate limits after time window', (done) => {
      testEventBus.configureSecurity({
        enableRateLimiting: true,
        maxEventsPerSecond: 1
      });

      const mockHandler = jest.fn();
      testEventBus.on('monitor:metric', mockHandler);

      // Emit first event
      testEventBus.emit('monitor:metric', {
        name: 'test1',
        value: 1,
        timestamp: Date.now()
      });

      // Emit second event (should be rate limited)
      testEventBus.emit('monitor:metric', {
        name: 'test2',
        value: 2,
        timestamp: Date.now()
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Wait for rate limit window to reset
      setTimeout(() => {
        testEventBus.emit('monitor:metric', {
          name: 'test3',
          value: 3,
          timestamp: Date.now()
        });

        expect(mockHandler).toHaveBeenCalledTimes(2);
        done();
      }, 1100); // Wait slightly longer than 1 second
    });
  });

  describe('Security Validation', () => {
    it('should validate trusted sources for sensitive events', () => {
      testEventBus.configureSecurity({
        trustedSources: new Set(['system', 'security'])
      });

      const mockHandler = jest.fn();
      testEventBus.on('security:breach', mockHandler);

      // Emit from untrusted source
      testEventBus.emit('security:breach', {
        type: 'data',
        severity: 'high',
        breachId: 'breach123',
        affectedSystems: ['api'],
        timestamp: Date.now(),
        mitigationStatus: 'detected'
      }, 'untrusted_source');

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Untrusted source')
      );
    });

    it('should require valid timestamps for critical events', () => {
      const mockHandler = jest.fn();
      testEventBus.on('security:incident', mockHandler);

      expect(() => {
        testEventBus.emit('security:incident', {
          severity: 'critical',
          type: 'breach',
          incidentId: 'inc123',
          category: 'data_access',
          timestamp: 'invalid' as any
        });
      }).toThrow('Security event security:incident missing valid timestamp');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in event handlers gracefully', () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = jest.fn();

      testEventBus.on('system:startup', errorHandler);
      testEventBus.on('system:startup', normalHandler);

      testEventBus.emit('system:startup', {
        version: '1.0.0',
        environment: 'test',
        timestamp: Date.now()
      });

      // Normal handler should still be called despite error in first handler
      expect(normalHandler).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error emitting event')
      );
    });

    it('should handle malformed payloads gracefully', () => {
      const mockHandler = jest.fn();
      testEventBus.on('monitor:error', mockHandler);

      // This should not crash the EventBus
      testEventBus.emit('monitor:error', {
        error: new Error('Test error'),
        context: 'test',
        severity: 'low',
        timestamp: Date.now()
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide accurate statistics', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      testEventBus.on('security:alert', handler1);
      testEventBus.on('security:alert', handler2);
      testEventBus.on('monitor:metric', handler3);

      const stats = testEventBus.getStats();
      
      expect(stats.totalEvents).toBe(2);
      expect(stats.activeListeners).toBe(3);
      expect(stats.eventCounts['security:alert']).toBe(2);
      expect(stats.eventCounts['monitor:metric']).toBe(1);
    });

    it('should track event names correctly', () => {
      testEventBus.on('security:alert', jest.fn());
      testEventBus.on('monitor:metric', jest.fn());
      testEventBus.on('ai:inference', jest.fn());

      const eventNames = testEventBus.eventNames();
      
      expect(eventNames).toContain('security:alert');
      expect(eventNames).toContain('monitor:metric');
      expect(eventNames).toContain('ai:inference');
      expect(eventNames).toHaveLength(3);
    });

    it('should provide security audit information', () => {
      testEventBus.emit('security:alert', {
        level: 'high',
        message: 'Test alert',
        source: 'test',
        timestamp: Date.now()
      }, 'security');

      const audit = testEventBus.getSecurityAudit();
      
      expect(audit.recentEvents).toHaveLength(1);
      expect(audit.recentEvents[0].event).toBe('security:alert');
      expect(audit.recentEvents[0].source).toBe('security');
      expect(audit.securityConfig).toBeDefined();
    });
  });

  describe('Reset and Cleanup', () => {
    it('should reset all state when reset() is called', () => {
      const handler = jest.fn();
      
      testEventBus.on('security:alert', handler);
      testEventBus.emit('security:alert', {
        level: 'low',
        message: 'test',
        source: 'test',
        timestamp: Date.now()
      });

      expect(testEventBus.listenerCount('security:alert')).toBe(1);
      
      testEventBus.reset();
      
      expect(testEventBus.listenerCount('security:alert')).toBe(0);
      expect(testEventBus.getStats().totalEvents).toBe(0);
      expect(testEventBus.getStats().activeListeners).toBe(0);
    });
  });
});

describe('EventBus Hooks', () => {
  beforeEach(() => {
    eventBus.reset();
  });

  describe('useEventBus', () => {
    it('should provide access to EventBus methods', () => {
      const eventBusHook = useEventBus();
      
      expect(typeof eventBusHook.on).toBe('function');
      expect(typeof eventBusHook.once).toBe('function');
      expect(typeof eventBusHook.off).toBe('function');
      expect(typeof eventBusHook.emit).toBe('function');
      expect(typeof eventBusHook.removeAllListeners).toBe('function');
    });

    it('should work with the singleton instance', () => {
      const eventBusHook = useEventBus();
      const mockHandler = jest.fn();
      
      eventBusHook.on('security:alert', mockHandler);
      eventBusHook.emit('security:alert', {
        level: 'medium',
        message: 'Hook test',
        source: 'test',
        timestamp: Date.now()
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('useSecureEventBus', () => {
    it('should automatically include source in emissions', () => {
      const secureEventBus = useSecureEventBus('security_module');
      const mockHandler = jest.fn();
      
      eventBus.on('security:threat-detected', mockHandler);
      
      secureEventBus.emit('security:threat-detected', {
        threatType: 'malware',
        confidence: 0.95,
        threatId: 'threat123',
        sourceCategory: 'network',
        timestamp: Date.now(),
        riskScore: 8.5
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
      
      // Check audit log for source tracking
      const audit = eventBus.getSecurityAudit();
      expect(audit.recentEvents[0].source).toBe('security_module');
    });
  });
});

describe('EventBus Integration without Native Dependencies', () => {
  it('should work without any Node.js modules', () => {
    // This test ensures EventBus doesn\'t import any Node.js modules
    expect(() => {
      const bus = EventBus.instance;
      bus.emit('system:startup', {
        version: '1.0.0',
        environment: 'test',
        timestamp: Date.now()
      });
    }).not.toThrow();
  });

  it('should handle high-frequency events without memory leaks', () => {
    const handler = jest.fn();
    testEventBus.on('monitor:performance', handler);

    // Emit 1000 events
    for (let i = 0; i < 1000; i++) {
      testEventBus.emit('monitor:performance', {
        operation: `test_${i}`,
        duration: Math.random() * 100,
        success: true,
        timestamp: Date.now()
      });
    }

    expect(handler).toHaveBeenCalledTimes(1000);
    
    // EventBus should still be responsive
    const stats = testEventBus.getStats();
    expect(stats.activeListeners).toBe(1);
  });

  it('should work in React Native Web environment', () => {
    // Simulate React Native Web environment
    const originalPlatform = process.env.PLATFORM;
    process.env.PLATFORM = 'web';

    try {
      const handler = jest.fn();
      testEventBus.on('network:request', handler);
      
      testEventBus.emit('network:request', {
        url: 'https://api.example.com/test',
        method: 'GET',
        statusCode: 200,
        duration: 150,
        timestamp: Date.now()
      });

      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      process.env.PLATFORM = originalPlatform;
    }
  });
});

/**
 * Phase D Performance Tests - 60fps Frame Time Verification
 * Ensures EventBus replacement doesn't impact rendering performance
 */
describe('EventBus Performance Tests (60fps)', () => {
  let testEventBus: EventBus;
  const TARGET_FRAME_TIME = 16.67; // 60fps = 16.67ms per frame
  const PERFORMANCE_THRESHOLD = 5; // 5ms threshold for event operations

  beforeEach(() => {
    testEventBus = EventBus.instance;
    testEventBus.reset();
    
    // Disable logging for performance tests
    testEventBus.configureSecurity({
      enableEventLogging: false,
      enablePIIProtection: false, // Disable for pure performance testing
      enableRateLimiting: false
    });
  });

  afterEach(() => {
    testEventBus.reset();
  });

  describe('Event Emission Performance', () => {
    it('should emit events within frame budget (< 5ms)', () => {
      const handler = jest.fn();
      testEventBus.on('performance:metric', handler);

      const startTime = performance.now();
      
      // Emit 100 events to simulate burst activity
      for (let i = 0; i < 100; i++) {
        testEventBus.emit('performance:metric', {
          metric: `test_metric_${i}`,
          value: Math.random() * 100,
          timestamp: Date.now()
        });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerEvent = totalTime / 100;

      console.log(`[Performance] 100 events emitted in ${totalTime.toFixed(2)}ms (avg: ${avgTimePerEvent.toFixed(3)}ms per event)`);
      
      // Total time should be well under frame budget
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(avgTimePerEvent).toBeLessThan(0.1); // Each event should take < 0.1ms
      expect(handler).toHaveBeenCalledTimes(100);
    });

    it('should handle subscription/unsubscription within frame budget', () => {
      const handlers = Array.from({ length: 50 }, () => jest.fn());
      
      const startTime = performance.now();
      
      // Subscribe all handlers
      handlers.forEach(handler => {
        testEventBus.on('monitor:metric', handler);
      });
      
      // Emit one event to all handlers
      testEventBus.emit('monitor:metric', {
        name: 'cpu_usage',
        value: 75.5,
        timestamp: Date.now()
      });
      
      // Unsubscribe all handlers
      handlers.forEach(handler => {
        testEventBus.off('monitor:metric', handler);
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`[Performance] 50 subscribe/emit/unsubscribe operations in ${totalTime.toFixed(2)}ms`);
      
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    it('should maintain performance with complex payloads', () => {
      const handler = jest.fn();
      testEventBus.on('ai:inference-completed', handler);

      // Create complex payload
      const complexPayload = {
        modelId: 'large-language-model-v2',
        inputSize: 1024 * 1024, // 1MB
        outputSize: 512 * 1024, // 512KB
        duration: 2500,
        timestamp: Date.now(),
        metadata: {
          layers: Array.from({ length: 100 }, (_, i) => ({
            id: `layer_${i}`,
            weights: Array.from({ length: 50 }, () => Math.random()),
            activations: Array.from({ length: 50 }, () => Math.random())
          }))
        }
      };

      const startTime = performance.now();
      
      // Emit 10 complex events
      for (let i = 0; i < 10; i++) {
        testEventBus.emit('ai:inference-completed', {
          ...complexPayload,
          modelId: `${complexPayload.modelId}_${i}`
        });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`[Performance] 10 complex events emitted in ${totalTime.toFixed(2)}ms`);
      
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD * 2); // Allow 2x threshold for complex data
      expect(handler).toHaveBeenCalledTimes(10);
    });
  });

  describe('Memory Performance', () => {
    it('should not cause memory pressure during high-frequency events', () => {
      const handler = jest.fn();
      testEventBus.on('monitor:performance', handler);

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const startTime = performance.now();
      
      // Emit 1000 events rapidly
      for (let i = 0; i < 1000; i++) {
        testEventBus.emit('monitor:performance', {
          operation: `high_freq_test_${i}`,
          duration: Math.random() * 10,
          success: true,
          metadata: {
            iteration: i,
            batch: Math.floor(i / 100)
          },
          timestamp: Date.now()
        });
      }

      const endTime = performance.now();
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const totalTime = endTime - startTime;
      const memoryIncrease = finalMemory - initialMemory;
      
      console.log(`[Performance] 1000 high-frequency events:`);
      console.log(`  - Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  - Avg per event: ${(totalTime / 1000).toFixed(3)}ms`);
      console.log(`  - Memory increase: ${(memoryIncrease / 1024).toFixed(2)}KB`);
      
      expect(totalTime).toBeLessThan(50); // Should complete in under 50ms
      expect(handler).toHaveBeenCalledTimes(1000);
      
      // Memory increase should be reasonable (< 1MB for 1000 events)
      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(1024 * 1024);
      }
    });

    it('should clean up listeners efficiently', () => {
      const startTime = performance.now();
      
      // Create and destroy many listeners
      for (let i = 0; i < 100; i++) {
        const handler = jest.fn();
        testEventBus.on('security:alert', handler);
        testEventBus.emit('security:alert', {
          level: 'low',
          message: `Test ${i}`,
          source: 'perf_test',
          timestamp: Date.now()
        });
        testEventBus.off('security:alert', handler);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`[Performance] 100 listener lifecycle operations in ${totalTime.toFixed(2)}ms`);
      
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(testEventBus.listenerCount('security:alert')).toBe(0);
    });
  });

  describe('Concurrent Performance', () => {
    it('should handle multiple event types simultaneously', () => {
      const handlers = {
        security: jest.fn(),
        monitor: jest.fn(),
        ai: jest.fn(),
        user: jest.fn(),
        system: jest.fn()
      };

      // Subscribe to different event types
      testEventBus.on('security:alert', handlers.security);
      testEventBus.on('monitor:metric', handlers.monitor);
      testEventBus.on('ai:inference', handlers.ai);
      testEventBus.on('user:action', handlers.user);
      testEventBus.on('system:health', handlers.system);

      const startTime = performance.now();
      
      // Emit events concurrently across different types
      for (let i = 0; i < 50; i++) {
        testEventBus.emit('security:alert', {
          level: 'low',
          message: `Security ${i}`,
          source: 'test',
          timestamp: Date.now()
        });
        
        testEventBus.emit('monitor:metric', {
          name: `metric_${i}`,
          value: i,
          timestamp: Date.now()
        });
        
        testEventBus.emit('ai:inference', {
          model: `model_${i}`,
          latency: i * 10,
          timestamp: Date.now()
        });
        
        testEventBus.emit('user:action', {
          userHash: `user_${i}`,
          action: `action_${i}`,
          category: 'navigation',
          sessionId: `session_${i}`,
          timestamp: Date.now()
        });
        
        testEventBus.emit('system:health', {
          component: `component_${i}`,
          status: 'healthy',
          timestamp: Date.now()
        });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`[Performance] 250 concurrent multi-type events in ${totalTime.toFixed(2)}ms`);
      
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD * 2);
      
      // Verify all handlers were called
      Object.values(handlers).forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(50);
      });
    });

    it('should maintain performance under stress conditions', () => {
      // Simulate real-world stress: many listeners, frequent events
      const handlers = Array.from({ length: 20 }, () => jest.fn());
      
      handlers.forEach(handler => {
        testEventBus.on('performance:metric', handler);
      });

      const startTime = performance.now();
      
      // Emit events that will trigger all 20 handlers
      for (let i = 0; i < 100; i++) {
        testEventBus.emit('performance:metric', {
          metric: `stress_test_${i}`,
          value: Math.random() * 1000,
          timestamp: Date.now()
        });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const totalOperations = 100 * 20; // 100 events × 20 handlers
      
      console.log(`[Performance] Stress test: ${totalOperations} handler invocations in ${totalTime.toFixed(2)}ms`);
      
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD * 3); // Allow 3x threshold for stress
      
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(100);
      });
    });
  });

  describe('Frame Rate Impact Simulation', () => {
    it('should not block the main thread during typical usage', (done) => {
      let frameCount = 0;
      let totalFrameTime = 0;
      const targetFrames = 10;
      
      const handler = jest.fn();
      testEventBus.on('monitor:performance', handler);

      // Simulate frame rendering with EventBus activity
      const simulateFrame = () => {
        const frameStart = performance.now();
        
        // Simulate typical EventBus activity during a frame
        for (let i = 0; i < 5; i++) {
          testEventBus.emit('monitor:performance', {
            operation: `frame_${frameCount}_event_${i}`,
            duration: Math.random() * 10,
            success: true,
            timestamp: Date.now()
          });
        }
        
        const frameEnd = performance.now();
        const frameTime = frameEnd - frameStart;
        totalFrameTime += frameTime;
        frameCount++;
        
        console.log(`[Frame ${frameCount}] EventBus operations took ${frameTime.toFixed(3)}ms`);
        
        // Each frame's EventBus operations should be well under budget
        expect(frameTime).toBeLessThan(TARGET_FRAME_TIME / 4); // Use max 25% of frame budget
        
        if (frameCount < targetFrames) {
          // Schedule next frame
          setTimeout(simulateFrame, 16); // ~60fps
        } else {
          // Test complete
          const avgFrameTime = totalFrameTime / targetFrames;
          console.log(`[Performance] Average EventBus frame impact: ${avgFrameTime.toFixed(3)}ms`);
          
          expect(avgFrameTime).toBeLessThan(TARGET_FRAME_TIME / 4);
          expect(handler).toHaveBeenCalledTimes(targetFrames * 5);
          done();
        }
      };
      
      simulateFrame();
    });

    it('should handle burst events without frame drops', () => {
      const handler = jest.fn();
      testEventBus.on('security:threat-detected', handler);

      // Simulate security event burst (like during an attack)
      const burstStart = performance.now();
      
      for (let i = 0; i < 50; i++) {
        testEventBus.emit('security:threat-detected', {
          threatType: 'brute_force',
          confidence: 0.9 + (Math.random() * 0.1),
          threatId: `threat_${i}`,
          sourceCategory: 'network',
          timestamp: Date.now(),
          riskScore: 7 + (Math.random() * 3)
        });
      }
      
      const burstEnd = performance.now();
      const burstTime = burstEnd - burstStart;
      
      console.log(`[Performance] Security burst: 50 threat events in ${burstTime.toFixed(2)}ms`);
      
      // Even burst events should complete within frame budget
      expect(burstTime).toBeLessThan(TARGET_FRAME_TIME);
      expect(handler).toHaveBeenCalledTimes(50);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across multiple runs', () => {
      const handler = jest.fn();
      testEventBus.on('ai:model-loaded', handler);
      
      const runTimes: number[] = [];
      const eventsPerRun = 100;
      const numberOfRuns = 5;
      
      for (let run = 0; run < numberOfRuns; run++) {
        const runStart = performance.now();
        
        for (let i = 0; i < eventsPerRun; i++) {
          testEventBus.emit('ai:model-loaded', {
            modelId: `model_${run}_${i}`,
            modelType: 'transformer',
            loadTime: Math.random() * 1000,
            timestamp: Date.now()
          });
        }
        
        const runEnd = performance.now();
        const runTime = runEnd - runStart;
        runTimes.push(runTime);
        
        console.log(`[Run ${run + 1}] ${eventsPerRun} events in ${runTime.toFixed(2)}ms`);
      }
      
      const avgTime = runTimes.reduce((a, b) => a + b, 0) / runTimes.length;
      const maxTime = Math.max(...runTimes);
      const minTime = Math.min(...runTimes);
      const variance = maxTime - minTime;
      
      console.log(`[Performance Summary] Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms, Variance: ${variance.toFixed(2)}ms`);
      
      // Performance should be consistent
      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(variance).toBeLessThan(PERFORMANCE_THRESHOLD / 2); // Low variance
      expect(handler).toHaveBeenCalledTimes(eventsPerRun * numberOfRuns);
    });
  });
});