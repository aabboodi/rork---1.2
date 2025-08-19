import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Shield, 
  GitBranch, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Activity,
  TrendingUp,
  Settings,
  Play,
  Pause
} from 'lucide-react-native';
import { DevSecOpsIntegrationService, DevSecOpsMetrics, SecurityPipeline } from '@/services/security/DevSecOpsIntegrationService';

export const DevSecOpsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DevSecOpsMetrics>({
    deploymentSecurity: 0,
    vulnerabilityCount: 0,
    complianceScore: 0,
    automatedTestsPassed: 0,
    securityGatesPassed: 0,
    incidentResponseTime: 0
  });
  const [pipelines, setPipelines] = useState<SecurityPipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);

  useEffect(() => {
    loadDevSecOpsData();
    const interval = setInterval(loadDevSecOpsData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadDevSecOpsData = async () => {
    try {
      const [devSecOpsMetrics, securityPipelines] = await Promise.all([
        DevSecOpsIntegrationService.getDevSecOpsMetrics(),
        DevSecOpsIntegrationService.getPipelines()
      ]);
      
      setMetrics(devSecOpsMetrics);
      setPipelines(securityPipelines);
    } catch (error) {
      console.error('Failed to load DevSecOps data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPipeline = async (pipelineId: string) => {
    try {
      setLoading(true);
      await DevSecOpsIntegrationService.runSecurityPipeline(pipelineId);
      await loadDevSecOpsData();
      Alert.alert('Success', 'Security pipeline executed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to run security pipeline');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return '#00AA00';
      case 'failed': return '#FF4444';
      case 'running': return '#007AFF';
      case 'blocked': return '#FF8800';
      default: return '#666666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return CheckCircle;
      case 'failed': return XCircle;
      case 'running': return Activity;
      case 'blocked': return AlertTriangle;
      default: return Clock;
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={32} color="#007AFF" />
        <Text style={styles.loadingText}>Loading DevSecOps Dashboard...</Text>
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
          <GitBranch size={28} color="#00D4FF" />
          <Text style={styles.headerTitle}>DevSecOps Integration</Text>
          <Text style={styles.headerSubtitle}>Security-First Development Pipeline</Text>
        </View>
      </LinearGradient>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Shield size={24} color="#00AA00" />
          <Text style={styles.metricValue}>{metrics.deploymentSecurity}%</Text>
          <Text style={styles.metricLabel}>Deployment Security</Text>
        </View>
        
        <View style={styles.metricCard}>
          <AlertTriangle size={24} color="#FF8800" />
          <Text style={styles.metricValue}>{metrics.vulnerabilityCount}</Text>
          <Text style={styles.metricLabel}>Vulnerabilities</Text>
        </View>
        
        <View style={styles.metricCard}>
          <CheckCircle size={24} color="#007AFF" />
          <Text style={styles.metricValue}>{metrics.complianceScore}%</Text>
          <Text style={styles.metricLabel}>Compliance Score</Text>
        </View>
        
        <View style={styles.metricCard}>
          <TrendingUp size={24} color="#00D4FF" />
          <Text style={styles.metricValue}>{metrics.automatedTestsPassed}</Text>
          <Text style={styles.metricLabel}>Tests Passed</Text>
        </View>
      </View>

      {/* Additional Metrics */}
      <View style={styles.additionalMetrics}>
        <View style={styles.additionalMetricCard}>
          <Settings size={20} color="#007AFF" />
          <Text style={styles.additionalMetricLabel}>Security Gates Passed</Text>
          <Text style={styles.additionalMetricValue}>{metrics.securityGatesPassed}</Text>
        </View>
        
        <View style={styles.additionalMetricCard}>
          <Clock size={20} color="#FF8800" />
          <Text style={styles.additionalMetricLabel}>Avg Response Time</Text>
          <Text style={styles.additionalMetricValue}>{metrics.incidentResponseTime}m</Text>
        </View>
      </View>

      {/* Security Pipelines */}
      <View style={styles.pipelinesSection}>
        <Text style={styles.sectionTitle}>Security Pipelines</Text>
        
        {pipelines.map((pipeline) => {
          const StatusIcon = getStatusIcon(pipeline.status);
          const isExpanded = selectedPipeline === pipeline.id;
          
          return (
            <View key={pipeline.id} style={styles.pipelineCard}>
              <TouchableOpacity
                style={styles.pipelineHeader}
                onPress={() => setSelectedPipeline(isExpanded ? null : pipeline.id)}
              >
                <View style={styles.pipelineInfo}>
                  <StatusIcon size={20} color={getStatusColor(pipeline.status)} />
                  <View style={styles.pipelineDetails}>
                    <Text style={styles.pipelineName}>{pipeline.name}</Text>
                    <Text style={styles.pipelineStage}>{pipeline.stage}</Text>
                  </View>
                </View>
                
                <View style={styles.pipelineActions}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(pipeline.status) }
                  ]}>
                    <Text style={styles.statusText}>{pipeline.status.toUpperCase()}</Text>
                  </View>
                  
                  {pipeline.status !== 'running' && (
                    <TouchableOpacity
                      style={styles.runButton}
                      onPress={() => handleRunPipeline(pipeline.id)}
                    >
                      <Play size={16} color="#007AFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={styles.pipelineExpanded}>
                  <Text style={styles.checksTitle}>Security Checks</Text>
                  
                  {pipeline.securityChecks.map((check) => (
                    <View key={check.id} style={styles.checkItem}>
                      <View style={styles.checkHeader}>
                        <View style={styles.checkInfo}>
                          <CheckCircle 
                            size={16} 
                            color={getStatusColor(check.status)} 
                          />
                          <Text style={styles.checkName}>{check.name}</Text>
                        </View>
                        
                        <View style={styles.checkMeta}>
                          <Text style={styles.checkDuration}>{check.duration}ms</Text>
                          <View style={[
                            styles.checkTypeBadge,
                            { backgroundColor: '#E5E5E5' }
                          ]}>
                            <Text style={styles.checkTypeText}>{check.type.toUpperCase()}</Text>
                          </View>
                        </View>
                      </View>
                      
                      {check.findings.length > 0 && (
                        <View style={styles.findingsSection}>
                          <Text style={styles.findingsTitle}>
                            Findings ({check.findings.length})
                          </Text>
                          
                          {check.findings.slice(0, 3).map((finding) => (
                            <View key={finding.id} style={styles.findingItem}>
                              <View style={[
                                styles.severityDot,
                                { backgroundColor: getSeverityColor(finding.severity) }
                              ]} />
                              <View style={styles.findingContent}>
                                <Text style={styles.findingTitle}>{finding.title}</Text>
                                <Text style={styles.findingDescription}>
                                  {finding.description}
                                </Text>
                                {finding.file && (
                                  <Text style={styles.findingFile}>
                                    {finding.file}:{finding.line}
                                  </Text>
                                )}
                              </View>
                            </View>
                          ))}
                          
                          {check.findings.length > 3 && (
                            <Text style={styles.moreFindings}>
                              +{check.findings.length - 3} more findings
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                  
                  <Text style={styles.pipelineTimestamp}>
                    Last run: {pipeline.timestamp.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
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
  additionalMetrics: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 12
  },
  additionalMetricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  additionalMetricLabel: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
    flex: 1
  },
  additionalMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e'
  },
  pipelinesSection: {
    margin: 16,
    marginTop: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12
  },
  pipelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  pipelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16
  },
  pipelineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  pipelineDetails: {
    marginLeft: 12
  },
  pipelineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e'
  },
  pipelineStage: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2
  },
  pipelineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
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
  runButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E5F3FF'
  },
  pipelineExpanded: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    padding: 16,
    paddingTop: 12
  },
  checksTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12
  },
  checkItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  checkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  checkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  checkName: {
    fontSize: 14,
    color: '#1a1a2e',
    marginLeft: 8
  },
  checkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  checkDuration: {
    fontSize: 12,
    color: '#666666'
  },
  checkTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  checkTypeText: {
    fontSize: 10,
    color: '#666666'
  },
  findingsSection: {
    marginTop: 8
  },
  findingsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 8
  },
  findingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 8
  },
  findingContent: {
    flex: 1
  },
  findingTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 2
  },
  findingDescription: {
    fontSize: 11,
    color: '#666666',
    lineHeight: 16,
    marginBottom: 2
  },
  findingFile: {
    fontSize: 10,
    color: '#007AFF',
    fontFamily: 'monospace'
  },
  moreFindings: {
    fontSize: 11,
    color: '#007AFF',
    fontStyle: 'italic',
    marginTop: 4
  },
  pipelineTimestamp: {
    fontSize: 11,
    color: '#999999',
    marginTop: 12,
    textAlign: 'right'
  }
});