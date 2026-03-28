import { useState, useEffect, useCallback } from 'react';
import RerankerService, { RankedContent } from '@/services/recommendation/reranker';
import BanditService from '@/services/recommendation/bandit';
import DataLayoutService from '@/services/ai/DataLayoutService';
import PersonalizationSettingsService from '@/services/ai/PersonalizationSettingsService';

export interface RecommenderOptions {
  slot: 'post' | 'video' | 'voice' | 'game' | 'feed' | 'trending' | 'personalized' | 'discovery';
  limit?: number;
  refreshInterval?: number;
}

export interface RecommenderResult {
  items: RankedContent[];
  reason: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  recordFeedback: (contentId: string, action: 'view' | 'like' | 'share' | 'skip' | 'report', dwellTime?: number) => Promise<void>;
}

export function useRecommender(options: RecommenderOptions): RecommenderResult {
  const [items, setItems] = useState<RankedContent[]>([]);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const rerankerService = RerankerService.getInstance();
  const banditService = BanditService.getInstance();
  const dataLayoutService = DataLayoutService.getInstance();
  const settingsService = PersonalizationSettingsService.getInstance();
  
  const { slot, limit = 20, refreshInterval = 300000 } = options; // 5 min default refresh

  const fetchRecommendations = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🎯 Fetching recommendations for slot: ${slot}`);
      
      // Check if personalization is enabled
      const settings = await settingsService.getSettings();
      if (!settings.consent.given) {
        setReason('personalization_disabled');
        setItems([]);
        return;
      }
      
      // Step 1: Server pre-rank (fetch 50-100 items)
      const preRankedItems = await dataLayoutService.fetchSocialPrerank({
        slot: slot as 'post' | 'video' | 'voice' | 'game',
        limit: 100
      });
      
      if (preRankedItems.length === 0) {
        setReason('no_content_available');
        setItems([]);
        return;
      }
      
      // Step 2: On-device rerank with lightweight model
      const rerankedItems = await rerankerService.rerankContent(preRankedItems);
      
      // Step 3: Apply bandit exploration/exploitation
      const finalItems = await banditService.applyBanditExploration(rerankedItems);
      
      // Limit results
      const limitedItems = finalItems.slice(0, limit);
      
      setItems(limitedItems);
      setReason('personalized_ranking');
      
      console.log(`✅ Generated ${limitedItems.length} recommendations for ${slot}`);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setReason('error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [slot, limit, settingsService, dataLayoutService, rerankerService, banditService]);
  
  const recordFeedback = async (
    contentId: string, 
    action: 'view' | 'like' | 'share' | 'skip' | 'report',
    dwellTime?: number
  ): Promise<void> => {
    try {
      await banditService.recordFeedback(contentId, action, dwellTime, { slot });
      console.log(`📊 Feedback recorded: ${action} for ${contentId}`);
    } catch (err) {
      console.error('Failed to record feedback:', err);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);
  
  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchRecommendations, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchRecommendations]);
  
  return {
    items,
    reason,
    loading,
    error,
    refresh: fetchRecommendations,
    recordFeedback
  };
}