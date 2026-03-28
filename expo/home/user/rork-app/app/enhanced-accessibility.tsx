import React from 'react';
import { Stack } from 'expo-router';
import EnhancedAccessibilityShowcase from '@/components/accessibility/EnhancedAccessibilityShowcase';

export default function EnhancedAccessibilityScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'عرض الوصولية المحسن',
          headerShown: false
        }} 
      />
      <EnhancedAccessibilityShowcase />
    </>
  );
}