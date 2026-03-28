import React from 'react';
import { Stack } from 'expo-router';
import ThemeSelector from '@/components/ThemeSelector';

export default function ThemeSettingsScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'إعدادات المظهر',
          headerShown: false
        }} 
      />
      <ThemeSelector />
    </>
  );
}