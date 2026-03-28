import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface ThreatIndicator {
  id: string;
  type: 'ip' | 'domain' | 'hash' | 'email' | 'phone' | 'device_fingerprint';
  value: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  description: string;
  firstSeen: number;
  lastSeen: number;
  confidence: number;
  tags: string[];
  metadata: Record<string, any>;
}

export interface ThreatFeed {
  id: string;
  name: string;
  url: string;
  type: 'commercial' | 'open_source' | 'internal';
  enabled: boolean;
  lastUpdate: number;
  updateInterval: number;
  indicators: ThreatIndicator[];
}

export interface ThreatAnalysisResult {
  isThreat: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  matchedIndicators: ThreatIndicator[];
  riskScore: number;
  recommendations: string[];
}

export class ThreatIntelligenceService {
  private static instance: ThreatIntelligenceService;
  private threatFeeds: Map<string, ThreatFeed> = new Map();
  private indicatorCache: Map<string, ThreatIndicator[]> = new Map();
  private isInitialized = false;

  static getInstance(): ThreatIntelligenceService {
    if (!ThreatIntelligenceService.instance) {
      ThreatIntelligenceService.instance = new ThreatIntelligenceService();
    }
    return ThreatIntelligenceService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadThreatFeeds();
      await this.initializeDefaultFeeds();
      this.startPeriodicUpdates();
      
      this.isInitialized = true;
      console.log('Threat Intelligence Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Threat Intelligence Service:', error);
      throw error;
    }
  }

  private async loadThreatFeeds(): Promise<void> {
    try {
      const feedsData = await AsyncStorage.getItem('threat_feeds');
      if (feedsData) {
        const feeds = JSON.parse(feedsData);
        Object.entries(feeds).forEach(([feedId, feed]) => {
          this.threatFeeds.set(feedId, feed as ThreatFeed);
        });
      }
    } catch (error) {
      console.error('Failed to load threat feeds:', error);
    }
  }

  private async saveThreatFeeds(): Promise<void> {
    try {
      const feedsObj = Object.fromEntries(this.threatFeeds);
      await AsyncStorage.setItem('threat_feeds', JSON.stringify(feedsObj));
    } catch (error) {
      console.error('Failed to save threat feeds:', error);
    }
  }

  private async initializeDefaultFeeds(): Promise<void> {
    // إضافة مصادر التهديدات الافتراضية
    const defaultFeeds: ThreatFeed[] = [
      {
        id: 'malware_domains',
        name: 'Malware Domains Feed',
        url: 'https://malware-domains.com/feed',
        type: 'open_source',
        enabled: true,
        lastUpdate: 0,
        updateInterval: 3600000, // كل ساعة
        indicators: []
      },
      {
        id: 'phishing_urls',
        name: 'Phishing URLs Feed',
        url: 'https://phishing-urls.com/feed',
        type: 'open_source',
        enabled: true,
        lastUpdate: 0,
        updateInterval: 1800000, // كل 30 دقيقة
        indicators: []
      },
      {
        id: 'suspicious_ips',
        name: 'Suspicious IPs Feed',
        url: 'https://suspicious-ips.com/feed',
        type: 'open_source',
        enabled: true,
        lastUpdate: 0,
        updateInterval: 3600000,
        indicators: []
      },
      {
        id: 'internal_threats',
        name: 'Internal Threat Intelligence',
        url: 'internal',
        type: 'internal',
        enabled: true,
        lastUpdate: Date.now(),
        updateInterval: 86400000, // يومياً
        indicators: this.getInternalThreatIndicators()
      }
    ];

    for (const feed of defaultFeeds) {
      if (!this.threatFeeds.has(feed.id)) {
        this.threatFeeds.set(feed.id, feed);
      }
    }

    await this.saveThreatFeeds();
  }

  private getInternalThreatIndicators(): ThreatIndicator[] {
    return [
      {
        id: 'internal_001',
        type: 'ip',
        value: '192.168.1.100',
        severity: 'high',
        source: 'internal_security_team',
        description: 'IP address associated with previous security incident',
        firstSeen: Date.now() - 86400000,
        lastSeen: Date.now(),
        confidence: 0.9,
        tags: ['internal', 'previous_incident'],
        metadata: { incident_id: 'INC-2024-001' }
      },
      {
        id: 'internal_002',
        type: 'domain',
        value: 'suspicious-domain.com',
        severity: 'critical',
        source: 'internal_security_team',
        description: 'Domain used in phishing campaign targeting our users',
        firstSeen: Date.now() - 172800000,
        lastSeen: Date.now() - 3600000,
        confidence: 0.95,
        tags: ['phishing', 'targeted_attack'],
        metadata: { campaign_id: 'PHISH-2024-001' }
      },
      {
        id: 'internal_003',
        type: 'device_fingerprint',
        value: 'suspicious_device_123',
        severity: 'medium',
        source: 'ueba_system',
        description: 'Device fingerprint associated with anomalous behavior',
        firstSeen: Date.now() - 43200000,
        lastSeen: Date.now() - 1800000,
        confidence: 0.7,
        tags: ['anomalous_behavior', 'device_risk'],
        metadata: { risk_score: 0.8 }
      }
    ];
  }

  private startPeriodicUpdates(): void {
    // تحديث دوري لمصادر التهديدات
    setInterval(() => {
      this.updateAllFeeds();
    }, 300000); // كل 5 دقائق
  }

  private async updateAllFeeds(): Promise<void> {
    const currentTime = Date.now();
    
    for (const feed of this.threatFeeds.values()) {
      if (feed.enabled && (currentTime - feed.lastUpdate) > feed.updateInterval) {
        await this.updateFeed(feed);
      }
    }
  }

  private async updateFeed(feed: ThreatFeed): Promise<void> {
    try {
      if (feed.type === 'internal') {
        // تحديث المؤشرات الداخلية
        feed.indicators = this.getInternalThreatIndicators();
        feed.lastUpdate = Date.now();
        return;
      }

      // محاكاة تحديث من مصدر خارجي
      // في التطبيق الحقيقي، سيتم جلب البيانات من الـ URL
      const mockIndicators = await this.fetchMockThreatData(feed.type);
      
      feed.indicators = mockIndicators;
      feed.lastUpdate = Date.now();
      
      // تحديث الكاش
      this.updateIndicatorCache(feed);
      
      console.log(`Updated threat feed: ${feed.name} with ${mockIndicators.length} indicators`);
      
    } catch (error) {
      console.error(`Failed to update feed ${feed.name}:`, error);
    }
  }

  private async fetchMockThreatData(feedType: string): Promise<ThreatIndicator[]> {
    // محاكاة بيانات التهديدات (في التطبيق الحقيقي سيتم جلبها من APIs خارجية)
    const mockData: Record<string, ThreatIndicator[]> = {
      'open_source': [
        {
          id: `mock_${Date.now()}_1`,
          type: 'ip',
          value: '192.168.100.50',
          severity: 'high',
          source: 'mock_threat_feed',
          description: 'IP associated with botnet activity',
          firstSeen: Date.now() - 86400000,
          lastSeen: Date.now() - 3600000,
          confidence: 0.85,
          tags: ['botnet', 'malware'],
          metadata: { country: 'Unknown', asn: 'AS12345' }
        },
        {
          id: `mock_${Date.now()}_2`,
          type: 'domain',
          value: 'malicious-site.example',
          severity: 'critical',
          source: 'mock_threat_feed',
          description: 'Domain hosting malware',
          firstSeen: Date.now() - 172800000,
          lastSeen: Date.now() - 7200000,
          confidence: 0.9,
          tags: ['malware', 'c2'],
          metadata: { registrar: 'Unknown', creation_date: '2024-01-01' }
        }
      ]
    };

    return mockData[feedType] || [];
  }

  private updateIndicatorCache(feed: ThreatFeed): void {
    for (const indicator of feed.indicators) {
      const key = `${indicator.type}:${indicator.value}`;
      
      if (!this.indicatorCache.has(key)) {
        this.indicatorCache.set(key, []);
      }
      
      const indicators = this.indicatorCache.get(key)!;
      const existingIndex = indicators.findIndex(i => i.id === indicator.id);
      
      if (existingIndex >= 0) {
        indicators[existingIndex] = indicator;
      } else {
        indicators.push(indicator);
      }
    }
  }

  async analyzeThreat(
    type: 'ip' | 'domain' | 'hash' | 'email' | 'phone' | 'device_fingerprint',
    value: string
  ): Promise<ThreatAnalysisResult> {
    try {
      const key = `${type}:${value}`;
      const matchedIndicators = this.indicatorCache.get(key) || [];
      
      if (matchedIndicators.length === 0) {
        return {
          isThreat: false,
          severity: 'low',
          confidence: 0,
          matchedIndicators: [],
          riskScore: 0,
          recommendations: ['No threat indicators found']
        };
      }

      // حساب مستوى التهديد والثقة
      const highestSeverity = this.getHighestSeverity(matchedIndicators);
      const avgConfidence = matchedIndicators.reduce((sum, ind) => sum + ind.confidence, 0) / matchedIndicators.length;
      const riskScore = this.calculateRiskScore(matchedIndicators);
      
      const recommendations = this.generateRecommendations(matchedIndicators, type);

      return {
        isThreat: true,
        severity: highestSeverity,
        confidence: avgConfidence,
        matchedIndicators,
        riskScore,
        recommendations
      };
      
    } catch (error) {
      console.error('Threat analysis failed:', error);
      return {
        isThreat: false,
        severity: 'low',
        confidence: 0,
        matchedIndicators: [],
        riskScore: 0,
        recommendations: ['Analysis error occurred']
      };
    }
  }

  private getHighestSeverity(indicators: ThreatIndicator[]): 'low' | 'medium' | 'high' | 'critical' {
    const severityOrder = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    
    let highest = 'low';
    for (const indicator of indicators) {
      if (severityOrder[indicator.severity] > severityOrder[highest as keyof typeof severityOrder]) {
        highest = indicator.severity;
      }
    }
    
    return highest as 'low' | 'medium' | 'high' | 'critical';
  }

  private calculateRiskScore(indicators: ThreatIndicator[]): number {
    let totalScore = 0;
    const severityWeights = { 'low': 0.2, 'medium': 0.4, 'high': 0.7, 'critical': 1.0 };
    
    for (const indicator of indicators) {
      const severityWeight = severityWeights[indicator.severity];
      const confidenceWeight = indicator.confidence;
      const ageWeight = this.calculateAgeWeight(indicator.lastSeen);
      
      totalScore += severityWeight * confidenceWeight * ageWeight;
    }
    
    return Math.min(1, totalScore / indicators.length);
  }

  private calculateAgeWeight(lastSeen: number): number {
    const ageInHours = (Date.now() - lastSeen) / (1000 * 60 * 60);
    
    if (ageInHours < 24) return 1.0;      // آخر 24 ساعة
    if (ageInHours < 168) return 0.8;     // آخر أسبوع
    if (ageInHours < 720) return 0.6;     // آخر شهر
    return 0.4;                           // أقدم من شهر
  }

  private generateRecommendations(
    indicators: ThreatIndicator[],
    type: string
  ): string[] {
    const recommendations: string[] = [];
    
    const criticalIndicators = indicators.filter(i => i.severity === 'critical');
    const highIndicators = indicators.filter(i => i.severity === 'high');
    
    if (criticalIndicators.length > 0) {
      recommendations.push('تم اكتشاف تهديد حرج - يجب اتخاذ إجراء فوري');
      recommendations.push('حظر الوصول من هذا المصدر');
      recommendations.push('إشعار فريق الأمان فوراً');
    } else if (highIndicators.length > 0) {
      recommendations.push('تم اكتشاف تهديد عالي المخاطر');
      recommendations.push('مراقبة إضافية مطلوبة');
    }

    // توصيات حسب نوع التهديد
    switch (type) {
      case 'ip':
        recommendations.push('فحص سجلات الاتصال من هذا العنوان');
        recommendations.push('تطبيق قواعد جدار الحماية');
        break;
      case 'domain':
        recommendations.push('حظر الوصول لهذا النطاق');
        recommendations.push('فحص DNS logs');
        break;
      case 'device_fingerprint':
        recommendations.push('مراجعة نشاط هذا الجهاز');
        recommendations.push('تطبيق مصادقة إضافية');
        break;
      case 'email':
        recommendations.push('حظر هذا البريد الإلكتروني');
        recommendations.push('فحص الرسائل المرسلة من هذا العنوان');
        break;
    }

    // توصيات حسب العلامات
    const allTags = indicators.flatMap(i => i.tags);
    if (allTags.includes('phishing')) {
      recommendations.push('تحذير المستخدمين من محاولات التصيد');
    }
    if (allTags.includes('malware')) {
      recommendations.push('فحص الأنظمة بحثاً عن البرمجيات الخبيثة');
    }
    if (allTags.includes('botnet')) {
      recommendations.push('فحص الشبكة بحثاً عن نشاط البوت نت');
    }

    return recommendations;
  }

  async addCustomIndicator(indicator: Omit<ThreatIndicator, 'id' | 'firstSeen'>): Promise<string> {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullIndicator: ThreatIndicator = {
      ...indicator,
      id,
      firstSeen: Date.now()
    };

    // إضافة للمصدر الداخلي
    const internalFeed = this.threatFeeds.get('internal_threats');
    if (internalFeed) {
      internalFeed.indicators.push(fullIndicator);
      this.updateIndicatorCache(internalFeed);
      await this.saveThreatFeeds();
    }

    return id;
  }

  async removeIndicator(indicatorId: string): Promise<boolean> {
    for (const feed of this.threatFeeds.values()) {
      const index = feed.indicators.findIndex(i => i.id === indicatorId);
      if (index >= 0) {
        const indicator = feed.indicators[index];
        feed.indicators.splice(index, 1);
        
        // إزالة من الكاش
        const key = `${indicator.type}:${indicator.value}`;
        const cachedIndicators = this.indicatorCache.get(key);
        if (cachedIndicators) {
          const cacheIndex = cachedIndicators.findIndex(i => i.id === indicatorId);
          if (cacheIndex >= 0) {
            cachedIndicators.splice(cacheIndex, 1);
            if (cachedIndicators.length === 0) {
              this.indicatorCache.delete(key);
            }
          }
        }
        
        await this.saveThreatFeeds();
        return true;
      }
    }
    return false;
  }

  async getIndicatorsByType(type: string): Promise<ThreatIndicator[]> {
    const indicators: ThreatIndicator[] = [];
    
    for (const feed of this.threatFeeds.values()) {
      indicators.push(...feed.indicators.filter(i => i.type === type));
    }
    
    return indicators.sort((a, b) => b.lastSeen - a.lastSeen);
  }

  async getRecentThreats(hours: number = 24): Promise<ThreatIndicator[]> {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    const recentThreats: ThreatIndicator[] = [];
    
    for (const feed of this.threatFeeds.values()) {
      recentThreats.push(...feed.indicators.filter(i => i.lastSeen > cutoffTime));
    }
    
    return recentThreats.sort((a, b) => b.lastSeen - a.lastSeen);
  }

  async getThreatStats(): Promise<{
    totalIndicators: number;
    indicatorsByType: Record<string, number>;
    indicatorsBySeverity: Record<string, number>;
    activeFeeds: number;
    lastUpdate: number;
  }> {
    let totalIndicators = 0;
    const indicatorsByType: Record<string, number> = {};
    const indicatorsBySeverity: Record<string, number> = {};
    let activeFeeds = 0;
    let lastUpdate = 0;

    for (const feed of this.threatFeeds.values()) {
      if (feed.enabled) {
        activeFeeds++;
        totalIndicators += feed.indicators.length;
        lastUpdate = Math.max(lastUpdate, feed.lastUpdate);
        
        for (const indicator of feed.indicators) {
          indicatorsByType[indicator.type] = (indicatorsByType[indicator.type] || 0) + 1;
          indicatorsBySeverity[indicator.severity] = (indicatorsBySeverity[indicator.severity] || 0) + 1;
        }
      }
    }

    return {
      totalIndicators,
      indicatorsByType,
      indicatorsBySeverity,
      activeFeeds,
      lastUpdate
    };
  }

  async enableFeed(feedId: string): Promise<boolean> {
    const feed = this.threatFeeds.get(feedId);
    if (feed) {
      feed.enabled = true;
      await this.saveThreatFeeds();
      return true;
    }
    return false;
  }

  async disableFeed(feedId: string): Promise<boolean> {
    const feed = this.threatFeeds.get(feedId);
    if (feed) {
      feed.enabled = false;
      await this.saveThreatFeeds();
      return true;
    }
    return false;
  }

  async searchIndicators(query: string): Promise<ThreatIndicator[]> {
    const results: ThreatIndicator[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const feed of this.threatFeeds.values()) {
      for (const indicator of feed.indicators) {
        if (
          indicator.value.toLowerCase().includes(lowerQuery) ||
          indicator.description.toLowerCase().includes(lowerQuery) ||
          indicator.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        ) {
          results.push(indicator);
        }
      }
    }
    
    return results.sort((a, b) => b.lastSeen - a.lastSeen);
  }
}

export default ThreatIntelligenceService;