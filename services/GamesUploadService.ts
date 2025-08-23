import AsyncStorage from '@react-native-async-storage/async-storage';
import { PolicyEngine } from './ai/PolicyEngine';
import { GameMetadata } from '@/components/WebViewSandbox';

export interface GameUploadRequest {
  name: string;
  description: string;
  category: string;
  zipFile: {
    uri: string;
    name: string;
    type: string;
    size: number;
  };
  icon?: {
    uri: string;
    name: string;
    type: string;
  };
  screenshots?: Array<{
    uri: string;
    name: string;
    type: string;
  }>;
  metadata?: {
    version: string;
    developer: string;
    tags: string[];
    minPlayers?: number;
    maxPlayers?: number;
    estimatedPlayTime?: number;
  };
}

export interface GameUploadResponse {
  gameId: string;
  status: 'uploaded' | 'under_review' | 'approved' | 'rejected';
  message: string;
  reviewId?: string;
  estimatedReviewTime?: string;
}

export interface GameReviewStatus {
  gameId: string;
  reviewId: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'suspended';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  feedback?: string;
  securityScanResults?: SecurityScanResults;
  approvalNotes?: string;
  rejectionReason?: string;
}

export interface SecurityScanResults {
  virusScanPassed: boolean;
  domAnalysisPassed: boolean;
  apiWhitelistPassed: boolean;
  cspValidationPassed: boolean;
  sizeValidationPassed: boolean;
  issues: SecurityIssue[];
  riskScore: number; // 0-100
}

export interface SecurityIssue {
  type: 'virus' | 'malicious_api' | 'unsafe_dom' | 'csp_violation' | 'size_limit' | 'content_policy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file?: string;
  line?: number;
  recommendation?: string;
}

export interface GameVersion {
  id: string;
  gameId: string;
  version: string;
  changelog: string;
  cdnPath: string;
  sha256: string;
  cspProfile: string;
  sandboxFlags: Record<string, any>;
  approvedAt: string;
  approvedBy: string;
  status: 'active' | 'deprecated' | 'suspended';
}

/**
 * Games Upload Service - Phase 3 Implementation
 * 
 * Handles:
 * - User game uploads (ZIP files)
 * - Security scanning and validation
 * - Review workflow management
 * - Game version management
 * - CSP profile generation
 */
export class GamesUploadService {
  private static instance: GamesUploadService;
  private policyEngine: PolicyEngine;
  private isInitialized = false;
  
  private readonly API_BASE_URL = 'https://api.rork.com/games';
  private readonly UPLOAD_CACHE_KEY = 'games_upload_cache';
  private readonly REVIEW_CACHE_KEY = 'games_review_cache';
  private readonly VERSION_CACHE_KEY = 'games_version_cache';
  
  private uploadCache = new Map<string, GameUploadResponse>();
  private reviewCache = new Map<string, GameReviewStatus>();
  private versionCache = new Map<string, GameVersion[]>();
  
  // Upload limits and validation
  private readonly MAX_ZIP_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_ICON_SIZE = 2 * 1024 * 1024; // 2MB
  private readonly ALLOWED_ZIP_TYPES = ['application/zip', 'application/x-zip-compressed'];
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly DANGEROUS_APIS = [
    'eval', 'Function', 'setTimeout', 'setInterval',
    'XMLHttpRequest', 'fetch', 'WebSocket',
    'localStorage', 'sessionStorage', 'indexedDB',
    'navigator.geolocation', 'navigator.camera',
    'window.open', 'document.write'
  ];

  private constructor() {
    this.policyEngine = new PolicyEngine();
  }

  static getInstance(): GamesUploadService {
    if (!GamesUploadService.instance) {
      GamesUploadService.instance = new GamesUploadService();
    }
    return GamesUploadService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📤 Initializing Games Upload Service...');

      // Initialize policy engine
      await this.policyEngine.initialize();

      // Load cached data
      await Promise.all([
        this.loadUploadCache(),
        this.loadReviewCache(),
        this.loadVersionCache()
      ]);

      this.isInitialized = true;
      console.log('✅ Games Upload Service initialized');

    } catch (error) {
      console.error('❌ Games Upload Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Upload a new game for review
   */
  async uploadGame(request: GameUploadRequest, userId: string): Promise<GameUploadResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`📤 Starting game upload: ${request.name}`);

      // Validate upload request
      await this.validateUploadRequest(request);

      // Generate game ID
      const gameId = `user-game-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const reviewId = `review-${gameId}`;

      // Perform security scan
      const scanResults = await this.performSecurityScan(request, gameId);

      // Determine initial status based on scan results
      let status: GameReviewStatus['status'] = 'pending';
      let feedback = 'Game uploaded successfully and queued for review.';

      if (scanResults.riskScore > 80) {
        status = 'rejected';
        feedback = 'Game rejected due to high security risk score.';
      } else if (scanResults.riskScore > 50) {
        status = 'in_progress';
        feedback = 'Game requires manual review due to moderate security concerns.';
      }

      // Create review status
      const reviewStatus: GameReviewStatus = {
        gameId,
        reviewId,
        status,
        submittedAt: new Date().toISOString(),
        feedback,
        securityScanResults: scanResults
      };

      // Create upload response
      const response: GameUploadResponse = {
        gameId,
        status: status === 'pending' ? 'under_review' : status === 'rejected' ? 'rejected' : 'under_review',
        message: feedback,
        reviewId,
        estimatedReviewTime: this.calculateEstimatedReviewTime(scanResults.riskScore)
      };

      // Cache the results
      this.uploadCache.set(gameId, response);
      this.reviewCache.set(reviewId, reviewStatus);
      
      await Promise.all([
        this.saveUploadCache(),
        this.saveReviewCache()
      ]);

      // If auto-approved (low risk), create initial version
      if (status === 'pending' && scanResults.riskScore < 20) {
        await this.autoApproveGame(gameId, request, userId, scanResults);
        response.status = 'approved';
        response.message = 'Game automatically approved and published.';
      }

      console.log(`✅ Game upload completed: ${gameId} (${response.status})`);
      return response;

    } catch (error) {
      console.error('❌ Game upload failed:', error);
      throw error;
    }
  }

  /**
   * Get upload status and review information
   */
  async getUploadStatus(gameId: string): Promise<GameReviewStatus | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Find review by game ID
    for (const [reviewId, review] of this.reviewCache.entries()) {
      if (review.gameId === gameId) {
        return review;
      }
    }

    return null;
  }

  /**
   * Get all uploads by user
   */
  async getUserUploads(userId: string): Promise<GameReviewStatus[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // In a real implementation, this would filter by userId
    // For now, return all reviews as mock data
    return Array.from(this.reviewCache.values());
  }

  /**
   * Update game version (for approved games)
   */
  async updateGameVersion(gameId: string, versionData: {
    version: string;
    changelog: string;
    zipFile: GameUploadRequest['zipFile'];
  }, userId: string): Promise<GameVersion> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`📦 Updating game version: ${gameId} -> ${versionData.version}`);

      // Validate that game exists and is approved
      const reviewStatus = await this.getUploadStatus(gameId);
      if (!reviewStatus || reviewStatus.status !== 'approved') {
        throw new Error('Game must be approved before updating versions');
      }

      // Perform security scan on new version
      const mockRequest: GameUploadRequest = {
        name: 'Version Update',
        description: versionData.changelog,
        category: 'update',
        zipFile: versionData.zipFile
      };

      const scanResults = await this.performSecurityScan(mockRequest, gameId);
      
      if (scanResults.riskScore > 50) {
        throw new Error('New version failed security scan');
      }

      // Create new version
      const version: GameVersion = {
        id: `version-${gameId}-${Date.now()}`,
        gameId,
        version: versionData.version,
        changelog: versionData.changelog,
        cdnPath: `https://cdn.rork.com/games/${gameId}/${versionData.version}/`,
        sha256: this.generateMockSHA256(`${gameId}-${versionData.version}`),
        cspProfile: this.generateCSPProfile(gameId, scanResults),
        sandboxFlags: this.generateSandboxFlags(scanResults),
        approvedAt: new Date().toISOString(),
        approvedBy: 'auto-system',
        status: 'active'
      };

      // Update version cache
      const versions = this.versionCache.get(gameId) || [];
      
      // Mark previous versions as deprecated
      versions.forEach(v => {
        if (v.status === 'active') {
          v.status = 'deprecated';
        }
      });
      
      versions.push(version);
      this.versionCache.set(gameId, versions);
      
      await this.saveVersionCache();

      console.log(`✅ Game version updated: ${gameId} -> ${versionData.version}`);
      return version;

    } catch (error) {
      console.error('❌ Game version update failed:', error);
      throw error;
    }
  }

  /**
   * Get game versions
   */
  async getGameVersions(gameId: string): Promise<GameVersion[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.versionCache.get(gameId) || [];
  }

  /**
   * Get active game version
   */
  async getActiveGameVersion(gameId: string): Promise<GameVersion | null> {
    const versions = await this.getGameVersions(gameId);
    return versions.find(v => v.status === 'active') || null;
  }

  /**
   * Admin: Approve game manually
   */
  async approveGame(reviewId: string, adminUserId: string, notes?: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const review = this.reviewCache.get(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    if (review.status === 'approved') {
      throw new Error('Game is already approved');
    }

    // Update review status
    review.status = 'approved';
    review.reviewedAt = new Date().toISOString();
    review.reviewedBy = adminUserId;
    review.approvalNotes = notes;

    this.reviewCache.set(reviewId, review);
    await this.saveReviewCache();

    console.log(`✅ Game approved: ${review.gameId} by ${adminUserId}`);
  }

  /**
   * Admin: Reject game manually
   */
  async rejectGame(reviewId: string, adminUserId: string, reason: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const review = this.reviewCache.get(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    // Update review status
    review.status = 'rejected';
    review.reviewedAt = new Date().toISOString();
    review.reviewedBy = adminUserId;
    review.rejectionReason = reason;

    this.reviewCache.set(reviewId, review);
    await this.saveReviewCache();

    console.log(`❌ Game rejected: ${review.gameId} by ${adminUserId}`);
  }

  // Private methods

  private async validateUploadRequest(request: GameUploadRequest): Promise<void> {
    // Validate file size
    if (request.zipFile.size > this.MAX_ZIP_SIZE) {
      throw new Error(`ZIP file too large. Maximum size is ${this.MAX_ZIP_SIZE / 1024 / 1024}MB`);
    }

    // Validate file type
    if (!this.ALLOWED_ZIP_TYPES.includes(request.zipFile.type)) {
      throw new Error('Invalid file type. Only ZIP files are allowed.');
    }

    // Validate icon if provided
    if (request.icon) {
      if (request.icon.size > this.MAX_ICON_SIZE) {
        throw new Error(`Icon file too large. Maximum size is ${this.MAX_ICON_SIZE / 1024 / 1024}MB`);
      }
      if (!this.ALLOWED_IMAGE_TYPES.includes(request.icon.type)) {
        throw new Error('Invalid icon type. Only JPEG, PNG, and WebP are allowed.');
      }
    }

    // Validate metadata
    if (!request.name || request.name.length < 3) {
      throw new Error('Game name must be at least 3 characters long.');
    }

    if (!request.description || request.description.length < 10) {
      throw new Error('Game description must be at least 10 characters long.');
    }

    // Validate through policy engine
    const validation = await this.policyEngine.validateTask({
      id: `upload-validation-${Date.now()}`,
      type: 'game_upload_validation',
      input: {
        name: request.name,
        description: request.description,
        category: request.category,
        fileSize: request.zipFile.size
      },
      priority: 'high',
      maxTokens: 1000,
      timeout: 30000
    });

    if (!validation.allowed) {
      throw new Error(`Upload validation failed: ${validation.reason}`);
    }
  }

  private async performSecurityScan(request: GameUploadRequest, gameId: string): Promise<SecurityScanResults> {
    console.log(`🔍 Performing security scan for game: ${gameId}`);

    const issues: SecurityIssue[] = [];
    let riskScore = 0;

    // Mock virus scan (in production, use real AV scanner)
    const virusScanPassed = true; // Mock: always pass
    if (!virusScanPassed) {
      issues.push({
        type: 'virus',
        severity: 'critical',
        description: 'Malicious code detected in ZIP file',
        recommendation: 'Remove malicious code and re-upload'
      });
      riskScore += 50;
    }

    // Mock DOM analysis (check for dangerous APIs)
    const domAnalysisPassed = this.analyzeDOMSafety(request);
    if (!domAnalysisPassed) {
      issues.push({
        type: 'unsafe_dom',
        severity: 'high',
        description: 'Potentially dangerous DOM manipulation detected',
        file: 'index.html',
        recommendation: 'Review DOM manipulation code for security issues'
      });
      riskScore += 30;
    }

    // Mock API whitelist check
    const apiWhitelistPassed = this.checkAPIWhitelist(request);
    if (!apiWhitelistPassed) {
      issues.push({
        type: 'malicious_api',
        severity: 'high',
        description: 'Usage of restricted APIs detected',
        recommendation: 'Remove usage of restricted APIs'
      });
      riskScore += 25;
    }

    // Size validation
    const sizeValidationPassed = request.zipFile.size <= this.MAX_ZIP_SIZE;
    if (!sizeValidationPassed) {
      issues.push({
        type: 'size_limit',
        severity: 'medium',
        description: 'File size exceeds maximum allowed limit',
        recommendation: 'Reduce file size and re-upload'
      });
      riskScore += 15;
    }

    // Content policy check (mock)
    const contentPolicyPassed = this.checkContentPolicy(request);
    if (!contentPolicyPassed) {
      issues.push({
        type: 'content_policy',
        severity: 'medium',
        description: 'Content may violate community guidelines',
        recommendation: 'Review content for policy compliance'
      });
      riskScore += 20;
    }

    // CSP validation
    const cspValidationPassed = true; // Mock: always pass for now

    const results: SecurityScanResults = {
      virusScanPassed,
      domAnalysisPassed,
      apiWhitelistPassed,
      cspValidationPassed,
      sizeValidationPassed,
      issues,
      riskScore: Math.min(riskScore, 100)
    };

    console.log(`🔍 Security scan completed: Risk Score ${results.riskScore}/100`);
    return results;
  }

  private analyzeDOMSafety(request: GameUploadRequest): boolean {
    // Mock DOM analysis - check game name/description for suspicious content
    const content = `${request.name} ${request.description}`.toLowerCase();
    const suspiciousTerms = ['script', 'eval', 'onclick', 'onerror', 'javascript:'];
    
    return !suspiciousTerms.some(term => content.includes(term));
  }

  private checkAPIWhitelist(request: GameUploadRequest): boolean {
    // Mock API check - scan description for dangerous API usage
    const content = `${request.name} ${request.description}`.toLowerCase();
    
    return !this.DANGEROUS_APIS.some(api => content.includes(api.toLowerCase()));
  }

  private checkContentPolicy(request: GameUploadRequest): boolean {
    // Mock content policy check
    const content = `${request.name} ${request.description}`.toLowerCase();
    const bannedTerms = ['violence', 'adult', 'gambling', 'hate'];
    
    return !bannedTerms.some(term => content.includes(term));
  }

  private async autoApproveGame(gameId: string, request: GameUploadRequest, userId: string, scanResults: SecurityScanResults): Promise<void> {
    console.log(`🤖 Auto-approving low-risk game: ${gameId}`);

    // Create initial version
    const version: GameVersion = {
      id: `version-${gameId}-1.0.0`,
      gameId,
      version: request.metadata?.version || '1.0.0',
      changelog: 'Initial release',
      cdnPath: `https://cdn.rork.com/games/${gameId}/1.0.0/`,
      sha256: this.generateMockSHA256(gameId),
      cspProfile: this.generateCSPProfile(gameId, scanResults),
      sandboxFlags: this.generateSandboxFlags(scanResults),
      approvedAt: new Date().toISOString(),
      approvedBy: 'auto-system',
      status: 'active'
    };

    this.versionCache.set(gameId, [version]);
    
    // Update review status
    for (const [reviewId, review] of this.reviewCache.entries()) {
      if (review.gameId === gameId) {
        review.status = 'approved';
        review.reviewedAt = new Date().toISOString();
        review.reviewedBy = 'auto-system';
        review.approvalNotes = 'Automatically approved due to low security risk';
        break;
      }
    }

    await Promise.all([
      this.saveVersionCache(),
      this.saveReviewCache()
    ]);
  }

  private generateCSPProfile(gameId: string, scanResults: SecurityScanResults): string {
    // Generate CSP based on security scan results
    const baseCSP = [
      "default-src 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://cdn.rork.com",
      "media-src 'self' https://cdn.rork.com",
      "font-src 'self' https://cdn.rork.com",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "form-action 'none'"
    ];

    // Adjust CSP based on risk score
    if (scanResults.riskScore > 30) {
      // More restrictive for higher risk games
      baseCSP[1] = "script-src 'self'";
    } else {
      // Allow inline scripts for low-risk games
      baseCSP[1] = "script-src 'self' 'unsafe-inline'";
    }

    return baseCSP.join('; ');
  }

  private generateSandboxFlags(scanResults: SecurityScanResults): Record<string, any> {
    return {
      allowScripts: scanResults.riskScore < 50,
      allowSameOrigin: scanResults.riskScore < 30,
      allowForms: scanResults.riskScore < 40,
      allowPopups: false,
      allowModals: scanResults.riskScore < 20,
      allowPointerLock: scanResults.riskScore < 30,
      allowOrientationLock: scanResults.riskScore < 40
    };
  }

  private calculateEstimatedReviewTime(riskScore: number): string {
    if (riskScore < 20) {
      return 'Auto-approved';
    } else if (riskScore < 50) {
      return '1-2 business days';
    } else if (riskScore < 80) {
      return '3-5 business days';
    } else {
      return '1-2 weeks';
    }
  }

  private generateMockSHA256(input: string): string {
    // Mock SHA256 generation
    const hash = input.split('').reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
    }, 0);
    return Math.abs(hash).toString(16).padStart(64, '0').substring(0, 64);
  }

  // Cache management methods

  private async loadUploadCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.UPLOAD_CACHE_KEY);
      if (cached) {
        const uploads = JSON.parse(cached) as Array<[string, GameUploadResponse]>;
        uploads.forEach(([gameId, response]) => {
          this.uploadCache.set(gameId, response);
        });
        console.log(`📥 Loaded ${uploads.length} cached uploads`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load upload cache:', error);
    }
  }

  private async loadReviewCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.REVIEW_CACHE_KEY);
      if (cached) {
        const reviews = JSON.parse(cached) as Array<[string, GameReviewStatus]>;
        reviews.forEach(([reviewId, status]) => {
          this.reviewCache.set(reviewId, status);
        });
        console.log(`📥 Loaded ${reviews.length} cached reviews`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load review cache:', error);
    }
  }

  private async loadVersionCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.VERSION_CACHE_KEY);
      if (cached) {
        const versions = JSON.parse(cached) as Array<[string, GameVersion[]]>;
        versions.forEach(([gameId, gameVersions]) => {
          this.versionCache.set(gameId, gameVersions);
        });
        console.log(`📥 Loaded ${versions.length} cached version sets`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load version cache:', error);
    }
  }

  private async saveUploadCache(): Promise<void> {
    try {
      const uploads = Array.from(this.uploadCache.entries());
      await AsyncStorage.setItem(this.UPLOAD_CACHE_KEY, JSON.stringify(uploads));
    } catch (error) {
      console.warn('⚠️ Failed to save upload cache:', error);
    }
  }

  private async saveReviewCache(): Promise<void> {
    try {
      const reviews = Array.from(this.reviewCache.entries());
      await AsyncStorage.setItem(this.REVIEW_CACHE_KEY, JSON.stringify(reviews));
    } catch (error) {
      console.warn('⚠️ Failed to save review cache:', error);
    }
  }

  private async saveVersionCache(): Promise<void> {
    try {
      const versions = Array.from(this.versionCache.entries());
      await AsyncStorage.setItem(this.VERSION_CACHE_KEY, JSON.stringify(versions));
    } catch (error) {
      console.warn('⚠️ Failed to save version cache:', error);
    }
  }
}