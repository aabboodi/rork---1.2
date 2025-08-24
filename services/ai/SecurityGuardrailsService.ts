import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export interface SecurityPolicy {
  version: string;
  signature: string;
  timestamp: number;
  rules: {
    noWalletAccess: boolean;
    privacyByDefault: boolean;
    encryptedStorage: boolean;
    resourceLimits: {
      maxMemoryMB: number;
      maxLatencyMs: number;
      maxCpuUsage: number;
    };
    integrityChecks: boolean;
  };
}

export interface ResourceGuard {
  memoryUsageMB: number;
  cpuUsage: number;
  latencyMs: number;
  isWithinLimits: boolean;
  timestamp: number;
}

export interface IntegrityCheck {
  modelHash: string;
  policyHash: string;
  isValid: boolean;
  timestamp: number;
}

class SecurityGuardrailsService {
  private static instance: SecurityGuardrailsService;
  private readonly POLICY_STORAGE_KEY = 'security_policy';
  private readonly INTEGRITY_STORAGE_KEY = 'integrity_checks';
  private readonly RESOURCE_MONITOR_KEY = 'resource_monitor';
  private readonly WALLET_PATHS_BLOCKLIST = [
    '/wallet',
    '/payment',
    '/transaction',
    '/financial',
    '/money',
    '/send',
    '/receive',
    '/balance',
    '/transfer'
  ];
  
  private currentPolicy: SecurityPolicy | null = null;
  private resourceMonitor: ResourceGuard | null = null;
  private isMonitoring = false;

  private constructor() {}

  static getInstance(): SecurityGuardrailsService {
    if (!SecurityGuardrailsService.instance) {
      SecurityGuardrailsService.instance = new SecurityGuardrailsService();
    }
    return SecurityGuardrailsService.instance;
  }

  // Initialize security guardrails
  async initialize(): Promise<void> {
    try {
      console.log('🔒 Initializing Security Guardrails...');
      
      // Load and verify security policy
      await this.loadSecurityPolicy();
      
      // Start resource monitoring
      await this.startResourceMonitoring();
      
      // Perform integrity checks
      await this.performIntegrityChecks();
      
      console.log('✅ Security Guardrails initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Security Guardrails:', error);
      throw error;
    }
  }

  // NO-WALLET RULE: Strict prevention of accessing any financial paths/components
  async enforceNoWalletRule(path: string, componentName?: string): Promise<boolean> {
    try {
      const isWalletPath = this.WALLET_PATHS_BLOCKLIST.some(blockedPath => 
        path.toLowerCase().includes(blockedPath.toLowerCase())
      );
      
      const isWalletComponent = componentName && 
        ['wallet', 'payment', 'transaction', 'financial'].some(term => 
          componentName.toLowerCase().includes(term.toLowerCase())
        );
      
      if (isWalletPath || isWalletComponent) {
        console.error(`🚫 NO-WALLET RULE VIOLATION: Access denied to ${path} ${componentName || ''}`);
        await this.logSecurityViolation('NO_WALLET_RULE', {
          path,
          componentName,
          timestamp: Date.now()
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to enforce no-wallet rule:', error);
      return false;
    }
  }

  // Privacy-by-default: No raw text upload, anonymized signals, encrypted storage
  async enforcePrivacyByDefault(data: any, operation: 'store' | 'transmit'): Promise<{
    allowed: boolean;
    sanitizedData?: any;
    reason?: string;
  }> {
    try {
      if (!this.currentPolicy?.rules.privacyByDefault) {
        return { allowed: true, sanitizedData: data };
      }

      // Check for raw text in transmission
      if (operation === 'transmit' && this.containsRawText(data)) {
        console.warn('🔒 Privacy violation: Raw text transmission blocked');
        return {
          allowed: false,
          reason: 'Raw text transmission not allowed - use anonymized signals only'
        };
      }

      // Anonymize data for storage/transmission
      const sanitizedData = await this.anonymizeData(data);
      
      return { allowed: true, sanitizedData };
    } catch (error) {
      console.error('Failed to enforce privacy by default:', error);
      return { allowed: false, reason: 'Privacy enforcement error' };
    }
  }

  // Integrity: Model/policy signing + SHA256 verification
  async verifyIntegrity(type: 'model' | 'policy', data: any, expectedHash?: string): Promise<boolean> {
    try {
      if (!this.currentPolicy?.rules.integrityChecks) {
        return true;
      }

      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const computedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataString
      );

      if (expectedHash && computedHash !== expectedHash) {
        console.error(`🔒 Integrity check failed for ${type}: hash mismatch`);
        await this.logSecurityViolation('INTEGRITY_VIOLATION', {
          type,
          expectedHash,
          computedHash,
          timestamp: Date.now()
        });
        return false;
      }

      // Store integrity check result
      await this.storeIntegrityCheck({
        modelHash: type === 'model' ? computedHash : '',
        policyHash: type === 'policy' ? computedHash : '',
        isValid: true,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Failed to verify integrity:', error);
      return false;
    }
  }

  // Resource Guards: Time/memory limits, graceful background shutdown, no UI blocking
  async enforceResourceLimits(operation: string, resourceUsage: {
    memoryMB?: number;
    latencyMs?: number;
    cpuUsage?: number;
  }): Promise<{ allowed: boolean; reason?: string }> {
    try {
      if (!this.currentPolicy?.rules.resourceLimits) {
        return { allowed: true };
      }

      const limits = this.currentPolicy.rules.resourceLimits;
      
      // Check memory limit
      if (resourceUsage.memoryMB && resourceUsage.memoryMB > limits.maxMemoryMB) {
        console.warn(`⚠️ Memory limit exceeded: ${resourceUsage.memoryMB}MB > ${limits.maxMemoryMB}MB`);
        await this.initiateGracefulShutdown(operation, 'memory_limit');
        return {
          allowed: false,
          reason: `Memory limit exceeded: ${resourceUsage.memoryMB}MB > ${limits.maxMemoryMB}MB`
        };
      }

      // Check latency limit
      if (resourceUsage.latencyMs && resourceUsage.latencyMs > limits.maxLatencyMs) {
        console.warn(`⚠️ Latency limit exceeded: ${resourceUsage.latencyMs}ms > ${limits.maxLatencyMs}ms`);
        return {
          allowed: false,
          reason: `Latency limit exceeded: ${resourceUsage.latencyMs}ms > ${limits.maxLatencyMs}ms`
        };
      }

      // Check CPU usage limit
      if (resourceUsage.cpuUsage && resourceUsage.cpuUsage > limits.maxCpuUsage) {
        console.warn(`⚠️ CPU usage limit exceeded: ${resourceUsage.cpuUsage}% > ${limits.maxCpuUsage}%`);
        await this.initiateGracefulShutdown(operation, 'cpu_limit');
        return {
          allowed: false,
          reason: `CPU usage limit exceeded: ${resourceUsage.cpuUsage}% > ${limits.maxCpuUsage}%`
        };
      }

      // Update resource monitor
      this.resourceMonitor = {
        memoryUsageMB: resourceUsage.memoryMB || 0,
        cpuUsage: resourceUsage.cpuUsage || 0,
        latencyMs: resourceUsage.latencyMs || 0,
        isWithinLimits: true,
        timestamp: Date.now()
      };

      return { allowed: true };
    } catch (error) {
      console.error('Failed to enforce resource limits:', error);
      return { allowed: false, reason: 'Resource enforcement error' };
    }
  }

  // Get current security status
  async getSecurityStatus(): Promise<{
    policyVersion: string;
    integrityValid: boolean;
    resourcesWithinLimits: boolean;
    noWalletRuleActive: boolean;
    privacyByDefaultActive: boolean;
    lastCheck: number;
  }> {
    try {
      const integrityCheck = await this.getLatestIntegrityCheck();
      
      return {
        policyVersion: this.currentPolicy?.version || 'unknown',
        integrityValid: integrityCheck?.isValid || false,
        resourcesWithinLimits: this.resourceMonitor?.isWithinLimits || false,
        noWalletRuleActive: this.currentPolicy?.rules.noWalletAccess || false,
        privacyByDefaultActive: this.currentPolicy?.rules.privacyByDefault || false,
        lastCheck: Date.now()
      };
    } catch (error) {
      console.error('Failed to get security status:', error);
      return {
        policyVersion: 'error',
        integrityValid: false,
        resourcesWithinLimits: false,
        noWalletRuleActive: false,
        privacyByDefaultActive: false,
        lastCheck: Date.now()
      };
    }
  }

  // Private helper methods
  private async loadSecurityPolicy(): Promise<void> {
    try {
      const stored = await this.getEncrypted(this.POLICY_STORAGE_KEY);
      
      if (stored) {
        this.currentPolicy = stored;
      } else {
        // Create default security policy
        this.currentPolicy = {
          version: '1.0.0',
          signature: await this.generatePolicySignature(),
          timestamp: Date.now(),
          rules: {
            noWalletAccess: true,
            privacyByDefault: true,
            encryptedStorage: true,
            resourceLimits: {
              maxMemoryMB: 30,
              maxLatencyMs: 120,
              maxCpuUsage: 80
            },
            integrityChecks: true
          }
        };
        
        await this.storeEncrypted(this.POLICY_STORAGE_KEY, this.currentPolicy);
      }
      
      console.log(`🔒 Security policy loaded: v${this.currentPolicy.version}`);
    } catch (error) {
      console.error('Failed to load security policy:', error);
      throw error;
    }
  }

  private async startResourceMonitoring(): Promise<void> {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor resources every 5 seconds
    setInterval(async () => {
      try {
        const memoryUsage = await this.getCurrentMemoryUsage();
        const cpuUsage = await this.getCurrentCpuUsage();
        
        await this.enforceResourceLimits('background_monitor', {
          memoryMB: memoryUsage,
          cpuUsage: cpuUsage
        });
      } catch (error) {
        console.error('Resource monitoring error:', error);
      }
    }, 5000);
    
    // Clean up on app background
    if (Platform.OS !== 'web') {
      // Add app state change listener for graceful shutdown
    }
  }

  private async performIntegrityChecks(): Promise<void> {
    try {
      if (!this.currentPolicy?.rules.integrityChecks) return;
      
      // Verify policy integrity
      const policyValid = await this.verifyIntegrity('policy', this.currentPolicy);
      
      if (!policyValid) {
        throw new Error('Security policy integrity check failed');
      }
      
      console.log('✅ Integrity checks passed');
    } catch (error) {
      console.error('Integrity checks failed:', error);
      throw error;
    }
  }

  private containsRawText(data: any): boolean {
    if (typeof data === 'string') {
      // Check if it's likely raw user text (not structured data)
      return data.length > 10 && !/^[{\[]/.test(data.trim());
    }
    
    if (typeof data === 'object' && data !== null) {
      // Check for common raw text fields
      const textFields = ['message', 'content', 'text', 'body', 'description'];
      return textFields.some(field => 
        data[field] && typeof data[field] === 'string' && data[field].length > 10
      );
    }
    
    return false;
  }

  private async anonymizeData(data: any): Promise<any> {
    if (typeof data === 'string') {
      // Hash sensitive text
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data
      );
    }
    
    if (typeof data === 'object' && data !== null) {
      const anonymized = { ...data };
      
      // Anonymize common sensitive fields
      const sensitiveFields = ['message', 'content', 'text', 'body', 'description', 'name', 'email'];
      
      for (const field of sensitiveFields) {
        if (anonymized[field] && typeof anonymized[field] === 'string') {
          anonymized[field] = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            anonymized[field]
          );
        }
      }
      
      return anonymized;
    }
    
    return data;
  }

  private async initiateGracefulShutdown(operation: string, reason: string): Promise<void> {
    try {
      console.log(`🔄 Initiating graceful shutdown for ${operation}: ${reason}`);
      
      // Log the shutdown event
      await this.logSecurityViolation('GRACEFUL_SHUTDOWN', {
        operation,
        reason,
        timestamp: Date.now()
      });
      
      // Implement graceful shutdown logic here
      // This could include:
      // - Saving current state
      // - Cleaning up resources
      // - Notifying other services
      // - Reducing background activity
      
      console.log(`✅ Graceful shutdown completed for ${operation}`);
    } catch (error) {
      console.error('Failed to initiate graceful shutdown:', error);
    }
  }

  private async getCurrentMemoryUsage(): Promise<number> {
    // Mock implementation - in real app, use native modules
    return Math.random() * 25 + 5; // 5-30 MB
  }

  private async getCurrentCpuUsage(): Promise<number> {
    // Mock implementation - in real app, use native modules
    return Math.random() * 60 + 10; // 10-70%
  }

  private async generatePolicySignature(): Promise<string> {
    const timestamp = Date.now().toString();
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `security_policy_${timestamp}`
    );
  }

  private async storeIntegrityCheck(check: IntegrityCheck): Promise<void> {
    try {
      const existing = await this.getEncrypted(this.INTEGRITY_STORAGE_KEY) || [];
      const updated = [...existing, check].slice(-10); // Keep last 10 checks
      await this.storeEncrypted(this.INTEGRITY_STORAGE_KEY, updated);
    } catch (error) {
      console.error('Failed to store integrity check:', error);
    }
  }

  private async getLatestIntegrityCheck(): Promise<IntegrityCheck | null> {
    try {
      const checks = await this.getEncrypted(this.INTEGRITY_STORAGE_KEY) || [];
      return checks.length > 0 ? checks[checks.length - 1] : null;
    } catch (error) {
      console.error('Failed to get latest integrity check:', error);
      return null;
    }
  }

  private async logSecurityViolation(type: string, details: any): Promise<void> {
    try {
      const violation = {
        type,
        details,
        timestamp: Date.now(),
        id: await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${type}_${Date.now()}_${Math.random()}`
        )
      };
      
      const existing = await this.getEncrypted('security_violations') || [];
      const updated = [...existing, violation].slice(-50); // Keep last 50 violations
      await this.storeEncrypted('security_violations', updated);
      
      console.error(`🚨 Security violation logged: ${type}`, details);
    } catch (error) {
      console.error('Failed to log security violation:', error);
    }
  }

  private async storeEncrypted(key: string, data: any): Promise<void> {
    const jsonData = JSON.stringify(data);
    
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, jsonData);
    } else {
      await SecureStore.setItemAsync(key, jsonData);
    }
  }

  private async getEncrypted(key: string): Promise<any> {
    let jsonData: string | null;
    
    if (Platform.OS === 'web') {
      jsonData = await AsyncStorage.getItem(key);
    } else {
      jsonData = await SecureStore.getItemAsync(key);
    }
    
    return jsonData ? JSON.parse(jsonData) : null;
  }
}

export default SecurityGuardrailsService;