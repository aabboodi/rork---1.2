import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameMetadata } from '@/components/WebViewSandbox';
import { PolicyEngine } from './ai/PolicyEngine';
import { GamesRegistryService, GameSearchParams, GameRegistryResponse } from './GamesRegistryService';
import { GamesSessionService, GameSession, CreateSessionRequest, JoinSessionRequest, SessionResponse } from './GamesSessionService';
import { GamesInviteService, GameInvite, CreateInviteRequest, InviteResponse, DeepLinkData } from './GamesInviteService';
import { GamesUploadService, GameUploadRequest, GameUploadResponse, GameReviewStatus } from './GamesUploadService';
import { GamesLeaderboardService, ScoreSubmissionRequest, ScoreSubmissionResponse, Leaderboard, GameScore } from './GamesLeaderboardService';

export interface GameFeatureFlags {
  games: boolean;
  uploadGames: boolean;
  multiplayerGames: boolean;
  gameInvites: boolean;
  gameSharing: boolean;
  leaderboards: boolean;
  antiCheat: boolean;
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
  batteryDrain?: number;
  thermalState?: 'normal' | 'fair' | 'serious' | 'critical';
  networkUsage?: number;
  averageSessionDuration?: number;
  userRating?: number;
}

export interface GameTag {
  id: string;
  name: string;
  color: string;
  category: 'genre' | 'feature' | 'difficulty' | 'theme';
}

export interface GameAnalytics {
  gameId: string;
  totalPlays: number;
  uniquePlayers: number;
  averageRating: number;
  popularityScore: number;
  retentionRate: number;
  crashRate: number;
  lastAnalyzed: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  weight: number;
  config: Record<string, any>;
}

export interface ABTestExperiment {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  isActive: boolean;
  startDate: string;
  endDate?: string;
  targetMetric: string;
}

export interface PrefetchConfig {
  enabled: boolean;
  maxConcurrent: number;
  maxCacheSize: number; // in MB
  popularityThreshold: number;
  wifiOnly: boolean;
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
  private registryService: GamesRegistryService;
  private sessionService: GamesSessionService;
  private inviteService: GamesInviteService;
  private uploadService: GamesUploadService;
  private leaderboardService: GamesLeaderboardService;
  private isInitialized = false;
  
  private readonly GAMES_CACHE_KEY = 'games_library_cache';
  private readonly PERFORMANCE_CACHE_KEY = 'games_performance_cache';
  private readonly FEATURE_FLAGS_KEY = 'games_feature_flags';
  
  private games = new Map<string, GameMetadata>();
  private performanceMetrics = new Map<string, GamePerformanceMetrics>();
  private featureFlags: GameFeatureFlags = {
    games: true, // Enable for Phase 0 testing
    uploadGames: true, // Enable for Phase 3
    multiplayerGames: true, // Enable for Phase 2
    gameInvites: true, // Enable for Phase 2
    gameSharing: true, // Enable for Phase 2
    leaderboards: true, // Enable for Phase 4
    antiCheat: true // Enable for Phase 4
  };

  // Phase 5: Enhanced UX and Performance
  private gameAnalytics = new Map<string, GameAnalytics>();
  private gameTags = new Map<string, GameTag[]>();
  private prefetchQueue = new Set<string>();
  private prefetchConfig: PrefetchConfig = {
    enabled: true,
    maxConcurrent: 2,
    maxCacheSize: 50, // 50MB
    popularityThreshold: 0.7,
    wifiOnly: true
  };
  private abTestExperiments = new Map<string, ABTestExperiment>();
  private userVariants = new Map<string, string>(); // experimentId -> variantId
  
  private readonly ANALYTICS_CACHE_KEY = 'games_analytics_cache';
  private readonly TAGS_CACHE_KEY = 'games_tags_cache';
  private readonly AB_TEST_CACHE_KEY = 'games_ab_test_cache';
  private readonly PREFETCH_CACHE_KEY = 'games_prefetch_cache';

  private constructor() {
    this.policyEngine = new PolicyEngine();
    this.registryService = GamesRegistryService.getInstance();
    this.sessionService = GamesSessionService.getInstance();
    this.inviteService = GamesInviteService.getInstance();
    this.uploadService = GamesUploadService.getInstance();
    this.leaderboardService = GamesLeaderboardService.getInstance();
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

      // Initialize all services
      await Promise.all([
        this.policyEngine.initialize(),
        this.registryService.initialize(),
        this.sessionService.initialize(),
        this.inviteService.initialize(),
        this.uploadService.initialize(),
        this.leaderboardService.initialize()
      ]);

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
        this.loadCachedPerformanceMetrics(),
        this.loadCachedAnalytics(),
        this.loadCachedTags(),
        this.loadCachedABTests()
      ]);

      // Load games from registry service
      await this.syncWithRegistry();

      // Initialize Phase 5 features
      if (this.featureFlags.games) {
        await this.initializePhase5Features();
      }

      this.isInitialized = true;
      console.log('✅ Games Service initialized with Phase 5 features');

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
   * Get all available games with search and pagination
   */
  async getGames(params: GameSearchParams = {}): Promise<GameRegistryResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      return {
        games: [],
        total: 0,
        page: 1,
        hasMore: false
      };
    }

    try {
      // Get games from registry service
      const response = await this.registryService.getGames(params);
      
      // Update local cache with registry games
      response.games.forEach(game => {
        this.games.set(game.id, game);
      });
      
      await this.saveGamesCache();
      
      console.log(`🎮 Retrieved ${response.games.length} games from registry`);
      return response;
      
    } catch (error) {
      console.error('❌ Failed to get games from registry:', error);
      
      // Fallback to cached games
      const cachedGames = Array.from(this.games.values());
      return {
        games: cachedGames,
        total: cachedGames.length,
        page: 1,
        hasMore: false
      };
    }
  }

  /**
   * Get all available games (legacy method for backward compatibility)
   */
  async getAllGames(): Promise<GameMetadata[]> {
    const response = await this.getGames({ limit: 100 });
    return response.games;
  }

  /**
   * Get games by category
   */
  async getGamesByCategory(category: string): Promise<GameMetadata[]> {
    const allGames = await this.getGames();
    return allGames.filter(game => game.category === category);
  }

  /**
   * Get game by ID with secure URL
   */
  async getGame(gameId: string): Promise<GameMetadata | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      return null;
    }

    try {
      // Get secure game from registry service
      const secureGame = await this.registryService.getGame(gameId);
      
      if (secureGame) {
        // Update local cache
        this.games.set(gameId, secureGame);
        await this.saveGamesCache();
        
        console.log(`🔐 Retrieved secure game: ${secureGame.name}`);
        return secureGame;
      }
      
      // Fallback to cached game
      return this.games.get(gameId) || null;
      
    } catch (error) {
      console.error(`❌ Failed to get secure game ${gameId}:`, error);
      return this.games.get(gameId) || null;
    }
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
   * Create a game session
   */
  async createGameSession(gameId: string, hostUserId: string, options?: { maxPlayers?: number; settings?: Record<string, any> }): Promise<SessionResponse> {
    if (!this.featureFlags.multiplayerGames) {
      throw new Error('Multiplayer games feature is disabled');
    }

    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const request: CreateSessionRequest = {
      gameId,
      gameVersion: game.version,
      maxPlayers: options?.maxPlayers || 4,
      settings: options?.settings
    };

    return await this.sessionService.createSession(request, hostUserId);
  }

  /**
   * Join a game session
   */
  async joinGameSession(sessionId: string, userId: string): Promise<SessionResponse> {
    if (!this.featureFlags.multiplayerGames) {
      throw new Error('Multiplayer games feature is disabled');
    }

    const request: JoinSessionRequest = {
      sessionId,
      userId
    };

    return await this.sessionService.joinSession(request);
  }

  /**
   * Leave a game session
   */
  async leaveGameSession(sessionId: string, userId: string): Promise<void> {
    return await this.sessionService.leaveSession(sessionId, userId);
  }

  /**
   * Get user's active game sessions
   */
  async getUserGameSessions(userId: string): Promise<GameSession[]> {
    return await this.sessionService.getUserSessions(userId);
  }

  /**
   * Create game invite
   */
  async createGameInvite(sessionId: string, hostUserId: string, hostName: string, scope: 'private' | 'followers' | 'public' = 'private', customMessage?: string): Promise<InviteResponse> {
    if (!this.featureFlags.gameInvites) {
      throw new Error('Game invites feature is disabled');
    }

    // Get session info
    const session = await this.sessionService.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Get game info
    const game = await this.getGame(session.gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const request: CreateInviteRequest = {
      sessionId,
      scope,
      customMessage
    };

    const gameData = {
      id: game.id,
      name: game.name,
      maxPlayers: session.maxPlayers,
      currentPlayers: session.currentPlayers.length
    };

    return await this.inviteService.createInvite(request, hostUserId, hostName, gameData);
  }

  /**
   * Handle deep link for game invite
   */
  async handleGameInviteDeepLink(url: string, userId: string): Promise<{ session: GameSession; game: GameMetadata } | null> {
    try {
      const deepLinkData = this.inviteService.parseDeepLink(url);
      if (!deepLinkData || deepLinkData.type !== 'game_invite') {
        return null;
      }

      // Get invite
      const invite = await this.inviteService.getInvite(deepLinkData.inviteId);
      if (!invite) {
        throw new Error('Invite not found or expired');
      }

      // Join session
      const sessionResponse = await this.joinGameSession(deepLinkData.sessionId, userId);
      
      // Get game info
      const game = await this.getGame(deepLinkData.gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      console.log(`🎮 User ${userId} joined session via invite: ${deepLinkData.sessionId}`);
      
      return {
        session: sessionResponse.session,
        game
      };

    } catch (error) {
      console.error('❌ Failed to handle game invite deep link:', error);
      throw error;
    }
  }

  /**
   * Generate share text for game invite
   */
  generateGameInviteShareText(invite: GameInvite, platform: 'chat' | 'social' | 'generic' = 'generic'): string {
    if (!this.featureFlags.gameSharing) {
      throw new Error('Game sharing feature is disabled');
    }

    return this.inviteService.generateShareTextForPlatform(invite, platform);
  }

  /**
   * Get session by room code
   */
  async getSessionByRoomCode(roomCode: string): Promise<GameSession | null> {
    return await this.sessionService.getSessionByRoomCode(roomCode);
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

  /**
   * Sync local cache with registry service
   */
  private async syncWithRegistry(): Promise<void> {
    try {
      console.log('🔄 Syncing games with registry service...');
      
      // Get latest games from registry
      const response = await this.registryService.getGames({ limit: 50 });
      
      // Update local cache
      this.games.clear();
      response.games.forEach(game => {
        this.games.set(game.id, game);
      });
      
      await this.saveGamesCache();
      console.log(`✅ Synced ${response.games.length} games with registry`);
      
    } catch (error) {
      console.warn('⚠️ Failed to sync with registry, using cached games:', error);
      
      // Load cached games as fallback
      await this.loadCachedGames();
      
      // If still no games, load minimal defaults
      if (this.games.size === 0) {
        await this.loadMinimalDefaults();
      }
    }
  }

  /**
   * Load minimal default games for offline/fallback scenarios
   */
  private async loadMinimalDefaults(): Promise<void> {
    const minimalGames: GameMetadata[] = [
      {
        id: 'offline-demo-1',
        name: 'Demo Game',
        url: 'https://games.rork.com/demo/offline',
        category: 'demo',
        description: 'Offline demo game',
        version: '1.0.0',
        developer: 'Rork Games',
        rating: 4.0,
        size: 1024000,
        lastUpdated: '2024-01-01'
      }
    ];

    minimalGames.forEach(game => {
      this.games.set(game.id, game);
    });

    await this.saveGamesCache();
    console.log('🎮 Loaded minimal default games');
  }

  /**
   * Validate game integrity using registry service
   */
  async validateGameIntegrity(gameId: string, checksum: string): Promise<boolean> {
    try {
      return await this.registryService.validateGameIntegrity(gameId, checksum);
    } catch (error) {
      console.error(`❌ Game integrity validation failed for ${gameId}:`, error);
      return false;
    }
  }

  /**
   * Get CSP policy for game
   */
  getGameCSPPolicy(gameId: string): string {
    return this.registryService.getCSPPolicy(gameId);
  }

  /**
   * Get SRI hash for game
   */
  getGameSRIHash(gameId: string): string {
    return this.registryService.getSRIHash(gameId);
  }

  /**
   * Upload a new game (Phase 3)
   */
  async uploadGame(request: GameUploadRequest, userId: string): Promise<GameUploadResponse> {
    if (!this.featureFlags.uploadGames) {
      throw new Error('Game upload feature is disabled');
    }

    return await this.uploadService.uploadGame(request, userId);
  }

  /**
   * Get upload status
   */
  async getUploadStatus(gameId: string): Promise<GameReviewStatus | null> {
    if (!this.featureFlags.uploadGames) {
      return null;
    }

    return await this.uploadService.getUploadStatus(gameId);
  }

  /**
   * Get user uploads
   */
  async getUserUploads(userId: string): Promise<GameReviewStatus[]> {
    if (!this.featureFlags.uploadGames) {
      return [];
    }

    return await this.uploadService.getUserUploads(userId);
  }

  /**
   * Update game version
   */
  async updateGameVersion(gameId: string, versionData: {
    version: string;
    changelog: string;
    zipFile: GameUploadRequest['zipFile'];
  }, userId: string): Promise<any> {
    if (!this.featureFlags.uploadGames) {
      throw new Error('Game upload feature is disabled');
    }

    return await this.uploadService.updateGameVersion(gameId, versionData, userId);
  }

  /**
   * Get game versions
   */
  async getGameVersions(gameId: string): Promise<any[]> {
    if (!this.featureFlags.uploadGames) {
      return [];
    }

    return await this.uploadService.getGameVersions(gameId);
  }

  // Phase 4: Leaderboard and Anti-Cheat Methods

  /**
   * Submit a game score with anti-cheat validation
   */
  async submitGameScore(request: ScoreSubmissionRequest, userId: string, userName: string): Promise<ScoreSubmissionResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      throw new Error('Games feature is disabled');
    }

    try {
      console.log(`🎯 Submitting score for game ${request.gameId}: ${request.score}`);
      
      // Verify game exists
      const game = await this.getGame(request.gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      // Submit score through leaderboard service
      const response = await this.leaderboardService.submitScore(request, userId, userName);
      
      // Record performance metrics
      if (response.success) {
        await this.recordPerformanceMetrics(request.gameId, {
          lastPlayed: new Date().toISOString(),
          playCount: 1
        });
      }

      return response;

    } catch (error) {
      console.error('❌ Game score submission failed:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard for a game
   */
  async getGameLeaderboard(gameId: string, period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time', limit: number = 50): Promise<Leaderboard> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      throw new Error('Games feature is disabled');
    }

    return await this.leaderboardService.getLeaderboard(gameId, period, limit);
  }

  /**
   * Get user's rank in a game
   */
  async getUserGameRank(gameId: string, userId: string, period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time'): Promise<number | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      return null;
    }

    return await this.leaderboardService.getUserRank(gameId, userId, period);
  }

  /**
   * Get user's best score for a game
   */
  async getUserBestGameScore(gameId: string, userId: string): Promise<GameScore | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      return null;
    }

    return await this.leaderboardService.getUserBestScore(gameId, userId);
  }

  /**
   * Get user's score history for a game
   */
  async getUserGameScoreHistory(gameId: string, userId: string, limit: number = 20): Promise<GameScore[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      return [];
    }

    return await this.leaderboardService.getUserScoreHistory(gameId, userId, limit);
  }

  /**
   * Get flagged scores for review (admin only)
   */
  async getFlaggedGameScores(gameId?: string, limit: number = 50): Promise<GameScore[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      return [];
    }

    return await this.leaderboardService.getFlaggedScores(gameId, limit);
  }

  /**
   * Flag a score for manual review (admin only)
   */
  async flagGameScore(scoreId: string, reason: string, reviewerId: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      throw new Error('Games feature is disabled');
    }

    return await this.leaderboardService.flagScore(scoreId, reason, reviewerId);
  }

  /**
   * Approve a flagged score (admin only)
   */
  async approveGameScore(scoreId: string, reviewerId: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      throw new Error('Games feature is disabled');
    }

    return await this.leaderboardService.approveScore(scoreId, reviewerId);
  }

  /**
   * Reject a flagged score (admin only)
   */
  async rejectGameScore(scoreId: string, reason: string, reviewerId: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      throw new Error('Games feature is disabled');
    }

    return await this.leaderboardService.rejectScore(scoreId, reason, reviewerId);
  }

  /**
   * Get anomaly detection statistics for a game (admin only)
   */
  async getGameAnomalyStats(gameId: string): Promise<{
    totalScores: number;
    flaggedScores: number;
    rejectedScores: number;
    averageScore: number;
    standardDeviation: number;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      throw new Error('Games feature is disabled');
    }

    return await this.leaderboardService.getAnomalyStats(gameId);
  }

  /**
   * Get comprehensive game statistics
   */
  async getGameStats(gameId: string): Promise<{
    performance: GamePerformanceMetrics | null;
    anomalies: any;
    leaderboard: Leaderboard;
    totalPlayers: number;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.featureFlags.games) {
      throw new Error('Games feature is disabled');
    }

    try {
      const [performance, anomalies, leaderboard] = await Promise.all([
        Promise.resolve(this.getPerformanceMetrics(gameId)),
        this.leaderboardService.getAnomalyStats(gameId),
        this.leaderboardService.getLeaderboard(gameId, 'all-time', 100)
      ]);

      return {
        performance,
        anomalies,
        leaderboard,
        totalPlayers: leaderboard.totalEntries
      };

    } catch (error) {
      console.error(`❌ Failed to get game stats for ${gameId}:`, error);
      throw error;
    }
  }

  // Phase 5: UX Polish & Scale Methods

  /**
   * Initialize Phase 5 features
   */
  private async initializePhase5Features(): Promise<void> {
    try {
      console.log('🚀 Initializing Phase 5 features...');
      
      // Initialize game tags
      await this.initializeGameTags();
      
      // Initialize A/B test experiments
      await this.initializeABTests();
      
      // Start prefetching popular games
      if (this.prefetchConfig.enabled) {
        await this.startPrefetching();
      }
      
      // Initialize analytics collection
      await this.initializeAnalytics();
      
      console.log('✅ Phase 5 features initialized');
      
    } catch (error) {
      console.error('❌ Phase 5 initialization failed:', error);
    }
  }

  /**
   * Get games with enhanced search and filtering
   */
  async getGamesEnhanced(params: GameSearchParams & {
    tags?: string[];
    minRating?: number;
    maxSize?: number;
    includeAnalytics?: boolean;
  } = {}): Promise<GameRegistryResponse & {
    analytics?: Map<string, GameAnalytics>;
    recommendedTags?: GameTag[];
  }> {
    const baseResponse = await this.getGames(params);
    
    let filteredGames = baseResponse.games;
    
    // Apply enhanced filters
    if (params.tags && params.tags.length > 0) {
      filteredGames = filteredGames.filter(game => {
        const gameTags = this.gameTags.get(game.id) || [];
        return params.tags!.some(tag => gameTags.some(gt => gt.id === tag));
      });
    }
    
    if (params.minRating) {
      filteredGames = filteredGames.filter(game => (game.rating || 0) >= params.minRating!);
    }
    
    if (params.maxSize) {
      filteredGames = filteredGames.filter(game => (game.size || 0) <= params.maxSize!);
    }
    
    // Sort by popularity if no specific sort order
    if (!params.sortBy) {
      filteredGames.sort((a, b) => {
        const aAnalytics = this.gameAnalytics.get(a.id);
        const bAnalytics = this.gameAnalytics.get(b.id);
        return (bAnalytics?.popularityScore || 0) - (aAnalytics?.popularityScore || 0);
      });
    }
    
    const result: GameRegistryResponse & {
      analytics?: Map<string, GameAnalytics>;
      recommendedTags?: GameTag[];
    } = {
      ...baseResponse,
      games: filteredGames
    };
    
    if (params.includeAnalytics) {
      result.analytics = this.gameAnalytics;
      result.recommendedTags = this.getRecommendedTags(filteredGames);
    }
    
    return result;
  }

  /**
   * Get game tags for a specific game
   */
  getGameTags(gameId: string): GameTag[] {
    return this.gameTags.get(gameId) || [];
  }

  /**
   * Add tags to a game
   */
  async addGameTags(gameId: string, tags: GameTag[]): Promise<void> {
    const existingTags = this.gameTags.get(gameId) || [];
    const updatedTags = [...existingTags, ...tags];
    
    // Remove duplicates
    const uniqueTags = updatedTags.filter((tag, index, self) => 
      index === self.findIndex(t => t.id === tag.id)
    );
    
    this.gameTags.set(gameId, uniqueTags);
    await this.saveCachedTags();
    
    console.log(`🏷️ Added ${tags.length} tags to game ${gameId}`);
  }

  /**
   * Get all available tags
   */
  getAllTags(): GameTag[] {
    const allTags = new Map<string, GameTag>();
    
    this.gameTags.forEach(tags => {
      tags.forEach(tag => {
        allTags.set(tag.id, tag);
      });
    });
    
    return Array.from(allTags.values());
  }

  /**
   * Get game analytics
   */
  getGameAnalytics(gameId: string): GameAnalytics | null {
    return this.gameAnalytics.get(gameId) || null;
  }

  /**
   * Update game analytics
   */
  async updateGameAnalytics(gameId: string, analytics: Partial<GameAnalytics>): Promise<void> {
    const existing = this.gameAnalytics.get(gameId) || {
      gameId,
      totalPlays: 0,
      uniquePlayers: 0,
      averageRating: 0,
      popularityScore: 0,
      retentionRate: 0,
      crashRate: 0,
      lastAnalyzed: new Date().toISOString()
    };
    
    const updated: GameAnalytics = {
      ...existing,
      ...analytics,
      lastAnalyzed: new Date().toISOString()
    };
    
    this.gameAnalytics.set(gameId, updated);
    await this.saveCachedAnalytics();
    
    console.log(`📊 Updated analytics for game ${gameId}`);
  }

  /**
   * Get A/B test variant for user
   */
  getABTestVariant(experimentId: string, userId: string): ABTestVariant | null {
    const experiment = this.abTestExperiments.get(experimentId);
    if (!experiment || !experiment.isActive) {
      return null;
    }
    
    // Check if user already has a variant
    const existingVariant = this.userVariants.get(`${experimentId}:${userId}`);
    if (existingVariant) {
      return experiment.variants.find(v => v.id === existingVariant) || null;
    }
    
    // Assign new variant based on weights
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const variant of experiment.variants) {
      currentWeight += variant.weight;
      if (random <= currentWeight) {
        this.userVariants.set(`${experimentId}:${userId}`, variant.id);
        console.log(`🧪 Assigned variant ${variant.id} to user ${userId} for experiment ${experimentId}`);
        return variant;
      }
    }
    
    return experiment.variants[0]; // Fallback
  }

  /**
   * Record A/B test event
   */
  async recordABTestEvent(experimentId: string, userId: string, event: string, data?: any): Promise<void> {
    const variant = this.getABTestVariant(experimentId, userId);
    if (!variant) return;
    
    console.log(`📈 A/B Test Event: ${experimentId}/${variant.id}/${event}`, data);
    
    // In production, send to analytics service
    // await this.analyticsService.recordEvent({
    //   experiment: experimentId,
    //   variant: variant.id,
    //   event,
    //   userId,
    //   data,
    //   timestamp: new Date().toISOString()
    // });
  }

  /**
   * Prefetch popular games
   */
  async prefetchPopularGames(): Promise<void> {
    if (!this.prefetchConfig.enabled) return;
    
    try {
      console.log('🚀 Starting game prefetching...');
      
      // Get popular games based on analytics
      const popularGames = Array.from(this.gameAnalytics.values())
        .filter(analytics => analytics.popularityScore >= this.prefetchConfig.popularityThreshold)
        .sort((a, b) => b.popularityScore - a.popularityScore)
        .slice(0, this.prefetchConfig.maxConcurrent);
      
      // Prefetch games concurrently
      const prefetchPromises = popularGames.map(async (analytics) => {
        if (this.prefetchQueue.has(analytics.gameId)) return;
        
        this.prefetchQueue.add(analytics.gameId);
        
        try {
          const game = await this.getGame(analytics.gameId);
          if (game) {
            console.log(`📦 Prefetched game: ${game.name}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to prefetch game ${analytics.gameId}:`, error);
        } finally {
          this.prefetchQueue.delete(analytics.gameId);
        }
      });
      
      await Promise.all(prefetchPromises);
      console.log('✅ Game prefetching completed');
      
    } catch (error) {
      console.error('❌ Game prefetching failed:', error);
    }
  }

  /**
   * Monitor thermal state and battery usage
   */
  async monitorDeviceHealth(gameId: string): Promise<{
    thermalState: 'normal' | 'fair' | 'serious' | 'critical';
    batteryLevel: number;
    shouldThrottle: boolean;
  }> {
    // Mock implementation - in production, use native device APIs
    const mockThermalState: 'normal' | 'fair' | 'serious' | 'critical' = 'normal';
    const mockBatteryLevel = 0.8; // 80%
    
    const shouldThrottle = mockThermalState === 'serious' || mockThermalState === 'critical' || mockBatteryLevel < 0.2;
    
    if (shouldThrottle) {
      console.warn(`🔥 Device health warning for game ${gameId}: thermal=${mockThermalState}, battery=${mockBatteryLevel}`);
      
      // Record performance metrics
      await this.recordPerformanceMetrics(gameId, {
        thermalState: mockThermalState,
        batteryDrain: (1 - mockBatteryLevel) * 100
      });
    }
    
    return {
      thermalState: mockThermalState,
      batteryLevel: mockBatteryLevel,
      shouldThrottle
    };
  }

  /**
   * Get recommended games based on user behavior
   */
  async getRecommendedGames(userId: string, limit: number = 10): Promise<GameMetadata[]> {
    try {
      // Get user's play history
      const userMetrics = this.getAllPerformanceMetrics()
        .filter(metric => metric.playCount > 0)
        .sort((a, b) => b.playCount - a.playCount);
      
      if (userMetrics.length === 0) {
        // New user - recommend popular games
        const popularGames = Array.from(this.gameAnalytics.values())
          .sort((a, b) => b.popularityScore - a.popularityScore)
          .slice(0, limit)
          .map(analytics => this.games.get(analytics.gameId))
          .filter(Boolean) as GameMetadata[];
        
        return popularGames;
      }
      
      // Get user's preferred categories
      const playedGames = userMetrics.map(metric => this.games.get(metric.gameId)).filter(Boolean) as GameMetadata[];
      const categoryPreferences = new Map<string, number>();
      
      playedGames.forEach(game => {
        const count = categoryPreferences.get(game.category) || 0;
        categoryPreferences.set(game.category, count + 1);
      });
      
      // Get games from preferred categories that user hasn't played
      const playedGameIds = new Set(playedGames.map(g => g.id));
      const recommendations: GameMetadata[] = [];
      
      for (const [category, _] of Array.from(categoryPreferences.entries()).sort((a, b) => b[1] - a[1])) {
        const categoryGames = Array.from(this.games.values())
          .filter(game => game.category === category && !playedGameIds.has(game.id))
          .sort((a, b) => {
            const aAnalytics = this.gameAnalytics.get(a.id);
            const bAnalytics = this.gameAnalytics.get(b.id);
            return (bAnalytics?.popularityScore || 0) - (aAnalytics?.popularityScore || 0);
          });
        
        recommendations.push(...categoryGames.slice(0, Math.ceil(limit / categoryPreferences.size)));
        
        if (recommendations.length >= limit) break;
      }
      
      return recommendations.slice(0, limit);
      
    } catch (error) {
      console.error('❌ Failed to get recommended games:', error);
      return [];
    }
  }

  // Private Phase 5 methods

  private async initializeGameTags(): Promise<void> {
    // Initialize default tags for existing games
    const defaultTags: GameTag[] = [
      { id: 'single-player', name: 'Single Player', color: '#3B82F6', category: 'feature' },
      { id: 'multiplayer', name: 'Multiplayer', color: '#10B981', category: 'feature' },
      { id: 'offline', name: 'Offline Play', color: '#6B7280', category: 'feature' },
      { id: 'easy', name: 'Easy', color: '#22C55E', category: 'difficulty' },
      { id: 'medium', name: 'Medium', color: '#F59E0B', category: 'difficulty' },
      { id: 'hard', name: 'Hard', color: '#EF4444', category: 'difficulty' },
      { id: 'retro', name: 'Retro', color: '#8B5CF6', category: 'theme' },
      { id: 'modern', name: 'Modern', color: '#06B6D4', category: 'theme' },
      { id: 'family-friendly', name: 'Family Friendly', color: '#F97316', category: 'theme' }
    ];
    
    // Auto-tag games based on their properties
    this.games.forEach(game => {
      const tags: GameTag[] = [];
      
      // Category-based tags
      if (game.category === 'puzzle') {
        tags.push(defaultTags.find(t => t.id === 'single-player')!);
        tags.push(defaultTags.find(t => t.id === 'family-friendly')!);
      }
      
      if (game.category === 'multiplayer') {
        tags.push(defaultTags.find(t => t.id === 'multiplayer')!);
      }
      
      // Rating-based difficulty
      if (game.rating && game.rating >= 4.5) {
        tags.push(defaultTags.find(t => t.id === 'easy')!);
      } else if (game.rating && game.rating >= 3.5) {
        tags.push(defaultTags.find(t => t.id === 'medium')!);
      } else {
        tags.push(defaultTags.find(t => t.id === 'hard')!);
      }
      
      this.gameTags.set(game.id, tags.filter(Boolean));
    });
    
    await this.saveCachedTags();
    console.log('🏷️ Game tags initialized');
  }

  private async initializeABTests(): Promise<void> {
    // Initialize A/B test experiments
    const experiments: ABTestExperiment[] = [
      {
        id: 'game-layout-test',
        name: 'Game Layout Test',
        description: 'Test different game card layouts',
        variants: [
          {
            id: 'control',
            name: 'Control (Current Layout)',
            description: 'Current game card layout',
            weight: 0.5,
            config: { layout: 'current' }
          },
          {
            id: 'compact',
            name: 'Compact Layout',
            description: 'More compact game cards',
            weight: 0.5,
            config: { layout: 'compact' }
          }
        ],
        isActive: true,
        startDate: new Date().toISOString(),
        targetMetric: 'game_launches'
      },
      {
        id: 'recommendation-algorithm',
        name: 'Recommendation Algorithm Test',
        description: 'Test different recommendation algorithms',
        variants: [
          {
            id: 'popularity-based',
            name: 'Popularity Based',
            description: 'Recommend based on popularity',
            weight: 0.33,
            config: { algorithm: 'popularity' }
          },
          {
            id: 'category-based',
            name: 'Category Based',
            description: 'Recommend based on user category preferences',
            weight: 0.33,
            config: { algorithm: 'category' }
          },
          {
            id: 'hybrid',
            name: 'Hybrid Algorithm',
            description: 'Combine popularity and category preferences',
            weight: 0.34,
            config: { algorithm: 'hybrid' }
          }
        ],
        isActive: true,
        startDate: new Date().toISOString(),
        targetMetric: 'recommendation_clicks'
      }
    ];
    
    experiments.forEach(experiment => {
      this.abTestExperiments.set(experiment.id, experiment);
    });
    
    await this.saveCachedABTests();
    console.log('🧪 A/B test experiments initialized');
  }

  private async startPrefetching(): Promise<void> {
    // Start prefetching after a delay to not impact initial load
    setTimeout(() => {
      this.prefetchPopularGames();
    }, 5000);
    
    // Set up periodic prefetching
    setInterval(() => {
      this.prefetchPopularGames();
    }, 30 * 60 * 1000); // Every 30 minutes
  }

  private async initializeAnalytics(): Promise<void> {
    // Initialize analytics for existing games
    this.games.forEach(game => {
      if (!this.gameAnalytics.has(game.id)) {
        const analytics: GameAnalytics = {
          gameId: game.id,
          totalPlays: Math.floor(Math.random() * 1000), // Mock data
          uniquePlayers: Math.floor(Math.random() * 500),
          averageRating: game.rating || 0,
          popularityScore: (game.rating || 0) * 0.2 + Math.random() * 0.8,
          retentionRate: Math.random() * 0.8 + 0.2,
          crashRate: Math.random() * 0.1,
          lastAnalyzed: new Date().toISOString()
        };
        
        this.gameAnalytics.set(game.id, analytics);
      }
    });
    
    await this.saveCachedAnalytics();
    console.log('📊 Game analytics initialized');
  }

  private getRecommendedTags(games: GameMetadata[]): GameTag[] {
    const tagCounts = new Map<string, number>();
    
    games.forEach(game => {
      const gameTags = this.gameTags.get(game.id) || [];
      gameTags.forEach(tag => {
        tagCounts.set(tag.id, (tagCounts.get(tag.id) || 0) + 1);
      });
    });
    
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tagId]) => {
        for (const gameTags of this.gameTags.values()) {
          const tag = gameTags.find(t => t.id === tagId);
          if (tag) return tag;
        }
        return null;
      })
      .filter(Boolean) as GameTag[];
  }

  private async loadCachedAnalytics(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.ANALYTICS_CACHE_KEY);
      if (cached) {
        const analytics = JSON.parse(cached) as Array<[string, GameAnalytics]>;
        analytics.forEach(([gameId, data]) => {
          this.gameAnalytics.set(gameId, data);
        });
        console.log(`📊 Loaded ${analytics.length} cached analytics`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached analytics:', error);
    }
  }

  private async loadCachedTags(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.TAGS_CACHE_KEY);
      if (cached) {
        const tags = JSON.parse(cached) as Array<[string, GameTag[]]>;
        tags.forEach(([gameId, gameTags]) => {
          this.gameTags.set(gameId, gameTags);
        });
        console.log(`🏷️ Loaded ${tags.length} cached tag sets`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached tags:', error);
    }
  }

  private async loadCachedABTests(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.AB_TEST_CACHE_KEY);
      if (cached) {
        const experiments = JSON.parse(cached) as Array<[string, ABTestExperiment]>;
        experiments.forEach(([experimentId, experiment]) => {
          this.abTestExperiments.set(experimentId, experiment);
        });
        console.log(`🧪 Loaded ${experiments.length} cached A/B tests`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached A/B tests:', error);
    }
  }

  private async saveCachedAnalytics(): Promise<void> {
    try {
      const analytics = Array.from(this.gameAnalytics.entries());
      await AsyncStorage.setItem(this.ANALYTICS_CACHE_KEY, JSON.stringify(analytics));
    } catch (error) {
      console.warn('⚠️ Failed to save analytics cache:', error);
    }
  }

  private async saveCachedTags(): Promise<void> {
    try {
      const tags = Array.from(this.gameTags.entries());
      await AsyncStorage.setItem(this.TAGS_CACHE_KEY, JSON.stringify(tags));
    } catch (error) {
      console.warn('⚠️ Failed to save tags cache:', error);
    }
  }

  private async saveCachedABTests(): Promise<void> {
    try {
      const experiments = Array.from(this.abTestExperiments.entries());
      await AsyncStorage.setItem(this.AB_TEST_CACHE_KEY, JSON.stringify(experiments));
    } catch (error) {
      console.warn('⚠️ Failed to save A/B tests cache:', error);
    }
  }
}