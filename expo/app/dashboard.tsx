import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ComprehensiveDashboard from '@/components/ComprehensiveDashboard';

export default function DashboardScreen() {
  const handleNavigate = (screen: string) => {
    console.log(`Navigate to: ${screen}`);
    // In a real app, this would use router.push() or navigation
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'System Dashboard',
          headerShown: false
        }} 
      />
      <ComprehensiveDashboard onNavigate={handleNavigate} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});