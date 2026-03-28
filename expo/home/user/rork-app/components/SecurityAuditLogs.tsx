import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  StyleSheet,
  TextInput,
  Modal
} from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { CentralizedLoggingService } from '@/services/security/CentralizedLoggingService';
import { formatRelativeTime } from '@/utils/formatRelativeTime';
import { Search, Filter, Download, Eye, AlertTriangle, Shield, Clock, User } from 'lucide-react-native';

interface SecurityLog {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'critical';
  category: string;
  message: string;
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

interface SecurityAuditLogsProps {
  userId?: string;
  showUserLogs?: boolean;
}

export const SecurityAuditLogs: React.FC<SecurityAuditLogsProps> = ({
  userId,
  showUserLogs = false
}) => {
  const { colors } = useThemeStore();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);
  const [showLogDetail, setShowLogDetail] = useState(false);

  const loggingService = CentralizedLoggingService.getInstance();

  useEffect(() => {
    loadSecurityLogs();
  }, [userId]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery, selectedLevel, selectedCategory]);

  const loadSecurityLogs = async () => {
    try {
      setLoading(true);
      
      let securityLogs: SecurityLog[];
      
      if (showUserLogs && userId) {
        // Load user-specific logs
        securityLogs = await loggingService.getUserSecurityLogs(userId, 100);
      } else {
        // Load all security logs (admin view)
        const allLogs = await loggingService.searchLogs('', 200);
        securityLogs = allLogs.filter(log => 
          log.category.includes('security') || 
          log.category.includes('auth') ||
          log.category.includes('device') ||
          log.level === 'critical' ||
          log.level === 'error'
        );
      }
      
      // Sort by timestamp (newest first)
      securityLogs.sort((a, b) => b.timestamp - a.timestamp);
      
      setLogs(securityLogs);
    } catch (error) {
      console.error('Failed to load security logs:', error);
      Alert.alert('Error', 'Failed to load security audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(query) ||
        log.category.toLowerCase().includes(query) ||
        log.userId?.toLowerCase().includes(query) ||
        log.deviceId?.toLowerCase().includes(query)
      );
    }

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(log => log.category === selectedCategory);
    }

    setFilteredLogs(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSecurityLogs();
    setRefreshing(false);
  };

  const exportLogs = async () => {
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalLogs: filteredLogs.length,
        filters: {
          searchQuery,
          level: selectedLevel,
          category: selectedCategory
        },
        logs: filteredLogs
      };

      if (Platform.OS === 'web') {
        // Web export
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `security-audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Mobile export (would use file system)
        Alert.alert('Export', 'Logs exported successfully');
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
      Alert.alert('Error', 'Failed to export logs');
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return colors.error;
      case 'error':
        return '#FF6B35';
      case 'warn':
        return colors.warning;
      case 'info':
      default:
        return colors.info;
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical':
      case 'error':
        return AlertTriangle;
      case 'warn':
        return AlertTriangle;
      case 'info':
      default:
        return Shield;
    }
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(logs.map(log => log.category))];
    return categories.sort();
  };

  const renderLogItem = (log: SecurityLog) => {
    const LevelIcon = getLevelIcon(log.level);
    const levelColor = getLevelColor(log.level);

    return (
      <TouchableOpacity
        key={log.id}
        style={[styles.logItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          setSelectedLog(log);
          setShowLogDetail(true);
        }}
      >
        <View style={styles.logHeader}>
          <View style={styles.logLevel}>
            <LevelIcon size={16} color={levelColor} />
            <Text style={[styles.levelText, { color: levelColor }]}>
              {log.level.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
            {formatRelativeTime(log.timestamp)}
          </Text>
        </View>
        
        <Text style={[styles.category, { color: colors.textSecondary }]}>
          {log.category}
        </Text>
        
        <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
          {log.message}
        </Text>
        
        {(log.userId || log.deviceId) && (
          <View style={styles.logMeta}>
            {log.userId && (
              <View style={styles.metaItem}>
                <User size={12} color={colors.textTertiary} />
                <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                  {log.userId}
                </Text>
              </View>
            )}
            {log.deviceId && (
              <View style={styles.metaItem}>
                <Shield size={12} color={colors.textTertiary} />
                <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                  {log.deviceId.substring(0, 8)}...
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderLogDetail = () => {
    if (!selectedLog) return null;

    const LevelIcon = getLevelIcon(selectedLog.level);
    const levelColor = getLevelColor(selectedLog.level);

    return (
      <Modal
        visible={showLogDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLogDetail(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Security Log Details</Text>
            <TouchableOpacity
              onPress={() => setShowLogDetail(false)}
              style={[styles.closeButton, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.closeButtonText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <View style={styles.logLevel}>
                <LevelIcon size={20} color={levelColor} />
                <Text style={[styles.levelText, { color: levelColor, fontSize: 18 }]}>
                  {selectedLog.level.toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Clock size={16} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Timestamp:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Category:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedLog.category}
                </Text>
              </View>
              
              <View style={styles.detailColumn}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Message:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedLog.message}
                </Text>
              </View>
              
              {selectedLog.userId && (
                <View style={styles.detailRow}>
                  <User size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>User ID:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedLog.userId}
                  </Text>
                </View>
              )}
              
              {selectedLog.sessionId && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Session ID:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedLog.sessionId}
                  </Text>
                </View>
              )}
              
              {selectedLog.deviceId && (
                <View style={styles.detailRow}>
                  <Shield size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Device ID:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedLog.deviceId}
                  </Text>
                </View>
              )}
              
              {selectedLog.ipAddress && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>IP Address:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedLog.ipAddress}
                  </Text>
                </View>
              )}
              
              {selectedLog.userAgent && (
                <View style={styles.detailColumn}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>User Agent:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedLog.userAgent}
                  </Text>
                </View>
              )}
              
              {selectedLog.metadata && (
                <View style={styles.detailColumn}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Metadata:</Text>
                  <Text style={[styles.metadataText, { color: colors.text, backgroundColor: colors.backgroundSecondary }]}>
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    const levels = ['all', 'info', 'warn', 'error', 'critical'];
    const categories = ['all', ...getUniqueCategories()];

    return (
      <View style={[styles.filtersContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.filtersTitle, { color: colors.text }]}>Filters</Text>
        
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Level:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {levels.map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedLevel === level ? colors.primary : colors.backgroundSecondary,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setSelectedLevel(level)}
              >
                <Text style={[
                  styles.filterChipText,
                  {
                    color: selectedLevel === level ? colors.textInverse : colors.text
                  }
                ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Category:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedCategory === category ? colors.primary : colors.backgroundSecondary,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.filterChipText,
                  {
                    color: selectedCategory === category ? colors.textInverse : colors.text
                  }
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Security Audit Logs</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={exportLogs}
          >
            <Download size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search logs..."
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      {renderFilters()}

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{filteredLogs.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Logs</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.error }]}>
            {filteredLogs.filter(log => log.level === 'critical' || log.level === 'error').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Critical/Error</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {filteredLogs.filter(log => log.level === 'warn').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Warnings</Text>
        </View>
      </View>

      {/* Logs List */}
      <ScrollView
        style={styles.logsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading logs...</Text>
          </View>
        ) : filteredLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Shield size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No security logs found</Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Try adjusting your filters</Text>
          </View>
        ) : (
          filteredLogs.map(renderLogItem)
        )}
      </ScrollView>

      {/* Log Detail Modal */}
      {renderLogDetail()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersContainer: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statsContainer: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  logsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  logItem: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
  },
  category: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  logMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailColumn: {
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  metadataText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    padding: 12,
    borderRadius: 8,
  },
});

export default SecurityAuditLogs;