import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Shield, Lock, AlertTriangle, CheckCircle, XCircle, Activity, Database, Cpu } from 'lucide-react-native';
import SecurityGuardrailsService from '@/services/ai/SecurityGuardrailsService';

interface SecurityStatus {
  policyVersion: string;
  integrityValid: boolean;
  resourcesWithinLimits: boolean;
  noWalletRuleActive: boolean;
  privacyByDefaultActive: boolean;
  lastCheck: number;
}

interface ResourceMetrics {
  memoryUsageMB: number;
  cpuUsage: number;
  latencyMs: number;
  isWithinLimits: boolean;
  timestamp: number;
}

export default function SecurityGuardrailsDashboard() {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [resourceMetrics, setResourceMetrics] = useState<ResourceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const securityService = SecurityGuardrailsService.getInstance();

  useEffect(() => {
    loadSecurityStatus();
    const interval = setInterval(loadSecurityStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSecurityStatus = async () => {
    try {
      const status = await securityService.getSecurityStatus();
      setSecurityStatus(status);
      
      // Mock resource metrics (in real app, get from native modules)
      setResourceMetrics({
        memoryUsageMB: Math.random() * 25 + 5,
        cpuUsage: Math.random() * 60 + 10,
        latencyMs: Math.random() * 100 + 20,
        isWithinLimits: Math.random() > 0.2,
        timestamp: Date.now()
      });
      
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Failed to load security status:', error);
      setLoading(false);
    }
  };

  const testNoWalletRule = async () => {
    try {
      const allowed = await securityService.enforceNoWalletRule('/wallet/send', 'WalletComponent');
      Alert.alert(
        'NO-WALLET RULE TEST',
        allowed ? 'ERROR: Wallet access was allowed!' : 'SUCCESS: Wallet access blocked ✅',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Test Error', `Failed to test no-wallet rule: ${error}`);
    }
  };

  const testPrivacyByDefault = async () => {
    try {
      const testData = {
        message: 'This is sensitive user text that should be anonymized',
        userId: '12345',
        timestamp: Date.now()
      };
      
      const result = await securityService.enforcePrivacyByDefault(testData, 'transmit');
      Alert.alert(
        'PRIVACY-BY-DEFAULT TEST',
        result.allowed 
          ? `SUCCESS: Data sanitized ✅\nOriginal: ${testData.message.substring(0, 30)}...\nSanitized: ${JSON.stringify(result.sanitizedData).substring(0, 50)}...`
          : `BLOCKED: ${result.reason}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Test Error', `Failed to test privacy by default: ${error}`);
    }
  };

  const testIntegrityCheck = async () => {
    try {
      const testModel = { weights: [0.1, 0.2, 0.3], version: '1.0' };
      const isValid = await securityService.verifyIntegrity('model', testModel);
      Alert.alert(
        'INTEGRITY CHECK TEST',
        isValid ? 'SUCCESS: Model integrity verified ✅' : 'FAILED: Model integrity check failed ❌',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Test Error', `Failed to test integrity check: ${error}`);
    }
  };

  const testResourceLimits = async () => {
    try {
      const result = await securityService.enforceResourceLimits('test_operation', {
        memoryMB: 35, // Exceeds limit of 30MB
        latencyMs: 150, // Exceeds limit of 120ms
        cpuUsage: 90 // Exceeds limit of 80%
      });
      
      Alert.alert(
        'RESOURCE LIMITS TEST',
        result.allowed 
          ? 'ERROR: Resource limits not enforced!' 
          : `SUCCESS: Resource limits enforced ✅\nReason: ${result.reason}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Test Error', `Failed to test resource limits: ${error}`);
    }
  };

  const getStatusIcon = (isActive: boolean, isValid?: boolean) => {
    if (isValid === false) return <XCircle size={20} color="#ef4444" />;
    return isActive ? <CheckCircle size={20} color="#10b981" /> : <XCircle size={20} color="#ef4444" />;
  };

  const getResourceColor = (value: number, limit: number) => {
    const percentage = value / limit;
    if (percentage > 0.9) return '#ef4444'; // Red
    if (percentage > 0.7) return '#f59e0b'; // Yellow
    return '#10b981'; // Green
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Activity size={24} color="#6366f1" />
          <Text style={styles.loadingText}>Loading Security Status...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Shield size={28} color="#6366f1" />
        <Text style={styles.title}>Security Guardrails</Text>
        <Text style={styles.subtitle}>
          Last updated: {lastUpdate.toLocaleTimeString()}
        </Text>
      </View>

      {/* Security Policy Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security Policy Status</Text>
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Policy Version</Text>
            <Text style={styles.statusValue}>{securityStatus?.policyVersion}</Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Integrity Valid</Text>
            {getStatusIcon(true, securityStatus?.integrityValid)}
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>NO-WALLET Rule</Text>
            {getStatusIcon(securityStatus?.noWalletRuleActive || false)}
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Privacy-by-Default</Text>
            {getStatusIcon(securityStatus?.privacyByDefaultActive || false)}
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Resources Within Limits</Text>
            {getStatusIcon(resourceMetrics?.isWithinLimits || false)}
          </View>
        </View>
      </View>

      {/* Resource Monitoring */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resource Monitoring</Text>
        <View style={styles.card}>
          <View style={styles.resourceRow}>
            <View style={styles.resourceInfo}>
              <Database size={20} color="#6366f1" />
              <Text style={styles.resourceLabel}>Memory Usage</Text>
            </View>
            <Text style={[
              styles.resourceValue,
              { color: getResourceColor(resourceMetrics?.memoryUsageMB || 0, 30) }
            ]}>
              {resourceMetrics?.memoryUsageMB?.toFixed(1) || '0'} / 30 MB
            </Text>
          </View>
          
          <View style={styles.resourceRow}>
            <View style={styles.resourceInfo}>
              <Cpu size={20} color="#6366f1" />
              <Text style={styles.resourceLabel}>CPU Usage</Text>
            </View>
            <Text style={[
              styles.resourceValue,
              { color: getResourceColor(resourceMetrics?.cpuUsage || 0, 80) }
            ]}>
              {resourceMetrics?.cpuUsage?.toFixed(1) || '0'} / 80%
            </Text>
          </View>
          
          <View style={styles.resourceRow}>
            <View style={styles.resourceInfo}>
              <Activity size={20} color="#6366f1" />
              <Text style={styles.resourceLabel}>Latency</Text>
            </View>
            <Text style={[
              styles.resourceValue,
              { color: getResourceColor(resourceMetrics?.latencyMs || 0, 120) }
            ]}>
              {resourceMetrics?.latencyMs?.toFixed(0) || '0'} / 120 ms
            </Text>
          </View>
        </View>
      </View>

      {/* Security Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security Tests</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.testButton} onPress={testNoWalletRule}>
            <Lock size={20} color="#ffffff" />
            <Text style={styles.testButtonText}>Test NO-WALLET Rule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testPrivacyByDefault}>
            <Shield size={20} color="#ffffff" />
            <Text style={styles.testButtonText}>Test Privacy-by-Default</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testIntegrityCheck}>
            <CheckCircle size={20} color="#ffffff" />
            <Text style={styles.testButtonText}>Test Integrity Check</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testResourceLimits}>
            <AlertTriangle size={20} color="#ffffff" />
            <Text style={styles.testButtonText}>Test Resource Limits</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Security Rules Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security Rules Summary</Text>
        <View style={styles.card}>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleTitle}>🚫 NO-WALLET RULE</Text>
            <Text style={styles.ruleDescription}>
              Strict prevention of accessing any financial paths/components
            </Text>
          </View>
          
          <View style={styles.ruleItem}>
            <Text style={styles.ruleTitle}>🔒 Privacy-by-Default</Text>
            <Text style={styles.ruleDescription}>
              No raw text upload; anonymized signals; encrypted storage
            </Text>
          </View>
          
          <View style={styles.ruleItem}>
            <Text style={styles.ruleTitle}>✅ Integrity Checks</Text>
            <Text style={styles.ruleDescription}>
              Model/policy signing + SHA256 verification
            </Text>
          </View>
          
          <View style={styles.ruleItem}>
            <Text style={styles.ruleTitle}>⚡ Resource Guards</Text>
            <Text style={styles.ruleDescription}>
              Time/memory limits; graceful background shutdown; no UI blocking
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statusLabel: {
    fontSize: 16,
    color: '#475569',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  resourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  resourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resourceLabel: {
    fontSize: 16,
    color: '#475569',
  },
  resourceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    gap: 8,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  ruleItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});