import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SOCDashboard } from '@/components/SOCDashboard';

export default function SOCScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Security Operations Center',
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }} 
      />
      <SOCDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  }
});