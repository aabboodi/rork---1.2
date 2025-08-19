import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { AlertTriangle, Shield, X, ExternalLink, FileText, Eye, EyeOff } from 'lucide-react-native';
import SocialEngineeringProtectionService, { LinkAnalysis, FileAnalysis } from '@/services/security/SocialEngineeringProtectionService';

interface SocialEngineeringWarningProps {
  type: 'link' | 'file';
  content: string;
  fileName?: string;
  fileSize?: number;
  senderId: string;
  senderName: string;
  onProceed: () => void;
  onCancel: () => void;
  visible: boolean;
}

const SocialEngineeringWarning: React.FC<SocialEngineeringWarningProps> = ({
  type,
  content,
  fileName,
  fileSize,
  senderId,
  senderName,
  onProceed,
  onCancel,
  visible
}) => {
  const [analysis, setAnalysis] = useState<LinkAnalysis | FileAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [userAcknowledged, setUserAcknowledged] = useState(false);

  const protectionService = SocialEngineeringProtectionService.getInstance();

  useEffect(() => {
    if (visible) {
      analyzeContent();
    }
  }, [visible, content]);

  const analyzeContent = async () => {
    setLoading(true);
    try {
      let result;
      if (type === 'link') {
        result = await protectionService.analyzeLink(content, senderId);
      } else {
        result = await protectionService.analyzeFile(
          fileName || 'unknown',
          fileName?.split('.').pop() || 'unknown',
          fileSize || 0,
          senderId
        );
      }
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return '#dc2626'; // red-600
    if (riskScore >= 50) return '#ea580c'; // orange-600
    if (riskScore >= 30) return '#d97706'; // amber-600
    return '#16a34a'; // green-600
  };

  const getRiskText = (riskScore: number) => {
    if (riskScore >= 70) return 'خطر عالي جداً';
    if (riskScore >= 50) return 'خطر عالي';
    if (riskScore >= 30) return 'خطر متوسط';
    return 'خطر منخفض';
  };

  const handleProceed = () => {
    if (!userAcknowledged && analysis && analysis.riskScore >= 50) {
      Alert.alert(
        'تأكيد المتابعة',
        'أنت على وشك المتابعة رغم التحذيرات الأمنية. هل أنت متأكد؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          { 
            text: 'متابعة', 
            style: 'destructive',
            onPress: () => {
              reportAndProceed();
            }
          }
        ]
      );
      return;
    }
    reportAndProceed();
  };

  const reportAndProceed = async () => {
    if (analysis && analysis.riskScore >= 30) {
      await protectionService.reportSuspiciousActivity({
        type,
        content,
        sender: {
          id: senderId,
          name: senderName,
          isContact: false, // This should be determined properly
          trustLevel: 'unknown'
        },
        riskLevel: analysis.riskScore >= 70 ? 'critical' : 
                  analysis.riskScore >= 50 ? 'high' : 'medium',
        detectedPatterns: analysis.warnings
      });
    }
    onProceed();
  };

  const openInBrowser = () => {
    if (type === 'link' && Platform.OS === 'web') {
      window.open(content, '_blank');
    } else if (type === 'link') {
      Linking.openURL(content);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AlertTriangle size={24} color="#dc2626" />
              <Text style={styles.title}>تحذير أمني</Text>
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>جاري تحليل المحتوى...</Text>
              </View>
            ) : analysis ? (
              <>
                <View style={styles.riskIndicator}>
                  <View style={[styles.riskBadge, { backgroundColor: getRiskColor(analysis.riskScore) }]}>
                    <Text style={styles.riskText}>{getRiskText(analysis.riskScore)}</Text>
                  </View>
                  <Text style={styles.riskScore}>نقاط الخطر: {analysis.riskScore}/100</Text>
                </View>

                <View style={styles.contentInfo}>
                  <Text style={styles.sectionTitle}>
                    {type === 'link' ? 'معلومات الرابط' : 'معلومات الملف'}
                  </Text>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>المرسل:</Text>
                    <Text style={styles.infoValue}>{senderName}</Text>
                  </View>
                  {type === 'link' ? (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>الرابط:</Text>
                      <Text style={styles.infoValue} numberOfLines={2}>{content}</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>اسم الملف:</Text>
                        <Text style={styles.infoValue}>{fileName}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>حجم الملف:</Text>
                        <Text style={styles.infoValue}>
                          {fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)} MB` : 'غير معروف'}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {analysis.warnings.length > 0 && (
                  <View style={styles.warningsContainer}>
                    <Text style={styles.sectionTitle}>التحذيرات المكتشفة</Text>
                    {analysis.warnings.map((warning, index) => (
                      <View key={index} style={styles.warningItem}>
                        <AlertTriangle size={16} color="#dc2626" />
                        <Text style={styles.warningText}>{warning}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.detailsToggle}
                  onPress={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                  <Text style={styles.detailsToggleText}>
                    {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                  </Text>
                </TouchableOpacity>

                {showDetails && (
                  <View style={styles.detailsContainer}>
                    <Text style={styles.sectionTitle}>تفاصيل التحليل</Text>
                    {type === 'link' && 'isShortened' in analysis && (
                      <Text style={styles.detailText}>
                        رابط مختصر: {analysis.isShortened ? 'نعم' : 'لا'}
                      </Text>
                    )}
                    {type === 'link' && 'isPhishing' in analysis && (
                      <Text style={styles.detailText}>
                        احتمالية التصيد: {analysis.isPhishing ? 'عالية' : 'منخفضة'}
                      </Text>
                    )}
                    {type === 'file' && 'isSuspicious' in analysis && (
                      <Text style={styles.detailText}>
                        ملف مشبوه: {analysis.isSuspicious ? 'نعم' : 'لا'}
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.educationalContent}>
                  <Text style={styles.sectionTitle}>نصائح أمنية</Text>
                  <Text style={styles.tipText}>
                    • تحقق دائماً من هوية المرسل قبل النقر على الروابط أو تحميل الملفات
                  </Text>
                  <Text style={styles.tipText}>
                    • لا تدخل معلومات شخصية في مواقع غير موثوقة
                  </Text>
                  <Text style={styles.tipText}>
                    • استخدم برامج مكافحة الفيروسات المحدثة
                  </Text>
                </View>

                {analysis.riskScore >= 50 && (
                  <View style={styles.acknowledgmentContainer}>
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => setUserAcknowledged(!userAcknowledged)}
                    >
                      <View style={[styles.checkbox, userAcknowledged && styles.checkboxChecked]}>
                        {userAcknowledged && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.acknowledgmentText}>
                        أفهم المخاطر وأرغب في المتابعة
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.errorText}>فشل في تحليل المحتوى</Text>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Shield size={20} color="#6b7280" />
              <Text style={styles.cancelButtonText}>إلغاء (آمن)</Text>
            </TouchableOpacity>
            
            {type === 'link' && (
              <TouchableOpacity style={styles.browserButton} onPress={openInBrowser}>
                <ExternalLink size={20} color="#3b82f6" />
                <Text style={styles.browserButtonText}>فتح في المتصفح</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.proceedButton,
                analysis && analysis.riskScore >= 70 && styles.dangerButton
              ]}
              onPress={handleProceed}
            >
              <FileText size={20} color="white" />
              <Text style={styles.proceedButtonText}>متابعة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  riskIndicator: {
    alignItems: 'center',
    marginBottom: 20,
  },
  riskBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  riskText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  riskScore: {
    fontSize: 14,
    color: '#6b7280',
  },
  contentInfo: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  warningsContainer: {
    marginBottom: 16,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  warningText: {
    fontSize: 14,
    color: '#dc2626',
    flex: 1,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 16,
  },
  detailsToggleText: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailsContainer: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  educationalContent: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  tipText: {
    fontSize: 14,
    color: '#1e40af',
    marginBottom: 4,
    lineHeight: 20,
  },
  acknowledgmentContainer: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  acknowledgmentText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  browserButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
  },
  browserButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  proceedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#16a34a',
    borderRadius: 8,
  },
  dangerButton: {
    backgroundColor: '#dc2626',
  },
  proceedButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    padding: 20,
  },
});

export default SocialEngineeringWarning;