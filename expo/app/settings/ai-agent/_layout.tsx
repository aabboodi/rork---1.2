import React from 'react';
import { Stack } from 'expo-router';
import { useSafeThemeColors } from '@/store/themeStore';

export default function AIAgentLayout() {
  const colors = useSafeThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
        headerTitleStyle: {
          color: colors.text,
          fontWeight: '600',
        },
        headerTintColor: colors.primary,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'AI Agent Settings',
          headerTitle: 'الذكاء الاصطناعي للمحادثات',
        }}
      />
      <Stack.Screen
        name="training"
        options={{
          title: 'Training Data',
          headerTitle: 'بيانات التدريب',
        }}
      />
      <Stack.Screen
        name="exceptions"
        options={{
          title: 'Exceptions',
          headerTitle: 'الاستثناءات',
        }}
      />
      <Stack.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          headerTitle: 'الجدولة',
        }}
      />
    </Stack>
  );
}