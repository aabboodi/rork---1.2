import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SocialSignal {
  id: string;
  type: 'post' | 'video' | 'voice' | 'game';
  action: 'view' | 'like' | 'swipe' | 'dwell' | 'mute' | 'report';
  contentId: string;
  timestamp: number;
  duration?: number; // for dwell time
  metadata?: {
    category?: string;
    tags?: string[];
    author?: string;
    engagement?: number;
  };
}

export interface GeoTemporalSignal {
  id: string;
  timestamp: number;
  cityLevel: string; // anonymized to city level
  timezone: string;
  sessionDuration: number;
  activityType: 'social' | 'chat' | 'wallet' | 'game';
}

export interface TrendData {
  category: string;
  trend: string;
  score: number;
  region: string;
  timestamp: number;
}

class PersonalizationSignalsService {
  private static instance: PersonalizationSignalsService;
  private readonly STORAGE_KEY = 'personalization_signals';
  private readonly GEO_STORAGE_KEY = 'geo_temporal_signals';
  private readonly SIGNALS_DB_KEY = 'signals_db'; // Per-slot events database
  private readonly PROFILE_KEY = 'profile_json'; // User profile with vectors and timestamps
  private readonly MAX_SIGNALS = 10000; // Limit storage
  private readonly ENCRYPTION_KEY = 'personalization_encryption_key';
  private readonly EMA_ALPHA = 0.1; // Exponential Moving Average factor
  private readonly TOPIC_DECAY_DAYS = 30; // Topic decay period

  private constructor() {}

  static getInstance(): PersonalizationSignalsService {
    if (!PersonalizationSignalsService.instance) {
      PersonalizationSignalsService.instance = new PersonalizationSignalsService();
    }
    return PersonalizationSignalsService.instance;
  }

  // Record social interaction signals
  async recordSocialSignal(signal: Omit<SocialSignal, 'id' | 'timestamp'>): Promise<void> {
    try {
      const fullSignal: SocialSignal = {
        ...signal,
        id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      };

      // Store in main signals array
      const existingSignals = await this.getSocialSignals();
      const updatedSignals = [...existingSignals, fullSignal]
        .slice(-this.MAX_SIGNALS); // Keep only recent signals

      await this.storeEncrypted(this.STORAGE_KEY, updatedSignals);
      
      // Store in per-slot database
      await this.storeSignalInDB(fullSignal, signal.type);
      
      // Update user profile with EMA
      await this.updateUserProfile(fullSignal);
      
      console.log(`📊 Recorded ${signal.action} signal for ${signal.type} content:`, signal.contentId);
    } catch (error) {
      console.error('Failed to record social signal:', error);
    }
  }

  // Record geo-temporal signals (anonymized)
  async recordGeoTemporalSignal(activityType: GeoTemporalSignal['activityType'], sessionDuration: number): Promise<void> {
    try {
      // Get anonymized location (city level only)
      const cityLevel = await this.getAnonymizedLocation();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const signal: GeoTemporalSignal = {
        id: `geo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        cityLevel,
        timezone,
        sessionDuration,
        activityType
      };

      const existingSignals = await this.getGeoTemporalSignals();
      const updatedSignals = [...existingSignals, signal]
        .slice(-this.MAX_SIGNALS);

      await this.storeEncrypted(this.GEO_STORAGE_KEY, updatedSignals);
      
      console.log(`🌍 Recorded geo-temporal signal for ${activityType}:`, cityLevel);
    } catch (error) {
      console.error('Failed to record geo-temporal signal:', error);
    }
  }

  // Get social signals for analysis
  async getSocialSignals(): Promise<SocialSignal[]> {
    try {
      return await this.getEncrypted(this.STORAGE_KEY) || [];
    } catch (error) {
      console.error('Failed to get social signals:', error);
      return [];
    }
  }

  // Get geo-temporal signals
  async getGeoTemporalSignals(): Promise<GeoTemporalSignal[]> {
    try {
      return await this.getEncrypted(this.GEO_STORAGE_KEY) || [];
    } catch (error) {
      console.error('Failed to get geo-temporal signals:', error);
      return [];
    }
  }

  // Get aggregated trends from server (mock implementation)
  async getTrends(): Promise<TrendData[]> {
    try {
      // In a real implementation, this would fetch from server
      // For now, return mock trending data
      return [
        {
          category: 'social',
          trend: 'short_videos',
          score: 0.85,
          region: 'MENA',
          timestamp: Date.now()
        },
        {
          category: 'games',
          trend: 'puzzle_games',
          score: 0.72,
          region: 'MENA',
          timestamp: Date.now()
        },
        {
          category: 'chat',
          trend: 'voice_messages',
          score: 0.68,
          region: 'MENA',
          timestamp: Date.now()
        }
      ];
    } catch (error) {
      console.error('Failed to get trends:', error);
      return [];
    }
  }

  // Update user profile with EMA + decay for old topics
  async updateUserProfile(signal: SocialSignal): Promise<void> {
    try {
      const profile = await this.getUserProfile();
      const now = Date.now();
      
      // Apply topic decay
      Object.keys(profile.topicVectors).forEach(topic => {
        const daysSinceUpdate = (now - profile.topicVectors[topic].lastUpdate) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > this.TOPIC_DECAY_DAYS) {
          const decayFactor = Math.exp(-daysSinceUpdate / this.TOPIC_DECAY_DAYS);
          profile.topicVectors[topic].weight *= decayFactor;
        }
      });
      
      // Update with new signal using EMA
      if (signal.metadata?.category) {
        const category = signal.metadata.category;
        if (!profile.topicVectors[category]) {
          profile.topicVectors[category] = { weight: 0, lastUpdate: now };
        }
        
        const currentWeight = profile.topicVectors[category].weight;
        const signalWeight = this.getSignalWeight(signal.action);
        profile.topicVectors[category].weight = (1 - this.EMA_ALPHA) * currentWeight + this.EMA_ALPHA * signalWeight;
        profile.topicVectors[category].lastUpdate = now;
      }
      
      profile.lastUpdated = now;
      await this.storeEncrypted(this.PROFILE_KEY, profile);
      
      console.log('📈 User profile updated with EMA and decay');
    } catch (error) {
      console.error('Failed to update user profile:', error);
    }
  }

  // Get user profile with vectors and timestamps
  async getUserProfile(): Promise<{
    topicVectors: Record<string, { weight: number; lastUpdate: number }>;
    preferences: Record<string, number>;
    lastUpdated: number;
  }> {
    try {
      const stored = await this.getEncrypted(this.PROFILE_KEY);
      return stored || {
        topicVectors: {},
        preferences: {},
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return {
        topicVectors: {},
        preferences: {},
        lastUpdated: Date.now()
      };
    }
  }

  // Store signals in database-like structure per slot
  async storeSignalInDB(signal: SocialSignal, slot: 'post' | 'video' | 'voice' | 'game'): Promise<void> {
    try {
      const signalsDB = await this.getSignalsDB();
      
      if (!signalsDB[slot]) {
        signalsDB[slot] = [];
      }
      
      signalsDB[slot].push({
        ...signal,
        timestamp: Date.now(),
        sessionId: this.getCurrentSessionId()
      });
      
      // Keep only recent signals per slot
      signalsDB[slot] = signalsDB[slot]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.MAX_SIGNALS / 4); // Distribute across slots
      
      await this.storeEncrypted(this.SIGNALS_DB_KEY, signalsDB);
      console.log(`💾 Signal stored in ${slot} slot database`);
    } catch (error) {
      console.error('Failed to store signal in DB:', error);
    }
  }

  // Get signals database
  async getSignalsDB(): Promise<Record<string, (SocialSignal & { sessionId: string })[]>> {
    try {
      return await this.getEncrypted(this.SIGNALS_DB_KEY) || {
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

  // Get personalization insights (local analysis)
  async getPersonalizationInsights(): Promise<{
    topCategories: string[];
    preferredTimes: string[];
    engagementPatterns: { type: string; score: number }[];
  }> {
    try {
      const socialSignals = await this.getSocialSignals();
      const geoSignals = await this.getGeoTemporalSignals();

      // Analyze top categories
      const categoryCount: Record<string, number> = {};
      socialSignals.forEach(signal => {
        if (signal.action === 'like' || signal.action === 'view') {
          categoryCount[signal.type] = (categoryCount[signal.type] || 0) + 1;
        }
      });

      const topCategories = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category);

      // Analyze preferred times
      const hourCount: Record<number, number> = {};
      geoSignals.forEach(signal => {
        const hour = new Date(signal.timestamp).getHours();
        hourCount[hour] = (hourCount[hour] || 0) + 1;
      });

      const preferredHours = Object.entries(hourCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => {
          const h = parseInt(hour);
          if (h < 12) return 'morning';
          if (h < 17) return 'afternoon';
          return 'evening';
        });

      // Analyze engagement patterns
      const engagementPatterns = Object.entries(categoryCount)
        .map(([type, count]) => ({
          type,
          score: Math.min(count / Math.max(...Object.values(categoryCount)), 1)
        }));

      return {
        topCategories,
        preferredTimes: [...new Set(preferredHours)],
        engagementPatterns
      };
    } catch (error) {
      console.error('Failed to get personalization insights:', error);
      return {
        topCategories: [],
        preferredTimes: [],
        engagementPatterns: []
      };
    }
  }

  // Clear all signals (for privacy)
  async clearAllSignals(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(this.STORAGE_KEY);
        await AsyncStorage.removeItem(this.GEO_STORAGE_KEY);
      } else {
        await SecureStore.deleteItemAsync(this.STORAGE_KEY);
        await SecureStore.deleteItemAsync(this.GEO_STORAGE_KEY);
      }
      console.log('🗑️ All personalization signals cleared');
    } catch (error) {
      console.error('Failed to clear signals:', error);
    }
  }

  // Private helper methods
  private async storeEncrypted(key: string, data: any): Promise<void> {
    const jsonData = JSON.stringify(data);
    
    if (Platform.OS === 'web') {
      // Use AsyncStorage for web (less secure but functional)
      await AsyncStorage.setItem(key, jsonData);
    } else {
      // Use SecureStore for native platforms
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

  private async getAnonymizedLocation(): Promise<string> {
    try {
      // In a real implementation, this would use location services
      // For privacy, we only store city-level information
      // For now, return a mock city
      return 'Riyadh'; // Mock city-level location
    } catch (error) {
      console.error('Failed to get location:', error);
      return 'Unknown';
    }
  }

  private getSignalWeight(action: SocialSignal['action']): number {
    switch (action) {
      case 'like': return 1.0;
      case 'view': return 0.3;
      case 'dwell': return 0.5;
      case 'swipe': return -0.1;
      case 'mute': return -0.5;
      case 'report': return -1.0;
      default: return 0;
    }
  }

  private getCurrentSessionId(): string {
    // Generate or retrieve current session ID
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default PersonalizationSignalsService;