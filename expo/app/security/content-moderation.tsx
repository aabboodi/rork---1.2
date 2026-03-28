import React from 'react';
import { Stack } from 'expo-router';
import ContentModerationDashboard from '@/components/ContentModerationDashboard';

export default function ContentModerationScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'مراقبة المحتوى',
          headerStyle: { backgroundColor: '#2196F3' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '600' }
        }} 
      />
      <ContentModerationDashboard />
    </>
  );
}