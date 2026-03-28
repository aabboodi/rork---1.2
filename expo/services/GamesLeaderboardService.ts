import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityManager } from './security/SecurityManager';
import { CryptoService } from './security/CryptoService';

export interface GameScore {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  score: number;
  metadata: Record<string, any>;
  nonce: string;
  signature: string;
  timestamp: string;
  verified: boolean;
  flagged: boolean;
  flagReason?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  score: number;
  timestamp: string;
  verified: boolean;
}

export interface Leaderboard {
  gameId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  entries: LeaderboardEntry[];
  lastUpdated: string;
  totalEntries: number;
}

export interface ScoreSubmissionRequest {
  gameId: string;
  score: number;
  metadata?: Record<string, any>;
  gameState?: string;
  playDuration?: number;
}

export interface ScoreSubmissionResponse {
  success: boolean;
  scoreId: string;
  rank?: number;
  newRecord?: boolean;
  flagged?: boolean;
  reason?: string;
}

export interface AnomalyDetectionResult {
  isAnomalous: boolean;
  confidence: number;
  reasons: string[];
  action: 'accept' | 'flag' | 'reject';
}

export interface RateLimitInfo {
  userId: string;
  gameId: string;
  submissionCount: number;
  windowStart: string;
  windowEnd: string;
  isLimited: boolean;
}

/**
 * Games Leaderboard Service - Manages game scores with anti-cheat measures
 * 
 * Features:
 * - Secure score submission with digital signatures
 * - Real-time leaderboards (daily, weekly, monthly, all-time)
 * - Anomaly detection for cheat prevention
 * - Rate limiting to prevent spam
 * - Score verification and validation
 * - Automatic flagging of suspicious scores
 */
export class GamesLeaderboardService {
  private static instance: GamesLeaderboardService;
  private securityManager: SecurityManager;
  private cryptoService: CryptoService;
  private isInitialized = false;
  
  private readonly SCORES_CACHE_KEY = 'games_scores_cache';
  private readonly LEADERBOARDS_CACHE_KEY = 'games_leaderboards_cache';
  private readonly RATE_LIMITS_KEY = 'games_rate_limits';
  private readonly ANOMALY_PATTERNS_KEY = 'games_anomaly_patterns';
  
  // In-memory caches
  private scores = new Map<string, GameScore>();
  private leaderboards = new Map<string, Leaderboard>();
  private rateLimits = new Map<string, RateLimitInfo>();
  private anomalyPatterns = new Map<string, any>();
  
  // Rate limiting configuration
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly MAX_SUBMISSIONS_PER_WINDOW = 10;
  private readonly SUSPICIOUS_SCORE_THRESHOLD = 3; // Standard deviations
  
  private constructor() {
    this.securityManager = SecurityManager.getInstance();
    this.cryptoService = new CryptoService();
  }

  static getInstance(): GamesLeaderboardService {
    if (!GamesLeaderboardService.instance) {
      GamesLeaderboardService.instance = new GamesLeaderboardService();
    }
    return GamesLeaderboardService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🏆 Initializing Games Leaderboard Service...');

      // Initialize dependencies
      await Promise.all([
        this.securityManager.initialize(),
        this.cryptoService.initialize()
      ]);

      // Load cached data
      await Promise.all([
        this.loadCachedScores(),
        this.loadCachedLeaderboards(),
        this.loadRateLimits(),
        this.loadAnomalyPatterns()
      ]);

      // Initialize anomaly detection patterns
      await this.initializeAnomalyDetection();

      this.isInitialized = true;
      console.log('✅ Games Leaderboard Service initialized');

    } catch (error) {
      console.error('❌ Games Leaderboard Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Submit a game score with anti-cheat validation
   */
  async submitScore(request: ScoreSubmissionRequest, userId: string, userName: string): Promise<ScoreSubmissionResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`🎯 Submitting score for game ${request.gameId}: ${request.score}`);

      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(userId, request.gameId);
      if (rateLimitCheck.isLimited) {
        return {
          success: false,
          scoreId: '',
          flagged: true,
          reason: 'Rate limit exceeded. Please wait before submitting another score.'
        };
      }

      // Generate nonce and signature
      const nonce = await this.generateNonce();
      const signature = await this.signScore(request, userId, nonce);

      // Create score object
      const scoreId = `score-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const score: GameScore = {
        id: scoreId,
        gameId: request.gameId,
        userId,
        userName,
        score: request.score,
        metadata: request.metadata || {},
        nonce,
        signature,
        timestamp: new Date().toISOString(),
        verified: false,
        flagged: false
      };

      // Verify signature
      const signatureValid = await this.verifyScoreSignature(score);
      if (!signatureValid) {
        return {
          success: false,
          scoreId: '',
          flagged: true,
          reason: 'Invalid score signature'
        };
      }

      score.verified = true;

      // Run anomaly detection
      const anomalyResult = await this.detectAnomalies(score);
      if (anomalyResult.action === 'reject') {
        return {
          success: false,
          scoreId: '',
          flagged: true,
          reason: `Score rejected: ${anomalyResult.reasons.join(', ')}`
        };
      }

      if (anomalyResult.action === 'flag') {
        score.flagged = true;
        score.flagReason = anomalyResult.reasons.join(', ');
        console.warn(`⚠️ Score flagged for review: ${scoreId} - ${score.flagReason}`);
      }

      // Store score
      this.scores.set(scoreId, score);
      await this.saveCachedScores();

      // Update rate limiting
      await this.updateRateLimit(userId, request.gameId);

      // Update leaderboards
      const rank = await this.updateLeaderboards(score);
      const newRecord = await this.checkNewRecord(score);

      // Log successful submission
      console.log(`✅ Score submitted successfully: ${scoreId} (rank: ${rank})`);

      return {
        success: true,
        scoreId,
        rank,
        newRecord,
        flagged: score.flagged,
        reason: score.flagged ? score.flagReason : undefined
      };

    } catch (error) {
      console.error('❌ Score submission failed:', error);
      return {
        success: false,
        scoreId: '',
        flagged: true,
        reason: 'Internal error during score submission'
      };
    }
  }

  /**
   * Get leaderboard for a game
   */
  async getLeaderboard(gameId: string, period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time', limit: number = 50): Promise<Leaderboard> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const leaderboardKey = `${gameId}-${period}`;
    let leaderboard = this.leaderboards.get(leaderboardKey);

    if (!leaderboard || this.isLeaderboardStale(leaderboard)) {
      leaderboard = await this.generateLeaderboard(gameId, period, limit);
      this.leaderboards.set(leaderboardKey, leaderboard);
      await this.saveCachedLeaderboards();
    }

    return leaderboard;
  }

  /**
   * Get user's rank in a game
   */
  async getUserRank(gameId: string, userId: string, period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time'): Promise<number | null> {
    const leaderboard = await this.getLeaderboard(gameId, period);
    const entry = leaderboard.entries.find(e => e.userId === userId);
    return entry ? entry.rank : null;
  }

  /**
   * Get user's best score for a game
   */
  async getUserBestScore(gameId: string, userId: string): Promise<GameScore | null> {
    const userScores = Array.from(this.scores.values())
      .filter(score => score.gameId === gameId && score.userId === userId && score.verified && !score.flagged)
      .sort((a, b) => b.score - a.score);

    return userScores.length > 0 ? userScores[0] : null;
  }

  /**
   * Get user's score history for a game
   */
  async getUserScoreHistory(gameId: string, userId: string, limit: number = 20): Promise<GameScore[]> {
    return Array.from(this.scores.values())
      .filter(score => score.gameId === gameId && score.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Flag a score for manual review
   */
  async flagScore(scoreId: string, reason: string, reviewerId: string): Promise<void> {
    const score = this.scores.get(scoreId);
    if (!score) {
      throw new Error('Score not found');
    }

    score.flagged = true;
    score.flagReason = reason;
    score.metadata.reviewerId = reviewerId;
    score.metadata.reviewTimestamp = new Date().toISOString();

    this.scores.set(scoreId, score);
    await this.saveCachedScores();

    console.log(`🚩 Score flagged for review: ${scoreId} - ${reason}`);
  }

  /**
   * Approve a flagged score
   */
  async approveScore(scoreId: string, reviewerId: string): Promise<void> {
    const score = this.scores.get(scoreId);
    if (!score) {
      throw new Error('Score not found');
    }

    score.flagged = false;
    score.flagReason = undefined;
    score.metadata.approvedBy = reviewerId;
    score.metadata.approvedAt = new Date().toISOString();

    this.scores.set(scoreId, score);
    await this.saveCachedScores();

    // Update leaderboards
    await this.updateLeaderboards(score);

    console.log(`✅ Score approved: ${scoreId}`);
  }

  /**
   * Reject a flagged score
   */
  async rejectScore(scoreId: string, reason: string, reviewerId: string): Promise<void> {
    const score = this.scores.get(scoreId);
    if (!score) {
      throw new Error('Score not found');
    }

    score.verified = false;
    score.flagged = true;
    score.flagReason = reason;
    score.metadata.rejectedBy = reviewerId;
    score.metadata.rejectedAt = new Date().toISOString();

    this.scores.set(scoreId, score);
    await this.saveCachedScores();

    // Remove from leaderboards
    await this.removeFromLeaderboards(score);

    console.log(`❌ Score rejected: ${scoreId} - ${reason}`);
  }

  /**
   * Get flagged scores for review
   */
  async getFlaggedScores(gameId?: string, limit: number = 50): Promise<GameScore[]> {
    return Array.from(this.scores.values())
      .filter(score => {
        if (gameId && score.gameId !== gameId) return false;
        return score.flagged;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get anomaly detection statistics
   */
  async getAnomalyStats(gameId: string): Promise<{
    totalScores: number;
    flaggedScores: number;
    rejectedScores: number;
    averageScore: number;
    standardDeviation: number;
  }> {
    const gameScores = Array.from(this.scores.values())
      .filter(score => score.gameId === gameId);

    const verifiedScores = gameScores.filter(score => score.verified && !score.flagged);
    const flaggedScores = gameScores.filter(score => score.flagged);
    const rejectedScores = gameScores.filter(score => !score.verified);

    const scores = verifiedScores.map(s => s.score);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const variance = scores.length > 0 ? scores.reduce((acc, score) => acc + Math.pow(score - averageScore, 2), 0) / scores.length : 0;
    const standardDeviation = Math.sqrt(variance);

    return {
      totalScores: gameScores.length,
      flaggedScores: flaggedScores.length,
      rejectedScores: rejectedScores.length,
      averageScore,
      standardDeviation
    };
  }

  // Private methods

  private async generateNonce(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${random}`;
  }

  private async signScore(request: ScoreSubmissionRequest, userId: string, nonce: string): Promise<string> {
    const payload = {
      gameId: request.gameId,
      userId,
      score: request.score,
      nonce,
      timestamp: Date.now()
    };

    return await this.cryptoService.sign(JSON.stringify(payload));
  }

  private async verifyScoreSignature(score: GameScore): Promise<boolean> {
    try {
      const payload = {
        gameId: score.gameId,
        userId: score.userId,
        score: score.score,
        nonce: score.nonce,
        timestamp: new Date(score.timestamp).getTime()
      };

      return await this.cryptoService.verify(JSON.stringify(payload), score.signature);
    } catch (error) {
      console.error('❌ Score signature verification failed:', error);
      return false;
    }
  }

  private async checkRateLimit(userId: string, gameId: string): Promise<RateLimitInfo> {
    const key = `${userId}-${gameId}`;
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW;

    let rateLimitInfo = this.rateLimits.get(key);
    
    if (!rateLimitInfo || new Date(rateLimitInfo.windowStart).getTime() < windowStart) {
      // Create new rate limit window
      rateLimitInfo = {
        userId,
        gameId,
        submissionCount: 0,
        windowStart: new Date(now).toISOString(),
        windowEnd: new Date(now + this.RATE_LIMIT_WINDOW).toISOString(),
        isLimited: false
      };
    }

    rateLimitInfo.isLimited = rateLimitInfo.submissionCount >= this.MAX_SUBMISSIONS_PER_WINDOW;
    
    this.rateLimits.set(key, rateLimitInfo);
    return rateLimitInfo;
  }

  private async updateRateLimit(userId: string, gameId: string): Promise<void> {
    const key = `${userId}-${gameId}`;
    const rateLimitInfo = this.rateLimits.get(key);
    
    if (rateLimitInfo) {
      rateLimitInfo.submissionCount++;
      this.rateLimits.set(key, rateLimitInfo);
      await this.saveRateLimits();
    }
  }

  private async detectAnomalies(score: GameScore): Promise<AnomalyDetectionResult> {
    const reasons: string[] = [];
    let confidence = 0;

    // Get game statistics
    const stats = await this.getAnomalyStats(score.gameId);
    
    // Check if score is too high (statistical outlier)
    if (stats.standardDeviation > 0) {
      const zScore = (score.score - stats.averageScore) / stats.standardDeviation;
      if (zScore > this.SUSPICIOUS_SCORE_THRESHOLD) {
        reasons.push(`Score is ${zScore.toFixed(2)} standard deviations above average`);
        confidence += 0.3;
      }
    }

    // Check for impossible scores (game-specific rules)
    if (await this.isImpossibleScore(score)) {
      reasons.push('Score exceeds theoretical maximum');
      confidence += 0.5;
    }

    // Check submission timing patterns
    const timingAnomaly = await this.checkTimingAnomalies(score);
    if (timingAnomaly) {
      reasons.push('Suspicious submission timing pattern');
      confidence += 0.2;
    }

    // Check for duplicate submissions
    const duplicateCheck = await this.checkDuplicateSubmissions(score);
    if (duplicateCheck) {
      reasons.push('Duplicate or near-duplicate score detected');
      confidence += 0.4;
    }

    // Determine action based on confidence
    let action: 'accept' | 'flag' | 'reject';
    if (confidence >= 0.8) {
      action = 'reject';
    } else if (confidence >= 0.4) {
      action = 'flag';
    } else {
      action = 'accept';
    }

    return {
      isAnomalous: confidence > 0.3,
      confidence,
      reasons,
      action
    };
  }

  private async isImpossibleScore(score: GameScore): Promise<boolean> {
    // Game-specific maximum score validation
    // This would be configured per game
    const gameMaxScores: Record<string, number> = {
      'tetris': 999999,
      'snake': 10000,
      'puzzle': 50000
    };

    const maxScore = gameMaxScores[score.gameId] || Number.MAX_SAFE_INTEGER;
    return score.score > maxScore;
  }

  private async checkTimingAnomalies(score: GameScore): Promise<boolean> {
    // Check if user is submitting scores too frequently
    const recentScores = Array.from(this.scores.values())
      .filter(s => s.userId === score.userId && s.gameId === score.gameId)
      .filter(s => {
        const timeDiff = new Date(score.timestamp).getTime() - new Date(s.timestamp).getTime();
        return timeDiff < 60000; // Within last minute
      });

    return recentScores.length > 3; // More than 3 scores in a minute is suspicious
  }

  private async checkDuplicateSubmissions(score: GameScore): Promise<boolean> {
    // Check for exact or near-exact duplicate scores
    const similarScores = Array.from(this.scores.values())
      .filter(s => s.userId === score.userId && s.gameId === score.gameId)
      .filter(s => Math.abs(s.score - score.score) <= 10); // Within 10 points

    return similarScores.length > 2; // More than 2 similar scores is suspicious
  }

  private async generateLeaderboard(gameId: string, period: 'daily' | 'weekly' | 'monthly' | 'all-time', limit: number): Promise<Leaderboard> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all-time':
      default:
        startDate = new Date(0); // Beginning of time
        break;
    }

    // Get scores for the period
    const periodScores = Array.from(this.scores.values())
      .filter(score => {
        if (score.gameId !== gameId) return false;
        if (!score.verified || score.flagged) return false;
        return new Date(score.timestamp) >= startDate;
      });

    // Group by user and get best score for each
    const userBestScores = new Map<string, GameScore>();
    periodScores.forEach(score => {
      const existing = userBestScores.get(score.userId);
      if (!existing || score.score > existing.score) {
        userBestScores.set(score.userId, score);
      }
    });

    // Sort and create leaderboard entries
    const sortedScores = Array.from(userBestScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const entries: LeaderboardEntry[] = sortedScores.map((score, index) => ({
      rank: index + 1,
      userId: score.userId,
      userName: score.userName,
      score: score.score,
      timestamp: score.timestamp,
      verified: score.verified
    }));

    return {
      gameId,
      period,
      entries,
      lastUpdated: new Date().toISOString(),
      totalEntries: userBestScores.size
    };
  }

  private async updateLeaderboards(score: GameScore): Promise<number | undefined> {
    if (!score.verified || score.flagged) {
      return undefined;
    }

    // Update all period leaderboards
    const periods: Array<'daily' | 'weekly' | 'monthly' | 'all-time'> = ['daily', 'weekly', 'monthly', 'all-time'];
    
    let rank: number | undefined;
    
    for (const period of periods) {
      const leaderboard = await this.generateLeaderboard(score.gameId, period, 100);
      const userEntry = leaderboard.entries.find(e => e.userId === score.userId);
      
      if (userEntry && period === 'all-time') {
        rank = userEntry.rank;
      }
      
      const leaderboardKey = `${score.gameId}-${period}`;
      this.leaderboards.set(leaderboardKey, leaderboard);
    }

    await this.saveCachedLeaderboards();
    return rank;
  }

  private async removeFromLeaderboards(score: GameScore): Promise<void> {
    const periods: Array<'daily' | 'weekly' | 'monthly' | 'all-time'> = ['daily', 'weekly', 'monthly', 'all-time'];
    
    for (const period of periods) {
      const leaderboard = await this.generateLeaderboard(score.gameId, period, 100);
      const leaderboardKey = `${score.gameId}-${period}`;
      this.leaderboards.set(leaderboardKey, leaderboard);
    }

    await this.saveCachedLeaderboards();
  }

  private async checkNewRecord(score: GameScore): Promise<boolean> {
    const userBest = await this.getUserBestScore(score.gameId, score.userId);
    return !userBest || score.score > userBest.score;
  }

  private isLeaderboardStale(leaderboard: Leaderboard): boolean {
    const now = new Date().getTime();
    const lastUpdated = new Date(leaderboard.lastUpdated).getTime();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    return (now - lastUpdated) > staleThreshold;
  }

  private async initializeAnomalyDetection(): Promise<void> {
    // Initialize basic anomaly detection patterns
    // This could be enhanced with ML models in the future
    const patterns = {
      maxScoreMultiplier: 10, // Max score can't be more than 10x the average
      minPlayDuration: 10000, // Minimum 10 seconds play time
      maxSubmissionsPerMinute: 5
    };

    this.anomalyPatterns.set('default', patterns);
    await this.saveAnomalyPatterns();
  }

  // Cache management methods

  private async loadCachedScores(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.SCORES_CACHE_KEY);
      if (cached) {
        const scores = JSON.parse(cached) as GameScore[];
        scores.forEach(score => {
          this.scores.set(score.id, score);
        });
        console.log(`📥 Loaded ${scores.length} cached scores`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached scores:', error);
    }
  }

  private async saveCachedScores(): Promise<void> {
    try {
      const scores = Array.from(this.scores.values());
      await AsyncStorage.setItem(this.SCORES_CACHE_KEY, JSON.stringify(scores));
    } catch (error) {
      console.warn('⚠️ Failed to save cached scores:', error);
    }
  }

  private async loadCachedLeaderboards(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.LEADERBOARDS_CACHE_KEY);
      if (cached) {
        const leaderboards = JSON.parse(cached) as Array<[string, Leaderboard]>;
        leaderboards.forEach(([key, leaderboard]) => {
          this.leaderboards.set(key, leaderboard);
        });
        console.log(`📥 Loaded ${leaderboards.length} cached leaderboards`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached leaderboards:', error);
    }
  }

  private async saveCachedLeaderboards(): Promise<void> {
    try {
      const leaderboards = Array.from(this.leaderboards.entries());
      await AsyncStorage.setItem(this.LEADERBOARDS_CACHE_KEY, JSON.stringify(leaderboards));
    } catch (error) {
      console.warn('⚠️ Failed to save cached leaderboards:', error);
    }
  }

  private async loadRateLimits(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.RATE_LIMITS_KEY);
      if (cached) {
        const rateLimits = JSON.parse(cached) as Array<[string, RateLimitInfo]>;
        rateLimits.forEach(([key, info]) => {
          this.rateLimits.set(key, info);
        });
        console.log(`📥 Loaded ${rateLimits.length} rate limits`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load rate limits:', error);
    }
  }

  private async saveRateLimits(): Promise<void> {
    try {
      const rateLimits = Array.from(this.rateLimits.entries());
      await AsyncStorage.setItem(this.RATE_LIMITS_KEY, JSON.stringify(rateLimits));
    } catch (error) {
      console.warn('⚠️ Failed to save rate limits:', error);
    }
  }

  private async loadAnomalyPatterns(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.ANOMALY_PATTERNS_KEY);
      if (cached) {
        const patterns = JSON.parse(cached) as Array<[string, any]>;
        patterns.forEach(([key, pattern]) => {
          this.anomalyPatterns.set(key, pattern);
        });
        console.log(`📥 Loaded ${patterns.length} anomaly patterns`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load anomaly patterns:', error);
    }
  }

  private async saveAnomalyPatterns(): Promise<void> {
    try {
      const patterns = Array.from(this.anomalyPatterns.entries());
      await AsyncStorage.setItem(this.ANOMALY_PATTERNS_KEY, JSON.stringify(patterns));
    } catch (error) {
      console.warn('⚠️ Failed to save anomaly patterns:', error);
    }
  }
}