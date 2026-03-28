import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import UEBADashboard from '@/components/UEBADashboard';

export default function UEBAScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'UEBA - تحليل سلوك المستخدم',
          headerStyle: {
            backgroundColor: '#1e293b',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }} 
      />
      <UEBADashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  }
});