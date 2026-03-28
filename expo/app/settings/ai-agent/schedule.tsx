import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Clock,
  Calendar,
  Sun,
  Moon,
  Settings,
  Save,
} from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';

import { useSafeThemeColors } from '@/store/themeStore';
import { AccessibleText } from '@/components/accessibility/AccessibleText';
import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleCard } from '@/components/accessibility/AccessibleCard';

interface ScheduleSettings {
  enabled: boolean;
  fromTime: string;
  toTime: string;
  days: string[];
  timezone: string;
}

const DEFAULT_SCHEDULE: ScheduleSettings = {
  enabled: false,
  fromTime: '09:00',
  toTime: '17:00',
  days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  timezone: 'Asia/Riyadh',
};

const DAYS_OF_WEEK = [
  { key: 'sunday', label: 'الأحد', short: 'أح' },
  { key: 'monday', label: 'الاثنين', short: 'إث' },
  { key: 'tuesday', label: 'الثلاثاء', short: 'ثل' },
  { key: 'wednesday', label: 'الأربعاء', short: 'أر' },
  { key: 'thursday', label: 'الخميس', short: 'خم' },
  { key: 'friday', label: 'الجمعة', short: 'جم' },
  { key: 'saturday', label: 'السبت', short: 'سب' },
];

const TIME_SLOTS = [
  { value: '06:00', label: '6:00 ص' },
  { value: '07:00', label: '7:00 ص' },
  { value: '08:00', label: '8:00 ص' },
  { value: '09:00', label: '9:00 ص' },
  { value: '10:00', label: '10:00 ص' },
  { value: '11:00', label: '11:00 ص' },
  { value: '12:00', label: '12:00 م' },
  { value: '13:00', label: '1:00 م' },
  { value: '14:00', label: '2:00 م' },
  { value: '15:00', label: '3:00 م' },
  { value: '16:00', label: '4:00 م' },
  { value: '17:00', label: '5:00 م' },
  { value: '18:00', label: '6:00 م' },
  { value: '19:00', label: '7:00 م' },
  { value: '20:00', label: '8:00 م' },
  { value: '21:00', label: '9:00 م' },
  { value: '22:00', label: '10:00 م' },
  { value: '23:00', label: '11:00 م' },
];

export default function ScheduleScreen() {
  const colors = useSafeThemeColors();
  const [schedule, setSchedule] = useState<ScheduleSettings>(DEFAULT_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const storedSchedule = await SecureStore.getItemAsync('ai_agent_schedule');
      if (storedSchedule) {
        const parsed = JSON.parse(storedSchedule);
        setSchedule({ ...DEFAULT_SCHEDULE, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load schedule:', error);
      Alert.alert('خطأ', 'فشل في تحميل إعدادات الجدولة');
    } finally {
      setLoading(false);
    }
  };

  const saveSchedule = async (newSchedule: ScheduleSettings) => {
    try {
      setSaving(true);
      await SecureStore.setItemAsync('ai_agent_schedule', JSON.stringify(newSchedule));
      setSchedule(newSchedule);
      
      // Update main settings
      const settingsData = await SecureStore.getItemAsync('ai_agent_settings');
      if (settingsData) {
        const settings = JSON.parse(settingsData);
        settings.scheduleEnabled = newSchedule.enabled;
        settings.scheduleFrom = newSchedule.fromTime;
        settings.scheduleTo = newSchedule.toTime;
        await SecureStore.setItemAsync('ai_agent_settings', JSON.stringify(settings));
      }

      Alert.alert('تم الحفظ', 'تم حفظ إعدادات الجدولة بنجاح');
    } catch (error) {
      console.error('Failed to save schedule:', error);
      Alert.alert('خطأ', 'فشل في حفظ إعدادات الجدولة');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    const updatedDays = schedule.days.includes(day)
      ? schedule.days.filter(d => d !== day)
      : [...schedule.days, day];
    
    setSchedule({ ...schedule, days: updatedDays });
  };

  const updateTime = (type: 'from' | 'to', time: string) => {
    if (type === 'from') {
      setSchedule({ ...schedule, fromTime: time });
    } else {
      setSchedule({ ...schedule, toTime: time });
    }
  };

  const getTimeLabel = (time: string) => {
    const slot = TIME_SLOTS.find(t => t.value === time);
    return slot ? slot.label : time;
  };

  const getCurrentStatus = () => {
    if (!schedule.enabled) return 'معطل';
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const currentTime = now.toTimeString().slice(0, 5);
    
    const isDayActive = schedule.days.includes(currentDay);
    const isTimeActive = currentTime >= schedule.fromTime && currentTime <= schedule.toTime;
    
    if (isDayActive && isTimeActive) {
      return 'نشط الآن';
    } else if (isDayActive) {
      return 'غير نشط (خارج الوقت المحدد)';
    } else {
      return 'غير نشط (يوم غير محدد)';
    }
  };

  const TimeSelector = ({ 
    label, 
    value, 
    onSelect 
  }: { 
    label: string; 
    value: string; 
    onSelect: (time: string) => void 
  }) => (
    <View style={styles.timeSelector}>
      <AccessibleText variant="caption" color="secondary" style={styles.timeSelectorLabel}>
        {label}
      </AccessibleText>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.timeSlots}
        contentContainerStyle={styles.timeSlotsContent}
      >
        {TIME_SLOTS.map((slot) => (
          <TouchableOpacity
            key={slot.value}
            style={[
              styles.timeSlot,
              value === slot.value && styles.timeSlotSelected,
              { 
                borderColor: value === slot.value ? colors.primary : colors.border,
                backgroundColor: value === slot.value ? colors.primary + '10' : 'transparent'
              }
            ]}
            onPress={() => onSelect(slot.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === slot.value }}
          >
            <Text style={[
              styles.timeSlotText,
              { color: value === slot.value ? colors.primary : colors.text }
            ]}>
              {slot.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Clock size={48} color={colors.primary} />
          <AccessibleText variant="body" color="secondary" style={styles.loadingText}>
            جاري تحميل إعدادات الجدولة...
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
            <Clock size={32} color={colors.primary} />
            <View style={styles.headerText}>
              <AccessibleText variant="heading3" weight="bold">
                جدولة المساعد
              </AccessibleText>
              <AccessibleText variant="caption" color="secondary">
                تحديد أوقات عمل المساعد الذكي
              </AccessibleText>
            </View>
          </View>
        </AccessibleCard>

        {/* Current Status */}
        <AccessibleCard variant="outlined" padding="large" style={styles.statusCard}>
          <View style={styles.statusContent}>
            <View style={styles.statusIcon}>
              {schedule.enabled ? (
                <Sun size={24} color={colors.success} />
              ) : (
                <Moon size={24} color={colors.textSecondary} />
              )}
            </View>
            <View style={styles.statusText}>
              <AccessibleText variant="body" weight="medium">
                الحالة الحالية
              </AccessibleText>
              <AccessibleText variant="caption" color="secondary">
                {getCurrentStatus()}
              </AccessibleText>
            </View>
          </View>
        </AccessibleCard>

        {/* Enable Toggle */}
        <AccessibleCard variant="default" padding="large" style={styles.toggleCard}>
          <View style={styles.toggleContent}>
            <View style={styles.toggleText}>
              <AccessibleText variant="body" weight="medium">
                تفعيل الجدولة
              </AccessibleText>
              <AccessibleText variant="caption" color="secondary">
                تشغيل المساعد في أوقات محددة فقط
              </AccessibleText>
            </View>
            <Switch
              value={schedule.enabled}
              onValueChange={(enabled) => setSchedule({ ...schedule, enabled })}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={schedule.enabled ? colors.primary : colors.textSecondary}
              disabled={saving}
            />
          </View>
        </AccessibleCard>

        {schedule.enabled && (
          <>
            {/* Time Range */}
            <AccessibleCard variant="default" padding="large" style={styles.timeCard}>
              <AccessibleText variant="body" weight="medium" style={styles.sectionTitle}>
                الفترة الزمنية
              </AccessibleText>
              
              <TimeSelector
                label="من الساعة"
                value={schedule.fromTime}
                onSelect={(time) => updateTime('from', time)}
              />
              
              <TimeSelector
                label="إلى الساعة"
                value={schedule.toTime}
                onSelect={(time) => updateTime('to', time)}
              />

              <View style={styles.timePreview}>
                <Calendar size={16} color={colors.primary} />
                <AccessibleText variant="caption" color="primary">
                  نشط من {getTimeLabel(schedule.fromTime)} إلى {getTimeLabel(schedule.toTime)}
                </AccessibleText>
              </View>
            </AccessibleCard>

            {/* Days Selection */}
            <AccessibleCard variant="default" padding="large" style={styles.daysCard}>
              <AccessibleText variant="body" weight="medium" style={styles.sectionTitle}>
                أيام الأسبوع
              </AccessibleText>
              
              <View style={styles.daysGrid}>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day.key}
                    style={[
                      styles.dayButton,
                      schedule.days.includes(day.key) && styles.dayButtonSelected,
                      {
                        borderColor: schedule.days.includes(day.key) ? colors.primary : colors.border,
                        backgroundColor: schedule.days.includes(day.key) ? colors.primary + '10' : 'transparent'
                      }
                    ]}
                    onPress={() => toggleDay(day.key)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: schedule.days.includes(day.key) }}
                    accessibilityLabel={day.label}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      { color: schedule.days.includes(day.key) ? colors.primary : colors.text }
                    ]}>
                      {day.short}
                    </Text>
                    <Text style={[
                      styles.dayButtonLabel,
                      { color: schedule.days.includes(day.key) ? colors.primary : colors.textSecondary }
                    ]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <AccessibleText variant="caption" color="secondary" style={styles.daysHint}>
                اختر الأيام التي تريد تشغيل المساعد فيها
              </AccessibleText>
            </AccessibleCard>

            {/* Quick Presets */}
            <AccessibleCard variant="outlined" padding="large" style={styles.presetsCard}>
              <AccessibleText variant="body" weight="medium" style={styles.sectionTitle}>
                إعدادات سريعة
              </AccessibleText>
              
              <View style={styles.presetButtons}>
                <AccessibleButton
                  title="ساعات العمل"
                  onPress={() => {
                    setSchedule({
                      ...schedule,
                      fromTime: '09:00',
                      toTime: '17:00',
                      days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']
                    });
                  }}
                  variant="ghost"
                  size="small"
                  style={styles.presetButton}
                />
                
                <AccessibleButton
                  title="المساء فقط"
                  onPress={() => {
                    setSchedule({
                      ...schedule,
                      fromTime: '18:00',
                      toTime: '22:00',
                      days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                    });
                  }}
                  variant="ghost"
                  size="small"
                  style={styles.presetButton}
                />
                
                <AccessibleButton
                  title="نهاية الأسبوع"
                  onPress={() => {
                    setSchedule({
                      ...schedule,
                      fromTime: '10:00',
                      toTime: '20:00',
                      days: ['friday', 'saturday']
                    });
                  }}
                  variant="ghost"
                  size="small"
                  style={styles.presetButton}
                />
              </View>
            </AccessibleCard>
          </>
        )}

        {/* Save Button */}
        <AccessibleButton
          title="حفظ الإعدادات"
          onPress={() => saveSchedule(schedule)}
          variant="primary"
          size="large"
          style={styles.saveButton}
          icon={<Save size={20} color={colors.textInverse} />}
          loading={saving}
          disabled={saving}
        />
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
  statusCard: {
    marginBottom: 20,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 12,
  },
  statusText: {
    flex: 1,
  },
  toggleCard: {
    marginBottom: 20,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleText: {
    flex: 1,
  },
  timeCard: {
    marginBottom: 20,
    gap: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  timeSelector: {
    gap: 8,
  },
  timeSelectorLabel: {
    marginBottom: 4,
  },
  timeSlots: {
    flexGrow: 0,
  },
  timeSlotsContent: {
    paddingRight: 16,
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
    marginRight: 8,
  },
  timeSlotSelected: {},
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  timePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 163, 175, 0.2)',
  },
  daysCard: {
    marginBottom: 20,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dayButton: {
    flex: 1,
    minWidth: '13%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
    gap: 4,
  },
  dayButtonSelected: {},
  dayButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayButtonLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  daysHint: {
    textAlign: 'center',
  },
  presetsCard: {
    marginBottom: 20,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetButton: {
    flex: 1,
    minWidth: '30%',
  },
  saveButton: {
    marginBottom: 40,
  },
});