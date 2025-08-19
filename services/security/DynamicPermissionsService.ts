import { Platform } from 'react-native';
import * as Camera from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  expires: 'never' | number;
  status: 'granted' | 'denied' | 'undetermined';
}

interface PermissionUsage {
  permission: string;
  timestamp: number;
  duration: number;
  context: string;
  suspicious: boolean;
}

interface PermissionAlert {
  id: string;
  permission: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  resolved: boolean;
}

class DynamicPermissionsService {
  private permissionUsageHistory: PermissionUsage[] = [];
  private permissionAlerts: PermissionAlert[] = [];
  private monitoringActive: boolean = false;
  private usageStartTimes: Map<string, number> = new Map();

  constructor() {
    this.loadPermissionHistory();
    this.startPermissionMonitoring();
  }

  // بدء مراقبة الصلاحيات
  async startPermissionMonitoring(): Promise<void> {
    if (this.monitoringActive) return;
    
    this.monitoringActive = true;
    console.log('🔍 Dynamic permissions monitoring started');
    
    // مراقبة دورية كل 30 ثانية
    setInterval(() => {
      this.checkPermissionAnomalies();
    }, 30000);
  }

  // إيقاف مراقبة الصلاحيات
  stopPermissionMonitoring(): void {
    this.monitoringActive = false;
    console.log('🛑 Dynamic permissions monitoring stopped');
  }

  // طلب صلاحية الكاميرا مع المراقبة
  async requestCameraPermission(context: string = 'general'): Promise<PermissionStatus> {
    try {
      const startTime = Date.now();
      this.usageStartTimes.set('camera', startTime);
      
      if (Platform.OS === 'web') {
        // للويب، استخدام navigator.mediaDevices
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
          const status: PermissionStatus = {
            granted: true,
            canAskAgain: true,
            expires: 'never',
            status: 'granted'
          };
          
          this.logPermissionUsage('camera', startTime, context, false);
          return status;
        } catch (error) {
          const status: PermissionStatus = {
            granted: false,
            canAskAgain: true,
            expires: 'never',
            status: 'denied'
          };
          
          this.logPermissionUsage('camera', startTime, context, false);
          return status;
        }
      } else {
        // للموبايل، استخدام expo-camera
        const { status } = await Camera.requestCameraPermissionsAsync();
        
        const permissionStatus: PermissionStatus = {
          granted: status === 'granted',
          canAskAgain: status !== 'denied',
          expires: 'never',
          status: status as 'granted' | 'denied' | 'undetermined'
        };
        
        this.logPermissionUsage('camera', startTime, context, false);
        
        // فحص الاستخدام المشبوه
        if (this.isSuspiciousUsage('camera', context)) {
          await this.createPermissionAlert('camera', 'Suspicious camera access pattern detected', 'medium');
        }
        
        return permissionStatus;
      }
    } catch (error) {
      console.error('Camera permission request failed:', error);
      return {
        granted: false,
        canAskAgain: false,
        expires: 'never',
        status: 'denied'
      };
    }
  }

  // طلب صلاحية المايكروفون مع المراقبة
  async requestMicrophonePermission(context: string = 'general'): Promise<PermissionStatus> {
    try {
      const startTime = Date.now();
      this.usageStartTimes.set('microphone', startTime);
      
      if (Platform.OS === 'web') {
        // للويب، استخدام navigator.mediaDevices
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          const status: PermissionStatus = {
            granted: true,
            canAskAgain: true,
            expires: 'never',
            status: 'granted'
          };
          
          this.logPermissionUsage('microphone', startTime, context, false);
          return status;
        } catch (error) {
          const status: PermissionStatus = {
            granted: false,
            canAskAgain: true,
            expires: 'never',
            status: 'denied'
          };
          
          this.logPermissionUsage('microphone', startTime, context, false);
          return status;
        }
      } else {
        // للموبايل، استخدام expo-av
        const { status } = await Camera.requestMicrophonePermissionsAsync();
        
        const permissionStatus: PermissionStatus = {
          granted: status === 'granted',
          canAskAgain: status !== 'denied',
          expires: 'never',
          status: status as 'granted' | 'denied' | 'undetermined'
        };
        
        this.logPermissionUsage('microphone', startTime, context, false);
        
        // فحص الاستخدام المشبوه
        if (this.isSuspiciousUsage('microphone', context)) {
          await this.createPermissionAlert('microphone', 'Suspicious microphone access pattern detected', 'high');
        }
        
        return permissionStatus;
      }
    } catch (error) {
      console.error('Microphone permission request failed:', error);
      return {
        granted: false,
        canAskAgain: false,
        expires: 'never',
        status: 'denied'
      };
    }
  }

  // طلب صلاحية التخزين مع المراقبة
  async requestStoragePermission(context: string = 'general'): Promise<PermissionStatus> {
    try {
      const startTime = Date.now();
      this.usageStartTimes.set('storage', startTime);
      
      if (Platform.OS === 'web') {
        // للويب، لا نحتاج صلاحيات خاصة للتخزين المحلي
        const status: PermissionStatus = {
          granted: true,
          canAskAgain: true,
          expires: 'never',
          status: 'granted'
        };
        
        this.logPermissionUsage('storage', startTime, context, false);
        return status;
      } else {
        // للموبايل، استخدام expo-media-library
        const { status } = await MediaLibrary.requestPermissionsAsync();
        
        const permissionStatus: PermissionStatus = {
          granted: status === 'granted',
          canAskAgain: status !== 'denied',
          expires: 'never',
          status: status as 'granted' | 'denied' | 'undetermined'
        };
        
        this.logPermissionUsage('storage', startTime, context, false);
        
        // فحص الاستخدام المشبوه
        if (this.isSuspiciousUsage('storage', context)) {
          await this.createPermissionAlert('storage', 'Excessive storage access detected', 'medium');
        }
        
        return permissionStatus;
      }
    } catch (error) {
      console.error('Storage permission request failed:', error);
      return {
        granted: false,
        canAskAgain: false,
        expires: 'never',
        status: 'denied'
      };
    }
  }

  // طلب صلاحية الموقع مع المراقبة
  async requestLocationPermission(context: string = 'general'): Promise<PermissionStatus> {
    try {
      const startTime = Date.now();
      this.usageStartTimes.set('location', startTime);
      
      if (Platform.OS === 'web') {
        // للويب، استخدام navigator.geolocation
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              const status: PermissionStatus = {
                granted: true,
                canAskAgain: true,
                expires: 'never',
                status: 'granted'
              };
              this.logPermissionUsage('location', startTime, context, false);
              resolve(status);
            },
            () => {
              const status: PermissionStatus = {
                granted: false,
                canAskAgain: true,
                expires: 'never',
                status: 'denied'
              };
              this.logPermissionUsage('location', startTime, context, false);
              resolve(status);
            }
          );
        });
      } else {
        // للموبايل، استخدام expo-location
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        const permissionStatus: PermissionStatus = {
          granted: status === 'granted',
          canAskAgain: status !== 'denied',
          expires: 'never',
          status: status as 'granted' | 'denied' | 'undetermined'
        };
        
        this.logPermissionUsage('location', startTime, context, false);
        
        // فحص الاستخدام المشبوه
        if (this.isSuspiciousUsage('location', context)) {
          await this.createPermissionAlert('location', 'Frequent location access detected', 'high');
        }
        
        return permissionStatus;
      }
    } catch (error) {
      console.error('Location permission request failed:', error);
      return {
        granted: false,
        canAskAgain: false,
        expires: 'never',
        status: 'denied'
      };
    }
  }

  // طلب صلاحية الإشعارات مع المراقبة
  async requestNotificationPermission(context: string = 'general'): Promise<PermissionStatus> {
    try {
      const startTime = Date.now();
      this.usageStartTimes.set('notifications', startTime);
      
      if (Platform.OS === 'web') {
        // للويب، استخدام Notification API
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          const status: PermissionStatus = {
            granted: permission === 'granted',
            canAskAgain: permission !== 'denied',
            expires: 'never',
            status: permission as 'granted' | 'denied' | 'undetermined'
          };
          
          this.logPermissionUsage('notifications', startTime, context, false);
          return status;
        } else {
          return {
            granted: false,
            canAskAgain: false,
            expires: 'never',
            status: 'denied'
          };
        }
      } else {
        const isExpoGo = (Constants as any)?.appOwnership === 'expo';
        if (isExpoGo) {
          const permissionStatus: PermissionStatus = {
            granted: false,
            canAskAgain: true,
            expires: 'never',
            status: 'undetermined'
          };
          this.logPermissionUsage('notifications', startTime, context, false);
          return permissionStatus;
        }
        const NotificationsMod = require('expo-notifications');
        const { status } = await NotificationsMod.requestPermissionsAsync();
        const permissionStatus: PermissionStatus = {
          granted: status === 'granted',
          canAskAgain: status !== 'denied',
          expires: 'never',
          status: status as 'granted' | 'denied' | 'undetermined'
        };
        
        this.logPermissionUsage('notifications', startTime, context, false);
        return permissionStatus;
      }
    } catch (error) {
      console.error('Notification permission request failed:', error);
      return {
        granted: false,
        canAskAgain: false,
        expires: 'never',
        status: 'denied'
      };
    }
  }

  // إنهاء استخدام الصلاحية
  endPermissionUsage(permission: string): void {
    const startTime = this.usageStartTimes.get(permission);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.updatePermissionUsageDuration(permission, startTime, duration);
      this.usageStartTimes.delete(permission);
    }
  }

  // تسجيل استخدام الصلاحية
  private logPermissionUsage(
    permission: string,
    startTime: number,
    context: string,
    suspicious: boolean
  ): void {
    const usage: PermissionUsage = {
      permission,
      timestamp: startTime,
      duration: 0, // سيتم تحديثه عند الانتهاء
      context,
      suspicious
    };
    
    this.permissionUsageHistory.push(usage);
    
    // الاحتفاظ بآخر 1000 استخدام فقط
    if (this.permissionUsageHistory.length > 1000) {
      this.permissionUsageHistory = this.permissionUsageHistory.slice(-1000);
    }
    
    this.savePermissionHistory();
  }

  // تحديث مدة استخدام الصلاحية
  private updatePermissionUsageDuration(
    permission: string,
    startTime: number,
    duration: number
  ): void {
    const usage = this.permissionUsageHistory.find(
      u => u.permission === permission && u.timestamp === startTime
    );
    
    if (usage) {
      usage.duration = duration;
      
      // فحص إذا كانت المدة مشبوهة (أكثر من 10 دقائق للكاميرا/مايك)
      if ((permission === 'camera' || permission === 'microphone') && duration > 10 * 60 * 1000) {
        usage.suspicious = true;
        this.createPermissionAlert(
          permission,
          `Extended ${permission} usage detected (${Math.round(duration / 60000)} minutes)`,
          'medium'
        );
      }
      
      this.savePermissionHistory();
    }
  }

  // فحص الاستخدام المشبوه
  private isSuspiciousUsage(permission: string, context: string): boolean {
    const recentUsage = this.permissionUsageHistory.filter(
      u => u.permission === permission && 
      Date.now() - u.timestamp < 60 * 60 * 1000 // آخر ساعة
    );
    
    // إذا تم استخدام الصلاحية أكثر من 10 مرات في الساعة
    if (recentUsage.length > 10) {
      return true;
    }
    
    // إذا تم استخدام الصلاحية في سياقات مختلفة بسرعة
    const uniqueContexts = new Set(recentUsage.map(u => u.context));
    if (uniqueContexts.size > 3 && recentUsage.length > 5) {
      return true;
    }
    
    // إذا كان الاستخدام في وقت غير عادي (منتصف الليل)
    const hour = new Date().getHours();
    if ((hour < 6 || hour > 23) && permission === 'camera') {
      return true;
    }
    
    return false;
  }

  // فحص الشذوذ في الصلاحيات
  private async checkPermissionAnomalies(): Promise<void> {
    const now = Date.now();
    const lastHour = now - 60 * 60 * 1000;
    
    // فحص الاستخدام المفرط
    const recentUsage = this.permissionUsageHistory.filter(
      u => u.timestamp > lastHour
    );
    
    const usageByPermission = recentUsage.reduce((acc, usage) => {
      acc[usage.permission] = (acc[usage.permission] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // إنشاء تنبيهات للاستخدام المفرط
    for (const [permission, count] of Object.entries(usageByPermission)) {
      if (count > 15) { // أكثر من 15 استخدام في الساعة
        await this.createPermissionAlert(
          permission,
          `Excessive ${permission} usage: ${count} times in the last hour`,
          'high'
        );
      }
    }
    
    // فحص الاستخدام المتزامن المشبوه
    const simultaneousUsage = this.checkSimultaneousUsage();
    if (simultaneousUsage.length > 0) {
      await this.createPermissionAlert(
        'multiple',
        `Simultaneous usage of multiple sensitive permissions: ${simultaneousUsage.join(', ')}`,
        'high'
      );
    }
  }

  // فحص الاستخدام المتزامن
  private checkSimultaneousUsage(): string[] {
    const activePermissions: string[] = [];
    const now = Date.now();
    
    for (const [permission, startTime] of this.usageStartTimes.entries()) {
      if (now - startTime < 5000) { // نشط في آخر 5 ثوان
        activePermissions.push(permission);
      }
    }
    
    // إذا كان هناك أكثر من صلاحيتين حساستين نشطتين
    const sensitivePermissions = activePermissions.filter(p => 
      ['camera', 'microphone', 'location'].includes(p)
    );
    
    return sensitivePermissions.length > 1 ? sensitivePermissions : [];
  }

  // إنشاء تنبيه صلاحية
  private async createPermissionAlert(
    permission: string,
    reason: string,
    severity: 'low' | 'medium' | 'high'
  ): Promise<void> {
    const alert: PermissionAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      permission,
      reason,
      severity,
      timestamp: Date.now(),
      resolved: false
    };
    
    this.permissionAlerts.push(alert);
    
    // الاحتفاظ بآخر 100 تنبيه فقط
    if (this.permissionAlerts.length > 100) {
      this.permissionAlerts = this.permissionAlerts.slice(-100);
    }
    
    await this.savePermissionAlerts();
    
    console.warn(`🚨 Permission Alert [${severity.toUpperCase()}]: ${reason}`);
    
    // إرسال إشعار للمستخدم في الحالات الحرجة
    if (severity === 'high') {
      this.notifyUser(alert);
    }
  }

  // إشعار المستخدم
  private async notifyUser(alert: PermissionAlert): Promise<void> {
    if (Platform.OS === 'web') {
      // للويب، استخدام Notification API
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Security Alert', {
          body: alert.reason,
          icon: '/icon.png'
        });
      }
    } else {
      const isExpoGo = (Constants as any)?.appOwnership === 'expo';
      if (isExpoGo) {
        return;
      }
      try {
        const NotificationsMod = require('expo-notifications');
        await NotificationsMod.scheduleNotificationAsync({
          content: {
            title: 'Security Alert',
            body: alert.reason,
            data: { alertId: alert.id }
          },
          trigger: null
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  }

  // حل التنبيه
  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.permissionAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      await this.savePermissionAlerts();
      return true;
    }
    return false;
  }

  // الحصول على التنبيهات النشطة
  getActiveAlerts(): PermissionAlert[] {
    return this.permissionAlerts.filter(a => !a.resolved);
  }

  // الحصول على إحصائيات الاستخدام
  getUsageStatistics(): Record<string, any> {
    const now = Date.now();
    const lastDay = now - 24 * 60 * 60 * 1000;
    const lastWeek = now - 7 * 24 * 60 * 60 * 1000;
    
    const dayUsage = this.permissionUsageHistory.filter(u => u.timestamp > lastDay);
    const weekUsage = this.permissionUsageHistory.filter(u => u.timestamp > lastWeek);
    
    return {
      totalUsage: this.permissionUsageHistory.length,
      dayUsage: dayUsage.length,
      weekUsage: weekUsage.length,
      suspiciousUsage: this.permissionUsageHistory.filter(u => u.suspicious).length,
      activeAlerts: this.getActiveAlerts().length,
      usageByPermission: this.getUsageByPermission(),
      averageSessionDuration: this.getAverageSessionDuration()
    };
  }

  // الحصول على الاستخدام حسب الصلاحية
  private getUsageByPermission(): Record<string, number> {
    return this.permissionUsageHistory.reduce((acc, usage) => {
      acc[usage.permission] = (acc[usage.permission] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // الحصول على متوسط مدة الجلسة
  private getAverageSessionDuration(): Record<string, number> {
    const durationByPermission = this.permissionUsageHistory
      .filter(u => u.duration > 0)
      .reduce((acc, usage) => {
        if (!acc[usage.permission]) {
          acc[usage.permission] = { total: 0, count: 0 };
        }
        acc[usage.permission].total += usage.duration;
        acc[usage.permission].count += 1;
        return acc;
      }, {} as Record<string, { total: number, count: number }>);
    
    const averages: Record<string, number> = {};
    for (const [permission, data] of Object.entries(durationByPermission)) {
      averages[permission] = Math.round(data.total / data.count / 1000); // بالثواني
    }
    
    return averages;
  }

  // حفظ تاريخ الصلاحيات
  private async savePermissionHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'permission_usage_history',
        JSON.stringify(this.permissionUsageHistory)
      );
    } catch (error) {
      console.error('Failed to save permission history:', error);
    }
  }

  // تحميل تاريخ الصلاحيات
  private async loadPermissionHistory(): Promise<void> {
    try {
      const history = await AsyncStorage.getItem('permission_usage_history');
      if (history) {
        this.permissionUsageHistory = JSON.parse(history);
      }
    } catch (error) {
      console.error('Failed to load permission history:', error);
    }
  }

  // حفظ تنبيهات الصلاحيات
  private async savePermissionAlerts(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'permission_alerts',
        JSON.stringify(this.permissionAlerts)
      );
    } catch (error) {
      console.error('Failed to save permission alerts:', error);
    }
  }

  // تحميل تنبيهات الصلاحيات
  private async loadPermissionAlerts(): Promise<void> {
    try {
      const alerts = await AsyncStorage.getItem('permission_alerts');
      if (alerts) {
        this.permissionAlerts = JSON.parse(alerts);
      }
    } catch (error) {
      console.error('Failed to load permission alerts:', error);
    }
  }
}

export default new DynamicPermissionsService();