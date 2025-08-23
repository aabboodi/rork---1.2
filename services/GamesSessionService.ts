import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameMetadata } from '@/components/WebViewSandbox';
import { PolicyEngine } from './ai/PolicyEngine';

export interface GameSession {
  id: string;
  gameId: string;
  gameVersion: string;
  hostUserId: string;
  roomCode: string;
  maxPlayers: number;
  currentPlayers: string[];
  state: 'open' | 'in_progress' | 'closed';
  createdAt: string;
  expiresAt: string;
  settings?: Record<string, any>;
}

export interface CreateSessionRequest {
  gameId: string;
  gameVersion?: string;
  maxPlayers?: number;
  settings?: Record<string, any>;
}

export interface JoinSessionRequest {
  sessionId: string;
  userId: string;
  token?: string;
}

export interface SessionResponse {
  session: GameSession;
  joinToken: string;
  gameUrl: string;
}

/**
 * Games Session Service - Phase 2 Implementation
 * 
 * Handles:
 * - Game session creation and management
 * - Player joining/leaving sessions
 * - Session state synchronization
 * - Room code generation
 * - Session expiration
 */
export class GamesSessionService {
  private static instance: GamesSessionService;
  private policyEngine: PolicyEngine;
  private isInitialized = false;
  
  private readonly API_BASE_URL = 'https://api.rork.com/games/sessions';
  private readonly SESSIONS_CACHE_KEY = 'games_sessions_cache';
  private readonly USER_SESSIONS_KEY = 'user_sessions_cache';
  
  private activeSessions = new Map<string, GameSession>();
  private userSessions = new Map<string, string[]>(); // userId -> sessionIds
  private sessionTokens = new Map<string, string>(); // sessionId -> joinToken

  private constructor() {
    this.policyEngine = new PolicyEngine();
  }

  static getInstance(): GamesSessionService {
    if (!GamesSessionService.instance) {
      GamesSessionService.instance = new GamesSessionService();
    }
    return GamesSessionService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🎮 Initializing Games Session Service...');

      // Initialize policy engine
      await this.policyEngine.initialize();

      // Load cached sessions
      await Promise.all([
        this.loadCachedSessions(),
        this.loadUserSessions()
      ]);

      // Clean up expired sessions
      await this.cleanupExpiredSessions();

      this.isInitialized = true;
      console.log('✅ Games Session Service initialized');

    } catch (error) {
      console.error('❌ Games Session Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a new game session
   */
  async createSession(request: CreateSessionRequest, hostUserId: string): Promise<SessionResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Validate session creation through policy engine
      const validation = await this.policyEngine.validateTask({
        id: `session-create-${Date.now()}`,
        type: 'session_creation',
        input: { gameId: request.gameId, hostUserId },
        priority: 'high',
        maxTokens: 500,
        timeout: 10000
      });

      if (!validation.allowed) {
        throw new Error(`Session creation blocked: ${validation.reason}`);
      }

      // Generate session data
      const sessionId = this.generateSessionId();
      const roomCode = this.generateRoomCode();
      const joinToken = this.generateJoinToken(sessionId, hostUserId);
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

      const session: GameSession = {
        id: sessionId,
        gameId: request.gameId,
        gameVersion: request.gameVersion || '1.0.0',
        hostUserId,
        roomCode,
        maxPlayers: request.maxPlayers || 4,
        currentPlayers: [hostUserId],
        state: 'open',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        settings: request.settings || {}
      };

      // Store session
      this.activeSessions.set(sessionId, session);
      this.sessionTokens.set(sessionId, joinToken);
      
      // Update user sessions
      const userSessionIds = this.userSessions.get(hostUserId) || [];
      userSessionIds.push(sessionId);
      this.userSessions.set(hostUserId, userSessionIds);

      // Save to cache
      await Promise.all([
        this.saveCachedSessions(),
        this.saveUserSessions()
      ]);

      console.log(`🎮 Created session ${sessionId} for game ${request.gameId}`);
      console.log(`🔑 Room code: ${roomCode}`);

      // Generate game URL with session context
      const gameUrl = await this.generateSessionGameUrl(session);

      return {
        session,
        joinToken,
        gameUrl
      };

    } catch (error) {
      console.error('❌ Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Join an existing session
   */
  async joinSession(request: JoinSessionRequest): Promise<SessionResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const session = this.activeSessions.get(request.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Check session state
      if (session.state === 'closed') {
        throw new Error('Session is closed');
      }

      if (session.state === 'in_progress') {
        throw new Error('Session is already in progress');
      }

      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        throw new Error('Session has expired');
      }

      // Check if user is already in session
      if (session.currentPlayers.includes(request.userId)) {
        console.log(`👤 User ${request.userId} already in session ${request.sessionId}`);
      } else {
        // Check if session is full
        if (session.currentPlayers.length >= session.maxPlayers) {
          throw new Error('Session is full');
        }

        // Add user to session
        session.currentPlayers.push(request.userId);
        
        // Update user sessions
        const userSessionIds = this.userSessions.get(request.userId) || [];
        if (!userSessionIds.includes(request.sessionId)) {
          userSessionIds.push(request.sessionId);
          this.userSessions.set(request.userId, userSessionIds);
        }
      }

      // Update session
      this.activeSessions.set(request.sessionId, session);
      
      // Save to cache
      await Promise.all([
        this.saveCachedSessions(),
        this.saveUserSessions()
      ]);

      console.log(`👤 User ${request.userId} joined session ${request.sessionId}`);
      console.log(`👥 Current players: ${session.currentPlayers.length}/${session.maxPlayers}`);

      // Generate join token and game URL
      const joinToken = this.generateJoinToken(request.sessionId, request.userId);
      const gameUrl = await this.generateSessionGameUrl(session, request.userId);

      return {
        session,
        joinToken,
        gameUrl
      };

    } catch (error) {
      console.error('❌ Failed to join session:', error);
      throw error;
    }
  }

  /**
   * Leave a session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        console.warn(`⚠️ Session ${sessionId} not found for leave operation`);
        return;
      }

      // Remove user from session
      session.currentPlayers = session.currentPlayers.filter(id => id !== userId);
      
      // If host leaves, close session or transfer host
      if (session.hostUserId === userId) {
        if (session.currentPlayers.length > 0) {
          // Transfer host to first remaining player
          session.hostUserId = session.currentPlayers[0];
          console.log(`👑 Host transferred to ${session.hostUserId}`);
        } else {
          // Close session if no players left
          session.state = 'closed';
          console.log(`🚪 Session ${sessionId} closed - no players remaining`);
        }
      }

      // Update session
      this.activeSessions.set(sessionId, session);
      
      // Update user sessions
      const userSessionIds = this.userSessions.get(userId) || [];
      const updatedUserSessions = userSessionIds.filter(id => id !== sessionId);
      this.userSessions.set(userId, updatedUserSessions);

      // Save to cache
      await Promise.all([
        this.saveCachedSessions(),
        this.saveUserSessions()
      ]);

      console.log(`👋 User ${userId} left session ${sessionId}`);

    } catch (error) {
      console.error('❌ Failed to leave session:', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<GameSession | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      console.log(`⏰ Session ${sessionId} has expired`);
      await this.closeSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Get session by room code
   */
  async getSessionByRoomCode(roomCode: string): Promise<GameSession | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    for (const session of this.activeSessions.values()) {
      if (session.roomCode === roomCode && session.state !== 'closed') {
        // Check if session is expired
        if (new Date(session.expiresAt) < new Date()) {
          await this.closeSession(session.id);
          continue;
        }
        return session;
      }
    }

    return null;
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: string): Promise<GameSession[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const sessionIds = this.userSessions.get(userId) || [];
    const sessions: GameSession[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session && session.currentPlayers.includes(userId)) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Update session state
   */
  async updateSessionState(sessionId: string, state: GameSession['state']): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.state = state;
      this.activeSessions.set(sessionId, session);
      
      await this.saveCachedSessions();
      
      console.log(`🎮 Session ${sessionId} state updated to: ${state}`);

    } catch (error) {
      console.error('❌ Failed to update session state:', error);
      throw error;
    }
  }

  /**
   * Close a session
   */
  async closeSession(sessionId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.state = 'closed';
        this.activeSessions.set(sessionId, session);
        
        // Remove from user sessions
        for (const userId of session.currentPlayers) {
          const userSessionIds = this.userSessions.get(userId) || [];
          const updatedUserSessions = userSessionIds.filter(id => id !== sessionId);
          this.userSessions.set(userId, updatedUserSessions);
        }
        
        await Promise.all([
          this.saveCachedSessions(),
          this.saveUserSessions()
        ]);
        
        console.log(`🚪 Session ${sessionId} closed`);
      }
    } catch (error) {
      console.error('❌ Failed to close session:', error);
    }
  }

  // Private methods

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateRoomCode(): string {
    // Generate 6-character room code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateJoinToken(sessionId: string, userId: string): string {
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2);
    const data = `${sessionId}:${userId}:${timestamp}:${nonce}`;
    return btoa(data).substring(0, 32);
  }

  private async generateSessionGameUrl(session: GameSession, userId?: string): Promise<string> {
    try {
      // Base game URL with session parameters
      const baseUrl = `https://games.rork.com/play/${session.gameId}`;
      const params = new URLSearchParams({
        session: session.id,
        room: session.roomCode,
        version: session.gameVersion,
        player: userId || session.hostUserId,
        timestamp: Date.now().toString()
      });

      // Add signature for security
      const signature = this.generateUrlSignature(session.id, userId || session.hostUserId);
      params.append('sig', signature);

      return `${baseUrl}?${params.toString()}`;

    } catch (error) {
      console.error('❌ Failed to generate session game URL:', error);
      throw error;
    }
  }

  private generateUrlSignature(sessionId: string, userId: string): string {
    // Mock signature generation (in production, use proper HMAC)
    const data = `${sessionId}:${userId}:${Date.now()}`;
    return btoa(data).substring(0, 16);
  }

  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      const expiredSessions: string[] = [];

      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (new Date(session.expiresAt) < now) {
          expiredSessions.push(sessionId);
        }
      }

      for (const sessionId of expiredSessions) {
        await this.closeSession(sessionId);
      }

      if (expiredSessions.length > 0) {
        console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
      }

    } catch (error) {
      console.warn('⚠️ Failed to cleanup expired sessions:', error);
    }
  }

  private async loadCachedSessions(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.SESSIONS_CACHE_KEY);
      if (cached) {
        const sessions = JSON.parse(cached) as GameSession[];
        sessions.forEach(session => {
          this.activeSessions.set(session.id, session);
        });
        console.log(`📥 Loaded ${sessions.length} cached sessions`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached sessions:', error);
    }
  }

  private async loadUserSessions(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.USER_SESSIONS_KEY);
      if (cached) {
        const userSessions = JSON.parse(cached) as Array<[string, string[]]>;
        userSessions.forEach(([userId, sessionIds]) => {
          this.userSessions.set(userId, sessionIds);
        });
        console.log(`📥 Loaded user sessions for ${userSessions.length} users`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load user sessions:', error);
    }
  }

  private async saveCachedSessions(): Promise<void> {
    try {
      const sessions = Array.from(this.activeSessions.values());
      await AsyncStorage.setItem(this.SESSIONS_CACHE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.warn('⚠️ Failed to save sessions cache:', error);
    }
  }

  private async saveUserSessions(): Promise<void> {
    try {
      const userSessions = Array.from(this.userSessions.entries());
      await AsyncStorage.setItem(this.USER_SESSIONS_KEY, JSON.stringify(userSessions));
    } catch (error) {
      console.warn('⚠️ Failed to save user sessions cache:', error);
    }
  }
}