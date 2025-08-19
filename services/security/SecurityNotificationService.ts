import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import DeviceSecurityService from './DeviceSecurityService';
import type CentralizedLoggingService from './CentralizedLoggingService';

export interface SecurityAlert {
  id: string;
  type: 'LOGIN_NEW_DEVICE' | 'SUSPICIOUS_ACTIVITY' | 'SECURITY_BREACH' | 'FAILED_LOGIN' | 'ACCOUNT_LOCKED' | 'PASSWORD_CHANGED' | 'MFA_DISABLED' | 'PERMISSION_ESCALATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: Date;
  deviceInfo?: {
    deviceId: string;
    deviceName: string;
    platform: string;
    location?: string;
    ipAddress?: string;
  };
  actionRequired: boolean;
  metadata?: Record<string, any>;
}

export interface NotificationChannel {
  id: string;
  name: string;
  enabled: boolean;
  type: 'PUSH' | 'EMAIL' | 'SMS' | 'IN_APP';
  settings: {
    sound: boolean;
    vibration: boolean;
    priority: 'LOW' | 'NORMAL' | 'HIGH';
  };
}

export interface SecurityNotificationSettings {
  channels: NotificationChannel[];
  alertTypes: {
    [key in SecurityAlert['type']]: {
      enabled: boolean;
      channels: string[];
      cooldownMinutes: number;
    };
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  locationBasedAlerts: boolean;
  deviceTrustLevel: 'STRICT' | 'MODERATE' | 'RELAXED';
}

class SecurityNotificationService {
  private static instance: SecurityNotificationService;
  private loggingService: CentralizedLoggingService | null = null;
  private deviceService: DeviceSecurityService;
  private alertQueue: SecurityAlert[] = [];
  private lastAlertTimes: Map<string, Date> = new Map();
  private trustedDevices: Set<string> = new Set();
  private settings: SecurityNotificationSettings;

  private constructor() {
    this.loggingService = null;
    this.deviceService = DeviceSecurityService.getInstance();
    this.settings = this.getDefaultSettings();
    this.initializeNotifications();
    this.loadTrustedDevices();
  }

  public static getInstance(): SecurityNotificationService {
    if (!SecurityNotificationService.instance) {
      SecurityNotificationService.instance = new SecurityNotificationService();
    }
    return SecurityNotificationService.instance;
  }

  private getDefaultSettings(): SecurityNotificationSettings {
    return {
      channels: [
        {
          id: 'security_critical',
          name: 'Critical Security Alerts',
          enabled: true,
          type: 'PUSH',
          settings: {
            sound: true,
            vibration: true,
            priority: 'HIGH'
          }
        },
        {
          id: 'security_general',
          name: 'General Security Notifications',
          enabled: true,
          type: 'PUSH',
          settings: {
            sound: false,
            vibration: false,
            priority: 'NORMAL'
          }
        },
        {
          id: 'email_alerts',
          name: 'Email Security Alerts',
          enabled: true,
          type: 'EMAIL',
          settings: {
            sound: false,
            vibration: false,
            priority: 'NORMAL'
          }
        }
      ],
      alertTypes: {
        LOGIN_NEW_DEVICE: {
          enabled: true,
          channels: ['security_critical', 'email_alerts'],
          cooldownMinutes: 5
        },
        SUSPICIOUS_ACTIVITY: {
          enabled: true,
          channels: ['security_critical'],
          cooldownMinutes: 10
        },
        SECURITY_BREACH: {
          enabled: true,
          channels: ['security_critical', 'email_alerts'],
          cooldownMinutes: 0
        },
        FAILED_LOGIN: {
          enabled: true,
          channels: ['security_general'],
          cooldownMinutes: 15
        },
        ACCOUNT_LOCKED: {
          enabled: true,
          channels: ['security_critical', 'email_alerts'],
          cooldownMinutes: 0
        },
        PASSWORD_CHANGED: {
          enabled: true,
          channels: ['security_critical', 'email_alerts'],
          cooldownMinutes: 0
        },
        MFA_DISABLED: {
          enabled: true,
          channels: ['security_critical', 'email_alerts'],
          cooldownMinutes: 0
        },
        PERMISSION_ESCALATION: {
          enabled: true,
          channels: ['security_critical'],
          cooldownMinutes: 5
        }
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00'
      },
      locationBasedAlerts: true,
      deviceTrustLevel: 'MODERATE'
    };
  }

  private async initializeNotifications(): Promise<void> {
    try {
      const isExpoGo = (Constants as any)?.appOwnership === 'expo';
      if (Platform.OS === 'web' || isExpoGo) {
        console.warn('Notifications restricted in this runtime (web/Expo Go). Using in-app/web fallbacks.');
        return;
      }

      const NotificationsMod = await import('expo-notifications');
      const { status } = await NotificationsMod.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return;
      }

      await this.setupNotificationChannels();

      NotificationsMod.setNotificationHandler({
        handleNotification: async (notification) => {
          const isSecurityAlert = notification.request.content.categoryIdentifier === 'SECURITY_ALERT';
          return {
            shouldShowAlert: true,
            shouldPlaySound: isSecurityAlert,
            shouldSetBadge: true,
          };
        },
      });
    } catch (error: any) {
      console.error('Failed to initialize notifications:', error);
      this.safeLogSecurity('error', 'security_notifications', 'Notification init failed', {
        error: (error as any)?.message ?? 'unknown'
      });
    }
  }

  private async setupNotificationChannels(): Promise<void> {
    const isExpoGo = (Constants as any)?.appOwnership === 'expo';
    if (Platform.OS === 'android' && !isExpoGo) {
      try {
        const NotificationsMod = await import('expo-notifications');
        await NotificationsMod.setNotificationChannelAsync('security_critical', {
          name: 'Critical Security Alerts',
          importance: NotificationsMod.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF0000',
          sound: 'default'
        });

        await NotificationsMod.setNotificationChannelAsync('security_general', {
          name: 'General Security Notifications',
          importance: NotificationsMod.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#FFA500'
        });
      } catch (e) {
        console.warn('expo-notifications not available for channel setup');
      }
    }
  }

  private async loadTrustedDevices(): Promise<void> {
    try {
      const trustedDevicesData = await AsyncStorage.getItem('trusted_devices');
      if (trustedDevicesData) {
        const devices = JSON.parse(trustedDevicesData);
        this.trustedDevices = new Set(devices);
      }
    } catch (error) {
      console.error('Failed to load trusted devices:', error);
    }
  }

  private async saveTrustedDevices(): Promise<void> {
    try {
      const devices = Array.from(this.trustedDevices);
      await AsyncStorage.setItem('trusted_devices', JSON.stringify(devices));
    } catch (error) {
      console.error('Failed to save trusted devices:', error);
    }
  }

  public async sendSecurityAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp'>): Promise<void> {
    const fullAlert: SecurityAlert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date()
    };

    // Check cooldown period
    if (!this.shouldSendAlert(fullAlert)) {
      return;
    }

    // Add to queue
    this.alertQueue.push(fullAlert);

    // Log the alert
    this.safeLogSecurity(
      'info',
      'security_notifications',
      'Security alert sent',
      {
        alertType: fullAlert.type,
        title: fullAlert.title,
        severity: fullAlert.severity,
        deviceInfo: fullAlert.deviceInfo,
        timestamp: fullAlert.timestamp
      }
    );

    // Send through enabled channels
    await this.processAlert(fullAlert);

    // Update last alert time
    this.lastAlertTimes.set(fullAlert.type, fullAlert.timestamp);
  }

  private shouldSendAlert(alert: SecurityAlert): boolean {
    const alertConfig = this.settings.alertTypes[alert.type];
    if (!alertConfig.enabled) {
      return false;
    }

    // Check cooldown period
    const lastAlertTime = this.lastAlertTimes.get(alert.type);
    if (lastAlertTime && alertConfig.cooldownMinutes > 0) {
      const timeDiff = (Date.now() - lastAlertTime.getTime()) / (1000 * 60);
      if (timeDiff < alertConfig.cooldownMinutes) {
        return false;
      }
    }

    // Check quiet hours
    if (this.settings.quietHours.enabled && this.isQuietHours() && alert.severity !== 'CRITICAL') {
      return false;
    }

    return true;
  }

  private isQuietHours(): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = this.settings.quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = this.settings.quietHours.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private async processAlert(alert: SecurityAlert): Promise<void> {
    const alertConfig = this.settings.alertTypes[alert.type];
    
    for (const channelId of alertConfig.channels) {
      const channel = this.settings.channels.find(c => c.id === channelId);
      if (channel && channel.enabled) {
        await this.sendThroughChannel(alert, channel);
      }
    }
  }

  private async sendThroughChannel(alert: SecurityAlert, channel: NotificationChannel): Promise<void> {
    try {
      switch (channel.type) {
        case 'PUSH':
          await this.sendPushNotification(alert, channel);
          break;
        case 'EMAIL':
          await this.sendEmailAlert(alert);
          break;
        case 'SMS':
          await this.sendSMSAlert(alert);
          break;
        case 'IN_APP':
          await this.sendInAppNotification(alert);
          break;
      }
    } catch (error) {
      console.error(`Failed to send alert through ${channel.type}:`, error);
    }
  }

  private async sendPushNotification(alert: SecurityAlert, channel: NotificationChannel): Promise<void> {
    const isExpoGo = (Constants as any)?.appOwnership === 'expo';
    if (Platform.OS === 'web' || isExpoGo) {
      if (Platform.OS === 'web' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(alert.title, {
          body: alert.message,
          icon: '/assets/images/icon.png',
          tag: alert.id
        });
      }
      return;
    }

    try {
      const NotificationsMod = await import('expo-notifications');
      await NotificationsMod.scheduleNotificationAsync({
        content: {
          title: alert.title,
          body: alert.message,
          categoryIdentifier: 'SECURITY_ALERT',
          data: {
            alertId: alert.id,
            alertType: alert.type,
            severity: alert.severity,
            actionRequired: alert.actionRequired
          },
          sound: channel.settings.sound ? 'default' : undefined,
          priority: channel.settings.priority === 'HIGH' ? 
            NotificationsMod.AndroidImportance.HIGH : 
            NotificationsMod.AndroidImportance.DEFAULT
        },
        trigger: null
      });
    } catch (e) {
      console.warn('expo-notifications not available, skipping push');
    }
  }

  private async sendEmailAlert(alert: SecurityAlert): Promise<void> {
    // In a real app, this would integrate with an email service
    console.log('Email alert would be sent:', {
      to: 'user@example.com',
      subject: `Security Alert: ${alert.title}`,
      body: this.generateEmailBody(alert)
    });
  }

  private async sendSMSAlert(alert: SecurityAlert): Promise<void> {
    // In a real app, this would integrate with an SMS service
    console.log('SMS alert would be sent:', {
      to: '+1234567890',
      message: `Security Alert: ${alert.title} - ${alert.message}`
    });
  }

  private async sendInAppNotification(alert: SecurityAlert): Promise<void> {
    // Store for in-app notification display
    const notifications = await this.getStoredNotifications();
    notifications.unshift(alert);
    
    // Keep only last 50 notifications
    const trimmedNotifications = notifications.slice(0, 50);
    
    await AsyncStorage.setItem('security_notifications', JSON.stringify(trimmedNotifications));
  }

  // CRITICAL: Send immediate FCM notification for critical security events
  private async sendImmediateFCMNotification(notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
    priority?: 'normal' | 'high';
    sound?: string;
  }): Promise<void> {
    try {
      const isExpoGo = (Constants as any)?.appOwnership === 'expo';
      if (Platform.OS === 'web' || isExpoGo) {
        if (Platform.OS === 'web' && 'Notification' in window && Notification.permission === 'granted') {
          const webNotification = new Notification(notification.title, {
            body: notification.body,
            icon: '/assets/images/icon.png',
            badge: '/assets/images/icon.png',
            tag: 'security-alert',
            requireInteraction: true,
            silent: false
          });
          setTimeout(() => webNotification.close(), 10000);
        }
        return;
      }

      const NotificationsMod = await import('expo-notifications');
      await NotificationsMod.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          categoryIdentifier: 'SECURITY_CRITICAL',
          data: notification.data || {},
          sound: notification.sound || 'default',
          priority: notification.priority === 'high' ? 
            NotificationsMod.AndroidImportance.HIGH : 
            NotificationsMod.AndroidImportance.DEFAULT,
          sticky: true,
          autoDismiss: false
        },
        trigger: null
      });
      
      console.log('Immediate FCM notification sent:', notification.title);
    } catch (error) {
      console.warn('expo-notifications not available, skipping critical push');
    }
  }

  // Send in-app security alert with immediate visibility
  private async sendInAppSecurityAlert(alert: {
    type: string;
    title: string;
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    actionRequired: boolean;
    deviceInfo?: any;
  }): Promise<void> {
    try {
      // Store in high-priority alerts for immediate display
      const highPriorityAlerts = await this.getHighPriorityAlerts();
      const alertWithId = {
        ...alert,
        id: this.generateAlertId(),
        timestamp: new Date(),
        read: false,
        dismissed: false
      };
      
      highPriorityAlerts.unshift(alertWithId);
      
      // Keep only last 10 high-priority alerts
      const trimmedAlerts = highPriorityAlerts.slice(0, 10);
      
      await AsyncStorage.setItem('high_priority_security_alerts', JSON.stringify(trimmedAlerts));
      
      // Trigger in-app notification display
      this.triggerInAppNotificationDisplay(alertWithId);
      
      console.log('In-app security alert sent:', alert.title);
    } catch (error) {
      console.error('Failed to send in-app security alert:', error);
    }
  }

  // Get high-priority alerts
  private async getHighPriorityAlerts(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('high_priority_security_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get high-priority alerts:', error);
      return [];
    }
  }

  // Trigger in-app notification display
  private triggerInAppNotificationDisplay(alert: any): void {
    try {
      // In a real app, this would trigger a modal or banner component
      // For now, we'll use console and could integrate with a state management system
      console.warn('🚨 SECURITY ALERT:', alert.title, '-', alert.message);
      
      // Could emit an event or update a global state here
      // Example: EventEmitter.emit('security-alert', alert);
    } catch (error) {
      console.error('Failed to trigger in-app notification display:', error);
    }
  }

  // Calculate risk score for new device
  private calculateNewDeviceRiskScore(deviceInfo: any): number {
    let score = 30; // Base score for new device
    
    // Unknown device name
    if (!deviceInfo.deviceName || deviceInfo.deviceName === 'Unknown Device') {
      score += 20;
    }
    
    // Suspicious location
    if (deviceInfo.location && this.isSuspiciousLocation(deviceInfo.location)) {
      score += 25;
    }
    
    // Suspicious IP address
    if (deviceInfo.ipAddress && this.isSuspiciousIP(deviceInfo.ipAddress)) {
      score += 30;
    }
    
    // Unusual platform
    if (deviceInfo.platform && this.isUnusualPlatform(deviceInfo.platform)) {
      score += 15;
    }
    
    // Time-based risk (login at unusual hours)
    if (this.isUnusualLoginTime()) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  // Check if location is suspicious
  private isSuspiciousLocation(location: string): boolean {
    // In a real implementation, this would check against known suspicious locations
    // or compare with user's typical locations
    const suspiciousCountries = ['Unknown', 'Anonymous', 'Tor'];
    return suspiciousCountries.some(country => 
      location.toLowerCase().includes(country.toLowerCase())
    );
  }

  // Check if IP is suspicious
  private isSuspiciousIP(ipAddress: string): boolean {
    // In a real implementation, this would check against threat intelligence feeds
    // Check for private/local IPs (less suspicious)
    const privateIPRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.|::1|fc00:|fe80:)/;
    
    if (privateIPRegex.test(ipAddress)) {
      return false; // Private IPs are less suspicious
    }
    
    // Check for known suspicious patterns
    const suspiciousPatterns = ['0.0.0.0', '255.255.255.255'];
    return suspiciousPatterns.includes(ipAddress);
  }

  // Check if platform is unusual
  private isUnusualPlatform(platform: string): boolean {
    const commonPlatforms = ['ios', 'android', 'web'];
    return !commonPlatforms.includes(platform.toLowerCase());
  }

  // Check if login time is unusual
  private isUnusualLoginTime(): boolean {
    const now = new Date();
    const hour = now.getHours();
    
    // Consider 2 AM - 6 AM as unusual login hours
    return hour >= 2 && hour <= 6;
  }

  private generateEmailBody(alert: SecurityAlert): string {
    let body = `Dear User,\n\n`;
    body += `We detected the following security event on your account:\n\n`;
    body += `Alert: ${alert.title}\n`;
    body += `Details: ${alert.message}\n`;
    body += `Time: ${alert.timestamp.toLocaleString()}\n`;
    body += `Severity: ${alert.severity}\n\n`;
    
    if (alert.deviceInfo) {
      body += `Device Information:\n`;
      body += `- Device: ${alert.deviceInfo.deviceName}\n`;
      body += `- Platform: ${alert.deviceInfo.platform}\n`;
      if (alert.deviceInfo.location) {
        body += `- Location: ${alert.deviceInfo.location}\n`;
      }
      if (alert.deviceInfo.ipAddress) {
        body += `- IP Address: ${alert.deviceInfo.ipAddress}\n`;
      }
      body += `\n`;
    }
    
    if (alert.actionRequired) {
      body += `ACTION REQUIRED: Please review your account security settings and verify this activity.\n\n`;
    }
    
    body += `If you did not perform this action, please contact support immediately.\n\n`;
    body += `Best regards,\nSecurity Team`;
    
    return body;
  }

  // CRITICAL: Enhanced new device login detection with immediate FCM notification
  public async checkNewDeviceLogin(deviceId: string, deviceInfo: any): Promise<{
    isNewDevice: boolean;
    riskScore: number;
    actionRequired: boolean;
    notificationSent: boolean;
  }> {
    const isNewDevice = !this.trustedDevices.has(deviceId);
    let riskScore = 0;
    let notificationSent = false;
    
    if (isNewDevice) {
      // Calculate risk score for new device
      riskScore = this.calculateNewDeviceRiskScore(deviceInfo);
      
      // Send immediate security alert
      await this.sendSecurityAlert({
        type: 'LOGIN_NEW_DEVICE',
        severity: riskScore >= 70 ? 'CRITICAL' : 'HIGH',
        title: 'New Device Login Detected',
        message: `A login was detected from a new device: ${deviceInfo.deviceName || 'Unknown Device'}`,
        deviceInfo: {
          deviceId,
          deviceName: deviceInfo.deviceName || 'Unknown Device',
          platform: deviceInfo.platform || Platform.OS,
          location: deviceInfo.location,
          ipAddress: deviceInfo.ipAddress
        },
        actionRequired: true,
        metadata: {
          riskScore,
          isFirstTimeDevice: true,
          detectionTime: new Date().toISOString()
        }
      });
      
      // Send immediate FCM push notification
      await this.sendImmediateFCMNotification({
        title: '🚨 New Device Login Alert',
        body: `Login detected from ${deviceInfo.deviceName || 'Unknown Device'}. If this wasn't you, secure your account immediately.`,
        data: {
          type: 'NEW_DEVICE_LOGIN',
          deviceId,
          riskScore: riskScore.toString(),
          timestamp: Date.now().toString()
        },
        priority: 'high',
        sound: 'default'
      });
      
      // Send in-app notification for immediate visibility
      await this.sendInAppSecurityAlert({
        type: 'NEW_DEVICE_LOGIN',
        title: 'New Device Login',
        message: `Login from ${deviceInfo.deviceName || 'Unknown Device'}`,
        severity: riskScore >= 70 ? 'CRITICAL' : 'HIGH',
        actionRequired: true,
        deviceInfo
      });
      
      notificationSent = true;
      
      // Log the new device detection
      this.safeLogSecurity('warn', 'security_notifications', 'New device login detected', {
        deviceId,
        deviceInfo,
        riskScore,
        isFirstTimeDevice: true
      });
    }
    
    return {
      isNewDevice,
      riskScore,
      actionRequired: isNewDevice && riskScore >= 50,
      notificationSent
    };
  }

  public async trustDevice(deviceId: string): Promise<void> {
    this.trustedDevices.add(deviceId);
    await this.saveTrustedDevices();
  }

  public async untrustDevice(deviceId: string): Promise<void> {
    this.trustedDevices.delete(deviceId);
    await this.saveTrustedDevices();
  }

  public async reportSuspiciousActivity(activity: {
    type: string;
    details: string;
    riskScore: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const severity = activity.riskScore >= 80 ? 'CRITICAL' : 
                    activity.riskScore >= 60 ? 'HIGH' : 
                    activity.riskScore >= 40 ? 'MEDIUM' : 'LOW';

    await this.sendSecurityAlert({
      type: 'SUSPICIOUS_ACTIVITY',
      severity,
      title: 'Suspicious Activity Detected',
      message: `${activity.type}: ${activity.details}`,
      actionRequired: activity.riskScore >= 60,
      metadata: {
        riskScore: activity.riskScore,
        ...activity.metadata
      }
    });
  }

  public async getStoredNotifications(): Promise<SecurityAlert[]> {
    try {
      const stored = await AsyncStorage.getItem('security_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored notifications:', error);
      return [];
    }
  }

  public async clearNotifications(): Promise<void> {
    try {
      await AsyncStorage.removeItem('security_notifications');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  public async updateSettings(newSettings: Partial<SecurityNotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await AsyncStorage.setItem('security_notification_settings', JSON.stringify(this.settings));
  }

  public getSettings(): SecurityNotificationSettings {
    return { ...this.settings };
  }

  private getLoggingService(): CentralizedLoggingService | null {
    try {
      if (!this.loggingService) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('./CentralizedLoggingService');
        const maybe = mod?.default?.getInstance?.();
        if (maybe) this.loggingService = maybe as CentralizedLoggingService;
      }
      return this.loggingService;
    } catch (e) {
      return null;
    }
  }

  private safeLogSecurity(level: 'debug' | 'info' | 'warn' | 'error' | 'critical', source: string, message: string, metadata?: Record<string, any>): void {
    try {
      const svc = this.getLoggingService();
      if (svc?.logSecurity) {
        svc.logSecurity(level, source, message, metadata);
      } else {
        // Silent fallback to console
        if (level === 'error' || level === 'critical') console.error(`[${source}] ${message}`, metadata);
        else if (level === 'warn') console.warn(`[${source}] ${message}`, metadata);
        else console.log(`[${source}] ${message}`, metadata);
      }
    } catch {}
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Enhanced failed login handling with immediate notifications
  public async handleFailedLogin(attempts: number, deviceInfo: any, userId?: string): Promise<void> {
    if (attempts >= 3) {
      const severity = attempts >= 5 ? 'HIGH' : 'MEDIUM';
      
      await this.sendSecurityAlert({
        type: 'FAILED_LOGIN',
        severity,
        title: 'Multiple Failed Login Attempts',
        message: `${attempts} failed login attempts detected from ${deviceInfo.deviceName || 'Unknown Device'}`,
        deviceInfo,
        actionRequired: attempts >= 5,
        metadata: {
          attemptCount: attempts,
          userId,
          timestamp: new Date().toISOString()
        }
      });
      
      // Send immediate FCM notification for high-risk attempts
      if (attempts >= 5) {
        await this.sendImmediateFCMNotification({
          title: '🚨 Security Alert: Failed Login Attempts',
          body: `${attempts} failed login attempts from ${deviceInfo.deviceName || 'Unknown Device'}. Your account may be under attack.`,
          data: {
            type: 'FAILED_LOGIN',
            attempts: attempts.toString(),
            deviceId: deviceInfo.deviceId || 'unknown',
            timestamp: Date.now().toString()
          },
          priority: 'high',
          sound: 'default'
        });
      }
    }
  }

  // Enhanced account locked notification with immediate FCM
  public async handleAccountLocked(lockoutDuration?: number, lockoutLevel?: number): Promise<void> {
    const durationText = lockoutDuration ? 
      `for ${Math.ceil(lockoutDuration / (60 * 1000))} minute(s)` : 
      'temporarily';
    
    await this.sendSecurityAlert({
      type: 'ACCOUNT_LOCKED',
      severity: 'CRITICAL',
      title: 'Account Locked',
      message: `Your account has been locked ${durationText} due to suspicious activity`,
      actionRequired: true,
      metadata: {
        lockoutDuration,
        lockoutLevel,
        timestamp: new Date().toISOString()
      }
    });
    
    // Send immediate FCM notification
    await this.sendImmediateFCMNotification({
      title: '🔒 Account Locked',
      body: `Your account has been locked ${durationText} due to multiple failed attempts. Contact support if this wasn't you.`,
      data: {
        type: 'ACCOUNT_LOCKED',
        lockoutDuration: lockoutDuration?.toString() || '0',
        lockoutLevel: lockoutLevel?.toString() || '0',
        timestamp: Date.now().toString()
      },
      priority: 'high',
      sound: 'default'
    });
  }

  public async handlePasswordChanged(): Promise<void> {
    await this.sendSecurityAlert({
      type: 'PASSWORD_CHANGED',
      severity: 'HIGH',
      title: 'Password Changed',
      message: 'Your account password has been changed',
      actionRequired: false
    });
  }

  public async handleMFADisabled(): Promise<void> {
    await this.sendSecurityAlert({
      type: 'MFA_DISABLED',
      severity: 'CRITICAL',
      title: 'Multi-Factor Authentication Disabled',
      message: 'MFA has been disabled on your account',
      actionRequired: true
    });
  }

  public async handlePermissionEscalation(details: string): Promise<void> {
    await this.sendSecurityAlert({
      type: 'PERMISSION_ESCALATION',
      severity: 'HIGH',
      title: 'Permission Escalation Detected',
      message: details,
      actionRequired: true
    });
  }
}

export default SecurityNotificationService;