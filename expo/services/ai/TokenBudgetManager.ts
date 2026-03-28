/**
 * Token Budget Manager - Manages 200k token constraint per session
 * 
 * Features:
 * - Dynamic token allocation and tracking
 * - Budget enforcement with safety margins
 * - Token usage analytics
 * - Automatic budget reset on session boundaries
 */
export class TokenBudgetManager {
  private maxTokens: number;
  private usedTokens = 0;
  private allocatedTokens = 0;
  private sessionStartTime = Date.now();
  private usageHistory: Array<{ timestamp: number; tokens: number; task: string }> = [];
  private readonly SAFETY_MARGIN = 0.1; // 10% safety margin

  constructor(maxTokens: number) {
    this.maxTokens = maxTokens;
  }

  async initialize(): Promise<void> {
    console.log(`🎯 Token Budget Manager initialized with ${this.maxTokens} tokens`);
  }

  /**
   * Check if tokens can be allocated
   */
  canAllocate(tokens: number): boolean {
    const availableTokens = this.maxTokens - this.usedTokens - this.allocatedTokens;
    const safetyBuffer = this.maxTokens * this.SAFETY_MARGIN;
    
    return (tokens + safetyBuffer) <= availableTokens;
  }

  /**
   * Allocate tokens for a task
   */
  allocate(tokens: number): boolean {
    if (!this.canAllocate(tokens)) {
      return false;
    }

    this.allocatedTokens += tokens;
    return true;
  }

  /**
   * Release allocated tokens (when task completes)
   */
  release(tokens: number): void {
    this.allocatedTokens = Math.max(0, this.allocatedTokens - tokens);
  }

  /**
   * Consume tokens (actual usage)
   */
  consume(tokens: number, taskType: string): void {
    this.usedTokens += tokens;
    this.allocatedTokens = Math.max(0, this.allocatedTokens - tokens);
    
    // Track usage history
    this.usageHistory.push({
      timestamp: Date.now(),
      tokens,
      task: taskType
    });

    // Keep only recent history (last 100 entries)
    if (this.usageHistory.length > 100) {
      this.usageHistory = this.usageHistory.slice(-50);
    }
  }

  /**
   * Get current budget status
   */
  getStatus() {
    const remainingTokens = this.maxTokens - this.usedTokens - this.allocatedTokens;
    const usagePercentage = (this.usedTokens / this.maxTokens) * 100;
    const sessionDuration = Date.now() - this.sessionStartTime;

    return {
      maxTokens: this.maxTokens,
      usedTokens: this.usedTokens,
      allocatedTokens: this.allocatedTokens,
      remainingTokens,
      usagePercentage,
      sessionDuration,
      canAllocateMore: remainingTokens > (this.maxTokens * this.SAFETY_MARGIN),
      recentUsage: this.getRecentUsageStats()
    };
  }

  /**
   * Reset budget for new session
   */
  resetSession(): void {
    this.usedTokens = 0;
    this.allocatedTokens = 0;
    this.sessionStartTime = Date.now();
    this.usageHistory = [];
    
    console.log('🔄 Token budget reset for new session');
  }

  /**
   * Get usage statistics for the last hour
   */
  private getRecentUsageStats() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentUsage = this.usageHistory.filter(entry => entry.timestamp > oneHourAgo);
    
    const totalTokens = recentUsage.reduce((sum, entry) => sum + entry.tokens, 0);
    const taskCounts = recentUsage.reduce((acc, entry) => {
      acc[entry.task] = (acc[entry.task] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTokens,
      taskCount: recentUsage.length,
      taskBreakdown: taskCounts,
      avgTokensPerTask: recentUsage.length > 0 ? totalTokens / recentUsage.length : 0
    };
  }

  /**
   * Predict if budget will be exceeded
   */
  predictBudgetExhaustion(): { willExceed: boolean; estimatedTime?: number } {
    if (this.usageHistory.length < 5) {
      return { willExceed: false };
    }

    // Calculate usage rate (tokens per minute)
    const recentEntries = this.usageHistory.slice(-10);
    const timeSpan = recentEntries[recentEntries.length - 1].timestamp - recentEntries[0].timestamp;
    const tokensUsed = recentEntries.reduce((sum, entry) => sum + entry.tokens, 0);
    
    if (timeSpan === 0) return { willExceed: false };

    const tokensPerMinute = (tokensUsed / timeSpan) * 60000; // Convert to per minute
    const remainingTokens = this.maxTokens - this.usedTokens - this.allocatedTokens;
    
    if (tokensPerMinute <= 0) return { willExceed: false };

    const estimatedMinutesToExhaustion = remainingTokens / tokensPerMinute;
    
    return {
      willExceed: estimatedMinutesToExhaustion < 60, // Will exceed in next hour
      estimatedTime: estimatedMinutesToExhaustion * 60000 // Convert to milliseconds
    };
  }

  /**
   * Get optimal chunk size for large tasks
   */
  getOptimalChunkSize(): number {
    const remainingTokens = this.maxTokens - this.usedTokens - this.allocatedTokens;
    const safetyBuffer = this.maxTokens * this.SAFETY_MARGIN;
    
    // Use 25% of remaining budget for chunking, with minimum of 1000 tokens
    return Math.max(1000, Math.floor((remainingTokens - safetyBuffer) * 0.25));
  }
}