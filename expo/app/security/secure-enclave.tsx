import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import SecureEnclaveDashboard from '@/components/SecureEnclaveDashboard';

export default function SecureEnclaveScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Secure Enclave',
          headerStyle: {
            backgroundColor: '#3B82F6',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }} 
      />
      <SecureEnclaveDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});