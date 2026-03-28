import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Data Layout Implementation as specified
export interface SignalsDB {
  post: {
    id: string;
    action: 'view' | 'like' | 'swipe' | 'dwell' | 'mute' | 'report';
    contentId: string;
    timestamp: number;
    duration?: number;
    metadata?: {
      category?: string;
      tags?: string[];
      author?: string;
      engagement?: number;
    };
    sessionId: string;
  }[];
  video: {
    id: string;
    action: 'view' | 'like' | 'swipe' | 'dwell' | 'mute' | 'report';
    contentId: string;
    timestamp: number;
    duration?: number;
    metadata?: {
      category?: string;
      tags?: string[];
      author?: string;
      engagement?: number;
    };
    sessionId: string;
  }[];
  voice: {
    id: string;
    action: 'view' | 'like' | 'swipe' | 'dwell' | 'mute' | 'report';
    contentId: string;
    timestamp: number;
    duration?: number;
    metadata?: {
      category?: string;
      tags?: string[];
      author?: string;
      engagement?: number;
    };
    sessionId: string;
  }[];
  game: {
    id: string;
    action: 'view' | 'like' | 'swipe' | 'dwell' | 'mute' | 'report';
    contentId: string;
    timestamp: number;
    duration?: number;
    metadata?: {
      category?: string;
      tags?: string[];
      author?: string;
      engagement?: number;
    };
    sessionId: string;
  }[];
}

export interface ProfileJSON {
  vec: Record<string, number>; // Topic vectors
  ts: number; // Timestamp
  preferences: Record<string, number>;
  topicDecay: Record<string, { weight: number; lastUpdate: number }>;
  emaAlpha: number;
}

export interface ChatPersonasJSON {
  [chatId: string]: {
    isGroup: boolean;
    biases: {
      formality: number;
      emojiUsage: number;
      messageLength: number;
      responseSpeed: number;
      topicFocus: number;
    };
    style: {
      tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'humorous';
      length: 'short' | 'medium' | 'long';
      vocabulary: string[];
      patterns: string[];
      punctuation: 'minimal' | 'standard' | 'expressive';
      emoji: 'none' | 'occasional' | 'frequent';
    };
    lastUpdated: number;
  };
}

export interface StyleProfileJSON {
  tfidfVectors: Record<string, number>;
  embeddings: number[];
  extractedFrom10kWords: boolean;
  wordCount: number;
  tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'humorous';
  length: 'short' | 'medium' | 'long';
  vocabulary: string[];
  patterns: string[];
  punctuation: 'minimal' | 'standard' | 'expressive';
  emoji: 'none' | 'occasional' | 'frequent';
  lastUpdated: number;
}

// Server endpoints as specified
export interface ServerEndpoints {
  socialPrerank: {
    url: '/social/prerank';
    params: {
      slot: 'post' | 'video' | 'voice' | 'game';
      limit?: number;
      userId?: string;
      context?: Record<string, any>;
    };
    response: {
      id: string;
      type: 'post' | 'video' | 'voice' | 'game';
      title: string;
      author: string;
      category: string;
      tags: string[];
      engagement: number;
      timestamp: number;
      serverScore: number;
    }[];
  };
  
  policiesCurrent: {
    url: '/policies/current';
    params: {
      version?: string;
      signature?: boolean;
    };
    response: {
      version: string;
      policies: Record<string, any>;
      signature: string;
      timestamp: number;
    };
  };
  
  trends: {
    url: '/trends';
    params: {
      region?: string;
      category?: string;
      timeframe?: 'hour' | 'day' | 'week';
    };
    response: {
      category: string;
      trend: string;
      score: number;
      region: string;
      timestamp: number;
    }[];
  };
}

class DataLayoutService {
  private static instance: DataLayoutService;
  
  // Local storage keys (encrypted)
  private readonly SIGNALS_DB_KEY = 'signals_db';
  private readonly PROFILE_JSON_KEY = 'profile_json';
  private readonly CHAT_PERSONAS_JSON_KEY = 'chat_personas_json';
  private readonly STYLE_PROFILE_JSON_KEY = 'style_profile_json';
  
  private constructor() {}
  
  static getInstance(): DataLayoutService {
    if (!DataLayoutService.instance) {
      DataLayoutService.instance = new DataLayoutService();
    }
    return DataLayoutService.instance;
  }
  
  // Local storage operations (encrypted)
  async getSignalsDB(): Promise<SignalsDB> {
    try {
      const stored = await this.getEncrypted(this.SIGNALS_DB_KEY);
      return stored || {
        post: [],
        video: [],
        voice: [],
        game: []
      };
    } catch (error) {
      console.error('Failed to get signals DB:', error);
      return { post: [], video: [], voice: [], game: [] };
    }
  }
  
  async updateSignalsDB(signalsDB: SignalsDB): Promise<void> {
    try {
      await this.storeEncrypted(this.SIGNALS_DB_KEY, signalsDB);
      console.log('📊 Signals DB updated');
    } catch (error) {
      console.error('Failed to update signals DB:', error);
      throw error;
    }
  }
  
  async getProfileJSON(): Promise<ProfileJSON> {
    try {
      const stored = await this.getEncrypted(this.PROFILE_JSON_KEY);
      return stored || {
        vec: {},
        ts: Date.now(),
        preferences: {},
        topicDecay: {},
        emaAlpha: 0.1
      };
    } catch (error) {
      console.error('Failed to get profile JSON:', error);
      return {
        vec: {},
        ts: Date.now(),
        preferences: {},
        topicDecay: {},
        emaAlpha: 0.1
      };
    }
  }
  
  async updateProfileJSON(profile: ProfileJSON): Promise<void> {
    try {
      await this.storeEncrypted(this.PROFILE_JSON_KEY, profile);
      console.log('👤 Profile JSON updated');
    } catch (error) {
      console.error('Failed to update profile JSON:', error);
      throw error;
    }
  }
  
  async getChatPersonasJSON(): Promise<ChatPersonasJSON> {
    try {
      const stored = await this.getEncrypted(this.CHAT_PERSONAS_JSON_KEY);
      return stored || {};
    } catch (error) {
      console.error('Failed to get chat personas JSON:', error);
      return {};
    }
  }
  
  async updateChatPersonasJSON(personas: ChatPersonasJSON): Promise<void> {
    try {
      await this.storeEncrypted(this.CHAT_PERSONAS_JSON_KEY, personas);
      console.log('🎭 Chat personas JSON updated');
    } catch (error) {
      console.error('Failed to update chat personas JSON:', error);
      throw error;
    }
  }
  
  async getStyleProfileJSON(): Promise<StyleProfileJSON | null> {
    try {
      return await this.getEncrypted(this.STYLE_PROFILE_JSON_KEY);
    } catch (error) {
      console.error('Failed to get style profile JSON:', error);
      return null;
    }
  }
  
  async updateStyleProfileJSON(styleProfile: StyleProfileJSON): Promise<void> {
    try {
      await this.storeEncrypted(this.STYLE_PROFILE_JSON_KEY, styleProfile);
      console.log('🎨 Style profile JSON updated');
    } catch (error) {
      console.error('Failed to update style profile JSON:', error);
      throw error;
    }
  }
  
  // Server API calls (mock implementations)
  async fetchSocialPrerank(params: ServerEndpoints['socialPrerank']['params']): Promise<ServerEndpoints['socialPrerank']['response']> {
    try {
      console.log(`🌐 Fetching social prerank for slot: ${params.slot}`);
      
      // Mock server response - in production, this would be a real API call to /social/prerank
      const mockResponse: ServerEndpoints['socialPrerank']['response'] = [];
      
      // Return 50-100 items as specified in requirements
      const itemCount = Math.floor(Math.random() * 51) + 50; // 50-100 items
      
      for (let i = 0; i < itemCount; i++) {
        mockResponse.push({
          id: `${params.slot}_${i}_${Date.now()}`,
          type: params.slot,
          title: `Sample ${params.slot} content ${i}`,
          author: `author_${i % 10}`,
          category: ['tech', 'lifestyle', 'entertainment', 'sports', 'photography', 'cooking', 'puzzle'][i % 7],
          tags: [`tag${i % 5}`, `category_${params.slot}`, 'trending'],
          engagement: Math.random() * 0.8 + 0.2,
          timestamp: Date.now() - (i * 3600000),
          serverScore: Math.random() * 0.9 + 0.1
        });
      }
      
      // Sort by server score (pre-ranking)
      mockResponse.sort((a, b) => b.serverScore - a.serverScore);
      
      console.log(`✅ Fetched ${mockResponse.length} pre-ranked items for ${params.slot}`);
      return mockResponse;
    } catch (error) {
      console.error('Failed to fetch social prerank:', error);
      return [];
    }
  }
  
  async fetchPoliciesCurrent(params: ServerEndpoints['policiesCurrent']['params'] = {}): Promise<ServerEndpoints['policiesCurrent']['response']> {
    try {
      console.log('🔒 Fetching current policies');
      
      // Mock signed policies response
      return {
        version: '1.0.0',
        policies: {
          contentModeration: { enabled: true, strictness: 0.7 },
          privacySettings: { dataRetention: 30, anonymization: true },
          recommendationLimits: { maxLatency: 120, maxMemory: 30 }
        },
        signature: 'mock_signature_' + Date.now(),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to fetch policies:', error);
      throw error;
    }
  }
  
  async fetchTrends(params: ServerEndpoints['trends']['params'] = {}): Promise<ServerEndpoints['trends']['response']> {
    try {
      console.log('📈 Fetching trends');
      
      // Mock trends response
      return [
        {
          category: 'social',
          trend: 'short_videos',
          score: 0.85,
          region: params.region || 'MENA',
          timestamp: Date.now()
        },
        {
          category: 'games',
          trend: 'puzzle_games',
          score: 0.72,
          region: params.region || 'MENA',
          timestamp: Date.now()
        },
        {
          category: 'tech',
          trend: 'ai_tools',
          score: 0.68,
          region: params.region || 'MENA',
          timestamp: Date.now()
        }
      ];
    } catch (error) {
      console.error('Failed to fetch trends:', error);
      return [];
    }
  }
  
  // Clear all local data
  async clearAllData(): Promise<void> {
    try {
      const keys = [
        this.SIGNALS_DB_KEY,
        this.PROFILE_JSON_KEY,
        this.CHAT_PERSONAS_JSON_KEY,
        this.STYLE_PROFILE_JSON_KEY
      ];
      
      for (const key of keys) {
        if (Platform.OS === 'web') {
          await AsyncStorage.removeItem(key);
        } else {
          await SecureStore.deleteItemAsync(key);
        }
      }
      
      console.log('🗑️ All data layout storage cleared');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }
  
  // Private helper methods
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

export default DataLayoutService;