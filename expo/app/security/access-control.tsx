import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import {
  Shield,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Users,
  Lock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  FileText,
  Activity
} from 'lucide-react-native';

import AccessControlService from '@/services/security/AccessControlService';
import AccessControlDashboard from '@/components/AccessControlDashboard';
import { ABACPolicy, ABACCondition, RBACRole, UserRoleAssignment } from '@/types';

type TabType = 'dashboard' | 'policies' | 'roles' | 'audit';

const AccessControlScreen: React.FC = () => {
  const [accessControlService] = useState(() => AccessControlService.getInstance());
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [policies, setPolicies] = useState<ABACPolicy[]>([]);
  const [roles, setRoles] = useState<RBACRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ABACPolicy | null>(null);
  const [editingRole, setEditingRole] = useState<RBACRole | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    loadAccessControlData();
  }, []);

  const loadAccessControlData = async () => {
    try {
      setIsLoading(true);
      const allPolicies = accessControlService.getAllPolicies();
      setPolicies(allPolicies);
      
      // Load roles (this would typically come from a service)
      // For now, we'll use mock data
      setRoles([]);
      
    } catch (error) {
      console.error('Failed to load access control data:', error);
      Alert.alert('Error', 'Failed to load access control data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePolicy = () => {
    setEditingPolicy(null);
    setShowPolicyModal(true);
  };

  const handleEditPolicy = (policy: ABACPolicy) => {
    setEditingPolicy(policy);
    setShowPolicyModal(true);
  };

  const handleDeletePolicy = async (policyId: string) => {
    Alert.alert(
      'Delete Policy',
      'Are you sure you want to delete this policy?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await accessControlService.removePolicy(policyId);
            if (success) {
              loadAccessControlData();
            } else {
              Alert.alert('Error', 'Failed to delete policy');
            }
          }
        }
      ]
    );
  };

  const handleTogglePolicy = async (policyId: string, enabled: boolean) => {
    const policy = accessControlService.getPolicyById(policyId);
    if (policy) {
      const updatedPolicy = { ...policy, enabled };
      const success = await accessControlService.addCustomPolicy(updatedPolicy);
      if (success) {
        loadAccessControlData();
      }
    }
  };

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         policy.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterEnabled === null || policy.enabled === filterEnabled;
    return matchesSearch && matchesFilter;
  });

  const renderTabButton = (tab: TabType, icon: React.ReactNode, label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => setActiveTab(tab)}
    >
      {icon}
      <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderPolicyCard = (policy: ABACPolicy) => (
    <View key={policy.id} style={styles.policyCard}>
      <View style={styles.policyHeader}>
        <View style={styles.policyInfo}>
          <Text style={styles.policyName}>{policy.name}</Text>
          <Text style={styles.policyDescription}>{policy.description}</Text>
        </View>
        <View style={styles.policyActions}>
          <Switch
            value={policy.enabled}
            onValueChange={(enabled) => handleTogglePolicy(policy.id, enabled)}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={policy.enabled ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>
      </View>
      
      <View style={styles.policyDetails}>
        <View style={styles.policyBadge}>
          <Text style={[styles.policyBadgeText, { 
            color: policy.effect === 'allow' ? '#10B981' : '#EF4444' 
          }]}>
            {policy.effect.toUpperCase()}
          </Text>
        </View>
        <View style={styles.policyBadge}>
          <Text style={styles.policyBadgeText}>Priority: {policy.priority}</Text>
        </View>
        <View style={styles.policyBadge}>
          <Text style={styles.policyBadgeText}>
            {policy.conditions.length} condition{policy.conditions.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.policyFooter}>
        <Text style={styles.policyTimestamp}>
          Created: {new Date(policy.createdAt).toLocaleDateString()}
        </Text>
        <View style={styles.policyActionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditPolicy(policy)}
          >
            <Edit3 size={16} color="#6B7280" />
          </TouchableOpacity>
          {policy.createdBy !== 'system' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeletePolicy(policy.id)}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderPoliciesTab = () => (
    <View style={styles.tabContent}>
      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search policies..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Filter Options */}
      <View style={styles.filterOptions}>
        <TouchableOpacity
          style={[styles.filterOption, filterEnabled === null && styles.filterOptionActive]}
          onPress={() => setFilterEnabled(null)}
        >
          <Text style={[styles.filterOptionText, filterEnabled === null && styles.filterOptionTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterOption, filterEnabled === true && styles.filterOptionActive]}
          onPress={() => setFilterEnabled(true)}
        >
          <Text style={[styles.filterOptionText, filterEnabled === true && styles.filterOptionTextActive]}>
            Enabled
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterOption, filterEnabled === false && styles.filterOptionActive]}
          onPress={() => setFilterEnabled(false)}
        >
          <Text style={[styles.filterOptionText, filterEnabled === false && styles.filterOptionTextActive]}>
            Disabled
          </Text>
        </TouchableOpacity>
      </View>

      {/* Create Policy Button */}
      <TouchableOpacity style={styles.createButton} onPress={handleCreatePolicy}>
        <Plus size={20} color="#FFFFFF" />
        <Text style={styles.createButtonText}>Create Policy</Text>
      </TouchableOpacity>

      {/* Policies List */}
      <ScrollView style={styles.policiesList}>
        {filteredPolicies.map(renderPolicyCard)}
        {filteredPolicies.length === 0 && (
          <View style={styles.emptyState}>
            <FileText size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No policies found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Create your first policy to get started'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderRolesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.comingSoon}>
        <Users size={48} color="#D1D5DB" />
        <Text style={styles.comingSoonText}>Role Management</Text>
        <Text style={styles.comingSoonSubtext}>
          RBAC role management interface coming soon
        </Text>
      </View>
    </View>
  );

  const renderAuditTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.comingSoon}>
        <Activity size={48} color="#D1D5DB" />
        <Text style={styles.comingSoonText}>Audit Logs</Text>
        <Text style={styles.comingSoonSubtext}>
          Detailed audit log interface coming soon
        </Text>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AccessControlDashboard />;
      case 'policies':
        return renderPoliciesTab();
      case 'roles':
        return renderRolesTab();
      case 'audit':
        return renderAuditTab();
      default:
        return <AccessControlDashboard />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Access Control',
          headerStyle: { backgroundColor: '#667eea' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' }
        }} 
      />

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('dashboard', <Activity size={20} color={activeTab === 'dashboard' ? '#FFFFFF' : '#9CA3AF'} />, 'Dashboard')}
        {renderTabButton('policies', <Shield size={20} color={activeTab === 'policies' ? '#FFFFFF' : '#9CA3AF'} />, 'Policies')}
        {renderTabButton('roles', <Users size={20} color={activeTab === 'roles' ? '#FFFFFF' : '#9CA3AF'} />, 'Roles')}
        {renderTabButton('audit', <FileText size={20} color={activeTab === 'audit' ? '#FFFFFF' : '#9CA3AF'} />, 'Audit')}
      </View>

      {/* Tab Content */}
      {renderTabContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tabButtonActive: {
    backgroundColor: '#667eea',
  },
  tabText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 6,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabContent: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterOptions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterOptionActive: {
    backgroundColor: '#667eea',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  policiesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  policyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  policyHeader: {
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
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  policyDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  policyActions: {
    alignItems: 'flex-end',
  },
  policyDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  policyBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  policyBadgeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  policyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  policyTimestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  policyActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  comingSoon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  comingSoonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default AccessControlScreen;