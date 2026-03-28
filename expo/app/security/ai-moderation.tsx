import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import SecurityAIDashboard from '../../components/SecurityAIDashboard';
import AIContentModerationDashboard from '../../components/AIContentModerationDashboard';

const AIModerationScreen = () => {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'AI Security & Moderation',
          headerShown: false
        }} 
      />
      <SecurityAIDashboard />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  }
});

export default AIModerationScreen;