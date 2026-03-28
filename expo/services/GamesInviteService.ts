import AsyncStorage from '@react-native-async-storage/async-storage';
import { PolicyEngine } from './ai/PolicyEngine';

export interface GameInvite {
  id: string;
  sessionId: string;
  gameId: string;
  gameName: string;
  hostUserId: string;
  hostName: string;
  linkCode: string;
  scope: 'private' | 'followers' | 'public';
  maxPlayers: number;
  currentPlayers: number;
  createdAt: string;
  expiresAt: string;
  deepLink: string;
  shareMessage: string;
}

export interface CreateInviteRequest {
  sessionId: string;
  scope: 'private' | 'followers' | 'public';
  customMessage?: string;
}

export interface InviteResponse {
  invite: GameInvite;
  deepLink: string;
  shareText: string;
}

export interface DeepLinkData {
  type: 'game_invite';
  inviteId: string;
  sessionId: string;
  gameId: string;
  roomCode: string;
  hostUserId: string;
}

/**
 * Games Invite Service - Phase 2 Implementation
 * 
 * Handles:
 * - Game invitation creation and management
 * - Deep link generation for invites
 * - Chat/social integration for sharing
 * - Invite expiration and cleanup
 * - Deep link parsing and handling
 */
export class GamesInviteService {
  private static instance: GamesInviteService;
  private policyEngine: PolicyEngine;
  private isInitialized = false;
  
  private readonly API_BASE_URL = 'https://api.rork.com/games/invites';
  private readonly INVITES_CACHE_KEY = 'games_invites_cache';
  private readonly DEEP_LINK_SCHEME = 'mada://games/join';
  
  private activeInvites = new Map<string, GameInvite>();
  private invitesBySession = new Map<string, string[]>(); // sessionId -> inviteIds
  private invitesByCode = new Map<string, string>(); // linkCode -> inviteId

  private constructor() {
    this.policyEngine = new PolicyEngine();
  }

  static getInstance(): GamesInviteService {
    if (!GamesInviteService.instance) {
      GamesInviteService.instance = new GamesInviteService();
    }
    return GamesInviteService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🎮 Initializing Games Invite Service...');

      // Initialize policy engine
      await this.policyEngine.initialize();

      // Load cached invites
      await this.loadCachedInvites();

      // Clean up expired invites
      await this.cleanupExpiredInvites();

      this.isInitialized = true;
      console.log('✅ Games Invite Service initialized');

    } catch (error) {
      console.error('❌ Games Invite Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a new game invite
   */
  async createInvite(request: CreateInviteRequest, hostUserId: string, hostName: string, gameData: { id: string; name: string; maxPlayers: number; currentPlayers: number }): Promise<InviteResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Validate invite creation through policy engine
      const validation = await this.policyEngine.validateTask({
        id: `invite-create-${Date.now()}`,
        type: 'invite_creation',
        input: { sessionId: request.sessionId, scope: request.scope, hostUserId },
        priority: 'high',
        maxTokens: 500,
        timeout: 10000
      });

      if (!validation.allowed) {
        throw new Error(`Invite creation blocked: ${validation.reason}`);
      }

      // Generate invite data
      const inviteId = this.generateInviteId();
      const linkCode = this.generateLinkCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const invite: GameInvite = {
        id: inviteId,
        sessionId: request.sessionId,
        gameId: gameData.id,
        gameName: gameData.name,
        hostUserId,
        hostName,
        linkCode,
        scope: request.scope,
        maxPlayers: gameData.maxPlayers,
        currentPlayers: gameData.currentPlayers,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        deepLink: '',
        shareMessage: ''
      };

      // Generate deep link
      const deepLink = this.generateDeepLink(invite);
      invite.deepLink = deepLink;

      // Generate share message
      const shareMessage = this.generateShareMessage(invite, request.customMessage);
      invite.shareMessage = shareMessage;

      // Store invite
      this.activeInvites.set(inviteId, invite);
      this.invitesByCode.set(linkCode, inviteId);
      
      // Update session invites
      const sessionInvites = this.invitesBySession.get(request.sessionId) || [];
      sessionInvites.push(inviteId);
      this.invitesBySession.set(request.sessionId, sessionInvites);

      // Save to cache
      await this.saveCachedInvites();

      console.log(`🔗 Created invite ${inviteId} for session ${request.sessionId}`);
      console.log(`📱 Deep link: ${deepLink}`);

      return {
        invite,
        deepLink,
        shareText: shareMessage
      };

    } catch (error) {
      console.error('❌ Failed to create invite:', error);
      throw error;
    }
  }

  /**
   * Get invite by ID
   */
  async getInvite(inviteId: string): Promise<GameInvite | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const invite = this.activeInvites.get(inviteId);
    if (!invite) {
      return null;
    }

    // Check if invite is expired
    if (new Date(invite.expiresAt) < new Date()) {
      console.log(`⏰ Invite ${inviteId} has expired`);
      await this.expireInvite(inviteId);
      return null;
    }

    return invite;
  }

  /**
   * Get invite by link code
   */
  async getInviteByCode(linkCode: string): Promise<GameInvite | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const inviteId = this.invitesByCode.get(linkCode);
    if (!inviteId) {
      return null;
    }

    return await this.getInvite(inviteId);
  }

  /**
   * Get invites for a session
   */
  async getSessionInvites(sessionId: string): Promise<GameInvite[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const inviteIds = this.invitesBySession.get(sessionId) || [];
    const invites: GameInvite[] = [];

    for (const inviteId of inviteIds) {
      const invite = await this.getInvite(inviteId);
      if (invite) {
        invites.push(invite);
      }
    }

    return invites;
  }

  /**
   * Parse deep link and extract invite data
   */
  parseDeepLink(url: string): DeepLinkData | null {
    try {
      const urlObj = new URL(url);
      
      // Check if it's a game invite deep link
      if (!url.startsWith(this.DEEP_LINK_SCHEME)) {
        return null;
      }

      const params = urlObj.searchParams;
      const code = params.get('code');
      const gameId = params.get('g');
      const version = params.get('v');
      const host = params.get('h');

      if (!code || !gameId) {
        return null;
      }

      // Find invite by code
      const inviteId = this.invitesByCode.get(code);
      if (!inviteId) {
        return null;
      }

      const invite = this.activeInvites.get(inviteId);
      if (!invite) {
        return null;
      }

      return {
        type: 'game_invite',
        inviteId: invite.id,
        sessionId: invite.sessionId,
        gameId: invite.gameId,
        roomCode: code,
        hostUserId: invite.hostUserId
      };

    } catch (error) {
      console.error('❌ Failed to parse deep link:', error);
      return null;
    }
  }

  /**
   * Generate share text for different platforms
   */
  generateShareTextForPlatform(invite: GameInvite, platform: 'chat' | 'social' | 'generic'): string {
    const baseMessage = `🎮 ${invite.hostName} invited you to play ${invite.gameName}!`;
    
    switch (platform) {
      case 'chat':
        return `${baseMessage}\n\n👥 ${invite.currentPlayers}/${invite.maxPlayers} players\n🔗 Join: ${invite.deepLink}`;
      
      case 'social':
        return `${baseMessage}\n\nJoin the fun! 🎯\n${invite.deepLink}\n\n#Gaming #${invite.gameName.replace(/\s+/g, '')}`;
      
      case 'generic':
      default:
        return `${baseMessage}\n\nTap to join: ${invite.deepLink}`;
    }
  }

  /**
   * Update invite player count
   */
  async updateInvitePlayerCount(sessionId: string, currentPlayers: number): Promise<void> {
    try {
      const inviteIds = this.invitesBySession.get(sessionId) || [];
      
      for (const inviteId of inviteIds) {
        const invite = this.activeInvites.get(inviteId);
        if (invite) {
          invite.currentPlayers = currentPlayers;
          this.activeInvites.set(inviteId, invite);
        }
      }

      await this.saveCachedInvites();
      
    } catch (error) {
      console.error('❌ Failed to update invite player count:', error);
    }
  }

  /**
   * Expire an invite
   */
  async expireInvite(inviteId: string): Promise<void> {
    try {
      const invite = this.activeInvites.get(inviteId);
      if (invite) {
        // Remove from maps
        this.activeInvites.delete(inviteId);
        this.invitesByCode.delete(invite.linkCode);
        
        // Remove from session invites
        const sessionInvites = this.invitesBySession.get(invite.sessionId) || [];
        const updatedSessionInvites = sessionInvites.filter(id => id !== inviteId);
        if (updatedSessionInvites.length > 0) {
          this.invitesBySession.set(invite.sessionId, updatedSessionInvites);
        } else {
          this.invitesBySession.delete(invite.sessionId);
        }
        
        await this.saveCachedInvites();
        
        console.log(`🗑️ Expired invite ${inviteId}`);
      }
    } catch (error) {
      console.error('❌ Failed to expire invite:', error);
    }
  }

  /**
   * Expire all invites for a session
   */
  async expireSessionInvites(sessionId: string): Promise<void> {
    try {
      const inviteIds = this.invitesBySession.get(sessionId) || [];
      
      for (const inviteId of inviteIds) {
        await this.expireInvite(inviteId);
      }
      
      console.log(`🗑️ Expired ${inviteIds.length} invites for session ${sessionId}`);
      
    } catch (error) {
      console.error('❌ Failed to expire session invites:', error);
    }
  }

  // Private methods

  private generateInviteId(): string {
    return `invite_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateLinkCode(): string {
    // Generate 8-character link code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateDeepLink(invite: GameInvite): string {
    const params = new URLSearchParams({
      code: invite.linkCode,
      g: invite.gameId,
      v: '1.0.0',
      h: invite.hostUserId,
      t: Date.now().toString()
    });

    return `${this.DEEP_LINK_SCHEME}?${params.toString()}`;
  }

  private generateShareMessage(invite: GameInvite, customMessage?: string): string {
    if (customMessage) {
      return `${customMessage}\n\n🎮 Join ${invite.hostName} in ${invite.gameName}!\n${invite.deepLink}`;
    }

    const messages = [
      `🎮 ${invite.hostName} invited you to play ${invite.gameName}! Ready for some fun?`,
      `🎯 Game time! ${invite.hostName} wants you to join ${invite.gameName}`,
      `🚀 ${invite.hostName} started a ${invite.gameName} session. Come play!`,
      `🎊 You're invited! ${invite.hostName} is playing ${invite.gameName}`
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    return `${randomMessage}\n\n👥 ${invite.currentPlayers}/${invite.maxPlayers} players\n🔗 ${invite.deepLink}`;
  }

  private async cleanupExpiredInvites(): Promise<void> {
    try {
      const now = new Date();
      const expiredInvites: string[] = [];

      for (const [inviteId, invite] of this.activeInvites.entries()) {
        if (new Date(invite.expiresAt) < now) {
          expiredInvites.push(inviteId);
        }
      }

      for (const inviteId of expiredInvites) {
        await this.expireInvite(inviteId);
      }

      if (expiredInvites.length > 0) {
        console.log(`🧹 Cleaned up ${expiredInvites.length} expired invites`);
      }

    } catch (error) {
      console.warn('⚠️ Failed to cleanup expired invites:', error);
    }
  }

  private async loadCachedInvites(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.INVITES_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as {
          invites: GameInvite[];
          invitesBySession: [string, string[]][];
          invitesByCode: [string, string][];
        };

        // Load invites
        data.invites.forEach(invite => {
          this.activeInvites.set(invite.id, invite);
        });

        // Load session mappings
        data.invitesBySession.forEach(([sessionId, inviteIds]) => {
          this.invitesBySession.set(sessionId, inviteIds);
        });

        // Load code mappings
        data.invitesByCode.forEach(([code, inviteId]) => {
          this.invitesByCode.set(code, inviteId);
        });

        console.log(`📥 Loaded ${data.invites.length} cached invites`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached invites:', error);
    }
  }

  private async saveCachedInvites(): Promise<void> {
    try {
      const data = {
        invites: Array.from(this.activeInvites.values()),
        invitesBySession: Array.from(this.invitesBySession.entries()),
        invitesByCode: Array.from(this.invitesByCode.entries())
      };

      await AsyncStorage.setItem(this.INVITES_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Failed to save invites cache:', error);
    }
  }
}