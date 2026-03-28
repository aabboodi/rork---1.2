import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Settings, Eye, EyeOff } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { CSPMiddleware, type CSPMetrics, type CSPViolationReport, type RouteCSPConfig } from '@/services/security/CSPMiddleware';
import { WAFService } from '@/services/security/WAFService';
import { APISecurityMiddleware } from '@/services/security/APISecurityMiddleware';

interface CSPDashboardProps {
  onClose?: () => void;
}

export default function CSPDashboard({ onClose }: CSPDashboardProps) {
  const [cspMetrics, setCSPMetrics] = useState<CSPMetrics | null>(null);
  const [violations, setViolations] = useState<CSPViolationReport[]>([]);
  const [routeConfigs, setRouteConfigs] = useState<RouteCSPConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'violations' | 'routes' | 'settings'>('overview');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    loadCSPData();
    const interval = setInterval(loadCSPData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadCSPData = async () => {
    try {
      const apiMiddleware = APISecurityMiddleware.getInstance();
      const cspMiddleware = apiMiddleware.getCSPMiddleware();
      
      const metrics = cspMiddleware.getCSPMetrics();
      const violationReports = cspMiddleware.getViolationReports(50);
      const configs = cspMiddleware.getRouteConfigurations();
      
      setCSPMetrics(metrics);
      setViolations(violationReports);
      setRouteConfigs(configs);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load CSP data:', error);
      setLoading(false);
    }
  };

  const handleClearViolations = async () => {
    Alert.alert(
      'Clear Violations',
      'Are you sure you want to clear all CSP violation reports?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const apiMiddleware = APISecurityMiddleware.getInstance();
              const cspMiddleware = apiMiddleware.getCSPMiddleware();
              await cspMiddleware.clearViolationReports();
              await loadCSPData();
            } catch (error) {
              console.error('Failed to clear violations:', error);
            }
          }
        }
      ]
    );
  };

  const handleResetMetrics = async () => {
    Alert.alert(
      'Reset Metrics',
      'Are you sure you want to reset all CSP metrics?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const apiMiddleware = APISecurityMiddleware.getInstance();
              const cspMiddleware = apiMiddleware.getCSPMiddleware();
              await cspMiddleware.resetMetrics();
              await loadCSPData();
            } catch (error) {
              console.error('Failed to reset metrics:', error);
            }
          }
        }
      ]
    );
  };

  const renderOverview = () => {
    if (!cspMetrics) return null;

    const violationRate = cspMetrics.totalRequests > 0 
      ? ((cspMetrics.violationsBlocked / cspMetrics.totalRequests) * 100).toFixed(2)
      : '0';

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CSP Overview</Text>
        
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Shield size={24} color={Colors.primary} />
            <Text style={styles.metricValue}>{cspMetrics.totalRequests}</Text>
            <Text style={styles.metricLabel}>Total Requests</Text>
          </View>
          
          <View style={styles.metricCard}>
            <XCircle size={24} color={Colors.error} />
            <Text style={styles.metricValue}>{cspMetrics.violationsBlocked}</Text>
            <Text style={styles.metricLabel}>Violations Blocked</Text>
          </View>
          
          <View style={styles.metricCard}>
            <CheckCircle size={24} color={Colors.success} />
            <Text style={styles.metricValue}>{cspMetrics.policiesApplied}</Text>
            <Text style={styles.metricLabel}>Policies Applied</Text>
          </View>
          
          <View style={styles.metricCard}>
            <Shield size={24} color={Colors.warning} />
            <Text style={styles.metricValue}>{cspMetrics.nonceGenerated}</Text>
            <Text style={styles.metricLabel}>Nonces Generated</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Security Statistics</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Violation Rate:</Text>
            <Text style={[styles.statValue, { color: parseFloat(violationRate) > 5 ? Colors.error : Colors.success }]}>
              {violationRate}%
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Last Violation:</Text>
            <Text style={styles.statValue}>
              {cspMetrics.lastViolation > 0 
                ? new Date(cspMetrics.lastViolation).toLocaleString()
                : 'None'
              }
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Route Configs:</Text>
            <Text style={styles.statValue}>{routeConfigs.length}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderViolations = () => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>CSP Violations</Text>
          <TouchableOpacity onPress={handleClearViolations} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
        
        {violations.length === 0 ? (
          <View style={styles.emptyState}>
            <CheckCircle size={48} color={Colors.success} />
            <Text style={styles.emptyStateText}>No CSP violations detected</Text>
          </View>
        ) : (
          <ScrollView style={styles.violationsList}>
            {violations.map((violation, index) => (
              <View key={index} style={styles.violationCard}>
                <View style={styles.violationHeader}>
                  <AlertTriangle size={20} color={Colors.error} />
                  <Text style={styles.violationDirective}>{violation['violated-directive']}</Text>
                  <Text style={styles.violationTime}>
                    {new Date().toLocaleTimeString()}
                  </Text>
                </View>
                
                <Text style={styles.violationUri} numberOfLines={1}>
                  {violation['document-uri']}
                </Text>
                
                {violation['blocked-uri'] && (
                  <Text style={styles.violationBlocked} numberOfLines={1}>
                    Blocked: {violation['blocked-uri']}
                  </Text>
                )}
                
                <TouchableOpacity
                  onPress={() => setShowDetails(showDetails === `violation-${index}` ? null : `violation-${index}`)}
                  style={styles.detailsToggle}
                >
                  <Text style={styles.detailsToggleText}>
                    {showDetails === `violation-${index}` ? 'Hide Details' : 'Show Details'}
                  </Text>
                  {showDetails === `violation-${index}` ? 
                    <EyeOff size={16} color={Colors.primary} /> : 
                    <Eye size={16} color={Colors.primary} />
                  }
                </TouchableOpacity>
                
                {showDetails === `violation-${index}` && (
                  <View style={styles.violationDetails}>
                    <Text style={styles.detailLabel}>Effective Directive:</Text>
                    <Text style={styles.detailValue}>{violation['effective-directive']}</Text>
                    
                    <Text style={styles.detailLabel}>Source File:</Text>
                    <Text style={styles.detailValue}>{violation['source-file'] || 'N/A'}</Text>
                    
                    <Text style={styles.detailLabel}>Line Number:</Text>
                    <Text style={styles.detailValue}>{violation['line-number'] || 'N/A'}</Text>
                    
                    <Text style={styles.detailLabel}>Disposition:</Text>
                    <Text style={styles.detailValue}>{violation['disposition']}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderRoutes = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route Configurations</Text>
        
        <ScrollView style={styles.routesList}>
          {routeConfigs.map((config, index) => (
            <View key={config.route} style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <Text style={styles.routePath}>{config.route}</Text>
                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(config.riskLevel) }]}>
                  <Text style={styles.riskText}>{config.riskLevel.toUpperCase()}</Text>
                </View>
              </View>
              
              <Text style={styles.routeDescription}>{config.description}</Text>
              
              <View style={styles.routeStats}>
                <Text style={styles.routeStat}>Priority: {config.priority}</Text>
                <Text style={styles.routeStat}>Nonce: {config.nonce ? 'Yes' : 'No'}</Text>
                <Text style={styles.routeStat}>Report Only: {config.reportOnly ? 'Yes' : 'No'}</Text>
              </View>
              
              <TouchableOpacity
                onPress={() => setShowDetails(showDetails === `route-${index}` ? null : `route-${index}`)}
                style={styles.detailsToggle}
              >
                <Text style={styles.detailsToggleText}>
                  {showDetails === `route-${index}` ? 'Hide Policy' : 'Show Policy'}
                </Text>
                {showDetails === `route-${index}` ? 
                  <EyeOff size={16} color={Colors.primary} /> : 
                  <Eye size={16} color={Colors.primary} />
                }
              </TouchableOpacity>
              
              {showDetails === `route-${index}` && (
                <View style={styles.policyDetails}>
                  {Object.entries(config.policy).map(([directive, values]) => (
                    <View key={directive} style={styles.policyDirective}>
                      <Text style={styles.directiveName}>{directive}:</Text>
                      <Text style={styles.directiveValue}>
                        {Array.isArray(values) ? values.join(' ') : values.toString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSettings = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CSP Settings</Text>
        
        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Management Actions</Text>
          
          <TouchableOpacity onPress={loadCSPData} style={styles.actionButton}>
            <RefreshCw size={20} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Refresh Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleResetMetrics} style={styles.actionButton}>
            <Settings size={20} color={Colors.warning} />
            <Text style={styles.actionButtonText}>Reset Metrics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleClearViolations} style={styles.actionButton}>
            <XCircle size={20} color={Colors.error} />
            <Text style={styles.actionButtonText}>Clear Violations</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>CSP Information</Text>
          <Text style={styles.infoText}>
            Content Security Policy (CSP) helps prevent XSS attacks by controlling which resources 
            can be loaded and executed on your web pages. This dashboard shows real-time CSP 
            metrics and violations for different routes in your application.
          </Text>
        </View>
      </View>
    );
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return Colors.error;
      case 'high': return '#FF6B35';
      case 'medium': return Colors.warning;
      case 'low': return Colors.success;
      default: return Colors.medium;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <RefreshCw size={32} color={Colors.primary} />
          <Text style={styles.loadingText}>Loading CSP Dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>CSP Dashboard</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XCircle size={24} color={Colors.medium} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabBar}>
        {[
          { key: 'overview', label: 'Overview', icon: Shield },
          { key: 'violations', label: 'Violations', icon: AlertTriangle },
          { key: 'routes', label: 'Routes', icon: Settings },
          { key: 'settings', label: 'Settings', icon: Settings }
        ].map(({ key, label, icon: Icon }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setSelectedTab(key as any)}
            style={[styles.tab, selectedTab === key && styles.activeTab]}
          >
            <Icon size={20} color={selectedTab === key ? Colors.primary : Colors.medium} />
            <Text style={[styles.tabText, selectedTab === key && styles.activeTabText]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'violations' && renderViolations()}
        {selectedTab === 'routes' && renderRoutes()}
        {selectedTab === 'settings' && renderSettings()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.medium,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.light,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.medium,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 16,
  },
  clearButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.medium,
    textAlign: 'center',
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.medium,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.medium,
  },
  violationsList: {
    maxHeight: 400,
  },
  violationCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  violationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  violationDirective: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginLeft: 8,
  },
  violationTime: {
    fontSize: 12,
    color: Colors.medium,
  },
  violationUri: {
    fontSize: 12,
    color: Colors.medium,
    marginBottom: 4,
  },
  violationBlocked: {
    fontSize: 12,
    color: Colors.error,
    marginBottom: 8,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  detailsToggleText: {
    fontSize: 12,
    color: Colors.primary,
    marginRight: 4,
  },
  violationDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
    marginTop: 8,
  },
  detailValue: {
    fontSize: 12,
    color: Colors.medium,
    marginTop: 2,
  },
  routesList: {
    maxHeight: 500,
  },
  routeCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routePath: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  routeDescription: {
    fontSize: 12,
    color: Colors.medium,
    marginBottom: 8,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  routeStat: {
    fontSize: 11,
    color: Colors.medium,
  },
  policyDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  policyDirective: {
    marginBottom: 8,
  },
  directiveName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
  },
  directiveValue: {
    fontSize: 11,
    color: Colors.medium,
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.light,
    marginBottom: 8,
  },
  actionButtonText: {
    marginLeft: 12,
    fontSize: 14,
    color: Colors.dark,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.medium,
    lineHeight: 20,
  },
});