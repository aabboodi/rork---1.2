import React from 'react';
import { Stack } from 'expo-router';
import MobileSecurityDashboard from '@/components/MobileSecurityDashboard';

export default function MobileSecurityPage() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Mobile Security',
          headerStyle: {
            backgroundColor: '#6366f1',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }} 
      />
      <MobileSecurityDashboard />
    </>
  );
}