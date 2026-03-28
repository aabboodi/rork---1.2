import { Platform } from 'react-native';
import { WAFService } from './WAFService';
import { CryptoService } from './CryptoService';
// Removed incorrect named import to avoid undefined getInstance errors

import { CSPMiddleware, type CSPContext } from './CSPMiddleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface APIRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
  hmacSignature?: string;
  jwtToken?: string;
  route?: string; // Added for CSP routing
}

interface APIResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

interface SecurityContext {
  requestId: string;
  clientIP: string;
  userAgent: string;
  sessionId?: string;
  userId?: string;
  deviceId?: string;
  route?: string; // Added for CSP routing
}

interface CSRFToken {
  token: string;
  timestamp: number;
  sessionId: string;
  expiresAt: number;
}

class APISecurityMiddleware {
  private static instance: APISecurityMiddleware;
  private wafService: WAFService;
  private cspMiddleware: CSPMiddleware;
  private csrfTokens: Map<string, CSRFToken> = new Map();
  private requestSignatures: Map<string, string> = new Map();
  private nonceStore: Set<string> = new Set();
  private hmacSecrets: Map<string, string> = new Map();
  private jwtValidationCache: Map<string, { valid: boolean; expiry: number }> = new Map();

  private constructor() {
    this.wafService = WAFService.getInstance();
    this.cspMiddleware = CSPMiddleware.getInstance();
    this.initializeCSRFProtection();
    this.initializeNonceCleanup();
    this.initializeHMACValidation();
    this.initializeJWTValidationCache();
  }

  public static getInstance(): APISecurityMiddleware {
    if (!APISecurityMiddleware.instance) {
      APISecurityMiddleware.instance = new APISecurityMiddleware();
    }
    return APISecurityMiddleware.instance;
  }

  private initializeCSRFProtection(): void {
    // Clean expired CSRF tokens every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, token] of this.csrfTokens.entries()) {
        if (now > token.expiresAt) {
          this.csrfTokens.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  private initializeNonceCleanup(): void {
    // Clean old nonces every 10 minutes
    setInterval(() => {
      this.nonceStore.clear();
    }, 10 * 60 * 1000);
  }

  public async processRequest(
    request: APIRequest,
    context: SecurityContext
  ): Promise<{ allowed: boolean; modifiedRequest?: APIRequest; reason?: string }> {
    try {
      // Extract route from URL for CSP processing
      const route = this.extractRouteFromURL(request.url);
      request.route = route;
      context.route = route;

      // Step 1: WAF Analysis
      const wafResult = await this.wafService.analyzeRequest(
        request.method,
        request.url,
        request.headers,
        request.body,
        context.clientIP
      );

      if (!wafResult.allowed) {
        return { allowed: false, reason: wafResult.reason };
      }

      // Step 2: CSRF Protection
      if (this.requiresCSRFProtection(request.method)) {
        const csrfResult = await this.validateCSRFToken(request, context);
        if (!csrfResult.valid) {
          return { allowed: false, reason: 'Invalid CSRF token' };
        }
      }

      // Step 3: HMAC Signature Validation (CRITICAL)
      const hmacResult = await this.validateHMACSignature(request, context);
      if (!hmacResult.valid) {
        return { allowed: false, reason: 'Invalid HMAC signature' };
      }

      // Step 3.5: JWT Token Validation (CRITICAL)
      const jwtResult = await this.validateJWTToken(request, context);
      if (!jwtResult.valid) {
        return { allowed: false, reason: 'Invalid JWT token' };
      }

      // Step 4: Request Signature Validation
      const signatureResult = await this.validateRequestSignature(request, context);
      if (!signatureResult.valid) {
        return { allowed: false, reason: 'Invalid request signature' };
      }

      // Step 5: Replay Attack Protection
      const replayResult = await this.checkReplayAttack(request, context);
      if (!replayResult.valid) {
        return { allowed: false, reason: 'Potential replay attack detected' };
      }

      // Step 6: Content Type Validation
      const contentTypeResult = this.validateContentType(request);
      if (!contentTypeResult.valid) {
        return { allowed: false, reason: 'Invalid content type' };
      }

      // Step 7: Apply Security Headers (including dynamic CSP)
      const modifiedRequest = await this.applySecurityHeaders(request, context);

      // Step 8: Sanitize Request Body if needed
      if (wafResult.sanitizedBody) {
        modifiedRequest.body = wafResult.sanitizedBody;
      }

      return { allowed: true, modifiedRequest };

    } catch (error) {
      console.error('API Security Middleware error:', error);
      return { allowed: false, reason: 'Security validation failed' };
    }
  }

  public async processResponse(
    response: APIResponse,
    request: APIRequest,
    context: SecurityContext
  ): Promise<APIResponse> {
    try {
      // Generate dynamic CSP headers for the route
      const cspHeaders = await this.generateDynamicCSPHeaders(context);
      
      // Apply security headers to response
      const securityHeaders = this.wafService.getSecurityHeaders();
      
      const modifiedResponse: APIResponse = {
        ...response,
        headers: {
          ...response.headers,
          ...securityHeaders,
          ...cspHeaders, // Dynamic CSP headers
          'X-Request-ID': context.requestId,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
        }
      };

      // Remove sensitive headers
      delete modifiedResponse.headers['Server'];
      delete modifiedResponse.headers['X-Powered-By'];

      // Add response signature for integrity
      if (modifiedResponse.body) {
        const signature = await this.signResponse(modifiedResponse.body, context);
        modifiedResponse.headers['X-Response-Signature'] = signature;
      }

      return modifiedResponse;

    } catch (error) {
      console.error('Response processing error:', error);
      return response;
    }
  }

  // Extract route from URL for CSP processing
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

  // Generate dynamic CSP headers based on route
  private async generateDynamicCSPHeaders(context: SecurityContext): Promise<Record<string, string>> {
    try {
      if (!context.route) {
        return {};
      }

      // Create CSP context
      const cspContext: CSPContext = {
        route: context.route,
        userAgent: context.userAgent,
        clientIP: context.clientIP,
        sessionId: context.sessionId,
        userId: context.userId,
        deviceId: context.deviceId,
        timestamp: Date.now()
      };

      // Generate CSP headers using CSP middleware
      const cspHeaders = await this.cspMiddleware.generateCSPHeaders(cspContext);
      
      return cspHeaders;
    } catch (error) {
      console.error('Dynamic CSP header generation failed:', error);
      
      // Return emergency CSP headers
      return {
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
      };
    }
  }

  private requiresCSRFProtection(method: string): boolean {
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
  }

  private async validateCSRFToken(
    request: APIRequest,
    context: SecurityContext
  ): Promise<{ valid: boolean; reason?: string }> {
    const token = request.headers['X-CSRF-Token'] || request.headers['csrf-token'];
    
    if (!token) {
      return { valid: false, reason: 'Missing CSRF token' };
    }

    const storedToken = this.csrfTokens.get(context.sessionId || '');
    
    if (!storedToken) {
      return { valid: false, reason: 'CSRF token not found' };
    }

    if (storedToken.token !== token) {
      return { valid: false, reason: 'Invalid CSRF token' };
    }

    if (Date.now() > storedToken.expiresAt) {
      this.csrfTokens.delete(context.sessionId || '');
      return { valid: false, reason: 'CSRF token expired' };
    }

    return { valid: true };
  }

  private async validateRequestSignature(
    request: APIRequest,
    context: SecurityContext
  ): Promise<{ valid: boolean; reason?: string }> {
    const signature = request.headers['X-Request-Signature'];
    
    if (!signature) {
      // For non-critical endpoints, signature might be optional
      if (this.isPublicEndpoint(request.url)) {
        return { valid: true };
      }
      return { valid: false, reason: 'Missing request signature' };
    }

    try {
      const requestData = {
        method: request.method,
        url: request.url,
        body: request.body,
        timestamp: request.timestamp
      };

      const expectedSignature = await CryptoService.signData(
        JSON.stringify(requestData),
        context.deviceId || 'unknown'
      );

      if (signature !== expectedSignature) {
        return { valid: false, reason: 'Invalid request signature' };
      }

      return { valid: true };

    } catch (error) {
      console.error('Signature validation error:', error);
      return { valid: false, reason: 'Signature validation failed' };
    }
  }

  private async checkReplayAttack(
    request: APIRequest,
    context: SecurityContext
  ): Promise<{ valid: boolean; reason?: string }> {
    const nonce = request.headers['X-Request-Nonce'];
    
    if (!nonce) {
      return { valid: false, reason: 'Missing request nonce' };
    }

    if (this.nonceStore.has(nonce)) {
      return { valid: false, reason: 'Duplicate nonce detected' };
    }

    // Check timestamp to prevent old requests
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - request.timestamp > maxAge) {
      return { valid: false, reason: 'Request too old' };
    }

    this.nonceStore.add(nonce);
    return { valid: true };
  }

  private validateContentType(request: APIRequest): { valid: boolean; reason?: string } {
    const contentType = request.headers['Content-Type'] || request.headers['content-type'];
    
    if (!contentType && request.body) {
      return { valid: false, reason: 'Missing Content-Type header' };
    }

    const allowedTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain'
    ];

    if (contentType && !allowedTypes.some(type => contentType.includes(type))) {
      return { valid: false, reason: 'Invalid Content-Type' };
    }

    return { valid: true };
  }

  private async applySecurityHeaders(request: APIRequest, context: SecurityContext): Promise<APIRequest> {
    // Generate dynamic CSP nonce if needed
    const cspNonce = await this.cspMiddleware.getNonceForContext({
      route: context.route || '/',
      userAgent: context.userAgent,
      clientIP: context.clientIP,
      sessionId: context.sessionId,
      userId: context.userId,
      deviceId: context.deviceId,
      timestamp: Date.now()
    });

    const securityHeaders = {
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    // Add CSP nonce to request headers if available
    if (cspNonce) {
      securityHeaders['X-CSP-Nonce'] = cspNonce;
    }

    return {
      ...request,
      headers: {
        ...request.headers,
        ...securityHeaders
      }
    };
  }

  private async signResponse(body: any, context: SecurityContext): Promise<string> {
    try {
      const responseData = {
        body,
        timestamp: Date.now(),
        requestId: context.requestId
      };

      return await CryptoService.signData(
        JSON.stringify(responseData),
        context.deviceId || 'server'
      );
    } catch (error) {
      console.error('Response signing error:', error);
      return '';
    }
  }

  private isPublicEndpoint(url: string): boolean {
    const publicEndpoints = [
      '/api/health',
      '/api/version',
      '/api/auth/login',
      '/api/auth/register'
    ];

    return publicEndpoints.some(endpoint => url.includes(endpoint));
  }

  public async generateCSRFToken(sessionId: string): Promise<string> {
    const token = await CryptoService.generateSecureId();
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour

    this.csrfTokens.set(sessionId, {
      token,
      timestamp: Date.now(),
      sessionId,
      expiresAt
    });

    return token;
  }

  public async generateRequestNonce(): Promise<string> {
    return await CryptoService.generateSecureId();
  }

  public async createSecureRequest(
    method: string,
    url: string,
    body?: any,
    sessionId?: string,
    deviceId?: string
  ): Promise<APIRequest> {
    const timestamp = Date.now();
    const nonce = await this.generateRequestNonce();
    const route = this.extractRouteFromURL(url);
    
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-Nonce': nonce,
      'X-Timestamp': timestamp.toString()
    };

    // Add CSRF token for state-changing requests
    if (this.requiresCSRFProtection(method) && sessionId) {
      const csrfToken = await this.generateCSRFToken(sessionId);
      headers['X-CSRF-Token'] = csrfToken;
    }

    const request: APIRequest = {
      method,
      url,
      headers,
      body,
      timestamp,
      route
    };

    // Sign the request
    if (deviceId) {
      const signature = await CryptoService.signData(
        JSON.stringify({
          method,
          url,
          body,
          timestamp
        }),
        deviceId
      );
      headers['X-Request-Signature'] = signature;
    }

    return request;
  }

  public async validateResponseIntegrity(
    response: APIResponse,
    context: SecurityContext
  ): Promise<boolean> {
    const signature = response.headers['X-Response-Signature'];
    
    if (!signature) {
      return false;
    }

    try {
      const responseData = {
        body: response.body,
        timestamp: response.timestamp,
        requestId: context.requestId
      };

      const expectedSignature = await CryptoService.signData(
        JSON.stringify(responseData),
        'server'
      );

      return signature === expectedSignature;
    } catch (error) {
      console.error('Response integrity validation error:', error);
      return false;
    }
  }

  public getCSRFToken(sessionId: string): string | null {
    const token = this.csrfTokens.get(sessionId);
    return token && Date.now() < token.expiresAt ? token.token : null;
  }

  public revokeCSRFToken(sessionId: string): void {
    this.csrfTokens.delete(sessionId);
  }

  // CRITICAL: Initialize HMAC validation system
  private initializeHMACValidation(): void {
    // Generate HMAC secrets for different security levels
    this.generateHMACSecrets();
    
    // Rotate HMAC secrets every hour
    setInterval(() => {
      this.rotateHMACSecrets();
    }, 60 * 60 * 1000);
  }

  // CRITICAL: Initialize JWT validation cache
  private initializeJWTValidationCache(): void {
    // Clean expired JWT validation cache every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, cache] of this.jwtValidationCache.entries()) {
        if (now > cache.expiry) {
          this.jwtValidationCache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  // CRITICAL: Generate HMAC secrets for request signing
  private generateHMACSecrets(): void {
    const securityLevels = ['basic', 'enhanced', 'maximum'];
    
    for (const level of securityLevels) {
      const secret = CryptoService.generateSecureId();
      this.hmacSecrets.set(level, secret);
    }
  }

  // CRITICAL: Rotate HMAC secrets for enhanced security
  private rotateHMACSecrets(): void {
    console.log('Rotating HMAC secrets for enhanced security');
    this.generateHMACSecrets();
  }

  // CRITICAL: Validate HMAC signature for request integrity
  private async validateHMACSignature(
    request: APIRequest,
    context: SecurityContext
  ): Promise<{ valid: boolean; reason?: string }> {
    const hmacSignature = request.hmacSignature || request.headers['X-HMAC-Signature'];
    
    if (!hmacSignature) {
      if (this.isPublicEndpoint(request.url)) {
        return { valid: true };
      }
      return { valid: false, reason: 'Missing HMAC signature' };
    }

    try {
      // Determine security level based on endpoint
      const securityLevel = this.determineSecurityLevel(request.url);
      const secret = this.hmacSecrets.get(securityLevel);
      
      if (!secret) {
        return { valid: false, reason: 'HMAC secret not found' };
      }

      // Create HMAC payload
      const hmacPayload = {
        method: request.method,
        url: request.url,
        timestamp: request.timestamp,
        body: request.body ? JSON.stringify(request.body) : '',
        deviceId: context.deviceId || '',
        sessionId: context.sessionId || ''
      };

      const expectedSignature = await CryptoService.generateHMAC(
        JSON.stringify(hmacPayload),
        secret
      );

      if (hmacSignature !== expectedSignature) {
        return { valid: false, reason: 'HMAC signature mismatch' };
      }

      return { valid: true };
    } catch (error) {
      console.error('HMAC validation error:', error);
      return { valid: false, reason: 'HMAC validation failed' };
    }
  }

  // CRITICAL: Validate JWT token in every request
  private async validateJWTToken(
    request: APIRequest,
    context: SecurityContext
  ): Promise<{ valid: boolean; reason?: string }> {
    const jwtToken = request.jwtToken || request.headers['Authorization']?.replace('Bearer ', '');
    
    if (!jwtToken) {
      if (this.isPublicEndpoint(request.url)) {
        return { valid: true };
      }
      return { valid: false, reason: 'Missing JWT token' };
    }

    try {
      // Check validation cache first
      const cacheKey = `jwt:${jwtToken.substring(0, 32)}`;
      const cached = this.jwtValidationCache.get(cacheKey);
      
      if (cached && Date.now() < cached.expiry) {
        return { valid: cached.valid, reason: cached.valid ? undefined : 'Cached JWT validation failed' };
      }

      // Import SessionManager for JWT validation
      const { default: SessionManager } = await import('./SessionManager');
      const sessionManager = SessionManager.getInstance();
      
      const validation = await sessionManager.validateToken(jwtToken);
      
      // Cache the result for 5 minutes
      this.jwtValidationCache.set(cacheKey, {
        valid: validation.valid,
        expiry: Date.now() + (5 * 60 * 1000)
      });
      
      if (!validation.valid) {
        return { valid: false, reason: validation.error || 'JWT validation failed' };
      }

      // Verify JWT payload matches context
      if (validation.payload) {
        if (context.userId && validation.payload.userId !== context.userId) {
          return { valid: false, reason: 'JWT user ID mismatch' };
        }
        
        if (context.deviceId && validation.payload.deviceId !== context.deviceId) {
          return { valid: false, reason: 'JWT device ID mismatch' };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('JWT validation error:', error);
      return { valid: false, reason: 'JWT validation failed' };
    }
  }

  // Determine security level for HMAC validation
  private determineSecurityLevel(url: string): string {
    if (url.includes('/wallet/') || url.includes('/transaction/')) {
      return 'maximum';
    } else if (url.includes('/auth/') || url.includes('/profile/')) {
      return 'enhanced';
    } else {
      return 'basic';
    }
  }

  // CRITICAL: Create secure request with HMAC and JWT
  public async createSecureRequestWithHMAC(
    method: string,
    url: string,
    body?: any,
    sessionId?: string,
    deviceId?: string,
    jwtToken?: string
  ): Promise<APIRequest> {
    const timestamp = Date.now();
    const nonce = await this.generateRequestNonce();
    const route = this.extractRouteFromURL(url);
    
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-Nonce': nonce,
      'X-Timestamp': timestamp.toString()
    };

    // Add JWT token
    if (jwtToken) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
    }

    // Add CSRF token for state-changing requests
    if (this.requiresCSRFProtection(method) && sessionId) {
      const csrfToken = await this.generateCSRFToken(sessionId);
      headers['X-CSRF-Token'] = csrfToken;
    }

    const request: APIRequest = {
      method,
      url,
      headers,
      body,
      timestamp,
      jwtToken,
      route
    };

    // Generate HMAC signature
    const securityLevel = this.determineSecurityLevel(url);
    const secret = this.hmacSecrets.get(securityLevel);
    
    if (secret) {
      const hmacPayload = {
        method,
        url,
        timestamp,
        body: body ? JSON.stringify(body) : '',
        deviceId: deviceId || '',
        sessionId: sessionId || ''
      };

      const hmacSignature = await CryptoService.generateHMAC(
        JSON.stringify(hmacPayload),
        secret
      );
      
      headers['X-HMAC-Signature'] = hmacSignature;
      request.hmacSignature = hmacSignature;
    }

    // Sign the request
    if (deviceId) {
      const signature = await CryptoService.signData(
        JSON.stringify({
          method,
          url,
          body,
          timestamp
        }),
        deviceId
      );
      headers['X-Request-Signature'] = signature;
    }

    return request;
  }

  // Get HMAC secret for external use (testing/debugging)
  public getHMACSecret(securityLevel: string): string | undefined {
    return this.hmacSecrets.get(securityLevel);
  }

  public async clearSecurityCache(): Promise<void> {
    this.csrfTokens.clear();
    this.nonceStore.clear();
    this.requestSignatures.clear();
    this.jwtValidationCache.clear();
    this.hmacSecrets.clear();
    this.generateHMACSecrets(); // Regenerate HMAC secrets
  }

  // Get CSP middleware instance for external access
  public getCSPMiddleware(): CSPMiddleware {
    return this.cspMiddleware;
  }

  // Handle CSP violation reports
  public async handleCSPViolation(report: any, context: SecurityContext): Promise<void> {
    if (context.route) {
      const cspContext: CSPContext = {
        route: context.route,
        userAgent: context.userAgent,
        clientIP: context.clientIP,
        sessionId: context.sessionId,
        userId: context.userId,
        deviceId: context.deviceId,
        timestamp: Date.now()
      };

      await this.cspMiddleware.handleCSPViolation(report, cspContext);
    }
  }
}

export { 
  APISecurityMiddleware, 
  type APIRequest, 
  type APIResponse, 
  type SecurityContext 
};