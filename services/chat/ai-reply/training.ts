import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecurityGuardrailsService from '@/services/ai/SecurityGuardrailsService';
import DataLayoutService, { StyleProfileJSON } from '@/services/ai/DataLayoutService';
import { StyleExtraction } from './replyAssistant';

export interface TrainingData {
  content: string;
  wordCount: number;
  lastUpdated: number;
  extractedFeatures?: StyleExtraction;
}

class TrainingService {
  private static instance: TrainingService;
  private readonly TRAINING_DATA_KEY = 'ai_agent_training_data';
  private readonly MAX_WORDS = 10000;
  
  private securityGuardrails: SecurityGuardrailsService;
  private dataLayoutService: DataLayoutService;

  private constructor() {
    this.securityGuardrails = SecurityGuardrailsService.getInstance();
    this.dataLayoutService = DataLayoutService.getInstance();
  }

  static getInstance(): TrainingService {
    if (!TrainingService.instance) {
      TrainingService.instance = new TrainingService();
    }
    return TrainingService.instance;
  }

  // Load training data
  async getTrainingData(): Promise<TrainingData | null> {
    try {
      const stored = await this.getEncrypted(this.TRAINING_DATA_KEY);
      return stored;
    } catch (error) {
      console.error('Failed to get training data:', error);
      return null;
    }
  }

  // Save training data with validation
  async saveTrainingData(content: string): Promise<TrainingData> {
    try {
      // Validate word count
      const words = content.trim().split(/\s+/).filter(word => word.length > 0);
      if (words.length > this.MAX_WORDS) {
        throw new Error(`Training content exceeds ${this.MAX_WORDS} words limit (${words.length} words)`);
      }

      // Privacy check
      const privacyCheck = await this.securityGuardrails.enforcePrivacyByDefault(content, 'store');
      if (!privacyCheck.allowed) {
        throw new Error(`Training data blocked: ${privacyCheck.reason}`);
      }

      // Extract style features
      const extractedFeatures = await this.extractStyleFeatures(content, words);

      // Create training data object
      const trainingData: TrainingData = {
        content,
        wordCount: words.length,
        lastUpdated: Date.now(),
        extractedFeatures
      };

      // Store encrypted
      await this.storeEncrypted(this.TRAINING_DATA_KEY, trainingData);

      // Update style profile in data layout
      const styleProfile: StyleProfileJSON = {
        ...extractedFeatures,
        extractedFrom10kWords: words.length <= this.MAX_WORDS,
        wordCount: words.length,
        lastUpdated: Date.now()
      };

      await this.dataLayoutService.updateStyleProfileJSON(styleProfile);

      console.log(`✅ Training data saved: ${words.length} words, ${extractedFeatures.tone} tone`);
      return trainingData;
    } catch (error) {
      console.error('Failed to save training data:', error);
      throw error;
    }
  }

  // Clear training data
  async clearTrainingData(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(this.TRAINING_DATA_KEY);
      } else {
        await SecureStore.deleteItemAsync(this.TRAINING_DATA_KEY);
      }
      
      console.log('🗑️ Training data cleared');
    } catch (error) {
      console.error('Failed to clear training data:', error);
      throw error;
    }
  }

  // Analyze text and provide insights
  async analyzeText(text: string): Promise<{
    wordCount: number;
    tone: string;
    length: string;
    vocabulary: number;
    patterns: string[];
    punctuation: string;
    emoji: string;
    readability: 'easy' | 'medium' | 'complex';
  }> {
    try {
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      const features = await this.extractStyleFeatures(text, words);
      
      return {
        wordCount: words.length,
        tone: features.tone,
        length: features.length,
        vocabulary: features.vocabulary.length,
        patterns: features.patterns,
        punctuation: features.punctuation,
        emoji: features.emoji,
        readability: this.calculateReadability(text, words)
      };
    } catch (error) {
      console.error('Failed to analyze text:', error);
      throw error;
    }
  }

  // Private helper methods
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
    if (text.match(/\b(because|since|therefore)\b/i)) patterns.push('causal');
    if (text.match(/\b(for example|such as|like)\b/i)) patterns.push('exemplifying');
    
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

  private calculateReadability(text: string, words: string[]): 'easy' | 'medium' | 'complex' {
    // Simple readability calculation based on average word length and sentence length
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = words.length / sentences.length;
    
    const complexity = avgWordLength * 0.5 + avgSentenceLength * 0.1;
    
    if (complexity < 6) return 'easy';
    if (complexity < 10) return 'medium';
    return 'complex';
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

export default TrainingService;