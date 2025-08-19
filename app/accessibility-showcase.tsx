import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { AccessibilityShowcase } from '@/components/accessibility/AccessibilityShowcase';

export default function AccessibilityShowcaseScreen() {
  return (
    <View style={styles.container} testID="accessibility-showcase-screen">
      <Stack.Screen
        options={{
          title: 'Accessibility Showcase',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#000000', fontWeight: '600' as const },
        }}
      />
      <AccessibilityShowcase />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
});
