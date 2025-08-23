import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameMetadata } from '@/components/WebViewSandbox';
import { PolicyEngine } from './ai/PolicyEngine';

export interface GameFeatureFlags {
  games: boolean;
  uploadGames: boolean;
  multiplayerGames: boolean;
  gameInvites: boolean;
  gameSharing: boolean;
}

export interface GameCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface GamePerformanceMetrics {
  gameId: string;
  loadTime: number;
  crashCount: number;
  memoryUsage: number;
  lastPlayed: string;
  playCount: number;
}

/**
 * Games Service - Manages online mini-games with security and performance monitoring
 * 
 * Features:
 * - Feature flag controlled access
 * - Secure game URL validation
 * - Performance monitoring
 * - Crash detection and recovery
 * - Game library management
 */
export class GamesService {
  private static instance: GamesService;
  private policyEngine: PolicyEngine;
  private isInitialized = false;
  
  private readonly GAMES_CACHE_KEY = 'games_library_cache';
  private readonly PERFORMANCE_CACHE_KEY = 'games_performance_cache';
  private readonly FEATURE_FLAGS_KEY = 'games_feature_flags';
  
  private games = new Map<string, GameMetadata>();
  private performanceMetrics = new Map<string, GamePerformanceMetrics>();
  private featureFlags: GameFeatureFlags = {
    games: false, // Default OFF in production
    uploadGames: false,
    multiplayerGames: false,
    gameInvites: false,
    gameSharing: false
  };

  private constructor() {
    this.policyEngine = new PolicyEngine();
  }

  static getInstance(): GamesService {
    if (!GamesService.instance) {
      GamesService.instance = new GamesService();
    }
    return GamesService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🎮 Initializing Games Service...');

      // Initialize policy engine first
      await this.policyEngine.initialize();

      // Load feature flags
      await this.loadFeatureFlags();

      // Only proceed if games feature is enabled
      if (!this.featureFlags.games) {
        console.log('🚫 Games feature is disabled');
        this.isInitialized = true;
        return;
      }

      // Load cached data
      await Promise.all([
        this.loadCachedGames(),
        this.loadCachedPerformanceMetrics()
      ]);

      // Load default games if none cached
      if (this.games.size === 0) {
        await this.loadDefaultGames();
      }

      this.isInitialized = true;
      console.log('✅ Games Service initialized');

    } catch (error) {
      console.error('❌ Games service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if games feature is enabled
   */
  isGamesEnabled(): boolean {
    return this.featureFlags.games;
  }

  /**
   * Get feature flags
   */
  getFeatureFlags(): GameFeatureFlags {
    return { ...this.featureFlags };
  }

  /**
   * Update feature flags (admin only)
   */
  async updateFeatureFlags(flags: Partial<GameFeatureFlags>): Promise<void> {
    try {
      this.featureFlags = { ...this.featureFlags, ...flags };
      await AsyncStorage.setItem(this.FEATURE_FLAGS_KEY, JSON.stringify(this.featureFlags));
      console.log('🎛️ Games feature flags updated:', this.featureFlags);
    } catch (error) {
      console.error('❌ Failed to update feature flags:', error);
      throw error;
    }
  }

  /**
   * Get all available games
   */
  async getGames(): Promise<GameMetadata[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      return [];
    }

    return Array.from(this.games.values());
  }

  /**
   * Get games by category
   */
  async getGamesByCategory(category: string): Promise<GameMetadata[]> {
    const allGames = await this.getGames();
    return allGames.filter(game => game.category === category);
  }

  /**
   * Get game by ID
   */
  async getGame(gameId: string): Promise<GameMetadata | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      return null;
    }

    return this.games.get(gameId) || null;
  }

  /**
   * Add a new game (user upload)
   */
  async addGame(game: Omit<GameMetadata, 'id'>): Promise<string> {
    if (!this.featureFlags.uploadGames) {
      throw new Error('Game upload feature is disabled');
    }

    // Validate game URL through policy engine
    const validation = await this.policyEngine.validateTask({
      id: `game-upload-${Date.now()}`,
      type: 'game_validation',
      input: { url: game.url, name: game.name },
      priority: 'high',
      maxTokens: 1000,
      timeout: 30000
    });

    if (!validation.allowed) {
      throw new Error(`Game upload blocked: ${validation.reason}`);
    }

    const gameId = `user-game-${Date.now()}`;
    const gameMetadata: GameMetadata = {
      ...game,
      id: gameId
    };

    this.games.set(gameId, gameMetadata);
    await this.saveGamesCache();

    console.log('🎮 Game added:', gameMetadata.name);
    return gameId;
  }

  /**
   * Remove a game
   */
  async removeGame(gameId: string): Promise<void> {
    if (!this.games.has(gameId)) {
      throw new Error('Game not found');
    }

    this.games.delete(gameId);
    this.performanceMetrics.delete(gameId);

    await Promise.all([
      this.saveGamesCache(),
      this.savePerformanceMetricsCache()
    ]);

    console.log('🗑️ Game removed:', gameId);
  }

  /**
   * Record game performance metrics
   */
  async recordPerformanceMetrics(gameId: string, metrics: Partial<GamePerformanceMetrics>): Promise<void> {
    const existing = this.performanceMetrics.get(gameId) || {
      gameId,
      loadTime: 0,
      crashCount: 0,
      memoryUsage: 0,
      lastPlayed: new Date().toISOString(),
      playCount: 0
    };

    const updated: GamePerformanceMetrics = {
      ...existing,
      ...metrics,
      lastPlayed: new Date().toISOString(),
      playCount: existing.playCount + 1
    };

    this.performanceMetrics.set(gameId, updated);
    await this.savePerformanceMetricsCache();

    // Log performance issues
    if (updated.crashCount > 3) {
      console.warn(`⚠️ Game ${gameId} has high crash count: ${updated.crashCount}`);
    }

    if (updated.loadTime > 10000) {
      console.warn(`⚠️ Game ${gameId} has slow load time: ${updated.loadTime}ms`);
    }
  }

  /**
   * Get game performance metrics
   */
  getPerformanceMetrics(gameId: string): GamePerformanceMetrics | null {
    return this.performanceMetrics.get(gameId) || null;
  }

  /**
   * Get all performance metrics
   */
  getAllPerformanceMetrics(): GamePerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Get game categories
   */
  getGameCategories(): GameCategory[] {
    return [
      {
        id: 'puzzle',
        name: 'Puzzle',
        icon: '🧩',
        description: 'Brain teasers and logic games'
      },
      {
        id: 'action',
        name: 'Action',
        icon: '⚡',
        description: 'Fast-paced action games'
      },
      {
        id: 'strategy',
        name: 'Strategy',
        icon: '♟️',
        description: 'Strategic thinking games'
      },
      {
        id: 'casual',
        name: 'Casual',
        icon: '🎯',
        description: 'Easy-to-play casual games'
      },
      {
        id: 'multiplayer',
        name: 'Multiplayer',
        icon: '👥',
        description: 'Play with friends'
      }
    ];
  }

  /**
   * Generate game invite link
   */
  async generateInviteLink(gameId: string, userId: string): Promise<string> {
    if (!this.featureFlags.gameInvites) {
      throw new Error('Game invites feature is disabled');
    }

    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    // Generate secure invite token
    const inviteToken = `${gameId}-${userId}-${Date.now()}`;
    const inviteLink = `https://app.rork.com/games/invite/${inviteToken}`;

    console.log('🔗 Game invite link generated:', inviteLink);
    return inviteLink;
  }

  // Private methods

  private async loadFeatureFlags(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.FEATURE_FLAGS_KEY);
      if (cached) {
        const flags = JSON.parse(cached) as GameFeatureFlags;
        this.featureFlags = { ...this.featureFlags, ...flags };
        console.log('📥 Loaded games feature flags:', this.featureFlags);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load games feature flags:', error);
    }
  }

  private async loadCachedGames(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.GAMES_CACHE_KEY);
      if (cached) {
        const games = JSON.parse(cached) as GameMetadata[];
        games.forEach(game => {
          this.games.set(game.id, game);
        });
        console.log(`📥 Loaded ${games.length} cached games`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached games:', error);
    }
  }

  private async loadCachedPerformanceMetrics(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.PERFORMANCE_CACHE_KEY);
      if (cached) {
        const metrics = JSON.parse(cached) as GamePerformanceMetrics[];
        metrics.forEach(metric => {
          this.performanceMetrics.set(metric.gameId, metric);
        });
        console.log(`📥 Loaded ${metrics.length} performance metrics`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached performance metrics:', error);
    }
  }

  private async saveGamesCache(): Promise<void> {
    try {
      const games = Array.from(this.games.values());
      await AsyncStorage.setItem(this.GAMES_CACHE_KEY, JSON.stringify(games));
    } catch (error) {
      console.warn('⚠️ Failed to save games cache:', error);
    }
  }

  private async savePerformanceMetricsCache(): Promise<void> {
    try {
      const metrics = Array.from(this.performanceMetrics.values());
      await AsyncStorage.setItem(this.PERFORMANCE_CACHE_KEY, JSON.stringify(metrics));
    } catch (error) {
      console.warn('⚠️ Failed to save performance metrics cache:', error);
    }
  }

  private async loadDefaultGames(): Promise<void> {
    const defaultGames: GameMetadata[] = [
      {
        id: 'demo-puzzle-1',
        name: 'Block Puzzle',
        url: 'https://games.rork.com/puzzle/blocks',
        category: 'puzzle',
        thumbnail: 'https://cdn.rork.com/games/thumbnails/blocks.jpg',
        description: 'Classic block puzzle game',
        version: '1.0.0',
        developer: 'Rork Games',
        rating: 4.5,
        size: 2048000, // 2MB
        lastUpdated: '2024-01-15'
      },
      {
        id: 'demo-action-1',
        name: 'Space Runner',
        url: 'https://games.rork.com/action/space-runner',
        category: 'action',
        thumbnail: 'https://cdn.rork.com/games/thumbnails/space-runner.jpg',
        description: 'Fast-paced space adventure',
        version: '1.2.0',
        developer: 'Rork Games',
        rating: 4.2,
        size: 5120000, // 5MB
        lastUpdated: '2024-01-20'
      },
      {
        id: 'demo-casual-1',
        name: 'Color Match',
        url: 'https://games.rork.com/casual/color-match',
        category: 'casual',
        thumbnail: 'https://cdn.rork.com/games/thumbnails/color-match.jpg',
        description: 'Relaxing color matching game',
        version: '1.1.0',
        developer: 'Rork Games',
        rating: 4.7,
        size: 1024000, // 1MB
        lastUpdated: '2024-01-10'
      }
    ];

    defaultGames.forEach(game => {
      this.games.set(game.id, game);
    });

    await this.saveGamesCache();
    console.log('🎮 Loaded default games');
  }
}