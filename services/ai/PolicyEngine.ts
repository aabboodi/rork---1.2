import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { AITask } from './EdgeAIOrchestrator';

export interface Policy {
  id: string;
  version: string;
  name: string;
  rules: PolicyRule[];
  signature: string;
  validFrom: number;
  validUntil: number;
  deviceAllowlist?: string[];
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
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
}

export interface PolicyAction {
  type: 'block' | 'allow' | 'redirect_cloud' | 'require_approval' | 'log_only';
  parameters?: Record<string, unknown>;
  message?: string;
}

export interface PolicyValidationResult {
  allowed: boolean;
  reason?: string;
  appliedRules: string[];
  requiredApprovals?: string[];
  alternativeActions?: PolicyAction[];
}

/**
 * Policy Engine - Enforces governance rules for AI tasks
 * 
 * Features:
 * - ABAC (Attribute-Based Access Control)
 * - Policy signature validation
 * - Dynamic policy updates
 * - Compliance logging
 */
export class PolicyEngine {
  private policies = new Map<string, Policy>();
  private isInitialized = false;
  private readonly POLICY_CACHE_KEY = 'ai_policies_cache';

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📋 Initializing Policy Engine...');

      // Load cached policies
      await this.loadCachedPolicies();

      // Load default policies if none cached
      if (this.policies.size === 0) {
        await this.loadDefaultPolicies();
      }

      this.isInitialized = true;
      console.log('✅ Policy Engine initialized');

    } catch (error) {
      console.error('❌ Policy engine initialization failed:', error);
      throw error;
    }
  }

  /**
   * Validate AI task against policies
   */
  async validateTask(task: AITask): Promise<PolicyValidationResult> {
    if (!this.isInitialized) {
      throw new Error('Policy engine not initialized');
    }

    const appliedRules: string[] = [];
    const requiredApprovals: string[] = [];
    const alternativeActions: PolicyAction[] = [];

    try {
      // Get applicable policies
      const applicablePolicies = this.getApplicablePolicies(task);

      // Sort policies by priority
      const sortedRules = this.sortRulesByPriority(applicablePolicies);

      // Evaluate rules
      for (const rule of sortedRules) {
        const ruleResult = await this.evaluateRule(rule, task);
        
        if (ruleResult.matches) {
          appliedRules.push(rule.id);

          switch (rule.action.type) {
            case 'block':
              return {
                allowed: false,
                reason: rule.action.message || `Blocked by policy rule: ${rule.id}`,
                appliedRules
              };

            case 'require_approval':
              requiredApprovals.push(rule.id);
              break;

            case 'redirect_cloud':
              alternativeActions.push(rule.action);
              break;

            case 'log_only':
              // Continue evaluation but log the rule application
              console.log(`📝 Policy rule ${rule.id} applied (log only)`);
              break;

            case 'allow':
              return {
                allowed: true,
                appliedRules,
                requiredApprovals: requiredApprovals.length > 0 ? requiredApprovals : undefined,
                alternativeActions: alternativeActions.length > 0 ? alternativeActions : undefined
              };
          }
        }
      }

      // Default allow if no blocking rules
      return {
        allowed: true,
        appliedRules,
        requiredApprovals: requiredApprovals.length > 0 ? requiredApprovals : undefined,
        alternativeActions: alternativeActions.length > 0 ? alternativeActions : undefined
      };

    } catch (error) {
      console.error('❌ Policy validation failed:', error);
      
      // Fail-safe: deny on error
      return {
        allowed: false,
        reason: 'Policy validation error',
        appliedRules
      };
    }
  }

  /**
   * Load policies from central orchestrator
   */
  async loadPolicies(policies: Policy[]): Promise<void> {
    for (const policy of policies) {
      // Validate policy signature
      if (!await this.validatePolicySignature(policy)) {
        console.warn(`⚠️ Invalid signature for policy ${policy.id}, skipping`);
        continue;
      }

      // Check policy validity period
      const now = Date.now();
      if (now < policy.validFrom || now > policy.validUntil) {
        console.warn(`⚠️ Policy ${policy.id} is not valid at current time, skipping`);
        continue;
      }

      this.policies.set(policy.id, policy);
    }

    await this.savePoliciesCache();
    console.log(`✅ Loaded ${policies.length} policies`);
  }

  /**
   * Update policies with new versions
   */
  async updatePolicies(policies: Policy[]): Promise<void> {
    await this.loadPolicies(policies);
  }

  /**
   * Load default policies
   */
  async loadDefaultPolicies(): Promise<void> {
    const defaultPolicies: Policy[] = [
      {
        id: 'default-security-policy',
        version: '1.0.0',
        name: 'Default Security Policy',
        signature: 'default_signature',
        validFrom: Date.now(),
        validUntil: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
        securityLevel: 'medium',
        rules: [
          {
            id: 'token-limit-rule',
            type: 'limit',
            priority: 100,
            condition: {
              tokenLimit: 10000 // Per task limit
            },
            action: {
              type: 'block',
              message: 'Task exceeds token limit'
            }
          },
          {
            id: 'input-size-rule',
            type: 'limit',
            priority: 90,
            condition: {
              inputSize: { max: 50000 } // 50KB max input
            },
            action: {
              type: 'block',
              message: 'Input size too large'
            }
          },
          {
            id: 'moderation-priority-rule',
            type: 'allow',
            priority: 80,
            condition: {
              taskType: ['moderation']
            },
            action: {
              type: 'allow'
            }
          },
          {
            id: 'chat-cloud-fallback-rule',
            type: 'allow',
            priority: 70,
            condition: {
              taskType: ['chat'],
              tokenLimit: 5000
            },
            action: {
              type: 'redirect_cloud',
              message: 'Complex chat task redirected to cloud'
            }
          }
        ]
      },
      {
        id: 'critical-security-policy',
        version: '1.0.0',
        name: 'Critical Security Policy',
        signature: 'critical_signature',
        validFrom: Date.now(),
        validUntil: Date.now() + (365 * 24 * 60 * 60 * 1000),
        securityLevel: 'critical',
        rules: [
          {
            id: 'critical-no-cloud-rule',
            type: 'deny',
            priority: 200,
            condition: {
              taskType: ['chat', 'recommendation']
            },
            action: {
              type: 'block',
              message: 'Cloud processing disabled for critical security level'
            }
          },
          {
            id: 'critical-token-limit-rule',
            type: 'limit',
            priority: 190,
            condition: {
              tokenLimit: 5000 // Stricter limit for critical security
            },
            action: {
              type: 'block',
              message: 'Token limit exceeded for critical security level'
            }
          }
        ]
      }
    ];

    await this.loadPolicies(defaultPolicies);
  }

  /**
   * Get current policies
   */
  getPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policy by ID
   */
  getPolicy(id: string): Policy | undefined {
    return this.policies.get(id);
  }

  // Private methods

  private async loadCachedPolicies(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.POLICY_CACHE_KEY);
      if (cached) {
        const policies = JSON.parse(cached) as Policy[];
        
        // Validate cached policies
        for (const policy of policies) {
          const now = Date.now();
          if (now >= policy.validFrom && now <= policy.validUntil) {
            this.policies.set(policy.id, policy);
          }
        }
        
        console.log(`📥 Loaded ${this.policies.size} cached policies`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached policies:', error);
    }
  }

  private async savePoliciesCache(): Promise<void> {
    try {
      const policies = Array.from(this.policies.values());
      await AsyncStorage.setItem(this.POLICY_CACHE_KEY, JSON.stringify(policies));
    } catch (error) {
      console.warn('⚠️ Failed to save policies cache:', error);
    }
  }

  private getApplicablePolicies(task: AITask): PolicyRule[] {
    const applicableRules: PolicyRule[] = [];

    for (const policy of this.policies.values()) {
      // Check if policy applies to current security context
      // In real implementation, would check device security level, user role, etc.
      
      for (const rule of policy.rules) {
        if (this.isRuleApplicable(rule, task)) {
          applicableRules.push(rule);
        }
      }
    }

    return applicableRules;
  }

  private isRuleApplicable(rule: PolicyRule, task: AITask): boolean {
    const condition = rule.condition;

    // Check task type
    if (condition.taskType && !condition.taskType.includes(task.type)) {
      return false;
    }

    // Check input size
    if (condition.inputSize) {
      const inputSize = this.getInputSize(task.input);
      
      if (condition.inputSize.min && inputSize < condition.inputSize.min) {
        return false;
      }
      
      if (condition.inputSize.max && inputSize > condition.inputSize.max) {
        return false;
      }
    }

    // Check token limit
    if (condition.tokenLimit && task.maxTokens && task.maxTokens > condition.tokenLimit) {
      return false;
    }

    // Additional conditions would be checked here (user role, device security, etc.)

    return true;
  }

  private sortRulesByPriority(rules: PolicyRule[]): PolicyRule[] {
    return rules.sort((a, b) => b.priority - a.priority);
  }

  private async evaluateRule(rule: PolicyRule, task: AITask): Promise<{ matches: boolean; reason?: string }> {
    // Detailed rule evaluation
    const condition = rule.condition;

    // Task type check
    if (condition.taskType && !condition.taskType.includes(task.type)) {
      return { matches: false, reason: 'Task type mismatch' };
    }

    // Input size check
    if (condition.inputSize) {
      const inputSize = this.getInputSize(task.input);
      
      if (condition.inputSize.min && inputSize < condition.inputSize.min) {
        return { matches: false, reason: 'Input size below minimum' };
      }
      
      if (condition.inputSize.max && inputSize > condition.inputSize.max) {
        return { matches: true, reason: 'Input size exceeds maximum' };
      }
    }

    // Token limit check
    if (condition.tokenLimit) {
      const estimatedTokens = this.estimateTaskTokens(task);
      
      if (estimatedTokens > condition.tokenLimit) {
        return { matches: true, reason: 'Token limit exceeded' };
      }
    }

    // Time window check
    if (condition.timeWindow) {
      // Would check task frequency within time window
      // For now, always pass
    }

    // If all conditions pass and it's an allow rule, it matches
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

  private estimateTaskTokens(task: AITask): number {
    // Simple token estimation
    const baseTokens = {
      'chat': 1000,
      'classification': 200,
      'moderation': 300,
      'recommendation': 500
    };

    let estimate = baseTokens[task.type] || 500;

    if (typeof task.input === 'string') {
      estimate += Math.ceil(task.input.length / 4);
    }

    return estimate;
  }

  private async validatePolicySignature(policy: Policy): boolean {
    // Validate policy signature using ECDSA
    // In real implementation, would verify against trusted public keys
    
    try {
      // Create policy content hash
      const policyContent = JSON.stringify({
        id: policy.id,
        version: policy.version,
        name: policy.name,
        rules: policy.rules,
        validFrom: policy.validFrom,
        validUntil: policy.validUntil,
        securityLevel: policy.securityLevel
      });

      const contentHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        policyContent
      );

      // In real implementation, would verify signature against content hash
      // For now, just check that signature exists and is not empty
      return policy.signature.length > 0;

    } catch (error) {
      console.error('❌ Policy signature validation failed:', error);
      return false;
    }
  }
}