import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useThemeStore } from '@/store/themeStore';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { GamesService, GameFeatureFlags, GamePerformanceMetrics, GameTag, GameAnalytics, ABTestVariant } from '@/services/GamesService';
import { GameMetadata } from '@/components/WebViewSandbox';
import { GameRegistryResponse } from '@/services/GamesRegistryService';
import { GameSession, SessionResponse } from '@/services/GamesSessionService';
import { GameInvite, InviteResponse } from '@/services/GamesInviteService';
import { GameUploadResponse } from '@/services/GamesUploadService';
import WebViewSandbox from '@/components/WebViewSandbox';
import GameUploadModal from '@/components/GameUploadModal';
import { Gamepad2, Plus, Search, Filter, AlertTriangle, X, Play, Users, Share, Link, Tag, TrendingUp, Star, Zap } from 'lucide-react-native';
import AnimatedLoader from '@/components/AnimatedLoader';

export default function GamesTab() {
  const { colors } = useThemeStore();
  const { language } = useAuthStore();
  const t = translations[language];
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [games, setGames] = useState<GameMetadata[]>([]);
  const [gamesResponse, setGamesResponse] = useState<GameRegistryResponse | null>(null);
  const [featureFlags, setFeatureFlags] = useState<GameFeatureFlags>({
    games: false,
    uploadGames: false,
    multiplayerGames: false,
    gameInvites: false,
    gameSharing: false
  });
  const [error, setError] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGame, setSelectedGame] = useState<GameMetadata | null>(null);
  const [isGameModalVisible, setIsGameModalVisible] = useState<boolean>(false);
  const [gamePerformanceMetrics, setGamePerformanceMetrics] = useState<GamePerformanceMetrics[]>([]);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [userSessions, setUserSessions] = useState<GameSession[]>([]);
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);
  const [showSessionOptions, setShowSessionOptions] = useState<boolean>(false);
  const [selectedGameForSession, setSelectedGameForSession] = useState<GameMetadata | null>(null);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState<boolean>(false);
  
  // Phase 5: Enhanced UX state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<GameTag[]>([]);
  const [recommendedGames, setRecommendedGames] = useState<GameMetadata[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [maxSize, setMaxSize] = useState<number>(100); // MB
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'popularity' | 'lastUpdated'>('popularity');
  const [layoutVariant, setLayoutVariant] = useState<'current' | 'compact'>('current');
  const [gameAnalytics, setGameAnalytics] = useState<Map<string, GameAnalytics>>(new Map());
  const [deviceHealth, setDeviceHealth] = useState<{
    thermalState: 'normal' | 'fair' | 'serious' | 'critical';
    batteryLevel: number;
    shouldThrottle: boolean;
  } | null>(null);

  const gamesService = GamesService.getInstance();

  const loadGames = useCallback(async () => {
    try {
      setError('');
      
      // Initialize service if needed
      await gamesService.initialize();
      
      // Get feature flags
      const flags = gamesService.getFeatureFlags();
      setFeatureFlags(flags);
      
      // Check if games feature is enabled
      if (!flags.games) {
        console.log('🚫 Games feature is disabled');
        setGames([]);
        return;
      }
      
      // Load games from registry with enhanced search/filter params
      const searchParams = {
        search: searchQuery || undefined,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        maxSize: maxSize < 100 ? maxSize * 1024 * 1024 : undefined, // Convert MB to bytes
        limit: 20,
        sortBy: sortBy,
        sortOrder: 'desc' as const,
        includeAnalytics: true
      };
      
      const response = await gamesService.getGamesEnhanced(searchParams);
      setGamesResponse(response);
      setGames(response.games);
      
      // Update Phase 5 data
      if (response.analytics) {
        setGameAnalytics(response.analytics);
      }
      if (response.recommendedTags) {
        setAvailableTags(response.recommendedTags);
      }
      
      console.log(`🎮 Loaded ${response.games.length} games from registry`);
      
    } catch (err) {
      console.error('❌ Failed to load games:', err);
      setError(err instanceof Error ? err.message : 'Failed to load games');
    }
  }, [gamesService, selectedCategory, searchQuery, selectedTags, minRating, maxSize, sortBy]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadGames();
    setIsRefreshing(false);
  }, [loadGames]);

  useEffect(() => {
    const initializeGames = async () => {
      setIsLoading(true);
      await loadGames();
      
      // Load performance metrics
      const metrics = gamesService.getAllPerformanceMetrics();
      setGamePerformanceMetrics(metrics);
      
      // Load Phase 5 features
      const allTags = gamesService.getAllTags();
      setAvailableTags(allTags);
      
      // Get A/B test variant for layout
      const userId = 'user_123'; // Mock user ID
      const layoutVariantData = gamesService.getABTestVariant('game-layout-test', userId);
      if (layoutVariantData) {
        setLayoutVariant(layoutVariantData.config.layout);
        console.log(`🧪 Using layout variant: ${layoutVariantData.config.layout}`);
      }
      
      // Load recommended games
      const recommendations = await gamesService.getRecommendedGames(userId, 5);
      setRecommendedGames(recommendations);
      
      setIsLoading(false);
    };
    
    initializeGames();
  }, [loadGames, gamesService]);

  const handlePlayGame = useCallback(async (game: GameMetadata, sessionId?: string) => {
    try {
      console.log(`🎮 Starting game: ${game.name}`);
      
      // Security check - validate game URL
      if (!game.url || !game.url.startsWith('https://')) {
        Alert.alert(
          t.securityWarning,
          'Invalid game URL. Only secure HTTPS games are allowed.'
        );
        return;
      }
      
      // Check device health before starting game
      const health = await gamesService.monitorDeviceHealth(game.id);
      setDeviceHealth(health);
      
      if (health.shouldThrottle) {
        Alert.alert(
          'Device Performance Warning',
          `Your device is ${health.thermalState === 'critical' ? 'overheating' : 'running low on battery'}. The game may run slower to preserve device health.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue Anyway', onPress: () => proceedWithGame() }
          ]
        );
        return;
      }
      
      proceedWithGame();
      
      function proceedWithGame() {
        // Record A/B test event
        const userId = 'user_123';
        gamesService.recordABTestEvent('game-layout-test', userId, 'game_launch', { gameId: game.id });
        
        // Record game launch metrics
        gamesService.recordPerformanceMetrics(game.id, {
          gameId: game.id,
          loadTime: 0,
          crashCount: 0,
          memoryUsage: 0,
          lastPlayed: new Date().toISOString(),
          playCount: 0
        });
        
        // Update analytics
        gamesService.updateGameAnalytics(game.id, {
          totalPlays: 1
        });
        
        // If sessionId provided, join that session
        if (sessionId) {
          gamesService.sessionService.getSession(sessionId).then(session => {
            setCurrentSession(session);
          });
        }
        
        setSelectedGame(game);
        setIsGameModalVisible(true);
      }
      
    } catch (error) {
      console.error('❌ Failed to start game:', error);
      Alert.alert(
        t.error,
        error instanceof Error ? error.message : 'Failed to start game'
      );
    }
  }, [gamesService, t.securityWarning, t.error]);

  const handleCreateSession = useCallback(async (game: GameMetadata) => {
    if (!featureFlags.multiplayerGames) {
      Alert.alert('Feature Disabled', 'Multiplayer games are not enabled.');
      return;
    }

    try {
      setIsCreatingSession(true);
      
      // Mock user ID - in real app, get from auth
      const userId = 'user_123';
      const userName = 'Player 1';
      
      // Create session
      const sessionResponse = await gamesService.createGameSession(game.id, userId, {
        maxPlayers: 4
      });
      
      console.log(`🎮 Created session: ${sessionResponse.session.roomCode}`);
      
      // Create invite
      const inviteResponse = await gamesService.createGameInvite(
        sessionResponse.session.id,
        userId,
        userName,
        'private'
      );
      
      console.log(`🔗 Created invite: ${inviteResponse.deepLink}`);
      
      // Show session info
      Alert.alert(
        'Session Created!',
        `Room Code: ${sessionResponse.session.roomCode}\n\nShare this link with friends:\n${inviteResponse.deepLink}`,
        [
          { text: 'Copy Link', onPress: () => {
            // In real app, copy to clipboard
            console.log('📋 Copied invite link to clipboard');
          }},
          { text: 'Start Game', onPress: () => handlePlayGame(game, sessionResponse.session.id) }
        ]
      );
      
      // Update user sessions
      const sessions = await gamesService.getUserGameSessions(userId);
      setUserSessions(sessions);
      
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      Alert.alert(
        'Session Creation Failed',
        error instanceof Error ? error.message : 'Failed to create game session'
      );
    } finally {
      setIsCreatingSession(false);
    }
  }, [featureFlags.multiplayerGames, gamesService, handlePlayGame]);

  const handleJoinByRoomCode = useCallback(async () => {
    if (!featureFlags.multiplayerGames) {
      Alert.alert('Feature Disabled', 'Multiplayer games are not enabled.');
      return;
    }

    Alert.prompt(
      'Join Game',
      'Enter room code:',
      async (roomCode) => {
        if (!roomCode) return;
        
        try {
          const session = await gamesService.getSessionByRoomCode(roomCode.toUpperCase());
          if (!session) {
            Alert.alert('Room Not Found', 'Invalid room code or session has expired.');
            return;
          }
          
          const userId = 'user_123'; // Mock user ID
          const sessionResponse = await gamesService.joinGameSession(session.id, userId);
          
          const game = await gamesService.getGame(session.gameId);
          if (game) {
            Alert.alert(
              'Joined Session!',
              `Joined ${session.hostUserId}'s game: ${game.name}`,
              [{ text: 'Start Game', onPress: () => handlePlayGame(game, session.id) }]
            );
          }
          
        } catch (error) {
          console.error('❌ Failed to join session:', error);
          Alert.alert(
            'Join Failed',
            error instanceof Error ? error.message : 'Failed to join game session'
          );
        }
      }
    );
  }, [featureFlags.multiplayerGames, gamesService, handlePlayGame]);

  const handleCloseGame = useCallback(async () => {
    console.log('🎮 Closing game');
    
    // Leave session if in one
    if (currentSession) {
      try {
        const userId = 'user_123'; // Mock user ID
        await gamesService.leaveGameSession(currentSession.id, userId);
        console.log(`👋 Left session: ${currentSession.roomCode}`);
      } catch (error) {
        console.error('❌ Failed to leave session:', error);
      }
    }
    
    setIsGameModalVisible(false);
    setSelectedGame(null);
    setCurrentSession(null);
  }, [currentSession, gamesService]);

  const handleGameLoadStart = useCallback(() => {
    console.log('🎮 Game load started');
  }, []);

  const handleGameLoadEnd = useCallback(async () => {
    console.log('🎮 Game load completed');
    if (selectedGame) {
      // Update performance metrics
      const metrics = gamesService.getAllPerformanceMetrics();
      setGamePerformanceMetrics(metrics);
    }
  }, [selectedGame, gamesService]);

  const handleGameError = useCallback(async (error: any) => {
    console.error('❌ Game error:', error);
    if (selectedGame) {
      // Record crash
      await gamesService.recordPerformanceMetrics(selectedGame.id, {
        gameId: selectedGame.id,
        loadTime: 0,
        crashCount: 1,
        memoryUsage: 0,
        lastPlayed: new Date().toISOString(),
        playCount: 0
      });
    }
    
    Alert.alert(
      t.gameError,
      'The game encountered an error and will be closed.'
    );
    handleCloseGame();
  }, [selectedGame, gamesService, t.gameError, handleCloseGame]);

  const handleGameMessage = useCallback((message: any) => {
    console.log('📨 Game message received:', message);
    // Handle game-specific messages here
  }, []);

  const handleUploadComplete = useCallback(async (response: GameUploadResponse) => {
    console.log('🎮 Upload completed:', response);
    
    // Refresh games list to include newly uploaded game if approved
    if (response.status === 'approved') {
      await loadGames();
    }
    
    // Show success message
    Alert.alert(
      'Upload Complete',
      response.status === 'approved' 
        ? 'Your game has been approved and is now available!'
        : response.status === 'rejected'
          ? 'Your game was rejected. Please check the feedback and try again.'
          : 'Your game is under review. You\'ll be notified when the review is complete.'
    );
  }, [loadGames]);

  const categories = [
    { id: 'all', name: t.browseGames, icon: '🎮' },
    { id: 'puzzle', name: t.puzzle, icon: '🧩' },
    { id: 'action', name: t.action, icon: '⚡' },
    { id: 'strategy', name: t.strategy, icon: '♟️' },
    { id: 'casual', name: t.casual, icon: '🎯' },
    { id: 'multiplayer', name: t.multiplayer, icon: '👥' },
  ];

  // Phase 5: Enhanced UI components
  const renderTagsFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.tagsContainer}
      contentContainerStyle={styles.tagsContent}
    >
      {availableTags.map((tag) => (
        <TouchableOpacity
          key={tag.id}
          style={[
            styles.tagButton,
            {
              backgroundColor: selectedTags.includes(tag.id) ? tag.color : colors.surface,
              borderColor: tag.color
            }
          ]}
          onPress={() => {
            setSelectedTags(prev => 
              prev.includes(tag.id) 
                ? prev.filter(t => t !== tag.id)
                : [...prev, tag.id]
            );
          }}
          testID={`tag-${tag.id}`}
        >
          <Tag size={12} color={selectedTags.includes(tag.id) ? colors.background : tag.color} />
          <Text
            style={[
              styles.tagText,
              {
                color: selectedTags.includes(tag.id) ? colors.background : tag.color
              }
            ]}
          >
            {tag.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderRecommendedGames = () => {
    if (recommendedGames.length === 0) return null;
    
    return (
      <View style={styles.recommendedSection}>
        <View style={styles.sectionHeader}>
          <TrendingUp size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recommended for You
          </Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.recommendedContainer}
          contentContainerStyle={styles.recommendedContent}
        >
          {recommendedGames.map((game) => (
            <TouchableOpacity
              key={`rec-${game.id}`}
              style={[styles.recommendedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handlePlayGame(game)}
              testID={`recommended-game-${game.id}`}
            >
              <View style={[styles.recommendedIcon, { backgroundColor: colors.primary }]}>
                <Gamepad2 size={16} color={colors.background} />
              </View>
              <Text style={[styles.recommendedName, { color: colors.text }]} numberOfLines={1}>
                {game.name}
              </Text>
              <Text style={[styles.recommendedCategory, { color: colors.textSecondary }]} numberOfLines={1}>
                {game.category}
              </Text>
              <View style={styles.recommendedRating}>
                <Star size={10} color={colors.warning} fill={colors.warning} />
                <Text style={[styles.recommendedRatingText, { color: colors.textSecondary }]}>
                  {game.rating?.toFixed(1) || 'N/A'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderDeviceHealthWarning = () => {
    if (!deviceHealth || !deviceHealth.shouldThrottle) return null;
    
    return (
      <View style={[styles.healthWarning, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
        <Zap size={16} color={colors.warning} />
        <Text style={[styles.healthWarningText, { color: colors.warning }]}>
          Device {deviceHealth.thermalState === 'critical' ? 'overheating' : 'low battery'} - Performance may be limited
        </Text>
      </View>
    );
  };

  const renderGameCard = (game: GameMetadata) => {
    const analytics = gameAnalytics.get(game.id);
    const gameTags = gamesService.getGameTags(game.id);
    const isCompact = layoutVariant === 'compact';
    
    return (
      <TouchableOpacity
        key={game.id}
        style={[
          isCompact ? styles.gameCardCompact : styles.gameCard, 
          { backgroundColor: colors.surface, borderColor: colors.border }
        ]}
        testID={`game-card-${game.id}`}
      >
        <View style={isCompact ? styles.gameCardHeaderCompact : styles.gameCardHeader}>
          <View style={isCompact ? styles.gameIconCompact : styles.gameIcon}>
            <Gamepad2 size={isCompact ? 20 : 24} color={colors.primary} />
          </View>
          <View style={styles.gameInfo}>
            <Text style={[styles.gameName, { color: colors.text }]} numberOfLines={1}>
              {game.name}
            </Text>
            <Text style={[styles.gameCategory, { color: colors.textSecondary }]} numberOfLines={1}>
              {game.category} • {game.developer}
            </Text>
            {analytics && (
              <Text style={[styles.gameStats, { color: colors.textSecondary }]} numberOfLines={1}>
                {analytics.totalPlays} plays • {(analytics.popularityScore * 100).toFixed(0)}% popular
              </Text>
            )}
          </View>
          <View style={styles.gameRating}>
            <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
              ⭐ {game.rating?.toFixed(1) || 'N/A'}
            </Text>
          </View>
        </View>
        
        {!isCompact && game.description && (
          <Text style={[styles.gameDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {game.description}
          </Text>
        )}
        
        {gameTags.length > 0 && (
          <View style={styles.gameTagsContainer}>
            {gameTags.slice(0, 3).map((tag) => (
              <View
                key={tag.id}
                style={[styles.gameTag, { backgroundColor: tag.color + '20', borderColor: tag.color }]}
              >
                <Text style={[styles.gameTagText, { color: tag.color }]}>
                  {tag.name}
                </Text>
              </View>
            ))}
            {gameTags.length > 3 && (
              <Text style={[styles.moreTagsText, { color: colors.textSecondary }]}>
                +{gameTags.length - 3}
              </Text>
            )}
          </View>
        )}
        
        <View style={styles.gameFooter}>
          <Text style={[styles.gameSize, { color: colors.textSecondary }]}>
            {game.size ? `${(game.size / 1024 / 1024).toFixed(1)}MB` : 'Unknown size'}
          </Text>
          <View style={styles.gameActions}>
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: colors.primary }]}
              onPress={() => handlePlayGame(game)}
              testID={`play-game-${game.id}`}
            >
              <Play size={16} color={colors.background} />
              <Text style={[styles.playButtonText, { color: colors.background }]}>
                Play
              </Text>
            </TouchableOpacity>
            
            {featureFlags.multiplayerGames && (
              <TouchableOpacity
                style={[styles.sessionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleCreateSession(game)}
                disabled={isCreatingSession}
                testID={`create-session-${game.id}`}
              >
                <Users size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.categoryContainer}
      contentContainerStyle={styles.categoryContent}
    >
      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryButton,
            {
              backgroundColor: selectedCategory === category.id ? colors.primary : colors.surface,
              borderColor: colors.border
            }
          ]}
          onPress={() => setSelectedCategory(category.id)}
          testID={`category-${category.id}`}
        >
          <Text style={styles.categoryIcon}>{category.icon}</Text>
          <Text
            style={[
              styles.categoryText,
              {
                color: selectedCategory === category.id ? colors.background : colors.text
              }
            ]}
          >
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Gamepad2 size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {!featureFlags.games ? 'Games Feature Disabled' : t.noGamesAvailable}
      </Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
        {!featureFlags.games 
          ? 'The games feature is currently disabled. Please contact your administrator.'
          : 'No games are available at the moment. Check back later!'
        }
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyContainer}>
      <AlertTriangle size={64} color={colors.error} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t.error}
      </Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
        {error}
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={handleRefresh}
        testID="retry-button"
      >
        <Text style={[styles.retryButtonText, { color: colors.background }]}>
          {t.retry}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: t.games,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <AnimatedLoader size={48} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t.loading}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t.games,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShown: true,
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: colors.surface }]}
                testID="search-games"
              >
                <Search size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: colors.surface }]}
                testID="filter-games"
              >
                <Filter size={20} color={colors.text} />
              </TouchableOpacity>
              {featureFlags.multiplayerGames && (
                <TouchableOpacity
                  style={[styles.headerButton, { backgroundColor: colors.surface }]}
                  onPress={handleJoinByRoomCode}
                  testID="join-room"
                >
                  <Link size={20} color={colors.text} />
                </TouchableOpacity>
              )}
              {featureFlags.uploadGames && (
                <TouchableOpacity
                  style={[styles.headerButton, { backgroundColor: colors.primary }]}
                  onPress={() => setIsUploadModalVisible(true)}
                  testID="upload-game"
                >
                  <Plus size={20} color={colors.background} />
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        testID="games-scroll-view"
      >
        {/* Device Health Warning */}
        {renderDeviceHealthWarning()}
        
        {/* Recommended Games */}
        {featureFlags.games && renderRecommendedGames()}
        
        {/* Category Filter */}
        {featureFlags.games && games.length > 0 && renderCategoryFilter()}
        
        {/* Tags Filter */}
        {featureFlags.games && availableTags.length > 0 && renderTagsFilter()}

        {/* Games List */}
        {error ? (
          renderErrorState()
        ) : games.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.gamesGrid}>
            {games.map(renderGameCard)}
            
            {/* Load More Button */}
            {gamesResponse?.hasMore && (
              <TouchableOpacity
                style={[styles.loadMoreButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  // TODO: Implement load more functionality in Phase 2
                  console.log('Load more games...');
                }}
                testID="load-more-games"
              >
                <Text style={[styles.loadMoreText, { color: colors.text }]}>
                  Load More Games ({gamesResponse.total - games.length} remaining)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Feature Status */}
        {Platform.OS === 'web' && (
          <View style={[styles.featureStatus, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.featureStatusTitle, { color: colors.text }]}>
              Feature Status
            </Text>
            <Text style={[styles.featureStatusText, { color: colors.textSecondary }]}>
              Games: {featureFlags.games ? '✅ Enabled' : '❌ Disabled'}
            </Text>
            <Text style={[styles.featureStatusText, { color: colors.textSecondary }]}>
              Upload: {featureFlags.uploadGames ? '✅ Enabled' : '❌ Disabled'}
            </Text>
            <Text style={[styles.featureStatusText, { color: colors.textSecondary }]}>
              Multiplayer: {featureFlags.multiplayerGames ? '✅ Enabled' : '❌ Disabled'}
            </Text>
            <Text style={[styles.featureStatusText, { color: colors.textSecondary }]}>
              Invites: {featureFlags.gameInvites ? '✅ Enabled' : '❌ Disabled'}
            </Text>
            <Text style={[styles.featureStatusText, { color: colors.textSecondary }]}>
              Sharing: {featureFlags.gameSharing ? '✅ Enabled' : '❌ Disabled'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Game Modal */}
      <Modal
        visible={isGameModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseGame}
        testID="game-modal"
      >
        <SafeAreaView style={[styles.gameModalContainer, { backgroundColor: colors.background }]}>
          {/* Game Modal Header */}
          <View style={[styles.gameModalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.gameModalHeaderContent}>
              <View style={styles.gameModalInfo}>
                <Gamepad2 size={20} color={colors.primary} />
                <View style={styles.gameModalTitleContainer}>
                  <Text style={[styles.gameModalTitle, { color: colors.text }]} numberOfLines={1}>
                    {selectedGame?.name || 'Game'}
                  </Text>
                  {currentSession && (
                    <Text style={[styles.gameModalSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                      Room: {currentSession.roomCode} • {currentSession.currentPlayers.length}/{currentSession.maxPlayers} players
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.error }]}
                onPress={handleCloseGame}
                testID="close-game-button"
              >
                <X size={20} color={colors.background} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Game Content */}
          <View style={styles.gameModalContent}>
            {selectedGame && (
              <WebViewSandbox
                game={selectedGame}
                onLoadStart={handleGameLoadStart}
                onLoadEnd={handleGameLoadEnd}
                onError={handleGameError}
                onMessage={handleGameMessage}
                testId="game-webview"
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Upload Modal */}
      <GameUploadModal
        visible={isUploadModalVisible}
        onClose={() => setIsUploadModalVisible(false)}
        onUploadComplete={handleUploadComplete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 16,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContainer: {
    marginVertical: 16,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  gamesGrid: {
    paddingHorizontal: 16,
    gap: 16,
  },
  gameCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  gameCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gameIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  gameCategory: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  gameRating: {
    alignItems: 'flex-end',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  gameDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  gameFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameSize: {
    fontSize: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  sessionButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  featureStatus: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  featureStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  featureStatusText: {
    fontSize: 12,
    marginBottom: 4,
  },
  // Game Modal Styles
  gameModalContainer: {
    flex: 1,
  },
  gameModalHeader: {
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  gameModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameModalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  gameModalTitleContainer: {
    flex: 1,
  },
  gameModalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  gameModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameModalContent: {
    flex: 1,
  },
  loadMoreButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Phase 5: Enhanced UX Styles
  healthWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  healthWarningText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  
  // Recommended Games Section
  recommendedSection: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recommendedContainer: {
    paddingLeft: 16,
  },
  recommendedContent: {
    paddingRight: 16,
    gap: 12,
  },
  recommendedCard: {
    width: 120,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  recommendedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendedName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  recommendedCategory: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  recommendedRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  recommendedRatingText: {
    fontSize: 10,
  },
  
  // Tags Filter
  tagsContainer: {
    marginVertical: 8,
  },
  tagsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Enhanced Game Cards
  gameCardCompact: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 6,
  },
  gameCardHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  gameIconCompact: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  gameStats: {
    fontSize: 10,
    marginTop: 2,
  },
  gameTagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 6,
  },
  gameTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  gameTagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
});