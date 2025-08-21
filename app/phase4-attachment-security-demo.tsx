import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Shield, 
  Lock, 
  Key, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Upload,
  Download,
  Settings,
  Activity
} from 'lucide-react-native';
import AttachmentSecurityService, { 
  AttachmentScanResult,
  AttachmentMetadata 
} from '@/services/security/AttachmentSecurityService';
import EnhancedFileAttachment from '@/components/EnhancedFileAttachment';

const Phase4AttachmentSecurityDemo: React.FC = () => {
  const [serviceStatus, setServiceStatus] = useState({
    active: false,
    temporaryKeysCount: 0,
    attachmentsCount: 0,
    quarantinedCount: 0,
    encryptedCount: 0
  });
  const [testAttachments, setTestAttachments] = useState<AttachmentMetadata[]>([]);
  const [loading, setLoading] = useState(false);

  const attachmentService = AttachmentSecurityService.getInstance();

  useEffect(() => {
    initializeService();
    updateServiceStatus();
    
    // Update status every 5 seconds
    const interval = setInterval(updateServiceStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const initializeService = async () => {
    try {
      await attachmentService.initialize();
      console.log('Attachment Security Service initialized');
    } catch (error) {
      console.error('Failed to initialize service:', error);
      Alert.alert('خطأ', 'فشل في تهيئة خدمة أمان المرفقات');
    }
  };

  const updateServiceStatus = () => {
    const status = attachmentService.getServiceStatus();
    setServiceStatus(status);
  };

  const createTestFile = (
    name: string, 
    content: string, 
    type: string, 
    mimeType: string
  ): { fileName: string; fileData: string; fileType: string; mimeType: string; fileSize: number } => {
    return {
      fileName: name,
      fileData: content,
      fileType: type,
      mimeType,
      fileSize: content.length
    };
  };

  const testFiles = [
    createTestFile(
      'document.pdf',
      'This is a safe PDF document content',
      'pdf',
      'application/pdf'
    ),
    createTestFile(
      'sensitive_data.txt',
      'Credit Card: 4532-1234-5678-9012\\nSSN: 123-45-6789\\nPassword: mySecretPass123',
      'txt',
      'text/plain'
    ),
    createTestFile(
      'malicious.exe',
      'This is a potentially dangerous executable file',
      'exe',
      'application/x-executable'
    ),
    createTestFile(
      'large_file.zip',
      'A'.repeat(150 * 1024 * 1024), // 150MB file
      'zip',
      'application/zip'
    ),
    createTestFile(
      'image.jpg',
      'JPEG image data with EXIF information',
      'jpg',
      'image/jpeg'
    )
  ];

  const handleTestFileUpload = async (testFile: any) => {
    setLoading(true);
    
    try {
      console.log('Testing file upload:', testFile.fileName);
      
      const result = await attachmentService.processAttachment(
        testFile.fileData,
        testFile.fileName,
        testFile.fileType,
        testFile.mimeType,
        'test_user_123',
        'test_session_456'
      );
      
      console.log('File processing result:', result);
      
      // Update test attachments list
      const userAttachments = await attachmentService.getAttachmentsByUser('test_user_123');
      setTestAttachments(userAttachments);
      
      // Show result
      const statusText = result.quarantined 
        ? 'تم وضع الملف في الحجر الصحي'
        : result.encrypted 
        ? 'تم تشفير الملف بنجاح'
        : 'تم قبول الملف';
        
      Alert.alert('نتيجة المعالجة', statusText);
      
      updateServiceStatus();
    } catch (error) {
      console.error('File upload test failed:', error);
      Alert.alert('خطأ', 'فشل في اختبار رفع الملف');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveQuarantined = async (attachmentId: string) => {
    try {
      await attachmentService.approveQuarantinedAttachment(attachmentId, 'admin_user');
      
      // Refresh attachments list
      const userAttachments = await attachmentService.getAttachmentsByUser('test_user_123');
      setTestAttachments(userAttachments);
      
      Alert.alert('تمت الموافقة', 'تمت الموافقة على الملف المحجور');
      updateServiceStatus();
    } catch (error) {
      console.error('Approval failed:', error);
      Alert.alert('خطأ', 'فشل في الموافقة على الملف');
    }
  };

  const getStatusColor = (active: boolean) => active ? '#059669' : '#dc2626';
  const getStatusText = (active: boolean) => active ? 'نشط' : 'غير نشط';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Shield size={32} color="#3b82f6" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Phase 4 - حماية المرفقات</Text>
            <Text style={styles.subtitle}>
              DLP للمرفقات + تشفير E2EE بمفاتيح مؤقتة
            </Text>
          </View>
        </View>

        {/* Service Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>حالة الخدمة</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <Activity size={20} color={getStatusColor(serviceStatus.active)} />
              <Text style={styles.statusLabel}>الخدمة</Text>
              <Text style={[styles.statusValue, { color: getStatusColor(serviceStatus.active) }]}>
                {getStatusText(serviceStatus.active)}
              </Text>
            </View>
            
            <View style={styles.statusCard}>
              <Key size={20} color="#3b82f6" />
              <Text style={styles.statusLabel}>المفاتيح المؤقتة</Text>
              <Text style={styles.statusValue}>{serviceStatus.temporaryKeysCount}</Text>
            </View>
            
            <View style={styles.statusCard}>
              <FileText size={20} color="#6b7280" />
              <Text style={styles.statusLabel}>المرفقات</Text>
              <Text style={styles.statusValue}>{serviceStatus.attachmentsCount}</Text>
            </View>
            
            <View style={styles.statusCard}>
              <Lock size={20} color="#059669" />
              <Text style={styles.statusLabel}>مشفرة</Text>
              <Text style={styles.statusValue}>{serviceStatus.encryptedCount}</Text>
            </View>
            
            <View style={styles.statusCard}>
              <AlertTriangle size={20} color="#dc2626" />
              <Text style={styles.statusLabel}>محجورة</Text>
              <Text style={styles.statusValue}>{serviceStatus.quarantinedCount}</Text>
            </View>
          </View>
        </View>

        {/* Test Files */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>اختبار معالجة الملفات</Text>
          <Text style={styles.sectionDescription}>
            اختبر معالجة أنواع مختلفة من الملفات مع DLP والتشفير
          </Text>
          
          {testFiles.map((testFile, index) => (
            <View key={index} style={styles.testFileCard}>
              <View style={styles.testFileInfo}>
                <Text style={styles.testFileName}>{testFile.fileName}</Text>
                <Text style={styles.testFileDetails}>
                  {testFile.fileType.toUpperCase()} • {(testFile.fileSize / 1024).toFixed(1)} KB
                </Text>
                <Text style={styles.testFileDescription}>
                  {testFile.fileName.includes('sensitive') && 'يحتوي على بيانات حساسة'}
                  {testFile.fileName.includes('malicious') && 'ملف قابل للتنفيذ (خطر)'}
                  {testFile.fileName.includes('large') && 'ملف كبير الحجم'}
                  {testFile.fileName.includes('document') && 'مستند آمن'}
                  {testFile.fileName.includes('image') && 'صورة عادية'}
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.testButton, loading && styles.disabledButton]}
                onPress={() => handleTestFileUpload(testFile)}
                disabled={loading}
              >
                <Upload size={16} color="white" />
                <Text style={styles.testButtonText}>اختبار</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Processed Attachments */}
        {testAttachments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المرفقات المعالجة</Text>
            <Text style={styles.sectionDescription}>
              المرفقات التي تم معالجتها بواسطة النظام
            </Text>
            
            {testAttachments.map((attachment) => (
              <View key={attachment.id} style={styles.attachmentCard}>
                <EnhancedFileAttachment
                  attachmentId={attachment.id}
                  fileName={attachment.fileName}
                  fileSize={attachment.fileSize}
                  fileType={attachment.fileType}
                  mimeType={attachment.mimeType}
                  senderId={attachment.uploadedBy}
                  senderName="Test User"
                  sessionId={attachment.sessionId}
                  showProcessingStatus={true}
                />
                
                {attachment.quarantined && (
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApproveQuarantined(attachment.id)}
                  >
                    <CheckCircle size={16} color="white" />
                    <Text style={styles.approveButtonText}>الموافقة على الملف</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Features Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الميزات المطبقة</Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <CheckCircle size={20} color="#059669" />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>فحص DLP للمرفقات</Text>
                <Text style={styles.featureDescription}>
                  فحص المحتوى للبحث عن البيانات الحساسة
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <CheckCircle size={20} color="#059669" />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>تشفير E2EE بمفاتيح مؤقتة</Text>
                <Text style={styles.featureDescription}>
                  تشفير المرفقات بمفاتيح تتجدد كل 15 دقيقة
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <CheckCircle size={20} color="#059669" />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>الحجر الصحي التلقائي</Text>
                <Text style={styles.featureDescription}>
                  عزل الملفات المشبوهة تلقائياً
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <CheckCircle size={20} color="#059669" />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>تدوير المفاتيح</Text>
                <Text style={styles.featureDescription}>
                  تجديد المفاتيح تلقائياً لضمان الأمان
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <CheckCircle size={20} color="#059669" />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>سياسات DLP متقدمة</Text>
                <Text style={styles.featureDescription}>
                  قواعد مخصصة لأنواع الملفات المختلفة
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <CheckCircle size={20} color="#059669" />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>الحذف الآمن</Text>
                <Text style={styles.featureDescription}>
                  حذف البيانات الحساسة بشكل آمن
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Technical Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>التفاصيل التقنية</Text>
          
          <View style={styles.technicalCard}>
            <Text style={styles.technicalTitle}>خوارزميات التشفير</Text>
            <Text style={styles.technicalText}>• AES-GCM 256-bit للتشفير</Text>
            <Text style={styles.technicalText}>• HMAC-SHA256 للمصادقة</Text>
            <Text style={styles.technicalText}>• ECDH لتبادل المفاتيح</Text>
          </View>
          
          <View style={styles.technicalCard}>
            <Text style={styles.technicalTitle}>إدارة المفاتيح</Text>
            <Text style={styles.technicalText}>• مفاتيح مؤقتة تنتهي كل 15 دقيقة</Text>
            <Text style={styles.technicalText}>• حد أقصى 100 استخدام لكل مفتاح</Text>
            <Text style={styles.technicalText}>• إعادة تشفير تلقائية عند التجديد</Text>
          </View>
          
          <View style={styles.technicalCard}>
            <Text style={styles.technicalTitle}>سياسات DLP</Text>
            <Text style={styles.technicalText}>• فحص أرقام بطاقات الائتمان</Text>
            <Text style={styles.technicalText}>• كشف الهويات الوطنية</Text>
            <Text style={styles.technicalText}>• فلترة أنواع الملفات الخطيرة</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerIcon: {
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  testFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  testFileInfo: {
    flex: 1,
  },
  testFileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  testFileDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  testFileDescription: {
    fontSize: 11,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  attachmentCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    padding: 12,
    gap: 8,
  },
  approveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  technicalCard: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  technicalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  technicalText: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default Phase4AttachmentSecurityDemo;