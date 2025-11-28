import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, TextInput } from 'react-native';
import { Wallet, Shield, Fingerprint, Lock, Key, Users, AlertTriangle, Clock, DollarSign } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function WalletSettingsScreen() {
    // Security Settings
    const [biometricEnabled, setBiometricEnabled] = useState(true);
    const [requireBiometricForAll, setRequireBiometricForAll] = useState(false);
    const [autoLockEnabled, setAutoLockEnabled] = useState(true);
    const [autoLockMinutes, setAutoLockMinutes] = useState(5);

    // Multi-Sig Settings
    const [multiSigEnabled, setMultiSigEnabled] = useState(false);
    const [requiredSignatures, setRequiredSignatures] = useState(2);
    const [totalSigners, setTotalSigners] = useState(3);

    // Transaction Settings
    const [confirmAllTransactions, setConfirmAllTransactions] = useState(true);
    const [dailyLimit, setDailyLimit] = useState('10000');
    const [perTransactionLimit, setPerTransactionLimit] = useState('5000');
    const [requireLargeConfirm, setRequireLargeConfirm] = useState(true);
    const [largeAmountThreshold, setLargeAmountThreshold] = useState('1000');

    // Privacy Settings
    const [hideBalance, setHideBalance] = useState(false);
    const [hideTransactionHistory, setHideTransactionHistory] = useState(false);
    const [allowScreenshots, setAllowScreenshots] = useState(false);

    // Notification Settings
    const [notifyIncoming, setNotifyIncoming] = useState(true);
    const [notifyOutgoing, setNotifyOutgoing] = useState(true);
    const [notifyLargeTransactions, setNotifyLargeTransactions] = useState(true);

    const handleExportKeys = () => {
        Alert.alert(
            'تصدير المفاتيح',
            'هذا الإجراء حساس جداً. تأكد من حفظ المفاتيح في مكان آمن.',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'تصدير',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert('نجاح', 'تم تصدير المفاتيح بنجاح');
                    },
                },
            ]
        );
    };

    const handleBackupWallet = () => {
        Alert.alert(
            'نسخ احتياطي للمحفظة',
            'قم بإنشاء نسخة احتياطية مشفرة من محفظتك',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'نسخ احتياطي',
                    onPress: () => {
                        Alert.alert('نجاح', 'تم إنشاء النسخة الاحتياطية بنجاح');
                    },
                },
            ]
        );
    };

    const renderSettingItem = (
        icon: React.ReactNode,
        title: string,
        description: string,
        value: boolean,
        onValueChange: (value: boolean) => void,
        color = Colors.primary
    ) => (
        <View style={styles.settingItem}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                {icon}
            </View>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                <Text style={styles.settingDescription}>{description}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: Colors.border, true: color + '50' }}
                thumbColor={value ? color : Colors.medium}
            />
        </View>
    );

    const renderInputItem = (
        icon: React.ReactNode,
        title: string,
        description: string,
        value: string,
        onValueChange: (value: string) => void,
        color = Colors.primary,
        keyboardType: 'default' | 'numeric' = 'numeric',
        suffix?: string
    ) => (
        <View style={styles.inputItem}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                {icon}
            </View>
            <View style={styles.inputContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                <Text style={styles.settingDescription}>{description}</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onValueChange}
                        keyboardType={keyboardType}
                        placeholder="0"
                        placeholderTextColor={Colors.medium}
                    />
                    {suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
                </View>
            </View>
        </View>
    );

    const renderSection = (title: string, children: React.ReactNode) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <Wallet size={32} color={Colors.primary} />
                <Text style={styles.headerTitle}>إعدادات المحفظة</Text>
                <Text style={styles.headerSubtitle}>إدارة الأمان والمعاملات المالية</Text>
            </View>

            {/* Biometric Security */}
            {renderSection(
                'الأمان البيومتري',
        <>
                    {renderSettingItem(
                        <Fingerprint size={20} color={Colors.primary} />,
                        'المصادقة البيومترية',
                        'استخدام بصمة الإصبع أو الوجه',
                        biometricEnabled,
                        setBiometricEnabled
                    )}
                    {renderSettingItem(
                        <Lock size={20} color={Colors.primary} />,
                        'طلب المصادقة لجميع العمليات',
                        'تطلب التحقق البيومتري لكل معاملة',
                        requireBiometricForAll,
                        setRequireBiometricForAll
                    )}
                    {renderSettingItem(
                        <Clock size={20} color={Colors.primary} />,
                        'القفل التلقائي',
                        `قفل المحفظة بعد ${autoLockMinutes} دقائق',
            autoLockEnabled,
            setAutoLockEnabled
          )}
        </>
      )}

      {/* Multi-Signature */}
      {renderSection(
        'التوقيع المتعدد (Multi-Sig)',
        <>
          {renderSettingItem(
            <Users size={20} color={Colors.accent} />,
            'تفعيل التوقيع المتعدد',
            'يتطلب عدة توقيعات للمعاملات الكبيرة',
            multiSigEnabled,
            setMultiSigEnabled,
            Colors.accent
          )}
          {multiSigEnabled && (
            <View style={styles.multiSigConfig}>
              <Text style={styles.multiSigText}>
                المطلوب: {requiredSignatures} من {totalSigners} توقيعات
              </Text>
              <TouchableOpacity
                style={styles.configButton}
                onPress={() => Alert.alert('قريباً', 'إدارة الموقعين')}
              >
                <Text style={styles.configButtonText}>إدارة الموقعين</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Transaction Limits */}
      {renderSection(
        'حدود المعاملات',
        <>
          {renderSettingItem(
            <Shield size={20} color={Colors.warning} />,
            'تأكيد جميع المعاملات',
            'طلب تأكيد قبل كل معاملة',
            confirmAllTransactions,
            setConfirmAllTransactions,
            Colors.warning
          )}
          {renderInputItem(
            <DollarSign size={20} color={Colors.warning} />,
            'الحد اليومي',
            'الحد الأقصى للمعاملات اليومية',
            dailyLimit,
            setDailyLimit,
            Colors.warning,
            'numeric',
            'ريال'
          )}
          {renderInputItem(
            <DollarSign size={20} color={Colors.warning} />,
            'حد المعاملة الواحدة',
            'الحد الأقصى لكل معاملة',
            perTransactionLimit,
            setPerTransactionLimit,
            Colors.warning,
            'numeric',
            'ريال'
          )}
          {renderSettingItem(
            <AlertTriangle size={20} color={Colors.error} />,
            'تأكيد المبالغ الكبيرة',
            `طلب تأكيد إضافي للمبالغ > ${ largeAmountThreshold } ريال`,
            requireLargeConfirm,
            setRequireLargeConfirm,
            Colors.error
          )}
        </>
      )}

      {/* Privacy Settings */}
      {renderSection(
        'الخصوصية',
        <>
          {renderSettingItem(
            <Lock size={20} color={Colors.success} />,
            'إخفاء الرصيد',
            'إخفاء الرصيد افتراضياً في لوحة التحكم',
            hideBalance,
            setHideBalance,
            Colors.success
          )}
          {renderSettingItem(
            <Lock size={20} color={Colors.success} />,
            'إخفاء سجل المعاملات',
            'تمويه سجل المعاملات في القائمة الرئيسية',
            hideTransactionHistory,
            setHideTransactionHistory,
            Colors.success
          )}
          {renderSettingItem(
            <Shield size={20} color={Colors.error} />,
            'السماح بلقطات الشاشة',
            'تحذير: قد يعرض معلوماتك المالية للخطر',
            allowScreenshots,
            setAllowScreenshots,
            Colors.error
          )}
        </>
      )}

      {/* Notifications */}
      {renderSection(
        'الإشعارات',
        <>
          {renderSettingItem(
            <DollarSign size={20} color={Colors.primary} />,
            'المعاملات الواردة',
            'إشعار عند استلام الأموال',
            notifyIncoming,
            setNotifyIncoming
          )}
          {renderSettingItem(
            <DollarSign size={20} color={Colors.primary} />,
            'المعاملات الصادرة',
            'إشعار عند إرسال الأموال',
            notifyOutgoing,
            setNotifyOutgoing
          )}
          {renderSettingItem(
            <AlertTriangle size={20} color={Colors.warning} />,
            'المعاملات الكبيرة',
            'إشعار خاص للمبالغ الكبيرة',
            notifyLargeTransactions,
            setNotifyLargeTransactions,
            Colors.warning
          )}
        </>
      )}

      {/* Advanced Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>إجراءات متقدمة</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleExportKeys}>
          <Key size={20} color={Colors.accent} />
          <Text style={styles.actionButtonText}>تصدير المفاتيح</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleBackupWallet}>
          <Shield size={20} color={Colors.success} />
          <Text style={styles.actionButtonText}>نسخ احتياطي للمحفظة</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.medium,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.medium,
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  inputItem: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  inputContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.medium,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: Colors.dark,
  },
  inputSuffix: {
    fontSize: 14,
    color: Colors.medium,
    marginLeft: 8,
  },
  multiSigConfig: {
    backgroundColor: Colors.accent + '10',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  multiSigText: {
    fontSize: 14,
    color: Colors.dark,
    marginBottom: 12,
  },
  configButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  configButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginLeft: 12,
  },
  footer: {
    height: 40,
  },
});
