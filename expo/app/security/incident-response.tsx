import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import IncidentResponseDashboard from '@/components/IncidentResponseDashboard';

export default function IncidentResponseScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Incident Response',
          headerStyle: { backgroundColor: '#DC2626' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' }
        }} 
      />
      <IncidentResponseDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});