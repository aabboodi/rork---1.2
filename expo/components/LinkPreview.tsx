import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Platform
} from 'react-native';
import { ExternalLink, AlertTriangle, Shield, Globe } from 'lucide-react-native';
import SocialEngineeringProtectionService, { LinkAnalysis } from '@/services/security/SocialEngineeringProtectionService';
import SocialEngineeringWarning from './SocialEngineeringWarning';
import InlineSecurityWarning from './InlineSecurityWarning';

interface LinkPreviewProps {
  url: string;
  senderId: string;
  senderName: string;
  showPreview?: boolean;
}

interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  domain: string;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({
  url,
  senderId,
  senderName,
  showPreview = true
}) => {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [analysis, setAnalysis] = useState<LinkAnalysis | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const protectionService = SocialEngineeringProtectionService.getInstance();

  useEffect(() => {
    analyzeLink();
    if (showPreview) {
      fetchMetadata();
    }
  }, [url]);

  const analyzeLink = async () => {
    try {
      const result = await protectionService.analyzeLink(url, senderId);
      setAnalysis(result);
    } catch (error) {
      console.error('Link analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // For demo purposes, we'll create mock metadata
      // In a real app, you'd fetch this from a metadata service
      setMetadata({
        title: `محتوى من ${domain}`,
        description: 'انقر لعرض المحتوى',
        domain
      });
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      setMetadata({
        title: 'رابط خارجي',
        description: url,
        domain: 'unknown'
      });
    }
  };

  const handleLinkPress = () => {
    if (!analysis) return;

    // Show warning for medium to high risk links
    if (analysis.riskScore >= 30) {
      setShowWarningModal(true);
      return;
    }

    // For low risk links, open directly
    openLink();
  };

  const openLink = () => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const getRiskLevel = (riskScore: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (riskScore >= 70) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>جاري تحليل الرابط...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {analysis && analysis.riskScore >= 30 && (
        <InlineSecurityWarning
          type="link"
          riskLevel={getRiskLevel(analysis.riskScore)}
          warnings={analysis.warnings}
          onViewDetails={() => setShowWarningModal(true)}
          compact={!showPreview}
        />
      )}

      {showPreview && metadata && (
        <TouchableOpacity style={styles.previewContainer} onPress={handleLinkPress}>
          <View style={styles.previewHeader}>
            <Globe size={16} color="#6b7280" />
            <Text style={styles.domain} numberOfLines={1}>
              {metadata.domain}
            </Text>
            {analysis && analysis.riskScore >= 30 && (
              <AlertTriangle size={16} color="#ea580c" />
            )}
          </View>

          {metadata.image && (
            <Image source={{ uri: metadata.image }} style={styles.previewImage} />
          )}

          <View style={styles.previewContent}>
            <Text style={styles.previewTitle} numberOfLines={2}>
              {metadata.title || 'رابط خارجي'}
            </Text>
            <Text style={styles.previewDescription} numberOfLines={3}>
              {metadata.description || url}
            </Text>
          </View>

          <View style={styles.previewFooter}>
            <ExternalLink size={14} color="#3b82f6" />
            <Text style={styles.openLinkText}>انقر للفتح</Text>
          </View>
        </TouchableOpacity>
      )}

      {!showPreview && (
        <TouchableOpacity style={styles.linkContainer} onPress={handleLinkPress}>
          <View style={styles.linkContent}>
            <ExternalLink size={16} color="#3b82f6" />
            <Text style={styles.linkText} numberOfLines={1}>
              {url}
            </Text>
            {analysis && analysis.riskScore >= 30 && (
              <AlertTriangle size={16} color="#ea580c" />
            )}
          </View>
        </TouchableOpacity>
      )}

      <SocialEngineeringWarning
        visible={showWarningModal}
        type="link"
        content={url}
        senderId={senderId}
        senderName={senderName}
        onProceed={() => {
          setShowWarningModal(false);
          openLink();
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
  previewContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginTop: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  domain: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  previewContent: {
    padding: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  openLinkText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  linkContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    marginTop: 4,
  },
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#1e40af',
    flex: 1,
    textDecorationLine: 'underline',
  },
});

export default LinkPreview;