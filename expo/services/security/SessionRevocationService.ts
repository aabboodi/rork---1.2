import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import DeviceSecurityService from './DeviceSecurityService';
import CryptoService from './CryptoService';

export interface RevocationEntry {
  sessionId: string;
  userId: string;
  deviceId: string;
  revokedAt: number;
  reason: 'logout' | 'security_violation' | 'admin_action' | 'device_change' | 'suspicious_activity' | 'policy_violation';
  expiresAt: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    riskScore?: number;
  };
}

export interface SessionTrackingEntry {
  sessionId: string;
  userId: string;
  deviceId: string;
  deviceFingerprint: string;
  createdAt: number;
  lastActivity: number;
  isActive: boolean;
  riskScore: number;
  validationCount: number;
  securityEvents: number;
  location?: string;
  metadata: {
    platform: string;
    appVersion: string;
    securityLevel: string;
    biometricEnabled: boolean;
    e2eeEnabled: boolean;
  };
}

export interface RevocationStats {
  totalRevocations: number;
  activeRevocations: number;
  revocationsByReason: Record<string, number>;
  averageRevocationTime: number;
  criticalRevocations: number;
  recentRevocations: number;
}

class SessionRevocationService {
  private static instance: SessionRevocationService;
  private deviceSecurity: DeviceSecurityService;
  private cryptoService: CryptoService;
  private revocationList: Map<string, RevocationEntry> = new Map();
  private sessionTracker: Map<string, SessionTrackingEntry> = new Map();
  private isInitialized = false;
  
  // CRITICAL: Redis-like configuration for session tracking
  private readonly REVOCATION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly SESSION_TRACKING_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  private readonly MAX_REVOCATION_ENTRIES = 10000;
  private readonly MAX_SESSION_ENTRIES = 50000;

  private constructor() {
    this.deviceSecurity = DeviceSecurityService.getInstance();
    this.cryptoService = CryptoService.getInstance();
    this.startCleanupScheduler();
  }

  static getInstance(): SessionRevocationService {
    if (!SessionRevocationService.instance) {
      SessionRevocationService.instance = new SessionRevocationService();
    }
    return SessionRevocationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadRevocationList();
      await this.loadSessionTracker();
      await this.performInitialCleanup();
      
      this.isInitialized = true;
      console.log('🚫 Session Revocation Service initialized with Redis-like tracking');
    } catch (error) {
      console.error('❌ Failed to initialize Session Revocation Service:', error);
      throw error;
    }
  }

  // CRITICAL: إبطال جلسة فوري مع تتبع Redis-like
  async revokeSessionImmediate(
    sessionId: string,
    userId: string,
    reason: RevocationEntry['reason'],
    metadata?: RevocationEntry['metadata']
  ): Promise<{ success: boolean; revocationId: string; error?: string }> {
    try {
      console.log(`🚫 Immediate session revocation initiated for session ${sessionId}`);
      
      const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
      const deviceId = deviceFingerprint?.securityHash || 'unknown';
      
      // إنشاء إدخال الإبطال
      const revocationEntry: RevocationEntry = {
        sessionId,
        userId,
        deviceId,
        revokedAt: Date.now(),
        reason,
        expiresAt: Date.now() + this.REVOCATION_TTL,
        severity: this.calculateRevocationSeverity(reason),
        metadata
      };
      
      // إضافة إلى قائمة الإبطال
      this.revocationList.set(sessionId, revocationEntry);
      
      // تحديث تتبع الجلسة
      const sessionEntry = this.sessionTracker.get(sessionId);
      if (sessionEntry) {
        sessionEntry.isActive = false;
        sessionEntry.lastActivity = Date.now();
        sessionEntry.securityEvents++;
        this.sessionTracker.set(sessionId, sessionEntry);
      }
      
      // حفظ التغييرات
      await this.saveRevocationList();
      await this.saveSessionTracker();
      
      // إشعار النظام بالإبطال
      await this.notifySystemRevocation(revocationEntry);
      
      // تنظيف الجلسات المرتبطة
      await this.cleanupRelatedSessions(userId, deviceId, reason);
      
      const revocationId = await Crypto.randomUUID();
      
      console.log(`✅ Session ${sessionId} revoked immediately. Revocation ID: ${revocationId}`);
      
      return {
        success: true,
        revocationId
      };
    } catch (error) {
      console.error(`❌ Failed to revoke session ${sessionId}:`, error);
      return {
        success: false,
        revocationId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // CRITICAL: إبطال جميع جلسات المستخدم فوريًا
  async revokeAllUserSessionsImmediate(
    userId: string,
    reason: RevocationEntry['reason'],
    excludeCurrentSession?: string
  ): Promise<{
    success: boolean;
    revokedSessions: string[];
    failedSessions: string[];
    totalRevoked: number;
  }> {
    try {
      console.log(`🚫 Immediate revocation of all sessions for user ${userId}`);
      
      const revokedSessions: string[] = [];
      const failedSessions: string[] = [];
      
      // العثور على جميع جلسات المستخدم النشطة
      const userSessions = Array.from(this.sessionTracker.values())
        .filter(session => 
          session.userId === userId && 
          session.isActive &&
          session.sessionId !== excludeCurrentSession
        );
      
      console.log(`Found ${userSessions.length} active sessions for user ${userId}`);
      
      // إبطال كل جلسة
      for (const session of userSessions) {
        const result = await this.revokeSessionImmediate(
          session.sessionId,
          userId,
          reason,
          {
            riskScore: session.riskScore,
            userAgent: session.metadata.platform
          }
        );
        
        if (result.success) {
          revokedSessions.push(session.sessionId);
        } else {
          failedSessions.push(session.sessionId);
        }
      }
      
      // إبطال الجلسات في التخزين المحلي أيضًا
      await this.revokeLocalStorageSessions(userId);
      
      console.log(`✅ User ${userId} sessions revoked: ${revokedSessions.length} success, ${failedSessions.length} failed`);
      
      return {
        success: failedSessions.length === 0,
        revokedSessions,
        failedSessions,
        totalRevoked: revokedSessions.length
      };
    } catch (error) {
      console.error(`❌ Failed to revoke all sessions for user ${userId}:`, error);
      return {
        success: false,
        revokedSessions: [],
        failedSessions: [],
        totalRevoked: 0
      };
    }
  }

  // CRITICAL: إبطال جلسات الجهاز فوريًا
  async revokeDeviceSessionsImmediate(
    deviceId: string,
    reason: RevocationEntry['reason']
  ): Promise<{
    success: boolean;
    revokedSessions: string[];
    affectedUsers: string[];
  }> {
    try {
      console.log(`🚫 Immediate revocation of all sessions for device ${deviceId}`);
      
      const revokedSessions: string[] = [];
      const affectedUsers: Set<string> = new Set();
      
      // العثور على جميع جلسات الجهاز النشطة
      const deviceSessions = Array.from(this.sessionTracker.values())
        .filter(session => 
          session.deviceId === deviceId && 
          session.isActive
        );
      
      console.log(`Found ${deviceSessions.length} active sessions for device ${deviceId}`);
      
      // إبطال كل جلسة
      for (const session of deviceSessions) {
        const result = await this.revokeSessionImmediate(
          session.sessionId,
          session.userId,
          reason,
          {
            riskScore: session.riskScore,
            userAgent: session.metadata.platform
          }
        );
        
        if (result.success) {
          revokedSessions.push(session.sessionId);
          affectedUsers.add(session.userId);
        }
      }
      
      console.log(`✅ Device ${deviceId} sessions revoked: ${revokedSessions.length} sessions, ${affectedUsers.size} users affected`);
      
      return {
        success: true,
        revokedSessions,
        affectedUsers: Array.from(affectedUsers)
      };
    } catch (error) {
      console.error(`❌ Failed to revoke device sessions for ${deviceId}:`, error);
      return {
        success: false,
        revokedSessions: [],
        affectedUsers: []
      };
    }
  }

  // CRITICAL: التحقق من إبطال الجلسة
  async isSessionRevoked(sessionId: string): Promise<{
    revoked: boolean;
    reason?: string;
    revokedAt?: number;
    severity?: string;
  }> {
    try {
      const revocationEntry = this.revocationList.get(sessionId);
      
      if (!revocationEntry) {
        return { revoked: false };
      }
      
      // التحقق من انتهاء صلاحية الإبطال
      if (Date.now() > revocationEntry.expiresAt) {
        this.revocationList.delete(sessionId);
        await this.saveRevocationList();
        return { revoked: false };
      }
      
      return {
        revoked: true,
        reason: revocationEntry.reason,
        revokedAt: revocationEntry.revokedAt,
        severity: revocationEntry.severity
      };
    } catch (error) {
      console.error('❌ Failed to check session revocation:', error);
      return { revoked: false };
    }
  }

  // CRITICAL: تتبع جلسة جديدة (Redis-like)
  async trackSession(
    sessionId: string,
    userId: string,
    deviceId: string,
    metadata: SessionTrackingEntry['metadata']
  ): Promise<boolean> {
    try {
      const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
      
      const sessionEntry: SessionTrackingEntry = {
        sessionId,
        userId,
        deviceId,
        deviceFingerprint: deviceFingerprint?.securityHash || 'unknown',
        createdAt: Date.now(),
        lastActivity: Date.now(),
        isActive: true,
        riskScore: 0,
        validationCount: 0,
        securityEvents: 0,
        metadata
      };
      
      this.sessionTracker.set(sessionId, sessionEntry);
      await this.saveSessionTracker();
      
      console.log(`📊 Session ${sessionId} tracked for user ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to track session:', error);
      return false;
    }
  }

  // CRITICAL: تحديث نشاط الجلسة
  async updateSessionActivity(
    sessionId: string,
    riskScore?: number,
    securityEvent?: boolean
  ): Promise<boolean> {
    try {
      const sessionEntry = this.sessionTracker.get(sessionId);
      if (!sessionEntry) {
        return false;
      }
      
      sessionEntry.lastActivity = Date.now();
      sessionEntry.validationCount++;
      
      if (riskScore !== undefined) {
        sessionEntry.riskScore = riskScore;
      }
      
      if (securityEvent) {
        sessionEntry.securityEvents++;
      }
      
      this.sessionTracker.set(sessionId, sessionEntry);
      await this.saveSessionTracker();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to update session activity:', error);
      return false;
    }
  }

  // CRITICAL: الحصول على إحصائيات الإبطال
  async getRevocationStats(): Promise<RevocationStats> {
    try {
      const now = Date.now();
      const revocations = Array.from(this.revocationList.values());
      const recentThreshold = now - (24 * 60 * 60 * 1000); // آخر 24 ساعة
      
      const revocationsByReason: Record<string, number> = {};
      let totalRevocationTime = 0;
      let criticalRevocations = 0;
      let recentRevocations = 0;
      
      for (const revocation of revocations) {
        // تجميع حسب السبب
        revocationsByReason[revocation.reason] = (revocationsByReason[revocation.reason] || 0) + 1;
        
        // حساب الوقت
        totalRevocationTime += (now - revocation.revokedAt);
        
        // العد الحرج
        if (revocation.severity === 'critical') {
          criticalRevocations++;
        }
        
        // الحديثة
        if (revocation.revokedAt > recentThreshold) {
          recentRevocations++;
        }
      }
      
      const averageRevocationTime = revocations.length > 0 ? totalRevocationTime / revocations.length : 0;
      const activeRevocations = revocations.filter(r => r.expiresAt > now).length;
      
      return {
        totalRevocations: revocations.length,
        activeRevocations,
        revocationsByReason,
        averageRevocationTime,
        criticalRevocations,
        recentRevocations
      };
    } catch (error) {
      console.error('❌ Failed to get revocation stats:', error);
      return {
        totalRevocations: 0,
        activeRevocations: 0,
        revocationsByReason: {},
        averageRevocationTime: 0,
        criticalRevocations: 0,
        recentRevocations: 0
      };
    }
  }

  // CRITICAL: الحصول على جلسات المستخدم النشطة
  async getUserActiveSessions(userId: string): Promise<SessionTrackingEntry[]> {
    try {
      return Array.from(this.sessionTracker.values())
        .filter(session => session.userId === userId && session.isActive)
        .sort((a, b) => b.lastActivity - a.lastActivity);
    } catch (error) {
      console.error('❌ Failed to get user active sessions:', error);
      return [];
    }
  }

  // CRITICAL: مراقبة الجلسات المشبوهة
  async monitorSuspiciousSessions(): Promise<{
    suspiciousSessions: string[];
    highRiskSessions: string[];
    recommendations: string[];
  }> {
    try {
      const suspiciousSessions: string[] = [];
      const highRiskSessions: string[] = [];
      const recommendations: string[] = [];
      const now = Date.now();
      
      for (const [sessionId, session] of this.sessionTracker) {
        if (!session.isActive) continue;
        
        const sessionAge = now - session.createdAt;
        const inactivityTime = now - session.lastActivity;
        
        // جلسات مشبوهة
        if (session.riskScore > 70) {
          suspiciousSessions.push(sessionId);
        }
        
        // جلسات عالية المخاطر
        if (session.riskScore > 85 || session.securityEvents > 10) {
          highRiskSessions.push(sessionId);
          recommendations.push(`Consider revoking high-risk session ${sessionId}`);
        }
        
        // جلسات قديمة جداً
        if (sessionAge > 7 * 24 * 60 * 60 * 1000) { // أكثر من 7 أيام
          recommendations.push(`Session ${sessionId} is very old (${Math.floor(sessionAge / (24 * 60 * 60 * 1000))} days)`);
        }
        
        // جلسات غير نشطة
        if (inactivityTime > 24 * 60 * 60 * 1000) { // أكثر من 24 ساعة
          recommendations.push(`Session ${sessionId} has been inactive for ${Math.floor(inactivityTime / (60 * 60 * 1000))} hours`);
        }
      }
      
      return {
        suspiciousSessions,
        highRiskSessions,
        recommendations
      };
    } catch (error) {
      console.error('❌ Failed to monitor suspicious sessions:', error);
      return {
        suspiciousSessions: [],
        highRiskSessions: [],
        recommendations: ['Monitoring system error - manual review required']
      };
    }
  }

  // حساب شدة الإبطال
  private calculateRevocationSeverity(reason: RevocationEntry['reason']): RevocationEntry['severity'] {
    switch (reason) {
      case 'security_violation':
      case 'suspicious_activity':
        return 'critical';
      case 'device_change':
      case 'policy_violation':
        return 'high';
      case 'admin_action':
        return 'medium';
      case 'logout':
        return 'low';
      default:
        return 'medium';
    }
  }

  // إشعار النظام بالإبطال
  private async notifySystemRevocation(revocation: RevocationEntry): Promise<void> {
    try {
      // في الإنتاج، هذا سيرسل إشعار إلى الخادم
      console.log(`🔔 System notified of session revocation: ${revocation.sessionId} (${revocation.reason})`);
      
      // حفظ إشعار الإبطال
      const notification = {
        type: 'session_revocation',
        sessionId: revocation.sessionId,
        userId: revocation.userId,
        reason: revocation.reason,
        severity: revocation.severity,
        timestamp: revocation.revokedAt
      };
      
      await AsyncStorage.setItem(
        `revocation_notification_${revocation.sessionId}`,
        JSON.stringify(notification)
      );
    } catch (error) {
      console.error('❌ Failed to notify system of revocation:', error);
    }
  }

  // تنظيف الجلسات المرتبطة
  private async cleanupRelatedSessions(
    userId: string,
    deviceId: string,
    reason: RevocationEntry['reason']
  ): Promise<void> {
    try {
      if (reason === 'security_violation' || reason === 'suspicious_activity') {
        // إبطال جميع جلسات المستخدم في حالة انتهاك الأمان
        await this.revokeAllUserSessionsImmediate(userId, reason);
      } else if (reason === 'device_change') {
        // إبطال جميع جلسات الجهاز
        await this.revokeDeviceSessionsImmediate(deviceId, reason);
      }
    } catch (error) {
      console.error('❌ Failed to cleanup related sessions:', error);
    }
  }

  // إبطال جلسات التخزين المحلي
  private async revokeLocalStorageSessions(userId: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(key => 
        key.includes('session') || 
        key.includes('token') || 
        key.includes(userId)
      );
      
      for (const key of sessionKeys) {
        await AsyncStorage.removeItem(key);
      }
      
      console.log(`🧹 Cleaned up ${sessionKeys.length} local storage entries for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to revoke local storage sessions:', error);
    }
  }

  // بدء جدولة التنظيف
  private startCleanupScheduler(): void {
    setInterval(async () => {
      await this.performCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  // تنفيذ التنظيف
  private async performCleanup(): Promise<void> {
    try {
      const now = Date.now();
      let cleanedRevocations = 0;
      let cleanedSessions = 0;
      
      // تنظيف قائمة الإبطال المنتهية الصلاحية
      for (const [sessionId, revocation] of this.revocationList) {
        if (revocation.expiresAt < now) {
          this.revocationList.delete(sessionId);
          cleanedRevocations++;
        }
      }
      
      // تنظيف الجلسات القديمة
      for (const [sessionId, session] of this.sessionTracker) {
        const sessionAge = now - session.createdAt;
        if (sessionAge > this.SESSION_TRACKING_TTL) {
          this.sessionTracker.delete(sessionId);
          cleanedSessions++;
        }
      }
      
      // تحديد الحد الأقصى للإدخالات
      if (this.revocationList.size > this.MAX_REVOCATION_ENTRIES) {
        const entries = Array.from(this.revocationList.entries())
          .sort((a, b) => a[1].revokedAt - b[1].revokedAt);
        
        const toRemove = entries.slice(0, entries.length - this.MAX_REVOCATION_ENTRIES);
        for (const [sessionId] of toRemove) {
          this.revocationList.delete(sessionId);
          cleanedRevocations++;
        }
      }
      
      if (this.sessionTracker.size > this.MAX_SESSION_ENTRIES) {
        const entries = Array.from(this.sessionTracker.entries())
          .sort((a, b) => a[1].createdAt - b[1].createdAt);
        
        const toRemove = entries.slice(0, entries.length - this.MAX_SESSION_ENTRIES);
        for (const [sessionId] of toRemove) {
          this.sessionTracker.delete(sessionId);
          cleanedSessions++;
        }
      }
      
      // حفظ التغييرات إذا تم التنظيف
      if (cleanedRevocations > 0 || cleanedSessions > 0) {
        await this.saveRevocationList();
        await this.saveSessionTracker();
        
        console.log(`🧹 Cleanup completed: ${cleanedRevocations} revocations, ${cleanedSessions} sessions`);
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  // تنفيذ التنظيف الأولي
  private async performInitialCleanup(): Promise<void> {
    await this.performCleanup();
  }

  // تحميل قائمة الإبطال
  private async loadRevocationList(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('session_revocation_list');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [sessionId, revocation] of Object.entries(data)) {
          this.revocationList.set(sessionId, revocation as RevocationEntry);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load revocation list:', error);
    }
  }

  // حفظ قائمة الإبطال
  private async saveRevocationList(): Promise<void> {
    try {
      const data = Object.fromEntries(this.revocationList);
      await AsyncStorage.setItem('session_revocation_list', JSON.stringify(data));
    } catch (error) {
      console.error('❌ Failed to save revocation list:', error);
    }
  }

  // تحميل متتبع الجلسات
  private async loadSessionTracker(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('session_tracker');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [sessionId, session] of Object.entries(data)) {
          this.sessionTracker.set(sessionId, session as SessionTrackingEntry);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load session tracker:', error);
    }
  }

  // حفظ متتبع الجلسات
  private async saveSessionTracker(): Promise<void> {
    try {
      const data = Object.fromEntries(this.sessionTracker);
      await AsyncStorage.setItem('session_tracker', JSON.stringify(data));
    } catch (error) {
      console.error('❌ Failed to save session tracker:', error);
    }
  }

  // تدمير الخدمة
  destroy(): void {
    this.revocationList.clear();
    this.sessionTracker.clear();
    this.isInitialized = false;
    console.log('🚫 Session Revocation Service destroyed');
  }
}

export default SessionRevocationService;