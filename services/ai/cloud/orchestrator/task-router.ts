import { CompressedSummary, OrchestratorStrategy, DynamicPolicy, PolicyRule, HealthStatus } from './types';

/**
 * Task Router - Determines processing strategy based on policies and device state
 */
export class TaskRouter {
  private isInitialized = false;
  private strategyCache: Map<string, { strategy: OrchestratorStrategy; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🎯 Initializing Task Router...');

      // Initialize strategy cache cleanup
      this.startCacheCleanup();

      this.isInitialized = true;
      console.log('✅ Task Router initialized');

    } catch (error) {
      console.error('❌ Task Router initialization failed:', error);
      throw error;
    }
  }

  /**
   * Determine processing strategy based on policies and device state
   */
  async determineStrategy(
    summary: CompressedSummary,
    policies: DynamicPolicy[],
    deviceId: string
  ): Promise<OrchestratorStrategy> {
    if (!this.isInitialized) {
      throw new Error('Task Router not initialized');
    }

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(summary, deviceId);
      const cached = this.strategyCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        console.log(`🎯 Using cached strategy for ${summary.taskType}`);
        return cached.strategy;
      }

      // Evaluate policies to determine strategy
      const strategy = await this.evaluatePolicies(summary, policies, deviceId);

      // Cache the strategy
      this.strategyCache.set(cacheKey, {
        strategy,
        timestamp: Date.now()
      });

      console.log(`🎯 Determined strategy '${strategy.type}' for ${summary.taskType}: ${strategy.reasoning}`);
      return strategy;

    } catch (error) {
      console.error('❌ Failed to determine strategy:', error);
      
      // Return fallback strategy
      return this.getFallbackStrategy(summary);
    }
  }

  /**
   * Get status
   */
  getStatus(): HealthStatus {
    return {
      status: this.isInitialized ? 'healthy' : 'unhealthy',
      lastCheck: Date.now(),
      details: {
        isInitialized: this.isInitialized,
        cacheSize: this.strategyCache.size,
        cacheTTL: this.CACHE_TTL
      }
    };
  }

  // Private methods

  private async evaluatePolicies(
    summary: CompressedSummary,
    policies: DynamicPolicy[],
    deviceId: string
  ): Promise<OrchestratorStrategy> {
    // Collect all applicable rules
    const applicableRules: { rule: PolicyRule; policy: DynamicPolicy }[] = [];

    for (const policy of policies) {
      // Check if policy applies to this device
      if (!this.policyAppliesToDevice(policy, summary.deviceCapabilities)) {
        continue;
      }

      for (const rule of policy.rules) {
        if (this.ruleMatches(rule, summary)) {
          applicableRules.push({ rule, policy });
        }
      }
    }

    // Sort rules by priority (highest first)
    applicableRules.sort((a, b) => b.rule.priority - a.rule.priority);

    // Apply the highest priority rule
    if (applicableRules.length > 0) {
      const { rule } = applicableRules[0];
      return this.createStrategyFromRule(rule, summary);
    }

    // No matching rules, use default strategy
    return this.getDefaultStrategy(summary);
  }

  private policyAppliesToDevice(
    policy: DynamicPolicy,
    deviceCapabilities: CompressedSummary['deviceCapabilities']
  ): boolean {
    const filters = policy.deviceFilters;

    // Check memory requirements
    if (filters.capabilities?.minMemory && 
        deviceCapabilities.availableMemory < filters.capabilities.minMemory) {
      return false;
    }

    // Check processing power requirements
    if (filters.capabilities?.minProcessingPower) {
      const powerLevels = { 'low': 1, 'medium': 2, 'high': 3 };
      const devicePower = powerLevels[deviceCapabilities.processingPower];
      const requiredPower = powerLevels[filters.capabilities.minProcessingPower];
      
      if (devicePower < requiredPower) {
        return false;
      }
    }

    // Check battery requirements
    if (filters.capabilities?.minBatteryLevel && 
        deviceCapabilities.batteryLevel < filters.capabilities.minBatteryLevel) {
      return false;
    }

    return true;
  }

  private ruleMatches(rule: PolicyRule, summary: CompressedSummary): boolean {
    const condition = rule.condition;

    // Check task types
    if (condition.taskTypes && !condition.taskTypes.includes(summary.taskType)) {
      return false;
    }

    // Check context size
    if (condition.contextSize) {
      const contextSize = summary.compressedContext.length;
      if (condition.contextSize.min && contextSize < condition.contextSize.min) {
        return false;
      }
      if (condition.contextSize.max && contextSize > condition.contextSize.max) {
        return false;
      }
    }

    // Check device battery
    if (condition.deviceBattery) {
      const battery = summary.deviceCapabilities.batteryLevel;
      if (condition.deviceBattery.min && battery < condition.deviceBattery.min) {
        return false;
      }
      if (condition.deviceBattery.max && battery > condition.deviceBattery.max) {
        return false;
      }
    }

    // Check network quality
    if (condition.networkQuality && 
        !condition.networkQuality.includes(summary.deviceCapabilities.networkQuality)) {
      return false;
    }

    // Check time of day
    if (condition.timeOfDay) {
      const now = new Date();
      const currentTime = now.getHours() * 100 + now.getMinutes();
      const startTime = this.parseTime(condition.timeOfDay.start);
      const endTime = this.parseTime(condition.timeOfDay.end);
      
      if (startTime <= endTime) {
        // Same day range
        if (currentTime < startTime || currentTime > endTime) {
          return false;
        }
      } else {
        // Overnight range
        if (currentTime < startTime && currentTime > endTime) {
          return false;
        }
      }
    }

    return true;
  }

  private createStrategyFromRule(
    rule: PolicyRule,
    summary: CompressedSummary
  ): OrchestratorStrategy {
    const baseStrategy: OrchestratorStrategy = {
      type: rule.action.strategy as OrchestratorStrategy['type'],
      reasoning: rule.action.message || `Applied rule: ${rule.id}`,
      parameters: rule.action.parameters as OrchestratorStrategy['parameters'],
      metadata: {
        confidence: 0.9,
        estimatedCost: this.estimateCost(rule.action.strategy, summary),
        estimatedLatency: this.estimateLatency(rule.action.strategy, summary),
        privacyLevel: this.getPrivacyLevel(rule.action.strategy)
      }
    };

    // Add specific parameters based on strategy type
    switch (rule.type) {
      case 'cache':
        baseStrategy.parameters = {
          ...baseStrategy.parameters,
          cacheKey: this.generateCacheKey(summary, 'result'),
          ...rule.action.parameters
        };
        break;

      case 'defer':
        baseStrategy.parameters = {
          ...baseStrategy.parameters,
          deferUntil: Date.now() + 300000, // 5 minutes default
          ...rule.action.parameters
        };
        break;

      case 'limit':
        baseStrategy.parameters = {
          ...baseStrategy.parameters,
          maxTokens: 1000, // Default limit
          timeout: 30000, // 30 seconds
          ...rule.action.parameters
        };
        break;
    }

    return baseStrategy;
  }

  private getDefaultStrategy(summary: CompressedSummary): OrchestratorStrategy {
    // Default strategy based on task type and device capabilities
    const { deviceCapabilities } = summary;

    // High-end devices with good network -> local processing
    if (deviceCapabilities.processingPower === 'high' && 
        deviceCapabilities.batteryLevel > 50 &&
        deviceCapabilities.networkQuality === 'excellent') {
      return {
        type: 'process_local',
        reasoning: 'High-end device with good conditions, processing locally',
        metadata: {
          confidence: 0.8,
          estimatedCost: 0,
          estimatedLatency: this.estimateLatency('process_local', summary),
          privacyLevel: 'high'
        }
      };
    }

    // Low battery or poor network -> cloud processing
    if (deviceCapabilities.batteryLevel < 30 || 
        deviceCapabilities.networkQuality === 'poor') {
      return {
        type: 'process_cloud',
        reasoning: 'Low battery or poor network, using cloud processing',
        metadata: {
          confidence: 0.7,
          estimatedCost: this.estimateCost('process_cloud', summary),
          estimatedLatency: this.estimateLatency('process_cloud', summary),
          privacyLevel: 'medium'
        }
      };
    }

    // Default to hybrid approach
    return {
      type: 'hybrid',
      reasoning: 'Balanced approach using hybrid processing',
      metadata: {
        confidence: 0.75,
        estimatedCost: this.estimateCost('hybrid', summary),
        estimatedLatency: this.estimateLatency('hybrid', summary),
        privacyLevel: 'medium'
      }
    };
  }

  private getFallbackStrategy(summary: CompressedSummary): OrchestratorStrategy {
    return {
      type: 'process_cloud',
      reasoning: 'Fallback strategy due to policy evaluation error',
      metadata: {
        confidence: 0.5,
        estimatedCost: this.estimateCost('process_cloud', summary),
        estimatedLatency: this.estimateLatency('process_cloud', summary),
        privacyLevel: 'low'
      }
    };
  }

  private estimateCost(strategy: string, summary: CompressedSummary): number {
    const baseCosts = {
      'process_local': 0,
      'process_cloud': 0.01,
      'hybrid': 0.005,
      'cache_result': 0,
      'defer': 0
    };

    const baseCost = baseCosts[strategy as keyof typeof baseCosts] || 0.01;
    const contextMultiplier = Math.max(1, summary.compressedContext.length / 1000);
    
    return baseCost * contextMultiplier;
  }

  private estimateLatency(strategy: string, summary: CompressedSummary): number {
    const baseLatencies = {
      'process_local': 200,
      'process_cloud': 800,
      'hybrid': 500,
      'cache_result': 50,
      'defer': 0
    };

    const baseLatency = baseLatencies[strategy as keyof typeof baseLatencies] || 500;
    const contextMultiplier = Math.max(1, summary.compressedContext.length / 500);
    
    return baseLatency * contextMultiplier;
  }

  private getPrivacyLevel(strategy: string): 'low' | 'medium' | 'high' {
    const privacyLevels = {
      'process_local': 'high',
      'process_cloud': 'low',
      'hybrid': 'medium',
      'cache_result': 'medium',
      'defer': 'high'
    };

    return privacyLevels[strategy as keyof typeof privacyLevels] || 'medium';
  }

  private generateCacheKey(summary: CompressedSummary, suffix: string = ''): string {
    const keyParts = [
      summary.taskType,
      summary.deviceCapabilities.processingPower,
      summary.deviceCapabilities.networkQuality,
      Math.floor(summary.deviceCapabilities.batteryLevel / 10) * 10, // Round to nearest 10
      suffix
    ];

    return keyParts.filter(Boolean).join('_');
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 100 + (minutes || 0);
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, value] of this.strategyCache.entries()) {
        if (now - value.timestamp > this.CACHE_TTL) {
          expiredKeys.push(key);
        }
      }

      for (const key of expiredKeys) {
        this.strategyCache.delete(key);
      }

      if (expiredKeys.length > 0) {
        console.log(`🧹 Cleaned up ${expiredKeys.length} expired strategy cache entries`);
      }
    }, this.CACHE_TTL);
  }
}