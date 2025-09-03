import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Shield, Lock, Fingerprint, Smartphone, Crown } from 'lucide-react-native';
import { hasOTPBypass, getUserRole } from '@/constants/specialUsers';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import SecurityManager from '@/services/security/SecurityManager';
import ScreenProtectionService from '@/services/security/ScreenProtectionService';
import OTPInput from '@/components/OTPInput';
import Button from '@/components/Button';

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { language, setAuthenticated, isOTPEnabled } = useAuthStore();
  const t = translations[language];
  
  const phoneNumber = params.phoneNumber as string;
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  interface SecurityStatus { device: { isSecure: boolean; riskLevel: string } }
  const defaultSecurityStatus: SecurityStatus = { device: { isSecure: false, riskLevel: 'Unknown' } };
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>(defaultSecurityStatus);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isSpecialUser, setIsSpecialUser] = useState(false);
  const [userRole, setUserRole] = useState<string>('regular');
  const [otpSystemEnabled, setOtpSystemEnabled] = useState(true);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    try {
      const otpEnabled = typeof isOTPEnabled === 'function' ? isOTPEnabled() : true;
      if (mounted) setOtpSystemEnabled(otpEnabled);

      const canBypass = typeof hasOTPBypass === 'function' ? hasOTPBypass(phoneNumber) : false;
      const role = typeof getUserRole === 'function' ? getUserRole(phoneNumber) : 'regular';

      if (mounted) {
        setIsSpecialUser(canBypass);
        setUserRole(role);
      }

      console.log(`OTP Screen - Phone: ${phoneNumber}, Can bypass: ${canBypass}, Role: ${role}, OTP System: ${otpEnabled}`);

      if (!otpEnabled) {
        Alert.alert(
          'OTP Disabled',
          'OTP verification has been disabled by the administrator. You can proceed without OTP.',
          [
            { text: 'Continue', onPress: handleOTPDisabledBypass }
          ]
        );
      } else if (canBypass) {
        const roleMessage = role === 'main_admin' ? 'Main Administrator' : role === 'admin' ? 'Administrator' : 'Privileged User';
        Alert.alert(
          'Special Access Detected',
          `You are logged in as ${roleMessage}. You can bypass OTP verification.`,
          [
            { text: 'Use OTP', style: 'cancel' },
            { text: 'Bypass OTP', onPress: handleSpecialUserBypass }
          ]
        );
      }
    } catch (e) {
      console.warn('OTP initialization checks failed:', e);
    }

    const initSecurity = async () => {
      try {
        const securityManager = SecurityManager.getInstance();
        const screenProtection = ScreenProtectionService.getInstance();

        if (screenProtection && typeof screenProtection.protectSensitiveScreen === 'function') {
          await screenProtection.protectSensitiveScreen('otp');
        }

        const rawStatus = securityManager.getSecurityStatus?.();
        const nextStatus: SecurityStatus = rawStatus && (rawStatus as any).device ? {
          device: {
            isSecure: !!(rawStatus as any).device.isSecure,
            riskLevel: (rawStatus as any).device.riskLevel ?? 'Unknown',
          }
        } : defaultSecurityStatus;
        if (mounted) setSecurityStatus(nextStatus);
      } catch (error) {
        console.error('Security initialization failed:', error);
      }
    };

    initSecurity();

    return () => {
      mounted = false;
      const cleanup = async () => {
        try {
          const screenProtection = ScreenProtectionService.getInstance();
          if (screenProtection && typeof screenProtection.unprotectScreen === 'function') {
            await screenProtection.unprotectScreen('otp');
          }
        } catch {}
      };
      cleanup();
    };
  }, [phoneNumber, isOTPEnabled]);

  const handleOTPDisabledBypass = async () => {
    setIsLoading(true);
    
    try {
      const securityManager = SecurityManager.getInstance();
      
      // Create user ID
      const userId = securityManager.getCryptoService().hash(phoneNumber).substring(0, 16);
      
      // Initialize user security components
      await securityManager.getKeyManager().generateUserKeyPair(userId);
      await securityManager.getMFAService().initializeMFA(userId);
      
      // Create secure session
      const sessionManager = securityManager.getSessionManager();
      const session = await sessionManager.createSession(userId, phoneNumber, true);
      
      // Set authentication state
      await setAuthenticated(userId, phoneNumber, session.accessToken);
      
      console.log('User authenticated with OTP disabled by admin');
      
      // Navigate to permissions
      router.push('/auth/permissions');
    } catch (error) {
      console.error('OTP disabled authentication failed:', error);
      Alert.alert(t.error, 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpecialUserBypass = async () => {
    setIsLoading(true);
    
    try {
      const securityManager = SecurityManager.getInstance();
      
      // Create user ID
      const userId = securityManager.getCryptoService().hash(phoneNumber).substring(0, 16);
      
      // Initialize user security components
      await securityManager.getKeyManager().generateUserKeyPair(userId);
      await securityManager.getMFAService().initializeMFA(userId);
      
      // Create secure session
      const sessionManager = securityManager.getSessionManager();
      const session = await sessionManager.createSession(userId, phoneNumber, true);
      
      // Set authentication state
      await setAuthenticated(userId, phoneNumber, session.accessToken);
      
      console.log(`Special user ${userRole} authenticated successfully`);
      
      // Navigate to permissions
      router.push('/auth/permissions');
    } catch (error) {
      console.error('Special user authentication failed:', error);
      Alert.alert(t.error, 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerify = async () => {
    if (otp.length !== 6) return;
    
    setIsLoading(true);
    
    try {
      const securityManager = SecurityManager.getInstance();
      
      // Enhanced secure authentication with all security features
      const authResult = await securityManager.authenticateUser(phoneNumber, otp, {
        enableMFA: true,
        enableBiometrics: true,
        skipDeviceCheck: false
      });
      
      if (authResult.success && authResult.userId) {
        setMfaRequired(authResult.mfaRequired || false);
        setBiometricAvailable(authResult.biometricAvailable || false);
        
        // Set authentication state with session token
        await setAuthenticated(authResult.userId, phoneNumber, authResult.sessionToken);
        
        // Check if MFA is required
        if (authResult.mfaRequired) {
          // Navigate to MFA verification
          router.push({
            pathname: '/auth/mfa',
            params: { userId: authResult.userId }
          });
        } else {
          // Navigate to permissions
          router.push('/auth/permissions');
        }
      } else {
        Alert.alert(t.error, authResult.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      Alert.alert(t.error, 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResend = () => {
    if (countdown > 0) return;
    
    // Check if OTP is enabled
    if (!otpSystemEnabled) {
      Alert.alert('OTP Disabled', 'OTP verification is currently disabled by the administrator.');
      return;
    }
    
    // Simulate API call to resend OTP
    setCountdown(60);
    Alert.alert(t.success, 'Verification code resent securely');
  };
  
  return (
    <SafeAreaView style={styles.container} testID="otp-safe-area">
      <StatusBar style="dark" />
      
      {/* Enhanced Security Indicator */}
      <View style={styles.securityIndicator} testID="otp-security-indicator">
        <Shield size={20} color={Colors.secure} />
        <Text style={styles.securityText}>Secure Connection</Text>
        <Lock size={16} color={Colors.encrypted} />
        {isSpecialUser && (
          <>
            <Crown size={16} color={Colors.primary} />
            <Text style={[styles.securityText, { color: Colors.primary }]}>
              {userRole === 'main_admin' ? 'Main Admin' : userRole === 'admin' ? 'Admin' : 'Privileged'}
            </Text>
          </>
        )}
        {!otpSystemEnabled && (
          <Text style={[styles.securityText, { color: Colors.warning }]}>
            OTP Disabled
          </Text>
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.header} testID="otp-header">
          <Text style={styles.title}>
            {!otpSystemEnabled ? 'OTP Disabled by Admin' : t.enterOTP}
          </Text>
          <Text style={styles.subtitle}>
            {!otpSystemEnabled 
              ? 'OTP verification has been disabled. You can proceed without verification.'
              : `${t.otpSent} ${phoneNumber}`
            }
          </Text>
          {isSpecialUser && (
            <View style={styles.specialUserBadge} testID="otp-special-user-badge">
              <Crown size={20} color={Colors.primary} />
              <Text style={styles.specialUserText}>
                {userRole === 'main_admin' ? 'Main Administrator' : userRole === 'admin' ? 'Administrator' : 'Privileged User'}
              </Text>
            </View>
          )}
        </View>
        
        {/* Enhanced Security Features Display */}
        <View style={styles.securityInfo} testID="otp-security-info">
          <Text style={styles.securityLabel}>Security Features Active:</Text>
          <View style={styles.securityFeatures}>
            <View style={styles.securityFeature}>
              <Shield size={16} color={Colors.secure} />
              <Text style={styles.featureText}>End-to-End Encryption</Text>
            </View>
            <View style={styles.securityFeature}>
              <Lock size={16} color={Colors.encrypted} />
              <Text style={styles.featureText}>Device Binding</Text>
            </View>
            <View style={styles.securityFeature}>
              <Smartphone size={16} color={Colors.primary} />
              <Text style={styles.featureText}>Anti-Tampering</Text>
            </View>
            {biometricAvailable && (
              <View style={styles.securityFeature}>
                <Fingerprint size={16} color={Colors.success} />
                <Text style={styles.featureText}>Biometric Ready</Text>
              </View>
            )}
            {isSpecialUser && (
              <View style={styles.securityFeature}>
                <Crown size={16} color={Colors.primary} />
                <Text style={styles.featureText}>Special Access Granted</Text>
              </View>
            )}
          </View>
          
          <View style={styles.deviceStatus} testID="otp-device-status">
            <Text style={styles.deviceStatusLabel}>Device Security:</Text>
            <Text
              style={[
                styles.deviceStatusText,
                { color: securityStatus.device.isSecure ? Colors.secure : Colors.warning },
              ]}
              testID="otp-device-status-text"
            >
              {securityStatus.device.isSecure ? 'Secure' : `Risk: ${securityStatus.device.riskLevel}`}
            </Text>
          </View>
        </View>
        
        {/* Show OTP input only if OTP is enabled */}
        {otpSystemEnabled && (
          <OTPInput
            length={6}
            value={otp}
            onChange={setOtp}
            testID="otp-input"
          />
        )}
        
        {otpSystemEnabled ? (
          <Button
            title={t.verify}
            onPress={handleVerify}
            disabled={otp.length !== 6}
            loading={isLoading}
            style={styles.button}
            testID="otp-verify-button"
          />
        ) : (
          <Button
            title="Continue (OTP Disabled)"
            onPress={handleOTPDisabledBypass}
            loading={isLoading}
            style={[styles.button, styles.bypassButton]}
            testID="otp-bypass-admin"
          />
        )}
        
        {isSpecialUser && otpSystemEnabled && (
          <Button
            title="Bypass OTP (Special Access)"
            onPress={handleSpecialUserBypass}
            loading={isLoading}
            style={[styles.button, styles.bypassButton]}
            testID="otp-bypass-special"
          />
        )}
        
        {otpSystemEnabled && (
          <TouchableOpacity
            style={styles.resendContainer}
            onPress={handleResend}
            disabled={countdown > 0}
            testID="otp-resend"
          >
            <Text
              style={[
                styles.resendText,
                countdown > 0 && styles.resendDisabled,
              ]}
            >
              {t.resend} {countdown > 0 ? `(${countdown})` : ''}
            </Text>
          </TouchableOpacity>
        )}

        {/* Security Notice */}
        <View style={styles.securityNotice} testID="otp-security-notice">
          <Text style={styles.noticeText}>
            🔒 Your data is protected with military-grade encryption and advanced security measures.
            {!otpSystemEnabled && ' ⚠️ OTP verification is currently disabled by the administrator.'}
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
  securityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: Colors.light,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  securityText: {
    fontSize: 12,
    color: Colors.secure,
    marginHorizontal: 8,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
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
  },
  specialUserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  specialUserText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  securityInfo: {
    backgroundColor: Colors.light,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  securityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  securityFeatures: {
    gap: 8,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: Colors.medium,
    marginLeft: 8,
  },
  deviceStatus: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceStatusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
  },
  deviceStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    marginTop: 20,
  },
  bypassButton: {
    backgroundColor: Colors.primary,
    marginTop: 12,
  },
  resendContainer: {
    marginTop: 24,
  },
  resendText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  resendDisabled: {
    color: Colors.medium,
  },
  securityNotice: {
    marginTop: 32,
    padding: 16,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    width: '100%',
  },
  noticeText: {
    fontSize: 12,
    color: Colors.medium,
    textAlign: 'center',
    lineHeight: 16,
  },
});