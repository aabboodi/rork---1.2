import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecurityManager from './SecurityManager';
import CryptoService from './CryptoService';

// DLP Policy Types
interface DLPPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'allow' | 'warn' | 'block' | 'quarantine' | 'encrypt';
  rules: DLPRule[];
  scope: 'messages' | 'attachments' | 'all';
  createdAt: number;
  updatedAt: number;
}

interface DLPRule {
  id: string;
  type: 'regex' | 'keyword' | 'pattern' | 'ml_classification';
  pattern: string;
  description: string;
  confidence: number; // 0-1
  enabled: boolean;
  category: DLPCategory;
}

type DLPCategory = 
  | 'pii' // Personal Identifiable Information
  | 'financial' // Financial data
  | 'medical' // Medical records
  | 'credentials' // Passwords, tokens
  | 'confidential' // Confidential business data
  | 'government_id' // Government IDs
  | 'contact_info' // Contact information
  | 'custom'; // Custom patterns

interface DLPViolation {
  id: string;
  policyId: string;
  ruleId: string;
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
    fileName?: string;
    fileSize?: number;
  };
  matches: DLPMatch[];
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

interface DLPMatch {
  ruleId: string;
  pattern: string;
  matchedText: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  category: DLPCategory;
}

interface DLPScanResult {
  allowed: boolean;
  violations: DLPViolation[];
  sanitizedContent?: string;
  warnings: string[];
  requiresUserConfirmation: boolean;
  suggestedAction: 'proceed' | 'encrypt' | 'redact' | 'block';
}

interface DLPConfiguration {
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

class DLPService {
  private static instance: DLPService;
  private policies: Map<string, DLPPolicy> = new Map();
  private violations: DLPViolation[] = [];
  private configuration: DLPConfiguration;
  private securityManager: SecurityManager;
  private cryptoService: CryptoService;
  private serviceActive: boolean = false;

  private constructor() {
    this.securityManager = SecurityManager.getInstance();
    this.cryptoService = CryptoService.getInstance();
    
    this.configuration = {
      enabled: true,
      strictMode: false,
      autoQuarantine: true,
      userOverrideAllowed: true,
      encryptSensitiveData: true,
      logAllScans: true,
      realTimeScanning: true,
      attachmentScanning: true,
      ocrScanning: false, // Disabled by default due to performance
      mlClassification: false, // Disabled by default
      customPatterns: [],
      whitelistedUsers: [],
      exemptedChats: []
    };

    this.initializeDefaultPolicies();
  }

  static getInstance(): DLPService {
    if (!DLPService.instance) {
      DLPService.instance = new DLPService();
    }
    return DLPService.instance;
  }

  // ===== INITIALIZATION =====

  async initialize(): Promise<void> {
    try {
      await this.loadPersistedData();
      this.serviceActive = true;
      console.log('DLP Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DLP Service:', error);
      throw error;
    }
  }

  private initializeDefaultPolicies(): void {
    // Saudi Arabia National ID Policy
    const saudiIdPolicy: DLPPolicy = {
      id: 'saudi_national_id',
      name: 'Saudi National ID Protection',
      description: 'Protects Saudi national ID numbers',
      enabled: true,
      severity: 'high',
      action: 'warn',
      scope: 'all',
      rules: [
        {
          id: 'saudi_id_pattern',
          type: 'regex',
          pattern: '\\b[12]\\d{9}\\b',
          description: 'Saudi National ID (10 digits starting with 1 or 2)',
          confidence: 0.9,
          enabled: true,
          category: 'government_id'
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Credit Card Policy
    const creditCardPolicy: DLPPolicy = {
      id: 'credit_card_protection',
      name: 'Credit Card Protection',
      description: 'Protects credit card numbers',
      enabled: true,
      severity: 'critical',
      action: 'block',
      scope: 'all',
      rules: [
        {
          id: 'visa_pattern',
          type: 'regex',
          pattern: '\\b4[0-9]{12}(?:[0-9]{3})?\\b',
          description: 'Visa credit card numbers',
          confidence: 0.95,
          enabled: true,
          category: 'financial'
        },
        {
          id: 'mastercard_pattern',
          type: 'regex',
          pattern: '\\b5[1-5][0-9]{14}\\b',
          description: 'MasterCard credit card numbers',
          confidence: 0.95,
          enabled: true,
          category: 'financial'
        },
        {
          id: 'amex_pattern',
          type: 'regex',
          pattern: '\\b3[47][0-9]{13}\\b',
          description: 'American Express credit card numbers',
          confidence: 0.95,
          enabled: true,
          category: 'financial'
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Phone Number Policy
    const phonePolicy: DLPPolicy = {
      id: 'phone_number_protection',
      name: 'Phone Number Protection',
      description: 'Protects phone numbers',
      enabled: true,
      severity: 'medium',
      action: 'warn',
      scope: 'all',
      rules: [
        {
          id: 'saudi_mobile_pattern',
          type: 'regex',
          pattern: '\\b(\\+966|0)?5[0-9]{8}\\b',
          description: 'Saudi mobile phone numbers',
          confidence: 0.8,
          enabled: true,
          category: 'contact_info'
        },
        {
          id: 'international_phone_pattern',
          type: 'regex',
          pattern: '\\+[1-9]\\d{1,14}\\b',
          description: 'International phone numbers',
          confidence: 0.7,
          enabled: true,
          category: 'contact_info'
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Email Policy
    const emailPolicy: DLPPolicy = {
      id: 'email_protection',
      name: 'Email Address Protection',
      description: 'Protects email addresses',
      enabled: true,
      severity: 'low',
      action: 'warn',
      scope: 'all',
      rules: [
        {
          id: 'email_pattern',
          type: 'regex',
          pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
          description: 'Email addresses',
          confidence: 0.9,
          enabled: true,
          category: 'contact_info'
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Password/Token Policy
    const credentialsPolicy: DLPPolicy = {
      id: 'credentials_protection',
      name: 'Credentials Protection',
      description: 'Protects passwords and tokens',
      enabled: true,
      severity: 'critical',
      action: 'block',
      scope: 'all',
      rules: [
        {
          id: 'password_keyword',
          type: 'keyword',
          pattern: '(password|passwd|pwd|token|secret|key)\\s*[:=]\\s*\\S+',
          description: 'Password and token patterns',
          confidence: 0.8,
          enabled: true,
          category: 'credentials'
        },
        {
          id: 'api_key_pattern',
          type: 'regex',
          pattern: '\\b[A-Za-z0-9]{32,}\\b',
          description: 'API keys and long tokens',
          confidence: 0.6,
          enabled: true,
          category: 'credentials'
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // IBAN Policy
    const ibanPolicy: DLPPolicy = {
      id: 'iban_protection',
      name: 'IBAN Protection',
      description: 'Protects International Bank Account Numbers',
      enabled: true,
      severity: 'high',
      action: 'block',
      scope: 'all',
      rules: [
        {
          id: 'saudi_iban_pattern',
          type: 'regex',
          pattern: '\\bSA\\d{2}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}\\b',
          description: 'Saudi IBAN numbers',
          confidence: 0.95,
          enabled: true,
          category: 'financial'
        },
        {
          id: 'general_iban_pattern',
          type: 'regex',
          pattern: '\\b[A-Z]{2}\\d{2}[A-Z0-9]{4}\\d{7}([A-Z0-9]?){0,16}\\b',
          description: 'General IBAN format',
          confidence: 0.85,
          enabled: true,
          category: 'financial'
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Store default policies
    this.policies.set(saudiIdPolicy.id, saudiIdPolicy);
    this.policies.set(creditCardPolicy.id, creditCardPolicy);
    this.policies.set(phonePolicy.id, phonePolicy);
    this.policies.set(emailPolicy.id, emailPolicy);
    this.policies.set(credentialsPolicy.id, credentialsPolicy);
    this.policies.set(ibanPolicy.id, ibanPolicy);
  }

  // ===== CONTENT SCANNING =====

  async scanContent(
    content: string,
    context: {
      userId: string;
      chatId?: string;
      messageId?: string;
      messageType: 'text' | 'image' | 'video' | 'file' | 'voice';
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    }
  ): Promise<DLPScanResult> {
    try {
      if (!this.configuration.enabled) {
        return {
          allowed: true,
          violations: [],
          warnings: [],
          requiresUserConfirmation: false,
          suggestedAction: 'proceed'
        };
      }

      // Check if user or chat is exempted
      if (this.configuration.whitelistedUsers.includes(context.userId) ||
          (context.chatId && this.configuration.exemptedChats.includes(context.chatId))) {
        return {
          allowed: true,
          violations: [],
          warnings: ['Content scanning bypassed for exempted user/chat'],
          requiresUserConfirmation: false,
          suggestedAction: 'proceed'
        };
      }

      const violations: DLPViolation[] = [];
      const warnings: string[] = [];
      let sanitizedContent = content;
      let overallSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let suggestedAction: 'proceed' | 'encrypt' | 'redact' | 'block' = 'proceed';

      // Scan against all enabled policies
      for (const policy of this.policies.values()) {
        if (!policy.enabled) continue;

        // Check scope
        if (policy.scope === 'messages' && context.messageType !== 'text') continue;
        if (policy.scope === 'attachments' && context.messageType === 'text') continue;

        const policyViolations = await this.scanAgainstPolicy(content, policy, context);
        violations.push(...policyViolations);

        // Update overall severity
        if (policyViolations.length > 0) {
          if (policy.severity === 'critical') overallSeverity = 'critical';
          else if (policy.severity === 'high' && overallSeverity !== 'critical') overallSeverity = 'high';
          else if (policy.severity === 'medium' && !['critical', 'high'].includes(overallSeverity)) overallSeverity = 'medium';
        }
      }

      // Determine action based on violations
      if (violations.length > 0) {
        const criticalViolations = violations.filter(v => v.severity === 'critical');
        const highViolations = violations.filter(v => v.severity === 'high');

        if (criticalViolations.length > 0) {
          const blockActions = criticalViolations.filter(v => v.action === 'blocked');
          if (blockActions.length > 0) {
            suggestedAction = 'block';
          } else {
            suggestedAction = 'encrypt';
          }
        } else if (highViolations.length > 0) {
          suggestedAction = 'encrypt';
        } else {
          suggestedAction = 'redact';
        }

        // Generate sanitized content
        sanitizedContent = this.sanitizeContent(content, violations);
        
        // Generate warnings
        warnings.push(`Found ${violations.length} potential data leak(s)`);
        violations.forEach(v => {
          warnings.push(`${v.category.toUpperCase()}: ${v.matches.length} match(es) found`);
        });
      }

      // Log scan if enabled
      if (this.configuration.logAllScans) {
        await this.logScanResult(content, context, violations);
      }

      // Store violations
      this.violations.push(...violations);
      await this.persistViolations();

      const result: DLPScanResult = {
        allowed: suggestedAction !== 'block',
        violations,
        sanitizedContent: sanitizedContent !== content ? sanitizedContent : undefined,
        warnings,
        requiresUserConfirmation: violations.length > 0 && this.configuration.userOverrideAllowed,
        suggestedAction
      };

      return result;
    } catch (error) {
      console.error('DLP content scanning failed:', error);
      return {
        allowed: !this.configuration.strictMode,
        violations: [],
        warnings: ['DLP scanning failed - content allowed by default'],
        requiresUserConfirmation: false,
        suggestedAction: 'proceed'
      };
    }
  }

  private async scanAgainstPolicy(
    content: string,
    policy: DLPPolicy,
    context: any
  ): Promise<DLPViolation[]> {
    const violations: DLPViolation[] = [];

    for (const rule of policy.rules) {
      if (!rule.enabled) continue;

      const matches = this.findMatches(content, rule);
      
      if (matches.length > 0) {
        const violation: DLPViolation = {
          id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          policyId: policy.id,
          ruleId: rule.id,
          content: content,
          redactedContent: this.redactMatches(content, matches),
          category: rule.category,
          severity: policy.severity,
          action: this.determineAction(policy.action, rule.confidence),
          timestamp: Date.now(),
          userId: context.userId,
          chatId: context.chatId,
          messageId: context.messageId,
          context: {
            messageType: context.messageType,
            fileType: context.fileType,
            fileName: context.fileName,
            fileSize: context.fileSize
          },
          matches,
          resolved: false
        };

        violations.push(violation);
      }
    }

    return violations;
  }

  private findMatches(content: string, rule: DLPRule): DLPMatch[] {
    const matches: DLPMatch[] = [];

    try {
      let regex: RegExp;
      
      if (rule.type === 'regex' || rule.type === 'pattern') {
        regex = new RegExp(rule.pattern, 'gi');
      } else if (rule.type === 'keyword') {
        regex = new RegExp(rule.pattern, 'gi');
      } else {
        return matches; // ML classification not implemented yet
      }

      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          ruleId: rule.id,
          pattern: rule.pattern,
          matchedText: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: rule.confidence,
          category: rule.category
        });

        // Prevent infinite loop
        if (regex.lastIndex === match.index) {
          regex.lastIndex++;
        }
      }
    } catch (error) {
      console.error('Error finding matches for rule:', rule.id, error);
    }

    return matches;
  }

  private redactMatches(content: string, matches: DLPMatch[]): string {
    let redacted = content;
    
    // Sort matches by start index in descending order to avoid index shifting
    const sortedMatches = matches.sort((a, b) => b.startIndex - a.startIndex);
    
    for (const match of sortedMatches) {
      const redactionText = '*'.repeat(Math.min(match.matchedText.length, 8));
      redacted = redacted.substring(0, match.startIndex) + 
                 redactionText + 
                 redacted.substring(match.endIndex);
    }
    
    return redacted;
  }

  private sanitizeContent(content: string, violations: DLPViolation[]): string {
    let sanitized = content;
    
    for (const violation of violations) {
      if (violation.action === 'blocked') {
        return '[CONTENT BLOCKED BY DLP]';
      } else if (violation.action === 'quarantined') {
        return '[CONTENT QUARANTINED - PENDING REVIEW]';
      } else {
        sanitized = violation.redactedContent;
      }
    }
    
    return sanitized;
  }

  private determineAction(policyAction: string, confidence: number): 'allowed' | 'warned' | 'blocked' | 'quarantined' | 'encrypted' {
    if (confidence < 0.5) {
      return 'allowed';
    } else if (confidence < 0.7) {
      return 'warned';
    } else {
      switch (policyAction) {
        case 'block':
          return 'blocked';
        case 'quarantine':
          return 'quarantined';
        case 'encrypt':
          return 'encrypted';
        case 'warn':
          return 'warned';
        default:
          return 'allowed';
      }
    }
  }

  // ===== POLICY MANAGEMENT =====

  async createPolicy(policy: Omit<DLPPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const policyId = `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newPolicy: DLPPolicy = {
      ...policy,
      id: policyId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.policies.set(policyId, newPolicy);
    await this.persistPolicies();
    
    console.log(`Created DLP policy: ${newPolicy.name}`);
    return policyId;
  }

  async updatePolicy(policyId: string, updates: Partial<DLPPolicy>): Promise<void> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const updatedPolicy = {
      ...policy,
      ...updates,
      updatedAt: Date.now()
    };

    this.policies.set(policyId, updatedPolicy);
    await this.persistPolicies();
    
    console.log(`Updated DLP policy: ${policyId}`);
  }

  async deletePolicy(policyId: string): Promise<void> {
    if (!this.policies.has(policyId)) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    this.policies.delete(policyId);
    await this.persistPolicies();
    
    console.log(`Deleted DLP policy: ${policyId}`);
  }

  // ===== VIOLATION MANAGEMENT =====

  async resolveViolation(violationId: string, resolvedBy: string): Promise<void> {
    const violation = this.violations.find(v => v.id === violationId);
    if (violation) {
      violation.resolved = true;
      violation.resolvedAt = Date.now();
      violation.resolvedBy = resolvedBy;
      await this.persistViolations();
    }
  }

  async getViolations(filters?: {
    userId?: string;
    chatId?: string;
    severity?: string;
    category?: DLPCategory;
    resolved?: boolean;
    timeRange?: { start: number; end: number };
  }): Promise<DLPViolation[]> {
    let filtered = [...this.violations];

    if (filters) {
      if (filters.userId) {
        filtered = filtered.filter(v => v.userId === filters.userId);
      }
      if (filters.chatId) {
        filtered = filtered.filter(v => v.chatId === filters.chatId);
      }
      if (filters.severity) {
        filtered = filtered.filter(v => v.severity === filters.severity);
      }
      if (filters.category) {
        filtered = filtered.filter(v => v.category === filters.category);
      }
      if (filters.resolved !== undefined) {
        filtered = filtered.filter(v => v.resolved === filters.resolved);
      }
      if (filters.timeRange) {
        filtered = filtered.filter(v => 
          v.timestamp >= filters.timeRange!.start && 
          v.timestamp <= filters.timeRange!.end
        );
      }
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ===== CONFIGURATION =====

  async updateConfiguration(config: Partial<DLPConfiguration>): Promise<void> {
    this.configuration = { ...this.configuration, ...config };
    await this.persistConfiguration();
    console.log('DLP configuration updated');
  }

  getConfiguration(): DLPConfiguration {
    return { ...this.configuration };
  }

  getPolicies(): DLPPolicy[] {
    return Array.from(this.policies.values());
  }

  // ===== REPORTING =====

  async generateDLPReport(timeRange: { start: number; end: number }): Promise<{
    summary: {
      totalScans: number;
      totalViolations: number;
      blockedContent: number;
      quarantinedContent: number;
      topCategories: Array<{ category: DLPCategory; count: number }>;
      topUsers: Array<{ userId: string; violations: number }>;
    };
    violations: DLPViolation[];
    trends: Array<{ date: string; violations: number }>;
  }> {
    const violations = await this.getViolations({ timeRange });
    
    const summary = {
      totalScans: violations.length, // Simplified - in real implementation, track actual scans
      totalViolations: violations.length,
      blockedContent: violations.filter(v => v.action === 'blocked').length,
      quarantinedContent: violations.filter(v => v.action === 'quarantined').length,
      topCategories: this.getTopCategories(violations),
      topUsers: this.getTopUsers(violations)
    };

    const trends = this.generateTrends(violations, timeRange);

    return { summary, violations, trends };
  }

  private getTopCategories(violations: DLPViolation[]): Array<{ category: DLPCategory; count: number }> {
    const categoryCount = new Map<DLPCategory, number>();
    
    violations.forEach(v => {
      categoryCount.set(v.category, (categoryCount.get(v.category) || 0) + 1);
    });

    return Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getTopUsers(violations: DLPViolation[]): Array<{ userId: string; violations: number }> {
    const userCount = new Map<string, number>();
    
    violations.forEach(v => {
      userCount.set(v.userId, (userCount.get(v.userId) || 0) + 1);
    });

    return Array.from(userCount.entries())
      .map(([userId, violations]) => ({ userId, violations }))
      .sort((a, b) => b.violations - a.violations)
      .slice(0, 10);
  }

  private generateTrends(violations: DLPViolation[], timeRange: { start: number; end: number }): Array<{ date: string; violations: number }> {
    const trends: Array<{ date: string; violations: number }> = [];
    const dayMs = 24 * 60 * 60 * 1000;
    
    for (let time = timeRange.start; time <= timeRange.end; time += dayMs) {
      const date = new Date(time).toISOString().split('T')[0];
      const dayViolations = violations.filter(v => {
        const vDate = new Date(v.timestamp).toISOString().split('T')[0];
        return vDate === date;
      }).length;
      
      trends.push({ date, violations: dayViolations });
    }
    
    return trends;
  }

  // ===== DATA PERSISTENCE =====

  private async persistPolicies(): Promise<void> {
    try {
      await AsyncStorage.setItem('dlp_policies', JSON.stringify(Array.from(this.policies.entries())));
    } catch (error) {
      console.error('Failed to persist DLP policies:', error);
    }
  }

  private async persistViolations(): Promise<void> {
    try {
      // Keep only last 1000 violations
      const recentViolations = this.violations.slice(-1000);
      await AsyncStorage.setItem('dlp_violations', JSON.stringify(recentViolations));
    } catch (error) {
      console.error('Failed to persist DLP violations:', error);
    }
  }

  private async persistConfiguration(): Promise<void> {
    try {
      await AsyncStorage.setItem('dlp_configuration', JSON.stringify(this.configuration));
    } catch (error) {
      console.error('Failed to persist DLP configuration:', error);
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      const policiesData = await AsyncStorage.getItem('dlp_policies');
      const violationsData = await AsyncStorage.getItem('dlp_violations');
      const configData = await AsyncStorage.getItem('dlp_configuration');

      if (policiesData) {
        const policiesArray = JSON.parse(policiesData);
        this.policies = new Map(policiesArray);
      }

      if (violationsData) {
        this.violations = JSON.parse(violationsData);
      }

      if (configData) {
        this.configuration = { ...this.configuration, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.error('Failed to load persisted DLP data:', error);
    }
  }

  private async logScanResult(content: string, context: any, violations: DLPViolation[]): Promise<void> {
    try {
      const logEntry = {
        timestamp: Date.now(),
        contentLength: content.length,
        context,
        violationsFound: violations.length,
        categories: [...new Set(violations.map(v => v.category))],
        severity: violations.length > 0 ? Math.max(...violations.map(v => 
          v.severity === 'critical' ? 4 : v.severity === 'high' ? 3 : v.severity === 'medium' ? 2 : 1
        )) : 0
      };

      // In production, this would go to a proper logging system
      console.log('DLP Scan:', logEntry);
    } catch (error) {
      console.error('Failed to log DLP scan result:', error);
    }
  }

  // ===== PUBLIC API =====

  isEnabled(): boolean {
    return this.configuration.enabled && this.serviceActive;
  }

  async enableDLP(): Promise<void> {
    await this.updateConfiguration({ enabled: true });
  }

  async disableDLP(): Promise<void> {
    await this.updateConfiguration({ enabled: false });
  }

  getDLPStatus(): {
    enabled: boolean;
    policiesCount: number;
    recentViolations: number;
    lastScan: number;
  } {
    const recentViolations = this.violations.filter(
      v => Date.now() - v.timestamp < 24 * 60 * 60 * 1000
    ).length;

    const lastScan = this.violations.length > 0 
      ? Math.max(...this.violations.map(v => v.timestamp))
      : 0;

    return {
      enabled: this.configuration.enabled,
      policiesCount: this.policies.size,
      recentViolations,
      lastScan
    };
  }

  async cleanup(): Promise<void> {
    await this.persistPolicies();
    await this.persistViolations();
    await this.persistConfiguration();
    this.serviceActive = false;
    console.log('DLP Service cleanup completed');
  }
}

export default DLPService;
export type { DLPPolicy, DLPRule, DLPViolation, DLPScanResult, DLPConfiguration, DLPCategory };