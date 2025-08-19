import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Radio, Camera, Save, X, Globe, Lock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';

export default function CreateChannelScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const t = translations[language];
  
  const [channelData, setChannelData] = useState({
    name: '',
    description: '',
    picture: '',
    isPublic: true,
  });
  
  const handleCreate = () => {
    if (!channelData.name.trim()) {
      Alert.alert(t.error, t.channelNameRequired);
      return;
    }
    
    // Create channel logic here
    console.log('Creating channel:', channelData);
    Alert.alert(t.success, t.channelCreated, [
      { text: t.done, onPress: () => router.back() }
    ]);
  };
  
  const handleCancel = () => {
    router.back();
  };
  
  return (
    <>
      <Stack.Screen
        options={{
          title: t.createChannel,
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTitleStyle: {
            color: Colors.dark,
            fontWeight: '600',
          },
          headerLeft: () => (
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
              <X size={22} color={Colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleCreate} style={styles.headerButton}>
              <Save size={22} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView style={styles.container}>
        {/* Channel Info */}
        <View style={styles.channelInfoSection}>
          <TouchableOpacity style={styles.channelPictureContainer}>
            <Camera size={32} color={Colors.medium} />
            <Text style={styles.addPictureText}>{t.addChannelPicture}</Text>
          </TouchableOpacity>
          
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder={t.channelName}
              value={channelData.name}
              onChangeText={(text) => setChannelData({ ...channelData, name: text })}
              placeholderTextColor={Colors.medium}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder={t.channelDescription}
              value={channelData.description}
              onChangeText={(text) => setChannelData({ ...channelData, description: text })}
              placeholderTextColor={Colors.medium}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
        
        {/* Channel Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t.channelSettings}</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingIcon}>
                {channelData.isPublic ? (
                  <Globe size={20} color={Colors.primary} />
                ) : (
                  <Lock size={20} color={Colors.primary} />
                )}
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>
                  {channelData.isPublic ? t.publicChannel : t.privateChannel}
                </Text>
                <Text style={styles.settingDescription}>
                  {channelData.isPublic 
                    ? t.publicChannelDescription 
                    : t.privateChannelDescription
                  }
                </Text>
              </View>
            </View>
            <Switch
              value={channelData.isPublic}
              onValueChange={(value) => setChannelData({ ...channelData, isPublic: value })}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
            />
          </View>
        </View>
        
        {/* Channel Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>{t.aboutChannels}</Text>
          <Text style={styles.infoText}>{t.channelInfoDescription}</Text>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
            <Radio size={20} color="white" />
            <Text style={styles.createButtonText}>{t.createChannel}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 8,
  },
  channelInfoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  channelPictureContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  addPictureText: {
    fontSize: 12,
    color: Colors.medium,
    marginTop: 4,
    textAlign: 'center',
  },
  inputGroup: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  input: {
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.dark,
  },
  descriptionInput: {
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  settingsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.medium,
    marginTop: 2,
  },
  infoSection: {
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.medium,
    lineHeight: 20,
  },
  actions: {
    padding: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});