import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import AIVisionService, { VisionAnalysisResult } from './AIVisionService';

export interface RiskScore {
  userId: string;
  score: number; // 0-100 (0 = safe, 100 = high risk)
  factors: RiskFactor[];
  lastUpdated: Date;
  category: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskFactor {
  type: 'spam' | 'hate' | 'suspicious_behavior' | 'content_violation' | 'social_engineering' | 'adult_content' | 'violent_content' | 'weapons_detected';
  weight: number;
  description: string;
  timestamp: Date;
}

export interface ContentAnalysisResult {
  isSpam: boolean;
  isHate: boolean;
  isSuspicious: boolean;
  hasInappropriateContent: boolean;
  hasAdultContent?: boolean;
  hasViolentContent?: boolean;
  hasWeaponsContent?: boolean;
  confidence: number;
  detectedLanguage?: string;
  riskFactors: string[];
  visionAnalysis?: VisionAnalysisResult;
}

export interface BehaviorPattern {
  userId: string;
  messageFrequency: number;
  linkSharingFrequency: number;
  suspiciousPatterns: string[];
  timeBasedPatterns: { hour: number; activity: number }[];
  interactionPatterns: { recipientId: string; frequency: number }[];
}

class SecurityAIService {
  private static instance: SecurityAIService;
  private riskScores: Map<string, RiskScore> = new Map();
  private behaviorPatterns: Map<string, BehaviorPattern> = new Map();
  private visionService: AIVisionService;
  private spamKeywords: string[] = [
    'free money', 'click here', 'urgent', 'limited time', 'act now',
    'congratulations', 'winner', 'prize', 'lottery', 'inheritance',
    'bitcoin', 'crypto investment', 'guaranteed profit', 'easy money'
  ];
  private hateKeywords: string[] = [
    // Note: In production, use a more comprehensive and regularly updated list
    'hate', 'violence', 'threat', 'kill', 'die', 'stupid', 'idiot'
  ];

  public static getInstance(): SecurityAIService {
    if (!SecurityAIService.instance) {
      SecurityAIService.instance = new SecurityAIService();
    }
    return SecurityAIService.instance;
  }

  constructor() {
    this.visionService = AIVisionService.getInstance();
  }

  async initialize(): Promise<void> {
    try {
      await this.loadStoredData();
      await this.visionService.initialize();
      this.startBehaviorAnalysis();
    } catch (error) {
      console.error('Failed to initialize SecurityAI:', error);
    }
  }

  private async loadStoredData(): Promise<void> {
    try {
      const storedRiskScores = await AsyncStorage.getItem('security_risk_scores');
      const storedBehaviorPatterns = await AsyncStorage.getItem('behavior_patterns');

      if (storedRiskScores) {
        const parsed = JSON.parse(storedRiskScores);
        Object.entries(parsed).forEach(([userId, data]: [string, any]) => {
          this.riskScores.set(userId, {
            ...data,
            lastUpdated: new Date(data.lastUpdated),
            factors: data.factors.map((f: any) => ({
              ...f,
              timestamp: new Date(f.timestamp)
            }))
          });
        });
      }

      if (storedBehaviorPatterns) {
        const parsed = JSON.parse(storedBehaviorPatterns);
        Object.entries(parsed).forEach(([userId, data]: [string, any]) => {
          this.behaviorPatterns.set(userId, data as BehaviorPattern);
        });
      }
    } catch (error) {
      console.error('Failed to load stored security data:', error);
    }
  }

  private async saveData(): Promise<void> {
    try {
      const riskScoresObj = Object.fromEntries(this.riskScores);
      const behaviorPatternsObj = Object.fromEntries(this.behaviorPatterns);

      await AsyncStorage.setItem('security_risk_scores', JSON.stringify(riskScoresObj));
      await AsyncStorage.setItem('behavior_patterns', JSON.stringify(behaviorPatternsObj));
    } catch (error) {
      console.error('Failed to save security data:', error);
    }
  }

  async analyzeContent(content: string, userId: string, type: 'text' | 'image' | 'file' = 'text'): Promise<ContentAnalysisResult> {
    try {
      let result: ContentAnalysisResult = {
        isSpam: false,
        isHate: false,
        isSuspicious: false,
        hasInappropriateContent: false,
        confidence: 0,
        riskFactors: []
      };

      if (type === 'text') {
        result = await this.analyzeTextContent(content);
      } else if (type === 'image') {
        result = await this.analyzeImageContent(content);
      }

      // Update user risk score based on analysis
      if (result.isSpam || result.isHate || result.isSuspicious) {
        await this.updateUserRiskScore(userId, result);
      }

      return result;
    } catch (error) {
      console.error('Content analysis failed:', error);
      return {
        isSpam: false,
        isHate: false,
        isSuspicious: false,
        hasInappropriateContent: false,
        confidence: 0,
        riskFactors: ['analysis_error']
      };
    }
  }

  private async analyzeTextContent(text: string): Promise<ContentAnalysisResult> {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    
    let spamScore = 0;
    let hateScore = 0;
    let suspiciousScore = 0;
    const riskFactors: string[] = [];

    // Spam detection
    this.spamKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        spamScore += 10;
        riskFactors.push(`spam_keyword: ${keyword}`);
      }
    });

    // Hate speech detection
    this.hateKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        hateScore += 15;
        riskFactors.push(`hate_keyword: ${keyword}`);
      }
    });

    // Suspicious patterns
    const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const urls = text.match(urlPattern);
    if (urls && urls.length > 2) {
      suspiciousScore += 20;
      riskFactors.push('multiple_urls');
    }

    // Excessive caps
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 10) {
      suspiciousScore += 10;
      riskFactors.push('excessive_caps');
    }

    // Phone numbers or financial info
    if (/\b\d{10,}\b/.test(text) || /\$\d+|\d+\$/.test(text)) {
      suspiciousScore += 15;
      riskFactors.push('financial_info');
    }

    const totalScore = Math.max(spamScore, hateScore, suspiciousScore);
    const confidence = Math.min(totalScore / 50, 1);

    return {
      isSpam: spamScore >= 20,
      isHate: hateScore >= 25,
      isSuspicious: suspiciousScore >= 20,
      hasInappropriateContent: hateScore >= 25 || suspiciousScore >= 30,
      confidence,
      riskFactors
    };
  }

  private async analyzeImageContent(imageBase64: string): Promise<ContentAnalysisResult> {
    try {
      // Use the new AI Vision Service for comprehensive image analysis
      const visionAnalysis = await this.visionService.analyzeImage(imageBase64, {
        provider: 'hybrid',
        enableFaceDetection: true,
        enableTextDetection: true,
        enableObjectDetection: true,
        cacheResults: true
      });
      
      // Convert vision analysis to content analysis format
      const riskFactors: string[] = [];
      
      if (visionAnalysis.hasAdultContent) riskFactors.push('adult_content');
      if (visionAnalysis.hasViolentContent) riskFactors.push('violent_content');
      if (visionAnalysis.hasRacyContent) riskFactors.push('racy_content');
      if (visionAnalysis.hasSpamContent) riskFactors.push('spam_content');
      if (visionAnalysis.hasWeaponsContent) riskFactors.push('weapons_detected');
      if (visionAnalysis.hasMedicalContent) riskFactors.push('medical_content');
      
      // Analyze detected text if present
      let textAnalysis: ContentAnalysisResult | null = null;
      if (visionAnalysis.detectedText) {
        textAnalysis = await this.analyzeTextContent(visionAnalysis.detectedText);
        riskFactors.push(...textAnalysis.riskFactors);
      }
      
      const isSpam = visionAnalysis.hasSpamContent || (textAnalysis?.isSpam ?? false);
      const isHate = visionAnalysis.hasViolentContent || (textAnalysis?.isHate ?? false);
      const isSuspicious = visionAnalysis.riskScore > 0.5 || (textAnalysis?.isSuspicious ?? false);
      const hasInappropriateContent = visionAnalysis.hasAdultContent || 
                                     visionAnalysis.hasViolentContent || 
                                     visionAnalysis.hasRacyContent;
      
      return {
        isSpam,
        isHate,
        isSuspicious,
        hasInappropriateContent,
        hasAdultContent: visionAnalysis.hasAdultContent,
        hasViolentContent: visionAnalysis.hasViolentContent,
        hasWeaponsContent: visionAnalysis.hasWeaponsContent,
        confidence: visionAnalysis.confidence,
        riskFactors,
        visionAnalysis
      };
    } catch (error) {
      console.error('Image analysis failed:', error);
      return {
        isSpam: false,
        isHate: false,
        isSuspicious: true, // Mark as suspicious if analysis fails
        hasInappropriateContent: false,
        confidence: 0,
        riskFactors: ['image_analysis_failed']
      };
    }
  }

  private async simulateImageAnalysis(imageBase64: string): Promise<any> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock analysis results (in production, replace with actual API calls)
    const random = Math.random();
    return {
      isSpam: random < 0.1,
      isHate: random < 0.05,
      isSuspicious: random < 0.15,
      hasAdultContent: random < 0.08,
      hasViolentContent: random < 0.03,
      confidence: 0.85 + (random * 0.15),
      riskFactors: random < 0.2 ? ['suspicious_content'] : []
    };
  }

  async updateUserRiskScore(userId: string, analysisResult: ContentAnalysisResult): Promise<void> {
    const currentRisk = this.riskScores.get(userId) || {
      userId,
      score: 0,
      factors: [],
      lastUpdated: new Date(),
      category: 'low' as const
    };

    const newFactors: RiskFactor[] = [];
    let scoreIncrease = 0;

    if (analysisResult.isSpam) {
      newFactors.push({
        type: 'spam',
        weight: 15,
        description: 'Spam content detected',
        timestamp: new Date()
      });
      scoreIncrease += 15;
    }

    if (analysisResult.isHate) {
      newFactors.push({
        type: 'hate',
        weight: 25,
        description: 'Hate speech detected',
        timestamp: new Date()
      });
      scoreIncrease += 25;
    }

    if (analysisResult.isSuspicious) {
      newFactors.push({
        type: 'suspicious_behavior',
        weight: 10,
        description: 'Suspicious content patterns',
        timestamp: new Date()
      });
      scoreIncrease += 10;
    }

    if (analysisResult.hasInappropriateContent) {
      newFactors.push({
        type: 'content_violation',
        weight: 20,
        description: 'Inappropriate content detected',
        timestamp: new Date()
      });
      scoreIncrease += 20;
    }

    if (analysisResult.hasAdultContent) {
      newFactors.push({
        type: 'adult_content',
        weight: 30,
        description: 'Adult content detected in image',
        timestamp: new Date()
      });
      scoreIncrease += 30;
    }

    if (analysisResult.hasViolentContent) {
      newFactors.push({
        type: 'violent_content',
        weight: 35,
        description: 'Violent content detected in image',
        timestamp: new Date()
      });
      scoreIncrease += 35;
    }

    if (analysisResult.hasWeaponsContent) {
      newFactors.push({
        type: 'weapons_detected',
        weight: 40,
        description: 'Weapons detected in image',
        timestamp: new Date()
      });
      scoreIncrease += 40;
    }

    const updatedScore = Math.min(currentRisk.score + scoreIncrease, 100);
    const category = this.calculateRiskCategory(updatedScore);

    const updatedRisk: RiskScore = {
      ...currentRisk,
      score: updatedScore,
      factors: [...currentRisk.factors, ...newFactors].slice(-10), // Keep last 10 factors
      lastUpdated: new Date(),
      category
    };

    this.riskScores.set(userId, updatedRisk);
    await this.saveData();
  }

  private calculateRiskCategory(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  async analyzeBehaviorPattern(userId: string, action: string, metadata: any = {}): Promise<void> {
    const pattern = this.behaviorPatterns.get(userId) || {
      userId,
      messageFrequency: 0,
      linkSharingFrequency: 0,
      suspiciousPatterns: [],
      timeBasedPatterns: [],
      interactionPatterns: []
    };

    // Update patterns based on action
    switch (action) {
      case 'message_sent':
        pattern.messageFrequency++;
        this.updateTimeBasedPattern(pattern, new Date().getHours());
        break;
      case 'link_shared':
        pattern.linkSharingFrequency++;
        if (pattern.linkSharingFrequency > 10) {
          pattern.suspiciousPatterns.push('excessive_link_sharing');
        }
        break;
      case 'interaction':
        this.updateInteractionPattern(pattern, metadata.recipientId);
        break;
    }

    this.behaviorPatterns.set(userId, pattern);
    await this.saveData();

    // Check for suspicious behavior
    await this.checkSuspiciousBehavior(userId, pattern);
  }

  private updateTimeBasedPattern(pattern: BehaviorPattern, hour: number): void {
    const existing = pattern.timeBasedPatterns.find(p => p.hour === hour);
    if (existing) {
      existing.activity++;
    } else {
      pattern.timeBasedPatterns.push({ hour, activity: 1 });
    }
  }

  private updateInteractionPattern(pattern: BehaviorPattern, recipientId: string): void {
    const existing = pattern.interactionPatterns.find(p => p.recipientId === recipientId);
    if (existing) {
      existing.frequency++;
    } else {
      pattern.interactionPatterns.push({ recipientId, frequency: 1 });
    }
  }

  private async checkSuspiciousBehavior(userId: string, pattern: BehaviorPattern): Promise<void> {
    const suspiciousFactors: string[] = [];

    // Check for bot-like behavior
    if (pattern.messageFrequency > 100) {
      suspiciousFactors.push('high_message_frequency');
    }

    // Check for spam-like link sharing
    if (pattern.linkSharingFrequency > 20) {
      suspiciousFactors.push('excessive_link_sharing');
    }

    // Check for unusual time patterns (e.g., 24/7 activity)
    const activeHours = pattern.timeBasedPatterns.filter(p => p.activity > 0).length;
    if (activeHours > 20) {
      suspiciousFactors.push('unusual_activity_pattern');
    }

    if (suspiciousFactors.length > 0) {
      await this.updateUserRiskScore(userId, {
        isSpam: false,
        isHate: false,
        isSuspicious: true,
        hasInappropriateContent: false,
        confidence: 0.7,
        riskFactors: suspiciousFactors
      });
    }
  }

  getUserRiskScore(userId: string): RiskScore | null {
    return this.riskScores.get(userId) || null;
  }

  getAllRiskScores(): RiskScore[] {
    return Array.from(this.riskScores.values());
  }

  async trainSpamDetectionModel(trainingData: { text: string; isSpam: boolean }[]): Promise<void> {
    // In production, implement actual ML training
    // For now, we'll update our keyword lists based on training data
    
    const spamTexts = trainingData.filter(d => d.isSpam).map(d => d.text);
    const newSpamKeywords = this.extractKeywords(spamTexts);
    
    // Add new keywords to our detection list
    newSpamKeywords.forEach(keyword => {
      if (!this.spamKeywords.includes(keyword)) {
        this.spamKeywords.push(keyword);
      }
    });

    await this.saveData();
  }

  private extractKeywords(texts: string[]): string[] {
    const wordFreq: { [key: string]: number } = {};
    
    texts.forEach(text => {
      const words = text.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });
    });

    // Return words that appear frequently
    return Object.entries(wordFreq)
      .filter(([_, freq]) => freq >= 3)
      .map(([word, _]) => word)
      .slice(0, 20); // Limit to top 20
  }

  private startBehaviorAnalysis(): void {
    // Start periodic analysis of user behaviors
    if (Platform.OS !== 'web') {
      setInterval(() => {
        this.performPeriodicAnalysis();
      }, 300000); // Every 5 minutes
    }
  }

  private async performPeriodicAnalysis(): Promise<void> {
    try {
      // Analyze patterns and update risk scores
      for (const [userId, pattern] of this.behaviorPatterns) {
        await this.checkSuspiciousBehavior(userId, pattern);
      }

      // Decay risk scores over time
      for (const [userId, riskScore] of this.riskScores) {
        const daysSinceUpdate = (Date.now() - riskScore.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 7) {
          // Reduce risk score by 10% per week
          const newScore = Math.max(0, riskScore.score * 0.9);
          this.riskScores.set(userId, {
            ...riskScore,
            score: newScore,
            category: this.calculateRiskCategory(newScore),
            lastUpdated: new Date()
          });
        }
      }

      await this.saveData();
    } catch (error) {
      console.error('Periodic analysis failed:', error);
    }
  }

  async generateSecurityReport(): Promise<{
    totalUsers: number;
    highRiskUsers: number;
    recentThreats: number;
    topRiskFactors: { factor: string; count: number }[];
  }> {
    const allRiskScores = this.getAllRiskScores();
    const highRiskUsers = allRiskScores.filter(r => r.category === 'high' || r.category === 'critical').length;
    
    const recentThreats = allRiskScores.filter(r => {
      const daysSince = (Date.now() - r.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7 && r.score > 30;
    }).length;

    const riskFactorCounts: { [key: string]: number } = {};
    allRiskScores.forEach(r => {
      r.factors.forEach(f => {
        riskFactorCounts[f.type] = (riskFactorCounts[f.type] || 0) + 1;
      });
    });

    const topRiskFactors = Object.entries(riskFactorCounts)
      .map(([factor, count]) => ({ factor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalUsers: allRiskScores.length,
      highRiskUsers,
      recentThreats,
      topRiskFactors
    };
  }
}

export default SecurityAIService;