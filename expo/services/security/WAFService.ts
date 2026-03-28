import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityManager } from './SecurityManager';
import { CryptoService } from './CryptoService';
import { CSPMiddleware, type CSPContext } from './CSPMiddleware';

// WAF Rule Types
interface WAFRule {
  id: string;
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'block' | 'log' | 'sanitize';
  category: 'xss' | 'sqli' | 'csrf' | 'rce' | 'lfi' | 'rfi' | 'xxe';
}

interface WAFConfig {
  enabled: boolean;
  blockMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxRequestSize: number;
  rateLimiting: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
  ipWhitelist: string[];
  ipBlacklist: string[];
  dynamicCSP: {
    enabled: boolean;
    strictMode: boolean;
    reportViolations: boolean;
  };
}

interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'Content-Security-Policy-Report-Only'?: string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'X-XSS-Protection': string;
  'Strict-Transport-Security': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'X-CSP-Nonce'?: string;
}

interface WAFLog {
  timestamp: number;
  requestId: string;
  clientIP: string;
  userAgent: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  ruleTriggered: string;
  severity: string;
  action: string;
  blocked: boolean;
  route?: string;
  cspViolation?: boolean;
}

class WAFService {
  private static instance: WAFService;
  private config: WAFConfig;
  private rules: WAFRule[];
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private blockedIPs: Set<string> = new Set();
  private securityHeaders: SecurityHeaders;
  private cspMiddleware: CSPMiddleware;

  private constructor() {
    this.config = {
      enabled: true,
      blockMode: true,
      logLevel: 'warn',
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      rateLimiting: {
        enabled: true,
        maxRequests: 100,
        windowMs: 15 * 60 * 1000, // 15 minutes
      },
      ipWhitelist: [],
      ipBlacklist: [],
      dynamicCSP: {
        enabled: true,
        strictMode: true,
        reportViolations: true
      }
    };

    this.securityHeaders = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
    };

    this.cspMiddleware = CSPMiddleware.getInstance();
    this.initializeRules();
    this.loadConfiguration();
  }

  public static getInstance(): WAFService {
    if (!WAFService.instance) {
      WAFService.instance = new WAFService();
    }
    return WAFService.instance;
  }

  private initializeRules(): void {
    this.rules = [
      // XSS Protection Rules
      {
        id: 'xss-001',
        name: 'Script Tag Detection',
        pattern: /<script[^>]*>.*?<\/script>/gi,
        severity: 'critical',
        action: 'block',
        category: 'xss'
      },
      {
        id: 'xss-002',
        name: 'JavaScript Event Handler',
        pattern: /on\w+\s*=\s*["'][^"']*["']/gi,
        severity: 'high',
        action: 'sanitize',
        category: 'xss'
      },
      {
        id: 'xss-003',
        name: 'JavaScript Protocol',
        pattern: /javascript:/gi,
        severity: 'high',
        action: 'block',
        category: 'xss'
      },
      {
        id: 'xss-004',
        name: 'Data URI with Script',
        pattern: /data:.*script/gi,
        severity: 'critical',
        action: 'block',
        category: 'xss'
      },

      // SQL Injection Protection Rules
      {
        id: 'sqli-001',
        name: 'Union Select Attack',
        pattern: /\bunion\s+select\b/gi,
        severity: 'critical',
        action: 'block',
        category: 'sqli'
      },
      {
        id: 'sqli-002',
        name: 'SQL Comment Injection',
        pattern: /(--|#|\/\*|\*\/)/g,
        severity: 'high',
        action: 'block',
        category: 'sqli'
      },
      {
        id: 'sqli-003',
        name: 'SQL Function Calls',
        pattern: /\b(exec|execute|sp_|xp_|cmdshell)\b/gi,
        severity: 'critical',
        action: 'block',
        category: 'sqli'
      },
      {
        id: 'sqli-004',
        name: 'SQL Operators',
        pattern: /'\s*(or|and)\s*'\s*=\s*'/gi,
        severity: 'critical',
        action: 'block',
        category: 'sqli'
      },

      // CSRF Protection Rules
      {
        id: 'csrf-001',
        name: 'Missing CSRF Token',
        pattern: /^(?!.*csrf[_-]?token).*$/i,
        severity: 'medium',
        action: 'log',
        category: 'csrf'
      },

      // Remote Code Execution (RCE)
      {
        id: 'rce-001',
        name: 'System Command Injection',
        pattern: /\b(system|exec|shell_exec|passthru|eval|base64_decode)\s*\(/gi,
        severity: 'critical',
        action: 'block',
        category: 'rce'
      },

      // Local File Inclusion (LFI)
      {
        id: 'lfi-001',
        name: 'Directory Traversal',
        pattern: /\.\.[\\/\\]/g,
        severity: 'high',
        action: 'block',
        category: 'lfi'
      },

      // XML External Entity (XXE)
      {
        id: 'xxe-001',
        name: 'XML Entity Declaration',
        pattern: /<!ENTITY/gi,
        severity: 'high',
        action: 'block',
        category: 'xxe'
      }
    ];
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('waf_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.error('Failed to load WAF configuration:', error);
    }
  }

  public async updateConfiguration(newConfig: Partial<WAFConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    try {
      await AsyncStorage.setItem('waf_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save WAF configuration:', error);
    }
  }

  public async analyzeRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: any,
    clientIP: string
  ): Promise<{ allowed: boolean; reason?: string; sanitizedBody?: any; cspHeaders?: Record<string, string> }> {
    if (!this.config.enabled) {
      return { allowed: true };
    }

    const requestId = await CryptoService.generateSecureId();
    const route = this.extractRouteFromURL(url);
    
    try {
      // Check IP whitelist/blacklist
      if (this.config.ipBlacklist.includes(clientIP) || this.blockedIPs.has(clientIP)) {
        await this.logSecurityEvent({
          timestamp: Date.now(),
          requestId,
          clientIP,
          userAgent: headers['user-agent'] || '',
          method,
          url,
          headers,
          body,
          ruleTriggered: 'ip-blacklist',
          severity: 'high',
          action: 'block',
          blocked: true,
          route
        });
        return { allowed: false, reason: 'IP blocked' };
      }

      if (this.config.ipWhitelist.length > 0 && !this.config.ipWhitelist.includes(clientIP)) {
        await this.logSecurityEvent({
          timestamp: Date.now(),
          requestId,
          clientIP,
          userAgent: headers['user-agent'] || '',
          method,
          url,
          headers,
          body,
          ruleTriggered: 'ip-whitelist',
          severity: 'medium',
          action: 'block',
          blocked: true,
          route
        });
        return { allowed: false, reason: 'IP not whitelisted' };
      }

      // Rate limiting check
      if (this.config.rateLimiting.enabled) {
        const rateLimitResult = this.checkRateLimit(clientIP);
        if (!rateLimitResult.allowed) {
          await this.logSecurityEvent({
            timestamp: Date.now(),
            requestId,
            clientIP,
            userAgent: headers['user-agent'] || '',
            method,
            url,
            headers,
            body,
            ruleTriggered: 'rate-limit',
            severity: 'medium',
            action: 'block',
            blocked: true,
            route
          });
          return { allowed: false, reason: 'Rate limit exceeded' };
        }
      }

      // Request size check
      const requestSize = JSON.stringify({ headers, body }).length;
      if (requestSize > this.config.maxRequestSize) {
        await this.logSecurityEvent({
          timestamp: Date.now(),
          requestId,
          clientIP,
          userAgent: headers['user-agent'] || '',
          method,
          url,
          headers,
          body,
          ruleTriggered: 'request-size',
          severity: 'medium',
          action: 'block',
          blocked: true,
          route
        });
        return { allowed: false, reason: 'Request too large' };
      }

      // Analyze against WAF rules
      const analysisResult = await this.analyzeAgainstRules(
        requestId,
        clientIP,
        method,
        url,
        headers,
        body,
        route
      );

      // Generate dynamic CSP headers if enabled
      let cspHeaders: Record<string, string> = {};
      if (this.config.dynamicCSP.enabled && route) {
        cspHeaders = await this.generateDynamicCSPHeaders(
          route,
          headers['user-agent'] || '',
          clientIP,
          headers['x-session-id'],
          headers['x-user-id'],
          headers['x-device-id']
        );
      }

      return { 
        ...analysisResult, 
        cspHeaders 
      };

    } catch (error) {
      console.error('WAF analysis error:', error);
      return { allowed: !this.config.blockMode };
    }
  }

  // Extract route from URL
  private extractRouteFromURL(url: string): string {
    try {
      const urlObj = new URL(url);
      let pathname = urlObj.pathname;
      
      // Normalize pathname
      if (!pathname.startsWith('/')) {
        pathname = '/' + pathname;
      }
      
      // Remove trailing slash except for root
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      
      return pathname;
    } catch (error) {
      // If URL parsing fails, try to extract path from string
      const pathMatch = url.match(/^(?:https?:\/\/[^\/]+)?(\/.*)$/);
      return pathMatch ? pathMatch[1] : '/';
    }
  }

  // Generate dynamic CSP headers for the route
  private async generateDynamicCSPHeaders(
    route: string,
    userAgent: string,
    clientIP: string,
    sessionId?: string,
    userId?: string,
    deviceId?: string
  ): Promise<Record<string, string>> {
    try {
      const cspContext: CSPContext = {
        route,
        userAgent,
        clientIP,
        sessionId,
        userId,
        deviceId,
        timestamp: Date.now()
      };

      return await this.cspMiddleware.generateCSPHeaders(cspContext);
    } catch (error) {
      console.error('Dynamic CSP generation failed:', error);
      
      // Return basic CSP as fallback
      return {
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
      };
    }
  }

  private async analyzeAgainstRules(
    requestId: string,
    clientIP: string,
    method: string,
    url: string,
    headers: Record<string, string>,
    body: any,
    route?: string
  ): Promise<{ allowed: boolean; reason?: string; sanitizedBody?: any }> {
    const requestData = {
      url,
      headers: JSON.stringify(headers),
      body: typeof body === 'string' ? body : JSON.stringify(body)
    };

    let sanitizedBody = body;
    let blocked = false;
    let blockReason = '';

    for (const rule of this.rules) {
      const matches = this.testRule(rule, requestData);
      
      if (matches.length > 0) {
        await this.logSecurityEvent({
          timestamp: Date.now(),
          requestId,
          clientIP,
          userAgent: headers['user-agent'] || '',
          method,
          url,
          headers,
          body,
          ruleTriggered: rule.id,
          severity: rule.severity,
          action: rule.action,
          blocked: rule.action === 'block',
          route
        });

        if (rule.action === 'block') {
          blocked = true;
          blockReason = `WAF Rule ${rule.id}: ${rule.name}`;
          
          // Auto-block IP for critical violations
          if (rule.severity === 'critical') {
            this.blockedIPs.add(clientIP);
            setTimeout(() => {
              this.blockedIPs.delete(clientIP);
            }, 24 * 60 * 60 * 1000); // 24 hours
          }
          
          break;
        } else if (rule.action === 'sanitize') {
          sanitizedBody = this.sanitizeContent(sanitizedBody, rule.pattern);
        }
      }
    }

    if (blocked && this.config.blockMode) {
      return { allowed: false, reason: blockReason };
    }

    return { allowed: true, sanitizedBody };
  }

  private testRule(rule: WAFRule, requestData: any): RegExpMatchArray[] {
    const matches: RegExpMatchArray[] = [];
    
    Object.values(requestData).forEach(value => {
      if (typeof value === 'string') {
        const match = value.match(rule.pattern);
        if (match) {
          matches.push(match);
        }
      }
    });

    return matches;
  }

  private sanitizeContent(content: any, pattern: RegExp): any {
    if (typeof content === 'string') {
      return content.replace(pattern, '[SANITIZED]');
    }
    
    if (typeof content === 'object' && content !== null) {
      const sanitized = { ...content };
      Object.keys(sanitized).forEach(key => {
        sanitized[key] = this.sanitizeContent(sanitized[key], pattern);
      });
      return sanitized;
    }

    return content;
  }

  private checkRateLimit(clientIP: string): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    const key = clientIP;
    const limit = this.config.rateLimiting;
    
    const current = this.requestCounts.get(key);
    
    if (!current || now > current.resetTime) {
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + limit.windowMs
      });
      return { allowed: true };
    }
    
    if (current.count >= limit.maxRequests) {
      return { allowed: false, resetTime: current.resetTime };
    }
    
    current.count++;
    return { allowed: true };
  }

  private async logSecurityEvent(event: WAFLog): Promise<void> {
    try {
      // Store security logs securely
      const logs = await this.getSecurityLogs();
      logs.push(event);
      
      // Keep only last 1000 logs
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }
      
      await AsyncStorage.setItem('waf_security_logs', JSON.stringify(logs));
      
      // Alert security team for critical events
      if (event.severity === 'critical' && event.blocked) {
        await this.alertSecurityTeam(event);
      }
      
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  private async alertSecurityTeam(event: WAFLog): Promise<void> {
    // In production, this would send alerts to security team
    console.warn('🚨 CRITICAL SECURITY EVENT:', {
      rule: event.ruleTriggered,
      ip: event.clientIP,
      timestamp: new Date(event.timestamp).toISOString(),
      url: event.url,
      route: event.route
    });
  }

  public async getSecurityLogs(): Promise<WAFLog[]> {
    try {
      const logs = await AsyncStorage.getItem('waf_security_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Failed to get security logs:', error);
      return [];
    }
  }

  public getSecurityHeaders(route?: string, cspHeaders?: Record<string, string>): SecurityHeaders {
    const headers = { ...this.securityHeaders };
    
    // Add dynamic CSP headers if provided
    if (cspHeaders) {
      Object.assign(headers, cspHeaders);
    }
    
    return headers;
  }

  public async clearSecurityLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem('waf_security_logs');
    } catch (error) {
      console.error('Failed to clear security logs:', error);
    }
  }

  public async addCustomRule(rule: WAFRule): Promise<void> {
    this.rules.push(rule);
    try {
      await AsyncStorage.setItem('waf_custom_rules', JSON.stringify(this.rules));
    } catch (error) {
      console.error('Failed to save custom rule:', error);
    }
  }

  public getConfiguration(): WAFConfig {
    return { ...this.config };
  }

  public getRules(): WAFRule[] {
    return [...this.rules];
  }

  public async blockIP(ip: string, duration: number = 24 * 60 * 60 * 1000): Promise<void> {
    this.blockedIPs.add(ip);
    setTimeout(() => {
      this.blockedIPs.delete(ip);
    }, duration);
  }

  public unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
  }

  public getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }

  // Handle CSP violation reports
  public async handleCSPViolation(report: any, context: any): Promise<void> {
    try {
      const cspContext: CSPContext = {
        route: context.route || '/',
        userAgent: context.userAgent || '',
        clientIP: context.clientIP || '',
        sessionId: context.sessionId,
        userId: context.userId,
        deviceId: context.deviceId,
        timestamp: Date.now()
      };

      await this.cspMiddleware.handleCSPViolation(report, cspContext);

      // Log CSP violation in WAF logs
      await this.logSecurityEvent({
        timestamp: Date.now(),
        requestId: await CryptoService.generateSecureId(),
        clientIP: context.clientIP || '',
        userAgent: context.userAgent || '',
        method: 'CSP',
        url: report['document-uri'] || '',
        headers: {},
        body: report,
        ruleTriggered: 'csp-violation',
        severity: 'high',
        action: 'log',
        blocked: false,
        route: context.route,
        cspViolation: true
      });

    } catch (error) {
      console.error('CSP violation handling failed:', error);
    }
  }

  // Get CSP middleware for external access
  public getCSPMiddleware(): CSPMiddleware {
    return this.cspMiddleware;
  }

  // Get WAF status with CSP information
  public getWAFStatus(): any {
    const cspStatus = this.cspMiddleware.getCSPStatus();
    
    return {
      enabled: this.config.enabled,
      blockMode: this.config.blockMode,
      rulesCount: this.rules.length,
      blockedIPs: this.blockedIPs.size,
      rateLimitingEnabled: this.config.rateLimiting.enabled,
      dynamicCSP: {
        enabled: this.config.dynamicCSP.enabled,
        strictMode: this.config.dynamicCSP.strictMode,
        reportViolations: this.config.dynamicCSP.reportViolations,
        ...cspStatus
      },
      implementationLevel: 'ENHANCED_WITH_DYNAMIC_CSP'
    };
  }
}

export { WAFService, type WAFRule, type WAFConfig, type WAFLog, type SecurityHeaders };