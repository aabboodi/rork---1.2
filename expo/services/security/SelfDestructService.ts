import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import { 
  SelfDestructMessage, 
  SelfDestructTimer, 
  ExpirationPolicy, 
  MessageView, 
  DestructionProof,
  TimerCondition,
  TimerSecurityEvent,
  TimerForensicEvent,
  SecureWipeDetails,
  DestructionComplianceRecord,
  ForensicDestructionEvidence,
  GeofenceArea,
  EmergencyExtension
} from '@/types';
import DeviceSecurityService from './DeviceSecurityService';
import BiometricAuthService from './BiometricAuthService';
import ForensicsService from './ForensicsService';
import CentralizedLoggingService from './CentralizedLoggingService';

interface SelfDestructConfig {
  enabled: boolean;
  defaultDuration: number;
  maxDuration: number;
  minDuration: number;
  allowUserOverride: boolean;
  requireBiometricForSensitive: boolean;
  enableForensicLogging: boolean;
  enableSecureWipe: boolean;
  enableGeofencing: boolean;
  enableDeviceBinding: boolean;
  warningIntervals: number[]; // seconds before expiration
  emergencyExtensionEnabled: boolean;
  complianceMode: boolean;
}

class SelfDestructService {
  private static instance: SelfDestructService;
  private config: SelfDestructConfig;
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private messageStore: Map<string, SelfDestructMessage> = new Map();
  private timerStore: Map<string, SelfDestructTimer> = new Map();
  private warningTimers: Map<string, NodeJS.Timeout[]> = new Map();
  private isInitialized = false;

  private constructor() {
    this.config = {
      enabled: true,
      defaultDuration: 24 * 60 * 60 * 1000, // 24 hours
      maxDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
      minDuration: 60 * 1000, // 1 minute
      allowUserOverride: true,
      requireBiometricForSensitive: true,
      enableForensicLogging: true,
      enableSecureWipe: true,
      enableGeofencing: false,
      enableDeviceBinding: true,
      warningIntervals: [300, 60, 30, 10, 5], // 5min, 1min, 30s, 10s, 5s
      emergencyExtensionEnabled: true,
      complianceMode: true
    };
  }

  static getInstance(): SelfDestructService {
    if (!SelfDestructService.instance) {
      SelfDestructService.instance = new SelfDestructService();
    }
    return SelfDestructService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load configuration
      await this.loadConfiguration();
      
      // Restore active timers
      await this.restoreActiveTimers();
      
      // Initialize device security
      await DeviceSecurityService.initialize();
      
      // Start background monitoring
      this.startBackgroundMonitoring();
      
      this.isInitialized = true;
      
      await CentralizedLoggingService.log({
        level: 'info',
        message: 'Self-destruct service initialized',
        category: 'security',
        metadata: {
          activeTimers: this.activeTimers.size,
          config: this.config
        }
      });
    } catch (error) {
      await CentralizedLoggingService.log({
        level: 'error',
        message: 'Failed to initialize self-destruct service',
        category: 'security',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async createSelfDestructMessage(
    messageId: string,
    chatId: string,
    senderId: string,
    content: string,
    policy: ExpirationPolicy,
    securityLevel: 'standard' | 'high' | 'maximum' = 'standard'
  ): Promise<SelfDestructMessage> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const now = Date.now();
    const duration = policy.duration || this.config.defaultDuration;
    const expiresAt = now + duration;

    // Validate policy
    await this.validateExpirationPolicy(policy);

    // Create timer
    const timer = await this.createTimer(messageId, duration, policy);

    // Create message
    const message: SelfDestructMessage = {
      messageId,
      chatId,
      senderId,
      expirationPolicy: policy,
      createdAt: now,
      expiresAt,
      viewedBy: [],
      isExpired: false,
      destructionMethod: this.getDestructionMethod(securityLevel),
      selfDestructTimer: timer,
      securityLevel,
      forensicProtection: this.config.enableForensicLogging,
      antiScreenshotProtection: securityLevel !== 'standard',
      deviceBindingRequired: this.config.enableDeviceBinding && securityLevel === 'maximum'
    };

    // Store message
    this.messageStore.set(messageId, message);
    await this.persistMessage(message);

    // Start timer
    await this.startTimer(timer);

    // Log creation
    await this.logForensicEvent(messageId, {
      eventType: 'access',
      userId: senderId,
      deviceId: await DeviceSecurityService.getDeviceId(),
      ipAddress: await this.getCurrentIP(),
      biometricVerified: false,
      deviceFingerprint: await DeviceSecurityService.getDeviceFingerprint(),
      sessionId: await this.getCurrentSessionId(),
      evidence: {
        deviceInfo: await DeviceSecurityService.getDeviceInfo(),
        networkInfo: await this.getNetworkInfo(),
        behaviorMetrics: {}
      },
      integrityHash: await this.calculateIntegrityHash(message)
    });

    return message;
  }

  async viewMessage(messageId: string, userId: string): Promise<{ allowed: boolean; warning?: string; remainingTime?: number }> {
    const message = this.messageStore.get(messageId);
    if (!message) {
      return { allowed: false, warning: 'Message not found' };
    }

    if (message.isExpired) {
      return { allowed: false, warning: 'Message has expired' };
    }

    // Check device binding
    if (message.deviceBindingRequired) {
      const isAuthorizedDevice = await this.verifyDeviceAuthorization(messageId, userId);
      if (!isAuthorizedDevice) {
        await this.triggerSecurityEvent(messageId, {
          eventType: 'unauthorized_device',
          severity: 'high',
          details: { userId, deviceId: await DeviceSecurityService.getDeviceId() }
        });
        return { allowed: false, warning: 'Unauthorized device' };
      }
    }

    // Check biometric requirement
    if (message.expirationPolicy.requireBiometricToView) {
      const biometricResult = await BiometricAuthService.authenticate('View sensitive message');
      if (!biometricResult.success) {
        await this.triggerSecurityEvent(messageId, {
          eventType: 'suspicious_access',
          severity: 'medium',
          details: { userId, reason: 'Biometric authentication failed' }
        });
        return { allowed: false, warning: 'Biometric authentication required' };
      }
    }

    // Check geofencing
    if (message.expirationPolicy.allowedLocations?.length) {
      const locationAllowed = await this.checkGeofencing(message.expirationPolicy.allowedLocations);
      if (!locationAllowed) {
        return { allowed: false, warning: 'Location not authorized' };
      }
    }

    // Check view count
    if (message.expirationPolicy.maxViews) {
      const userViews = message.viewedBy.filter(v => v.userId === userId).length;
      if (userViews >= message.expirationPolicy.maxViews) {
        await this.destroyMessage(messageId, 'View limit exceeded');
        return { allowed: false, warning: 'View limit exceeded' };
      }
    }

    // Record view
    await this.recordView(messageId, userId);

    // Check conditions for early destruction
    await this.checkTimerConditions(messageId);

    const timer = message.selfDestructTimer;
    const remainingTime = timer ? timer.remainingTime : 0;

    return { 
      allowed: true, 
      remainingTime,
      warning: remainingTime < 60000 ? 'Message will self-destruct soon' : undefined
    };
  }

  async extendTimer(messageId: string, extensionDuration: number, reason: string, userId: string): Promise<boolean> {
    const message = this.messageStore.get(messageId);
    if (!message || !message.selfDestructTimer) {
      return false;
    }

    const timer = message.selfDestructTimer;
    
    // Check if emergency extension is enabled
    if (!message.expirationPolicy.emergencyExtension?.enabled) {
      return false;
    }

    const extension = message.expirationPolicy.emergencyExtension;
    
    // Check max extensions
    const extensionCount = timer.securityEvents.filter(e => e.eventType === 'timer_extended').length;
    if (extensionCount >= (extension.maxExtensions || 1)) {
      return false;
    }

    // Check extension duration limit
    if (extensionDuration > (extension.extensionDuration || 3600000)) { // 1 hour default
      return false;
    }

    // Require approval if configured
    if (extension.requiresApproval && extension.approverIds?.length) {
      // In a real implementation, this would trigger an approval workflow
      await this.requestExtensionApproval(messageId, extensionDuration, reason, userId);
      return false; // Pending approval
    }

    // Extend timer
    timer.remainingTime += extensionDuration;
    timer.duration += extensionDuration;
    message.expiresAt += extensionDuration;

    // Log extension
    await this.triggerSecurityEvent(messageId, {
      eventType: 'timer_extended',
      severity: 'medium',
      details: { 
        extensionDuration, 
        reason, 
        userId,
        newExpirationTime: message.expiresAt
      }
    });

    // Update stored data
    await this.persistMessage(message);
    await this.persistTimer(timer);

    // Restart timer with new duration
    await this.restartTimer(timer);

    return true;
  }

  async pauseTimer(messageId: string, reason: string, userId: string): Promise<boolean> {
    const timer = this.timerStore.get(messageId);
    if (!timer || timer.isPaused) {
      return false;
    }

    timer.isPaused = true;
    timer.pauseReason = reason as any;
    timer.pausedAt = Date.now();

    // Stop active timer
    const activeTimer = this.activeTimers.get(messageId);
    if (activeTimer) {
      clearTimeout(activeTimer);
      this.activeTimers.delete(messageId);
    }

    // Stop warning timers
    const warningTimers = this.warningTimers.get(messageId);
    if (warningTimers) {
      warningTimers.forEach(timer => clearTimeout(timer));
      this.warningTimers.delete(messageId);
    }

    await this.triggerSecurityEvent(messageId, {
      eventType: 'timer_paused',
      severity: 'low',
      details: { reason, userId }
    });

    await this.persistTimer(timer);
    return true;
  }

  async resumeTimer(messageId: string, userId: string): Promise<boolean> {
    const timer = this.timerStore.get(messageId);
    if (!timer || !timer.isPaused) {
      return false;
    }

    const pauseDuration = Date.now() - (timer.pausedAt || 0);
    
    timer.isPaused = false;
    timer.resumedAt = Date.now();
    timer.pauseReason = undefined;
    timer.pausedAt = undefined;

    await this.triggerSecurityEvent(messageId, {
      eventType: 'timer_resumed',
      severity: 'low',
      details: { userId, pauseDuration }
    });

    // Restart timer
    await this.startTimer(timer);
    await this.persistTimer(timer);

    return true;
  }

  async destroyMessage(messageId: string, reason: string = 'Timer expired'): Promise<DestructionProof> {
    const message = this.messageStore.get(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const timer = message.selfDestructTimer;
    if (timer) {
      timer.destructionExecutedAt = Date.now();
      timer.destructionScheduled = false;
    }

    // Stop all timers
    this.stopAllTimers(messageId);

    // Create destruction proof
    const proof = await this.createDestructionProof(message, reason);

    // Perform secure destruction
    await this.performSecureDestruction(message);

    // Mark as expired
    message.isExpired = true;
    message.destructionProof = proof;

    // Log destruction
    await this.logForensicEvent(messageId, {
      eventType: 'destruction',
      userId: 'system',
      deviceId: await DeviceSecurityService.getDeviceId(),
      ipAddress: await this.getCurrentIP(),
      biometricVerified: false,
      deviceFingerprint: await DeviceSecurityService.getDeviceFingerprint(),
      sessionId: await this.getCurrentSessionId(),
      evidence: {
        deviceInfo: await DeviceSecurityService.getDeviceInfo(),
        networkInfo: await this.getNetworkInfo(),
        behaviorMetrics: { destructionReason: reason }
      },
      integrityHash: await this.calculateIntegrityHash(message)
    });

    // Clean up
    this.messageStore.delete(messageId);
    this.timerStore.delete(messageId);
    await this.removePersistedMessage(messageId);

    await CentralizedLoggingService.log({
      level: 'info',
      message: 'Message destroyed',
      category: 'security',
      metadata: {
        messageId,
        reason,
        destructionMethod: message.destructionMethod,
        securityLevel: message.securityLevel
      }
    });

    return proof;
  }

  async getActiveTimers(): Promise<SelfDestructTimer[]> {
    return Array.from(this.timerStore.values()).filter(timer => timer.isActive && !timer.isPaused);
  }

  async getMessageStatus(messageId: string): Promise<{
    exists: boolean;
    isExpired: boolean;
    remainingTime?: number;
    viewCount: number;
    securityLevel: string;
    lastViewed?: number;
  } | null> {
    const message = this.messageStore.get(messageId);
    if (!message) {
      return null;
    }

    const timer = message.selfDestructTimer;
    const remainingTime = timer && timer.isActive ? timer.remainingTime : 0;

    return {
      exists: true,
      isExpired: message.isExpired,
      remainingTime,
      viewCount: message.viewedBy.length,
      securityLevel: message.securityLevel,
      lastViewed: message.viewedBy.length > 0 ? 
        Math.max(...message.viewedBy.map(v => v.viewedAt)) : undefined
    };
  }

  // Private methods

  private async createTimer(messageId: string, duration: number, policy: ExpirationPolicy): Promise<SelfDestructTimer> {
    const timer: SelfDestructTimer = {
      timerId: await Crypto.randomUUID(),
      messageId,
      startTime: Date.now(),
      duration,
      remainingTime: duration,
      isActive: false,
      isPaused: false,
      warningIntervals: this.config.warningIntervals,
      destructionScheduled: false,
      timerType: 'countdown',
      conditions: this.createTimerConditions(policy),
      securityEvents: [],
      forensicLog: []
    };

    this.timerStore.set(messageId, timer);
    return timer;
  }

  private async startTimer(timer: SelfDestructTimer): Promise<void> {
    timer.isActive = true;
    timer.startTime = Date.now();

    // Main destruction timer
    const timeout = setTimeout(async () => {
      await this.destroyMessage(timer.messageId, 'Timer expired');
    }, timer.remainingTime);

    this.activeTimers.set(timer.messageId, timeout);

    // Warning timers
    this.setupWarningTimers(timer);

    await this.persistTimer(timer);
  }

  private async restartTimer(timer: SelfDestructTimer): Promise<void> {
    this.stopAllTimers(timer.messageId);
    await this.startTimer(timer);
  }

  private stopAllTimers(messageId: string): void {
    // Stop main timer
    const activeTimer = this.activeTimers.get(messageId);
    if (activeTimer) {
      clearTimeout(activeTimer);
      this.activeTimers.delete(messageId);
    }

    // Stop warning timers
    const warningTimers = this.warningTimers.get(messageId);
    if (warningTimers) {
      warningTimers.forEach(timer => clearTimeout(timer));
      this.warningTimers.delete(messageId);
    }
  }

  private setupWarningTimers(timer: SelfDestructTimer): void {
    const warningTimers: NodeJS.Timeout[] = [];

    timer.warningIntervals?.forEach(interval => {
      const warningTime = timer.remainingTime - (interval * 1000);
      if (warningTime > 0) {
        const warningTimeout = setTimeout(async () => {
          await this.showDestructionWarning(timer.messageId, interval);
          timer.lastWarningShown = Date.now();
        }, warningTime);
        
        warningTimers.push(warningTimeout);
      }
    });

    this.warningTimers.set(timer.messageId, warningTimers);
  }

  private async showDestructionWarning(messageId: string, secondsRemaining: number): Promise<void> {
    // In a real implementation, this would show a notification or in-app warning
    await CentralizedLoggingService.log({
      level: 'warn',
      message: `Message will self-destruct in ${secondsRemaining} seconds`,
      category: 'security',
      metadata: { messageId, secondsRemaining }
    });
  }

  private createTimerConditions(policy: ExpirationPolicy): TimerCondition[] {
    const conditions: TimerCondition[] = [];

    if (policy.maxViews) {
      conditions.push({
        type: 'view_count',
        threshold: policy.maxViews,
        description: `Maximum ${policy.maxViews} views allowed`,
        isMet: false
      });
    }

    if (policy.requireDeviceVerification) {
      conditions.push({
        type: 'device_change',
        description: 'Device verification required',
        isMet: false
      });
    }

    if (policy.allowedLocations?.length) {
      conditions.push({
        type: 'location_change',
        description: 'Location restrictions apply',
        isMet: false
      });
    }

    return conditions;
  }

  private async checkTimerConditions(messageId: string): Promise<void> {
    const timer = this.timerStore.get(messageId);
    if (!timer) return;

    for (const condition of timer.conditions || []) {
      if (condition.isMet) continue;

      let shouldTrigger = false;

      switch (condition.type) {
        case 'view_count':
          const message = this.messageStore.get(messageId);
          if (message && condition.threshold && message.viewedBy.length >= condition.threshold) {
            shouldTrigger = true;
          }
          break;
        // Add other condition checks
      }

      if (shouldTrigger) {
        condition.isMet = true;
        condition.metAt = Date.now();
        
        if (condition.type === 'view_count') {
          await this.destroyMessage(messageId, 'View limit exceeded');
          return;
        }
      }
    }
  }

  private async recordView(messageId: string, userId: string): Promise<void> {
    const message = this.messageStore.get(messageId);
    if (!message) return;

    const view: MessageView = {
      viewId: await Crypto.randomUUID(),
      userId,
      viewedAt: Date.now(),
      deviceId: await DeviceSecurityService.getDeviceId(),
      deviceFingerprint: await DeviceSecurityService.getDeviceFingerprint(),
      ipAddress: await this.getCurrentIP(),
      biometricVerified: false, // Would be set based on actual biometric check
      sessionId: await this.getCurrentSessionId(),
      viewMethod: 'normal',
      securityFlags: [],
      suspiciousActivity: false,
      interactionMetrics: {
        scrollEvents: 0,
        tapEvents: 0,
        longPressEvents: 0,
        focusTime: 0,
        backgroundTime: 0
      }
    };

    message.viewedBy.push(view);
    await this.persistMessage(message);

    // Log forensic event
    await this.logForensicEvent(messageId, {
      eventType: 'view',
      userId,
      deviceId: view.deviceId,
      ipAddress: view.ipAddress,
      biometricVerified: view.biometricVerified,
      deviceFingerprint: view.deviceFingerprint,
      sessionId: view.sessionId,
      evidence: {
        deviceInfo: await DeviceSecurityService.getDeviceInfo(),
        networkInfo: await this.getNetworkInfo(),
        behaviorMetrics: view.interactionMetrics
      },
      integrityHash: await this.calculateIntegrityHash(message)
    });
  }

  private async createDestructionProof(message: SelfDestructMessage, reason: string): Promise<DestructionProof> {
    const proof: DestructionProof = {
      proofId: await Crypto.randomUUID(),
      messageId: message.messageId,
      destructionTimestamp: Date.now(),
      method: message.destructionMethod,
      cryptographicProof: await this.generateCryptographicProof(message),
      auditTrail: [],
      verificationHash: await this.calculateIntegrityHash(message),
      complianceRecord: await this.createComplianceRecord(message),
      forensicEvidence: await this.createForensicEvidence(message)
    };

    if (message.destructionMethod === 'secure_wipe') {
      proof.secureWipeDetails = await this.performSecureWipe(message);
    }

    return proof;
  }

  private async performSecureDestruction(message: SelfDestructMessage): Promise<void> {
    switch (message.destructionMethod) {
      case 'delete':
        await this.performSimpleDelete(message);
        break;
      case 'redact':
        await this.performRedaction(message);
        break;
      case 'encrypt_permanently':
        await this.performPermanentEncryption(message);
        break;
      case 'secure_wipe':
        await this.performSecureWipe(message);
        break;
    }
  }

  private async performSimpleDelete(message: SelfDestructMessage): Promise<void> {
    // Remove from all storage locations
    await AsyncStorage.removeItem(`self_destruct_message_${message.messageId}`);
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(`self_destruct_message_${message.messageId}`);
    }
  }

  private async performRedaction(message: SelfDestructMessage): Promise<void> {
    // Replace content with redacted placeholder
    const redactedMessage = { ...message };
    // In a real implementation, this would redact the actual message content
    await this.persistMessage(redactedMessage);
  }

  private async performPermanentEncryption(message: SelfDestructMessage): Promise<void> {
    // Encrypt with a key that is immediately destroyed
    const tempKey = await Crypto.randomUUID();
    // In a real implementation, this would encrypt the message and destroy the key
  }

  private async performSecureWipe(message: SelfDestructMessage): Promise<SecureWipeDetails> {
    const wipeDetails: SecureWipeDetails = {
      algorithm: 'DoD_5220.22-M',
      passes: 3,
      verificationPasses: 1,
      storageLocations: [],
      cacheLocations: [],
      backupLocations: [],
      wipeStartTime: Date.now(),
      wipeEndTime: 0,
      wipeSuccess: false,
      residualDataCheck: true,
      residualDataFound: false
    };

    try {
      // Perform multiple overwrite passes
      for (let i = 0; i < wipeDetails.passes; i++) {
        await this.overwriteData(message.messageId, i);
      }

      // Verification pass
      const residualData = await this.checkForResidualData(message.messageId);
      wipeDetails.residualDataFound = residualData;
      wipeDetails.wipeSuccess = !residualData;
      wipeDetails.wipeEndTime = Date.now();

    } catch (error) {
      wipeDetails.wipeSuccess = false;
      wipeDetails.wipeEndTime = Date.now();
    }

    return wipeDetails;
  }

  private async overwriteData(messageId: string, pass: number): Promise<void> {
    // In a real implementation, this would perform secure overwriting
    // For now, we'll simulate the process
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async checkForResidualData(messageId: string): Promise<boolean> {
    // In a real implementation, this would check for any remaining data
    return false;
  }

  private getDestructionMethod(securityLevel: 'standard' | 'high' | 'maximum'): SelfDestructMessage['destructionMethod'] {
    switch (securityLevel) {
      case 'standard':
        return 'delete';
      case 'high':
        return 'encrypt_permanently';
      case 'maximum':
        return 'secure_wipe';
      default:
        return 'delete';
    }
  }

  private async validateExpirationPolicy(policy: ExpirationPolicy): Promise<void> {
    if (policy.duration) {
      if (policy.duration < this.config.minDuration) {
        throw new Error(`Duration too short. Minimum: ${this.config.minDuration}ms`);
      }
      if (policy.duration > this.config.maxDuration) {
        throw new Error(`Duration too long. Maximum: ${this.config.maxDuration}ms`);
      }
    }
  }

  private async verifyDeviceAuthorization(messageId: string, userId: string): Promise<boolean> {
    const message = this.messageStore.get(messageId);
    if (!message?.expirationPolicy.allowedDevices?.length) {
      return true; // No device restrictions
    }

    const currentDeviceId = await DeviceSecurityService.getDeviceId();
    return message.expirationPolicy.allowedDevices.includes(currentDeviceId);
  }

  private async checkGeofencing(allowedAreas: GeofenceArea[]): Promise<boolean> {
    if (!this.config.enableGeofencing) return true;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return false;

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      return allowedAreas.some(area => {
        const distance = this.calculateDistance(latitude, longitude, area.latitude, area.longitude);
        return area.allowInside ? distance <= area.radius : distance > area.radius;
      });
    } catch (error) {
      return false;
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private async triggerSecurityEvent(messageId: string, event: Partial<TimerSecurityEvent>): Promise<void> {
    const timer = this.timerStore.get(messageId);
    if (!timer) return;

    const securityEvent: TimerSecurityEvent = {
      eventId: await Crypto.randomUUID(),
      eventType: event.eventType!,
      timestamp: Date.now(),
      deviceId: await DeviceSecurityService.getDeviceId(),
      userId: event.userId,
      details: event.details || {},
      severity: event.severity || 'medium',
      actionTaken: event.actionTaken
    };

    timer.securityEvents.push(securityEvent);
    await this.persistTimer(timer);

    await CentralizedLoggingService.log({
      level: securityEvent.severity === 'critical' ? 'error' : 'warn',
      message: `Security event: ${securityEvent.eventType}`,
      category: 'security',
      metadata: securityEvent
    });
  }

  private async logForensicEvent(messageId: string, event: Omit<TimerForensicEvent, 'eventId' | 'timestamp'>): Promise<void> {
    const timer = this.timerStore.get(messageId);
    if (!timer) return;

    const forensicEvent: TimerForensicEvent = {
      eventId: await Crypto.randomUUID(),
      timestamp: Date.now(),
      ...event
    };

    timer.forensicLog.push(forensicEvent);
    await this.persistTimer(timer);

    // Also log to forensics service
    await ForensicsService.logForensicEvent({
      eventType: 'self_destruct_activity',
      severity: 'medium',
      userId: event.userId,
      description: `Self-destruct forensic event: ${event.eventType}`,
      evidence: {
        messageId,
        forensicEvent,
        metadata: event.evidence
      },
      status: 'active',
      tags: ['self_destruct', 'message_security']
    });
  }

  private async generateCryptographicProof(message: SelfDestructMessage): Promise<string> {
    const data = JSON.stringify({
      messageId: message.messageId,
      timestamp: Date.now(),
      destructionMethod: message.destructionMethod,
      securityLevel: message.securityLevel
    });
    
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  }

  private async calculateIntegrityHash(message: SelfDestructMessage): Promise<string> {
    const data = JSON.stringify({
      messageId: message.messageId,
      chatId: message.chatId,
      senderId: message.senderId,
      createdAt: message.createdAt,
      expiresAt: message.expiresAt,
      viewCount: message.viewedBy.length
    });
    
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  }

  private async createComplianceRecord(message: SelfDestructMessage): Promise<DestructionComplianceRecord> {
    return {
      regulations: ['GDPR', 'CCPA'],
      retentionPolicyCompliant: true,
      legalHoldStatus: 'none',
      dataClassification: message.securityLevel === 'maximum' ? 'restricted' : 'confidential',
      complianceOfficerNotified: message.securityLevel === 'maximum',
      auditLogPreserved: true
    };
  }

  private async createForensicEvidence(message: SelfDestructMessage): Promise<ForensicDestructionEvidence> {
    return {
      preDestructionHash: await this.calculateIntegrityHash(message),
      postDestructionHash: '', // Would be calculated after destruction
      destructionWitnesses: ['system'],
      chainOfCustody: [],
      integrityVerification: true,
      tamperEvidence: []
    };
  }

  private async requestExtensionApproval(messageId: string, duration: number, reason: string, userId: string): Promise<void> {
    // In a real implementation, this would trigger an approval workflow
    await CentralizedLoggingService.log({
      level: 'info',
      message: 'Extension approval requested',
      category: 'security',
      metadata: { messageId, duration, reason, userId }
    });
  }

  private async getCurrentIP(): Promise<string> {
    // In a real implementation, this would get the current IP address
    return '127.0.0.1';
  }

  private async getCurrentSessionId(): Promise<string> {
    // In a real implementation, this would get the current session ID
    return await Crypto.randomUUID();
  }

  private async getNetworkInfo(): Promise<Record<string, any>> {
    return {
      type: 'wifi',
      strength: 'strong',
      encrypted: true
    };
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configStr = await AsyncStorage.getItem('self_destruct_config');
      if (configStr) {
        this.config = { ...this.config, ...JSON.parse(configStr) };
      }
    } catch (error) {
      // Use default config
    }
  }

  private async restoreActiveTimers(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const messageKeys = keys.filter(key => key.startsWith('self_destruct_message_'));
      
      for (const key of messageKeys) {
        const messageStr = await AsyncStorage.getItem(key);
        if (messageStr) {
          const message: SelfDestructMessage = JSON.parse(messageStr);
          
          if (!message.isExpired && message.expiresAt > Date.now()) {
            this.messageStore.set(message.messageId, message);
            
            if (message.selfDestructTimer) {
              const timer = message.selfDestructTimer;
              timer.remainingTime = message.expiresAt - Date.now();
              this.timerStore.set(message.messageId, timer);
              
              if (!timer.isPaused) {
                await this.startTimer(timer);
              }
            }
          } else {
            // Clean up expired messages
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      await CentralizedLoggingService.log({
        level: 'error',
        message: 'Failed to restore active timers',
        category: 'security',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private startBackgroundMonitoring(): void {
    // Monitor for suspicious activity
    setInterval(async () => {
      await this.checkForSuspiciousActivity();
    }, 30000); // Check every 30 seconds

    // Update remaining times
    setInterval(() => {
      this.updateRemainingTimes();
    }, 1000); // Update every second
  }

  private async checkForSuspiciousActivity(): Promise<void> {
    // In a real implementation, this would check for various suspicious activities
    // such as multiple failed biometric attempts, device changes, etc.
  }

  private updateRemainingTimes(): void {
    const now = Date.now();
    
    for (const [messageId, timer] of this.timerStore.entries()) {
      if (timer.isActive && !timer.isPaused) {
        const elapsed = now - timer.startTime;
        timer.remainingTime = Math.max(0, timer.duration - elapsed);
        
        if (timer.remainingTime <= 0) {
          this.destroyMessage(messageId, 'Timer expired');
        }
      }
    }
  }

  private async persistMessage(message: SelfDestructMessage): Promise<void> {
    await AsyncStorage.setItem(
      `self_destruct_message_${message.messageId}`,
      JSON.stringify(message)
    );
  }

  private async persistTimer(timer: SelfDestructTimer): Promise<void> {
    await AsyncStorage.setItem(
      `self_destruct_timer_${timer.messageId}`,
      JSON.stringify(timer)
    );
  }

  private async removePersistedMessage(messageId: string): Promise<void> {
    await AsyncStorage.removeItem(`self_destruct_message_${messageId}`);
    await AsyncStorage.removeItem(`self_destruct_timer_${messageId}`);
  }
}

export default SelfDestructService.getInstance();