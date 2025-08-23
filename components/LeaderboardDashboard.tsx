import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Trophy, Medal, Flag, Shield, TrendingUp, Users, Clock, AlertTriangle } from 'lucide-react-native';
import { GamesLeaderboardService, Leaderboard, LeaderboardEntry, GameScore } from '@/services/GamesLeaderboardService';
import { colors } from '@/constants/colors';

interface LeaderboardDashboardProps {
  gameId: string;
  gameName: string;
  userId?: string;
  onScoreSubmit?: (score: number) => void;
}

type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';

export const LeaderboardDashboard: React.FC<LeaderboardDashboardProps> = ({
  gameId,
  gameName,
  userId,
  onScoreSubmit
}) => {
  const [leaderboardService] = useState(() => GamesLeaderboardService.getInstance());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>('all-time');
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userBestScore, setUserBestScore] = useState<GameScore | null>(null);
  const [anomalyStats, setAnomalyStats] = useState<any>(null);
  const [flaggedScores, setFlaggedScores] = useState<GameScore[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const loadLeaderboardData = useCallback(async () => {
    try {
      await leaderboardService.initialize();

      const [
        leaderboardData,
        userRankData,
        userBestScoreData,
        anomalyStatsData,
        flaggedScoresData
      ] = await Promise.all([
        leaderboardService.getLeaderboard(gameId, selectedPeriod, 50),
        userId ? leaderboardService.getUserRank(gameId, userId, selectedPeriod) : null,
        userId ? leaderboardService.getUserBestScore(gameId, userId) : null,
        leaderboardService.getAnomalyStats(gameId),
        leaderboardService.getFlaggedScores(gameId, 10)
      ]);

      setLeaderboard(leaderboardData);
      setUserRank(userRankData);
      setUserBestScore(userBestScoreData);
      setAnomalyStats(anomalyStatsData);
      setFlaggedScores(flaggedScoresData);

    } catch (error) {
      console.error('❌ Failed to load leaderboard data:', error);
      Alert.alert('Error', 'Failed to load leaderboard data');
    }
  }, [leaderboardService, gameId, selectedPeriod, userId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLeaderboardData();
    setRefreshing(false);
  }, [loadLeaderboardData]);

  const handlePeriodChange = useCallback((period: LeaderboardPeriod) => {
    setSelectedPeriod(period);
  }, []);

  const handleScoreSubmission = useCallback(async (score: number) => {
    if (!userId) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await leaderboardService.submitScore(
        {
          gameId,
          score,
          metadata: {
            platform: Platform.OS,
            timestamp: Date.now()
          }
        },
        userId,
        'Current User' // This would come from user context
      );

      if (response.success) {
        let message = `Score submitted successfully!`;
        if (response.rank) {
          message += ` Your rank: #${response.rank}`;
        }
        if (response.newRecord) {
          message += ` 🎉 New personal record!`;
        }
        if (response.flagged) {
          message += `\n⚠️ Score flagged for review: ${response.reason}`;
        }
        
        Alert.alert('Success', message);
        await loadLeaderboardData();
      } else {
        Alert.alert('Score Submission Failed', response.reason || 'Unknown error');
      }

    } catch (error) {
      console.error('❌ Score submission failed:', error);
      Alert.alert('Error', 'Failed to submit score');
    } finally {
      setIsLoading(false);
    }
  }, [leaderboardService, gameId, userId, loadLeaderboardData]);

  const handleFlagScore = useCallback(async (scoreId: string, reason: string) => {
    try {
      await leaderboardService.flagScore(scoreId, reason, userId || 'admin');
      Alert.alert('Success', 'Score flagged for review');
      await loadLeaderboardData();
    } catch (error) {
      console.error('❌ Failed to flag score:', error);
      Alert.alert('Error', 'Failed to flag score');
    }
  }, [leaderboardService, userId, loadLeaderboardData]);

  const handleApproveScore = useCallback(async (scoreId: string) => {
    try {
      await leaderboardService.approveScore(scoreId, userId || 'admin');
      Alert.alert('Success', 'Score approved');
      await loadLeaderboardData();
    } catch (error) {
      console.error('❌ Failed to approve score:', error);
      Alert.alert('Error', 'Failed to approve score');
    }
  }, [leaderboardService, userId, loadLeaderboardData]);

  const handleRejectScore = useCallback(async (scoreId: string, reason: string) => {
    try {
      await leaderboardService.rejectScore(scoreId, reason, userId || 'admin');
      Alert.alert('Success', 'Score rejected');
      await loadLeaderboardData();
    } catch (error) {
      console.error('❌ Failed to reject score:', error);
      Alert.alert('Error', 'Failed to reject score');
    }
  }, [leaderboardService, userId, loadLeaderboardData]);

  useEffect(() => {
    const initializeAndLoad = async () => {
      setIsLoading(true);
      await loadLeaderboardData();
      setIsLoading(false);
    };

    initializeAndLoad();
  }, [loadLeaderboardData]);

  useEffect(() => {
    if (onScoreSubmit) {
      // This would be called when the game wants to submit a score
      // For now, we'll just set up the handler
    }
  }, [onScoreSubmit, handleScoreSubmission]);

  const renderRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={20} color={colors.warning} />;
    if (rank === 2) return <Medal size={20} color="#C0C0C0" />;
    if (rank === 3) return <Medal size={20} color="#CD7F32" />;
    return <Text style={styles.rankNumber}>#{rank}</Text>;
  };

  const renderLeaderboardEntry = (entry: LeaderboardEntry, index: number) => (
    <View key={`${entry.userId}-${index}`} style={[
      styles.leaderboardEntry,
      entry.userId === userId && styles.currentUserEntry
    ]}>
      <View style={styles.rankContainer}>
        {renderRankIcon(entry.rank)}
      </View>
      
      <View style={styles.playerInfo}>
        <Text style={[styles.playerName, entry.userId === userId && styles.currentUserText]}>
          {entry.userName}
        </Text>
        <Text style={styles.scoreText}>
          {entry.score.toLocaleString()} points
        </Text>
      </View>

      <View style={styles.entryActions}>
        {entry.verified ? (
          <Shield size={16} color={colors.success} />
        ) : (
          <AlertTriangle size={16} color={colors.warning} />
        )}
      </View>
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['daily', 'weekly', 'monthly', 'all-time'] as LeaderboardPeriod[]).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.selectedPeriodButton
          ]}
          onPress={() => handlePeriodChange(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.selectedPeriodButtonText
          ]}>
            {period.charAt(0).toUpperCase() + period.slice(1).replace('-', ' ')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderUserStats = () => {
    if (!userId) return null;

    return (
      <View style={styles.userStatsContainer}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <TrendingUp size={20} color={colors.primary} />
            <Text style={styles.statLabel}>Current Rank</Text>
            <Text style={styles.statValue}>
              {userRank ? `#${userRank}` : 'Unranked'}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Trophy size={20} color={colors.warning} />
            <Text style={styles.statLabel}>Best Score</Text>
            <Text style={styles.statValue}>
              {userBestScore ? userBestScore.score.toLocaleString() : '0'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAnomalyStats = () => {
    if (!anomalyStats || !showAdminPanel) return null;

    return (
      <View style={styles.anomalyStatsContainer}>
        <Text style={styles.sectionTitle}>Anti-Cheat Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Users size={16} color={colors.primary} />
            <Text style={styles.statCardLabel}>Total Scores</Text>
            <Text style={styles.statCardValue}>{anomalyStats.totalScores}</Text>
          </View>

          <View style={styles.statCard}>
            <Flag size={16} color={colors.warning} />
            <Text style={styles.statCardLabel}>Flagged</Text>
            <Text style={styles.statCardValue}>{anomalyStats.flaggedScores}</Text>
          </View>

          <View style={styles.statCard}>
            <AlertTriangle size={16} color={colors.error} />
            <Text style={styles.statCardLabel}>Rejected</Text>
            <Text style={styles.statCardValue}>{anomalyStats.rejectedScores}</Text>
          </View>

          <View style={styles.statCard}>
            <TrendingUp size={16} color={colors.success} />
            <Text style={styles.statCardLabel}>Avg Score</Text>
            <Text style={styles.statCardValue}>
              {Math.round(anomalyStats.averageScore).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFlaggedScores = () => {
    if (!showAdminPanel || flaggedScores.length === 0) return null;

    return (
      <View style={styles.flaggedScoresContainer}>
        <Text style={styles.sectionTitle}>Flagged Scores for Review</Text>
        
        {flaggedScores.map((score) => (
          <View key={score.id} style={styles.flaggedScoreItem}>
            <View style={styles.flaggedScoreInfo}>
              <Text style={styles.flaggedScoreUser}>{score.userName}</Text>
              <Text style={styles.flaggedScoreValue}>{score.score.toLocaleString()}</Text>
              <Text style={styles.flaggedScoreReason}>{score.flagReason}</Text>
            </View>
            
            <View style={styles.flaggedScoreActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleApproveScore(score.id)}
              >
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRejectScore(score.id, 'Confirmed cheat')}
              >
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (isLoading && !leaderboard) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>{gameName} Leaderboard</Text>
        
        <TouchableOpacity
          style={styles.adminToggle}
          onPress={() => setShowAdminPanel(!showAdminPanel)}
        >
          <Shield size={20} color={colors.primary} />
          <Text style={styles.adminToggleText}>
            {showAdminPanel ? 'Hide Admin' : 'Show Admin'}
          </Text>
        </TouchableOpacity>
      </View>

      {renderPeriodSelector()}
      {renderUserStats()}

      <View style={styles.leaderboardContainer}>
        <Text style={styles.sectionTitle}>
          {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1).replace('-', ' ')} Rankings
        </Text>
        
        {leaderboard && leaderboard.entries.length > 0 ? (
          leaderboard.entries.map((entry, index) => renderLeaderboardEntry(entry, index))
        ) : (
          <View style={styles.emptyState}>
            <Trophy size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No scores yet</Text>
            <Text style={styles.emptyStateSubtext}>Be the first to set a score!</Text>
          </View>
        )}
      </View>

      {renderAnomalyStats()}
      {renderFlaggedScores()}

      {/* Test Score Submission Button (for development) */}
      {userId && (
        <View style={styles.testContainer}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => {
              const testScore = Math.floor(Math.random() * 10000) + 1000;
              handleScoreSubmission(testScore);
            }}
          >
            <Text style={styles.testButtonText}>Submit Test Score</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  adminToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  adminToggleText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.surface,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  selectedPeriodButton: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  selectedPeriodButtonText: {
    color: colors.white,
  },
  userStatsContainer: {
    padding: 20,
    backgroundColor: colors.surface,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  leaderboardContainer: {
    padding: 20,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentUserEntry: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  currentUserText: {
    color: colors.primary,
  },
  scoreText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  entryActions: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  anomalyStatsContainer: {
    padding: 20,
    backgroundColor: colors.surface,
    marginVertical: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  flaggedScoresContainer: {
    padding: 20,
    backgroundColor: colors.surface,
    marginVertical: 8,
  },
  flaggedScoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginVertical: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  flaggedScoreInfo: {
    flex: 1,
  },
  flaggedScoreUser: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  flaggedScoreValue: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 2,
  },
  flaggedScoreReason: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  flaggedScoreActions: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  testContainer: {
    padding: 20,
    alignItems: 'center',
  },
  testButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});