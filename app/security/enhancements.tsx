import React from 'react';
import { Stack } from 'expo-router';
import SecurityEnhancementsDashboard from '@/components/SecurityEnhancementsDashboard';

export default function SecurityEnhancementsScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Security Enhancements',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#111827',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }} 
      />
      <SecurityEnhancementsDashboard />
    </>
  );
}