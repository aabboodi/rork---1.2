import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import AIContentModerationDashboard from '../../components/AIContentModerationDashboard';

const ContentModerationAIScreen = () => {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'AI Content Moderation',
          headerShown: false
        }} 
      />
      <AIContentModerationDashboard />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  }
});

export default ContentModerationAIScreen;