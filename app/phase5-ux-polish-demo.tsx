import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  Switch,
  Slider,
} from 'react-native';
import { Stack } from 'expo-router';
import { useThemeStore } from '@/store/themeStore';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { GamesService, GameTag, GameAnalytics, ABTestVariant, PrefetchConfig } from '@/services/GamesService';
import { GameMetadata } from '@/components/WebViewSandbox';
import {
  Gamepad2,
  Search,
  Filter,
  Tag,
  TrendingUp,
  Star,
  Zap,
  Settings,
  BarChart3,
  TestTube,
  Download,
  Thermometer,
  Battery,
  Wifi,
  Activity
} from 'lucide-react-native';
import AnimatedLoader from '@/components/AnimatedLoader';

export default function Phase5UXPolishDemo() {
  const { colors } = useThemeStore();
  const { language } = useAuthStore();
  const t = translations[language];
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gamesService] = useState(() => GamesService.getInstance());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<GameTag[]>([]);
  const [gameAnalytics, setGameAnalytics] = useState<Map<string, GameAnalytics>>(new Map());
  const [abTestVariants, setAbTestVariants] = useState<Map<string, ABTestVariant>>(new Map());
  const [prefetchConfig, setPrefetchConfig] = useState<PrefetchConfig>({
    enabled: true,
    maxConcurrent: 2,
    maxCacheSize: 50,
    popularityThreshold: 0.7,
    wifiOnly: true
  });
  const [deviceHealth, setDeviceHealth] = useState<{
    thermalState: 'normal' | 'fair' | 'serious' | 'critical';
    batteryLevel: number;
    shouldThrottle: boolean;
  } | null>(null);
  const [recommendedGames, setRecommendedGames] = useState<GameMetadata[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([]);
  
  const userId = 'demo_user_123';

  useEffect(() => {
    const initializeDemo = async () => {
      try {
        setIsLoading(true);
        
        // Initialize games service
        await gamesService.initialize();
        
        // Load Phase 5 features
        const tags = gamesService.getAllTags();
        setAvailableTags(tags);
        
        // Get A/B test variants
        const layoutVariant = gamesService.getABTestVariant('game-layout-test', userId);
        const recommendationVariant = gamesService.getABTestVariant('recommendation-algorithm', userId);
        
        const variants = new Map<string, ABTestVariant>();
        if (layoutVariant) variants.set('game-layout-test', layoutVariant);
        if (recommendationVariant) variants.set('recommendation-algorithm', recommendationVariant);
        setAbTestVariants(variants);
        
        // Get recommended games
        const recommendations = await gamesService.getRecommendedGames(userId, 8);
        setRecommendedGames(recommendations);
        
        // Get performance metrics
        const metrics = gamesService.getAllPerformanceMetrics();
        setPerformanceMetrics(metrics);
        
        // Monitor device health
        const health = await gamesService.monitorDeviceHealth('demo-game');
        setDeviceHealth(health);
        
        console.log('🚀 Phase 5 demo initialized');
        
      } catch (error) {
        console.error('❌ Phase 5 demo initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeDemo();
  }, [gamesService, userId]);

  const handleSearchGames = useCallback(async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Search', 'Please enter a search term');
      return;
    }
    
    try {
      const response = await gamesService.getGamesEnhanced({
        search: searchQuery,
        tags: selectedTags,
        includeAnalytics: true
      });
      
      Alert.alert(
        'Search Results',
        `Found ${response.games.length} games matching "${searchQuery}"${selectedTags.length > 0 ? ` with tags: ${selectedTags.join(', ')}` : ''}`
      );
      
      // Record A/B test event
      await gamesService.recordABTestEvent('recommendation-algorithm', userId, 'search_performed', {
        query: searchQuery,
        tags: selectedTags,
        resultsCount: response.games.length
      });
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      Alert.alert('Search Error', 'Failed to search games');
    }
  }, [gamesService, searchQuery, selectedTags, userId]);

  const handlePrefetchTest = useCallback(async () => {
    try {
      Alert.alert('Prefetching', 'Starting prefetch of popular games...');
      await gamesService.prefetchPopularGames();
      Alert.alert('Prefetch Complete', 'Popular games have been prefetched for faster loading');
    } catch (error) {
      console.error('❌ Prefetch failed:', error);
      Alert.alert('Prefetch Error', 'Failed to prefetch games');
    }
  }, [gamesService]);

  const handleDeviceHealthCheck = useCallback(async () => {
    try {
      const health = await gamesService.monitorDeviceHealth('demo-health-check');
      setDeviceHealth(health);
      
      Alert.alert(
        'Device Health Check',
        `Thermal State: ${health.thermalState}\nBattery Level: ${(health.batteryLevel * 100).toFixed(0)}%\nShould Throttle: ${health.shouldThrottle ? 'Yes' : 'No'}`
      );
    } catch (error) {
      console.error('❌ Device health check failed:', error);
      Alert.alert('Health Check Error', 'Failed to check device health');
    }
  }, [gamesService]);

  const renderSearchSection = () => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <Search size={20} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Enhanced Search & Filtering
        </Text>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          placeholder="Search games..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          testID="search-input"
        />
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: colors.primary }]}
          onPress={handleSearchGames}
          testID="search-button"
        >
          <Search size={16} color={colors.background} />
        </TouchableOpacity>
      </View>
      
      {availableTags.length > 0 && (
        <View style={styles.tagsSection}>
          <Text style={[styles.subsectionTitle, { color: colors.text }]}>Filter by Tags:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
            {availableTags.slice(0, 8).map((tag) => (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: selectedTags.includes(tag.id) ? tag.color : colors.background,
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
                testID={`tag-chip-${tag.id}`}
              >
                <Text
                  style={[
                    styles.tagChipText,
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
        </View>
      )}
    </View>
  );

  const renderAnalyticsSection = () => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <BarChart3 size={20} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Game Analytics & Insights
        </Text>
      </View>
      
      <View style={styles.analyticsGrid}>
        <View style={[styles.analyticsCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.analyticsValue, { color: colors.primary }]}>
            {Array.from(gameAnalytics.values()).reduce((sum, a) => sum + a.totalPlays, 0)}
          </Text>
          <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>Total Plays</Text>
        </View>
        
        <View style={[styles.analyticsCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.analyticsValue, { color: colors.success }]}>
            {Array.from(gameAnalytics.values()).reduce((sum, a) => sum + a.uniquePlayers, 0)}
          </Text>
          <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>Unique Players</Text>
        </View>
        
        <View style={[styles.analyticsCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.analyticsValue, { color: colors.warning }]}>
            {gameAnalytics.size}
          </Text>
          <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>Games Tracked</Text>
        </View>
        
        <View style={[styles.analyticsCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.analyticsValue, { color: colors.error }]}>
            {(Array.from(gameAnalytics.values()).reduce((sum, a) => sum + a.crashRate, 0) / gameAnalytics.size * 100).toFixed(1)}%
          </Text>
          <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>Avg Crash Rate</Text>
        </View>
      </View>
    </View>
  );

  const renderABTestSection = () => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <TestTube size={20} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          A/B Testing Experiments
        </Text>
      </View>
      
      {Array.from(abTestVariants.entries()).map(([experimentId, variant]) => (
        <View key={experimentId} style={[styles.experimentCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.experimentTitle, { color: colors.text }]}>
            {experimentId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
          <Text style={[styles.experimentVariant, { color: colors.primary }]}>
            Active Variant: {variant.name}
          </Text>
          <Text style={[styles.experimentDescription, { color: colors.textSecondary }]}>
            {variant.description}
          </Text>
          <View style={styles.experimentConfig}>
            <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Config:</Text>
            <Text style={[styles.configValue, { color: colors.text }]}>
              {JSON.stringify(variant.config, null, 2)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderPrefetchSection = () => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <Download size={20} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Prefetch Configuration
        </Text>
      </View>
      
      <View style={styles.prefetchControls}>
        <View style={styles.prefetchRow}>
          <Text style={[styles.prefetchLabel, { color: colors.text }]}>Enable Prefetching</Text>
          <Switch
            value={prefetchConfig.enabled}
            onValueChange={(enabled) => setPrefetchConfig(prev => ({ ...prev, enabled }))}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.background}
            testID="prefetch-enabled-switch"
          />
        </View>
        
        <View style={styles.prefetchRow}>
          <Text style={[styles.prefetchLabel, { color: colors.text }]}>WiFi Only</Text>
          <Switch
            value={prefetchConfig.wifiOnly}
            onValueChange={(wifiOnly) => setPrefetchConfig(prev => ({ ...prev, wifiOnly }))}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.background}
            testID="prefetch-wifi-switch"
          />
        </View>
        
        <View style={styles.sliderContainer}>
          <Text style={[styles.prefetchLabel, { color: colors.text }]}>
            Max Cache Size: {prefetchConfig.maxCacheSize}MB
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={10}
            maximumValue={200}
            value={prefetchConfig.maxCacheSize}
            onValueChange={(maxCacheSize) => setPrefetchConfig(prev => ({ ...prev, maxCacheSize: Math.round(maxCacheSize) }))}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
            testID="cache-size-slider"
          />
        </View>
        
        <View style={styles.sliderContainer}>
          <Text style={[styles.prefetchLabel, { color: colors.text }]}>
            Popularity Threshold: {(prefetchConfig.popularityThreshold * 100).toFixed(0)}%
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0.1}
            maximumValue={1.0}
            value={prefetchConfig.popularityThreshold}
            onValueChange={(popularityThreshold) => setPrefetchConfig(prev => ({ ...prev, popularityThreshold }))}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
            testID="popularity-threshold-slider"
          />
        </View>
        
        <TouchableOpacity
          style={[styles.prefetchButton, { backgroundColor: colors.primary }]}
          onPress={handlePrefetchTest}
          testID="test-prefetch-button"
        >
          <Download size={16} color={colors.background} />
          <Text style={[styles.prefetchButtonText, { color: colors.background }]}>
            Test Prefetch Popular Games
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDeviceHealthSection = () => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <Activity size={20} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Device Health Monitoring
        </Text>
      </View>
      
      {deviceHealth && (
        <View style={styles.healthGrid}>
          <View style={[styles.healthCard, { backgroundColor: colors.background }]}>
            <Thermometer size={24} color={getHealthColor(deviceHealth.thermalState)} />
            <Text style={[styles.healthValue, { color: getHealthColor(deviceHealth.thermalState) }]}>
              {deviceHealth.thermalState.toUpperCase()}
            </Text>
            <Text style={[styles.healthLabel, { color: colors.textSecondary }]}>Thermal State</Text>
          </View>
          
          <View style={[styles.healthCard, { backgroundColor: colors.background }]}>
            <Battery size={24} color={getBatteryColor(deviceHealth.batteryLevel)} />
            <Text style={[styles.healthValue, { color: getBatteryColor(deviceHealth.batteryLevel) }]}>
              {(deviceHealth.batteryLevel * 100).toFixed(0)}%
            </Text>
            <Text style={[styles.healthLabel, { color: colors.textSecondary }]}>Battery Level</Text>
          </View>
          
          <View style={[styles.healthCard, { backgroundColor: colors.background }]}>
            <Zap size={24} color={deviceHealth.shouldThrottle ? colors.error : colors.success} />
            <Text style={[styles.healthValue, { color: deviceHealth.shouldThrottle ? colors.error : colors.success }]}>
              {deviceHealth.shouldThrottle ? 'YES' : 'NO'}
            </Text>
            <Text style={[styles.healthLabel, { color: colors.textSecondary }]}>Should Throttle</Text>
          </View>
        </View>
      )}
      
      <TouchableOpacity
        style={[styles.healthButton, { backgroundColor: colors.primary }]}
        onPress={handleDeviceHealthCheck}
        testID="health-check-button"
      >
        <Activity size={16} color={colors.background} />
        <Text style={[styles.healthButtonText, { color: colors.background }]}>
          Run Health Check
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderRecommendationsSection = () => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <TrendingUp size={20} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Personalized Recommendations
        </Text>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendationsScroll}>
        {recommendedGames.map((game) => (
          <View
            key={game.id}
            style={[styles.recommendationCard, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <View style={[styles.recommendationIcon, { backgroundColor: colors.primary }]}>
              <Gamepad2 size={16} color={colors.background} />
            </View>
            <Text style={[styles.recommendationName, { color: colors.text }]} numberOfLines={1}>
              {game.name}
            </Text>
            <Text style={[styles.recommendationCategory, { color: colors.textSecondary }]} numberOfLines={1}>
              {game.category}
            </Text>
            <View style={styles.recommendationRating}>
              <Star size={10} color={colors.warning} fill={colors.warning} />
              <Text style={[styles.recommendationRatingText, { color: colors.textSecondary }]}>
                {game.rating?.toFixed(1) || 'N/A'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
      
      <Text style={[styles.recommendationNote, { color: colors.textSecondary }]}>
        Recommendations are based on your play history, preferences, and popular games.
      </Text>
    </View>
  );

  const renderPerformanceSection = () => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <Activity size={20} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Performance Monitoring
        </Text>
      </View>
      
      {performanceMetrics.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.performanceScroll}>
          {performanceMetrics.slice(0, 5).map((metric) => (
            <View
              key={metric.gameId}
              style={[styles.performanceCard, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <Text style={[styles.performanceGameName, { color: colors.text }]} numberOfLines={1}>
                Game {metric.gameId.slice(-4)}
              </Text>
              <View style={styles.performanceMetric}>
                <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>Load Time:</Text>
                <Text style={[styles.performanceValue, { color: colors.text }]}>
                  {metric.loadTime}ms
                </Text>
              </View>
              <View style={styles.performanceMetric}>
                <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>Crashes:</Text>
                <Text style={[styles.performanceValue, { color: metric.crashCount > 0 ? colors.error : colors.success }]}>
                  {metric.crashCount}
                </Text>
              </View>
              <View style={styles.performanceMetric}>
                <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>Plays:</Text>
                <Text style={[styles.performanceValue, { color: colors.text }]}>
                  {metric.playCount}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
          No performance data available yet. Play some games to see metrics!
        </Text>
      )}
    </View>
  );

  const getHealthColor = (thermalState: string) => {
    switch (thermalState) {
      case 'normal': return colors.success;
      case 'fair': return colors.warning;
      case 'serious': return colors.error;
      case 'critical': return '#DC2626';
      default: return colors.textSecondary;
    }
  };

  const getBatteryColor = (batteryLevel: number) => {
    if (batteryLevel > 0.5) return colors.success;
    if (batteryLevel > 0.2) return colors.warning;
    return colors.error;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: 'Phase 5: UX Polish & Scale',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.loadingContainer}>
          <AnimatedLoader size={48} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Initializing Phase 5 Features...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Phase 5: UX Polish & Scale',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID="phase5-scroll-view"
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={styles.headerContent}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
              <Settings size={24} color={colors.background} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Phase 5: UX Polish & Scale
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Enhanced search, analytics, A/B testing, and performance monitoring
              </Text>
            </View>
          </View>
        </View>

        {/* Enhanced Search & Filtering */}
        {renderSearchSection()}

        {/* Game Analytics */}
        {renderAnalyticsSection()}

        {/* A/B Testing */}
        {renderABTestSection()}

        {/* Prefetch Configuration */}
        {renderPrefetchSection()}

        {/* Device Health Monitoring */}
        {renderDeviceHealthSection()}

        {/* Personalized Recommendations */}
        {renderRecommendationsSection()}

        {/* Implementation Summary */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Gamepad2 size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Phase 5 Implementation Summary
            </Text>
          </View>
          
          <View style={styles.summaryList}>
            <Text style={[styles.summaryItem, { color: colors.text }]}>
              ✅ Enhanced search with tags and advanced filters
            </Text>
            <Text style={[styles.summaryItem, { color: colors.text }]}>
              ✅ Game analytics and popularity scoring
            </Text>
            <Text style={[styles.summaryItem, { color: colors.text }]}>
              ✅ A/B testing for layout and recommendations
            </Text>
            <Text style={[styles.summaryItem, { color: colors.text }]}>
              ✅ Intelligent prefetching of popular games
            </Text>
            <Text style={[styles.summaryItem, { color: colors.text }]}>
              ✅ Device health monitoring and throttling
            </Text>
            <Text style={[styles.summaryItem, { color: colors.text }]}>
              ✅ Personalized game recommendations
            </Text>
            <Text style={[styles.summaryItem, { color: colors.text }]}>
              ✅ Performance metrics and crash detection
            </Text>
            <Text style={[styles.summaryItem, { color: colors.text }]}>
              ✅ Compact and standard layout variants
            </Text>
          </View>
        </View>
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
  
  // Header
  header: {
    padding: 20,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Sections
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  
  // Search Section
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsSection: {
    marginTop: 8,
  },
  tagsScroll: {
    marginTop: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Analytics Section
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  
  // A/B Test Section
  experimentCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  experimentTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  experimentVariant: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  experimentDescription: {
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 16,
  },
  experimentConfig: {
    marginTop: 4,
  },
  configLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  configValue: {
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  
  // Prefetch Section
  prefetchControls: {
    gap: 16,
  },
  prefetchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prefetchLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  sliderContainer: {
    gap: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  prefetchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  prefetchButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Device Health Section
  healthGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  healthCard: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  healthValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  healthLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  healthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  healthButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Recommendations Section
  recommendationsScroll: {
    marginBottom: 12,
  },
  recommendationCard: {
    width: 100,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 12,
  },
  recommendationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  recommendationName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  recommendationCategory: {
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  recommendationRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  recommendationRatingText: {
    fontSize: 9,
  },
  recommendationNote: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 16,
  },
  
  // Performance Section
  performanceScroll: {
    marginBottom: 12,
  },
  performanceCard: {
    width: 120,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
  },
  performanceGameName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  performanceMetric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 10,
  },
  performanceValue: {
    fontSize: 10,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  
  // Summary Section
  summaryList: {
    gap: 8,
  },
  summaryItem: {
    fontSize: 13,
    lineHeight: 18,
  },
});