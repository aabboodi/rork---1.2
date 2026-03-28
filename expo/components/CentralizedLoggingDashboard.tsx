import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Switch,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Activity,
  Database,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Settings,
  BarChart3,
  TrendingUp,
  Zap,
  Shield,
  Eye,
  FileText,
  Server,
  Globe,
  Cpu,
  HardDrive
} from 'lucide-react-native';
import CentralizedLoggingService from '@/services/security/CentralizedLoggingService';
import type { LogEntry, LogMetrics, LoggingProvider } from '@/services/security/CentralizedLoggingService';
import formatRelativeTime from '@/utils/formatRelativeTime';

const { width } = Dimensions.get('window');

interface CentralizedLoggingDashboardProps {
  onNavigate?: (screen: string) => void;
}

export default function CentralizedLoggingDashboard({ onNavigate }: CentralizedLoggingDashboardProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<LogMetrics | null>(null);
  const [providers, setProviders] = useState<LoggingProvider[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogEntry['level'] | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<LogEntry['category'] | 'all'>('all');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  useEffect(() => {
    loadLoggingData();
    const interval = setInterval(loadLoggingData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadLoggingData = async () => {
    try {
      setRefreshing(true);
      
      const loggingService = CentralizedLoggingService.getInstance();
      
      const [recentLogs, loggingMetrics, loggingProviders] = await Promise.all([
        loggingService.getRecentLogs(100),
        loggingService.getMetrics(),
        loggingService.getProviders()
      ]);

      setLogs(recentLogs);
      setMetrics(loggingMetrics);
      setProviders(loggingProviders);
      
    } catch (error) {
      console.error('Failed to load logging data:', error);
      Alert.alert('Error', 'Failed to load logging dashboard data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadLoggingData();
      return;
    }

    try {
      const loggingService = CentralizedLoggingService.getInstance();
      const searchResults = await loggingService.searchLogs(searchQuery, 50);
      setLogs(searchResults);
    } catch (error) {
      console.error('Failed to search logs:', error);
      Alert.alert('Error', 'Failed to search logs');
    }
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'critical': return '#DC2626';
      case 'error': return '#EF4444';
      case 'warn': return '#F59E0B';
      case 'info': return '#3B82F6';
      case 'debug': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getCategoryIcon = (category: LogEntry['category']) => {
    switch (category) {
      case 'security': return Shield;
      case 'performance': return Zap;
      case 'business': return BarChart3;
      case 'system': return Cpu;
      case 'audit': return Eye;
      case 'compliance': return CheckCircle;
      default: return FileText;
    }
  };

  const getProviderStatusColor = (provider: LoggingProvider) => {
    return provider.enabled ? '#10B981' : '#6B7280';
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
    const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
    
    return matchesSearch && matchesLevel && matchesCategory;
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

  const renderLogCard = (log: LogEntry) => {
    const CategoryIcon = getCategoryIcon(log.category);
    const levelColor = getLevelColor(log.level);

    return (
      <TouchableOpacity
        key={log.id}
        style={styles.logCard}
        onPress={() => {
          setSelectedLog(log);
          setShowLogModal(true);
        }}
      >
        <View style={styles.logHeader}>
          <View style={styles.logTitleRow}>
            <CategoryIcon size={16} color="#6B7280" />
            <Text style={styles.logSource}>{log.source}</Text>
            <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
              <Text style={styles.levelText}>{log.level.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.logTime}>
            {formatRelativeTime(log.timestamp)}
          </Text>
        </View>
        
        <Text style={styles.logMessage} numberOfLines={2}>
          {log.message}
        </Text>
        
        <View style={styles.logFooter}>
          <Text style={styles.logCategory}>{log.category}</Text>
          {log.userId && (
            <Text style={styles.logUserId}>User: {log.userId.substring(0, 8)}...</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderProviderCard = (provider: LoggingProvider) => {
    const statusColor = getProviderStatusColor(provider);
    
    return (
      <View key={provider.name} style={styles.providerCard}>
        <View style={styles.providerHeader}>
          <View style={styles.providerInfo}>
            <Server size={20} color="#6B7280" />
            <Text style={styles.providerName}>{provider.name}</Text>
          </View>
          <View style={[styles.providerStatus, { backgroundColor: statusColor }]}>
            <Text style={styles.providerStatusText}>
              {provider.enabled ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.providerType}>{provider.type.toUpperCase()}</Text>
        
        <View style={styles.providerMetrics}>
          <View style={styles.providerMetric}>
            <Text style={styles.providerMetricLabel}>Batch Size</Text>
            <Text style={styles.providerMetricValue}>{provider.batchSize}</Text>
          </View>
          <View style={styles.providerMetric}>
            <Text style={styles.providerMetricLabel}>Flush Interval</Text>
            <Text style={styles.providerMetricValue}>{provider.flushInterval / 1000}s</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderLogModal = () => {
    if (!selectedLog) return null;

    const CategoryIcon = getCategoryIcon(selectedLog.category);
    const levelColor = getLevelColor(selectedLog.level);

    return (
      <Modal
        visible={showLogModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Details</Text>
            <TouchableOpacity
              onPress={() => setShowLogModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.logDetailCard}>
              <View style={styles.logDetailHeader}>
                <View style={styles.logDetailTitleRow}>
                  <CategoryIcon size={24} color="#6B7280" />
                  <Text style={styles.logDetailSource}>{selectedLog.source}</Text>
                </View>
                <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
                  <Text style={styles.levelText}>{selectedLog.level.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={styles.logDetailMessage}>{selectedLog.message}</Text>

              <View style={styles.logDetailGrid}>
                <View style={styles.logDetailItem}>
                  <Text style={styles.logDetailLabel}>Category</Text>
                  <Text style={styles.logDetailValue}>{selectedLog.category}</Text>
                </View>
                <View style={styles.logDetailItem}>
                  <Text style={styles.logDetailLabel}>Timestamp</Text>
                  <Text style={styles.logDetailValue}>
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.logDetailItem}>
                  <Text style={styles.logDetailLabel}>Platform</Text>
                  <Text style={styles.logDetailValue}>{selectedLog.platform}</Text>
                </View>
                <View style={styles.logDetailItem}>
                  <Text style={styles.logDetailLabel}>Environment</Text>
                  <Text style={styles.logDetailValue}>{selectedLog.environment}</Text>
                </View>
                {selectedLog.userId && (
                  <View style={styles.logDetailItem}>
                    <Text style={styles.logDetailLabel}>User ID</Text>
                    <Text style={styles.logDetailValue}>{selectedLog.userId}</Text>
                  </View>
                )}
                {selectedLog.sessionId && (
                  <View style={styles.logDetailItem}>
                    <Text style={styles.logDetailLabel}>Session ID</Text>
                    <Text style={styles.logDetailValue}>{selectedLog.sessionId}</Text>
                  </View>
                )}
              </View>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <View style={styles.metadataSection}>
                  <Text style={styles.sectionTitle}>Metadata</Text>
                  <View style={styles.metadataContainer}>
                    <Text style={styles.metadataText}>
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </Text>
                  </View>
                </View>
              )}

              {selectedLog.tags && selectedLog.tags.length > 0 && (
                <View style={styles.tagsSection}>
                  <Text style={styles.sectionTitle}>Tags</Text>
                  <View style={styles.tagsContainer}>
                    {selectedLog.tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderSettingsModal = () => (
    <Modal
      visible={showSettingsModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Logging Settings</Text>
          <TouchableOpacity
            onPress={() => setShowSettingsModal(false)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Log Providers</Text>
            {providers.map(renderProviderCard)}
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Configuration</Text>
            <View style={styles.configCard}>
              <Text style={styles.configText}>
                Centralized logging is configured to collect logs from all application components
                and forward them to configured providers for analysis and monitoring.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#1D4ED8']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Centralized Logging</Text>
        <Text style={styles.headerSubtitle}>Application logs and monitoring</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSettingsModal(true)}
          >
            <Settings size={20} color="#FFFFFF" />
            <Text style={styles.headerButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadLoggingData}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        {/* Metrics Overview */}
        {metrics && (
          <View style={styles.metricsSection}>
            <Text style={styles.sectionTitle}>Logging Metrics</Text>
            <View style={styles.metricsGrid}>
              {renderMetricsCard(
                'Total Logs',
                metrics.totalLogs.toLocaleString(),
                Database,
                '#3B82F6',
                'All time'
              )}
              {renderMetricsCard(
                'Error Rate',
                `${(metrics.errorRate * 100).toFixed(1)}%`,
                AlertTriangle,
                '#EF4444',
                'Errors vs total'
              )}
              {renderMetricsCard(
                'Queue Size',
                metrics.queueSize,
                Clock,
                '#F59E0B',
                'Pending logs'
              )}
              {renderMetricsCard(
                'Success Rate',
                `${((metrics.successfulDeliveries / (metrics.successfulDeliveries + metrics.failedDeliveries)) * 100 || 0).toFixed(1)}%`,
                CheckCircle,
                '#10B981',
                'Delivery success'
              )}
            </View>
          </View>
        )}

        {/* Search and Filters */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search logs..."
              placeholderTextColor="#9CA3AF"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.filtersContainer}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Level:</Text>
              <View style={styles.filterButtons}>
                {(['all', 'critical', 'error', 'warn', 'info', 'debug'] as const).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.filterButton,
                      selectedLevel === level && styles.filterButtonActive
                    ]}
                    onPress={() => setSelectedLevel(level)}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        selectedLevel === level && styles.filterButtonTextActive
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Category:</Text>
              <View style={styles.filterButtons}>
                {(['all', 'security', 'performance', 'business', 'system', 'audit'] as const).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterButton,
                      selectedCategory === category && styles.filterButtonActive
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        selectedCategory === category && styles.filterButtonTextActive
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Logs List */}
        <View style={styles.logsSection}>
          <Text style={styles.sectionTitle}>
            Recent Logs ({filteredLogs.length})
          </Text>
          
          {filteredLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Database size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No logs found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery || selectedLevel !== 'all' || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No logs have been collected yet'
                }
              </Text>
            </View>
          ) : (
            <View style={styles.logsList}>
              {filteredLogs.map(renderLogCard)}
            </View>
          )}
        </View>
      </ScrollView>

      {renderLogModal()}
      {renderSettingsModal()}
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
    color: '#DBEAFE',
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
    marginBottom: 16,
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
  searchButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filtersContainer: {
    gap: 16,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  logsSection: {
    marginBottom: 24,
  },
  logsList: {
    gap: 12,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  logSource: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  logMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logCategory: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  logUserId: {
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
  closeButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  logDetailCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  logDetailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logDetailSource: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  logDetailMessage: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 24,
  },
  logDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  logDetailItem: {
    flex: 1,
    minWidth: '45%',
  },
  logDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  logDetailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  metadataSection: {
    marginBottom: 24,
  },
  metadataContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metadataText: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'monospace',
  },
  tagsSection: {
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#3730A3',
    fontWeight: '500',
  },
  settingsSection: {
    marginBottom: 24,
  },
  providerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  providerStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  providerStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  providerType: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  providerMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  providerMetric: {
    flex: 1,
  },
  providerMetricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  providerMetricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  configCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  configText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});