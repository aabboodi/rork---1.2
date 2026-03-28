import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APISecurityMiddleware, type APIRequest, type SecurityContext } from './APISecurityMiddleware';
import { CryptoService } from './CryptoService';
import { SecurityManager } from './SecurityManager';

interface NetworkConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCertificatePinning: boolean;
  allowedCertificates: string[];
  enableRequestSigning: boolean;
  enableResponseValidation: boolean;
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
  skipSecurity?: boolean;
}

interface NetworkResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  success: boolean;
  error?: string;
}

interface SecurityMetrics {
  totalRequests: number;
  blockedRequests: number;
  failedValidations: number;
  certificateErrors: number;
  lastSecurityCheck: number;
}

class NetworkSecurityService {
  private static instance: NetworkSecurityService;
  private config: NetworkConfig;
  private apiMiddleware: APISecurityMiddleware;
  private metrics: SecurityMetrics;
  private sessionId: string | null = null;
  private deviceId: string | null = null;

  private constructor() {
    this.config = {
      baseURL: 'https://toolkit.rork.com',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableCertificatePinning: true,
      allowedCertificates: [
        // Production certificate fingerprints would go here
        'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      ],
      enableRequestSigning: true,
      enableResponseValidation: true,
    };

    this.apiMiddleware = APISecurityMiddleware.getInstance();
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      failedValidations: 0,
      certificateErrors: 0,
      lastSecurityCheck: Date.now(),
    };

    this.initializeService();
  }

  public static getInstance(): NetworkSecurityService {
    if (!NetworkSecurityService.instance) {
      NetworkSecurityService.instance = new NetworkSecurityService();
    }
    return NetworkSecurityService.instance;
  }

  private async initializeService(): Promise<void> {
    try {
      // Load saved configuration
      const savedConfig = await AsyncStorage.getItem('network_security_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Load metrics
      const savedMetrics = await AsyncStorage.getItem('network_security_metrics');
      if (savedMetrics) {
        this.metrics = { ...this.metrics, ...JSON.parse(savedMetrics) };
      }

      // Initialize device ID
      this.deviceId = await this.getOrCreateDeviceId();
      
    } catch (error) {
      console.error('Failed to initialize NetworkSecurityService:', error);
    }
  }

  private async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem('secure_device_id');
      if (!deviceId) {
        deviceId = await CryptoService.generateSecureId();
        await AsyncStorage.setItem('secure_device_id', deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Failed to get/create device ID:', error);
      return 'unknown-device';
    }
  }

  public async setSessionId(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
  }

  public async makeSecureRequest<T = any>(options: RequestOptions): Promise<NetworkResponse<T>> {
    this.metrics.totalRequests++;
    
    try {
      // Create security context
      const context: SecurityContext = {
        requestId: await CryptoService.generateSecureId(),
        clientIP: await this.getClientIP(),
        userAgent: await this.getUserAgent(),
        sessionId: this.sessionId || undefined,
        userId: await this.getCurrentUserId(),
        deviceId: this.deviceId || undefined,
      };

      // Create secure request
      const secureRequest = await this.createSecureRequest(options, context);

      // Process through security middleware
      if (!options.skipSecurity) {
        const securityResult = await this.apiMiddleware.processRequest(secureRequest, context);
        
        if (!securityResult.allowed) {
          this.metrics.blockedRequests++;
          await this.saveMetrics();
          
          return {
            data: null as T,
            status: 403,
            headers: {},
            success: false,
            error: securityResult.reason || 'Request blocked by security middleware'
          };
        }

        if (securityResult.modifiedRequest) {
          Object.assign(secureRequest, securityResult.modifiedRequest);
        }
      }

      // Make the actual network request
      const response = await this.executeRequest<T>(secureRequest, context);

      // Validate response if enabled
      if (this.config.enableResponseValidation && !options.skipSecurity) {
        const isValid = await this.apiMiddleware.validateResponseIntegrity(
          {
            status: response.status,
            headers: response.headers,
            body: response.data,
            timestamp: Date.now()
          },
          context
        );

        if (!isValid) {
          this.metrics.failedValidations++;
          await this.saveMetrics();
          
          return {
            data: null as T,
            status: 500,
            headers: {},
            success: false,
            error: 'Response integrity validation failed'
          };
        }
      }

      await this.saveMetrics();
      return response;

    } catch (error) {
      console.error('Secure request failed:', error);
      
      return {
        data: null as T,
        status: 500,
        headers: {},
        success: false,
        error: error instanceof Error ? error.message : 'Network request failed'
      };
    }
  }

  private async createSecureRequest(
    options: RequestOptions,
    context: SecurityContext
  ): Promise<APIRequest> {
    const url = `${this.config.baseURL}${options.endpoint}`;
    
    return await this.apiMiddleware.createSecureRequest(
      options.method,
      url,
      options.data,
      context.sessionId,
      context.deviceId
    );
  }

  private async executeRequest<T>(
    request: APIRequest,
    context: SecurityContext
  ): Promise<NetworkResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: request.method,
        headers: request.headers,
        signal: controller.signal,
      };

      if (request.body && request.method !== 'GET') {
        fetchOptions.body = typeof request.body === 'string' 
          ? request.body 
          : JSON.stringify(request.body);
      }

      // Certificate pinning check (web-compatible approach)
      if (this.config.enableCertificatePinning && Platform.OS === 'web') {
        await this.validateCertificate(request.url);
      }

      const response = await fetch(request.url, fetchOptions);
      clearTimeout(timeoutId);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text() as unknown as T;
      }

      return {
        data: responseData,
        status: response.status,
        headers: responseHeaders,
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  private async validateCertificate(url: string): Promise<void> {
    // In a real implementation, this would validate SSL certificate pinning
    // For web, we rely on browser's built-in certificate validation
    // For mobile, you would use libraries like react-native-ssl-pinning
    
    if (Platform.OS !== 'web') {
      // Mobile certificate pinning would be implemented here
      console.log('Certificate pinning validation for:', url);
    }
  }

  private async getClientIP(): Promise<string> {
    try {
      // In production, you might want to get the actual client IP
      // For now, return a placeholder
      return '127.0.0.1';
    } catch (error) {
      return 'unknown';
    }
  }

  private async getUserAgent(): Promise<string> {
    if (Platform.OS === 'web') {
      return navigator.userAgent;
    }
    
    return `ReactNative/${Platform.OS}/${Platform.Version}`;
  }

  private async getCurrentUserId(): Promise<string | undefined> {
    try {
      const userId = await AsyncStorage.getItem('current_user_id');
      return userId || undefined;
    } catch (error) {
      return undefined;
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      this.metrics.lastSecurityCheck = Date.now();
      await AsyncStorage.setItem('network_security_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Failed to save security metrics:', error);
    }
  }

  public async updateConfiguration(newConfig: Partial<NetworkConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    try {
      await AsyncStorage.setItem('network_security_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save network configuration:', error);
    }
  }

  public getConfiguration(): NetworkConfig {
    return { ...this.config };
  }

  public getSecurityMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  public async clearSecurityData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'network_security_config',
        'network_security_metrics',
        'secure_device_id'
      ]);
      
      await this.apiMiddleware.clearSecurityCache();
      
      // Reset metrics
      this.metrics = {
        totalRequests: 0,
        blockedRequests: 0,
        failedValidations: 0,
        certificateErrors: 0,
        lastSecurityCheck: Date.now(),
      };
      
    } catch (error) {
      console.error('Failed to clear security data:', error);
    }
  }

  // Convenience methods for common HTTP operations
  public async get<T = any>(endpoint: string, options?: Partial<RequestOptions>): Promise<NetworkResponse<T>> {
    return this.makeSecureRequest<T>({
      method: 'GET',
      endpoint,
      ...options
    });
  }

  public async post<T = any>(endpoint: string, data?: any, options?: Partial<RequestOptions>): Promise<NetworkResponse<T>> {
    return this.makeSecureRequest<T>({
      method: 'POST',
      endpoint,
      data,
      ...options
    });
  }

  public async put<T = any>(endpoint: string, data?: any, options?: Partial<RequestOptions>): Promise<NetworkResponse<T>> {
    return this.makeSecureRequest<T>({
      method: 'PUT',
      endpoint,
      data,
      ...options
    });
  }

  public async delete<T = any>(endpoint: string, options?: Partial<RequestOptions>): Promise<NetworkResponse<T>> {
    return this.makeSecureRequest<T>({
      method: 'DELETE',
      endpoint,
      ...options
    });
  }

  public async patch<T = any>(endpoint: string, data?: any, options?: Partial<RequestOptions>): Promise<NetworkResponse<T>> {
    return this.makeSecureRequest<T>({
      method: 'PATCH',
      endpoint,
      data,
      ...options
    });
  }
}

export { 
  NetworkSecurityService, 
  type NetworkConfig, 
  type RequestOptions, 
  type NetworkResponse, 
  type SecurityMetrics 
};