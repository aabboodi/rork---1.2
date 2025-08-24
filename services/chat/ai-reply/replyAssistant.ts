import PersonalizationSignalsService from '@/services/ai/PersonalizationSignalsService';
import DataLayoutService, { StyleProfileJSON } from '@/services/ai/DataLayoutService';
import SecurityGuardrailsService from '@/services/ai/SecurityGuardrailsService';
import PersonalizationSettingsService from '@/services/ai/PersonalizationSettingsService';

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: number;
  isFromUser: boolean;
  chatId: string;
  metadata?: {
    confidence?: number;
    isAutoReply?: boolean;
    persona?: string;
  };
}

export interface SuggestedReply {
  id: string;
  text: string;
  confidence: number;
  reason: string;
  persona?: string;
}

export interface StyleExtraction {
  tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'humorous';
  length: 'short' | 'medium' | 'long';
  vocabulary: string[];
  patterns: string[];
  punctuation: 'minimal' | 'standard' | 'expressive';
  emoji: 'none' | 'occasional' | 'frequent';
  tfidfVectors: Record<string, number>;
  embeddings: number[];
}

class ReplyAssistantService {
  private static instance: ReplyAssistantService;
  private readonly MAX_TRAINER_WORDS = 10000;
  private readonly MIN_CONFIDENCE = 0.7;
  
  private signalsService: PersonalizationSignalsService;
  private dataLayoutService: DataLayoutService;
  private securityGuardrails: SecurityGuardrailsService;
  private settingsService: PersonalizationSettingsService;
  private isInitialized = false;

  private constructor() {
    this.signalsService = PersonalizationSignalsService.getInstance();
    this.dataLayoutService = DataLayoutService.getInstance();
    this.securityGuardrails = SecurityGuardrailsService.getInstance();
    this.settingsService = PersonalizationSettingsService.getInstance();
  }

  static getInstance(): ReplyAssistantService {
    if (!ReplyAssistantService.instance) {
      ReplyAssistantService.instance = new ReplyAssistantService();
    }
    return ReplyAssistantService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🤖 Initializing Reply Assistant...');
      
      // Initialize security guardrails
      await this.securityGuardrails.initialize();
      
      console.log('✅ Reply Assistant initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Reply Assistant:', error);
      throw error;
    }
  }

  // Suggest smart replies based on conversation context and per-thread personas
  async suggest(
    chatId: string,
    recentMessages: ChatMessage[],
    isGroup: boolean = false
  ): Promise<SuggestedReply[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if suggestions are enabled
      const settings = await this.settingsService.getSettings();
      if (!settings.consent.given || !settings.replyAssistant.enabled) {
        return [];
      }

      // Check scope restrictions
      if (!this.isInScope(isGroup, settings.replyAssistant.scope)) {
        return [];
      }

      // Check schedule restrictions
      if (!this.isInSchedule(settings.replyAssistant.schedule)) {
        return [];
      }

      // Get per-thread persona
      const personas = await this.dataLayoutService.getChatPersonasJSON();
      const chatPersona = personas[chatId];

      // Get user's style profile
      const styleProfile = await this.dataLayoutService.getStyleProfileJSON();

      // Extract context from recent messages
      const context = this.extractContext(recentMessages);

      // Generate suggestions based on context and persona
      const suggestions = await this.generateSuggestions(context, chatPersona, styleProfile, isGroup);

      console.log(`💬 Generated ${suggestions.length} reply suggestions for chat ${chatId}`);
      return suggestions;
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      return [];
    }
  }

  // Enable auto-reply for specific chats (with allowlist + schedule + tagging)
  async autoReplyEnable(
    chatId: string,
    enabled: boolean,
    options?: {
      confidence?: number;
      rateLimit?: number;
      tagMessages?: boolean;
    }
  ): Promise<void> {
    try {
      // NO-WALLET RULE: Ensure no financial chat access
      const walletAllowed = await this.securityGuardrails.enforceNoWalletRule(`/chat/${chatId}`, 'AutoReply');
      if (!walletAllowed) {
        throw new Error('Auto-reply blocked for financial chats');
      }

      const settings = await this.settingsService.getSettings();
      const updatedAllowlist = enabled 
        ? [...settings.replyAssistant.allowlist, chatId].filter((id, index, arr) => arr.indexOf(id) === index)
        : settings.replyAssistant.allowlist.filter(id => id !== chatId);

      await this.settingsService.updateSettings({
        replyAssistant: {
          ...settings.replyAssistant,
          allowlist: updatedAllowlist
        }
      });

      console.log(`🔄 Auto-reply ${enabled ? 'enabled' : 'disabled'} for chat ${chatId}`);
    } catch (error) {
      console.error('Failed to toggle auto-reply:', error);
      throw error;
    }
  }

  // Train from text (≤10k words) to derive style
  async trainFromText(text: string): Promise<StyleExtraction> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Validate word count
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      if (words.length > this.MAX_TRAINER_WORDS) {
        throw new Error(`Training text exceeds ${this.MAX_TRAINER_WORDS} words limit`);
      }

      console.log(`🎓 Training style extractor from ${words.length} words...`);

      // Privacy check: ensure no raw text transmission
      const privacyCheck = await this.securityGuardrails.enforcePrivacyByDefault(text, 'store');
      if (!privacyCheck.allowed) {
        throw new Error(`Training blocked: ${privacyCheck.reason}`);
      }

      // Extract style features using TF-IDF + local embeddings
      const styleExtraction = await this.extractStyleFeatures(text, words);

      // Store style profile
      const styleProfile: StyleProfileJSON = {
        ...styleExtraction,
        extractedFrom10kWords: words.length <= this.MAX_TRAINER_WORDS,
        wordCount: words.length,
        lastUpdated: Date.now()
      };

      await this.dataLayoutService.updateStyleProfileJSON(styleProfile);

      console.log(`✅ Style profile extracted and saved: ${styleExtraction.tone} tone, ${styleExtraction.length} length`);
      return styleExtraction;
    } catch (error) {
      console.error('Failed to train from text:', error);
      throw error;
    }
  }

  // Update per-thread persona based on chat history
  async updateChatPersona(
    chatId: string,
    isGroup: boolean,
    recentMessages: ChatMessage[]
  ): Promise<void> {
    try {
      const personas = await this.dataLayoutService.getChatPersonasJSON();
      
      // Analyze chat-specific patterns
      const biases = this.analyzeChatBiases(recentMessages, isGroup);
      const style = this.extractChatStyle(recentMessages);

      personas[chatId] = {
        isGroup,
        biases,
        style,
        lastUpdated: Date.now()
      };

      await this.dataLayoutService.updateChatPersonasJSON(personas);
      console.log(`🎭 Updated persona for chat ${chatId}`);
    } catch (error) {
      console.error('Failed to update chat persona:', error);
    }
  }

  // Private methods
  private isInScope(isGroup: boolean, scope: 'all' | 'dms_only' | 'groups_only'): boolean {
    switch (scope) {
      case 'all': return true;
      case 'dms_only': return !isGroup;
      case 'groups_only': return isGroup;
      default: return false;
    }
  }

  private isInSchedule(schedule: { enabled: boolean; from: string; to: string }): boolean {
    if (!schedule.enabled) return true;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [fromHour, fromMin] = schedule.from.split(':').map(Number);
    const [toHour, toMin] = schedule.to.split(':').map(Number);
    
    const fromTime = fromHour * 60 + fromMin;
    const toTime = toHour * 60 + toMin;
    
    return currentTime >= fromTime && currentTime <= toTime;
  }

  private extractContext(messages: ChatMessage[]): {
    lastMessage: string;
    topic: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    urgency: 'low' | 'medium' | 'high';
  } {
    const lastMessage = messages[messages.length - 1]?.text || '';
    
    // Simple topic extraction (in production, use more sophisticated NLP)
    const topic = this.extractTopic(lastMessage);
    
    // Simple sentiment analysis
    const sentiment = this.analyzeSentiment(lastMessage);
    
    // Simple urgency detection
    const urgency = this.detectUrgency(lastMessage);
    
    return { lastMessage, topic, sentiment, urgency };
  }

  private async generateSuggestions(
    context: any,
    persona: any,
    styleProfile: StyleProfileJSON | null,
    isGroup: boolean
  ): Promise<SuggestedReply[]> {
    // Mock implementation - in production, use local LLM or rule-based generation
    const suggestions: SuggestedReply[] = [];
    
    // Generate contextual replies based on sentiment and topic
    if (context.sentiment === 'positive') {
      suggestions.push({
        id: 'pos_1',
        text: this.adaptToStyle('That sounds great!', styleProfile),
        confidence: 0.8,
        reason: 'positive_response',
        persona: persona?.style?.tone || 'friendly'
      });
    }
    
    if (context.urgency === 'high') {
      suggestions.push({
        id: 'urgent_1',
        text: this.adaptToStyle('I\'ll get back to you soon', styleProfile),
        confidence: 0.9,
        reason: 'urgent_acknowledgment',
        persona: persona?.style?.tone || 'professional'
      });
    }
    
    // Add generic helpful responses
    suggestions.push({
      id: 'generic_1',
      text: this.adaptToStyle('Thanks for letting me know', styleProfile),
      confidence: 0.6,
      reason: 'acknowledgment',
      persona: persona?.style?.tone || 'casual'
    });
    
    return suggestions.filter(s => s.confidence >= this.MIN_CONFIDENCE);
  }

  private async extractStyleFeatures(text: string, words: string[]): Promise<StyleExtraction> {
    // TF-IDF calculation (simplified)
    const tfidfVectors = this.calculateTFIDF(words);
    
    // Local embeddings (mock - in production, use lightweight embedding model)
    const embeddings = this.generateLocalEmbeddings(text);
    
    // Style analysis
    const tone = this.analyzeTone(text);
    const length = this.analyzeLength(words.length);
    const vocabulary = this.extractVocabulary(words);
    const patterns = this.extractPatterns(text);
    const punctuation = this.analyzePunctuation(text);
    const emoji = this.analyzeEmojiUsage(text);
    
    return {
      tone,
      length,
      vocabulary,
      patterns,
      punctuation,
      emoji,
      tfidfVectors,
      embeddings
    };
  }

  private calculateTFIDF(words: string[]): Record<string, number> {
    const termFreq: Record<string, number> = {};
    const totalWords = words.length;
    
    // Calculate term frequency
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanWord.length > 2) {
        termFreq[cleanWord] = (termFreq[cleanWord] || 0) + 1;
      }
    });
    
    // Convert to TF-IDF (simplified - no IDF calculation)
    const tfidf: Record<string, number> = {};
    Object.entries(termFreq).forEach(([term, freq]) => {
      tfidf[term] = freq / totalWords;
    });
    
    return tfidf;
  }

  private generateLocalEmbeddings(text: string): number[] {
    // Mock local embeddings - in production, use lightweight embedding model
    const hash = this.simpleHash(text);
    const embeddings = [];
    
    for (let i = 0; i < 50; i++) {
      embeddings.push(Math.sin(hash + i) * 0.5);
    }
    
    return embeddings;
  }

  private analyzeTone(text: string): 'formal' | 'casual' | 'friendly' | 'professional' | 'humorous' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('please') || lowerText.includes('kindly') || lowerText.includes('sincerely')) {
      return 'formal';
    }
    if (lowerText.includes('haha') || lowerText.includes('lol') || lowerText.includes('😂')) {
      return 'humorous';
    }
    if (lowerText.includes('meeting') || lowerText.includes('project') || lowerText.includes('deadline')) {
      return 'professional';
    }
    if (lowerText.includes('hey') || lowerText.includes('awesome') || lowerText.includes('cool')) {
      return 'friendly';
    }
    
    return 'casual';
  }

  private analyzeLength(wordCount: number): 'short' | 'medium' | 'long' {
    if (wordCount < 10) return 'short';
    if (wordCount < 30) return 'medium';
    return 'long';
  }

  private extractVocabulary(words: string[]): string[] {
    const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))];
    return uniqueWords.slice(0, 100); // Top 100 unique words
  }

  private extractPatterns(text: string): string[] {
    const patterns = [];
    
    if (text.includes('I think')) patterns.push('opinion_starter');
    if (text.includes('By the way')) patterns.push('topic_changer');
    if (text.match(/\b(however|although|but)\b/i)) patterns.push('contrasting');
    if (text.match(/\b(first|second|finally)\b/i)) patterns.push('sequential');
    
    return patterns;
  }

  private analyzePunctuation(text: string): 'minimal' | 'standard' | 'expressive' {
    const exclamations = (text.match(/!/g) || []).length;
    const questions = (text.match(/\?/g) || []).length;
    const total = text.length;
    
    const expressiveRatio = (exclamations + questions) / total;
    
    if (expressiveRatio > 0.05) return 'expressive';
    if (expressiveRatio > 0.01) return 'standard';
    return 'minimal';
  }

  private analyzeEmojiUsage(text: string): 'none' | 'occasional' | 'frequent' {
    const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
    const wordCount = text.split(/\s+/).length;
    
    const emojiRatio = emojiCount / wordCount;
    
    if (emojiRatio > 0.1) return 'frequent';
    if (emojiRatio > 0.02) return 'occasional';
    return 'none';
  }

  private analyzeChatBiases(messages: ChatMessage[], isGroup: boolean): any {
    // Analyze chat-specific biases
    const avgLength = messages.reduce((sum, msg) => sum + msg.text.length, 0) / messages.length;
    const responseSpeed = this.calculateAverageResponseSpeed(messages);
    
    return {
      formality: isGroup ? 0.6 : 0.4,
      emojiUsage: this.calculateEmojiUsage(messages),
      messageLength: avgLength > 100 ? 0.8 : 0.4,
      responseSpeed: responseSpeed < 300000 ? 0.8 : 0.4, // 5 minutes
      topicFocus: 0.5
    };
  }

  private extractChatStyle(messages: ChatMessage[]): any {
    const allText = messages.map(m => m.text).join(' ');
    const words = allText.split(/\s+/);
    
    return {
      tone: this.analyzeTone(allText),
      length: this.analyzeLength(words.length / messages.length),
      vocabulary: this.extractVocabulary(words).slice(0, 20),
      patterns: this.extractPatterns(allText),
      punctuation: this.analyzePunctuation(allText),
      emoji: this.analyzeEmojiUsage(allText)
    };
  }

  private adaptToStyle(baseText: string, styleProfile: StyleProfileJSON | null): string {
    if (!styleProfile) return baseText;
    
    let adapted = baseText;
    
    // Adapt based on tone
    if (styleProfile.tone === 'formal') {
      adapted = adapted.replace(/hey/gi, 'Hello').replace(/thanks/gi, 'Thank you');
    } else if (styleProfile.tone === 'casual') {
      adapted = adapted.replace(/Hello/gi, 'Hey').replace(/Thank you/gi, 'Thanks');
    }
    
    // Adapt punctuation
    if (styleProfile.punctuation === 'expressive') {
      adapted += '!';
    }
    
    // Add emoji if frequent user
    if (styleProfile.emoji === 'frequent') {
      adapted += ' 😊';
    }
    
    return adapted;
  }

  private extractTopic(text: string): string {
    // Simple keyword-based topic extraction
    const topics = {
      work: ['meeting', 'project', 'deadline', 'work', 'office'],
      social: ['party', 'dinner', 'movie', 'weekend', 'fun'],
      tech: ['app', 'software', 'computer', 'phone', 'tech'],
      general: []
    };
    
    const lowerText = text.toLowerCase();
    
    for (const [topic, keywords] of Object.entries(topics)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return topic;
      }
    }
    
    return 'general';
  }

  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['great', 'awesome', 'good', 'excellent', 'amazing', 'love', 'happy'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry', 'disappointed'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private detectUrgency(text: string): 'low' | 'medium' | 'high' {
    const urgentWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'now'];
    const lowerText = text.toLowerCase();
    
    if (urgentWords.some(word => lowerText.includes(word))) return 'high';
    if (text.includes('!') || text.includes('?')) return 'medium';
    return 'low';
  }

  private calculateAverageResponseSpeed(messages: ChatMessage[]): number {
    if (messages.length < 2) return 0;
    
    let totalTime = 0;
    let responseCount = 0;
    
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].isFromUser !== messages[i-1].isFromUser) {
        totalTime += messages[i].timestamp - messages[i-1].timestamp;
        responseCount++;
      }
    }
    
    return responseCount > 0 ? totalTime / responseCount : 0;
  }

  private calculateEmojiUsage(messages: ChatMessage[]): number {
    const totalText = messages.map(m => m.text).join('');
    const emojiCount = (totalText.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
    const totalChars = totalText.length;
    
    return totalChars > 0 ? emojiCount / totalChars : 0;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Export singleton instance and main functions
const replyAssistantService = ReplyAssistantService.getInstance();

export const ReplyAssistant = {
  suggest: async (
    chatId: string,
    recentMessages: ChatMessage[],
    isGroup: boolean = false
  ): Promise<SuggestedReply[]> => {
    return await replyAssistantService.suggest(chatId, recentMessages, isGroup);
  },
  
  autoReplyEnable: async (
    chatId: string,
    enabled: boolean,
    options?: {
      confidence?: number;
      rateLimit?: number;
      tagMessages?: boolean;
    }
  ): Promise<void> => {
    return await replyAssistantService.autoReplyEnable(chatId, enabled, options);
  },
  
  trainFromText: async (text: string): Promise<StyleExtraction> => {
    return await replyAssistantService.trainFromText(text);
  },
  
  updateChatPersona: async (
    chatId: string,
    isGroup: boolean,
    recentMessages: ChatMessage[]
  ): Promise<void> => {
    return await replyAssistantService.updateChatPersona(chatId, isGroup, recentMessages);
  }
};

export default replyAssistantService;