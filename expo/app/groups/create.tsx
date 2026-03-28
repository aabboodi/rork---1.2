import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, FlatList, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Users, Camera, Save, X, Plus, Check } from 'lucide-react-native';
import { mockUsers } from '@/mocks/users';
import { User } from '@/types';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';

export default function CreateGroupScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const t = translations[language];
  
  const [groupData, setGroupData] = useState({
    name: '',
    description: '',
    picture: '',
  });
  
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const getFilteredUsers = () => {
    if (!searchQuery) return mockUsers;
    return mockUsers.filter(user => 
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };
  
  const toggleMember = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };
  
  const handleCreate = () => {
    if (!groupData.name.trim()) {
      Alert.alert(t.error, t.groupNameRequired);
      return;
    }
    
    if (selectedMembers.length === 0) {
      Alert.alert(t.error, t.selectMembersRequired);
      return;
    }
    
    // Create group logic here
    console.log('Creating group:', { ...groupData, members: selectedMembers });
    Alert.alert(t.success, t.groupCreated, [
      { text: t.done, onPress: () => router.back() }
    ]);
  };
  
  const handleCancel = () => {
    router.back();
  };
  
  const renderUser = ({ item }: { item: User }) => {
    const isSelected = selectedMembers.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.selectedUserItem]}
        onPress={() => toggleMember(item.id)}
      >
        <Image source={{ uri: item.profilePicture }} style={styles.userAvatar} />
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName}</Text>
          <Text style={styles.userUsername}>@{item.username}</Text>
        </View>
        
        <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
          {isSelected && <Check size={16} color="white" />}
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <>
      <Stack.Screen
        options={{
          title: t.createGroup,
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
        {/* Group Info */}
        <View style={styles.groupInfoSection}>
          <TouchableOpacity style={styles.groupPictureContainer}>
            <Camera size={32} color={Colors.medium} />
            <Text style={styles.addPictureText}>{t.addGroupPicture}</Text>
          </TouchableOpacity>
          
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder={t.groupName}
              value={groupData.name}
              onChangeText={(text) => setGroupData({ ...groupData, name: text })}
              placeholderTextColor={Colors.medium}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder={t.groupDescription}
              value={groupData.description}
              onChangeText={(text) => setGroupData({ ...groupData, description: text })}
              placeholderTextColor={Colors.medium}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
        
        {/* Members Selection */}
        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>
              {t.selectMembers} ({selectedMembers.length})
            </Text>
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={t.searchContacts}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.medium}
            />
          </View>
          
          <FlatList
            data={getFilteredUsers()}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            style={styles.usersList}
            scrollEnabled={false}
          />
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
            <Users size={20} color="white" />
            <Text style={styles.createButtonText}>{t.createGroup}</Text>
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
  groupInfoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  groupPictureContainer: {
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
  membersSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginLeft: 8,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.dark,
  },
  usersList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  selectedUserItem: {
    backgroundColor: Colors.light,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  userUsername: {
    fontSize: 14,
    color: Colors.medium,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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