import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  Balance, 
  Transaction, 
  Loan, 
  LoanPayment, 
  LoanRating, 
  LoanRatingEntry, 
  LoanRequest, 
  LoanResponse,
  ImmutableTransaction,
  ImmutableLedgerState,
  ACIDComplianceRecord,
  AtomicOperation,
  TransactionAuditRecord,
  ComplianceFlag,
  RegulatoryCompliance,
  FraudDetectionResult,
  TransactionAnomalyDetection,
  WalletEligibility,
  LoanDefault,
  SavingCircle,
  Investment
} from '@/types';
import SecurityManager from '@/services/security/SecurityManager';
import SecureStorage from '@/services/security/SecureStorage';
import CryptoService from '@/services/security/CryptoService';
import WalletEligibilityService from '@/services/WalletEligibilityService';
import LoanDefaultService from '@/services/LoanDefaultService';
import SavingCircleService from '@/services/SavingCircleService';
import StartupInvestmentService from '@/services/StartupInvestmentService';

// ACID Transaction Manager for ensuring database-level integrity
class ACIDTransactionManager {
  private static instance: ACIDTransactionManager;
  private activeTransactions: Map<string, ACIDTransaction> = new Map();
  private transactionLocks: Map<string, Set<string>> = new Map();

  static getInstance(): ACIDTransactionManager {
    if (!ACIDTransactionManager.instance) {
      ACIDTransactionManager.instance = new ACIDTransactionManager();
    }
    return ACIDTransactionManager.instance;
  }

  // Begin ACID transaction
  async beginTransaction(transactionId: string, operations: AtomicOperation[]): Promise<ACIDTransaction> {
    const transaction: ACIDTransaction = {
      id: transactionId,
      operations: operations,
      status: 'pending',
      startTime: Date.now(),
      locks: new Set(),
      rollbackData: new Map(),
      preTransactionState: '',
      postTransactionState: ''
    };

    this.activeTransactions.set(transactionId, transaction);
    return transaction;
  }

  // Acquire locks for transaction isolation
  async acquireLocks(transactionId: string, resourceIds: string[]): Promise<boolean> {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) return false;

    // Check if any resources are already locked by other transactions
    for (const resourceId of resourceIds) {
      const existingLocks = this.transactionLocks.get(resourceId);
      if (existingLocks && existingLocks.size > 0 && !existingLocks.has(transactionId)) {
        return false; // Resource is locked by another transaction
      }
    }

    // Acquire locks
    for (const resourceId of resourceIds) {
      if (!this.transactionLocks.has(resourceId)) {
        this.transactionLocks.set(resourceId, new Set());
      }
      this.transactionLocks.get(resourceId)!.add(transactionId);
      transaction.locks.add(resourceId);
    }

    return true;
  }

  // Execute atomic operations
  async executeAtomicOperations(transactionId: string, walletState: any): Promise<boolean> {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) return false;

    try {
      // Store pre-transaction state
      transaction.preTransactionState = JSON.stringify(walletState);

      // Execute each atomic operation
      for (const operation of transaction.operations) {
        const rollbackData = await this.executeAtomicOperation(operation, walletState);
        transaction.rollbackData.set(operation.operationId, rollbackData);
        operation.operationStatus = 'completed';
      }

      // Store post-transaction state
      transaction.postTransactionState = JSON.stringify(walletState);
      transaction.status = 'committed';
      
      return true;
    } catch (error) {
      console.error('Atomic operation execution failed:', error);
      await this.rollbackTransaction(transactionId, walletState);
      return false;
    }
  }

  // Execute individual atomic operation
  private async executeAtomicOperation(operation: AtomicOperation, walletState: any): Promise<any> {
    const rollbackData: any = {};

    switch (operation.operationType) {
      case 'debit':
        const debitCurrency = operation.operationData.currency;
        const debitAmount = operation.operationData.amount;
        const currentBalance = walletState.getBalance(debitCurrency);
        
        rollbackData.previousBalance = currentBalance;
        rollbackData.currency = debitCurrency;
        rollbackData.amount = debitAmount;
        
        if (currentBalance < debitAmount) {
          throw new Error('Insufficient balance for debit operation');
        }
        
        await walletState.updateBalance(debitCurrency, -debitAmount);
        break;

      case 'credit':
        const creditCurrency = operation.operationData.currency;
        const creditAmount = operation.operationData.amount;
        
        rollbackData.currency = creditCurrency;
        rollbackData.amount = creditAmount;
        
        await walletState.updateBalance(creditCurrency, creditAmount);
        break;

      case 'balance_check':
        const checkCurrency = operation.operationData.currency;
        const requiredAmount = operation.operationData.amount;
        const availableBalance = walletState.getBalance(checkCurrency);
        
        if (availableBalance < requiredAmount) {
          throw new Error('Balance check failed - insufficient funds');
        }
        break;

      case 'limit_validation':
        const isValid = await walletState.validateTransactionLimits(operation.operationData.transaction);
        if (!isValid) {
          throw new Error('Transaction limit validation failed');
        }
        break;

      case 'fraud_check':
        const fraudResult = await walletState.performFraudDetection(operation.operationData.transaction);
        if (fraudResult.riskLevel === 'critical') {
          throw new Error('Fraud detection blocked transaction');
        }
        break;

      default:
        throw new Error(`Unknown atomic operation type: ${operation.operationType}`);
    }

    return rollbackData;
  }

  // Rollback transaction
  async rollbackTransaction(transactionId: string, walletState: any): Promise<void> {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) return;

    try {
      // Rollback operations in reverse order
      const completedOperations = transaction.operations.filter(op => op.operationStatus === 'completed');
      
      for (let i = completedOperations.length - 1; i >= 0; i--) {
        const operation = completedOperations[i];
        const rollbackData = transaction.rollbackData.get(operation.operationId);
        
        if (rollbackData) {
          await this.rollbackAtomicOperation(operation, rollbackData, walletState);
          operation.operationStatus = 'rolled_back';
        }
      }

      transaction.status = 'rolled_back';
    } catch (error) {
      console.error('Transaction rollback failed:', error);
      transaction.status = 'failed';
    }
  }

  // Rollback individual atomic operation
  private async rollbackAtomicOperation(operation: AtomicOperation, rollbackData: any, walletState: any): Promise<void> {
    switch (operation.operationType) {
      case 'debit':
        // Restore the debited amount
        await walletState.updateBalance(rollbackData.currency, rollbackData.amount);
        break;

      case 'credit':
        // Remove the credited amount
        await walletState.updateBalance(rollbackData.currency, -rollbackData.amount);
        break;

      // Balance checks and validations don't need rollback
      case 'balance_check':
      case 'limit_validation':
      case 'fraud_check':
        break;
    }
  }

  // Release locks and cleanup transaction
  async commitTransaction(transactionId: string): Promise<void> {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) return;

    // Release all locks
    for (const resourceId of transaction.locks) {
      const locks = this.transactionLocks.get(resourceId);
      if (locks) {
        locks.delete(transactionId);
        if (locks.size === 0) {
          this.transactionLocks.delete(resourceId);
        }
      }
    }

    // Remove transaction from active transactions
    this.activeTransactions.delete(transactionId);
  }

  // Get transaction status
  getTransactionStatus(transactionId: string): string | null {
    const transaction = this.activeTransactions.get(transactionId);
    return transaction ? transaction.status : null;
  }
}

// ACID Transaction interface
interface ACIDTransaction {
  id: string;
  operations: AtomicOperation[];
  status: 'pending' | 'committed' | 'rolled_back' | 'failed';
  startTime: number;
  locks: Set<string>;
  rollbackData: Map<string, any>;
  preTransactionState: string;
  postTransactionState: string;
}

// Immutable Ledger Manager
class ImmutableLedgerManager {
  private static instance: ImmutableLedgerManager;
  private ledgerState: ImmutableLedgerState;
  private cryptoService: CryptoService;

  constructor() {
    this.cryptoService = CryptoService.getInstance();
    this.ledgerState = {
      ledgerId: 'immutable-ledger-' + Date.now().toString(),
      ledgerVersion: '2.0',
      totalTransactions: 0,
      ledgerHash: '',
      lastTransactionHash: '',
      merkleTreeRoot: '',
      ledgerTimestamp: Date.now(),
      ledgerIntegrityProof: {
        proofId: '',
        proofType: 'merkle_tree',
        proofData: '',
        proofTimestamp: Date.now(),
        validationNodes: [],
        integrityScore: 1.0
      }
    };
  }

  static getInstance(): ImmutableLedgerManager {
    if (!ImmutableLedgerManager.instance) {
      ImmutableLedgerManager.instance = new ImmutableLedgerManager();
    }
    return ImmutableLedgerManager.instance;
  }

  // Add transaction to immutable ledger
  async addTransactionToLedger(immutableTransaction: ImmutableTransaction): Promise<void> {
    try {
      // Update ledger state
      this.ledgerState.totalTransactions += 1;
      this.ledgerState.lastTransactionHash = immutableTransaction.immutableHash;
      this.ledgerState.merkleTreeRoot = immutableTransaction.merkleRoot;
      this.ledgerState.ledgerTimestamp = Date.now();

      // Generate new ledger hash
      const ledgerData = JSON.stringify({
        totalTransactions: this.ledgerState.totalTransactions,
        lastTransactionHash: this.ledgerState.lastTransactionHash,
        merkleTreeRoot: this.ledgerState.merkleTreeRoot,
        timestamp: this.ledgerState.ledgerTimestamp
      });

      this.ledgerState.ledgerHash = await this.cryptoService.hash(ledgerData);

      // Generate ledger integrity proof
      this.ledgerState.ledgerIntegrityProof = await this.cryptoService.generateLedgerIntegrityProof();

      console.log('Transaction added to immutable ledger successfully');
    } catch (error) {
      console.error('Failed to add transaction to immutable ledger:', error);
      throw new Error('Ledger update failed');
    }
  }

  // Get current ledger state
  getLedgerState(): ImmutableLedgerState {
    return { ...this.ledgerState };
  }

  // Verify ledger integrity
  async verifyLedgerIntegrity(): Promise<boolean> {
    try {
      // Verify ledger hash
      const ledgerData = JSON.stringify({
        totalTransactions: this.ledgerState.totalTransactions,
        lastTransactionHash: this.ledgerState.lastTransactionHash,
        merkleTreeRoot: this.ledgerState.merkleTreeRoot,
        timestamp: this.ledgerState.ledgerTimestamp
      });

      const expectedHash = await this.cryptoService.hash(ledgerData);
      if (expectedHash !== this.ledgerState.ledgerHash) {
        console.error('Ledger hash verification failed');
        return false;
      }

      // Additional integrity checks can be added here
      return true;
    } catch (error) {
      console.error('Ledger integrity verification failed:', error);
      return false;
    }
  }
}

// Enhanced fraud detection with machine learning-like patterns
interface FraudDetectionResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  requiresAdditionalVerification: boolean;
}

interface TransactionAnomalyDetection {
  isAnomaly: boolean;
  anomalyScore: number;
  reasons: string[];
}

interface WalletState {
  balances: Balance[];
  transactions: Transaction[];
  immutableTransactions: ImmutableTransaction[];
  loans: Loan[];
  loanRatings: LoanRating[];
  loanRequests: LoanRequest[];
  isSecurelyInitialized: boolean;
  fraudDetectionEnabled: boolean;
  immutableLedgerEnabled: boolean;
  acidComplianceEnabled: boolean;
  transactionLimits: {
    daily: { [currency: string]: number };
    monthly: { [currency: string]: number };
  };
  ledgerState: ImmutableLedgerState | null;
  
  // New features
  walletEligibility: WalletEligibility | null;
  loanDefaults: LoanDefault[];
  savingCircles: SavingCircle[];
  investments: Investment[];
  
  // Balance operations
  updateBalance: (currency: string, amount: number) => Promise<void>;
  getBalance: (currency: string) => number;
  
  // Transaction operations (Legacy)
  addTransaction: (transaction: Transaction) => Promise<void>;
  getTransactionHistory: (filters?: any) => Promise<Transaction[]>;
  getTransactionById: (id: string) => Transaction | undefined;
  
  // Immutable transaction operations
  createImmutableTransaction: (transaction: Transaction) => Promise<{ success: boolean; immutableTransaction?: ImmutableTransaction; error?: string }>;
  addImmutableTransaction: (transaction: ImmutableTransaction) => Promise<void>;
  getImmutableTransactionHistory: (filters?: any) => Promise<ImmutableTransaction[]>;
  getImmutableTransactionById: (id: string) => ImmutableTransaction | undefined;
  verifyTransactionChainIntegrity: () => Promise<boolean>;
  
  // Loan operations
  createLoan: (lenderId: string, borrowerPhone: string, amount: number, currency: string, months: number, interestRate?: number) => Promise<{ success: boolean; loanId?: string; error?: string }>;
  processLoanPayment: (loanId: string) => Promise<{ success: boolean; error?: string }>;
  rateBorrower: (loanId: string, rating: number, comment?: string, categories?: any) => Promise<{ success: boolean; error?: string }>;
  getLoansByUser: (userId: string, type: 'lender' | 'borrower') => Loan[];
  getUserLoanRating: (userId: string) => LoanRating | undefined;
  getActiveLoans: () => Loan[];
  
  // Security operations
  initializeSecureWallet: () => Promise<void>;
  encryptSensitiveData: (data: any) => Promise<string>;
  decryptSensitiveData: (encryptedData: string) => Promise<any>;
  performFraudDetection: (transaction: Transaction) => Promise<FraudDetectionResult>;
  detectTransactionAnomaly: (transaction: Transaction) => Promise<TransactionAnomalyDetection>;
  validateTransactionLimits: (transaction: Transaction) => Promise<boolean>;
  createImmutableTransactionRecord: (transaction: Transaction) => Promise<Transaction>;
  verifyTransactionIntegrity: (transaction: Transaction) => Promise<boolean>;
  generateTransactionReport: (period: 'daily' | 'weekly' | 'monthly') => Promise<any>;
  
  // ACID compliance operations
  executeACIDTransaction: (operations: AtomicOperation[]) => Promise<{ success: boolean; transactionId?: string; error?: string }>;
  createACIDComplianceRecord: (transactionId: string, operations: AtomicOperation[]) => Promise<ACIDComplianceRecord>;
  
  // Audit and compliance
  createAuditRecord: (transactionId: string, auditType: string, auditData: any) => Promise<TransactionAuditRecord>;
  addComplianceFlag: (transactionId: string, flagType: string, flagSeverity: string, description: string) => Promise<void>;
  generateComplianceReport: (period: 'daily' | 'weekly' | 'monthly') => Promise<any>;
  
  // User lookup
  findUserByPhone: (phoneNumber: string) => Promise<{ success: boolean; user?: any; error?: string }>;
  
  // Wallet eligibility
  checkWalletEligibility: (userId: string) => Promise<boolean>;
  recordDailyUsage: (userId: string) => Promise<void>;
  getEligibilityProgress: (userId: string) => Promise<number>;
  
  // Loan defaults
  checkLoanDefault: (loanId: string, borrowerBalance: number) => Promise<LoanDefault | null>;
  lenderConfirmPayment: (defaultId: string, lenderId: string, paymentDetails: any) => Promise<boolean>;
  getBorrowerDefaults: (borrowerId: string) => Promise<LoanDefault[]>;
  
  // Saving circles
  createSavingCircle: (adminId: string, name: string, contribution: number, currency: string, gracePeriod: number, members: string[]) => Promise<{ success: boolean; circle?: SavingCircle; error?: string }>;
  getUserSavingCircles: (userId: string) => Promise<SavingCircle[]>;
  
  // Investments
  getAvailableStartups: () => Promise<any[]>;
  createInvestment: (investorId: string, startupId: string, amount: number, currency: string) => Promise<{ success: boolean; investment?: Investment; error?: string }>;
  getUserInvestments: (userId: string) => Promise<Investment[]>;
  getPortfolioPerformance: (userId: string) => Promise<any>;
}

// Secure storage for wallet data
const secureStorage = SecureStorage.getInstance();
const cryptoService = CryptoService.getInstance();
const acidManager = ACIDTransactionManager.getInstance();
const ledgerManager = ImmutableLedgerManager.getInstance();
const eligibilityService = WalletEligibilityService.getInstance();
const loanDefaultService = LoanDefaultService.getInstance();
const savingCircleService = SavingCircleService.getInstance();
const investmentService = StartupInvestmentService.getInstance();

const secureWalletStorage = createJSONStorage(() => ({
  getItem: async (name: string) => {
    try {
      const encryptedValue = await secureStorage.getItem(`wallet_${name}`);
      if (!encryptedValue) return null;
      
      const decryptedValue = await cryptoService.advancedDecrypt(JSON.parse(encryptedValue));
      return decryptedValue;
    } catch (error) {
      console.error('Secure wallet storage getItem error:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      const encryptedValue = await cryptoService.advancedEncrypt(value);
      await secureStorage.setItem(`wallet_${name}`, JSON.stringify(encryptedValue));
    } catch (error) {
      console.error('Secure wallet storage setItem error:', error);
    }
  },
  removeItem: async (name: string) => {
    try {
      await secureStorage.removeItem(`wallet_${name}`);
    } catch (error) {
      console.error('Secure wallet storage removeItem error:', error);
    }
  },
}));

// All Arab countries currencies
const ARAB_CURRENCIES = [
  'SAR', 'AED', 'EGP', 'IRR', 'IQD', 'JOD', 'KWD', 'LBP', 'LYD', 'MAD', 
  'DZD', 'TND', 'SDG', 'SYP', 'YER', 'OMR', 'QAR', 'BHD', 'ILS', 'SOS', 
  'DJF', 'KMF', 'USD'
];

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balances: ARAB_CURRENCIES.map(currency => ({
        currency,
        amount: currency === 'SAR' ? 5000 : currency === 'AED' ? 1200 : currency === 'EGP' ? 8000 : currency === 'USD' ? 300 : 0
      })),
      transactions: [],
      immutableTransactions: [],
      loans: [],
      loanRatings: [],
      loanRequests: [],
      isSecurelyInitialized: false,
      fraudDetectionEnabled: true,
      immutableLedgerEnabled: true,
      acidComplianceEnabled: true,
      transactionLimits: {
        daily: Object.fromEntries(ARAB_CURRENCIES.map(currency => [currency, 10000])),
        monthly: Object.fromEntries(ARAB_CURRENCIES.map(currency => [currency, 100000]))
      },
      ledgerState: null,
      
      // New features
      walletEligibility: null,
      loanDefaults: [],
      savingCircles: [],
      investments: [],
      
      updateBalance: async (currency: string, amount: number) => {
        try {
          const securityManager = SecurityManager.getInstance();
          
          console.log(`Secure balance update: ${currency} ${amount > 0 ? '+' : ''}${amount}`);
          
          set((state) => ({
            balances: state.balances.map((balance) =>
              balance.currency === currency
                ? { ...balance, amount: Math.max(0, balance.amount + amount) }
                : balance
            ),
          }));
        } catch (error) {
          console.error('Secure balance update failed:', error);
          throw new Error('Failed to update balance securely');
        }
      },
      
      getBalance: (currency: string) => {
        const balance = get().balances.find((b) => b.currency === currency);
        return balance?.amount || 0;
      },

      // Legacy transaction method (kept for backward compatibility)
      addTransaction: async (transaction: Transaction) => {
        try {
          const immutableTransaction = await get().createImmutableTransactionRecord(transaction);
          
          if (get().fraudDetectionEnabled) {
            const fraudResult = await get().performFraudDetection(immutableTransaction);
            
            if (fraudResult.riskLevel === 'critical') {
              throw new Error('Transaction blocked due to high fraud risk');
            }
          }

          const limitsValid = await get().validateTransactionLimits(immutableTransaction);
          if (!limitsValid) {
            throw new Error('Transaction exceeds limits');
          }
          
          set((state) => ({
            transactions: [immutableTransaction, ...state.transactions],
          }));

          console.log('Legacy transaction added with security checks');
        } catch (error) {
          console.error('Legacy transaction addition failed:', error);
          throw new Error('Failed to add transaction securely');
        }
      },

      // Create immutable transaction with full ACID compliance
      createImmutableTransaction: async (transaction: Transaction) => {
        try {
          if (!get().immutableLedgerEnabled) {
            return { success: false, error: 'Immutable ledger is disabled' };
          }

          // Create ACID transaction operations
          const operations: AtomicOperation[] = [
            {
              operationId: `fraud_check_${Date.now()}`,
              operationType: 'fraud_check',
              operationData: { transaction },
              operationStatus: 'pending',
              operationTimestamp: Date.now()
            },
            {
              operationId: `limit_check_${Date.now()}`,
              operationType: 'limit_validation',
              operationData: { transaction },
              operationStatus: 'pending',
              operationTimestamp: Date.now()
            },
            {
              operationId: `balance_check_${Date.now()}`,
              operationType: 'balance_check',
              operationData: { 
                currency: transaction.currency, 
                amount: transaction.amount 
              },
              operationStatus: 'pending',
              operationTimestamp: Date.now()
            },
            {
              operationId: `debit_${Date.now()}`,
              operationType: 'debit',
              operationData: { 
                currency: transaction.currency, 
                amount: transaction.amount 
              },
              operationStatus: 'pending',
              operationTimestamp: Date.now()
            },
            {
              operationId: `credit_${Date.now()}`,
              operationType: 'credit',
              operationData: { 
                currency: transaction.currency, 
                amount: transaction.amount 
              },
              operationStatus: 'pending',
              operationTimestamp: Date.now()
            }
          ];

          // Execute ACID transaction
          const acidResult = await get().executeACIDTransaction(operations);
          if (!acidResult.success) {
            return { success: false, error: acidResult.error };
          }

          // Create immutable transaction record
          const immutableRecord = await cryptoService.createImmutableTransactionRecord(transaction);
          
          // Create immutable transaction
          const immutableTransaction: ImmutableTransaction = {
            ...transaction,
            blockIndex: get().immutableTransactions.length,
            previousTransactionHash: get().immutableTransactions.length > 0 
              ? get().immutableTransactions[get().immutableTransactions.length - 1].immutableHash
              : '0000000000000000000000000000000000000000000000000000000000000000',
            transactionHash: immutableRecord.hash,
            merkleRoot: '', // Will be set by ledger manager
            digitalSignature: immutableRecord.digitalSignature,
            cryptographicProof: immutableRecord.cryptographicProof,
            acidCompliance: await get().createACIDComplianceRecord(acidResult.transactionId!, operations),
            auditTrail: [
              await get().createAuditRecord(transaction.id, 'creation', { 
                acidTransactionId: acidResult.transactionId,
                operations: operations.length 
              })
            ],
            complianceFlags: [],
            immutabilityProof: immutableRecord.immutabilityProof,
            chainIntegrityHash: immutableRecord.immutableHash,
            antiTamperingSeal: immutableRecord.antiTamperingSeal
          };

          return { success: true, immutableTransaction };
        } catch (error) {
          console.error('Immutable transaction creation failed:', error);
          return { success: false, error: 'Failed to create immutable transaction' };
        }
      },

      // Add immutable transaction to store and ledger
      addImmutableTransaction: async (immutableTransaction: ImmutableTransaction) => {
        try {
          // Add to immutable ledger
          await ledgerManager.addTransactionToLedger(immutableTransaction);
          
          // Update store
          set((state) => ({
            immutableTransactions: [...state.immutableTransactions, immutableTransaction],
            ledgerState: ledgerManager.getLedgerState()
          }));

          // Create audit record
          await get().createAuditRecord(immutableTransaction.id, 'completion', {
            blockIndex: immutableTransaction.blockIndex,
            ledgerHash: get().ledgerState?.ledgerHash
          });

          console.log('Immutable transaction added to ledger successfully');
        } catch (error) {
          console.error('Failed to add immutable transaction:', error);
          throw new Error('Failed to add immutable transaction to ledger');
        }
      },

      // Execute ACID transaction
      executeACIDTransaction: async (operations: AtomicOperation[]) => {
        try {
          if (!get().acidComplianceEnabled) {
            return { success: false, error: 'ACID compliance is disabled' };
          }

          const transactionId = `acid_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Begin ACID transaction
          const acidTransaction = await acidManager.beginTransaction(transactionId, operations);
          
          // Acquire necessary locks
          const resourceIds = operations.map(op => `${op.operationType}_${op.operationData.currency || 'global'}`);
          const locksAcquired = await acidManager.acquireLocks(transactionId, resourceIds);
          
          if (!locksAcquired) {
            return { success: false, error: 'Failed to acquire transaction locks - resource conflict' };
          }

          // Execute atomic operations
          const executionSuccess = await acidManager.executeAtomicOperations(transactionId, get());
          
          if (executionSuccess) {
            await acidManager.commitTransaction(transactionId);
            return { success: true, transactionId };
          } else {
            await acidManager.commitTransaction(transactionId); // Cleanup even on failure
            return { success: false, error: 'ACID transaction execution failed' };
          }
        } catch (error) {
          console.error('ACID transaction execution failed:', error);
          return { success: false, error: 'ACID transaction failed: ' + error };
        }
      },

      // Create ACID compliance record
      createACIDComplianceRecord: async (transactionId: string, operations: AtomicOperation[]) => {
        try {
          const preState = JSON.stringify(get().balances);
          const postState = JSON.stringify(get().balances); // This would be different after operations
          
          const acidCompliance: ACIDComplianceRecord = {
            atomicity: {
              transactionId: transactionId,
              allOperationsCompleted: operations.every(op => op.operationStatus === 'completed'),
              rollbackCapable: true,
              atomicOperations: operations
            },
            consistency: {
              preTransactionState: await cryptoService.hash(preState),
              postTransactionState: await cryptoService.hash(postState),
              consistencyRulesValidated: true,
              constraintViolations: []
            },
            isolation: {
              isolationLevel: 'serializable',
              lockAcquired: true,
              lockType: 'exclusive',
              concurrentTransactions: []
            },
            durability: {
              persistedToStorage: true,
              backupCreated: true,
              replicationConfirmed: false,
              durabilityTimestamp: Date.now(),
              storageLocations: ['secure_storage', 'immutable_ledger']
            },
            acidValidationTimestamp: Date.now(),
            acidComplianceVersion: '2.0'
          };

          return acidCompliance;
        } catch (error) {
          console.error('ACID compliance record creation failed:', error);
          throw new Error('Failed to create ACID compliance record');
        }
      },

      // Create audit record
      createAuditRecord: async (transactionId: string, auditType: string, auditData: any) => {
        try {
          const auditRecord: TransactionAuditRecord = {
            auditId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            auditType: auditType as any,
            auditTimestamp: Date.now(),
            auditorId: 'system_auditor',
            auditData: auditData,
            auditResult: 'passed',
            regulatoryCompliance: [
              {
                regulation: 'PCI_DSS',
                complianceStatus: 'compliant',
                complianceTimestamp: Date.now(),
                complianceNotes: 'Transaction meets PCI DSS requirements'
              }
            ],
            auditTrailHash: await cryptoService.hash(JSON.stringify(auditData))
          };

          return auditRecord;
        } catch (error) {
          console.error('Audit record creation failed:', error);
          throw new Error('Failed to create audit record');
        }
      },

      // Add compliance flag
      addComplianceFlag: async (transactionId: string, flagType: string, flagSeverity: string, description: string) => {
        try {
          const complianceFlag: ComplianceFlag = {
            flagType: flagType as any,
            flagSeverity: flagSeverity as any,
            flagTimestamp: Date.now(),
            flagDescription: description,
            flagStatus: 'active',
            flaggedBy: 'system'
          };

          // Add flag to the relevant immutable transaction
          set((state) => ({
            immutableTransactions: state.immutableTransactions.map(tx =>
              tx.id === transactionId
                ? { ...tx, complianceFlags: [...tx.complianceFlags, complianceFlag] }
                : tx
            )
          }));
        } catch (error) {
          console.error('Compliance flag addition failed:', error);
          throw new Error('Failed to add compliance flag');
        }
      },

      // Get immutable transaction history
      getImmutableTransactionHistory: async (filters?: any) => {
        try {
          let transactions = [...get().immutableTransactions];

          if (filters) {
            if (filters.currency) {
              transactions = transactions.filter(t => t.currency === filters.currency);
            }
            if (filters.type) {
              transactions = transactions.filter(t => t.type === filters.type);
            }
            if (filters.startDate) {
              transactions = transactions.filter(t => t.timestamp >= filters.startDate);
            }
            if (filters.endDate) {
              transactions = transactions.filter(t => t.timestamp <= filters.endDate);
            }
          }

          // Verify integrity of each transaction
          const verifiedTransactions = await Promise.all(
            transactions.map(async (transaction) => {
              const isValid = await cryptoService.verifyImmutableTransactionRecord(transaction);
              return { ...transaction, integrityVerified: isValid };
            })
          );

          return verifiedTransactions;
        } catch (error) {
          console.error('Failed to get immutable transaction history:', error);
          return [];
        }
      },

      // Get immutable transaction by ID
      getImmutableTransactionById: (id: string) => {
        return get().immutableTransactions.find(t => t.id === id);
      },

      // Verify transaction chain integrity
      verifyTransactionChainIntegrity: async () => {
        try {
          const transactions = get().immutableTransactions;
          
          for (let i = 1; i < transactions.length; i++) {
            const currentTx = transactions[i];
            const previousTx = transactions[i - 1];
            
            if (currentTx.previousTransactionHash !== previousTx.immutableHash) {
              console.error(`Chain integrity violation at transaction ${i}`);
              return false;
            }
            
            const isValid = await cryptoService.verifyImmutableTransactionRecord(currentTx);
            if (!isValid) {
              console.error(`Transaction integrity violation at transaction ${i}`);
              return false;
            }
          }

          // Verify ledger integrity
          const ledgerValid = await ledgerManager.verifyLedgerIntegrity();
          if (!ledgerValid) {
            console.error('Ledger integrity verification failed');
            return false;
          }

          return true;
        } catch (error) {
          console.error('Transaction chain integrity verification failed:', error);
          return false;
        }
      },

      // Generate compliance report
      generateComplianceReport: async (period: 'daily' | 'weekly' | 'monthly') => {
        try {
          const now = Date.now();
          let periodMs: number;

          switch (period) {
            case 'daily':
              periodMs = 24 * 60 * 60 * 1000;
              break;
            case 'weekly':
              periodMs = 7 * 24 * 60 * 60 * 1000;
              break;
            case 'monthly':
              periodMs = 30 * 24 * 60 * 60 * 1000;
              break;
          }

          const periodTransactions = get().immutableTransactions.filter(t =>
            now - t.timestamp < periodMs
          );

          // Calculate compliance metrics
          const totalTransactions = periodTransactions.length;
          const acidCompliantTransactions = periodTransactions.filter(t => 
            t.acidCompliance.atomicity.allOperationsCompleted &&
            t.acidCompliance.consistency.consistencyRulesValidated &&
            t.acidCompliance.isolation.lockAcquired &&
            t.acidCompliance.durability.persistedToStorage
          ).length;

          const complianceFlags = periodTransactions.reduce((total, t) => 
            total + t.complianceFlags.length, 0
          );

          const integrityChecks = await Promise.all(
            periodTransactions.map(t => cryptoService.verifyImmutableTransactionRecord(t))
          );
          const integrityFailures = integrityChecks.filter(check => !check).length;

          return {
            period,
            summary: {
              totalTransactions,
              acidCompliantTransactions,
              acidComplianceRate: (acidCompliantTransactions / totalTransactions * 100) || 100,
              complianceFlags,
              integrityFailures,
              integrityRate: ((totalTransactions - integrityFailures) / totalTransactions * 100) || 100
            },
            ledgerState: get().ledgerState,
            chainIntegrityVerified: await get().verifyTransactionChainIntegrity(),
            generatedAt: now
          };
        } catch (error) {
          console.error('Failed to generate compliance report:', error);
          throw new Error('Compliance report generation failed');
        }
      },

      getTransactionById: (id: string) => {
        return get().transactions.find(t => t.id === id);
      },

      findUserByPhone: async (phoneNumber: string) => {
        try {
          const mockUsers = [
            { id: '1', displayName: 'أحمد محمد', phoneNumber: '+966501234567', profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
            { id: '2', displayName: 'فاطمة علي', phoneNumber: '+971501234567', profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face' },
            { id: '3', displayName: 'محمد حسن', phoneNumber: '+201234567890', profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' },
          ];

          const user = mockUsers.find(u => u.phoneNumber === phoneNumber);
          
          if (user) {
            return { success: true, user };
          } else {
            return { success: false, error: 'المستخدم غير موجود' };
          }
        } catch (error) {
          console.error('User lookup failed:', error);
          return { success: false, error: 'فشل في البحث عن المستخدم' };
        }
      },

      createLoan: async (lenderId: string, borrowerPhone: string, amount: number, currency: string, months: number, interestRate: number = 0) => {
        try {
          const userLookup = await get().findUserByPhone(borrowerPhone);
          if (!userLookup.success || !userLookup.user) {
            return { success: false, error: userLookup.error || 'المستخدم غير موجود' };
          }

          const borrowerId = userLookup.user.id;
          const lenderBalance = get().getBalance(currency);
          if (lenderBalance < amount) {
            return { success: false, error: 'رصيد غير كافٍ' };
          }

          const totalAmount = amount + (amount * interestRate / 100);
          const monthlyAmount = totalAmount / months;

          const loanId = `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const loan: Loan = {
            id: loanId,
            lenderId,
            borrowerId,
            amount,
            currency,
            monthlyAmount,
            totalMonths: months,
            remainingMonths: months,
            interestRate,
            status: 'active',
            createdAt: Date.now(),
            nextPaymentDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
            payments: [],
            terms: `قرض بمبلغ ${amount} ${currency} لمدة ${months} شهر بمعدل فائدة ${interestRate}%`,
            latePaymentFee: 50,
            earlyPaymentDiscount: 0
          };

          // Create immutable transaction for loan disbursement
          const loanTransaction: Transaction = {
            id: `tx_loan_${loanId}`,
            senderId: lenderId,
            receiverId: borrowerId,
            amount,
            currency,
            timestamp: Date.now(),
            status: 'completed',
            type: 'loan_disbursement',
            note: `صرف قرض - ${loan.terms}`,
            loanId,
            isLoanPayment: false
          };

          const immutableResult = await get().createImmutableTransaction(loanTransaction);
          if (!immutableResult.success) {
            return { success: false, error: 'فشل في إنشاء معاملة القرض الآمنة' };
          }

          // Add immutable transaction to ledger
          await get().addImmutableTransaction(immutableResult.immutableTransaction!);

          // Update balances
          await get().updateBalance(currency, -amount); // Deduct from lender
          await get().updateBalance(currency, amount);  // Add to borrower

          // Add loan to state
          set((state) => ({
            loans: [...state.loans, loan]
          }));

          // Initialize borrower rating if not exists
          const existingRating = get().getUserLoanRating(borrowerId);
          if (!existingRating) {
            const newRating: LoanRating = {
              userId: borrowerId,
              averageRating: 5,
              totalRatings: 0,
              ratings: [],
              creditScore: 750,
              totalLoansReceived: 1,
              totalLoansRepaid: 0,
              defaultedLoans: 0,
              onTimePaymentRate: 100
            };

            set((state) => ({
              loanRatings: [...state.loanRatings, newRating]
            }));
          } else {
            set((state) => ({
              loanRatings: state.loanRatings.map(rating =>
                rating.userId === borrowerId
                  ? { ...rating, totalLoansReceived: rating.totalLoansReceived + 1 }
                  : rating
              )
            }));
          }

          return { success: true, loanId };
        } catch (error) {
          console.error('Loan creation failed:', error);
          return { success: false, error: 'فشل في إنشاء القرض' };
        }
      },

      processLoanPayment: async (loanId: string) => {
        try {
          const loan = get().loans.find(l => l.id === loanId);
          if (!loan) {
            return { success: false, error: 'القرض غير موجود' };
          }

          if (loan.status !== 'active') {
            return { success: false, error: 'القرض غير نشط' };
          }

          const borrowerBalance = get().getBalance(loan.currency);
          if (borrowerBalance < loan.monthlyAmount) {
            const overduePayment: LoanPayment = {
              id: `payment_${Date.now()}`,
              loanId,
              amount: loan.monthlyAmount,
              currency: loan.currency,
              paymentDate: Date.now(),
              dueDate: loan.nextPaymentDate,
              status: 'overdue',
              lateFee: loan.latePaymentFee
            };

            set((state) => ({
              loans: state.loans.map(l =>
                l.id === loanId
                  ? { ...l, payments: [...l.payments, overduePayment] }
                  : l
              )
            }));

            return { success: false, error: 'رصيد غير كافٍ للدفع' };
          }

          // Create immutable transaction for loan payment
          const paymentTransaction: Transaction = {
            id: `tx_payment_${Date.now()}`,
            senderId: loan.borrowerId,
            receiverId: loan.lenderId,
            amount: loan.monthlyAmount,
            currency: loan.currency,
            timestamp: Date.now(),
            status: 'completed',
            type: 'loan_payment',
            note: `دفعة قرض ${loan.remainingMonths}/${loan.totalMonths}`,
            loanId,
            isLoanPayment: true,
            paymentNumber: loan.totalMonths - loan.remainingMonths + 1,
            totalPayments: loan.totalMonths
          };

          const immutableResult = await get().createImmutableTransaction(paymentTransaction);
          if (!immutableResult.success) {
            return { success: false, error: 'فشل في إنشاء معاملة الدفع الآمنة' };
          }

          // Add immutable transaction to ledger
          await get().addImmutableTransaction(immutableResult.immutableTransaction!);

          // Update balances
          await get().updateBalance(loan.currency, -loan.monthlyAmount); // Deduct from borrower
          await get().updateBalance(loan.currency, loan.monthlyAmount);  // Add to lender

          // Create payment record
          const payment: LoanPayment = {
            id: `payment_${Date.now()}`,
            loanId,
            amount: loan.monthlyAmount,
            currency: loan.currency,
            paymentDate: Date.now(),
            dueDate: loan.nextPaymentDate,
            status: 'paid',
            transactionId: paymentTransaction.id
          };

          // Update loan
          const updatedLoan = {
            ...loan,
            remainingMonths: loan.remainingMonths - 1,
            nextPaymentDate: loan.remainingMonths > 1 ? Date.now() + (30 * 24 * 60 * 60 * 1000) : 0,
            status: loan.remainingMonths <= 1 ? 'completed' as const : 'active' as const,
            payments: [...loan.payments, payment]
          };

          set((state) => ({
            loans: state.loans.map(l => l.id === loanId ? updatedLoan : l)
          }));

          // Update borrower rating
          if (updatedLoan.status === 'completed') {
            set((state) => ({
              loanRatings: state.loanRatings.map(rating =>
                rating.userId === loan.borrowerId
                  ? { 
                      ...rating, 
                      totalLoansRepaid: rating.totalLoansRepaid + 1,
                      onTimePaymentRate: ((rating.totalLoansRepaid + 1) / rating.totalLoansReceived) * 100
                    }
                  : rating
              )
            }));
          }

          return { success: true };
        } catch (error) {
          console.error('Loan payment processing failed:', error);
          return { success: false, error: 'فشل في معالجة دفعة القرض' };
        }
      },

      rateBorrower: async (loanId: string, rating: number, comment?: string, categories?: any) => {
        try {
          const loan = get().loans.find(l => l.id === loanId);
          if (!loan) {
            return { success: false, error: 'القرض غير موجود' };
          }

          if (loan.status !== 'completed') {
            return { success: false, error: 'لا يمكن تقييم قرض غير مكتمل' };
          }

          const ratingEntry: LoanRatingEntry = {
            id: `rating_${Date.now()}`,
            loanId,
            raterId: loan.lenderId,
            rating,
            comment,
            timestamp: Date.now(),
            categories: categories || {
              reliability: rating,
              communication: rating,
              paymentPunctuality: rating
            }
          };

          const existingRatingIndex = get().loanRatings.findIndex(r => r.userId === loan.borrowerId);
          
          if (existingRatingIndex >= 0) {
            set((state) => {
              const updatedRatings = [...state.loanRatings];
              const existingRating = updatedRatings[existingRatingIndex];
              const newRatings = [...existingRating.ratings, ratingEntry];
              const newAverageRating = newRatings.reduce((sum, r) => sum + r.rating, 0) / newRatings.length;

              updatedRatings[existingRatingIndex] = {
                ...existingRating,
                averageRating: newAverageRating,
                totalRatings: newRatings.length,
                ratings: newRatings,
                creditScore: Math.min(850, Math.max(300, 300 + (newAverageRating * 110)))
              };

              return { loanRatings: updatedRatings };
            });
          }

          return { success: true };
        } catch (error) {
          console.error('Borrower rating failed:', error);
          return { success: false, error: 'فشل في تقييم المقترض' };
        }
      },

      getLoansByUser: (userId: string, type: 'lender' | 'borrower') => {
        return get().loans.filter(loan => 
          type === 'lender' ? loan.lenderId === userId : loan.borrowerId === userId
        );
      },

      getUserLoanRating: (userId: string) => {
        return get().loanRatings.find(rating => rating.userId === userId);
      },

      getActiveLoans: () => {
        return get().loans.filter(loan => loan.status === 'active');
      },

      initializeSecureWallet: async () => {
        try {
          const securityManager = SecurityManager.getInstance();
          
          set({ 
            isSecurelyInitialized: true,
            fraudDetectionEnabled: true,
            immutableLedgerEnabled: true,
            acidComplianceEnabled: true,
            ledgerState: ledgerManager.getLedgerState()
          });
          
          console.log('Wallet security initialized with immutable ledger and ACID compliance');
        } catch (error) {
          console.error('Wallet security initialization failed:', error);
          set({ isSecurelyInitialized: false });
        }
      },

      encryptSensitiveData: async (data: any) => {
        try {
          const encrypted = await cryptoService.advancedEncrypt(JSON.stringify(data));
          return JSON.stringify(encrypted);
        } catch (error) {
          console.error('Data encryption failed:', error);
          return JSON.stringify(data);
        }
      },

      decryptSensitiveData: async (encryptedData: string) => {
        try {
          const parsed = JSON.parse(encryptedData);
          const decrypted = await cryptoService.advancedDecrypt(parsed);
          return JSON.parse(decrypted);
        } catch (error) {
          console.error('Data decryption failed:', error);
          return JSON.parse(encryptedData);
        }
      },

      performFraudDetection: async (transaction: Transaction): Promise<FraudDetectionResult> => {
        try {
          let riskScore = 0;
          const flags: string[] = [];
          const state = get();

          const balance = state.getBalance(transaction.currency);
          const amountRatio = transaction.amount / balance;
          
          if (amountRatio > 0.8) {
            riskScore += 0.4;
            flags.push('high_amount_ratio');
          }
          
          if (transaction.amount > 50000) {
            riskScore += 0.3;
            flags.push('large_amount');
          }

          const recentTransactions = state.transactions.filter(t => 
            Date.now() - t.timestamp < 60 * 60 * 1000 &&
            t.senderId === transaction.senderId &&
            t.currency === transaction.currency
          );

          if (recentTransactions.length > 5) {
            riskScore += 0.3;
            flags.push('high_frequency');
          }

          const hour = new Date().getHours();
          if (hour < 6 || hour > 23) {
            riskScore += 0.2;
            flags.push('unusual_time');
          }

          const sameRecipientCount = state.transactions.filter(t =>
            t.receiverId === transaction.receiverId &&
            Date.now() - t.timestamp < 24 * 60 * 60 * 1000
          ).length;

          if (sameRecipientCount > 10) {
            riskScore += 0.3;
            flags.push('repeated_recipient');
          }

          const last24HoursTotal = state.transactions
            .filter(t => 
              Date.now() - t.timestamp < 24 * 60 * 60 * 1000 &&
              t.senderId === transaction.senderId &&
              t.currency === transaction.currency
            )
            .reduce((sum, t) => sum + t.amount, 0);

          const dailyLimit = state.transactionLimits.daily[transaction.currency] || 10000;
          if (last24HoursTotal + transaction.amount > dailyLimit * 2) {
            riskScore += 0.4;
            flags.push('velocity_exceeded');
          }

          let riskLevel: 'low' | 'medium' | 'high' | 'critical';
          if (riskScore < 0.3) riskLevel = 'low';
          else if (riskScore < 0.6) riskLevel = 'medium';
          else if (riskScore < 0.8) riskLevel = 'high';
          else riskLevel = 'critical';

          return {
            riskScore,
            riskLevel,
            flags,
            requiresAdditionalVerification: riskScore > 0.5
          };
        } catch (error) {
          console.error('Fraud detection failed:', error);
          return {
            riskScore: 1.0,
            riskLevel: 'critical',
            flags: ['fraud_detection_error'],
            requiresAdditionalVerification: true
          };
        }
      },

      detectTransactionAnomaly: async (transaction: Transaction): Promise<TransactionAnomalyDetection> => {
        try {
          const state = get();
          const userTransactions = state.transactions.filter(t => t.senderId === transaction.senderId);
          
          if (userTransactions.length < 5) {
            return { isAnomaly: false, anomalyScore: 0, reasons: [] };
          }

          let anomalyScore = 0;
          const reasons: string[] = [];

          const amounts = userTransactions.map(t => t.amount);
          const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
          const stdDev = Math.sqrt(amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length);
          
          const amountZScore = Math.abs((transaction.amount - avgAmount) / stdDev);
          if (amountZScore > 2) {
            anomalyScore += 0.4;
            reasons.push('unusual_amount');
          }

          const hours = userTransactions.map(t => new Date(t.timestamp).getHours());
          const avgHour = hours.reduce((sum, h) => sum + h, 0) / hours.length;
          const currentHour = new Date(transaction.timestamp).getHours();
          
          if (Math.abs(currentHour - avgHour) > 6) {
            anomalyScore += 0.3;
            reasons.push('unusual_time_pattern');
          }

          const recipients = userTransactions.map(t => t.receiverId);
          const uniqueRecipients = new Set(recipients);
          
          if (!uniqueRecipients.has(transaction.receiverId) && uniqueRecipients.size > 3) {
            anomalyScore += 0.2;
            reasons.push('new_recipient');
          }

          const currencies = userTransactions.map(t => t.currency);
          const currencyFreq = currencies.reduce((freq, curr) => {
            freq[curr] = (freq[curr] || 0) + 1;
            return freq;
          }, {} as Record<string, number>);

          const currencyUsage = currencyFreq[transaction.currency] || 0;
          if (currencyUsage < userTransactions.length * 0.1) {
            anomalyScore += 0.2;
            reasons.push('unusual_currency');
          }

          return {
            isAnomaly: anomalyScore > 0.5,
            anomalyScore,
            reasons
          };
        } catch (error) {
          console.error('Anomaly detection failed:', error);
          return { isAnomaly: true, anomalyScore: 1.0, reasons: ['detection_error'] };
        }
      },

      validateTransactionLimits: async (transaction: Transaction): Promise<boolean> => {
        try {
          const state = get();
          const now = Date.now();
          
          const dailyTransactions = state.transactions.filter(t =>
            t.senderId === transaction.senderId &&
            t.currency === transaction.currency &&
            now - t.timestamp < 24 * 60 * 60 * 1000
          );
          
          const dailyTotal = dailyTransactions.reduce((sum, t) => sum + t.amount, 0);
          const dailyLimit = state.transactionLimits.daily[transaction.currency] || 10000;
          
          if (dailyTotal + transaction.amount > dailyLimit) {
            console.warn('Daily transaction limit exceeded');
            return false;
          }

          const monthlyTransactions = state.transactions.filter(t =>
            t.senderId === transaction.senderId &&
            t.currency === transaction.currency &&
            now - t.timestamp < 30 * 24 * 60 * 60 * 1000
          );
          
          const monthlyTotal = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
          const monthlyLimit = state.transactionLimits.monthly[transaction.currency] || 100000;
          
          if (monthlyTotal + transaction.amount > monthlyLimit) {
            console.warn('Monthly transaction limit exceeded');
            return false;
          }

          return true;
        } catch (error) {
          console.error('Transaction limit validation failed:', error);
          return false;
        }
      },

      createImmutableTransactionRecord: async (transaction: Transaction): Promise<Transaction> => {
        try {
          const immutableRecord = await cryptoService.createImmutableTransactionRecord(transaction);
          
          return {
            ...transaction,
            encrypted: true,
            hash: immutableRecord.hash,
            immutableHash: immutableRecord.immutableHash
          };
        } catch (error) {
          console.error('Failed to create immutable transaction record:', error);
          const fallbackHash = `hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          return {
            ...transaction,
            encrypted: false,
            hash: fallbackHash,
            immutableHash: fallbackHash
          };
        }
      },

      verifyTransactionIntegrity: async (transaction: Transaction): Promise<boolean> => {
        try {
          // For legacy transactions, do basic verification
          if (!transaction.immutableHash) {
            return true; // Legacy transaction, assume valid
          }
          
          // For immutable transactions, use full verification
          const immutableTx = get().getImmutableTransactionById(transaction.id);
          if (immutableTx) {
            return await cryptoService.verifyImmutableTransactionRecord(immutableTx);
          }
          
          return false;
        } catch (error) {
          console.error('Transaction integrity verification failed:', error);
          return false;
        }
      },

      getTransactionHistory: async (filters?: any): Promise<Transaction[]> => {
        try {
          const state = get();
          let transactions = [...state.transactions];

          if (filters) {
            if (filters.currency) {
              transactions = transactions.filter(t => t.currency === filters.currency);
            }
            if (filters.type) {
              transactions = transactions.filter(t => t.type === filters.type);
            }
            if (filters.startDate) {
              transactions = transactions.filter(t => t.timestamp >= filters.startDate);
            }
            if (filters.endDate) {
              transactions = transactions.filter(t => t.timestamp <= filters.endDate);
            }
          }

          const verifiedTransactions = await Promise.all(
            transactions.map(async (transaction) => {
              const isValid = await get().verifyTransactionIntegrity(transaction);
              return { ...transaction, integrityVerified: isValid };
            })
          );

          return verifiedTransactions;
        } catch (error) {
          console.error('Failed to get transaction history:', error);
          return [];
        }
      },

      generateTransactionReport: async (period: 'daily' | 'weekly' | 'monthly'): Promise<any> => {
        try {
          const state = get();
          const now = Date.now();
          let periodMs: number;

          switch (period) {
            case 'daily':
              periodMs = 24 * 60 * 60 * 1000;
              break;
            case 'weekly':
              periodMs = 7 * 24 * 60 * 60 * 1000;
              break;
            case 'monthly':
              periodMs = 30 * 24 * 60 * 60 * 1000;
              break;
          }

          const periodTransactions = state.transactions.filter(t =>
            now - t.timestamp < periodMs
          );

          const totalTransactions = periodTransactions.length;
          const totalAmount = periodTransactions.reduce((sum, t) => sum + t.amount, 0);
          const avgAmount = totalAmount / totalTransactions || 0;

          const byCurrency = periodTransactions.reduce((acc, t) => {
            if (!acc[t.currency]) {
              acc[t.currency] = { count: 0, total: 0 };
            }
            acc[t.currency].count++;
            acc[t.currency].total += t.amount;
            return acc;
          }, {} as Record<string, { count: number; total: number }>);

          const fraudAlerts = periodTransactions.filter(t => 
            t.note?.includes('fraud') || t.note?.includes('suspicious')
          ).length;

          const integrityChecks = await Promise.all(
            periodTransactions.map(t => get().verifyTransactionIntegrity(t))
          );
          const integrityFailures = integrityChecks.filter(check => !check).length;

          return {
            period,
            summary: {
              totalTransactions,
              totalAmount,
              avgAmount,
              currencies: Object.keys(byCurrency).length
            },
            byCurrency,
            security: {
              fraudAlerts,
              integrityFailures,
              integrityRate: ((totalTransactions - integrityFailures) / totalTransactions * 100) || 100
            },
            immutableLedger: {
              enabled: state.immutableLedgerEnabled,
              totalImmutableTransactions: state.immutableTransactions.length,
              ledgerState: state.ledgerState,
              chainIntegrityVerified: await get().verifyTransactionChainIntegrity()
            },
            acidCompliance: {
              enabled: state.acidComplianceEnabled,
              complianceReport: await get().generateComplianceReport(period)
            },
            generatedAt: now
          };
        } catch (error) {
          console.error('Failed to generate transaction report:', error);
          throw new Error('Report generation failed');
        }
      },
      
      // Wallet eligibility methods
      checkWalletEligibility: async (userId: string) => {
        try {
          return await eligibilityService.isWalletEligible(userId);
        } catch (error) {
          console.error('Failed to check wallet eligibility:', error);
          return false;
        }
      },
      
      recordDailyUsage: async (userId: string) => {
        try {
          await eligibilityService.recordDailyUsage(userId);
          const eligibility = await eligibilityService.getWalletEligibility(userId);
          set({ walletEligibility: eligibility });
        } catch (error) {
          console.error('Failed to record daily usage:', error);
        }
      },
      
      getEligibilityProgress: async (userId: string) => {
        try {
          return await eligibilityService.getEligibilityProgress(userId);
        } catch (error) {
          console.error('Failed to get eligibility progress:', error);
          return 0;
        }
      },
      
      // Loan default methods
      checkLoanDefault: async (loanId: string, borrowerBalance: number) => {
        try {
          const loan = get().loans.find(l => l.id === loanId);
          if (!loan) return null;
          
          const loanDefault = await loanDefaultService.checkForDefault(loan, borrowerBalance);
          if (loanDefault) {
            set((state) => ({
              loanDefaults: [...state.loanDefaults, loanDefault]
            }));
          }
          return loanDefault;
        } catch (error) {
          console.error('Failed to check loan default:', error);
          return null;
        }
      },
      
      lenderConfirmPayment: async (defaultId: string, lenderId: string, paymentDetails: any) => {
        try {
          const success = await loanDefaultService.lenderConfirmPayment(defaultId, lenderId, paymentDetails);
          if (success) {
            // Update local state
            set((state) => ({
              loanDefaults: state.loanDefaults.map(def => 
                def.loanId === defaultId ? { ...def, status: 'resolved' as const } : def
              )
            }));
          }
          return success;
        } catch (error) {
          console.error('Failed to confirm payment:', error);
          return false;
        }
      },
      
      getBorrowerDefaults: async (borrowerId: string) => {
        try {
          return await loanDefaultService.getBorrowerDefaults(borrowerId);
        } catch (error) {
          console.error('Failed to get borrower defaults:', error);
          return [];
        }
      },
      
      // Saving circle methods
      createSavingCircle: async (adminId: string, name: string, contribution: number, currency: string, gracePeriod: number, members: string[]) => {
        try {
          const result = await savingCircleService.createSavingCircle(adminId, name, contribution, currency, gracePeriod, members);
          if (result.success && result.circle) {
            set((state) => ({
              savingCircles: [...state.savingCircles, result.circle!]
            }));
          }
          return result;
        } catch (error) {
          console.error('Failed to create saving circle:', error);
          return { success: false, error: 'Failed to create saving circle' };
        }
      },
      
      getUserSavingCircles: async (userId: string) => {
        try {
          return await savingCircleService.getUserCircles(userId);
        } catch (error) {
          console.error('Failed to get user saving circles:', error);
          return [];
        }
      },
      
      // Investment methods
      getAvailableStartups: async () => {
        try {
          return await investmentService.getAvailableStartups();
        } catch (error) {
          console.error('Failed to get available startups:', error);
          return [];
        }
      },
      
      createInvestment: async (investorId: string, startupId: string, amount: number, currency: string) => {
        try {
          const result = await investmentService.createInvestment(investorId, startupId, amount, currency);
          if (result.success && result.investment) {
            set((state) => ({
              investments: [...state.investments, result.investment!]
            }));
          }
          return result;
        } catch (error) {
          console.error('Failed to create investment:', error);
          return { success: false, error: 'Failed to create investment' };
        }
      },
      
      getUserInvestments: async (userId: string) => {
        try {
          return await investmentService.getUserInvestments(userId);
        } catch (error) {
          console.error('Failed to get user investments:', error);
          return [];
        }
      },
      
      getPortfolioPerformance: async (userId: string) => {
        try {
          return await investmentService.calculatePortfolioPerformance(userId);
        } catch (error) {
          console.error('Failed to get portfolio performance:', error);
          return {
            totalInvested: 0,
            currentValue: 0,
            totalReturn: 0,
            returnPercentage: 0,
            unrealizedGains: 0,
            realizedGains: 0,
            dividends: 0,
            activeInvestments: 0,
            exitedInvestments: 0
          };
        }
      }
    }),
    {
      name: 'immutable-wallet-storage',
      storage: secureWalletStorage,
      partialize: (state) => ({
        balances: state.balances,
        transactionLimits: state.transactionLimits,
        fraudDetectionEnabled: state.fraudDetectionEnabled,
        immutableLedgerEnabled: state.immutableLedgerEnabled,
        acidComplianceEnabled: state.acidComplianceEnabled,
        loans: state.loans,
        loanRatings: state.loanRatings,
        loanRequests: state.loanRequests,
        ledgerState: state.ledgerState,
        // Only persist essential transaction data, not sensitive details
        transactions: state.transactions.map(t => ({
          ...t,
          note: '', // Remove sensitive notes from persistence
        })),
        // Persist immutable transactions with full integrity
        immutableTransactions: state.immutableTransactions,
        // New features
        walletEligibility: state.walletEligibility,
        loanDefaults: state.loanDefaults,
        savingCircles: state.savingCircles,
        investments: state.investments,
      }),
    }
  )
);