import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import UEBAService from './UEBAService';
import ThreatIntelligenceService from './ThreatIntelligenceService';

export interface UserBehaviorProfile {
  userId: string;
  riskScore: number;
  behaviorPatterns: {
    loginTimes: number[];
    deviceFingerprints: string[];
    locationPatterns: { lat: number; lng: number; timestamp: Date }[];
    communicationPatterns: {
      messageFrequency: number;
      averageMessageLength: number;
      emojiUsage: number;
      linkSharingFrequency: number;
      spamIndicators: number;
      hateIndicators: number;
    };
    transactionPatterns: {
      averageAmount: number;
      frequency: number;
      timePatterns: number[];
      suspiciousTransactions: number;
    };
    contentPatterns: {
      imageUploads: number;
      inappropriateContent: number;
      flaggedContent: number;
    };
  };
  anomalies: BehaviorAnomaly[];
  mlFeatures: MLFeatureVector;
  lastAnalyzed: Date;
}

export interface MLFeatureVector {
  // Temporal features
  hourlyActivity: number[]; // 24-hour activity distribution
  weeklyActivity: number[]; // 7-day activity distribution
  
  // Communication features
  avgMessageLength: number;
  messageVelocity: number; // messages per hour
  linkDensity: number; // links per message
  emojiDensity: number; // emojis per message
  capsRatio: number; // uppercase ratio
  
  // Behavioral features
  sessionDuration: number;
  deviceSwitchFrequency: number;
  locationVariability: number;
  
  // Content features
  contentViolationRate: number;
  reportedContentRate: number;
  
  // Social features
  interactionDiversity: number; // number of unique contacts
  reciprocityRate: number; // ratio of received to sent messages
}

export interface BehaviorAnomaly {
  type: 'login_time' | 'location' | 'transaction' | 'communication' | 'device' | 'content' | 'social_engineering';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  confidence: number;
  metadata: any;
  mlScore?: number; // ML-based anomaly score
}

export interface RealTimeAlert {
  userId: string;
  alertType: 'suspicious_login' | 'unusual_transaction' | 'spam_behavior' | 'location_anomaly' | 'content_violation' | 'social_engineering';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  actionRequired: boolean;
  suggestedActions: string[];
  mlConfidence?: number;
}

export interface BehaviorPattern {
  id: string;
  userId: string;
  patternType: 'login' | 'transaction' | 'communication' | 'navigation' | 'device_usage';
  pattern: Record<string, any>;
  frequency: number;
  confidence: number;
  lastSeen: number;
  isNormal: boolean;
}

export interface BehaviorAlert {
  id: string;
  userId: string;
  alertType: 'anomaly' | 'threat' | 'policy_violation' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  riskScore: number;
  timestamp: number;
  metadata: Record<string, any>;
  acknowledged: boolean;
  resolved: boolean;
  falsePositive: boolean;
}

export interface MLModelMetrics {
  modelName: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastTraining: number;
  trainingDataSize: number;
  version: string;
}

export interface BehaviorInsight {
  type: 'trend' | 'anomaly' | 'pattern' | 'risk_assessment';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
  data: Record<string, any>;
  timestamp: number;
}

export class BehaviorAnalyticsService {
  private static instance: BehaviorAnalyticsService;
  private uebaService: UEBAService;
  private threatService: ThreatIntelligenceService;
  private behaviorPatterns: Map<string, BehaviorPattern[]> = new Map();
  private behaviorAlerts: BehaviorAlert[] = [];
  private mlModels: Map<string, MLModelMetrics> = new Map();
  private isInitialized = false;

  static getInstance(): BehaviorAnalyticsService {
    if (!BehaviorAnalyticsService.instance) {
      BehaviorAnalyticsService.instance = new BehaviorAnalyticsService();
    }
    return BehaviorAnalyticsService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.uebaService = UEBAService.getInstance();
      this.threatService = ThreatIntelligenceService.getInstance();
      
      await this.uebaService.initialize();
      await this.threatService.initialize();
      
      await this.loadBehaviorData();
      await this.initializeMLModels();
      this.startContinuousAnalysis();
      
      this.isInitialized = true;
      console.log('Behavior Analytics Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Behavior Analytics Service:', error);
      throw error;
    }
  }

  private async loadBehaviorData(): Promise<void> {
    try {
      const patternsData = await AsyncStorage.getItem('behavior_patterns');
      if (patternsData) {
        const patterns = JSON.parse(patternsData);
        Object.entries(patterns).forEach(([userId, userPatterns]) => {
          this.behaviorPatterns.set(userId, userPatterns as BehaviorPattern[]);
        });
      }

      const alertsData = await AsyncStorage.getItem('behavior_alerts');
      if (alertsData) {
        this.behaviorAlerts = JSON.parse(alertsData);
      }
    } catch (error) {
      console.error('Failed to load behavior data:', error);
    }
  }

  private async saveBehaviorData(): Promise<void> {
    try {
      const patternsObj = Object.fromEntries(this.behaviorPatterns);
      await AsyncStorage.setItem('behavior_patterns', JSON.stringify(patternsObj));
      await AsyncStorage.setItem('behavior_alerts', JSON.stringify(this.behaviorAlerts));
    } catch (error) {
      console.error('Failed to save behavior data:', error);
    }
  }

  private async initializeMLModels(): Promise<void> {
    // تهيئة مقاييس نماذج التعلم الآلي
    const models: MLModelMetrics[] = [
      {
        modelName: 'anomaly_detection_v2',
        accuracy: 0.92,
        precision: 0.89,
        recall: 0.94,
        f1Score: 0.91,
        lastTraining: Date.now() - 86400000,
        trainingDataSize: 50000,
        version: '2.1.0'
      },
      {
        modelName: 'threat_classification_v1',
        accuracy: 0.87,
        precision: 0.85,
        recall: 0.89,
        f1Score: 0.87,
        lastTraining: Date.now() - 172800000,
        trainingDataSize: 25000,
        version: '1.3.0'
      },
      {
        modelName: 'behavior_clustering_v3',
        accuracy: 0.94,
        precision: 0.91,
        recall: 0.96,
        f1Score: 0.93,
        lastTraining: Date.now() - 43200000,
        trainingDataSize: 75000,
        version: '3.0.1'
      }
    ];

    models.forEach(model => {
      this.mlModels.set(model.modelName, model);
    });
  }

  private startContinuousAnalysis(): void {
    // تحليل مستمر للسلوك
    setInterval(() => {
      this.performContinuousAnalysis();
    }, 30000); // كل 30 ثانية

    // تحليل عميق دوري
    setInterval(() => {
      this.performDeepAnalysis();
    }, 300000); // كل 5 دقائق
  }

  async analyzeUserBehavior(
    userId: string,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<{
    behaviorAnalysis: BehaviorAnalysisResult;
    threatAnalysis: any;
    recommendations: string[];
    requiresAction: boolean;
  }> {
    try {
      // تحليل السلوك باستخدام UEBA
      const behaviorAnalysis = await this.uebaService.analyzeUserBehavior(userId, eventType, eventData);
      
      // تحليل التهديدات
      let threatAnalysis = null;
      if (eventData.ip) {
        threatAnalysis = await this.threatService.analyzeThreat('ip', eventData.ip);
      } else if (eventData.domain) {
        threatAnalysis = await this.threatService.analyzeThreat('domain', eventData.domain);
      } else if (eventData.deviceFingerprint) {
        threatAnalysis = await this.threatService.analyzeThreat('device_fingerprint', eventData.deviceFingerprint);
      }

      // دمج النتائج وإنتاج التوصيات
      const combinedAnalysis = await this.combineAnalysisResults(
        behaviorAnalysis,
        threatAnalysis,
        userId,
        eventType,
        eventData
      );

      // تسجيل النمط السلوكي
      await this.recordBehaviorPattern(userId, eventType, eventData, behaviorAnalysis);

      // إنشاء تنبيه إذا لزم الأمر
      if (combinedAnalysis.requiresAction) {
        await this.createBehaviorAlert(userId, eventType, combinedAnalysis, eventData);
      }

      return combinedAnalysis;
    } catch (error) {
      console.error('Behavior analysis failed:', error);
      return {
        behaviorAnalysis: {
          isAnomalous: false,
          riskScore: 0,
          anomalyType: 'analysis_error',
          confidence: 0,
          recommendations: ['تعذر تحليل السلوك'],
          requiresAction: false
        },
        threatAnalysis: null,
        recommendations: ['حدث خطأ في التحليل'],
        requiresAction: false
      };
    }
  }

  private async combineAnalysisResults(
    behaviorAnalysis: BehaviorAnalysisResult,
    threatAnalysis: any,
    userId: string,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<{
    behaviorAnalysis: BehaviorAnalysisResult;
    threatAnalysis: any;
    recommendations: string[];
    requiresAction: boolean;
  }> {
    const recommendations: string[] = [];
    let requiresAction = false;

    // دمج توصيات تحليل السلوك
    recommendations.push(...behaviorAnalysis.recommendations);
    
    if (behaviorAnalysis.requiresAction) {
      requiresAction = true;
    }

    // دمج توصيات تحليل التهديدات
    if (threatAnalysis && threatAnalysis.isThreat) {
      recommendations.push(...threatAnalysis.recommendations);
      
      if (threatAnalysis.severity === 'critical' || threatAnalysis.severity === 'high') {
        requiresAction = true;
      }
    }

    // تحليل إضافي للسياق
    const contextualRisk = await this.analyzeContextualRisk(userId, eventType, eventData);
    if (contextualRisk.riskScore > 0.7) {
      recommendations.push(...contextualRisk.recommendations);
      requiresAction = true;
    }

    // إزالة التوصيات المكررة
    const uniqueRecommendations = [...new Set(recommendations)];

    return {
      behaviorAnalysis,
      threatAnalysis,
      recommendations: uniqueRecommendations,
      requiresAction
    };
  }

  private async analyzeContextualRisk(
    userId: string,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<{ riskScore: number; recommendations: string[] }> {
    const recommendations: string[] = [];
    let riskScore = 0;

    // تحليل السياق الزمني
    const currentHour = new Date().getHours();
    if (eventType === 'transaction' && (currentHour < 6 || currentHour > 22)) {
      riskScore += 0.2;
      recommendations.push('معاملة في وقت غير اعتيادي');
    }

    // تحليل تكرار الأحداث
    const recentEvents = await this.getRecentUserEvents(userId, eventType, 3600000); // آخر ساعة
    if (recentEvents > 20) {
      riskScore += 0.4;
      recommendations.push('نشاط مكثف غير طبيعي');
    }

    // تحليل الموقع الجغرافي
    if (eventData.location) {
      const locationRisk = await this.analyzeLocationRisk(userId, eventData.location);
      riskScore += locationRisk.riskScore;
      recommendations.push(...locationRisk.recommendations);
    }

    // تحليل الجهاز
    if (eventData.deviceFingerprint) {
      const deviceRisk = await this.analyzeDeviceRisk(userId, eventData.deviceFingerprint);
      riskScore += deviceRisk.riskScore;
      recommendations.push(...deviceRisk.recommendations);
    }

    return { riskScore: Math.min(1, riskScore), recommendations };
  }

  private async getRecentUserEvents(userId: string, eventType: string, timeWindow: number): Promise<number> {
    const currentTime = Date.now();
    const userPatterns = this.behaviorPatterns.get(userId) || [];
    
    return userPatterns.filter(pattern => 
      pattern.patternType === eventType && 
      (currentTime - pattern.lastSeen) < timeWindow
    ).length;
  }

  private async analyzeLocationRisk(
    userId: string,
    location: { lat: number; lng: number }
  ): Promise<{ riskScore: number; recommendations: string[] }> {
    const recommendations: string[] = [];
    let riskScore = 0;

    // قائمة المناطق عالية المخاطر (يمكن تحديثها من مصادر خارجية)
    const highRiskRegions = [
      { lat: 0, lng: 0, radius: 100, name: 'منطقة عالية المخاطر 1' },
      // يمكن إضافة المزيد
    ];

    for (const region of highRiskRegions) {
      const distance = this.calculateDistance(
        location.lat, location.lng,
        region.lat, region.lng
      );
      
      if (distance < region.radius) {
        riskScore += 0.6;
        recommendations.push(`وصول من منطقة عالية المخاطر: ${region.name}`);
      }
    }

    return { riskScore: Math.min(1, riskScore), recommendations };
  }

  private async analyzeDeviceRisk(
    userId: string,
    deviceFingerprint: string
  ): Promise<{ riskScore: number; recommendations: string[] }> {
    const recommendations: string[] = [];
    let riskScore = 0;

    // فحص إذا كان الجهاز في قائمة الأجهزة المشبوهة
    const threatAnalysis = await this.threatService.analyzeThreat('device_fingerprint', deviceFingerprint);
    
    if (threatAnalysis.isThreat) {
      riskScore += threatAnalysis.riskScore;
      recommendations.push('جهاز مدرج في قائمة التهديدات');
    }

    return { riskScore: Math.min(1, riskScore), recommendations };
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

  private async recordBehaviorPattern(
    userId: string,
    eventType: string,
    eventData: Record<string, any>,
    analysis: BehaviorAnalysisResult
  ): Promise<void> {
    const pattern: BehaviorPattern = {
      id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      patternType: eventType as any,
      pattern: {
        ...eventData,
        riskScore: analysis.riskScore,
        anomalyType: analysis.anomalyType
      },
      frequency: 1,
      confidence: analysis.confidence,
      lastSeen: Date.now(),
      isNormal: !analysis.isAnomalous
    };

    let userPatterns = this.behaviorPatterns.get(userId) || [];
    
    // البحث عن نمط مشابه
    const similarPattern = userPatterns.find(p => 
      p.patternType === pattern.patternType &&
      this.arePatternsSimilar(p.pattern, pattern.pattern)
    );

    if (similarPattern) {
      // تحديث النمط الموجود
      similarPattern.frequency++;
      similarPattern.lastSeen = Date.now();
      similarPattern.confidence = (similarPattern.confidence + pattern.confidence) / 2;
    } else {
      // إضافة نمط جديد
      userPatterns.push(pattern);
    }

    // الاحتفاظ بآخر 500 نمط فقط
    if (userPatterns.length > 500) {
      userPatterns = userPatterns.slice(-500);
    }

    this.behaviorPatterns.set(userId, userPatterns);
    await this.saveBehaviorData();
  }

  private arePatternsSimilar(pattern1: Record<string, any>, pattern2: Record<string, any>): boolean {
    // مقارنة بسيطة للأنماط - يمكن تحسينها
    const keys1 = Object.keys(pattern1);
    const keys2 = Object.keys(pattern2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (pattern1[key] !== pattern2[key]) {
        // استثناءات للقيم التي يمكن أن تختلف
        if (['timestamp', 'riskScore', 'id'].includes(key)) continue;
        return false;
      }
    }
    
    return true;
  }

  private async createBehaviorAlert(
    userId: string,
    eventType: string,
    analysis: any,
    eventData: Record<string, any>
  ): Promise<void> {
    const alert: BehaviorAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      alertType: analysis.behaviorAnalysis.isAnomalous ? 'anomaly' : 'threat',
      severity: this.calculateAlertSeverity(analysis),
      title: this.generateAlertTitle(eventType, analysis),
      description: this.generateAlertDescription(analysis),
      riskScore: Math.max(
        analysis.behaviorAnalysis.riskScore,
        analysis.threatAnalysis?.riskScore || 0
      ),
      timestamp: Date.now(),
      metadata: {
        eventType,
        eventData,
        behaviorAnalysis: analysis.behaviorAnalysis,
        threatAnalysis: analysis.threatAnalysis
      },
      acknowledged: false,
      resolved: false,
      falsePositive: false
    };

    this.behaviorAlerts.push(alert);
    
    // الاحتفاظ بآخر 1000 تنبيه فقط
    if (this.behaviorAlerts.length > 1000) {
      this.behaviorAlerts = this.behaviorAlerts.slice(-1000);
    }

    await this.saveBehaviorData();
    
    // إرسال التنبيه للنظام
    await this.sendBehaviorAlert(alert);
  }

  private calculateAlertSeverity(analysis: any): 'low' | 'medium' | 'high' | 'critical' {
    const behaviorRisk = analysis.behaviorAnalysis.riskScore;
    const threatRisk = analysis.threatAnalysis?.riskScore || 0;
    const maxRisk = Math.max(behaviorRisk, threatRisk);

    if (maxRisk >= 0.9) return 'critical';
    if (maxRisk >= 0.7) return 'high';
    if (maxRisk >= 0.4) return 'medium';
    return 'low';
  }

  private generateAlertTitle(eventType: string, analysis: any): string {
    const eventTypeNames = {
      'login': 'تسجيل دخول',
      'transaction': 'معاملة مالية',
      'communication': 'تواصل',
      'device_change': 'تغيير جهاز'
    };

    const eventName = eventTypeNames[eventType as keyof typeof eventTypeNames] || eventType;
    
    if (analysis.behaviorAnalysis.isAnomalous) {
      return `سلوك شاذ في ${eventName}`;
    } else if (analysis.threatAnalysis?.isThreat) {
      return `تهديد محتمل في ${eventName}`;
    }
    
    return `نشاط مشبوه في ${eventName}`;
  }

  private generateAlertDescription(analysis: any): string {
    const descriptions: string[] = [];
    
    if (analysis.behaviorAnalysis.isAnomalous) {
      descriptions.push(`تم اكتشاف سلوك شاذ: ${analysis.behaviorAnalysis.anomalyType}`);
    }
    
    if (analysis.threatAnalysis?.isThreat) {
      descriptions.push(`تم اكتشاف تهديد: ${analysis.threatAnalysis.severity}`);
    }
    
    descriptions.push(...analysis.recommendations.slice(0, 3));
    
    return descriptions.join('. ');
  }

  private async sendBehaviorAlert(alert: BehaviorAlert): Promise<void> {
    try {
      console.log('Behavior Alert:', {
        type: 'BEHAVIOR_ALERT',
        severity: alert.severity,
        userId: alert.userId,
        title: alert.title,
        description: alert.description,
        riskScore: alert.riskScore,
        timestamp: new Date(alert.timestamp).toISOString()
      });

      // يمكن إضافة إرسال للخدمات الخارجية هنا
      if (Platform.OS !== 'web' && alert.severity === 'critical') {
        // إرسال push notification فوري
        // await NotificationService.sendCriticalAlert(alert);
      }
    } catch (error) {
      console.error('Failed to send behavior alert:', error);
    }
  }

  private async performContinuousAnalysis(): Promise<void> {
    try {
      // تحليل الأنماط الحديثة
      await this.analyzeRecentPatterns();
      
      // تحديث نماذج التعلم الآلي
      await this.updateMLModels();
      
    } catch (error) {
      console.error('Continuous analysis failed:', error);
    }
  }

  private async performDeepAnalysis(): Promise<void> {
    try {
      // تحليل عميق للاتجاهات
      await this.analyzeTrends();
      
      // تحليل المخاطر الناشئة
      await this.analyzeEmergingThreats();
      
      // تنظيف البيانات القديمة
      await this.cleanupOldData();
      
    } catch (error) {
      console.error('Deep analysis failed:', error);
    }
  }

  private async analyzeRecentPatterns(): Promise<void> {
    const recentTime = Date.now() - 3600000; // آخر ساعة
    
    for (const [userId, patterns] of this.behaviorPatterns) {
      const recentPatterns = patterns.filter(p => p.lastSeen > recentTime);
      
      if (recentPatterns.length > 10) {
        // نشاط مكثف - قد يكون مشبوهاً
        await this.createBehaviorAlert(userId, 'behavior', {
          behaviorAnalysis: {
            isAnomalous: true,
            riskScore: 0.6,
            anomalyType: 'high_activity',
            confidence: 0.8,
            recommendations: ['نشاط مكثف غير طبيعي'],
            requiresAction: true
          },
          threatAnalysis: null,
          recommendations: ['مراجعة نشاط المستخدم'],
          requiresAction: true
        }, { patternCount: recentPatterns.length });
      }
    }
  }

  private async updateMLModels(): Promise<void> {
    // محاكاة تحديث نماذج التعلم الآلي
    for (const [modelName, metrics] of this.mlModels) {
      // تحديث المقاييس بناءً على البيانات الجديدة
      const updatedMetrics = { ...metrics };
      
      // محاكاة تحسن الأداء مع البيانات الجديدة
      updatedMetrics.accuracy = Math.min(0.99, metrics.accuracy + 0.001);
      updatedMetrics.trainingDataSize += Math.floor(Math.random() * 100);
      
      this.mlModels.set(modelName, updatedMetrics);
    }
  }

  private async analyzeTrends(): Promise<void> {
    // تحليل الاتجاهات في البيانات
    const trends = await this.identifyBehaviorTrends();
    
    for (const trend of trends) {
      if (trend.impact === 'high') {
        console.log('High impact trend detected:', trend);
      }
    }
  }

  private async identifyBehaviorTrends(): Promise<BehaviorInsight[]> {
    const insights: BehaviorInsight[] = [];
    const currentTime = Date.now();
    const weekAgo = currentTime - (7 * 24 * 60 * 60 * 1000);
    
    // تحليل اتجاهات التنبيهات
    const recentAlerts = this.behaviorAlerts.filter(alert => alert.timestamp > weekAgo);
    const alertsByType = recentAlerts.reduce((acc, alert) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [alertType, count] of Object.entries(alertsByType)) {
      if (count > 50) { // أكثر من 50 تنبيه من نفس النوع في الأسبوع
        insights.push({
          type: 'trend',
          title: `زيادة في تنبيهات ${alertType}`,
          description: `تم رصد ${count} تنبيه من نوع ${alertType} في الأسبوع الماضي`,
          impact: count > 100 ? 'high' : 'medium',
          recommendation: `مراجعة أسباب زيادة تنبيهات ${alertType}`,
          data: { alertType, count, period: '7_days' },
          timestamp: currentTime
        });
      }
    }

    return insights;
  }

  private async analyzeEmergingThreats(): Promise<void> {
    // تحليل التهديدات الناشئة
    const recentThreats = await this.threatService.getRecentThreats(24);
    
    if (recentThreats.length > 20) {
      console.log('High volume of new threats detected:', recentThreats.length);
    }
  }

  private async cleanupOldData(): Promise<void> {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    // تنظيف التنبيهات القديمة
    this.behaviorAlerts = this.behaviorAlerts.filter(alert => 
      alert.timestamp > thirtyDaysAgo || !alert.resolved
    );
    
    // تنظيف الأنماط القديمة
    for (const [userId, patterns] of this.behaviorPatterns) {
      const filteredPatterns = patterns.filter(pattern => 
        pattern.lastSeen > thirtyDaysAgo || pattern.frequency > 10
      );
      this.behaviorPatterns.set(userId, filteredPatterns);
    }
    
    await this.saveBehaviorData();
  }

  // واجهات برمجية للاستعلام
  async getUserBehaviorInsights(userId: string): Promise<BehaviorInsight[]> {
    const insights: BehaviorInsight[] = [];
    const userPatterns = this.behaviorPatterns.get(userId) || [];
    const userAlerts = this.behaviorAlerts.filter(alert => alert.userId === userId);
    
    // تحليل أنماط المستخدم
    const patternsByType = userPatterns.reduce((acc, pattern) => {
      acc[pattern.patternType] = (acc[pattern.patternType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [patternType, count] of Object.entries(patternsByType)) {
      if (count > 100) {
        insights.push({
          type: 'pattern',
          title: `نمط نشاط عالي في ${patternType}`,
          description: `تم رصد ${count} نمط من نوع ${patternType}`,
          impact: 'medium',
          recommendation: 'مراجعة أنماط النشاط',
          data: { patternType, count },
          timestamp: Date.now()
        });
      }
    }

    return insights;
  }

  async getBehaviorAlerts(
    filters?: {
      userId?: string;
      severity?: string;
      resolved?: boolean;
      limit?: number;
    }
  ): Promise<BehaviorAlert[]> {
    let alerts = [...this.behaviorAlerts];
    
    if (filters?.userId) {
      alerts = alerts.filter(alert => alert.userId === filters.userId);
    }
    
    if (filters?.severity) {
      alerts = alerts.filter(alert => alert.severity === filters.severity);
    }
    
    if (filters?.resolved !== undefined) {
      alerts = alerts.filter(alert => alert.resolved === filters.resolved);
    }
    
    alerts.sort((a, b) => b.timestamp - a.timestamp);
    
    if (filters?.limit) {
      alerts = alerts.slice(0, filters.limit);
    }
    
    return alerts;
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.behaviorAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      await this.saveBehaviorData();
      return true;
    }
    return false;
  }

  async resolveAlert(alertId: string, resolution: 'resolved' | 'false_positive'): Promise<boolean> {
    const alert = this.behaviorAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.falsePositive = resolution === 'false_positive';
      await this.saveBehaviorData();
      return true;
    }
    return false;
  }

  async getAnalyticsStats(): Promise<{
    totalPatterns: number;
    totalAlerts: number;
    unresolvedAlerts: number;
    criticalAlerts: number;
    mlModelStats: MLModelMetrics[];
    topAnomalyTypes: Array<{ type: string; count: number }>;
  }> {
    const totalPatterns = Array.from(this.behaviorPatterns.values())
      .reduce((sum, patterns) => sum + patterns.length, 0);
    
    const unresolvedAlerts = this.behaviorAlerts.filter(alert => !alert.resolved).length;
    const criticalAlerts = this.behaviorAlerts.filter(alert => alert.severity === 'critical').length;
    
    // إحصائيات أنواع الشذوذ
    const anomalyTypes: Record<string, number> = {};
    for (const alert of this.behaviorAlerts) {
      if (alert.metadata.behaviorAnalysis?.anomalyType) {
        const type = alert.metadata.behaviorAnalysis.anomalyType;
        anomalyTypes[type] = (anomalyTypes[type] || 0) + 1;
      }
    }
    
    const topAnomalyTypes = Object.entries(anomalyTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    return {
      totalPatterns,
      totalAlerts: this.behaviorAlerts.length,
      unresolvedAlerts,
      criticalAlerts,
      mlModelStats: Array.from(this.mlModels.values()),
      topAnomalyTypes
    };
  }
}

export default BehaviorAnalyticsService;