import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform
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
  File
} from 'lucide-react-native';
import SocialEngineeringProtectionService, { FileAnalysis } from '@/services/security/SocialEngineeringProtectionService';
import SocialEngineeringWarning from './SocialEngineeringWarning';
import InlineSecurityWarning from './InlineSecurityWarning';

interface FileAttachmentProps {
  fileName: string;
  fileSize: number;
  fileType: string;
  downloadUrl?: string;
  senderId: string;
  senderName: string;
  onDownload?: () => void;
}

const FileAttachment: React.FC<FileAttachmentProps> = ({
  fileName,
  fileSize,
  fileType,
  downloadUrl,
  senderId,
  senderName,
  onDownload
}) => {
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const protectionService = SocialEngineeringProtectionService.getInstance();

  useEffect(() => {
    analyzeFile();
  }, [fileName, fileSize, fileType]);

  const analyzeFile = async () => {
    try {
      const result = await protectionService.analyzeFile(fileName, fileType, fileSize, senderId);
      setAnalysis(result);
    } catch (error) {
      console.error('File analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = () => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const size = 24;
    const color = '#6b7280';

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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    if (!analysis) return;

    // Show warning for suspicious files
    if (analysis.isSuspicious || analysis.riskScore >= 30) {
      setShowWarningModal(true);
      return;
    }

    // For safe files, proceed with download
    proceedWithDownload();
  };

  const proceedWithDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (downloadUrl) {
      if (Platform.OS === 'web') {
        window.open(downloadUrl, '_blank');
      } else {
        // In a real app, you'd handle file download here
        Alert.alert('تحميل', 'سيتم تحميل الملف قريباً');
      }
    }
  };

  const getRiskLevel = (riskScore: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (riskScore >= 70) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  };

  const getFileTypeColor = () => {
    if (analysis && analysis.isSuspicious) return '#dc2626';
    if (analysis && analysis.riskScore >= 30) return '#ea580c';
    return '#6b7280';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>جاري تحليل الملف...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {analysis && analysis.riskScore >= 30 && (
        <InlineSecurityWarning
          type="file"
          riskLevel={getRiskLevel(analysis.riskScore)}
          warnings={analysis.warnings}
          onViewDetails={() => setShowWarningModal(true)}
          compact
        />
      )}

      <View style={[styles.fileContainer, analysis?.isSuspicious && styles.suspiciousFile]}>
        <View style={styles.fileInfo}>
          <View style={styles.fileIconContainer}>
            {getFileIcon()}
            {analysis && analysis.isSuspicious && (
              <View style={styles.warningBadge}>
                <AlertTriangle size={12} color="white" />
              </View>
            )}
          </View>

          <View style={styles.fileDetails}>
            <Text style={styles.fileName} numberOfLines={2}>
              {fileName}
            </Text>
            <View style={styles.fileMetadata}>
              <Text style={[styles.fileSize, { color: getFileTypeColor() }]}>
                {formatFileSize(fileSize)}
              </Text>
              <Text style={styles.separator}>•</Text>
              <Text style={[styles.fileType, { color: getFileTypeColor() }]}>
                {fileType.toUpperCase()}
              </Text>
            </View>
            
            {analysis && analysis.riskScore >= 50 && (
              <View style={styles.riskIndicator}>
                <AlertTriangle size={14} color="#dc2626" />
                <Text style={styles.riskText}>ملف عالي الخطورة</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.downloadButton,
            analysis?.isSuspicious && styles.suspiciousDownloadButton
          ]}
          onPress={handleDownload}
        >
          {analysis && analysis.isSuspicious ? (
            <Shield size={20} color="#dc2626" />
          ) : (
            <Download size={20} color="#3b82f6" />
          )}
        </TouchableOpacity>
      </View>

      {analysis && analysis.warnings.length > 0 && (
        <View style={styles.warningsContainer}>
          <Text style={styles.warningsTitle}>تحذيرات:</Text>
          {analysis.warnings.slice(0, 2).map((warning, index) => (
            <Text key={index} style={styles.warningText}>
              • {warning}
            </Text>
          ))}
          {analysis.warnings.length > 2 && (
            <TouchableOpacity onPress={() => setShowWarningModal(true)}>
              <Text style={styles.moreWarnings}>
                +{analysis.warnings.length - 2} تحذيرات إضافية
              </Text>
            </TouchableOpacity>
          )}
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
  loadingContainer: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
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
  suspiciousFile: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
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
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  riskText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  downloadButton: {
    padding: 8,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
  },
  suspiciousDownloadButton: {
    backgroundColor: '#fecaca',
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
});

export default FileAttachment;