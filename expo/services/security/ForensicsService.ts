import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import ContentModerationService from './ContentModerationService';

export interface ForensicEvent {
  id: string;
  timestamp: string;
  eventType: 'message_violation' | 'suspicious_activity' | 'security_breach' | 'user_report' | 'automated_detection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId: string;
  targetUserId?: string;
  description: string;
  evidence: {
    content?: string;
    metadata: Record<string, any>;
    deviceInfo: {
      platform: string;
      userAgent?: string;
      ipAddress?: string;
      location?: string;
    };
  };
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  investigatorId?: string;
  resolution?: string;
  tags: string[];
}

export interface ForensicReport {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  events: ForensicEvent[];
  findings: string[];
  recommendations: string[];
  status: 'draft' | 'completed' | 'archived';
  createdBy: string;
}

export interface ThreatPattern {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'fraud' | 'violence' | 'harassment' | 'spam' | 'hate_speech';
  isActive: boolean;
  detectionCount: number;
  lastDetected?: string;
}

class ForensicsService {
  private readonly STORAGE_KEYS = {
    EVENTS: 'forensic_events',
    REPORTS: 'forensic_reports',
    PATTERNS: 'threat_patterns',
    INVESTIGATIONS: 'active_investigations'
  };

  async logForensicEvent(event: Omit<ForensicEvent, 'id' | 'timestamp'>): Promise<string> {
    try {
      const forensicEvent: ForensicEvent = {
        ...event,
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      };

      const existingEvents = await this.getForensicEvents();
      existingEvents.push(forensicEvent);

      // Keep only last 5000 events for performance
      if (existingEvents.length > 5000) {
        existingEvents.splice(0, existingEvents.length - 5000);
      }

      await AsyncStorage.setItem(this.STORAGE_KEYS.EVENTS, JSON.stringify(existingEvents));

      // Auto-escalate critical events
      if (event.severity === 'critical') {
        await this.createAutoInvestigation(forensicEvent);
      }

      return forensicEvent.id;
    } catch (error) {
      console.error('Failed to log forensic event:', error);
      throw error;
    }
  }

  async getForensicEvents(filters?: {
    eventType?: string;
    severity?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }): Promise<ForensicEvent[]> {
    try {
      const eventsData = await AsyncStorage.getItem(this.STORAGE_KEYS.EVENTS);
      let events: ForensicEvent[] = eventsData ? JSON.parse(eventsData) : [];

      if (filters) {
        events = events.filter(event => {
          if (filters.eventType && event.eventType !== filters.eventType) return false;
          if (filters.severity && event.severity !== filters.severity) return false;
          if (filters.userId && event.userId !== filters.userId) return false;
          if (filters.status && event.status !== filters.status) return false;
          if (filters.dateFrom && new Date(event.timestamp) < new Date(filters.dateFrom)) return false;
          if (filters.dateTo && new Date(event.timestamp) > new Date(filters.dateTo)) return false;
          return true;
        });
      }

      return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to get forensic events:', error);
      return [];
    }
  }

  async updateEventStatus(eventId: string, status: ForensicEvent['status'], resolution?: string): Promise<void> {
    try {
      const events = await this.getForensicEvents();
      const eventIndex = events.findIndex(e => e.id === eventId);
      
      if (eventIndex !== -1) {
        events[eventIndex].status = status;
        if (resolution) {
          events[eventIndex].resolution = resolution;
        }
        
        await AsyncStorage.setItem(this.STORAGE_KEYS.EVENTS, JSON.stringify(events));
      }
    } catch (error) {
      console.error('Failed to update event status:', error);
    }
  }

  async createForensicReport(report: Omit<ForensicReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const forensicReport: ForensicReport = {
        ...report,
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const existingReports = await this.getForensicReports();
      existingReports.push(forensicReport);

      await AsyncStorage.setItem(this.STORAGE_KEYS.REPORTS, JSON.stringify(existingReports));
      return forensicReport.id;
    } catch (error) {
      console.error('Failed to create forensic report:', error);
      throw error;
    }
  }

  async getForensicReports(): Promise<ForensicReport[]> {
    try {
      const reportsData = await AsyncStorage.getItem(this.STORAGE_KEYS.REPORTS);
      const reports: ForensicReport[] = reportsData ? JSON.parse(reportsData) : [];
      return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Failed to get forensic reports:', error);
      return [];
    }
  }

  async analyzeUserBehavior(userId: string, timeframe: number = 24): Promise<{
    riskScore: number;
    suspiciousActivities: string[];
    recommendations: string[];
  }> {
    try {
      const hoursAgo = new Date(Date.now() - timeframe * 60 * 60 * 1000).toISOString();
      const userEvents = await this.getForensicEvents({
        userId,
        dateFrom: hoursAgo
      });

      let riskScore = 0;
      const suspiciousActivities: string[] = [];
      const recommendations: string[] = [];

      // Analyze violation frequency
      const violationCount = userEvents.filter(e => e.eventType === 'message_violation').length;
      if (violationCount > 5) {
        riskScore += 30;
        suspiciousActivities.push(`${violationCount} انتهاكات في المحتوى خلال ${timeframe} ساعة`);
        recommendations.push('مراقبة مكثفة للمستخدم');
      }

      // Analyze severity distribution
      const criticalEvents = userEvents.filter(e => e.severity === 'critical').length;
      const highEvents = userEvents.filter(e => e.severity === 'high').length;
      
      if (criticalEvents > 0) {
        riskScore += criticalEvents * 25;
        suspiciousActivities.push(`${criticalEvents} أحداث حرجة`);
        recommendations.push('تعليق الحساب مؤقتاً');
      }

      if (highEvents > 2) {
        riskScore += highEvents * 10;
        suspiciousActivities.push(`${highEvents} أحداث عالية الخطورة`);
        recommendations.push('تقييد الوظائف');
      }

      // Analyze pattern repetition
      const eventTypes = userEvents.map(e => e.eventType);
      const uniqueTypes = new Set(eventTypes);
      if (eventTypes.length > 10 && uniqueTypes.size < 3) {
        riskScore += 20;
        suspiciousActivities.push('نمط متكرر من السلوك المشبوه');
        recommendations.push('تحليل عميق للسلوك');
      }

      // Analyze time patterns (rapid succession)
      const timestamps = userEvents.map(e => new Date(e.timestamp).getTime());
      const rapidEvents = timestamps.filter((time, index) => {
        if (index === 0) return false;
        return time - timestamps[index - 1] < 60000; // Less than 1 minute apart
      }).length;

      if (rapidEvents > 5) {
        riskScore += 15;
        suspiciousActivities.push('أنشطة متتالية بسرعة مشبوهة');
        recommendations.push('تطبيق حدود زمنية');
      }

      return {
        riskScore: Math.min(riskScore, 100),
        suspiciousActivities,
        recommendations
      };
    } catch (error) {
      console.error('Failed to analyze user behavior:', error);
      return {
        riskScore: 0,
        suspiciousActivities: [],
        recommendations: []
      };
    }
  }

  async detectThreatPatterns(content: string): Promise<ThreatPattern[]> {
    try {
      const patterns = await this.getThreatPatterns();
      const detectedPatterns: ThreatPattern[] = [];

      for (const pattern of patterns) {
        if (pattern.isActive && pattern.pattern.test(content)) {
          detectedPatterns.push(pattern);
          
          // Update detection count
          pattern.detectionCount++;
          pattern.lastDetected = new Date().toISOString();
        }
      }

      if (detectedPatterns.length > 0) {
        await this.updateThreatPatterns(patterns);
      }

      return detectedPatterns;
    } catch (error) {
      console.error('Failed to detect threat patterns:', error);
      return [];
    }
  }

  async getThreatPatterns(): Promise<ThreatPattern[]> {
    try {
      const patternsData = await AsyncStorage.getItem(this.STORAGE_KEYS.PATTERNS);
      return patternsData ? JSON.parse(patternsData) : this.getDefaultThreatPatterns();
    } catch (error) {
      console.error('Failed to get threat patterns:', error);
      return this.getDefaultThreatPatterns();
    }
  }

  private getDefaultThreatPatterns(): ThreatPattern[] {
    return [
      {
        id: 'fraud_money_request',
        name: 'طلب مال مشبوه',
        description: 'طلبات مالية عاجلة من مرسلين غير معروفين',
        pattern: /(?:فلوس|مال|دولار).*(?:عاجل|سريع|فوري)/gi,
        severity: 'high',
        category: 'fraud',
        isActive: true,
        detectionCount: 0
      },
      {
        id: 'violence_direct_threat',
        name: 'تهديد مباشر',
        description: 'تهديدات مباشرة بالعنف',
        pattern: /(?:سأقتل|سأؤذي|ستموت|سأدمر)/gi,
        severity: 'critical',
        category: 'violence',
        isActive: true,
        detectionCount: 0
      },
      {
        id: 'harassment_repeated',
        name: 'تحرش متكرر',
        description: 'رسائل تحرش متكررة',
        pattern: /(?:اسكت|اخرس|امشي|اختفي)/gi,
        severity: 'medium',
        category: 'harassment',
        isActive: true,
        detectionCount: 0
      }
    ];
  }

  private async updateThreatPatterns(patterns: ThreatPattern[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.PATTERNS, JSON.stringify(patterns));
    } catch (error) {
      console.error('Failed to update threat patterns:', error);
    }
  }

  private async createAutoInvestigation(event: ForensicEvent): Promise<void> {
    try {
      const investigation = {
        id: `auto_inv_${Date.now()}`,
        eventId: event.id,
        status: 'active',
        priority: 'high',
        createdAt: new Date().toISOString(),
        assignedTo: 'system',
        notes: `تحقيق تلقائي بسبب حدث حرج: ${event.description}`
      };

      const investigations = await this.getActiveInvestigations();
      investigations.push(investigation);
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.INVESTIGATIONS, JSON.stringify(investigations));
    } catch (error) {
      console.error('Failed to create auto investigation:', error);
    }
  }

  async getActiveInvestigations(): Promise<any[]> {
    try {
      const investigationsData = await AsyncStorage.getItem(this.STORAGE_KEYS.INVESTIGATIONS);
      return investigationsData ? JSON.parse(investigationsData) : [];
    } catch (error) {
      console.error('Failed to get active investigations:', error);
      return [];
    }
  }

  async generateForensicSummary(timeframe: number = 24): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    topUsers: Array<{ userId: string; eventCount: number; riskScore: number }>;
    threatTrends: Array<{ pattern: string; detections: number; trend: 'increasing' | 'decreasing' | 'stable' }>;
    recommendations: string[];
  }> {
    try {
      const hoursAgo = new Date(Date.now() - timeframe * 60 * 60 * 1000).toISOString();
      const events = await this.getForensicEvents({ dateFrom: hoursAgo });

      const eventsByType: Record<string, number> = {};
      const eventsBySeverity: Record<string, number> = {};
      const userEventCounts: Record<string, number> = {};

      events.forEach(event => {
        eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
        eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
        userEventCounts[event.userId] = (userEventCounts[event.userId] || 0) + 1;
      });

      // Get top users by event count
      const topUserEntries = Object.entries(userEventCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      const topUsers = await Promise.all(
        topUserEntries.map(async ([userId, eventCount]) => {
          const analysis = await this.analyzeUserBehavior(userId, timeframe);
          return { userId, eventCount, riskScore: analysis.riskScore };
        })
      );

      // Analyze threat trends (simplified)
      const patterns = await this.getThreatPatterns();
      const threatTrends = patterns.map(pattern => ({
        pattern: pattern.name,
        detections: pattern.detectionCount,
        trend: 'stable' as const // Simplified - would need historical data for real trends
      }));

      // Generate recommendations
      const recommendations: string[] = [];
      if (events.filter(e => e.severity === 'critical').length > 5) {
        recommendations.push('زيادة مستوى المراقبة الأمنية');
      }
      if (events.filter(e => e.eventType === 'message_violation').length > 50) {
        recommendations.push('تحديث قواعد فلترة المحتوى');
      }
      if (topUsers.some(u => u.riskScore > 70)) {
        recommendations.push('مراجعة المستخدمين عالي المخاطر');
      }

      return {
        totalEvents: events.length,
        eventsByType,
        eventsBySeverity,
        topUsers,
        threatTrends,
        recommendations
      };
    } catch (error) {
      console.error('Failed to generate forensic summary:', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        topUsers: [],
        threatTrends: [],
        recommendations: []
      };
    }
  }

  async exportForensicData(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const events = await this.getForensicEvents();
      const reports = await this.getForensicReports();
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        platform: Platform.OS,
        events,
        reports,
        summary: await this.generateForensicSummary(168) // 7 days
      };

      if (format === 'json') {
        return JSON.stringify(exportData, null, 2);
      } else {
        // Simple CSV export for events
        const csvHeaders = 'ID,Timestamp,Type,Severity,UserID,Description,Status\n';
        const csvRows = events.map(event => 
          `${event.id},${event.timestamp},${event.eventType},${event.severity},${event.userId},"${event.description.replace(/"/g, '""')}",${event.status}`
        ).join('\n');
        
        return csvHeaders + csvRows;
      }
    } catch (error) {
      console.error('Failed to export forensic data:', error);
      throw error;
    }
  }

  async clearForensicData(olderThanDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
      
      const events = await this.getForensicEvents();
      const filteredEvents = events.filter(event => event.timestamp > cutoffDate);
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.EVENTS, JSON.stringify(filteredEvents));
      
      const reports = await this.getForensicReports();
      const filteredReports = reports.filter(report => report.createdAt > cutoffDate);
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.REPORTS, JSON.stringify(filteredReports));
    } catch (error) {
      console.error('Failed to clear forensic data:', error);
    }
  }
}

export default new ForensicsService();