import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface ContentAnalysisResult {
  isViolation: boolean;
  violationType: 'violence' | 'fraud' | 'harassment' | 'spam' | 'hate_speech' | 'adult_content' | 'none';
  confidence: number;
  detectedPatterns: string[];
  suggestedAction: 'block' | 'warn' | 'flag' | 'allow';
  explanation: string;
}

export interface MessageContext {
  senderId: string;
  recipientId: string;
  timestamp: number;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file';
  conversationHistory?: string[];
  senderReputation?: number;
}

class ContentModerationService {
  private violentPatterns = [
    // Arabic violent patterns
    /(?:قتل|اقتل|موت|اموت|دم|دماء|سلاح|قنبلة|انفجار|تفجير|ارهاب|عنف)/gi,
    /(?:اضرب|اكسر|احرق|دمر|اهدم|اقطع|اطعن|اذبح)/gi,
    // English violent patterns
    /(?:kill|murder|death|blood|weapon|bomb|explosion|terror|violence)/gi,
    /(?:hit|break|burn|destroy|cut|stab|shoot)/gi
  ];

  private fraudPatterns = [
    // Arabic fraud patterns
    /(?:احتيال|نصب|خداع|كذب|مال|فلوس|ربح|مجاني|هدية|جائزة)/gi,
    /(?:بنك|حساب|رقم سري|كلمة مرور|بطاقة|فيزا|ماستر)/gi,
    /(?:استثمار|تداول|عملة|بيتكوين|ذهب|فوركس)/gi,
    // English fraud patterns
    /(?:scam|fraud|fake|money|free|gift|prize|winner)/gi,
    /(?:bank|account|password|credit|card|visa|master)/gi,
    /(?:investment|trading|bitcoin|forex|crypto)/gi
  ];

  private harassmentPatterns = [
    // Arabic harassment patterns
    /(?:غبي|احمق|حقير|وسخ|قذر|عاهر|شرموط)/gi,
    /(?:اسكت|اخرس|امشي|اختفي|لا احبك|اكرهك)/gi,
    // English harassment patterns
    /(?:stupid|idiot|ugly|dirty|shut up|go away|hate you)/gi
  ];

  private spamPatterns = [
    /(?:اشترك|لايك|شير|تابع|انشر|ادخل|زور|اضغط)/gi,
    /(?:subscribe|like|share|follow|click|visit|join)/gi,
    /(?:www\.|http|https|bit\.ly|tinyurl)/gi
  ];

  private hateSpeechPatterns = [
    // Religious/ethnic hate speech patterns (Arabic)
    /(?:كافر|ملحد|يهودي|نصراني|شيعي|سني)(?:\s+(?:قذر|وسخ|حقير))/gi,
    // Gender-based hate speech
    /(?:نساء|بنات|رجال)(?:\s+(?:غبية|احمق|عديمة))/gi
  ];

  private adultContentPatterns = [
    /(?:جنس|سكس|عاري|عارية|صدر|مؤخرة)/gi,
    /(?:sex|nude|naked|porn|adult)/gi
  ];

  private suspiciousUrls = [
    /(?:bit\.ly|tinyurl|t\.co|short\.link)/gi,
    /(?:free-money|win-prize|click-here)/gi
  ];

  async analyzeContent(content: string, context: MessageContext): Promise<ContentAnalysisResult> {
    try {
      const analysisResults = await Promise.all([
        this.checkViolence(content),
        this.checkFraud(content, context),
        this.checkHarassment(content, context),
        this.checkSpam(content),
        this.checkHateSpeech(content),
        this.checkAdultContent(content)
      ]);

      const violations = analysisResults.filter(result => result.isViolation);
      
      if (violations.length === 0) {
        return {
          isViolation: false,
          violationType: 'none',
          confidence: 0,
          detectedPatterns: [],
          suggestedAction: 'allow',
          explanation: 'المحتوى آمن ولا يحتوي على انتهاكات'
        };
      }

      // Get the most severe violation
      const mostSevere = violations.reduce((prev, current) => 
        current.confidence > prev.confidence ? current : prev
      );

      // Log violation for forensics
      await this.logViolation(content, context, mostSevere);

      return mostSevere;
    } catch (error) {
      console.error('Content analysis error:', error);
      return {
        isViolation: false,
        violationType: 'none',
        confidence: 0,
        detectedPatterns: [],
        suggestedAction: 'allow',
        explanation: 'خطأ في تحليل المحتوى'
      };
    }
  }

  private async checkViolence(content: string): Promise<ContentAnalysisResult> {
    const detectedPatterns: string[] = [];
    let confidence = 0;

    for (const pattern of this.violentPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        detectedPatterns.push(...matches);
        confidence += matches.length * 0.3;
      }
    }

    // Advanced NLP checks
    const threatWords = ['سأقتلك', 'سأؤذيك', 'ستموت', 'I will kill', 'I will hurt'];
    const hasThreat = threatWords.some(word => content.toLowerCase().includes(word.toLowerCase()));
    if (hasThreat) {
      confidence += 0.8;
      detectedPatterns.push('direct_threat');
    }

    const isViolation = confidence > 0.5;
    
    return {
      isViolation,
      violationType: 'violence',
      confidence: Math.min(confidence, 1),
      detectedPatterns,
      suggestedAction: confidence > 0.8 ? 'block' : confidence > 0.5 ? 'warn' : 'allow',
      explanation: isViolation ? 'تم اكتشاف محتوى عنيف أو تهديدي' : ''
    };
  }

  private async checkFraud(content: string, context: MessageContext): Promise<ContentAnalysisResult> {
    const detectedPatterns: string[] = [];
    let confidence = 0;

    // Check fraud patterns
    for (const pattern of this.fraudPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        detectedPatterns.push(...matches);
        confidence += matches.length * 0.2;
      }
    }

    // Check for suspicious URLs
    const urlMatches = content.match(this.suspiciousUrls);
    if (urlMatches) {
      confidence += 0.4;
      detectedPatterns.push('suspicious_url');
    }

    // Check for money requests from unknown senders
    const moneyKeywords = ['فلوس', 'مال', 'دولار', 'money', 'cash', 'payment'];
    const hasMoneyRequest = moneyKeywords.some(word => content.toLowerCase().includes(word));
    if (hasMoneyRequest && (!context.senderReputation || context.senderReputation < 0.3)) {
      confidence += 0.3;
      detectedPatterns.push('money_request_unknown');
    }

    // Check for urgency tactics
    const urgencyWords = ['عاجل', 'سريع', 'فوري', 'urgent', 'quick', 'now', 'immediately'];
    const hasUrgency = urgencyWords.some(word => content.toLowerCase().includes(word));
    if (hasUrgency && hasMoneyRequest) {
      confidence += 0.2;
      detectedPatterns.push('urgency_tactic');
    }

    const isViolation = confidence > 0.4;
    
    return {
      isViolation,
      violationType: 'fraud',
      confidence: Math.min(confidence, 1),
      detectedPatterns,
      suggestedAction: confidence > 0.7 ? 'block' : confidence > 0.4 ? 'warn' : 'allow',
      explanation: isViolation ? 'تم اكتشاف محتوى احتيالي محتمل' : ''
    };
  }

  private async checkHarassment(content: string, context: MessageContext): Promise<ContentAnalysisResult> {
    const detectedPatterns: string[] = [];
    let confidence = 0;

    // Check harassment patterns
    for (const pattern of this.harassmentPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        detectedPatterns.push(...matches);
        confidence += matches.length * 0.25;
      }
    }

    // Check for repeated messages (spam harassment)
    if (context.conversationHistory) {
      const recentMessages = context.conversationHistory.slice(-5);
      const similarMessages = recentMessages.filter(msg => 
        this.calculateSimilarity(msg, content) > 0.8
      ).length;
      
      if (similarMessages > 2) {
        confidence += 0.3;
        detectedPatterns.push('repeated_harassment');
      }
    }

    // Check for personal attacks
    const personalAttacks = ['أنت غبي', 'أنت احمق', 'you are stupid', 'you are idiot'];
    const hasPersonalAttack = personalAttacks.some(attack => 
      content.toLowerCase().includes(attack.toLowerCase())
    );
    if (hasPersonalAttack) {
      confidence += 0.4;
      detectedPatterns.push('personal_attack');
    }

    const isViolation = confidence > 0.3;
    
    return {
      isViolation,
      violationType: 'harassment',
      confidence: Math.min(confidence, 1),
      detectedPatterns,
      suggestedAction: confidence > 0.6 ? 'block' : confidence > 0.3 ? 'warn' : 'allow',
      explanation: isViolation ? 'تم اكتشاف محتوى تحرش أو إساءة' : ''
    };
  }

  private async checkSpam(content: string): Promise<ContentAnalysisResult> {
    const detectedPatterns: string[] = [];
    let confidence = 0;

    // Check spam patterns
    for (const pattern of this.spamPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        detectedPatterns.push(...matches);
        confidence += matches.length * 0.2;
      }
    }

    // Check for excessive emojis
    const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
    if (emojiCount > content.length * 0.3) {
      confidence += 0.2;
      detectedPatterns.push('excessive_emojis');
    }

    // Check for excessive capitalization
    const capsCount = (content.match(/[A-Z]/g) || []).length;
    if (capsCount > content.length * 0.5 && content.length > 10) {
      confidence += 0.15;
      detectedPatterns.push('excessive_caps');
    }

    const isViolation = confidence > 0.4;
    
    return {
      isViolation,
      violationType: 'spam',
      confidence: Math.min(confidence, 1),
      detectedPatterns,
      suggestedAction: confidence > 0.6 ? 'flag' : confidence > 0.4 ? 'warn' : 'allow',
      explanation: isViolation ? 'تم اكتشاف محتوى مشبوه بالسبام' : ''
    };
  }

  private async checkHateSpeech(content: string): Promise<ContentAnalysisResult> {
    const detectedPatterns: string[] = [];
    let confidence = 0;

    // Check hate speech patterns
    for (const pattern of this.hateSpeechPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        detectedPatterns.push(...matches);
        confidence += matches.length * 0.4;
      }
    }

    // Check for discriminatory language
    const discriminatoryTerms = [
      'بسبب دينك', 'بسبب لونك', 'بسبب جنسك',
      'because of your religion', 'because of your race', 'because of your gender'
    ];
    
    const hasDiscrimination = discriminatoryTerms.some(term => 
      content.toLowerCase().includes(term.toLowerCase())
    );
    if (hasDiscrimination) {
      confidence += 0.5;
      detectedPatterns.push('discriminatory_language');
    }

    const isViolation = confidence > 0.3;
    
    return {
      isViolation,
      violationType: 'hate_speech',
      confidence: Math.min(confidence, 1),
      detectedPatterns,
      suggestedAction: confidence > 0.7 ? 'block' : confidence > 0.3 ? 'warn' : 'allow',
      explanation: isViolation ? 'تم اكتشاف خطاب كراهية' : ''
    };
  }

  private async checkAdultContent(content: string): Promise<ContentAnalysisResult> {
    const detectedPatterns: string[] = [];
    let confidence = 0;

    // Check adult content patterns
    for (const pattern of this.adultContentPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        detectedPatterns.push(...matches);
        confidence += matches.length * 0.3;
      }
    }

    const isViolation = confidence > 0.2;
    
    return {
      isViolation,
      violationType: 'adult_content',
      confidence: Math.min(confidence, 1),
      detectedPatterns,
      suggestedAction: confidence > 0.5 ? 'block' : confidence > 0.2 ? 'warn' : 'allow',
      explanation: isViolation ? 'تم اكتشاف محتوى للبالغين' : ''
    };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private async logViolation(
    content: string, 
    context: MessageContext, 
    result: ContentAnalysisResult
  ): Promise<void> {
    try {
      const violationLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        content: content.substring(0, 200), // Truncate for privacy
        senderId: context.senderId,
        recipientId: context.recipientId,
        violationType: result.violationType,
        confidence: result.confidence,
        detectedPatterns: result.detectedPatterns,
        suggestedAction: result.suggestedAction,
        platform: Platform.OS
      };

      const existingLogs = await AsyncStorage.getItem('content_violations');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      logs.push(violationLog);
      
      // Keep only last 1000 logs
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }
      
      await AsyncStorage.setItem('content_violations', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to log violation:', error);
    }
  }

  async getViolationHistory(): Promise<any[]> {
    try {
      const logs = await AsyncStorage.getItem('content_violations');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Failed to get violation history:', error);
      return [];
    }
  }

  async getViolationStats(): Promise<{
    totalViolations: number;
    violationsByType: Record<string, number>;
    recentViolations: number;
  }> {
    try {
      const logs = await this.getViolationHistory();
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      const violationsByType: Record<string, number> = {};
      let recentViolations = 0;
      
      logs.forEach((log: any) => {
        violationsByType[log.violationType] = (violationsByType[log.violationType] || 0) + 1;
        
        if (new Date(log.timestamp).getTime() > oneDayAgo) {
          recentViolations++;
        }
      });
      
      return {
        totalViolations: logs.length,
        violationsByType,
        recentViolations
      };
    } catch (error) {
      console.error('Failed to get violation stats:', error);
      return {
        totalViolations: 0,
        violationsByType: {},
        recentViolations: 0
      };
    }
  }

  async clearViolationHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem('content_violations');
    } catch (error) {
      console.error('Failed to clear violation history:', error);
    }
  }
}

export default new ContentModerationService();