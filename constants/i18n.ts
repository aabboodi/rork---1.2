import { Language } from '@/types';

export const translations: Record<Language, {
  welcome: string;
  phoneNumber: string;
  next: string;
  termsAgreement: string;
  enterOTP: string;
  otpSent: string;
  verify: string;
  resend: string;
  cancel: string;
  chats: string;
  conversations: string;
  groups: string;
  channels: string;
  social: string;
  feed: string;
  clips: string;
  shortClips: string;
  addFriends: string;
  myProfile: string;
  wallet: string;
  profile: string;
  send: string;
  receive: string;
  balance: string;
  recentTransactions: string;
  amount: string;
  recipient: string;
  message: string;
  confirm: string;
  success: string;
  error: string;
  loading: string;
  retry: string;
  back: string;
  done: string;
  save: string;
  edit: string;
  delete: string;
  share: string;
  copy: string;
  paste: string;
  search: string;
  filter: string;
  sort: string;
  settings: string;
  notifications: string;
  privacy: string;
  security: string;
  help: string;
  about: string;
  logout: string;
  language: string;
  theme: string;
  darkMode: string;
  lightMode: string;
  continue: string;
  phoneRequired: string;
  welcomeSubtitle: string;
  editProfile: string;
  securityWarning: string;
  like: string;
  comment: string;
  donate: string;
  writeComment: string;
  whatsOnYourMind: string;
  posts: string;
  nearbyFriends: string;
  workColleagues: string;
  contactFriends: string;
  proximityFriends: string;
  algorithmicSuggestions: string;
  familyConnections: string;
  mutualFriends: string;
  follow: string;
  following: string;
  followers: string;
  views: string;
  discover: string;
  trending: string;
  forYou: string;
  recent: string;
  popular: string;
  adminPanel: string;
  mainAdmin: string;
  adminUser: string;
  privilegedUser: string;
  userManagement: string;
  contentModeration: string;
  systemSettings: string;
  securityLogs: string;
  analytics: string;
  reports: string;
  personalizedFeed: string;
  feedRanking: string;
  socialProof: string;
  authorAffinity: string;
  contentMatch: string;
  engagementScore: string;
  recencyScore: string;
  diversityScore: string;
  qualityScore: string;
  rankingFactors: string;
  socialContext: string;
  friendsEngaged: string;
  highQuality: string;
  personalized: string;
  recommended: string;
  // New translations for chat functionality
  contacts: string;
  files: string;
  online: string;
  offline: string;
  lastSeen: string;
  typing: string;
  voiceCall: string;
  videoCall: string;
  viewProfile: string;
  muteChat: string;
  clearChat: string;
  blockUser: string;
  reportUser: string;
  leaveGroup: string;
  groupInfo: string;
  groupMembers: string;
  channelInfo: string;
  shareChannel: string;
  subscribe: string;
  camera: string;
  gallery: string;
  document: string;
  location: string;
  contact: string;
  encryptionEnabled: string;
  encrypted: string;
  // Contact screen
  searchContacts: string;
  noContactsFound: string;
  addContact: string;
  nameRequired: string;
  contactAdded: string;
  displayName: string;
  username: string;
  email: string;
  workPlace: string;
  bio: string;
  // Files screen
  allFiles: string;
  images: string;
  videos: string;
  audio: string;
  documents: string;
  noFilesFound: string;
  totalFiles: string;
  totalSize: string;
  // Group creation
  createGroup: string;
  groupName: string;
  groupDescription: string;
  addGroupPicture: string;
  selectMembers: string;
  groupNameRequired: string;
  selectMembersRequired: string;
  groupCreated: string;
  // Channel creation
  createChannel: string;
  channelName: string;
  channelDescription: string;
  addChannelPicture: string;
  channelSettings: string;
  publicChannel: string;
  privateChannel: string;
  publicChannelDescription: string;
  privateChannelDescription: string;
  aboutChannels: string;
  channelInfoDescription: string;
  channelNameRequired: string;
  channelCreated: string;
  // Chat settings
  chatSettings: string;
  messageNotifications: string;
  groupNotifications: string;
  channelNotifications: string;
  readReceipts: string;
  profilePhoto: string;
  everyone: string;
  twoFactorAuth: string;
  enabled: string;
  blockedContacts: string;
  dataAndStorage: string;
  autoDownloadMedia: string;
  storageUsage: string;
  networkUsage: string;
  appearance: string;
  chatWallpaper: string;
  default: string;
  fontSize: string;
  medium: string;
  advanced: string;
  exportChats: string;
  clearCache: string;
  deleteAllChats: string;
  // Tab navigation
  refreshChats: string;
  newChat: string;
  newGroup: string;
  newChannel: string;
  // System Monitoring
  systemMonitoring: string;
  systemStatus: string;
  performanceMetrics: string;
  dataGovernance: string;
  monitoring: string;
  dashboard: string;
  alerts: string;
  metrics: string;
  uptime: string;
  responseTime: string;
  throughput: string;
  errorRate: string;
  availability: string;
  servicesHealth: string;
  slaCompliance: string;
  activeAlerts: string;
  criticalAlerts: string;
  warnings: string;
  healthy: string;
  degraded: string;
  unhealthy: string;
  critical: string;
  meeting: string;
  atRisk: string;
  breached: string;
  improving: string;
  stable: string;
  degrading: string;
  compliance: string;
  policies: string;
  dataTypes: string;
  pendingRequests: string;
  complianceScore: string;
  topIssues: string;
  lastUpdated: string;
  refreshData: string;
  exportData: string;
  viewDetails: string;
  acknowledge: string;
  resolve: string;
  createRule: string;
  updateRule: string;
  deleteRule: string;
  generateReport: string;
  privacyRequest: string;
  dataQuality: string;
  auditTrail: string;
  riskAssessment: string;
  // Loan system translations
  loan: string;
  loans: string;
  createLoan: string;
  loanAmount: string;
  loanMonths: string;
  borrowerPhone: string;
  loanDisbursement: string;
  loanPayment: string;
  rateBorrower: string;
  loanRating: string;
  creditScore: string;
  paymentHistory: string;
  onTimePayments: string;
  latePayments: string;
  defaultedLoans: string;
  activeLoan: string;
  completedLoan: string;
  monthlyPayment: string;
  remainingPayments: string;
  nextPaymentDate: string;
  interestRate: string;
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  loanTerms: string;
  earlyRepayment: string;
  latePaymentFee: string;
  loanAgreement: string;
  borrowerRating: string;
  lenderRating: string;
  reliability: string;
  communication: string;
  paymentPunctuality: string;
  loanHistory: string;
  repaymentSchedule: string;
  automaticPayment: string;
  manualPayment: string;
  paymentReminder: string;
  loanApproval: string;
  loanRejection: string;
  loanRequest: string;
  loanOffer: string;
  collateral: string;
  guarantor: string;
  unsecuredLoan: string;
  securedLoan: string;
  personalLoan: string;
  businessLoan: string;
  emergencyLoan: string;
  shortTermLoan: string;
  longTermLoan: string;
  loanPurpose: string;
  loanApplication: string;
  loanDocuments: string;
  loanVerification: string;
  loanDisbursed: string;
  loanCompleted: string;
  loanDefaulted: string;
  loanCancelled: string;
  loanSuspended: string;
  loanRestructured: string;
  gracePeriod: string;
  penaltyRate: string;
  compoundInterest: string;
  simpleInterest: string;
  fixedRate: string;
  variableRate: string;
  apr: string;
  emi: string;
  principalAmount: string;
  interestAmount: string;
  processingFee: string;
  prepaymentPenalty: string;
  loanInsurance: string;
  loanProtection: string;
  debtConsolidation: string;
  refinancing: string;
  loanTransfer: string;
  loanSettlement: string;
  partialPayment: string;
  fullPayment: string;
  overduePayment: string;
  paymentSchedule: string;
  paymentMethod: string;
  autoDebit: string;
  bankTransfer: string;
  cashPayment: string;
  onlinePayment: string;
  mobilePayment: string;
  walletPayment: string;
  creditCardPayment: string;
  debitCardPayment: string;
  checkPayment: string;
  wireTransfer: string;
  ach: string;
  swift: string;
  rtgs: string;
  neft: string;
  imps: string;
  upi: string;
  paypal: string;
  stripe: string;
  razorpay: string;
  paytm: string;
  phonepe: string;
  googlepay: string;
  applepay: string;
  samsungpay: string;
  amazonpay: string;
  fawry: string;
  vodafonecash: string;
  orangemoney: string;
  etisalatcash: string;
  stcpay: string;
  mada: string;
  visa: string;
  mastercard: string;
  amex: string;
  discoverCard: string;
  dinersclub: string;
  jcb: string;
  unionpay: string;
  rupay: string;
  elo: string;
  hipercard: string;
  cartesbancaires: string;
  interac: string;
  maestro: string;
  vpay: string;
  electron: string;
  plus: string;
  cirrus: string;
  star: string;
  pulse: string;
  nyce: string;
  accel: string;
  shazam: string;
  jeanie: string;
  honor: string;
  quest: string;
  affn: string;
  coop: string;
  culiance: string;
  exchange: string;
  moneypass: string;
  transfund: string;
  allpoint: string;
  cardtronics: string;
  elan: string;
  firstdata: string;
  globalPayments: string;
  tsys: string;
  worldpay: string;
  square: string;
  clover: string;
  toast: string;
  lightspeed: string;
  shopify: string;
  woocommerce: string;
  magento: string;
  prestashop: string;
  opencart: string;
  bigcommerce: string;
  volusion: string;
  threedsixtycommerce: string;
  nopcommerce: string;
  umbraco: string;
  drupal: string;
  joomla: string;
  wordpress: string;
  squarespace: string;
  wix: string;
  weebly: string;
  godaddy: string;
  bluehost: string;
  hostgator: string;
  siteground: string;
  dreamhost: string;
  inmotion: string;
  a2hosting: string;
  greengeeks: string;
  hostinger: string;
  namecheap: string;
  cloudflare: string;
  aws: string;
  azure: string;
  gcp: string;
  digitalocean: string;
  linode: string;
  vultr: string;
  hetzner: string;
  ovh: string;
  scaleway: string;
  upcloud: string;
  contabo: string;
  ionos: string;
}> = {
  en: {
    welcome: 'Welcome',
    phoneNumber: 'Phone Number',
    next: 'Next',
    termsAgreement: 'By continuing, you agree to our Terms of Service and Privacy Policy',
    enterOTP: 'Enter Verification Code',
    otpSent: 'We sent a verification code to',
    verify: 'Verify',
    resend: 'Resend Code',
    cancel: 'Cancel',
    chats: 'Chats',
    conversations: 'Conversations',
    groups: 'Groups',
    channels: 'Channels',
    social: 'Social',
    feed: 'Feed',
    clips: 'Clips',
    shortClips: 'Short Clips',
    addFriends: 'Add Friends',
    myProfile: 'My Profile',
    wallet: 'Wallet',
    profile: 'Profile',
    send: 'Send',
    receive: 'Receive',
    balance: 'Balance',
    recentTransactions: 'Recent Transactions',
    amount: 'Amount',
    recipient: 'Recipient',
    message: 'Message',
    confirm: 'Confirm',
    success: 'Success',
    error: 'Error',
    loading: 'Loading...',
    retry: 'Retry',
    back: 'Back',
    done: 'Done',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    share: 'Share',
    copy: 'Copy',
    paste: 'Paste',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    settings: 'Settings',
    notifications: 'Notifications',
    privacy: 'Privacy',
    security: 'Security',
    help: 'Help',
    about: 'About',
    logout: 'Logout',
    language: 'Language',
    theme: 'Theme',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    continue: 'Continue',
    phoneRequired: 'Phone number is required',
    welcomeSubtitle: 'Secure messaging and wallet platform',
    editProfile: 'Edit Profile',
    securityWarning: 'Security Warning',
    like: 'Like',
    comment: 'Comment',
    donate: 'Donate',
    writeComment: 'Write a comment...',
    whatsOnYourMind: "What's on your mind?",
    posts: 'Posts',
    nearbyFriends: 'Nearby Friends',
    workColleagues: 'Work Colleagues',
    contactFriends: 'Contact Friends',
    proximityFriends: 'Nearby People',
    algorithmicSuggestions: 'Suggested for You',
    familyConnections: 'Family Connections',
    mutualFriends: 'Mutual Friends',
    follow: 'Follow',
    following: 'Following',
    followers: 'Followers',
    views: 'Views',
    discover: 'Discover',
    trending: 'Trending',
    forYou: 'For You',
    recent: 'Recent',
    popular: 'Popular',
    adminPanel: 'Admin Panel',
    mainAdmin: 'Main Admin',
    adminUser: 'Admin',
    privilegedUser: 'Privileged User',
    userManagement: 'User Management',
    contentModeration: 'Content Moderation',
    systemSettings: 'System Settings',
    securityLogs: 'Security Logs',
    analytics: 'Analytics',
    reports: 'Reports',
    personalizedFeed: 'Personalized Feed',
    feedRanking: 'Feed Ranking',
    socialProof: 'Social Proof',
    authorAffinity: 'Author Affinity',
    contentMatch: 'Content Match',
    engagementScore: 'Engagement Score',
    recencyScore: 'Recency Score',
    diversityScore: 'Diversity Score',
    qualityScore: 'Quality Score',
    rankingFactors: 'Ranking Factors',
    socialContext: 'Social Context',
    friendsEngaged: 'Friends Engaged',
    highQuality: 'High Quality',
    personalized: 'Personalized',
    recommended: 'Recommended',
    // New translations for chat functionality
    contacts: 'Contacts',
    files: 'Files',
    online: 'Online',
    offline: 'Offline',
    lastSeen: 'Last seen',
    typing: 'Typing...',
    voiceCall: 'Voice Call',
    videoCall: 'Video Call',
    viewProfile: 'View Profile',
    muteChat: 'Mute Chat',
    clearChat: 'Clear Chat',
    blockUser: 'Block User',
    reportUser: 'Report User',
    leaveGroup: 'Leave Group',
    groupInfo: 'Group Info',
    groupMembers: 'Group Members',
    channelInfo: 'Channel Info',
    shareChannel: 'Share Channel',
    subscribe: 'Subscribe',
    camera: 'Camera',
    gallery: 'Gallery',
    document: 'Document',
    location: 'Location',
    contact: 'Contact',
    encryptionEnabled: 'End-to-end encryption enabled',
    encrypted: 'Encrypted',
    // Contact screen
    searchContacts: 'Search contacts...',
    noContactsFound: 'No contacts found',
    addContact: 'Add Contact',
    nameRequired: 'Name is required',
    contactAdded: 'Contact added successfully',
    displayName: 'Display Name',
    username: 'Username',
    email: 'Email',
    workPlace: 'Workplace',
    bio: 'Bio',
    // Files screen
    allFiles: 'All Files',
    images: 'Images',
    videos: 'Videos',
    audio: 'Audio',
    documents: 'Documents',
    noFilesFound: 'No files found',
    totalFiles: 'Total Files',
    totalSize: 'Total Size',
    // Group creation
    createGroup: 'Create Group',
    groupName: 'Group Name',
    groupDescription: 'Group Description',
    addGroupPicture: 'Add Group Picture',
    selectMembers: 'Select Members',
    groupNameRequired: 'Group name is required',
    selectMembersRequired: 'Please select at least one member',
    groupCreated: 'Group created successfully',
    // Channel creation
    createChannel: 'Create Channel',
    channelName: 'Channel Name',
    channelDescription: 'Channel Description',
    addChannelPicture: 'Add Channel Picture',
    channelSettings: 'Channel Settings',
    publicChannel: 'Public Channel',
    privateChannel: 'Private Channel',
    publicChannelDescription: 'Anyone can find and join this channel',
    privateChannelDescription: 'Only invited members can join',
    aboutChannels: 'About Channels',
    channelInfoDescription: 'Channels are a tool for broadcasting messages to large audiences.',
    channelNameRequired: 'Channel name is required',
    channelCreated: 'Channel created successfully',
    // Chat settings
    chatSettings: 'Chat Settings',
    messageNotifications: 'Message Notifications',
    groupNotifications: 'Group Notifications',
    channelNotifications: 'Channel Notifications',
    readReceipts: 'Read Receipts',
    profilePhoto: 'Profile Photo',
    everyone: 'Everyone',
    twoFactorAuth: 'Two-Factor Authentication',
    enabled: 'Enabled',
    blockedContacts: 'Blocked Contacts',
    dataAndStorage: 'Data and Storage',
    autoDownloadMedia: 'Auto-Download Media',
    storageUsage: 'Storage Usage',
    networkUsage: 'Network Usage',
    appearance: 'Appearance',
    chatWallpaper: 'Chat Wallpaper',
    default: 'Default',
    fontSize: 'Font Size',
    medium: 'Medium',
    advanced: 'Advanced',
    exportChats: 'Export Chats',
    clearCache: 'Clear Cache',
    deleteAllChats: 'Delete All Chats',
    // Tab navigation
    refreshChats: 'Refresh Chats',
    newChat: 'New Chat',
    newGroup: 'New Group',
    newChannel: 'New Channel',
    // System Monitoring
    systemMonitoring: 'System Monitoring',
    systemStatus: 'System Status',
    performanceMetrics: 'Performance Metrics',
    dataGovernance: 'Data Governance',
    monitoring: 'Monitoring',
    dashboard: 'Dashboard',
    alerts: 'Alerts',
    metrics: 'Metrics',
    uptime: 'Uptime',
    responseTime: 'Response Time',
    throughput: 'Throughput',
    errorRate: 'Error Rate',
    availability: 'Availability',
    servicesHealth: 'Services Health',
    slaCompliance: 'SLA Compliance',
    activeAlerts: 'Active Alerts',
    criticalAlerts: 'Critical Alerts',
    warnings: 'Warnings',
    healthy: 'Healthy',
    degraded: 'Degraded',
    unhealthy: 'Unhealthy',
    critical: 'Critical',
    meeting: 'Meeting',
    atRisk: 'At Risk',
    breached: 'Breached',
    improving: 'Improving',
    stable: 'Stable',
    degrading: 'Degrading',
    compliance: 'Compliance',
    policies: 'Policies',
    dataTypes: 'Data Types',
    pendingRequests: 'Pending Requests',
    complianceScore: 'Compliance Score',
    topIssues: 'Top Issues',
    lastUpdated: 'Last Updated',
    refreshData: 'Refresh Data',
    exportData: 'Export Data',
    viewDetails: 'View Details',
    acknowledge: 'Acknowledge',
    resolve: 'Resolve',
    createRule: 'Create Rule',
    updateRule: 'Update Rule',
    deleteRule: 'Delete Rule',
    generateReport: 'Generate Report',
    privacyRequest: 'Privacy Request',
    dataQuality: 'Data Quality',
    auditTrail: 'Audit Trail',
    riskAssessment: 'Risk Assessment',
    // Loan system translations
    loan: 'Loan',
    loans: 'Loans',
    createLoan: 'Create Loan',
    loanAmount: 'Loan Amount',
    loanMonths: 'Loan Months',
    borrowerPhone: 'Borrower Phone',
    loanDisbursement: 'Loan Disbursement',
    loanPayment: 'Loan Payment',
    rateBorrower: 'Rate Borrower',
    loanRating: 'Loan Rating',
    creditScore: 'Credit Score',
    paymentHistory: 'Payment History',
    onTimePayments: 'On-Time Payments',
    latePayments: 'Late Payments',
    defaultedLoans: 'Defaulted Loans',
    activeLoan: 'Active Loan',
    completedLoan: 'Completed Loan',
    monthlyPayment: 'Monthly Payment',
    remainingPayments: 'Remaining Payments',
    nextPaymentDate: 'Next Payment Date',
    interestRate: 'Interest Rate',
    totalAmount: 'Total Amount',
    paidAmount: 'Paid Amount',
    outstandingAmount: 'Outstanding Amount',
    loanTerms: 'Loan Terms',
    earlyRepayment: 'Early Repayment',
    latePaymentFee: 'Late Payment Fee',
    loanAgreement: 'Loan Agreement',
    borrowerRating: 'Borrower Rating',
    lenderRating: 'Lender Rating',
    reliability: 'Reliability',
    communication: 'Communication',
    paymentPunctuality: 'Payment Punctuality',
    loanHistory: 'Loan History',
    repaymentSchedule: 'Repayment Schedule',
    automaticPayment: 'Automatic Payment',
    manualPayment: 'Manual Payment',
    paymentReminder: 'Payment Reminder',
    loanApproval: 'Loan Approval',
    loanRejection: 'Loan Rejection',
    loanRequest: 'Loan Request',
    loanOffer: 'Loan Offer',
    collateral: 'Collateral',
    guarantor: 'Guarantor',
    unsecuredLoan: 'Unsecured Loan',
    securedLoan: 'Secured Loan',
    personalLoan: 'Personal Loan',
    businessLoan: 'Business Loan',
    emergencyLoan: 'Emergency Loan',
    shortTermLoan: 'Short-Term Loan',
    longTermLoan: 'Long-Term Loan',
    loanPurpose: 'Loan Purpose',
    loanApplication: 'Loan Application',
    loanDocuments: 'Loan Documents',
    loanVerification: 'Loan Verification',
    loanDisbursed: 'Loan Disbursed',
    loanCompleted: 'Loan Completed',
    loanDefaulted: 'Loan Defaulted',
    loanCancelled: 'Loan Cancelled',
    loanSuspended: 'Loan Suspended',
    loanRestructured: 'Loan Restructured',
    gracePeriod: 'Grace Period',
    penaltyRate: 'Penalty Rate',
    compoundInterest: 'Compound Interest',
    simpleInterest: 'Simple Interest',
    fixedRate: 'Fixed Rate',
    variableRate: 'Variable Rate',
    apr: 'APR',
    emi: 'EMI',
    principalAmount: 'Principal Amount',
    interestAmount: 'Interest Amount',
    processingFee: 'Processing Fee',
    prepaymentPenalty: 'Prepayment Penalty',
    loanInsurance: 'Loan Insurance',
    loanProtection: 'Loan Protection',
    debtConsolidation: 'Debt Consolidation',
    refinancing: 'Refinancing',
    loanTransfer: 'Loan Transfer',
    loanSettlement: 'Loan Settlement',
    partialPayment: 'Partial Payment',
    fullPayment: 'Full Payment',
    overduePayment: 'Overdue Payment',
    paymentSchedule: 'Payment Schedule',
    paymentMethod: 'Payment Method',
    autoDebit: 'Auto Debit',
    bankTransfer: 'Bank Transfer',
    cashPayment: 'Cash Payment',
    onlinePayment: 'Online Payment',
    mobilePayment: 'Mobile Payment',
    walletPayment: 'Wallet Payment',
    creditCardPayment: 'Credit Card Payment',
    debitCardPayment: 'Debit Card Payment',
    checkPayment: 'Check Payment',
    wireTransfer: 'Wire Transfer',
    ach: 'ACH',
    swift: 'SWIFT',
    rtgs: 'RTGS',
    neft: 'NEFT',
    imps: 'IMPS',
    upi: 'UPI',
    paypal: 'PayPal',
    stripe: 'Stripe',
    razorpay: 'Razorpay',
    paytm: 'Paytm',
    phonepe: 'PhonePe',
    googlepay: 'Google Pay',
    applepay: 'Apple Pay',
    samsungpay: 'Samsung Pay',
    amazonpay: 'Amazon Pay',
    fawry: 'Fawry',
    vodafonecash: 'Vodafone Cash',
    orangemoney: 'Orange Money',
    etisalatcash: 'Etisalat Cash',
    stcpay: 'STC Pay',
    mada: 'Mada',
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discoverCard: 'Discover',
    dinersclub: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
    rupay: 'RuPay',
    elo: 'Elo',
    hipercard: 'Hipercard',
    cartesbancaires: 'Cartes Bancaires',
    interac: 'Interac',
    maestro: 'Maestro',
    vpay: 'V PAY',
    electron: 'Electron',
    plus: 'Plus',
    cirrus: 'Cirrus',
    star: 'STAR',
    pulse: 'Pulse',
    nyce: 'NYCE',
    accel: 'Accel',
    shazam: 'Shazam',
    jeanie: 'Jeanie',
    honor: 'Honor',
    quest: 'Quest',
    affn: 'AFFN',
    coop: 'CO-OP',
    culiance: 'CU24',
    exchange: 'Exchange',
    moneypass: 'MoneyPass',
    transfund: 'Transfund',
    allpoint: 'Allpoint',
    cardtronics: 'Cardtronics',
    elan: 'Elan',
    firstdata: 'First Data',
    globalPayments: 'Global Payments',
    tsys: 'TSYS',
    worldpay: 'Worldpay',
    square: 'Square',
    clover: 'Clover',
    toast: 'Toast',
    lightspeed: 'Lightspeed',
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    magento: 'Magento',
    prestashop: 'PrestaShop',
    opencart: 'OpenCart',
    bigcommerce: 'BigCommerce',
    volusion: 'Volusion',
    threedsixtycommerce: '3dcart',
    nopcommerce: 'nopCommerce',
    umbraco: 'Umbraco',
    drupal: 'Drupal',
    joomla: 'Joomla',
    wordpress: 'WordPress',
    squarespace: 'Squarespace',
    wix: 'Wix',
    weebly: 'Weebly',
    godaddy: 'GoDaddy',
    bluehost: 'Bluehost',
    hostgator: 'HostGator',
    siteground: 'SiteGround',
    dreamhost: 'DreamHost',
    inmotion: 'InMotion',
    a2hosting: 'A2 Hosting',
    greengeeks: 'GreenGeeks',
    hostinger: 'Hostinger',
    namecheap: 'Namecheap',
    cloudflare: 'Cloudflare',
    aws: 'AWS',
    azure: 'Azure',
    gcp: 'Google Cloud',
    digitalocean: 'DigitalOcean',
    linode: 'Linode',
    vultr: 'Vultr',
    hetzner: 'Hetzner',
    ovh: 'OVH',
    scaleway: 'Scaleway',
    upcloud: 'UpCloud',
    contabo: 'Contabo',
    ionos: 'IONOS',
  },
  ar: {
    welcome: 'مرحباً',
    phoneNumber: 'رقم الهاتف',
    next: 'التالي',
    termsAgreement: 'بالمتابعة، أنت توافق على شروط الخدمة وسياسة الخصوصية',
    enterOTP: 'أدخل رمز التحقق',
    otpSent: 'لقد أرسلنا رمز التحقق إلى',
    verify: 'تحقق',
    resend: 'إعادة إرسال الرمز',
    cancel: 'إلغاء',
    chats: 'المحادثات',
    conversations: 'المحادثات',
    groups: 'المجموعات',
    channels: 'القنوات',
    social: 'تواصل اجتماعي',
    feed: 'المنشورات',
    clips: 'مقاطع قصيرة',
    shortClips: 'مقاطع قصيرة',
    addFriends: 'إضافة أصدقاء',
    myProfile: 'الملف الشخصي',
    wallet: 'المحفظة',
    profile: 'الملف الشخصي',
    send: 'إرسال',
    receive: 'استقبال',
    balance: 'الرصيد',
    recentTransactions: 'المعاملات الأخيرة',
    amount: 'المبلغ',
    recipient: 'المستلم',
    message: 'الرسالة',
    confirm: 'تأكيد',
    success: 'نجح',
    error: 'خطأ',
    loading: 'جاري التحميل...',
    retry: 'إعادة المحاولة',
    back: 'رجوع',
    done: 'تم',
    save: 'حفظ',
    edit: 'تعديل',
    delete: 'حذف',
    share: 'مشاركة',
    copy: 'نسخ',
    paste: 'لصق',
    search: 'بحث',
    filter: 'تصفية',
    sort: 'ترتيب',
    settings: 'الإعدادات',
    notifications: 'الإشعارات',
    privacy: 'الخصوصية',
    security: 'الأمان',
    help: 'المساعدة',
    about: 'حول',
    logout: 'تسجيل الخروج',
    language: 'اللغة',
    theme: 'المظهر',
    darkMode: 'الوضع المظلم',
    lightMode: 'الوضع المضيء',
    continue: 'متابعة',
    phoneRequired: 'رقم الهاتف مطلوب',
    welcomeSubtitle: 'منصة آمنة للمراسلة والمحفظة',
    editProfile: 'تعديل الملف الشخصي',
    securityWarning: 'تحذير أمني',
    like: 'إعجاب',
    comment: 'تعليق',
    donate: 'تبرع',
    writeComment: 'اكتب تعليقاً...',
    whatsOnYourMind: 'بماذا تفكر؟',
    posts: 'المنشورات',
    nearbyFriends: 'الأصدقاء القريبون',
    workColleagues: 'زملاء العمل',
    contactFriends: 'أصدقاء من جهات الاتصال',
    proximityFriends: 'الأشخاص القريبون',
    algorithmicSuggestions: 'مقترح لك',
    familyConnections: 'الروابط العائلية',
    mutualFriends: 'الأصدقاء المشتركون',
    follow: 'متابعة',
    following: 'متابَع',
    followers: 'متابع',
    views: 'مشاهدة',
    discover: 'اكتشف',
    trending: 'الأكثر رواجاً',
    forYou: 'لك',
    recent: 'الأحدث',
    popular: 'الأكثر شعبية',
    adminPanel: 'لوحة الإدارة',
    mainAdmin: 'المدير الرئيسي',
    adminUser: 'مدير',
    privilegedUser: 'مستخدم مميز',
    userManagement: 'إدارة المستخدمين',
    contentModeration: 'إدارة المحتوى',
    systemSettings: 'إعدادات النظام',
    securityLogs: 'سجلات الأمان',
    analytics: 'التحليلات',
    reports: 'التقارير',
    personalizedFeed: 'خلاصة مخصصة',
    feedRanking: 'ترتيب الخلاصة',
    socialProof: 'دليل اجتماعي',
    authorAffinity: 'تقارب المؤلف',
    contentMatch: 'تطابق المحتوى',
    engagementScore: 'نقاط التفاعل',
    recencyScore: 'نقاط الحداثة',
    diversityScore: 'نقاط التنوع',
    qualityScore: 'نقاط الجودة',
    rankingFactors: 'عوامل الترتيب',
    socialContext: 'السياق الاجتماعي',
    friendsEngaged: 'أصدقاء متفاعلون',
    highQuality: 'جودة عالية',
    personalized: 'مخصص',
    recommended: 'موصى به',
    // New translations for chat functionality
    contacts: 'جهات الاتصال',
    files: 'الملفات',
    online: 'متصل',
    offline: 'غير متصل',
    lastSeen: 'آخر ظهور',
    typing: 'يكتب...',
    voiceCall: 'مكالمة صوتية',
    videoCall: 'مكالمة فيديو',
    viewProfile: 'عرض الملف الشخصي',
    muteChat: 'كتم المحادثة',
    clearChat: 'مسح المحادثة',
    blockUser: 'حظر المستخدم',
    reportUser: 'الإبلاغ عن المستخدم',
    leaveGroup: 'مغادرة المجموعة',
    groupInfo: 'معلومات المجموعة',
    groupMembers: 'أعضاء المجموعة',
    channelInfo: 'معلومات القناة',
    shareChannel: 'مشاركة القناة',
    subscribe: 'اشتراك',
    camera: 'كاميرا',
    gallery: 'المعرض',
    document: 'مستند',
    location: 'الموقع',
    contact: 'جهة اتصال',
    encryptionEnabled: 'التشفير من طرف إلى طرف مفعل',
    encrypted: 'مشفر',
    // Contact screen
    searchContacts: 'البحث في جهات الاتصال...',
    noContactsFound: 'لم يتم العثور على جهات اتصال',
    addContact: 'إضافة جهة اتصال',
    nameRequired: 'الاسم مطلوب',
    contactAdded: 'تم إضافة جهة الاتصال بنجاح',
    displayName: 'الاسم المعروض',
    username: 'اسم المستخدم',
    email: 'البريد الإلكتروني',
    workPlace: 'مكان العمل',
    bio: 'النبذة الشخصية',
    // Files screen
    allFiles: 'جميع الملفات',
    images: 'الصور',
    videos: 'الفيديوهات',
    audio: 'الصوتيات',
    documents: 'المستندات',
    noFilesFound: 'لم يتم العثور على ملفات',
    totalFiles: 'إجمالي الملفات',
    totalSize: 'الحجم الإجمالي',
    // Group creation
    createGroup: 'إنشاء مجموعة',
    groupName: 'اسم المجموعة',
    groupDescription: 'وصف المجموعة',
    addGroupPicture: 'إضافة صورة المجموعة',
    selectMembers: 'اختيار الأعضاء',
    groupNameRequired: 'اسم المجموعة مطلوب',
    selectMembersRequired: 'يرجى اختيار عضو واحد على الأقل',
    groupCreated: 'تم إنشاء المجموعة بنجاح',
    // Channel creation
    createChannel: 'إنشاء قناة',
    channelName: 'اسم القناة',
    channelDescription: 'وصف القناة',
    addChannelPicture: 'إضافة صورة القناة',
    channelSettings: 'إعدادات القناة',
    publicChannel: 'قناة عامة',
    privateChannel: 'قناة خاصة',
    publicChannelDescription: 'يمكن لأي شخص العثور على هذه القناة والانضمام إليها',
    privateChannelDescription: 'يمكن للأعضاء المدعوين فقط الانضمام',
    aboutChannels: 'حول القنوات',
    channelInfoDescription: 'القنوات هي أداة لبث الرسائل إلى جماهير كبيرة.',
    channelNameRequired: 'اسم القناة مطلوب',
    channelCreated: 'تم إنشاء القناة بنجاح',
    // Chat settings
    chatSettings: 'إعدادات المحادثة',
    messageNotifications: 'إشعارات الرسائل',
    groupNotifications: 'إشعارات المجموعات',
    channelNotifications: 'إشعارات القنوات',
    readReceipts: 'إيصالات القراءة',
    profilePhoto: 'صورة الملف الشخصي',
    everyone: 'الجميع',
    twoFactorAuth: 'المصادقة الثنائية',
    enabled: 'مفعل',
    blockedContacts: 'جهات الاتصال المحظورة',
    dataAndStorage: 'البيانات والتخزين',
    autoDownloadMedia: 'تنزيل الوسائط تلقائياً',
    storageUsage: 'استخدام التخزين',
    networkUsage: 'استخدام الشبكة',
    appearance: 'المظهر',
    chatWallpaper: 'خلفية المحادثة',
    default: 'افتراضي',
    fontSize: 'حجم الخط',
    medium: 'متوسط',
    advanced: 'متقدم',
    exportChats: 'تصدير المحادثات',
    clearCache: 'مسح التخزين المؤقت',
    deleteAllChats: 'حذف جميع المحادثات',
    // Tab navigation
    refreshChats: 'تحديث المحادثات',
    newChat: 'محادثة جديدة',
    newGroup: 'مجموعة جديدة',
    newChannel: 'قناة جديدة',
    // System Monitoring
    systemMonitoring: 'مراقبة النظام',
    systemStatus: 'حالة النظام',
    performanceMetrics: 'مقاييس الأداء',
    dataGovernance: 'حوكمة البيانات',
    monitoring: 'المراقبة',
    dashboard: 'لوحة التحكم',
    alerts: 'التنبيهات',
    metrics: 'المقاييس',
    uptime: 'وقت التشغيل',
    responseTime: 'وقت الاستجابة',
    throughput: 'الإنتاجية',
    errorRate: 'معدل الخطأ',
    availability: 'التوفر',
    servicesHealth: 'صحة الخدمات',
    slaCompliance: 'الامتثال لاتفاقية مستوى الخدمة',
    activeAlerts: 'التنبيهات النشطة',
    criticalAlerts: 'التنبيهات الحرجة',
    warnings: 'التحذيرات',
    healthy: 'صحي',
    degraded: 'متدهور',
    unhealthy: 'غير صحي',
    critical: 'حرج',
    meeting: 'مستوفي',
    atRisk: 'في خطر',
    breached: 'منتهك',
    improving: 'يتحسن',
    stable: 'مستقر',
    degrading: 'يتدهور',
    compliance: 'الامتثال',
    policies: 'السياسات',
    dataTypes: 'أنواع البيانات',
    pendingRequests: 'الطلبات المعلقة',
    complianceScore: 'نقاط الامتثال',
    topIssues: 'أهم المشاكل',
    lastUpdated: 'آخر تحديث',
    refreshData: 'تحديث البيانات',
    exportData: 'تصدير البيانات',
    viewDetails: 'عرض التفاصيل',
    acknowledge: 'إقرار',
    resolve: 'حل',
    createRule: 'إنشاء قاعدة',
    updateRule: 'تحديث القاعدة',
    deleteRule: 'حذف القاعدة',
    generateReport: 'إنشاء تقرير',
    privacyRequest: 'طلب الخصوصية',
    dataQuality: 'جودة البيانات',
    auditTrail: 'مسار التدقيق',
    riskAssessment: 'تقييم المخاطر',
    // Loan system translations
    loan: 'قرض',
    loans: 'القروض',
    createLoan: 'إنشاء قرض',
    loanAmount: 'مبلغ القرض',
    loanMonths: 'أشهر القرض',
    borrowerPhone: 'هاتف المقترض',
    loanDisbursement: 'صرف القرض',
    loanPayment: 'دفعة القرض',
    rateBorrower: 'تقييم المقترض',
    loanRating: 'تقييم القرض',
    creditScore: 'النقاط الائتمانية',
    paymentHistory: 'تاريخ الدفعات',
    onTimePayments: 'الدفعات في الوقت المحدد',
    latePayments: 'الدفعات المتأخرة',
    defaultedLoans: 'القروض المتعثرة',
    activeLoan: 'قرض نشط',
    completedLoan: 'قرض مكتمل',
    monthlyPayment: 'الدفعة الشهرية',
    remainingPayments: 'الدفعات المتبقية',
    nextPaymentDate: 'تاريخ الدفعة التالية',
    interestRate: 'معدل الفائدة',
    totalAmount: 'المبلغ الإجمالي',
    paidAmount: 'المبلغ المدفوع',
    outstandingAmount: 'المبلغ المستحق',
    loanTerms: 'شروط القرض',
    earlyRepayment: 'السداد المبكر',
    latePaymentFee: 'رسوم التأخير',
    loanAgreement: 'اتفاقية القرض',
    borrowerRating: 'تقييم المقترض',
    lenderRating: 'تقييم المقرض',
    reliability: 'الموثوقية',
    communication: 'التواصل',
    paymentPunctuality: 'دقة الدفع',
    loanHistory: 'تاريخ القروض',
    repaymentSchedule: 'جدول السداد',
    automaticPayment: 'الدفع التلقائي',
    manualPayment: 'الدفع اليدوي',
    paymentReminder: 'تذكير الدفع',
    loanApproval: 'موافقة القرض',
    loanRejection: 'رفض القرض',
    loanRequest: 'طلب قرض',
    loanOffer: 'عرض قرض',
    collateral: 'ضمان',
    guarantor: 'كفيل',
    unsecuredLoan: 'قرض غير مضمون',
    securedLoan: 'قرض مضمون',
    personalLoan: 'قرض شخصي',
    businessLoan: 'قرض تجاري',
    emergencyLoan: 'قرض طوارئ',
    shortTermLoan: 'قرض قصير الأجل',
    longTermLoan: 'قرض طويل الأجل',
    loanPurpose: 'غرض القرض',
    loanApplication: 'طلب القرض',
    loanDocuments: 'وثائق القرض',
    loanVerification: 'التحقق من القرض',
    loanDisbursed: 'تم صرف القرض',
    loanCompleted: 'تم إكمال القرض',
    loanDefaulted: 'تعثر القرض',
    loanCancelled: 'تم إلغاء القرض',
    loanSuspended: 'تم تعليق القرض',
    loanRestructured: 'تم إعادة هيكلة القرض',
    gracePeriod: 'فترة السماح',
    penaltyRate: 'معدل الغرامة',
    compoundInterest: 'فائدة مركبة',
    simpleInterest: 'فائدة بسيطة',
    fixedRate: 'معدل ثابت',
    variableRate: 'معدل متغير',
    apr: 'معدل الفائدة السنوي',
    emi: 'القسط الشهري',
    principalAmount: 'المبلغ الأساسي',
    interestAmount: 'مبلغ الفائدة',
    processingFee: 'رسوم المعالجة',
    prepaymentPenalty: 'غرامة السداد المبكر',
    loanInsurance: 'تأمين القرض',
    loanProtection: 'حماية القرض',
    debtConsolidation: 'توحيد الديون',
    refinancing: 'إعادة التمويل',
    loanTransfer: 'تحويل القرض',
    loanSettlement: 'تسوية القرض',
    partialPayment: 'دفعة جزئية',
    fullPayment: 'دفعة كاملة',
    overduePayment: 'دفعة متأخرة',
    paymentSchedule: 'جدول الدفعات',
    paymentMethod: 'طريقة الدفع',
    autoDebit: 'خصم تلقائي',
    bankTransfer: 'تحويل بنكي',
    cashPayment: 'دفع نقدي',
    onlinePayment: 'دفع إلكتروني',
    mobilePayment: 'دفع عبر الهاتف',
    walletPayment: 'دفع عبر المحفظة',
    creditCardPayment: 'دفع بالبطاقة الائتمانية',
    debitCardPayment: 'دفع بالبطاقة المصرفية',
    checkPayment: 'دفع بالشيك',
    wireTransfer: 'تحويل سلكي',
    ach: 'تحويل إلكتروني',
    swift: 'سويفت',
    rtgs: 'نظام التسوية الإجمالية',
    neft: 'تحويل إلكتروني',
    imps: 'دفع فوري',
    upi: 'واجهة الدفع الموحدة',
    paypal: 'باي بال',
    stripe: 'سترايب',
    razorpay: 'رازور باي',
    paytm: 'باي تي إم',
    phonepe: 'فون بي',
    googlepay: 'جوجل باي',
    applepay: 'آبل باي',
    samsungpay: 'سامسونج باي',
    amazonpay: 'أمازون باي',
    fawry: 'فوري',
    vodafonecash: 'فودافون كاش',
    orangemoney: 'أورانج موني',
    etisalatcash: 'اتصالات كاش',
    stcpay: 'إس تي سي باي',
    mada: 'مدى',
    visa: 'فيزا',
    mastercard: 'ماستركارد',
    amex: 'أمريكان إكسبريس',
    discoverCard: 'ديسكفر',
    dinersclub: 'دايرز كلوب',
    jcb: 'جي سي بي',
    unionpay: 'يونيون باي',
    rupay: 'روباي',
    elo: 'إيلو',
    hipercard: 'هايبركارد',
    cartesbancaires: 'كارت بانكير',
    interac: 'إنتراك',
    maestro: 'مايسترو',
    vpay: 'في باي',
    electron: 'إلكترون',
    plus: 'بلس',
    cirrus: 'سيروس',
    star: 'ستار',
    pulse: 'بولس',
    nyce: 'نايس',
    accel: 'أكسل',
    shazam: 'شازام',
    jeanie: 'جيني',
    honor: 'هونر',
    quest: 'كويست',
    affn: 'إيه إف إف إن',
    coop: 'كوب',
    culiance: 'كوليانس',
    exchange: 'إكستشينج',
    moneypass: 'موني باس',
    transfund: 'ترانسفند',
    allpoint: 'أول بوينت',
    cardtronics: 'كارد ترونيكس',
    elan: 'إيلان',
    firstdata: 'فيرست داتا',
    globalPayments: 'جلوبال بايمنتس',
    tsys: 'تي سيس',
    worldpay: 'وورلد باي',
    square: 'سكوير',
    clover: 'كلوفر',
    toast: 'توست',
    lightspeed: 'لايت سبيد',
    shopify: 'شوبيفاي',
    woocommerce: 'ووكومرس',
    magento: 'ماجنتو',
    prestashop: 'بريستاشوب',
    opencart: 'أوبن كارت',
    bigcommerce: 'بيج كومرس',
    volusion: 'فولوشن',
    threedsixtycommerce: 'ثري دي سيكستي كومرس',
    nopcommerce: 'نوب كومرس',
    umbraco: 'أمبراكو',
    drupal: 'دروبال',
    joomla: 'جوملا',
    wordpress: 'ووردبريس',
    squarespace: 'سكوير سبيس',
    wix: 'ويكس',
    weebly: 'ويبلي',
    godaddy: 'جو دادي',
    bluehost: 'بلو هوست',
    hostgator: 'هوست جيتر',
    siteground: 'سايت جراوند',
    dreamhost: 'دريم هوست',
    inmotion: 'إن موشن',
    a2hosting: 'إيه تو هوستنج',
    greengeeks: 'جرين جيكس',
    hostinger: 'هوستنجر',
    namecheap: 'نيم تشيب',
    cloudflare: 'كلاود فلير',
    aws: 'أمازون ويب سيرفيسز',
    azure: 'أزور',
    gcp: 'جوجل كلاود',
    digitalocean: 'ديجيتال أوشن',
    linode: 'لينود',
    vultr: 'فولتر',
    hetzner: 'هيتزنر',
    ovh: 'أو في إتش',
    scaleway: 'سكيل واي',
    upcloud: 'أب كلاود',
    contabo: 'كونتابو',
    ionos: 'أيونوس',
  },
};