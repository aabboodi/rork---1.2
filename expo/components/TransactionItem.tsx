import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Platform } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Shield, AlertTriangle, CheckCircle, Lock, Verified, Eye, EyeOff } from 'lucide-react-native';
import { Transaction, ImmutableTransaction } from '@/types';
import Colors from '@/constants/colors';
import { formatTime } from '@/utils/dateUtils';
import CryptoService from '@/services/security/CryptoService';
import { MicroInteractions } from '@/utils/microInteractions';

interface TransactionItemProps {
  transaction: Transaction | ImmutableTransaction;
  userId: string;
  onPress?: () => void;
  showSecurityDetails?: boolean;
}

export default function TransactionItem({ transaction, userId, onPress, showSecurityDetails = true }: TransactionItemProps) {
  const [showFullHash, setShowFullHash] = useState(false);
  const [verifyingIntegrity, setVerifyingIntegrity] = useState(false);
  const cryptoService = CryptoService.getInstance();
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState(false);
  
  const isSender = transaction.senderId === userId;
  const isImmutableTransaction = 'previousHash' in transaction;
  const immutableTx = transaction as ImmutableTransaction;
  
  useEffect(() => {
    // Entrance animation
    MicroInteractions.createEntranceAnimation(scaleAnim, opacityAnim, Math.random() * 100).start();
    
    // Slide in from right for sent, left for received
    const slideFrom = isSender ? 50 : -50;
    MicroInteractions.createSlideAnimation(slideAnim, slideFrom, 0, 300).start();
    
    // Pulse animation for pending transactions
    if (transaction.status === 'pending') {
      MicroInteractions.createPulseAnimation(pulseAnim, 0.95, 1.05).start();
    }
    
    // Rotation animation for verification
    if (verifyingIntegrity) {
      MicroInteractions.createRotationAnimation(rotateAnim).start();
    }
  }, [verifyingIntegrity, transaction.status]);
  
  const getTransactionColor = () => {
    if (transaction.type === 'receive') {
      return Colors.success;
    } else if (transaction.type === 'donate') {
      return Colors.accent;
    } else {
      return Colors.error;
    }
  };
  
  const getTransactionIcon = () => {
    if (isSender) {
      return <ArrowUpRight size={24} color={Colors.error} />;
    } else {
      return <ArrowDownLeft size={24} color={Colors.success} />;
    }
  };
  
  const getTransactionTitle = () => {
    if (transaction.type === 'donate') {
      return 'تبرع';
    } else if (transaction.type === 'loan_disbursement') {
      return 'صرف قرض';
    } else if (transaction.type === 'loan_payment') {
      return 'دفعة قرض';
    } else if (transaction.type === 'bill_payment') {
      return 'دفع فاتورة';
    } else if (transaction.type === 'topup') {
      return 'إضافة أموال';
    } else if (isSender) {
      return 'مرسل';
    } else {
      return 'مستلم';
    }
  };
  
  const getAmountPrefix = () => {
    if (isSender) {
      return '-';
    } else {
      return '+';
    }
  };

  const getSecurityIcon = () => {
    if (transaction.integrityVerified === false) {
      return <AlertTriangle size={16} color={Colors.error} />;
    } else if (isImmutableTransaction && immutableTx.signature) {
      return <Verified size={16} color={Colors.success} />;
    } else if (transaction.encrypted && transaction.hash) {
      return <Shield size={16} color={Colors.success} />;
    } else if (transaction.pciDSSCompliant) {
      return <CheckCircle size={16} color={Colors.primary} />;
    }
    return null;
  };

  const handlePressIn = () => {
    setIsPressed(true);
    MicroInteractions.triggerHapticFeedback('light');
    
    Animated.parallel([
      MicroInteractions.createScaleAnimation(scaleAnim, 0.98),
      MicroInteractions.createOpacityAnimation(opacityAnim, 0.8, 100)
    ]).start();
  };
  
  const handlePressOut = () => {
    setIsPressed(false);
    
    Animated.parallel([
      MicroInteractions.createScaleAnimation(scaleAnim, 1),
      MicroInteractions.createOpacityAnimation(opacityAnim, 1, 150)
    ]).start();
  };
  
  const handlePress = () => {
    MicroInteractions.triggerHapticFeedback('medium');
    MicroInteractions.createBounceAnimation(scaleAnim).start();
    onPress?.();
  };
  
  const handleVerifyIntegrity = async () => {
    if (!isImmutableTransaction) {
      MicroInteractions.createShakeAnimation(slideAnim).start();
      MicroInteractions.triggerHapticFeedback('heavy');
      Alert.alert('معلومات', 'هذه معاملة تقليدية وليست من السجل غير القابل للتغيير');
      return;
    }

    setVerifyingIntegrity(true);
    MicroInteractions.triggerHapticFeedback('medium');
    
    // Start rotation animation
    MicroInteractions.createRotationAnimation(rotateAnim).start();
    try {
      const verifications = await Promise.all([
        cryptoService.verifyTransactionSignature(immutableTx, immutableTx.signature!),
        cryptoService.verifyMerkleRoot(immutableTx),
        cryptoService.verifyTransactionIntegrity(immutableTx),
        cryptoService.verifyChainConsistency(immutableTx)
      ]);

      const [signatureValid, merkleValid, integrityValid, chainValid] = verifications;
      
      const results = [
        `التوقيع الرقمي: ${signatureValid ? '✅ صحيح' : '❌ غير صحيح'}`,
        `Merkle Root: ${merkleValid ? '✅ صحيح' : '❌ غير صحيح'}`,
        `سلامة البيانات: ${integrityValid ? '✅ سليمة' : '❌ تالفة'}`,
        `اتساق السلسلة: ${chainValid ? '✅ متسق' : '❌ غير متسق'}`
      ];

      const allValid = verifications.every(v => v);
      
      // Success or error animation
      if (allValid) {
        MicroInteractions.createBounceAnimation(scaleAnim).start();
        MicroInteractions.triggerHapticFeedback('medium');
      } else {
        MicroInteractions.createShakeAnimation(slideAnim).start();
        MicroInteractions.triggerHapticFeedback('heavy');
      }
      
      Alert.alert(
        allValid ? 'تم التحقق بنجاح' : 'فشل التحقق',
        `نتائج التحقق من سلامة المعاملة:\n\n${results.join('\n')}\n\nHash: ${immutableTx.previousHash?.substring(0, 16)}...`,
        [{ text: 'موافق' }]
      );
    } catch (error) {
      console.error('Integrity verification failed:', error);
      MicroInteractions.createShakeAnimation(slideAnim).start();
      MicroInteractions.triggerHapticFeedback('heavy');
      Alert.alert('خطأ', 'فشل في التحقق من سلامة المعاملة');
    }
    
    setVerifyingIntegrity(false);
    rotateAnim.stopAnimation();
    rotateAnim.setValue(0);
  };

  const getFraudRiskColor = () => {
    switch (transaction.fraudRiskLevel) {
      case 'low': return Colors.success;
      case 'medium': return Colors.warning;
      case 'high': return Colors.error;
      case 'critical': return '#8B0000';
      default: return Colors.medium;
    }
  };

  const getFraudRiskText = () => {
    switch (transaction.fraudRiskLevel) {
      case 'low': return 'منخفض';
      case 'medium': return 'متوسط';
      case 'high': return 'عالي';
      case 'critical': return 'حرج';
      default: return '';
    }
  };

  const getACIDStateColor = (state: string) => {
    switch (state) {
      case 'committed': return Colors.success;
      case 'pending': return Colors.warning;
      case 'failed': return Colors.error;
      case 'signing': return Colors.accent;
      default: return Colors.medium;
    }
  };

  const getACIDStateText = (state: string) => {
    switch (state) {
      case 'committed': return 'مكتملة';
      case 'pending': return 'معلقة';
      case 'failed': return 'فشلت';
      case 'signing': return 'توقيع';
      default: return state;
    }
  };
  
  return (
    <Animated.View
      style={[
        {
          transform: [
            { scale: Animated.multiply(scaleAnim, pulseAnim) },
            { translateX: slideAnim }
          ],
          opacity: opacityAnim
        }
      ]}
    >
      <TouchableOpacity 
        style={[
          styles.container,
          isPressed && styles.pressedContainer,
          transaction.status === 'pending' && styles.pendingContainer,
          !transaction.integrityVerified && transaction.integrityVerified !== undefined && styles.unverifiedContainer
        ]} 
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
      <View style={[styles.iconContainer, { backgroundColor: getTransactionColor() + '20' }]}>
        {getTransactionIcon()}
      </View>
      
      <View style={styles.detailsContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{getTransactionTitle()}</Text>
          <View style={styles.securityIndicators}>
            {getSecurityIcon()}
            {transaction.fraudRiskLevel && (
              <View style={[styles.riskBadge, { backgroundColor: getFraudRiskColor() + '20' }]}>
                <Text style={[styles.riskText, { color: getFraudRiskColor() }]}>
                  {getFraudRiskText()}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <Text style={styles.note} numberOfLines={1}>{transaction.note}</Text>
        
        <View style={styles.metadataRow}>
          <Text style={styles.date}>{formatTime(transaction.timestamp)}</Text>
          {(transaction.hash || (isImmutableTransaction && immutableTx.previousHash)) && (
            <TouchableOpacity onPress={() => setShowFullHash(!showFullHash)}>
              <Text style={styles.hashIndicator}>
                Hash: {showFullHash 
                  ? (transaction.hash || immutableTx.previousHash)
                  : `${(transaction.hash || immutableTx.previousHash)?.substring(0, 8)}...`
                }
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Immutable Ledger Information */}
        {isImmutableTransaction && showSecurityDetails && (
          <View style={styles.immutableInfo}>
            <View style={styles.immutableHeader}>
              <Lock size={12} color={Colors.primary} />
              <Text style={styles.immutableTitle}>السجل غير القابل للتغيير</Text>
            </View>
            
            <View style={styles.immutableDetails}>
              <Text style={styles.immutableText}>
                Block: {immutableTx.blockHeight} | Difficulty: {immutableTx.difficulty}
              </Text>
              {immutableTx.merkleRoot && (
                <Text style={styles.immutableText}>
                  Merkle: {immutableTx.merkleRoot.substring(0, 12)}...
                </Text>
              )}
              {immutableTx.acidState && (
                <Text style={[styles.immutableText, { color: getACIDStateColor(immutableTx.acidState) }]}>
                  ACID: {getACIDStateText(immutableTx.acidState)}
                </Text>
              )}
            </View>

            <TouchableOpacity 
              style={[
                styles.verifyButton,
                verifyingIntegrity && styles.verifyingButton
              ]}
              onPress={handleVerifyIntegrity}
              disabled={verifyingIntegrity}
            >
              <Animated.View
                style={{
                  transform: [{
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })
                  }]
                }}
              >
                <Verified size={12} color="white" />
              </Animated.View>
              <Text style={styles.verifyButtonText}>
                {verifyingIntegrity ? 'جاري التحقق...' : 'التحقق من السلامة'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {transaction.isLoanPayment && (
          <View style={styles.loanPaymentInfo}>
            <Text style={styles.loanPaymentText}>
              دفعة {transaction.paymentNumber}/{transaction.totalPayments}
            </Text>
          </View>
        )}

        {transaction.fraudFlags && transaction.fraudFlags.length > 0 && (
          <View style={styles.fraudFlagsContainer}>
            <Text style={styles.fraudFlagsLabel}>تحذيرات:</Text>
            <Text style={styles.fraudFlags} numberOfLines={1}>
              {transaction.fraudFlags.join(', ')}
            </Text>
          </View>
        )}

        {/* Enhanced Digital Signature Information */}
        {(transaction.signature || (isImmutableTransaction && immutableTx.signature)) && (
          <View style={styles.signatureContainer}>
            <Shield size={12} color={Colors.primary} />
            <Text style={styles.signatureText}>
              موقعة رقمياً - {isImmutableTransaction ? 'ECDSA-SHA256' : (transaction.signature?.algorithm || 'Unknown')}
            </Text>
            {isImmutableTransaction && immutableTx.encryptionStandard && (
              <Text style={styles.encryptionText}>
                🔒 {immutableTx.encryptionStandard} | {immutableTx.keyDerivation}
              </Text>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.amountContainer}>
        <Text style={[
          styles.amount, 
          { color: isSender ? Colors.error : Colors.success }
        ]}>
          {getAmountPrefix()} {transaction.amount} {transaction.currency}
        </Text>
        
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot,
            { backgroundColor: transaction.status === 'completed' ? Colors.success : Colors.warning }
          ]} />
          <Text style={styles.statusText}>
            {transaction.status === 'completed' ? 'مكتملة' : 'معلقة'}
          </Text>
        </View>

        <View style={styles.complianceContainer}>
          {transaction.pciDSSCompliant && (
            <Text style={styles.complianceText}>PCI DSS</Text>
          )}
          {isImmutableTransaction && (
            <Text style={styles.immutableBadge}>غير قابل للتغيير</Text>
          )}
          {transaction.integrityVerified && (
            <Text style={styles.verifiedBadge}>تم التحقق</Text>
          )}
        </View>
      </View>
      </TouchableOpacity>
      
      {/* Status indicator animations */}
      {transaction.status === 'completed' && (
        <Animated.View
          style={[
            styles.statusIndicator,
            styles.completedIndicator,
            {
              opacity: opacityAnim.interpolate({
                inputRange: [0.8, 1],
                outputRange: [0, 1],
              })
            }
          ]}
        />
      )}
      
      {transaction.fraudRiskLevel === 'high' && (
        <Animated.View
          style={[
            styles.statusIndicator,
            styles.riskIndicator,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [0.95, 1.05],
                outputRange: [0.6, 1],
              })
            }
          ]}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  pressedContainer: {
    backgroundColor: Colors.secondary,
    elevation: 0,
  },
  pendingContainer: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
    backgroundColor: Colors.warning + '10',
  },
  unverifiedContainer: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
    backgroundColor: Colors.error + '10',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailsContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  securityIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riskBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  riskText: {
    fontSize: 10,
    fontWeight: '600',
  },
  note: {
    fontSize: 14,
    color: Colors.medium,
    marginBottom: 4,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: Colors.medium,
  },
  hashIndicator: {
    fontSize: 10,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  loanPaymentInfo: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  loanPaymentText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  fraudFlagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  fraudFlagsLabel: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: '600',
    marginRight: 4,
  },
  fraudFlags: {
    fontSize: 11,
    color: Colors.error,
    flex: 1,
  },
  signatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  signatureText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
  amountContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    color: Colors.medium,
  },
  complianceContainer: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  complianceText: {
    fontSize: 9,
    color: Colors.primary,
    fontWeight: '600',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  immutableBadge: {
    fontSize: 9,
    color: Colors.success,
    fontWeight: '600',
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedBadge: {
    fontSize: 9,
    color: Colors.accent,
    fontWeight: '600',
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  immutableInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: Colors.primary + '10',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  immutableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  immutableTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  immutableDetails: {
    marginBottom: 6,
  },
  immutableText: {
    fontSize: 10,
    color: Colors.dark,
    fontFamily: 'monospace',
    lineHeight: 12,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  verifyingButton: {
    backgroundColor: Colors.warning,
  },
  verifyButtonText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  encryptionText: {
    fontSize: 10,
    color: Colors.success,
    marginTop: 2,
  },
  statusIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 4,
    height: '100%',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  completedIndicator: {
    backgroundColor: Colors.success,
  },
  riskIndicator: {
    backgroundColor: Colors.error,
  },
});