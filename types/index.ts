export interface User {
  id: string;
  displayName: string;
  username: string;
  phoneNumber: string;
  profilePicture: string;
  bio?: string;
  workPlace?: string;
  placeOfWork?: string;
  isOnline?: boolean;
  lastSeen?: number;
  publicKey?: string;
  keyFingerprint?: string;

  workplace_id?: string;
  education_id?: string;
  location?: {
    latitude: number;
    longitude: number;
    content: string;
    redactedContent: string;
    category: DLPCategory;
    severity: 'low' | 'medium' | 'high' | 'critical';
    action: 'allowed' | 'warned' | 'blocked' | 'quarantined' | 'encrypted';
    timestamp: number;
    userId: string;
    chatId?: string;
    messageId?: string;
    attachmentId?: string;
    context: {
      messageType: 'text' | 'image' | 'video' | 'file' | 'voice';
      fileType?: string;
      startIndex: number;
      endIndex: number;
      confidence: number;
      category: DLPCategory;
    }

export interface DLPScanResult {
  allowed: boolean;
  violations: DLPViolation[];
  sanitizedContent?: string;
  warnings: string[];
  requiresUserConfirmation: boolean;
  suggestedAction: 'proceed' | 'encrypt' | 'redact' | 'block';
}

export interface DLPConfiguration {
  enabled: boolean;
  strictMode: boolean;
  autoQuarantine: boolean;
  userOverrideAllowed: boolean;
  encryptSensitiveData: boolean;
  logAllScans: boolean;
  realTimeScanning: boolean;
  attachmentScanning: boolean;
  ocrScanning: boolean; // OCR for images
  mlClassification: boolean;
  customPatterns: string[];
  whitelistedUsers: string[];
  exemptedChats: string[];
}

// ===== IMMUTABLE FINANCIAL LEDGER TYPES =====

// Core immutable transaction record with cryptographic integrity
export interface ImmutableTransaction {
  // Core transaction data
  id: string;
  senderId: string;
  receiverId: string;
  amount: number;
  currency: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  type: string;
  note: string;

  // Immutable ledger properties
  blockIndex: number; // Position in the blockchain-like structure
  previousTransactionHash: string; // Hash of previous transaction (blockchain concept)
  transactionHash: string; // SHA-256 hash of this transaction
  merkleRoot: string; // Merkle tree root for batch verification

  // Digital signature and cryptographic proof
  digitalSignature: TransactionDigitalSignature;
  cryptographicProof: CryptographicProof;

  // ACID compliance properties
  acidCompliance: ACIDComplianceRecord;

  // Audit and compliance
  auditTrail: TransactionAuditRecord[];
  complianceFlags: ComplianceFlag[];

  // Immutability guarantees
  immutabilityProof: ImmutabilityProof;
  chainIntegrityHash: string; // Hash that includes all previous transactions

  // Loan-related fields (if applicable)
  loanId?: string;
  isLoanPayment?: boolean;
  paymentNumber?: number;
  totalPayments?: number;

  // Advanced security
  antiTamperingSeal: AntiTamperingSeal;
  consensusValidation?: ConsensusValidation;
}

// Digital signature for transactions with multiple validation layers
export interface TransactionDigitalSignature {
  primarySignature: string; // Main transaction signature
  secondarySignature?: string; // Additional signature for high-value transactions
  signatureAlgorithm: 'ECDSA-P256' | 'RSA-2048' | 'Ed25519';
  publicKeyFingerprint: string;
  signatureTimestamp: number;
  signerDeviceId: string;
  biometricHash?: string; // Hash of biometric data used for signing
  multiSigRequired: boolean;
  multiSigSignatures?: MultiSignatureRecord[];
}

// Multi-signature support for high-value transactions
export interface MultiSignatureRecord {
  signerId: string;
  signature: string;
  publicKey: string;
  signatureTimestamp: number;
  signerRole: 'primary' | 'secondary' | 'witness' | 'compliance_officer';
  deviceFingerprint: string;
}

// Cryptographic proof of transaction integrity
export interface CryptographicProof {
  proofType: 'merkle_proof' | 'zero_knowledge_proof' | 'hash_chain_proof';
  proofData: string; // Base64 encoded proof
  verificationKey: string;
  proofTimestamp: number;
  proofAlgorithm: string;
  proofVersion: string;
  merkleProofPath?: MerkleProofPath[];
  hashChainValidation?: HashChainValidation;
}

// Merkle tree proof path for efficient verification
export interface MerkleProofPath {
  nodeHash: string;
  isLeftNode: boolean;
  level: number;
}

// Hash chain validation for sequential integrity
export interface HashChainValidation {
  previousHash: string;
  currentHash: string;
  nextHash?: string;
  chainPosition: number;
  chainValidationTimestamp: number;
}

// ACID compliance record ensuring database-level integrity
export interface ACIDComplianceRecord {
  // Atomicity - All or nothing transaction execution
  atomicity: {
    transactionId: string;
    allOperationsCompleted: boolean;
    rollbackCapable: boolean;
    atomicOperations: AtomicOperation[];
  };

  // Consistency - Database remains in valid state
  consistency: {
    preTransactionState: string; // Hash of state before transaction
    postTransactionState: string; // Hash of state after transaction
    consistencyRulesValidated: boolean;
    constraintViolations: string[];
  };

  // Isolation - Concurrent transactions don't interfere
  isolation: {
    isolationLevel: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
    lockAcquired: boolean;
    lockType: 'shared' | 'exclusive' | 'intent';
    concurrentTransactions: string[];
  };

  // Durability - Committed transactions survive system failures
  durability: {
    persistedToStorage: boolean;
    backupCreated: boolean;
    replicationConfirmed: boolean;
    durabilityTimestamp: number;
    storageLocations: string[];
  };

  acidValidationTimestamp: number;
  acidComplianceVersion: string;
}

// Individual atomic operation within a transaction
export interface AtomicOperation {
  operationId: string;
  operationType: 'debit' | 'credit' | 'balance_check' | 'limit_validation' | 'fraud_check';
  operationData: any;
  operationStatus: 'pending' | 'completed' | 'failed' | 'rolled_back';
  operationTimestamp: number;
  rollbackData?: any; // Data needed to rollback this operation
}

// Comprehensive audit record for regulatory compliance
export interface TransactionAuditRecord {
  auditId: string;
  auditType: 'creation' | 'validation' | 'signing' | 'completion' | 'verification' | 'compliance_check';
  auditTimestamp: number;
  auditorId: string; // System or user ID performing the audit
  auditData: any;
  auditResult: 'passed' | 'failed' | 'warning' | 'requires_review';
  auditNotes?: string;
  regulatoryCompliance: RegulatoryCompliance[];
  auditTrailHash: string; // Hash of this audit record for integrity
}

// Regulatory compliance tracking
export interface RegulatoryCompliance {
  regulation: 'PCI_DSS' | 'GDPR' | 'SOX' | 'AML' | 'KYC' | 'FATCA' | 'MiFID_II' | 'BASEL_III';
  complianceStatus: 'compliant' | 'non_compliant' | 'pending_review' | 'exempted';
  complianceTimestamp: number;
  complianceOfficer?: string;
  complianceNotes?: string;
  complianceEvidence?: string[]; // References to compliance documentation
}

// Compliance flags for automated monitoring
export interface ComplianceFlag {
  flagType: 'aml_suspicious' | 'high_value' | 'cross_border' | 'frequent_transactions' | 'unusual_pattern';
  flagSeverity: 'low' | 'medium' | 'high' | 'critical';
  flagTimestamp: number;
  flagDescription: string;
  flagStatus: 'active' | 'resolved' | 'false_positive' | 'under_investigation';
  flaggedBy: 'system' | 'compliance_officer' | 'external_authority';
  resolutionNotes?: string;
  resolutionTimestamp?: number;
}

// Immutability proof ensuring transaction cannot be altered
export interface ImmutabilityProof {
  immutabilityHash: string; // Cryptographic hash proving immutability
  timestampProof: TimestampProof;
  witnessSignatures: WitnessSignature[];
  blockchainAnchor?: BlockchainAnchor; // Optional blockchain anchoring
  immutabilityVersion: string;
  immutabilityAlgorithm: string;
}

// Cryptographic timestamp proof
export interface TimestampProof {
  timestamp: number;
  timestampAuthority: string; // Trusted timestamp authority
  timestampSignature: string;
  timestampCertificate: string;
  nonce: string; // Prevents replay attacks
}

// Witness signatures for additional validation
export interface WitnessSignature {
  witnessId: string;
  witnessType: 'system' | 'human' | 'external_authority' | 'smart_contract';
  signature: string;
  witnessTimestamp: number;
  witnessPublicKey: string;
}

// Blockchain anchoring for ultimate immutability
export interface BlockchainAnchor {
  blockchainNetwork: 'bitcoin' | 'ethereum' | 'hyperledger' | 'private_chain';
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  confirmations: number;
  anchoringTimestamp: number;
  anchoringCost?: number;
}

// Anti-tampering seal with multiple validation layers
export interface AntiTamperingSeal {
  sealId: string;
  sealType: 'cryptographic' | 'hardware' | 'biometric' | 'multi_factor';
  sealData: string; // Encrypted seal data
  sealTimestamp: number;
  sealValidationMethod: string;
  tamperEvidence: TamperEvidence[];
  sealIntegrityHash: string;
}

// Evidence of tampering attempts
export interface TamperEvidence {
  evidenceId: string;
  evidenceType: 'hash_mismatch' | 'signature_invalid' | 'timestamp_anomaly' | 'unauthorized_access';
  evidenceTimestamp: number;
  evidenceData: any;
  evidenceSeverity: 'low' | 'medium' | 'high' | 'critical';
  evidenceSource: string;
}

// Consensus validation for distributed systems
export interface ConsensusValidation {
  consensusAlgorithm: 'proof_of_work' | 'proof_of_stake' | 'practical_byzantine_fault_tolerance';
  consensusParticipants: string[];
  consensusResult: 'accepted' | 'rejected' | 'pending';
  consensusTimestamp: number;
  consensusProof: string;
  consensusConfidence: number; // 0-1 confidence score
}

// Immutable ledger state for the entire wallet
export interface ImmutableLedgerState {
  ledgerId: string;
  ledgerVersion: string;
  totalTransactions: number;
  ledgerHash: string; // Hash of entire ledger state
  lastTransactionHash: string;
  merkleTreeRoot: string;
  ledgerTimestamp: number;
  ledgerIntegrityProof: LedgerIntegrityProof;
  consensusState?: ConsensusState;
}

// Proof of ledger integrity
export interface LedgerIntegrityProof {
  proofId: string;
  proofType: 'merkle_tree' | 'hash_chain' | 'cryptographic_accumulator';
  proofData: string;
  proofTimestamp: number;
  validationNodes: ValidationNode[];
  integrityScore: number; // 0-1 integrity confidence
}

// Validation nodes for distributed verification
export interface ValidationNode {
  nodeId: string;
  nodeType: 'primary' | 'secondary' | 'witness' | 'external';
  nodePublicKey: string;
  validationSignature: string;
  validationTimestamp: number;
  nodeReputation: number; // 0-1 reputation score
}

// Consensus state for distributed ledger
export interface ConsensusState {
  currentEpoch: number;
  consensusLeader?: string;
  participatingNodes: string[];
  consensusHealth: number; // 0-1 health score
  lastConsensusTimestamp: number;
}

// ===== FINE-GRAINED ACCESS CONTROL (ABAC) TYPES =====

// Attribute-Based Access Control (ABAC) for fine-grained permissions
export interface ABACPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number; // Higher priority policies override lower ones
  effect: 'allow' | 'deny';
  conditions: ABACCondition[];
  resources: ABACResource[];
  actions: ABACAction[];
  subjects: ABACSubject[];
  context: ABACContext;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

// Enhanced ABAC Condition with advanced types
export interface ABACCondition {
  id: string;
  type: 'attribute_match' | 'time_based' | 'location_based' | 'device_based' | 'relationship_based' | 'content_based' | 'group_role_based' | 'behavioral_pattern' | 'risk_based' | 'temporal_pattern' | 'social_context' | 'ml_based';
  attribute: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'regex_match' | 'fuzzy_match' | 'semantic_match';
  value: any;
  description: string;
  // Enhanced fields
  weight?: number; // Weight of this condition in decision making
  confidence?: number; // Confidence level of condition evaluation
  dynamic?: boolean; // Whether this condition can be dynamically adjusted
  metadata?: Record<string, any>; // Additional metadata for condition
}

export interface ABACResource {
  type: 'conversation' | 'group_chat' | 'channel' | 'message' | 'media' | 'personal_data' | 'financial_data' | 'profile' | 'settings';
  identifier: string; // Resource ID or pattern
  attributes: Record<string, any>;
}

export interface ABACAction {
  type: 'read' | 'write' | 'delete' | 'share' | 'download' | 'forward' | 'edit' | 'admin' | 'moderate' | 'invite' | 'remove' | 'mute' | 'ban';
  scope: 'self' | 'direct' | 'group' | 'public' | 'admin';
  attributes: Record<string, any>;
}

export interface ABACSubject {
  type: 'user' | 'group' | 'role' | 'device' | 'application';
  identifier: string;
  attributes: Record<string, any>;
}

// Enhanced ABAC Context with comprehensive attributes
export interface ABACContext {
  // Time-based context
  timeOfDay?: { start: string; end: string }; // HH:MM format
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  currentTime?: {
    hour: number;
    dayOfWeek: number;
    timestamp: number;
  };

  // Location context
  location?: {
    allowedCountries?: string[];
    blockedCountries?: string[];
    allowedRegions?: string[];
    blockedRegions?: string[];
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };

  // Device security context
  deviceSecurity?: {
    minimumSecurityLevel: 'low' | 'medium' | 'high' | 'maximum';
    requireBiometric?: boolean;
    requireE2EE?: boolean;
    trustLevel?: 'unknown' | 'low' | 'medium' | 'high' | 'verified';
    complianceFlags?: string[];
    biometricEnabled?: boolean;
    deviceFingerprint?: string;
  };

  // Network security context
  networkSecurity?: {
    allowedNetworks?: string[];
    blockedNetworks?: string[];
    requireVPN?: boolean;
    networkType?: 'wifi' | 'cellular' | 'vpn' | 'unknown';
    encryptionLevel?: 'none' | 'low' | 'medium' | 'high';
    trustLevel?: 'untrusted' | 'limited' | 'trusted' | 'verified';
  };

  // Content sensitivity context
  contentSensitivity?: {
    maxSensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
    dlpRequired?: boolean;
    dataClassification?: string;
    retentionPolicy?: string;
  };

  // Enhanced context fields
  userBehavior?: {
    averageSessionDuration?: number;
    typicalActiveHours?: number[];
    typicalActiveDays?: number[];
    riskScore?: number;
    anomalyScore?: number;
    recentActivity?: any[];
  };

  resourceSensitivity?: {
    sensitivityLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
    dataClassification?: string;
    accessHistory?: any[];
    ownershipInfo?: any;
  };

  sessionContext?: {
    sessionDuration?: number;
    biometricVerified?: boolean;
    deviceVerified?: boolean;
    locationVerified?: boolean;
    sessionId?: string;
    lastActivity?: number;
  };

  // Social context
  socialContext?: {
    relationshipLevel?: 'none' | 'acquaintance' | 'friend' | 'close_friend' | 'family';
    mutualConnections?: number;
    trustScore?: number;
    interactionHistory?: any[];
  };

  // Risk context
  riskContext?: {
    riskScore?: number;
    fraudIndicators?: string[];
    anomalyFlags?: string[];
    threatLevel?: 'low' | 'medium' | 'high' | 'critical';
  };

  // Additional context
  [key: string]: any;
}

// Enhanced Access Control Decision
export interface ABACDecision {
  decision: 'allow' | 'deny' | 'conditional';
  appliedPolicies: string[]; // Policy IDs that were evaluated
  reason: string;
  conditions?: ABACCondition[]; // Additional conditions for 'conditional' decisions
  timestamp: number;
  evaluationTime: number; // Time taken to evaluate in milliseconds
  warnings?: string[];
  // Enhanced fields
  riskScore?: number; // Risk score for the decision
  contextualFactors?: string[]; // Factors that influenced the decision
  confidence?: number; // Confidence level of the decision (0-1)
  policyConflicts?: string[]; // Any policy conflicts that were resolved
  dynamicAdjustments?: string[]; // Dynamic adjustments applied
}

// Access Control Request
export interface ABACRequest {
  subject: ABACSubject;
  action: ABACAction;
  resource: ABACResource;
  context: ABACContext;
  timestamp: number;
  requestId: string;
}

// Role-Based Access Control (RBAC) for group management
export interface RBACRole {
  id: string;
  name: string;
  description: string;
  permissions: RBACPermission[];
  isSystemRole: boolean; // Cannot be deleted or modified
  groupId?: string; // Specific to a group, or global if undefined
  createdAt: number;
  updatedAt: number;
}

export interface RBACPermission {
  id: string;
  resource: 'messages' | 'media' | 'members' | 'settings' | 'moderation' | 'administration';
  actions: string[]; // e.g., ['read', 'write', 'delete']
  scope: 'self' | 'group' | 'all';
  conditions?: RBACCondition[];
}

export interface RBACCondition {
  type: 'time_based' | 'content_based' | 'member_count' | 'message_frequency';
  parameters: Record<string, any>;
}

// User Role Assignment
export interface UserRoleAssignment {
  userId: string;
  roleId: string;
  groupId?: string; // Group-specific role assignment
  assignedBy: string;
  assignedAt: number;
  expiresAt?: number;
  isActive: boolean;
}

// Self-Destruct Messages (Temporary Messages)
export interface SelfDestructMessage {
  messageId: string;
  chatId: string;
  senderId: string;
  expirationPolicy: ExpirationPolicy;
  createdAt: number;
  expiresAt: number;
  viewedBy: MessageView[];
  isExpired: boolean;
  destructionMethod: 'delete' | 'redact' | 'encrypt_permanently' | 'secure_wipe';
  destructionProof?: DestructionProof;
  selfDestructTimer?: SelfDestructTimer;
  securityLevel: 'standard' | 'high' | 'maximum';
  forensicProtection: boolean;
  antiScreenshotProtection: boolean;
  deviceBindingRequired: boolean;
}

// Legacy support
export interface ExpiringMessage extends SelfDestructMessage { }

export interface ExpirationPolicy {
  type: 'time_based' | 'view_based' | 'download_based' | 'forward_based' | 'screenshot_based' | 'interaction_based' | 'location_based' | 'device_based';
  duration?: number; // Milliseconds for time-based
  maxViews?: number; // For view-based
  maxDownloads?: number; // For download-based
  maxForwards?: number; // For forward-based
  maxInteractions?: number; // For interaction-based
  allowScreenshots?: boolean;
  allowCopy?: boolean;
  allowSave?: boolean;
  allowForward?: boolean;
  allowReply?: boolean;
  notifyOnView?: boolean;
  notifyOnExpiration?: boolean;
  notifyOnAttemptedScreenshot?: boolean;
  notifyOnAttemptedCopy?: boolean;
  cascadeToReplies?: boolean; // Apply same policy to replies
  requireBiometricToView?: boolean;
  requireDeviceVerification?: boolean;
  allowedDevices?: string[]; // Device IDs that can view
  allowedLocations?: GeofenceArea[]; // Geographic restrictions
  emergencyExtension?: EmergencyExtension;
  autoDestructOnSuspiciousActivity?: boolean;
}

export interface SelfDestructTimer {
  timerId: string;
  messageId: string;
  startTime: number;
  duration: number;
  remainingTime: number;
  isActive: boolean;
  isPaused: boolean;
  pauseReason?: 'user_request' | 'emergency' | 'security_incident' | 'system_maintenance';
  pausedAt?: number;
  resumedAt?: number;
  warningIntervals: number[]; // Times to show warnings (in seconds before expiration)
  lastWarningShown?: number;
  destructionScheduled: boolean;
  destructionExecutedAt?: number;
  timerType: 'countdown' | 'scheduled' | 'conditional';
  conditions?: TimerCondition[];
  securityEvents: TimerSecurityEvent[];
  forensicLog: TimerForensicEvent[];
}

export interface TimerCondition {
  type: 'view_count' | 'device_change' | 'location_change' | 'suspicious_activity' | 'biometric_failure' | 'network_change';
  threshold?: number;
  description: string;
  isMet: boolean;
  metAt?: number;
  metadata?: Record<string, any>;
}

export interface TimerSecurityEvent {
  eventId: string;
  eventType: 'timer_started' | 'timer_paused' | 'timer_resumed' | 'timer_extended' | 'timer_accelerated' | 'suspicious_access' | 'screenshot_attempt' | 'copy_attempt' | 'unauthorized_device';
  timestamp: number;
  deviceId: string;
  userId?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionTaken?: string;
}

export interface TimerForensicEvent {
  eventId: string;
  timestamp: number;
  eventType: 'access' | 'view' | 'interaction' | 'security_violation' | 'destruction';
  userId: string;
  deviceId: string;
  ipAddress?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  biometricVerified: boolean;
  deviceFingerprint: string;
  sessionId: string;
  evidence: {
    screenshots?: string[];
    deviceInfo: Record<string, any>;
    networkInfo: Record<string, any>;
    behaviorMetrics: Record<string, any>;
  };
  integrityHash: string;
}

export interface GeofenceArea {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  allowInside: boolean; // true = allow inside, false = allow outside
}

export interface EmergencyExtension {
  enabled: boolean;
  maxExtensions: number;
  extensionDuration: number; // milliseconds
  requiresApproval: boolean;
  approverIds?: string[];
  emergencyContacts?: string[];
  reason?: string;
  requestedAt?: number;
  approvedAt?: number;
  approvedBy?: string;
}

export interface MessageView {
  viewId: string;
  userId: string;
  viewedAt: number;
  viewDuration?: number; // How long the message was viewed
  deviceId: string;
  deviceFingerprint: string;
  ipAddress?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  screenshotDetected?: boolean;
  screenshotAttempts?: number;
  copyDetected?: boolean;
  copyAttempts?: number;
  forwardAttempted?: boolean;
  saveAttempted?: boolean;
  biometricVerified: boolean;
  sessionId: string;
  viewMethod: 'normal' | 'notification_preview' | 'widget' | 'background_sync';
  securityFlags: string[];
  suspiciousActivity: boolean;
  interactionMetrics: {
    scrollEvents: number;
    tapEvents: number;
    longPressEvents: number;
    focusTime: number;
    backgroundTime: number;
  };
  destructionTriggered?: boolean;
  destructionReason?: string;
}

export interface DestructionProof {
  proofId: string;
  messageId: string;
  destructionTimestamp: number;
  method: 'delete' | 'redact' | 'encrypt_permanently' | 'secure_wipe' | 'forensic_destruction';
  cryptographicProof: string; // Hash or signature proving destruction
  witnessNodes?: string[]; // Distributed witnesses
  auditTrail: DestructionAuditEvent[];
  secureWipeDetails?: SecureWipeDetails;
  verificationHash: string;
  blockchainAnchor?: BlockchainAnchor;
  complianceRecord: DestructionComplianceRecord;
  forensicEvidence: ForensicDestructionEvidence;
}

export interface DestructionAuditEvent {
  eventId: string;
  timestamp: number;
  action: 'initiated' | 'in_progress' | 'completed' | 'failed' | 'verified';
  performedBy: 'system' | 'user' | 'admin' | 'emergency_protocol';
  details: Record<string, any>;
  verificationSignature: string;
}

export interface SecureWipeDetails {
  algorithm: 'DoD_5220.22-M' | 'Gutmann' | 'Random_Overwrite' | 'Zero_Fill' | 'Custom';
  passes: number;
  verificationPasses: number;
  storageLocations: string[];
  cacheLocations: string[];
  backupLocations: string[];
  wipeStartTime: number;
  wipeEndTime: number;
  wipeSuccess: boolean;
  residualDataCheck: boolean;
  residualDataFound: boolean;
}

export interface DestructionComplianceRecord {
  regulations: string[]; // GDPR, CCPA, HIPAA, etc.
  retentionPolicyCompliant: boolean;
  legalHoldStatus: 'none' | 'active' | 'released';
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  destructionApproval?: {
    approvedBy: string;
    approvalTimestamp: number;
    approvalReason: string;
  };
  complianceOfficerNotified: boolean;
  auditLogPreserved: boolean;
}

export interface ForensicDestructionEvidence {
  preDestructionHash: string;
  postDestructionHash: string;
  destructionWitnesses: string[];
  forensicImages?: string[]; // Before/after forensic images
  chainOfCustody: ChainOfCustodyRecord[];
  integrityVerification: boolean;
  tamperEvidence: TamperEvidence[];
}

export interface ChainOfCustodyRecord {
  recordId: string;
  timestamp: number;
  custodian: string;
  action: 'created' | 'accessed' | 'modified' | 'transferred' | 'destroyed';
  location: string;
  witness?: string;
  digitalSignature: string;
  integrityHash: string;
}

// Group Chat Access Control
export interface GroupChatAccessControl {
  groupId: string;
  accessLevel: 'public' | 'private' | 'secret' | 'restricted';
  joinPolicy: 'open' | 'invite_only' | 'admin_approval' | 'member_approval';
  membershipRules: MembershipRule[];
  contentPolicies: ContentPolicy[];
  moderationSettings: ModerationSettings;
  privacySettings: GroupPrivacySettings;
  expirationSettings?: GroupExpirationSettings;
}

export interface MembershipRule {
  id: string;
  type: 'whitelist' | 'blacklist' | 'domain_restriction' | 'location_restriction' | 'verification_requirement';
  criteria: Record<string, any>;
  enabled: boolean;
  priority: number;
}

export interface ContentPolicy {
  id: string;
  name: string;
  type: 'message_content' | 'media_sharing' | 'file_sharing' | 'link_sharing' | 'forward_restriction';
  rules: ContentRule[];
  enforcement: 'warn' | 'block' | 'moderate' | 'auto_delete';
  enabled: boolean;
}

export interface ContentRule {
  pattern: string;
  type: 'regex' | 'keyword' | 'ml_classification' | 'file_type' | 'file_size';
  action: 'allow' | 'deny' | 'review';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ModerationSettings {
  autoModeration: boolean;
  humanModeration: boolean;
  moderatorRoles: string[]; // Role IDs that can moderate
  escalationRules: EscalationRule[];
  appealProcess: boolean;
  moderationLog: boolean;
}

export interface EscalationRule {
  trigger: 'repeated_violations' | 'high_severity' | 'member_reports' | 'automated_detection';
  threshold: number;
  action: 'warn' | 'mute' | 'restrict' | 'remove' | 'ban';
  duration?: number; // For temporary actions
  notifyAdmins: boolean;
}

export interface GroupPrivacySettings {
  memberListVisible: 'all' | 'admins_only' | 'members_only' | 'none';
  messageHistory: 'full' | 'limited' | 'none'; // For new members
  searchable: boolean;
  inviteLinks: boolean;
  memberInvites: boolean;
  mediaAutoDownload: 'always' | 'wifi_only' | 'never';
  readReceipts: 'enabled' | 'disabled' | 'admin_only';
  lastSeen: 'enabled' | 'disabled' | 'contacts_only';
}

export interface GroupExpirationSettings {
  enabled: boolean;
  defaultMessageExpiration?: number; // Default expiration for all messages
  allowMemberOverride: boolean;
  maxExpirationTime?: number; // Maximum allowed expiration time
  minExpirationTime?: number; // Minimum required expiration time
  inheritFromParent?: boolean; // For sub-groups
}

// Personal Data Access Control
export interface PersonalDataAccessControl {
  userId: string;
  dataCategories: DataCategoryAccess[];
  sharingPreferences: SharingPreferences;
  privacyLevel: 'minimal' | 'balanced' | 'open' | 'custom';
  consentRecords: ConsentRecord[];
  dataRetentionPolicies: DataRetentionPolicy[];
}

export interface DataCategoryAccess {
  category: 'profile' | 'contacts' | 'location' | 'media' | 'messages' | 'financial' | 'biometric' | 'device_info';
  accessLevel: 'private' | 'contacts_only' | 'friends_only' | 'public';
  allowedActions: string[];
  restrictions: DataRestriction[];
  auditRequired: boolean;
}

export interface SharingPreferences {
  profilePicture: 'everyone' | 'contacts' | 'friends' | 'nobody';
  phoneNumber: 'everyone' | 'contacts' | 'friends' | 'nobody';
  lastSeen: 'everyone' | 'contacts' | 'friends' | 'nobody';
  onlineStatus: 'everyone' | 'contacts' | 'friends' | 'nobody';
  readReceipts: 'everyone' | 'contacts' | 'friends' | 'nobody';
  groupMembership: 'everyone' | 'contacts' | 'friends' | 'nobody';
  forwardedMessages: 'allow' | 'restrict' | 'block';
  mediaAutoSave: 'always' | 'contacts_only' | 'never';
}

export interface ConsentRecord {
  id: string;
  dataCategory: string;
  purpose: string;
  consentGiven: boolean;
  consentTimestamp: number;
  expiresAt?: number;
  withdrawnAt?: number;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  processingActivities: string[];
}

export interface DataRetentionPolicy {
  id: string;
  dataType: string;
  retentionPeriod: number; // In milliseconds
  deletionMethod: 'soft_delete' | 'hard_delete' | 'anonymize' | 'encrypt_permanently';
  exceptions: string[]; // Legal or business reasons to retain longer
  automaticDeletion: boolean;
  userNotification: boolean;
}

export interface DataRestriction {
  type: 'geographic' | 'temporal' | 'purpose' | 'recipient' | 'method';
  parameters: Record<string, any>;
  enforcement: 'strict' | 'advisory';
}

// Access Control Audit
export interface AccessControlAudit {
  id: string;
  requestId: string;
  userId: string;
  action: string;
  resource: string;
  decision: 'allow' | 'deny' | 'conditional';
  policies: string[]; // Applied policy IDs
  timestamp: number;
  ipAddress?: string;
  deviceId?: string;
  userAgent?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  riskScore?: number;
  anomalyDetected?: boolean;
  sessionId?: string;
}

// ===== WALLET ELIGIBILITY AND LENDING TYPES =====

// Wallet eligibility tracking
export interface WalletEligibility {
  userId: string;
  isEligible: boolean;
  eligibilityDate?: number; // When they became eligible
  dailyUsageStreak: number; // Current consecutive days of usage
  totalDaysUsed: number; // Total days the app has been used
  firstUsageDate: number; // When they first used the app
  lastUsageDate: number; // Last time they used the app
  eligibilityRequirement: {
    minimumDays: number; // 14 days
    consecutiveRequired: boolean; // false - just daily usage
  };
  usageHistory: DailyUsageRecord[];
}

export interface DailyUsageRecord {
  date: string; // YYYY-MM-DD format
  timestamp: number;
  activityCount: number; // Number of activities that day
  lastActivity: number; // Last activity timestamp
}

// Enhanced loan system with default management
export interface LoanDefault {
  loanId: string;
  borrowerId: string;
  lenderId: string;
  defaultDate: number;
  gracePeriodEnd: number;
  amount: number;
  currency: string;
  status: 'active' | 'resolved' | 'disputed';
  reminders: DefaultReminder[];
  resolution?: DefaultResolution;
  visibilitySettings: {
    visibleToLenders: boolean;
    visibleFromDate: number;
    canBeRemoved: boolean;
    removalEligibleDate: number; // 3 days after default
  };
}

export interface DefaultReminder {
  id: string;
  loanId: string;
  reminderDate: number;
  reminderType: 'pre_debit' | 'grace_period' | 'default_notice';
  sent: boolean;
  sentAt?: number;
  method: 'in_app' | 'push_notification' | 'email';
}

export interface DefaultResolution {
  resolvedAt: number;
  resolvedBy: 'lender_confirmation' | 'lender_removal' | 'payment_received' | 'dispute_resolution';
  resolverUserId: string;
  notes?: string;
  paymentConfirmation?: {
    amount: number;
    currency: string;
    paymentDate: number;
    method: string;
  };
}

// Startup investment types
export interface Startup {
  id: string;
  name: string;
  description: string;
  industry: string;
  foundedYear: number;
  founders: StartupFounder[];
  businessModel: string;
  marketPosition: string;
  mission: string;
  vision: string;
  headquarters: string;
  employeeCount: string;
  website?: string;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  logo: string;
  coverImage: string;
  tags: string[];
  status: 'active' | 'paused' | 'closed' | 'ipo' | 'acquired';
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  minimumInvestment: number;
  maximumInvestment?: number;
  targetFunding: number;
  currentFunding: number;
  investorCount: number;
  valuationHistory: StartupValuation[];
  financialDocuments: FinancialDocument[];
  investmentTerms: InvestmentTerms;
  performanceMetrics: StartupPerformanceMetrics;
  createdAt: number;
  updatedAt: number;
}

export interface StartupFounder {
  id: string;
  name: string;
  role: string;
  bio: string;
  profilePicture: string;
  linkedin?: string;
  twitter?: string;
  previousExperience: string[];
  education: string[];
}

export interface StartupValuation {
  id: string;
  startupId: string;
  valuation: number;
  currency: string;
  valuationDate: number;
  valuationMethod: 'revenue_multiple' | 'dcf' | 'comparable_companies' | 'asset_based' | 'venture_capital';
  valuationRound?: string; // Seed, Series A, B, etc.
  leadInvestor?: string;
  notes?: string;
}

export interface FinancialDocument {
  id: string;
  startupId: string;
  documentType: 'financial_statement' | 'pitch_deck' | 'business_plan' | 'valuation_report' | 'audit_report' | 'tax_return';
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadDate: number;
  fiscalYear?: number;
  quarter?: number;
  isPublic: boolean;
  accessLevel: 'public' | 'investors_only' | 'accredited_only' | 'private';
  documentHash: string; // For integrity verification
}

export interface InvestmentTerms {
  startupId: string;
  securityType: 'equity' | 'convertible_note' | 'safe' | 'revenue_share' | 'debt';
  equityPercentage?: number;
  conversionTerms?: {
    discountRate?: number;
    valuationCap?: number;
    interestRate?: number;
    maturityDate?: number;
  };
  dividendRights: boolean;
  votingRights: boolean;
  liquidationPreference: number; // Multiple (e.g., 1x, 2x)
  antiDilutionProvision: 'none' | 'weighted_average' | 'full_ratchet';
  boardSeats?: number;
  informationRights: boolean;
  tagAlongRights: boolean;
  dragAlongRights: boolean;
  lockupPeriod?: number; // In months
  minimumHoldingPeriod?: number; // In months
}

export interface StartupPerformanceMetrics {
  startupId: string;
  revenue: MonthlyMetric[];
  users: MonthlyMetric[];
  growth: MonthlyMetric[];
  expenses: MonthlyMetric[];
  burnRate: MonthlyMetric[];
  runway: MonthlyMetric[]; // In months
  keyMetrics: {
    [metricName: string]: MonthlyMetric[];
  };
  lastUpdated: number;
}

export interface MonthlyMetric {
  month: string; // YYYY-MM format
  value: number;
  currency?: string;
  notes?: string;
}

export interface Investment {
  id: string;
  investorId: string;
  startupId: string;
  amount: number;
  currency: string;
  investmentDate: number;
  securityType: 'equity' | 'convertible_note' | 'safe' | 'revenue_share' | 'debt';
  equityPercentage?: number;
  sharePrice?: number;
  numberOfShares?: number;
  status: 'pending' | 'confirmed' | 'active' | 'exited' | 'written_off';
  investmentTerms: InvestmentTerms;
  documents: InvestmentDocument[];
  performanceTracking: InvestmentPerformance[];
  exitDetails?: InvestmentExit;
  createdAt: number;
  updatedAt: number;
}

export interface InvestmentDocument {
  id: string;
  investmentId: string;
  documentType: 'investment_agreement' | 'share_certificate' | 'convertible_note' | 'safe_agreement' | 'amendment';
  title: string;
  fileUrl: string;
  fileName: string;
  signedDate?: number;
  isExecuted: boolean;
  signatories: DocumentSignatory[];
  documentHash: string;
}

export interface DocumentSignatory {
  userId: string;
  role: 'investor' | 'startup' | 'witness' | 'legal_counsel';
  signedAt?: number;
  digitalSignature?: string;
  ipAddress?: string;
}

export interface InvestmentPerformance {
  id: string;
  investmentId: string;
  reportDate: number;
  currentValuation: number;
  currency: string;
  returnOnInvestment: number; // Percentage
  unrealizedGain: number;
  realizedGain?: number;
  dividendsReceived: number;
  totalReturn: number;
  performanceNotes?: string;
  marketComparables?: {
    industryAverage: number;
    marketIndex: number;
    peerComparison: number;
  };
}

export interface InvestmentExit {
  exitDate: number;
  exitType: 'ipo' | 'acquisition' | 'merger' | 'buyback' | 'liquidation' | 'write_off';
  exitValuation: number;
  currency: string;
  exitPrice: number;
  totalReturn: number;
  returnMultiple: number;
  irr: number; // Internal Rate of Return
  exitNotes?: string;
  acquirer?: string;
  publicTicker?: string;
}

// Saving Circle (Jameya) types
export interface SavingCircle {
  id: string;
  name: string;
  adminId: string;
  members: CircleMember[];
  monthlyContribution: number;
  currency: string;
  totalMembers: number;
  currentCycle: number;
  totalCycles: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  gracePeriod: number; // In days
  createdAt: number;
  startDate?: number;
  endDate?: number;
  rules: CircleRules;
  payoutHistory: CirclePayout[];
  currentMonthPayout?: CirclePayout;
  nextDrawDate?: number;
  immutableSettings: CircleImmutableSettings;
}

export interface CircleMember {
  userId: string;
  displayName: string;
  phoneNumber: string;
  profilePicture: string;
  joinedAt: number;
  status: 'invited' | 'approved' | 'active' | 'defaulted' | 'removed';
  hasReceivedPayout: boolean;
  payoutReceivedAt?: number;
  payoutAmount?: number;
  contributionHistory: CircleContribution[];
  defaultHistory: CircleDefault[];
  invitationResponse?: {
    respondedAt: number;
    accepted: boolean;
    message?: string;
  };
}

export interface CircleRules {
  autoDebitEnabled: boolean;
  debitDate: number; // Day of month (1-31)
  gracePeriodDays: number;
  defaultAction: 'remove_member' | 'replace_member' | 'pause_circle';
  allowEarlyExit: boolean;
  earlyExitPenalty?: number;
  requireUnanimousDecisions: boolean;
  allowMemberInvites: boolean;
  maxMissedPayments: number;
}

export interface CircleImmutableSettings {
  monthlyContribution: number;
  currency: string;
  totalMembers: number;
  gracePeriod: number;
  memberList: string[]; // User IDs - immutable after start
  createdAt: number;
  settingsHash: string; // Hash to verify immutability
}

export interface CircleContribution {
  id: string;
  circleId: string;
  memberId: string;
  amount: number;
  currency: string;
  dueDate: number;
  paidDate?: number;
  status: 'pending' | 'paid' | 'overdue' | 'defaulted';
  cycle: number;
  month: number;
  transactionId?: string;
  lateFee?: number;
  remindersSent: number;
  lastReminderSent?: number;
}

export interface CirclePayout {
  id: string;
  circleId: string;
  cycle: number;
  month: number;
  winnerId: string;
  winnerName: string;
  amount: number;
  currency: string;
  drawDate: number;
  payoutDate?: number;
  status: 'drawn' | 'paid' | 'pending';
  drawMethod: 'random' | 'manual' | 'predetermined';
  eligibleMembers: string[]; // Members eligible for this draw
  transactionId?: string;
  drawWitnesses: string[]; // Members who witnessed the draw
  drawProof: {
    randomSeed: string;
    algorithm: string;
    timestamp: number;
    hash: string;
  };
}

export interface CircleDefault {
  id: string;
  circleId: string;
  memberId: string;
  contributionId: string;
  defaultDate: number;
  amount: number;
  currency: string;
  gracePeriodEnd: number;
  status: 'active' | 'resolved' | 'member_removed';
  adminAction?: {
    action: 'remove_member' | 'replace_member' | 'extend_grace' | 'manual_payment';
    actionDate: number;
    actionBy: string;
    notes?: string;
  };
  resolution?: {
    resolvedAt: number;
    method: 'payment_received' | 'member_removed' | 'circle_cancelled';
    notes?: string;
  };
}

export interface CircleInvitation {
  id: string;
  circleId: string;
  circleName: string;
  adminId: string;
  adminName: string;
  invitedUserId: string;
  invitedPhoneNumber: string;
  monthlyContribution: number;
  currency: string;
  totalMembers: number;
  gracePeriod: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  sentAt: number;
  respondedAt?: number;
  expiresAt: number;
  message?: string;
  response?: {
    accepted: boolean;
    message?: string;
    respondedAt: number;
  };
}

// Gift system for social media
export interface Gift {
  id: string;
  type: 'virtual' | 'money';
  name: string;
  description?: string;
  icon: string;
  animation?: string;
  value?: number; // For money gifts
  currency?: string; // For money gifts
  category: 'sticker' | 'emoji' | 'animation' | 'money' | 'premium';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  cost?: number; // Cost to purchase (for premium gifts)
  isActive: boolean;
  createdAt: number;
}

export interface PostGift {
  id: string;
  giftId: string;
  gift: Gift;
  postId?: string;
  clipId?: string;
  audioPostId?: string;
  senderId: string;
  senderName: string;
  senderProfilePicture: string;
  receiverId: string;
  receiverName: string;
  amount?: number; // For money gifts
  currency?: string; // For money gifts
  message?: string;
  isAnonymous: boolean;
  timestamp: number;
  status: 'sent' | 'received' | 'pending' | 'failed';
  transactionId?: string; // For money gifts
  visibility: 'public' | 'private' | 'friends_only';
  giftAnimation?: {
    animationType: string;
    duration: number;
    effects: string[];
  };
}

export interface GiftTransaction {
  id: string;
  giftId: string;
  senderId: string;
  receiverId: string;
  postId?: string;
  clipId?: string;
  audioPostId?: string;
  amount: number;
  currency: string;
  timestamp: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  transactionFee?: number;
  exchangeRate?: number;
  isAnonymous: boolean;
  giftMessage?: string;
  refundReason?: string;
  refundedAt?: number;
}

// Audio/Voice posts (Social Audio like Clubhouse)
export interface AudioPost {
  id: string;
  userId: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    profilePicture: string;
  };
  title: string;
  description?: string;
  audioUrl: string;
  duration: number; // in seconds
  waveform?: number[]; // Audio waveform data for visualization
  transcript?: string; // Auto-generated or manual transcript
  language?: string;
  topics: string[];
  hashtags: string[];
  mentions: string[];
  likes: number;
  comments: number;
  shares: number;
  plays: number;
  timestamp: number;
  isLive?: boolean;
  liveListeners?: number;
  maxListeners?: number;
  scheduledFor?: number;
  endedAt?: number;
  type: 'solo' | 'conversation' | 'interview' | 'story' | 'live_room';
  participants?: AudioParticipant[];
  roomSettings?: AudioRoomSettings;
  isLiked?: boolean;
  isSaved?: boolean;
  isFollowing?: boolean;
  // Enhanced for feed ranking
  recommendationScore?: number;
  recommendationReasons?: string[];
  personalizedRanking?: number;
  socialContext?: PostSocialContext;
  engagementMetrics?: AudioEngagementMetrics;
  contentVector?: number[];
  extractedTopics?: string[];
  qualityScore?: number;
  // Gifts
  gifts?: PostGift[];
  totalGiftValue?: number;
}

export interface AudioParticipant {
  userId: string;
  displayName: string;
  profilePicture: string;
  role: 'host' | 'co_host' | 'speaker' | 'listener';
  joinedAt: number;
  leftAt?: number;
  isMuted: boolean;
  isSpeaking: boolean;
  speakingTime: number; // Total speaking time in seconds
  permissions: {
    canSpeak: boolean;
    canInvite: boolean;
    canMute: boolean;
    canRemove: boolean;
  };
}

export interface AudioRoomSettings {
  isPublic: boolean;
  allowListeners: boolean;
  maxListeners?: number;
  requireApprovalToSpeak: boolean;
  allowRecording: boolean;
  allowTranscription: boolean;
  moderationEnabled: boolean;
  profanityFilter: boolean;
  autoEndAfter?: number; // Auto-end after X minutes of inactivity
  scheduledDuration?: number; // Planned duration in minutes
}

export interface AudioEngagementMetrics {
  totalPlays: number;
  uniqueListeners: number;
  averageListenTime: number;
  completionRate: number; // Percentage who listened to the end
  replayRate: number;
  skipRate: number;
  dropOffPoints: number[]; // Seconds where people typically stop listening
  engagementPeaks: number[]; // Seconds with highest engagement
  qualityScore: number;
  shareToPlayRatio: number;
  commentToPlayRatio: number;
  likeToPlayRatio: number;
  liveEngagement?: {
    peakListeners: number;
    averageListeners: number;
    chatMessages: number;
    reactions: number;
    speakerChanges: number;
  };
}

// ===== EXISTING TYPES (Updated for compatibility) =====

// Loan system interfaces
export interface Loan {
  id: string;
  lenderId: string;
  borrowerId: string;
  amount: number;
  currency: string;
  monthlyAmount: number;
  totalMonths: number;
  remainingMonths: number;
  interestRate: number;
  status: 'active' | 'completed' | 'defaulted' | 'pending_approval';
  createdAt: number;
  nextPaymentDate: number;
  payments: LoanPayment[];
  terms: string;
  collateral?: string;
  guarantor?: string;
  latePaymentFee: number;
  earlyPaymentDiscount: number;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  currency: string;
  paymentDate: number;
  dueDate: number;
  status: 'paid' | 'pending' | 'overdue' | 'failed';
  lateFee?: number;
  transactionId?: string;
}

export interface LoanRating {
  userId: string;
  averageRating: number;
  totalRatings: number;
  ratings: LoanRatingEntry[];
  creditScore: number;
  totalLoansReceived: number;
  totalLoansRepaid: number;
  defaultedLoans: number;
  onTimePaymentRate: number;
}

export interface LoanRatingEntry {
  id: string;
  loanId: string;
  raterId: string;
  rating: number; // 1-5 stars
  comment?: string;
  timestamp: number;
  categories: {
    reliability: number;
    communication: number;
    paymentPunctuality: number;
  };
}

export interface LoanRequest {
  id: string;
  requesterId: string;
  amount: number;
  currency: string;
  months: number;
  purpose: string;
  interestRate: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: number;
  responses: LoanResponse[];
}

export interface LoanResponse {
  id: string;
  loanRequestId: string;
  lenderId: string;
  offeredAmount: number;
  offeredRate: number;
  terms: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
}

// Enhanced family relationship support
export interface FamilyRelationship {
  userId: string;
  relationshipType: 'parent' | 'sibling' | 'spouse' | 'child' | 'grandparent' | 'grandchild' | 'uncle_aunt' | 'cousin' | 'other';
  confirmedBy: 'both' | 'sender' | 'receiver';
  createdAt: number;
  displayName?: string;
  isPublic: boolean; // Whether this relationship is visible to others for suggestions
}

export interface ContactInfo {
  phoneNumber?: string;
  email?: string;
  hashedContact?: string; // Hashed version for privacy
  contactSource: 'phone' | 'email' | 'social' | 'manual';
  lastSynced?: number;
}

export interface LocationProximityData {
  currentLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
  frequentLocations?: Array<{
    latitude: number;
    longitude: number;
    name?: string;
    visitCount: number;
    lastVisit: number;
  }>;
  workLocation?: {
    latitude: number;
    longitude: number;
    name: string;
    verified: boolean;
  };
  homeLocation?: {
    latitude: number;
    longitude: number;
    verified: boolean;
  };
}

export interface InterestVector {
  technology: number;
  sports: number;
  music: number;
  travel: number;
  food: number;
  art: number;
  business: number;
  health: number;
  education: number;
  entertainment: number;
  fashion: number;
  gaming: number;
  photography: number;
  books: number;
  science: number;
  // Normalized values between 0-1
}

export interface SocialGraph {
  friends: string[]; // Direct friends (1st degree)
  friendsOfFriends: string[]; // 2nd degree connections
  family: string[]; // Family members
  colleagues: string[]; // Work colleagues
  influencers: string[]; // Followed influencers
  groups: string[]; // Group memberships
  mutualConnections: Record<string, number>; // userId -> mutual friend count
  connectionStrengths: Record<string, ConnectionStrength>; // userId -> connection strength
  lastUpdated: number;
}

export interface ConnectionStrength {
  userId: string;
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  interactionFrequency: number; // Interactions per week
  mutualFriends: number;
  relationshipType: 'friend' | 'family' | 'colleague' | 'acquaintance' | 'influencer';
  connectionDate: number;
  lastInteraction: number;
  affinityScore: number; // 0-1 computed affinity
}

export interface UserInteractionSummary {
  totalInteractions: number;
  dailyInteractions: number;
  weeklyInteractions: number;
  monthlyInteractions: number;
  favoriteAuthors: string[]; // Most interacted-with authors
  preferredContentTypes: ContentType[];
  peakActivityHours: number[];
  averageSessionDuration: number;
  engagementRate: number;
  lastActivityTime: number;
}

export interface UserPrivacySettings {
  phoneNumber: 'public' | 'friends_only' | 'family_only' | 'private';
  email: 'public' | 'friends_only' | 'family_only' | 'private';
  location: 'public' | 'friends_only' | 'family_only' | 'private';
  posts: 'public' | 'friends_only' | 'family_only' | 'private';
  workPlace: 'public' | 'friends_only' | 'family_only' | 'private';
  lastSeen: 'public' | 'friends_only' | 'family_only' | 'private';
  // Enhanced privacy settings
  socialGraph: 'public' | 'friends_only' | 'private';
  interactionHistory: 'friends_only' | 'private';
  allowPersonalization: boolean;
  allowSocialGraphAnalysis: boolean;
  // Enhanced for friend suggestions
  allowContactSync: boolean;
  allowLocationBasedSuggestions: boolean;
  allowFamilyNetworkSuggestions: boolean;
  familyRelationshipsVisibility: 'public' | 'friends_only' | 'family_only' | 'private';
  // E2EE privacy settings
  allowKeyExchange: boolean;
  requireKeyVerification: boolean;
  allowAutomaticKeyRotation: boolean;
  e2eeByDefault: boolean;
  // DLP privacy settings
  enableDLPProtection: boolean;
  dlpSensitivityLevel: 'low' | 'medium' | 'high' | 'maximum';
  allowDLPOverride: boolean;
  dlpNotifications: boolean;
}

export interface UserRelationship {
  userId: string;
  type: 'family' | 'close_friend' | 'colleague' | 'acquaintance';
  confirmedBy: 'both' | 'sender' | 'receiver';
  createdAt: number;
  interactionCount?: number;
  lastInteraction?: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'video' | 'voice' | 'file' | 'money';
  fileType?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  encrypted?: boolean;
  signature?: string;
  sessionKeyId?: string;
  // Enhanced E2EE properties
  e2eeMessage?: E2EEMessage;
  keyFingerprint?: string;
  verificationStatus?: 'verified' | 'unverified' | 'warning';
  forwardSecrecyLevel?: number;
  // DLP properties
  dlpScanned?: boolean;
  dlpViolations?: DLPViolation[];
  dlpSanitized?: boolean;
  dlpWarnings?: string[];
  // Expiring Messages
  isExpiring?: boolean;
  expirationPolicy?: ExpirationPolicy;
  expiresAt?: number;
  viewedBy?: MessageView[];
  destructionProof?: DestructionProof;
  // Access Control
  accessControlDecision?: ABACDecision;
  requiredPermissions?: string[];
  sensitivityLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
}

// Legacy Transaction interface (kept for backward compatibility)
export interface Transaction {
  id: string;
  senderId: string;
  receiverId: string;
  amount: number;
  currency: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  type: string;
  note: string;
  encrypted?: boolean;
  hash?: string;
  signature?: TransactionSignature;
  immutableHash?: string;
  fraudRiskLevel?: 'low' | 'medium' | 'high' | 'critical';
  fraudFlags?: string[];
  integrityVerified?: boolean;
  pciDSSCompliant?: boolean;
  // Loan-related fields
  loanId?: string;
  isLoanPayment?: boolean;
  paymentNumber?: number;
  totalPayments?: number;
}

export interface TransactionSignature {
  transactionId: string;
  signature: string;
  publicKey: string;
  timestamp: number;
  algorithm: string;
}

export interface FraudDetectionResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  requiresAdditionalVerification: boolean;
  detectionTimestamp: number;
  detectionVersion: string;
}

export interface TransactionAuditLog {
  transactionId: string;
  action: 'created' | 'signed' | 'verified' | 'completed' | 'failed';
  timestamp: number;
  userId: string;
  details: any;
  ipAddress?: string;
  deviceFingerprint?: string;
}

export interface PCIDSSComplianceRecord {
  transactionId: string;
  encryptionStandard: string;
  keyManagementCompliant: boolean;
  dataMinimizationApplied: boolean;
  auditTrailComplete: boolean;
  complianceVersion: string;
  certificationDate: number;
}

export interface Balance {
  currency: string;
  amount: number;
  lastUpdated?: number;
  encryptedBalance?: string;
}

export interface Chat {
  id: string;
  participants: User[];
  lastMessage: {
    content: string;
    senderId: string;
    timestamp: number;
    read: boolean;
    type?: 'text' | 'image' | 'video' | 'voice' | 'file' | 'money';
    status?: 'sent' | 'delivered' | 'read';
    encrypted?: boolean;
    verificationStatus?: 'verified' | 'unverified' | 'warning';
    isExpiring?: boolean;
    expiresAt?: number;
  };
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
  groupPicture?: string;
  groupDescription?: string;
  chatType: 'conversation' | 'group' | 'channel';
  isChannel?: boolean;
  channelOwner?: string;
  channelSubscribers?: number;
  isPublic?: boolean;
  admins?: string[];
  createdBy?: string;
  createdAt?: number;
  encryptionEnabled?: boolean;
  keyFingerprint?: string;
  // Enhanced chat features
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  lastActivity?: number;
  // Enhanced E2EE properties
  e2eeStatus?: 'disabled' | 'pending' | 'established' | 'verified' | 'warning';
  keyExchangeSession?: KeyExchangeSession;
  securityLevel?: 'standard' | 'high' | 'maximum';
  perfectForwardSecrecy?: boolean;
  // DLP properties
  dlpEnabled?: boolean;
  dlpPolicies?: string[];
  dlpViolationsCount?: number;
  dlpLastScan?: number;
  // Fine-grained Access Control
  accessControl?: GroupChatAccessControl;
  abacPolicies?: string[]; // Applied ABAC policy IDs
  rbacRoles?: UserRoleAssignment[]; // Role assignments for group members
  expirationSettings?: GroupExpirationSettings;
  personalDataAccess?: PersonalDataAccessControl[];
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  picture?: string;
  members: User[];
  admins: string[];
  createdBy: string;
  createdAt: number;
  encryptionEnabled?: boolean;
  // Enhanced E2EE for groups
  groupKeyFingerprint?: string;
  e2eeStatus?: 'disabled' | 'pending' | 'established' | 'verified';
  keyRotationSchedule?: number;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  picture?: string;
  owner: string;
  subscribers: number;
  createdAt: number;
  isPublic: boolean;
  verified?: boolean;
  // Channels typically don't use E2EE due to broadcast nature
  broadcastEncryption?: boolean;
}

export interface Post {
  id: string;
  userId: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    profilePicture: string;
  };
  content: string;
  mediaUrls?: string[];
  likes: number;
  comments: number;
  shares: number;
  timestamp: number;
  isLiked?: boolean;
  isSaved?: boolean;
  type: 'text' | 'image' | 'video' | 'shared' | 'sponsored';
  sharedPost?: Post;
  sponsoredContent?: {
    advertiser: string;
    targetUrl: string;
    campaignId: string;
  };
  reactions?: {
    like: number;
    love: number;
    laugh: number;
    angry: number;
    sad: number;
  };
  userReaction?: 'like' | 'love' | 'laugh' | 'angry' | 'sad';
  // Enhanced for feed ranking
  recommendationScore?: number;
  recommendationReasons?: string[];
  personalizedRanking?: number;
  socialContext?: PostSocialContext;
  engagementMetrics?: PostEngagementMetrics;
  contentVector?: number[]; // ML-generated content embedding
  extractedTopics?: string[];
  qualityScore?: number;
}

export interface PostSocialContext {
  friendsWhoLiked: string[]; // Friend IDs who liked this post
  friendsWhoCommented: string[]; // Friend IDs who commented
  friendsWhoShared: string[]; // Friend IDs who shared
  mutualFriendEngagement: number; // Engagement from mutual friends
  socialProofScore: number; // Overall social proof score
  viralityScore: number; // How viral this post is becoming
}

export interface PostEngagementMetrics {
  totalEngagements: number;
  engagementRate: number; // Engagements per view
  averageViewTime: number;
  shareToLikeRatio: number;
  commentToLikeRatio: number;
  qualityEngagementScore: number; // Weighted quality of engagements
  timeDecayedEngagement: number; // Engagement with time decay applied
  peakEngagementTime: number; // When engagement peaked
}

export interface Clip {
  id: string;
  userId: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    profilePicture: string;
  };
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  description?: string;
  music?: {
    id: string;
    title: string;
    artist: string;
    url: string;
  };
  likes: number;
  comments: number;
  shares: number;
  views: number;
  timestamp: number;
  duration: number;
  isLiked?: boolean;
  isSaved?: boolean;
  hashtags?: string[];
  mentions?: string[];
  effects?: string[];
  // Enhanced for feed ranking
  recommendationScore?: number;
  recommendationReasons?: string[];
  personalizedRanking?: number;
  socialContext?: PostSocialContext;
  engagementMetrics?: PostEngagementMetrics;
  contentVector?: number[];
  extractedTopics?: string[];
  qualityScore?: number;
  watchTimeMetrics?: WatchTimeMetrics;
}

export interface WatchTimeMetrics {
  averageWatchTime: number; // Average watch time in seconds
  completionRate: number; // Percentage who watched to end
  replayRate: number; // Percentage who replayed
  dropOffPoints: number[]; // Seconds where people typically drop off
  engagementPeaks: number[]; // Seconds with highest engagement
  qualityScore: number; // Overall video quality score
}

// Legacy Reel interface for backward compatibility
export interface Reel extends Clip { }

export interface FriendSuggestion {
  user: User;
  suggestionType: 'proximity' | 'colleagues' | 'contacts' | 'algorithmic' | 'family_network';
  reason: string;
  confidence: number;
  metadata?: {
    distance?: number; // for proximity
    mutualFriends?: number;
    mutualFamily?: number; // Enhanced for family network
    sharedWorkplace?: string;
    contactSource?: 'phone' | 'email';
    interestSimilarity?: number;
    // Enhanced metadata
    connectionStrength?: number; // Predicted connection strength
    socialGraphOverlap?: number; // Overlap in social graphs
    interactionProbability?: number; // Likelihood of interaction
    diversityScore?: number; // How different this suggestion is
    familyConnectionType?: string; // Type of family connection
    familyMemberName?: string; // Name of connecting family member
  };
}

export interface ProximitySuggestion extends FriendSuggestion {
  suggestionType: 'proximity';
  metadata: {
    distance: number;
    lastSeen: number;
    frequentLocation?: string;
    coLocationScore?: number; // How often they're in same location
    proximityHistory?: ProximityEvent[];
  };
}

export interface ProximityEvent {
  timestamp: number;
  location: string;
  distance: number;
  duration: number; // How long they were nearby
}

export interface ColleagueSuggestion extends FriendSuggestion {
  suggestionType: 'colleagues';
  metadata: {
    sharedWorkplace?: string;
    sharedEducation?: string;
    coLocationScore?: number;
    workScheduleOverlap?: number;
    professionalSimilarity?: number;
    departmentSimilarity?: number;
  };
}

export interface ContactSuggestion extends FriendSuggestion {
  suggestionType: 'contacts';
  metadata: {
    contactSource: 'phone' | 'email';
    mutualFriends: number;
    familyConnection?: boolean;
    contactFrequency?: number;
    relationshipType?: 'family' | 'friend' | 'colleague' | 'other';
    contactQuality?: number; // How complete the contact info is
  };
}

export interface AlgorithmicSuggestion extends FriendSuggestion {
  suggestionType: 'algorithmic';
  metadata: {
    interestSimilarity: number;
    contentSimilarity: number;
    behaviorSimilarity: number;
    diversityScore: number;
    mutualFriends: number;
    // Enhanced algorithmic factors
    socialGraphSimilarity: number;
    temporalPatternSimilarity: number;
    engagementPatternSimilarity: number;
    noveltyScore: number; // How novel/different this suggestion is
    confidenceScore: number; // Algorithm confidence in suggestion
  };
}

// Enhanced family network suggestion
export interface FamilyNetworkSuggestion extends FriendSuggestion {
  suggestionType: 'family_network';
  metadata: {
    mutualFamily: number;
    familyConnectionType: string; // e.g., "sibling", "parent", "cousin"
    familyMemberName: string; // Name of the connecting family member
    familyMemberId: string; // ID of the connecting family member
    relationshipStrength: number; // Strength of family connection
    familyNetworkSize: number; // Size of shared family network
    interestSimilarity: number;
    locationProximity?: number;
    mutualFriends: number;
  };
}

export interface Comment {
  id: string;
  postId?: string;
  clipId?: string;
  userId: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    profilePicture: string;
  };
  content: string;
  timestamp: number;
  likes: number;
  replies?: Comment[];
  parentCommentId?: string;
  isLiked?: boolean;
  // Enhanced for ranking
  qualityScore?: number;
  engagementScore?: number;
  sentimentScore?: number;
}

export interface Reaction {
  id: string;
  userId: string;
  postId?: string;
  clipId?: string;
  commentId?: string;
  type: 'like' | 'love' | 'laugh' | 'angry' | 'sad';
  timestamp: number;
  // Enhanced context
  reactionContext?: {
    timeSpentBeforeReaction: number;
    scrollPosition: number;
    sessionContext: string;
  };
}

export type Language = 'ar' | 'en';
export type ChatType = 'conversation' | 'group' | 'channel';
export type SocialTab = 'feed' | 'clips' | 'addFriends' | 'myProfile';
export type ContentType = 'text' | 'image' | 'video' | 'shared' | 'sponsored' | 'suggestion' | 'family';

// Admin-specific types
export interface AdminAction {
  id: string;
  adminId: string;
  action: string;
  target?: string;
  details: any;
  timestamp: number;
  ipAddress?: string;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxUsersPerGroup: number;
  maxFileSize: number;
  allowedFileTypes: string[];
  securityLevel: 'low' | 'medium' | 'high' | 'maximum';
  rateLimits: {
    messages: number;
    transactions: number;
    apiCalls: number;
  };
  // Enhanced E2EE settings
  e2eeSettings: {
    enabled: boolean;
    mandatoryForFinancial: boolean;
    keyRotationInterval: number;
    allowedAlgorithms: string[];
    requireKeyVerification: boolean;
  };
  // DLP settings
  dlpSettings: {
    enabled: boolean;
    strictMode: boolean;
    autoQuarantine: boolean;
    userOverrideAllowed: boolean;
    realTimeScanning: boolean;
    attachmentScanning: boolean;
  };
}

// Enhanced Security-related types
export interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'message_sent' | 'message_received' | 'key_rotation' | 'security_violation' | 'fraud_detected' | 'transaction_signed' | 'admin_action' | 'key_exchange' | 'key_verification' | 'dlp_violation' | 'dlp_scan';
  timestamp: number;
  userId?: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  deviceFingerprint?: string;
  resolved?: boolean;
  // Enhanced E2EE security events
  keyExchangeData?: {
    chatId?: string;
    participantId?: string;
    verificationMethod?: string;
    securityLevel?: string;
  };
  // DLP security events
  dlpData?: {
    policyId?: string;
    ruleId?: string;
    violationType?: DLPCategory;
    action?: string;
    contentType?: string;
  };
}

export interface EncryptionKey {
  keyId: string;
  algorithm: string;
  purpose: 'E2EE' | 'storage' | 'transport' | 'transaction_signing' | 'pci_dss' | 'key_exchange' | 'signal_identity' | 'signal_prekey' | 'signal_onetime' | 'signal_ratchet';
  createdAt: number;
  expiresAt?: number;
  rotationSchedule?: number;
  // Enhanced E2EE properties
  keyFingerprint?: string;
  verified?: boolean;
  usageCount?: number;
  lastUsed?: number;
  // Signal Protocol specific
  signalKeyType?: 'identity' | 'signed_prekey' | 'onetime_prekey' | 'ephemeral' | 'ratchet' | 'chain' | 'message';
  registrationId?: number;
  deviceId?: string;
}

export interface SecurityConfig {
  enableE2EE: boolean;
  enableCertificatePinning: boolean;
  enableKeyRotation: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireBiometric: boolean;
  enableFraudDetection: boolean;
  enableTransactionSigning: boolean;
  pciDSSCompliance: boolean;
  enableRealTimeMonitoring: boolean;
  // Enhanced E2EE configuration
  e2eeConfig: {
    mandatoryForFinancial: boolean;
    requireKeyVerification: boolean;
    allowAutomaticKeyRotation: boolean;
    keyExchangeTimeout: number;
    supportedAlgorithms: string[];
    perfectForwardSecrecy: boolean;
  };
  // DLP configuration
  dlpConfig: {
    enabled: boolean;
    strictMode: boolean;
    autoQuarantine: boolean;
    userOverrideAllowed: boolean;
    encryptSensitiveData: boolean;
    realTimeScanning: boolean;
    attachmentScanning: boolean;
    ocrScanning: boolean;
    mlClassification: boolean;
  };
}

// API Security types
export interface APIRateLimit {
  endpoint: string;
  maxRequests: number;
  windowMs: number;
  blockDurationMs: number;
}

export interface InputValidationSchema {
  endpoint: string;
  method: string;
  schema: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      min?: number;
      max?: number;
    };
  };
}

export interface ThreatDetectionResult {
  threatDetected: boolean;
  threatType: 'sql_injection' | 'xss' | 'csrf' | 'brute_force' | 'anomaly' | 'fraud' | 'key_compromise' | 'mitm_attack' | 'dlp_violation';
  riskScore: number;
  blockedRequest: boolean;
  timestamp: number;
}

export interface ComplianceAudit {
  auditId: string;
  auditType: 'pci_dss' | 'gdpr' | 'security_review' | 'fraud_investigation' | 'e2ee_compliance' | 'dlp_compliance';
  timestamp: number;
  auditor: string;
  findings: string[];
  complianceScore: number;
  recommendations: string[];
  status: 'passed' | 'failed' | 'requires_action';
}

// Financial Security types
export interface TransactionLimit {
  currency: string;
  dailyLimit: number;
  monthlyLimit: number;
  singleTransactionLimit: number;
  lastUpdated: number;
}

export interface AntiFraudRule {
  ruleId: string;
  ruleName: string;
  ruleType: 'amount_threshold' | 'frequency_check' | 'pattern_analysis' | 'velocity_check';
  parameters: any;
  enabled: boolean;
  weight: number;
}

export interface RiskAssessment {
  userId: string;
  riskScore: number;
  riskFactors: string[];
  lastAssessment: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigationActions: string[];
}