import { Platform } from 'react-native';

export interface ImageModerationResult {
  isSafe: boolean;
  hasAdultContent: boolean;
  hasViolentContent: boolean;
  hasRacyContent: boolean;
  hasSpamContent: boolean;
  confidence: number;
  detectedObjects: string[];
  suggestedAction: 'allow' | 'flag' | 'block';
}

export interface TextModerationResult {
  isSafe: boolean;
  toxicityScore: number;
  categories: {
    spam: number;
    hate: number;
    harassment: number;
    selfHarm: number;
    sexual: number;
    violence: number;
  };
  suggestedAction: 'allow' | 'flag' | 'block';
  flaggedPhrases: string[];
}

class ContentModerationAIService {
  private static instance: ContentModerationAIService;
  private apiEndpoints = {
    googleVision: 'https://vision.googleapis.com/v1/images:annotate',
    awsRekognition: 'https://rekognition.amazonaws.com/',
    perspectiveAPI: 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze'
  };

  public static getInstance(): ContentModerationAIService {
    if (!ContentModerationAIService.instance) {
      ContentModerationAIService.instance = new ContentModerationAIService();
    }
    return ContentModerationAIService.instance;
  }

  async moderateImage(imageBase64: string, useGoogleVision: boolean = true): Promise<ImageModerationResult> {
    try {
      if (useGoogleVision) {
        return await this.moderateImageWithGoogleVision(imageBase64);
      } else {
        return await this.moderateImageWithAWSRekognition(imageBase64);
      }
    } catch (error) {
      console.error('Image moderation failed:', error);
      // Return safe result with low confidence on error
      return {
        isSafe: true,
        hasAdultContent: false,
        hasViolentContent: false,
        hasRacyContent: false,
        hasSpamContent: false,
        confidence: 0.1,
        detectedObjects: [],
        suggestedAction: 'flag' // Flag for manual review when AI fails
      };
    }
  }

  private async moderateImageWithGoogleVision(imageBase64: string): Promise<ImageModerationResult> {
    // In production, you would use actual Google Vision API
    // For demo purposes, we'll simulate the response
    
    const mockResponse = await this.simulateGoogleVisionAPI(imageBase64);
    
    const safeSearchAnnotation = mockResponse.safeSearchAnnotation;
    const objectAnnotations = mockResponse.objectAnnotations || [];
    
    const hasAdultContent = this.getLikelihoodScore(safeSearchAnnotation.adult) > 3;
    const hasViolentContent = this.getLikelihoodScore(safeSearchAnnotation.violence) > 3;
    const hasRacyContent = this.getLikelihoodScore(safeSearchAnnotation.racy) > 3;
    
    const isSafe = !hasAdultContent && !hasViolentContent && !hasRacyContent;
    const confidence = 0.85 + (Math.random() * 0.15);
    
    let suggestedAction: 'allow' | 'flag' | 'block' = 'allow';
    if (hasAdultContent || hasViolentContent) {
      suggestedAction = 'block';
    } else if (hasRacyContent) {
      suggestedAction = 'flag';
    }
    
    return {
      isSafe,
      hasAdultContent,
      hasViolentContent,
      hasRacyContent,
      hasSpamContent: false, // Google Vision doesn't detect spam directly
      confidence,
      detectedObjects: objectAnnotations.map((obj: any) => obj.name),
      suggestedAction
    };
  }

  private async moderateImageWithAWSRekognition(imageBase64: string): Promise<ImageModerationResult> {
    // In production, you would use actual AWS Rekognition API
    // For demo purposes, we'll simulate the response
    
    const mockResponse = await this.simulateAWSRekognitionAPI(imageBase64);
    
    const moderationLabels = mockResponse.ModerationLabels || [];
    const objectLabels = mockResponse.Labels || [];
    
    const hasAdultContent = moderationLabels.some((label: any) => 
      label.Name.includes('Explicit Nudity') && label.Confidence > 80
    );
    
    const hasViolentContent = moderationLabels.some((label: any) => 
      label.Name.includes('Violence') && label.Confidence > 80
    );
    
    const hasRacyContent = moderationLabels.some((label: any) => 
      label.Name.includes('Suggestive') && label.Confidence > 70
    );
    
    const isSafe = !hasAdultContent && !hasViolentContent;
    const confidence = 0.88 + (Math.random() * 0.12);
    
    let suggestedAction: 'allow' | 'flag' | 'block' = 'allow';
    if (hasAdultContent || hasViolentContent) {
      suggestedAction = 'block';
    } else if (hasRacyContent) {
      suggestedAction = 'flag';
    }
    
    return {
      isSafe,
      hasAdultContent,
      hasViolentContent,
      hasRacyContent,
      hasSpamContent: false,
      confidence,
      detectedObjects: objectLabels.map((label: any) => label.Name),
      suggestedAction
    };
  }

  async moderateText(text: string): Promise<TextModerationResult> {
    try {
      // Use multiple approaches for comprehensive text moderation
      const perspectiveResult = await this.moderateTextWithPerspectiveAPI(text);
      const customResult = await this.moderateTextWithCustomRules(text);
      
      // Combine results
      const combinedResult: TextModerationResult = {
        isSafe: perspectiveResult.isSafe && customResult.isSafe,
        toxicityScore: Math.max(perspectiveResult.toxicityScore, customResult.toxicityScore),
        categories: {
          spam: Math.max(perspectiveResult.categories.spam, customResult.categories.spam),
          hate: Math.max(perspectiveResult.categories.hate, customResult.categories.hate),
          harassment: Math.max(perspectiveResult.categories.harassment, customResult.categories.harassment),
          selfHarm: Math.max(perspectiveResult.categories.selfHarm, customResult.categories.selfHarm),
          sexual: Math.max(perspectiveResult.categories.sexual, customResult.categories.sexual),
          violence: Math.max(perspectiveResult.categories.violence, customResult.categories.violence)
        },
        suggestedAction: this.determineSuggestedAction(perspectiveResult, customResult),
        flaggedPhrases: [...perspectiveResult.flaggedPhrases, ...customResult.flaggedPhrases]
      };
      
      return combinedResult;
    } catch (error) {
      console.error('Text moderation failed:', error);
      return {
        isSafe: true,
        toxicityScore: 0,
        categories: {
          spam: 0,
          hate: 0,
          harassment: 0,
          selfHarm: 0,
          sexual: 0,
          violence: 0
        },
        suggestedAction: 'flag',
        flaggedPhrases: []
      };
    }
  }

  private async moderateTextWithPerspectiveAPI(text: string): Promise<TextModerationResult> {
    // In production, use actual Perspective API
    // For demo purposes, we'll simulate the response
    
    const mockResponse = await this.simulatePerspectiveAPI(text);
    
    const scores = mockResponse.attributeScores;
    const toxicityScore = scores.TOXICITY?.summaryScore?.value || 0;
    const spamScore = scores.SPAM?.summaryScore?.value || 0;
    const hateSpeechScore = scores.SEVERE_TOXICITY?.summaryScore?.value || 0;
    
    const isSafe = toxicityScore < 0.7 && spamScore < 0.8 && hateSpeechScore < 0.6;
    
    return {
      isSafe,
      toxicityScore,
      categories: {
        spam: spamScore,
        hate: hateSpeechScore,
        harassment: scores.HARASSMENT?.summaryScore?.value || 0,
        selfHarm: scores.SELF_HARM?.summaryScore?.value || 0,
        sexual: scores.SEXUALLY_EXPLICIT?.summaryScore?.value || 0,
        violence: scores.THREAT?.summaryScore?.value || 0
      },
      suggestedAction: this.getSuggestedActionFromScore(toxicityScore),
      flaggedPhrases: this.extractFlaggedPhrases(text, toxicityScore)
    };
  }

  private async moderateTextWithCustomRules(text: string): Promise<TextModerationResult> {
    const lowerText = text.toLowerCase();
    
    // Define custom rules and patterns
    const spamPatterns = [
      /free\s+money/gi,
      /click\s+here\s+now/gi,
      /limited\s+time\s+offer/gi,
      /guaranteed\s+profit/gi,
      /make\s+money\s+fast/gi
    ];
    
    const hatePatterns = [
      /\b(hate|kill|die)\s+(you|them|him|her)\b/gi,
      /\b(stupid|idiot|moron)\s+(people|person)\b/gi
    ];
    
    const violencePatterns = [
      /\b(kill|murder|hurt|harm|attack)\b/gi,
      /\b(weapon|gun|knife|bomb)\b/gi
    ];
    
    const sexualPatterns = [
      /\b(sex|sexual|nude|naked)\b/gi
    ];
    
    let spamScore = 0;
    let hateScore = 0;
    let violenceScore = 0;
    let sexualScore = 0;
    const flaggedPhrases: string[] = [];
    
    // Check spam patterns
    spamPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        spamScore += matches.length * 0.3;
        flaggedPhrases.push(...matches);
      }
    });
    
    // Check hate patterns
    hatePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        hateScore += matches.length * 0.5;
        flaggedPhrases.push(...matches);
      }
    });
    
    // Check violence patterns
    violencePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        violenceScore += matches.length * 0.4;
        flaggedPhrases.push(...matches);
      }
    });
    
    // Check sexual patterns
    sexualPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        sexualScore += matches.length * 0.3;
        flaggedPhrases.push(...matches);
      }
    });
    
    const maxScore = Math.max(spamScore, hateScore, violenceScore, sexualScore);
    const isSafe = maxScore < 0.6;
    
    return {
      isSafe,
      toxicityScore: maxScore,
      categories: {
        spam: Math.min(spamScore, 1),
        hate: Math.min(hateScore, 1),
        harassment: Math.min(hateScore * 0.8, 1),
        selfHarm: 0, // Would need more sophisticated detection
        sexual: Math.min(sexualScore, 1),
        violence: Math.min(violenceScore, 1)
      },
      suggestedAction: this.getSuggestedActionFromScore(maxScore),
      flaggedPhrases: [...new Set(flaggedPhrases)] // Remove duplicates
    };
  }

  private determineSuggestedAction(
    result1: TextModerationResult, 
    result2: TextModerationResult
  ): 'allow' | 'flag' | 'block' {
    if (result1.suggestedAction === 'block' || result2.suggestedAction === 'block') {
      return 'block';
    }
    if (result1.suggestedAction === 'flag' || result2.suggestedAction === 'flag') {
      return 'flag';
    }
    return 'allow';
  }

  private getSuggestedActionFromScore(score: number): 'allow' | 'flag' | 'block' {
    if (score >= 0.8) return 'block';
    if (score >= 0.5) return 'flag';
    return 'allow';
  }

  private extractFlaggedPhrases(text: string, score: number): string[] {
    if (score < 0.5) return [];
    
    // Simple extraction - in production, use more sophisticated NLP
    const words = text.split(/\s+/);
    const flaggedWords = words.filter(word => 
      word.length > 3 && /[A-Z]{2,}/.test(word) // Caps words
    );
    
    return flaggedWords.slice(0, 5); // Limit to 5 flagged phrases
  }

  private getLikelihoodScore(likelihood: string): number {
    const scores: { [key: string]: number } = {
      'VERY_UNLIKELY': 1,
      'UNLIKELY': 2,
      'POSSIBLE': 3,
      'LIKELY': 4,
      'VERY_LIKELY': 5
    };
    return scores[likelihood] || 0;
  }

  // Simulation methods for demo purposes
  private async simulateGoogleVisionAPI(imageBase64: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const random = Math.random();
    return {
      safeSearchAnnotation: {
        adult: random < 0.1 ? 'LIKELY' : 'UNLIKELY',
        violence: random < 0.05 ? 'POSSIBLE' : 'VERY_UNLIKELY',
        racy: random < 0.15 ? 'POSSIBLE' : 'UNLIKELY'
      },
      objectAnnotations: [
        { name: 'Person', score: 0.95 },
        { name: 'Face', score: 0.88 }
      ]
    };
  }

  private async simulateAWSRekognitionAPI(imageBase64: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const random = Math.random();
    return {
      ModerationLabels: random < 0.1 ? [
        { Name: 'Explicit Nudity', Confidence: 85.5 }
      ] : [],
      Labels: [
        { Name: 'Person', Confidence: 95.2 },
        { Name: 'Human', Confidence: 94.8 }
      ]
    };
  }

  private async simulatePerspectiveAPI(text: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const lowerText = text.toLowerCase();
    let toxicityScore = 0.1;
    
    // Simulate higher scores for certain keywords
    if (lowerText.includes('hate') || lowerText.includes('kill')) {
      toxicityScore = 0.8 + (Math.random() * 0.2);
    } else if (lowerText.includes('stupid') || lowerText.includes('idiot')) {
      toxicityScore = 0.6 + (Math.random() * 0.2);
    } else if (lowerText.includes('free money') || lowerText.includes('click here')) {
      toxicityScore = 0.4 + (Math.random() * 0.3);
    }
    
    return {
      attributeScores: {
        TOXICITY: {
          summaryScore: { value: toxicityScore }
        },
        SPAM: {
          summaryScore: { value: lowerText.includes('free') ? 0.7 : 0.1 }
        },
        SEVERE_TOXICITY: {
          summaryScore: { value: toxicityScore > 0.7 ? toxicityScore * 0.9 : 0.1 }
        },
        HARASSMENT: {
          summaryScore: { value: toxicityScore > 0.6 ? toxicityScore * 0.8 : 0.1 }
        },
        SELF_HARM: {
          summaryScore: { value: 0.05 }
        },
        SEXUALLY_EXPLICIT: {
          summaryScore: { value: lowerText.includes('sex') ? 0.6 : 0.05 }
        },
        THREAT: {
          summaryScore: { value: lowerText.includes('kill') ? 0.8 : 0.05 }
        }
      }
    };
  }

  async batchModerateContent(items: {
    id: string;
    content: string;
    type: 'text' | 'image';
  }[]): Promise<{
    id: string;
    result: TextModerationResult | ImageModerationResult;
  }[]> {
    const results = await Promise.all(
      items.map(async item => {
        let result;
        if (item.type === 'text') {
          result = await this.moderateText(item.content);
        } else {
          result = await this.moderateImage(item.content);
        }
        return { id: item.id, result };
      })
    );
    
    return results;
  }

  async trainCustomModel(trainingData: {
    content: string;
    labels: string[];
    isSafe: boolean;
  }[]): Promise<void> {
    // In production, implement actual model training
    console.log('Training custom moderation model with', trainingData.length, 'samples');
    
    // Simulate training process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Custom moderation model training completed');
  }
}

export default ContentModerationAIService;