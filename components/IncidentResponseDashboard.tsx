import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield,
  AlertTriangle,
  Clock,
  Users,
  Activity,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  TrendingUp,
  Zap,
  Target,
  BarChart3,
  Settings,
  Plus,
  Search,
  Filter
} from 'lucide-react-native';
import IncidentResponseService from '@/services/security/IncidentResponseService';
import type { SecurityIncident, IncidentMetrics } from '@/services/security/IncidentResponseService';
import formatRelativeTime from '@/utils/formatRelativeTime';

const { width } = Dimensions.get('window');

interface IncidentResponseDashboardProps {
  onNavigate?: (screen: string) => void;
}

export default function IncidentResponseDashboard({ onNavigate }: IncidentResponseDashboardProps) {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [metrics, setMetrics] = useState<IncidentMetrics | null>(null);
  const [activeIncidents, setActiveIncidents] = useState<SecurityIncident[]>([]);
  const [criticalIncidents, setCriticalIncidents] = useState<SecurityIncident[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'critical'>('all');

  // Create incident form state
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium' as SecurityIncident['severity'],
    category: 'system_compromise' as SecurityIncident['category']
  });

  useEffect(() => {
    loadIncidentData();
    const interval = setInterval(loadIncidentData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadIncidentData = async () => {
    try {
      setRefreshing(true);
      
      const incidentService = IncidentResponseService.getInstance();
      
      const [allIncidents, incidentMetrics, activeList, criticalList] = await Promise.all([
        incidentService.getIncidents(),
        incidentService.getMetrics(),
        incidentService.getActiveIncidents(),
        incidentService.getCriticalIncidents()
      ]);

      setIncidents(allIncidents);
      setMetrics(incidentMetrics);
      setActiveIncidents(activeList);
      setCriticalIncidents(criticalList);
      
    } catch (error) {
      console.error('Failed to load incident data:', error);
      Alert.alert('Error', 'Failed to load incident response data');
    } finally {
      setRefreshing(false);
    }
  };

  const getSeverityColor = (severity: SecurityIncident['severity']) => {
    switch (severity) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#D97706';
      case 'low': return '#65A30D';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status: SecurityIncident['status']) => {
    switch (status) {
      case 'detected': return '#EF4444';
      case 'triaged': return '#F59E0B';
      case 'contained': return '#3B82F6';
      case 'eradicated': return '#8B5CF6';
      case 'recovered': return '#10B981';
      case 'closed': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: SecurityIncident['status']) => {
    switch (status) {
      case 'detected': return AlertTriangle;
      case 'triaged': return Eye;
      case 'contained': return Shield;
      case 'eradicated': return Zap;
      case 'recovered': return CheckCircle;
      case 'closed': return XCircle;
      default: return Clock;
    }
  };

  const handleCreateIncident = async () => {
    try {
      if (!newIncident.title || !newIncident.description) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const incidentService = IncidentResponseService.getInstance();
      
      await incidentService.createIncident(
        newIncident.title,
        newIncident.description,
        newIncident.severity,
        newIncident.category
      );

      setShowCreateModal(false);
      setNewIncident({
        title: '',
        description: '',
        severity: 'medium',
        category: 'system_compromise'
      });

      await loadIncidentData();
      Alert.alert('Success', 'Security incident created successfully');
      
    } catch (error) {
      console.error('Failed to create incident:', error);
      Alert.alert('Error', 'Failed to create security incident');
    }
  };

  const handleProgressIncident = async (incidentId: string) => {
    try {
      const incidentService = IncidentResponseService.getInstance();
      await incidentService.progressToNextPhase(incidentId);
      await loadIncidentData();
      Alert.alert('Success', 'Incident progressed to next phase');
    } catch (error) {
      console.error('Failed to progress incident:', error);
      Alert.alert('Error', 'Failed to progress incident');
    }
  };

  const handleCloseIncident = async (incidentId: string) => {
    Alert.prompt(
      'Close Incident',
      'Please provide a resolution summary:',
      async (resolution) => {
        if (resolution) {
          try {
            const incidentService = IncidentResponseService.getInstance();
            await incidentService.closeIncident(incidentId, resolution, []);
            await loadIncidentData();
            Alert.alert('Success', 'Incident closed successfully');
          } catch (error) {
            console.error('Failed to close incident:', error);
            Alert.alert('Error', 'Failed to close incident');
          }
        }
      }
    );
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && incident.status !== 'closed') ||
                         (filterStatus === 'critical' && incident.severity === 'critical');
    
    return matchesSearch && matchesFilter;
  });

  const renderMetricsCard = (title: string, value: string | number, icon: any, color: string, subtitle?: string) => {
    const IconComponent = icon;
    return (
      <View style={[styles.metricCard, { borderLeftColor: color }]}>
        <View style={styles.metricHeader}>
          <IconComponent size={24} color={color} />
          <Text style={styles.metricTitle}>{title}</Text>
        </View>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      </View>
    );
  };

  const renderIncidentCard = (incident: SecurityIncident) => {
    const StatusIcon = getStatusIcon(incident.status);
    const severityColor = getSeverityColor(incident.severity);
    const statusColor = getStatusColor(incident.status);

    return (
      <TouchableOpacity
        key={incident.id}
        style={styles.incidentCard}
        onPress={() => {
          setSelectedIncident(incident);
          setShowIncidentModal(true);
        }}
      >
        <View style={styles.incidentHeader}>
          <View style={styles.incidentTitleRow}>
            <Text style={styles.incidentTitle} numberOfLines={1}>{incident.title}</Text>
            <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
              <Text style={styles.severityText}>{incident.severity.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.incidentMetaRow}>
            <StatusIcon size={16} color={statusColor} />
            <Text style={[styles.incidentStatus, { color: statusColor }]}>
              {incident.status.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={styles.incidentTime}>
              {formatRelativeTime(incident.detectedAt)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.incidentDescription} numberOfLines={2}>
          {incident.description}
        </Text>
        
        <View style={styles.incidentFooter}>
          <Text style={styles.incidentCategory}>{incident.category.replace('_', ' ')}</Text>
          <Text style={styles.incidentTeam}>{incident.assignedTeam}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderIncidentModal = () => {
    if (!selectedIncident) return null;

    const StatusIcon = getStatusIcon(selectedIncident.status);
    const severityColor = getSeverityColor(selectedIncident.severity);
    const statusColor = getStatusColor(selectedIncident.status);

    return (
      <Modal
        visible={showIncidentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Incident Details</Text>
            <TouchableOpacity
              onPress={() => setShowIncidentModal(false)}
              style={styles.closeButton}
            >
              <XCircle size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.incidentDetailCard}>
              <View style={styles.incidentDetailHeader}>
                <Text style={styles.incidentDetailTitle}>{selectedIncident.title}</Text>
                <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
                  <Text style={styles.severityText}>{selectedIncident.severity.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <StatusIcon size={20} color={statusColor} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {selectedIncident.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>

              <Text style={styles.incidentDetailDescription}>
                {selectedIncident.description}
              </Text>

              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{selectedIncident.category.replace('_', ' ')}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Priority</Text>
                  <Text style={styles.detailValue}>P{selectedIncident.priority}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Assigned Team</Text>
                  <Text style={styles.detailValue}>{selectedIncident.assignedTeam}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Business Impact</Text>
                  <Text style={styles.detailValue}>{selectedIncident.businessImpact}</Text>
                </View>
              </View>

              <View style={styles.timelineSection}>
                <Text style={styles.sectionTitle}>Timeline</Text>
                <View style={styles.timelineItem}>
                  <Text style={styles.timelineLabel}>Detected</Text>
                  <Text style={styles.timelineValue}>
                    {new Date(selectedIncident.detectedAt).toLocaleString()}
                  </Text>
                </View>
                {selectedIncident.triagedAt && (
                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineLabel}>Triaged</Text>
                    <Text style={styles.timelineValue}>
                      {new Date(selectedIncident.triagedAt).toLocaleString()}
                    </Text>
                  </View>
                )}
                {selectedIncident.containedAt && (
                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineLabel}>Contained</Text>
                    <Text style={styles.timelineValue}>
                      {new Date(selectedIncident.containedAt).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.actionButtons}>
                {selectedIncident.status !== 'closed' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.progressButton]}
                    onPress={() => {
                      setShowIncidentModal(false);
                      handleProgressIncident(selectedIncident.id);
                    }}
                  >
                    <TrendingUp size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Progress</Text>
                  </TouchableOpacity>
                )}
                
                {selectedIncident.status !== 'closed' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.closeIncidentButton]}
                    onPress={() => {
                      setShowIncidentModal(false);
                      handleCloseIncident(selectedIncident.id);
                    }}
                  >
                    <CheckCircle size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Close</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create Security Incident</Text>
          <TouchableOpacity
            onPress={() => setShowCreateModal(false)}
            style={styles.closeButton}
          >
            <XCircle size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formContainer}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Title *</Text>
              <TextInput
                style={styles.formInput}
                value={newIncident.title}
                onChangeText={(text) => setNewIncident(prev => ({ ...prev, title: text }))}
                placeholder="Enter incident title"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={newIncident.description}
                onChangeText={(text) => setNewIncident(prev => ({ ...prev, description: text }))}
                placeholder="Describe the security incident"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Severity</Text>
              <View style={styles.severityOptions}>
                {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
                  <TouchableOpacity
                    key={severity}
                    style={[
                      styles.severityOption,
                      newIncident.severity === severity && styles.severityOptionSelected,
                      { borderColor: getSeverityColor(severity) }
                    ]}
                    onPress={() => setNewIncident(prev => ({ ...prev, severity }))}
                  >
                    <Text
                      style={[
                        styles.severityOptionText,
                        newIncident.severity === severity && { color: getSeverityColor(severity) }
                      ]}
                    >
                      {severity.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.categoryOptions}>
                {([
                  'malware',
                  'data_breach',
                  'unauthorized_access',
                  'system_compromise',
                  'ddos',
                  'social_engineering'
                ] as const).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryOption,
                      newIncident.category === category && styles.categoryOptionSelected
                    ]}
                    onPress={() => setNewIncident(prev => ({ ...prev, category }))}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        newIncident.category === category && styles.categoryOptionTextSelected
                      ]}
                    >
                      {category.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateIncident}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Incident</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#DC2626', '#EF4444']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Incident Response</Text>
        <Text style={styles.headerSubtitle}>Security incident management and response</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.headerButtonText}>New Incident</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadIncidentData}
            colors={['#DC2626']}
            tintColor="#DC2626"
          />
        }
      >
        {/* Metrics Overview */}
        {metrics && (
          <View style={styles.metricsSection}>
            <Text style={styles.sectionTitle}>Response Metrics</Text>
            <View style={styles.metricsGrid}>
              {renderMetricsCard(
                'Total Incidents',
                metrics.totalIncidents,
                FileText,
                '#3B82F6',
                'All time'
              )}
              {renderMetricsCard(
                'Active Incidents',
                activeIncidents.length,
                Activity,
                '#EF4444',
                'Requiring attention'
              )}
              {renderMetricsCard(
                'Critical Incidents',
                criticalIncidents.length,
                AlertTriangle,
                '#DC2626',
                'High priority'
              )}
              {renderMetricsCard(
                'MTTR',
                `${Math.round(metrics.mttr / (1000 * 60))}m`,
                Clock,
                '#10B981',
                'Mean time to recovery'
              )}
            </View>
          </View>
        )}

        {/* Search and Filter */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search incidents..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View style={styles.filterContainer}>
            {(['all', 'active', 'critical'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  filterStatus === filter && styles.filterButtonActive
                ]}
                onPress={() => setFilterStatus(filter)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterStatus === filter && styles.filterButtonTextActive
                  ]}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Incidents List */}
        <View style={styles.incidentsSection}>
          <Text style={styles.sectionTitle}>
            Security Incidents ({filteredIncidents.length})
          </Text>
          
          {filteredIncidents.length === 0 ? (
            <View style={styles.emptyState}>
              <Shield size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No incidents found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No security incidents have been reported'
                }
              </Text>
            </View>
          ) : (
            <View style={styles.incidentsList}>
              {filteredIncidents.map(renderIncidentCard)}
            </View>
          )}
        </View>
      </ScrollView>

      {renderIncidentModal()}
      {renderCreateModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FEE2E2',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  metricsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  searchSection: {
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  incidentsSection: {
    marginBottom: 24,
  },
  incidentsList: {
    gap: 12,
  },
  incidentCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  incidentHeader: {
    marginBottom: 12,
  },
  incidentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  incidentTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 12,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  incidentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incidentStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  incidentTime: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 'auto',
  },
  incidentDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incidentCategory: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  incidentTeam: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  incidentDetailCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  incidentDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  incidentDetailTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  incidentDetailDescription: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 24,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timelineSection: {
    marginBottom: 24,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timelineLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  timelineValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  progressButton: {
    backgroundColor: '#3B82F6',
  },
  closeIncidentButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formField: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  severityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  severityOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  severityOptionSelected: {
    backgroundColor: '#FEF2F2',
  },
  severityOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
  },
  categoryOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryOptionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  categoryOptionTextSelected: {
    color: '#FFFFFF',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});