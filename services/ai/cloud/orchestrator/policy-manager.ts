import { DynamicPolicy, PolicyRule, HealthStatus } from './types';

/**
 * Policy Manager - Manages dynamic policies for devices
 */
export class PolicyManager {
  private policies: Map<string, DynamicPolicy[]> = new Map();
  private globalPolicies: DynamicPolicy[] = [];
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📋 Initializing Policy Manager...');

      // Load default global policies
      await this.loadGlobalPolicies();

      this.isInitialized = true;
      console.log('✅ Policy Manager initialized');

    } catch (error) {
      console.error('❌ Policy Manager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get policies for a specific device
   */
  async getPoliciesForDevice(deviceId: string): Promise<DynamicPolicy[]> {
    if (!this.isInitialized) {
      throw new Error('Policy Manager not initialized');
    }

    // Get device-specific policies
    const devicePolicies = this.policies.get(deviceId) || [];

    // Combine with global policies
    const allPolicies = [...this.globalPolicies, ...devicePolicies];

    // Filter by validity and device compatibility
    const validPolicies = allPolicies.filter(policy => {
      const now = Date.now();
      return policy.validFrom <= now && policy.validUntil > now;
    });

    // Sort by priority (higher priority first)
    validPolicies.sort((a, b) => {
      const aPriority = Math.max(...a.rules.map(r => r.priority));
      const bPriority = Math.max(...b.rules.map(r => r.priority));
      return bPriority - aPriority;
    });

    console.log(`📋 Retrieved ${validPolicies.length} policies for device ${deviceId.substring(0, 8)}...`);
    return validPolicies;
  }

  /**
   * Update policies for a specific device
   */
  async updatePoliciesForDevice(deviceId: string, policies: unknown[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Policy Manager not initialized');
    }

    try {
      // Validate and convert policies
      const validatedPolicies = policies.map(p => this.validatePolicy(p as DynamicPolicy));

      // Store device-specific policies
      this.policies.set(deviceId, validatedPolicies);

      console.log(`📋 Updated ${validatedPolicies.length} policies for device ${deviceId.substring(0, 8)}...`);

    } catch (error) {
      console.error('❌ Failed to update device policies:', error);
      throw error;
    }
  }

  /**
   * Add global policy
   */
  async addGlobalPolicy(policy: DynamicPolicy): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Policy Manager not initialized');
    }

    const validatedPolicy = this.validatePolicy(policy);
    
    // Remove existing policy with same ID
    this.globalPolicies = this.globalPolicies.filter(p => p.id !== policy.id);
    
    // Add new policy
    this.globalPolicies.push(validatedPolicy);

    console.log(`📋 Added global policy: ${policy.name}`);
  }

  /**
   * Remove expired policies
   */
  async cleanupExpiredPolicies(): Promise<void> {
    const now = Date.now();

    // Clean global policies
    const initialGlobalCount = this.globalPolicies.length;
    this.globalPolicies = this.globalPolicies.filter(p => p.validUntil > now);

    // Clean device-specific policies
    let totalDevicePoliciesRemoved = 0;
    for (const [deviceId, policies] of this.policies.entries()) {
      const initialCount = policies.length;
      const validPolicies = policies.filter(p => p.validUntil > now);
      
      if (validPolicies.length === 0) {
        this.policies.delete(deviceId);
      } else {
        this.policies.set(deviceId, validPolicies);
      }
      
      totalDevicePoliciesRemoved += initialCount - validPolicies.length;
    }

    const globalRemoved = initialGlobalCount - this.globalPolicies.length;
    
    if (globalRemoved > 0 || totalDevicePoliciesRemoved > 0) {
      console.log(`🧹 Cleaned up ${globalRemoved} global and ${totalDevicePoliciesRemoved} device policies`);
    }
  }

  /**
   * Get policy statistics
   */
  getPolicyStats() {
    const deviceCount = this.policies.size;
    const totalDevicePolicies = Array.from(this.policies.values())
      .reduce((sum, policies) => sum + policies.length, 0);

    return {
      globalPolicies: this.globalPolicies.length,
      deviceCount,
      totalDevicePolicies,
      totalPolicies: this.globalPolicies.length + totalDevicePolicies
    };
  }

  /**
   * Get status
   */
  getStatus(): HealthStatus {
    return {
      status: this.isInitialized ? 'healthy' : 'unhealthy',
      lastCheck: Date.now(),
      details: {
        ...this.getPolicyStats(),
        isInitialized: this.isInitialized
      }
    };
  }

  // Private methods

  private async loadGlobalPolicies(): Promise<void> {
    // Load default global policies
    const defaultPolicies: DynamicPolicy[] = [
      {
        id: 'global-battery-conservation',
        version: '1.0.0',
        name: 'Battery Conservation Policy',
        deviceFilters: {},
        rules: [
          {
            id: 'low-battery-cloud-redirect',
            type: 'route',
            priority: 100,
            condition: {
              deviceBattery: { max: 20 }
            },
            action: {
              strategy: 'process_cloud',
              message: 'Redirecting to cloud due to low battery'
            }
          }
        ],
        validFrom: Date.now(),
        validUntil: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
        signature: 'global_battery_policy_v1'
      },
      {
        id: 'global-network-optimization',
        version: '1.0.0',
        name: 'Network Optimization Policy',
        deviceFilters: {},
        rules: [
          {
            id: 'poor-network-cache',
            type: 'cache',
            priority: 90,
            condition: {
              networkQuality: ['poor']
            },
            action: {
              strategy: 'cache_result',
              parameters: { ttl: 300000 }, // 5 minutes
              message: 'Caching due to poor network'
            }
          },
          {
            id: 'good-network-local',
            type: 'route',
            priority: 80,
            condition: {
              networkQuality: ['excellent'],
              taskTypes: ['classification', 'moderation']
            },
            action: {
              strategy: 'process_local',
              message: 'Processing locally with good network'
            }
          }
        ],
        validFrom: Date.now(),
        validUntil: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
        signature: 'global_network_policy_v1'
      },
      {
        id: 'global-privacy-protection',
        version: '1.0.0',
        name: 'Privacy Protection Policy',
        deviceFilters: {},
        rules: [
          {
            id: 'sensitive-data-local',
            type: 'route',
            priority: 200,
            condition: {
              taskTypes: ['chat'],
              contextSize: { max: 1000 }
            },
            action: {
              strategy: 'process_local',
              message: 'Processing sensitive data locally'
            }
          }
        ],
        validFrom: Date.now(),
        validUntil: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
        signature: 'global_privacy_policy_v1'
      }
    ];

    this.globalPolicies = defaultPolicies;
    console.log(`📋 Loaded ${defaultPolicies.length} global policies`);
  }

  private validatePolicy(policy: DynamicPolicy): DynamicPolicy {
    // Basic validation
    if (!policy.id || !policy.version || !policy.name) {
      throw new Error('Policy missing required fields: id, version, name');
    }

    if (!policy.rules || !Array.isArray(policy.rules)) {
      throw new Error('Policy must have rules array');
    }

    if (policy.validFrom >= policy.validUntil) {
      throw new Error('Policy validFrom must be before validUntil');
    }

    // Validate rules
    for (const rule of policy.rules) {
      this.validatePolicyRule(rule);
    }

    return policy;
  }

  private validatePolicyRule(rule: PolicyRule): void {
    if (!rule.id || !rule.type || typeof rule.priority !== 'number') {
      throw new Error('Rule missing required fields: id, type, priority');
    }

    const validTypes = ['route', 'limit', 'cache', 'defer', 'deny'];
    if (!validTypes.includes(rule.type)) {
      throw new Error(`Invalid rule type: ${rule.type}`);
    }

    if (!rule.condition || !rule.action) {
      throw new Error('Rule must have condition and action');
    }
  }
}