import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform
} from 'react-native';
import { Shield, Cookie, Lock, AlertTriangle, CheckCircle, XCircle, RotateCcw, Trash2 } from 'lucide-react-native';
import HttpOnlyCookieService from '@/services/security/HttpOnlyCookieService';

interface CookieSecurityStatus {
  initialized: boolean;
  totalCookies: number;
  securityEvents: number;
  criticalEvents: number;
  deviceBindingEnabled: boolean;
  encryptionEnabled: boolean;
  signatureValidationEnabled: boolean;
  platform: string;
}

interface CookieInfo {
  name: string;
  encrypted: boolean;
  signed: boolean;
  deviceBound: boolean;
  expiresAt: string;
  size: number;
}

const HttpOnlyCookieDashboard: React.FC = () => {
  const [cookieStatus, setCookieStatus] = useState<CookieSecurityStatus | null>(null);
  const [cookies, setCookies] = useState<CookieInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const cookieService = HttpOnlyCookieService.getInstance();

  useEffect(() => {
    loadCookieData();
  }, []);

  const loadCookieData = async () => {
    try {
      setLoading(true);
      
      // Get cookie security status
      const status = cookieService.getCookieSecurityStatus();
      setCookieStatus(status);

      // Get all cookies (for debugging - in production this should be limited)
      const allCookies = cookieService.getAllCookies();
      const cookieInfo: CookieInfo[] = allCookies.map(cookie => ({
        name: cookie.name,
        encrypted: cookie.options.encrypted || false,
        signed: cookie.options.signed || false,
        deviceBound: !!cookie.deviceBinding,
        expiresAt: cookie.options.maxAge 
          ? new Date(cookie.timestamp + cookie.options.maxAge).toISOString()
          : 'Never',
        size: new Blob([`${cookie.name}=${cookie.value}`]).size
      }));
      
      setCookies(cookieInfo);
    } catch (error) {
      console.error('Failed to load cookie data:', error);
      Alert.alert('Error', 'Failed to load cookie security data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCookieData();
    setRefreshing(false);
  };

  const handleRotateKeys = async () => {
    Alert.alert(
      'Rotate Cookie Keys',
      'This will re-encrypt all cookies with new keys. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rotate',
          style: 'destructive',
          onPress: async () => {
            try {
              await cookieService.rotateCookieKeys();
              Alert.alert('Success', 'Cookie encryption keys rotated successfully');
              await loadCookieData();
            } catch (error) {
              Alert.alert('Error', 'Failed to rotate cookie keys');
            }
          }
        }
      ]
    );
  };

  const handleClearCookies = async () => {
    Alert.alert(
      'Clear All Cookies',
      'This will remove all secure cookies. You will be logged out. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await cookieService.clearAllCookies();
              Alert.alert('Success', 'All cookies cleared successfully');
              await loadCookieData();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cookies');
            }
          }
        }
      ]
    );
  };

  const getSecurityLevelColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'low': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getSecurityLevel = (): 'high' | 'medium' | 'low' => {
    if (!cookieStatus) return 'low';
    
    if (cookieStatus.deviceBindingEnabled && 
        cookieStatus.encryptionEnabled && 
        cookieStatus.signatureValidationEnabled &&
        cookieStatus.criticalEvents === 0) {
      return 'high';
    } else if (cookieStatus.encryptionEnabled && cookieStatus.criticalEvents < 5) {
      return 'medium';
    } else {
      return 'low';
    }
  };

  const renderSecurityOverview = () => {
    if (!cookieStatus) return null;

    const securityLevel = getSecurityLevel();
    const securityColor = getSecurityLevelColor(securityLevel);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Shield size={24} color="#3B82F6" />
          <Text style={styles.cardTitle}>HttpOnly Cookie Security</Text>
        </View>
        
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Security Level</Text>
            <View style={[styles.statusBadge, { backgroundColor: securityColor }]}>
              <Text style={styles.statusBadgeText}>{securityLevel.toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Platform</Text>
            <Text style={styles.statusValue}>{cookieStatus.platform}</Text>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Total Cookies</Text>
            <Text style={styles.statusValue}>{cookieStatus.totalCookies}</Text>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Security Events</Text>
            <Text style={[styles.statusValue, { color: cookieStatus.criticalEvents > 0 ? '#EF4444' : '#10B981' }]}>
              {cookieStatus.securityEvents} ({cookieStatus.criticalEvents} critical)
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSecurityFeatures = () => {
    if (!cookieStatus) return null;

    const features = [
      {
        name: 'XSS Protection',
        enabled: true, // HttpOnly cookies always provide XSS protection
        description: 'Prevents JavaScript access to cookies'
      },
      {
        name: 'Device Binding',
        enabled: cookieStatus.deviceBindingEnabled,
        description: 'Cookies bound to specific device'
      },
      {
        name: 'Encryption',
        enabled: cookieStatus.encryptionEnabled,
        description: 'Cookie values are encrypted'
      },
      {
        name: 'Signature Validation',
        enabled: cookieStatus.signatureValidationEnabled,
        description: 'Detects cookie tampering'
      },
      {
        name: 'Secure Transmission',
        enabled: Platform.OS === 'web', // HTTPS required for web
        description: 'Cookies sent over HTTPS only'
      },
      {
        name: 'SameSite Protection',
        enabled: Platform.OS === 'web',
        description: 'Prevents CSRF attacks'
      }
    ];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Lock size={24} color="#10B981" />
          <Text style={styles.cardTitle}>Security Features</Text>
        </View>
        
        {features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <View style={styles.featureInfo}>
              {feature.enabled ? (
                <CheckCircle size={20} color="#10B981" />
              ) : (
                <XCircle size={20} color="#EF4444" />
              )}
              <View style={styles.featureText}>
                <Text style={styles.featureName}>{feature.name}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
            <View style={[styles.featureStatus, { backgroundColor: feature.enabled ? '#10B981' : '#EF4444' }]}>
              <Text style={styles.featureStatusText}>
                {feature.enabled ? 'ENABLED' : 'DISABLED'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderCookieList = () => {
    if (cookies.length === 0) {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Cookie size={24} color="#F59E0B" />
            <Text style={styles.cardTitle}>Active Cookies</Text>
          </View>
          <Text style={styles.emptyText}>No cookies found</Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Cookie size={24} color="#F59E0B" />
          <Text style={styles.cardTitle}>Active Cookies ({cookies.length})</Text>
        </View>
        
        {cookies.map((cookie, index) => (
          <View key={index} style={styles.cookieItem}>
            <View style={styles.cookieHeader}>
              <Text style={styles.cookieName}>{cookie.name}</Text>
              <Text style={styles.cookieSize}>{cookie.size} bytes</Text>
            </View>
            
            <View style={styles.cookieFeatures}>
              {cookie.encrypted && (
                <View style={[styles.cookieFeature, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.cookieFeatureText}>ENCRYPTED</Text>
                </View>
              )}
              {cookie.signed && (
                <View style={[styles.cookieFeature, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.cookieFeatureText}>SIGNED</Text>
                </View>
              )}
              {cookie.deviceBound && (
                <View style={[styles.cookieFeature, { backgroundColor: '#8B5CF6' }]}>
                  <Text style={styles.cookieFeatureText}>DEVICE BOUND</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.cookieExpiry}>
              Expires: {cookie.expiresAt === 'Never' ? 'Never' : new Date(cookie.expiresAt).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderActions = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <AlertTriangle size={24} color="#F59E0B" />
        <Text style={styles.cardTitle}>Security Actions</Text>
      </View>
      
      <TouchableOpacity style={styles.actionButton} onPress={handleRotateKeys}>
        <RotateCcw size={20} color="#3B82F6" />
        <Text style={styles.actionButtonText}>Rotate Encryption Keys</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleClearCookies}>
        <Trash2 size={20} color="#EF4444" />
        <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Clear All Cookies</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading cookie security data...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Shield size={32} color="#3B82F6" />
        <Text style={styles.title}>HttpOnly Cookie Security</Text>
        <Text style={styles.subtitle}>XSS Protection & Secure Token Storage</Text>
      </View>

      {renderSecurityOverview()}
      {renderSecurityFeatures()}
      {renderCookieList()}
      {renderActions()}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          HttpOnly cookies protect JWT tokens from XSS attacks by preventing JavaScript access.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusItem: {
    width: '48%',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  featureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    marginLeft: 12,
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  featureDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  featureStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featureStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cookieItem: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  cookieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cookieName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  cookieSize: {
    fontSize: 12,
    color: '#6B7280',
  },
  cookieFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  cookieFeature: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  cookieFeatureText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cookieExpiry: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginLeft: 8,
  },
  dangerButton: {
    backgroundColor: '#FEF2F2',
  },
  dangerButtonText: {
    color: '#EF4444',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    padding: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default HttpOnlyCookieDashboard;