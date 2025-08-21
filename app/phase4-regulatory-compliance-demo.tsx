import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { 
  Shield, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Trash2,
  Download,
  Edit,
  Search,
  Calendar,
  Lock,
  Unlock,
  Settings,
  BarChart3
} from 'lucide-react-native';
import RegulatoryComplianceService, { 
  DataRetentionPolicy, 
  UserDataRequest, 
  TransparencyReport, 
  ComplianceAudit,
  ConsentRecord 
} from '@/services/governance/RegulatoryComplianceService';

const complianceService = new RegulatoryComplianceService();

export default function Phase4RegulatoryComplianceDemo() {
  const [retentionPolicies, setRetentionPolicies] = useState<DataRetentionPolicy[]>([]);
  const [userDataRequests, setUserDataRequests] = useState<UserDataRequest[]>([]);
  const [transparencyReports, setTransparencyReports] = useState<TransparencyReport[]>([]);
  const [complianceAudits, setComplianceAudits] = useState<ComplianceAudit[]>([]);
  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'policies' | 'requests' | 'reports' | 'audits' | 'consents'>('policies');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
    
    // Set up event listeners
    const handlePolicyCreated = (policy: DataRetentionPolicy) => {
      setRetentionPolicies(prev => [...prev, policy]);
    };

    const handleRequestSubmitted = (request: UserDataRequest) => {
      setUserDataRequests(prev => [request, ...prev]);
    };

    const handleRequestCompleted = (request: UserDataRequest) => {
      setUserDataRequests(prev => 
        prev.map(r => r.id === request.id ? request : r)
      );
    };

    const handleReportCreated = (report: TransparencyReport) => {
      setTransparencyReports(prev => [report, ...prev]);
    };

    const handleAuditCompleted = (audit: ComplianceAudit) => {
      setComplianceAudits(prev => [audit, ...prev]);
    };

    const handleConsentRecorded = (consent: ConsentRecord) => {
      setConsentRecords(prev => [consent, ...prev]);
    };

    complianceService.on('retention_policy_created', handlePolicyCreated);
    complianceService.on('user_data_request_submitted', handleRequestSubmitted);
    complianceService.on('user_data_request_completed', handleRequestCompleted);
    complianceService.on('transparency_report_created', handleReportCreated);
    complianceService.on('compliance_audit_completed', handleAuditCompleted);
    complianceService.on('consent_recorded', handleConsentRecorded);

    return () => {
      complianceService.off('retention_policy_created', handlePolicyCreated);
      complianceService.off('user_data_request_submitted', handleRequestSubmitted);
      complianceService.off('user_data_request_completed', handleRequestCompleted);
      complianceService.off('transparency_report_created', handleReportCreated);
      complianceService.off('compliance_audit_completed', handleAuditCompleted);
      complianceService.off('consent_recorded', handleConsentRecorded);
      complianceService.destroy();
    };
  }, []);

  const loadData = () => {
    setRetentionPolicies(complianceService.getRetentionPolicies());
    setUserDataRequests(complianceService.getUserDataRequests());
    setTransparencyReports(complianceService.getTransparencyReports());
    setComplianceAudits(complianceService.getComplianceAudits());
    setConsentRecords(complianceService.getConsentRecords());
  };

  const createRetentionPolicy = async () => {
    setIsLoading(true);
    try {
      await complianceService.createRetentionPolicy({
        name: 'AI Training Data Retention',
        description: 'Retention policy for AI model training data with privacy protection',
        retentionPeriod: 730, // 2 years
        dataTypes: ['ai_training_data', 'user_interactions', 'model_feedback'],
        autoDelete: true,
        complianceFramework: ['GDPR', 'CCPA']
      });
      Alert.alert('Success', 'Retention policy created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create retention policy');
    } finally {
      setIsLoading(false);
    }
  };

  const submitDataRequest = async (requestType: UserDataRequest['requestType']) => {
    setIsLoading(true);
    try {
      const requestId = await complianceService.submitUserDataRequest(
        'user-123',
        requestType,
        ['profile', 'messages', 'ai_interactions', 'transaction_history'],
        'email'
      );
      Alert.alert('Success', `Data ${requestType} request submitted. Request ID: ${requestId}`);
    } catch (error) {
      Alert.alert('Error', `Failed to submit ${requestType} request`);
    } finally {
      setIsLoading(false);
    }
  };

  const performComplianceAudit = async () => {
    setIsLoading(true);
    try {
      const audit = await complianceService.performComplianceCheck();
      Alert.alert(
        'Compliance Audit Complete',
        `Risk Level: ${audit.riskLevel}\nCompliant Items: ${audit.findings.compliant.length}\nNon-Compliant: ${audit.findings.nonCompliant.length}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to perform compliance audit');
    } finally {
      setIsLoading(false);
    }
  };

  const recordConsent = async (consentType: ConsentRecord['consentType'], granted: boolean) => {
    setIsLoading(true);
    try {
      await complianceService.recordConsent(
        'user-123',
        consentType,
        granted,
        `User consent for ${consentType.replace('_', ' ')}`,
        ['personal_data', 'usage_analytics'],
        'consent',
        'explicit'
      );
      Alert.alert('Success', `Consent ${granted ? 'granted' : 'denied'} for ${consentType}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to record consent');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': case 'pass': case 'compliant': return '#4CAF50';
      case 'processing': case 'warning': return '#FF9800';
      case 'submitted': case 'pending': return '#2196F3';
      case 'rejected': case 'fail': case 'critical': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': case 'pass': return <CheckCircle size={16} color="#4CAF50" />;
      case 'processing': case 'warning': return <Clock size={16} color="#FF9800" />;
      case 'submitted': case 'pending': return <AlertTriangle size={16} color="#2196F3" />;
      case 'rejected': case 'fail': return <XCircle size={16} color="#F44336" />;
      default: return <Clock size={16} color="#757575" />;
    }
  };

  const filteredData = () => {
    const query = searchQuery.toLowerCase();
    switch (activeTab) {
      case 'policies':
        return retentionPolicies.filter(p => 
          p.name.toLowerCase().includes(query) || 
          p.description.toLowerCase().includes(query)
        );
      case 'requests':
        return userDataRequests.filter(r => 
          r.requestType.includes(query) || 
          r.userId.includes(query)
        );
      case 'reports':
        return transparencyReports.filter(r => 
          r.requestType.includes(query) || 
          r.userId.includes(query)
        );
      case 'audits':
        return complianceAudits.filter(a => 
          a.framework.toLowerCase().includes(query) || 
          a.auditor.toLowerCase().includes(query)
        );
      case 'consents':
        return consentRecords.filter(c => 
          c.consentType.includes(query) || 
          c.userId.includes(query)
        );
      default:
        return [];
    }
  };

  const renderTabContent = () => {
    const data = filteredData();

    switch (activeTab) {
      case 'policies':
        return (
          <View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={createRetentionPolicy}
                disabled={isLoading}
              >
                <FileText size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Create Policy</Text>
              </TouchableOpacity>
            </View>
            
            {(data as DataRetentionPolicy[]).map((policy) => (
              <View key={policy.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{policy.name}</Text>
                  <View style={styles.frameworkBadges}>
                    {policy.complianceFramework.map((framework) => (
                      <View key={framework} style={styles.frameworkBadge}>
                        <Text style={styles.frameworkText}>{framework}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={styles.itemDescription}>{policy.description}</Text>
                <View style={styles.policyDetails}>
                  <Text style={styles.detailText}>Retention: {policy.retentionPeriod} days</Text>
                  <Text style={styles.detailText}>Data Types: {policy.dataTypes.length}</Text>
                  <Text style={styles.detailText}>Auto Delete: {policy.autoDelete ? 'Yes' : 'No'}</Text>
                </View>
                <Text style={styles.itemTime}>
                  Updated: {new Date(policy.lastUpdated).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        );

      case 'requests':
        return (
          <View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                onPress={() => submitDataRequest('access')}
                disabled={isLoading}
              >
                <Eye size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Request Access</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#F44336' }]}
                onPress={() => submitDataRequest('erase')}
                disabled={isLoading}
              >
                <Trash2 size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Request Erasure</Text>
              </TouchableOpacity>
            </View>
            
            {(data as UserDataRequest[]).map((request) => (
              <View key={request.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.requestTypeContainer}>
                    {getStatusIcon(request.status)}
                    <Text style={styles.itemTitle}>{request.requestType.toUpperCase()}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(request.status) }
                  ]}>
                    <Text style={styles.statusText}>{request.status}</Text>
                  </View>
                </View>
                <Text style={styles.itemDescription}>User: {request.userId}</Text>
                <Text style={styles.itemDescription}>Verification: {request.verificationMethod}</Text>
                <Text style={styles.itemDescription}>Scope: {request.dataScope.join(', ')}</Text>
                <View style={styles.timelineContainer}>
                  <Text style={styles.detailText}>
                    Submitted: {new Date(request.submissionDate).toLocaleDateString()}
                  </Text>
                  <Text style={styles.detailText}>
                    Expected: {new Date(request.estimatedCompletion).toLocaleDateString()}
                  </Text>
                  {request.actualCompletion && (
                    <Text style={styles.detailText}>
                      Completed: {new Date(request.actualCompletion).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        );

      case 'reports':
        return (
          <View>
            {(data as TransparencyReport[]).map((report) => (
              <View key={report.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>Transparency Report</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(report.status) }
                  ]}>
                    <Text style={styles.statusText}>{report.status}</Text>
                  </View>
                </View>
                <Text style={styles.itemDescription}>Request Type: {report.requestType}</Text>
                <Text style={styles.itemDescription}>User: {report.userId}</Text>
                <Text style={styles.itemDescription}>Categories: {report.dataCategories.join(', ')}</Text>
                <Text style={styles.itemDescription}>Processing: {report.processingDetails}</Text>
                <Text style={styles.itemDescription}>Compliance: {report.complianceNotes}</Text>
                <View style={styles.timelineContainer}>
                  <Text style={styles.detailText}>
                    Requested: {new Date(report.requestDate).toLocaleDateString()}
                  </Text>
                  {report.completionDate && (
                    <Text style={styles.detailText}>
                      Completed: {new Date(report.completionDate).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        );

      case 'audits':
        return (
          <View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
                onPress={performComplianceAudit}
                disabled={isLoading}
              >
                <BarChart3 size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Run Audit</Text>
              </TouchableOpacity>
            </View>
            
            {(data as ComplianceAudit[]).map((audit) => (
              <View key={audit.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{audit.framework} Audit</Text>
                  <View style={[
                    styles.riskBadge,
                    { backgroundColor: getStatusColor(audit.riskLevel) }
                  ]}>
                    <Text style={styles.statusText}>{audit.riskLevel.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.itemDescription}>Auditor: {audit.auditor}</Text>
                <Text style={styles.itemDescription}>Scope: {audit.scope.join(', ')}</Text>
                
                <View style={styles.findingsContainer}>
                  <View style={styles.findingRow}>
                    <CheckCircle size={16} color="#4CAF50" />
                    <Text style={styles.findingText}>Compliant: {audit.findings.compliant.length}</Text>
                  </View>
                  <View style={styles.findingRow}>
                    <XCircle size={16} color="#F44336" />
                    <Text style={styles.findingText}>Non-Compliant: {audit.findings.nonCompliant.length}</Text>
                  </View>
                  <View style={styles.findingRow}>
                    <AlertTriangle size={16} color="#FF9800" />
                    <Text style={styles.findingText}>Recommendations: {audit.findings.recommendations.length}</Text>
                  </View>
                </View>
                
                {audit.remediation.required && (
                  <View style={styles.remediationContainer}>
                    <Text style={styles.remediationTitle}>Remediation Required</Text>
                    <Text style={styles.detailText}>Responsible: {audit.remediation.responsible}</Text>
                    {audit.remediation.deadline && (
                      <Text style={styles.detailText}>
                        Deadline: {new Date(audit.remediation.deadline).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                )}
                
                <Text style={styles.itemTime}>
                  Audit Date: {new Date(audit.auditDate).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        );

      case 'consents':
        return (
          <View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                onPress={() => recordConsent('data_processing', true)}
                disabled={isLoading}
              >
                <Unlock size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Grant Consent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#F44336' }]}
                onPress={() => recordConsent('marketing', false)}
                disabled={isLoading}
              >
                <Lock size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Deny Consent</Text>
              </TouchableOpacity>
            </View>
            
            {(data as ConsentRecord[]).map((consent) => (
              <View key={consent.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{consent.consentType.replace('_', ' ').toUpperCase()}</Text>
                  <View style={[
                    styles.consentBadge,
                    { backgroundColor: consent.granted ? '#4CAF50' : '#F44336' }
                  ]}>
                    {consent.granted ? <Unlock size={12} color="#fff" /> : <Lock size={12} color="#fff" />}
                    <Text style={styles.statusText}>{consent.granted ? 'GRANTED' : 'DENIED'}</Text>
                  </View>
                </View>
                <Text style={styles.itemDescription}>User: {consent.userId}</Text>
                <Text style={styles.itemDescription}>Purpose: {consent.purpose}</Text>
                <Text style={styles.itemDescription}>Method: {consent.method}</Text>
                <Text style={styles.itemDescription}>Legal Basis: {consent.legalBasis}</Text>
                <Text style={styles.itemDescription}>Categories: {consent.dataCategories.join(', ')}</Text>
                <View style={styles.timelineContainer}>
                  <Text style={styles.detailText}>
                    Granted: {new Date(consent.timestamp).toLocaleDateString()}
                  </Text>
                  <Text style={styles.detailText}>Retention: {consent.retentionPeriod} days</Text>
                  {consent.withdrawalDate && (
                    <Text style={styles.detailText}>
                      Withdrawn: {new Date(consent.withdrawalDate).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Regulatory Compliance',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff'
        }} 
      />
      
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Shield size={24} color="#4CAF50" />
          <Text style={styles.title}>Regulatory Compliance</Text>
        </View>
        <Text style={styles.subtitle}>
          Data retention, user rights, transparency, and compliance management
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'policies', label: 'Policies', icon: FileText },
            { key: 'requests', label: 'Requests', icon: Users },
            { key: 'reports', label: 'Reports', icon: Eye },
            { key: 'audits', label: 'Audits', icon: BarChart3 },
            { key: 'consents', label: 'Consents', icon: Lock }
          ].map(({ key, label, icon: Icon }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.tab,
                activeTab === key && styles.activeTab
              ]}
              onPress={() => setActiveTab(key as any)}
            >
              <Icon size={16} color={activeTab === key ? '#fff' : '#888'} />
              <Text style={[
                styles.tabText,
                activeTab === key && styles.activeTabText
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
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
    fontSize: 14,
    color: '#888',
    lineHeight: 20
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333'
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 8
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50'
  },
  tabText: {
    fontSize: 14,
    color: '#888'
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600'
  },
  content: {
    flex: 1,
    padding: 16
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  itemCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1
  },
  itemDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4
  },
  itemTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 8
  },
  frameworkBadges: {
    flexDirection: 'row',
    gap: 4
  },
  frameworkBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  frameworkText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
  },
  policyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  detailText: {
    fontSize: 12,
    color: '#888'
  },
  requestTypeContainer: {
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
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  timelineContainer: {
    marginTop: 8,
    gap: 2
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  findingsContainer: {
    marginTop: 8,
    gap: 4
  },
  findingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  findingText: {
    fontSize: 14,
    color: '#ccc'
  },
  remediationContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#2a1a1a',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#F44336'
  },
  remediationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 4
  },
  consentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  }
});