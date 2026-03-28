import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { currentUser } from '@/mocks/users';
import Button from '@/components/Button';

export default function EditProfileScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const t = translations[language];
  
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [placeOfWork, setPlaceOfWork] = useState(currentUser.placeOfWork || '');
  const [profilePicture, setProfilePicture] = useState(currentUser.profilePicture);
  
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };
  
  const handleSave = () => {
    if (!displayName.trim() || !username.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال الاسم واسم المستخدم');
      return;
    }
    
    // In a real app, we would update the user profile on the server
    // For now, we'll just show a success message and go back
    Alert.alert('نجاح', 'تم تحديث الملف الشخصي بنجاح', [
      { text: 'حسنًا', onPress: () => router.back() }
    ]);
  };
  
  return (
    <>
      <Stack.Screen
        options={{
          title: t.editProfile,
          headerTitleStyle: {
            color: Colors.dark,
            fontWeight: '600',
          },
        }}
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.profilePictureContainer}>
          <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
          <TouchableOpacity style={styles.changePhotoButton} onPress={pickImage}>
            <Camera size={20} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>الاسم</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="أدخل اسمك"
              placeholderTextColor={Colors.medium}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم المستخدم</Text>
            <View style={styles.usernameContainer}>
              <Text style={styles.usernamePrefix}>@</Text>
              <TextInput
                style={styles.usernameInput}
                value={username}
                onChangeText={setUsername}
                placeholder="اسم_المستخدم"
                placeholderTextColor={Colors.medium}
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>نبذة عني</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="أضف نبذة عنك..."
              placeholderTextColor={Colors.medium}
              multiline
              maxLength={150}
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>مكان العمل</Text>
            <TextInput
              style={styles.input}
              value={placeOfWork}
              onChangeText={setPlaceOfWork}
              placeholder="أدخل مكان عملك"
              placeholderTextColor={Colors.medium}
            />
          </View>
          
          <Button
            title="حفظ التغييرات"
            onPress={handleSave}
            style={styles.saveButton}
          />
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
  profilePictureContainer: {
    alignItems: 'center',
    marginVertical: 24,
    position: 'relative',
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.dark,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  usernamePrefix: {
    fontSize: 16,
    color: Colors.medium,
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.dark,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: Colors.medium,
    textAlign: 'right',
    marginTop: 4,
  },
  saveButton: {
    marginTop: 16,
  },
});