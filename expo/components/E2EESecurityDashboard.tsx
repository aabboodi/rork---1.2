import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch
} from 'react-native';
import {
  Shield,
  Lock,
  Key,
  MessageCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Users,
  Eye,
  EyeOff,
  Info,
  HelpCircle
} from 'lucide-react-native';
import SecurityTooltip from './SecurityTooltip';
import SecurityStatusIndicator from './SecurityStatusIndicator';
import { MessageSecurityService, ChatSession } from '@/services/security/MessageSecurityService';
import { E2EEService } from '@/services/security/E2EEService';

interface SecurityMetrics {
  totalChats: number;
  encryptedChats: number;
  messagesEncrypted: number;
  keysRotated: number;
  disappearingChatsEnabled: number;
  lastKeyRotation: number;
}

export const E2EESecurityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalChats: 0,
    encryptedChats: 0,
    messagesEncrypted: 0,
    keysRotated: 0,
    disappearingChatsEnabled: 0,
    lastKeyRotation: 0
  });
  
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoKeyRotation, setAutoKeyRotation] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  const messageSecurityService = MessageSecurityService.getInstance();
  const e2eeService = E2EEService.getInstance();

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setIsLoading(true);
      
      // This would normally fetch from the service
      // For demo purposes, we'll simulate the data
      const mockMetrics: SecurityMetrics = {
        totalChats: 12,
        encryptedChats: 10,
        messagesEncrypted: 1247,
        keysRotated: 5,
        disappearingChatsEnabled: 3,
        lastKeyRotation: Date.now() - (2 * 24 * 60 * 60 * 1000) // 2 days ago
      };
      
      setMetrics(mockMetrics);
      
      // Mock chat sessions
      const mockSessions: ChatSession[] = [
        {
          chatId: 'chat_1',
          participants: ['user1', 'user2'],
          sessionId: 'session_1',
          isGroupChat: false,
          e2eeEnabled: true,
          createdAt: Date.now() - (5 * 24 * 60 * 60 * 1000),
          lastActivity: Date.now() - (1 * 60 * 60 * 1000),
          disappearingMessagesEnabled: true,
          disappearingMessagesDuration: 24 * 60 * 60 * 1000
        },
        {
          chatId: 'chat_2',
          participants: ['user1', 'user3'],
          sessionId: 'session_2',
          isGroupChat: false,
          e2eeEnabled: true,
          createdAt: Date.now() - (3 * 24 * 60 * 60 * 1000),
          lastActivity: Date.now() - (30 * 60 * 1000),
          disappearingMessagesEnabled: false,
          disappearingMessagesDuration: 0
        }
      ];
      
      setChatSessions(mockSessions);
      
    } catch (error) {
      console.error('Failed to load security data:', error);
      Alert.alert('Error', 'Failed to load security dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const rotateAllKeys = async () => {
    Alert.alert(
      'Rotate All Keys',
      'This will rotate encryption keys for all active chats. This may take a moment. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rotate Keys',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const session of chatSessions) {
                if (session.e2eeEnabled) {
                  await messageSecurityService.rotateSessionKeys(session.chatId);
                }
              }
              
              setMetrics(prev => ({
                ...prev,
                keysRotated: prev.keysRotated + chatSessions.filter(s => s.e2eeEnabled).length,
                lastKeyRotation: Date.now()
              }));
              
              Alert.alert('Success', 'All encryption keys have been rotated');
            } catch (error) {
              console.error('Failed to rotate keys:', error);
              Alert.alert('Error', 'Failed to rotate some encryption keys');
            }
          }
        }
      ]
    );
  };

  const enableDisappearingForAll = async () => {
    Alert.alert(
      'Enable Disappearing Messages',
      'Enable disappearing messages for all chats? Messages will disappear after 24 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable',
          onPress: async () => {
            try {
              for (const session of chatSessions) {
                await messageSecurityService.setDisappearingMessages(
                  session.chatId,
                  true,
                  24 * 60 * 60 * 1000
                );
              }
              
              setMetrics(prev => ({
                ...prev,
                disappearingChatsEnabled: chatSessions.length
              }));
              
              Alert.alert('Success', 'Disappearing messages enabled for all chats');
              await loadSecurityData();
            } catch (error) {
              console.error('Failed to enable disappearing messages:', error);
              Alert.alert('Error', 'Failed to enable disappearing messages for some chats');
            }
          }
        }
      ]
    );
  };

  const getSecurityScore = (): number => {
    const encryptionScore = (metrics.encryptedChats / Math.max(metrics.totalChats, 1)) * 40;
    const keyRotationScore = metrics.keysRotated > 0 ? 20 : 0;
    const disappearingScore = (metrics.disappearingChatsEnabled / Math.max(metrics.totalChats, 1)) * 20;
    const recentActivityScore = (Date.now() - metrics.lastKeyRotation) < (7 * 24 * 60 * 60 * 1000) ? 20 : 10;
    
    return Math.round(encryptionScore + keyRotationScore + disappearingScore + recentActivityScore);
  };

  const formatLastRotation = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const renderMetricCard = (
    icon: React.ReactNode,
    title: string,
    value: string | number,
    subtitle?: string,
    color: string = '#2196F3'
  ) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
        <View style={styles.metricContent}>
          <Text style={styles.metricValue}>{value}</Text>
          <Text style={styles.metricTitle}>{title}</Text>
          {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );

  const renderChatSession = (session: ChatSession) => (
    <View key={session.chatId} style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <View style={styles.sessionIcon}>
            {session.isGroupChat ? (
              <Users size={16} color="#666" />
            ) : (
              <MessageCircle size={16} color="#666" />
            )}
          </View>
          <View>
            <Text style={styles.sessionTitle}>
              {session.isGroupChat ? 'Group Chat' : 'Private Chat'}
            </Text>
            <Text style={styles.sessionSubtitle}>
              {session.participants.length} participants
            </Text>
          </View>
        </View>
        
        <View style={styles.sessionStatus}>
          {session.e2eeEnabled ? (
            <Shield size={16} color="#4CAF50" />
          ) : (
            <AlertTriangle size={16} color="#FF5722" />
          )}
        </View>
      </View>
      
      <View style={styles.sessionDetails}>
        <View style={styles.sessionDetail}>
          <Text style={styles.sessionDetailLabel}>Encryption:</Text>
          <Text style={[
            styles.sessionDetailValue,
            { color: session.e2eeEnabled ? '#4CAF50' : '#FF5722' }
          ]}>
            {session.e2eeEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
        
        <View style={styles.sessionDetail}>
          <Text style={styles.sessionDetailLabel}>Disappearing:</Text>
          <Text style={[
            styles.sessionDetailValue,
            { color: session.disappearingMessagesEnabled ? '#4CAF50' : '#666' }
          ]}>
            {session.disappearingMessagesEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
        
        <View style={styles.sessionDetail}>
          <Text style={styles.sessionDetailLabel}>Last Activity:</Text>
          <Text style={styles.sessionDetailValue}>
            {formatLastRotation(session.lastActivity)}
          </Text>
        </View>
      </View>
    </View>
  );

  const securityScore = getSecurityScore();
  const scoreColor = securityScore >= 80 ? '#4CAF50' : securityScore >= 60 ? '#FF9800' : '#FF5722';

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Shield size={48} color="#2196F3" />
        <Text style={styles.loadingText}>Loading security dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Security Score */}
      <View style={[styles.scoreCard, { borderColor: scoreColor }]}>
        <View style={styles.scoreHeader}>
          <Shield size={24} color={scoreColor} />
          <Text style={styles.scoreTitle}>Security Score</Text>
        </View>
        <Text style={[styles.scoreValue, { color: scoreColor }]}>
          {securityScore}/100
        </Text>
        <Text style={styles.scoreDescription}>
          {securityScore >= 80 ? 'Excellent security posture' :
           securityScore >= 60 ? 'Good security, room for improvement' :
           'Security needs attention'}
        </Text>
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        {renderMetricCard(
          <MessageCircle size={20} color="#2196F3" />,
          'Total Chats',
          metrics.totalChats,
          undefined,
          '#2196F3'
        )}
        
        {renderMetricCard(
          <Lock size={20} color="#4CAF50" />,
          'Encrypted Chats',
          `${metrics.encryptedChats}/${metrics.totalChats}`,
          `${Math.round((metrics.encryptedChats / Math.max(metrics.totalChats, 1)) * 100)}%`,
          '#4CAF50'
        )}
        
        {renderMetricCard(
          <Key size={20} color="#FF9800" />,
          'Keys Rotated',
          metrics.keysRotated,
          formatLastRotation(metrics.lastKeyRotation),
          '#FF9800'
        )}
        
        {renderMetricCard(
          <Clock size={20} color="#9C27B0" />,
          'Disappearing Chats',
          metrics.disappearingChatsEnabled,
          `${Math.round((metrics.disappearingChatsEnabled / Math.max(metrics.totalChats, 1)) * 100)}%`,
          '#9C27B0'
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={rotateAllKeys}>
          <RefreshCw size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Rotate All Keys</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={enableDisappearingForAll}>
          <Clock size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Enable Disappearing Messages</Text>
        </TouchableOpacity>
      </View>

      {/* Advanced Settings */}
      <View style={styles.settingsSection}>
        <TouchableOpacity 
          style={styles.settingsHeader}
          onPress={() => setShowAdvancedSettings(!showAdvancedSettings)}
        >
          <Text style={styles.sectionTitle}>Advanced Settings</Text>
          {showAdvancedSettings ? (
            <EyeOff size={20} color="#666" />
          ) : (
            <Eye size={20} color="#666" />
          )}
        </TouchableOpacity>
        
        {showAdvancedSettings && (
          <View style={styles.settingsContent}>
            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingTitle}>Auto Key Rotation</Text>
                <Text style={styles.settingDescription}>
                  Automatically rotate keys weekly
                </Text>
              </View>
              <Switch
                value={autoKeyRotation}
                onValueChange={setAutoKeyRotation}
                trackColor={{ false: '#ccc', true: '#2196F3' }}
                thumbColor={autoKeyRotation ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
        )}
      </View>

      {/* Chat Sessions */}
      <View style={styles.sessionsSection}>
        <Text style={styles.sectionTitle}>Active Chat Sessions</Text>
        {chatSessions.map(renderChatSession)}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16
  },
  loadingText: {
    fontSize: 16,
    color: '#666'
  },
  scoreCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center'
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8
  },
  scoreDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  metricsGrid: {
    paddingHorizontal: 16,
    gap: 12
  },
  metricCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  metricContent: {
    flex: 1
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 2
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  actionsSection: {
    padding: 16,
    gap: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  actionButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  settingsSection: {
    padding: 16
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  settingsContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  sessionsSection: {
    padding: 16,
    paddingBottom: 32
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  sessionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  sessionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  sessionStatus: {
    padding: 4
  },
  sessionDetails: {
    gap: 8
  },
  sessionDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sessionDetailLabel: {
    fontSize: 14,
    color: '#666'
  },
  sessionDetailValue: {
    fontSize: 14,
    fontWeight: '500'
  }
});

export default E2EESecurityDashboard;