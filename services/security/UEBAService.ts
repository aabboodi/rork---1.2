import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface UserBehaviorProfile {
  userId: string;
  normalPatterns: {
    loginTimes: number[];
    deviceFingerprints: string[];
    locationPatterns: { lat: number; lng: number; frequency: number }[];
    transactionPatterns: { amount: number; frequency: number; timeOfDay: number }[];
    communicationPatterns: { messageFrequency: number; contactList: string[] };
    appUsagePatterns: { screenTime: number; featureUsage: Record<string, number> };
  };
  riskScore: number;
  lastUpdated: number;
  anomalyHistory: AnomalyEvent[];
}

export interface AnomalyEvent {
  id: string;
  userId: string;
  type: 'login' | 'transaction' | 'communication' | 'device' | 'location' | 'behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  riskScore: number;
  timestamp: number;
  metadata: Record<string, any>;
  resolved: boolean;
  falsePositive: boolean;
}

export interface BehaviorAnalysisResult {
  isAnomalous: boolean;
  riskScore: number;
  anomalyType: string;
  confidence: number;
  recommendations: string[];
  requiresAction: boolean;
}

export class UEBAService {
  private static instance: UEBAService;
  private profiles: Map<string, UserBehaviorProfile> = new Map();
  private mlModels: Map<string, any> = new Map();
  private isInitialized = false;

  static getInstance(): UEBAService {
    if (!UEBAService.instance) {
      UEBAService.instance = new UEBAService();
    }
    return UEBAService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // تحميل ملفات المستخدمين المحفوظة
      await this.loadUserProfiles();
      
      // تهيئة نماذج التعلم الآلي
      await this.initializeMLModels();
      
      // بدء مراقبة السلوك في الوقت الفعلي
      this.startRealTimeMonitoring();
      
      this.isInitialized = true;
      console.log('UEBA Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize UEBA Service:', error);
      throw error;
    }
  }

  private async loadUserProfiles(): Promise<void> {
    try {
      const profilesData = await AsyncStorage.getItem('ueba_profiles');
      if (profilesData) {
        const profiles = JSON.parse(profilesData);
        Object.entries(profiles).forEach(([userId, profile]) => {
          this.profiles.set(userId, profile as UserBehaviorProfile);
        });
      }
    } catch (error) {
      console.error('Failed to load user profiles:', error);
    }
  }

  private async saveUserProfiles(): Promise<void> {
    try {
      const profilesObj = Object.fromEntries(this.profiles);
      await AsyncStorage.setItem('ueba_profiles', JSON.stringify(profilesObj));
    } catch (error) {
      console.error('Failed to save user profiles:', error);
    }
  }

  private async initializeMLModels(): Promise<void> {
    // تهيئة نماذج التعلم الآلي للكشف عن الشذوذ
    this.mlModels.set('login_anomaly', {
      type: 'isolation_forest',
      threshold: 0.7,
      features: ['time_of_day', 'day_of_week', 'device_fingerprint', 'location']
    });

    this.mlModels.set('transaction_anomaly', {
      type: 'statistical_analysis',
      threshold: 0.8,
      features: ['amount', 'frequency', 'recipient', 'time_pattern']
    });

    this.mlModels.set('communication_anomaly', {
      type: 'behavioral_clustering',
      threshold: 0.75,
      features: ['message_frequency', 'contact_diversity', 'content_similarity']
    });
  }

  private startRealTimeMonitoring(): void {
    // مراقبة السلوك في الوقت الفعلي
    setInterval(() => {
      this.performPeriodicAnalysis();
    }, 60000); // كل دقيقة
  }

  async analyzeUserBehavior(
    userId: string,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<BehaviorAnalysisResult> {
    try {
      const profile = await this.getUserProfile(userId);
      const analysis = await this.performBehaviorAnalysis(profile, eventType, eventData);
      
      if (analysis.isAnomalous) {
        await this.recordAnomaly(userId, eventType, analysis, eventData);
      }
      
      // تحديث ملف المستخدم
      await this.updateUserProfile(userId, eventType, eventData);
      
      return analysis;
    } catch (error) {
      console.error('Behavior analysis failed:', error);
      return {
        isAnomalous: false,
        riskScore: 0,
        anomalyType: 'analysis_error',
        confidence: 0,
        recommendations: ['System error occurred during analysis'],
        requiresAction: false
      };
    }
  }

  private async getUserProfile(userId: string): Promise<UserBehaviorProfile> {
    let profile = this.profiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        normalPatterns: {
          loginTimes: [],
          deviceFingerprints: [],
          locationPatterns: [],
          transactionPatterns: [],
          communicationPatterns: { messageFrequency: 0, contactList: [] },
          appUsagePatterns: { screenTime: 0, featureUsage: {} }
        },
        riskScore: 0,
        lastUpdated: Date.now(),
        anomalyHistory: []
      };
      
      this.profiles.set(userId, profile);
    }
    
    return profile;
  }

  private async performBehaviorAnalysis(
    profile: UserBehaviorProfile,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<BehaviorAnalysisResult> {
    let riskScore = 0;
    let anomalyType = 'normal';
    let confidence = 0;
    const recommendations: string[] = [];

    switch (eventType) {
      case 'login':
        const loginAnalysis = await this.analyzeLoginBehavior(profile, eventData);
        riskScore = loginAnalysis.riskScore;
        anomalyType = loginAnalysis.anomalyType;
        confidence = loginAnalysis.confidence;
        recommendations.push(...loginAnalysis.recommendations);
        break;

      case 'transaction':
        const transactionAnalysis = await this.analyzeTransactionBehavior(profile, eventData);
        riskScore = transactionAnalysis.riskScore;
        anomalyType = transactionAnalysis.anomalyType;
        confidence = transactionAnalysis.confidence;
        recommendations.push(...transactionAnalysis.recommendations);
        break;

      case 'communication':
        const commAnalysis = await this.analyzeCommunicationBehavior(profile, eventData);
        riskScore = commAnalysis.riskScore;
        anomalyType = commAnalysis.anomalyType;
        confidence = commAnalysis.confidence;
        recommendations.push(...commAnalysis.recommendations);
        break;

      case 'device_change':
        const deviceAnalysis = await this.analyzeDeviceBehavior(profile, eventData);
        riskScore = deviceAnalysis.riskScore;
        anomalyType = deviceAnalysis.anomalyType;
        confidence = deviceAnalysis.confidence;
        recommendations.push(...deviceAnalysis.recommendations);
        break;
    }

    const isAnomalous = riskScore > 0.7 && confidence > 0.6;
    const requiresAction = riskScore > 0.8 || anomalyType.includes('critical');

    return {
      isAnomalous,
      riskScore,
      anomalyType,
      confidence,
      recommendations,
      requiresAction
    };
  }

  private async analyzeLoginBehavior(
    profile: UserBehaviorProfile,
    eventData: Record<string, any>
  ): Promise<{ riskScore: number; anomalyType: string; confidence: number; recommendations: string[] }> {
    const recommendations: string[] = [];
    let riskScore = 0;
    let anomalyType = 'normal_login';
    let confidence = 0;

    const currentTime = new Date().getHours();
    const normalLoginTimes = profile.normalPatterns.loginTimes;

    // تحليل وقت تسجيل الدخول
    if (normalLoginTimes.length > 0) {
      const timeDeviation = this.calculateTimeDeviation(currentTime, normalLoginTimes);
      if (timeDeviation > 6) { // أكثر من 6 ساعات انحراف
        riskScore += 0.3;
        anomalyType = 'unusual_login_time';
        recommendations.push('تسجيل دخول في وقت غير معتاد');
      }
    }

    // تحليل بصمة الجهاز
    const deviceFingerprint = eventData.deviceFingerprint;
    if (deviceFingerprint && !profile.normalPatterns.deviceFingerprints.includes(deviceFingerprint)) {
      riskScore += 0.4;
      anomalyType = 'new_device_login';
      recommendations.push('تسجيل دخول من جهاز جديد');
    }

    // تحليل الموقع الجغرافي
    if (eventData.location) {
      const locationRisk = this.analyzeLocationAnomaly(profile, eventData.location);
      riskScore += locationRisk;
      if (locationRisk > 0.3) {
        anomalyType = 'suspicious_location';
        recommendations.push('تسجيل دخول من موقع مشبوه');
      }
    }

    // تحليل تكرار محاولات تسجيل الدخول
    if (eventData.failedAttempts && eventData.failedAttempts > 3) {
      riskScore += 0.5;
      anomalyType = 'brute_force_attempt';
      recommendations.push('محاولات متعددة لتسجيل الدخول');
    }

    confidence = Math.min(0.9, normalLoginTimes.length / 10); // الثقة تزيد مع البيانات

    return { riskScore: Math.min(1, riskScore), anomalyType, confidence, recommendations };
  }

  private async analyzeTransactionBehavior(
    profile: UserBehaviorProfile,
    eventData: Record<string, any>
  ): Promise<{ riskScore: number; anomalyType: string; confidence: number; recommendations: string[] }> {
    const recommendations: string[] = [];
    let riskScore = 0;
    let anomalyType = 'normal_transaction';
    let confidence = 0;

    const amount = eventData.amount || 0;
    const normalTransactions = profile.normalPatterns.transactionPatterns;

    if (normalTransactions.length > 0) {
      const avgAmount = normalTransactions.reduce((sum, t) => sum + t.amount, 0) / normalTransactions.length;
      const amountDeviation = Math.abs(amount - avgAmount) / avgAmount;

      // تحليل مبلغ المعاملة
      if (amountDeviation > 5) { // أكثر من 5 أضعاف المتوسط
        riskScore += 0.6;
        anomalyType = 'unusual_transaction_amount';
        recommendations.push('مبلغ معاملة غير معتاد');
      }

      // تحليل تكرار المعاملات
      const recentTransactions = this.getRecentTransactions(profile, 3600000); // آخر ساعة
      if (recentTransactions > 10) {
        riskScore += 0.4;
        anomalyType = 'high_frequency_transactions';
        recommendations.push('معاملات متكررة بشكل مشبوه');
      }
    }

    // تحليل المستقبل
    if (eventData.recipient && this.isHighRiskRecipient(eventData.recipient)) {
      riskScore += 0.7;
      anomalyType = 'high_risk_recipient';
      recommendations.push('معاملة مع مستقبل عالي المخاطر');
    }

    // تحليل وقت المعاملة
    const currentHour = new Date().getHours();
    if (currentHour < 6 || currentHour > 23) {
      riskScore += 0.2;
      recommendations.push('معاملة في وقت غير معتاد');
    }

    confidence = Math.min(0.9, normalTransactions.length / 20);

    return { riskScore: Math.min(1, riskScore), anomalyType, confidence, recommendations };
  }

  private async analyzeCommunicationBehavior(
    profile: UserBehaviorProfile,
    eventData: Record<string, any>
  ): Promise<{ riskScore: number; anomalyType: string; confidence: number; recommendations: string[] }> {
    const recommendations: string[] = [];
    let riskScore = 0;
    let anomalyType = 'normal_communication';
    let confidence = 0;

    const messageContent = eventData.content || '';
    const recipient = eventData.recipient;

    // تحليل محتوى الرسالة للكلمات المشبوهة
    const suspiciousKeywords = [
      'password', 'pin', 'otp', 'verification', 'urgent', 'emergency',
      'كلمة مرور', 'رقم سري', 'عاجل', 'طارئ', 'تحقق'
    ];

    const foundSuspiciousWords = suspiciousKeywords.filter(keyword => 
      messageContent.toLowerCase().includes(keyword.toLowerCase())
    );

    if (foundSuspiciousWords.length > 0) {
      riskScore += 0.5;
      anomalyType = 'suspicious_content';
      recommendations.push('محتوى رسالة مشبوه');
    }

    // تحليل تكرار الرسائل
    const normalFrequency = profile.normalPatterns.communicationPatterns.messageFrequency;
    if (eventData.messageCount && eventData.messageCount > normalFrequency * 3) {
      riskScore += 0.3;
      anomalyType = 'spam_behavior';
      recommendations.push('إرسال رسائل بتكرار عالي');
    }

    // تحليل المستقبل الجديد
    const knownContacts = profile.normalPatterns.communicationPatterns.contactList;
    if (recipient && !knownContacts.includes(recipient)) {
      riskScore += 0.2;
      recommendations.push('تواصل مع جهة اتصال جديدة');
    }

    confidence = Math.min(0.8, knownContacts.length / 50);

    return { riskScore: Math.min(1, riskScore), anomalyType, confidence, recommendations };
  }

  private async analyzeDeviceBehavior(
    profile: UserBehaviorProfile,
    eventData: Record<string, any>
  ): Promise<{ riskScore: number; anomalyType: string; confidence: number; recommendations: string[] }> {
    const recommendations: string[] = [];
    let riskScore = 0;
    let anomalyType = 'normal_device';
    let confidence = 0.8;

    const newDeviceFingerprint = eventData.deviceFingerprint;
    const knownDevices = profile.normalPatterns.deviceFingerprints;

    if (newDeviceFingerprint && !knownDevices.includes(newDeviceFingerprint)) {
      riskScore += 0.6;
      anomalyType = 'new_device_access';
      recommendations.push('وصول من جهاز جديد');

      // تحليل خصائص الجهاز الجديد
      if (eventData.deviceInfo) {
        const deviceInfo = eventData.deviceInfo;
        
        // فحص إذا كان الجهاز محاكي
        if (this.isEmulatorDevice(deviceInfo)) {
          riskScore += 0.8;
          anomalyType = 'emulator_access';
          recommendations.push('وصول من جهاز محاكي');
        }

        // فحص إذا كان الجهاز مكسور الحماية
        if (this.isRootedDevice(deviceInfo)) {
          riskScore += 0.7;
          anomalyType = 'rooted_device_access';
          recommendations.push('وصول من جهاز مكسور الحماية');
        }
      }
    }

    return { riskScore: Math.min(1, riskScore), anomalyType, confidence, recommendations };
  }

  private calculateTimeDeviation(currentTime: number, normalTimes: number[]): number {
    if (normalTimes.length === 0) return 0;
    
    const avgTime = normalTimes.reduce((sum, time) => sum + time, 0) / normalTimes.length;
    return Math.abs(currentTime - avgTime);
  }

  private analyzeLocationAnomaly(profile: UserBehaviorProfile, location: { lat: number; lng: number }): number {
    const normalLocations = profile.normalPatterns.locationPatterns;
    
    if (normalLocations.length === 0) return 0.1; // مخاطر منخفضة للموقع الأول

    // حساب المسافة من المواقع المعتادة
    const minDistance = Math.min(...normalLocations.map(loc => 
      this.calculateDistance(location.lat, location.lng, loc.lat, loc.lng)
    ));

    // إذا كان الموقع أكثر من 100 كم من المواقع المعتادة
    if (minDistance > 100) {
      return 0.5;
    } else if (minDistance > 50) {
      return 0.3;
    } else if (minDistance > 20) {
      return 0.1;
    }

    return 0;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private getRecentTransactions(profile: UserBehaviorProfile, timeWindow: number): number {
    const currentTime = Date.now();
    return profile.anomalyHistory.filter(event => 
      event.type === 'transaction' && 
      (currentTime - event.timestamp) < timeWindow
    ).length;
  }

  private isHighRiskRecipient(recipient: string): boolean {
    // قائمة المستقبلين عالي المخاطر (يمكن تحديثها من خدمة خارجية)
    const highRiskList = [
      'suspicious_account_1',
      'blocked_user_2',
      // يمكن إضافة المزيد
    ];
    
    return highRiskList.includes(recipient);
  }

  private isEmulatorDevice(deviceInfo: any): boolean {
    const emulatorIndicators = [
      'generic', 'emulator', 'simulator', 'genymotion',
      'bluestacks', 'nox', 'memu'
    ];
    
    const deviceModel = (deviceInfo.model || '').toLowerCase();
    const deviceBrand = (deviceInfo.brand || '').toLowerCase();
    
    return emulatorIndicators.some(indicator => 
      deviceModel.includes(indicator) || deviceBrand.includes(indicator)
    );
  }

  private isRootedDevice(deviceInfo: any): boolean {
    // فحص علامات كسر الحماية
    return deviceInfo.isRooted || 
           deviceInfo.isJailbroken || 
           deviceInfo.hasRootAccess || 
           false;
  }

  private async recordAnomaly(
    userId: string,
    eventType: string,
    analysis: BehaviorAnalysisResult,
    eventData: Record<string, any>
  ): Promise<void> {
    const anomaly: AnomalyEvent = {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: eventType as any,
      severity: this.calculateSeverity(analysis.riskScore),
      description: `${analysis.anomalyType}: ${analysis.recommendations.join(', ')}`,
      riskScore: analysis.riskScore,
      timestamp: Date.now(),
      metadata: {
        ...eventData,
        confidence: analysis.confidence,
        mlModel: 'ueba_v1'
      },
      resolved: false,
      falsePositive: false
    };

    const profile = this.profiles.get(userId);
    if (profile) {
      profile.anomalyHistory.push(anomaly);
      profile.riskScore = Math.max(profile.riskScore, analysis.riskScore);
      
      // الاحتفاظ بآخر 100 حدث شاذ فقط
      if (profile.anomalyHistory.length > 100) {
        profile.anomalyHistory = profile.anomalyHistory.slice(-100);
      }
      
      await this.saveUserProfiles();
    }

    // إرسال تنبيه للنظام الأمني
    await this.sendSecurityAlert(anomaly);
  }

  private calculateSeverity(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 0.9) return 'critical';
    if (riskScore >= 0.7) return 'high';
    if (riskScore >= 0.4) return 'medium';
    return 'low';
  }

  private async sendSecurityAlert(anomaly: AnomalyEvent): Promise<void> {
    try {
      // إرسال التنبيه لنظام SOC
      console.log('Security Alert:', {
        type: 'UEBA_ANOMALY',
        severity: anomaly.severity,
        userId: anomaly.userId,
        description: anomaly.description,
        riskScore: anomaly.riskScore,
        timestamp: new Date(anomaly.timestamp).toISOString()
      });

      // يمكن إضافة إرسال للخدمات الخارجية هنا
      if (Platform.OS !== 'web') {
        // إرسال push notification للمدراء
        // await NotificationService.sendSecurityAlert(anomaly);
      }
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  private async updateUserProfile(
    userId: string,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<void> {
    const profile = this.profiles.get(userId);
    if (!profile) return;

    const currentTime = Date.now();
    
    switch (eventType) {
      case 'login':
        const loginHour = new Date().getHours();
        profile.normalPatterns.loginTimes.push(loginHour);
        
        if (eventData.deviceFingerprint) {
          const fingerprint = eventData.deviceFingerprint;
          if (!profile.normalPatterns.deviceFingerprints.includes(fingerprint)) {
            profile.normalPatterns.deviceFingerprints.push(fingerprint);
          }
        }
        
        if (eventData.location) {
          const existingLocation = profile.normalPatterns.locationPatterns.find(loc =>
            this.calculateDistance(loc.lat, loc.lng, eventData.location.lat, eventData.location.lng) < 1
          );
          
          if (existingLocation) {
            existingLocation.frequency++;
          } else {
            profile.normalPatterns.locationPatterns.push({
              ...eventData.location,
              frequency: 1
            });
          }
        }
        break;

      case 'transaction':
        if (eventData.amount) {
          profile.normalPatterns.transactionPatterns.push({
            amount: eventData.amount,
            frequency: 1,
            timeOfDay: new Date().getHours()
          });
        }
        break;

      case 'communication':
        if (eventData.recipient) {
          const contacts = profile.normalPatterns.communicationPatterns.contactList;
          if (!contacts.includes(eventData.recipient)) {
            contacts.push(eventData.recipient);
          }
        }
        
        profile.normalPatterns.communicationPatterns.messageFrequency++;
        break;
    }

    // تنظيف البيانات القديمة (الاحتفاظ بآخر 1000 نقطة بيانات)
    if (profile.normalPatterns.loginTimes.length > 1000) {
      profile.normalPatterns.loginTimes = profile.normalPatterns.loginTimes.slice(-1000);
    }
    
    if (profile.normalPatterns.transactionPatterns.length > 1000) {
      profile.normalPatterns.transactionPatterns = profile.normalPatterns.transactionPatterns.slice(-1000);
    }

    profile.lastUpdated = currentTime;
    await this.saveUserProfiles();
  }

  private async performPeriodicAnalysis(): Promise<void> {
    try {
      // تحليل دوري لجميع المستخدمين
      for (const [userId, profile] of this.profiles) {
        await this.analyzeUserRiskTrends(userId, profile);
      }
      
      // تنظيف البيانات القديمة
      await this.cleanupOldData();
      
    } catch (error) {
      console.error('Periodic analysis failed:', error);
    }
  }

  private async analyzeUserRiskTrends(userId: string, profile: UserBehaviorProfile): Promise<void> {
    const recentAnomalies = profile.anomalyHistory.filter(anomaly => 
      Date.now() - anomaly.timestamp < 86400000 // آخر 24 ساعة
    );

    if (recentAnomalies.length > 5) {
      // مستخدم عالي المخاطر
      profile.riskScore = Math.min(1, profile.riskScore + 0.1);
      
      await this.sendSecurityAlert({
        id: `trend_${Date.now()}`,
        userId,
        type: 'behavior',
        severity: 'high',
        description: 'اكتشاف نمط مشبوه في سلوك المستخدم',
        riskScore: profile.riskScore,
        timestamp: Date.now(),
        metadata: { anomalyCount: recentAnomalies.length },
        resolved: false,
        falsePositive: false
      });
    }
  }

  private async cleanupOldData(): Promise<void> {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    for (const profile of this.profiles.values()) {
      profile.anomalyHistory = profile.anomalyHistory.filter(anomaly => 
        anomaly.timestamp > thirtyDaysAgo
      );
    }
    
    await this.saveUserProfiles();
  }

  // واجهات برمجية للاستعلام
  async getUserRiskScore(userId: string): Promise<number> {
    const profile = this.profiles.get(userId);
    return profile?.riskScore || 0;
  }

  async getUserAnomalies(userId: string, limit: number = 50): Promise<AnomalyEvent[]> {
    const profile = this.profiles.get(userId);
    if (!profile) return [];
    
    return profile.anomalyHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async getHighRiskUsers(threshold: number = 0.7): Promise<string[]> {
    const highRiskUsers: string[] = [];
    
    for (const [userId, profile] of this.profiles) {
      if (profile.riskScore >= threshold) {
        highRiskUsers.push(userId);
      }
    }
    
    return highRiskUsers;
  }

  async markAnomalyAsFalsePositive(anomalyId: string): Promise<void> {
    for (const profile of this.profiles.values()) {
      const anomaly = profile.anomalyHistory.find(a => a.id === anomalyId);
      if (anomaly) {
        anomaly.falsePositive = true;
        anomaly.resolved = true;
        await this.saveUserProfiles();
        break;
      }
    }
  }

  async getSystemStats(): Promise<{
    totalUsers: number;
    totalAnomalies: number;
    highRiskUsers: number;
    avgRiskScore: number;
  }> {
    let totalAnomalies = 0;
    let totalRiskScore = 0;
    let highRiskUsers = 0;

    for (const profile of this.profiles.values()) {
      totalAnomalies += profile.anomalyHistory.length;
      totalRiskScore += profile.riskScore;
      if (profile.riskScore >= 0.7) {
        highRiskUsers++;
      }
    }

    return {
      totalUsers: this.profiles.size,
      totalAnomalies,
      highRiskUsers,
      avgRiskScore: this.profiles.size > 0 ? totalRiskScore / this.profiles.size : 0
    };
  }
}

export default UEBAService;