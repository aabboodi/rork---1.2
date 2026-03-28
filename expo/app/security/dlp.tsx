import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import DLPDashboard from '@/components/DLPDashboard';
import Colors from '@/constants/colors';

export default function DLPScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Data Loss Prevention',
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      
      <View style={styles.container}>
        <DLPDashboard />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});