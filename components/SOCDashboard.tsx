import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, AlertTriangle, Eye, Activity, Users, Clock, TrendingUp, Zap } from 'lucide-react-native';
import { SOCService } from '@/services/security/SOCService';

interface ThreatAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  description: string;
  timestamp: Date;
  status: 'active' | 'investigating' | 'resolved';
  assignedTo?: string;
}

interface SOCMetrics {
  activeThreats: number;
  resolvedToday: number;
  averageResponseTime: number;
  securityScore: number;
  analystWorkload: number;
  systemHealth: number;
}

export const SOCDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SOCMetrics>({
    activeThreats: 0,
    resolvedToday: 0,
    averageResponseTime: 0,
    securityScore: 0,
    analystWorkload: 0,
    systemHealth: 0
  });
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  useEffect(() => {
    loadSOCData();
    const interval = setInterval(loadSOCData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSOCData = async () => {
    try {
      const socMetrics = await SOCService.getSOCMetrics();
      const threatAlerts = await SOCService.getActiveThreats();
      
      setMetrics(socMetrics);
      setAlerts(threatAlerts);
    } catch (error) {
      console.error('Failed to load SOC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAlertAction = async (alertId: string, action: 'investigate' | 'resolve' | 'escalate') => {
    try {
      await SOCService.updateThreatStatus(alertId, action);
      await loadSOCData();
      Alert.alert('Success', `Alert ${action}d successfully`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update alert status');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#FF4444';
      case 'high': return '#FF8800';
      case 'medium': return '#FFAA00';
      case 'low': return '#00AA00';
      default: return '#666666';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#FF4444';
      case 'investigating': return '#FFAA00';
      case 'resolved': return '#00AA00';
      default: return '#666666';
    }
  };

  const filteredAlerts = selectedSeverity === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.severity === selectedSeverity);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={32} color="#007AFF" />
        <Text style={styles.loadingText}>Loading SOC Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Shield size={28} color="#00D4FF" />
          <Text style={styles.headerTitle}>Security Operations Center</Text>
          <Text style={styles.headerSubtitle}>Real-time Threat Monitoring</Text>
        </View>
      </LinearGradient>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <AlertTriangle size={24} color="#FF4444" />
          <Text style={styles.metricValue}>{metrics.activeThreats}</Text>
          <Text style={styles.metricLabel}>Active Threats</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Shield size={24} color="#00AA00" />
          <Text style={styles.metricValue}>{metrics.resolvedToday}</Text>
          <Text style={styles.metricLabel}>Resolved Today</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Clock size={24} color="#007AFF" />
          <Text style={styles.metricValue}>{metrics.averageResponseTime}m</Text>
          <Text style={styles.metricLabel}>Avg Response</Text>
        </View>
        
        <View style={styles.metricCard}>
          <TrendingUp size={24} color="#00D4FF" />
          <Text style={styles.metricValue}>{metrics.securityScore}%</Text>
          <Text style={styles.metricLabel}>Security Score</Text>
        </View>
      </View>

      {/* System Health */}
      <View style={styles.healthSection}>
        <Text style={styles.sectionTitle}>System Health</Text>
        <View style={styles.healthGrid}>
          <View style={styles.healthCard}>
            <Activity size={20} color="#00AA00" />
            <Text style={styles.healthLabel}>SOC Systems</Text>
            <Text style={styles.healthValue}>{metrics.systemHealth}%</Text>
          </View>
          
          <View style={styles.healthCard}>
            <Users size={20} color="#007AFF" />
            <Text style={styles.healthLabel}>Analyst Load</Text>
            <Text style={styles.healthValue}>{metrics.analystWorkload}%</Text>
          </View>
        </View>
      </View>

      {/* Threat Alerts */}
      <View style={styles.alertsSection}>
        <View style={styles.alertsHeader}>
          <Text style={styles.sectionTitle}>Threat Alerts</Text>
          <View style={styles.severityFilters}>
            {['all', 'critical', 'high', 'medium', 'low'].map((severity) => (
              <TouchableOpacity
                key={severity}
                style={[
                  styles.filterButton,
                  selectedSeverity === severity && styles.filterButtonActive
                ]}
                onPress={() => setSelectedSeverity(severity)}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedSeverity === severity && styles.filterButtonTextActive
                ]}>
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filteredAlerts.map((alert) => (
          <View key={alert.id} style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(alert.severity) }
              ]}>
                <Text style={styles.severityText}>{alert.severity.toUpperCase()}</Text>
              </View>
              
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(alert.status) }
              ]}>
                <Text style={styles.statusText}>{alert.status.toUpperCase()}</Text>
              </View>
            </View>
            
            <Text style={styles.alertType}>{alert.type}</Text>
            <Text style={styles.alertDescription}>{alert.description}</Text>
            
            <View style={styles.alertMeta}>
              <Text style={styles.alertTime}>
                {alert.timestamp.toLocaleTimeString()}
              </Text>
              {alert.assignedTo && (
                <Text style={styles.alertAssignee}>Assigned: {alert.assignedTo}</Text>
              )}
            </View>
            
            <View style={styles.alertActions}>
              {alert.status === 'active' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.investigateButton]}
                  onPress={() => handleAlertAction(alert.id, 'investigate')}
                >
                  <Eye size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Investigate</Text>
                </TouchableOpacity>
              )}
              
              {alert.status === 'investigating' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.resolveButton]}
                  onPress={() => handleAlertAction(alert.id, 'resolve')}
                >
                  <Shield size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Resolve</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.actionButton, styles.escalateButton]}
                onPress={() => handleAlertAction(alert.id, 'escalate')}
              >
                <Zap size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Escalate</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666'
  },
  header: {
    padding: 24,
    borderRadius: 16,
    margin: 16,
    marginBottom: 8
  },
  headerContent: {
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#B0B0B0',
    marginTop: 4
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginTop: 8
  },
  metricLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    textAlign: 'center'
  },
  healthSection: {
    margin: 16,
    marginTop: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12
  },
  healthGrid: {
    flexDirection: 'row',
    gap: 12
  },
  healthCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  healthLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8
  },
  healthValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginTop: 4
  },
  alertsSection: {
    margin: 16,
    marginTop: 24
  },
  alertsHeader: {
    marginBottom: 16
  },
  severityFilters: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5E5E5'
  },
  filterButtonActive: {
    backgroundColor: '#007AFF'
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666666'
  },
  filterButtonTextActive: {
    color: '#FFFFFF'
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  alertType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4
  },
  alertDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    lineHeight: 20
  },
  alertMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  alertTime: {
    fontSize: 12,
    color: '#999999'
  },
  alertAssignee: {
    fontSize: 12,
    color: '#007AFF'
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4
  },
  investigateButton: {
    backgroundColor: '#007AFF'
  },
  resolveButton: {
    backgroundColor: '#00AA00'
  },
  escalateButton: {
    backgroundColor: '#FF8800'
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});