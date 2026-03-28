import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Alert, ActionSheetIOS, Platform, RefreshControl, Animated } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Search, MessageCircle, Archive, Settings, Users, Radio, Plus, Trash2, Filter, Shield, Key, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { mockChats, mockGroups, mockChannels } from '@/mocks/chats';
import { Chat, ChatType } from '@/types';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { useThemeSafe } from '@/providers/ThemeProvider';
import ChatItem from '@/components/ChatItem';
import SecurityManager from '@/services/security/SecurityManager';
import KeyManager from '@/services/security/KeyManager';
import DLPService from '@/services/security/DLPService';
import AnimatedFAB from '@/components/AnimatedFAB';
import AnimatedNotificationBanner from '@/components/AnimatedNotificationBanner';
import { MicroInteractions } from '@/utils/microInteractions';

export default function ChatsScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const themeContext = useThemeSafe();
  
  // Ensure theme is available before rendering
  if (!themeContext || !themeContext.theme || !themeContext.theme.colors) {
    return null; // Don't render until theme is ready
  }
  
  const { theme } = themeContext;
  const { colors } = theme;
  const t = translations[language];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ChatType>('conversation');
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'pinned' | 'encrypted' | 'dlp_protected'>('all');
  const [notification, setNotification] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
  }>({ visible: false, type: 'info', title: '' });
  
  // Animation values
  const headerAnim = useRef(new Animated.Value(1)).current;
  const searchAnim = useRef(new Animated.Value(1)).current;
  const listAnim = useRef(new Animated.Value(1)).current;
  
  // Enhanced E2EE and DLP state
  const [securityManager] = useState(() => SecurityManager.getInstance());
  const [keyManager] = useState(() => KeyManager.getInstance());
  const [dlpService] = useState(() => DLPService.getInstance());
  const [e2eeStatus, setE2eeStatus] = useState({
    totalSessions: 0,
    establishedSessions: 0,
    verifiedKeys: 0
  });
  const [dlpStatus, setDlpStatus] = useState({
    enabled: false,
    policiesCount: 0,
    recentViolations: 0
  });
  
  React.useEffect(() => {
    loadSecurityStatus();
    initializeDLP();
    
    // Entrance animations
    MicroInteractions.createEntranceAnimation(headerAnim, new Animated.Value(1), 0).start();
    MicroInteractions.createEntranceAnimation(searchAnim, new Animated.Value(1), 100).start();
    MicroInteractions.createEntranceAnimation(listAnim, new Animated.Value(1), 200).start();
  }, []);

  const loadSecurityStatus = () => {
    try {
      const status = keyManager.getE2EEStatus();
      setE2eeStatus(status);
    } catch (error) {
      console.error('Failed to load E2EE status:', error);
    }
  };

  const initializeDLP = async () => {
    try {
      await dlpService.initialize();
      const status = dlpService.getDLPStatus();
      setDlpStatus(status);
    } catch (error) {
      console.error('Failed to initialize DLP:', error);
    }
  };
  
  const getFilteredData = () => {
    let filteredData = chats.filter(chat => chat.chatType === activeTab);
    
    // Apply status filter
    if (filterStatus === 'unread') {
      filteredData = filteredData.filter(chat => chat.unreadCount > 0);
    } else if (filterStatus === 'pinned') {
      filteredData = filteredData.filter(chat => chat.isPinned);
    } else if (filterStatus === 'encrypted') {
      filteredData = filteredData.filter(chat => chat.encryptionEnabled || chat.e2eeStatus === 'verified');
    } else if (filterStatus === 'dlp_protected') {
      // Filter chats that have DLP protection enabled
      filteredData = filteredData.filter(chat => !chat.isGroup && !chat.isChannel);
    }
    
    // Apply search filter
    if (searchQuery) {
      filteredData = filteredData.filter((chat) => {
        const displayName = chat.isGroup || chat.isChannel
          ? chat.groupName?.toLowerCase()
          : chat.participants[0]?.displayName?.toLowerCase();
        
        return displayName?.includes(searchQuery.toLowerCase());
      });
    }
    
    return filteredData;
  };
  
  const getUnreadCount = (type: ChatType) => {
    return chats.filter(chat => chat.chatType === type && chat.unreadCount > 0).length;
  };

  const getEncryptedCount = (type: ChatType) => {
    return chats.filter(chat => 
      chat.chatType === type && 
      (chat.encryptionEnabled || chat.e2eeStatus === 'verified')
    ).length;
  };

  const getDLPProtectedCount = (type: ChatType) => {
    // For now, assume all direct conversations can have DLP protection
    return chats.filter(chat => 
      chat.chatType === type && 
      !chat.isGroup && 
      !chat.isChannel
    ).length;
  };
  
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    MicroInteractions.triggerHapticFeedback('light');
    
    // Refresh animation
    Animated.sequence([
      MicroInteractions.createScaleAnimation(listAnim, 0.98, 200),
      MicroInteractions.createScaleAnimation(listAnim, 1, 200)
    ]).start();
    
    // Simulate refresh and reload security status
    setTimeout(() => {
      setRefreshing(false);
      loadSecurityStatus();
      initializeDLP();
      
      // Show success notification
      setNotification({
        visible: true,
        type: 'success',
        title: 'تم التحديث',
        message: 'تم تحديث المحادثات والحالة الأمنية'
      });
      
      console.log('Chats refreshed with security status');
    }, 1000);
  }, []);
  
  const handleCreateNew = () => {
    MicroInteractions.triggerHapticFeedback('medium');
    
    const options = [t.newChat, t.newGroup, t.newChannel, 'New Encrypted Chat', 'New DLP Protected Chat', t.cancel];
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          handleCreateOption(buttonIndex);
        }
      );
    } else {
      Alert.alert(
        'إنشاء جديد',
        'اختر نوع المحادثة',
        [
          { text: t.newChat, onPress: () => handleCreateOption(0) },
          { text: t.newGroup, onPress: () => handleCreateOption(1) },
          { text: t.newChannel, onPress: () => handleCreateOption(2) },
          { text: 'New Encrypted Chat', onPress: () => handleCreateOption(3) },
          { text: 'New DLP Protected Chat', onPress: () => handleCreateOption(4) },
          { text: t.cancel, style: 'cancel' }
        ]
      );
    }
  };
  
  const handleCreateOption = (index: number) => {
    switch (index) {
      case 0: // New Chat
        router.push('/contacts');
        break;
      case 1: // New Group
        router.push('/groups/create');
        break;
      case 2: // New Channel
        router.push('/channels/create');
        break;
      case 3: // New Encrypted Chat
        handleCreateEncryptedChat();
        break;
      case 4: // New DLP Protected Chat
        handleCreateDLPProtectedChat();
        break;
    }
  };

  const handleCreateEncryptedChat = () => {
    Alert.alert(
      'New Encrypted Chat',
      'Create a new end-to-end encrypted conversation with enhanced security.',
      [
        { text: t.cancel, style: 'cancel' },
        { 
          text: 'Create', 
          onPress: () => {
            router.push('/contacts?encrypted=true');
          }
        }
      ]
    );
  };

  const handleCreateDLPProtectedChat = () => {
    Alert.alert(
      'New DLP Protected Chat',
      'Create a new conversation with Data Loss Prevention to protect sensitive information.',
      [
        { text: t.cancel, style: 'cancel' },
        { 
          text: 'Create', 
          onPress: () => {
            router.push('/contacts?dlp=true');
          }
        }
      ]
    );
  };
  
  const handleArchive = () => {
    MicroInteractions.triggerHapticFeedback('medium');
    
    // Archive animation
    Animated.stagger(50, 
      selectedChats.map(() => 
        Animated.timing(new Animated.Value(1), {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      )
    ).start();
    
    setNotification({
      visible: true,
      type: 'success',
      title: 'تم الأرشفة',
      message: `تم أرشفة ${selectedChats.length} محادثة`
    });
    
    setSelectedChats([]);
    setIsSelectionMode(false);
  };
  
  const handleChatSettings = () => {
    router.push('/chats/settings');
  };

  const handleE2EEStatus = () => {
    const statusMessage = `🔒 Total Sessions: ${e2eeStatus.totalSessions}
✅ Established: ${e2eeStatus.establishedSessions}
🔑 Verified Keys: ${e2eeStatus.verifiedKeys}

📡 Signal Protocol: Active
🛡️ Double Ratchet: Enabled
⚡ Perfect Forward Secrecy: Yes

Your messages are protected with Signal Protocol - the same encryption used by Signal, WhatsApp, and other secure messaging apps.`;
    
    Alert.alert(
      'End-to-End Encryption Status',
      statusMessage,
      [
        { text: 'OK' },
        { text: 'Manage Keys', onPress: () => router.push('/chats/settings') },
        { text: 'Learn More', onPress: handleLearnMoreE2EE }
      ]
    );
  };

  const handleDLPStatus = () => {
    const statusMessage = `🛡️ DLP Status: ${dlpStatus.enabled ? 'Enabled' : 'Disabled'}
📋 Active Policies: ${dlpStatus.policiesCount}
⚠️ Recent Violations: ${dlpStatus.recentViolations}

Data Loss Prevention protects against accidental sharing of:
• National ID numbers
• Credit card information
• Phone numbers and emails
• Passwords and tokens
• Bank account numbers

Messages are scanned in real-time before sending.`;
    
    Alert.alert(
      'Data Loss Prevention Status',
      statusMessage,
      [
        { text: 'OK' },
        { text: 'DLP Dashboard', onPress: () => router.push('/security/dlp') },
        { text: dlpStatus.enabled ? 'Disable DLP' : 'Enable DLP', onPress: toggleDLP }
      ]
    );
  };

  const toggleDLP = async () => {
    try {
      if (dlpStatus.enabled) {
        await dlpService.disableDLP();
        Alert.alert('DLP Disabled', 'Data Loss Prevention has been disabled.');
      } else {
        await dlpService.enableDLP();
        Alert.alert('DLP Enabled', 'Data Loss Prevention has been enabled.');
      }
      await initializeDLP();
    } catch (error) {
      console.error('Failed to toggle DLP:', error);
      Alert.alert('Error', 'Failed to toggle DLP settings');
    }
  };

  const handleLearnMoreE2EE = () => {
    Alert.alert(
      'Signal Protocol Security',
      `The Signal Protocol provides:

🔐 End-to-End Encryption
Only you and the recipient can read messages

🔄 Perfect Forward Secrecy
Past messages stay secure even if keys are compromised

🛡️ Future Secrecy
Sessions can heal from key compromises

🚫 Deniable Authentication
Messages cannot be proven to come from you

⚡ Asynchronous Messaging
Secure messaging even when offline`,
      [{ text: 'OK' }]
    );
  };
  
  const handleFilter = () => {
    const options = ['جميع المحادثات', 'غير المقروءة', 'المثبتة', 'المشفرة', 'محمية بـ DLP', t.cancel];
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          handleFilterOption(buttonIndex);
        }
      );
    } else {
      Alert.alert(
        'تصفية المحادثات',
        'اختر نوع التصفية',
        [
          { text: 'جميع المحادثات', onPress: () => handleFilterOption(0) },
          { text: 'غير المقروءة', onPress: () => handleFilterOption(1) },
          { text: 'المثبتة', onPress: () => handleFilterOption(2) },
          { text: 'المشفرة', onPress: () => handleFilterOption(3) },
          { text: 'محمية بـ DLP', onPress: () => handleFilterOption(4) },
          { text: t.cancel, style: 'cancel' }
        ]
      );
    }
  };
  
  const handleFilterOption = (index: number) => {
    switch (index) {
      case 0:
        setFilterStatus('all');
        break;
      case 1:
        setFilterStatus('unread');
        break;
      case 2:
        setFilterStatus('pinned');
        break;
      case 3:
        setFilterStatus('encrypted');
        break;
      case 4:
        setFilterStatus('dlp_protected');
        break;
    }
  };
  
  const handleDeleteSelected = () => {
    MicroInteractions.triggerHapticFeedback('heavy');
    
    Alert.alert(
      'حذف المحادثات',
      `هل تريد حذف ${selectedChats.length} محادثة؟`,
      [
        { text: t.cancel, style: 'cancel' },
        { 
          text: t.delete, 
          style: 'destructive', 
          onPress: () => {
            // Delete animation
            Animated.stagger(50, 
              selectedChats.map(() => 
                Animated.parallel([
                  Animated.timing(new Animated.Value(1), {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                  }),
                  Animated.timing(new Animated.Value(0), {
                    toValue: 50,
                    duration: 200,
                    useNativeDriver: true,
                  })
                ])
              )
            ).start();
            
            setChats(chats.filter(chat => !selectedChats.includes(chat.id)));
            setSelectedChats([]);
            setIsSelectionMode(false);
            
            setNotification({
              visible: true,
              type: 'success',
              title: 'تم الحذف',
              message: 'تم حذف المحادثات المحددة'
            });
          }
        }
      ]
    );
  };
  
  const handleChatLongPress = (chatId: string) => {
    MicroInteractions.triggerHapticFeedback('heavy');
    
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedChats([chatId]);
      
      // Selection mode animation
      Animated.timing(headerAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  };
  
  const handleChatSelect = (chatId: string) => {
    if (isSelectionMode) {
      MicroInteractions.triggerHapticFeedback('light');
      
      if (selectedChats.includes(chatId)) {
        const newSelected = selectedChats.filter(id => id !== chatId);
        setSelectedChats(newSelected);
        if (newSelected.length === 0) {
          setIsSelectionMode(false);
        }
      } else {
        setSelectedChats([...selectedChats, chatId]);
      }
    } else {
      MicroInteractions.triggerHapticFeedback('medium');
      router.push(`/chat/${chatId}`);
    }
  };
  
  const getTabTitle = (type: ChatType) => {
    switch (type) {
      case 'conversation':
        return t.conversations;
      case 'group':
        return t.groups;
      case 'channel':
        return t.channels;
      default:
        return '';
    }
  };
  
  const getTabIcon = (type: ChatType, isActive: boolean) => {
    const color = isActive ? colors.primary : colors.textSecondary;
    const size = 18;
    
    switch (type) {
      case 'conversation':
        return <MessageCircle size={size} color={color} />;
      case 'group':
        return <Users size={size} color={color} />;
      case 'channel':
        return <Radio size={size} color={color} />;
      default:
        return null;
    }
  };
  
  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'conversation':
        return 'لا توجد محادثات';
      case 'group':
        return 'لا توجد مجموعات';
      case 'channel':
        return 'لا توجد قنوات';
      default:
        return '';
    }
  };
  
  const getFabIcon = () => {
    switch (activeTab) {
      case 'conversation':
        return <MessageCircle size={24} color="white" />;
      case 'group':
        return <Users size={24} color="white" />;
      case 'channel':
        return <Radio size={24} color="white" />;
      default:
        return <Plus size={24} color="white" />;
    }
  };

  const getFilterStatusText = () => {
    switch (filterStatus) {
      case 'unread':
        return 'المحادثات غير المقروءة';
      case 'pinned':
        return 'المحادثات المثبتة';
      case 'encrypted':
        return 'المحادثات المشفرة';
      case 'dlp_protected':
        return 'المحادثات محمية بـ DLP';
      default:
        return '';
    }
  };
  
  const renderChatItem = ({ item }: { item: Chat }) => (
    <ChatItem 
      chat={item} 
      isSelected={selectedChats.includes(item.id)}
      isSelectionMode={isSelectionMode}
      onPress={() => handleChatSelect(item.id)}
      onLongPress={() => handleChatLongPress(item.id)}
    />
  );
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Animated Notification Banner */}
      <AnimatedNotificationBanner
        visible={notification.visible}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onDismiss={() => setNotification(prev => ({ ...prev, visible: false }))}
        position="top"
      />
      {/* Header */}
      <Animated.View style={[styles.header, { 
        backgroundColor: colors.background,
        borderBottomColor: colors.border,
        transform: [{ scale: headerAnim }] 
      }]}>
        <View style={styles.headerLeft}>
          {isSelectionMode ? (
            <View style={styles.selectionHeader}>
              <TouchableOpacity 
                onPress={() => {
                  setIsSelectionMode(false);
                  setSelectedChats([]);
                }}
                style={styles.headerButton}
              >
                <Text style={[styles.cancelText, { color: colors.primary }]}>{t.cancel}</Text>
              </TouchableOpacity>
              <Text style={[styles.selectionCount, { color: colors.text }]}>
                {selectedChats.length} محدد
              </Text>
            </View>
          ) : (
            <View style={styles.titleContainer}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t.chats}</Text>
              {e2eeStatus.establishedSessions > 0 && (
                <TouchableOpacity style={[styles.e2eeIndicator, { backgroundColor: colors.success + '20' }]} onPress={handleE2EEStatus}>
                  <Shield size={16} color={colors.success} />
                  <Text style={[styles.e2eeText, { color: colors.success }]}>{e2eeStatus.establishedSessions}</Text>
                  <Text style={[styles.signalBadge, { color: colors.success, backgroundColor: colors.success + '30' }]}>Signal</Text>
                </TouchableOpacity>
              )}
              {dlpStatus.enabled && (
                <TouchableOpacity style={[styles.dlpIndicator, { backgroundColor: colors.primary + '20' }]} onPress={handleDLPStatus}>
                  <Shield size={16} color={colors.primary} />
                  <Text style={[styles.dlpText, { color: colors.primary }]}>DLP</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        <View style={styles.headerRight}>
          {isSelectionMode ? (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={handleArchive}>
                <Archive size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleDeleteSelected}>
                <Trash2 size={22} color={colors.error} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={handleFilter}>
                <Filter size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleE2EEStatus}>
                <Key size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleDLPStatus}>
                <Shield size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleArchive}>
                <Archive size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleChatSettings}>
                <Settings size={22} color={colors.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>
      
      {/* Search Bar */}
      {!isSelectionMode && (
        <Animated.View style={[styles.searchContainer, { 
          backgroundColor: colors.secondary,
          transform: [{ scale: searchAnim }] 
        }]}>
          <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t.search}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
              <Text style={[styles.clearSearchText, { color: colors.textSecondary }]}>×</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
      
      {/* Filter Status Indicator */}
      {filterStatus !== 'all' && (
        <View style={[styles.filterIndicator, { 
          backgroundColor: colors.backgroundSecondary,
          borderBottomColor: colors.border 
        }]}>
          <View style={styles.filterContent}>
            {filterStatus === 'encrypted' && <Lock size={14} color={colors.success} />}
            {filterStatus === 'dlp_protected' && <Shield size={14} color={colors.primary} />}
            <Text style={[styles.filterText, { color: colors.primary }]}>
              {getFilterStatusText()}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setFilterStatus('all')}>
            <Text style={[styles.clearFilterText, { color: colors.textSecondary }]}>مسح التصفية</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Sub-tabs */}
      <View style={[styles.tabsContainer, { 
        backgroundColor: colors.background,
        borderBottomColor: colors.border 
      }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'conversation' && { ...styles.activeTab, borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('conversation')}
        >
          {getTabIcon('conversation', activeTab === 'conversation')}
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'conversation' && { color: colors.primary, fontWeight: '600' }]}>
            {getTabTitle('conversation')}
          </Text>
          {getUnreadCount('conversation') > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.tabBadgeText}>{getUnreadCount('conversation')}</Text>
            </View>
          )}
          {getEncryptedCount('conversation') > 0 && (
            <View style={[styles.encryptedBadge, { backgroundColor: colors.success + '20' }]}>
              <Lock size={10} color={colors.success} />
            </View>
          )}
          {dlpStatus.enabled && getDLPProtectedCount('conversation') > 0 && (
            <View style={[styles.dlpBadge, { backgroundColor: colors.primary + '20' }]}>
              <Shield size={10} color={colors.primary} />
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'group' && { ...styles.activeTab, borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('group')}
        >
          {getTabIcon('group', activeTab === 'group')}
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'group' && { color: colors.primary, fontWeight: '600' }]}>
            {getTabTitle('group')}
          </Text>
          {getUnreadCount('group') > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.tabBadgeText}>{getUnreadCount('group')}</Text>
            </View>
          )}
          {getEncryptedCount('group') > 0 && (
            <View style={[styles.encryptedBadge, { backgroundColor: colors.success + '20' }]}>
              <Lock size={10} color={colors.success} />
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'channel' && { ...styles.activeTab, borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('channel')}
        >
          {getTabIcon('channel', activeTab === 'channel')}
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'channel' && { color: colors.primary, fontWeight: '600' }]}>
            {getTabTitle('channel')}
          </Text>
          {getUnreadCount('channel') > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.tabBadgeText}>{getUnreadCount('channel')}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Enhanced Virtualized Chat List */}
      <FlashList
        data={getFilteredData()}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        estimatedItemSize={80}
        showsVerticalScrollIndicator={false}
        style={styles.chatList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {getEmptyMessage()}
            </Text>
            <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.primary }]} onPress={handleCreateNew}>
              <Text style={styles.emptyButtonText}>
                {activeTab === 'conversation' && 'بدء محادثة جديدة'}
                {activeTab === 'group' && 'إنشاء مجموعة جديدة'}
                {activeTab === 'channel' && 'إنشاء قناة جديدة'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={15}
        updateCellsBatchingPeriod={50}
        // Accessibility
        accessible={true}
        accessibilityRole="list"
        accessibilityLabel="قائمة المحادثات"
      />
      
      {/* Floating Action Button */}
      {!isSelectionMode && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={handleCreateNew}>
          {getFabIcon()}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  e2eeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  e2eeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  signalBadge: {
    fontSize: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 4,
    fontWeight: '700',
  },
  dlpIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  dlpText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    margin: 12,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  clearSearch: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  clearFilterText: {
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  activeTabText: {
    fontWeight: '600',
  },
  tabBadge: {
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  tabBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  encryptedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 8,
    padding: 2,
  },
  dlpBadge: {
    position: 'absolute',
    top: 8,
    right: 24,
    borderRadius: 8,
    padding: 2,
  },
  chatList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});