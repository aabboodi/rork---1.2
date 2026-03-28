import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { Key, RotateCcw, ShieldCheck } from 'lucide-react-native';

interface KeyMetric {
  label: string;
  value: string;
}

export default function KeyRotationDashboard(): JSX.Element {
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<KeyMetric[]>([]);
  const [error, setError] = useState<string | null>(null);

  const bg = useMemo(() => '#0f172a', []);
  const cardBg = useMemo(() => '#111827', []);
  const textPrimary = useMemo(() => '#E5E7EB', []);
  const textSecondary = useMemo(() => '#9CA3AF', []);
  const accent = useMemo(() => '#22d3ee', []);

  const load = useCallback(async () => {
    console.log('[KeyRotationDashboard] load() start');
    setError(null);
    try {
      // Placeholder simulated data to avoid native/runtime coupling
      const now = new Date();
      const next = new Date(now.getTime() + 1000 * 60 * 60 * 12);
      const data: KeyMetric[] = [
        { label: 'Active Keys', value: '3' },
        { label: 'Keys Rotated (30d)', value: '12' },
        { label: 'Next Rotation ETA', value: next.toLocaleString() },
        { label: 'Revoked Sessions (24h)', value: '5' },
      ];
      setMetrics(data);
    } catch (e) {
      console.error('[KeyRotationDashboard] load error', e);
      setError('Failed to load key rotation data. Pull to retry.');
    } finally {
      console.log('[KeyRotationDashboard] load() end');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={accent}
          colors={[accent]}
        />
      }
      testID="key-rotation-dashboard-scroll"
    >
      <View style={[styles.header, { borderColor: accent }]}
        testID="key-rotation-dashboard-header"
      >
        <ShieldCheck color={accent} size={24} />
        <Text style={[styles.headerText, { color: textPrimary }]}>Key Rotation & Session Revocation</Text>
      </View>

      {error ? (
        <View style={[styles.errorCard, { backgroundColor: cardBg }]}
          testID="key-rotation-error"
        >
          <Text style={[styles.errorText]}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {metrics.map((m, idx) => (
          <View key={idx} style={[styles.card, { backgroundColor: cardBg }]} testID={`metric-${idx}`}>
            <View style={styles.cardIconRow}>
              {idx % 2 === 0 ? (
                <Key color={accent} size={18} />
              ) : (
                <RotateCcw color={accent} size={18} />
              )}
              <Text style={[styles.cardLabel, { color: textSecondary }]}>
                {m.label}
              </Text>
            </View>
            <Text style={[styles.cardValue, { color: textPrimary }]}>${'{'}m.value{'}'}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={onRefresh}
        style={[styles.cta, { borderColor: accent }]}
        accessibilityRole="button"
        accessibilityLabel="Refresh key rotation data"
        testID="refresh-button"
      >
        <Text style={[styles.ctaText, { color: accent }]}>Refresh</Text>
      </TouchableOpacity>

      <Text style={[styles.footnote, { color: textSecondary }]} testID="footnote">
        {Platform.OS === 'web'
          ? 'Web view: Data shown is mock for demo. Production uses secure native services.'
          : 'Mobile view: Data shown is mock for demo. Production integrates secure services.'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    rowGap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  card: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
  },
  cardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 12,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  cta: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorCard: {
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#fecaca',
  },
  footnote: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
});
