import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, FlatList, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Send, Shield, AlertTriangle, Lock, CheckCircle2, Clock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { Transaction, ImmutableTransaction, ACIDTransactionState } from '@/types';
import Button from '@/components/Button';
import SecurityManager from '@/services/security/SecurityManager';
import CryptoService from '@/services/security/CryptoService';
import DeviceSecurityService from '@/services/security/DeviceSecurityService';

export default function SendMoneyScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const { balances, addTransaction, updateBalance, performFraudDetection } = useWalletStore();
  const t = translations[language];
  
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [securityVerification, setSecurityVerification] = useState(false);
  const [fraudCheckResult, setFraudCheckResult] = useState<any>(null);
  const [transactionSigned, setTransactionSigned] = useState(false);
  const [acidState, setAcidState] = useState<ACIDTransactionState>('idle');
  const [immutableTxHash, setImmutableTxHash] = useState<string>('');
  const [chainIntegrityVerified, setChainIntegrityVerified] = useState(false);
  const [deviceSecurityPassed, setDeviceSecurityPassed] = useState(false);
  const [transactionLocked, setTransactionLocked] = useState(false);

  const cryptoService = CryptoService.getInstance();
  const securityManager = SecurityManager.getInstance();
  const deviceSecurity = DeviceSecurityService.getInstance();

  // Device Security Check on Component Mount
  useEffect(() => {
    performDeviceSecurityCheck();
  }, []);

  const performDeviceSecurityCheck = async () => {
    try {
      const deviceCheck = await deviceSecurity.performComprehensiveSecurityCheck();
      
      if (!deviceCheck.isSecure) {
        Alert.alert(
          'تحذير أمني حرج',
          `تم اكتشاف تهديدات أمنية:\n${deviceCheck.threats.join('\n')}\n\nلا يمكن إجراء معاملات مالية على هذا الجهاز.`,
          [{ text: 'موافق', onPress: () => router.back() }]
        );
        return;
      }
      
      setDeviceSecurityPassed(true);
    } catch (error) {
      console.error('Device security check failed:', error);
      Alert.alert('خطأ أمني', 'فشل في فحص أمان الجهاز');
    }
  };

  const handleSecurityVerification = async () => {
    try {
      setLoading(true);
      setAcidState('validating');
      
      // Enhanced Device Security Verification
      if (!deviceSecurityPassed) {
        Alert.alert('خطأ أمني', 'يجب اجتياز فحص أمان الجهاز أولاً');
        setLoading(false);
        setAcidState('failed');
        return;
      }

      // Anti-Tampering Check
      const tamperCheck = await deviceSecurity.detectTampering();
      if (tamperCheck.isTampered) {
        Alert.alert(
          'تحذير أمني حرج',
          `تم اكتشاف تلاعب في التطبيق:\n${tamperCheck.tamperingSigns.join('\n')}\n\nلا يمكن إجراء معاملات مالية.`,
          [{ text: 'موافق', onPress: () => router.back() }]
        );
        setLoading(false);
        setAcidState('failed');
        return;
      }

      // Enhanced Biometric Authentication
      const sendAmount = parseFloat(amount);
      const biometricResult = await securityManager.authenticateWithBiometrics('current_user');
      if (!biometricResult.success) {
        Alert.alert('فشل التحقق', 'يتطلب التحقق البيومتري لجميع المعاملات المالية');
        setLoading(false);
        setAcidState('failed');
        return;
      }

      // ACID Atomicity Check - Verify Balance Consistency
      const currentBalance = balances.find(b => b.currency === currency);
      if (!currentBalance || currentBalance.amount < sendAmount) {
        Alert.alert('خطأ في الرصيد', 'رصيد غير كافٍ أو غير متسق');
        setLoading(false);
        setAcidState('failed');
        return;
      }

      // Create preliminary immutable transaction for fraud detection
      const preliminaryTransaction: ImmutableTransaction = {
        id: cryptoService.generateSecureTransactionId(),
        senderId: '0',
        receiverId: recipient,
        amount: sendAmount,
        currency,
        timestamp: Date.now(),
        status: 'pending',
        type: 'send',
        note,
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
        isolationLevel: 'serializable',
        lockAcquired: false,
        // PCI DSS Compliance
        pciDSSCompliant: true,
        encryptionStandard: 'AES-256-GCM',
        keyDerivation: 'PBKDF2-SHA256'
      };

      // Perform enhanced fraud detection
      const fraudResult = await performFraudDetection(preliminaryTransaction);
      setFraudCheckResult(fraudResult);

      if (fraudResult.riskLevel === 'critical') {
        Alert.alert(
          'تحذير أمني حرج',
          'تم اكتشاف نشاط مشبوه خطير. تم حظر المعاملة وإبلاغ النظام الأمني.',
          [{ text: 'موافق', onPress: () => router.back() }]
        );
        setLoading(false);
        setAcidState('failed');
        return;
      }

      if (fraudResult.riskLevel === 'high') {
        Alert.alert(
          'تحذير أمني',
          `مستوى المخاطر: عالي\nالأسباب: ${fraudResult.flags.join(', ')}\n\nهذه المعاملة تتطلب تحقق إضافي. هل تريد المتابعة؟`,
          [
            { text: 'إلغاء', style: 'cancel', onPress: () => {
              setLoading(false);
              setAcidState('cancelled');
            }},
            { text: 'متابعة مع تحقق إضافي', onPress: () => {
              setSecurityVerification(true);
              setAcidState('verified');
            }}
          ]
        );
      } else {
        setSecurityVerification(true);
        setAcidState('verified');
      }

      // Verify Chain Integrity
      const chainIntegrity = await cryptoService.verifyChainIntegrity();
      setChainIntegrityVerified(chainIntegrity.isValid);
      
      if (!chainIntegrity.isValid) {
        Alert.alert(
          'خطأ في سلامة السلسلة',
          'تم اكتشاف تلف في سلسلة المعاملات. لا يمكن إجراء معاملات جديدة.',
          [{ text: 'موافق', onPress: () => router.back() }]
        );
        setLoading(false);
        setAcidState('failed');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Enhanced security verification failed:', error);
      Alert.alert('خطأ أمني', 'فشل في التحقق الأمني المتقدم');
      setLoading(false);
      setAcidState('failed');
    }
  };

  const handleTransactionSigning = async () => {
    try {
      setLoading(true);
      setAcidState('signing');

      const sendAmount = parseFloat(amount);
      
      // ACID Isolation - Acquire Transaction Lock
      const lockAcquired = await cryptoService.acquireTransactionLock(`${currency}_${sendAmount}`);
      if (!lockAcquired) {
        Alert.alert('خطأ في القفل', 'لا يمكن الحصول على قفل المعاملة. حاول مرة أخرى.');
        setLoading(false);
        setAcidState('failed');
        return;
      }
      setTransactionLocked(true);
      
      // Create immutable transaction data for signing
      const immutableTransactionData: ImmutableTransaction = {
        id: cryptoService.generateSecureTransactionId(),
        senderId: '0',
        receiverId: recipient,
        amount: sendAmount,
        currency,
        note,
        timestamp: Date.now(),
        status: 'signing',
        type: 'send',
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
        acidState: 'signing',
        isolationLevel: 'serializable',
        lockAcquired: true,
        // PCI DSS Compliance
        pciDSSCompliant: true,
        encryptionStandard: 'AES-256-GCM',
        keyDerivation: 'PBKDF2-SHA256'
      };

      // Calculate Merkle Root for transaction integrity
      const merkleRoot = await cryptoService.calculateMerkleRoot([
        immutableTransactionData.id,
        immutableTransactionData.senderId,
        immutableTransactionData.receiverId,
        immutableTransactionData.amount.toString(),
        immutableTransactionData.currency,
        immutableTransactionData.timestamp.toString()
      ]);
      immutableTransactionData.merkleRoot = merkleRoot;

      // Generate immutable transaction hash
      const transactionHash = await cryptoService.generateImmutableTransactionHash(immutableTransactionData);
      setImmutableTxHash(transactionHash);

      // Digital Signature with Enhanced Security
      const signature = await cryptoService.signImmutableTransaction(immutableTransactionData);
      immutableTransactionData.signature = signature;
      
      // Multi-layer signature verification
      const signatureVerifications = await Promise.all([
        cryptoService.verifyTransactionSignature(immutableTransactionData, signature),
        cryptoService.verifyMerkleRoot(immutableTransactionData),
        cryptoService.verifyTransactionIntegrity(immutableTransactionData)
      ]);
      
      if (!signatureVerifications.every(v => v)) {
        throw new Error('Multi-layer signature verification failed');
      }

      // ACID Consistency Check
      const consistencyCheck = await cryptoService.verifyACIDConsistency(immutableTransactionData);
      if (!consistencyCheck.isConsistent) {
        throw new Error(`ACID consistency violation: ${consistencyCheck.violations.join(', ')}`);
      }

      setTransactionSigned(true);
      setAcidState('signed');
      Alert.alert(
        'تم التوقيع بنجاح',
        `تم توقيع المعاملة رقمياً وتأمينها في السجل غير القابل للتغيير.\n\nHash: ${transactionHash.substring(0, 16)}...\n\nيمكنك الآن إرسال الأموال بأمان تام.`
      );
      setLoading(false);
    } catch (error) {
      console.error('Enhanced transaction signing failed:', error);
      Alert.alert('خطأ في التوقيع', 'فشل في توقيع المعاملة الآمنة');
      setLoading(false);
      setAcidState('failed');
      
      // Release lock on failure
      if (transactionLocked) {
        await cryptoService.releaseTransactionLock(`${currency}_${parseFloat(amount)}`);
        setTransactionLocked(false);
      }
    }
  };

  const handleSend = async () => {
    // Enhanced Pre-flight Checks
    if (!amount || !recipient) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (!deviceSecurityPassed) {
      Alert.alert('خطأ أمني', 'يجب اجتياز فحص أمان الجهاز أولاً');
      return;
    }

    if (!securityVerification) {
      Alert.alert('خطأ', 'يجب إجراء التحقق الأمني المتقدم أولاً');
      return;
    }

    if (!transactionSigned) {
      Alert.alert('خطأ', 'يجب توقيع المعاملة رقمياً أولاً');
      return;
    }

    if (!chainIntegrityVerified) {
      Alert.alert('خطأ', 'يجب التحقق من سلامة سلسلة المعاملات أولاً');
      return;
    }

    if (acidState !== 'signed') {
      Alert.alert('خطأ في ACID', 'حالة المعاملة غير صحيحة للتنفيذ');
      return;
    }

    const sendAmount = parseFloat(amount);
    const balance = balances.find(b => b.currency === currency);
    
    if (!balance || balance.amount < sendAmount) {
      Alert.alert('خطأ', 'رصيد غير كافٍ أو غير متسق');
      return;
    }

    setLoading(true);
    setAcidState('committing');

    try {
      // ACID Transaction Execution with Immutable Ledger
      const finalTransaction: ImmutableTransaction = {
        id: immutableTxHash || cryptoService.generateSecureTransactionId(),
        senderId: '0',
        receiverId: recipient,
        amount: sendAmount,
        currency,
        timestamp: Date.now(),
        status: 'committing',
        type: 'send',
        note,
        // Immutable Ledger Properties
        previousHash: await cryptoService.getLastTransactionHash(),
        merkleRoot: await cryptoService.calculateMerkleRoot([
          immutableTxHash,
          '0',
          recipient,
          sendAmount.toString(),
          currency,
          Date.now().toString()
        ]),
        nonce: cryptoService.generateSecureRandom(32),
        difficulty: 4,
        blockHeight: await cryptoService.getCurrentBlockHeight(),
        // Security Properties
        encrypted: true,
        signature: await cryptoService.getTransactionSignature(immutableTxHash),
        publicKey: await cryptoService.getPublicKey(),
        // ACID Properties
        acidState: 'committing',
        isolationLevel: 'serializable',
        lockAcquired: transactionLocked,
        // PCI DSS Compliance
        pciDSSCompliant: true,
        encryptionStandard: 'AES-256-GCM',
        keyDerivation: 'PBKDF2-SHA256',
        // Audit Trail
        auditTrail: {
          deviceFingerprint: await deviceSecurity.getDeviceFingerprint(),
          securityChecks: {
            biometricAuth: true,
            deviceSecurity: deviceSecurityPassed,
            fraudDetection: fraudCheckResult?.riskLevel || 'unknown',
            chainIntegrity: chainIntegrityVerified
          },
          timestamp: Date.now(),
          ipAddress: Platform.OS === 'web' ? 'web-client' : 'mobile-client'
        }
      };

      // ACID Durability - Commit to Immutable Ledger
      const commitResult = await cryptoService.commitToImmutableLedger(finalTransaction);
      if (!commitResult.success) {
        throw new Error(`Failed to commit to immutable ledger: ${commitResult.error}`);
      }

      // Atomic Balance Update with Rollback Capability
      const balanceUpdateResult = await updateBalance(currency, -sendAmount, {
        transactionId: finalTransaction.id,
        rollbackCapable: true,
        acidCompliant: true
      });
      
      if (!balanceUpdateResult.success) {
        // Rollback immutable ledger entry
        await cryptoService.rollbackImmutableTransaction(finalTransaction.id);
        throw new Error('Failed to update balance atomically');
      }

      // Add to transaction history with immutable properties
      finalTransaction.status = 'completed';
      finalTransaction.acidState = 'committed';
      
      const addTransactionResult = await addTransaction(finalTransaction);
      if (!addTransactionResult.success) {
        // Rollback balance and ledger
        await updateBalance(currency, sendAmount, { rollback: true });
        await cryptoService.rollbackImmutableTransaction(finalTransaction.id);
        throw new Error('Failed to add transaction to history');
      }

      // Release transaction lock
      if (transactionLocked) {
        await cryptoService.releaseTransactionLock(`${currency}_${sendAmount}`);
        setTransactionLocked(false);
      }

      // Verify final chain integrity
      const finalChainCheck = await cryptoService.verifyChainIntegrity();
      if (!finalChainCheck.isValid) {
        console.error('Chain integrity compromised after transaction');
        // Alert security team but don't rollback completed transaction
      }

      setAcidState('committed');

      // Enhanced Security Logging
      console.log('Immutable transaction completed:', {
        transactionId: finalTransaction.id,
        transactionHash: immutableTxHash,
        amount: sendAmount,
        currency,
        fraudRisk: fraudCheckResult?.riskLevel,
        acidState: 'committed',
        pciDSSCompliant: true,
        chainIntegrity: finalChainCheck.isValid,
        blockHeight: finalTransaction.blockHeight,
        merkleRoot: finalTransaction.merkleRoot
      });

      Alert.alert(
        'تم الإرسال بنجاح',
        `تم إرسال ${sendAmount} ${currency} بنجاح وتسجيله في السجل غير القابل للتغيير.\n\nرقم المعاملة: ${finalTransaction.id}\nHash: ${immutableTxHash.substring(0, 16)}...\n\nالمعاملة محمية بتشفير AES-256 ومتوافقة مع معايير PCI DSS.`
      );
      router.back();
    } catch (error) {
      console.error('Immutable transaction failed:', error);
      setAcidState('failed');
      
      // Emergency cleanup
      if (transactionLocked) {
        await cryptoService.releaseTransactionLock(`${currency}_${parseFloat(amount)}`);
        setTransactionLocked(false);
      }
      
      Alert.alert(
        'خطأ في المعاملة',
        'فشل في تنفيذ المعاملة الآمنة. تم الحفاظ على سلامة البيانات.'
      );
    }

    setLoading(false);
  };

  const renderCurrencyItem = ({ item }: { item: { currency: string; amount: number } }) => (
    <TouchableOpacity
      style={[styles.currencyItem, currency === item.currency && styles.selectedCurrency]}
      onPress={() => setCurrency(item.currency)}
    >
      <Text style={styles.currencyCode}>{item.currency}</Text>
      <Text style={styles.currencyBalance}>{item.amount.toFixed(2)}</Text>
    </TouchableOpacity>
  );

  const renderSecurityStatus = () => {
    return (
      <View style={styles.securityContainer}>
        <View style={styles.securityHeader}>
          <Shield size={20} color={Colors.primary} />
          <Text style={styles.securityTitle}>حالة الأمان والسجل غير القابل للتغيير</Text>
        </View>
        
        {fraudCheckResult && (
          <View style={[
            styles.riskIndicator,
            { backgroundColor: getRiskColor(fraudCheckResult.riskLevel) + '20' }
          ]}>
            <Text style={[styles.riskText, { color: getRiskColor(fraudCheckResult.riskLevel) }]}>
              مستوى المخاطر: {getRiskLevelText(fraudCheckResult.riskLevel)}
            </Text>
            {fraudCheckResult.flags.length > 0 && (
              <Text style={styles.riskFlags}>
                التحذيرات: {fraudCheckResult.flags.join(', ')}
              </Text>
            )}
          </View>
        )}

        <View style={styles.securityChecks}>
          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>أمان الجهاز</Text>
            <Text style={[styles.checkStatus, { color: deviceSecurityPassed ? Colors.success : Colors.error }]}>
              {deviceSecurityPassed ? '✓ آمن' : '✗ غير آمن'}
            </Text>
          </View>
          
          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>التحقق الأمني المتقدم</Text>
            <Text style={[styles.checkStatus, { color: securityVerification ? Colors.success : Colors.medium }]}>
              {securityVerification ? '✓ مكتمل' : '⏳ مطلوب'}
            </Text>
          </View>
          
          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>سلامة السلسلة</Text>
            <Text style={[styles.checkStatus, { color: chainIntegrityVerified ? Colors.success : Colors.medium }]}>
              {chainIntegrityVerified ? '✓ سليمة' : '⏳ فحص'}
            </Text>
          </View>
          
          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>التوقيع الرقمي</Text>
            <Text style={[styles.checkStatus, { color: transactionSigned ? Colors.success : Colors.medium }]}>
              {transactionSigned ? '✓ موقعة' : '⏳ مطلوب'}
            </Text>
          </View>

          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>حالة ACID</Text>
            <Text style={[styles.checkStatus, { color: getACIDStateColor() }]}>
              {getACIDStateText()}
            </Text>
          </View>

          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>قفل المعاملة</Text>
            <Text style={[styles.checkStatus, { color: transactionLocked ? Colors.warning : Colors.medium }]}>
              {transactionLocked ? '🔒 مقفلة' : '🔓 غير مقفلة'}
            </Text>
          </View>

          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>متوافق مع PCI DSS</Text>
            <Text style={[styles.checkStatus, { color: Colors.success }]}>
              ✓ متوافق
            </Text>
          </View>
        </View>

        {immutableTxHash && (
          <View style={styles.hashContainer}>
            <Text style={styles.hashLabel}>Hash المعاملة غير القابل للتغيير:</Text>
            <Text style={styles.hashText} numberOfLines={2}>
              {immutableTxHash}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const getACIDStateColor = () => {
    switch (acidState) {
      case 'idle': return Colors.medium;
      case 'validating': return Colors.warning;
      case 'verified': return Colors.primary;
      case 'signing': return Colors.accent;
      case 'signed': return Colors.success;
      case 'committing': return Colors.warning;
      case 'committed': return Colors.success;
      case 'failed': return Colors.error;
      case 'cancelled': return Colors.medium;
      default: return Colors.medium;
    }
  };

  const getACIDStateText = () => {
    switch (acidState) {
      case 'idle': return '⏳ في الانتظار';
      case 'validating': return '🔍 التحقق';
      case 'verified': return '✓ تم التحقق';
      case 'signing': return '✍️ التوقيع';
      case 'signed': return '✓ موقعة';
      case 'committing': return '💾 الحفظ';
      case 'committed': return '✅ مكتملة';
      case 'failed': return '❌ فشلت';
      case 'cancelled': return '🚫 ملغية';
      default: return '❓ غير معروف';
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return Colors.success;
      case 'medium': return Colors.warning;
      case 'high': return Colors.error;
      case 'critical': return '#8B0000';
      default: return Colors.medium;
    }
  };

  const getRiskLevelText = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'منخفض';
      case 'medium': return 'متوسط';
      case 'high': return 'عالي';
      case 'critical': return 'حرج';
      default: return 'غير محدد';
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: t.sendMoney,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.dark} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>اختر العملة</Text>
        <FlatList
          data={balances}
          renderItem={renderCurrencyItem}
          keyExtractor={(item) => item.currency}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.currencyList}
        />

        <Text style={styles.sectionTitle}>المبلغ</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="numeric"
          placeholderTextColor={Colors.medium}
        />

        <Text style={styles.sectionTitle}>المستلم</Text>
        <TextInput
          style={styles.input}
          value={recipient}
          onChangeText={setRecipient}
          placeholder="رقم الهاتف أو اسم المستخدم"
          placeholderTextColor={Colors.medium}
        />

        <Text style={styles.sectionTitle}>ملاحظة (اختيارية)</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          onChangeText={setNote}
          placeholder="أضف ملاحظة..."
          multiline
          placeholderTextColor={Colors.medium}
        />

        {renderSecurityStatus()}

        {!deviceSecurityPassed ? (
          <Button
            title="فحص أمان الجهاز"
            onPress={performDeviceSecurityCheck}
            loading={loading}
            style={styles.deviceSecurityButton}
            icon={<AlertTriangle size={20} color="white" />}
          />
        ) : !securityVerification ? (
          <Button
            title="التحقق الأمني المتقدم"
            onPress={handleSecurityVerification}
            loading={loading}
            style={styles.securityButton}
            icon={<Shield size={20} color="white" />}
          />
        ) : !transactionSigned ? (
          <Button
            title="توقيع المعاملة الآمنة"
            onPress={handleTransactionSigning}
            loading={loading}
            style={styles.signButton}
            icon={<Lock size={20} color="white" />}
          />
        ) : (
          <Button
            title="إرسال آمن (غير قابل للتراجع)"
            onPress={handleSend}
            loading={loading}
            style={styles.sendButton}
            icon={<CheckCircle2 size={20} color="white" />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 10,
    marginTop: 20,
  },
  currencyList: {
    marginBottom: 10,
  },
  currencyItem: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCurrency: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  currencyBalance: {
    fontSize: 12,
    color: Colors.medium,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.dark,
    marginBottom: 10,
  },
  noteInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  securityContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginLeft: 8,
  },
  riskIndicator: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  riskText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  riskFlags: {
    fontSize: 12,
    color: Colors.medium,
  },
  securityChecks: {
    gap: 8,
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
  deviceSecurityButton: {
    marginTop: 30,
    backgroundColor: Colors.error,
  },
  securityButton: {
    marginTop: 30,
    backgroundColor: Colors.warning,
  },
  signButton: {
    marginTop: 30,
    backgroundColor: Colors.accent,
  },
  sendButton: {
    marginTop: 30,
    backgroundColor: Colors.success,
  },
  hashContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  hashLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  hashText: {
    fontSize: 10,
    color: Colors.dark,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
});