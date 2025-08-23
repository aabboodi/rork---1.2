import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch
} from 'react-native';
import { Stack } from 'expo-router';
import { 
  Trophy, 
  Shield, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Flag,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react-native';
import { GamesService } from '@/services/GamesService';
import { GamesLeaderboardService } from '@/services/GamesLeaderboardService';
import { LeaderboardDashboard } from '@/components/LeaderboardDashboard';
import { colors } from '@/constants/colors';

export default function Phase4LeaderboardDemo() {
  const [gamesService] = useState(() => GamesService.getInstance());
  const [leaderboardService] = useState(() => GamesLeaderboardService.getInstance());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string>('demo-tetris');
  const [testScore, setTestScore] = useState('1000');
  const [userId] = useState('demo-user-123');
  const [userName] = useState('Demo Player');
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [anomalyStats, setAnomalyStats] = useState<any>(null);
  const [flaggedScores, setFlaggedScores] = useState<any[]>([]);
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(true);

  const initializeServices = useCallback(async () => {
    try {
      console.log('🏆 Initializing Phase 4 Leaderboard Demo...');
      
      await Promise.all([
        gamesService.initialize(),
        leaderboardService.initialize()
      ]);

      // Load demo data
      await loadDemoData();
      
      console.log('✅ Phase 4 services initialized');
    } catch (error) {
      console.error('❌ Phase 4 initialization failed:', error);
      Alert.alert('Initialization Error', 'Failed to initialize leaderboard services');
    } finally {
      setIsLoading(false);
    }
  }, [gamesService, leaderboardService]);

  const loadDemoData = useCallback(async () => {
    try {
      // Get anomaly stats for demo game
      const stats = await gamesService.getGameAnomalyStats(selectedGame);
      setAnomalyStats(stats);

      // Get flagged scores
      const flagged = await gamesService.getFlaggedGameScores(selectedGame, 5);
      setFlaggedScores(flagged);

    } catch (error) {
      console.warn('⚠️ Failed to load demo data:', error);
    }
  }, [gamesService, selectedGame]);

  const handleSubmitScore = useCallback(async () => {
    if (!testScore || isNaN(Number(testScore))) {
      Alert.alert('Invalid Score', 'Please enter a valid numeric score');
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await gamesService.submitGameScore(
        {
          gameId: selectedGame,
          score: Number(testScore),
          metadata: {
            platform: 'demo',
            antiCheatEnabled,
            timestamp: Date.now()
          }
        },
        userId,
        userName
      );

      let message = response.success ? 'Score submitted successfully!' : 'Score submission failed!';
      
      if (response.success) {
        if (response.rank) {
          message += `\\n🏆 Your rank: #${response.rank}`;
        }
        if (response.newRecord) {
          message += '\\n🎉 New personal record!';
        }
        if (response.flagged) {
          message += `\\n⚠️ Score flagged: ${response.reason}`;
        }
      } else {
        message += `\\n❌ Reason: ${response.reason}`;
      }

      Alert.alert('Score Submission', message);
      
      // Reload demo data
      await loadDemoData();

    } catch (error) {
      console.error('❌ Score submission failed:', error);
      Alert.alert('Error', 'Failed to submit score');
    } finally {
      setIsLoading(false);
    }
  }, [gamesService, selectedGame, testScore, userId, userName, antiCheatEnabled, loadDemoData]);

  const handleSubmitSuspiciousScore = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Submit an obviously suspicious score to test anti-cheat
      const suspiciousScore = 999999999;
      
      const response = await gamesService.submitGameScore(
        {
          gameId: selectedGame,
          score: suspiciousScore,
          metadata: {
            platform: 'demo',
            suspicious: true,
            timestamp: Date.now()
          }
        },
        userId,
        userName
      );

      let message = 'Suspicious score test completed!';
      
      if (response.flagged || !response.success) {
        message += '\\n✅ Anti-cheat system working correctly';
        message += `\\n🚩 ${response.reason}`;
      } else {
        message += '\\n⚠️ Score was not flagged - check anti-cheat settings';
      }

      Alert.alert('Anti-Cheat Test', message);
      
      // Reload demo data
      await loadDemoData();

    } catch (error) {
      console.error('❌ Suspicious score test failed:', error);
      Alert.alert('Error', 'Failed to test suspicious score');
    } finally {
      setIsLoading(false);
    }
  }, [gamesService, selectedGame, userId, userName, loadDemoData]);

  const handleApproveScore = useCallback(async (scoreId: string) => {
    try {
      await gamesService.approveGameScore(scoreId, 'demo-admin');
      Alert.alert('Success', 'Score approved');
      await loadDemoData();
    } catch (error) {
      console.error('❌ Failed to approve score:', error);
      Alert.alert('Error', 'Failed to approve score');
    }
  }, [gamesService, loadDemoData]);

  const handleRejectScore = useCallback(async (scoreId: string) => {
    try {
      await gamesService.rejectGameScore(scoreId, 'Confirmed cheat attempt', 'demo-admin');
      Alert.alert('Success', 'Score rejected');
      await loadDemoData();
    } catch (error) {
      console.error('❌ Failed to reject score:', error);
      Alert.alert('Error', 'Failed to reject score');
    }
  }, [gamesService, loadDemoData]);

  useEffect(() => {
    initializeServices();
  }, [initializeServices]);

  useEffect(() => {
    if (!isLoading) {
      loadDemoData();
    }
  }, [selectedGame, isLoading, loadDemoData]);

  const renderGameSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>Select Demo Game:</Text>
      <View style={styles.gameButtons}>
        {[
          { id: 'demo-tetris', name: 'Tetris', icon: '🧩' },
          { id: 'demo-snake', name: 'Snake', icon: '🐍' },
          { id: 'demo-puzzle', name: 'Puzzle', icon: '🎯' }
        ].map((game) => (
          <TouchableOpacity
            key={game.id}
            style={[
              styles.gameButton,
              selectedGame === game.id && styles.selectedGameButton
            ]}
            onPress={() => setSelectedGame(game.id)}
          >
            <Text style={styles.gameIcon}>{game.icon}</Text>
            <Text style={[
              styles.gameButtonText,
              selectedGame === game.id && styles.selectedGameButtonText
            ]}>
              {game.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderScoreSubmission = () => (
    <View style={styles.submissionContainer}>
      <Text style={styles.sectionTitle}>
        <Target size={20} color={colors.primary} /> Score Submission Test
      </Text>
      
      <View style={styles.inputRow}>
        <TextInput
          style={styles.scoreInput}
          value={testScore}
          onChangeText={setTestScore}
          placeholder="Enter score"
          keyboardType="numeric"
        />
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitScore}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.antiCheatToggle}>
        <Text style={styles.toggleLabel}>Anti-Cheat Enabled:</Text>
        <Switch
          value={antiCheatEnabled}
          onValueChange={setAntiCheatEnabled}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>

      <TouchableOpacity
        style={styles.suspiciousButton}
        onPress={handleSubmitSuspiciousScore}
        disabled={isLoading}
      >
        <AlertTriangle size={16} color={colors.white} />
        <Text style={styles.suspiciousButtonText}>Test Suspicious Score</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAnomalyStats = () => {
    if (!anomalyStats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>
          <BarChart3 size={20} color={colors.primary} /> Anti-Cheat Statistics
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Users size={24} color={colors.primary} />
            <Text style={styles.statValue}>{anomalyStats.totalScores}</Text>
            <Text style={styles.statLabel}>Total Scores</Text>
          </View>

          <View style={styles.statCard}>
            <Flag size={24} color={colors.warning} />
            <Text style={styles.statValue}>{anomalyStats.flaggedScores}</Text>
            <Text style={styles.statLabel}>Flagged</Text>
          </View>

          <View style={styles.statCard}>
            <XCircle size={24} color={colors.error} />
            <Text style={styles.statValue}>{anomalyStats.rejectedScores}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>

          <View style={styles.statCard}>
            <TrendingUp size={24} color={colors.success} />
            <Text style={styles.statValue}>
              {Math.round(anomalyStats.averageScore).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFlaggedScores = () => {
    if (flaggedScores.length === 0) return null;

    return (
      <View style={styles.flaggedContainer}>
        <Text style={styles.sectionTitle}>
          <Flag size={20} color={colors.warning} /> Flagged Scores Review
        </Text>
        
        {flaggedScores.map((score) => (
          <View key={score.id} style={styles.flaggedItem}>
            <View style={styles.flaggedInfo}>
              <Text style={styles.flaggedUser}>{score.userName}</Text>
              <Text style={styles.flaggedScore}>{score.score.toLocaleString()}</Text>
              <Text style={styles.flaggedReason}>{score.flagReason}</Text>
            </View>
            
            <View style={styles.flaggedActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleApproveScore(score.id)}
              >
                <CheckCircle size={16} color={colors.white} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRejectScore(score.id)}
              >
                <XCircle size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderLeaderboardToggle = () => (
    <View style={styles.toggleContainer}>
      <TouchableOpacity
        style={[styles.toggleButton, showLeaderboard && styles.activeToggleButton]}
        onPress={() => setShowLeaderboard(!showLeaderboard)}
      >
        <Trophy size={20} color={showLeaderboard ? colors.white : colors.primary} />
        <Text style={[
          styles.toggleButtonText,
          showLeaderboard && styles.activeToggleButtonText
        ]}>
          {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Phase 4: Leaderboards & Anti-Cheat' }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing leaderboard services...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Phase 4: Leaderboards & Anti-Cheat',
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text
      }} />

      <View style={styles.header}>
        <Shield size={32} color={colors.primary} />
        <Text style={styles.title}>Leaderboards & Anti-Cheat Demo</Text>
        <Text style={styles.subtitle}>
          Phase 4 implementation with secure score submission, real-time leaderboards, 
          and advanced anti-cheat detection
        </Text>
      </View>

      {renderGameSelector()}
      {renderScoreSubmission()}
      {renderAnomalyStats()}
      {renderFlaggedScores()}
      {renderLeaderboardToggle()}

      {showLeaderboard && (
        <View style={styles.leaderboardWrapper}>
          <LeaderboardDashboard
            gameId={selectedGame}
            gameName={selectedGame.replace('demo-', '').replace('-', ' ').toUpperCase()}
            userId={userId}
          />
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ✅ Phase 4 Complete: Leaderboards with anti-cheat protection
        </Text>
        <Text style={styles.footerSubtext}>
          • Secure score submission with digital signatures{"\n"}
          • Real-time anomaly detection{"\n"}
          • Rate limiting and duplicate detection{"\n"}
          • Admin review system for flagged scores{"\n"}
          • Multi-period leaderboards (daily, weekly, monthly, all-time)
        </Text>
      </View>
    </ScrollView>
  );
}

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
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  selectorContainer: {
    padding: 20,
    backgroundColor: colors.surface,
    marginVertical: 8,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  gameButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gameButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  selectedGameButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  gameIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  gameButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  selectedGameButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  submissionContainer: {
    padding: 20,
    backgroundColor: colors.surface,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    marginRight: 12,
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  antiCheatToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    color: colors.text,
  },
  suspiciousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.warning,
    borderRadius: 8,
  },
  suspiciousButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 8,
  },
  statsContainer: {
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
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  flaggedContainer: {
    padding: 20,
    backgroundColor: colors.surface,
    marginVertical: 8,
  },
  flaggedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginVertical: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  flaggedInfo: {
    flex: 1,
  },
  flaggedUser: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  flaggedScore: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 2,
  },
  flaggedReason: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  flaggedActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  toggleContainer: {
    padding: 20,
    alignItems: 'center',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  activeToggleButton: {
    backgroundColor: colors.primary,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  activeToggleButtonText: {
    color: colors.white,
  },
  leaderboardWrapper: {
    marginVertical: 8,
  },
  footer: {
    padding: 24,
    backgroundColor: colors.surface,
    marginTop: 16,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
    textAlign: 'center',
    marginBottom: 12,
  },
  footerSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
});


