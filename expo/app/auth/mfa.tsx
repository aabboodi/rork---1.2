import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Shield, Smartphone, Mail, Key, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import SecurityManager from '@/services/security/SecurityManager';
import ScreenProtectionService from '@/services/security/ScreenProtectionService';
import OTPInput from '@/components/OTPInput';
import Button from '@/components/Button';

export default function MFAScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { language } = useAuthStore();
  const t = translations[language];
  
  const userId = params.userId as string;
  const [mfaCode, setMfaCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'email' | 'totp'>('sms');
  const [availableMethods] = useState<Array<{ type: 'sms' | 'email' | 'totp'; label: string; icon: React.ReactNode }>>([
    { type: 'sms', label: 'SMS Code', icon: <Smartphone size={20} color={Colors.primary} /> },
    { type: 'email', label: 'Email Code', icon: <Mail size={20} color={Colors.primary} /> },
    { type: 'totp', label: 'Authenticator App', icon: <Key size={20} color={Colors.primary} /> },
  ]);

  useEffect(() => {
    // Initialize screen protection and start MFA challenge
    const initMFA = async () => {
      try {
        const screenProtection = ScreenProtectionService.getInstance();
        await screenProtection.protectSensitiveScreen('mfa');
        
        // Start MFA challenge
        await startMFAChallenge();
      } catch (error) {
        console.error('MFA initialization failed:', error);
      }
    };

    initMFA();

    // Cleanup screen protection when component unmounts
    return () => {
      const cleanup = async () => {
        const screenProtection = ScreenProtectionService.getInstance();
        await screenProtection.unprotectScreen('mfa');
      };
      cleanup();
    };
  }, [selectedMethod]);

  const startMFAChallenge = async () => {
    try {
      const securityManager = SecurityManager.getInstance();
      const result = await securityManager.startMFAChallenge(userId, selectedMethod);
      
      if (result.success && result.challengeId) {
        setChallengeId(result.challengeId);
        
        if (selectedMethod !== 'totp') {
          Alert.alert(
            'Verification Code Sent',
            `A verification code has been sent via ${selectedMethod.toUpperCase()}`
          );
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to start MFA challenge');
      }
    } catch (error) {
      console.error('MFA challenge start failed:', error);
      Alert.alert('Error', 'Failed to start verification process');
    }
  };

  const handleVerifyMFA = async () => {
    if (mfaCode.length !== 6 || !challengeId) return;
    
    setIsLoading(true);
    
    try {
      const securityManager = SecurityManager.getInstance();
      const result = await securityManager.verifyMFAChallenge(challengeId, mfaCode, userId);
      
      if (result.success) {
        Alert.alert('Success', 'Multi-factor authentication verified successfully', [
          {
            text: 'Continue',
            onPress: () => router.push('/auth/permissions')
          }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Invalid verification code');
        setMfaCode('');
      }
    } catch (error) {
      console.error('MFA verification error:', error);
      Alert.alert('Error', 'Verification failed. Please try again.');
      setMfaCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodChange = (method: 'sms' | 'email' | 'totp') => {
    setSelectedMethod(method);
    setMfaCode('');
    setChallengeId(null);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Multi-Factor Authentication</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Security Indicator */}
      <View style={styles.securityIndicator}>
        <Shield size={20} color={Colors.secure} />
        <Text style={styles.securityText}>Enhanced Security Verification</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Additional Verification Required</Text>
          <Text style={styles.subtitle}>
            Please complete multi-factor authentication to secure your account
          </Text>
        </View>

        {/* MFA Method Selection */}
        <View style={styles.methodSelection}>
          <Text style={styles.methodLabel}>Choose verification method:</Text>
          <View style={styles.methodButtons}>
            {availableMethods.map((method) => (
              <TouchableOpacity
                key={method.type}
                style={[
                  styles.methodButton,
                  selectedMethod === method.type && styles.methodButtonActive
                ]}
                onPress={() => handleMethodChange(method.type)}
              >
                {method.icon}
                <Text style={[
                  styles.methodButtonText,
                  selectedMethod === method.type && styles.methodButtonTextActive
                ]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Instructions based on selected method */}
        <View style={styles.instructionsContainer}>
          {selectedMethod === 'sms' && (
            <Text style={styles.instructions}>
              Enter the 6-digit code sent to your registered phone number
            </Text>
          )}
          {selectedMethod === 'email' && (
            <Text style={styles.instructions}>
              Enter the 6-digit code sent to your registered email address
            </Text>
          )}
          {selectedMethod === 'totp' && (
            <Text style={styles.instructions}>
              Enter the 6-digit code from your authenticator app (Google Authenticator, Authy, etc.)
            </Text>
          )}
        </View>

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          <OTPInput
            length={6}
            value={mfaCode}
            onChange={setMfaCode}
          />
        </View>
        
        {/* Verify Button */}
        <Button
          title="Verify Code"
          onPress={handleVerifyMFA}
          disabled={mfaCode.length !== 6 || !challengeId}
          loading={isLoading}
          style={styles.verifyButton}
        />

        {/* Resend/Retry Button */}
        {selectedMethod !== 'totp' && (
          <TouchableOpacity
            style={styles.resendContainer}
            onPress={startMFAChallenge}
          >
            <Text style={styles.resendText}>
              Resend Code
            </Text>
          </TouchableOpacity>
        )}

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Text style={styles.noticeText}>
            🔐 Multi-factor authentication adds an extra layer of security to protect your account from unauthorized access.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
  },
  placeholder: {
    width: 32,
  },
  securityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: Colors.light,
  },
  securityText: {
    fontSize: 12,
    color: Colors.secure,
    marginLeft: 8,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.medium,
    textAlign: 'center',
    lineHeight: 22,
  },
  methodSelection: {
    marginBottom: 24,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 12,
  },
  methodButtons: {
    gap: 8,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  methodButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondary,
  },
  methodButtonText: {
    fontSize: 16,
    color: Colors.medium,
    marginLeft: 12,
    fontWeight: '500',
  },
  methodButtonTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  instructionsContainer: {
    marginBottom: 24,
  },
  instructions: {
    fontSize: 14,
    color: Colors.medium,
    textAlign: 'center',
    lineHeight: 20,
  },
  otpContainer: {
    marginBottom: 24,
  },
  verifyButton: {
    width: '100%',
    marginBottom: 16,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  securityNotice: {
    padding: 16,
    backgroundColor: Colors.light,
    borderRadius: 8,
    marginTop: 'auto',
  },
  noticeText: {
    fontSize: 12,
    color: Colors.medium,
    textAlign: 'center',
    lineHeight: 16,
  },
});