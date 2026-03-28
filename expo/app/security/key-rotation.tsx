import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import KeyRotationDashboard from '@/components/KeyRotationDashboard';

export default function KeyRotationScreen() {
  const bgColor = useMemo(() => '#1a1a2e', []);
  console.log('[KeyRotationScreen] render');

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]} testID="key-rotation-screen">
      <Stack.Screen
        options={{
          title: 'تناوب المفاتيح وإبطال الجلسات',
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <KeyRotationDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});
