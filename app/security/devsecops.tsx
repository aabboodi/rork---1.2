import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { DevSecOpsDashboard } from '@/components/DevSecOpsDashboard';

export default function DevSecOpsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'DevSecOps Integration',
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }} 
      />
      <DevSecOpsDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  }
});