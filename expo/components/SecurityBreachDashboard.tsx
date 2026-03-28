import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Activity,
  TrendingUp,
  Filter,
  Search,
  MoreVertical
} from 'lucide-react-native';
import SecurityBreachService, { SecurityBreach, SecurityAlert } from '@/services/security/SecurityBreachService';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

const { width } = Dimensions.get('window');

interface SecurityBreachDashboardProps {
  onBreachSelect?: (breach: SecurityBreach) => void;
  onAlertSelect?: (alert: SecurityAlert) => void;
}

const SecurityBreachDashboard: React.FC<SecurityBreachDashboardProps> = ({
  onBreachSelect,
  onAlertSelect
}) => {
  const [breaches, setBreaches] = useState<SecurityBreach[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'breaches' | 'alerts'>('overview');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedBreach, setSelectedBreach] = useState<SecurityBreach | null>(null);
  const [breachDetailModalVisible, setBreachDetailModalVisible] = useState(false);
  
  const breachService = SecurityBreachService.getInstance();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [breachData, alertData] = await Promise.all([
        breachService.getBreaches({ limit: 50 }),
        breachService.getAlerts({ limit: 50 })
      ]);
      setBreaches(breachData);
      setAlerts(alertData);
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleResolveBreach = async (breachId: string) => {
    Alert.alert(
      'Resolve Breach',
      'Are you sure you want to mark this breach as resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          style: 'destructive',
          onPress: async () => {
            await breachService.resolveBreach(breachId, 'admin');
            await loadData();
          }
        }
      ]
    );
  };

  const handleMarkAlertRead = async (alertId: string) => {
    await breachService.markAlertAsRead(alertId);
    await loadData();
  };

  const handleSimulateBreach = async () => {
    Alert.alert(
      'Simulate Security Breach',
      'This will create a test security breach for demonstration purposes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate',
          onPress: async () => {
            await breachService.simulateBreach('suspicious_activity', 'high');
            await loadData();
          }
        }
      ]
    );
  };

  const getSeverityColor = (severity: SecurityBreach['severity']) => {
    switch (severity) {
      case 'critical': return '#FF3B30';
      case 'high': return '#FF9500';
      case 'medium': return '#FFCC00';
      case 'low': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getPriorityColor = (priority: SecurityAlert['priority']) => {
    switch (priority) {
      case 'critical': return '#FF3B30';
      case 'error': return '#FF9500';
      case 'warning': return '#FFCC00';
      case 'info': return '#007AFF';
      default: return '#8E8E93';
    }
  };

  const getBreachTypeIcon = (type: SecurityBreach['type']) => {
    switch (type) {
      case 'unauthorized_access': return Shield;
      case 'suspicious_activity': return Eye;
      case 'data_breach': return AlertTriangle;
      case 'malware_detected': return XCircle;
      default: return AlertTriangle;
    }
  };

  const renderOverview = () => {
    const healthScore = breachService.getSecurityHealthScore();
    const criticalCount = breachService.getCriticalBreachesCount();
    const unreadCount = breachService.getUnreadAlertsCount();
    const totalBreaches = breaches.length;
    const resolvedBreaches = breaches.filter(b => b.resolved).length;

    return (
      <View style={styles.overviewContainer}>
        {/* Health Score Card */}
        <LinearGradient
          colors={healthScore > 80 ? ['#34C759', '#30D158'] : healthScore > 60 ? ['#FFCC00', '#FFD60A'] : ['#FF3B30', '#FF453A']}
          style={styles.healthScoreCard}
        >
          <View style={styles.healthScoreContent}>
            <Shield size={32} color="white" />
            <View style={styles.healthScoreText}>
              <Text style={styles.healthScoreTitle}>Security Health</Text>
              <Text style={styles.healthScoreValue}>{healthScore}%</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <AlertTriangle size={24} color="#FF3B30" />
            <Text style={styles.statValue}>{criticalCount}</Text>
            <Text style={styles.statLabel}>Critical Breaches</Text>
          </View>
          
          <View style={styles.statCard}>
            <Activity size={24} color="#FF9500" />
            <Text style={styles.statValue}>{unreadCount}</Text>
            <Text style={styles.statLabel}>Unread Alerts</Text>
          </View>
          
          <View style={styles.statCard}>
            <TrendingUp size={24} color="#007AFF" />
            <Text style={styles.statValue}>{totalBreaches}</Text>
            <Text style={styles.statLabel}>Total Breaches</Text>
          </View>
          
          <View style={styles.statCard}>
            <CheckCircle size={24} color="#34C759" />
            <Text style={styles.statValue}>{resolvedBreaches}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>Recent Security Events</Text>
          {[...breaches.slice(0, 3), ...alerts.slice(0, 2)]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5)
            .map((item, index) => {
              const isBreach = 'severity' in item;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.activityItem}
                  onPress={() => {
                    if (isBreach) {
                      setSelectedBreach(item as SecurityBreach);
                      setBreachDetailModalVisible(true);
                    }
                  }}
                >
                  <View style={[
                    styles.activityIndicator,
                    {
                      backgroundColor: isBreach 
                        ? getSeverityColor((item as SecurityBreach).severity)
                        : getPriorityColor((item as SecurityAlert).priority)
                    }
                  ]} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      {isBreach ? (item as SecurityBreach).description : (item as SecurityAlert).title}
                    </Text>
                    <Text style={styles.activityTime}>
                      {formatRelativeTime(item.timestamp)}
                    </Text>
                  </View>
                  {isBreach && !(item as SecurityBreach).resolved && (
                    <View style={styles.unresolvedBadge}>
                      <Text style={styles.unresolvedText}>Unresolved</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleSimulateBreach}>
            <AlertTriangle size={20} color="#FF9500" />
            <Text style={styles.actionButtonText}>Simulate Breach</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => setFilterModalVisible(true)}>
            <Filter size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Filter Events</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBreaches = () => (
    <View style={styles.listContainer}>
      {breaches.map((breach) => {
        const IconComponent = getBreachTypeIcon(breach.type);
        return (
          <TouchableOpacity
            key={breach.id}
            style={styles.breachCard}
            onPress={() => {
              setSelectedBreach(breach);
              setBreachDetailModalVisible(true);
            }}
          >
            <View style={styles.breachHeader}>
              <View style={styles.breachIcon}>
                <IconComponent size={20} color={getSeverityColor(breach.severity)} />
              </View>
              <View style={styles.breachInfo}>
                <Text style={styles.breachTitle}>{breach.description}</Text>
                <Text style={styles.breachTime}>{formatRelativeTime(breach.timestamp)}</Text>
              </View>
              <View style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(breach.severity) }
              ]}>
                <Text style={styles.severityText}>{breach.severity.toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={styles.breachDetails}>
              <Text style={styles.breachType}>Type: {breach.type.replace('_', ' ')}</Text>
              <Text style={styles.breachResources}>
                Affected: {breach.affectedResources.join(', ')}
              </Text>
            </View>
            
            <View style={styles.breachActions}>
              {breach.resolved ? (
                <View style={styles.resolvedStatus}>
                  <CheckCircle size={16} color="#34C759" />
                  <Text style={styles.resolvedText}>Resolved</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.resolveButton}
                  onPress={() => handleResolveBreach(breach.id)}
                >
                  <Text style={styles.resolveButtonText}>Mark Resolved</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderAlerts = () => (
    <View style={styles.listContainer}>
      {alerts.map((alert) => (
        <TouchableOpacity
          key={alert.id}
          style={[
            styles.alertCard,
            { opacity: alert.read ? 0.7 : 1 }
          ]}
          onPress={() => {
            if (!alert.read) {
              handleMarkAlertRead(alert.id);
            }
            onAlertSelect?.(alert);
          }}
        >
          <View style={styles.alertHeader}>
            <View style={[
              styles.priorityIndicator,
              { backgroundColor: getPriorityColor(alert.priority) }
            ]} />
            <View style={styles.alertInfo}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTime}>{formatRelativeTime(alert.timestamp)}</Text>
            </View>
            {!alert.read && <View style={styles.unreadDot} />}
          </View>
          
          {alert.actionRequired && (
            <View style={styles.actionRequiredBadge}>
              <Text style={styles.actionRequiredText}>Action Required</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderBreachDetailModal = () => (
    <Modal
      visible={breachDetailModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Breach Details</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setBreachDetailModalVisible(false)}
          >
            <XCircle size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        
        {selectedBreach && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{selectedBreach.description}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Severity</Text>
              <View style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(selectedBreach.severity) }
              ]}>
                <Text style={styles.severityText}>{selectedBreach.severity.toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Affected Resources</Text>
              {selectedBreach.affectedResources.map((resource, index) => (
                <Text key={index} style={styles.resourceItem}>• {resource}</Text>
              ))}
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Mitigation Steps</Text>
              {selectedBreach.mitigationSteps.map((step, index) => (
                <Text key={index} style={styles.mitigationStep}>{index + 1}. {step}</Text>
              ))}
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Impact Assessment</Text>
              <Text style={styles.detailValue}>
                Users Affected: {selectedBreach.impactAssessment.usersAffected}
              </Text>
              <Text style={styles.detailValue}>
                Estimated Damage: {selectedBreach.impactAssessment.estimatedDamage}
              </Text>
            </View>
            
            {!selectedBreach.resolved && (
              <TouchableOpacity
                style={styles.resolveBreachButton}
                onPress={() => {
                  handleResolveBreach(selectedBreach.id);
                  setBreachDetailModalVisible(false);
                }}
              >
                <Text style={styles.resolveBreachButtonText}>Mark as Resolved</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  const unreadCount = breachService.getUnreadAlertsCount();

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {['overview', 'breaches', 'alerts'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              selectedTab === tab && styles.activeTab
            ]}
            onPress={() => setSelectedTab(tab as any)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab && styles.activeTabText
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {tab === 'alerts' && unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'breaches' && renderBreaches()}
        {selectedTab === 'alerts' && renderAlerts()}
      </ScrollView>

      {renderBreachDetailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7'
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: 8,
    marginHorizontal: 4
  },
  activeTab: {
    backgroundColor: '#007AFF'
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93'
  },
  activeTabText: {
    color: 'white'
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  content: {
    flex: 1
  },
  overviewContainer: {
    padding: 16
  },
  healthScoreCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20
  },
  healthScoreContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  healthScoreText: {
    marginLeft: 16
  },
  healthScoreTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.9
  },
  healthScoreValue: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 4,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 8
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4
  },
  recentActivity: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7'
  },
  activityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12
  },
  activityContent: {
    flex: 1
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E'
  },
  activityTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2
  },
  unresolvedBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  unresolvedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600'
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E'
  },
  listContainer: {
    padding: 16
  },
  breachCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  breachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  breachIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  breachInfo: {
    flex: 1
  },
  breachTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  breachTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2
  },
  severityBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  severityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600'
  },
  breachDetails: {
    marginBottom: 12
  },
  breachType: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4
  },
  breachResources: {
    fontSize: 14,
    color: '#8E8E93'
  },
  breachActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  resolvedStatus: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  resolvedText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500'
  },
  resolveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  resolveButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  priorityIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12
  },
  alertInfo: {
    flex: 1
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4
  },
  alertMessage: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4
  },
  alertTime: {
    fontSize: 12,
    color: '#8E8E93'
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF'
  },
  actionRequiredBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8
  },
  actionRequiredText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  closeButton: {
    padding: 4
  },
  modalContent: {
    flex: 1,
    padding: 16
  },
  detailSection: {
    marginBottom: 24
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8
  },
  detailValue: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20
  },
  resourceItem: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4
  },
  mitigationStep: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
    lineHeight: 20
  },
  resolveBreachButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20
  },
  resolveBreachButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default SecurityBreachDashboard;