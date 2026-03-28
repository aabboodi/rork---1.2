import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { 
  FileText, 
  Download, 
  AlertTriangle, 
  Shield, 
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  File,
  Lock,
  Key,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react-native';
import AttachmentSecurityService, { 
  AttachmentScanResult, 
  AttachmentMetadata 
} from '@/services/security/AttachmentSecurityService';
import SocialEngineeringWarning from './SocialEngineeringWarning';
import InlineSecurityWarning from './InlineSecurityWarning';

interface EnhancedFileAttachmentProps {
  attachmentId?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  fileData?: ArrayBuffer | string;
  downloadUrl?: string;
  senderId: string;
  senderName: string;
  sessionId: string;
  onDownload?: () => void;
  onProcessed?: (result: AttachmentScanResult) => void;
  showProcessingStatus?: boolean;
}

const EnhancedFileAttachment: React.FC<EnhancedFileAttachmentProps> = ({
  attachmentId,
  fileName,
  fileSize,
  fileType,
  mimeType,
  fileData,
  downloadUrl,
  senderId,
  senderName,
  sessionId,
  onDownload,
  onProcessed,
  showProcessingStatus = true
}) => {
  const [scanResult, setScanResult] = useState<AttachmentScanResult | null>(null);
  const [metadata, setMetadata] = useState<AttachmentMetadata | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachmentService = AttachmentSecurityService.getInstance();

  useEffect(() => {
    if (attachmentId) {
      loadExistingAttachment();
    } else if (fileData) {
      processNewAttachment();
    }
  }, [attachmentId, fileData]);

  const loadExistingAttachment = async () => {
    try {
      if (!attachmentId) return;
      
      const existingMetadata = await attachmentService.getAttachmentMetadata(attachmentId);
      if (existingMetadata) {
        setMetadata(existingMetadata);
        
        // Create scan result from metadata
        const result: AttachmentScanResult = {
          allowed: !existingMetadata.quarantined,
          quarantined: existingMetadata.quarantined,
          encrypted: existingMetadata.encrypted,
          dlpResult: existingMetadata.dlpScanResult || {
            allowed: true,
            violations: [],
            warnings: [],
            requiresUserConfirmation: false,
            suggestedAction: 'proceed'
          },
          metadata: existingMetadata,
          temporaryKeyId: existingMetadata.keyId,
          warnings: existingMetadata.dlpScanResult?.warnings || [],
          requiresApproval: false
        };
        
        setScanResult(result);
      }
    } catch (error) {
      console.error('Failed to load attachment metadata:', error);
      setError('فشل في تحميل بيانات الملف');
    }
  };

  const processNewAttachment = async () => {
    if (!fileData) return;
    
    setProcessing(true);
    setError(null);
    
    try {
      console.log('Processing new attachment:', fileName);
      
      const result = await attachmentService.processAttachment(
        fileData,
        fileName,
        fileType,
        mimeType,
        senderId,
        sessionId
      );
      
      setScanResult(result);
      setMetadata(result.metadata);
      
      if (onProcessed) {
        onProcessed(result);
      }
      
      console.log('Attachment processing completed:', result);
    } catch (error) {
      console.error('Attachment processing failed:', error);
      setError('فشل في معالجة الملف');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!scanResult || !metadata) return;

    // Show warning for quarantined or suspicious files
    if (scanResult.quarantined || scanResult.dlpResult.violations.length > 0) {
      setShowWarningModal(true);
      return;
    }

    await proceedWithDownload();
  };

  const proceedWithDownload = async () => {
    if (!metadata || !attachmentId) {
      // Fallback to regular download
      if (onDownload) {
        onDownload();
      } else if (downloadUrl) {
        if (Platform.OS === 'web') {
          window.open(downloadUrl, '_blank');
        } else {
          Alert.alert('تحميل', 'سيتم تحميل الملف قريباً');
        }
      }
      return;
    }

    if (metadata.encrypted && attachmentId) {
      await handleEncryptedDownload();
    } else {
      // Regular download
      if (onDownload) {
        onDownload();
      } else {
        Alert.alert('تحميل', 'سيتم تحميل الملف قريباً');
      }
    }
  };

  const handleEncryptedDownload = async () => {
    if (!attachmentId) return;
    
    setDecrypting(true);
    
    try {
      console.log('Decrypting attachment:', attachmentId);
      
      const decryptedData = await attachmentService.decryptAttachment(
        attachmentId,
        senderId // In production, use current user ID
      );
      
      // Create blob and download
      if (Platform.OS === 'web') {
        const blob = new Blob([decryptedData], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        Alert.alert('تم فك التشفير', 'تم فك تشفير الملف بنجاح');
      }
      
      console.log('Attachment decrypted and downloaded successfully');
    } catch (error) {
      console.error('Decryption failed:', error);
      Alert.alert('خطأ', 'فشل في فك تشفير الملف');
    } finally {
      setDecrypting(false);
    }
  };

  const getFileIcon = () => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const size = 24;
    const color = getFileIconColor();

    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <ImageIcon size={size} color={color} />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return <Video size={size} color={color} />;
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
        return <Music size={size} color={color} />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
        return <Archive size={size} color={color} />;
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
        return <FileText size={size} color={color} />;
      default:
        return <File size={size} color={color} />;
    }
  };

  const getFileIconColor = () => {
    if (error) return '#dc2626';
    if (scanResult?.quarantined) return '#dc2626';
    if (scanResult?.dlpResult.violations.length > 0) return '#ea580c';
    if (metadata?.encrypted) return '#059669';
    return '#6b7280';
  };

  const getStatusIcon = () => {
    if (processing) return <ActivityIndicator size={16} color="#3b82f6" />;
    if (error) return <XCircle size={16} color="#dc2626" />;
    if (scanResult?.quarantined) return <AlertTriangle size={16} color="#dc2626" />;
    if (metadata?.encrypted) return <Lock size={16} color="#059669" />;
    if (scanResult?.allowed) return <CheckCircle size={16} color="#059669" />;
    return null;
  };

  const getStatusText = () => {
    if (processing) return 'جاري المعالجة...';
    if (error) return error;
    if (scanResult?.quarantined) return 'في الحجر الصحي';
    if (metadata?.encrypted) return 'مشفر';
    if (scanResult?.allowed) return 'آمن';
    return 'غير معروف';
  };

  const getStatusColor = () => {
    if (processing) return '#3b82f6';
    if (error) return '#dc2626';
    if (scanResult?.quarantined) return '#dc2626';
    if (metadata?.encrypted) return '#059669';
    if (scanResult?.allowed) return '#059669';
    return '#6b7280';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getRiskLevel = (violations: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (violations >= 3) return 'critical';
    if (violations >= 2) return 'high';
    if (violations >= 1) return 'medium';
    return 'low';
  };

  return (
    <View style={styles.container}>
      {scanResult && scanResult.dlpResult.violations.length > 0 && (
        <InlineSecurityWarning
          type="file"
          riskLevel={getRiskLevel(scanResult.dlpResult.violations.length)}
          warnings={scanResult.warnings}
          onViewDetails={() => setShowWarningModal(true)}
          compact
        />
      )}

      <View style={[
        styles.fileContainer,
        scanResult?.quarantined && styles.quarantinedFile,
        metadata?.encrypted && styles.encryptedFile
      ]}>
        <View style={styles.fileInfo}>
          <View style={styles.fileIconContainer}>
            {getFileIcon()}
            {(scanResult?.quarantined || scanResult?.dlpResult.violations.length > 0) && (
              <View style={styles.warningBadge}>
                <AlertTriangle size={12} color="white" />
              </View>
            )}
            {metadata?.encrypted && (
              <View style={styles.encryptionBadge}>
                <Lock size={10} color="white" />
              </View>
            )}
          </View>

          <View style={styles.fileDetails}>
            <Text style={styles.fileName} numberOfLines={2}>
              {fileName}
            </Text>
            <View style={styles.fileMetadata}>
              <Text style={[styles.fileSize, { color: getFileIconColor() }]}>
                {formatFileSize(fileSize)}
              </Text>
              <Text style={styles.separator}>•</Text>
              <Text style={[styles.fileType, { color: getFileIconColor() }]}>
                {fileType.toUpperCase()}
              </Text>
            </View>
            
            {showProcessingStatus && (
              <View style={styles.statusContainer}>
                {getStatusIcon()}
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </View>
            )}

            {metadata?.encrypted && scanResult?.temporaryKeyId && (
              <View style={styles.encryptionInfo}>
                <Key size={12} color="#059669" />
                <Text style={styles.encryptionText}>
                  مفتاح مؤقت: {scanResult.temporaryKeyId.slice(-8)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.downloadButton,
            scanResult?.quarantined && styles.quarantinedDownloadButton,
            metadata?.encrypted && styles.encryptedDownloadButton,
            (processing || decrypting) && styles.disabledDownloadButton
          ]}
          onPress={handleDownload}
          disabled={processing || decrypting || !!error}
        >
          {decrypting ? (
            <ActivityIndicator size={20} color="#059669" />
          ) : scanResult?.quarantined ? (
            <Shield size={20} color="#dc2626" />
          ) : metadata?.encrypted ? (
            <Lock size={20} color="#059669" />
          ) : (
            <Download size={20} color="#3b82f6" />
          )}
        </TouchableOpacity>
      </View>

      {scanResult && scanResult.warnings.length > 0 && (
        <View style={styles.warningsContainer}>
          <Text style={styles.warningsTitle}>تحذيرات الأمان:</Text>
          {scanResult.warnings.slice(0, 2).map((warning, index) => (
            <Text key={index} style={styles.warningText}>
              • {warning}
            </Text>
          ))}
          {scanResult.warnings.length > 2 && (
            <TouchableOpacity onPress={() => setShowWarningModal(true)}>
              <Text style={styles.moreWarnings}>
                +{scanResult.warnings.length - 2} تحذيرات إضافية
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {metadata?.quarantined && (
        <View style={styles.quarantineNotice}>
          <AlertTriangle size={16} color="#dc2626" />
          <Text style={styles.quarantineText}>
            هذا الملف في الحجر الصحي ويتطلب موافقة للوصول إليه
          </Text>
        </View>
      )}

      <SocialEngineeringWarning
        visible={showWarningModal}
        type="file"
        content={fileName}
        fileName={fileName}
        fileSize={fileSize}
        senderId={senderId}
        senderName={senderName}
        onProceed={() => {
          setShowWarningModal(false);
          proceedWithDownload();
        }}
        onCancel={() => setShowWarningModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  fileContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  quarantinedFile: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  encryptedFile: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  fileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileIconContainer: {
    position: 'relative',
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  warningBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  encryptionBadge: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    backgroundColor: '#059669',
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  fileMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: '#6b7280',
  },
  separator: {
    fontSize: 12,
    color: '#d1d5db',
  },
  fileType: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  encryptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  encryptionText: {
    fontSize: 11,
    color: '#059669',
    fontFamily: 'monospace',
  },
  downloadButton: {
    padding: 8,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
  },
  quarantinedDownloadButton: {
    backgroundColor: '#fecaca',
  },
  encryptedDownloadButton: {
    backgroundColor: '#dcfce7',
  },
  disabledDownloadButton: {
    opacity: 0.5,
  },
  warningsContainer: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  warningsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#991b1b',
    marginBottom: 2,
  },
  moreWarnings: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  quarantineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  quarantineText: {
    flex: 1,
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '500',
  },
});

export default EnhancedFileAttachment;