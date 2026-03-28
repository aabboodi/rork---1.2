import React, { memo, useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, AccessibilityInfo } from 'react-native';

interface ToggleProps {
  label: string;
  onPress: () => void;
  active: boolean;
  testID?: string;
}

const Toggle = memo(({ label, onPress, active, testID }: ToggleProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ pressed: active }}
      accessibilityLabel={label}
      style={[styles.toggle, active ? styles.toggleActive : styles.toggleInactive]}
      testID={testID}
    >
      <Text style={styles.toggleText}>{label}</Text>
    </TouchableOpacity>
  );
});

export const AccessibilityShowcase = memo(() => {
  const [liked, setLiked] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);

  const announce = useCallback(async (msg: string) => {
    try {
      await AccessibilityInfo.announceForAccessibility(msg);
    } catch (e) {
      console.log('announceForAccessibility error', e);
    }
  }, []);

  const onLike = useCallback(() => {
    const next = !liked;
    setLiked(next);
    const msg = next ? 'Added to favorites' : 'Removed from favorites';
    announce(msg);
    Alert.alert('Status', msg);
  }, [announce, liked]);

  const onMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    const msg = next ? 'Audio muted' : 'Audio unmuted';
    announce(msg);
  }, [announce, muted]);

  return (
    <ScrollView contentContainerStyle={styles.container} testID="accessibility-showcase">
      <Text accessibilityRole="header" style={styles.title}>Accessibility Showcase</Text>
      <Text style={styles.subtitle} accessibilityHint="This screen demonstrates basic accessible controls">
        Basic accessible controls and announcements
      </Text>

      <View style={styles.row}>
        <Toggle label={liked ? 'Liked' : 'Like'} onPress={onLike} active={liked} testID="like-toggle" />
        <Toggle label={muted ? 'Muted' : 'Mute'} onPress={onMute} active={muted} testID="mute-toggle" />
      </View>

      <View accessible accessibilityLabel="Information card" style={styles.card} testID="info-card">
        <Text style={styles.cardTitle}>High contrast ready</Text>
        <Text style={styles.cardBody}>All text sizes and colors are readable and have sufficient contrast.</Text>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: '#555555',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  toggle: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  toggleActive: {
    backgroundColor: '#111827',
  },
  toggleInactive: {
    backgroundColor: '#E5E7EB',
  },
  toggleText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    color: '#333333',
  },
});

export default AccessibilityShowcase;
