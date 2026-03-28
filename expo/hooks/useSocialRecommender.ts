import { useState, useEffect, useCallback } from 'react';
import SocialRecommenderService, { RankedContent, ContentItem } from '@/services/ai/SocialRecommenderService';
import PersonalizationSettingsService from '@/services/ai/PersonalizationSettingsService';

export interface UseSocialRecommenderProps {
  slot: 'feed' | 'trending' | 'personalized' | 'discovery';
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useSocialRecommender({
  slot,
  limit = 20,
  autoRefresh = false,
  refreshInterval = 300000 // 5 minutes
}: UseSocialRecommenderProps) {
  const [recommendations, setRecommendations] = useState<RankedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [isPersonalized, setIsPersonalized] = useState(false);

  const recommenderService = SocialRecommenderService.getInstance();
  const settingsService = PersonalizationSettingsService.getInstance();

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if personalization is enabled
      const settings = await settingsService.getSettings();
      setIsPersonalized(settings.consent.given);

      // Get recommendations
      const recs = await recommenderService.getRecommendations(slot, limit);
      setRecommendations(recs);

      // Get performance metrics
      const metricsData = await recommenderService.getMetrics();
      setMetrics(metricsData);

      console.log(`📱 Loaded ${recs.length} recommendations for ${slot}`);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, [slot, limit]);

  const recordFeedback = useCallback(async (
    contentId: string,
    action: 'view' | 'like' | 'share' | 'skip' | 'report',
    dwellTime?: number
  ) => {
    try {
      await recommenderService.recordFeedback(contentId, action, dwellTime);
      
      // Update metrics after feedback
      const metricsData = await recommenderService.getMetrics();
      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to record feedback:', err);
    }
  }, []);

  const refreshRecommendations = useCallback(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // Initial load
  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadRecommendations();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadRecommendations]);

  return {
    recommendations,
    loading,
    error,
    metrics,
    isPersonalized,
    recordFeedback,
    refreshRecommendations,
    retry: loadRecommendations
  };
}

// Hook for recording content interactions
export function useContentInteraction(contentItem: ContentItem) {
  const recommenderService = SocialRecommenderService.getInstance();
  const [viewStartTime] = useState(Date.now());

  const recordView = useCallback(async () => {
    try {
      await recommenderService.recordFeedback(contentItem.id, 'view');
    } catch (error) {
      console.error('Failed to record view:', error);
    }
  }, [contentItem.id]);

  const recordLike = useCallback(async () => {
    try {
      await recommenderService.recordFeedback(contentItem.id, 'like');
    } catch (error) {
      console.error('Failed to record like:', error);
    }
  }, [contentItem.id]);

  const recordShare = useCallback(async () => {
    try {
      await recommenderService.recordFeedback(contentItem.id, 'share');
    } catch (error) {
      console.error('Failed to record share:', error);
    }
  }, [contentItem.id]);

  const recordSkip = useCallback(async () => {
    try {
      await recommenderService.recordFeedback(contentItem.id, 'skip');
    } catch (error) {
      console.error('Failed to record skip:', error);
    }
  }, [contentItem.id]);

  const recordReport = useCallback(async () => {
    try {
      await recommenderService.recordFeedback(contentItem.id, 'report');
    } catch (error) {
      console.error('Failed to record report:', error);
    }
  }, [contentItem.id]);

  const recordDwellTime = useCallback(async () => {
    try {
      const dwellTime = Date.now() - viewStartTime;
      if (dwellTime > 1000) { // Only record if viewed for more than 1 second
        await recommenderService.recordFeedback(contentItem.id, 'view', dwellTime);
      }
    } catch (error) {
      console.error('Failed to record dwell time:', error);
    }
  }, [contentItem.id, viewStartTime]);

  // Auto-record view on mount
  useEffect(() => {
    recordView();
  }, [recordView]);

  // Auto-record dwell time on unmount
  useEffect(() => {
    return () => {
      recordDwellTime();
    };
  }, [recordDwellTime]);

  return {
    recordView,
    recordLike,
    recordShare,
    recordSkip,
    recordReport,
    recordDwellTime
  };
}

// Hook for A/B testing and performance monitoring
export function useRecommenderMetrics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const recommenderService = SocialRecommenderService.getInstance();

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const metricsData = await recommenderService.getMetrics();
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
    
    // Refresh metrics every minute
    const interval = setInterval(loadMetrics, 60000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  return {
    metrics,
    loading,
    refresh: loadMetrics
  };
}