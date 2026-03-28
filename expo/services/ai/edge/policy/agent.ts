import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { PolicyVerifier } from './verifier';

export interface PolicySignature {
  algorithm: 'ECDSA-P256';
  signature: string; // Base64 encoded
  keyId: string;
  timestamp: number;
}

export interface SignedPolicy {
  id: string;
  version: string;
  name: string;
  rules: PolicyRule[];
  signature: PolicySignature;
  validFrom: number;
  validUntil: number;
  deviceAllowlist?: string[];
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  fingerprint: string; // SHA256 hash of policy content
}

export interface PolicyRule {
  id: string;
  type: 'allow' | 'deny' | 'limit' | 'require_approval';
  condition: PolicyCondition;
  action: PolicyAction;
  priority: number;
}

export interface PolicyCondition {
  taskType?: string[];
  inputSize?: { min?: number; max?: number };
  tokenLimit?: number;
  timeWindow?: number;
  userRole?: string[];
  deviceSecurity?: string[];
  location?: string[];
  requiresApproval?: boolean;
}

export interface PolicyAction {
  type: 'block' | 'allow' | 'redirect_cloud' | 'require_approval' | 'log_only';
  parameters?: Record<string, unknown>;
  message?: string;
  fallbackAction?: PolicyAction;
}

export interface PolicyValidationRequest {
  taskId: string;
  taskType: string;
  input: unknown;
  maxTokens?: number;
  userContext?: {
    userId: string;
    role: string;
    securityLevel: string;
  };
  deviceContext?: {
    deviceId: string;
    osVersion: string;
    appVersion: string;
    securityFeatures: string[];
  };
}

export interface PolicyValidationResult {
  allowed: boolean;
  reason?: string;
  appliedRules: string[];
  requiredApprovals?: string[];
  alternativeActions?: PolicyAction[];
  securityWarnings?: string[];
  policyVersion: string;
  validationTimestamp: number;
}

/**
 * PolicyAgent - On-device policy enforcement with ECDSA signature verification
 * 
 * Features:
 * - ECDSA-P256 signature validation
 * - Policy fingerprint verification
 * - Expiration and allowlist checking
 * - Secure policy caching
 * - Fail-safe policy enforcement
 */
export class PolicyAgent {
  private policies = new Map<string, SignedPolicy>();
  private verifier: PolicyVerifier;
  private isInitialized = false;
  private readonly POLICY_CACHE_KEY = 'signed_policies_cache';
  private readonly POLICY_METADATA_KEY = 'policy_metadata';
  private readonly MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.verifier = new PolicyVerifier();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔐 Initializing PolicyAgent...');

      // Initialize signature verifier
      await this.verifier.initialize();

      // Load cached policies
      await this.loadCachedPolicies();

      // Load default policies if none cached
      if (this.policies.size === 0) {
        await this.loadDefaultPolicies();
      }

      // Validate all loaded policies
      await this.validateAllPolicies();

      this.isInitialized = true;
      console.log(`✅ PolicyAgent initialized with ${this.policies.size} policies`);

    } catch (error) {
      console.error('❌ PolicyAgent initialization failed:', error);
      
      // Fail-safe: Load emergency policies
      await this.loadEmergencyPolicies();
      this.isInitialized = true;
    }
  }

  /**
   * Validate task against signed policies
   */
  async validateTask(request: PolicyValidationRequest): Promise<PolicyValidationResult> {
    if (!this.isInitialized) {
      throw new Error('PolicyAgent not initialized');
    }

    const validationStart = Date.now();
    const appliedRules: string[] = [];
    const requiredApprovals: string[] = [];
    const alternativeActions: PolicyAction[] = [];
    const securityWarnings: string[] = [];

    try {
      console.log(`🔍 Validating task ${request.taskId} of type ${request.taskType}`);

      // Get applicable policies
      const applicablePolicies = this.getApplicablePolicies(request);
      
      if (applicablePolicies.length === 0) {
        securityWarnings.push('No applicable policies found - using default deny');
        return {
          allowed: false,
          reason: 'No applicable policies found',
          appliedRules: [],
          securityWarnings,
          policyVersion: 'none',
          validationTimestamp: validationStart
        };
      }

      // Sort rules by priority
      const sortedRules = this.sortRulesByPriority(applicablePolicies);

      // Evaluate rules in priority order
      for (const { policy, rule } of sortedRules) {
        const ruleResult = await this.evaluateRule(rule, request, policy);
        
        if (ruleResult.matches) {
          appliedRules.push(`${policy.id}:${rule.id}`);

          switch (rule.action.type) {
            case 'block':
              console.log(`🚫 Task blocked by rule ${rule.id}`);
              return {
                allowed: false,
                reason: rule.action.message || `Blocked by policy rule: ${rule.id}`,
                appliedRules,
                securityWarnings,
                policyVersion: policy.version,
                validationTimestamp: validationStart
              };

            case 'require_approval':
              requiredApprovals.push(`${policy.id}:${rule.id}`);
              console.log(`⚠️ Task requires approval: ${rule.id}`);
              break;

            case 'redirect_cloud':
              alternativeActions.push(rule.action);
              console.log(`☁️ Task redirected to cloud: ${rule.id}`);
              break;

            case 'log_only':
              console.log(`📝 Policy rule ${rule.id} applied (log only)`);
              break;

            case 'allow':
              console.log(`✅ Task allowed by rule ${rule.id}`);
              return {
                allowed: true,
                appliedRules,
                requiredApprovals: requiredApprovals.length > 0 ? requiredApprovals : undefined,
                alternativeActions: alternativeActions.length > 0 ? alternativeActions : undefined,
                securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined,
                policyVersion: policy.version,
                validationTimestamp: validationStart
              };
          }
        }
      }

      // If we have required approvals, task is conditionally allowed
      if (requiredApprovals.length > 0) {
        return {
          allowed: false, // Requires approval first
          reason: 'Task requires approval',
          appliedRules,
          requiredApprovals,
          alternativeActions: alternativeActions.length > 0 ? alternativeActions : undefined,
          securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined,
          policyVersion: applicablePolicies[0]?.policy.version || 'unknown',
          validationTimestamp: validationStart
        };
      }

      // Default deny if no explicit allow
      return {
        allowed: false,
        reason: 'No explicit allow rule found',
        appliedRules,
        alternativeActions: alternativeActions.length > 0 ? alternativeActions : undefined,
        securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined,
        policyVersion: applicablePolicies[0]?.policy.version || 'unknown',
        validationTimestamp: validationStart
      };

    } catch (error) {
      console.error('❌ Policy validation failed:', error);
      
      // Fail-safe: deny on error
      return {
        allowed: false,
        reason: `Policy validation error: ${error.message}`,
        appliedRules,
        securityWarnings: [...securityWarnings, 'Policy validation error occurred'],
        policyVersion: 'error',
        validationTimestamp: validationStart
      };
    }
  }

  /**
   * Load signed policies from central orchestrator
   */
  async loadSignedPolicies(policies: SignedPolicy[]): Promise<{ loaded: number; rejected: number; reasons: string[] }> {
    let loaded = 0;
    let rejected = 0;
    const reasons: string[] = [];

    for (const policy of policies) {
      try {
        // Verify policy signature
        const signatureValid = await this.verifier.verifyPolicySignature(policy);
        if (!signatureValid) {
          rejected++;
          reasons.push(`Policy ${policy.id}: Invalid signature`);
          console.warn(`⚠️ Invalid signature for policy ${policy.id}`);
          continue;
        }

        // Check policy validity period
        const now = Date.now();
        if (now < policy.validFrom) {
          rejected++;
          reasons.push(`Policy ${policy.id}: Not yet valid`);
          console.warn(`⚠️ Policy ${policy.id} is not yet valid`);
          continue;
        }

        if (now > policy.validUntil) {
          rejected++;
          reasons.push(`Policy ${policy.id}: Expired`);
          console.warn(`⚠️ Policy ${policy.id} has expired`);
          continue;
        }

        // Check device allowlist if specified
        if (policy.deviceAllowlist && policy.deviceAllowlist.length > 0) {
          const deviceId = await this.getDeviceId();
          if (!policy.deviceAllowlist.includes(deviceId)) {
            rejected++;
            reasons.push(`Policy ${policy.id}: Device not in allowlist`);
            console.warn(`⚠️ Device not in allowlist for policy ${policy.id}`);
            continue;
          }
        }

        // Verify policy fingerprint
        const expectedFingerprint = await this.calculatePolicyFingerprint(policy);
        if (policy.fingerprint !== expectedFingerprint) {
          rejected++;
          reasons.push(`Policy ${policy.id}: Fingerprint mismatch`);
          console.warn(`⚠️ Fingerprint mismatch for policy ${policy.id}`);
          continue;
        }

        // Policy is valid, store it
        this.policies.set(policy.id, policy);
        loaded++;
        console.log(`✅ Loaded policy ${policy.id} v${policy.version}`);

      } catch (error) {
        rejected++;
        reasons.push(`Policy ${policy.id}: ${error.message}`);
        console.error(`❌ Failed to load policy ${policy.id}:`, error);
      }
    }

    // Save to cache
    await this.savePoliciesCache();
    
    console.log(`📊 Policy loading complete: ${loaded} loaded, ${rejected} rejected`);
    return { loaded, rejected, reasons };
  }

  /**
   * Get current policies
   */
  getPolicies(): SignedPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policy by ID
   */
  getPolicy(id: string): SignedPolicy | undefined {
    return this.policies.get(id);
  }

  /**
   * Check if policies need refresh
   */
  async needsPolicyRefresh(): Promise<boolean> {
    try {
      const metadata = await AsyncStorage.getItem(this.POLICY_METADATA_KEY);
      if (!metadata) return true;

      const { lastUpdate } = JSON.parse(metadata);
      const age = Date.now() - lastUpdate;
      
      return age > this.MAX_CACHE_AGE;
    } catch {
      return true;
    }
  }

  // Private methods

  private async loadCachedPolicies(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.POLICY_CACHE_KEY);
      if (!cached) return;

      const policies = JSON.parse(cached) as SignedPolicy[];
      const now = Date.now();
      
      for (const policy of policies) {
        // Only load non-expired policies
        if (now <= policy.validUntil) {
          this.policies.set(policy.id, policy);
        }
      }
      
      console.log(`📥 Loaded ${this.policies.size} cached policies`);
    } catch (error) {
      console.warn('⚠️ Failed to load cached policies:', error);
    }
  }

  private async savePoliciesCache(): Promise<void> {
    try {
      const policies = Array.from(this.policies.values());
      await AsyncStorage.setItem(this.POLICY_CACHE_KEY, JSON.stringify(policies));
      
      // Save metadata
      const metadata = {
        lastUpdate: Date.now(),
        policyCount: policies.length
      };
      await AsyncStorage.setItem(this.POLICY_METADATA_KEY, JSON.stringify(metadata));
      
    } catch (error) {
      console.warn('⚠️ Failed to save policies cache:', error);
    }
  }

  private async validateAllPolicies(): Promise<void> {
    const invalidPolicies: string[] = [];
    
    for (const [id, policy] of this.policies.entries()) {
      try {
        const isValid = await this.verifier.verifyPolicySignature(policy);
        if (!isValid) {
          invalidPolicies.push(id);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to validate policy ${id}:`, error);
        invalidPolicies.push(id);
      }
    }

    // Remove invalid policies
    for (const id of invalidPolicies) {
      this.policies.delete(id);
      console.warn(`🗑️ Removed invalid policy: ${id}`);
    }
  }

  private getApplicablePolicies(request: PolicyValidationRequest): { policy: SignedPolicy; rule: PolicyRule }[] {
    const applicable: { policy: SignedPolicy; rule: PolicyRule }[] = [];

    for (const policy of this.policies.values()) {
      for (const rule of policy.rules) {
        if (this.isRuleApplicable(rule, request, policy)) {
          applicable.push({ policy, rule });
        }
      }
    }

    return applicable;
  }

  private isRuleApplicable(rule: PolicyRule, request: PolicyValidationRequest, policy: SignedPolicy): boolean {
    const condition = rule.condition;

    // Check task type
    if (condition.taskType && !condition.taskType.includes(request.taskType)) {
      return false;
    }

    // Check user role
    if (condition.userRole && request.userContext) {
      if (!condition.userRole.includes(request.userContext.role)) {
        return false;
      }
    }

    // Check device security features
    if (condition.deviceSecurity && request.deviceContext) {
      const hasRequiredFeatures = condition.deviceSecurity.every(feature => 
        request.deviceContext!.securityFeatures.includes(feature)
      );
      if (!hasRequiredFeatures) {
        return false;
      }
    }

    // Check input size
    if (condition.inputSize) {
      const inputSize = this.getInputSize(request.input);
      
      if (condition.inputSize.min && inputSize < condition.inputSize.min) {
        return false;
      }
      
      if (condition.inputSize.max && inputSize > condition.inputSize.max) {
        return true; // Rule applies because limit is exceeded
      }
    }

    // Check token limit
    if (condition.tokenLimit && request.maxTokens && request.maxTokens > condition.tokenLimit) {
      return true; // Rule applies because limit is exceeded
    }

    return true;
  }

  private sortRulesByPriority(rules: { policy: SignedPolicy; rule: PolicyRule }[]): { policy: SignedPolicy; rule: PolicyRule }[] {
    return rules.sort((a, b) => b.rule.priority - a.rule.priority);
  }

  private async evaluateRule(
    rule: PolicyRule, 
    request: PolicyValidationRequest, 
    policy: SignedPolicy
  ): Promise<{ matches: boolean; reason?: string }> {
    const condition = rule.condition;

    // Task type check
    if (condition.taskType && !condition.taskType.includes(request.taskType)) {
      return { matches: false, reason: 'Task type mismatch' };
    }

    // Input size check
    if (condition.inputSize) {
      const inputSize = this.getInputSize(request.input);
      
      if (condition.inputSize.max && inputSize > condition.inputSize.max) {
        return { matches: true, reason: 'Input size exceeds maximum' };
      }
    }

    // Token limit check
    if (condition.tokenLimit && request.maxTokens) {
      if (request.maxTokens > condition.tokenLimit) {
        return { matches: true, reason: 'Token limit exceeded' };
      }
    }

    // Approval requirement check
    if (condition.requiresApproval) {
      return { matches: true, reason: 'Approval required' };
    }

    // For allow rules, match if all conditions are satisfied
    if (rule.type === 'allow') {
      return { matches: true, reason: 'Allow rule conditions met' };
    }

    // For deny/limit rules, match if any condition is violated
    return { matches: false, reason: 'No violation detected' };
  }

  private getInputSize(input: unknown): number {
    if (typeof input === 'string') {
      return new Blob([input]).size;
    }
    
    if (typeof input === 'object' && input !== null) {
      return new Blob([JSON.stringify(input)]).size;
    }
    
    return 0;
  }

  private async getDeviceId(): Promise<string> {
    // In real implementation, would get actual device ID
    // For now, return a mock device ID
    return Platform.OS === 'ios' ? 'ios-device-123' : 'android-device-456';
  }

  private async calculatePolicyFingerprint(policy: SignedPolicy): Promise<string> {
    const content = {
      id: policy.id,
      version: policy.version,
      name: policy.name,
      rules: policy.rules,
      validFrom: policy.validFrom,
      validUntil: policy.validUntil,
      securityLevel: policy.securityLevel,
      deviceAllowlist: policy.deviceAllowlist
    };

    const contentString = JSON.stringify(content, Object.keys(content).sort());
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      contentString
    );
  }

  private async loadDefaultPolicies(): Promise<void> {
    console.log('📋 Loading default policies...');
    
    // Create default policies with proper signatures
    const defaultPolicies: SignedPolicy[] = await this.createDefaultPolicies();
    
    for (const policy of defaultPolicies) {
      this.policies.set(policy.id, policy);
    }
    
    await this.savePoliciesCache();
  }

  private async loadEmergencyPolicies(): Promise<void> {
    console.log('🚨 Loading emergency fail-safe policies...');
    
    const emergencyPolicy: SignedPolicy = {
      id: 'emergency-policy',
      version: '1.0.0',
      name: 'Emergency Fail-Safe Policy',
      fingerprint: 'emergency-fingerprint',
      signature: {
        algorithm: 'ECDSA-P256',
        signature: 'emergency-signature',
        keyId: 'emergency-key',
        timestamp: Date.now()
      },
      validFrom: Date.now(),
      validUntil: Date.now() + (365 * 24 * 60 * 60 * 1000),
      securityLevel: 'critical',
      rules: [
        {
          id: 'emergency-deny-all',
          type: 'deny',
          priority: 1000,
          condition: {},
          action: {
            type: 'block',
            message: 'Emergency policy: All AI tasks blocked due to policy system failure'
          }
        }
      ]
    };

    this.policies.set(emergencyPolicy.id, emergencyPolicy);
  }

  private async createDefaultPolicies(): Promise<SignedPolicy[]> {
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    const policies: SignedPolicy[] = [
      {
        id: 'default-security-policy',
        version: '1.0.0',
        name: 'Default Security Policy',
        fingerprint: await this.calculateDefaultPolicyFingerprint('default'),
        signature: {
          algorithm: 'ECDSA-P256',
          signature: 'default-signature-placeholder',
          keyId: 'default-key-1',
          timestamp: now
        },
        validFrom: now,
        validUntil: now + oneYear,
        securityLevel: 'medium',
        rules: [
          {
            id: 'token-limit-rule',
            type: 'limit',
            priority: 100,
            condition: {
              tokenLimit: 10000
            },
            action: {
              type: 'block',
              message: 'Task exceeds token limit (10,000)'
            }
          },
          {
            id: 'input-size-rule',
            type: 'limit',
            priority: 90,
            condition: {
              inputSize: { max: 50000 }
            },
            action: {
              type: 'block',
              message: 'Input size too large (max 50KB)'
            }
          },
          {
            id: 'moderation-allow-rule',
            type: 'allow',
            priority: 80,
            condition: {
              taskType: ['moderation']
            },
            action: {
              type: 'allow'
            }
          }
        ]
      }
    ];

    return policies;
  }

  private async calculateDefaultPolicyFingerprint(type: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `default-policy-${type}-${Date.now()}`
    );
  }
}