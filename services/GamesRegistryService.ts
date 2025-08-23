import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameMetadata } from '@/components/WebViewSandbox';
import { PolicyEngine } from './ai/PolicyEngine';

export interface GameRegistryResponse {
  games: GameMetadata[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface GameSearchParams {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'rating' | 'lastUpdated' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

export interface GameSecurityInfo {
  sha256: string;
  cspPolicy: string;
  sriHash: string;
  signedUrl: string;
  expiresAt: string;
  allowedOrigins: string[];
}

export interface GameVersion {
  version: string;
  changelog: string;
  securityInfo: GameSecurityInfo;
  approvedAt: string;
  approvedBy: string;
}

/**
 * Games Registry Service - Phase 1 Implementation
 * 
 * Handles:
 * - Games catalog from server API
 * - Secure CDN URL generation with signatures
 * - CSP/SRI/Checksum validation
 * - Game metadata caching
 * - Performance monitoring
 */
export class GamesRegistryService {
  private static instance: GamesRegistryService;
  private policyEngine: PolicyEngine;
  private isInitialized = false;
  
  private readonly API_BASE_URL = 'https://api.rork.com/games';
  private readonly CDN_BASE_URL = 'https://cdn.rork.com/games';
  private readonly REGISTRY_CACHE_KEY = 'games_registry_cache';
  private readonly SECURITY_CACHE_KEY = 'games_security_cache';
  
  private gamesCache = new Map<string, GameMetadata>();
  private securityCache = new Map<string, GameSecurityInfo>();
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.policyEngine = new PolicyEngine();
  }

  static getInstance(): GamesRegistryService {
    if (!GamesRegistryService.instance) {
      GamesRegistryService.instance = new GamesRegistryService();
    }
    return GamesRegistryService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🎮 Initializing Games Registry Service...');

      // Initialize policy engine
      await this.policyEngine.initialize();

      // Load cached data
      await Promise.all([
        this.loadCachedGames(),
        this.loadCachedSecurity()
      ]);

      this.isInitialized = true;
      console.log('✅ Games Registry Service initialized');

    } catch (error) {
      console.error('❌ Games Registry Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get games from registry with search and pagination
   */
  async getGames(params: GameSearchParams = {}): Promise<GameRegistryResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const {
        search = '',
        category = '',
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc'
      } = params;

      // Check cache first
      const now = Date.now();
      const cacheKey = JSON.stringify(params);
      
      if (now - this.lastFetchTime < this.CACHE_DURATION && this.gamesCache.size > 0) {
        console.log('📥 Using cached games data');
        return this.filterAndPaginateGames(params);
      }

      // For Phase 1, use mock data with proper structure
      // In production, this would be: const response = await fetch(`${this.API_BASE_URL}?${queryParams}`);
      const mockGames = await this.getMockGamesData();
      
      // Update cache
      this.gamesCache.clear();
      mockGames.forEach(game => {
        this.gamesCache.set(game.id, game);
      });
      
      this.lastFetchTime = now;
      await this.saveCachedGames();

      console.log(`🎮 Loaded ${mockGames.length} games from registry`);
      
      return this.filterAndPaginateGames(params);

    } catch (error) {
      console.error('❌ Failed to fetch games from registry:', error);
      throw new Error('Failed to load games from registry');
    }
  }

  /**
   * Get game by ID with security info
   */
  async getGame(gameId: string): Promise<GameMetadata | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const game = this.gamesCache.get(gameId);
    if (!game) {
      console.warn(`🚫 Game not found: ${gameId}`);
      return null;
    }

    // Generate secure URL for game loading
    const securityInfo = await this.generateSecureGameUrl(game);
    
    return {
      ...game,
      url: securityInfo.signedUrl
    };
  }

  /**
   * Generate secure, signed URL for game loading
   */
  async generateSecureGameUrl(game: GameMetadata): Promise<GameSecurityInfo> {
    try {
      // Check cache first
      const cached = this.securityCache.get(game.id);
      if (cached && new Date(cached.expiresAt) > new Date()) {
        console.log(`🔐 Using cached secure URL for game: ${game.name}`);
        return cached;
      }

      // Validate game through policy engine
      const validation = await this.policyEngine.validateTask({
        id: `game-security-${game.id}`,
        type: 'game_security_validation',
        input: { gameId: game.id, originalUrl: game.url },
        priority: 'high',
        maxTokens: 500,
        timeout: 10000
      });

      if (!validation.allowed) {
        throw new Error(`Game security validation failed: ${validation.reason}`);
      }

      // Generate security info
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2);
      
      // Mock secure URL generation (in production, this would be server-side)
      const securityInfo: GameSecurityInfo = {
        sha256: this.generateMockSHA256(game.id),
        cspPolicy: this.generateCSPPolicy(game),
        sriHash: this.generateSRIHash(game.id),
        signedUrl: `${game.url}?t=${timestamp}&n=${nonce}&sig=${this.generateSignature(game.id, timestamp, nonce)}`,
        expiresAt: expiresAt.toISOString(),
        allowedOrigins: [
          'https://games.rork.com',
          'https://cdn.rork.com',
          'https://secure-games.rork.com'
        ]
      };

      // Cache security info
      this.securityCache.set(game.id, securityInfo);
      await this.saveCachedSecurity();

      console.log(`🔐 Generated secure URL for game: ${game.name}`);
      return securityInfo;

    } catch (error) {
      console.error(`❌ Failed to generate secure URL for game ${game.id}:`, error);
      throw error;
    }
  }

  /**
   * Validate game integrity using checksum
   */
  async validateGameIntegrity(gameId: string, receivedChecksum: string): Promise<boolean> {
    try {
      const securityInfo = this.securityCache.get(gameId);
      if (!securityInfo) {
        console.warn(`🚫 No security info found for game: ${gameId}`);
        return false;
      }

      const isValid = securityInfo.sha256 === receivedChecksum;
      
      if (!isValid) {
        console.error(`🚫 Game integrity check failed for ${gameId}`);
        console.error(`Expected: ${securityInfo.sha256}`);
        console.error(`Received: ${receivedChecksum}`);
      } else {
        console.log(`✅ Game integrity verified for ${gameId}`);
      }

      return isValid;
    } catch (error) {
      console.error(`❌ Game integrity validation error for ${gameId}:`, error);
      return false;
    }
  }

  /**
   * Get CSP policy for game
   */
  getCSPPolicy(gameId: string): string {
    const securityInfo = this.securityCache.get(gameId);
    return securityInfo?.cspPolicy || this.getDefaultCSPPolicy();
  }

  /**
   * Get SRI hash for game
   */
  getSRIHash(gameId: string): string {
    const securityInfo = this.securityCache.get(gameId);
    return securityInfo?.sriHash || '';
  }

  // Private methods

  private async getMockGamesData(): Promise<GameMetadata[]> {
    // Phase 1: 3 sample games with proper metadata
    return [
      {
        id: 'sample-puzzle-blocks',
        name: 'Block Puzzle Master',
        url: 'https://games.rork.com/puzzle/blocks-master',
        category: 'puzzle',
        thumbnail: 'https://cdn.rork.com/games/thumbnails/blocks-master.jpg',
        description: 'Classic block puzzle game with modern twist. Arrange falling blocks to clear lines and achieve high scores.',
        version: '2.1.0',
        developer: 'Rork Games Studio',
        rating: 4.6,
        size: 2048000, // 2MB
        lastUpdated: '2024-01-20'
      },
      {
        id: 'sample-action-runner',
        name: 'Cosmic Runner',
        url: 'https://games.rork.com/action/cosmic-runner',
        category: 'action',
        thumbnail: 'https://cdn.rork.com/games/thumbnails/cosmic-runner.jpg',
        description: 'Fast-paced endless runner through cosmic landscapes. Dodge obstacles and collect power-ups.',
        version: '1.8.2',
        developer: 'Rork Games Studio',
        rating: 4.3,
        size: 5120000, // 5MB
        lastUpdated: '2024-01-18'
      },
      {
        id: 'sample-casual-match',
        name: 'Color Harmony',
        url: 'https://games.rork.com/casual/color-harmony',
        category: 'casual',
        thumbnail: 'https://cdn.rork.com/games/thumbnails/color-harmony.jpg',
        description: 'Relaxing color matching puzzle. Create beautiful patterns while training your visual perception.',
        version: '1.5.1',
        developer: 'Rork Games Studio',
        rating: 4.8,
        size: 1536000, // 1.5MB
        lastUpdated: '2024-01-15'
      }
    ];
  }

  private filterAndPaginateGames(params: GameSearchParams): GameRegistryResponse {
    let games = Array.from(this.gamesCache.values());
    
    // Apply search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      games = games.filter(game => 
        game.name.toLowerCase().includes(searchLower) ||
        game.description?.toLowerCase().includes(searchLower) ||
        game.developer?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply category filter
    if (params.category && params.category !== 'all') {
      games = games.filter(game => game.category === params.category);
    }
    
    // Apply sorting
    games.sort((a, b) => {
      const { sortBy = 'name', sortOrder = 'asc' } = params;
      let comparison = 0;
      
      switch (sortBy) {
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'lastUpdated':
          comparison = new Date(a.lastUpdated || 0).getTime() - new Date(b.lastUpdated || 0).getTime();
          break;
        case 'name':
        default:
          comparison = a.name.localeCompare(b.name);
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedGames = games.slice(startIndex, endIndex);
    
    return {
      games: paginatedGames,
      total: games.length,
      page,
      hasMore: endIndex < games.length
    };
  }

  private generateCSPPolicy(game: GameMetadata): string {
    // Strict CSP policy for games
    return [
      "default-src 'none'",
      "script-src 'self' 'unsafe-inline'", // Allow inline scripts for game engines
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://cdn.rork.com",
      "media-src 'self' https://cdn.rork.com",
      "connect-src 'self' https://api.rork.com",
      "font-src 'self' https://cdn.rork.com",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "form-action 'none'"
    ].join('; ');
  }

  private getDefaultCSPPolicy(): string {
    return [
      "default-src 'none'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "frame-ancestors 'none'"
    ].join('; ');
  }

  private generateMockSHA256(gameId: string): string {
    // Mock SHA256 generation (in production, this would be real checksum)
    const hash = gameId.split('').reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
    }, 0);
    return Math.abs(hash).toString(16).padStart(64, '0').substring(0, 64);
  }

  private generateSRIHash(gameId: string): string {
    // Mock SRI hash generation
    const mockHash = this.generateMockSHA256(gameId).substring(0, 44);
    return `sha256-${mockHash}`;
  }

  private generateSignature(gameId: string, timestamp: number, nonce: string): string {
    // Mock signature generation (in production, use proper HMAC)
    const data = `${gameId}:${timestamp}:${nonce}`;
    return btoa(data).substring(0, 32);
  }

  private async loadCachedGames(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.REGISTRY_CACHE_KEY);
      if (cached) {
        const games = JSON.parse(cached) as GameMetadata[];
        games.forEach(game => {
          this.gamesCache.set(game.id, game);
        });
        console.log(`📥 Loaded ${games.length} cached games from registry`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached games:', error);
    }
  }

  private async loadCachedSecurity(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.SECURITY_CACHE_KEY);
      if (cached) {
        const securityData = JSON.parse(cached) as Array<[string, GameSecurityInfo]>;
        securityData.forEach(([gameId, info]) => {
          // Only load non-expired security info
          if (new Date(info.expiresAt) > new Date()) {
            this.securityCache.set(gameId, info);
          }
        });
        console.log(`🔐 Loaded ${securityData.length} cached security entries`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached security info:', error);
    }
  }

  private async saveCachedGames(): Promise<void> {
    try {
      const games = Array.from(this.gamesCache.values());
      await AsyncStorage.setItem(this.REGISTRY_CACHE_KEY, JSON.stringify(games));
    } catch (error) {
      console.warn('⚠️ Failed to save games cache:', error);
    }
  }

  private async saveCachedSecurity(): Promise<void> {
    try {
      const securityData = Array.from(this.securityCache.entries());
      await AsyncStorage.setItem(this.SECURITY_CACHE_KEY, JSON.stringify(securityData));
    } catch (error) {
      console.warn('⚠️ Failed to save security cache:', error);
    }
  }
}