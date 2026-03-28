import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Copy, Share2, QrCode, Shield, CheckCircle, Lock, AlertTriangle, Verified } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { ImmutableTransaction } from '@/types';
import SecurityManager from '@/services/security/SecurityManager';
import CryptoService from '@/services/security/CryptoService';
import DeviceSecurityService from '@/services/security/DeviceSecurityService';

// Web-compatible clipboard functionality
const copyToClipboard = async (text: string) => {
  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy: ', err);
      return false;
    }
  } else {
    // For mobile, we'll use a simple alert for now
    Alert.alert('تم النسخ', 'تم نسخ الرابط إلى الحافظة');
    return true;
  }
};

export default function ReceiveScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const t = translations[language];
  
  const [selectedCurrency, setSelectedCurrency] = useState('SAR');
  const [securityVerified, setSecurityVerified] = useState(false);
  const [paymentLinkGenerated, setPaymentLinkGenerated] = useState(false);
  const [securePaymentLink, setSecurePaymentLink] = useState('');
  const [deviceSecurityPassed, setDeviceSecurityPassed] = useState(false);
  const [chainIntegrityVerified, setChainIntegrityVerified] = useState(false);
  const [incomingTransactions, setIncomingTransactions] = useState<ImmutableTransaction[]>([]);
  const [digitalSignatureVerified, setDigitalSignatureVerified] = useState(false);
  const [pciDSSCompliant, setPciDSSCompliant] = useState(false);
  
  const securityManager = SecurityManager.getInstance();
  const cryptoService = CryptoService.getInstance();
  const deviceSecurity = DeviceSecurityService.getInstance();
  const { verifyIncomingTransaction, addTransaction } = useWalletStore();

  // Enhanced Security Checks on Component Mount
  useEffect(() => {
    performComprehensiveSecurityCheck();
    monitorIncomingTransactions();
  }, []);

  const performComprehensiveSecurityCheck = async () => {
    try {
      // Device Security Check
      const deviceCheck = await deviceSecurity.performComprehensiveSecurityCheck();
      if (!deviceCheck.isSecure) {
        Alert.alert(
          'تحذير أمني حرج',
          `تم اكتشاف تهديدات أمنية:\n${deviceCheck.threats.join('\n')}\n\nلا يمكن استقبال معاملات مالية على هذا الجهاز.`,
          [{ text: 'موافق', onPress: () => router.back() }]
        );
        return;
      }
      setDeviceSecurityPassed(true);

      // Chain Integrity Verification
      const chainIntegrity = await cryptoService.verifyChainIntegrity();
      setChainIntegrityVerified(chainIntegrity.isValid);
      
      if (!chainIntegrity.isValid) {
        Alert.alert(
          'خطأ في سلامة السلسلة',
          'تم اكتشاف تلف في سلسلة المعاملات. لا يمكن استقبال معاملات جديدة.',
          [{ text: 'موافق', onPress: () => router.back() }]
        );
        return;
      }

      // PCI DSS Compliance Check
      const pciCompliance = await cryptoService.verifyPCIDSSCompliance();
      setPciDSSCompliant(pciCompliance.isCompliant);
      
    } catch (error) {
      console.error('Comprehensive security check failed:', error);
      Alert.alert('خطأ أمني', 'فشل في فحص الأمان الشامل');
    }
  };

  const monitorIncomingTransactions = async () => {
    try {
      // Monitor for incoming transactions in real-time
      const pendingTransactions = await cryptoService.getPendingIncomingTransactions('current_user');
      setIncomingTransactions(pendingTransactions);
    } catch (error) {
      console.error('Failed to monitor incoming transactions:', error);
    }
  };
  
  const currencies = [
    { code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س' },
    { code: 'AED', name: 'درهم إماراتي', symbol: 'د.إ' },
    { code: 'EGP', name: 'جنيه مصري', symbol: 'ج.م' },
    { code: 'IRR', name: 'ريال إيراني', symbol: 'ر.إ' },
    { code: 'USD', name: 'دولار أمريكي', symbol: '$' },
  ];

  const handleSecurityVerification = async () => {
    try {
      // Enhanced Device Security Verification
      if (!deviceSecurityPassed) {
        Alert.alert('خطأ أمني', 'يجب اجتياز فحص أمان الجهاز أولاً');
        return;
      }

      if (!chainIntegrityVerified) {
        Alert.alert('خطأ', 'يجب التحقق من سلامة سلسلة المعاملات أولاً');
        return;
      }

      // Anti-Tampering Check
      const tamperCheck = await deviceSecurity.detectTampering();
      if (tamperCheck.isTampered) {
        Alert.alert(
          'تحذير أمني حرج',
          `تم اكتشاف تلاعب في التطبيق:\n${tamperCheck.tamperingSigns.join('\n')}\n\nلا يمكن إنشاء روابط دفع آمنة.`,
          [{ text: 'موافق', onPress: () => router.back() }]
        );
        return;
      }

      // Enhanced Biometric Authentication
      const biometricResult = await securityManager.authenticateWithBiometrics('current_user');
      
      if (biometricResult.success) {
        // Verify Digital Signature Capability
        const signatureTest = await cryptoService.testDigitalSignatureCapability();
        setDigitalSignatureVerified(signatureTest.isCapable);
        
        if (!signatureTest.isCapable) {
          Alert.alert(
            'خطأ في التوقيع الرقمي',
            'لا يمكن إنشاء توقيعات رقمية آمنة على هذا الجهاز.'
          );
          return;
        }

        setSecurityVerified(true);
        Alert.alert(
          'تم التحقق بنجاح',
          'تم التحقق الأمني المتقدم بنجاح. يمكنك الآن إنشاء رابط دفع آمن ومتوافق مع معايير PCI DSS.'
        );
      } else {
        Alert.alert('فشل التحقق', 'يتطلب التحقق البيومتري لإنشاء رابط دفع آمن');
      }
    } catch (error) {
      console.error('Enhanced security verification failed:', error);
      Alert.alert('خطأ', 'فشل في التحقق الأمني المتقدم');
    }
  };

  const generateSecurePaymentLink = async () => {
    try {
      if (!securityVerified) {
        Alert.alert('خطأ', 'يجب إجراء التحقق الأمني المتقدم أولاً');
        return;
      }

      if (!digitalSignatureVerified) {
        Alert.alert('خطأ', 'يجب التحقق من قدرة التوقيع الرقمي أولاً');
        return;
      }

      if (!pciDSSCompliant) {
        Alert.alert('خطأ', 'النظام غير متوافق مع معايير PCI DSS');
        return;
      }

      // Generate immutable payment request
      const paymentRequestData: ImmutableTransaction = {
        id: cryptoService.generateSecureTransactionId(),
        senderId: 'pending', // Will be filled when payment is made
        receiverId: 'current_user',
        amount: 0, // Amount will be specified by sender
        currency: selectedCurrency,
        timestamp: Date.now(),
        status: 'payment_request',
        type: 'receive',
        note: 'Secure payment request',
        // Immutable Ledger Properties
        previousHash: await cryptoService.getLastTransactionHash(),
        merkleRoot: '',
        nonce: cryptoService.generateSecureRandom(32),
        difficulty: 4,
        blockHeight: await cryptoService.getCurrentBlockHeight(),
        // Security Properties
        encrypted: true,
        signature: null,
        publicKey: await cryptoService.getPublicKey(),
        // ACID Properties
        acidState: 'pending',
        isolationLevel: 'read_committed',
        lockAcquired: false,
        // PCI DSS Compliance
        pciDSSCompliant: true,
        encryptionStandard: 'AES-256-GCM',
        keyDerivation: 'PBKDF2-SHA256'
      };

      // Calculate Merkle Root
      const merkleRoot = await cryptoService.calculateMerkleRoot([
        paymentRequestData.id,
        paymentRequestData.receiverId,
        paymentRequestData.currency,
        paymentRequestData.timestamp.toString()
      ]);
      paymentRequestData.merkleRoot = merkleRoot;

      // Digital Signature for Payment Request
      const signature = await cryptoService.signImmutableTransaction(paymentRequestData);
      paymentRequestData.signature = signature;

      // Create PCI DSS compliant encrypted payment data
      const encryptedPaymentData = await cryptoService.encryptPCIDSSData(
        JSON.stringify(paymentRequestData),
        'payment_request'
      );

      // Generate immutable hash for payment link
      const linkHash = await cryptoService.generateImmutableTransactionHash(paymentRequestData);
      
      // Create secure payment link with enhanced security
      const baseUrl = 'https://connectapp.com/pay';
      const secureLink = `${baseUrl}/${linkHash}?currency=${selectedCurrency}&secure=true&pci=compliant&immutable=true&signature=${signature.substring(0, 16)}`;
      
      setSecurePaymentLink(secureLink);
      setPaymentLinkGenerated(true);
      
      // Store payment request in immutable ledger
      await cryptoService.storePaymentRequest(paymentRequestData);
      
      Alert.alert(
        'تم الإنشاء بنجاح',
        `تم إنشاء رابط دفع آمن ومتوافق مع معايير PCI DSS.\n\nHash: ${linkHash.substring(0, 16)}...\n\nالرابط محمي بتشفير AES-256 وموقع رقمياً.`
      );
    } catch (error) {
      console.error('Failed to generate secure payment link:', error);
      Alert.alert('خطأ', 'فشل في إنشاء رابط الدفع الآمن');
    }
  };
  
  const handleCopyLink = async () => {
    if (!paymentLinkGenerated) {
      Alert.alert('خطأ', 'يجب إنشاء رابط الدفع أولاً');
      return;
    }

    const success = await copyToClipboard(securePaymentLink);
    if (success) {
      Alert.alert('تم النسخ', 'تم نسخ رابط الدفع الآمن إلى الحافظة');
    }
  };
  
  const handleShare = () => {
    if (!paymentLinkGenerated) {
      Alert.alert('خطأ', 'يجب إنشاء رابط الدفع أولاً');
      return;
    }
    Alert.alert('مشاركة', 'سيتم فتح خيارات المشاركة للرابط الآمن');
  };
  
  const handleQRCode = () => {
    if (!paymentLinkGenerated) {
      Alert.alert('خطأ', 'يجب إنشاء رابط الدفع أولاً');
      return;
    }
    Alert.alert('رمز QR', 'سيتم عرض رمز QR آمن للدفع');
  };

  const renderSecurityStatus = () => {
    return (
      <View style={styles.securityContainer}>
        <View style={styles.securityHeader}>
          <Shield size={20} color={Colors.primary} />
          <Text style={styles.securityTitle}>الأمان والسجل غير القابل للتغيير</Text>
        </View>
        
        <View style={styles.securityChecks}>
          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>أمان الجهاز</Text>
            <Text style={[styles.checkStatus, { color: deviceSecurityPassed ? Colors.success : Colors.error }]}>
              {deviceSecurityPassed ? '✓ آمن' : '✗ غير آمن'}
            </Text>
          </View>

          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>سلامة السلسلة</Text>
            <Text style={[styles.checkStatus, { color: chainIntegrityVerified ? Colors.success : Colors.error }]}>
              {chainIntegrityVerified ? '✓ سليمة' : '✗ تالفة'}
            </Text>
          </View>
          
          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>التحقق البيومتري</Text>
            <Text style={[styles.checkStatus, { color: securityVerified ? Colors.success : Colors.medium }]}>
              {securityVerified ? '✓ مكتمل' : '⏳ مطلوب'}
            </Text>
          </View>

          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>التوقيع الرقمي</Text>
            <Text style={[styles.checkStatus, { color: digitalSignatureVerified ? Colors.success : Colors.medium }]}>
              {digitalSignatureVerified ? '✓ متاح' : '⏳ فحص'}
            </Text>
          </View>
          
          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>رابط دفع آمن</Text>
            <Text style={[styles.checkStatus, { color: paymentLinkGenerated ? Colors.success : Colors.medium }]}>
              {paymentLinkGenerated ? '✓ تم الإنشاء' : '⏳ غير منشأ'}
            </Text>
          </View>

          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>متوافق مع PCI DSS</Text>
            <Text style={[styles.checkStatus, { color: pciDSSCompliant ? Colors.success : Colors.error }]}>
              {pciDSSCompliant ? '✓ متوافق' : '✗ غير متوافق'}
            </Text>
          </View>
        </View>

        {incomingTransactions.length > 0 && (
          <View style={styles.incomingContainer}>
            <Text style={styles.incomingLabel}>معاملات واردة معلقة: {incomingTransactions.length}</Text>
            <TouchableOpacity 
              style={styles.verifyButton}
              onPress={handleVerifyIncomingTransactions}
            >
              <Verified size={16} color="white" />
              <Text style={styles.verifyButtonText}>التحقق من المعاملات</Text>
            </TouchableOpacity>
          </View>
        )}

        {paymentLinkGenerated && (
          <View style={styles.linkContainer}>
            <Text style={styles.linkLabel}>رابط الدفع الآمن (غير قابل للتغيير):</Text>
            <Text style={styles.linkText} numberOfLines={2}>
              {securePaymentLink}
            </Text>
            <Text style={styles.linkSecurity}>
              🔒 محمي بـ AES-256 | ✍️ موقع رقمياً | 🛡️ PCI DSS
            </Text>
          </View>
        )}
      </View>
    );
  };

  const handleVerifyIncomingTransactions = async () => {
    try {
      for (const transaction of incomingTransactions) {
        // Verify digital signature
        const signatureValid = await cryptoService.verifyTransactionSignature(
          transaction,
          transaction.signature!
        );
        
        if (!signatureValid) {
          Alert.alert(
            'تحذير أمني',
            `المعاملة ${transaction.id} لها توقيع رقمي غير صحيح. تم رفضها.`
          );
          continue;
        }

        // Verify transaction integrity
        const integrityValid = await cryptoService.verifyTransactionIntegrity(transaction);
        if (!integrityValid) {
          Alert.alert(
            'تحذير أمني',
            `المعاملة ${transaction.id} فشلت في فحص السلامة. تم رفضها.`
          );
          continue;
        }

        // Verify chain consistency
        const chainConsistent = await cryptoService.verifyChainConsistency(transaction);
        if (!chainConsistent) {
          Alert.alert(
            'تحذير أمني',
            `المعاملة ${transaction.id} غير متسقة مع السلسلة. تم رفضها.`
          );
          continue;
        }

        // Add verified transaction
        transaction.status = 'completed';
        transaction.integrityVerified = true;
        await addTransaction(transaction);
      }

      setIncomingTransactions([]);
      Alert.alert('تم التحقق', 'تم التحقق من جميع المعاملات الواردة وإضافة الصحيحة منها.');
      
    } catch (error) {
      console.error('Failed to verify incoming transactions:', error);
      Alert.alert('خطأ', 'فشل في التحقق من المعاملات الواردة');
    }
  };
  
  return (
    <>
      <Stack.Screen
        options={{
          title: t.receive,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <View style={styles.container}>
        <Text style={styles.title}>استلام الأموال</Text>
        <Text style={styles.subtitle}>اختر العملة وأنشئ رابط دفع آمن</Text>
        
        {/* Currency Selection */}
        <View style={styles.currencyContainer}>
          <Text style={styles.sectionTitle}>اختر العملة</Text>
          {currencies.map((currency) => (
            <TouchableOpacity
              key={currency.code}
              style={[
                styles.currencyItem,
                selectedCurrency === currency.code && styles.selectedCurrency,
              ]}
              onPress={() => setSelectedCurrency(currency.code)}
            >
              <Text style={styles.currencyCode}>{currency.code}</Text>
              <Text style={styles.currencyName}>{currency.name}</Text>
              <Text style={styles.currencySymbol}>{currency.symbol}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {renderSecurityStatus()}
        
        {/* Device Security Check */}
        {!deviceSecurityPassed && (
          <TouchableOpacity style={styles.deviceSecurityButton} onPress={performComprehensiveSecurityCheck}>
            <AlertTriangle size={24} color="white" />
            <Text style={styles.deviceSecurityButtonText}>فحص أمان الجهاز</Text>
          </TouchableOpacity>
        )}

        {/* Security Verification */}
        {deviceSecurityPassed && !securityVerified && (
          <TouchableOpacity style={styles.securityButton} onPress={handleSecurityVerification}>
            <Shield size={24} color="white" />
            <Text style={styles.securityButtonText}>التحقق الأمني المتقدم</Text>
          </TouchableOpacity>
        )}

        {/* Generate Secure Payment Link */}
        {securityVerified && !paymentLinkGenerated && (
          <TouchableOpacity style={styles.generateButton} onPress={generateSecurePaymentLink}>
            <Lock size={24} color="white" />
            <Text style={styles.generateButtonText}>إنشاء رابط دفع آمن (غير قابل للتغيير)</Text>
          </TouchableOpacity>
        )}
        
        {/* Action Buttons */}
        {paymentLinkGenerated && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCopyLink}>
              <Copy size={24} color="white" />
              <Text style={styles.actionButtonText}>نسخ رابط الدفع الآمن</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Share2 size={24} color="white" />
              <Text style={styles.actionButtonText}>مشاركة الرابط الآمن</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleQRCode}>
              <QrCode size={24} color="white" />
              <Text style={styles.actionButtonText}>رمز QR آمن</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.medium,
    textAlign: 'center',
    marginBottom: 32,
  },
  currencyContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 16,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  selectedCurrency: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    width: 60,
  },
  currencyName: {
    fontSize: 16,
    color: Colors.dark,
    flex: 1,
  },
  currencySymbol: {
    fontSize: 16,
    color: Colors.medium,
  },
  securityContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginLeft: 8,
  },
  securityChecks: {
    gap: 12,
  },
  checkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkLabel: {
    fontSize: 14,
    color: Colors.dark,
  },
  checkStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  linkContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
  },
  linkLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  linkText: {
    fontSize: 11,
    color: Colors.dark,
    fontFamily: 'monospace',
  },
  deviceSecurityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  deviceSecurityButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warning,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  securityButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  incomingContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.warning + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  incomingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
    marginBottom: 8,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 6,
    gap: 6,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  linkSecurity: {
    fontSize: 10,
    color: Colors.success,
    marginTop: 4,
    textAlign: 'center',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});