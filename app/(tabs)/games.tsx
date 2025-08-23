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
} from 'react-native';
import { Stack } from 'expo-router';
import { useThemeStore } from '@/store/themeStore';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { GamesService, GameFeatureFlags } from '@/services/GamesService';
import { GameMetadata } from '@/components/WebViewSandbox';
import { Gamepad2, Plus, Search, Filter, AlertTriangle } from 'lucide-react-native';
import AnimatedLoader from '@/components/AnimatedLoader';

export default function GamesTab() {
  const { colors } = useThemeStore();
  const { language } = useAuthStore();
  const t = translations[language];
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [games, setGames] = useState<GameMetadata[]>([]);
  const [featureFlags, setFeatureFlags] = useState<GameFeatureFlags>({
    games: false,
    uploadGames: false,
    multiplayerGames: false,
    gameInvites: false,
    gameSharing: false
  });
  const [error, setError] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
      
      // Load games
      const allGames = await gamesService.getGames();
      
      // Filter by category if selected
      const filteredGames = selectedCategory === 'all' 
        ? allGames 
        : allGames.filter(game => game.category === selectedCategory);
      
      setGames(filteredGames);
      console.log(`🎮 Loaded ${filteredGames.length} games`);
      
    } catch (err) {
      console.error('❌ Failed to load games:', err);
      setError(err instanceof Error ? err.message : 'Failed to load games');
    }
  }, [gamesService, selectedCategory]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadGames();
    setIsRefreshing(false);
  }, [loadGames]);

  useEffect(() => {
    const initializeGames = async () => {
      setIsLoading(true);
      await loadGames();
      setIsLoading(false);
    };
    
    initializeGames();
  }, [loadGames]);

  const categories = [
    { id: 'all', name: t.browseGames, icon: '🎮' },
    { id: 'puzzle', name: t.puzzle, icon: '🧩' },
    { id: 'action', name: t.action, icon: '⚡' },
    { id: 'strategy', name: t.strategy, icon: '♟️' },
    { id: 'casual', name: t.casual, icon: '🎯' },
    { id: 'multiplayer', name: t.multiplayer, icon: '👥' },
  ];

  const renderGameCard = (game: GameMetadata) => (
    <TouchableOpacity
      key={game.id}
      style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      testID={`game-card-${game.id}`}
    >
      <View style={styles.gameCardHeader}>
        <View style={styles.gameIcon}>
          <Gamepad2 size={24} color={colors.primary} />
        </View>
        <View style={styles.gameInfo}>
          <Text style={[styles.gameName, { color: colors.text }]} numberOfLines={1}>
            {game.name}
          </Text>
          <Text style={[styles.gameCategory, { color: colors.textSecondary }]} numberOfLines={1}>
            {game.category} • {game.developer}
          </Text>
        </View>
        <View style={styles.gameRating}>
          <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
            ⭐ {game.rating?.toFixed(1) || 'N/A'}
          </Text>
        </View>
      </View>
      
      {game.description && (
        <Text style={[styles.gameDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {game.description}
        </Text>
      )}
      
      <View style={styles.gameFooter}>
        <Text style={[styles.gameSize, { color: colors.textSecondary }]}>
          {game.size ? `${(game.size / 1024 / 1024).toFixed(1)}MB` : 'Unknown size'}
        </Text>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: colors.primary }]}
          testID={`play-game-${game.id}`}
        >
          <Text style={[styles.playButtonText, { color: colors.background }]}>
            {t.playGame}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

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
              {featureFlags.uploadGames && (
                <TouchableOpacity
                  style={[styles.headerButton, { backgroundColor: colors.primary }]}
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
        {/* Category Filter */}
        {featureFlags.games && games.length > 0 && renderCategoryFilter()}

        {/* Games List */}
        {error ? (
          renderErrorState()
        ) : games.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.gamesGrid}>
            {games.map(renderGameCard)}
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
              Invites: {featureFlags.gameInvites ? '✅ Enabled' : '❌ Disabled'}
            </Text>
          </View>
        )}
      </ScrollView>
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
  gameSize: {
    fontSize: 12,
  },
  playButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
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
});