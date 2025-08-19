import React from 'react';
import { Stack } from 'expo-router';
import { AccessibilitySettings } from '@/components/accessibility/AccessibilitySettings';

export default function AccessibilityScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Accessibility Settings',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTitleStyle: {
            color: '#000000',
            fontWeight: '600',
          },
        }} 
      />
      <AccessibilitySettings />
    </>
  );
}