import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import SecuritySystemAlerts from '@/components/SecuritySystemAlerts';
import SecurityAlertBanner from '@/components/SecurityAlertBanner';

export default function SystemAlertsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'System Security Alerts',
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
        <SecuritySystemAlerts />
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