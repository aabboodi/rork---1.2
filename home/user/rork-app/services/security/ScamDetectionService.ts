import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import CryptoService from './CryptoService';

export interface ScamPattern {
  id: string;
  type: 'phishing' | 'social_engineering' | 'financial_fraud' | 'malware' | 'fake_profile' | 'suspicious_link';
  pattern: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  lastUpdated: number;
  source: 'ai_detection' | 'user_report' | 'threat_intelligence' | 'manual';
}

export interface ScamDetectionResult {
  isScam: boolean;
  confidence: number;
  detectedPatterns: ScamPattern[];
  riskScore: number;
  recommendations: string[];
  metadata: {
    analysisTime: number;
    contentType: 'text' | 'image' | 'url' | 'profile' | 'message';
    aiAnalysisUsed: boolean;
    visionAnalysisUsed: boolean;
  };
}

export interface ScamReport {
  id: string;
  reportedBy: string;
  contentType: 'text' | 'image' | 'url' | 'profile' | 'message';
  content: string;
  detectionResult: ScamDetectionResult;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'false_positive' | 'resolved';
  reviewedBy?: string;
  reviewNotes?: string;
}

class ScamDetectionService {
  private static instance: ScamDetectionService;
  private cryptoService: CryptoService;
  private scamPatterns: Map<string, ScamPattern> = new Map();
  private scamReports: Map<string, ScamReport> = new Map();
  private isInitialized = false;

  // CRITICAL: AI-powered scam detection patterns
  private readonly SCAM_PATTERNS: ScamPattern[] = [
    {
      id: 'phishing_urgent',
      type: 'phishing',
      pattern: '(urgent|immediate|act now|limited time|expires|verify account|suspended|click here)',
      description: 'Urgent action phishing attempts',
      severity: 'high',
      confidence: 0.85,
      lastUpdated: Date.now(),
      source: 'ai_detection'
    },
    {
      id: 'financial_fraud',
      type: 'financial_fraud',
      pattern: '(free money|guaranteed profit|investment opportunity|double your money|lottery winner|inheritance)',
      description: 'Financial fraud and get-rich-quick schemes',
      severity: 'critical',
      confidence: 0.9,
      lastUpdated: Date.now(),
      source: 'ai_detection'
    },
    {
      id: 'social_engineering',
      type: 'social_engineering',
      pattern: '(help me|emergency|family member|accident|hospital|need money|wire transfer)',
      description: 'Social engineering and emergency scams',
      severity: 'high',
      confidence: 0.8,
      lastUpdated: Date.now(),
      source: 'ai_detection'
    },
    {
      id: 'suspicious_links',
      type: 'suspicious_link',
      pattern: '(bit\\.ly|tinyurl|t\\.co|goo\\.gl|[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+)',
      description: 'Suspicious shortened URLs and IP addresses',
      severity: 'medium',
      confidence: 0.7,
      lastUpdated: Date.now(),
      source: 'ai_detection'
    },
    {
      id: 'fake_profile_indicators',
      type: 'fake_profile',
      pattern: '(model|influencer|single|lonely|looking for love|investment advisor|crypto expert)',
      description: 'Fake profile indicators for romance and investment scams',
      severity: 'medium',
      confidence: 0.75,
      lastUpdated: Date.now(),
      source: 'ai_detection'
    },
    {
      id: 'malware_indicators',
      type: 'malware',
      pattern: '(download now|install app|update required|security alert|virus detected|scan computer)',
      description: 'Malware distribution attempts',
      severity: 'critical',
      confidence: 0.88,
      lastUpdated: Date.now(),
      source: 'ai_detection'
    }
  ];

  private constructor() {
    this.cryptoService = CryptoService.getInstance();
  }

  static getInstance(): ScamDetectionService {
    if (!ScamDetectionService.instance) {
      ScamDetectionService.instance = new ScamDetectionService();
    }
    return ScamDetectionService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load scam patterns and reports
      await this.loadScamPatterns();
      await this.loadScamReports();
      
      // Initialize with default patterns if none exist
      if (this.scamPatterns.size === 0) {
        await this.initializeDefaultPatterns();
      }
      
      this.isInitialized = true;
      console.log('🛡️ Scam Detection Service initialized with AI-powered patterns');
    } catch (error) {
      console.error('❌ Failed to initialize Scam Detection Service:', error);
      throw error;
    }
  }

  // CRITICAL: AI-powered text analysis for scam detection
  async analyzeText(
    text: string,
    context?: {
      sender?: string;
      messageType?: 'chat' | 'post' | 'comment' | 'profile';
      metadata?: any;
    }
  ): Promise<ScamDetectionResult> {
    try {
      const startTime = Date.now();
      const detectedPatterns: ScamPattern[] = [];
      let totalConfidence = 0;
      let riskScore = 0;

      // Pattern-based detection
      for (const pattern of this.scamPatterns.values()) {
        const regex = new RegExp(pattern.pattern, 'gi');
        if (regex.test(text)) {
          detectedPatterns.push(pattern);
          totalConfidence += pattern.confidence;
          
          // Calculate risk score based on severity
          switch (pattern.severity) {
            case 'critical':
              riskScore += 40;
              break;
            case 'high':
              riskScore += 25;
              break;
            case 'medium':
              riskScore += 15;
              break;
            case 'low':
              riskScore += 5;
              break;
          }
        }
      }

      // AI-powered analysis using external API
      let aiAnalysisUsed = false;
      try {
        const aiResult = await this.performAIAnalysis(text, context);
        if (aiResult.isScam) {
          riskScore += aiResult.riskScore;
          totalConfidence = Math.max(totalConfidence, aiResult.confidence);
          aiAnalysisUsed = true;
        }
      } catch (error) {
        console.warn('AI analysis failed, using pattern-based detection only:', error);
      }

      // Normalize confidence and risk score
      const finalConfidence = Math.min(totalConfidence / detectedPatterns.length || 0, 1);
      const finalRiskScore = Math.min(riskScore, 100);
      const isScam = finalRiskScore >= 30 || detectedPatterns.length >= 2;

      const recommendations = this.generateRecommendations(detectedPatterns, finalRiskScore);

      const result: ScamDetectionResult = {
        isScam,
        confidence: finalConfidence,
        detectedPatterns,
        riskScore: finalRiskScore,
        recommendations,
        metadata: {
          analysisTime: Date.now() - startTime,
          contentType: 'text',
          aiAnalysisUsed,
          visionAnalysisUsed: false
        }
      };

      // Log detection event
      if (isScam) {
        console.warn('🚨 Scam detected in text analysis:', {
          riskScore: finalRiskScore,
          confidence: finalConfidence,
          patterns: detectedPatterns.length
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Text scam analysis failed:', error);
      return {
        isScam: false,
        confidence: 0,
        detectedPatterns: [],
        riskScore: 0,
        recommendations: ['Analysis failed - manual review recommended'],
        metadata: {
          analysisTime: 0,
          contentType: 'text',
          aiAnalysisUsed: false,
          visionAnalysisUsed: false
        }
      };
    }
  }

  // CRITICAL: AI Vision analysis for image-based scam detection
  async analyzeImage(
    imageUri: string,
    context?: {
      sender?: string;
      messageType?: 'chat' | 'post' | 'profile_picture';
      metadata?: any;
    }
  ): Promise<ScamDetectionResult> {
    try {
      const startTime = Date.now();
      let riskScore = 0;
      let confidence = 0;
      const detectedPatterns: ScamPattern[] = [];

      // AI Vision analysis using external API
      let visionAnalysisUsed = false;
      try {
        const visionResult = await this.performAIVisionAnalysis(imageUri, context);
        riskScore = visionResult.riskScore;
        confidence = visionResult.confidence;
        visionAnalysisUsed = true;

        // Add detected patterns from vision analysis
        if (visionResult.detectedPatterns) {
          detectedPatterns.push(...visionResult.detectedPatterns);
        }
      } catch (error) {
        console.warn('AI Vision analysis failed:', error);
        // Fallback to basic image analysis
        const basicResult = await this.performBasicImageAnalysis(imageUri);
        riskScore = basicResult.riskScore;
        confidence = basicResult.confidence;
      }

      const isScam = riskScore >= 40 || confidence >= 0.8;
      const recommendations = this.generateImageRecommendations(riskScore, detectedPatterns);

      const result: ScamDetectionResult = {
        isScam,
        confidence,
        detectedPatterns,
        riskScore,
        recommendations,
        metadata: {
          analysisTime: Date.now() - startTime,
          contentType: 'image',
          aiAnalysisUsed: false,
          visionAnalysisUsed
        }
      };

      if (isScam) {
        console.warn('🚨 Scam detected in image analysis:', {
          riskScore,
          confidence,
          visionAnalysisUsed
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Image scam analysis failed:', error);
      return {
        isScam: false,
        confidence: 0,
        detectedPatterns: [],
        riskScore: 0,
        recommendations: ['Image analysis failed - manual review recommended'],
        metadata: {
          analysisTime: 0,
          contentType: 'image',
          aiAnalysisUsed: false,
          visionAnalysisUsed: false
        }
      };
    }
  }

  // CRITICAL: URL analysis for malicious links
  async analyzeURL(
    url: string,
    context?: {
      sender?: string;
      messageType?: 'chat' | 'post' | 'comment';
      metadata?: any;
    }
  ): Promise<ScamDetectionResult> {
    try {
      const startTime = Date.now();
      const detectedPatterns: ScamPattern[] = [];
      let riskScore = 0;
      let confidence = 0;

      // Check against known suspicious URL patterns
      for (const pattern of this.scamPatterns.values()) {
        if (pattern.type === 'suspicious_link') {
          const regex = new RegExp(pattern.pattern, 'gi');
          if (regex.test(url)) {
            detectedPatterns.push(pattern);
            riskScore += 20;
            confidence = Math.max(confidence, pattern.confidence);
          }
        }
      }

      // Check for suspicious URL characteristics
      const urlAnalysis = this.analyzeURLCharacteristics(url);
      riskScore += urlAnalysis.riskScore;
      confidence = Math.max(confidence, urlAnalysis.confidence);

      // AI-powered URL reputation check
      try {
        const reputationResult = await this.checkURLReputation(url);
        riskScore += reputationResult.riskScore;
        confidence = Math.max(confidence, reputationResult.confidence);
      } catch (error) {
        console.warn('URL reputation check failed:', error);
      }

      const isScam = riskScore >= 35 || confidence >= 0.75;
      const recommendations = this.generateURLRecommendations(url, riskScore, detectedPatterns);

      const result: ScamDetectionResult = {
        isScam,
        confidence,
        detectedPatterns,
        riskScore: Math.min(riskScore, 100),
        recommendations,
        metadata: {
          analysisTime: Date.now() - startTime,
          contentType: 'url',
          aiAnalysisUsed: true,
          visionAnalysisUsed: false
        }
      };

      if (isScam) {
        console.warn('🚨 Malicious URL detected:', {
          url: url.substring(0, 50) + '...',
          riskScore: result.riskScore,
          confidence
        });
      }

      return result;
    } catch (error) {
      console.error('❌ URL scam analysis failed:', error);
      return {
        isScam: false,
        confidence: 0,
        detectedPatterns: [],
        riskScore: 0,
        recommendations: ['URL analysis failed - avoid clicking unknown links'],
        metadata: {
          analysisTime: 0,
          contentType: 'url',
          aiAnalysisUsed: false,
          visionAnalysisUsed: false
        }
      };
    }
  }

  // CRITICAL: AI-powered analysis using external API
  private async performAIAnalysis(
    text: string,
    context?: any
  ): Promise<{ isScam: boolean; confidence: number; riskScore: number }> {
    try {
      // Use the AI API for advanced scam detection
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an expert scam detection AI. Analyze the following text for potential scams, phishing, fraud, or malicious content. 
              
              Consider these scam types:
              - Phishing attempts
              - Financial fraud
              - Social engineering
              - Romance scams
              - Investment scams
              - Fake emergencies
              - Malware distribution
              
              Respond with a JSON object containing:
              {
                "isScam": boolean,
                "confidence": number (0-1),
                "riskScore": number (0-100),
                "scamType": string,
                "reasoning": string
              }`
            },
            {
              role: 'user',
              content: `Analyze this text for scams: "${text}"`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.completion;

      // Parse AI response
      try {
        const result = JSON.parse(aiResponse);
        return {
          isScam: result.isScam || false,
          confidence: result.confidence || 0,
          riskScore: result.riskScore || 0
        };
      } catch (parseError) {
        // Fallback parsing if JSON is malformed
        const isScam = aiResponse.toLowerCase().includes('scam') || 
                      aiResponse.toLowerCase().includes('fraud') ||
                      aiResponse.toLowerCase().includes('phishing');
        return {
          isScam,
          confidence: isScam ? 0.7 : 0.3,
          riskScore: isScam ? 60 : 20
        };
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      throw error;
    }
  }

  // CRITICAL: AI Vision analysis for images
  private async performAIVisionAnalysis(
    imageUri: string,
    context?: any
  ): Promise<{ riskScore: number; confidence: number; detectedPatterns?: ScamPattern[] }> {
    try {
      // Convert image to base64 for AI analysis
      let base64Image: string;
      
      if (Platform.OS === 'web') {
        // Web implementation
        const response = await fetch(imageUri);
        const blob = await response.blob();
        base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:image/... prefix
          };
          reader.readAsDataURL(blob);
        });
      } else {
        // Mobile implementation would use expo-file-system
        base64Image = imageUri; // Simplified for demo
      }

      // Use AI Vision API for scam detection in images
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an expert AI vision system for detecting scams and fraudulent content in images. 
              
              Analyze images for:
              - Fake documents or IDs
              - Phishing website screenshots
              - Fake social media profiles
              - Fraudulent financial documents
              - Fake product images
              - Suspicious QR codes
              - Fake certificates or awards
              
              Respond with JSON:
              {
                "isScam": boolean,
                "confidence": number (0-1),
                "riskScore": number (0-100),
                "detectedElements": string[],
                "reasoning": string
              }`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this image for potential scams or fraudulent content:'
                },
                {
                  type: 'image',
                  image: base64Image
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`AI Vision API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.completion;

      try {
        const result = JSON.parse(aiResponse);
        return {
          riskScore: result.riskScore || 0,
          confidence: result.confidence || 0,
          detectedPatterns: result.detectedElements ? [{
            id: 'ai_vision_detection',
            type: 'malware' as const,
            pattern: result.detectedElements.join(', '),
            description: result.reasoning || 'AI Vision detected suspicious content',
            severity: result.riskScore > 70 ? 'critical' as const : 'high' as const,
            confidence: result.confidence,
            lastUpdated: Date.now(),
            source: 'ai_detection' as const
          }] : undefined
        };
      } catch (parseError) {
        // Fallback analysis
        const isScam = aiResponse.toLowerCase().includes('scam') || 
                      aiResponse.toLowerCase().includes('fraud') ||
                      aiResponse.toLowerCase().includes('fake');
        return {
          riskScore: isScam ? 70 : 20,
          confidence: isScam ? 0.8 : 0.3
        };
      }
    } catch (error) {
      console.error('AI Vision analysis failed:', error);
      throw error;
    }
  }

  // Basic image analysis fallback
  private async performBasicImageAnalysis(
    imageUri: string
  ): Promise<{ riskScore: number; confidence: number }> {
    // Basic heuristics for image analysis
    let riskScore = 0;
    let confidence = 0.3;

    // Check file extension and URL patterns
    if (imageUri.includes('suspicious') || imageUri.includes('temp') || imageUri.includes('random')) {
      riskScore += 20;
      confidence += 0.2;
    }

    // Check for common scam image indicators
    if (imageUri.includes('money') || imageUri.includes('prize') || imageUri.includes('winner')) {
      riskScore += 30;
      confidence += 0.3;
    }

    return { riskScore: Math.min(riskScore, 100), confidence: Math.min(confidence, 1) };
  }

  // URL characteristics analysis
  private analyzeURLCharacteristics(url: string): { riskScore: number; confidence: number } {
    let riskScore = 0;
    let confidence = 0.5;

    try {
      const urlObj = new URL(url);
      
      // Check for suspicious domain characteristics
      if (urlObj.hostname.includes('bit.ly') || urlObj.hostname.includes('tinyurl')) {
        riskScore += 25;
        confidence += 0.2;
      }

      // Check for IP addresses instead of domains
      if (/^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname)) {
        riskScore += 40;
        confidence += 0.3;
      }

      // Check for suspicious TLDs
      const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf'];
      if (suspiciousTLDs.some(tld => urlObj.hostname.endsWith(tld))) {
        riskScore += 30;
        confidence += 0.25;
      }

      // Check for excessive subdomains
      const subdomains = urlObj.hostname.split('.');
      if (subdomains.length > 4) {
        riskScore += 20;
        confidence += 0.15;
      }

      // Check for suspicious keywords in URL
      const suspiciousKeywords = ['secure', 'verify', 'update', 'login', 'account', 'suspended'];
      const urlString = url.toLowerCase();
      const matchedKeywords = suspiciousKeywords.filter(keyword => urlString.includes(keyword));
      if (matchedKeywords.length >= 2) {
        riskScore += 25;
        confidence += 0.2;
      }

    } catch (error) {
      // Invalid URL
      riskScore += 50;
      confidence += 0.4;
    }

    return { riskScore: Math.min(riskScore, 100), confidence: Math.min(confidence, 1) };
  }

  // URL reputation check
  private async checkURLReputation(url: string): Promise<{ riskScore: number; confidence: number }> {
    try {
      // In a real implementation, this would check against threat intelligence APIs
      // For now, we'll simulate the check
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Basic reputation check simulation
      const domain = new URL(url).hostname;
      const knownBadDomains = ['malicious.com', 'phishing.net', 'scam.org'];
      
      if (knownBadDomains.includes(domain)) {
        return { riskScore: 80, confidence: 0.9 };
      }
      
      // Check against common patterns
      if (domain.includes('secure') && domain.includes('bank')) {
        return { riskScore: 60, confidence: 0.7 };
      }
      
      return { riskScore: 10, confidence: 0.3 };
    } catch (error) {
      console.error('URL reputation check failed:', error);
      return { riskScore: 20, confidence: 0.4 };
    }
  }

  // Generate recommendations based on detected patterns
  private generateRecommendations(patterns: ScamPattern[], riskScore: number): string[] {
    const recommendations: string[] = [];

    if (riskScore >= 70) {
      recommendations.push('🚨 HIGH RISK: Do not interact with this content');
      recommendations.push('Block and report the sender immediately');
    } else if (riskScore >= 40) {
      recommendations.push('⚠️ MEDIUM RISK: Exercise extreme caution');
      recommendations.push('Verify sender identity through alternative means');
    } else if (riskScore >= 20) {
      recommendations.push('⚠️ LOW RISK: Be cautious and verify information');
    }

    // Pattern-specific recommendations
    const patternTypes = patterns.map(p => p.type);
    
    if (patternTypes.includes('phishing')) {
      recommendations.push('Never click suspicious links or provide personal information');
    }
    
    if (patternTypes.includes('financial_fraud')) {
      recommendations.push('Never send money or provide financial information to unknown parties');
    }
    
    if (patternTypes.includes('social_engineering')) {
      recommendations.push('Verify emergency claims through independent contact methods');
    }
    
    if (patternTypes.includes('malware')) {
      recommendations.push('Do not download or install anything from this source');
    }

    if (recommendations.length === 0) {
      recommendations.push('Content appears safe, but always remain vigilant');
    }

    return recommendations;
  }

  // Generate image-specific recommendations
  private generateImageRecommendations(riskScore: number, patterns: ScamPattern[]): string[] {
    const recommendations: string[] = [];

    if (riskScore >= 60) {
      recommendations.push('🚨 Suspicious image detected - do not trust this content');
      recommendations.push('This may be a fake document, profile, or fraudulent image');
    } else if (riskScore >= 30) {
      recommendations.push('⚠️ Image requires verification - be cautious');
      recommendations.push('Verify authenticity through independent sources');
    }

    recommendations.push('Never share personal information based on images alone');
    recommendations.push('Use reverse image search to check for duplicates');

    return recommendations;
  }

  // Generate URL-specific recommendations
  private generateURLRecommendations(url: string, riskScore: number, patterns: ScamPattern[]): string[] {
    const recommendations: string[] = [];

    if (riskScore >= 50) {
      recommendations.push('🚨 DANGEROUS LINK: Do not click this URL');
      recommendations.push('This link may lead to malware or phishing sites');
    } else if (riskScore >= 30) {
      recommendations.push('⚠️ SUSPICIOUS LINK: Exercise extreme caution');
      recommendations.push('Verify the destination before clicking');
    }

    recommendations.push('Always check URLs carefully before clicking');
    recommendations.push('Use URL scanners or preview services when in doubt');
    recommendations.push('Never enter personal information on suspicious sites');

    return recommendations;
  }

  // Report scam content
  async reportScam(
    content: string,
    contentType: 'text' | 'image' | 'url' | 'profile' | 'message',
    reportedBy: string,
    additionalInfo?: string
  ): Promise<string> {
    try {
      // Analyze the reported content
      let detectionResult: ScamDetectionResult;
      
      switch (contentType) {
        case 'text':
        case 'message':
          detectionResult = await this.analyzeText(content);
          break;
        case 'image':
          detectionResult = await this.analyzeImage(content);
          break;
        case 'url':
          detectionResult = await this.analyzeURL(content);
          break;
        default:
          detectionResult = await this.analyzeText(content);
      }

      const reportId = await this.generateReportId();
      const report: ScamReport = {
        id: reportId,
        reportedBy,
        contentType,
        content,
        detectionResult,
        timestamp: Date.now(),
        status: 'pending'
      };

      this.scamReports.set(reportId, report);
      await this.saveScamReports();

      console.log(`📝 Scam report created: ${reportId}`);
      return reportId;
    } catch (error) {
      console.error('❌ Failed to create scam report:', error);
      throw error;
    }
  }

  // Get scam detection statistics
  async getScamDetectionStats(): Promise<{
    totalAnalyses: number;
    scamsDetected: number;
    falsePositives: number;
    averageRiskScore: number;
    patternEffectiveness: Record<string, number>;
    recentReports: number;
  }> {
    try {
      const reports = Array.from(this.scamReports.values());
      const recentReports = reports.filter(r => Date.now() - r.timestamp < 7 * 24 * 60 * 60 * 1000);
      
      const scamsDetected = reports.filter(r => r.detectionResult.isScam).length;
      const falsePositives = reports.filter(r => r.status === 'false_positive').length;
      
      const totalRiskScore = reports.reduce((sum, r) => sum + r.detectionResult.riskScore, 0);
      const averageRiskScore = reports.length > 0 ? totalRiskScore / reports.length : 0;

      // Calculate pattern effectiveness
      const patternEffectiveness: Record<string, number> = {};
      for (const pattern of this.scamPatterns.values()) {
        const patternReports = reports.filter(r => 
          r.detectionResult.detectedPatterns.some(p => p.id === pattern.id)
        );
        const confirmedScams = patternReports.filter(r => 
          r.status === 'confirmed' || r.detectionResult.isScam
        );
        patternEffectiveness[pattern.id] = patternReports.length > 0 ? 
          confirmedScams.length / patternReports.length : 0;
      }

      return {
        totalAnalyses: reports.length,
        scamsDetected,
        falsePositives,
        averageRiskScore,
        patternEffectiveness,
        recentReports: recentReports.length
      };
    } catch (error) {
      console.error('❌ Failed to get scam detection stats:', error);
      return {
        totalAnalyses: 0,
        scamsDetected: 0,
        falsePositives: 0,
        averageRiskScore: 0,
        patternEffectiveness: {},
        recentReports: 0
      };
    }
  }

  // Initialize default patterns
  private async initializeDefaultPatterns(): Promise<void> {
    for (const pattern of this.SCAM_PATTERNS) {
      this.scamPatterns.set(pattern.id, pattern);
    }
    await this.saveScamPatterns();
  }

  // Generate report ID
  private async generateReportId(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 9);
    return this.cryptoService.hash(`${timestamp}:${random}`);
  }

  // Storage methods
  private async loadScamPatterns(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('scam_patterns');
      if (stored) {
        const encryptedData = JSON.parse(stored);
        const decryptedData = this.cryptoService.decrypt(encryptedData);
        const data = JSON.parse(decryptedData);
        
        for (const [key, pattern] of Object.entries(data)) {
          this.scamPatterns.set(key, pattern as ScamPattern);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load scam patterns:', error);
    }
  }

  private async saveScamPatterns(): Promise<void> {
    try {
      const data = Object.fromEntries(this.scamPatterns);
      const encryptedData = this.cryptoService.encrypt(JSON.stringify(data));
      await AsyncStorage.setItem('scam_patterns', JSON.stringify(encryptedData));
    } catch (error) {
      console.error('❌ Failed to save scam patterns:', error);
    }
  }

  private async loadScamReports(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('scam_reports');
      if (stored) {
        const encryptedData = JSON.parse(stored);
        const decryptedData = this.cryptoService.decrypt(encryptedData);
        const data = JSON.parse(decryptedData);
        
        for (const [key, report] of Object.entries(data)) {
          this.scamReports.set(key, report as ScamReport);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load scam reports:', error);
    }
  }

  private async saveScamReports(): Promise<void> {
    try {
      const data = Object.fromEntries(this.scamReports);
      const encryptedData = this.cryptoService.encrypt(JSON.stringify(data));
      await AsyncStorage.setItem('scam_reports', JSON.stringify(encryptedData));
    } catch (error) {
      console.error('❌ Failed to save scam reports:', error);
    }
  }

  // Get all scam reports
  async getScamReports(limit?: number): Promise<ScamReport[]> {
    const reports = Array.from(this.scamReports.values())
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return limit ? reports.slice(0, limit) : reports;
  }

  // Update scam patterns from threat intelligence
  async updatePatternsFromThreatIntelligence(): Promise<void> {
    try {
      console.log('🔄 Updating scam patterns from threat intelligence...');
      
      // In a real implementation, this would fetch from threat intelligence APIs
      // For now, we'll simulate pattern updates
      
      const newPatterns: ScamPattern[] = [
        {
          id: 'crypto_scam_2024',
          type: 'financial_fraud',
          pattern: '(bitcoin|ethereum|crypto|nft|defi|yield farming|staking rewards)',
          description: 'Cryptocurrency and NFT scams',
          severity: 'high',
          confidence: 0.85,
          lastUpdated: Date.now(),
          source: 'threat_intelligence'
        },
        {
          id: 'ai_deepfake_2024',
          type: 'social_engineering',
          pattern: '(deepfake|ai generated|synthetic media|voice clone)',
          description: 'AI-generated deepfake content',
          severity: 'critical',
          confidence: 0.9,
          lastUpdated: Date.now(),
          source: 'threat_intelligence'
        }
      ];

      for (const pattern of newPatterns) {
        this.scamPatterns.set(pattern.id, pattern);
      }

      await this.saveScamPatterns();
      console.log(`✅ Updated ${newPatterns.length} scam patterns from threat intelligence`);
    } catch (error) {
      console.error('❌ Failed to update patterns from threat intelligence:', error);
    }
  }
}

export default ScamDetectionService;