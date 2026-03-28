import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { User, Phone, Mail, MapPin, Briefcase, Save, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';

export default function NewContactScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const t = translations[language];
  
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    phoneNumber: '',
    email: '',
    bio: '',
    workPlace: '',
  });
  
  const handleSave = () => {
    if (!formData.displayName.trim()) {
      Alert.alert(t.error, t.nameRequired);
      return;
    }
    
    if (!formData.phoneNumber.trim()) {
      Alert.alert(t.error, t.phoneRequired);
      return;
    }
    
    // Save contact logic here
    console.log('Saving contact:', formData);
    Alert.alert(t.success, t.contactAdded, [
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
          title: t.addContact,
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
            <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
              <Save size={22} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <User size={20} color={Colors.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder={t.displayName}
              value={formData.displayName}
              onChangeText={(text) => setFormData({ ...formData, displayName: text })}
              placeholderTextColor={Colors.medium}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <User size={20} color={Colors.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder={t.username}
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              placeholderTextColor={Colors.medium}
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <Phone size={20} color={Colors.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder={t.phoneNumber}
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
              placeholderTextColor={Colors.medium}
              keyboardType="phone-pad"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <Mail size={20} color={Colors.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder={t.email}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholderTextColor={Colors.medium}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <Briefcase size={20} color={Colors.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder={t.workPlace}
              value={formData.workPlace}
              onChangeText={(text) => setFormData({ ...formData, workPlace: text })}
              placeholderTextColor={Colors.medium}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <User size={20} color={Colors.primary} />
            </View>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder={t.bio}
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              placeholderTextColor={Colors.medium}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Save size={20} color="white" />
            <Text style={styles.saveButtonText}>{t.save}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>{t.cancel}</Text>
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
  form: {
    padding: 16,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.dark,
  },
  bioInput: {
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  actions: {
    padding: 16,
    paddingTop: 0,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cancelButtonText: {
    color: Colors.medium,
    fontSize: 16,
  },
});