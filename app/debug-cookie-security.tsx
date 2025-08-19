import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Stack } from 'expo-router';
import HttpOnlyCookieService from '@/services/security/HttpOnlyCookieService';

interface CookieStatus {
  initialized: boolean;
  totalCookies: number;
  securityEvents: number;
  criticalEvents: number;
  deviceBindingEnabled: boolean;
  encryptionEnabled: boolean;
  signatureValidationEnabled: boolean;
  platform: string;
}

export default function DebugCookieSecurityScreen() {
  const [status, setStatus] = useState<CookieStatus | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [cookies, setCookies] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const service = useMemo(() => HttpOnlyCookieService.getInstance(), []);

  const refresh = async () => {
    try {
      setRefreshing(true);
      const s = service.getCookieSecurityStatus();
      const ev = service.getSecurityEvents();
      const ck = service.getAllCookies();
      setStatus(s);
      setEvents(ev.slice(-200));
      setCookies(ck);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const clearAll = async () => {
    try {
      await service.clearAllCookies();
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to clear');
    }
  };

  return (
    <View style={styles.container} testID="debug-cookie-screen">
      <Stack.Screen options={{ title: 'Cookie Security Debug' }} />
      <View style={styles.header}>
        <Text style={styles.title} testID="title">Cookie Security Status</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh} testID="refresh-btn">
          <Text style={styles.refreshTxt}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>
      {error ? (
        <Text style={styles.error} testID="error">{error}</Text>
      ) : null}
      {status ? (
        <View style={styles.card} testID="status-card">
          <Text style={styles.kv}>Initialized: <Text style={styles.v}>{String(status.initialized)}</Text></Text>
          <Text style={styles.kv}>Platform: <Text style={styles.v}>{status.platform}</Text></Text>
          <Text style={styles.kv}>Total Cookies: <Text style={styles.v}>{status.totalCookies}</Text></Text>
          <Text style={styles.kv}>Events: <Text style={styles.v}>{status.securityEvents} (critical {status.criticalEvents})</Text></Text>
          <Text style={styles.kv}>Device Binding: <Text style={styles.v}>{String(status.deviceBindingEnabled)}</Text></Text>
          <Text style={styles.kv}>Encryption: <Text style={styles.v}>{String(status.encryptionEnabled)}</Text></Text>
          <Text style={styles.kv}>Signature: <Text style={styles.v}>{String(status.signatureValidationEnabled)}</Text></Text>
          <TouchableOpacity onPress={clearAll} style={styles.clearBtn} testID="clear-btn">
            <Text style={styles.clearTxt}>Clear All Cookies</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView style={styles.list} testID="cookies-list">
        <Text style={styles.sectionTitle}>Cookies ({cookies.length})</Text>
        {cookies.map((c) => (
          <View key={`${c.name}`} style={styles.cookieItem}>
            <Text style={styles.cookieName}>{c.name}</Text>
            <Text style={styles.cookieMeta}>httpOnly={String(c.options?.httpOnly)} secure={String(c.options?.secure)} sameSite={c.options?.sameSite}</Text>
            <Text style={styles.cookieMeta}>nonce={c.nonce} ts={c.timestamp}</Text>
          </View>
        ))}
        <Text style={styles.sectionTitle}>Recent Events ({events.length})</Text>
        {events.slice().reverse().map((e, idx) => (
          <View key={idx} style={styles.eventItem}>
            <Text style={styles.eventLine}>{new Date(e.timestamp).toLocaleTimeString()} • {e.type} • {e.severity}</Text>
            <Text style={styles.eventDetails} numberOfLines={2}>{JSON.stringify(e.details)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F14' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: 'white', fontSize: 18, fontWeight: '700' as const },
  refreshBtn: { backgroundColor: '#1F6FEB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  refreshTxt: { color: 'white', fontWeight: '600' as const },
  error: { color: '#ff6b6b', paddingHorizontal: 16, paddingBottom: 8 },
  card: { backgroundColor: '#111827', margin: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1f2937' },
  kv: { color: '#D1D5DB', marginBottom: 4 },
  v: { color: '#FFFFFF', fontWeight: '600' as const },
  clearBtn: { marginTop: 12, backgroundColor: '#EF4444', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  clearTxt: { color: 'white', fontWeight: '700' as const },
  list: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { color: '#9CA3AF', marginTop: 16, marginBottom: 8, fontWeight: '700' as const },
  cookieItem: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1f2937' },
  cookieName: { color: '#E5E7EB', fontWeight: '700' as const },
  cookieMeta: { color: '#9CA3AF' },
  eventItem: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1f2937' },
  eventLine: { color: '#D1D5DB' },
  eventDetails: { color: '#6B7280' }
});
