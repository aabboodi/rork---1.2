import { useEffect, useRef } from 'react';
import PersonalizationSignalsService from '@/services/ai/PersonalizationSignalsService';
import PersonalizationSettingsService from '@/services/ai/PersonalizationSettingsService';

export interface UsePersonalizationSignalsProps {
  contentId: string;
  contentType: 'post' | 'video' | 'voice' | 'game';
  metadata?: {
    category?: string;
    tags?: string[];
    author?: string;
    engagement?: number;
  };
}

export function usePersonalizationSignals({
  contentId,
  contentType,
  metadata
}: UsePersonalizationSignalsProps) {
  const viewStartTime = useRef<number>(Date.now());
  const signalsService = PersonalizationSignalsService.getInstance();
  const settingsService = PersonalizationSettingsService.getInstance();

  // Record view signal when component mounts
  useEffect(() => {
    const recordViewSignal = async () => {
      try {
        const settings = await settingsService.getSettings();
        if (!settings.consent.given || !settings.privacy.dataCollection) {
          return;
        }

        await signalsService.recordSocialSignal({
          type: contentType,
          action: 'view',
          contentId,
          metadata
        });
      } catch (error) {
        console.error('Failed to record view signal:', error);
      }
    };

    recordViewSignal();
    viewStartTime.current = Date.now();
  }, [contentId, contentType, metadata]);

  // Record dwell time when component unmounts
  useEffect(() => {
    return () => {
      const recordDwellTime = async () => {
        try {
          const settings = await settingsService.getSettings();
          if (!settings.consent.given || !settings.privacy.dataCollection) {
            return;
          }

          const dwellTime = Date.now() - viewStartTime.current;
          if (dwellTime > 1000) { // Only record if viewed for more than 1 second
            await signalsService.recordSocialSignal({
              type: contentType,
              action: 'dwell',
              contentId,
              duration: dwellTime,
              metadata
            });
          }
        } catch (error) {
          console.error('Failed to record dwell time:', error);
        }
      };

      recordDwellTime();
    };
  }, [contentId, contentType, metadata]);

  // Function to record interaction signals
  const recordInteraction = async (action: 'like' | 'swipe' | 'mute' | 'report') => {
    try {
      const settings = await settingsService.getSettings();
      if (!settings.consent.given || !settings.privacy.dataCollection) {
        return;
      }

      await signalsService.recordSocialSignal({
        type: contentType,
        action,
        contentId,
        metadata
      });

      console.log(`📊 Recorded ${action} signal for ${contentType}:`, contentId);
    } catch (error) {
      console.error(`Failed to record ${action} signal:`, error);
    }
  };

  return {
    recordInteraction
  };
}

// Hook for recording geo-temporal signals
export function useGeoTemporalSignals() {
  const signalsService = PersonalizationSignalsService.getInstance();
  const settingsService = PersonalizationSettingsService.getInstance();
  const sessionStartTime = useRef<number>(Date.now());

  const recordSessionSignal = async (activityType: 'social' | 'chat' | 'wallet' | 'game') => {
    try {
      const settings = await settingsService.getSettings();
      if (!settings.consent.given || !settings.privacy.dataCollection) {
        return;
      }

      const sessionDuration = Date.now() - sessionStartTime.current;
      await signalsService.recordGeoTemporalSignal(activityType, sessionDuration);
      
      // Reset session start time
      sessionStartTime.current = Date.now();
    } catch (error) {
      console.error('Failed to record geo-temporal signal:', error);
    }
  };

  return {
    recordSessionSignal
  };
}

// Hook for getting personalization insights
export function usePersonalizationInsights() {
  const signalsService = PersonalizationSignalsService.getInstance();

  const getInsights = async () => {
    try {
      return await signalsService.getPersonalizationInsights();
    } catch (error) {
      console.error('Failed to get personalization insights:', error);
      return {
        topCategories: [],
        preferredTimes: [],
        engagementPatterns: []
      };
    }
  };

  const getTrends = async () => {
    try {
      return await signalsService.getTrends();
    } catch (error) {
      console.error('Failed to get trends:', error);
      return [];
    }
  };

  return {
    getInsights,
    getTrends
  };
}