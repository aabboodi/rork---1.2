import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import {
  Shield,
  Activity,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Lock,
  Smartphone,
  Wifi,
  Database,
  Bell
} from 'lucide-react-native';
import ComprehensiveDashboard from '@/components/ComprehensiveDashboard';
import SecurityAlertBanner from '@/components/SecurityAlertBanner';
import SecurityBreachService from '@/services/security/SecurityBreachService';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [securityHealth, setSecurityHealth] = useState(100);
  const [criticalCount, setCriticalCount] = useState(0);
  
  const breachService = SecurityBreachService.getInstance();

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      const alerts = breachService.getAlerts({ limit: 5 });
      const breaches = breachService.getBreaches({ limit: 3 });
      const health = breachService.getSecurityHealthScore();
      const critical = breachService.getCriticalBreachesCount();
      
      // Combine and sort by timestamp
      const combined = [...alerts, ...breaches]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);
      
      setRecentAlerts(combined);
      setSecurityHealth(health);
      setCriticalCount(critical);
    } catch (error) {
      console.error('Failed to load security data:', error);
    }
  };

  const quickActions = [
    {
      title: 'Security Breach Dashboard',
      icon: Shield,
      color: '#007AFF',
      route: '/security/breach-dashboard',
      badge: criticalCount > 0 ? criticalCount : undefined
    },
    {
      title: 'System Alerts',
      icon: Bell,
      color: '#FF9500',
      route: '/security/system-alerts'
    },
    {
      title: 'Security Overview',
      icon: Activity,
      color: '#34C759',
      route: '/security/overview'
    },
    {
      title: 'Performance Monitor',
      icon: TrendingUp,
      color: '#AF52DE',
      route: '/monitoring/performance'
    }
  ];

  const getAlertIcon = (item: any) => {
    if ('severity' in item) {
      // It's a breach
      switch (item.severity) {
        case 'critical': return AlertTriangle;
        case 'high': return Shield;
        case 'medium': return Clock;
        case 'low': return CheckCircle;
        default: return AlertTriangle;
      }
    } else {
      // It's an alert
      switch (item.priority) {
        case 'critical': return AlertTriangle;
        case 'error': return Shield;
        case 'warning': return Clock;
        case 'info': return CheckCircle;
        default: return Bell;
      }
    }
  };

  const getAlertColor = (item: any) => {
    if ('severity' in item) {
      // It's a breach
      switch (item.severity) {
        case 'critical': return '#FF3B30';
        case 'high': return '#FF9500';
        case 'medium': return '#FFCC00';
        case 'low': return '#34C759';
        default: return '#8E8E93';
      }
    } else {
      // It's an alert
      switch (item.priority) {
        case 'critical': return '#FF3B30';
        case 'error': return '#FF9500';
        case 'warning': return '#FFCC00';
        case 'info': return '#007AFF';
        default: return '#8E8E93';
      }
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#34C759';
    if (score >= 60) return '#FFCC00';
    if (score >= 40) return '#FF9500';
    return '#FF3B30';
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Security Dashboard',
          headerShown: false
        }} 
      />
      
      <SecurityAlertBanner />
      
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <LinearGradient
          colors={['#1C1C1E', '#2C2C2E']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Security Dashboard</Text>
          <Text style={styles.headerSubtitle}>Real-time monitoring and alerts</Text>
          
          {/* Security Health Score */}
          <View style={styles.healthContainer}>
            <View style={styles.healthScore}>
              <Text style={styles.healthValue}>{securityHealth}%</Text>
              <Text style={styles.healthLabel}>Security Health</Text>
            </View>
            <View style={styles.healthIndicator}>
              <View 
                style={[
                  styles.healthBar,
                  { 
                    width: `${securityHealth}%`,
                    backgroundColor: getHealthColor(securityHealth)
                  }
                ]} 
              />
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.quickActionCard}
                  onPress={() => router.push(action.route as any)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                    <IconComponent size={24} color={action.color} />
                    {action.badge && (
                      <View style={styles.actionBadge}>
                        <Text style={styles.actionBadgeText}>{action.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.quickActionTitle}>{action.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recent Security Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Security Events</Text>
            <TouchableOpacity onPress={() => router.push('/security/breach-dashboard')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {recentAlerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Shield size={32} color="#8E8E93" />
              <Text style={styles.emptyText}>No recent security events</Text>
            </View>
          ) : (
            recentAlerts.map((item, index) => {
              const IconComponent = getAlertIcon(item);
              const alertColor = getAlertColor(item);
              const isBreach = 'severity' in item;
              
              return (
                <TouchableOpacity 
                  key={item.id || index} 
                  style={styles.alertCard}
                  onPress={() => router.push('/security/breach-dashboard')}
                >
                  <View style={styles.alertHeader}>
                    <View style={[styles.alertIcon, { backgroundColor: `${alertColor}20` }]}>
                      <IconComponent size={20} color={alertColor} />
                    </View>
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertTitle}>
                        {isBreach ? item.description : item.title}
                      </Text>
                      <Text style={styles.alertDescription}>
                        {isBreach 
                          ? `${item.type.replace('_', ' ')} - ${item.affectedResources?.join(', ') || 'System'}`
                          : item.message
                        }
                      </Text>
                      <Text style={styles.alertTimestamp}>
                        {formatRelativeTime(item.timestamp)}
                      </Text>
                    </View>
                    <View style={[styles.severityBadge, { backgroundColor: alertColor }]}>
                      <Text style={styles.severityText}>
                        {isBreach ? item.severity.toUpperCase() : item.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  {isBreach && !item.resolved && (
                    <View style={styles.unresolvedIndicator}>
                      <Text style={styles.unresolvedText}>Unresolved</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* System Status Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <Lock size={24} color="#34C759" />
              <Text style={styles.statusValue}>Secure</Text>
              <Text style={styles.statusLabel}>Encryption</Text>
            </View>
            
            <View style={styles.statusCard}>
              <Wifi size={24} color="#007AFF" />
              <Text style={styles.statusValue}>Active</Text>
              <Text style={styles.statusLabel}>Network Monitor</Text>
            </View>
            
            <View style={styles.statusCard}>
              <Database size={24} color="#AF52DE" />
              <Text style={styles.statusValue}>Protected</Text>
              <Text style={styles.statusLabel}>Data Integrity</Text>
            </View>
            
            <View style={styles.statusCard}>
              <Eye size={24} color="#FF9500" />
              <Text style={styles.statusValue}>Monitoring</Text>
              <Text style={styles.statusLabel}>Threat Detection</Text>
            </View>
          </View>
        </View>

        {/* Comprehensive Dashboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Analytics</Text>
          <ComprehensiveDashboard />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7'
  },
  scrollView: {
    flex: 1
  },
  header: {
    padding: 20,
    paddingTop: 60
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 20
  },
  healthContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16
  },
  healthScore: {
    alignItems: 'center',
    marginBottom: 12
  },
  healthValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  healthLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8
  },
  healthIndicator: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden'
  },
  healthBar: {
    height: '100%',
    borderRadius: 4
  },
  section: {
    padding: 16,
    marginBottom: 8
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16
  },
  viewAllText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500'
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  quickActionCard: {
    width: (width - 44) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative'
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center'
  },
  actionBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    textAlign: 'center'
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    borderRadius: 12
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  alertInfo: {
    flex: 1
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2
  },
  alertDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4
  },
  alertTimestamp: {
    fontSize: 12,
    color: '#8E8E93'
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
  unresolvedIndicator: {
    marginTop: 8,
    alignSelf: 'flex-start'
  },
  unresolvedText: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '500'
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  statusCard: {
    width: (width - 44) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 8,
    marginBottom: 4
  },
  statusLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center'
  }
});