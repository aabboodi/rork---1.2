import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import SecurityBreachDashboard from '@/components/SecurityBreachDashboard';
import SecurityAlertBanner from '@/components/SecurityAlertBanner';

export default function BreachDashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Security Breach Dashboard',
          headerStyle: {
            backgroundColor: '#1C1C1E'
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600'
          }
        }}
      />
      
      <View style={styles.content}>
        <SecurityAlertBanner />
        <SecurityBreachDashboard />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7'
  },
  content: {
    flex: 1
  }
});