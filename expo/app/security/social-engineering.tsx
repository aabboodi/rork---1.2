import React from 'react';
import { SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import SocialEngineeringDashboard from '@/components/SocialEngineeringDashboard';

export default function SocialEngineeringScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Social Engineering Protection',
          headerStyle: {
            backgroundColor: '#3b82f6',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <SocialEngineeringDashboard />
      </SafeAreaView>
    </>
  );
}