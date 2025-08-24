import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { useThemeStore } from '@/store/themeStore';
import { AccessibleText } from '@/components/accessibility/AccessibleText';
import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleCard } from '@/components/accessibility/AccessibleCard';
import SocialRecommenderDashboard from '@/components/SocialRecommenderDashboard';
import { useRouter } from 'expo-router';

export default function Phase1SocialRecommenderDemo() {
  const { colors } = useThemeStore();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.text === '#FFFFFF' ? 'light' : 'dark'} />
      
      <Stack.Screen 
        options={{
          title: 'Phase 1: Social Recommender',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerLeft: () => (
            <AccessibleButton
              title=''
              onPress={() => router.back()}
              variant='ghost'
              size='small'
              icon={<ArrowLeft size={24} color={colors.text} />}
              accessibilityLabel='Go back'
            />
          ),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Phase Overview */}
        <AccessibleCard variant='elevated' padding='large' style={styles.overviewCard}>
          <AccessibleText variant='heading2' weight='bold' style={styles.title}>
            Phase 1: Social Recommender
          </AccessibleText>
          <AccessibleText variant='body' color='secondary' style={styles.subtitle}>
            Server Pre-rank + On-device Rerank Implementation
          </AccessibleText>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <AccessibleText variant='body' weight='medium'>
                ✅ Server Pre-ranking (50-100 items)
              </AccessibleText>
            </View>
            <View style={styles.featureItem}>
              <AccessibleText variant='body' weight='medium'>
                ✅ On-device Reranking (LogReg/MLP-int8)
              </AccessibleText>
            </View>
            <View style={styles.featureItem}>
              <AccessibleText variant='body' weight='medium'>
                ✅ Bandit Exploration (ε-greedy)
              </AccessibleText>
            </View>
            <View style={styles.featureItem}>
              <AccessibleText variant='body' weight='medium'>
                ✅ Performance Constraints (≤120ms, ≤30MB)
              </AccessibleText>
            </View>
            <View style={styles.featureItem}>
              <AccessibleText variant='body' weight='medium'>
                ✅ CTR Improvement Target (+5-8%)
              </AccessibleText>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
            <AccessibleText variant='caption' color='success' weight='bold'>
              PHASE 1 COMPLETE
            </AccessibleText>
          </View>
        </AccessibleCard>

        {/* Technical Architecture */}
        <AccessibleCard variant='elevated' padding='large' style={styles.section}>
          <AccessibleText variant='heading3' weight='semibold' style={styles.sectionTitle}>
            Technical Architecture
          </AccessibleText>
          
          <View style={styles.architectureFlow}>
            <View style={styles.flowStep}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <AccessibleText variant='caption' color='textInverse' weight='bold'>1</AccessibleText>
              </View>
              <View style={styles.stepContent}>
                <AccessibleText variant='body' weight='medium'>Server Pre-ranking</AccessibleText>
                <AccessibleText variant='caption' color='secondary'>
                  Global trends, user segments, engagement signals
                </AccessibleText>
              </View>
            </View>

            <View style={styles.flowStep}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <AccessibleText variant='caption' color='textInverse' weight='bold'>2</AccessibleText>
              </View>
              <View style={styles.stepContent}>
                <AccessibleText variant='body' weight='medium'>Feature Extraction</AccessibleText>
                <AccessibleText variant='caption' color='secondary'>
                  User history, session context, geo-temporal, trends
                </AccessibleText>
              </View>
            </View>

            <View style={styles.flowStep}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <AccessibleText variant='caption' color='textInverse' weight='bold'>3</AccessibleText>
              </View>
              <View style={styles.stepContent}>
                <AccessibleText variant='body' weight='medium'>On-device Reranking</AccessibleText>
                <AccessibleText variant='caption' color='secondary'>
                  Lightweight linear model, personalized scoring
                </AccessibleText>
              </View>
            </View>

            <View style={styles.flowStep}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <AccessibleText variant='caption' color='textInverse' weight='bold'>4</AccessibleText>
              </View>
              <View style={styles.stepContent}>
                <AccessibleText variant='body' weight='medium'>Bandit Exploration</AccessibleText>
                <AccessibleText variant='caption' color='secondary'>
                  ε-greedy strategy, exploration-exploitation balance
                </AccessibleText>
              </View>
            </View>
          </View>
        </AccessibleCard>

        {/* Performance Targets */}
        <AccessibleCard variant='elevated' padding='large' style={styles.section}>
          <AccessibleText variant='heading3' weight='semibold' style={styles.sectionTitle}>
            Performance Targets
          </AccessibleText>
          
          <View style={styles.targetsList}>
            <View style={styles.targetItem}>
              <AccessibleText variant='body' weight='medium'>Latency</AccessibleText>
              <AccessibleText variant='body' color='success' weight='bold'>≤120ms</AccessibleText>
            </View>
            <View style={styles.targetItem}>
              <AccessibleText variant='body' weight='medium'>Memory Usage</AccessibleText>
              <AccessibleText variant='body' color='success' weight='bold'>≤30MB</AccessibleText>
            </View>
            <View style={styles.targetItem}>
              <AccessibleText variant='body' weight='medium'>CTR Improvement</AccessibleText>
              <AccessibleText variant='body' color='success' weight='bold'>+5-8%</AccessibleText>
            </View>
            <View style={styles.targetItem}>
              <AccessibleText variant='body' weight='medium'>Network Calls</AccessibleText>
              <AccessibleText variant='body' color='success' weight='bold'>No Additional</AccessibleText>
            </View>
          </View>
        </AccessibleCard>

        {/* Live Demo */}
        <View style={styles.section}>
          <AccessibleText variant='heading3' weight='semibold' style={styles.sectionTitle}>
            Live Demo
          </AccessibleText>
          <SocialRecommenderDashboard />
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  overviewCard: {
    marginBottom: 20,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 20,
    lineHeight: 20,
  },
  featureList: {
    marginBottom: 20,
  },
  featureItem: {
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  architectureFlow: {
    gap: 16,
  },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  targetsList: {
    gap: 12,
  },
  targetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});