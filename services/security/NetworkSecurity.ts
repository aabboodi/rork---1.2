import { Platform } from 'react-native';

interface BasicSecurityHeaders {
  'Content-Type': string;
  'X-Request-ID': string;
  'X-Client-Version': string;
}

interface BasicRateLimit {
  endpoint: string;
  maxRequests: number;
  windowMs: number;
}

class NetworkSecurity {
  private static instance: NetworkSecurity;
  private basicRateLimits: BasicRateLimit[] = [];
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private securityLogs: any[] = [];

  private constructor() {
    this.initializeBasicRateLimits();
    console.log('NetworkSecurity: Basic implementation initialized');
  }

  static getInstance(): NetworkSecurity {
    if (!NetworkSecurity.instance) {
      NetworkSecurity.instance = new NetworkSecurity();
    }
    return NetworkSecurity.instance;
  }

  // Initialize basic rate limiting rules
  private initializeBasicRateLimits(): void {
    this.basicRateLimits = [
      // Authentication endpoints - basic limits
      { endpoint: '/auth/login', maxRequests: 10, windowMs: 15 * 60 * 1000 },
      { endpoint: '/auth/otp', maxRequests: 5, windowMs: 5 * 60 * 1000 },
      
      // General API endpoints
      { endpoint: '/messages', maxRequests: 100, windowMs: 60 * 1000 },
      { endpoint: '/profile', maxRequests: 30, windowMs: 60 * 1000 },
      
      // Global rate limit
      { endpoint: '*', maxRequests: 500, windowMs: 60 * 1000 }
    ];
  }

  // Get basic security headers
  getSecurityHeaders(): BasicSecurityHeaders {
    const requestId = this.generateRequestId();
    
    return {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'X-Client-Version': '1.0.0'
    };
  }

  // Basic secure request
  async secureRequest(url: string, options: RequestInit = {}): Promise<Response> {
    try {
      // Basic rate limiting check
      if (!this.checkBasicRateLimit(url)) {
        throw new Error('Rate limit exceeded');
      }

      const secureOptions: RequestInit = {
        ...options,
        headers: {
          ...this.getSecurityHeaders(),
          ...options.headers,
        },
      };

      // Perform the request
      const response = await fetch(url, secureOptions);
      
      // Basic logging
      this.logSecurityEvent({
        type: 'api_request',
        url,
        statusCode: response.status,
        timestamp: Date.now(),
        severity: response.ok ? 'low' : 'medium'
      });
      
      return response;
    } catch (error) {
      this.logSecurityEvent({
        type: 'request_failed',
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        severity: 'high'
      });
      throw error;
    }
  }

  // Basic rate limiting
  checkBasicRateLimit(url: string): boolean {
    const endpoint = this.extractEndpoint(url);
    const clientId = 'basic_client'; // Simplified client identification
    const key = `${clientId}_${endpoint}`;
    
    // Find applicable rate limit rule
    const rateLimit = this.basicRateLimits.find(limit => 
      endpoint.includes(limit.endpoint) || limit.endpoint === '*'
    );
    
    if (!rateLimit) return true;

    const now = Date.now();
    const record = this.requestCounts.get(key);
    
    // Reset or initialize record
    if (!record || now > record.resetTime) {
      this.requestCounts.set(key, { 
        count: 1, 
        resetTime: now + rateLimit.windowMs
      });
      return true;
    }

    // Check rate limit
    if (record.count >= rateLimit.maxRequests) {
      this.logSecurityEvent({
        type: 'rate_limit_exceeded',
        endpoint,
        clientId,
        requestCount: record.count,
        timestamp: now,
        severity: 'medium'
      });
      
      return false;
    }

    record.count++;
    return true;
  }

  // Alias for compatibility
  checkAdvancedRateLimit(url: string): boolean {
    return this.checkBasicRateLimit(url);
  }

  // Basic URL sanitization
  sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Only allow HTTPS in production
      if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
        throw new Error('Invalid protocol');
      }
      
      return urlObj.toString();
    } catch (error) {
      throw new Error('URL validation failed');
    }
  }

  // Utility methods
  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  private generateRequestId(): string {
    return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  private logSecurityEvent(event: any): void {
    this.securityLogs.push(event);
    
    // Keep only last 1000 events
    if (this.securityLogs.length > 1000) {
      this.securityLogs = this.securityLogs.slice(-1000);
    }

    // Log critical events
    if (event.severity === 'critical') {
      console.error('CRITICAL SECURITY EVENT:', event);
    }
  }

  // Get basic security status
  getSecurityStatus(): any {
    const now = Date.now();
    const recentEvents = this.securityLogs.filter(log => 
      now - log.timestamp < 60 * 60 * 1000 // Last hour
    );

    return {
      rateLimitingActive: this.basicRateLimits.length > 0,
      recentSecurityEvents: recentEvents.length,
      criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
      lastSecurityCheck: now,
      implementationLevel: 'BASIC',
      features: {
        basicRateLimit: true,
        basicLogging: true,
        urlSanitization: true
      },
      warnings: [
        'This is a basic implementation',
        'Advanced features like certificate pinning are not implemented',
        'Suitable for development only'
      ]
    };
  }
}

export default NetworkSecurity;