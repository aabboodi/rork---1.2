import React, { useState } from 'react';
import { View, StyleSheet, Image, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { 
  Edit, 
  Settings, 
  Globe, 
  Bell, 
  Shield, 
  LogOut, 
  ChevronRight,
  Crown,
  Accessibility,
  FileText,
  Bot
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { translations } from '@/constants/i18n';
import { mockUsers } from '@/mocks/users';

import AdminPanel from '@/components/AdminPanel';
import { AccessibleText } from '@/components/accessibility/AccessibleText';
import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleCard } from '@/components/accessibility/AccessibleCard';

export default function ProfileScreen() {
  const router = useRouter();
  const { language, logout, userRole, hasPermission } = useAuthStore();
  const { colors } = useThemeStore();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const t = translations[language];
  
  // Mock current user data
  const currentUser = mockUsers[0];

  const handleLogout = async () => {
    try {
      await logout();
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const ProfileOption = ({ 
    icon: Icon, 
    title, 
    onPress, 
    showChevron = true,
    iconColor = colors.textSecondary,
    special = false
  }: {
    icon: any;
    title: string;
    onPress: () => void;
    showChevron?: boolean;
    iconColor?: string;
    special?: boolean;
  }) => (
    <AccessibleCard
      onPress={onPress}
      variant="default"
      padding="medium"
      margin="none"
      style={[styles.profileOption, special && styles.specialOption]}
      accessibilityLabel={title}
      accessibilityHint="Tap to open"
      accessibilityRole="button"
    >
      <View style={styles.optionLeft}>
        <Icon size={20} color={iconColor} />
        <AccessibleText variant="body" weight="medium" style={[styles.optionText, special && styles.specialText]}>
          {title}
        </AccessibleText>
      </View>
      {showChevron && <ChevronRight size={20} color={colors.textSecondary} />}
    </AccessibleCard>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.text === '#FFFFFF' ? 'light' : 'dark'} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} accessibilityLabel="Profile screen">
        {/* Profile Header */}
        <AccessibleCard variant="elevated" padding="large" style={styles.profileHeader}>
          <Image
            source={{ uri: currentUser.profilePicture }}
            style={styles.profileImage}
            accessibilityLabel={`Profile picture of ${currentUser.displayName}`}
          />
          <View style={styles.profileInfo}>
            <View style={styles.nameContainer}>
              <AccessibleText variant="heading2" weight="bold">
                {currentUser.displayName}
              </AccessibleText>
              {(userRole === 'admin' || userRole === 'main_admin') && (
                <Crown size={20} color={colors.primary} />
              )}
            </View>
            <AccessibleText variant="body" color="secondary">
              @{currentUser.username}
            </AccessibleText>
            <AccessibleText variant="body" color="secondary">
              {currentUser.phoneNumber}
            </AccessibleText>
            {currentUser.placeOfWork && (
              <AccessibleText variant="caption" color="secondary">
                {currentUser.placeOfWork}
              </AccessibleText>
            )}
            
            {/* Role Badge */}
            {userRole !== 'regular' && (
              <View style={styles.roleBadge}>
                <Crown size={16} color={colors.primary} />
                <AccessibleText variant="caption" color="primary" style={styles.roleText}>
                  {userRole === 'main_admin' ? t.mainAdmin : 
                   userRole === 'admin' ? t.adminUser : t.privilegedUser}
                </AccessibleText>
              </View>
            )}
          </View>
          
          <AccessibleButton
            title=""
            onPress={() => router.push('/profile/edit')}
            variant="ghost"
            size="small"
            style={styles.editButton}
            icon={<Edit size={20} color={colors.primary} />}
            accessibilityLabel="Edit profile"
            accessibilityHint="Opens profile editing screen"
          />
        </AccessibleCard>

        {/* Profile Options */}
        <AccessibleCard variant="default" padding="none" style={styles.optionsContainer}>
          {/* Admin Panel Access */}
          {hasPermission('canAccessAdminPanel') && (
            <ProfileOption
              icon={Crown}
              title={t.adminPanel}
              onPress={() => setShowAdminPanel(true)}
              iconColor={colors.primary}
              special={true}
            />
          )}

          <ProfileOption
            icon={Bot}
            title="AI Personalization"
            onPress={() => router.push('/settings/personalization')}
            iconColor={colors.primary}
          />
          
          <ProfileOption
            icon={Accessibility}
            title="إمكانية الوصول"
            onPress={() => router.push('/accessibility')}
            iconColor={colors.primary}
          />
          
          <ProfileOption
            icon={Settings}
            title={t.settings}
            onPress={() => router.push('/profile/settings')}
          />
          
          <ProfileOption
            icon={Globe}
            title={t.language}
            onPress={() => {}}
          />
          
          <ProfileOption
            icon={Bell}
            title={t.notifications}
            onPress={() => {}}
          />
          
          <ProfileOption
            icon={Shield}
            title={t.privacy}
            onPress={() => {}}
          />
          
          <ProfileOption
            icon={FileText}
            title="Audit Logs"
            onPress={() => router.push('/security/audit-logs')}
          />
          
          <ProfileOption
            icon={Shield}
            title="Security Tests"
            onPress={() => router.push('/security/acceptance-tests')}
            iconColor={colors.warning}
          />
        </AccessibleCard>

        {/* Security Status */}
        <AccessibleCard variant="filled" padding="large" style={styles.securitySection}>
          <View style={styles.securityHeader}>
            <Shield size={20} color={colors.success} />
            <AccessibleText variant="heading3" weight="semibold" style={styles.securityTitle}>
              Security Status
            </AccessibleText>
          </View>
          <AccessibleText variant="body" color="secondary" style={styles.securityDescription}>
            Your account is protected with end-to-end encryption and advanced security features.
          </AccessibleText>
          {userRole !== 'regular' && (
            <AccessibleText variant="caption" color="success" style={styles.specialSecurityNote}>
              🔒 Enhanced security privileges active for {userRole} account
            </AccessibleText>
          )}
        </AccessibleCard>

        {/* Logout */}
        <AccessibleButton
          title={t.logout}
          onPress={handleLogout}
          variant="danger"
          size="large"
          fullWidth
          style={styles.logoutButton}
          icon={<LogOut size={20} color={colors.textInverse} />}
          accessibilityLabel="Sign out"
          accessibilityHint="Signs out of your account and returns to login screen"
        />
      </ScrollView>

      {/* Admin Panel Modal */}
      <Modal
        visible={showAdminPanel}
        animationType="slide"
        presentationStyle="fullScreen"
        accessibilityViewIsModal={true}
      >
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    marginRight: 8,
  },
  username: {
    fontSize: 16,
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 14,
    marginBottom: 4,
  },
  workplace: {
    fontSize: 14,
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  profileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  specialOption: {
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  specialText: {
    fontWeight: '600',
  },
  securitySection: {
    padding: 20,
    marginBottom: 20,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  securityDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  specialSecurityNote: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    fontStyle: 'italic',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});