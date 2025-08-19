import React from 'react';
import { Stack } from 'expo-router';
import ForensicsDashboard from '@/components/ForensicsDashboard';

export default function ForensicsScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'التحليل الجنائي',
          headerStyle: { backgroundColor: '#2196F3' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '600' }
        }} 
      />
      <ForensicsDashboard />
    </>
  );
}