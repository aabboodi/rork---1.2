import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { Shield, AlertTriangle, Eye, Settings, TrendingUp, Users, FileText, Lock, CheckCircle, XCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import DLPService from '@/services/security/DLPService';
import type { DLPViolation, DLPPolicy, DLPConfiguration } from '@/services/security/DLPService';

interface DLPDashboardProps {
  onClose?: () => void;
}

export default function DLPDashboard({ onClose }: DLPDashboardProps) {
  const [dlpService] = useState(() => DLPService.getInstance());
  const [violations, setViolations] = useState<DLPViolation[]>([]);
  const [policies, setPolicies] = useState<DLPPolicy[]>([]);
  const [configuration, setConfiguration] = useState<DLPConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'violations' | 'policies' | 'settings'>('overview');

  useEffect(() => {
    loadDLPData();
  }, []);

  const loadDLPData = async () => {
    try {
      setLoading(true);
      
      // Load recent violations (last 7 days)
      const timeRange = {
        start: Date.now() - 7 * 24 * 60 * 60 * 1000,
        end: Date.now()
      };
      
      const recentViolations = await dlpService.getViolations({ timeRange });
      setViolations(recentViolations);
      
      // Load policies
      const allPolicies = dlpService.getPolicies();
      setPolicies(allPolicies);
      
      // Load configuration
      const config = dlpService.getConfiguration();
      setConfiguration(config);
      
    } catch (error) {
      console.error('Failed to load DLP data:', error);
      Alert.alert('Error', 'Failed to load DLP data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDLP = async (enabled: boolean) => {
    try {
      if (enabled) {
        await dlpService.enableDLP();
      } else {
        await dlpService.disableDLP();
      }
      await loadDLPData();
    } catch (error) {
      console.error('Failed to toggle DLP:', error);
      Alert.alert('Error', 'Failed to update DLP settings');
    }
  };

  const handleTogglePolicy = async (policyId: string, enabled: boolean) => {
    try {
      await dlpService.updatePolicy(policyId, { enabled });
      await loadDLPData();
    } catch (error) {
      console.error('Failed to update policy:', error);
      Alert.alert('Error', 'Failed to update policy');
    }
  };

  const handleResolveViolation = async (violationId: string) => {
    try {
      await dlpService.resolveViolation(violationId, 'admin');
      await loadDLPData();
    } catch (error) {
      console.error('Failed to resolve violation:', error);
      Alert.alert('Error', 'Failed to resolve violation');
    }
  };

  const renderOverview = () => {
    const dlpStatus = dlpService.getDLPStatus();
    const criticalViolations = violations.filter(v => v.severity === 'critical').length;
    const highViolations = violations.filter(v => v.severity === 'high').length;
    const blockedContent = violations.filter(v => v.action === 'blocked').length;
    const enabledPolicies = policies.filter(p => p.enabled).length;

    return (
      <ScrollView style={styles.tabContent}>
        {/* Status Cards */}
        <View style={styles.statusGrid}>
          <View style={[styles.statusCard, { backgroundColor: dlpStatus.enabled ? Colors.success + '20' : Colors.error + '20' }]}>
            <Shield size={24} color={dlpStatus.enabled ? Colors.success : Colors.error} />
            <Text style={styles.statusTitle}>DLP Status</Text>
            <Text style={[styles.statusValue, { color: dlpStatus.enabled ? Colors.success : Colors.error }]}>
              {dlpStatus.enabled ? 'Active' : 'Disabled'}
            </Text>
          </View>

          <View style={styles.statusCard}>
            <AlertTriangle size={24} color={Colors.error} />
            <Text style={styles.statusTitle}>Critical Violations</Text>
            <Text style={[styles.statusValue, { color: Colors.error }]}>{criticalViolations}</Text>
          </View>

          <View style={styles.statusCard}>
            <XCircle size={24} color={Colors.warning} />
            <Text style={styles.statusTitle}>Blocked Content</Text>
            <Text style={[styles.statusValue, { color: Colors.warning }]}>{blockedContent}</Text>
          </View>

          <View style={styles.statusCard}>
            <FileText size={24} color={Colors.primary} />
            <Text style={styles.statusTitle}>Active Policies</Text>
            <Text style={[styles.statusValue, { color: Colors.primary }]}>{enabledPolicies}</Text>
          </View>
        </View>

        {/* Recent Violations Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Violations (Last 7 Days)</Text>
          {violations.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={48} color={Colors.success} />
              <Text style={styles.emptyText}>No violations detected</Text>
              <Text style={styles.emptySubtext}>Your data is well protected</Text>
            </View>
          ) : (
            <View style={styles.violationsList}>
              {violations.slice(0, 5).map((violation) => (
                <View key={violation.id} style={styles.violationItem}>
                  <View style={styles.violationHeader}>
                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(violation.severity) }]}>
                      <Text style={styles.severityText}>{violation.severity.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.violationCategory}>{violation.category.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.violationContent} numberOfLines={2}>
                    {violation.redactedContent}
                  </Text>
                  <Text style={styles.violationTime}>
                    {new Date(violation.timestamp).toLocaleString()}
                  </Text>
                </View>
              ))}
              {violations.length > 5 && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => setSelectedTab('violations')}
                >
                  <Text style={styles.viewAllText}>View All Violations</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Policy Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Policy Status</Text>
          <View style={styles.policiesList}>
            {policies.slice(0, 3).map((policy) => (
              <View key={policy.id} style={styles.policyItem}>
                <View style={styles.policyHeader}>
                  <Text style={styles.policyName}>{policy.name}</Text>
                  <View style={[styles.policyStatus, { backgroundColor: policy.enabled ? Colors.success : Colors.error }]}>
                    <Text style={styles.policyStatusText}>
                      {policy.enabled ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.policyDescription}>{policy.description}</Text>
              </View>
            ))}
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => setSelectedTab('policies')}
            >
              <Text style={styles.viewAllText}>Manage All Policies</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderViolations = () => {
    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Violations</Text>
          {violations.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={48} color={Colors.success} />
              <Text style={styles.emptyText}>No violations found</Text>
            </View>
          ) : (
            <View style={styles.violationsList}>
              {violations.map((violation) => (
                <View key={violation.id} style={styles.violationDetailItem}>
                  <View style={styles.violationDetailHeader}>
                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(violation.severity) }]}>
                      <Text style={styles.severityText}>{violation.severity.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.violationCategory}>{violation.category.toUpperCase()}</Text>
                    <Text style={styles.violationAction}>{violation.action.toUpperCase()}</Text>
                  </View>
                  
                  <Text style={styles.violationContent}>
                    Original: {violation.content.substring(0, 100)}...
                  </Text>
                  <Text style={styles.violationRedacted}>
                    Redacted: {violation.redactedContent.substring(0, 100)}...
                  </Text>
                  
                  <View style={styles.violationMatches}>
                    <Text style={styles.matchesTitle}>Matches ({violation.matches.length}):</Text>
                    {violation.matches.map((match, index) => (
                      <Text key={index} style={styles.matchText}>
                        • {match.matchedText} (confidence: {(match.confidence * 100).toFixed(0)}%)
                      </Text>
                    ))}
                  </View>
                  
                  <View style={styles.violationFooter}>
                    <Text style={styles.violationTime}>
                      {new Date(violation.timestamp).toLocaleString()}
                    </Text>
                    {!violation.resolved && (
                      <TouchableOpacity 
                        style={styles.resolveButton}
                        onPress={() => handleResolveViolation(violation.id)}
                      >
                        <Text style={styles.resolveButtonText}>Resolve</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderPolicies = () => {
    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DLP Policies</Text>
          <View style={styles.policiesList}>
            {policies.map((policy) => (
              <View key={policy.id} style={styles.policyDetailItem}>
                <View style={styles.policyDetailHeader}>
                  <View style={styles.policyInfo}>
                    <Text style={styles.policyName}>{policy.name}</Text>
                    <Text style={styles.policyDescription}>{policy.description}</Text>
                  </View>
                  <Switch
                    value={policy.enabled}
                    onValueChange={(enabled) => handleTogglePolicy(policy.id, enabled)}
                    trackColor={{ false: Colors.light, true: Colors.primary + '50' }}
                    thumbColor={policy.enabled ? Colors.primary : Colors.medium}
                  />
                </View>
                
                <View style={styles.policyDetails}>
                  <View style={styles.policyMeta}>
                    <Text style={styles.policyMetaText}>Severity: {policy.severity.toUpperCase()}</Text>
                    <Text style={styles.policyMetaText}>Action: {policy.action.toUpperCase()}</Text>
                    <Text style={styles.policyMetaText}>Scope: {policy.scope.toUpperCase()}</Text>
                  </View>
                  
                  <Text style={styles.rulesTitle}>Rules ({policy.rules.length}):</Text>
                  {policy.rules.map((rule) => (
                    <View key={rule.id} style={styles.ruleItem}>
                      <Text style={styles.ruleName}>{rule.description}</Text>
                      <Text style={styles.rulePattern}>Pattern: {rule.pattern.substring(0, 50)}...</Text>
                      <Text style={styles.ruleConfidence}>
                        Confidence: {(rule.confidence * 100).toFixed(0)}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderSettings = () => {
    if (!configuration) return null;

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DLP Configuration</Text>
          
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Enable DLP</Text>
                <Text style={styles.settingDescription}>Enable or disable Data Loss Prevention</Text>
              </View>
              <Switch
                value={configuration.enabled}
                onValueChange={handleToggleDLP}
                trackColor={{ false: Colors.light, true: Colors.primary + '50' }}
                thumbColor={configuration.enabled ? Colors.primary : Colors.medium}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Strict Mode</Text>
                <Text style={styles.settingDescription}>Block content by default when scanning fails</Text>
              </View>
              <Switch
                value={configuration.strictMode}
                onValueChange={(value) => dlpService.updateConfiguration({ strictMode: value })}
                trackColor={{ false: Colors.light, true: Colors.primary + '50' }}
                thumbColor={configuration.strictMode ? Colors.primary : Colors.medium}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Auto Quarantine</Text>
                <Text style={styles.settingDescription}>Automatically quarantine suspicious content</Text>
              </View>
              <Switch
                value={configuration.autoQuarantine}
                onValueChange={(value) => dlpService.updateConfiguration({ autoQuarantine: value })}
                trackColor={{ false: Colors.light, true: Colors.primary + '50' }}
                thumbColor={configuration.autoQuarantine ? Colors.primary : Colors.medium}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>User Override</Text>
                <Text style={styles.settingDescription}>Allow users to override DLP decisions</Text>
              </View>
              <Switch
                value={configuration.userOverrideAllowed}
                onValueChange={(value) => dlpService.updateConfiguration({ userOverrideAllowed: value })}
                trackColor={{ false: Colors.light, true: Colors.primary + '50' }}
                thumbColor={configuration.userOverrideAllowed ? Colors.primary : Colors.medium}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Encrypt Sensitive Data</Text>
                <Text style={styles.settingDescription}>Automatically encrypt detected sensitive content</Text>
              </View>
              <Switch
                value={configuration.encryptSensitiveData}
                onValueChange={(value) => dlpService.updateConfiguration({ encryptSensitiveData: value })}
                trackColor={{ false: Colors.light, true: Colors.primary + '50' }}
                thumbColor={configuration.encryptSensitiveData ? Colors.primary : Colors.medium}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Real-time Scanning</Text>
                <Text style={styles.settingDescription}>Scan content as users type</Text>
              </View>
              <Switch
                value={configuration.realTimeScanning}
                onValueChange={(value) => dlpService.updateConfiguration({ realTimeScanning: value })}
                trackColor={{ false: Colors.light, true: Colors.primary + '50' }}
                thumbColor={configuration.realTimeScanning ? Colors.primary : Colors.medium}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Attachment Scanning</Text>
                <Text style={styles.settingDescription}>Scan file attachments for sensitive content</Text>
              </View>
              <Switch
                value={configuration.attachmentScanning}
                onValueChange={(value) => dlpService.updateConfiguration({ attachmentScanning: value })}
                trackColor={{ false: Colors.light, true: Colors.primary + '50' }}
                thumbColor={configuration.attachmentScanning ? Colors.primary : Colors.medium}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return Colors.error;
      case 'high': return Colors.warning;
      case 'medium': return Colors.primary;
      case 'low': return Colors.success;
      default: return Colors.medium;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading DLP Dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DLP Dashboard</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
          onPress={() => setSelectedTab('overview')}
        >
          <TrendingUp size={16} color={selectedTab === 'overview' ? Colors.primary : Colors.medium} />
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'violations' && styles.activeTab]}
          onPress={() => setSelectedTab('violations')}
        >
          <AlertTriangle size={16} color={selectedTab === 'violations' ? Colors.primary : Colors.medium} />
          <Text style={[styles.tabText, selectedTab === 'violations' && styles.activeTabText]}>
            Violations
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'policies' && styles.activeTab]}
          onPress={() => setSelectedTab('policies')}
        >
          <FileText size={16} color={selectedTab === 'policies' ? Colors.primary : Colors.medium} />
          <Text style={[styles.tabText, selectedTab === 'policies' && styles.activeTabText]}>
            Policies
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'settings' && styles.activeTab]}
          onPress={() => setSelectedTab('settings')}
        >
          <Settings size={16} color={selectedTab === 'settings' ? Colors.primary : Colors.medium} />
          <Text style={[styles.tabText, selectedTab === 'settings' && styles.activeTabText]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {selectedTab === 'overview' && renderOverview()}
      {selectedTab === 'violations' && renderViolations()}
      {selectedTab === 'policies' && renderPolicies()}
      {selectedTab === 'settings' && renderSettings()}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.medium,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.medium,
  },
  tabsContainer: {
    flexDirection: 'row',
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
    fontSize: 12,
    fontWeight: '500',
    color: Colors.medium,
    marginLeft: 4,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statusCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.light,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 12,
    color: Colors.medium,
    marginTop: 8,
    textAlign: 'center',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.medium,
    marginTop: 4,
  },
  violationsList: {
    gap: 12,
  },
  violationItem: {
    backgroundColor: Colors.light,
    padding: 12,
    borderRadius: 8,
  },
  violationDetailItem: {
    backgroundColor: Colors.light,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  violationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  violationDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  violationCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  violationAction: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
  },
  violationContent: {
    fontSize: 14,
    color: Colors.dark,
    marginBottom: 4,
  },
  violationRedacted: {
    fontSize: 14,
    color: Colors.medium,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  violationMatches: {
    marginBottom: 8,
  },
  matchesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  matchText: {
    fontSize: 11,
    color: Colors.medium,
    marginLeft: 8,
  },
  violationTime: {
    fontSize: 11,
    color: Colors.medium,
  },
  violationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resolveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resolveButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  policiesList: {
    gap: 12,
  },
  policyItem: {
    backgroundColor: Colors.light,
    padding: 12,
    borderRadius: 8,
  },
  policyDetailItem: {
    backgroundColor: Colors.light,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  policyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  policyDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  policyInfo: {
    flex: 1,
    marginRight: 12,
  },
  policyName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  policyDescription: {
    fontSize: 12,
    color: Colors.medium,
    marginTop: 2,
  },
  policyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  policyStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  policyDetails: {
    marginTop: 8,
  },
  policyMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  policyMetaText: {
    fontSize: 11,
    color: Colors.medium,
  },
  rulesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  ruleItem: {
    backgroundColor: Colors.background,
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  ruleName: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.dark,
  },
  rulePattern: {
    fontSize: 10,
    color: Colors.medium,
    fontFamily: 'monospace',
  },
  ruleConfidence: {
    fontSize: 10,
    color: Colors.primary,
  },
  settingsList: {
    gap: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light,
    padding: 16,
    borderRadius: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.medium,
    marginTop: 2,
  },
});