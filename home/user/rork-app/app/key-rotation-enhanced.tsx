import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import EnhancedKeyRotationDashboard from '@/components/EnhancedKeyRotationDashboard';

export default function EnhancedKeyRotationScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Enhanced Key Rotation',
          headerShown: false
        }} 
      />
      <EnhancedKeyRotationDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  }
});