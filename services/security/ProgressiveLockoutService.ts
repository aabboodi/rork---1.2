import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import CryptoService from './CryptoService';
import DeviceSecurityService from './DeviceSecurityService';

interface LockoutAttempt {
  timestamp: number;
  userId?: string;
  deviceId: string;
  attemptType: 'login' | 'biometric' | 'otp' | 'password';
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

interface LockoutPolicy {
  maxAttempts: number;
  lockoutDuration: number; // in milliseconds
  escalationFactor: number; // multiplier for subsequent lockouts
  resetPeriod: number; // time after which attempts are reset
}

interface LockoutState {
  userId?: string;
  deviceId: string;
  failedAttempts: number;
  lockoutUntil: number;
  lockoutLevel: number;
  totalLockouts: number;
  lastAttempt: number;
  attempts: LockoutAttempt[];
}

interface LockoutEvent {
  type: 'attempt_failed' | 'lockout_triggered' | 'lockout_escalated' | 'lockout_cleared' | 'policy_violation';
  timestamp: number;
  userId?: string;
  deviceId: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  lockoutLevel: number;
}

class ProgressiveLockoutService {
  private static instance: ProgressiveLockoutService;
  private cryptoService: CryptoService;
  private deviceSecurity: DeviceSecurityService;
  private lockoutStates: Map<string, LockoutState> = new Map();
  private lockoutEvents: LockoutEvent[] = [];
  private isInitialized = false;

  // CRITICAL: Progressive lockout policies
  private readonly DEFAULT_POLICIES: Record<string, LockoutPolicy> = {
    login: {
      maxAttempts: 3,
      lockoutDuration: 30 * 1000, // 30 seconds
      escalationFactor: 2,
      resetPeriod: 15 * 60 * 1000 // 15 minutes
    },
    biometric: {
      maxAttempts: 5,
      lockoutDuration: 60 * 1000, // 1 minute
      escalationFactor: 1.5,
      resetPeriod: 10 * 60 * 1000 // 10 minutes
    },
    otp: {
      maxAttempts: 3,
      lockoutDuration: 2 * 60 * 1000, // 2 minutes
      escalationFactor: 3,
      resetPeriod: 30 * 60 * 1000 // 30 minutes
    },
    password: {
      maxAttempts: 5,
      lockoutDuration: 5 * 60 * 1000, // 5 minutes
      escalationFactor: 2,
      resetPeriod: 60 * 60 * 1000 // 1 hour
    }
  };

  private readonly MAX_LOCKOUT_LEVEL = 5;
  private readonly MAX_LOCKOUT_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  private constructor() {
    this.cryptoService = CryptoService.getInstance();
    this.deviceSecurity = DeviceSecurityService.getInstance();
    this.startCleanupScheduler();
  }

  static getInstance(): ProgressiveLockoutService {
    if (!ProgressiveLockoutService.instance) {
      ProgressiveLockoutService.instance = new ProgressiveLockoutService();
    }
    return ProgressiveLockoutService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadLockoutStates();
      await this.performInitialCleanup();
      
      this.isInitialized = true;
      console.log('🔒 Progressive Lockout Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Progressive Lockout Service:', error);
      throw error;
    }
  }

  // CRITICAL: Record authentication attempt
  async recordAttempt(
    attemptType: LockoutAttempt['attemptType'],
    success: boolean,
    userId?: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<{
    allowed: boolean;
    lockoutUntil?: number;
    remainingAttempts?: number;
    lockoutLevel?: number;
  }> {
    try {
      const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
      const deviceId = deviceFingerprint?.securityHash || 'unknown-device';
      const lockoutKey = this.generateLockoutKey(attemptType, userId, deviceId);
      
      const attempt: LockoutAttempt = {
        timestamp: Date.now(),
        userId,
        deviceId,
        attemptType,
        success,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent || Platform.OS
      };

      let lockoutState = this.lockoutStates.get(lockoutKey);
      if (!lockoutState) {
        lockoutState = {
          userId,
          deviceId,
          failedAttempts: 0,
          lockoutUntil: 0,
          lockoutLevel: 0,
          totalLockouts: 0,
          lastAttempt: 0,
          attempts: []
        };
      }

      // Check if currently locked out
      if (lockoutState.lockoutUntil > Date.now()) {
        this.logLockoutEvent({
          type: 'policy_violation',
          timestamp: Date.now(),
          userId,
          deviceId,
          details: {
            attemptType,
            lockoutUntil: lockoutState.lockoutUntil,
            remainingTime: lockoutState.lockoutUntil - Date.now()
          },
          severity: 'high',
          lockoutLevel: lockoutState.lockoutLevel
        });

        return {
          allowed: false,
          lockoutUntil: lockoutState.lockoutUntil,
          lockoutLevel: lockoutState.lockoutLevel
        };
      }

      // Add attempt to history
      lockoutState.attempts.push(attempt);
      lockoutState.lastAttempt = Date.now();

      // Keep only recent attempts
      const policy = this.DEFAULT_POLICIES[attemptType];
      const cutoffTime = Date.now() - policy.resetPeriod;
      lockoutState.attempts = lockoutState.attempts.filter(a => a.timestamp > cutoffTime);

      if (success) {
        // Reset failed attempts on success
        lockoutState.failedAttempts = 0;
        lockoutState.lockoutLevel = 0;
        
        this.lockoutStates.set(lockoutKey, lockoutState);
        await this.saveLockoutStates();

        return {
          allowed: true,
          remainingAttempts: policy.maxAttempts
        };
      } else {
        // Count recent failed attempts
        const recentFailedAttempts = lockoutState.attempts.filter(
          a => !a.success && a.timestamp > cutoffTime
        ).length;

        lockoutState.failedAttempts = recentFailedAttempts;

        if (recentFailedAttempts >= policy.maxAttempts) {
          // Trigger progressive lockout
          const lockoutResult = await this.triggerProgressiveLockout(
            lockoutState,
            attemptType,
            policy
          );

          this.lockoutStates.set(lockoutKey, lockoutState);
          await this.saveLockoutStates();

          return lockoutResult;
        } else {
          // Still within allowed attempts
          this.lockoutStates.set(lockoutKey, lockoutState);
          await this.saveLockoutStates();

          this.logLockoutEvent({
            type: 'attempt_failed',
            timestamp: Date.now(),
            userId,
            deviceId,
            details: {
              attemptType,
              failedAttempts: recentFailedAttempts,
              maxAttempts: policy.maxAttempts,
              remainingAttempts: policy.maxAttempts - recentFailedAttempts
            },
            severity: recentFailedAttempts >= policy.maxAttempts - 1 ? 'high' : 'medium',
            lockoutLevel: lockoutState.lockoutLevel
          });

          return {
            allowed: true,
            remainingAttempts: policy.maxAttempts - recentFailedAttempts
          };
        }
      }
    } catch (error) {
      console.error('❌ Failed to record attempt:', error);
      return {
        allowed: false,
        lockoutUntil: Date.now() + this.DEFAULT_POLICIES[attemptType].lockoutDuration
      };
    }
  }

  // CRITICAL: Trigger progressive lockout
  private async triggerProgressiveLockout(
    lockoutState: LockoutState,
    attemptType: string,
    policy: LockoutPolicy
  ): Promise<{
    allowed: boolean;
    lockoutUntil: number;
    lockoutLevel: number;
  }> {
    try {
      // Escalate lockout level
      lockoutState.lockoutLevel = Math.min(
        lockoutState.lockoutLevel + 1,
        this.MAX_LOCKOUT_LEVEL
      );
      lockoutState.totalLockouts++;

      // Calculate progressive lockout duration
      const baseDuration = policy.lockoutDuration;
      const escalatedDuration = baseDuration * Math.pow(
        policy.escalationFactor,
        lockoutState.lockoutLevel - 1
      );
      
      const lockoutDuration = Math.min(escalatedDuration, this.MAX_LOCKOUT_DURATION);
      lockoutState.lockoutUntil = Date.now() + lockoutDuration;

      const eventType = lockoutState.lockoutLevel > 1 ? 'lockout_escalated' : 'lockout_triggered';
      const severity = lockoutState.lockoutLevel >= 3 ? 'critical' : 'high';

      this.logLockoutEvent({
        type: eventType,
        timestamp: Date.now(),
        userId: lockoutState.userId,
        deviceId: lockoutState.deviceId,
        details: {
          attemptType,
          lockoutDuration,
          lockoutLevel: lockoutState.lockoutLevel,
          totalLockouts: lockoutState.totalLockouts,
          escalationFactor: policy.escalationFactor
        },
        severity,
        lockoutLevel: lockoutState.lockoutLevel
      });

      console.log(`🔒 Progressive lockout triggered: Level ${lockoutState.lockoutLevel}, Duration: ${Math.round(lockoutDuration / 1000)}s`);

      return {
        allowed: false,
        lockoutUntil: lockoutState.lockoutUntil,
        lockoutLevel: lockoutState.lockoutLevel
      };
    } catch (error) {
      console.error('❌ Failed to trigger progressive lockout:', error);
      throw error;
    }
  }

  // Check if user/device is currently locked out
  async isLockedOut(
    attemptType: LockoutAttempt['attemptType'],
    userId?: string
  ): Promise<{
    lockedOut: boolean;
    lockoutUntil?: number;
    remainingTime?: number;
    lockoutLevel?: number;
  }> {
    try {
      const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
      const deviceId = deviceFingerprint?.securityHash || 'unknown-device';
      const lockoutKey = this.generateLockoutKey(attemptType, userId, deviceId);
      
      const lockoutState = this.lockoutStates.get(lockoutKey);
      if (!lockoutState) {
        return { lockedOut: false };
      }

      const now = Date.now();
      if (lockoutState.lockoutUntil > now) {
        return {
          lockedOut: true,
          lockoutUntil: lockoutState.lockoutUntil,
          remainingTime: lockoutState.lockoutUntil - now,
          lockoutLevel: lockoutState.lockoutLevel
        };
      }

      return { lockedOut: false };
    } catch (error) {
      console.error('❌ Failed to check lockout status:', error);
      return { lockedOut: false };
    }
  }

  // Get remaining attempts before lockout
  async getRemainingAttempts(
    attemptType: LockoutAttempt['attemptType'],
    userId?: string
  ): Promise<number> {
    try {
      const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
      const deviceId = deviceFingerprint?.securityHash || 'unknown-device';
      const lockoutKey = this.generateLockoutKey(attemptType, userId, deviceId);
      
      const lockoutState = this.lockoutStates.get(lockoutKey);
      if (!lockoutState) {
        return this.DEFAULT_POLICIES[attemptType].maxAttempts;
      }

      const policy = this.DEFAULT_POLICIES[attemptType];
      const cutoffTime = Date.now() - policy.resetPeriod;
      const recentFailedAttempts = lockoutState.attempts.filter(
        a => !a.success && a.timestamp > cutoffTime
      ).length;

      return Math.max(0, policy.maxAttempts - recentFailedAttempts);
    } catch (error) {
      console.error('❌ Failed to get remaining attempts:', error);
      return 0;
    }
  }

  // Clear lockout for user/device
  async clearLockout(
    attemptType: LockoutAttempt['attemptType'],
    userId?: string,
    reason: string = 'manual_clear'
  ): Promise<boolean> {
    try {
      const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
      const deviceId = deviceFingerprint?.securityHash || 'unknown-device';
      const lockoutKey = this.generateLockoutKey(attemptType, userId, deviceId);
      
      const lockoutState = this.lockoutStates.get(lockoutKey);
      if (lockoutState) {
        lockoutState.lockoutUntil = 0;
        lockoutState.failedAttempts = 0;
        lockoutState.lockoutLevel = 0;
        lockoutState.attempts = [];
        
        this.lockoutStates.set(lockoutKey, lockoutState);
        await this.saveLockoutStates();

        this.logLockoutEvent({
          type: 'lockout_cleared',
          timestamp: Date.now(),
          userId,
          deviceId,
          details: {
            attemptType,
            reason,
            clearedLevel: lockoutState.lockoutLevel
          },
          severity: 'low',
          lockoutLevel: 0
        });

        console.log(`🔓 Lockout cleared for ${attemptType}: ${reason}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to clear lockout:', error);
      return false;
    }
  }

  // Clear all lockouts for user
  async clearAllUserLockouts(userId: string, reason: string = 'admin_action'): Promise<number> {
    try {
      let clearedCount = 0;
      
      for (const [lockoutKey, lockoutState] of this.lockoutStates) {
        if (lockoutState.userId === userId) {
          lockoutState.lockoutUntil = 0;
          lockoutState.failedAttempts = 0;
          lockoutState.lockoutLevel = 0;
          lockoutState.attempts = [];
          
          this.lockoutStates.set(lockoutKey, lockoutState);
          clearedCount++;
        }
      }

      if (clearedCount > 0) {
        await this.saveLockoutStates();
        
        this.logLockoutEvent({
          type: 'lockout_cleared',
          timestamp: Date.now(),
          userId,
          deviceId: 'multiple',
          details: {
            reason,
            clearedLockouts: clearedCount
          },
          severity: 'medium',
          lockoutLevel: 0
        });

        console.log(`🔓 Cleared ${clearedCount} lockouts for user ${userId}: ${reason}`);
      }

      return clearedCount;
    } catch (error) {
      console.error('❌ Failed to clear all user lockouts:', error);
      return 0;
    }
  }

  // Get lockout statistics
  async getLockoutStatistics(): Promise<{
    totalLockouts: number;
    activeLockouts: number;
    lockoutsByType: Record<string, number>;
    lockoutsByLevel: Record<number, number>;
    averageLockoutDuration: number;
    recentLockouts: number;
  }> {
    try {
      const now = Date.now();
      const recentThreshold = now - (24 * 60 * 60 * 1000); // Last 24 hours
      
      let totalLockouts = 0;
      let activeLockouts = 0;
      let totalDuration = 0;
      let recentLockouts = 0;
      
      const lockoutsByType: Record<string, number> = {};
      const lockoutsByLevel: Record<number, number> = {};

      for (const lockoutState of this.lockoutStates.values()) {
        totalLockouts += lockoutState.totalLockouts;
        
        if (lockoutState.lockoutUntil > now) {
          activeLockouts++;
          totalDuration += (lockoutState.lockoutUntil - now);
        }
        
        if (lockoutState.lastAttempt > recentThreshold) {
          recentLockouts++;
        }
        
        // Count by attempt type from recent attempts
        for (const attempt of lockoutState.attempts) {
          if (attempt.timestamp > recentThreshold && !attempt.success) {
            lockoutsByType[attempt.attemptType] = (lockoutsByType[attempt.attemptType] || 0) + 1;
          }
        }
        
        // Count by lockout level
        if (lockoutState.lockoutLevel > 0) {
          lockoutsByLevel[lockoutState.lockoutLevel] = (lockoutsByLevel[lockoutState.lockoutLevel] || 0) + 1;
        }
      }

      const averageLockoutDuration = activeLockouts > 0 ? totalDuration / activeLockouts : 0;

      return {
        totalLockouts,
        activeLockouts,
        lockoutsByType,
        lockoutsByLevel,
        averageLockoutDuration,
        recentLockouts
      };
    } catch (error) {
      console.error('❌ Failed to get lockout statistics:', error);
      return {
        totalLockouts: 0,
        activeLockouts: 0,
        lockoutsByType: {},
        lockoutsByLevel: {},
        averageLockoutDuration: 0,
        recentLockouts: 0
      };
    }
  }

  // Generate lockout key
  private generateLockoutKey(
    attemptType: string,
    userId: string | undefined,
    deviceId: string
  ): string {
    const keyData = `${attemptType}:${userId || 'anonymous'}:${deviceId}`;
    return this.cryptoService.hash(keyData);
  }

  // Load lockout states
  private async loadLockoutStates(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('progressive_lockout_states');
      if (stored) {
        const encryptedData = JSON.parse(stored);
        const decryptedData = this.cryptoService.decrypt(encryptedData);
        const data = JSON.parse(decryptedData);
        
        for (const [key, state] of Object.entries(data)) {
          this.lockoutStates.set(key, state as LockoutState);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load lockout states:', error);
    }
  }

  // Save lockout states
  private async saveLockoutStates(): Promise<void> {
    try {
      const data = Object.fromEntries(this.lockoutStates);
      const encryptedData = this.cryptoService.encrypt(JSON.stringify(data));
      await AsyncStorage.setItem('progressive_lockout_states', JSON.stringify(encryptedData));
    } catch (error) {
      console.error('❌ Failed to save lockout states:', error);
    }
  }

  // Start cleanup scheduler
  private startCleanupScheduler(): void {
    setInterval(async () => {
      await this.performCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  // Perform cleanup
  private async performCleanup(): Promise<void> {
    try {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, lockoutState] of this.lockoutStates) {
        // Remove expired lockouts
        if (lockoutState.lockoutUntil > 0 && lockoutState.lockoutUntil < now) {
          // Check if we should reset the state completely
          const timeSinceLastAttempt = now - lockoutState.lastAttempt;
          const maxResetPeriod = Math.max(...Object.values(this.DEFAULT_POLICIES).map(p => p.resetPeriod));
          
          if (timeSinceLastAttempt > maxResetPeriod * 2) {
            this.lockoutStates.delete(key);
            cleanedCount++;
          } else {
            // Just clear the lockout but keep the state
            lockoutState.lockoutUntil = 0;
            lockoutState.lockoutLevel = 0;
          }
        }
        
        // Clean old attempts
        if (lockoutState.attempts.length > 0) {
          const maxResetPeriod = Math.max(...Object.values(this.DEFAULT_POLICIES).map(p => p.resetPeriod));
          const cutoffTime = now - maxResetPeriod;
          
          const originalLength = lockoutState.attempts.length;
          lockoutState.attempts = lockoutState.attempts.filter(a => a.timestamp > cutoffTime);
          
          if (lockoutState.attempts.length !== originalLength) {
            this.lockoutStates.set(key, lockoutState);
          }
        }
      }
      
      if (cleanedCount > 0) {
        await this.saveLockoutStates();
        console.log(`🧹 Lockout cleanup completed: ${cleanedCount} states removed`);
      }
    } catch (error) {
      console.error('❌ Lockout cleanup failed:', error);
    }
  }

  // Perform initial cleanup
  private async performInitialCleanup(): Promise<void> {
    await this.performCleanup();
  }

  // Log lockout event
  private logLockoutEvent(event: LockoutEvent): void {
    this.lockoutEvents.push(event);
    
    // Keep only last 1000 events
    if (this.lockoutEvents.length > 1000) {
      this.lockoutEvents = this.lockoutEvents.slice(-1000);
    }

    // Log critical events immediately
    if (event.severity === 'critical') {
      console.error('CRITICAL LOCKOUT EVENT:', event);
    }
  }

  // Get lockout events
  getLockoutEvents(): LockoutEvent[] {
    return [...this.lockoutEvents];
  }

  // Update lockout policy
  updateLockoutPolicy(
    attemptType: string,
    policy: Partial<LockoutPolicy>
  ): void {
    if (this.DEFAULT_POLICIES[attemptType]) {
      this.DEFAULT_POLICIES[attemptType] = {
        ...this.DEFAULT_POLICIES[attemptType],
        ...policy
      };
      
      console.log(`🔧 Lockout policy updated for ${attemptType}:`, policy);
    }
  }

  // Get lockout policy
  getLockoutPolicy(attemptType: string): LockoutPolicy | null {
    return this.DEFAULT_POLICIES[attemptType] || null;
  }

  // Get all lockout policies
  getAllLockoutPolicies(): Record<string, LockoutPolicy> {
    return { ...this.DEFAULT_POLICIES };
  }
}

export default ProgressiveLockoutService;