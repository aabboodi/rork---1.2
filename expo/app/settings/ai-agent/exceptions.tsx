import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Users,
  Plus,
  Trash2,
  Search,
  UserCheck,
  UserX,
  MessageCircle,
} from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';

import { useSafeThemeColors } from '@/store/themeStore';
import { AccessibleText } from '@/components/accessibility/AccessibleText';
import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleCard } from '@/components/accessibility/AccessibleCard';

interface ContactException {
  id: string;
  name: string;
  type: 'allow' | 'block';
  chatType: 'dm' | 'group' | 'channel';
}

export default function ExceptionsScreen() {
  const colors = useSafeThemeColors();
  const [exceptions, setExceptions] = useState<ContactException[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactType, setNewContactType] = useState<'allow' | 'block'>('allow');
  const [newChatType, setNewChatType] = useState<'dm' | 'group' | 'channel'>('dm');

  useEffect(() => {
    loadExceptions();
  }, []);

  const loadExceptions = async () => {
    try {
      setLoading(true);
      const storedExceptions = await SecureStore.getItemAsync('ai_agent_exceptions');
      if (storedExceptions) {
        setExceptions(JSON.parse(storedExceptions));
      }
    } catch (error) {
      console.error('Failed to load exceptions:', error);
      Alert.alert('خطأ', 'فشل في تحميل قائمة الاستثناءات');
    } finally {
      setLoading(false);
    }
  };

  const saveExceptions = async (newExceptions: ContactException[]) => {
    try {
      await SecureStore.setItemAsync('ai_agent_exceptions', JSON.stringify(newExceptions));
      setExceptions(newExceptions);
      
      // Update settings with new counts
      const settingsData = await SecureStore.getItemAsync('ai_agent_settings');
      if (settingsData) {
        const settings = JSON.parse(settingsData);
        settings.allowlist = newExceptions.filter(e => e.type === 'allow').map(e => e.id);
        settings.blocklist = newExceptions.filter(e => e.type === 'block').map(e => e.id);
        await SecureStore.setItemAsync('ai_agent_settings', JSON.stringify(settings));
      }
    } catch (error) {
      console.error('Failed to save exceptions:', error);
      Alert.alert('خطأ', 'فشل في حفظ الاستثناءات');
    }
  };

  const addException = () => {
    if (!newContactName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم جهة الاتصال');
      return;
    }

    const newException: ContactException = {
      id: Date.now().toString(),
      name: newContactName.trim(),
      type: newContactType,
      chatType: newChatType,
    };

    const updatedExceptions = [...exceptions, newException];
    saveExceptions(updatedExceptions);
    
    setNewContactName('');
    setShowAddForm(false);
  };

  const removeException = (id: string) => {
    const updatedExceptions = exceptions.filter(e => e.id !== id);
    saveExceptions(updatedExceptions);
  };

  const filteredExceptions = exceptions.filter(exception =>
    exception.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allowedCount = exceptions.filter(e => e.type === 'allow').length;
  const blockedCount = exceptions.filter(e => e.type === 'block').length;

  const ExceptionItem = ({ exception }: { exception: ContactException }) => (
    <AccessibleCard variant="default" padding="medium" style={styles.exceptionItem}>
      <View style={styles.exceptionLeft}>
        <View style={[
          styles.exceptionIcon,
          { backgroundColor: exception.type === 'allow' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
        ]}>
          {exception.type === 'allow' ? (
            <UserCheck size={20} color={colors.success} />
          ) : (
            <UserX size={20} color={colors.error} />
          )}
        </View>
        <View style={styles.exceptionInfo}>
          <AccessibleText variant="body" weight="medium">
            {exception.name}
          </AccessibleText>
          <View style={styles.exceptionMeta}>
            <AccessibleText variant="caption" color="secondary">
              {exception.chatType === 'dm' ? 'محادثة خاصة' : 
               exception.chatType === 'group' ? 'مجموعة' : 'قناة'}
            </AccessibleText>
            <Text style={[styles.dot, { color: colors.textSecondary }]}>•</Text>
            <AccessibleText variant="caption" color={exception.type === 'allow' ? 'success' : 'error'}>
              {exception.type === 'allow' ? 'مسموح' : 'محظور'}
            </AccessibleText>
          </View>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => removeException(exception.id)}
        style={styles.removeButton}
        accessibilityLabel="حذف الاستثناء"
        accessibilityRole="button"
      >
        <Trash2 size={18} color={colors.error} />
      </TouchableOpacity>
    </AccessibleCard>
  );

  const TypeSelector = ({ 
    value, 
    onSelect, 
    options 
  }: { 
    value: string; 
    onSelect: (value: any) => void; 
    options: { key: string; label: string; icon: any }[] 
  }) => (
    <View style={styles.typeSelector}>
      {options.map(({ key, label, icon: Icon }) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.typeOption,
            value === key && styles.typeOptionSelected,
            { borderColor: value === key ? colors.primary : colors.border }
          ]}
          onPress={() => onSelect(key)}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === key }}
        >
          <Icon size={16} color={value === key ? colors.primary : colors.textSecondary} />
          <Text style={[
            styles.typeOptionText,
            { color: value === key ? colors.primary : colors.text }
          ]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Users size={48} color={colors.primary} />
          <AccessibleText variant="body" color="secondary" style={styles.loadingText}>
            جاري تحميل الاستثناءات...
          </AccessibleText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.text === '#FFFFFF' ? 'light' : 'dark'} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <AccessibleCard variant="filled" padding="large" style={styles.headerCard}>
          <View style={styles.headerContent}>
            <Users size={32} color={colors.primary} />
            <View style={styles.headerText}>
              <AccessibleText variant="heading3" weight="bold">
                الاستثناءات
              </AccessibleText>
              <AccessibleText variant="caption" color="secondary">
                إدارة قوائم السماح والحظر
              </AccessibleText>
            </View>
          </View>
        </AccessibleCard>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <AccessibleCard variant="outlined" padding="medium" style={styles.statCard}>
            <UserCheck size={24} color={colors.success} />
            <AccessibleText variant="heading3" weight="bold" color="success">
              {allowedCount}
            </AccessibleText>
            <AccessibleText variant="caption" color="secondary">
              مسموح
            </AccessibleText>
          </AccessibleCard>
          
          <AccessibleCard variant="outlined" padding="medium" style={styles.statCard}>
            <UserX size={24} color={colors.error} />
            <AccessibleText variant="heading3" weight="bold" color="error">
              {blockedCount}
            </AccessibleText>
            <AccessibleText variant="caption" color="secondary">
              محظور
            </AccessibleText>
          </AccessibleCard>
        </View>

        {/* Search */}
        <AccessibleCard variant="default" padding="none" style={styles.searchCard}>
          <View style={styles.searchContainer}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="البحث في الاستثناءات..."
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="البحث في الاستثناءات"
            />
          </View>
        </AccessibleCard>

        {/* Add Button */}
        <AccessibleButton
          title="إضافة استثناء جديد"
          onPress={() => setShowAddForm(!showAddForm)}
          variant="primary"
          size="large"
          style={styles.addButton}
          icon={<Plus size={20} color={colors.textInverse} />}
        />

        {/* Add Form */}
        {showAddForm && (
          <AccessibleCard variant="outlined" padding="large" style={styles.addForm}>
            <AccessibleText variant="body" weight="medium" style={styles.formTitle}>
              إضافة استثناء جديد
            </AccessibleText>
            
            <View style={styles.formField}>
              <AccessibleText variant="caption" color="secondary" style={styles.fieldLabel}>
                اسم جهة الاتصال
              </AccessibleText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
                value={newContactName}
                onChangeText={setNewContactName}
                placeholder="أدخل اسم جهة الاتصال..."
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="اسم جهة الاتصال"
              />
            </View>

            <View style={styles.formField}>
              <AccessibleText variant="caption" color="secondary" style={styles.fieldLabel}>
                نوع الاستثناء
              </AccessibleText>
              <TypeSelector
                value={newContactType}
                onSelect={setNewContactType}
                options={[
                  { key: 'allow', label: 'السماح', icon: UserCheck },
                  { key: 'block', label: 'الحظر', icon: UserX },
                ]}
              />
            </View>

            <View style={styles.formField}>
              <AccessibleText variant="caption" color="secondary" style={styles.fieldLabel}>
                نوع المحادثة
              </AccessibleText>
              <TypeSelector
                value={newChatType}
                onSelect={setNewChatType}
                options={[
                  { key: 'dm', label: 'خاصة', icon: MessageCircle },
                  { key: 'group', label: 'مجموعة', icon: Users },
                  { key: 'channel', label: 'قناة', icon: Users },
                ]}
              />
            </View>

            <View style={styles.formActions}>
              <AccessibleButton
                title="إضافة"
                onPress={addException}
                variant="primary"
                size="medium"
                style={styles.formButton}
              />
              <AccessibleButton
                title="إلغاء"
                onPress={() => {
                  setShowAddForm(false);
                  setNewContactName('');
                }}
                variant="ghost"
                size="medium"
                style={styles.formButton}
              />
            </View>
          </AccessibleCard>
        )}

        {/* Exceptions List */}
        {filteredExceptions.length > 0 ? (
          <View style={styles.exceptionsList}>
            <AccessibleText variant="body" weight="medium" style={styles.listTitle}>
              قائمة الاستثناءات ({filteredExceptions.length})
            </AccessibleText>
            {filteredExceptions.map((exception) => (
              <ExceptionItem key={exception.id} exception={exception} />
            ))}
          </View>
        ) : (
          <AccessibleCard variant="default" padding="large" style={styles.emptyState}>
            <Users size={48} color={colors.textSecondary} />
            <AccessibleText variant="body" color="secondary" style={styles.emptyText}>
              {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد استثناءات'}
            </AccessibleText>
            <AccessibleText variant="caption" color="secondary" style={styles.emptyHint}>
              {searchQuery ? 'جرب كلمات بحث أخرى' : 'أضف جهات اتصال لقوائم السماح أو الحظر'}
            </AccessibleText>
          </AccessibleCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  headerCard: {
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  searchCard: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    textAlign: 'right',
  },
  addButton: {
    marginBottom: 20,
  },
  addForm: {
    marginBottom: 20,
    gap: 16,
  },
  formTitle: {
    marginBottom: 8,
  },
  formField: {
    gap: 8,
  },
  fieldLabel: {
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'right',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 6,
  },
  typeOptionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  formButton: {
    flex: 1,
  },
  exceptionsList: {
    gap: 12,
  },
  listTitle: {
    marginBottom: 8,
  },
  exceptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exceptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exceptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exceptionInfo: {
    flex: 1,
  },
  exceptionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  dot: {
    fontSize: 12,
  },
  removeButton: {
    padding: 8,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
  },
  emptyHint: {
    textAlign: 'center',
  },
});