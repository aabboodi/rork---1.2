import PersonalizationSignalsService from '@/services/ai/PersonalizationSignalsService';
import SecurityGuardrailsService from '@/services/ai/SecurityGuardrailsService';
import { RankedContent } from './reranker';

export interface BanditState {
  epsilon: number;
  counts: Record<string, number>;
  rewards: Record<string, number>;
  totalReward: number;
  totalCount: number;
  confidenceSignals: number;
  lastUpdate: number;
}

export interface BanditMetrics {
  explorationRate: number;
  averageReward: number;
  totalExplorations: number;
  totalExploitations: number;
  confidenceLevel: number;
}

class BanditService {
  private static instance: BanditService;
  private readonly BANDIT_STORAGE_KEY = 'bandit_state';
  private readonly EPSILON_DECAY = 0.995;
  private readonly MIN_EPSILON = 0.05;
  private readonly MAX_EPSILON = 0.3;
  private readonly CONFIDENCE_THRESHOLD = 1000;
  
  private signalsService: PersonalizationSignalsService;
  private securityGuardrails: SecurityGuardrailsService;
  private banditState: BanditState;
  private isInitialized = false;

  private constructor() {
    this.signalsService = PersonalizationSignalsService.getInstance();
    this.securityGuardrails = SecurityGuardrailsService.getInstance();
    this.banditState = {
      epsilon: 0.1,
      counts: {},
      rewards: {},
      totalReward: 0,
      totalCount: 0,
      confidenceSignals: 0,
      lastUpdate: Date.now()
    };
  }

  static getInstance(): BanditService {
    if (!BanditService.instance) {
      BanditService.instance = new BanditService();
    }
    return BanditService.instance;
  }

  // Initialize bandit system
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🎰 Initializing Bandit System...');
      
      // Load existing bandit state
      await this.loadBanditState();
      
      // Initialize security guardrails
      await this.securityGuardrails.initialize();
      
      console.log('✅ Bandit System initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Bandit System:', error);
      throw error;
    }
  }

  // Apply bandit exploration with dynamic ε and Thompson Sampling elements
  async applyBanditExploration(rankedContent: RankedContent[]): Promise<RankedContent[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (rankedContent.length === 0) {
        return rankedContent;
      }

      // Dynamic ε that decreases with confidence accumulation (ε ديناميكية ↘︎ مع تراكم إشارات الثقة)
      const dynamicEpsilon = this.computeDynamicEpsilon();
      
      // ε-greedy with Thompson Sampling elements
      if (Math.random() < dynamicEpsilon) {
        console.log(`🔍 Exploration mode (epsilon=${dynamicEpsilon.toFixed(3)})`);
        return await this.performExploration(rankedContent);
      } else {
        console.log(`🎯 Exploitation mode (epsilon=${dynamicEpsilon.toFixed(3)})`);
        return await this.performExploitation(rankedContent);
      }
    } catch (error) {
      console.error('Failed to apply bandit exploration:', error);
      return rankedContent; // Return original ranking on error
    }
  }

  // Record user feedback for bandit learning
  async recordFeedback(
    contentId: string,
    action: 'view' | 'like' | 'share' | 'skip' | 'report',
    dwellTime?: number,
    metadata?: { slot?: string; position?: number }
  ): Promise<void> {
    try {
      // Calculate reward based on action and dwell time
      let reward = 0;
      switch (action) {
        case 'like': reward = 1.0; break;
        case 'share': reward = 1.2; break;
        case 'view': reward = dwellTime ? Math.min(dwellTime / 10000, 0.5) : 0.1; break;
        case 'skip': reward = -0.1; break;
        case 'report': reward = -1.0; break;
      }

      // Update bandit state
      this.banditState.counts[contentId] = (this.banditState.counts[contentId] || 0) + 1;
      this.banditState.rewards[contentId] = (this.banditState.rewards[contentId] || 0) + reward;
      this.banditState.totalReward += reward;
      this.banditState.totalCount += 1;
      this.banditState.confidenceSignals += Math.abs(reward); // Accumulate confidence signals
      this.banditState.lastUpdate = Date.now();
      
      // Decay epsilon for exploration-exploitation balance
      this.banditState.epsilon = Math.max(
        this.banditState.epsilon * this.EPSILON_DECAY,
        this.MIN_EPSILON
      );

      // Save updated state
      await this.saveBanditState();
      
      console.log(`📈 Bandit feedback recorded: ${action} for ${contentId}, reward: ${reward}, epsilon: ${this.banditState.epsilon.toFixed(3)}`);
    } catch (error) {
      console.error('Failed to record bandit feedback:', error);
    }
  }

  // Get bandit performance metrics
  async getMetrics(): Promise<BanditMetrics> {
    try {
      const totalActions = Object.values(this.banditState.counts).reduce((sum, count) => sum + count, 0);
      const averageReward = this.banditState.totalCount > 0 ? this.banditState.totalReward / this.banditState.totalCount : 0;
      
      // Estimate explorations vs exploitations
      const estimatedExplorations = Math.floor(totalActions * this.banditState.epsilon);
      const estimatedExploitations = totalActions - estimatedExplorations;
      
      // Confidence level based on accumulated signals
      const confidenceLevel = Math.min(this.banditState.confidenceSignals / this.CONFIDENCE_THRESHOLD, 1.0);
      
      return {
        explorationRate: this.banditState.epsilon,
        averageReward,
        totalExplorations: estimatedExplorations,
        totalExploitations: estimatedExploitations,
        confidenceLevel
      };
    } catch (error) {
      console.error('Failed to get bandit metrics:', error);
      return {
        explorationRate: 0.1,
        averageReward: 0,
        totalExplorations: 0,
        totalExploitations: 0,
        confidenceLevel: 0
      };
    }
  }

  // Reset bandit state (for testing or fresh start)
  async resetBanditState(): Promise<void> {
    try {
      this.banditState = {
        epsilon: 0.1,
        counts: {},
        rewards: {},
        totalReward: 0,
        totalCount: 0,
        confidenceSignals: 0,
        lastUpdate: Date.now()
      };
      
      await this.saveBanditState();
      console.log('🔄 Bandit state reset');
    } catch (error) {
      console.error('Failed to reset bandit state:', error);
    }
  }

  // Private methods
  private computeDynamicEpsilon(): number {
    // Dynamic epsilon that decreases with confidence accumulation
    const confidenceSignals = this.banditState.confidenceSignals;
    const baseEpsilon = this.banditState.epsilon;
    
    // Apply exponential decay based on confidence signals
    const confidenceDecay = Math.exp(-confidenceSignals / this.CONFIDENCE_THRESHOLD);
    const dynamicEpsilon = Math.max(
      this.MIN_EPSILON,
      Math.min(this.MAX_EPSILON, baseEpsilon * confidenceDecay)
    );
    
    return dynamicEpsilon;
  }

  private async performExploration(rankedContent: RankedContent[]): Promise<RankedContent[]> {
    // Thompson Sampling-inspired exploration
    const explorationCount = Math.min(5, Math.floor(rankedContent.length * 0.2));
    const toExplore = rankedContent.slice(0, explorationCount);
    
    // Add uncertainty bonus to less-explored items (Upper Confidence Bound approach)
    const exploredItems = toExplore.map(item => {
      const itemCount = this.banditState.counts[item.id] || 0;
      const totalCount = this.banditState.totalCount || 1;
      
      // UCB1 formula: uncertainty bonus = sqrt(2 * ln(total_count) / item_count)
      const uncertaintyBonus = itemCount > 0 
        ? Math.sqrt(2 * Math.log(totalCount) / itemCount)
        : 1.0; // High bonus for unexplored items
      
      return {
        ...item,
        score: item.score + uncertaintyBonus * 0.1, // Scale uncertainty bonus
        reasons: [...item.reasons, 'exploration']
      };
    }).sort((a, b) => b.score - a.score);
    
    // Combine explored items with remaining items
    return [...exploredItems, ...rankedContent.slice(explorationCount)];
  }

  private async performExploitation(rankedContent: RankedContent[]): Promise<RankedContent[]> {
    // Pure exploitation: use current ranking with slight adjustments based on historical performance
    return rankedContent.map(item => {
      const itemCount = this.banditState.counts[item.id] || 0;
      const itemReward = this.banditState.rewards[item.id] || 0;
      
      // Adjust score based on historical performance
      const historicalPerformance = itemCount > 0 ? itemReward / itemCount : 0;
      const adjustedScore = item.score + historicalPerformance * 0.05; // Small adjustment
      
      return {
        ...item,
        score: Math.max(0, Math.min(1, adjustedScore)),
        reasons: item.reasons.includes('exploitation') ? item.reasons : [...item.reasons, 'exploitation']
      };
    }).sort((a, b) => b.score - a.score);
  }

  private async loadBanditState(): Promise<void> {
    try {
      const stored = await this.getEncrypted(this.BANDIT_STORAGE_KEY);
      if (stored) {
        this.banditState = { ...this.banditState, ...stored };
        console.log(`📊 Loaded bandit state: ${this.banditState.totalCount} total actions, epsilon=${this.banditState.epsilon.toFixed(3)}`);
      }
    } catch (error) {
      console.error('Failed to load bandit state:', error);
    }
  }

  private async saveBanditState(): Promise<void> {
    try {
      await this.storeEncrypted(this.BANDIT_STORAGE_KEY, this.banditState);
    } catch (error) {
      console.error('Failed to save bandit state:', error);
    }
  }

  private async storeEncrypted(key: string, data: any): Promise<void> {
    // Use the same encryption method as PersonalizationSignalsService
    await this.signalsService['storeEncrypted'](key, data);
  }

  private async getEncrypted(key: string): Promise<any> {
    // Use the same decryption method as PersonalizationSignalsService
    return await this.signalsService['getEncrypted'](key);
  }
}

export default BanditService;