import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import E2EESecurityDashboard from '@/components/E2EESecurityDashboard';

export default function E2EESecurityScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'End-to-End Encryption',
          headerStyle: {
            backgroundColor: '#2196F3'
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600'
          }
        }} 
      />
      <E2EESecurityDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  }
});