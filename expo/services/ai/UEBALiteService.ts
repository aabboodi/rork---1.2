import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export interface UserBehaviorEvent {
  id: string;
  type: 'login' | 'transaction' | 'navigation' | 'interaction' | 'ai_task';
  timestamp: number;
  metadata: {
    location?: string;
    deviceInfo?: string;
    sessionId: string;
    riskScore?: number;
    [key: string]: unknown;
  };
  hash: string;
}

export interface BehaviorPattern {
  id: string;
  type: string;
  frequency: number;
  timeWindows: number[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  lastSeen: number;
}

export interface AnomalyDetection {
  eventId: string;
  anomalyType: 'frequency' | 'timing' | 'location' | 'sequence' | 'ai_usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  timestamp: number;
}

/**
 * UEBA Lite Service - Lightweight on-device behavioral analytics
 * 
 * Features:
 * - Local behavior pattern learning
 * - Anomaly detection without cloud data
 * - Privacy-preserving analytics
 * - Real-time risk scoring
 */
export class UEBALiteService {
  private events: UserBehaviorEvent[] = [];
  private patterns: Map<string, BehaviorPattern> = new Map();
  private anomalies: AnomalyDetection[] = [];
  private sessionId: string = '';
  private isInitialized = false;
  private readonly MAX_EVENTS = 1000; // Keep last 1000 events
  private readonly STORAGE_KEY = 'ueba_lite_data';

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔍 Initializing UEBA Lite Service...');

      // Generate session ID
      this.sessionId = await this.generateSessionId();

      // Load cached data
      await this.loadCachedData();

      // Start behavior analysis
      this.startBehaviorAnalysis();

      this.isInitialized = true;
      console.log('✅ UEBA Lite Service initialized');

    } catch (error) {
      console.error('❌ UEBA Lite initialization failed:', error);
      throw error;
    }
  }

  /**
   * Record user behavior event
   */
  async recordEvent(
    type: UserBehaviorEvent['type'],
    metadata: Omit<UserBehaviorEvent['metadata'], 'sessionId'>
  ): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const event: UserBehaviorEvent = {
        id: await this.generateEventId(),
        type,
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          sessionId: this.sessionId
        },
        hash: await this.generateEventHash(type, metadata)
      };

      // Add event to buffer
      this.events.push(event);

      // Maintain buffer size
      if (this.events.length > this.MAX_EVENTS) {
        this.events = this.events.slice(-this.MAX_EVENTS);
      }

      // Analyze for anomalies
      await this.analyzeEvent(event);

      // Update patterns
      await this.updateBehaviorPatterns(event);

      // Save data periodically
      if (this.events.length % 10 === 0) {
        await this.saveCachedData();
      }

    } catch (error) {
      console.error('❌ Failed to record UEBA event:', error);
    }
  }

  /**
   * Get current risk score for user
   */
  getCurrentRiskScore(): { score: number; level: string; factors: string[] } {
    const recentEvents = this.getRecentEvents(60 * 60 * 1000); // Last hour
    const recentAnomalies = this.getRecentAnomalies(60 * 60 * 1000);

    let score = 0;
    const factors: string[] = [];

    // Base score from recent anomalies
    for (const anomaly of recentAnomalies) {
      switch (anomaly.severity) {
        case 'low':
          score += 10;
          break;
        case 'medium':
          score += 25;
          break;
        case 'high':
          score += 50;
          break;
        case 'critical':
          score += 100;
          break;
      }
      factors.push(`${anomaly.anomalyType} anomaly detected`);
    }

    // Frequency analysis
    const eventFrequency = recentEvents.length;
    if (eventFrequency > 100) {
      score += 20;
      factors.push('High activity frequency');
    } else if (eventFrequency < 5) {
      score += 10;
      factors.push('Unusually low activity');
    }

    // AI task usage patterns
    const aiEvents = recentEvents.filter(e => e.type === 'ai_task');
    if (aiEvents.length > 20) {
      score += 15;
      factors.push('High AI usage');
    }

    // Time-based patterns
    const currentHour = new Date().getHours();
    const nightTimeActivity = recentEvents.filter(e => {
      const hour = new Date(e.timestamp).getHours();
      return hour >= 23 || hour <= 5;
    });

    if (nightTimeActivity.length > 10 && (currentHour >= 23 || currentHour <= 5)) {
      score += 15;
      factors.push('Unusual night-time activity');
    }

    // Determine risk level
    let level = 'low';
    if (score >= 75) level = 'critical';
    else if (score >= 50) level = 'high';
    else if (score >= 25) level = 'medium';

    return {
      score: Math.min(score, 100),
      level,
      factors
    };
  }

  /**
   * Get behavior analytics summary
   */
  getBehaviorSummary() {
    const recentEvents = this.getRecentEvents(24 * 60 * 60 * 1000); // Last 24 hours
    const recentAnomalies = this.getRecentAnomalies(24 * 60 * 60 * 1000);

    // Event type distribution
    const eventTypes = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Hourly activity pattern
    const hourlyActivity = new Array(24).fill(0);
    recentEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourlyActivity[hour]++;
    });

    // Most active patterns
    const topPatterns = Array.from(this.patterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    return {
      totalEvents: this.events.length,
      recentEvents: recentEvents.length,
      recentAnomalies: recentAnomalies.length,
      eventTypes,
      hourlyActivity,
      topPatterns: topPatterns.map(p => ({
        type: p.type,
        frequency: p.frequency,
        riskLevel: p.riskLevel
      })),
      riskAssessment: this.getCurrentRiskScore(),
      sessionId: this.sessionId
    };
  }

  /**
   * Get recent anomalies
   */
  getRecentAnomalies(timeWindow: number = 60 * 60 * 1000): AnomalyDetection[] {
    const cutoff = Date.now() - timeWindow;
    return this.anomalies.filter(anomaly => anomaly.timestamp > cutoff);
  }

  /**
   * Clear old data
   */
  async clearOldData(): Promise<void> {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Remove old events
    this.events = this.events.filter(event => event.timestamp > oneWeekAgo);
    
    // Remove old anomalies
    this.anomalies = this.anomalies.filter(anomaly => anomaly.timestamp > oneWeekAgo);
    
    // Update patterns (remove unused ones)
    for (const [key, pattern] of this.patterns.entries()) {
      if (pattern.lastSeen < oneWeekAgo) {
        this.patterns.delete(key);
      }
    }

    await this.saveCachedData();
    console.log('🗑️ UEBA Lite: Cleared old data');
  }

  // Private methods

  private async generateSessionId(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      randomBytes.join('') + Date.now().toString()
    );
  }

  private async generateEventId(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(8);
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      randomBytes.join('') + Date.now().toString()
    );
  }

  private async generateEventHash(
    type: string,
    metadata: Record<string, unknown>
  ): Promise<string> {
    const content = JSON.stringify({ type, metadata, timestamp: Date.now() });
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      content
    );
  }

  private async loadCachedData(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        
        this.events = data.events || [];
        this.anomalies = data.anomalies || [];
        
        // Reconstruct patterns Map
        if (data.patterns) {
          this.patterns = new Map(data.patterns);
        }
        
        console.log(`📥 UEBA Lite: Loaded ${this.events.length} events, ${this.anomalies.length} anomalies`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load UEBA Lite cached data:', error);
    }
  }

  private async saveCachedData(): Promise<void> {
    try {
      const data = {
        events: this.events,
        anomalies: this.anomalies,
        patterns: Array.from(this.patterns.entries()),
        lastSaved: Date.now()
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Failed to save UEBA Lite data:', error);
    }
  }

  private getRecentEvents(timeWindow: number): UserBehaviorEvent[] {
    const cutoff = Date.now() - timeWindow;
    return this.events.filter(event => event.timestamp > cutoff);
  }

  private async analyzeEvent(event: UserBehaviorEvent): Promise<void> {
    // Frequency anomaly detection
    await this.detectFrequencyAnomaly(event);
    
    // Timing anomaly detection
    await this.detectTimingAnomaly(event);
    
    // Sequence anomaly detection
    await this.detectSequenceAnomaly(event);
    
    // AI usage anomaly detection
    if (event.type === 'ai_task') {
      await this.detectAIUsageAnomaly(event);
    }
  }

  private async detectFrequencyAnomaly(event: UserBehaviorEvent): Promise<void> {
    const recentSimilarEvents = this.events.filter(e => 
      e.type === event.type && 
      e.timestamp > (Date.now() - 60 * 60 * 1000) // Last hour
    );

    const frequency = recentSimilarEvents.length;
    const pattern = this.patterns.get(event.type);
    
    if (pattern && frequency > pattern.frequency * 3) {
      await this.recordAnomaly({
        eventId: event.id,
        anomalyType: 'frequency',
        severity: frequency > pattern.frequency * 5 ? 'high' : 'medium',
        confidence: 0.8,
        description: `Unusual frequency of ${event.type} events: ${frequency} in last hour`,
        timestamp: Date.now()
      });
    }
  }

  private async detectTimingAnomaly(event: UserBehaviorEvent): Promise<void> {
    const currentHour = new Date(event.timestamp).getHours();
    const pattern = this.patterns.get(`${event.type}_timing`);
    
    if (pattern && pattern.timeWindows.length > 0) {
      const isNormalTime = pattern.timeWindows.some(window => 
        Math.abs(window - currentHour) <= 2
      );
      
      if (!isNormalTime) {
        await this.recordAnomaly({
          eventId: event.id,
          anomalyType: 'timing',
          severity: 'medium',
          confidence: 0.7,
          description: `Unusual timing for ${event.type} at hour ${currentHour}`,
          timestamp: Date.now()
        });
      }
    }
  }

  private async detectSequenceAnomaly(event: UserBehaviorEvent): Promise<void> {
    const recentEvents = this.getRecentEvents(5 * 60 * 1000); // Last 5 minutes
    const sequence = recentEvents.slice(-5).map(e => e.type);
    
    // Check for unusual rapid sequences
    if (sequence.length >= 3) {
      const uniqueTypes = new Set(sequence);
      if (uniqueTypes.size === 1 && sequence.length >= 5) {
        await this.recordAnomaly({
          eventId: event.id,
          anomalyType: 'sequence',
          severity: 'medium',
          confidence: 0.6,
          description: `Rapid repetition of ${event.type} events`,
          timestamp: Date.now()
        });
      }
    }
  }

  private async detectAIUsageAnomaly(event: UserBehaviorEvent): Promise<void> {
    const recentAIEvents = this.events.filter(e => 
      e.type === 'ai_task' && 
      e.timestamp > (Date.now() - 60 * 60 * 1000) // Last hour
    );

    const aiUsageCount = recentAIEvents.length;
    
    // Check for excessive AI usage
    if (aiUsageCount > 50) {
      await this.recordAnomaly({
        eventId: event.id,
        anomalyType: 'ai_usage',
        severity: aiUsageCount > 100 ? 'high' : 'medium',
        confidence: 0.9,
        description: `Excessive AI usage: ${aiUsageCount} tasks in last hour`,
        timestamp: Date.now()
      });
    }

    // Check for unusual AI task patterns
    const taskTypes = recentAIEvents.map(e => e.metadata.taskType).filter(Boolean);
    const uniqueTaskTypes = new Set(taskTypes);
    
    if (uniqueTaskTypes.size === 1 && taskTypes.length > 20) {
      await this.recordAnomaly({
        eventId: event.id,
        anomalyType: 'ai_usage',
        severity: 'medium',
        confidence: 0.7,
        description: `Repetitive AI task pattern detected`,
        timestamp: Date.now()
      });
    }
  }

  private async updateBehaviorPatterns(event: UserBehaviorEvent): Promise<void> {
    // Update frequency pattern
    const frequencyKey = event.type;
    const frequencyPattern = this.patterns.get(frequencyKey) || {
      id: frequencyKey,
      type: event.type,
      frequency: 0,
      timeWindows: [],
      riskLevel: 'low' as const,
      confidence: 0,
      lastSeen: 0
    };

    frequencyPattern.frequency++;
    frequencyPattern.lastSeen = event.timestamp;
    frequencyPattern.confidence = Math.min(frequencyPattern.confidence + 0.01, 1.0);
    
    this.patterns.set(frequencyKey, frequencyPattern);

    // Update timing pattern
    const timingKey = `${event.type}_timing`;
    const currentHour = new Date(event.timestamp).getHours();
    const timingPattern = this.patterns.get(timingKey) || {
      id: timingKey,
      type: `${event.type}_timing`,
      frequency: 0,
      timeWindows: [],
      riskLevel: 'low' as const,
      confidence: 0,
      lastSeen: 0
    };

    if (!timingPattern.timeWindows.includes(currentHour)) {
      timingPattern.timeWindows.push(currentHour);
      // Keep only most common time windows (max 8)
      if (timingPattern.timeWindows.length > 8) {
        timingPattern.timeWindows = timingPattern.timeWindows.slice(-8);
      }
    }

    timingPattern.frequency++;
    timingPattern.lastSeen = event.timestamp;
    timingPattern.confidence = Math.min(timingPattern.confidence + 0.01, 1.0);
    
    this.patterns.set(timingKey, timingPattern);
  }

  private async recordAnomaly(anomaly: AnomalyDetection): Promise<void> {
    this.anomalies.push(anomaly);
    
    // Keep only recent anomalies (last 100)
    if (this.anomalies.length > 100) {
      this.anomalies = this.anomalies.slice(-100);
    }

    console.log(`🚨 UEBA Anomaly detected: ${anomaly.anomalyType} - ${anomaly.severity}`);
  }

  private startBehaviorAnalysis(): void {
    // Run periodic analysis every 5 minutes
    setInterval(async () => {
      try {
        // Clean old data weekly
        const lastCleanup = await AsyncStorage.getItem('ueba_last_cleanup');
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        if (!lastCleanup || parseInt(lastCleanup) < oneWeekAgo) {
          await this.clearOldData();
          await AsyncStorage.setItem('ueba_last_cleanup', Date.now().toString());
        }

        // Save data periodically
        await this.saveCachedData();
        
      } catch (error) {
        console.error('❌ UEBA periodic analysis failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
}

export default UEBALiteService;