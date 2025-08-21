import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Cpu, 
  HardDrive, 
  Battery, 
  Wifi,
  Server,
  TrendingUp,
  Settings,
  FileText,
  Zap
} from 'lucide-react-native';
import ProductionMonitoringService, { SLOMetrics, Alert as MonitoringAlert, ComplianceCheck } from '@/services/monitoring/ProductionMonitoringService';

const monitoringService = new ProductionMonitoringService();

export default function Phase4ProductionDemo() {
  const [metrics, setMetrics] = useState<SLOMetrics | null>(null);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheck[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');

  useEffect(() => {
    // Set up event listeners
    const handleMetricsCollected = (newMetrics: SLOMetrics) => {
      setMetrics(newMetrics);
    };

    const handleAlertsGenerated = (newAlerts: MonitoringAlert[]) => {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 20)); // Keep last 20 alerts
    };

    const handleComplianceAlert = (alert: MonitoringAlert) => {
      console.log('Compliance alert received:', alert.message);
    };

    monitoringService.on('metrics_collected', handleMetricsCollected);
    monitoringService.on('alerts_generated', handleAlertsGenerated);
    monitoringService.on('compliance_alert', handleComplianceAlert);

    // Initialize data
    setMetrics(monitoringService.getMetrics());
    setAlerts(monitoringService.getAlerts(false));
    setComplianceChecks(monitoringService.getComplianceStatus());

    return () => {
      monitoringService.off('metrics_collected', handleMetricsCollected);
      monitoringService.off('alerts_generated', handleAlertsGenerated);
      monitoringService.off('compliance_alert', handleComplianceAlert);
      monitoringService.destroy();
    };
  }, []);

  const toggleMonitoring = () => {
    if (isMonitoring) {
      monitoringService.stopMonitoring();
      setIsMonitoring(false);
    } else {
      monitoringService.startMonitoring();
      setIsMonitoring(true);
    }
  };

  const resolveAlert = (alertId: string) => {
    if (monitoringService.resolveAlert(alertId)) {
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    }
  };

  const generateComplianceReport = () => {
    const report = monitoringService.generateComplianceReport();
    Alert.alert(
      'Compliance Report Generated',
      `Status: ${report.overallStatus}\nActive Alerts: ${report.activeAlerts}\nCompliance Checks: ${report.complianceChecks.length}`,
      [{ text: 'OK' }]
    );
  };

  const enableProductionFeatures = () => {
    monitoringService.enableCircuitBreaker();
    monitoringService.enableRateLimiting(1000);
    monitoringService.enableHealthChecks();
    Alert.alert('Production Features Enabled', 'Circuit breaker, rate limiting, and health checks are now active.');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#F44336';
      case 'high': return '#FF9800';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      default: return '#757575';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'fail': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle size={16} color="#4CAF50" />;
      case 'warning': return <AlertTriangle size={16} color="#FF9800" />;
      case 'fail': return <XCircle size={16} color="#F44336" />;
      default: return <Clock size={16} color="#757575" />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Phase 4: Production Hardening',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff'
        }} 
      />
      
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Shield size={24} color="#4CAF50" />
            <Text style={styles.title}>Production Monitoring</Text>
          </View>
          <Text style={styles.subtitle}>
            SLO monitoring, compliance tracking, and operational alerts
          </Text>
        </View>

        {/* Monitoring Control */}
        <View style={styles.section}>
          <View style={styles.controlRow}>
            <Text style={styles.sectionTitle}>Monitoring Status</Text>
            <Switch
              value={isMonitoring}
              onValueChange={toggleMonitoring}
              trackColor={{ false: '#333', true: '#4CAF50' }}
              thumbColor={isMonitoring ? '#fff' : '#ccc'}
            />
          </View>
          <Text style={styles.monitoringStatus}>
            {isMonitoring ? '🟢 Active monitoring every 30 seconds' : '🔴 Monitoring stopped'}
          </Text>
        </View>

        {/* SLO Metrics Dashboard */}
        {metrics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SLO Metrics</Text>
            
            {/* Latency Metrics */}
            <View style={styles.metricGroup}>
              <Text style={styles.metricGroupTitle}>Latency (Target: {metrics.latency.target}ms)</Text>
              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>P50</Text>
                  <Text style={styles.metricValue}>{Math.round(metrics.latency.p50)}ms</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>P95</Text>
                  <Text style={[
                    styles.metricValue,
                    { color: metrics.latency.p95 > metrics.latency.target ? '#F44336' : '#4CAF50' }
                  ]}>
                    {Math.round(metrics.latency.p95)}ms
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>P99</Text>
                  <Text style={styles.metricValue}>{Math.round(metrics.latency.p99)}ms</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Breaches</Text>
                  <Text style={[styles.metricValue, { color: '#F44336' }]}>
                    {metrics.latency.breaches}
                  </Text>
                </View>
              </View>
            </View>

            {/* Resource Consumption */}
            <View style={styles.metricGroup}>
              <Text style={styles.metricGroupTitle}>Resource Consumption</Text>
              <View style={styles.resourceGrid}>
                <View style={styles.resourceCard}>
                  <Cpu size={20} color="#2196F3" />
                  <Text style={styles.resourceLabel}>CPU</Text>
                  <Text style={[
                    styles.resourceValue,
                    { color: metrics.consumption.cpu > metrics.consumption.targets.cpu ? '#F44336' : '#4CAF50' }
                  ]}>
                    {Math.round(metrics.consumption.cpu)}%
                  </Text>
                  <Text style={styles.resourceTarget}>Target: {metrics.consumption.targets.cpu}%</Text>
                </View>
                
                <View style={styles.resourceCard}>
                  <HardDrive size={20} color="#9C27B0" />
                  <Text style={styles.resourceLabel}>Memory</Text>
                  <Text style={[
                    styles.resourceValue,
                    { color: metrics.consumption.memory > metrics.consumption.targets.memory ? '#F44336' : '#4CAF50' }
                  ]}>
                    {Math.round(metrics.consumption.memory)}MB
                  </Text>
                  <Text style={styles.resourceTarget}>Target: {metrics.consumption.targets.memory}MB</Text>
                </View>
                
                <View style={styles.resourceCard}>
                  <Battery size={20} color="#FF9800" />
                  <Text style={styles.resourceLabel}>Battery</Text>
                  <Text style={[
                    styles.resourceValue,
                    { color: metrics.consumption.battery > metrics.consumption.targets.battery ? '#F44336' : '#4CAF50' }
                  ]}>
                    {Math.round(metrics.consumption.battery)}%/h
                  </Text>
                  <Text style={styles.resourceTarget}>Target: {metrics.consumption.targets.battery}%/h</Text>
                </View>
                
                <View style={styles.resourceCard}>
                  <Wifi size={20} color="#4CAF50" />
                  <Text style={styles.resourceLabel}>Network</Text>
                  <Text style={[
                    styles.resourceValue,
                    { color: metrics.consumption.network > metrics.consumption.targets.network ? '#F44336' : '#4CAF50' }
                  ]}>
                    {Math.round(metrics.consumption.network)}MB/h
                  </Text>
                  <Text style={styles.resourceTarget}>Target: {metrics.consumption.targets.network}MB/h</Text>
                </View>
              </View>
            </View>

            {/* Offload Rate & Availability */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Server size={20} color="#2196F3" />
                <Text style={styles.metricLabel}>Offload Rate</Text>
                <Text style={styles.metricValue}>{Math.round(metrics.offloadRate.current)}%</Text>
                <Text style={styles.metricTarget}>Target: {metrics.offloadRate.target}%</Text>
              </View>
              
              <View style={styles.metricCard}>
                <TrendingUp size={20} color="#4CAF50" />
                <Text style={styles.metricLabel}>Availability</Text>
                <Text style={[
                  styles.metricValue,
                  { color: metrics.availability.uptime >= metrics.availability.target ? '#4CAF50' : '#F44336' }
                ]}>
                  {metrics.availability.uptime.toFixed(2)}%
                </Text>
                <Text style={styles.metricTarget}>Target: {metrics.availability.target}%</Text>
              </View>
            </View>
          </View>
        )}

        {/* Active Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Alerts ({alerts.length})</Text>
          {alerts.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={32} color="#4CAF50" />
              <Text style={styles.emptyStateText}>No active alerts</Text>
            </View>
          ) : (
            <View style={styles.alertsList}>
              {alerts.slice(0, 5).map((alert) => (
                <View key={alert.id} style={styles.alertItem}>
                  <View style={styles.alertHeader}>
                    <View style={styles.alertInfo}>
                      <View style={[
                        styles.severityBadge,
                        { backgroundColor: getSeverityColor(alert.severity) }
                      ]}>
                        <Text style={styles.severityText}>{alert.severity}</Text>
                      </View>
                      <Text style={styles.alertType}>{alert.type}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.resolveButton}
                      onPress={() => resolveAlert(alert.id)}
                    >
                      <Text style={styles.resolveButtonText}>Resolve</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <Text style={styles.alertTime}>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Compliance Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compliance Checks</Text>
          <View style={styles.complianceGrid}>
            {complianceChecks.map((check) => (
              <View key={check.id} style={styles.complianceCard}>
                <View style={styles.complianceHeader}>
                  {getStatusIcon(check.status)}
                  <Text style={styles.complianceName}>{check.name}</Text>
                </View>
                <Text style={styles.complianceDescription}>{check.description}</Text>
                <Text style={styles.complianceTime}>
                  Last check: {new Date(check.lastCheck).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Production Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Production Controls</Text>
          <View style={styles.controlsGrid}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={enableProductionFeatures}
            >
              <Settings size={20} color="#fff" />
              <Text style={styles.controlButtonText}>Enable Production Features</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.controlButton}
              onPress={generateComplianceReport}
            >
              <FileText size={20} color="#fff" />
              <Text style={styles.controlButtonText}>Generate Report</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Phase 4 Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phase 4 Features</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Zap size={16} color="#4CAF50" />
              <Text style={styles.featureText}>SLO monitoring for latency, consumption, and offload rates</Text>
            </View>
            <View style={styles.featureItem}>
              <AlertTriangle size={16} color="#FF9800" />
              <Text style={styles.featureText}>Real-time alerting with severity levels</Text>
            </View>
            <View style={styles.featureItem}>
              <Shield size={16} color="#2196F3" />
              <Text style={styles.featureText}>Compliance tracking (GDPR, encryption, audit logs)</Text>
            </View>
            <View style={styles.featureItem}>
              <Activity size={16} color="#9C27B0" />
              <Text style={styles.featureText}>Circuit breaker and rate limiting</Text>
            </View>
            <View style={styles.featureItem}>
              <FileText size={16} color="#607D8B" />
              <Text style={styles.featureText}>Automated compliance reporting</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  content: {
    flex: 1,
    padding: 16
  },
  header: {
    marginBottom: 24
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    lineHeight: 22
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  monitoringStatus: {
    fontSize: 14,
    color: '#888'
  },
  metricGroup: {
    marginBottom: 16
  },
  metricGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  metricLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  metricTarget: {
    fontSize: 10,
    color: '#666',
    marginTop: 2
  },
  resourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  resourceCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  resourceLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    marginBottom: 4
  },
  resourceValue: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  resourceTarget: {
    fontSize: 10,
    color: '#666',
    marginTop: 4
  },
  alertsList: {
    gap: 12
  },
  alertItem: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  severityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  alertType: {
    color: '#888',
    fontSize: 12,
    textTransform: 'capitalize'
  },
  resolveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  resolveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  alertMessage: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4
  },
  alertTime: {
    color: '#666',
    fontSize: 12
  },
  complianceGrid: {
    gap: 12
  },
  complianceCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  complianceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  complianceName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  complianceDescription: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8
  },
  complianceTime: {
    color: '#666',
    fontSize: 12
  },
  controlsGrid: {
    flexDirection: 'row',
    gap: 12
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  featuresList: {
    gap: 12
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333'
  },
  featureText: {
    color: '#fff',
    fontSize: 14,
    flex: 1
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    gap: 8
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16
  }
});