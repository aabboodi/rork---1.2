import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert, TextInput, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowUpRight, ArrowDownLeft, Plus, CreditCard, Banknote, TrendingUp, Receipt, Users, Building, Smartphone, Star, X, Shield, CheckCircle, AlertTriangle, Lock, Clock, Target, PiggyBank, BarChart3 } from 'lucide-react-native';
import { mockTransactions } from '@/mocks/transactions';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import TransactionItem from '@/components/TransactionItem';
import SecurityManager from '@/services/security/SecurityManager';
import WalletEligibilityService from '@/services/WalletEligibilityService';

export default function WalletScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const { userId } = useAuthStore();
  const { 
    balances, 
    createLoan, 
    getUserLoanRating, 
    getLoansByUser, 
    rateBorrower, 
    getTransactionById,
    checkWalletEligibility,
    recordDailyUsage,
    getEligibilityProgress,
    createSavingCircle,
    getUserSavingCircles,
    getAvailableStartups,
    createInvestment,
    getUserInvestments,
    getPortfolioPerformance
  } = useWalletStore();
  const t = translations[language];
  
  // Security state
  const [securityManager] = useState(() => SecurityManager.getInstance());
  const [ledgerIntegrity, setLedgerIntegrity] = useState<any>(null);
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  
  // Loan modal state
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [loanAmount, setLoanAmount] = useState('');
  const [loanMonths, setLoanMonths] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('SAR');
  const [isProcessingLoan, setIsProcessingLoan] = useState(false);

  // Rating modal state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedLoanForRating, setSelectedLoanForRating] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  // Transaction detail modal state
  const [transactionDetailVisible, setTransactionDetailVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  // Security modal state
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  
  // Wallet eligibility state
  const [walletEligible, setWalletEligible] = useState(false);
  const [eligibilityProgress, setEligibilityProgress] = useState(0);
  const [eligibilityModalVisible, setEligibilityModalVisible] = useState(false);
  
  // Saving circle state
  const [savingCircleModalVisible, setSavingCircleModalVisible] = useState(false);
  const [circleName, setCircleName] = useState('');
  const [circleContribution, setCircleContribution] = useState('');
  const [circleMembers, setCircleMembers] = useState('');
  
  // Investment state
  const [investmentModalVisible, setInvestmentModalVisible] = useState(false);
  const [availableStartups, setAvailableStartups] = useState([]);
  const [selectedStartup, setSelectedStartup] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [portfolioPerformance, setPortfolioPerformance] = useState(null);

  // Initialize security monitoring
  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        // Check ledger integrity
        const integrity = await securityManager.performLedgerIntegrityCheckPublic();
        setLedgerIntegrity(integrity);
        
        // Get security status
        const status = securityManager.getSecurityStatus();
        setSecurityStatus(status);
        
        // Show warning if ledger is compromised
        if (!integrity.isIntact) {
          Alert.alert(
            'تحذير أمني',
            'تم اكتشاف مشكلة في سلامة السجل المالي. تم إيقاف العمليات المالية مؤقتاً.',
            [{ text: 'موافق', style: 'default' }]
          );
        }
      } catch (error) {
        console.error('Failed to initialize security:', error);
      }
    };

    initializeSecurity();

    // Set up periodic security checks
    const securityInterval = setInterval(async () => {
      try {
        const status = securityManager.getSecurityStatus();
        setSecurityStatus(status);
      } catch (error) {
        console.error('Security check failed:', error);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(securityInterval);
  }, []);
  
  const handleSend = async () => {
    // Check security before allowing transaction
    if (securityManager.isSensitiveOperationsBlocked()) {
      Alert.alert('عملية محظورة', 'العمليات المالية محظورة حالياً لأسباب أمنية');
      return;
    }
    
    if (securityManager.isFinancialLedgerLocked()) {
      Alert.alert('السجل المالي مقفل', 'السجل المالي مقفل بسبب مشاكل في السلامة');
      return;
    }
    
    router.push('/wallet/send');
  };
  
  const handleReceive = () => {
    router.push('/wallet/receive');
  };
  
  const handleAddMoney = async () => {
    // Check security before allowing transaction
    if (securityManager.isSensitiveOperationsBlocked()) {
      Alert.alert('عملية محظورة', 'العمليات المالية محظورة حالياً لأسباب أمنية');
      return;
    }
    
    Alert.alert(
      'إضافة أموال',
      'اختر طريقة الإضافة',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'بطاقة ائتمان', onPress: () => handleCreditCardTopup() },
        { text: 'تحويل بنكي', onPress: () => handleBankTransfer() },
        { text: 'محفظة رقمية', onPress: () => handleDigitalWallet() },
      ]
    );
  };
  
  const handleCreditCardTopup = () => {
    Alert.alert(
      'إضافة أموال بالبطاقة الائتمانية',
      'اختر المبلغ',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: '100 ريال', onPress: () => processTopup(100, 'SAR', 'credit_card') },
        { text: '500 ريال', onPress: () => processTopup(500, 'SAR', 'credit_card') },
        { text: '1000 ريال', onPress: () => processTopup(1000, 'SAR', 'credit_card') },
      ]
    );
  };
  
  const handleBankTransfer = () => {
    Alert.alert(
      'تحويل بنكي',
      'سيتم توجيهك لتطبيق البنك لإتمام التحويل',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'متابعة', onPress: () => {
          Alert.alert('نجح', 'تم فتح تطبيق البنك');
        }}
      ]
    );
  };
  
  const handleDigitalWallet = () => {
    Alert.alert(
      'محفظة رقمية',
      'اختر المحفظة',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'Apple Pay', onPress: () => processTopup(200, 'SAR', 'apple_pay') },
        { text: 'Google Pay', onPress: () => processTopup(200, 'SAR', 'google_pay') },
        { text: 'STC Pay', onPress: () => processTopup(200, 'SAR', 'stc_pay') },
      ]
    );
  };
  
  const processTopup = async (amount: number, currency: string, method: string) => {
    try {
      // Validate transaction with security manager
      const mockTransaction = {
        id: Date.now().toString(),
        senderId: 'system',
        receiverId: userId || '0',
        amount,
        currency,
        timestamp: Date.now(),
        status: 'pending',
        type: 'topup',
        note: `إضافة أموال عبر ${method}`,
      };

      const validation = await securityManager.validateFinancialTransactionPublic(mockTransaction);
      
      if (!validation.isValid) {
        Alert.alert('فشل التحقق الأمني', validation.errors.join('\n'));
        return;
      }

      if (validation.requiresAdditionalAuth) {
        // In production, this would trigger biometric authentication
        Alert.alert('مطلوب تأكيد إضافي', 'هذه المعاملة تتطلب تأكيد بيومتري');
        return;
      }

      const { updateBalance, addTransaction } = useWalletStore.getState();
      
      // Add money to balance
      await updateBalance(currency, amount);
      
      // Add transaction record with security metadata
      await addTransaction({
        ...mockTransaction,
        status: 'completed',
        hash: validation.ledgerHash,
        signature: {
          transactionId: mockTransaction.id,
          signature: 'sig_' + validation.ledgerHash,
          publicKey: 'pub_system',
          timestamp: Date.now(),
          algorithm: 'HMAC-SHA256'
        },
        immutableHash: 'immutable_' + validation.ledgerHash,
        previousTransactionHash: validation.previousTransactionHash,
        merkleProof: validation.merkleProof,
        fraudRiskLevel: validation.fraudRiskLevel,
        fraudFlags: validation.fraudFlags,
        integrityVerified: validation.integrityVerified,
        pciDSSCompliant: true,
        acidCompliant: validation.acidCompliant
      });
      
      Alert.alert('نجح', `تم إضافة ${amount} ${currency} بنجاح`);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إضافة الأموال');
    }
  };
  
  const handleBills = () => {
    Alert.alert(
      'دفع الفواتير',
      'اختر نوع الفاتورة',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'فاتورة كهرباء', onPress: () => handleElectricityBill() },
        { text: 'فاتورة مياه', onPress: () => handleWaterBill() },
        { text: 'فاتورة هاتف', onPress: () => handlePhoneBill() },
        { text: 'فاتورة إنترنت', onPress: () => handleInternetBill() },
      ]
    );
  };
  
  const handleElectricityBill = () => {
    Alert.alert(
      'فاتورة الكهرباء',
      'أدخل رقم الحساب',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'دفع 150 ريال', onPress: () => processBillPayment(150, 'SAR', 'electricity') },
      ]
    );
  };
  
  const handleWaterBill = () => {
    Alert.alert(
      'فاتورة المياه',
      'أدخل رقم الحساب',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'دفع 80 ريال', onPress: () => processBillPayment(80, 'SAR', 'water') },
      ]
    );
  };
  
  const handlePhoneBill = () => {
    Alert.alert(
      'فاتورة الهاتف',
      'أدخل رقم الهاتف',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'دفع 120 ريال', onPress: () => processBillPayment(120, 'SAR', 'phone') },
      ]
    );
  };
  
  const handleInternetBill = () => {
    Alert.alert(
      'فاتورة الإنترنت',
      'أدخل رقم الحساب',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'دفع 200 ريال', onPress: () => processBillPayment(200, 'SAR', 'internet') },
      ]
    );
  };
  
  const processBillPayment = async (amount: number, currency: string, billType: string) => {
    try {
      const { updateBalance, addTransaction, getBalance } = useWalletStore.getState();
      
      const currentBalance = getBalance(currency);
      if (currentBalance < amount) {
        Alert.alert('خطأ', 'رصيد غير كافٍ');
        return;
      }

      // Validate transaction with security manager
      const mockTransaction = {
        id: Date.now().toString(),
        senderId: userId || '0',
        receiverId: 'bills_system',
        amount,
        currency,
        timestamp: Date.now(),
        status: 'pending',
        type: 'bill_payment',
        note: `دفع فاتورة ${billType}`,
      };

      const validation = await securityManager.validateFinancialTransactionPublic(mockTransaction);
      
      if (!validation.isValid) {
        Alert.alert('فشل التحقق الأمني', validation.errors.join('\n'));
        return;
      }
      
      // Deduct money from balance
      await updateBalance(currency, -amount);
      
      // Add transaction record with security metadata
      await addTransaction({
        ...mockTransaction,
        status: 'completed',
        hash: validation.ledgerHash,
        signature: {
          transactionId: mockTransaction.id,
          signature: 'sig_' + validation.ledgerHash,
          publicKey: 'pub_' + (userId || '0'),
          timestamp: Date.now(),
          algorithm: 'HMAC-SHA256'
        },
        immutableHash: 'immutable_' + validation.ledgerHash,
        previousTransactionHash: validation.previousTransactionHash,
        merkleProof: validation.merkleProof,
        fraudRiskLevel: validation.fraudRiskLevel,
        fraudFlags: validation.fraudFlags,
        integrityVerified: validation.integrityVerified,
        pciDSSCompliant: true,
        acidCompliant: validation.acidCompliant
      });
      
      Alert.alert('نجح', `تم دفع فاتورة ${billType} بمبلغ ${amount} ${currency}`);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في دفع الفاتورة');
    }
  };
  
  const handleTransfer = () => {
    Alert.alert(
      'تحويل أموال',
      'اختر طريقة التحويل',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تحويل لمستخدم', onPress: () => handleUserTransfer() },
        { text: 'تحويل بنكي', onPress: () => handleBankAccountTransfer() },
        { text: 'تحويل دولي', onPress: () => handleInternationalTransfer() },
      ]
    );
  };
  
  const handleUserTransfer = () => {
    router.push('/wallet/send');
  };
  
  const handleBankAccountTransfer = () => {
    Alert.alert(
      'تحويل بنكي',
      'أدخل رقم الحساب البنكي',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تحويل 500 ريال', onPress: () => processBankTransfer(500, 'SAR') },
      ]
    );
  };
  
  const handleInternationalTransfer = () => {
    Alert.alert(
      'تحويل دولي',
      'اختر الدولة والعملة',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'الإمارات - 100 درهم', onPress: () => processInternationalTransfer(100, 'AED') },
        { text: 'مصر - 500 جنيه', onPress: () => processInternationalTransfer(500, 'EGP') },
      ]
    );
  };
  
  const processBankTransfer = async (amount: number, currency: string) => {
    try {
      const { updateBalance, addTransaction, getBalance } = useWalletStore.getState();
      
      const currentBalance = getBalance(currency);
      if (currentBalance < amount) {
        Alert.alert('خطأ', 'رصيد غير كافٍ');
        return;
      }

      // Validate transaction with security manager
      const mockTransaction = {
        id: Date.now().toString(),
        senderId: userId || '0',
        receiverId: 'bank_account',
        amount,
        currency,
        timestamp: Date.now(),
        status: 'pending',
        type: 'bank_transfer',
        note: 'تحويل بنكي',
      };

      const validation = await securityManager.validateFinancialTransactionPublic(mockTransaction);
      
      if (!validation.isValid) {
        Alert.alert('فشل التحقق الأمني', validation.errors.join('\n'));
        return;
      }
      
      await updateBalance(currency, -amount);
      
      await addTransaction({
        ...mockTransaction,
        status: 'completed',
        hash: validation.ledgerHash,
        signature: {
          transactionId: mockTransaction.id,
          signature: 'sig_' + validation.ledgerHash,
          publicKey: 'pub_' + (userId || '0'),
          timestamp: Date.now(),
          algorithm: 'HMAC-SHA256'
        },
        immutableHash: 'immutable_' + validation.ledgerHash,
        previousTransactionHash: validation.previousTransactionHash,
        merkleProof: validation.merkleProof,
        fraudRiskLevel: validation.fraudRiskLevel,
        fraudFlags: validation.fraudFlags,
        integrityVerified: validation.integrityVerified,
        pciDSSCompliant: true,
        acidCompliant: validation.acidCompliant
      });
      
      Alert.alert('نجح', `تم التحويل البنكي بمبلغ ${amount} ${currency}`);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في التحويل البنكي');
    }
  };
  
  const processInternationalTransfer = async (amount: number, currency: string) => {
    try {
      const { updateBalance, addTransaction, getBalance } = useWalletStore.getState();
      
      const currentBalance = getBalance(currency);
      if (currentBalance < amount) {
        Alert.alert('خطأ', 'رصيد غير كافٍ');
        return;
      }

      // Validate transaction with security manager
      const mockTransaction = {
        id: Date.now().toString(),
        senderId: userId || '0',
        receiverId: 'international',
        amount,
        currency,
        timestamp: Date.now(),
        status: 'pending',
        type: 'international_transfer',
        note: 'تحويل دولي',
      };

      const validation = await securityManager.validateFinancialTransactionPublic(mockTransaction);
      
      if (!validation.isValid) {
        Alert.alert('فشل التحقق الأمني', validation.errors.join('\n'));
        return;
      }

      if (validation.requiresAdditionalAuth) {
        Alert.alert('مطلوب تأكيد إضافي', 'التحويلات الدولية تتطلب تأكيد بيومتري');
        return;
      }
      
      await updateBalance(currency, -amount);
      
      await addTransaction({
        ...mockTransaction,
        status: 'completed',
        hash: validation.ledgerHash,
        signature: {
          transactionId: mockTransaction.id,
          signature: 'sig_' + validation.ledgerHash,
          publicKey: 'pub_' + (userId || '0'),
          timestamp: Date.now(),
          algorithm: 'HMAC-SHA256'
        },
        immutableHash: 'immutable_' + validation.ledgerHash,
        previousTransactionHash: validation.previousTransactionHash,
        merkleProof: validation.merkleProof,
        fraudRiskLevel: validation.fraudRiskLevel,
        fraudFlags: validation.fraudFlags,
        integrityVerified: validation.integrityVerified,
        pciDSSCompliant: true,
        acidCompliant: validation.acidCompliant
      });
      
      Alert.alert('نجح', `تم التحويل الدولي بمبلغ ${amount} ${currency}`);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في التحويل الدولي');
    }
  };

  // Loan handling functions
  const handleLoan = () => {
    setLoanModalVisible(true);
  };

  const processLoan = async () => {
    if (!loanAmount || !loanMonths || !borrowerPhone) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }

    const amount = parseFloat(loanAmount);
    const months = parseInt(loanMonths);

    if (amount <= 0 || months <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال قيم صحيحة');
      return;
    }

    setIsProcessingLoan(true);

    try {
      const result = await createLoan(userId || '0', borrowerPhone, amount, selectedCurrency, months);
      
      if (result.success) {
        Alert.alert('نجح', `تم إنشاء القرض بنجاح. رقم القرض: ${result.loanId}`);
        setLoanModalVisible(false);
        setLoanAmount('');
        setLoanMonths('');
        setBorrowerPhone('');
      } else {
        Alert.alert('خطأ', result.error || 'فشل في إنشاء القرض');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء إنشاء القرض');
    } finally {
      setIsProcessingLoan(false);
    }
  };

  const handleRateBorrower = (loanId: string) => {
    setSelectedLoanForRating(loanId);
    setRatingModalVisible(true);
  };

  const submitRating = async () => {
    if (!selectedLoanForRating) return;

    try {
      const result = await rateBorrower(selectedLoanForRating, rating, ratingComment);
      
      if (result.success) {
        Alert.alert('نجح', 'تم تقييم المقترض بنجاح');
        setRatingModalVisible(false);
        setRating(5);
        setRatingComment('');
        setSelectedLoanForRating(null);
      } else {
        Alert.alert('خطأ', result.error || 'فشل في تقييم المقترض');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء التقييم');
    }
  };

  const handleTransactionPress = (transactionId: string) => {
    const transaction = getTransactionById(transactionId);
    if (transaction) {
      setSelectedTransaction(transaction);
      setTransactionDetailVisible(true);
    }
  };

  const handleSecurityInfo = () => {
    setSecurityModalVisible(true);
  };
  
  const handleViewAllTransactions = () => {
    Alert.alert('جميع المعاملات', 'سيتم فتح شاشة جميع المعاملات');
  };
  
  const getPrimaryBalance = () => {
    const primaryCurrency = balances.find(b => b.currency === 'SAR');
    return primaryCurrency || balances[0];
  };
  
  const getTotalBalanceInSAR = () => {
    // Simple conversion rates (in real app, use live rates)
    const rates: { [key: string]: number } = {
      'SAR': 1, 'AED': 1.02, 'EGP': 0.12, 'IRR': 0.000089, 'USD': 3.75,
      'IQD': 0.00068, 'JOD': 5.31, 'KWD': 12.25, 'LBP': 0.00025, 'LYD': 0.77,
      'MAD': 0.37, 'DZD': 0.028, 'TND': 1.20, 'SDG': 0.0063, 'SYP': 0.00015,
      'YER': 0.015, 'OMR': 9.75, 'QAR': 1.03, 'BHD': 9.95, 'ILS': 1.07,
      'SOS': 0.0066, 'DJF': 0.021, 'KMF': 0.0081
    };
    
    return balances.reduce((total, balance) => {
      return total + (balance.amount * (rates[balance.currency] || 1));
    }, 0);
  };

  const renderStars = (rating: number, onPress?: (star: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress && onPress(star)}
            disabled={!onPress}
          >
            <Star
              size={24}
              color={star <= rating ? Colors.warning : Colors.medium}
              fill={star <= rating ? Colors.warning : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getSecurityStatusColor = () => {
    if (!securityStatus) return Colors.medium;
    
    switch (securityStatus.riskLevel) {
      case 'low': return Colors.success;
      case 'medium': return Colors.warning;
      case 'high': return Colors.danger;
      case 'critical': return '#8B0000';
      default: return Colors.medium;
    }
  };

  const getSecurityStatusIcon = () => {
    if (!securityStatus) return Shield;
    
    if (securityStatus.isSecure && securityStatus.financialLedgerIntegrity) {
      return CheckCircle;
    } else if (securityStatus.riskLevel === 'critical') {
      return Lock;
    } else {
      return AlertTriangle;
    }
  };

  const currencies = ['SAR', 'AED', 'EGP', 'USD', 'IQD', 'JOD', 'KWD', 'LBP', 'LYD', 'MAD', 'DZD', 'TND', 'SDG', 'SYP', 'YER', 'OMR', 'QAR', 'BHD', 'ILS', 'SOS', 'DJF', 'KMF'];
  
  return (
    <View style={styles.container}>
      {/* Enhanced Balance Card with Security Indicators */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>{t.balance}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.securityButton} onPress={handleSecurityInfo}>
              {React.createElement(getSecurityStatusIcon(), {
                size: 20,
                color: getSecurityStatusColor()
              })}
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreButton} onPress={handleAddMoney}>
              <Plus size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.balanceAmount}>
          {getPrimaryBalance()?.amount.toLocaleString()} {getPrimaryBalance()?.currency}
        </Text>
        
        <Text style={styles.totalBalance}>
          إجمالي الرصيد: {getTotalBalanceInSAR().toLocaleString()} ريال سعودي
        </Text>

        {/* Security Status Indicator */}
        {securityStatus && (
          <View style={styles.securityIndicator}>
            <View style={[styles.securityDot, { backgroundColor: getSecurityStatusColor() }]} />
            <Text style={styles.securityText}>
              {securityStatus.isSecure && securityStatus.financialLedgerIntegrity 
                ? 'السجل المالي آمن' 
                : securityStatus.riskLevel === 'critical' 
                  ? 'تحذير أمني عالي' 
                  : 'تحذير أمني متوسط'}
            </Text>
          </View>
        )}
        
        {/* Currency Balances */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll}>
          {balances.filter(b => b.amount > 0).map(balance => (
            <View key={balance.currency} style={styles.currencyCard}>
              <Text style={styles.currencyAmount}>{balance.amount.toLocaleString()}</Text>
              <Text style={styles.currencyCode}>{balance.currency}</Text>
            </View>
          ))}
        </ScrollView>
        
        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.sendButton]}
            onPress={handleSend}
          >
            <ArrowUpRight size={20} color="white" />
            <Text style={styles.actionButtonText}>{t.send}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.receiveButton]}
            onPress={handleReceive}
          >
            <ArrowDownLeft size={20} color="white" />
            <Text style={styles.actionButtonText}>{t.receive}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.addButton]}
            onPress={handleAddMoney}
          >
            <Plus size={20} color="white" />
            <Text style={styles.actionButtonText}>إضافة</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Quick Services */}
      <View style={styles.servicesContainer}>
        <Text style={styles.sectionTitle}>الخدمات السريعة</Text>
        <View style={styles.servicesGrid}>
          <TouchableOpacity style={styles.serviceItem} onPress={handleBills}>
            <Receipt size={24} color={Colors.primary} />
            <Text style={styles.serviceText}>فواتير</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.serviceItem} onPress={handleTransfer}>
            <Banknote size={24} color={Colors.success} />
            <Text style={styles.serviceText}>تحويل</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.serviceItem} onPress={handleLoan}>
            <Users size={24} color={Colors.warning} />
            <Text style={styles.serviceText}>قرض</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.serviceItem} onPress={() => Alert.alert('المزيد', 'المزيد من الخدمات قريباً')}>
            <Plus size={24} color={Colors.medium} />
            <Text style={styles.serviceText}>المزيد</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Transactions */}
      <View style={styles.transactionsContainer}>
        <View style={styles.transactionsHeader}>
          <Text style={styles.transactionsTitle}>{t.recentTransactions}</Text>
          <TouchableOpacity onPress={handleViewAllTransactions}>
            <Text style={styles.viewAllText}>عرض الكل</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={mockTransactions.slice(0, 5)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionItem 
              transaction={item} 
              userId={userId || '0'} 
              onPress={() => handleTransactionPress(item.id)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Security Modal */}
      <Modal
        visible={securityModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSecurityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>حالة الأمان</Text>
              <TouchableOpacity onPress={() => setSecurityModalVisible(false)}>
                <X size={24} color={Colors.dark} />
              </TouchableOpacity>
            </View>

            {securityStatus && (
              <View style={styles.securityDetails}>
                <View style={styles.securityRow}>
                  <Text style={styles.securityLabel}>حالة الأمان العامة:</Text>
                  <View style={styles.securityValue}>
                    {React.createElement(getSecurityStatusIcon(), {
                      size: 20,
                      color: getSecurityStatusColor()
                    })}
                    <Text style={[styles.securityValueText, { color: getSecurityStatusColor() }]}>
                      {securityStatus.isSecure ? 'آمن' : 'غير آمن'}
                    </Text>
                  </View>
                </View>

                <View style={styles.securityRow}>
                  <Text style={styles.securityLabel}>مستوى المخاطر:</Text>
                  <Text style={[styles.securityValueText, { color: getSecurityStatusColor() }]}>
                    {securityStatus.riskLevel === 'low' ? 'منخفض' :
                     securityStatus.riskLevel === 'medium' ? 'متوسط' :
                     securityStatus.riskLevel === 'high' ? 'عالي' : 'حرج'}
                  </Text>
                </View>

                <View style={styles.securityRow}>
                  <Text style={styles.securityLabel}>سلامة السجل المالي:</Text>
                  <View style={styles.securityValue}>
                    {securityStatus.financialLedgerIntegrity ? (
                      <CheckCircle size={20} color={Colors.success} />
                    ) : (
                      <AlertTriangle size={20} color={Colors.danger} />
                    )}
                    <Text style={[styles.securityValueText, { 
                      color: securityStatus.financialLedgerIntegrity ? Colors.success : Colors.danger 
                    }]}>
                      {securityStatus.financialLedgerIntegrity ? 'سليم' : 'مخترق'}
                    </Text>
                  </View>
                </View>

                <View style={styles.securityRow}>
                  <Text style={styles.securityLabel}>التوافق مع ACID:</Text>
                  <View style={styles.securityValue}>
                    {securityStatus.acidComplianceStatus ? (
                      <CheckCircle size={20} color={Colors.success} />
                    ) : (
                      <X size={20} color={Colors.danger} />
                    )}
                    <Text style={[styles.securityValueText, { 
                      color: securityStatus.acidComplianceStatus ? Colors.success : Colors.danger 
                    }]}>
                      {securityStatus.acidComplianceStatus ? 'متوافق' : 'غير متوافق'}
                    </Text>
                  </View>
                </View>

                <View style={styles.securityRow}>
                  <Text style={styles.securityLabel}>التهديدات النشطة:</Text>
                  <Text style={[styles.securityValueText, { 
                    color: securityStatus.activeThreats > 0 ? Colors.danger : Colors.success 
                  }]}>
                    {securityStatus.activeThreats}
                  </Text>
                </View>

                {ledgerIntegrity && (
                  <View style={styles.ledgerIntegritySection}>
                    <Text style={styles.sectionSubtitle}>تفاصيل سلامة السجل</Text>
                    
                    <View style={styles.securityRow}>
                      <Text style={styles.securityLabel}>نقاط السلامة:</Text>
                      <Text style={[styles.securityValueText, { 
                        color: ledgerIntegrity.integrityScore >= 90 ? Colors.success : 
                               ledgerIntegrity.integrityScore >= 70 ? Colors.warning : Colors.danger 
                      }]}>
                        {ledgerIntegrity.integrityScore}/100
                      </Text>
                    </View>

                    <View style={styles.securityRow}>
                      <Text style={styles.securityLabel}>المعاملات التالفة:</Text>
                      <Text style={[styles.securityValueText, { 
                        color: ledgerIntegrity.corruptedTransactions.length > 0 ? Colors.danger : Colors.success 
                      }]}>
                        {ledgerIntegrity.corruptedTransactions.length}
                      </Text>
                    </View>

                    <View style={styles.securityRow}>
                      <Text style={styles.securityLabel}>التوقيعات غير الصحيحة:</Text>
                      <Text style={[styles.securityValueText, { 
                        color: ledgerIntegrity.invalidSignatures.length > 0 ? Colors.danger : Colors.success 
                      }]}>
                        {ledgerIntegrity.invalidSignatures.length}
                      </Text>
                    </View>

                    <View style={styles.securityRow}>
                      <Text style={styles.securityLabel}>سلسلة مكسورة:</Text>
                      <Text style={[styles.securityValueText, { 
                        color: ledgerIntegrity.brokenChain ? Colors.danger : Colors.success 
                      }]}>
                        {ledgerIntegrity.brokenChain ? 'نعم' : 'لا'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => setSecurityModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loan Modal */}
      <Modal
        visible={loanModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLoanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إنشاء قرض جديد</Text>
              <TouchableOpacity onPress={() => setLoanModalVisible(false)}>
                <X size={24} color={Colors.dark} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>المبلغ</Text>
              <TextInput
                style={styles.textInput}
                value={loanAmount}
                onChangeText={setLoanAmount}
                placeholder="أدخل المبلغ"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>العملة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencySelector}>
                {currencies.map(currency => (
                  <TouchableOpacity
                    key={currency}
                    style={[
                      styles.currencyOption,
                      selectedCurrency === currency && styles.selectedCurrencyOption
                    ]}
                    onPress={() => setSelectedCurrency(currency)}
                  >
                    <Text style={[
                      styles.currencyOptionText,
                      selectedCurrency === currency && styles.selectedCurrencyOptionText
                    ]}>
                      {currency}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>عدد الأشهر للإعادة</Text>
              <TextInput
                style={styles.textInput}
                value={loanMonths}
                onChangeText={setLoanMonths}
                placeholder="أدخل عدد الأشهر"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>رقم هاتف المقترض</Text>
              <TextInput
                style={styles.textInput}
                value={borrowerPhone}
                onChangeText={setBorrowerPhone}
                placeholder="+966501234567"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLoanModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={processLoan}
                disabled={isProcessingLoan}
              >
                <Text style={styles.confirmButtonText}>
                  {isProcessingLoan ? 'جاري الإنشاء...' : 'إنشاء القرض'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal
        visible={ratingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تقييم المقترض</Text>
              <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
                <X size={24} color={Colors.dark} />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>التقييم</Text>
              {renderStars(rating, setRating)}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>تعليق (اختياري)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={ratingComment}
                onChangeText={setRatingComment}
                placeholder="اكتب تعليقك هنا..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRatingModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={submitRating}
              >
                <Text style={styles.confirmButtonText}>إرسال التقييم</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transaction Detail Modal */}
      <Modal
        visible={transactionDetailVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTransactionDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تفاصيل المعاملة</Text>
              <TouchableOpacity onPress={() => setTransactionDetailVisible(false)}>
                <X size={24} color={Colors.dark} />
              </TouchableOpacity>
            </View>

            {selectedTransaction && (
              <ScrollView style={styles.transactionDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>رقم المعاملة:</Text>
                  <Text style={styles.detailValue}>{selectedTransaction.id}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>المبلغ:</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction.amount} {selectedTransaction.currency}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>النوع:</Text>
                  <Text style={styles.detailValue}>{selectedTransaction.type}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>الحالة:</Text>
                  <Text style={[
                    styles.detailValue,
                    { color: selectedTransaction.status === 'completed' ? Colors.success : Colors.warning }
                  ]}>
                    {selectedTransaction.status === 'completed' ? 'مكتملة' : 'معلقة'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>التاريخ:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedTransaction.timestamp).toLocaleString('ar-SA')}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>الملاحظة:</Text>
                  <Text style={styles.detailValue}>{selectedTransaction.note}</Text>
                </View>

                {/* Security Information */}
                <Text style={styles.sectionSubtitle}>معلومات الأمان</Text>
                
                {selectedTransaction.hash && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hash:</Text>
                    <Text style={[styles.detailValue, styles.hashText]}>
                      {selectedTransaction.hash.substring(0, 16)}...
                    </Text>
                  </View>
                )}

                {selectedTransaction.signature && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>التوقيع الرقمي:</Text>
                    <Text style={[styles.detailValue, styles.hashText]}>
                      {selectedTransaction.signature.signature.substring(0, 16)}...
                    </Text>
                  </View>
                )}

                {selectedTransaction.immutableHash && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hash غير القابل للتغيير:</Text>
                    <Text style={[styles.detailValue, styles.hashText]}>
                      {selectedTransaction.immutableHash.substring(0, 16)}...
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>مستوى مخاطر الاحتيال:</Text>
                  <Text style={[
                    styles.detailValue,
                    { 
                      color: selectedTransaction.fraudRiskLevel === 'low' ? Colors.success :
                             selectedTransaction.fraudRiskLevel === 'medium' ? Colors.warning :
                             selectedTransaction.fraudRiskLevel === 'high' ? '#FF6B35' : Colors.danger
                    }
                  ]}>
                    {selectedTransaction.fraudRiskLevel === 'low' ? 'منخفض' :
                     selectedTransaction.fraudRiskLevel === 'medium' ? 'متوسط' :
                     selectedTransaction.fraudRiskLevel === 'high' ? 'عالي' : 'حرج'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>التحقق من السلامة:</Text>
                  <View style={styles.securityValue}>
                    {selectedTransaction.integrityVerified ? (
                      <CheckCircle size={16} color={Colors.success} />
                    ) : (
                      <X size={16} color={Colors.danger} />
                    )}
                    <Text style={[
                      styles.detailValue,
                      { color: selectedTransaction.integrityVerified ? Colors.success : Colors.danger }
                    ]}>
                      {selectedTransaction.integrityVerified ? 'تم التحقق' : 'فشل التحقق'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>التوافق مع ACID:</Text>
                  <View style={styles.securityValue}>
                    {selectedTransaction.acidCompliant ? (
                      <CheckCircle size={16} color={Colors.success} />
                    ) : (
                      <X size={16} color={Colors.danger} />
                    )}
                    <Text style={[
                      styles.detailValue,
                      { color: selectedTransaction.acidCompliant ? Colors.success : Colors.danger }
                    ]}>
                      {selectedTransaction.acidCompliant ? 'متوافق' : 'غير متوافق'}
                    </Text>
                  </View>
                </View>

                {selectedTransaction.sequenceNumber && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>رقم التسلسل:</Text>
                    <Text style={styles.detailValue}>{selectedTransaction.sequenceNumber}</Text>
                  </View>
                )}

                {selectedTransaction.blockHeight && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>ارتفاع الكتلة:</Text>
                    <Text style={styles.detailValue}>{selectedTransaction.blockHeight}</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => setTransactionDetailVisible(false)}
            >
              <Text style={styles.confirmButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary,
  },
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    margin: 16,
    padding: 24,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  balanceLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  securityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  totalBalance: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  securityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  securityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  securityText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  currencyScroll: {
    marginBottom: 20,
  },
  currencyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  currencyAmount: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  currencyCode: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 0.3,
  },
  sendButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  receiveButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  addButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  servicesContainer: {
    backgroundColor: Colors.background,
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginTop: 16,
    marginBottom: 12,
  },
  servicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceItem: {
    alignItems: 'center',
    flex: 1,
  },
  serviceText: {
    fontSize: 12,
    color: Colors.dark,
    marginTop: 8,
    fontWeight: '500',
  },
  transactionsContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: Colors.dark,
    backgroundColor: Colors.background,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  currencySelector: {
    flexDirection: 'row',
  },
  currencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    marginRight: 8,
  },
  selectedCurrencyOption: {
    backgroundColor: Colors.primary,
  },
  currencyOptionText: {
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '500',
  },
  selectedCurrencyOptionText: {
    color: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 0.48,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.secondary,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  cancelButtonText: {
    color: Colors.dark,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  transactionDetails: {
    marginBottom: 20,
    maxHeight: 400,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.medium,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  hashText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  securityDetails: {
    marginBottom: 20,
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  securityLabel: {
    fontSize: 14,
    color: Colors.medium,
    fontWeight: '500',
    flex: 1,
  },
  securityValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  securityValueText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ledgerIntegritySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});