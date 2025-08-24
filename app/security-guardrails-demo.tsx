import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import SecurityGuardrailsDashboard from '@/components/SecurityGuardrailsDashboard';

export default function SecurityGuardrailsDemo() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Security Guardrails Demo',
          headerStyle: { backgroundColor: '#6366f1' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' }
        }} 
      />
      <SecurityGuardrailsDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});