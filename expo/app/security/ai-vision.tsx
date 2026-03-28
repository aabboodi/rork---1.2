import React from 'react';
import { Stack } from 'expo-router';
import AIVisionDashboard from '@/components/AIVisionDashboard';

export default function AIVisionScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'AI Vision Security',
          headerStyle: {
            backgroundColor: '#667eea',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }} 
      />
      <AIVisionDashboard />
    </>
  );
}