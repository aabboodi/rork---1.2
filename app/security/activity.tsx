import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import NewDeviceNotificationService from '@/services/security/NewDeviceNotificationService';
import ScreenProtectionService from '@/services/security/ScreenProtectionService';
import KeyRotationService from '@/services/security/KeyRotationService';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import { Shield, Key, AlertTriangle, Smartphone } from 'lucide-react-native';

type Severity = 'low' | 'medium' | 'high' | 'critical' | 'info';

interface SecurityEvent {
  id: string;
  timestamp: number;
  type: 'Device' | 'Screen Protection' | 'Key Rotation';
  description: string;
  severity: Severity;
}

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#22c55e',
};

const EVENT_ICONS: Record<SecurityEvent['type'], React.ReactNode> = {
  'Device': <Smartphone size={24} color={Colors.dark} />,
  'Screen Protection': <AlertTriangle size={24} color={Colors.dark} />,
  'Key Rotation': <Key size={24} color={Colors.dark} />,
};

export default function SecurityActivityScreen() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | SecurityEvent['type']>('all');

  useEffect(() => {
    const fetchSecurityEvents = async () => {
      setLoading(true);
      if (!user) return;

      const notifService = NewDeviceNotificationService.getInstance();
      const screenService = ScreenProtectionService.getInstance();
      const keyService = KeyRotationService.getInstance();

      const deviceNotifs = await notifService.getUserNotifications(user.id, true);
      const screenEvents = screenService.getProtectionEvents();
      const keyEvents = await keyService.getRotationHistory();

      const mappedDeviceNotifs: SecurityEvent[] = deviceNotifs.map(n => ({
        id: n.id,
        timestamp: n.timestamp,
        type: 'Device',
        description: `[${n.notificationType}] on ${n.deviceInfo.model}`,
        severity: n.severity,
      }));

      const mappedScreenEvents: SecurityEvent[] = screenEvents.map((e, i) => ({
        id: `screen_${e.timestamp}_${i}`,
        timestamp: e.timestamp,
        type: 'Screen Protection',
        description: `${e.type} (Severity: ${e.severity})`,
        severity: e.severity,
      }));

      const mappedKeyEvents: SecurityEvent[] = keyEvents.map(e => ({
        id: e.eventId,
        timestamp: e.timestamp.getTime(),
        type: 'Key Rotation',
        description: `Key ${e.keyId} rotated (${e.reason})`,
        severity: e.success ? 'info' : 'high',
      }));

      const allEvents = [...mappedDeviceNotifs, ...mappedScreenEvents, ...mappedKeyEvents];
      allEvents.sort((a, b) => b.timestamp - a.timestamp);
      setEvents(allEvents.slice(0, 100)); // Increased limit to 100
      setLoading(false);
    };

    fetchSecurityEvents();
  }, [user]);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') {
      return events;
    }
    return events.filter(event => event.type === filter);
  }, [events, filter]);

  const renderItem = ({ item }: { item: SecurityEvent }) => (
    <View style={styles.eventItem}>
      <View style={styles.eventIcon}>
        {EVENT_ICONS[item.type]}
      </View>
      <View style={styles.eventDetails}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventType}>{item.type}</Text>
          <Text style={styles.eventDate}>{new Date(item.timestamp).toLocaleString()}</Text>
        </View>
        <Text style={styles.eventDescription}>{item.description}</Text>
        <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLORS[item.severity] }]}>
          <Text style={styles.severityText}>{item.severity}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Security Activity' }} />
      <View style={styles.container}>
        <View style={styles.filterContainer}>
          <TouchableOpacity onPress={() => setFilter('all')} style={[styles.filterButton, filter === 'all' && styles.activeFilter]}>
            <Text style={styles.filterText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter('Device')} style={[styles.filterButton, filter === 'Device' && styles.activeFilter]}>
            <Text style={styles.filterText}>Device</Text>
          </TouchableOpacity>
           <TouchableOpacity onPress={() => setFilter('Screen Protection')} style={[styles.filterButton, filter === 'Screen Protection' && styles.activeFilter]}>
            <Text style={styles.filterText}>Screen</Text>
          </TouchableOpacity>
           <TouchableOpacity onPress={() => setFilter('Key Rotation')} style={[styles.filterButton, filter === 'Key Rotation' && styles.activeFilter]}>
            <Text style={styles.filterText}>Keys</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }}/>
        ) : (
          <FlatList
            data={filteredEvents.slice(0, 50)}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>No security events found.</Text>}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: Colors.light,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.inactive,
  },
  activeFilter: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    color: 'white',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 10,
  },
  eventItem: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventIcon: {
    marginRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetails: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  eventType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  eventDate: {
    fontSize: 12,
    color: Colors.medium,
  },
  eventDescription: {
    fontSize: 14,
    color: Colors.dark,
    marginBottom: 10,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: Colors.medium,
  }
});
