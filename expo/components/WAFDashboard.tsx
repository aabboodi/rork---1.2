import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Settings, 
  Eye, 
  EyeOff, 
  Plus,
  Trash2,
  RefreshCw,
  Lock,
  Unlock,
  BarChart3
} from 'lucide-react-native';
import { WAFService, type WAFConfig, type WAFRule, type WAFLog } from '@/services/security/WAFService';
import { NetworkSecurityService, type SecurityMetrics } from '@/services/security/NetworkSecurityService';

interface WAFDashboardProps {
  onClose?: () => void;
}

const WAFDashboard: React.FC<WAFDashboardProps> = ({ onClose }) => {
  const [wafService] = useState(() => WAFService.getInstance());
  const [networkService] = useState(() => NetworkSecurityService.getInstance());
  
  const [config, setConfig] = useState<WAFConfig | null>(null);
  const [rules, setRules] = useState<WAFRule[]>([]);
  const [logs, setLogs] = useState<WAFLog[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [blockedIPs, setBlockedIPs] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'logs' | 'config'>('overview');
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newRule, setNewRule] = useState<Partial<WAFRule>>({
    name: '',
    pattern: '',
    severity: 'medium',
    action: 'log',
    category: 'xss'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [wafConfig, wafRules, wafLogs, securityMetrics, ips] = await Promise.all([
        wafService.getConfiguration(),
        wafService.getRules(),
        wafService.getSecurityLogs(),
        networkService.getSecurityMetrics(),
        wafService.getBlockedIPs()
      ]);

      setConfig(wafConfig);
      setRules(wafRules);
      setLogs(wafLogs.slice(-50)); // Show last 50 logs
      setMetrics(securityMetrics);
      setBlockedIPs(ips);
    } catch (error) {
      console.error('Failed to load WAF data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const updateConfig = async (updates: Partial<WAFConfig>) => {
    if (!config) return;
    
    const newConfig = { ...config, ...updates };
    await wafService.updateConfiguration(newConfig);
    setConfig(newConfig);
  };

  const addCustomRule = async () => {
    if (!newRule.name || !newRule.pattern) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const rule: WAFRule = {
        id: `custom-${Date.now()}`,
        name: newRule.name!,
        pattern: new RegExp(newRule.pattern!, 'gi'),
        severity: newRule.severity!,
        action: newRule.action!,
        category: newRule.category!
      };

      await wafService.addCustomRule(rule);
      await loadData();
      setShowAddRuleModal(false);
      setNewRule({
        name: '',
        pattern: '',
        severity: 'medium',
        action: 'log',
        category: 'xss'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to add custom rule');
    }
  };

  const clearLogs = async () => {
    Alert.alert(
      'Clear Security Logs',
      'Are you sure you want to clear all security logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await wafService.clearSecurityLogs();
            await loadData();
          }
        }
      ]
    );
  };

  const unblockIP = async (ip: string) => {
    Alert.alert(
      'Unblock IP',
      `Are you sure you want to unblock ${ip}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            wafService.unblockIP(ip);
            await loadData();
          }
        }
      ]
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const renderOverview = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Shield size={24} color="#10b981" />
          <Text style={styles.statValue}>{metrics?.totalRequests || 0}</Text>
          <Text style={styles.statLabel}>Total Requests</Text>
        </View>
        
        <View style={styles.statCard}>
          <AlertTriangle size={24} color="#ef4444" />
          <Text style={styles.statValue}>{metrics?.blockedRequests || 0}</Text>
          <Text style={styles.statLabel}>Blocked Requests</Text>
        </View>
        
        <View style={styles.statCard}>
          <Activity size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{logs.length}</Text>
          <Text style={styles.statLabel}>Security Events</Text>
        </View>
        
        <View style={styles.statCard}>
          <Lock size={24} color="#8b5cf6" />
          <Text style={styles.statValue}>{blockedIPs.length}</Text>
          <Text style={styles.statLabel}>Blocked IPs</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>WAF Status</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>WAF Protection</Text>
            <View style={[styles.statusBadge, { backgroundColor: config?.enabled ? '#10b981' : '#ef4444' }]}>
              <Text style={styles.statusBadgeText}>
                {config?.enabled ? 'ENABLED' : 'DISABLED'}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Block Mode</Text>
            <View style={[styles.statusBadge, { backgroundColor: config?.blockMode ? '#ef4444' : '#f59e0b' }]}>
              <Text style={styles.statusBadgeText}>
                {config?.blockMode ? 'BLOCK' : 'LOG ONLY'}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Rate Limiting</Text>
            <View style={[styles.statusBadge, { backgroundColor: config?.rateLimiting.enabled ? '#10b981' : '#6b7280' }]}>
              <Text style={styles.statusBadgeText}>
                {config?.rateLimiting.enabled ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {blockedIPs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blocked IP Addresses</Text>
          {blockedIPs.map((ip, index) => (
            <View key={index} style={styles.blockedIPItem}>
              <Text style={styles.blockedIPText}>{ip}</Text>
              <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => unblockIP(ip)}
              >
                <Unlock size={16} color="#10b981" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderRules = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Security Rules ({rules.length})</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddRuleModal(true)}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={rules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <Text style={styles.ruleName}>{item.name}</Text>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
                <Text style={styles.severityText}>{item.severity.toUpperCase()}</Text>
              </View>
            </View>
            
            <Text style={styles.ruleCategory}>{item.category.toUpperCase()}</Text>
            <Text style={styles.rulePattern}>{item.pattern.source}</Text>
            
            <View style={styles.ruleFooter}>
              <View style={[styles.actionBadge, { 
                backgroundColor: item.action === 'block' ? '#ef4444' : 
                                item.action === 'sanitize' ? '#f59e0b' : '#6b7280' 
              }]}>
                <Text style={styles.actionText}>{item.action.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      />
    </View>
  );

  const renderLogs = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Security Logs ({logs.length})</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearLogs}
        >
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={logs.reverse()}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        renderItem={({ item }) => (
          <View style={styles.logCard}>
            <View style={styles.logHeader}>
              <Text style={styles.logTimestamp}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
                <Text style={styles.severityText}>{item.severity.toUpperCase()}</Text>
              </View>
            </View>
            
            <Text style={styles.logRule}>Rule: {item.ruleTriggered}</Text>
            <Text style={styles.logIP}>IP: {item.clientIP}</Text>
            <Text style={styles.logMethod}>{item.method} {item.url}</Text>
            
            <View style={styles.logFooter}>
              <View style={[styles.actionBadge, { 
                backgroundColor: item.blocked ? '#ef4444' : '#f59e0b'
              }]}>
                <Text style={styles.actionText}>
                  {item.blocked ? 'BLOCKED' : item.action.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      />
    </View>
  );

  const renderConfig = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.configSection}>
        <Text style={styles.configTitle}>WAF Configuration</Text>
        
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Enable WAF Protection</Text>
          <Switch
            value={config?.enabled || false}
            onValueChange={(value) => updateConfig({ enabled: value })}
          />
        </View>
        
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Block Mode (vs Log Only)</Text>
          <Switch
            value={config?.blockMode || false}
            onValueChange={(value) => updateConfig({ blockMode: value })}
          />
        </View>
        
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Enable Rate Limiting</Text>
          <Switch
            value={config?.rateLimiting.enabled || false}
            onValueChange={(value) => updateConfig({ 
              rateLimiting: { ...config!.rateLimiting, enabled: value }
            })}
          />
        </View>
        
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Max Requests per Window</Text>
          <TextInput
            style={styles.configInput}
            value={config?.rateLimiting.maxRequests.toString() || ''}
            onChangeText={(text) => {
              const value = parseInt(text) || 100;
              updateConfig({ 
                rateLimiting: { ...config!.rateLimiting, maxRequests: value }
              });
            }}
            keyboardType="numeric"
            placeholder="100"
          />
        </View>
        
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Rate Limit Window (minutes)</Text>
          <TextInput
            style={styles.configInput}
            value={((config?.rateLimiting.windowMs || 900000) / 60000).toString()}
            onChangeText={(text) => {
              const minutes = parseInt(text) || 15;
              updateConfig({ 
                rateLimiting: { ...config!.rateLimiting, windowMs: minutes * 60000 }
              });
            }}
            keyboardType="numeric"
            placeholder="15"
          />
        </View>
        
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Max Request Size (MB)</Text>
          <TextInput
            style={styles.configInput}
            value={((config?.maxRequestSize || 10485760) / 1048576).toString()}
            onChangeText={(text) => {
              const mb = parseInt(text) || 10;
              updateConfig({ maxRequestSize: mb * 1048576 });
            }}
            keyboardType="numeric"
            placeholder="10"
          />
        </View>
      </View>
    </ScrollView>
  );

  const renderAddRuleModal = () => (
    <Modal
      visible={showAddRuleModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Custom Rule</Text>
          <TouchableOpacity onPress={() => setShowAddRuleModal(false)}>
            <Text style={styles.modalClose}>Cancel</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Rule Name *</Text>
            <TextInput
              style={styles.textInput}
              value={newRule.name}
              onChangeText={(text) => setNewRule({ ...newRule, name: text })}
              placeholder="Enter rule name"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pattern (RegExp) *</Text>
            <TextInput
              style={styles.textInput}
              value={newRule.pattern}
              onChangeText={(text) => setNewRule({ ...newRule, pattern: text })}
              placeholder="Enter regular expression pattern"
              multiline
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Severity</Text>
            <View style={styles.pickerContainer}>
              {['low', 'medium', 'high', 'critical'].map((severity) => (
                <TouchableOpacity
                  key={severity}
                  style={[
                    styles.pickerOption,
                    newRule.severity === severity && styles.pickerOptionSelected
                  ]}
                  onPress={() => setNewRule({ ...newRule, severity: severity as any })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    newRule.severity === severity && styles.pickerOptionTextSelected
                  ]}>
                    {severity.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Action</Text>
            <View style={styles.pickerContainer}>
              {['log', 'sanitize', 'block'].map((action) => (
                <TouchableOpacity
                  key={action}
                  style={[
                    styles.pickerOption,
                    newRule.action === action && styles.pickerOptionSelected
                  ]}
                  onPress={() => setNewRule({ ...newRule, action: action as any })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    newRule.action === action && styles.pickerOptionTextSelected
                  ]}>
                    {action.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.pickerContainer}>
              {['xss', 'sqli', 'csrf', 'rce', 'lfi', 'rfi', 'xxe'].map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.pickerOption,
                    newRule.category === category && styles.pickerOptionSelected
                  ]}
                  onPress={() => setNewRule({ ...newRule, category: category as any })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    newRule.category === category && styles.pickerOptionTextSelected
                  ]}>
                    {category.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <TouchableOpacity style={styles.addRuleButton} onPress={addCustomRule}>
            <Text style={styles.addRuleButtonText}>Add Rule</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <RefreshCw size={24} color="#6b7280" />
          <Text style={styles.loadingText}>Loading WAF Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>WAF Security Dashboard</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.tabBar}>
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'rules', label: 'Rules', icon: Shield },
          { key: 'logs', label: 'Logs', icon: Activity },
          { key: 'config', label: 'Config', icon: Settings },
        ].map(({ key, label, icon: Icon }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.activeTab]}
            onPress={() => setActiveTab(key as any)}
          >
            <Icon size={20} color={activeTab === key ? '#3b82f6' : '#6b7280'} />
            <Text style={[styles.tabText, activeTab === key && styles.activeTabText]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'rules' && renderRules()}
      {activeTab === 'logs' && renderLogs()}
      {activeTab === 'config' && renderConfig()}
      
      {renderAddRuleModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  blockedIPItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  blockedIPText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#1e293b',
  },
  unblockButton: {
    padding: 8,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    padding: 8,
    borderRadius: 8,
  },
  clearButton: {
    padding: 8,
  },
  ruleCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  ruleCategory: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  rulePattern: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 6,
  },
  ruleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  logCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 6,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTimestamp: {
    fontSize: 12,
    color: '#64748b',
  },
  logRule: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  logIP: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#475569',
  },
  logMethod: {
    fontSize: 12,
    color: '#64748b',
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  configSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  configLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  configInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minWidth: 80,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalClose: {
    fontSize: 16,
    color: '#3b82f6',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  pickerOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  pickerOptionText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  pickerOptionTextSelected: {
    color: '#fff',
  },
  addRuleButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  addRuleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default WAFDashboard;