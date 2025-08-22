import { Platform } from 'react-native';
import { CryptoService } from './CryptoService';
import { SecurityManager } from './SecurityManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// CSP Policy Types
interface CSPDirective {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'connect-src'?: string[];
  'font-src'?: string[];
  'object-src'?: string[];
  'media-src'?: string[];
  'frame-src'?: string[];
  'child-src'?: string[];
  'worker-src'?: string[];
  'manifest-src'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'frame-ancestors'?: string[];
  'plugin-types'?: string[];
  'sandbox'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
  'require-sri-for'?: string[];
  'report-uri'?: string[];
  'report-to'?: string[];
}

interface RouteCSPConfig {
  route: string;
  pattern: RegExp;
  policy: CSPDirective;
  nonce?: boolean;
  reportOnly?: boolean;
  priority: number;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface CSPViolationReport {
  'document-uri': string;
  'referrer': string;
  'violated-directive': string;
  'effective-directive': string;
  'original-policy': string;
  'disposition': string;
  'blocked-uri': string;
  'line-number': number;
  'column-number': number;
  'source-file': string;
  'status-code': number;
  'script-sample': string;
}

interface CSPContext {
  route: string;
  userAgent: string;
  clientIP: string;
  sessionId?: string;
  userId?: string;
  deviceId?: string;
  timestamp: number;
  nonce?: string;
}

interface CSPMetrics {
  totalRequests: number;
  violationsBlocked: number;
  policiesApplied: number;
  nonceGenerated: number;
  lastViolation: number;
  routeMetrics: Map<string, {
    requests: number;
    violations: number;
    lastAccess: number;
  }>;
}

class CSPMiddleware {
  private static instance: CSPMiddleware;
  private routeConfigs: RouteCSPConfig[] = [];
  private violationReports: CSPViolationReport[] = [];
  private metrics: CSPMetrics;
  private nonceCache: Map<string, { nonce: string; expiry: number }> = new Map();
  private securityManager: SecurityManager | null = null;

  private constructor() {
    // Defer SecurityManager initialization to prevent circular dependencies
    setTimeout(() => {
      try {
        this.securityManager = SecurityManager.getInstance();
      } catch (error) {
        console.warn('SecurityManager not available for CSPMiddleware:', error);
      }
    }, 100);
    this.metrics = {
      totalRequests: 0,
      violationsBlocked: 0,
      policiesApplied: 0,
      nonceGenerated: 0,
      lastViolation: 0,
      routeMetrics: new Map()
    };

    this.initializeCSPMiddleware();
  }

  public static getInstance(): CSPMiddleware {
    if (!CSPMiddleware.instance) {
      CSPMiddleware.instance = new CSPMiddleware();
    }
    return CSPMiddleware.instance;
  }

  // Initialize CSP middleware with route configurations
  private async initializeCSPMiddleware(): Promise<void> {
    try {
      console.log('Initializing Dynamic CSP Middleware...');

      // Load saved configurations
      await this.loadCSPConfigurations();

      // Initialize default route configurations
      this.initializeDefaultRouteConfigs();

      // Set up violation reporting
      this.setupViolationReporting();

      // Start nonce cleanup
      this.startNonceCleanup();

      console.log('Dynamic CSP Middleware initialized successfully');
    } catch (error) {
      console.error('CSP Middleware initialization failed:', error);
    }
  }

  // Initialize default route-specific CSP configurations
  private initializeDefaultRouteConfigs(): void {
    this.routeConfigs = [
      // Authentication routes - Strictest security
      {
        route: '/auth/*',
        pattern: /^\/auth\//,
        policy: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'nonce-{nonce}'", "'unsafe-eval'"],
          'style-src': ["'self'", "'nonce-{nonce}'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:'],
          'connect-src': ["'self'", 'https://toolkit.rork.com'],
          'font-src': ["'self'"],
          'object-src': ["'none'"],
          'media-src': ["'self'"],
          'frame-src': ["'none'"],
          'child-src': ["'none'"],
          'worker-src': ["'self'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'none'"],
          'upgrade-insecure-requests': true,
          'block-all-mixed-content': true,
          'report-uri': ['/api/csp-report']
        },
        nonce: true,
        reportOnly: false,
        priority: 10,
        description: 'Authentication routes with maximum security',
        riskLevel: 'critical'
      },

      // Wallet routes - Financial security
      {
        route: '/wallet/*',
        pattern: /^\/wallet\//,
        policy: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'nonce-{nonce}'", "'unsafe-eval'"],
          'style-src': ["'self'", "'nonce-{nonce}'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
          'connect-src': ["'self'", 'https://toolkit.rork.com'],
          'font-src': ["'self'"],
          'object-src': ["'none'"],
          'media-src': ["'none'"],
          'frame-src': ["'none'"],
          'child-src': ["'none'"],
          'worker-src': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'none'"],
          'upgrade-insecure-requests': true,
          'block-all-mixed-content': true,
          'report-uri': ['/api/csp-report']
        },
        nonce: true,
        reportOnly: false,
        priority: 10,
        description: 'Financial wallet routes with strict security',
        riskLevel: 'critical'
      },

      // Chat routes - Secure messaging
      {
        route: '/chat/*',
        pattern: /^\/chat\//,
        policy: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'nonce-{nonce}'", "'unsafe-eval'"],
          'style-src': ["'self'", "'nonce-{nonce}'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:', 'blob:'],
          'connect-src': ["'self'", 'https://toolkit.rork.com', 'wss:', 'ws:'],
          'font-src': ["'self'"],
          'object-src': ["'none'"],
          'media-src': ["'self'", 'blob:', 'data:'],
          'frame-src': ["'none'"],
          'child-src': ["'none'"],
          'worker-src': ["'self'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'none'"],
          'upgrade-insecure-requests': true,
          'block-all-mixed-content': true,
          'report-uri': ['/api/csp-report']
        },
        nonce: true,
        reportOnly: false,
        priority: 8,
        description: 'Chat routes with media support',
        riskLevel: 'high'
      },

      // Profile routes - User data
      {
        route: '/profile/*',
        pattern: /^\/profile\//,
        policy: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'nonce-{nonce}'", "'unsafe-eval'"],
          'style-src': ["'self'", "'nonce-{nonce}'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:', 'blob:'],
          'connect-src': ["'self'", 'https://toolkit.rork.com'],
          'font-src': ["'self'"],
          'object-src': ["'none'"],
          'media-src': ["'self'", 'blob:', 'data:'],
          'frame-src': ["'none'"],
          'child-src': ["'none'"],
          'worker-src': ["'self'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'none'"],
          'upgrade-insecure-requests': true,
          'report-uri': ['/api/csp-report']
        },
        nonce: true,
        reportOnly: false,
        priority: 6,
        description: 'Profile routes with image upload support',
        riskLevel: 'medium'
      },

      // Social feed routes - Content display
      {
        route: '/feed',
        pattern: /^\/feed$/,
        policy: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'nonce-{nonce}'", "'unsafe-eval'"],
          'style-src': ["'self'", "'nonce-{nonce}'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:', 'blob:'],
          'connect-src': ["'self'", 'https://toolkit.rork.com'],
          'font-src': ["'self'"],
          'object-src': ["'none'"],
          'media-src': ["'self'", 'blob:', 'data:', 'https:'],
          'frame-src': ["'none'"],
          'child-src': ["'none'"],
          'worker-src': ["'self'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'none'"],
          'upgrade-insecure-requests': true,
          'report-uri': ['/api/csp-report']
        },
        nonce: true,
        reportOnly: false,
        priority: 5,
        description: 'Social feed with media content',
        riskLevel: 'medium'
      },

      // Dashboard routes - Admin/monitoring
      {
        route: '/dashboard',
        pattern: /^\/dashboard$/,
        policy: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'nonce-{nonce}'", "'unsafe-eval'"],
          'style-src': ["'self'", "'nonce-{nonce}'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
          'connect-src': ["'self'", 'https://toolkit.rork.com'],
          'font-src': ["'self'"],
          'object-src': ["'none'"],
          'media-src': ["'none'"],
          'frame-src': ["'none'"],
          'child-src': ["'none'"],
          'worker-src': ["'self'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'none'"],
          'upgrade-insecure-requests': true,
          'block-all-mixed-content': true,
          'report-uri': ['/api/csp-report']
        },
        nonce: true,
        reportOnly: false,
        priority: 7,
        description: 'Dashboard with monitoring capabilities',
        riskLevel: 'high'
      },

      // API routes - Backend communication
      {
        route: '/api/*',
        pattern: /^\/api\//,
        policy: {
          'default-src': ["'none'"],
          'script-src': ["'none'"],
          'style-src': ["'none'"],
          'img-src': ["'none'"],
          'connect-src': ["'self'"],
          'font-src': ["'none'"],
          'object-src': ["'none'"],
          'media-src': ["'none'"],
          'frame-src': ["'none'"],
          'child-src': ["'none'"],
          'worker-src': ["'none'"],
          'base-uri': ["'none'"],
          'form-action': ["'none'"],
          'frame-ancestors': ["'none'"],
          'upgrade-insecure-requests': true,
          'block-all-mixed-content': true,
          'report-uri': ['/api/csp-report']
        },
        nonce: false,
        reportOnly: false,
        priority: 9,
        description: 'API endpoints with minimal permissions',
        riskLevel: 'critical'
      },

      // Default fallback - Most restrictive
      {
        route: '/*',
        pattern: /.*/,
        policy: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'nonce-{nonce}'", "'unsafe-eval'"],
          'style-src': ["'self'", "'nonce-{nonce}'"],
          'img-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'font-src': ["'self'"],
          'object-src': ["'none'"],
          'media-src': ["'self'"],
          'frame-src': ["'none'"],
          'child-src': ["'none'"],
          'worker-src': ["'self'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'none'"],
          'upgrade-insecure-requests': true,
          'block-all-mixed-content': true,
          'report-uri': ['/api/csp-report']
        },
        nonce: true,
        reportOnly: false,
        priority: 1,
        description: 'Default restrictive policy for all routes',
        riskLevel: 'medium'
      }
    ];

    // Sort by priority (highest first)
    this.routeConfigs.sort((a, b) => b.priority - a.priority);
  }

  // Generate CSP headers for a specific route
  public async generateCSPHeaders(context: CSPContext): Promise<Record<string, string>> {
    try {
      this.metrics.totalRequests++;

      // Find matching route configuration
      const routeConfig = this.findMatchingRouteConfig(context.route);
      
      if (!routeConfig) {
        console.warn(`No CSP configuration found for route: ${context.route}`);
        return {};
      }

      // Generate nonce if required
      let nonce: string | undefined;
      if (routeConfig.nonce) {
        nonce = await this.generateNonce(context);
        this.metrics.nonceGenerated++;
      }

      // Build CSP policy string
      const policyString = this.buildCSPPolicyString(routeConfig.policy, nonce);

      // Update metrics
      this.updateRouteMetrics(context.route);
      this.metrics.policiesApplied++;

      // Prepare headers
      const headers: Record<string, string> = {};
      
      if (routeConfig.reportOnly) {
        headers['Content-Security-Policy-Report-Only'] = policyString;
      } else {
        headers['Content-Security-Policy'] = policyString;
      }

      // Add additional security headers
      headers['X-Content-Type-Options'] = 'nosniff';
      headers['X-Frame-Options'] = 'DENY';
      headers['X-XSS-Protection'] = '1; mode=block';
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
      headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=(), payment=()';

      // Add nonce to context for use in components
      if (nonce) {
        headers['X-CSP-Nonce'] = nonce;
      }

      // Log CSP application
      this.logCSPApplication(context, routeConfig, nonce);

      return headers;
    } catch (error) {
      console.error('CSP header generation failed:', error);
      return this.getEmergencyCSPHeaders();
    }
  }

  // Find matching route configuration
  private findMatchingRouteConfig(route: string): RouteCSPConfig | null {
    // Find the first matching configuration (highest priority)
    for (const config of this.routeConfigs) {
      if (config.pattern.test(route)) {
        return config;
      }
    }
    return null;
  }

  // Generate cryptographically secure nonce
  private async generateNonce(context: CSPContext): Promise<string> {
    try {
      // Check cache first
      const cacheKey = `${context.route}_${context.sessionId || 'anonymous'}`;
      const cached = this.nonceCache.get(cacheKey);
      
      if (cached && Date.now() < cached.expiry) {
        return cached.nonce;
      }

      // Generate new nonce
      const nonce = await CryptoService.generateSecureId();
      const base64Nonce = Buffer.from(nonce).toString('base64');

      // Cache nonce for 5 minutes
      this.nonceCache.set(cacheKey, {
        nonce: base64Nonce,
        expiry: Date.now() + (5 * 60 * 1000)
      });

      return base64Nonce;
    } catch (error) {
      console.error('Nonce generation failed:', error);
      return 'fallback-nonce-' + Date.now();
    }
  }

  // Build CSP policy string from directive object
  private buildCSPPolicyString(policy: CSPDirective, nonce?: string): string {
    const directives: string[] = [];

    for (const [directive, values] of Object.entries(policy)) {
      if (typeof values === 'boolean') {
        if (values) {
          directives.push(directive);
        }
      } else if (Array.isArray(values)) {
        let directiveValues = values.map(value => {
          // Replace nonce placeholder
          if (nonce && value.includes('{nonce}')) {
            return value.replace('{nonce}', nonce);
          }
          return value;
        });

        directives.push(`${directive} ${directiveValues.join(' ')}`);
      }
    }

    return directives.join('; ');
  }

  // Update route-specific metrics
  private updateRouteMetrics(route: string): void {
    const existing = this.metrics.routeMetrics.get(route) || {
      requests: 0,
      violations: 0,
      lastAccess: 0
    };

    existing.requests++;
    existing.lastAccess = Date.now();

    this.metrics.routeMetrics.set(route, existing);
  }

  // Log CSP application
  private logCSPApplication(context: CSPContext, config: RouteCSPConfig, nonce?: string): void {
    console.log(`CSP Applied: ${config.route} (${config.riskLevel}) - Nonce: ${nonce ? 'Yes' : 'No'}`);
    
    // Log to security manager for audit trail
    if (this.securityManager?.logSecurityEvent) {
      this.securityManager.logSecurityEvent({
        type: 'security_violation', // Using existing type
        timestamp: Date.now(),
        details: {
          action: 'csp_policy_applied',
          route: context.route,
          policy: config.route,
          riskLevel: config.riskLevel,
          nonce: !!nonce,
          userAgent: context.userAgent,
          clientIP: context.clientIP
        },
        severity: 'low',
        userId: context.userId
      });
    }
  }

  // Handle CSP violation reports
  public async handleCSPViolation(report: CSPViolationReport, context: CSPContext): Promise<void> {
    try {
      this.metrics.violationsBlocked++;
      this.metrics.lastViolation = Date.now();

      // Update route metrics
      const routeMetrics = this.metrics.routeMetrics.get(context.route);
      if (routeMetrics) {
        routeMetrics.violations++;
      }

      // Store violation report
      this.violationReports.push(report);

      // Keep only last 1000 reports
      if (this.violationReports.length > 1000) {
        this.violationReports = this.violationReports.slice(-1000);
      }

      // Log critical violations
      const isCritical = this.isCriticalViolation(report);
      
      console.warn(`CSP Violation ${isCritical ? '(CRITICAL)' : ''}: ${report['violated-directive']} on ${report['document-uri']}`);

      // Report to security manager
      if (this.securityManager?.logSecurityEvent) {
        this.securityManager.logSecurityEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          details: {
            action: 'csp_violation',
            violatedDirective: report['violated-directive'],
            blockedUri: report['blocked-uri'],
            documentUri: report['document-uri'],
            sourceFile: report['source-file'],
            lineNumber: report['line-number'],
            route: context.route,
            critical: isCritical
          },
          severity: isCritical ? 'critical' : 'medium',
          userId: context.userId
        });
      }

      // Auto-adjust policy if needed
      if (isCritical) {
        await this.handleCriticalViolation(report, context);
      }

      // Save violation data
      await this.saveViolationData();

    } catch (error) {
      console.error('CSP violation handling failed:', error);
    }
  }

  // Check if violation is critical
  private isCriticalViolation(report: CSPViolationReport): boolean {
    const criticalDirectives = [
      'script-src',
      'object-src',
      'base-uri',
      'form-action'
    ];

    const criticalPatterns = [
      'javascript:',
      'data:text/html',
      'eval',
      'inline'
    ];

    // Check if violated directive is critical
    if (criticalDirectives.some(directive => 
      report['violated-directive'].includes(directive))) {
      return true;
    }

    // Check if blocked URI contains critical patterns
    if (criticalPatterns.some(pattern => 
      report['blocked-uri'].includes(pattern))) {
      return true;
    }

    return false;
  }

  // Handle critical CSP violations
  private async handleCriticalViolation(report: CSPViolationReport, context: CSPContext): Promise<void> {
    try {
      console.error('CRITICAL CSP VIOLATION DETECTED:', report);

      // Find the route configuration
      const routeConfig = this.findMatchingRouteConfig(context.route);
      
      if (routeConfig && routeConfig.riskLevel === 'critical') {
        // For critical routes, consider blocking the request
        console.error(`Critical violation on high-risk route: ${context.route}`);
        
        // Could implement automatic policy tightening here
        await this.tightenCSPPolicy(routeConfig, report);
      }

      // Alert security team
      await this.alertSecurityTeam(report, context);

    } catch (error) {
      console.error('Critical violation handling failed:', error);
    }
  }

  // Tighten CSP policy after critical violation
  private async tightenCSPPolicy(config: RouteCSPConfig, report: CSPViolationReport): Promise<void> {
    try {
      const violatedDirective = report['violated-directive'].split(' ')[0];
      
      // Make policy more restrictive
      if (config.policy[violatedDirective as keyof CSPDirective]) {
        console.log(`Tightening ${violatedDirective} policy for ${config.route}`);
        
        // Remove unsafe sources
        const currentValues = config.policy[violatedDirective as keyof CSPDirective] as string[];
        if (currentValues) {
          config.policy[violatedDirective as keyof CSPDirective] = currentValues.filter(value => 
            !value.includes('unsafe') && value !== '*'
          );
        }

        // Save updated configuration
        await this.saveCSPConfigurations();
      }
    } catch (error) {
      console.error('Policy tightening failed:', error);
    }
  }

  // Alert security team about critical violations
  private async alertSecurityTeam(report: CSPViolationReport, context: CSPContext): Promise<void> {
    // In production, this would send alerts to security team
    console.error('🚨 SECURITY ALERT: Critical CSP Violation', {
      route: context.route,
      violation: report['violated-directive'],
      blockedUri: report['blocked-uri'],
      timestamp: new Date().toISOString()
    });
  }

  // Get emergency CSP headers (fallback)
  private getEmergencyCSPHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    };
  }

  // Setup violation reporting endpoint
  private setupViolationReporting(): void {
    // In a real implementation, this would set up an endpoint to receive CSP violation reports
    console.log('CSP violation reporting endpoint configured');
  }

  // Start nonce cleanup process
  private startNonceCleanup(): void {
    // Clean expired nonces every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.nonceCache.entries()) {
        if (now > value.expiry) {
          this.nonceCache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  // Load CSP configurations from storage
  private async loadCSPConfigurations(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('csp_configurations');
      if (saved) {
        const configs = JSON.parse(saved);
        // Merge with defaults, keeping custom configurations
        this.routeConfigs = [...configs];
      }
    } catch (error) {
      console.error('Failed to load CSP configurations:', error);
    }
  }

  // Save CSP configurations to storage
  private async saveCSPConfigurations(): Promise<void> {
    try {
      await AsyncStorage.setItem('csp_configurations', JSON.stringify(this.routeConfigs));
    } catch (error) {
      console.error('Failed to save CSP configurations:', error);
    }
  }

  // Save violation data
  private async saveViolationData(): Promise<void> {
    try {
      await AsyncStorage.setItem('csp_violations', JSON.stringify(this.violationReports));
      await AsyncStorage.setItem('csp_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Failed to save violation data:', error);
    }
  }

  // Public API methods

  // Add custom route configuration
  public async addRouteConfiguration(config: RouteCSPConfig): Promise<void> {
    this.routeConfigs.push(config);
    this.routeConfigs.sort((a, b) => b.priority - a.priority);
    await this.saveCSPConfigurations();
  }

  // Update existing route configuration
  public async updateRouteConfiguration(route: string, updates: Partial<RouteCSPConfig>): Promise<boolean> {
    const index = this.routeConfigs.findIndex(config => config.route === route);
    if (index === -1) return false;

    this.routeConfigs[index] = { ...this.routeConfigs[index], ...updates };
    await this.saveCSPConfigurations();
    return true;
  }

  // Get route configurations
  public getRouteConfigurations(): RouteCSPConfig[] {
    return [...this.routeConfigs];
  }

  // Get CSP metrics
  public getCSPMetrics(): CSPMetrics {
    return { ...this.metrics };
  }

  // Get violation reports
  public getViolationReports(limit?: number): CSPViolationReport[] {
    const reports = [...this.violationReports].reverse();
    return limit ? reports.slice(0, limit) : reports;
  }

  // Get nonce for current context
  public async getNonceForContext(context: CSPContext): Promise<string | null> {
    const routeConfig = this.findMatchingRouteConfig(context.route);
    if (!routeConfig || !routeConfig.nonce) {
      return null;
    }

    return await this.generateNonce(context);
  }

  // Clear violation reports
  public async clearViolationReports(): Promise<void> {
    this.violationReports = [];
    await this.saveViolationData();
  }

  // Reset metrics
  public async resetMetrics(): Promise<void> {
    this.metrics = {
      totalRequests: 0,
      violationsBlocked: 0,
      policiesApplied: 0,
      nonceGenerated: 0,
      lastViolation: 0,
      routeMetrics: new Map()
    };
    await this.saveViolationData();
  }

  // Get CSP status for dashboard
  public getCSPStatus(): any {
    const recentViolations = this.violationReports.filter(report => 
      Date.now() - new Date(report['document-uri']).getTime() < 24 * 60 * 60 * 1000
    );

    return {
      enabled: true,
      routeConfigsCount: this.routeConfigs.length,
      totalRequests: this.metrics.totalRequests,
      violationsBlocked: this.metrics.violationsBlocked,
      recentViolations: recentViolations.length,
      lastViolation: this.metrics.lastViolation,
      nonceGenerated: this.metrics.nonceGenerated,
      implementationLevel: 'DYNAMIC_ROUTE_BASED'
    };
  }
}

export { 
  CSPMiddleware, 
  type CSPDirective, 
  type RouteCSPConfig, 
  type CSPViolationReport, 
  type CSPContext, 
  type CSPMetrics 
};