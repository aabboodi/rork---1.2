import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoService from './CryptoService';
import DeviceSecurityService from './DeviceSecurityService';
import DeviceBindingService from './DeviceBindingService';

interface DeviceInfo {
  deviceId: string;
  deviceFingerprint: string;
  platform: string;
  model: string;
  osVersion: string;
  appVersion: string;
  firstSeen: number;
  lastSeen: number;
  isKnown: boolean;
  isTrusted: boolean;
  riskScore: number;
  location?: {
    country?: string;
    city?: string;
    ip?: string;
  };
  userAgent?: string;
}

interface DeviceNotification {
  id: string;
  userId: string;
  deviceInfo: DeviceInfo;
  notificationType: 'new_device' | 'suspicious_device' | 'device_change' | 'location_change';
  timestamp: number;
  acknowledged: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  requiresAction: boolean;
  actionTaken?: string;
  metadata?: {
    previousDevice?: DeviceInfo;
    locationChange?: {
      from: string;
      to: string;
    };
    securityFlags?: string[];
  };
}

interface NotificationEvent {
  type: 'device_detected' | 'notification_sent' | 'notification_acknowledged' | 'action_required' | 'security_alert';
  timestamp: number;
  userId: string;
  deviceId: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class NewDeviceNotificationService {
  private static instance: NewDeviceNotificationService;
  private cryptoService: CryptoService;
  private deviceSecurity: DeviceSecurityService;
  private deviceBinding: DeviceBindingService;
  private knownDevices: Map<string, DeviceInfo> = new Map();
  private notifications: Map<string, DeviceNotification> = new Map();
  private notificationEvents: NotificationEvent[] = [];
  private isInitialized = false;

  // CRITICAL: Device detection and notification configuration
  private readonly DEVICE_TRUST_THRESHOLD = 0.8;
  private readonly RISK_SCORE_THRESHOLD = 70;
  private readonly NOTIFICATION_RETENTION_DAYS = 30;
  private readonly MAX_NOTIFICATIONS = 1000;
  private readonly DEVICE_MEMORY_DAYS = 90;

  private constructor() {
    this.cryptoService = CryptoService.getInstance();
    this.deviceSecurity = DeviceSecurityService.getInstance();
    this.deviceBinding = DeviceBindingService.getInstance();
  }

  static getInstance(): NewDeviceNotificationService {
    if (!NewDeviceNotificationService.instance) {
      NewDeviceNotificationService.instance = new NewDeviceNotificationService();
    }
    return NewDeviceNotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadKnownDevices();
      await this.loadNotifications();
      await this.performInitialCleanup();
      
      this.isInitialized = true;
      console.log('📱 New Device Notification Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize New Device Notification Service:', error);
      throw error;
    }
  }

  // CRITICAL: Check and notify for new device login with enhanced FCM integration
  async checkAndNotifyNewDevice(
    userId: string,
    sessionId: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      location?: {
        country?: string;
        city?: string;
      };
    }
  ): Promise<{
    isNewDevice: boolean;
    requiresConfirmation: boolean;
    notificationId?: string;
    riskScore: number;
    deviceTrusted: boolean;
    fcmNotificationSent: boolean;
    inAppNotificationSent: boolean;
  }> {
    try {
      const currentDeviceInfo = await this.getCurrentDeviceInfo(userId, metadata);
      const deviceKey = this.generateDeviceKey(userId, currentDeviceInfo.deviceId);
      
      const knownDevice = this.knownDevices.get(deviceKey);
      const isNewDevice = !knownDevice;
      const isDeviceChanged = knownDevice && !this.isDeviceMatch(knownDevice, currentDeviceInfo);
      
      let notificationId: string | undefined;
      let requiresConfirmation = false;
      let fcmNotificationSent = false;
      let inAppNotificationSent = false;
      
      if (isNewDevice || isDeviceChanged) {
        // Create notification for new or changed device
        const notification = await this.createDeviceNotification(
          userId,
          currentDeviceInfo,
          isNewDevice ? 'new_device' : 'device_change',
          knownDevice
        );
        
        notificationId = notification.id;
        requiresConfirmation = notification.requiresAction;
        
        // Send comprehensive notifications
        const notificationResults = await this.sendDeviceNotification(notification);
        fcmNotificationSent = notificationResults.fcmSent;
        inAppNotificationSent = notificationResults.inAppSent;
        
        // CRITICAL: Send immediate FCM notification for new device login
        if (isNewDevice) {
          await this.sendImmediateNewDeviceAlert(userId, currentDeviceInfo, notification);
          fcmNotificationSent = true;
        }
        
        this.logNotificationEvent({
          type: 'device_detected',
          timestamp: Date.now(),
          userId,
          deviceId: currentDeviceInfo.deviceId,
          details: {
            isNewDevice,
            isDeviceChanged,
            riskScore: currentDeviceInfo.riskScore,
            requiresConfirmation,
            fcmNotificationSent,
            inAppNotificationSent,
            notificationId
          },
          severity: currentDeviceInfo.riskScore > this.RISK_SCORE_THRESHOLD ? 'high' : 'medium'
        });
      }
      
      // Update or add device to known devices
      currentDeviceInfo.lastSeen = Date.now();
      if (!isNewDevice && knownDevice) {
        currentDeviceInfo.firstSeen = knownDevice.firstSeen;
        currentDeviceInfo.isKnown = true;
        currentDeviceInfo.isTrusted = knownDevice.isTrusted;
      }
      
      this.knownDevices.set(deviceKey, currentDeviceInfo);
      await this.saveKnownDevices();
      
      return {
        isNewDevice: isNewDevice || isDeviceChanged,
        requiresConfirmation,
        notificationId,
        riskScore: currentDeviceInfo.riskScore,
        deviceTrusted: currentDeviceInfo.isTrusted,
        fcmNotificationSent,
        inAppNotificationSent
      };
    } catch (error) {
      console.error('❌ Failed to check and notify new device:', error);
      return {
        isNewDevice: false,
        requiresConfirmation: false,
        riskScore: 100,
        deviceTrusted: false,
        fcmNotificationSent: false,
        inAppNotificationSent: false
      };
    }
  }

  // Get current device information
  private async getCurrentDeviceInfo(
    userId: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      location?: {
        country?: string;
        city?: string;
      };
    }
  ): Promise<DeviceInfo> {
    const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
    const deviceBinding = this.deviceBinding.getCurrentDeviceFingerprint();
    
    const deviceInfo: DeviceInfo = {
      deviceId: deviceFingerprint?.securityHash || 'unknown',
      deviceFingerprint: deviceBinding?.securityHash || 'unknown',
      platform: Platform.OS,
      model: deviceFingerprint?.model || 'unknown',
      osVersion: deviceFingerprint?.osVersion || 'unknown',
      appVersion: deviceFingerprint?.appVersion || '1.0.0',
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      isKnown: false,
      isTrusted: false,
      riskScore: await this.calculateDeviceRiskScore(deviceFingerprint, metadata),
      location: metadata?.location,
      userAgent: metadata?.userAgent || Platform.OS
    };
    
    return deviceInfo;
  }

  // Calculate device risk score
  private async calculateDeviceRiskScore(
    deviceFingerprint: any,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      location?: {
        country?: string;
        city?: string;
      };
    }
  ): Promise<number> {
    let riskScore = 0;
    
    // Check device security status
    const securityStatus = this.deviceSecurity.getSecurityStatus();
    if (!securityStatus.isSecure) {
      riskScore += 40;
    }
    
    // Check for emulator/simulator
    if (deviceFingerprint?.model?.toLowerCase().includes('emulator') ||
        deviceFingerprint?.model?.toLowerCase().includes('simulator')) {
      riskScore += 30;
    }
    
    // Check for development environment
    if (__DEV__) {
      riskScore += 20;
    }
    
    // Check for suspicious user agent
    if (metadata?.userAgent) {
      const suspiciousPatterns = ['bot', 'crawler', 'spider', 'scraper'];
      if (suspiciousPatterns.some(pattern => 
        metadata.userAgent!.toLowerCase().includes(pattern))) {
        riskScore += 25;
      }
    }
    
    // Check for VPN/Proxy indicators (simplified)
    if (metadata?.location?.country === 'Unknown' || 
        metadata?.ipAddress?.startsWith('10.') ||
        metadata?.ipAddress?.startsWith('192.168.')) {
      riskScore += 15;
    }
    
    // Check device age (very new devices are more suspicious)
    if (deviceFingerprint?.timestamp && 
        Date.now() - deviceFingerprint.timestamp < 60000) { // Less than 1 minute
      riskScore += 10;
    }
    
    return Math.min(riskScore, 100);
  }

  // Check if device matches known device
  private isDeviceMatch(knownDevice: DeviceInfo, currentDevice: DeviceInfo): boolean {
    // Check device fingerprint similarity
    if (knownDevice.deviceFingerprint !== currentDevice.deviceFingerprint) {
      return false;
    }
    
    // Check platform consistency
    if (knownDevice.platform !== currentDevice.platform) {
      return false;
    }
    
    // Check model consistency (allow for minor variations)
    if (knownDevice.model !== currentDevice.model && 
        !this.isModelSimilar(knownDevice.model, currentDevice.model)) {
      return false;
    }
    
    return true;
  }

  // Check if models are similar (for device updates)
  private isModelSimilar(model1: string, model2: string): boolean {
    // Remove version numbers and compare base model
    const normalize = (model: string) => 
      model.toLowerCase().replace(/[0-9]/g, '').replace(/[^a-z]/g, '');
    
    return normalize(model1) === normalize(model2);
  }

  // Create device notification
  private async createDeviceNotification(
    userId: string,
    deviceInfo: DeviceInfo,
    notificationType: DeviceNotification['notificationType'],
    previousDevice?: DeviceInfo
  ): Promise<DeviceNotification> {
    const notificationId = await this.generateNotificationId();
    
    const severity = this.calculateNotificationSeverity(deviceInfo, notificationType);
    const requiresAction = severity === 'high' || severity === 'critical' || 
                          deviceInfo.riskScore > this.RISK_SCORE_THRESHOLD;
    
    const notification: DeviceNotification = {
      id: notificationId,
      userId,
      deviceInfo,
      notificationType,
      timestamp: Date.now(),
      acknowledged: false,
      severity,
      requiresAction,
      metadata: {
        previousDevice,
        securityFlags: this.generateSecurityFlags(deviceInfo)
      }
    };
    
    this.notifications.set(notificationId, notification);
    await this.saveNotifications();
    
    return notification;
  }

  // Calculate notification severity
  private calculateNotificationSeverity(
    deviceInfo: DeviceInfo,
    notificationType: DeviceNotification['notificationType']
  ): DeviceNotification['severity'] {
    if (deviceInfo.riskScore >= 80) {
      return 'critical';
    } else if (deviceInfo.riskScore >= 60) {
      return 'high';
    } else if (notificationType === 'new_device' || notificationType === 'device_change') {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // Generate security flags
  private generateSecurityFlags(deviceInfo: DeviceInfo): string[] {
    const flags: string[] = [];
    
    if (deviceInfo.riskScore > this.RISK_SCORE_THRESHOLD) {
      flags.push('high_risk_device');
    }
    
    if (deviceInfo.model.toLowerCase().includes('emulator')) {
      flags.push('emulator_detected');
    }
    
    if (__DEV__) {
      flags.push('development_environment');
    }
    
    if (!deviceInfo.location) {
      flags.push('unknown_location');
    }
    
    const securityStatus = this.deviceSecurity.getSecurityStatus();
    if (!securityStatus.isSecure) {
      flags.push('device_security_compromised');
    }
    
    return flags;
  }

  // Send device notification with enhanced tracking
  private async sendDeviceNotification(notification: DeviceNotification): Promise<{
    fcmSent: boolean;
    inAppSent: boolean;
    emailSent: boolean;
  }> {
    let fcmSent = false;
    let inAppSent = false;
    let emailSent = false;
    
    try {
      // Send FCM notification
      try {
        await this.sendFCMNotification(notification);
        fcmSent = true;
      } catch (error) {
        console.error('Failed to send FCM notification:', error);
      }
      
      // Send in-app notification
      try {
        await this.sendInAppNotification(notification);
        inAppSent = true;
      } catch (error) {
        console.error('Failed to send in-app notification:', error);
      }
      
      // Store notification for in-app display
      await this.storeInAppNotification(notification);
      
      console.log(`📱 Device notification sent: ${notification.notificationType}`);
      console.log(`   User: ${notification.userId}`);
      console.log(`   Device: ${notification.deviceInfo.model} (${notification.deviceInfo.platform})`);
      console.log(`   Risk Score: ${notification.deviceInfo.riskScore}`);
      console.log(`   Requires Action: ${notification.requiresAction}`);
      console.log(`   FCM Sent: ${fcmSent}, In-App Sent: ${inAppSent}`);
      
      this.logNotificationEvent({
        type: 'notification_sent',
        timestamp: Date.now(),
        userId: notification.userId,
        deviceId: notification.deviceInfo.deviceId,
        details: {
          notificationType: notification.notificationType,
          severity: notification.severity,
          requiresAction: notification.requiresAction,
          fcmSent,
          inAppSent,
          emailSent
        },
        severity: notification.severity
      });
      
      return { fcmSent, inAppSent, emailSent };
    } catch (error) {
      console.error('❌ Failed to send device notification:', error);
      return { fcmSent, inAppSent, emailSent };
    }
  }

  // Send FCM notification
  private async sendFCMNotification(notification: DeviceNotification): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web push notification
        await this.sendWebPushNotification(notification);
      } else {
        // Mobile FCM notification
        await this.sendMobileFCMNotification(notification);
      }
    } catch (error) {
      console.error('❌ Failed to send FCM notification:', error);
    }
  }

  // Send web push notification
  private async sendWebPushNotification(notification: DeviceNotification): Promise<void> {
    try {
      if ('Notification' in window && 'serviceWorker' in navigator) {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          const title = this.getNotificationTitle(notification);
          const message = this.getNotificationMessage(notification);
          
          new Notification(title, {
            body: message,
            icon: '/assets/images/icon.png',
            badge: '/assets/images/icon.png',
            tag: `device-${notification.id}`,
            requireInteraction: notification.requiresAction,
            data: {
              notificationId: notification.id,
              type: notification.notificationType,
              severity: notification.severity
            }
          });
          
          console.log('🔔 Web push notification sent');
        }
      }
    } catch (error) {
      console.error('❌ Failed to send web push notification:', error);
    }
  }

  // Send mobile FCM notification
  private async sendMobileFCMNotification(notification: DeviceNotification): Promise<void> {
    try {
      // In production, this would use expo-notifications or react-native-firebase
      // For now, we'll simulate the FCM notification
      
      const fcmPayload = {
        to: `/topics/user_${notification.userId}`,
        notification: {
          title: this.getNotificationTitle(notification),
          body: this.getNotificationMessage(notification),
          icon: 'ic_notification',
          sound: 'default',
          priority: notification.severity === 'critical' ? 'high' : 'normal'
        },
        data: {
          notificationId: notification.id,
          type: notification.notificationType,
          severity: notification.severity,
          requiresAction: notification.requiresAction.toString(),
          deviceId: notification.deviceInfo.deviceId,
          timestamp: notification.timestamp.toString()
        },
        android: {
          priority: notification.severity === 'critical' ? 'high' : 'normal',
          notification: {
            channel_id: 'security_alerts',
            color: notification.severity === 'critical' ? '#FF0000' : '#FFA500'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: this.getNotificationTitle(notification),
                body: this.getNotificationMessage(notification)
              },
              sound: 'default',
              badge: 1,
              'content-available': 1
            }
          }
        }
      };
      
      // In production, send to FCM endpoint
      console.log('📱 FCM notification payload prepared:', fcmPayload);
      
      // Simulate FCM delivery
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('🔔 Mobile FCM notification sent');
    } catch (error) {
      console.error('❌ Failed to send mobile FCM notification:', error);
    }
  }

  // Send in-app notification
  private async sendInAppNotification(notification: DeviceNotification): Promise<void> {
    try {
      // Import SecurityNotificationService dynamically to avoid circular dependencies
      const { SecurityNotificationService } = await import('./SecurityNotificationService');
      const notificationService = SecurityNotificationService.getInstance();
      
      await notificationService.createNotification({
        id: notification.id,
        type: 'device_security',
        title: this.getNotificationTitle(notification),
        message: this.getNotificationMessage(notification),
        severity: notification.severity,
        category: 'device_management',
        requiresAction: notification.requiresAction,
        actionButtons: notification.requiresAction ? [
          {
            id: 'trust_device',
            label: 'Trust Device',
            action: 'trust_device',
            style: 'primary'
          },
          {
            id: 'block_device',
            label: 'Block Device',
            action: 'block_device',
            style: 'danger'
          },
          {
            id: 'ignore',
            label: 'Ignore',
            action: 'ignore',
            style: 'secondary'
          }
        ] : [
          {
            id: 'acknowledge',
            label: 'OK',
            action: 'acknowledge',
            style: 'primary'
          }
        ],
        metadata: {
          deviceInfo: notification.deviceInfo,
          notificationType: notification.notificationType,
          securityFlags: notification.metadata?.securityFlags
        },
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        userId: notification.userId
      });
      
      console.log('📲 In-app notification sent');
    } catch (error) {
      console.error('❌ Failed to send in-app notification:', error);
    }
  }

  // Store in-app notification
  private async storeInAppNotification(notification: DeviceNotification): Promise<void> {
    try {
      const inAppNotification = {
        id: notification.id,
        title: this.getNotificationTitle(notification),
        message: this.getNotificationMessage(notification),
        type: notification.notificationType,
        severity: notification.severity,
        timestamp: notification.timestamp,
        requiresAction: notification.requiresAction,
        data: {
          deviceInfo: notification.deviceInfo,
          securityFlags: notification.metadata?.securityFlags
        }
      };
      
      const existingNotifications = await this.getStoredInAppNotifications();
      existingNotifications.unshift(inAppNotification);
      
      // Keep only recent notifications
      const maxNotifications = 50;
      if (existingNotifications.length > maxNotifications) {
        existingNotifications.splice(maxNotifications);
      }
      
      const encryptedNotifications = this.cryptoService.encrypt(
        JSON.stringify(existingNotifications)
      );
      
      await AsyncStorage.setItem('in_app_notifications', encryptedNotifications);
    } catch (error) {
      console.error('❌ Failed to store in-app notification:', error);
    }
  }

  // Get notification title
  private getNotificationTitle(notification: DeviceNotification): string {
    switch (notification.notificationType) {
      case 'new_device':
        return 'New Device Login Detected';
      case 'device_change':
        return 'Device Change Detected';
      case 'suspicious_device':
        return 'Suspicious Device Activity';
      case 'location_change':
        return 'Login from New Location';
      default:
        return 'Security Alert';
    }
  }

  // Get notification message
  private getNotificationMessage(notification: DeviceNotification): string {
    const device = notification.deviceInfo;
    const location = device.location ? 
      `from ${device.location.city}, ${device.location.country}` : 
      'from an unknown location';
    
    switch (notification.notificationType) {
      case 'new_device':
        return `A new ${device.platform} device (${device.model}) logged into your account ${location}. If this wasn't you, please secure your account immediately.`;
      case 'device_change':
        return `Device characteristics have changed for your ${device.platform} device. This could indicate a security issue.`;
      case 'suspicious_device':
        return `Suspicious activity detected from ${device.platform} device ${location}. Risk score: ${device.riskScore}.`;
      case 'location_change':
        return `Login detected from a new location: ${location}. If this wasn't you, please review your account security.`;
      default:
        return 'Unusual device activity detected. Please review your account security.';
    }
  }

  // Acknowledge notification
  async acknowledgeNotification(
    notificationId: string,
    userId: string,
    action?: 'trust_device' | 'block_device' | 'ignore'
  ): Promise<boolean> {
    try {
      const notification = this.notifications.get(notificationId);
      if (!notification || notification.userId !== userId) {
        return false;
      }
      
      notification.acknowledged = true;
      notification.actionTaken = action;
      
      // Apply action
      if (action === 'trust_device') {
        await this.trustDevice(userId, notification.deviceInfo.deviceId);
      } else if (action === 'block_device') {
        await this.blockDevice(userId, notification.deviceInfo.deviceId);
      }
      
      this.notifications.set(notificationId, notification);
      await this.saveNotifications();
      
      this.logNotificationEvent({
        type: 'notification_acknowledged',
        timestamp: Date.now(),
        userId,
        deviceId: notification.deviceInfo.deviceId,
        details: {
          notificationId,
          action: action || 'acknowledged'
        },
        severity: 'low'
      });
      
      console.log(`✅ Notification acknowledged: ${notificationId} (${action || 'no action'})`);
      return true;
    } catch (error) {
      console.error('❌ Failed to acknowledge notification:', error);
      return false;
    }
  }

  // Trust device
  private async trustDevice(userId: string, deviceId: string): Promise<void> {
    try {
      const deviceKey = this.generateDeviceKey(userId, deviceId);
      const device = this.knownDevices.get(deviceKey);
      
      if (device) {
        device.isTrusted = true;
        device.riskScore = Math.min(device.riskScore, 20); // Reduce risk score for trusted devices
        
        this.knownDevices.set(deviceKey, device);
        await this.saveKnownDevices();
        
        console.log(`🔒 Device trusted: ${deviceId}`);
      }
    } catch (error) {
      console.error('❌ Failed to trust device:', error);
    }
  }

  // Block device
  private async blockDevice(userId: string, deviceId: string): Promise<void> {
    try {
      const deviceKey = this.generateDeviceKey(userId, deviceId);
      const device = this.knownDevices.get(deviceKey);
      
      if (device) {
        device.isTrusted = false;
        device.riskScore = 100; // Maximum risk score for blocked devices
        
        this.knownDevices.set(deviceKey, device);
        await this.saveKnownDevices();
        
        // CRITICAL: In production, this would also revoke all sessions for this device
        console.log(`🚫 Device blocked: ${deviceId}`);
      }
    } catch (error) {
      console.error('❌ Failed to block device:', error);
    }
  }

  // Get user notifications
  async getUserNotifications(
    userId: string,
    includeAcknowledged: boolean = false
  ): Promise<DeviceNotification[]> {
    try {
      const userNotifications = Array.from(this.notifications.values())
        .filter(notification => 
          notification.userId === userId &&
          (includeAcknowledged || !notification.acknowledged)
        )
        .sort((a, b) => b.timestamp - a.timestamp);
      
      return userNotifications;
    } catch (error) {
      console.error('❌ Failed to get user notifications:', error);
      return [];
    }
  }

  // Get stored in-app notifications
  private async getStoredInAppNotifications(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('in_app_notifications');
      if (stored) {
        const decrypted = this.cryptoService.decrypt(stored);
        return JSON.parse(decrypted);
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to get stored notifications:', error);
      return [];
    }
  }

  // Get user devices
  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    try {
      const userDevices = Array.from(this.knownDevices.values())
        .filter(device => {
          const deviceKey = this.generateDeviceKey(userId, device.deviceId);
          return this.knownDevices.has(deviceKey);
        })
        .sort((a, b) => b.lastSeen - a.lastSeen);
      
      return userDevices;
    } catch (error) {
      console.error('❌ Failed to get user devices:', error);
      return [];
    }
  }

  // Generate device key
  private generateDeviceKey(userId: string, deviceId: string): string {
    return this.cryptoService.hash(`${userId}:${deviceId}`);
  }

  // Generate notification ID
  private async generateNotificationId(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 9);
    return this.cryptoService.hash(`${timestamp}:${random}`);
  }

  // Load known devices
  private async loadKnownDevices(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('known_devices');
      if (stored) {
        const encryptedData = JSON.parse(stored);
        const decryptedData = this.cryptoService.decrypt(encryptedData);
        const data = JSON.parse(decryptedData);
        
        for (const [key, device] of Object.entries(data)) {
          this.knownDevices.set(key, device as DeviceInfo);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load known devices:', error);
    }
  }

  // Save known devices
  private async saveKnownDevices(): Promise<void> {
    try {
      const data = Object.fromEntries(this.knownDevices);
      const encryptedData = this.cryptoService.encrypt(JSON.stringify(data));
      await AsyncStorage.setItem('known_devices', JSON.stringify(encryptedData));
    } catch (error) {
      console.error('❌ Failed to save known devices:', error);
    }
  }

  // Load notifications
  private async loadNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('device_notifications');
      if (stored) {
        const encryptedData = JSON.parse(stored);
        const decryptedData = this.cryptoService.decrypt(encryptedData);
        const data = JSON.parse(decryptedData);
        
        for (const [key, notification] of Object.entries(data)) {
          this.notifications.set(key, notification as DeviceNotification);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load notifications:', error);
    }
  }

  // Save notifications
  private async saveNotifications(): Promise<void> {
    try {
      const data = Object.fromEntries(this.notifications);
      const encryptedData = this.cryptoService.encrypt(JSON.stringify(data));
      await AsyncStorage.setItem('device_notifications', JSON.stringify(encryptedData));
    } catch (error) {
      console.error('❌ Failed to save notifications:', error);
    }
  }

  // Perform initial cleanup
  private async performInitialCleanup(): Promise<void> {
    try {
      const now = Date.now();
      const deviceRetentionTime = this.DEVICE_MEMORY_DAYS * 24 * 60 * 60 * 1000;
      const notificationRetentionTime = this.NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;
      
      // Clean old devices
      let cleanedDevices = 0;
      for (const [key, device] of this.knownDevices) {
        if (now - device.lastSeen > deviceRetentionTime) {
          this.knownDevices.delete(key);
          cleanedDevices++;
        }
      }
      
      // Clean old notifications
      let cleanedNotifications = 0;
      for (const [key, notification] of this.notifications) {
        if (now - notification.timestamp > notificationRetentionTime) {
          this.notifications.delete(key);
          cleanedNotifications++;
        }
      }
      
      if (cleanedDevices > 0 || cleanedNotifications > 0) {
        await this.saveKnownDevices();
        await this.saveNotifications();
        console.log(`🧹 Cleanup completed: ${cleanedDevices} devices, ${cleanedNotifications} notifications`);
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  // Log notification event
  private logNotificationEvent(event: NotificationEvent): void {
    this.notificationEvents.push(event);
    
    // Keep only last 1000 events
    if (this.notificationEvents.length > 1000) {
      this.notificationEvents = this.notificationEvents.slice(-1000);
    }

    // Log critical events immediately
    if (event.severity === 'critical') {
      console.error('CRITICAL DEVICE NOTIFICATION EVENT:', event);
    }
  }

  // CRITICAL: Send immediate new device alert with FCM and in-app notifications
  private async sendImmediateNewDeviceAlert(
    userId: string,
    deviceInfo: DeviceInfo,
    notification: DeviceNotification
  ): Promise<void> {
    try {
      const deviceName = deviceInfo.model || 'Unknown Device';
      const location = deviceInfo.location ? 
        `${deviceInfo.location.city}, ${deviceInfo.location.country}` : 
        'Unknown Location';
      
      // Send immediate FCM push notification
      await this.sendImmediateFCMAlert({
        title: '🚨 New Device Login Alert',
        body: `Login detected from ${deviceName} in ${location}. If this wasn't you, secure your account immediately.`,
        data: {
          type: 'NEW_DEVICE_LOGIN',
          userId,
          deviceId: deviceInfo.deviceId,
          deviceName,
          location,
          riskScore: deviceInfo.riskScore.toString(),
          timestamp: Date.now().toString(),
          notificationId: notification.id,
          requiresAction: notification.requiresAction.toString()
        },
        priority: 'high',
        sound: 'default',
        badge: 1
      });
      
      // Send high-priority in-app notification
      await this.sendHighPriorityInAppAlert({
        id: notification.id,
        type: 'NEW_DEVICE_LOGIN',
        title: 'New Device Login Detected',
        message: `Login from ${deviceName} in ${location}`,
        severity: deviceInfo.riskScore >= 70 ? 'critical' : 'high',
        actionRequired: true,
        deviceInfo,
        timestamp: Date.now(),
        userId
      });
      
      console.log(`🚨 Immediate new device alert sent for user ${userId}`);
      console.log(`   Device: ${deviceName}`);
      console.log(`   Location: ${location}`);
      console.log(`   Risk Score: ${deviceInfo.riskScore}`);
      
    } catch (error) {
      console.error('❌ Failed to send immediate new device alert:', error);
    }
  }
  
  // Send immediate FCM alert
  private async sendImmediateFCMAlert(alert: {
    title: string;
    body: string;
    data: Record<string, string>;
    priority: 'normal' | 'high';
    sound?: string;
    badge?: number;
  }): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web push notification
        if ('Notification' in window && Notification.permission === 'granted') {
          const webNotification = new Notification(alert.title, {
            body: alert.body,
            icon: '/assets/images/icon.png',
            badge: '/assets/images/icon.png',
            tag: 'new-device-login',
            requireInteraction: true,
            silent: false,
            data: alert.data
          });
          
          // Auto-close after 15 seconds
          setTimeout(() => webNotification.close(), 15000);
          
          console.log('🔔 Web push notification sent for new device login');
        }
        return;
      }
      
      // Mobile FCM notification using expo-notifications
      const notificationId = await this.scheduleImmediateNotification({
        title: alert.title,
        body: alert.body,
        data: alert.data,
        categoryIdentifier: 'NEW_DEVICE_LOGIN',
        priority: alert.priority,
        sound: alert.sound || 'default',
        badge: alert.badge || 1
      });
      
      console.log(`📱 FCM notification scheduled with ID: ${notificationId}`);
      
    } catch (error) {
      console.error('❌ Failed to send immediate FCM alert:', error);
    }
  }
  
  // Schedule immediate notification
  private async scheduleImmediateNotification(notification: {
    title: string;
    body: string;
    data: Record<string, string>;
    categoryIdentifier: string;
    priority: 'normal' | 'high';
    sound: string;
    badge: number;
  }): Promise<string> {
    try {
      // This would use expo-notifications in a real implementation
      // For now, we'll simulate the notification scheduling
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate notification payload
      const notificationPayload = {
        to: 'ExponentPushToken[user_device_token]', // Would be actual device token
        sound: notification.sound,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        priority: notification.priority,
        badge: notification.badge,
        channelId: 'security_alerts',
        categoryId: notification.categoryIdentifier
      };
      
      console.log('Notification payload prepared:', notificationPayload);
      
      // In production, this would send to Expo's push notification service
      // await Notifications.scheduleNotificationAsync({
      //   content: {
      //     title: notification.title,
      //     body: notification.body,
      //     data: notification.data,
      //     categoryIdentifier: notification.categoryIdentifier,
      //     sound: notification.sound,
      //     badge: notification.badge
      //   },
      //   trigger: null // Send immediately
      // });
      
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule immediate notification:', error);
      throw error;
    }
  }
  
  // Send high-priority in-app alert
  private async sendHighPriorityInAppAlert(alert: {
    id: string;
    type: string;
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    actionRequired: boolean;
    deviceInfo: DeviceInfo;
    timestamp: number;
    userId: string;
  }): Promise<void> {
    try {
      // Store in high-priority alerts for immediate display
      const highPriorityAlerts = await this.getHighPriorityAlerts();
      const alertWithMetadata = {
        ...alert,
        read: false,
        dismissed: false,
        actions: [
          {
            id: 'trust_device',
            label: 'Trust This Device',
            action: 'trust_device',
            style: 'primary'
          },
          {
            id: 'block_device',
            label: 'Block Device',
            action: 'block_device',
            style: 'danger'
          },
          {
            id: 'review_security',
            label: 'Review Security',
            action: 'review_security',
            style: 'secondary'
          }
        ]
      };
      
      highPriorityAlerts.unshift(alertWithMetadata);
      
      // Keep only last 20 high-priority alerts
      const trimmedAlerts = highPriorityAlerts.slice(0, 20);
      
      const encryptedAlerts = this.cryptoService.encrypt(JSON.stringify(trimmedAlerts));
      await AsyncStorage.setItem('high_priority_device_alerts', encryptedAlerts);
      
      // Trigger immediate in-app display
      this.triggerInAppAlertDisplay(alertWithMetadata);
      
      console.log(`📲 High-priority in-app alert sent: ${alert.title}`);
      
    } catch (error) {
      console.error('❌ Failed to send high-priority in-app alert:', error);
    }
  }
  
  // Get high-priority alerts
  private async getHighPriorityAlerts(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('high_priority_device_alerts');
      if (stored) {
        const decrypted = this.cryptoService.decrypt(stored);
        return JSON.parse(decrypted);
      }
      return [];
    } catch (error) {
      console.error('Failed to get high-priority alerts:', error);
      return [];
    }
  }
  
  // Trigger in-app alert display
  private triggerInAppAlertDisplay(alert: any): void {
    try {
      // In a real app, this would trigger a modal or banner component
      // Could integrate with React Navigation, state management, or event system
      console.warn('🚨 HIGH-PRIORITY DEVICE ALERT:', alert.title, '-', alert.message);
      
      // Example integration points:
      // - EventEmitter.emit('high-priority-alert', alert);
      // - NavigationService.navigate('SecurityAlert', { alert });
      // - GlobalStateManager.showSecurityAlert(alert);
      // - NotificationBanner.show(alert);
      
      // For demonstration, we'll store a flag that the UI can check
      AsyncStorage.setItem('pending_security_alert', JSON.stringify({
        hasAlert: true,
        alertId: alert.id,
        timestamp: Date.now()
      }));
      
    } catch (error) {
      console.error('Failed to trigger in-app alert display:', error);
    }
  }

  // Get notification statistics
  async getNotificationStatistics(): Promise<{
    totalNotifications: number;
    pendingNotifications: number;
    acknowledgedNotifications: number;
    notificationsByType: Record<string, number>;
    notificationsBySeverity: Record<string, number>;
    knownDevices: number;
    trustedDevices: number;
    blockedDevices: number;
    averageRiskScore: number;
    fcmNotificationsSent: number;
    inAppNotificationsSent: number;
    highPriorityAlerts: number;
  }> {
    try {
      const notifications = Array.from(this.notifications.values());
      const devices = Array.from(this.knownDevices.values());
      const highPriorityAlerts = await this.getHighPriorityAlerts();
      
      const notificationsByType: Record<string, number> = {};
      const notificationsBySeverity: Record<string, number> = {};
      
      let pendingNotifications = 0;
      let acknowledgedNotifications = 0;
      let fcmNotificationsSent = 0;
      let inAppNotificationsSent = 0;
      
      for (const notification of notifications) {
        if (notification.acknowledged) {
          acknowledgedNotifications++;
        } else {
          pendingNotifications++;
        }
        
        notificationsByType[notification.notificationType] = 
          (notificationsByType[notification.notificationType] || 0) + 1;
        
        notificationsBySeverity[notification.severity] = 
          (notificationsBySeverity[notification.severity] || 0) + 1;
      }
      
      // Count FCM and in-app notifications from events
      const events = this.getNotificationEvents();
      for (const event of events) {
        if (event.details?.fcmSent) fcmNotificationsSent++;
        if (event.details?.inAppSent) inAppNotificationsSent++;
      }
      
      const trustedDevices = devices.filter(d => d.isTrusted).length;
      const blockedDevices = devices.filter(d => d.riskScore >= 100).length;
      const averageRiskScore = devices.length > 0 ? 
        devices.reduce((sum, d) => sum + d.riskScore, 0) / devices.length : 0;
      
      return {
        totalNotifications: notifications.length,
        pendingNotifications,
        acknowledgedNotifications,
        notificationsByType,
        notificationsBySeverity,
        knownDevices: devices.length,
        trustedDevices,
        blockedDevices,
        averageRiskScore,
        fcmNotificationsSent,
        inAppNotificationsSent,
        highPriorityAlerts: highPriorityAlerts.length
      };
    } catch (error) {
      console.error('❌ Failed to get notification statistics:', error);
      return {
        totalNotifications: 0,
        pendingNotifications: 0,
        acknowledgedNotifications: 0,
        notificationsByType: {},
        notificationsBySeverity: {},
        knownDevices: 0,
        trustedDevices: 0,
        blockedDevices: 0,
        averageRiskScore: 0,
        fcmNotificationsSent: 0,
        inAppNotificationsSent: 0,
        highPriorityAlerts: 0
      };
    }
  }

  // Get notification events
  getNotificationEvents(): NotificationEvent[] {
    return [...this.notificationEvents];
  }
}

export default NewDeviceNotificationService;