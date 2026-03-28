import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import HttpOnlyCookieDashboard from '@/components/HttpOnlyCookieDashboard';

export default function HttpOnlyCookiesScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'HttpOnly Cookies',
          headerStyle: { backgroundColor: '#3B82F6' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' }
        }} 
      />
      <HttpOnlyCookieDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});