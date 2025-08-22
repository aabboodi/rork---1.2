import EE from 'eventemitter3';

/**
 * Event map defining all possible events and their payload types
 * This ensures type safety across the entire application
 */
export type EventMap = {
  // Security Events
  'security:incident': { 
    severity: 'low' | 'medium' | 'high' | 'critical'; 
    type: string;
    details: any;
    timestamp: number;
    userId?: string;
  };
  'security:breach': {
    type: 'data' | 'access' | 'authentication' | 'authorization';
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: any;
    timestamp: number;
  };
  'security:threat-detected': {
    threatType: string;
    confidence: number;
    details: any;
    timestamp: number;
  };
  'security:key-rotation': {
    keyId: string;
    status: 'started' | 'completed' | 'failed';
    timestamp: number;
  };
  'security:device-binding': {
    deviceId: string;
    action: 'bound' | 'unbound' | 'verification-failed';
    timestamp: number;
  };
  'security:alert': { 
    level: string; 
    message: string; 
    source: string;
    timestamp: number;
  };
  
  // Monitoring Events
  'monitor:metric': { 
    name: string; 
    value: number; 
    tags?: Record<string, string>;
    timestamp: number;
  };
  'monitor:performance': {
    operation: string;
    duration: number;
    success: boolean;
    metadata?: any;
    timestamp: number;
  };
  'monitor:error': {
    error: Error;
    context: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: number;
  };
  'monitor:health-check': {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    details?: any;
    timestamp: number;
  };
  'performance:metric': { 
    metric: string; 
    value: number; 
    timestamp: number;
  };
  
  // AI/ML Events
  'ai:model-loaded': {
    modelId: string;
    modelType: string;
    loadTime: number;
    timestamp: number;
  };
  'ai:inference-completed': {
    modelId: string;
    inputSize: number;
    outputSize: number;
    duration: number;
    timestamp: number;
  };
  'ai:inference': { 
    model: string; 
    latency: number; 
    accuracy?: number;
    timestamp: number;
  };
  'ai:training-started': {
    modelId: string;
    datasetSize: number;
    timestamp: number;
  };
  'ai:training-completed': {
    modelId: string;
    accuracy?: number;
    loss?: number;
    duration: number;
    timestamp: number;
  };
  
  // User Events
  'user:login': {
    userId: string;
    method: 'password' | 'biometric' | 'mfa';
    deviceId: string;
    timestamp: number;
  };
  'user:logout': {
    userId: string;
    reason: 'manual' | 'timeout' | 'security';
    timestamp: number;
  };
  'user:action': {
    userId: string;
    action: string;
    details?: any;
    timestamp: number;
  };
  
  // System Events
  'system:startup': {
    version: string;
    environment: string;
    timestamp: number;
  };
  'system:shutdown': {
    reason: string;
    timestamp: number;
  };
  'system:config-changed': {
    key: string;
    oldValue?: any;
    newValue: any;
    timestamp: number;
  };
  'system:health': { 
    component: string; 
    status: 'healthy' | 'degraded' | 'critical';
    timestamp: number;
  };
  
  // Network Events
  'network:request': {
    url: string;
    method: string;
    statusCode?: number;
    duration?: number;
    timestamp: number;
  };
  'network:error': {
    url: string;
    error: string;
    timestamp: number;
  };
  
  // Data Events
  'data:sync-started': {
    type: string;
    timestamp: number;
  };
  'data:sync-completed': {
    type: string;
    recordsProcessed: number;
    duration: number;
    timestamp: number;
  };
  'data:backup-created': {
    backupId: string;
    size: number;
    timestamp: number;
  };
};

/**
 * Centralized Event Bus for React Native/Expo applications
 * Replaces Node.js EventEmitter with a mobile-compatible solution
 * 
 * Features:
 * - Type-safe event handling
 * - Singleton pattern for global access
 * - Memory leak prevention
 * - Performance monitoring
 * - Error handling
 */
export class EventBus {
  private static _inst: EventBus;
  private ee = new EE();
  private listenerCounts = new Map<string, number>();
  private maxListeners = 50; // Prevent memory leaks
  
  /**
   * Get the singleton instance of EventBus
   */
  static get instance(): EventBus {
    if (!EventBus._inst) {
      EventBus._inst = new EventBus();
    }
    return EventBus._inst;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Set up error handling for the event emitter
    this.ee.on('error', (error: Error) => {
      console.error('[EventBus] Error in event handler:', error);
    });
  }
  
  /**
   * Subscribe to an event with type safety
   */
  on<K extends keyof EventMap>(evt: K, fn: (p: EventMap[K]) => void): void {
    // Check listener count to prevent memory leaks
    const currentCount = this.listenerCounts.get(evt as string) || 0;
    if (currentCount >= this.maxListeners) {
      console.warn(`[EventBus] Maximum listeners (${this.maxListeners}) reached for event: ${evt as string}`);
      return;
    }
    
    this.ee.on(evt as string, fn as any);
    this.listenerCounts.set(evt as string, currentCount + 1);
  }
  
  /**
   * Subscribe to an event once with type safety
   */
  once<K extends keyof EventMap>(evt: K, fn: (p: EventMap[K]) => void): void {
    const wrappedListener = (payload: EventMap[K]) => {
      const currentCount = this.listenerCounts.get(evt as string) || 0;
      this.listenerCounts.set(evt as string, Math.max(0, currentCount - 1));
      fn(payload);
    };
    
    this.ee.once(evt as string, wrappedListener as any);
    const currentCount = this.listenerCounts.get(evt as string) || 0;
    this.listenerCounts.set(evt as string, currentCount + 1);
  }
  
  /**
   * Unsubscribe from an event with type safety
   */
  off<K extends keyof EventMap>(evt: K, fn: (p: EventMap[K]) => void): void {
    this.ee.off(evt as string, fn as any);
    const currentCount = this.listenerCounts.get(evt as string) || 0;
    this.listenerCounts.set(evt as string, Math.max(0, currentCount - 1));
  }
  
  /**
   * Emit an event with type safety
   */
  emit<K extends keyof EventMap>(evt: K, payload: EventMap[K]): void {
    try {
      // Ensure timestamp is set if not provided
      if (!payload.timestamp) {
        (payload as any).timestamp = Date.now();
      }
      
      this.ee.emit(evt as string, payload);
    } catch (error) {
      console.error(`[EventBus] Error emitting event ${evt as string}:`, error);
    }
  }
  
  /**
   * Remove all listeners for a specific event
   */
  removeAllListeners<K extends keyof EventMap>(evt?: K): void {
    if (evt) {
      this.ee.removeAllListeners(evt as string);
      this.listenerCounts.set(evt as string, 0);
    } else {
      this.ee.removeAllListeners();
      this.listenerCounts.clear();
    }
  }
  
  /**
   * Get the number of listeners for an event
   */
  listenerCount<K extends keyof EventMap>(evt: K): number {
    return this.ee.listenerCount(evt as string);
  }
  
  /**
   * Get all event names that have listeners
   */
  eventNames(): (keyof EventMap)[] {
    return this.ee.eventNames() as (keyof EventMap)[];
  }
  
  /**
   * Set the maximum number of listeners per event
   */
  setMaxListeners(max: number): void {
    this.maxListeners = max;
  }
  
  /**
   * Get performance statistics
   */
  getStats(): {
    totalEvents: number;
    activeListeners: number;
    eventCounts: Record<string, number>;
  } {
    const eventCounts: Record<string, number> = {};
    let totalListeners = 0;
    
    for (const [event, count] of this.listenerCounts.entries()) {
      eventCounts[event] = count;
      totalListeners += count;
    }
    
    return {
      totalEvents: this.listenerCounts.size,
      activeListeners: totalListeners,
      eventCounts
    };
  }
  
  /**
   * Clear all listeners and reset the event bus
   * Useful for testing or app reset scenarios
   */
  reset(): void {
    this.removeAllListeners();
    this.listenerCounts.clear();
  }
}

/**
 * Convenience function to get the EventBus instance
 */
export const eventBus = EventBus.instance;

/**
 * Type-safe event emitter hook for React components
 */
export function useEventBus() {
  return {
    on: EventBus.instance.on.bind(EventBus.instance),
    once: EventBus.instance.once.bind(EventBus.instance),
    off: EventBus.instance.off.bind(EventBus.instance),
    emit: EventBus.instance.emit.bind(EventBus.instance),
    removeAllListeners: EventBus.instance.removeAllListeners.bind(EventBus.instance)
  };
}

export default EventBus;