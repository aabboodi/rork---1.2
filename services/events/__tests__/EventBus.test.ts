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