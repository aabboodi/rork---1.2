import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import RootJailbreakDashboard from '@/components/RootJailbreakDashboard';

export default function RootDetectionScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'كشف اختراق الجهاز',
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTitleStyle: {
            color: '#1e293b',
            fontSize: 18,
            fontWeight: 'bold',
          },
          headerTintColor: '#3b82f6',
        }} 
      />
      <RootJailbreakDashboard />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});