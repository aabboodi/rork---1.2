import { Transaction } from '@/types';
import { mockUsers } from './users';

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    senderId: '0',
    receiverId: '1',
    amount: 100,
    currency: 'SAR',
    timestamp: Date.now() - 86400000,
    status: 'completed',
    type: 'send',
    note: 'دفعة مشروع التطوير',
    encrypted: true,
    hash: 'a1b2c3d4e5f6789012345678901234567890abcd',
    signature: {
      transactionId: 'tx_1',
      signature: 'sig_a1b2c3d4e5f6789012345678901234567890abcd',
      publicKey: 'pub_1234567890abcdef',
      timestamp: Date.now() - 86400000,
      algorithm: 'HMAC-SHA256'
    },
    immutableHash: 'immutable_a1b2c3d4e5f6789012345678901234567890abcd',
    previousTransactionHash: '0000000000000000000000000000000000000000', // Genesis transaction
    merkleProof: [
      'merkle_proof_1_a1b2c3d4e5f6789012345678901234567890abcd',
      'merkle_proof_2_a1b2c3d4e5f6789012345678901234567890abcd'
    ],
    sequenceNumber: 1,
    blockHeight: 1,
    fraudRiskLevel: 'low',
    fraudFlags: [],
    integrityVerified: true,
    pciDSSCompliant: true,
    acidCompliant: true,
    auditTrail: {
      createdAt: Date.now() - 86400000,
      createdBy: '0',
      validatedAt: Date.now() - 86400000,
      validatedBy: 'system',
      approvedAt: Date.now() - 86400000,
      approvedBy: 'system',
      finalizedAt: Date.now() - 86400000,
      checksumVerified: true,
      integrityScore: 100
    },
    securityMetadata: {
      deviceFingerprint: 'device_fp_1234567890abcdef',
      ipAddress: '192.168.1.100',
      userAgent: 'MadaClone/2.0.0 (iOS 17.0)',
      geolocation: { latitude: 24.7136, longitude: 46.6753 }, // Riyadh
      biometricVerified: true,
      mfaVerified: false,
      riskScore: 5,
      anomalyFlags: []
    }
  },
  {
    id: '2',
    senderId: '2',
    receiverId: '0',
    amount: 250,
    currency: 'AED',
    timestamp: Date.now() - 172800000,
    status: 'completed',
    type: 'receive',
    note: 'تصميم الشعار',
    encrypted: true,
    hash: 'b2c3d4e5f6789012345678901234567890abcdef',
    signature: {
      transactionId: 'tx_2',
      signature: 'sig_b2c3d4e5f6789012345678901234567890abcdef',
      publicKey: 'pub_2345678901bcdefg',
      timestamp: Date.now() - 172800000,
      algorithm: 'HMAC-SHA256'
    },
    immutableHash: 'immutable_b2c3d4e5f6789012345678901234567890abcdef',
    previousTransactionHash: 'a1b2c3d4e5f6789012345678901234567890abcd',
    merkleProof: [
      'merkle_proof_1_b2c3d4e5f6789012345678901234567890abcdef',
      'merkle_proof_2_b2c3d4e5f6789012345678901234567890abcdef'
    ],
    sequenceNumber: 2,
    blockHeight: 2,
    fraudRiskLevel: 'low',
    fraudFlags: [],
    integrityVerified: true,
    pciDSSCompliant: true,
    acidCompliant: true,
    auditTrail: {
      createdAt: Date.now() - 172800000,
      createdBy: '2',
      validatedAt: Date.now() - 172800000,
      validatedBy: 'system',
      approvedAt: Date.now() - 172800000,
      approvedBy: 'system',
      finalizedAt: Date.now() - 172800000,
      checksumVerified: true,
      integrityScore: 100
    },
    securityMetadata: {
      deviceFingerprint: 'device_fp_2345678901bcdefg',
      ipAddress: '192.168.1.101',
      userAgent: 'MadaClone/2.0.0 (Android 14)',
      geolocation: { latitude: 25.2048, longitude: 55.2708 }, // Dubai
      biometricVerified: true,
      mfaVerified: false,
      riskScore: 3,
      anomalyFlags: []
    }
  },
  {
    id: '3',
    senderId: '0',
    receiverId: '3',
    amount: 500,
    currency: 'SAR',
    timestamp: Date.now() - 259200000,
    status: 'completed',
    type: 'send',
    note: 'استثمار مشترك',
    encrypted: true,
    hash: 'c3d4e5f6789012345678901234567890abcdef01',
    signature: {
      transactionId: 'tx_3',
      signature: 'sig_c3d4e5f6789012345678901234567890abcdef01',
      publicKey: 'pub_3456789012cdefgh',
      timestamp: Date.now() - 259200000,
      algorithm: 'HMAC-SHA256'
    },
    immutableHash: 'immutable_c3d4e5f6789012345678901234567890abcdef01',
    previousTransactionHash: 'b2c3d4e5f6789012345678901234567890abcdef',
    merkleProof: [
      'merkle_proof_1_c3d4e5f6789012345678901234567890abcdef01',
      'merkle_proof_2_c3d4e5f6789012345678901234567890abcdef01'
    ],
    sequenceNumber: 3,
    blockHeight: 3,
    fraudRiskLevel: 'medium',
    fraudFlags: ['large_amount'],
    integrityVerified: true,
    pciDSSCompliant: true,
    acidCompliant: true,
    auditTrail: {
      createdAt: Date.now() - 259200000,
      createdBy: '0',
      validatedAt: Date.now() - 259200000,
      validatedBy: 'system',
      approvedAt: Date.now() - 259200000,
      approvedBy: 'compliance_officer',
      finalizedAt: Date.now() - 259200000,
      checksumVerified: true,
      integrityScore: 95
    },
    securityMetadata: {
      deviceFingerprint: 'device_fp_1234567890abcdef',
      ipAddress: '192.168.1.100',
      userAgent: 'MadaClone/2.0.0 (iOS 17.0)',
      geolocation: { latitude: 24.7136, longitude: 46.6753 }, // Riyadh
      biometricVerified: true,
      mfaVerified: true,
      riskScore: 25,
      anomalyFlags: ['large_amount_for_user']
    }
  },
  {
    id: '4',
    senderId: '0',
    receiverId: '4',
    amount: 150,
    currency: 'SAR',
    timestamp: Date.now() - 345600000,
    status: 'completed',
    type: 'send',
    note: 'استشارة طبية',
    encrypted: true,
    hash: 'd4e5f6789012345678901234567890abcdef0123',
    signature: {
      transactionId: 'tx_4',
      signature: 'sig_d4e5f6789012345678901234567890abcdef0123',
      publicKey: 'pub_456789013defghi',
      timestamp: Date.now() - 345600000,
      algorithm: 'HMAC-SHA256'
    },
    immutableHash: 'immutable_d4e5f6789012345678901234567890abcdef0123',
    previousTransactionHash: 'c3d4e5f6789012345678901234567890abcdef01',
    merkleProof: [
      'merkle_proof_1_d4e5f6789012345678901234567890abcdef0123',
      'merkle_proof_2_d4e5f6789012345678901234567890abcdef0123'
    ],
    sequenceNumber: 4,
    blockHeight: 4,
    fraudRiskLevel: 'low',
    fraudFlags: [],
    integrityVerified: true,
    pciDSSCompliant: true,
    acidCompliant: true,
    auditTrail: {
      createdAt: Date.now() - 345600000,
      createdBy: '0',
      validatedAt: Date.now() - 345600000,
      validatedBy: 'system',
      approvedAt: Date.now() - 345600000,
      approvedBy: 'system',
      finalizedAt: Date.now() - 345600000,
      checksumVerified: true,
      integrityScore: 100
    },
    securityMetadata: {
      deviceFingerprint: 'device_fp_1234567890abcdef',
      ipAddress: '192.168.1.100',
      userAgent: 'MadaClone/2.0.0 (iOS 17.0)',
      geolocation: { latitude: 24.7136, longitude: 46.6753 }, // Riyadh
      biometricVerified: false,
      mfaVerified: false,
      riskScore: 8,
      anomalyFlags: []
    }
  },
  {
    id: '5',
    senderId: '5',
    receiverId: '0',
    amount: 75,
    currency: 'EGP',
    timestamp: Date.now() - 432000000,
    status: 'completed',
    type: 'receive',
    note: 'مراجعة مقال',
    encrypted: true,
    hash: 'e5f6789012345678901234567890abcdef012345',
    signature: {
      transactionId: 'tx_5',
      signature: 'sig_e5f6789012345678901234567890abcdef012345',
      publicKey: 'pub_56789014efghijk',
      timestamp: Date.now() - 432000000,
      algorithm: 'HMAC-SHA256'
    },
    immutableHash: 'immutable_e5f6789012345678901234567890abcdef012345',
    previousTransactionHash: 'd4e5f6789012345678901234567890abcdef0123',
    merkleProof: [
      'merkle_proof_1_e5f6789012345678901234567890abcdef012345',
      'merkle_proof_2_e5f6789012345678901234567890abcdef012345'
    ],
    sequenceNumber: 5,
    blockHeight: 5,
    fraudRiskLevel: 'low',
    fraudFlags: [],
    integrityVerified: true,
    pciDSSCompliant: true,
    acidCompliant: true,
    auditTrail: {
      createdAt: Date.now() - 432000000,
      createdBy: '5',
      validatedAt: Date.now() - 432000000,
      validatedBy: 'system',
      approvedAt: Date.now() - 432000000,
      approvedBy: 'system',
      finalizedAt: Date.now() - 432000000,
      checksumVerified: true,
      integrityScore: 100
    },
    securityMetadata: {
      deviceFingerprint: 'device_fp_56789014efghijk',
      ipAddress: '192.168.1.105',
      userAgent: 'MadaClone/2.0.0 (Android 14)',
      geolocation: { latitude: 30.0444, longitude: 31.2357 }, // Cairo
      biometricVerified: true,
      mfaVerified: false,
      riskScore: 2,
      anomalyFlags: []
    }
  },
  {
    id: '6',
    senderId: '0',
    receiverId: '6',
    amount: 2500,
    currency: 'USD',
    timestamp: Date.now() - 518400000,
    status: 'completed',
    type: 'send',
    note: 'تحويل دولي',
    encrypted: true,
    hash: 'f6789012345678901234567890abcdef0123456',
    signature: {
      transactionId: 'tx_6',
      signature: 'sig_f6789012345678901234567890abcdef0123456',
      publicKey: 'pub_6789015fghijkl',
      timestamp: Date.now() - 518400000,
      algorithm: 'HMAC-SHA256'
    },
    immutableHash: 'immutable_f6789012345678901234567890abcdef0123456',
    previousTransactionHash: 'e5f6789012345678901234567890abcdef012345',
    merkleProof: [
      'merkle_proof_1_f6789012345678901234567890abcdef0123456',
      'merkle_proof_2_f6789012345678901234567890abcdef0123456'
    ],
    sequenceNumber: 6,
    blockHeight: 6,
    fraudRiskLevel: 'high',
    fraudFlags: ['large_amount', 'international_transfer', 'unusual_currency'],
    integrityVerified: true,
    pciDSSCompliant: true,
    acidCompliant: true,
    auditTrail: {
      createdAt: Date.now() - 518400000,
      createdBy: '0',
      validatedAt: Date.now() - 518400000,
      validatedBy: 'system',
      approvedAt: Date.now() - 518400000,
      approvedBy: 'senior_compliance_officer',
      finalizedAt: Date.now() - 518400000,
      checksumVerified: true,
      integrityScore: 90
    },
    securityMetadata: {
      deviceFingerprint: 'device_fp_1234567890abcdef',
      ipAddress: '192.168.1.100',
      userAgent: 'MadaClone/2.0.0 (iOS 17.0)',
      geolocation: { latitude: 24.7136, longitude: 46.6753 }, // Riyadh
      biometricVerified: true,
      mfaVerified: true,
      riskScore: 65,
      anomalyFlags: ['large_international_transfer', 'unusual_currency_for_user', 'high_value_transaction']
    }
  },
  {
    id: '7',
    senderId: '7',
    receiverId: '0',
    amount: 1000,
    currency: 'IRR',
    timestamp: Date.now() - 604800000,
    status: 'failed',
    type: 'receive',
    note: 'معاملة فاشلة',
    encrypted: false,
    hash: '789012345678901234567890abcdef01234567',
    fraudRiskLevel: 'critical',
    fraudFlags: ['failed_transaction', 'suspicious_pattern', 'high_frequency', 'sanctioned_currency'],
    integrityVerified: false,
    pciDSSCompliant: false,
    acidCompliant: false,
    auditTrail: {
      createdAt: Date.now() - 604800000,
      createdBy: '7',
      validatedAt: Date.now() - 604800000,
      validatedBy: 'system',
      approvedAt: 0, // Not approved
      approvedBy: '',
      finalizedAt: 0, // Not finalized
      checksumVerified: false,
      integrityScore: 0
    },
    securityMetadata: {
      deviceFingerprint: 'device_fp_suspicious_789012345',
      ipAddress: '10.0.0.1', // Suspicious IP
      userAgent: 'Unknown/1.0.0',
      geolocation: { latitude: 0, longitude: 0 }, // Unknown location
      biometricVerified: false,
      mfaVerified: false,
      riskScore: 100,
      anomalyFlags: ['suspicious_device', 'unknown_location', 'failed_biometric', 'high_risk_currency']
    }
  },
  {
    id: '8',
    senderId: '0',
    receiverId: '8',
    amount: 50,
    currency: 'SAR',
    timestamp: Date.now() - 691200000,
    status: 'completed',
    type: 'donate',
    note: 'تبرع خيري',
    encrypted: true,
    hash: '89012345678901234567890abcdef012345678',
    signature: {
      transactionId: 'tx_8',
      signature: 'sig_89012345678901234567890abcdef012345678',
      publicKey: 'pub_89016ghijklm',
      timestamp: Date.now() - 691200000,
      algorithm: 'HMAC-SHA256'
    },
    immutableHash: 'immutable_89012345678901234567890abcdef012345678',
    previousTransactionHash: 'f6789012345678901234567890abcdef0123456',
    merkleProof: [
      'merkle_proof_1_89012345678901234567890abcdef012345678',
      'merkle_proof_2_89012345678901234567890abcdef012345678'
    ],
    sequenceNumber: 7,
    blockHeight: 7,
    fraudRiskLevel: 'low',
    fraudFlags: [],
    integrityVerified: true,
    pciDSSCompliant: true,
    acidCompliant: true,
    auditTrail: {
      createdAt: Date.now() - 691200000,
      createdBy: '0',
      validatedAt: Date.now() - 691200000,
      validatedBy: 'system',
      approvedAt: Date.now() - 691200000,
      approvedBy: 'charity_compliance_officer',
      finalizedAt: Date.now() - 691200000,
      checksumVerified: true,
      integrityScore: 100
    },
    securityMetadata: {
      deviceFingerprint: 'device_fp_1234567890abcdef',
      ipAddress: '192.168.1.100',
      userAgent: 'MadaClone/2.0.0 (iOS 17.0)',
      geolocation: { latitude: 24.7136, longitude: 46.6753 }, // Riyadh
      biometricVerified: true,
      mfaVerified: false,
      riskScore: 1,
      anomalyFlags: []
    }
  },
  {
    id: '9',
    senderId: '0',
    receiverId: '1',
    amount: 1000,
    currency: 'SAR',
    timestamp: Date.now() - 777600000,
    status: 'completed',
    type: 'loan_disbursement',
    note: 'صرف قرض - قرض بمبلغ 1000 SAR لمدة 12 شهر بمعدل فائدة 0%',
    encrypted: true,
    hash: '90123456789012345678901234567890abcdef01',
    signature: {
      transactionId: 'tx_9',
      signature: 'sig_90123456789012345678901234567890abcdef01',
      publicKey: 'pub_90123456789abcdef',
      timestamp: Date.now() - 777600000,
      algorithm: 'HMAC-SHA256'
    },
    immutableHash: 'immutable_90123456789012345678901234567890abcdef01',
    previousTransactionHash: '89012345678901234567890abcdef012345678',
    merkleProof: [
      'merkle_proof_1_90123456789012345678901234567890abcdef01',
      'merkle_proof_2_90123456789012345678901234567890abcdef01'
    ],
    sequenceNumber: 8,
    blockHeight: 8,
    fraudRiskLevel: 'low',
    fraudFlags: [],
    integrityVerified: true,
    pciDSSCompliant: true,
    acidCompliant: true,
    loanId: 'loan_1234567890',
    isLoanPayment: false,
    auditTrail: {
      createdAt: Date.now() - 777600000,
      createdBy: '0',
      validatedAt: Date.now() - 777600000,
      validatedBy: 'system',
      approvedAt: Date.now() - 777600000,
      approvedBy: 'loan_officer',
      finalizedAt: Date.now() - 777600000,
      checksumVerified: true,
      integrityScore: 100
    },
    securityMetadata: {
      deviceFingerprint: 'device_fp_1234567890abcdef',
      ipAddress: '192.168.1.100',
      userAgent: 'MadaClone/2.0.0 (iOS 17.0)',
      geolocation: { latitude: 24.7136, longitude: 46.6753 }, // Riyadh
      biometricVerified: true,
      mfaVerified: true,
      riskScore: 10,
      anomalyFlags: []
    }
  },
  {
    id: '10',
    senderId: '1',
    receiverId: '0',
    amount: 83.33,
    currency: 'SAR',
    timestamp: Date.now() - 691200000,
    status: 'completed',
    type: 'loan_payment',
    note: 'دفعة قرض 1/12',
    encrypted: true,
    hash: '01234567890123456789012345678901234567ab',
    signature: {
      transactionId: 'tx_10',
      signature: 'sig_01234567890123456789012345678901234567ab',
      publicKey: 'pub_01234567890bcdefg',
      timestamp: Date.now() - 691200000,
      algorithm: 'HMAC-SHA256'
    },
    immutableHash: 'immutable_01234567890123456789012345678901234567ab',
    previousTransactionHash: '90123456789012345678901234567890abcdef01',
    merkleProof: [
      'merkle_proof_1_01234567890123456789012345678901234567ab',
      'merkle_proof_2_01234567890123456789012345678901234567ab'
    ],
    sequenceNumber: 9,
    blockHeight: 9,
    fraudRiskLevel: 'low',
    fraudFlags: [],
    integrityVerified: true,
    pciDSSCompliant: true,
    acidCompliant: true,
    loanId: 'loan_1234567890',
    isLoanPayment: true,
    paymentNumber: 1,
    totalPayments: 12,
    auditTrail: {
      createdAt: Date.now() - 691200000,
      createdBy: '1',
      validatedAt: Date.now() - 691200000,
      validatedBy: 'system',
      approvedAt: Date.now() - 691200000,
      approvedBy: 'system',
      finalizedAt: Date.now() - 691200000,
      checksumVerified: true,
      integrityScore: 100
    },
    securityMetadata: {
      deviceFingerprint: 'device_fp_01234567890bcdefg',
      ipAddress: '192.168.1.101',
      userAgent: 'MadaClone/2.0.0 (Android 14)',
      geolocation: { latitude: 24.7136, longitude: 46.6753 }, // Riyadh
      biometricVerified: true,
      mfaVerified: false,
      riskScore: 3,
      anomalyFlags: []
    }
  },
  {
    id: '11',
    senderId: '1',
    receiverId: '0',
    amount: 83.33,
    currency: 'SAR',
    timestamp: Date.now() - 604800000,
    status: 'completed',
    type: 'loan_payment',
    note: 'دفعة قرض 2/12',
    encrypted: true,
    hash: '12345678901234567890123456789012345678bc',
    signature: {
      transactionId: 'tx_11',
      signature: 'sig_12345678901234567890123456789012345678bc',
      publicKey: 'pub_12345678901cdefgh',
      timestamp: Date.now() - 604800000,
      algorithm: 'HMAC-SHA256'
    },
    immutableHash: 'immutable_12345678901234567890123456789012345678bc',
    previousTransactionHash: '01234567890123456789012345678901234567ab',
    merkleProof: [
      'merkle_proof_1_12345678901234567890123456789012345678bc',
      'merkle_proof_2_12345678901234567890123456789012345678bc'
    ],
    sequenceNumber: 10,
    blockHeight: 10,
    fraudRiskLevel: 'low',
    fraudFlags: [],
    integrityVerified: true,
    pciDSSCompliant: true,
    acidCompliant: true,
    loanId: 'loan_1234567890',
    isLoanPayment: true,
    paymentNumber: 2,
    totalPayments: 12,
    auditTrail: {
      createdAt: Date.now() - 604800000,
      createdBy: '1',
      validatedAt: Date.now() - 604800000,
      validatedBy: 'system',
      approvedAt: Date.now() - 604800000,
      approvedBy: 'system',
      finalizedAt: Date.now() - 604800000,
      checksumVerified: true,
      integrityScore: 100
    },
    securityMetadata: {
      deviceFingerprint: 'device_fp_01234567890bcdefg',
      ipAddress: '192.168.1.101',
      userAgent: 'MadaClone/2.0.0 (Android 14)',
      geolocation: { latitude: 24.7136, longitude: 46.6753 }, // Riyadh
      biometricVerified: true,
      mfaVerified: false,
      riskScore: 3,
      anomalyFlags: []
    }
  },
  {
    id: '12',
    senderId: '0',
    receiverId: 'bills_system',
    amount: 150,
    currency: 'SAR',
    timestamp: Date.now() - 518400000,
    status: 'completed',
    type: 'bill_payment',
    note: 'دفع فاتورة electricity',
    encrypted: true,
    hash: '23456789012345678901234567890123456789cd',
    signature: {
      transactionId: 'tx_12',
      signature: 'sig_23456789012345678901234567890123456789cd',
      publicKey: 'pub_23456789012defghi',
      timestamp: Date.now() - 518400000,
      algorithm: 'HMAC-SHA256'
    },
    immutableHash: 'immutable_23456789012345678901234567890123456789cd',
    previousTransactionHash: '12345678901234567890123456789012345678bc',
    merkleProof: [
      'merkle_proof_1_23456789012345678901234567890123456789cd',
      'merkle_proof_2_23456789012345678901234567890123456789cd'
    ],
    sequenceNumber: 11,
    blockHeight: 11,
    fraudRiskLevel: 'low',
    fraudFlags: [],
    integrityVerified: true,
    pciDSSCompliant: true,
    acidCompliant: true,
    auditTrail: {
      createdAt: Date.now() - 518400000,
      createdBy: '0',
      validatedAt: Date.now() - 518400000,
      validatedBy: 'system',
      approvedAt: Date.now() - 518400000,
      approvedBy: 'system',
      finalizedAt: Date.now() - 518400000,
      checksumVerified: true,
      integrityScore: 100
    },
    securityMetadata: {
      deviceFingerprint: 'device_fp_1234567890abcdef',
      ipAddress: '192.168.1.100',
      userAgent: 'MadaClone/2.0.0 (iOS 17.0)',
      geolocation: { latitude: 24.7136, longitude: 46.6753 }, // Riyadh
      biometricVerified: false,
      mfaVerified: false,
      riskScore: 5,
      anomalyFlags: []
    }
  },
  {
    id: '13',
    senderId: 'system',
    receiverId: '0',
    amount: 500,
    currency: 'SAR',
    timestamp: Date.now() - 432000000,
    status: 'completed',
    type: 'topup',
    note: 'إضافة أموال عبر credit_card',
    encrypted: true,
    hash: '34567890123456789012345678901234567890de',
    signature: {
      transactionId: 'tx_13',
      signature: 'sig_34567890123456789012345678901234567890de',
      publicKey: 'pub_34567890123efghij',
      timestamp: Date.now() - 432000000,
      algorithm: 'HMAC-SHA256'
    },
    immutableHash: 'immutable_34567890123456789012345678901234567890de',
    previousTransactionHash: '23456789012345678901234567890123456789cd',
    merkleProof: [
      'merkle_proof_1_34567890123456789012345678901234567890de',
      'merkle_proof_2_34567890123456789012345678901234567890de'
    ],
    sequenceNumber: 12,
    blockHeight: 12,
    fraudRiskLevel: 'low',
    fraudFlags: [],
    integrityVerified: true,
    pciDSSCompliant: true,
    acidCompliant: true,
    auditTrail: {
      createdAt: Date.now() - 432000000,
      createdBy: 'system',
      validatedAt: Date.now() - 432000000,
      validatedBy: 'payment_processor',
      approvedAt: Date.now() - 432000000,
      approvedBy: 'payment_gateway',
      finalizedAt: Date.now() - 432000000,
      checksumVerified: true,
      integrityScore: 100
    },
    securityMetadata: {
      deviceFingerprint: 'device_fp_1234567890abcdef',
      ipAddress: '192.168.1.100',
      userAgent: 'MadaClone/2.0.0 (iOS 17.0)',
      geolocation: { latitude: 24.7136, longitude: 46.6753 }, // Riyadh
      biometricVerified: true,
      mfaVerified: true,
      riskScore: 2,
      anomalyFlags: []
    }
  }
];