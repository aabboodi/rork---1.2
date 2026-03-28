import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { 
  Key, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Copy,
  Eye,
  EyeOff
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

interface DigitalSignatureViewerProps {
  visible: boolean;
  onClose: () => void;
  signatureData: {
    signature: string;
    algorithm: 'RSA-PSS' | 'ECDSA';
    hashAlgorithm: 'SHA-256' | 'SHA-512';
    publicKey: string;
    certificateChain: string[];
    isValid: boolean;
    verificationDetails?: {
      timestamp: number;
      verifiedBy: string;
      errors?: string[];
      warnings?: string[];
    };
  };
}

const DigitalSignatureViewer: React.FC<DigitalSignatureViewerProps> = ({
  visible,
  onClose,
  signatureData
}) => {
  const [showFullSignature, setShowFullSignature] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (Platform.OS === 'web') {
        // Web fallback using navigator.clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          Alert.alert('تم النسخ', `تم نسخ ${label} إلى الحافظة`);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = text;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          Alert.alert('تم النسخ', `تم نسخ ${label} إلى الحافظة`);
        }
      } else {
        // Native platforms
        await Clipboard.setStringAsync(text);
        Alert.alert('تم النسخ', `تم نسخ ${label} إلى الحافظة`);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في نسخ النص');
    }
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getAlgorithmDescription = (algorithm: string) => {
    switch (algorithm) {
      case 'RSA-PSS':
        return 'RSA مع Probabilistic Signature Scheme - خوارزمية توقيع متقدمة وآمنة';
      case 'ECDSA':
        return 'Elliptic Curve Digital Signature Algorithm - خوارزمية توقيع منحنى إهليلجي';
      default:
        return algorithm;
    }
  };

  const getHashDescription = (hash: string) => {
    switch (hash) {
      case 'SHA-256':
        return 'SHA-256 - خوارزمية هاش آمنة 256 بت';
      case 'SHA-512':
        return 'SHA-512 - خوارزمية هاش آمنة 512 بت';
      default:
        return hash;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Key size={24} color="#3B82F6" />
            <Text style={styles.title}>تفاصيل التوقيع الرقمي</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* حالة التحقق */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={20} color={signatureData.isValid ? '#10B981' : '#EF4444'} />
              <Text style={styles.sectionTitle}>حالة التحقق</Text>
            </View>
            
            <View style={[
              styles.statusCard,
              { backgroundColor: signatureData.isValid ? '#F0FDF4' : '#FEF2F2' }
            ]}>
              <View style={styles.statusHeader}>
                {signatureData.isValid ? (
                  <CheckCircle size={24} color="#10B981" />
                ) : (
                  <AlertTriangle size={24} color="#EF4444" />
                )}
                <Text style={[
                  styles.statusText,
                  { color: signatureData.isValid ? '#10B981' : '#EF4444' }
                ]}>
                  {signatureData.isValid ? 'التوقيع صحيح وموثوق' : 'التوقيع غير صحيح'}
                </Text>
              </View>
              
              {signatureData.verificationDetails && (
                <View style={styles.verificationDetails}>
                  <Text style={styles.detailText}>
                    تم التحقق في: {formatTimestamp(signatureData.verificationDetails.timestamp)}
                  </Text>
                  <Text style={styles.detailText}>
                    تم التحقق بواسطة: {signatureData.verificationDetails.verifiedBy}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* خوارزميات التشفير */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>خوارزميات التشفير</Text>
            
            <View style={styles.algorithmCard}>
              <View style={styles.algorithmItem}>
                <Text style={styles.algorithmLabel}>خوارزمية التوقيع:</Text>
                <Text style={styles.algorithmValue}>{signatureData.algorithm}</Text>
                <Text style={styles.algorithmDescription}>
                  {getAlgorithmDescription(signatureData.algorithm)}
                </Text>
              </View>
              
              <View style={styles.algorithmItem}>
                <Text style={styles.algorithmLabel}>خوارزمية الهاش:</Text>
                <Text style={styles.algorithmValue}>{signatureData.hashAlgorithm}</Text>
                <Text style={styles.algorithmDescription}>
                  {getHashDescription(signatureData.hashAlgorithm)}
                </Text>
              </View>
            </View>
          </View>

          {/* التوقيع الرقمي */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>التوقيع الرقمي</Text>
              <TouchableOpacity
                onPress={() => setShowFullSignature(!showFullSignature)}
                style={styles.toggleButton}
              >
                {showFullSignature ? (
                  <EyeOff size={16} color="#6B7280" />
                ) : (
                  <Eye size={16} color="#6B7280" />
                )}
                <Text style={styles.toggleText}>
                  {showFullSignature ? 'إخفاء' : 'عرض كامل'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.dataCard}>
              <Text style={styles.dataText}>
                {showFullSignature 
                  ? signatureData.signature 
                  : truncateText(signatureData.signature, 100)
                }
              </Text>
              <TouchableOpacity
                onPress={() => copyToClipboard(signatureData.signature, 'التوقيع الرقمي')}
                style={styles.copyButton}
              >
                <Copy size={16} color="#3B82F6" />
                <Text style={styles.copyText}>نسخ</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* المفتاح العام */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>المفتاح العام</Text>
              <TouchableOpacity
                onPress={() => setShowPublicKey(!showPublicKey)}
                style={styles.toggleButton}
              >
                {showPublicKey ? (
                  <EyeOff size={16} color="#6B7280" />
                ) : (
                  <Eye size={16} color="#6B7280" />
                )}
                <Text style={styles.toggleText}>
                  {showPublicKey ? 'إخفاء' : 'عرض كامل'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.dataCard}>
              <Text style={styles.dataText}>
                {showPublicKey 
                  ? signatureData.publicKey 
                  : truncateText(signatureData.publicKey, 100)
                }
              </Text>
              <TouchableOpacity
                onPress={() => copyToClipboard(signatureData.publicKey, 'المفتاح العام')}
                style={styles.copyButton}
              >
                <Copy size={16} color="#3B82F6" />
                <Text style={styles.copyText}>نسخ</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* سلسلة الشهادات */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>سلسلة الشهادات</Text>
            
            {signatureData.certificateChain.length > 0 ? (
              signatureData.certificateChain.map((cert, index) => (
                <View key={index} style={styles.certificateCard}>
                  <View style={styles.certificateHeader}>
                    <Text style={styles.certificateTitle}>شهادة {index + 1}</Text>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(cert, `الشهادة ${index + 1}`)}
                      style={styles.copyButton}
                    >
                      <Copy size={14} color="#3B82F6" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.certificateText}>
                    {truncateText(cert, 80)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noCertificatesText}>لا توجد شهادات في السلسلة</Text>
            )}
          </View>

          {/* أخطاء وتحذيرات */}
          {signatureData.verificationDetails?.errors && 
           signatureData.verificationDetails.errors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>أخطاء التحقق</Text>
              <View style={styles.errorsCard}>
                {signatureData.verificationDetails.errors.map((error, index) => (
                  <View key={index} style={styles.errorItem}>
                    <AlertTriangle size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {signatureData.verificationDetails?.warnings && 
           signatureData.verificationDetails.warnings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>تحذيرات</Text>
              <View style={styles.warningsCard}>
                {signatureData.verificationDetails.warnings.map((warning, index) => (
                  <View key={index} style={styles.warningItem}>
                    <AlertTriangle size={16} color="#F59E0B" />
                    <Text style={styles.warningText}>{warning}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  toggleText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  statusCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  verificationDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  algorithmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    gap: 16,
  },
  algorithmItem: {
    gap: 4,
  },
  algorithmLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  algorithmValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  algorithmDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  dataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dataText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#374151',
    lineHeight: 18,
    marginBottom: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  copyText: {
    fontSize: 12,
    color: '#3B82F6',
    marginLeft: 4,
  },
  certificateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  certificateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  certificateTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  certificateText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#6B7280',
    lineHeight: 16,
  },
  noCertificatesText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  errorsCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  warningsCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#D97706',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default DigitalSignatureViewer;