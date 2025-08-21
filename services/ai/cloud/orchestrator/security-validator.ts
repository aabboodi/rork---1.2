import { CompressedSummary, SecurityValidationRequest, PolicyUpdateRequest, HealthStatus } from './types';

/**
 * Security Validator - Validates requests and signatures
 */
export class SecurityValidator {
  private isInitialized = false;
  private trustedDevices: Set<string> = new Set();
  private blacklistedDevices: Set<string> = new Set();
  private requestHistory: Map<string, number[]> = new Map();
  private readonly MAX_REQUESTS_PER_MINUTE = 100;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔒 Initializing Security Validator...');

      // Load trusted devices and security policies
      await this.loadSecurityConfiguration();

      // Start cleanup of old request history
      this.startHistoryCleanup();

      this.isInitialized = true;
      console.log('✅ Security Validator initialized');

    } catch (error) {
      console.error('❌ Security Validator initialization failed:', error);
      throw error;
    }
  }

  /**
   * Validate incoming request
   */
  async validateRequest(
    summary: CompressedSummary,
    deviceId: string,
    signature: string
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Security Validator not initialized');
    }

    try {
      // 1. Check if device is blacklisted
      if (this.blacklistedDevices.has(deviceId)) {
        throw new Error('Device is blacklisted');
      }

      // 2. Validate device ID format
      if (!this.isValidDeviceId(deviceId)) {
        throw new Error('Invalid device ID format');
      }

      // 3. Check rate limiting
      await this.checkRateLimit(deviceId);

      // 4. Validate request signature
      await this.validateSignature(summary, deviceId, signature);

      // 5. Validate request content
      this.validateRequestContent(summary);

      // 6. Record successful validation
      this.recordRequest(deviceId);

      console.log(`🔒 Request validated for device ${deviceId.substring(0, 8)}...`);

    } catch (error) {
      console.error(`❌ Request validation failed for device ${deviceId.substring(0, 8)}...:`, error);
      throw error;
    }
  }

  /**
   * Validate policy update request
   */
  async validatePolicyUpdate(
    deviceId: string,
    policies: unknown[],
    signature: string
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Security Validator not initialized');
    }

    try {
      // 1. Check if device is authorized for policy updates
      if (!this.trustedDevices.has(deviceId)) {
        throw new Error('Device not authorized for policy updates');
      }

      // 2. Validate signature for policy update
      await this.validatePolicySignature(deviceId, policies, signature);

      // 3. Validate policy structure
      this.validatePolicyStructure(policies);

      console.log(`🔒 Policy update validated for device ${deviceId.substring(0, 8)}...`);

    } catch (error) {
      console.error(`❌ Policy update validation failed for device ${deviceId.substring(0, 8)}...:`, error);
      throw error;
    }
  }

  /**
   * Add device to trusted list
   */
  async addTrustedDevice(deviceId: string): Promise<void> {
    if (!this.isValidDeviceId(deviceId)) {
      throw new Error('Invalid device ID format');
    }

    this.trustedDevices.add(deviceId);
    this.blacklistedDevices.delete(deviceId); // Remove from blacklist if present

    console.log(`🔒 Added trusted device: ${deviceId.substring(0, 8)}...`);
  }

  /**
   * Blacklist a device
   */
  async blacklistDevice(deviceId: string, reason: string): Promise<void> {
    this.blacklistedDevices.add(deviceId);
    this.trustedDevices.delete(deviceId); // Remove from trusted list if present

    console.log(`🔒 Blacklisted device ${deviceId.substring(0, 8)}...: ${reason}`);
  }

  /**
   * Get security status
   */
  getStatus(): HealthStatus {
    return {
      status: this.isInitialized ? 'healthy' : 'unhealthy',
      lastCheck: Date.now(),
      details: {
        isInitialized: this.isInitialized,
        trustedDevices: this.trustedDevices.size,
        blacklistedDevices: this.blacklistedDevices.size,
        activeDevices: this.requestHistory.size,
        maxRequestsPerMinute: this.MAX_REQUESTS_PER_MINUTE
      }
    };
  }

  // Private methods

  private async loadSecurityConfiguration(): Promise<void> {
    // In a real implementation, this would load from a secure configuration store
    
    // Add some default trusted devices for demo
    const defaultTrustedDevices = [
      'device_admin_001',
      'device_admin_002',
      'device_test_001'
    ];

    for (const deviceId of defaultTrustedDevices) {
      this.trustedDevices.add(deviceId);
    }

    console.log(`🔒 Loaded ${this.trustedDevices.size} trusted devices`);
  }

  private isValidDeviceId(deviceId: string): boolean {
    // Device ID should be alphanumeric with underscores, 8-64 characters
    const deviceIdRegex = /^[a-zA-Z0-9_]{8,64}$/;
    return deviceIdRegex.test(deviceId);
  }

  private async checkRateLimit(deviceId: string): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - (60 * 1000);

    // Get request history for this device
    const history = this.requestHistory.get(deviceId) || [];

    // Filter to only recent requests
    const recentRequests = history.filter(timestamp => timestamp > oneMinuteAgo);

    // Check if rate limit exceeded
    if (recentRequests.length >= this.MAX_REQUESTS_PER_MINUTE) {
      throw new Error(`Rate limit exceeded: ${recentRequests.length} requests in the last minute`);
    }
  }

  private async validateSignature(
    summary: CompressedSummary,
    deviceId: string,
    signature: string
  ): Promise<void> {
    // In a real implementation, this would use proper cryptographic signature validation
    // For demo purposes, we'll do basic validation

    if (!signature || signature.length < 10) {
      throw new Error('Invalid signature format');
    }

    // Simulate signature validation
    const expectedSignaturePrefix = `sig_${deviceId.substring(0, 8)}`;
    if (!signature.startsWith(expectedSignaturePrefix)) {
      throw new Error('Signature validation failed');
    }

    // Additional validation based on request content
    const contentHash = this.generateContentHash(summary);
    if (!signature.includes(contentHash.substring(0, 8))) {
      throw new Error('Content signature mismatch');
    }
  }

  private async validatePolicySignature(
    deviceId: string,
    policies: unknown[],
    signature: string
  ): Promise<void> {
    // Policy updates require stronger signature validation
    if (!signature || signature.length < 20) {
      throw new Error('Invalid policy signature format');
    }

    // Simulate policy signature validation
    const expectedPrefix = `policy_sig_${deviceId.substring(0, 8)}`;
    if (!signature.startsWith(expectedPrefix)) {
      throw new Error('Policy signature validation failed');
    }
  }

  private validateRequestContent(summary: CompressedSummary): void {
    // Validate required fields
    if (!summary.taskId || !summary.taskType || !summary.compressedContext) {
      throw new Error('Missing required fields in request');
    }

    // Validate task type
    const validTaskTypes = ['chat', 'classification', 'moderation', 'recommendation'];
    if (!validTaskTypes.includes(summary.taskType)) {
      throw new Error(`Invalid task type: ${summary.taskType}`);
    }

    // Validate content size limits
    if (summary.compressedContext.length > 50000) { // 50KB limit
      throw new Error('Compressed context exceeds size limit');
    }

    if (summary.query.length > 10000) { // 10KB limit
      throw new Error('Query exceeds size limit');
    }

    // Validate metadata
    if (!summary.metadata || typeof summary.metadata.timestamp !== 'number') {
      throw new Error('Invalid metadata');
    }

    // Check timestamp is not too old or in the future
    const now = Date.now();
    const requestAge = now - summary.metadata.timestamp;
    
    if (requestAge > 300000) { // 5 minutes
      throw new Error('Request timestamp too old');
    }
    
    if (requestAge < -60000) { // 1 minute in the future
      throw new Error('Request timestamp in the future');
    }
  }

  private validatePolicyStructure(policies: unknown[]): void {
    if (!Array.isArray(policies)) {
      throw new Error('Policies must be an array');
    }

    if (policies.length > 50) { // Reasonable limit
      throw new Error('Too many policies in update');
    }

    // Basic structure validation for each policy
    for (const policy of policies) {
      if (typeof policy !== 'object' || policy === null) {
        throw new Error('Invalid policy structure');
      }

      const p = policy as Record<string, unknown>;
      if (!p.id || !p.version || !p.name) {
        throw new Error('Policy missing required fields');
      }
    }
  }

  private recordRequest(deviceId: string): void {
    const now = Date.now();
    const history = this.requestHistory.get(deviceId) || [];
    
    history.push(now);
    this.requestHistory.set(deviceId, history);
  }

  private generateContentHash(summary: CompressedSummary): string {
    // Simple hash generation for demo purposes
    const content = JSON.stringify({
      taskType: summary.taskType,
      context: summary.compressedContext.substring(0, 100),
      query: summary.query.substring(0, 100)
    });

    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  private startHistoryCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      let totalCleaned = 0;

      for (const [deviceId, history] of this.requestHistory.entries()) {
        const recentHistory = history.filter(timestamp => timestamp > oneHourAgo);
        
        if (recentHistory.length === 0) {
          this.requestHistory.delete(deviceId);
        } else {
          this.requestHistory.set(deviceId, recentHistory);
        }
        
        totalCleaned += history.length - recentHistory.length;
      }

      if (totalCleaned > 0) {
        console.log(`🧹 Cleaned up ${totalCleaned} old request history entries`);
      }
    }, 300000); // Every 5 minutes
  }
}