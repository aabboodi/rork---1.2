import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameMetadata } from '@/components/WebViewSandbox';
import { PolicyEngine } from './ai/PolicyEngine';
import { GamesRegistryService, GameSearchParams, GameRegistryResponse } from './GamesRegistryService';
import { GamesSessionService, GameSession, CreateSessionRequest, JoinSessionRequest, SessionResponse } from './GamesSessionService';
import { GamesInviteService, GameInvite, CreateInviteRequest, InviteResponse, DeepLinkData } from './GamesInviteService';
import { GamesUploadService, GameUploadRequest, GameUploadResponse, GameReviewStatus } from './GamesUploadService';

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
  private registryService: GamesRegistryService;
  private sessionService: GamesSessionService;
  private inviteService: GamesInviteService;
  private uploadService: GamesUploadService;
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
    gameSharing: true // Enable for Phase 2
  };

  private constructor() {
    this.policyEngine = new PolicyEngine();
    this.registryService = GamesRegistryService.getInstance();
    this.sessionService = GamesSessionService.getInstance();
    this.inviteService = GamesInviteService.getInstance();
    this.uploadService = GamesUploadService.getInstance();
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
        this.uploadService.initialize()
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
        this.loadCachedPerformanceMetrics()
      ]);

      // Load games from registry service
      await this.syncWithRegistry();

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
}