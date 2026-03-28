import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export interface FederatedRound {
  id: string;
  modelId: string;
  participants: number;
  minParticipants: number;
  maxParticipants: number;
  startTime: number;
  endTime: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  aggregationMethod: 'fedavg' | 'fedprox' | 'scaffold';
}

export interface ModelUpdate {
  roundId: string;
  deviceId: string;
  modelDelta: number[];
  sampleCount: number;
  trainingLoss: number;
  validationAccuracy?: number;
  signature: string;
  timestamp: number;
}

export interface FederatedConfig {
  enabled: boolean;
  minPrivacyLevel: number;
  maxRoundsPerDay: number;
  minSampleCount: number;
  differentialPrivacyEpsilon: number;
  secureAggregation: boolean;
}

/**
 * Federated Learning Manager - Coordinates privacy-preserving distributed learning
 * 
 * Features:
 * - Differential privacy protection
 * - Secure aggregation protocols
 * - Local model fine-tuning
 * - Privacy budget management
 */
export class FederatedLearningManager {
  private config: FederatedConfig;
  private isInitialized = false;
  private activeRounds = new Map<string, FederatedRound>();
  private participationHistory: string[] = [];
  private privacyBudgetUsed = 0;
  private readonly PRIVACY_BUDGET_LIMIT = 10.0; // Total epsilon budget

  constructor() {
    this.config = {
      enabled: true,
      minPrivacyLevel: 0.5,
      maxRoundsPerDay: 3,
      minSampleCount: 10,
      differentialPrivacyEpsilon: 0.1,
      secureAggregation: true
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🤝 Initializing Federated Learning Manager...');

      // Load configuration and history
      await this.loadConfiguration();
      await this.loadParticipationHistory();

      // Check privacy budget
      this.checkPrivacyBudget();

      this.isInitialized = true;
      console.log('✅ Federated Learning Manager initialized');

    } catch (error) {
      console.error('❌ Federated learning initialization failed:', error);
      throw error;
    }
  }

  /**
   * Participate in a federated learning round
   */
  async participateInRound(): Promise<void> {
    if (!this.isInitialized || !this.config.enabled) {
      console.log('🔒 Federated learning disabled');
      return;
    }

    try {
      // Check participation limits
      if (!this.canParticipate()) {
        console.log('⏸️ Cannot participate: limits exceeded');
        return;
      }

      // Get available rounds
      const availableRounds = await this.getAvailableRounds();
      
      if (availableRounds.length === 0) {
        console.log('📭 No available federated learning rounds');
        return;
      }

      // Select best round to participate in
      const selectedRound = this.selectOptimalRound(availableRounds);
      
      if (!selectedRound) {
        console.log('🚫 No suitable rounds found');
        return;
      }

      // Participate in the round
      await this.participateInSpecificRound(selectedRound);

    } catch (error) {
      console.error('❌ Federated learning participation failed:', error);
    }
  }

  /**
   * Get federated learning status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      enabled: this.config.enabled,
      activeRounds: this.activeRounds.size,
      participationToday: this.getParticipationToday(),
      maxRoundsPerDay: this.config.maxRoundsPerDay,
      privacyBudgetUsed: this.privacyBudgetUsed,
      privacyBudgetLimit: this.PRIVACY_BUDGET_LIMIT,
      canParticipate: this.canParticipate()
    };
  }

  /**
   * Update federated learning configuration
   */
  async updateConfiguration(newConfig: Partial<FederatedConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfiguration();
    
    console.log('⚙️ Federated learning configuration updated');
  }

  // Private methods

  private async loadConfiguration(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('federated_config');
      if (saved) {
        const savedConfig = JSON.parse(saved);
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      console.warn('⚠️ Failed to load federated learning config:', error);
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      await AsyncStorage.setItem('federated_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('⚠️ Failed to save federated learning config:', error);
    }
  }

  private async loadParticipationHistory(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('federated_participation_history');
      if (saved) {
        this.participationHistory = JSON.parse(saved);
        
        // Clean old entries (keep only last 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        this.participationHistory = this.participationHistory.filter(
          entry => parseInt(entry.split('_')[1]) > thirtyDaysAgo
        );
      }
    } catch (error) {
      console.warn('⚠️ Failed to load participation history:', error);
    }
  }

  private async saveParticipationHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'federated_participation_history', 
        JSON.stringify(this.participationHistory)
      );
    } catch (error) {
      console.warn('⚠️ Failed to save participation history:', error);
    }
  }

  private checkPrivacyBudget(): void {
    // Reset privacy budget monthly
    const lastReset = parseInt(
      this.participationHistory.find(entry => entry.startsWith('budget_reset_'))?.split('_')[2] || '0'
    );
    
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    if (lastReset < oneMonthAgo) {
      this.privacyBudgetUsed = 0;
      this.participationHistory.push(`budget_reset_${Date.now()}`);
    } else {
      // Calculate used budget from participation history
      this.privacyBudgetUsed = this.participationHistory
        .filter(entry => entry.startsWith('participation_'))
        .length * this.config.differentialPrivacyEpsilon;
    }
  }

  private canParticipate(): boolean {
    // Check daily participation limit
    const participationToday = this.getParticipationToday();
    if (participationToday >= this.config.maxRoundsPerDay) {
      return false;
    }

    // Check privacy budget
    const budgetAfterParticipation = this.privacyBudgetUsed + this.config.differentialPrivacyEpsilon;
    if (budgetAfterParticipation > this.PRIVACY_BUDGET_LIMIT) {
      return false;
    }

    return true;
  }

  private getParticipationToday(): number {
    const today = new Date().toDateString();
    return this.participationHistory.filter(entry => {
      if (!entry.startsWith('participation_')) return false;
      
      const timestamp = parseInt(entry.split('_')[1]);
      const entryDate = new Date(timestamp).toDateString();
      return entryDate === today;
    }).length;
  }

  private async getAvailableRounds(): Promise<FederatedRound[]> {
    // Simulate fetching available rounds from central server
    const mockRounds: FederatedRound[] = [
      {
        id: 'round_chat_001',
        modelId: 'chat-lite',
        participants: 15,
        minParticipants: 10,
        maxParticipants: 50,
        startTime: Date.now(),
        endTime: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
        status: 'active',
        aggregationMethod: 'fedavg'
      },
      {
        id: 'round_moderation_002',
        modelId: 'moderation-v1',
        participants: 8,
        minParticipants: 5,
        maxParticipants: 30,
        startTime: Date.now() + (30 * 60 * 1000), // Starts in 30 minutes
        endTime: Date.now() + (3 * 60 * 60 * 1000), // 3 hours total
        status: 'pending',
        aggregationMethod: 'fedprox'
      }
    ];

    // Filter rounds based on criteria
    return mockRounds.filter(round => {
      // Only participate in active or pending rounds
      if (round.status !== 'active' && round.status !== 'pending') {
        return false;
      }

      // Check if round hasn't ended
      if (Date.now() > round.endTime) {
        return false;
      }

      // Check if we haven't already participated in this round
      const alreadyParticipated = this.participationHistory.some(
        entry => entry.includes(round.id)
      );
      
      return !alreadyParticipated;
    });
  }

  private selectOptimalRound(rounds: FederatedRound[]): FederatedRound | null {
    if (rounds.length === 0) return null;

    // Prioritize rounds that need more participants
    const sortedRounds = rounds.sort((a, b) => {
      const aNeeds = a.minParticipants - a.participants;
      const bNeeds = b.minParticipants - b.participants;
      
      // Prioritize rounds that need participants to start
      if (aNeeds > 0 && bNeeds <= 0) return -1;
      if (bNeeds > 0 && aNeeds <= 0) return 1;
      
      // Then prioritize by time remaining
      const aTimeRemaining = a.endTime - Date.now();
      const bTimeRemaining = b.endTime - Date.now();
      
      return aTimeRemaining - bTimeRemaining;
    });

    return sortedRounds[0];
  }

  private async participateInSpecificRound(round: FederatedRound): Promise<void> {
    console.log(`🤝 Participating in federated learning round: ${round.id}`);

    try {
      // Generate local training data (simulated)
      const localData = await this.generateLocalTrainingData(round.modelId);
      
      if (localData.sampleCount < this.config.minSampleCount) {
        console.log('📊 Insufficient local data for participation');
        return;
      }

      // Perform local training
      const modelUpdate = await this.performLocalTraining(round, localData);

      // Apply differential privacy
      const privatizedUpdate = this.applyDifferentialPrivacy(modelUpdate);

      // Submit update to central server
      await this.submitModelUpdate(privatizedUpdate);

      // Record participation
      this.recordParticipation(round.id);

      console.log(`✅ Successfully participated in round ${round.id}`);

    } catch (error) {
      console.error(`❌ Failed to participate in round ${round.id}:`, error);
      throw error;
    }
  }

  private async generateLocalTrainingData(modelId: string): Promise<{ sampleCount: number; data: unknown[] }> {
    // Simulate generating local training data
    // In real implementation, would collect anonymized user interactions
    
    const sampleCount = Math.floor(Math.random() * 50) + 10; // 10-60 samples
    const data = Array.from({ length: sampleCount }, (_, i) => ({
      id: i,
      input: `Sample input ${i}`,
      output: `Sample output ${i}`,
      timestamp: Date.now() - Math.random() * 86400000 // Last 24 hours
    }));

    return { sampleCount, data };
  }

  private async performLocalTraining(
    round: FederatedRound, 
    localData: { sampleCount: number; data: unknown[] }
  ): Promise<ModelUpdate> {
    console.log(`🧠 Performing local training for ${localData.sampleCount} samples...`);

    // Simulate local training
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Generate mock model delta (gradient updates)
    const modelDelta = Array.from({ length: 1000 }, () => (Math.random() - 0.5) * 0.01);
    
    const trainingLoss = Math.random() * 0.5 + 0.1; // 0.1 to 0.6
    const validationAccuracy = Math.random() * 0.3 + 0.7; // 0.7 to 1.0

    const update: ModelUpdate = {
      roundId: round.id,
      deviceId: 'device_id_placeholder', // Would use actual device ID
      modelDelta,
      sampleCount: localData.sampleCount,
      trainingLoss,
      validationAccuracy,
      signature: await this.signModelUpdate(modelDelta),
      timestamp: Date.now()
    };

    return update;
  }

  private applyDifferentialPrivacy(update: ModelUpdate): ModelUpdate {
    if (!this.config.differentialPrivacyEpsilon) {
      return update;
    }

    console.log('🔒 Applying differential privacy protection...');

    // Add calibrated noise to model parameters
    const noisyDelta = update.modelDelta.map(param => {
      // Laplace noise for differential privacy
      const sensitivity = 0.01; // L2 sensitivity bound
      const scale = sensitivity / this.config.differentialPrivacyEpsilon;
      const noise = this.sampleLaplaceNoise(scale);
      
      return param + noise;
    });

    return {
      ...update,
      modelDelta: noisyDelta
    };
  }

  private sampleLaplaceNoise(scale: number): number {
    // Sample from Laplace distribution
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  private async submitModelUpdate(update: ModelUpdate): Promise<void> {
    console.log('📤 Submitting model update to central server...');

    // Simulate submission to central aggregation server
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // In real implementation, would make authenticated API call
    console.log('✅ Model update submitted successfully');
  }

  private recordParticipation(roundId: string): void {
    const participationEntry = `participation_${Date.now()}_${roundId}`;
    this.participationHistory.push(participationEntry);
    
    // Update privacy budget
    this.privacyBudgetUsed += this.config.differentialPrivacyEpsilon;
    
    // Save updated history
    this.saveParticipationHistory();
  }

  private async signModelUpdate(modelDelta: number[]): Promise<string> {
    // Create signature for model update integrity
    const content = JSON.stringify({
      deltaHash: await this.hashArray(modelDelta),
      timestamp: Date.now()
    });

    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      content
    );
  }

  private async hashArray(array: number[]): Promise<string> {
    const content = array.join(',');
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      content
    );
  }
}