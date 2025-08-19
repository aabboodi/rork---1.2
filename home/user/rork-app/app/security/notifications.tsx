import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import SecurityNotificationCenter from '@/components/SecurityNotificationCenter';

export default function SecurityNotificationsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Security Notifications',
          headerShown: false
        }} 
      />
      <SecurityNotificationCenter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  }
});