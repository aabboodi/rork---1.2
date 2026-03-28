import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  RefreshControl,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { 
  Timer, 
  Shield, 
  Eye, 
  Clock, 
  AlertTriangle, 
  Settings,
  Plus,
  Trash2,
  Pause,
  Play,
  RotateCcw
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import SelfDestructService from '@/services/security/SelfDestructService';
import SelfDestructMessageComposer from '@/components/SelfDestructMessageComposer';
import SelfDestructTimer from '@/components/SelfDestructTimer';
import { SelfDestructTimer as TimerType, ExpirationPolicy } from '@/types';
import { MicroInteractions } from '@/utils/microInteractions';

interface ActiveTimer extends TimerType {
  messagePreview?: string;
  chatName?: string;
  securityLevel: string;
}

export default function SelfDestructScreen() {
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalMessages: 0,
    expiredMessages: 0,
    activeTimers: 0,
    totalViews: 0
  });

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      await loadActiveTimers();
      await loadStats();
    } catch (error) {
      console.error('Failed to load self-destruct data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadActiveTimers = async () => {
    try {
      const timers = await SelfDestructService.getActiveTimers();
      
      // Enhance timers with additional data
      const enhancedTimers: ActiveTimer[] = await Promise.all(
        timers.map(async (timer) => {
          const status = await SelfDestructService.getMessageStatus(timer.messageId);
          return {
            ...timer,
            messagePreview: 'رسالة ذاتية التدمير',
            chatName: 'محادثة خاصة',
            securityLevel: status?.securityLevel || 'standard'
          };
        })
      );
      
      setActiveTimers(enhancedTimers);
    } catch (error) {
      console.error('Failed to load active timers:', error);
    }
  };

  const loadStats = async () => {
    // In a real implementation, this would load actual statistics
    setStats({
      totalMessages: 45,
      expiredMessages: 12,
      activeTimers: activeTimers.length,
      totalViews: 128
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateMessage = (policy: ExpirationPolicy, securityLevel: 'standard' | 'high' | 'maximum') => {
    // In a real implementation, this would create a new self-destruct message
    Alert.alert(
      '✅ تم إنشاء الرسالة',
      `تم إنشاء رسالة ذاتية التدمير بمستوى أمان ${securityLevel === 'maximum' ? 'أقصى' : securityLevel === 'high' ? 'عالي' : 'عادي'}`,
      [{ text: 'موافق' }]
    );
    
    MicroInteractions.triggerHapticFeedback('success');
    loadData();
  };

  const handlePauseTimer = async (timerId: string) => {
    try {
      const success = await SelfDestructService.pauseTimer(timerId, 'user_request', 'current_user');
      if (success) {
        MicroInteractions.triggerHapticFeedback('medium');
        Alert.alert('✅ تم إيقاف المؤقت', 'تم إيقاف المؤقت مؤقتاً');
        loadData();
      } else {
        Alert.alert('❌ فشل', 'لا يمكن إيقاف هذا المؤقت');
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إيقاف المؤقت');
    }
  };

  const handleResumeTimer = async (timerId: string) => {
    try {
      const success = await SelfDestructService.resumeTimer(timerId, 'current_user');
      if (success) {
        MicroInteractions.triggerHapticFeedback('medium');
        Alert.alert('✅ تم استئناف المؤقت', 'تم استئناف المؤقت بنجاح');
        loadData();
      } else {
        Alert.alert('❌ فشل', 'لا يمكن استئناف هذا المؤقت');
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في استئناف المؤقت');
    }
  };

  const handleExtendTimer = async (timerId: string) => {
    Alert.alert(
      'تمديد المؤقت',
      'كم دقيقة تريد إضافتها؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: '5 دقائق', onPress: () => extendTimer(timerId, 5 * 60 * 1000) },
        { text: '15 دقيقة', onPress: () => extendTimer(timerId, 15 * 60 * 1000) },
        { text: '30 دقيقة', onPress: () => extendTimer(timerId, 30 * 60 * 1000) },
        { text: '1 ساعة', onPress: () => extendTimer(timerId, 60 * 60 * 1000) }
      ]
    );
  };

  const extendTimer = async (timerId: string, duration: number) => {
    try {
      const success = await SelfDestructService.extendTimer(
        timerId, 
        duration, 
        'User requested extension', 
        'current_user'
      );
      
      if (success) {
        MicroInteractions.triggerHapticFeedback('success');
        Alert.alert('✅ تم التمديد', 'تم تمديد مدة الرسالة بنجاح');
        loadData();
      } else {
        Alert.alert('❌ فشل التمديد', 'لا يمكن تمديد هذه الرسالة');
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تمديد المؤقت');
    }
  };

  const handleDestroyMessage = async (messageId: string) => {
    Alert.alert(
      '⚠️ تأكيد الحذف',
      'هل أنت متأكد من حذف هذه الرسالة فوراً؟ لا يمكن التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'حذف', 
          style: 'destructive',
          onPress: async () => {
            try {
              await SelfDestructService.destroyMessage(messageId, 'Manual destruction by user');
              MicroInteractions.triggerHapticFeedback('heavy');
              Alert.alert('✅ تم الحذف', 'تم حذف الرسالة بنجاح');
              loadData();
            } catch (error) {
              Alert.alert('خطأ', 'فشل في حذف الرسالة');
            }
          }
        }
      ]
    );
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${seconds}s`;
    }
  };

  const getSecurityIcon = (level: string) => {
    switch (level) {
      case 'maximum':
        return <Shield size={16} color="#FF4444" />;
      case 'high':
        return <Shield size={16} color="#FF8800" />;
      default:
        return <Shield size={16} color={Colors.primary} />;
    }
  };

  const getSecurityColor = (level: string) => {
    switch (level) {
      case 'maximum':
        return '#FF4444';
      case 'high':
        return '#FF8800';
      default:
        return Colors.primary;
    }
  };

  const renderStatsCard = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>📊 إحصائيات الرسائل ذاتية التدمير</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Timer size={20} color={Colors.primary} />
          <Text style={styles.statNumber}>{stats.activeTimers}</Text>
          <Text style={styles.statLabel}>مؤقتات نشطة</Text>
        </View>
        
        <View style={styles.statCard}>
          <Eye size={20} color="#4CAF50" />
          <Text style={styles.statNumber}>{stats.totalViews}</Text>
          <Text style={styles.statLabel}>إجمالي المشاهدات</Text>
        </View>
        
        <View style={styles.statCard}>
          <AlertTriangle size={20} color="#FF8800" />
          <Text style={styles.statNumber}>{stats.expiredMessages}</Text>
          <Text style={styles.statLabel}>رسائل منتهية</Text>
        </View>
        
        <View style={styles.statCard}>
          <Shield size={20} color="#9C27B0" />
          <Text style={styles.statNumber}>{stats.totalMessages}</Text>
          <Text style={styles.statLabel}>إجمالي الرسائل</Text>
        </View>
      </View>
    </View>
  );

  const renderTimerCard = (timer: ActiveTimer) => (
    <View key={timer.timerId} style={styles.timerCard}>
      <View style={styles.timerHeader}>
        <View style={styles.timerLeft}>
          {getSecurityIcon(timer.securityLevel)}
          <View style={styles.timerInfo}>
            <Text style={styles.timerTitle}>{timer.messagePreview}</Text>
            <Text style={styles.timerSubtitle}>{timer.chatName}</Text>
          </View>
        </View>
        
        <View style={styles.timerRight}>
          <Text style={[styles.timerTime, { color: getSecurityColor(timer.securityLevel) }]}>
            {formatTime(timer.remainingTime)}
          </Text>
          <Text style={styles.timerStatus}>
            {timer.isPaused ? '⏸️ متوقف' : '▶️ نشط'}
          </Text>
        </View>
      </View>

      <View style={styles.timerProgress}>
        <View 
          style={[
            styles.progressBar,
            { 
              width: `${(timer.remainingTime / timer.duration) * 100}%`,
              backgroundColor: getSecurityColor(timer.securityLevel)
            }
          ]} 
        />
      </View>

      <View style={styles.timerActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.pauseButton]}
          onPress={() => timer.isPaused ? handleResumeTimer(timer.timerId) : handlePauseTimer(timer.timerId)}
        >
          {timer.isPaused ? <Play size={16} color="white" /> : <Pause size={16} color="white" />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.extendButton]}
          onPress={() => handleExtendTimer(timer.timerId)}
        >
          <RotateCcw size={16} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.destroyButton]}
          onPress={() => handleDestroyMessage(timer.messageId)}
        >
          <Trash2 size={16} color="white" />
        </TouchableOpacity>
      </View>

      {/* Security Events */}
      {timer.securityEvents.length > 0 && (
        <View style={styles.securityEvents}>
          <Text style={styles.securityEventsTitle}>🔒 أحداث أمنية حديثة:</Text>
          {timer.securityEvents.slice(-2).map((event, index) => (
            <Text key={index} style={styles.securityEvent}>
              • {event.eventType} - {new Date(event.timestamp).toLocaleTimeString('ar-SA')}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'الرسائل ذاتية التدمير',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.dark,
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowComposer(true)}>
              <Plus size={24} color={Colors.primary} />
            </TouchableOpacity>
          )
        }} 
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Timer size={28} color={Colors.primary} />
            <View>
              <Text style={styles.headerTitle}>الرسائل ذاتية التدمير</Text>
              <Text style={styles.headerSubtitle}>
                حماية متقدمة للرسائل الحساسة
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        {renderStatsCard()}

        {/* Create New Message Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowComposer(true)}
        >
          <Plus size={20} color="white" />
          <Text style={styles.createButtonText}>إنشاء رسالة ذاتية التدمير</Text>
        </TouchableOpacity>

        {/* Active Timers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ المؤقتات النشطة</Text>
          
          {activeTimers.length === 0 ? (
            <View style={styles.emptyState}>
              <Timer size={48} color={Colors.medium} />
              <Text style={styles.emptyStateTitle}>لا توجد مؤقتات نشطة</Text>
              <Text style={styles.emptyStateSubtitle}>
                قم بإنشاء رسالة ذاتية التدمير لبدء مؤقت جديد
              </Text>
            </View>
          ) : (
            activeTimers.map(renderTimerCard)
          )}
        </View>

        {/* Security Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 نصائح أمنية</Text>
          
          <View style={styles.tipsContainer}>
            <View style={styles.tipCard}>
              <Shield size={16} color="#4CAF50" />
              <Text style={styles.tipText}>
                استخدم مستوى الأمان الأقصى للمعلومات الحساسة جداً
              </Text>
            </View>
            
            <View style={styles.tipCard}>
              <Clock size={16} color="#FF8800" />
              <Text style={styles.tipText}>
                اختر مدة قصيرة للرسائل التي تحتوي على معلومات مؤقتة
              </Text>
            </View>
            
            <View style={styles.tipCard}>
              <Eye size={16} color="#2196F3" />
              <Text style={styles.tipText}>
                فعّل المصادقة البيومترية للرسائل عالية الأهمية
              </Text>
            </View>
            
            <View style={styles.tipCard}>
              <AlertTriangle size={16} color="#FF4444" />
              <Text style={styles.tipText}>
                لا يمكن استرداد الرسائل بعد انتهاء صلاحيتها
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Message Composer Modal */}
      <SelfDestructMessageComposer
        visible={showComposer}
        onClose={() => setShowComposer(false)}
        onConfirm={handleCreateMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.medium,
    marginTop: 2,
  },
  statsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.medium,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    padding: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.medium,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.medium,
    textAlign: 'center',
  },
  timerCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  timerInfo: {
    flex: 1,
  },
  timerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  timerSubtitle: {
    fontSize: 12,
    color: Colors.medium,
    marginTop: 2,
  },
  timerRight: {
    alignItems: 'flex-end',
  },
  timerTime: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  timerStatus: {
    fontSize: 10,
    color: Colors.medium,
    marginTop: 2,
  },
  timerProgress: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  timerActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  pauseButton: {
    backgroundColor: '#FF8800',
  },
  extendButton: {
    backgroundColor: Colors.primary,
  },
  destroyButton: {
    backgroundColor: '#FF4444',
  },
  securityEvents: {
    marginTop: 8,
    padding: 8,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
  },
  securityEventsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  securityEvent: {
    fontSize: 10,
    color: Colors.medium,
    marginBottom: 2,
  },
  tipsContainer: {
    gap: 8,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
  },
  tipText: {
    fontSize: 14,
    color: Colors.dark,
    flex: 1,
  },
});