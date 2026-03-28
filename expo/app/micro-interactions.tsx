import React from 'react';
import { SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import MicroInteractionsShowcase from '@/components/MicroInteractionsShowcase';
import Colors from '@/constants/colors';

export default function MicroInteractionsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack.Screen 
        options={{ 
          title: 'التفاعلات الدقيقة',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.dark,
          headerTitleStyle: { fontWeight: 'bold' }
        }} 
      />
      <MicroInteractionsShowcase />
    </SafeAreaView>
  );
}