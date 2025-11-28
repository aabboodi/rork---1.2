import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Wallet, Send, Download, Clock, TrendingUp, Shield, Eye, EyeOff, Plus, ArrowUpRight, ArrowDownLeft, Zap, Lock, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { formatTime } from '@/utils/dateUtils';

const { width } = Dimensions.get('window');

export default function WalletDashboard() {
  const router = useRouter();
  const { language } = useAuthStore();
  const { balances, transactions, getTotalBalance } = useWalletStore();
  const t = translations[language];

  const [showBalance, setShowBalance] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('SAR');

  const totalBalance = getTotalBalance();
  const recentTransactions = transactions.slice(0, 10);

  const handleSendMoney = () => {
    router.push('/wallet/send');
  };

  const handleReceiveMoney = () => {
    router.push('/wallet/receive');
  };

  const handleTransactionHistory = () => {
    Alert.alert('سجل المعاملات', 'عرض جميع المعاملات');
  };

  const handleSecuritySettings = () => {
    Alert.alert('إعدادات الأمان', 'إدارة إعدادات أمان المحفظة');
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'send':
        return <ArrowUpRight size={20} color={Colors.error} />;
      case 'receive':
        return <ArrowDownLeft size={20} color={Colors.success} />;
      default:
        return <Zap size={20} color={Colors.primary} />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'send':
        return Colors.error;
      case 'receive':
        return Colors.success;
      default:
        return Colors.primary;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Glassmorphism Balance Card */}
      <View style={styles.balanceCardContainer}>
        <LinearGradient
          colors={[Colors.primary, Colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceGradient}
        >
          <BlurView intensity={20} tint="dark" style={styles.balanceBlur}>
            <View style={styles.balanceHeader}>
              <View style={styles.balanceTitle}>
                <Wallet size={24} color="white" />
                <Text style={styles.balanceTitleText}>إجمالي الرصيد</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
                {showBalance ? (
                  <Eye size={20} color="white" />
                ) : (
                  <EyeOff size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.balanceAmount}>
              {showBalance ? (
                <>
                  <Text style={styles.balanceValue}>{totalBalance.toFixed(2)}</Text>
                  <Text style={styles.balanceCurrency}>ريال سعودي</Text>
                </>
              ) : (
                <Text style={styles.balanceHidden}>••••••</Text>
              )}
            </View>

            <View style={styles.balanceFooter}>
              <View style={styles.securityBadge}>
                <Lock size={14} color="white" />
                <Text style={styles.securityText}>محمي بـ AES-256</Text>
              </View>
              <View style={styles.verificationBadge}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.verificationText}>موثق</Text>
              </View>
            </View>
          </BlurView>
        </LinearGradient>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSendMoney}>
          <View style={[styles.actionIcon, { backgroundColor: Colors.primary + '20' }]}>
            <Send size={24} color={Colors.primary} />
          </View>
          <Text style={styles.actionText}>إرسال</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleReceiveMoney}>
          <View style={[styles.actionIcon, { backgroundColor: Colors.success + '20' }]}>
            <Download size={24} color={Colors.success} />
          </View>
          <Text style={styles.actionText}>استقبال</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleTransactionHistory}>
          <View style={[styles.actionIcon, { backgroundColor: Colors.accent + '20' }]}>
            <Clock size={24} color={Colors.accent} />
          </View>
          <Text style={styles.actionText}>السجل</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleSecuritySettings}>
          <View style={[styles.actionIcon, { backgroundColor: Colors.warning + '20' }]}>
            <Shield size={24} color={Colors.warning} />
          </View>
          <Text style={styles.actionText}>الأمان</Text>
        </TouchableOpacity>
      </View>

      {/* Currency Balances */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الأرصدة حسب العملة</Text>
        <View style={styles.currencyList}>
          {balances.map((balance) => (
            <TouchableOpacity
              key={balance.currency}
              style={[
                styles.currencyCard,
                selectedCurrency === balance.currency && styles.selectedCurrencyCard,
              ]}
              onPress={() => setSelectedCurrency(balance.currency)}
            >
              <View style={styles.currencyHeader}>
                <Text style={styles.currencyCode}>{balance.currency}</Text>
                <TrendingUp size={16} color={Colors.success} />
              </View>
              <Text style={styles.currencyAmount}>
                {showBalance ? balance.amount.toFixed(2) : '••••'}
              </Text>
              <Text style={styles.currencyLabel}>متاح</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>المعاملات الأخيرة</Text>
          <TouchableOpacity onPress={handleTransactionHistory}>
            <Text style={styles.seeAllText}>عرض الكل</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsList}>
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  {getTransactionIcon(transaction.type)}
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>
                    {transaction.type === 'send' ? 'إرسال إلى' : 'استقبال من'}{' '}
                    {transaction.receiverId || transaction.senderId}
                  </Text>
                  <Text style={styles.transactionTime}>
                    {formatTime(transaction.timestamp)}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text
                    style={[
                      styles.transactionValue,
                      { color: getTransactionColor(transaction.type) },
                    ]}
                  >
                    {transaction.type === 'send' ? '-' : '+'}
                    {transaction.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.transactionCurrency}>{transaction.currency}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Wallet size={48} color={Colors.medium} />
              <Text style={styles.emptyText}>لا توجد معاملات بعد</Text>
              <Text style={styles.emptySubtext}>ابدأ بإرسال أو استقبال الأموال</Text>
            </View>
          )}
        </View>
      </View>

      {/* Security Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ميزات الأمان</Text>
        <View style={styles.securityFeatures}>
          <View style={styles.securityFeature}>
            <Lock size={20} color={Colors.primary} />
            <View style={styles.securityFeatureInfo}>
              <Text style={styles.securityFeatureTitle}>تشفير AES-256-GCM</Text>
              <Text style={styles.securityFeatureDesc}>حماية عسكرية للبيانات</Text>
            </View>
            <CheckCircle size={20} color={Colors.success} />
          </View>

          <View style={styles.securityFeature}>
            <Shield size={20} color={Colors.primary} />
            <View style={styles.securityFeatureInfo}>
              <Text style={styles.securityFeatureTitle}>سجل غير قابل للتغيير</Text>
              <Text style={styles.securityFeatureDesc}>Blockchain-like ledger</Text>
            </View>
            <CheckCircle size={20} color={Colors.success} />
          </View>

          <View style={styles.securityFeature}>
            <Zap size={20} color={Colors.primary} />
            <View style={styles.securityFeatureInfo}>
              <Text style={styles.securityFeatureTitle}>توقيع بيومتري</Text>
              <Text style={styles.securityFeatureDesc}>بصمة أو وجه للمعاملات</Text>
            </View>
            <CheckCircle size={20} color={Colors.success} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  balanceCardContainer: {
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  balanceGradient: {
    padding: 2,
  },
  balanceBlur: {
    padding: 24,
    borderRadius: 22,
    overflow: 'hidden',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceTitleText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
  balanceAmount: {
    marginBottom: 20,
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  balanceCurrency: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  balanceHidden: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  securityText: {
    fontSize: 12,
    color: 'white',
    marginLeft: 6,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verificationText: {
    fontSize: 12,
    color: 'white',
    marginLeft: 6,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  currencyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  currencyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    margin: 6,
    width: (width - 64) / 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCurrencyCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  currencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  currencyAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 4,
  },
  currencyLabel: {
    fontSize: 12,
    color: Colors.medium,
  },
  transactionsList: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 12,
    color: Colors.medium,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  transactionCurrency: {
    fontSize: 12,
    color: Colors.medium,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.medium,
    marginTop: 8,
  },
  securityFeatures: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  securityFeatureInfo: {
    flex: 1,
    marginLeft: 12,
  },
  securityFeatureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  securityFeatureDesc: {
    fontSize: 12,
    color: Colors.medium,
  },
});