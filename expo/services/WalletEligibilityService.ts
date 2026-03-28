import { WalletEligibility, DailyUsageRecord } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

class WalletEligibilityService {
  private static instance: WalletEligibilityService;
  private readonly STORAGE_KEY = 'wallet_eligibility';
  private readonly USAGE_STORAGE_KEY = 'daily_usage_records';
  private readonly REQUIRED_DAYS = 14;

  static getInstance(): WalletEligibilityService {
    if (!WalletEligibilityService.instance) {
      WalletEligibilityService.instance = new WalletEligibilityService();
    }
    return WalletEligibilityService.instance;
  }

  // Record daily usage
  async recordDailyUsage(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const now = Date.now();

      // Get existing usage records
      const usageRecords = await this.getUserUsageRecords(userId);
      
      // Check if today is already recorded
      const todayRecord = usageRecords.find(record => record.date === today);
      
      if (todayRecord) {
        // Update existing record
        todayRecord.activityCount += 1;
        todayRecord.lastActivity = now;
      } else {
        // Create new record for today
        const newRecord: DailyUsageRecord = {
          date: today,
          timestamp: now,
          activityCount: 1,
          lastActivity: now
        };
        usageRecords.push(newRecord);
      }

      // Keep only last 30 days of records
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
      
      const filteredRecords = usageRecords.filter(record => record.date >= cutoffDate);
      
      // Save updated records
      await AsyncStorage.setItem(
        `${this.USAGE_STORAGE_KEY}_${userId}`,
        JSON.stringify(filteredRecords)
      );

      // Update eligibility
      await this.updateEligibility(userId, filteredRecords);
    } catch (error) {
      console.error('Failed to record daily usage:', error);
    }
  }

  // Get user's usage records
  private async getUserUsageRecords(userId: string): Promise<DailyUsageRecord[]> {
    try {
      const stored = await AsyncStorage.getItem(`${this.USAGE_STORAGE_KEY}_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get usage records:', error);
      return [];
    }
  }

  // Update wallet eligibility based on usage
  private async updateEligibility(userId: string, usageRecords: DailyUsageRecord[]): Promise<void> {
    try {
      const now = Date.now();
      const totalDaysUsed = usageRecords.length;
      
      // Calculate consecutive days (not required, but tracked)
      let consecutiveDays = 0;
      const sortedRecords = usageRecords.sort((a, b) => b.date.localeCompare(a.date));
      
      for (let i = 0; i < sortedRecords.length; i++) {
        const recordDate = new Date(sortedRecords[i].date);
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        
        if (recordDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
          consecutiveDays++;
        } else {
          break;
        }
      }

      // Get existing eligibility or create new
      let eligibility = await this.getWalletEligibility(userId);
      
      if (!eligibility) {
        eligibility = {
          userId,
          isEligible: false,
          dailyUsageStreak: consecutiveDays,
          totalDaysUsed,
          firstUsageDate: usageRecords.length > 0 ? new Date(usageRecords[0].date).getTime() : now,
          lastUsageDate: now,
          eligibilityRequirement: {
            minimumDays: this.REQUIRED_DAYS,
            consecutiveRequired: false
          },
          usageHistory: usageRecords
        };
      } else {
        eligibility.dailyUsageStreak = consecutiveDays;
        eligibility.totalDaysUsed = totalDaysUsed;
        eligibility.lastUsageDate = now;
        eligibility.usageHistory = usageRecords;
      }

      // Check if user becomes eligible
      if (!eligibility.isEligible && totalDaysUsed >= this.REQUIRED_DAYS) {
        eligibility.isEligible = true;
        eligibility.eligibilityDate = now;
        
        // Notify user of eligibility
        await this.notifyWalletEligibility(userId);
      }

      // Save updated eligibility
      await AsyncStorage.setItem(
        `${this.STORAGE_KEY}_${userId}`,
        JSON.stringify(eligibility)
      );
    } catch (error) {
      console.error('Failed to update eligibility:', error);
    }
  }

  // Get wallet eligibility for user
  async getWalletEligibility(userId: string): Promise<WalletEligibility | null> {
    try {
      const stored = await AsyncStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get wallet eligibility:', error);
      return null;
    }
  }

  // Check if user is eligible for wallet features
  async isWalletEligible(userId: string): Promise<boolean> {
    const eligibility = await this.getWalletEligibility(userId);
    return eligibility?.isEligible || false;
  }

  // Get days remaining until eligibility
  async getDaysUntilEligible(userId: string): Promise<number> {
    const eligibility = await this.getWalletEligibility(userId);
    if (!eligibility) return this.REQUIRED_DAYS;
    if (eligibility.isEligible) return 0;
    
    return Math.max(0, this.REQUIRED_DAYS - eligibility.totalDaysUsed);
  }

  // Get eligibility progress (0-1)
  async getEligibilityProgress(userId: string): Promise<number> {
    const eligibility = await this.getWalletEligibility(userId);
    if (!eligibility) return 0;
    if (eligibility.isEligible) return 1;
    
    return Math.min(1, eligibility.totalDaysUsed / this.REQUIRED_DAYS);
  }

  // Notify user when they become eligible
  private async notifyWalletEligibility(userId: string): Promise<void> {
    try {
      // This would integrate with your notification system
      console.log(`User ${userId} is now eligible for wallet features!`);
      
      // You could send a push notification, in-app notification, etc.
      // For now, we'll just log it
    } catch (error) {
      console.error('Failed to notify wallet eligibility:', error);
    }
  }

  // Reset eligibility (for testing or admin purposes)
  async resetEligibility(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.STORAGE_KEY}_${userId}`);
      await AsyncStorage.removeItem(`${this.USAGE_STORAGE_KEY}_${userId}`);
    } catch (error) {
      console.error('Failed to reset eligibility:', error);
    }
  }

  // Get eligibility statistics for admin
  async getEligibilityStats(): Promise<{
    totalUsers: number;
    eligibleUsers: number;
    averageDaysToEligibility: number;
    eligibilityRate: number;
  }> {
    try {
      // This would typically query a database
      // For now, return mock data
      return {
        totalUsers: 1000,
        eligibleUsers: 750,
        averageDaysToEligibility: 12,
        eligibilityRate: 0.75
      };
    } catch (error) {
      console.error('Failed to get eligibility stats:', error);
      return {
        totalUsers: 0,
        eligibleUsers: 0,
        averageDaysToEligibility: 0,
        eligibilityRate: 0
      };
    }
  }
}

export default WalletEligibilityService;