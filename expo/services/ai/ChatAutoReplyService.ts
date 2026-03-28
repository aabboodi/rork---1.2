import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PersonalizationSettingsService from './PersonalizationSettingsService';

export interface StyleProfile {
  tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'humorous';
  length: 'short' | 'medium' | 'long';
  vocabulary: string[];
  patterns: string[];
  punctuation: 'minimal' | 'standard' | 'expressive';
  emoji: 'none' | 'occasional' | 'frequent';
  tfidfVectors?: Record<string, number>; // TF-IDF vectors for style analysis
  embeddings?: number[]; // Local embeddings for semantic similarity
}

export interface ThreadPersona {
  chatId: string;
  isGroup: boolean;
  style: StyleProfile;
  context: {
    recentTopics: string[];
    participants: string[];
    lastInteraction: number;
  };
  preferences: {
    responseTime: number; // ms delay
    autoMode: boolean;
    suggestMode: boolean;
  };
  lastUpdated: number;
}

export interface ReplyCandidate {
  id: string;
  text: string;
  confidence: number;
  style: StyleProfile;
  reasoning: string;
  timestamp: number;
}

export interface AutoReplyGuards {
  maxLength: number;
  minConfidence: number;
  rateLimitPerHour: number;
  contentFilters: string[];
  emergencyStop: boolean;
}

class ChatAutoReplyService {
  private static instance: ChatAutoReplyService;
  private readonly PERSONAS_KEY = 'chat_personas_json'; // Per-thread biases storage
  private readonly STYLE_PROFILE_KEY = 'style_profile_json'; // Style profile from 10k words
  private readonly GUARDS_KEY = 'auto_reply_guards';
  private readonly REPLY_HISTORY_KEY = 'reply_history';
  private readonly MAX_PERSONAS = 100;
  private readonly MAX_REPLY_LENGTH = 280;
  private readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
  private readonly MAX_TRAINER_WORDS = 10000;
  
  private settingsService: PersonalizationSettingsService;
  private replyHistory: Map<string, number[]> = new Map(); // chatId -> timestamps

  private constructor() {
    this.settingsService = PersonalizationSettingsService.getInstance();
    this.loadReplyHistory();
  }

  static getInstance(): ChatAutoReplyService {
    if (!ChatAutoReplyService.instance) {
      ChatAutoReplyService.instance = new ChatAutoReplyService();
    }
    return ChatAutoReplyService.instance;
  }

  // Style Extractor: TF-IDF + Embeddings محلية → قوالب نبرة/طول/مفردات
  async extractStyleProfile(content: string): Promise<StyleProfile> {
    try {
      console.log('🎨 Extracting style profile with TF-IDF + Local Embeddings...');
      
      // Validate word count (≤10k words)
      const wordCount = this.countWords(content);
      if (wordCount > this.MAX_TRAINER_WORDS) {
        throw new Error(`Content exceeds ${this.MAX_TRAINER_WORDS} words limit`);
      }
      
      const words = content.toLowerCase().split(/\s+/);
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      // Compute TF-IDF vectors
      const tfidfVectors = this.computeTFIDF(content);
      
      // Generate local embeddings (simplified)
      const embeddings = this.generateLocalEmbeddings(content);
      
      // Analyze tone
      const formalWords = ['however', 'therefore', 'furthermore', 'consequently', 'nevertheless'];
      const casualWords = ['yeah', 'ok', 'cool', 'awesome', 'lol', 'btw'];
      const friendlyWords = ['thanks', 'please', 'appreciate', 'wonderful', 'amazing'];
      const humorousWords = ['haha', 'lol', 'funny', 'joke', 'hilarious'];
      
      const formalCount = words.filter(w => formalWords.includes(w)).length;
      const casualCount = words.filter(w => casualWords.includes(w)).length;
      const friendlyCount = words.filter(w => friendlyWords.includes(w)).length;
      const humorousCount = words.filter(w => humorousWords.includes(w)).length;
      
      let tone: StyleProfile['tone'] = 'casual';
      const maxCount = Math.max(formalCount, casualCount, friendlyCount, humorousCount);
      if (maxCount === formalCount) tone = 'formal';
      else if (maxCount === friendlyCount) tone = 'friendly';
      else if (maxCount === humorousCount) tone = 'humorous';
      
      // Analyze length preference
      const avgSentenceLength = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length;
      let length: StyleProfile['length'] = 'medium';
      if (avgSentenceLength < 8) length = 'short';
      else if (avgSentenceLength > 15) length = 'long';
      
      // Extract vocabulary patterns
      const wordFreq = new Map<string, number>();
      words.forEach(word => {
        if (word.length > 3) {
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
      });
      
      const vocabulary = Array.from(wordFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([word]) => word);
      
      // Extract common patterns
      const patterns = this.extractPatterns(content);
      
      // Analyze punctuation style
      const exclamationCount = (content.match(/!/g) || []).length;
      const questionCount = (content.match(/\?/g) || []).length;
      const totalSentences = sentences.length;
      
      let punctuation: StyleProfile['punctuation'] = 'standard';
      if ((exclamationCount + questionCount) / totalSentences > 0.3) {
        punctuation = 'expressive';
      } else if ((exclamationCount + questionCount) / totalSentences < 0.1) {
        punctuation = 'minimal';
      }
      
      // Analyze emoji usage
      const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
      let emoji: StyleProfile['emoji'] = 'none';
      if (emojiCount > 0) {
        const emojiRatio = emojiCount / words.length;
        if (emojiRatio > 0.05) emoji = 'frequent';
        else emoji = 'occasional';
      }
      
      const profile: StyleProfile = {
        tone,
        length,
        vocabulary,
        patterns,
        punctuation,
        emoji,
        tfidfVectors,
        embeddings
      };
      
      // Store style profile globally
      await this.storeEncrypted(this.STYLE_PROFILE_KEY, profile);
      
      console.log('✅ Style profile extracted:', profile);
      return profile;
    } catch (error) {
      console.error('Failed to extract style profile:', error);
      return this.getDefaultStyleProfile();
    }
  }

  // Create or update thread persona (لكل chatId انحياز)
  async createThreadPersona(chatId: string, isGroup: boolean, messages: any[] = []): Promise<ThreadPersona> {
    try {
      console.log(`🎭 Creating per-thread persona with biases for chat: ${chatId}`);
      
      const trainerContent = await this.settingsService.getTrainerContent();
      const baseStyle = trainerContent ? await this.extractStyleProfile(trainerContent) : this.getDefaultStyleProfile();
      
      // Analyze thread-specific context from local history
      const recentTopics = this.extractTopics(messages.slice(-20));
      const participants = this.extractParticipants(messages);
      
      // Create thread-specific biases based on local chat history
      const threadBiases = await this.computeThreadBiases(chatId, messages, isGroup);
      
      // Adapt style based on thread context and biases
      const adaptedStyle = await this.adaptStyleToThread(baseStyle, messages, isGroup, threadBiases);
      
      const persona: ThreadPersona = {
        chatId,
        isGroup,
        style: adaptedStyle,
        context: {
          recentTopics,
          participants,
          lastInteraction: Date.now()
        },
        preferences: {
          responseTime: isGroup ? 2000 : 1000, // Slower in groups
          autoMode: false, // Default to suggest mode
          suggestMode: true
        },
        lastUpdated: Date.now()
      };
      
      await this.saveThreadPersona(persona);
      console.log('✅ Thread persona with per-chat biases created');
      return persona;
    } catch (error) {
      console.error('Failed to create thread persona:', error);
      throw error;
    }
  }

  // Generate reply suggestions
  async generateReplySuggestions(chatId: string, messageText: string, context: any = {}): Promise<ReplyCandidate[]> {
    try {
      console.log(`💬 Generating reply suggestions for: ${messageText.substring(0, 50)}...`);
      
      const settings = await this.settingsService.getSettings();
      if (!settings.consent.given || !settings.replyAssistant.enabled) {
        return [];
      }
      
      const shouldAssist = await this.settingsService.shouldAssistInChat(chatId, context.isGroup);
      if (!shouldAssist) {
        return [];
      }
      
      const persona = await this.getThreadPersona(chatId);
      if (!persona) {
        return [];
      }
      
      const guards = await this.getAutoReplyGuards();
      if (guards.emergencyStop) {
        console.log('🛑 Emergency stop activated');
        return [];
      }
      
      // Check rate limits
      if (!this.checkRateLimit(chatId, guards.rateLimitPerHour)) {
        console.log('⏰ Rate limit exceeded for chat:', chatId);
        return [];
      }
      
      // Generate multiple reply candidates
      const candidates = await this.generateCandidates(messageText, persona, context);
      
      // Filter and rank candidates
      const filteredCandidates = candidates
        .filter(c => c.confidence >= guards.minConfidence)
        .filter(c => c.text.length <= guards.maxLength)
        .filter(c => this.passesContentFilters(c.text, guards.contentFilters))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3); // Top 3 suggestions
      
      console.log(`✅ Generated ${filteredCandidates.length} reply suggestions`);
      return filteredCandidates;
    } catch (error) {
      console.error('Failed to generate reply suggestions:', error);
      return [];
    }
  }

  // Auto-send reply (for allowlisted chats only)
  async autoSendReply(chatId: string, messageText: string, context: any = {}): Promise<string | null> {
    try {
      const persona = await this.getThreadPersona(chatId);
      if (!persona || !persona.preferences.autoMode) {
        return null;
      }
      
      const settings = await this.settingsService.getSettings();
      if (!settings.replyAssistant.allowlist.includes(chatId)) {
        console.log('🚫 Auto-reply not allowed for this chat');
        return null;
      }
      
      const suggestions = await this.generateReplySuggestions(chatId, messageText, context);
      if (suggestions.length === 0) {
        return null;
      }
      
      const bestReply = suggestions[0];
      if (bestReply.confidence < 0.8) { // Higher threshold for auto-send
        return null;
      }
      
      // Add response delay to seem natural
      await new Promise(resolve => setTimeout(resolve, persona.preferences.responseTime));
      
      // Record the auto-reply
      this.recordReply(chatId);
      
      console.log(`🤖 Auto-sending reply: ${bestReply.text}`);
      return bestReply.text;
    } catch (error) {
      console.error('Failed to auto-send reply:', error);
      return null;
    }
  }

  // Update thread persona preferences
  async updateThreadPreferences(chatId: string, preferences: Partial<ThreadPersona['preferences']>): Promise<void> {
    try {
      const persona = await this.getThreadPersona(chatId);
      if (!persona) {
        throw new Error('Thread persona not found');
      }
      
      persona.preferences = { ...persona.preferences, ...preferences };
      persona.lastUpdated = Date.now();
      
      await this.saveThreadPersona(persona);
      console.log('✅ Thread preferences updated');
    } catch (error) {
      console.error('Failed to update thread preferences:', error);
      throw error;
    }
  }

  // Get auto-reply guards
  async getAutoReplyGuards(): Promise<AutoReplyGuards> {
    try {
      const stored = await this.getEncrypted(this.GUARDS_KEY);
      
      const defaultGuards: AutoReplyGuards = {
        maxLength: this.MAX_REPLY_LENGTH,
        minConfidence: this.DEFAULT_CONFIDENCE_THRESHOLD,
        rateLimitPerHour: 10,
        contentFilters: ['spam', 'inappropriate', 'offensive'],
        emergencyStop: false
      };
      
      return stored ? { ...defaultGuards, ...stored } : defaultGuards;
    } catch (error) {
      console.error('Failed to get auto-reply guards:', error);
      return {
        maxLength: this.MAX_REPLY_LENGTH,
        minConfidence: this.DEFAULT_CONFIDENCE_THRESHOLD,
        rateLimitPerHour: 10,
        contentFilters: [],
        emergencyStop: false
      };
    }
  }

  // Update auto-reply guards
  async updateAutoReplyGuards(guards: Partial<AutoReplyGuards>): Promise<void> {
    try {
      const current = await this.getAutoReplyGuards();
      const updated = { ...current, ...guards };
      await this.storeEncrypted(this.GUARDS_KEY, updated);
      console.log('✅ Auto-reply guards updated');
    } catch (error) {
      console.error('Failed to update auto-reply guards:', error);
      throw error;
    }
  }

  // Emergency stop
  async emergencyStop(): Promise<void> {
    try {
      await this.updateAutoReplyGuards({ emergencyStop: true });
      console.log('🛑 Emergency stop activated');
    } catch (error) {
      console.error('Failed to activate emergency stop:', error);
      throw error;
    }
  }

  // Resume after emergency stop
  async resumeAfterStop(): Promise<void> {
    try {
      await this.updateAutoReplyGuards({ emergencyStop: false });
      console.log('▶️ Auto-reply resumed');
    } catch (error) {
      console.error('Failed to resume auto-reply:', error);
      throw error;
    }
  }

  // Get thread persona
  async getThreadPersona(chatId: string): Promise<ThreadPersona | null> {
    try {
      const personas = await this.getAllThreadPersonas();
      return personas.find(p => p.chatId === chatId) || null;
    } catch (error) {
      console.error('Failed to get thread persona:', error);
      return null;
    }
  }

  // Get all thread personas
  async getAllThreadPersonas(): Promise<ThreadPersona[]> {
    try {
      const stored = await this.getEncrypted(this.PERSONAS_KEY);
      return stored || [];
    } catch (error) {
      console.error('Failed to get thread personas:', error);
      return [];
    }
  }

  // Clear old personas (keep only recent ones)
  async cleanupOldPersonas(): Promise<void> {
    try {
      const personas = await this.getAllThreadPersonas();
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      const recentPersonas = personas
        .filter(p => p.lastUpdated > thirtyDaysAgo)
        .slice(0, this.MAX_PERSONAS);
      
      await this.storeEncrypted(this.PERSONAS_KEY, recentPersonas);
      console.log(`🧹 Cleaned up personas: ${personas.length} -> ${recentPersonas.length}`);
    } catch (error) {
      console.error('Failed to cleanup old personas:', error);
    }
  }

  // Private helper methods
  private async saveThreadPersona(persona: ThreadPersona): Promise<void> {
    try {
      const personas = await this.getAllThreadPersonas();
      const existingIndex = personas.findIndex(p => p.chatId === persona.chatId);
      
      if (existingIndex >= 0) {
        personas[existingIndex] = persona;
      } else {
        personas.push(persona);
      }
      
      await this.storeEncrypted(this.PERSONAS_KEY, personas);
    } catch (error) {
      console.error('Failed to save thread persona:', error);
      throw error;
    }
  }

  private async generateCandidates(messageText: string, persona: ThreadPersona, context: any): Promise<ReplyCandidate[]> {
    // This is a simplified implementation - in production, this would use a local LLM
    const candidates: ReplyCandidate[] = [];
    
    // Generate contextual replies based on message content
    const responses = this.generateContextualResponses(messageText, persona.style);
    
    responses.forEach((text, index) => {
      candidates.push({
        id: `reply_${Date.now()}_${index}`,
        text,
        confidence: 0.7 + (Math.random() * 0.2), // Simulate confidence scoring
        style: persona.style,
        reasoning: `Generated based on ${persona.style.tone} tone and ${persona.style.length} length preference`,
        timestamp: Date.now()
      });
    });
    
    return candidates;
  }

  private generateContextualResponses(messageText: string, style: StyleProfile): string[] {
    const responses: string[] = [];
    const lowerMessage = messageText.toLowerCase();
    
    // Question responses
    if (lowerMessage.includes('?')) {
      if (style.tone === 'formal') {
        responses.push('I would be happy to help with that.');
      } else if (style.tone === 'casual') {
        responses.push('Sure thing!');
      } else {
        responses.push('Of course! Let me think about that.');
      }
    }
    
    // Greeting responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      if (style.tone === 'formal') {
        responses.push('Good day to you.');
      } else {
        responses.push('Hey there!');
      }
    }
    
    // Thanks responses
    if (lowerMessage.includes('thank')) {
      responses.push(style.tone === 'formal' ? 'You are most welcome.' : 'No problem!');
    }
    
    // Default responses if no specific patterns match
    if (responses.length === 0) {
      if (style.tone === 'casual') {
        responses.push('Got it!', 'Makes sense', 'Cool');
      } else if (style.tone === 'friendly') {
        responses.push('That sounds great!', 'I appreciate you sharing that');
      } else {
        responses.push('I understand.', 'Thank you for the information.');
      }
    }
    
    // Apply emoji based on style
    if (style.emoji === 'frequent') {
      responses.forEach((response, index) => {
        responses[index] = response + ' 😊';
      });
    } else if (style.emoji === 'occasional' && Math.random() > 0.5) {
      responses[0] = responses[0] + ' 🙂';
    }
    
    return responses.slice(0, 3);
  }

  private async adaptStyleToThread(
    baseStyle: StyleProfile, 
    messages: any[], 
    isGroup: boolean, 
    threadBiases?: Record<string, number>
  ): Promise<StyleProfile> {
    // Adapt style based on thread context and computed biases
    const adaptedStyle = { ...baseStyle };
    
    if (isGroup) {
      // Groups tend to be more casual
      if (adaptedStyle.tone === 'formal') {
        adaptedStyle.tone = 'friendly';
      }
      // Shorter messages in groups
      if (adaptedStyle.length === 'long') {
        adaptedStyle.length = 'medium';
      }
    }
    
    // Apply thread-specific biases
    if (threadBiases) {
      // Adjust tone based on thread formality bias
      if (threadBiases.formality > 0.7) {
        adaptedStyle.tone = 'formal';
      } else if (threadBiases.formality < 0.3) {
        adaptedStyle.tone = 'casual';
      }
      
      // Adjust emoji usage based on thread emoji bias
      if (threadBiases.emojiUsage > 0.6) {
        adaptedStyle.emoji = 'frequent';
      } else if (threadBiases.emojiUsage < 0.2) {
        adaptedStyle.emoji = 'none';
      }
      
      // Adjust length based on thread message length bias
      if (threadBiases.messageLength > 0.7) {
        adaptedStyle.length = 'long';
      } else if (threadBiases.messageLength < 0.3) {
        adaptedStyle.length = 'short';
      }
    }
    
    return adaptedStyle;
  }

  // Compute thread-specific biases from local chat history
  private async computeThreadBiases(chatId: string, messages: any[], isGroup: boolean): Promise<Record<string, number>> {
    const biases: Record<string, number> = {
      formality: 0.5,
      emojiUsage: 0.5,
      messageLength: 0.5,
      responseSpeed: 0.5,
      topicFocus: 0.5
    };
    
    if (messages.length === 0) {
      return biases;
    }
    
    // Analyze formality from message content
    const formalWords = ['however', 'therefore', 'furthermore', 'please', 'thank you'];
    const casualWords = ['yeah', 'ok', 'cool', 'lol', 'btw', 'gonna'];
    
    let formalCount = 0;
    let casualCount = 0;
    let totalEmojis = 0;
    let totalLength = 0;
    
    messages.forEach(msg => {
      if (msg.text) {
        const text = msg.text.toLowerCase();
        const words = text.split(/\s+/);
        
        // Count formal/casual words
        formalCount += words.filter(w => formalWords.includes(w)).length;
        casualCount += words.filter(w => casualWords.includes(w)).length;
        
        // Count emojis
        const emojiMatches = text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu);
        totalEmojis += emojiMatches ? emojiMatches.length : 0;
        
        // Message length
        totalLength += words.length;
      }
    });
    
    // Calculate biases
    const totalWords = messages.reduce((sum, msg) => sum + (msg.text ? msg.text.split(/\s+/).length : 0), 0);
    
    if (totalWords > 0) {
      biases.formality = formalCount > casualCount ? 
        Math.min(0.8, 0.5 + (formalCount - casualCount) / totalWords) :
        Math.max(0.2, 0.5 - (casualCount - formalCount) / totalWords);
      
      biases.emojiUsage = Math.min(0.9, totalEmojis / messages.length);
      biases.messageLength = Math.min(0.9, (totalLength / messages.length) / 20); // Normalize by ~20 words average
    }
    
    console.log(`📊 Computed thread biases for ${chatId}:`, biases);
    return biases;
  }

  private extractTopics(messages: any[]): string[] {
    // Simple keyword extraction - in production, use NLP
    const topics: string[] = [];
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    messages.forEach(msg => {
      if (msg.text) {
        const words = msg.text.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 4 && !commonWords.has(word)) {
            topics.push(word);
          }
        });
      }
    });
    
    return [...new Set(topics)].slice(0, 10);
  }

  private extractParticipants(messages: any[]): string[] {
    const participants = new Set<string>();
    messages.forEach(msg => {
      if (msg.senderId) {
        participants.add(msg.senderId);
      }
    });
    return Array.from(participants);
  }

  private extractPatterns(content: string): string[] {
    const patterns: string[] = [];
    
    // Common phrase patterns
    const phrases = content.match(/\b\w+\s+\w+\s+\w+\b/g) || [];
    const phraseFreq = new Map<string, number>();
    
    phrases.forEach(phrase => {
      const normalized = phrase.toLowerCase();
      phraseFreq.set(normalized, (phraseFreq.get(normalized) || 0) + 1);
    });
    
    // Get most common patterns
    Array.from(phraseFreq.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([pattern]) => patterns.push(pattern));
    
    return patterns;
  }

  // Compute TF-IDF vectors for style analysis
  private computeTFIDF(content: string): Record<string, number> {
    const words = content.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const wordCount = words.length;
    const termFreq = new Map<string, number>();
    
    // Calculate term frequency
    words.forEach(word => {
      termFreq.set(word, (termFreq.get(word) || 0) + 1);
    });
    
    // Convert to TF-IDF (simplified - no IDF calculation for single document)
    const tfidf: Record<string, number> = {};
    termFreq.forEach((freq, term) => {
      tfidf[term] = freq / wordCount; // Simple TF normalization
    });
    
    return tfidf;
  }

  // Generate local embeddings (simplified semantic vectors)
  private generateLocalEmbeddings(content: string): number[] {
    // Simplified embedding generation - in production, use a local model
    const words = content.toLowerCase().split(/\s+/);
    const embedding = new Array(128).fill(0); // 128-dimensional vector
    
    // Simple hash-based embedding
    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      embedding[hash % 128] += 1 / words.length;
    });
    
    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (norm || 1));
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

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private getDefaultStyleProfile(): StyleProfile {
    return {
      tone: 'friendly',
      length: 'medium',
      vocabulary: [],
      patterns: [],
      punctuation: 'standard',
      emoji: 'occasional'
    };
  }

  private checkRateLimit(chatId: string, limitPerHour: number): boolean {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const history = this.replyHistory.get(chatId) || [];
    const recentReplies = history.filter(timestamp => timestamp > oneHourAgo);
    
    return recentReplies.length < limitPerHour;
  }

  private recordReply(chatId: string): void {
    const history = this.replyHistory.get(chatId) || [];
    history.push(Date.now());
    this.replyHistory.set(chatId, history);
    
    // Save to storage
    this.saveReplyHistory();
  }

  private passesContentFilters(text: string, filters: string[]): boolean {
    const lowerText = text.toLowerCase();
    return !filters.some(filter => lowerText.includes(filter.toLowerCase()));
  }

  private async loadReplyHistory(): Promise<void> {
    try {
      const stored = await this.getEncrypted(this.REPLY_HISTORY_KEY);
      if (stored) {
        this.replyHistory = new Map(Object.entries(stored));
      }
    } catch (error) {
      console.error('Failed to load reply history:', error);
    }
  }

  private async saveReplyHistory(): Promise<void> {
    try {
      const historyObj = Object.fromEntries(this.replyHistory);
      await this.storeEncrypted(this.REPLY_HISTORY_KEY, historyObj);
    } catch (error) {
      console.error('Failed to save reply history:', error);
    }
  }

  private async storeEncrypted(key: string, data: any): Promise<void> {
    const jsonData = JSON.stringify(data);
    
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, jsonData);
    } else {
      await SecureStore.setItemAsync(key, jsonData);
    }
  }

  private async getEncrypted(key: string): Promise<any> {
    let jsonData: string | null;
    
    if (Platform.OS === 'web') {
      jsonData = await AsyncStorage.getItem(key);
    } else {
      jsonData = await SecureStore.getItemAsync(key);
    }
    
    return jsonData ? JSON.parse(jsonData) : null;
  }
}

export default ChatAutoReplyService;