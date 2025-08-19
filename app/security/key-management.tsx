import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Switch,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft,
  Key,
  Plus,
  Settings,
  RotateCcw,
  Shield,
  Database,
  Cloud,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Download,
  Upload,
  Trash2,
  Edit3
} from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import KeyManagementDashboard from '@/components/KeyManagementDashboard';
import EnterpriseKeyManager, { EnterpriseKeyMetadata } from '@/services/security/EnterpriseKeyManager';

interface KeyCreationForm {
  id: string;
  algorithm: string;
  keySize: number;
  purpose: 'encryption' | 'signing' | 'authentication';
  provider: 'local' | 'aws-kms' | 'vault' | 'hardware';
  complianceLevel: 'standard' | 'high' | 'critical';
  rotationEnabled: boolean;
  rotationInterval: number;
  maxAge: number;
  requiresApproval: boolean;
}

const KeyManagementScreen: React.FC = () => {
  const [keys, setKeys] = useState<EnterpriseKeyMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState<EnterpriseKeyMetadata | null>(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [createForm, setCreateForm] = useState<KeyCreationForm>({
    id: '',
    algorithm: 'AES-256',
    keySize: 256,
    purpose: 'encryption',
    provider: 'vault',
    complianceLevel: 'high',
    rotationEnabled: true,
    rotationInterval: 24 * 30, // شهر
    maxAge: 24 * 90, // 3 أشهر
    requiresApproval: false
  });

  const enterpriseManager = EnterpriseKeyManager.getInstance();

  useEffect(() => {
    initializeKeyManager();
  }, []);

  const initializeKeyManager = async () => {
    try {
      setIsLoading(true);
      
      // تهيئة مدير المفاتيح المؤسسي
      await enterpriseManager.initialize({
        vault: {
          endpoint: 'https://vault.example.com',
          token: 'demo-token',
          namespace: 'enterprise'
        },
        compliance: {
          standards: ['FIPS-140-2', 'Common Criteria', 'SOC2', 'ISO27001'],
          auditRetention: 2555 // 7 سنوات
        }
      });

      // تحميل المفاتيح الموجودة
      await loadKeys();
    } catch (error) {
      console.error('Failed to initialize key manager:', error);
      Alert.alert('خطأ', 'فشل في تهيئة مدير المفاتيح');
    } finally {
      setIsLoading(false);
    }
  };

  const loadKeys = async () => {
    try {
      const allKeys = await enterpriseManager.listKeys();
      setKeys(allKeys);
    } catch (error) {
      console.error('Failed to load keys:', error);
    }
  };

  const handleCreateKey = async () => {
    try {
      if (!createForm.id.trim()) {
        Alert.alert('خطأ', 'يرجى إدخال معرف المفتاح');
        return;
      }

      const keyData = await enterpriseManager.generateKey(createForm.id, {
        algorithm: createForm.algorithm,
        keySize: createForm.keySize,
        purpose: createForm.purpose,
        provider: createForm.provider,
        complianceLevel: createForm.complianceLevel,
        rotationEnabled: createForm.rotationEnabled,
        policy: {
          rotationInterval: createForm.rotationInterval,
          maxAge: createForm.maxAge,
          requiresApproval: createForm.requiresApproval,
          autoCleanup: true,
          complianceRequirements: getComplianceRequirements(createForm.complianceLevel),
          backupRequired: createForm.complianceLevel !== 'standard'
        },
        userId: 'admin'
      });

      Alert.alert('نجح', `تم إنشاء المفتاح بنجاح: ${createForm.id}`);
      setShowCreateModal(false);
      resetCreateForm();
      await loadKeys();
    } catch (error) {
      console.error('Failed to create key:', error);
      Alert.alert('خطأ', 'فشل في إنشاء المفتاح: ' + error.message);
    }
  };

  const handleRotateKey = async (keyId: string) => {
    Alert.alert(
      'تناوب المفتاح',
      `هل أنت متأكد من أنك تريد تناوب المفتاح: ${keyId}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد',
          style: 'destructive',
          onPress: async () => {
            try {
              await enterpriseManager.rotateKey(keyId, 'manual', 'admin');
              Alert.alert('نجح', 'تم تناوب المفتاح بنجاح');
              await loadKeys();
            } catch (error) {
              Alert.alert('خطأ', 'فشل في تناوب المفتاح: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const handleRevokeKey = async (keyId: string) => {
    Alert.alert(
      'إلغاء المفتاح',
      `هل أنت متأكد من أنك تريد إلغاء المفتاح: ${keyId}؟ هذا الإجراء لا يمكن التراجع عنه.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد',
          style: 'destructive',
          onPress: async () => {
            try {
              await enterpriseManager.revokeKey(keyId);
              Alert.alert('نجح', 'تم إلغاء المفتاح بنجاح');
              await loadKeys();
            } catch (error) {
              Alert.alert('خطأ', 'فشل في إلغاء المفتاح: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const getComplianceRequirements = (level: string): string[] => {
    switch (level) {
      case 'critical':
        return ['FIPS-140-2', 'Common Criteria', 'SOC2', 'ISO27001'];
      case 'high':
        return ['FIPS-140-2', 'SOC2'];
      default:
        return ['SOC2'];
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      id: '',
      algorithm: 'AES-256',
      keySize: 256,
      purpose: 'encryption',
      provider: 'vault',
      complianceLevel: 'high',
      rotationEnabled: true,
      rotationInterval: 24 * 30,
      maxAge: 24 * 90,
      requiresApproval: false
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return '#10b981';
      case 'deprecated': return '#f59e0b';
      case 'revoked': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'aws-kms': return <Cloud size={16} color="#ff9900" />;
      case 'vault': return <Database size={16} color="#1daeff" />;
      case 'hardware': return <Shield size={16} color="#10b981" />;
      default: return <Key size={16} color="#6b7280" />;
    }
  };

  const filteredKeys = keys.filter(key => {
    const matchesSearch = key.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         key.algorithm.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = filterProvider === 'all' || key.provider === filterProvider;
    const matchesStatus = filterStatus === 'all' || key.status === filterStatus;
    
    return matchesSearch && matchesProvider && matchesStatus;
  });

  const renderCreateKeyModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCreateModal(false)}>
            <ArrowLeft size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>إنشاء مفتاح جديد</Text>
          <TouchableOpacity onPress={handleCreateKey}>
            <Text style={styles.saveButton}>حفظ</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* معرف المفتاح */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>معرف المفتاح *</Text>
            <TextInput
              style={styles.formInput}
              value={createForm.id}
              onChangeText={(text) => setCreateForm({ ...createForm, id: text })}
              placeholder="أدخل معرف فريد للمفتاح"
              autoCapitalize="none"
            />
          </View>

          {/* الخوارزمية */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>الخوارزمية</Text>
            <View style={styles.pickerContainer}>
              {['AES-256', 'AES-128', 'RSA-2048', 'RSA-4096', 'ECDSA-P256', 'ECDSA-P384'].map((alg) => (
                <TouchableOpacity
                  key={alg}
                  style={[
                    styles.pickerOption,
                    createForm.algorithm === alg && styles.pickerOptionSelected
                  ]}
                  onPress={() => setCreateForm({ ...createForm, algorithm: alg })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    createForm.algorithm === alg && styles.pickerOptionTextSelected
                  ]}>
                    {alg}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* الغرض */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>الغرض</Text>
            <View style={styles.pickerContainer}>
              {[
                { value: 'encryption', label: 'تشفير' },
                { value: 'signing', label: 'توقيع' },
                { value: 'authentication', label: 'مصادقة' }
              ].map((purpose) => (
                <TouchableOpacity
                  key={purpose.value}
                  style={[
                    styles.pickerOption,
                    createForm.purpose === purpose.value && styles.pickerOptionSelected
                  ]}
                  onPress={() => setCreateForm({ ...createForm, purpose: purpose.value as any })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    createForm.purpose === purpose.value && styles.pickerOptionTextSelected
                  ]}>
                    {purpose.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* المزود */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>مزود الخدمة</Text>
            <View style={styles.pickerContainer}>
              {[
                { value: 'vault', label: 'HashiCorp Vault' },
                { value: 'aws-kms', label: 'AWS KMS' },
                { value: 'hardware', label: 'Hardware HSM' },
                { value: 'local', label: 'محلي' }
              ].map((provider) => (
                <TouchableOpacity
                  key={provider.value}
                  style={[
                    styles.pickerOption,
                    createForm.provider === provider.value && styles.pickerOptionSelected
                  ]}
                  onPress={() => setCreateForm({ ...createForm, provider: provider.value as any })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    createForm.provider === provider.value && styles.pickerOptionTextSelected
                  ]}>
                    {provider.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* مستوى الامتثال */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>مستوى الامتثال</Text>
            <View style={styles.pickerContainer}>
              {[
                { value: 'standard', label: 'قياسي' },
                { value: 'high', label: 'عالي' },
                { value: 'critical', label: 'حرج' }
              ].map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.pickerOption,
                    createForm.complianceLevel === level.value && styles.pickerOptionSelected
                  ]}
                  onPress={() => setCreateForm({ ...createForm, complianceLevel: level.value as any })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    createForm.complianceLevel === level.value && styles.pickerOptionTextSelected
                  ]}>
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* إعدادات التناوب */}
          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>تفعيل التناوب التلقائي</Text>
              <Switch
                value={createForm.rotationEnabled}
                onValueChange={(value) => setCreateForm({ ...createForm, rotationEnabled: value })}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor={createForm.rotationEnabled ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </View>

          {createForm.rotationEnabled && (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>فترة التناوب (ساعات)</Text>
                <TextInput
                  style={styles.formInput}
                  value={createForm.rotationInterval.toString()}
                  onChangeText={(text) => setCreateForm({ ...createForm, rotationInterval: parseInt(text) || 0 })}
                  placeholder="720"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>العمر الأقصى (ساعات)</Text>
                <TextInput
                  style={styles.formInput}
                  value={createForm.maxAge.toString()}
                  onChangeText={(text) => setCreateForm({ ...createForm, maxAge: parseInt(text) || 0 })}
                  placeholder="2160"
                  keyboardType="numeric"
                />
              </View>
            </>
          )}

          {/* متطلبات الموافقة */}
          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>يتطلب موافقة للتناوب</Text>
              <Switch
                value={createForm.requiresApproval}
                onValueChange={(value) => setCreateForm({ ...createForm, requiresApproval: value })}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor={createForm.requiresApproval ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderKeyItem = (key: EnterpriseKeyMetadata) => (
    <TouchableOpacity
      key={key.id}
      style={styles.keyCard}
      onPress={() => setSelectedKey(key)}
    >
      <View style={styles.keyHeader}>
        <View style={styles.keyInfo}>
          <View style={styles.keyTitleRow}>
            {getProviderIcon(key.provider)}
            <Text style={styles.keyId}>{showSensitiveData ? key.id : '••••••••'}</Text>
          </View>
          <Text style={styles.keyAlgorithm}>{key.algorithm} • {key.purpose}</Text>
        </View>
        <View style={[styles.keyStatus, { backgroundColor: getStatusColor(key.status) }]}>
          <Text style={styles.keyStatusText}>
            {key.status === 'active' ? 'نشط' : 
             key.status === 'deprecated' ? 'مهمل' : 'ملغي'}
          </Text>
        </View>
      </View>

      <View style={styles.keyDetails}>
        <View style={styles.keyDetailItem}>
          <Text style={styles.keyDetailLabel}>المزود</Text>
          <Text style={styles.keyDetailValue}>{key.provider}</Text>
        </View>
        <View style={styles.keyDetailItem}>
          <Text style={styles.keyDetailLabel}>الامتثال</Text>
          <Text style={styles.keyDetailValue}>{key.complianceLevel}</Text>
        </View>
        <View style={styles.keyDetailItem}>
          <Text style={styles.keyDetailLabel}>آخر استخدام</Text>
          <Text style={styles.keyDetailValue}>
            {key.lastUsed.toLocaleDateString('ar')}
          </Text>
        </View>
      </View>

      {key.rotationEnabled && key.nextRotation && (
        <View style={styles.rotationInfo}>
          <Clock size={14} color="#6b7280" />
          <Text style={styles.rotationText}>
            التناوب التالي: {key.nextRotation.toLocaleDateString('ar')}
          </Text>
        </View>
      )}

      <View style={styles.keyActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleRotateKey(key.id)}
        >
          <RotateCcw size={16} color="#3b82f6" />
          <Text style={styles.actionButtonText}>تناوب</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={() => handleRevokeKey(key.id)}
        >
          <Trash2 size={16} color="#ef4444" />
          <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>إلغاء</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'إدارة المفاتيح المتقدمة',
          headerShown: false
        }} 
      />

      <LinearGradient
        colors={['#1e40af', '#3b82f6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>إدارة المفاتيح المتقدمة</Text>
          <TouchableOpacity onPress={() => setShowSensitiveData(!showSensitiveData)}>
            {showSensitiveData ? (
              <EyeOff size={24} color="#ffffff" />
            ) : (
              <Eye size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* لوحة التحكم */}
      <KeyManagementDashboard 
        onNavigateToDetail={(keyId) => {
          // التنقل إلى تفاصيل المفتاح أو التقرير
          console.log('Navigate to detail:', keyId);
        }}
      />

      {/* شريط البحث والفلاتر */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="البحث في المفاتيح..."
          placeholderTextColor="#6b7280"
        />
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* قائمة المفاتيح */}
      <ScrollView style={styles.keysList} showsVerticalScrollIndicator={false}>
        {filteredKeys.length === 0 ? (
          <View style={styles.emptyState}>
            <Key size={48} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>لا توجد مفاتيح</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'لم يتم العثور على مفاتيح تطابق البحث' : 'ابدأ بإنشاء مفتاح جديد'}
            </Text>
          </View>
        ) : (
          filteredKeys.map(renderKeyItem)
        )}
      </ScrollView>

      {renderCreateKeyModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  keysList: {
    flex: 1,
    paddingHorizontal: 16
  },
  keyCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  keyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  keyInfo: {
    flex: 1
  },
  keyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  keyId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  keyAlgorithm: {
    fontSize: 14,
    color: '#6b7280'
  },
  keyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  keyStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff'
  },
  keyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  keyDetailItem: {
    flex: 1
  },
  keyDetailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2
  },
  keyDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937'
  },
  rotationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  rotationText: {
    fontSize: 12,
    color: '#6b7280'
  },
  keyActions: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3b82f6'
  },
  dangerButton: {
    borderColor: '#ef4444'
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6'
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  formGroup: {
    marginBottom: 20
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8
  },
  formInput: {
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff'
  },
  pickerOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff'
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#6b7280'
  },
  pickerOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
});

export default KeyManagementScreen;