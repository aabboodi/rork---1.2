import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { PolicyAgent, SignedPolicy, PolicyValidationRequest, TrustedKey } from '@/services/ai/edge/policy';
import * as Crypto from 'expo-crypto';

interface PolicyAgentStatus {
  isInitialized: boolean;
  policiesCount: number;
  trustedKeysCount: number;
  lastValidation?: {
    taskId: string;
    allowed: boolean;
    reason?: string;
    timestamp: number;
  };
}

export default function PolicyAgentDemo() {
  const [policyAgent] = useState(() => new PolicyAgent());
  const [status, setStatus] = useState<PolicyAgentStatus>({
    isInitialized: false,
    policiesCount: 0,
    trustedKeysCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState<SignedPolicy[]>([]);
  const [trustedKeys, setTrustedKeys] = useState<TrustedKey[]>([]);

  useEffect(() => {
    initializePolicyAgent();
  }, [initializePolicyAgent]);

  const initializePolicyAgent = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔐 Initializing PolicyAgent...');
      
      await policyAgent.initialize();
      
      const currentPolicies = policyAgent.getPolicies();
      const currentKeys = policyAgent['verifier']?.getTrustedKeys() || [];
      
      setPolicies(currentPolicies);
      setTrustedKeys(currentKeys);
      
      setStatus({
        isInitialized: true,
        policiesCount: currentPolicies.length,
        trustedKeysCount: currentKeys.length,
      });
      
      console.log('✅ PolicyAgent initialized successfully');
    } catch (error) {
      console.error('❌ PolicyAgent initialization failed:', error);
      Alert.alert('Error', `Failed to initialize PolicyAgent: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [policyAgent]);

  const testPolicyValidation = async (taskType: string, shouldPass: boolean) => {
    try {
      setLoading(true);
      
      const taskId = await Crypto.randomUUID();
      const request: PolicyValidationRequest = {
        taskId,
        taskType,
        input: shouldPass ? 'Simple test input' : 'Very long input that exceeds policy limits '.repeat(1000),
        maxTokens: shouldPass ? 1000 : 50000, // Exceed token limit for failure test
        userContext: {
          userId: 'test-user',
          role: 'user',
          securityLevel: 'medium'
        },
        deviceContext: {
          deviceId: 'test-device-123',
          osVersion: '17.0',
          appVersion: '1.0.0',
          securityFeatures: ['biometric-auth', 'secure-enclave']
        }
      };

      console.log(`🔍 Testing ${taskType} validation (should ${shouldPass ? 'pass' : 'fail'})...`);
      
      const result = await policyAgent.validateTask(request);
      
      setStatus(prev => ({
        ...prev,
        lastValidation: {
          taskId,
          allowed: result.allowed,
          reason: result.reason,
          timestamp: result.validationTimestamp
        }
      }));

      const message = `Task ${taskId.substring(0, 8)}...\n` +
                    `Type: ${taskType}\n` +
                    `Result: ${result.allowed ? '✅ ALLOWED' : '🚫 BLOCKED'}\n` +
                    `Reason: ${result.reason || 'Policy approved'}\n` +
                    `Applied Rules: ${result.appliedRules.join(', ') || 'None'}\n` +
                    `Policy Version: ${result.policyVersion}`;

      Alert.alert('Policy Validation Result', message);
      
    } catch (error) {
      console.error('❌ Policy validation failed:', error);
      Alert.alert('Error', `Policy validation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTestPolicies = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading test signed policies...');
      
      const now = Date.now();
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      
      const testPolicies: SignedPolicy[] = [
        {
          id: 'test-strict-policy',
          version: '2.0.0',
          name: 'Test Strict Security Policy',
          fingerprint: await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            'test-strict-policy-content'
          ),
          signature: {
            algorithm: 'ECDSA-P256',
            signature: 'test-signature-strict',
            keyId: 'mada-policy-key-1',
            timestamp: now
          },
          validFrom: now,
          validUntil: now + oneYear,
          securityLevel: 'high',
          rules: [
            {
              id: 'strict-token-limit',
              type: 'limit',
              priority: 200,
              condition: {
                tokenLimit: 2000 // Very strict limit
              },
              action: {
                type: 'block',
                message: 'Task exceeds strict token limit (2,000)'
              }
            },
            {
              id: 'chat-approval-required',
              type: 'require_approval',
              priority: 150,
              condition: {
                taskType: ['chat'],
                requiresApproval: true
              },
              action: {
                type: 'require_approval',
                message: 'Chat tasks require approval'
              }
            },
            {
              id: 'moderation-allow',
              type: 'allow',
              priority: 100,
              condition: {
                taskType: ['moderation']
              },
              action: {
                type: 'allow'
              }
            }
          ]
        }
      ];

      const result = await policyAgent.loadSignedPolicies(testPolicies);
      
      const updatedPolicies = policyAgent.getPolicies();
      setPolicies(updatedPolicies);
      
      setStatus(prev => ({
        ...prev,
        policiesCount: updatedPolicies.length
      }));

      Alert.alert(
        'Policies Loaded',
        `Loaded: ${result.loaded}\nRejected: ${result.rejected}\n\n` +
        `Rejection reasons:\n${result.reasons.join('\n')}`
      );
      
    } catch (error) {
      console.error('❌ Failed to load test policies:', error);
      Alert.alert('Error', `Failed to load policies: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'PolicyAgent Demo',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff'
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 PolicyAgent Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Initialized:</Text>
              <Text style={[styles.statusValue, { color: status.isInitialized ? '#4CAF50' : '#F44336' }]}>
                {status.isInitialized ? '✅ Yes' : '❌ No'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Policies:</Text>
              <Text style={styles.statusValue}>{status.policiesCount}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Trusted Keys:</Text>
              <Text style={styles.statusValue}>{status.trustedKeysCount}</Text>
            </View>
            {status.lastValidation && (
              <>
                <View style={styles.divider} />
                <Text style={styles.subsectionTitle}>Last Validation:</Text>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Task ID:</Text>
                  <Text style={styles.statusValue}>{status.lastValidation.taskId.substring(0, 8)}...</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Result:</Text>
                  <Text style={[styles.statusValue, { color: status.lastValidation.allowed ? '#4CAF50' : '#F44336' }]}>
                    {status.lastValidation.allowed ? '✅ Allowed' : '🚫 Blocked'}
                  </Text>
                </View>
                {status.lastValidation.reason && (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Reason:</Text>
                    <Text style={[styles.statusValue, styles.reasonText]}>{status.lastValidation.reason}</Text>
                  </View>
                )}
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Time:</Text>
                  <Text style={styles.statusValue}>{formatTimestamp(status.lastValidation.timestamp)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Test Actions</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]} 
            onPress={() => testPolicyValidation('moderation', true)}
            disabled={loading || !status.isInitialized}
          >
            <Text style={styles.buttonText}>Test Moderation (Should Pass)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.warningButton]} 
            onPress={() => testPolicyValidation('chat', false)}
            disabled={loading || !status.isInitialized}
          >
            <Text style={styles.buttonText}>Test Chat (Should Fail)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]} 
            onPress={() => testPolicyValidation('classification', true)}
            disabled={loading || !status.isInitialized}
          >
            <Text style={styles.buttonText}>Test Classification (Should Pass)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.infoButton]} 
            onPress={loadTestPolicies}
            disabled={loading || !status.isInitialized}
          >
            <Text style={styles.buttonText}>Load Test Policies</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.refreshButton]} 
            onPress={initializePolicyAgent}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Reinitialize Agent</Text>
          </TouchableOpacity>
        </View>

        {/* Policies Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Loaded Policies ({policies.length})</Text>
          {policies.map((policy, index) => (
            <View key={policy.id} style={styles.policyCard}>
              <Text style={styles.policyTitle}>{policy.name}</Text>
              <Text style={styles.policyDetail}>ID: {policy.id}</Text>
              <Text style={styles.policyDetail}>Version: {policy.version}</Text>
              <Text style={styles.policyDetail}>Security Level: {policy.securityLevel}</Text>
              <Text style={styles.policyDetail}>Rules: {policy.rules.length}</Text>
              <Text style={styles.policyDetail}>
                Valid: {new Date(policy.validFrom).toLocaleDateString()} - {new Date(policy.validUntil).toLocaleDateString()}
              </Text>
              <Text style={styles.policyDetail}>
                Signature: {policy.signature.algorithm} ({policy.signature.keyId})
              </Text>
            </View>
          ))}
        </View>

        {/* Trusted Keys Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔑 Trusted Keys ({trustedKeys.length})</Text>
          {trustedKeys.map((key, index) => (
            <View key={key.keyId} style={styles.keyCard}>
              <Text style={styles.keyTitle}>{key.keyId}</Text>
              <Text style={styles.keyDetail}>Algorithm: {key.algorithm}</Text>
              <Text style={styles.keyDetail}>Purpose: {key.purpose}</Text>
              <Text style={styles.keyDetail}>Issuer: {key.issuer}</Text>
              <Text style={styles.keyDetail}>
                Valid: {new Date(key.validFrom).toLocaleDateString()} - {new Date(key.validUntil).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#ccc',
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  reasonText: {
    fontSize: 12,
    flexWrap: 'wrap',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 12,
  },
  actionButton: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
  },
  warningButton: {
    backgroundColor: '#FF9800',
  },
  infoButton: {
    backgroundColor: '#9C27B0',
  },
  refreshButton: {
    backgroundColor: '#607D8B',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  policyCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  policyDetail: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 2,
  },
  keyCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  keyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  keyDetail: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
});