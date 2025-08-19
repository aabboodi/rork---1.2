import { Platform } from 'react-native';
import {
  ABACPolicy,
  ABACRequest,
  ABACDecision,
  ABACCondition,
  RBACRole,
  RBACPermission,
  UserRoleAssignment,
  ExpiringMessage,
  ExpirationPolicy,
  GroupChatAccessControl,
  PersonalDataAccessControl,
  AccessControlAudit,
  User,
  Chat,
  Message
} from '@/types';
import SecureStorage from './SecureStorage';
import CryptoService from './CryptoService';

interface AccessControlConfig {
  enableABAC: boolean;
  enableRBAC: boolean;
  enableExpiringMessages: boolean;
  enablePersonalDataControl: boolean;
  enableAuditLogging: boolean;
  defaultDenyPolicy: boolean;
  policyEvaluationTimeout: number;
  maxPolicyComplexity: number;
}

interface PolicyEvaluationContext {
  currentTime: number;
  userLocation?: { latitude: number; longitude: number };
  deviceSecurity: any;
  networkInfo: any;
  sessionInfo: any;
}

class AccessControlService {
  private static instance: AccessControlService;
  private secureStorage: SecureStorage;
  private cryptoService: CryptoService;
  private config: AccessControlConfig;
  private abacPolicies: Map<string, ABACPolicy> = new Map();
  private rbacRoles: Map<string, RBACRole> = new Map();
  private userRoleAssignments: Map<string, UserRoleAssignment[]> = new Map();
  private expiringMessages: Map<string, ExpiringMessage> = new Map();
  private auditLog: AccessControlAudit[] = [];

  private constructor() {
    this.secureStorage = SecureStorage.getInstance();
    this.cryptoService = CryptoService.getInstance();
    this.config = {
      enableABAC: true,
      enableRBAC: true,
      enableExpiringMessages: true,
      enablePersonalDataControl: true,
      enableAuditLogging: true,
      defaultDenyPolicy: true,
      policyEvaluationTimeout: 5000, // 5 seconds
      maxPolicyComplexity: 100
    };
    this.initializeDefaultPolicies();
  }

  static getInstance(): AccessControlService {
    if (!AccessControlService.instance) {
      AccessControlService.instance = new AccessControlService();
    }
    return AccessControlService.instance;
  }

  // ===== ENHANCED ABAC (Attribute-Based Access Control) =====

  async evaluateAccess(request: ABACRequest): Promise<ABACDecision> {
    const startTime = Date.now();
    
    try {
      // Enhanced context enrichment
      const enrichedRequest = await this.enrichRequestContext(request);
      
      // Get applicable policies with advanced matching
      const applicablePolicies = await this.getApplicablePoliciesAdvanced(enrichedRequest);
      
      if (applicablePolicies.length === 0) {
        return {
          decision: this.config.defaultDenyPolicy ? 'deny' : 'allow',
          appliedPolicies: [],
          reason: 'No applicable policies found',
          timestamp: Date.now(),
          evaluationTime: Date.now() - startTime
        };
      }

      // Advanced policy sorting with conflict resolution
      const sortedPolicies = this.sortPoliciesWithConflictResolution(applicablePolicies);

      // Evaluate policies with enhanced logic
      let finalDecision: 'allow' | 'deny' | 'conditional' = this.config.defaultDenyPolicy ? 'deny' : 'allow';
      const appliedPolicies: string[] = [];
      const warnings: string[] = [];
      const conditions: ABACCondition[] = [];
      const policyConflicts: string[] = [];

      for (const policy of sortedPolicies) {
        if (!policy.enabled) continue;

        const policyResult = await this.evaluatePolicyAdvanced(policy, enrichedRequest);
        appliedPolicies.push(policy.id);

        // Enhanced conflict detection
        if (policyResult.conflicts) {
          policyConflicts.push(...policyResult.conflicts);
        }

        // Advanced decision logic with precedence rules
        if (policyResult.decision === 'deny') {
          finalDecision = 'deny';
          break; // Deny takes precedence
        } else if (policyResult.decision === 'allow' && finalDecision !== 'deny') {
          finalDecision = 'allow';
        } else if (policyResult.decision === 'conditional' && finalDecision !== 'deny') {
          finalDecision = 'conditional';
          conditions.push(...(policyResult.conditions || []));
        }

        if (policyResult.warnings) {
          warnings.push(...policyResult.warnings);
        }
      }

      // Apply dynamic risk-based adjustments
      const riskAdjustedDecision = await this.applyRiskBasedAdjustments(
        finalDecision, 
        enrichedRequest, 
        appliedPolicies
      );

      const decision: ABACDecision = {
        decision: riskAdjustedDecision.decision,
        appliedPolicies,
        reason: this.generateAdvancedDecisionReason(riskAdjustedDecision.decision, appliedPolicies, policyConflicts),
        conditions: conditions.length > 0 ? conditions : undefined,
        timestamp: Date.now(),
        evaluationTime: Date.now() - startTime,
        warnings: warnings.length > 0 ? warnings : undefined,
        riskScore: riskAdjustedDecision.riskScore,
        contextualFactors: riskAdjustedDecision.contextualFactors
      };

      // Enhanced audit with risk context
      if (this.config.enableAuditLogging) {
        await this.auditAccessDecisionAdvanced(enrichedRequest, decision);
      }

      return decision;
    } catch (error) {
      console.error('💥 Enhanced access control evaluation failed:', error);
      return {
        decision: 'deny',
        appliedPolicies: [],
        reason: 'Evaluation error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        timestamp: Date.now(),
        evaluationTime: Date.now() - startTime
      };
    }
  }

  // Enhanced context enrichment for better decision making
  private async enrichRequestContext(request: ABACRequest): Promise<ABACRequest> {
    const enrichedContext = { ...request.context };
    
    try {
      // Add current time context
      const now = new Date();
      enrichedContext.currentTime = {
        hour: now.getHours(),
        dayOfWeek: now.getDay(),
        timestamp: now.getTime()
      };
      
      // Add user behavior context
      enrichedContext.userBehavior = await this.getUserBehaviorContext(request.subject.identifier);
      
      // Add resource sensitivity context
      enrichedContext.resourceSensitivity = await this.getResourceSensitivityContext(request.resource);
      
      // Add network security context
      enrichedContext.networkSecurity = await this.getNetworkSecurityContext();
      
      // Add session context
      enrichedContext.sessionContext = await this.getSessionContext(request.subject.identifier);
      
    } catch (error) {
      console.warn('Context enrichment failed:', error);
    }
    
    return {
      ...request,
      context: enrichedContext
    };
  }

  private async getApplicablePoliciesAdvanced(request: ABACRequest): Promise<ABACPolicy[]> {
    const applicablePolicies: ABACPolicy[] = [];

    for (const [policyId, policy] of this.abacPolicies) {
      if (!policy.enabled) continue;

      // Enhanced matching with fuzzy logic and context awareness
      const subjectMatch = await this.matchesSubjectAdvanced(policy.subjects, request.subject, request.context);
      const actionMatch = await this.matchesActionAdvanced(policy.actions, request.action, request.context);
      const resourceMatch = await this.matchesResourceAdvanced(policy.resources, request.resource, request.context);
      const contextMatch = await this.matchesContextAdvanced(policy.context, request.context);

      if (subjectMatch.matches && actionMatch.matches && resourceMatch.matches && contextMatch.matches) {
        // Add matching confidence scores
        const enhancedPolicy = {
          ...policy,
          matchingConfidence: {
            subject: subjectMatch.confidence,
            action: actionMatch.confidence,
            resource: resourceMatch.confidence,
            context: contextMatch.confidence,
            overall: (subjectMatch.confidence + actionMatch.confidence + resourceMatch.confidence + contextMatch.confidence) / 4
          }
        };
        applicablePolicies.push(enhancedPolicy);
      }
    }

    return applicablePolicies;
  }

  // Enhanced policy evaluation with advanced logic
  private async evaluatePolicyAdvanced(policy: ABACPolicy, request: ABACRequest): Promise<{
    decision: 'allow' | 'deny' | 'conditional';
    conditions?: ABACCondition[];
    warnings?: string[];
    conflicts?: string[];
    confidence?: number;
  }> {
    const warnings: string[] = [];
    const additionalConditions: ABACCondition[] = [];
    const conflicts: string[] = [];
    let totalConfidence = 0;
    let conditionCount = 0;

    // Enhanced condition evaluation with confidence scoring
    for (const condition of policy.conditions) {
      const conditionResult = await this.evaluateConditionAdvanced(condition, request);
      conditionCount++;
      totalConfidence += conditionResult.confidence || 0.5;
      
      if (!conditionResult.satisfied) {
        if (conditionResult.canBeConditional) {
          additionalConditions.push(condition);
        } else {
          // Condition failed and cannot be made conditional
          return {
            decision: policy.effect === 'allow' ? 'deny' : 'allow',
            warnings: [`Condition failed: ${condition.description}`],
            confidence: conditionResult.confidence || 0
          };
        }
      }

      if (conditionResult.warning) {
        warnings.push(conditionResult.warning);
      }
      
      if (conditionResult.conflicts) {
        conflicts.push(...conditionResult.conflicts);
      }
    }

    // Calculate overall confidence
    const overallConfidence = conditionCount > 0 ? totalConfidence / conditionCount : 0.5;

    // Apply dynamic policy adjustments based on context
    const adjustedDecision = await this.applyDynamicPolicyAdjustments(
      policy.effect, 
      request, 
      overallConfidence
    );

    // If we have additional conditions, return conditional
    if (additionalConditions.length > 0) {
      return {
        decision: 'conditional',
        conditions: additionalConditions,
        warnings: warnings.length > 0 ? warnings : undefined,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        confidence: overallConfidence
      };
    }

    // All conditions satisfied
    return {
      decision: adjustedDecision,
      warnings: warnings.length > 0 ? warnings : undefined,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      confidence: overallConfidence
    };
  }

  // Enhanced condition evaluation with advanced features
  private async evaluateConditionAdvanced(condition: ABACCondition, request: ABACRequest): Promise<{
    satisfied: boolean;
    canBeConditional: boolean;
    warning?: string;
    confidence?: number;
    conflicts?: string[];
  }> {
    try {
      switch (condition.type) {
        case 'time_based':
          return this.evaluateTimeBasedConditionAdvanced(condition, request);
        
        case 'location_based':
          return this.evaluateLocationBasedConditionAdvanced(condition, request);
        
        case 'device_based':
          return this.evaluateDeviceBasedConditionAdvanced(condition, request);
        
        case 'relationship_based':
          return this.evaluateRelationshipBasedConditionAdvanced(condition, request);
        
        case 'content_based':
          return this.evaluateContentBasedConditionAdvanced(condition, request);
        
        case 'group_role_based':
          return this.evaluateGroupRoleBasedConditionAdvanced(condition, request);
        
        case 'behavioral_pattern':
          return this.evaluateBehavioralPatternCondition(condition, request);
        
        case 'risk_based':
          return this.evaluateRiskBasedCondition(condition, request);
        
        case 'temporal_pattern':
          return this.evaluateTemporalPatternCondition(condition, request);
        
        case 'social_context':
          return this.evaluateSocialContextCondition(condition, request);
        
        case 'attribute_match':
        default:
          return this.evaluateAttributeMatchConditionAdvanced(condition, request);
      }
    } catch (error) {
      console.error('💥 Enhanced condition evaluation failed:', error);
      return {
        satisfied: false,
        canBeConditional: false,
        warning: `Condition evaluation error: ${condition.description}`,
        confidence: 0
      };
    }
  }

  private evaluateTimeBasedCondition(condition: ABACCondition, request: ABACRequest): {
    satisfied: boolean;
    canBeConditional: boolean;
    warning?: string;
  } {
    const currentTime = new Date(request.timestamp);
    const currentHour = currentTime.getHours();
    const currentDay = currentTime.getDay();

    if (condition.attribute === 'time_of_day') {
      const timeRange = condition.value as { start: string; end: string };
      const startHour = parseInt(timeRange.start.split(':')[0]);
      const endHour = parseInt(timeRange.end.split(':')[0]);
      
      const inTimeRange = currentHour >= startHour && currentHour <= endHour;
      
      return {
        satisfied: condition.operator === 'equals' ? inTimeRange : !inTimeRange,
        canBeConditional: false
      };
    }

    if (condition.attribute === 'day_of_week') {
      const allowedDays = condition.value as number[];
      const isDayAllowed = allowedDays.includes(currentDay);
      
      return {
        satisfied: condition.operator === 'in' ? isDayAllowed : !isDayAllowed,
        canBeConditional: false
      };
    }

    return { satisfied: true, canBeConditional: false };
  }

  private evaluateLocationBasedCondition(condition: ABACCondition, request: ABACRequest): {
    satisfied: boolean;
    canBeConditional: boolean;
    warning?: string;
  } {
    // Location-based conditions would require actual location data
    // For now, return satisfied with a warning
    return {
      satisfied: true,
      canBeConditional: true,
      warning: 'Location-based conditions require location services'
    };
  }

  private evaluateDeviceBasedCondition(condition: ABACCondition, request: ABACRequest): {
    satisfied: boolean;
    canBeConditional: boolean;
    warning?: string;
  } {
    if (condition.attribute === 'security_level') {
      const requiredLevel = condition.value as string;
      const deviceSecurityLevel = request.context.deviceSecurity?.minimumSecurityLevel || 'low';
      
      const securityLevels = ['low', 'medium', 'high', 'maximum'];
      const requiredIndex = securityLevels.indexOf(requiredLevel);
      const currentIndex = securityLevels.indexOf(deviceSecurityLevel);
      
      return {
        satisfied: currentIndex >= requiredIndex,
        canBeConditional: false
      };
    }

    if (condition.attribute === 'biometric_required') {
      const biometricRequired = condition.value as boolean;
      const biometricAvailable = request.context.deviceSecurity?.requireBiometric || false;
      
      return {
        satisfied: !biometricRequired || biometricAvailable,
        canBeConditional: true,
        warning: biometricRequired && !biometricAvailable ? 'Biometric authentication required' : undefined
      };
    }

    return { satisfied: true, canBeConditional: false };
  }

  private evaluateRelationshipBasedCondition(condition: ABACCondition, request: ABACRequest): {
    satisfied: boolean;
    canBeConditional: boolean;
    warning?: string;
  } {
    // Relationship-based conditions would check user relationships
    // This would require access to user relationship data
    return {
      satisfied: true,
      canBeConditional: false,
      warning: 'Relationship-based conditions require user relationship data'
    };
  }

  private evaluateContentBasedCondition(condition: ABACCondition, request: ABACRequest): {
    satisfied: boolean;
    canBeConditional: boolean;
    warning?: string;
  } {
    if (condition.attribute === 'sensitivity_level') {
      const maxSensitivity = condition.value as string;
      const contentSensitivity = request.resource.attributes.sensitivityLevel || 'public';
      
      const sensitivityLevels = ['public', 'internal', 'confidential', 'restricted'];
      const maxIndex = sensitivityLevels.indexOf(maxSensitivity);
      const contentIndex = sensitivityLevels.indexOf(contentSensitivity);
      
      return {
        satisfied: contentIndex <= maxIndex,
        canBeConditional: false
      };
    }

    return { satisfied: true, canBeConditional: false };
  }

  private evaluateGroupRoleBasedCondition(condition: ABACCondition, request: ABACRequest): {
    satisfied: boolean;
    canBeConditional: boolean;
    warning?: string;
  } {
    if (condition.attribute === 'required_role') {
      const requiredRole = condition.value as string;
      const userRoles = this.userRoleAssignments.get(request.subject.identifier) || [];
      const groupId = request.resource.attributes.groupId;
      
      const hasRole = userRoles.some(assignment => 
        assignment.roleId === requiredRole && 
        (assignment.groupId === groupId || !assignment.groupId) &&
        assignment.isActive &&
        (!assignment.expiresAt || assignment.expiresAt > Date.now())
      );
      
      return {
        satisfied: hasRole,
        canBeConditional: false
      };
    }

    return { satisfied: true, canBeConditional: false };
  }

  private evaluateAttributeMatchCondition(condition: ABACCondition, request: ABACRequest): {
    satisfied: boolean;
    canBeConditional: boolean;
    warning?: string;
  } {
    // Get the attribute value from the appropriate source
    let attributeValue: any;
    
    if (condition.attribute.startsWith('subject.')) {
      const attr = condition.attribute.substring(8);
      attributeValue = request.subject.attributes[attr];
    } else if (condition.attribute.startsWith('resource.')) {
      const attr = condition.attribute.substring(9);
      attributeValue = request.resource.attributes[attr];
    } else if (condition.attribute.startsWith('action.')) {
      const attr = condition.attribute.substring(7);
      attributeValue = request.action.attributes[attr];
    } else {
      attributeValue = request.context[condition.attribute as keyof typeof request.context];
    }

    // Evaluate based on operator
    let satisfied = false;
    
    switch (condition.operator) {
      case 'equals':
        satisfied = attributeValue === condition.value;
        break;
      case 'not_equals':
        satisfied = attributeValue !== condition.value;
        break;
      case 'contains':
        satisfied = String(attributeValue).includes(String(condition.value));
        break;
      case 'not_contains':
        satisfied = !String(attributeValue).includes(String(condition.value));
        break;
      case 'greater_than':
        satisfied = Number(attributeValue) > Number(condition.value);
        break;
      case 'less_than':
        satisfied = Number(attributeValue) < Number(condition.value);
        break;
      case 'in':
        satisfied = Array.isArray(condition.value) && condition.value.includes(attributeValue);
        break;
      case 'not_in':
        satisfied = Array.isArray(condition.value) && !condition.value.includes(attributeValue);
        break;
      case 'regex_match':
        try {
          const regex = new RegExp(condition.value);
          satisfied = regex.test(String(attributeValue));
        } catch {
          satisfied = false;
        }
        break;
      default:
        satisfied = false;
    }

    return {
      satisfied,
      canBeConditional: false
    };
  }

  private matchesSubject(policySubjects: any[], requestSubject: any): boolean {
    return policySubjects.some(subject => 
      subject.type === requestSubject.type && 
      (subject.identifier === '*' || subject.identifier === requestSubject.identifier)
    );
  }

  private matchesAction(policyActions: any[], requestAction: any): boolean {
    return policyActions.some(action => 
      action.type === requestAction.type && 
      (action.scope === '*' || action.scope === requestAction.scope)
    );
  }

  private matchesResource(policyResources: any[], requestResource: any): boolean {
    return policyResources.some(resource => 
      resource.type === requestResource.type && 
      (resource.identifier === '*' || resource.identifier === requestResource.identifier)
    );
  }

  private generateDecisionReason(decision: string, appliedPolicies: string[]): string {
    if (appliedPolicies.length === 0) {
      return `${decision} by default policy`;
    }
    return `${decision} by policies: ${appliedPolicies.join(', ')}`;
  }

  // ===== RBAC (Role-Based Access Control) =====

  async assignRole(userId: string, roleId: string, groupId?: string, assignedBy?: string): Promise<boolean> {
    try {
      const role = this.rbacRoles.get(roleId);
      if (!role) {
        throw new Error(`Role ${roleId} not found`);
      }

      const assignment: UserRoleAssignment = {
        userId,
        roleId,
        groupId,
        assignedBy: assignedBy || 'system',
        assignedAt: Date.now(),
        isActive: true
      };

      const userAssignments = this.userRoleAssignments.get(userId) || [];
      userAssignments.push(assignment);
      this.userRoleAssignments.set(userId, userAssignments);

      // Save to secure storage
      await this.saveUserRoleAssignments();

      console.log(`✅ Role ${roleId} assigned to user ${userId}${groupId ? ` in group ${groupId}` : ''}`);
      return true;
    } catch (error) {
      console.error('💥 Role assignment failed:', error);
      return false;
    }
  }

  async revokeRole(userId: string, roleId: string, groupId?: string): Promise<boolean> {
    try {
      const userAssignments = this.userRoleAssignments.get(userId) || [];
      const updatedAssignments = userAssignments.map(assignment => {
        if (assignment.roleId === roleId && assignment.groupId === groupId) {
          return { ...assignment, isActive: false };
        }
        return assignment;
      });

      this.userRoleAssignments.set(userId, updatedAssignments);
      await this.saveUserRoleAssignments();

      console.log(`✅ Role ${roleId} revoked from user ${userId}${groupId ? ` in group ${groupId}` : ''}`);
      return true;
    } catch (error) {
      console.error('💥 Role revocation failed:', error);
      return false;
    }
  }

  getUserRoles(userId: string, groupId?: string): UserRoleAssignment[] {
    const userAssignments = this.userRoleAssignments.get(userId) || [];
    return userAssignments.filter(assignment => 
      assignment.isActive &&
      (!assignment.expiresAt || assignment.expiresAt > Date.now()) &&
      (groupId ? assignment.groupId === groupId : true)
    );
  }

  hasPermission(userId: string, resource: string, action: string, groupId?: string): boolean {
    const userRoles = this.getUserRoles(userId, groupId);
    
    for (const roleAssignment of userRoles) {
      const role = this.rbacRoles.get(roleAssignment.roleId);
      if (!role) continue;

      for (const permission of role.permissions) {
        if (permission.resource === resource && permission.actions.includes(action)) {
          return true;
        }
      }
    }

    return false;
  }

  // ===== Expiring Messages =====

  async createExpiringMessage(
    messageId: string,
    chatId: string,
    senderId: string,
    expirationPolicy: ExpirationPolicy
  ): Promise<boolean> {
    try {
      if (!this.config.enableExpiringMessages) {
        return false;
      }

      const expiresAt = this.calculateExpirationTime(expirationPolicy);
      
      const expiringMessage: ExpiringMessage = {
        messageId,
        chatId,
        senderId,
        expirationPolicy,
        createdAt: Date.now(),
        expiresAt,
        viewedBy: [],
        isExpired: false,
        destructionMethod: 'delete'
      };

      this.expiringMessages.set(messageId, expiringMessage);
      await this.saveExpiringMessages();

      // Schedule expiration
      this.scheduleMessageExpiration(messageId, expiresAt);

      console.log(`✅ Expiring message created: ${messageId}, expires at ${new Date(expiresAt)}`);
      return true;
    } catch (error) {
      console.error('💥 Failed to create expiring message:', error);
      return false;
    }
  }

  async recordMessageView(messageId: string, userId: string, deviceId: string): Promise<boolean> {
    try {
      const expiringMessage = this.expiringMessages.get(messageId);
      if (!expiringMessage || expiringMessage.isExpired) {
        return false;
      }

      const view = {
        userId,
        viewedAt: Date.now(),
        deviceId,
        viewDuration: 0
      };

      expiringMessage.viewedBy.push(view);

      // Check if view-based expiration should trigger
      if (expiringMessage.expirationPolicy.type === 'view_based') {
        const maxViews = expiringMessage.expirationPolicy.maxViews || 1;
        if (expiringMessage.viewedBy.length >= maxViews) {
          await this.expireMessage(messageId);
        }
      }

      await this.saveExpiringMessages();
      return true;
    } catch (error) {
      console.error('💥 Failed to record message view:', error);
      return false;
    }
  }

  private calculateExpirationTime(policy: ExpirationPolicy): number {
    const now = Date.now();
    
    switch (policy.type) {
      case 'time_based':
        return now + (policy.duration || 24 * 60 * 60 * 1000); // Default 24 hours
      case 'view_based':
        return now + (7 * 24 * 60 * 60 * 1000); // 7 days max for view-based
      case 'download_based':
        return now + (30 * 24 * 60 * 60 * 1000); // 30 days max for download-based
      default:
        return now + (24 * 60 * 60 * 1000); // Default 24 hours
    }
  }

  private scheduleMessageExpiration(messageId: string, expiresAt: number): void {
    const delay = expiresAt - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        this.expireMessage(messageId);
      }, delay);
    }
  }

  private async expireMessage(messageId: string): Promise<void> {
    try {
      const expiringMessage = this.expiringMessages.get(messageId);
      if (!expiringMessage || expiringMessage.isExpired) {
        return;
      }

      expiringMessage.isExpired = true;

      // Create destruction proof
      const destructionProof = await this.createDestructionProof(messageId);
      expiringMessage.destructionProof = destructionProof;

      await this.saveExpiringMessages();

      console.log(`🗑️ Message expired and destroyed: ${messageId}`);
    } catch (error) {
      console.error('💥 Failed to expire message:', error);
    }
  }

  private async createDestructionProof(messageId: string): Promise<any> {
    const destructionData = {
      messageId,
      destructionTimestamp: Date.now(),
      method: 'automatic_expiration'
    };

    const proof = await this.cryptoService.hash(JSON.stringify(destructionData));
    
    return {
      messageId,
      destructionTimestamp: Date.now(),
      method: 'automatic_expiration',
      cryptographicProof: proof,
      auditTrail: [`Message ${messageId} expired and destroyed`]
    };
  }

  // ===== Audit and Logging =====

  private async auditAccessDecision(request: ABACRequest, decision: ABACDecision): Promise<void> {
    try {
      const audit: AccessControlAudit = {
        id: await this.cryptoService.generateSecureId(),
        requestId: request.requestId,
        userId: request.subject.identifier,
        action: request.action.type,
        resource: `${request.resource.type}:${request.resource.identifier}`,
        decision: decision.decision,
        policies: decision.appliedPolicies,
        timestamp: Date.now(),
        riskScore: this.calculateRiskScore(request, decision),
        anomalyDetected: decision.warnings && decision.warnings.length > 0
      };

      this.auditLog.push(audit);

      // Keep only last 10000 audit entries
      if (this.auditLog.length > 10000) {
        this.auditLog = this.auditLog.slice(-10000);
      }

      await this.saveAuditLog();
    } catch (error) {
      console.error('💥 Failed to audit access decision:', error);
    }
  }

  private calculateRiskScore(request: ABACRequest, decision: ABACDecision): number {
    let riskScore = 0;

    // Base risk based on action type
    const highRiskActions = ['delete', 'admin', 'moderate', 'ban'];
    if (highRiskActions.includes(request.action.type)) {
      riskScore += 30;
    }

    // Risk based on resource sensitivity
    const sensitivityLevel = request.resource.attributes.sensitivityLevel;
    if (sensitivityLevel === 'restricted') riskScore += 40;
    else if (sensitivityLevel === 'confidential') riskScore += 25;
    else if (sensitivityLevel === 'internal') riskScore += 10;

    // Risk based on decision
    if (decision.decision === 'deny') riskScore += 20;
    if (decision.warnings && decision.warnings.length > 0) riskScore += 15;

    return Math.min(riskScore, 100);
  }

  // ===== ENHANCED CONDITION EVALUATORS =====

  // Enhanced time-based condition evaluation
  private evaluateTimeBasedConditionAdvanced(condition: ABACCondition, request: ABACRequest): {
    satisfied: boolean;
    canBeConditional: boolean;
    warning?: string;
    confidence: number;
  } {
    const currentTime = new Date(request.timestamp);
    const currentHour = currentTime.getHours();
    const currentDay = currentTime.getDay();
    let confidence = 1.0;

    if (condition.attribute === 'business_hours') {
      const businessHours = condition.value as { start: string; end: string; timezone?: string };
      const startHour = parseInt(businessHours.start.split(':')[0]);
      const endHour = parseInt(businessHours.end.split(':')[0]);
      
      const inBusinessHours = currentHour >= startHour && currentHour <= endHour;
      
      return {
        satisfied: condition.operator === 'equals' ? inBusinessHours : !inBusinessHours,
        canBeConditional: false,
        confidence
      };
    }

    if (condition.attribute === 'working_days') {
      const workingDays = condition.value as number[]; // [1,2,3,4,5] for Mon-Fri
      const isWorkingDay = workingDays.includes(currentDay);
      
      return {
        satisfied: condition.operator === 'in' ? isWorkingDay : !isWorkingDay,
        canBeConditional: false,
        confidence
      };
    }

    if (condition.attribute === 'time_window') {
      const timeWindow = condition.value as { 
        start: string; 
        end: string; 
        allowedDays?: number[];
        timezone?: string;
      };
      
      const startHour = parseInt(timeWindow.start.split(':')[0]);
      const endHour = parseInt(timeWindow.end.split(':')[0]);
      const inTimeWindow = currentHour >= startHour && currentHour <= endHour;
      
      let dayAllowed = true;
      if (timeWindow.allowedDays) {
        dayAllowed = timeWindow.allowedDays.includes(currentDay);
      }
      
      const satisfied = inTimeWindow && dayAllowed;
      
      return {
        satisfied: condition.operator === 'equals' ? satisfied : !satisfied,
        canBeConditional: false,
        confidence
      };
    }

    return { satisfied: true, canBeConditional: false, confidence: 0.5 };
  }

  // Enhanced device-based condition evaluation
  private evaluateDeviceBasedConditionAdvanced(condition: ABACCondition, request: ABACRequest): {
    satisfied: boolean;
    canBeConditional: boolean;
    warning?: string;
    confidence: number;
  } {
    let confidence = 0.8;
    
    if (condition.attribute === 'device_trust_level') {
      const requiredTrustLevel = condition.value as string;
      const deviceTrustLevel = request.context.deviceSecurity?.trustLevel || 'unknown';
      
      const trustLevels = ['unknown', 'low', 'medium', 'high', 'verified'];
      const requiredIndex = trustLevels.indexOf(requiredTrustLevel);
      const currentIndex = trustLevels.indexOf(deviceTrustLevel);
      
      return {
        satisfied: currentIndex >= requiredIndex,
        canBeConditional: currentIndex === requiredIndex - 1, // Allow conditional if close
        confidence: currentIndex >= 0 ? confidence : 0.3
      };
    }

    if (condition.attribute === 'device_compliance') {
      const requiredCompliance = condition.value as string[];
      const deviceCompliance = request.context.deviceSecurity?.complianceFlags || [];
      
      const hasAllCompliance = requiredCompliance.every(flag => deviceCompliance.includes(flag));
      const hasPartialCompliance = requiredCompliance.some(flag => deviceCompliance.includes(flag));
      
      return {
        satisfied: hasAllCompliance,
        canBeConditional: hasPartialCompliance && !hasAllCompliance,
        confidence: hasAllCompliance ? confidence : (hasPartialCompliance ? 0.6 : 0.2)
      };
    }

    if (condition.attribute === 'biometric_verification') {
      const biometricRequired = condition.value as boolean;
      const biometricAvailable = request.context.deviceSecurity?.biometricEnabled || false;
      const biometricVerified = request.context.sessionContext?.biometricVerified || false;
      
      if (!biometricRequired) {
        return { satisfied: true, canBeConditional: false, confidence };
      }
      
      return {
        satisfied: biometricAvailable && biometricVerified,
        canBeConditional: biometricAvailable && !biometricVerified,
        warning: !biometricAvailable ? 'Biometric authentication not available' : 
                !biometricVerified ? 'Biometric verification required' : undefined,
        confidence: biometricAvailable ? (biometricVerified ? confidence : 0.7) : 0.3
      };
    }

    return { satisfied: true, canBeConditional: false, confidence: 0.5 };
  }

  // Enhanced relationship-based condition evaluation
  private evaluateRelationshipBasedConditionAdvanced(condition: ABACCondition, request: ABACRequest): {
    satisfied: boolean;
    canBeConditional: boolean;
    warning?: string;
    confidence: number;
  } {
    let confidence = 0.7;
    
    if (condition.attribute === 'friendship_level') {
      const requiredLevel = condition.value as string;
      const friendshipLevel = this.getUserRelationshipLevel(
        request.subject.identifier, 
        request.resource.attributes.ownerId
      );
      
      const levels = ['none', 'acquaintance', 'friend', 'close_friend', 'family'];
      const requiredIndex = levels.indexOf(requiredLevel);
      const currentIndex = levels.indexOf(friendshipLevel);
      
      return {
        satisfied: currentIndex >= requiredIndex,
        canBeConditional: currentIndex === requiredIndex - 1,
        confidence: currentIndex >= 0 ? confidence : 0.3
      };
    }

    if (condition.attribute === 'mutual_connections') {
      const requiredMutualConnections = condition.value as number;
      const mutualConnections = this.getMutualConnectionsCount(
        request.subject.identifier,
        request.resource.attributes.ownerId
      );
      
      return {
        satisfied: mutualConnections >= requiredMutualConnections,
        canBeConditional: mutualConnections >= requiredMutualConnections * 0.7,
        confidence: mutualConnections > 0 ? confidence : 0.4
      };
    }

    if (condition.attribute === 'trust_score') {
      const requiredTrustScore = condition.value as number;
      const trustScore = this.getUserTrustScore(
        request.subject.identifier,
        request.resource.attributes.ownerId
      );
      
      return {
        satisfied: trustScore >= requiredTrustScore,
        canBeConditional: trustScore >= requiredTrustScore * 0.8,
        confidence: trustScore > 0 ? confidence : 0.3
      };
    }

    return { satisfied: true, canBeConditional: false, confidence: 0.5 };
  }

  // New behavioral pattern condition evaluation
  private evaluateBehavioralPatternCondition(condition: ABACCondition, request: ABACRequest): {
    satisfied: boolean;
    canBeConditional: boolean;
    warning?: string;
    confidence: number;
  } {
    let confidence = 0.6;
    
    if (condition.attribute === 'activity_pattern') {
      const expectedPattern = condition.value as {
        normalHours: number[];
        normalDays: number[];
        maxDeviationScore: number;
      };
      
      const userBehavior = request.context.userBehavior;
      const currentHour = new Date(request.timestamp).getHours();
      const currentDay = new Date(request.timestamp).getDay();
      
      const hourNormal = expectedPattern.normalHours.includes(currentHour);
      const dayNormal = expectedPattern.normalDays.includes(currentDay);
      const deviationScore = this.calculateBehaviorDeviationScore(userBehavior, request);
      
      const patternMatches = hourNormal && dayNormal && deviationScore <= expectedPattern.maxDeviationScore;
      
      return {
        satisfied: patternMatches,
        canBeConditional: deviationScore <= expectedPattern.maxDeviationScore * 1.5,
        warning: !patternMatches ? 'Unusual activity pattern detected' : undefined,
        confidence: patternMatches ? confidence : Math.max(0.2, 1 - deviationScore / 100)
      };
    }

    return { satisfied: true, canBeConditional: false, confidence: 0.5 };
  }

  // New risk-based condition evaluation
  private evaluateRiskBasedCondition(condition: ABACCondition, request: ABACRequest): {
    satisfied: boolean;
    canBeConditional: boolean;
    warning?: string;
    confidence: number;
  } {
    let confidence = 0.8;
    
    if (condition.attribute === 'risk_threshold') {
      const maxRiskScore = condition.value as number;
      const currentRiskScore = this.calculateRequestRiskScore(request);
      
      return {
        satisfied: currentRiskScore <= maxRiskScore,
        canBeConditional: currentRiskScore <= maxRiskScore * 1.2,
        warning: currentRiskScore > maxRiskScore ? `High risk score: ${currentRiskScore}` : undefined,
        confidence: currentRiskScore <= maxRiskScore ? confidence : Math.max(0.1, 1 - currentRiskScore / 100)
      };
    }

    if (condition.attribute === 'fraud_indicators') {
      const maxFraudIndicators = condition.value as number;
      const fraudIndicators = this.detectFraudIndicators(request);
      
      return {
        satisfied: fraudIndicators.length <= maxFraudIndicators,
        canBeConditional: fraudIndicators.length <= maxFraudIndicators + 1,
        warning: fraudIndicators.length > 0 ? `Fraud indicators detected: ${fraudIndicators.join(', ')}` : undefined,
        confidence: fraudIndicators.length === 0 ? confidence : Math.max(0.2, 1 - fraudIndicators.length / 10)
      };
    }

    return { satisfied: true, canBeConditional: false, confidence: 0.5 };
  }

  // ===== Default Policies =====

  private initializeDefaultPolicies(): void {
    // Enhanced default ABAC policies for comprehensive scenarios
    this.createEnhancedDefaultABACPolicies();
    this.createDefaultRBACRoles();
  }

  // Enhanced default ABAC policies with comprehensive coverage
  private createEnhancedDefaultABACPolicies(): void {
    // Policy 1: Enhanced self-message access with context awareness
    const enhancedSelfMessagePolicy: ABACPolicy = {
      id: 'enhanced-self-message-access',
      name: 'Enhanced Self Message Access',
      description: 'Allow users to access their own messages with context-aware security',
      enabled: true,
      priority: 100,
      effect: 'allow',
      conditions: [
        {
          id: 'sender-match',
          type: 'attribute_match',
          attribute: 'subject.identifier',
          operator: 'equals',
          value: 'resource.senderId',
          description: 'User is the message sender'
        },
        {
          id: 'device-trust-check',
          type: 'device_based',
          attribute: 'device_trust_level',
          operator: 'in',
          value: ['medium', 'high', 'verified'],
          description: 'Device must have minimum trust level'
        }
      ],
      resources: [{ type: 'message', identifier: '*', attributes: {} }],
      actions: [{ type: 'read', scope: 'self', attributes: {} }],
      subjects: [{ type: 'user', identifier: '*', attributes: {} }],
      context: {
        deviceSecurity: {
          minimumSecurityLevel: 'medium'
        }
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system'
    };

    // Policy 2: Advanced financial data protection
    const advancedFinancialPolicy: ABACPolicy = {
      id: 'advanced-financial-protection',
      name: 'Advanced Financial Data Protection',
      description: 'Multi-layered security for financial data access',
      enabled: true,
      priority: 250,
      effect: 'allow',
      conditions: [
        {
          id: 'high-security-device',
          type: 'device_based',
          attribute: 'device_trust_level',
          operator: 'in',
          value: ['high', 'verified'],
          description: 'Device must have high trust level'
        },
        {
          id: 'biometric-verification',
          type: 'device_based',
          attribute: 'biometric_verification',
          operator: 'equals',
          value: true,
          description: 'Biometric verification required'
        },
        {
          id: 'business-hours',
          type: 'time_based',
          attribute: 'business_hours',
          operator: 'equals',
          value: { start: '06:00', end: '22:00' },
          description: 'Access allowed during extended business hours'
        },
        {
          id: 'risk-threshold',
          type: 'risk_based',
          attribute: 'risk_threshold',
          operator: 'less_than',
          value: 30,
          description: 'Risk score must be below threshold'
        }
      ],
      resources: [{ type: 'financial_data', identifier: '*', attributes: {} }],
      actions: [{ type: 'read', scope: 'self', attributes: {} }, { type: 'write', scope: 'self', attributes: {} }],
      subjects: [{ type: 'user', identifier: '*', attributes: {} }],
      context: {
        deviceSecurity: {
          minimumSecurityLevel: 'high',
          requireBiometric: true
        }
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system'
    };

    // Policy 3: Group chat moderation with relationship context
    const groupModerationPolicy: ABACPolicy = {
      id: 'group-moderation-context',
      name: 'Context-Aware Group Moderation',
      description: 'Allow moderation based on relationship and trust levels',
      enabled: true,
      priority: 180,
      effect: 'allow',
      conditions: [
        {
          id: 'moderator-role',
          type: 'group_role_based',
          attribute: 'required_role',
          operator: 'in',
          value: ['moderator', 'admin'],
          description: 'User must have moderator or admin role'
        },
        {
          id: 'trust-level',
          type: 'relationship_based',
          attribute: 'trust_score',
          operator: 'greater_than',
          value: 70,
          description: 'High trust score required for moderation'
        },
        {
          id: 'activity-pattern',
          type: 'behavioral_pattern',
          attribute: 'activity_pattern',
          operator: 'equals',
          value: {
            normalHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
            normalDays: [1, 2, 3, 4, 5, 6, 7],
            maxDeviationScore: 25
          },
          description: 'Normal activity pattern required'
        }
      ],
      resources: [{ type: 'group_chat', identifier: '*', attributes: {} }],
      actions: [{ type: 'moderate', scope: 'group', attributes: {} }],
      subjects: [{ type: 'user', identifier: '*', attributes: {} }],
      context: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system'
    };

    // Policy 4: Personal data sharing with privacy controls
    const personalDataSharingPolicy: ABACPolicy = {
      id: 'personal-data-sharing',
      name: 'Personal Data Sharing Controls',
      description: 'Fine-grained control over personal data sharing',
      enabled: true,
      priority: 200,
      effect: 'allow',
      conditions: [
        {
          id: 'friendship-level',
          type: 'relationship_based',
          attribute: 'friendship_level',
          operator: 'in',
          value: ['friend', 'close_friend', 'family'],
          description: 'Must be friend or family member'
        },
        {
          id: 'mutual-connections',
          type: 'relationship_based',
          attribute: 'mutual_connections',
          operator: 'greater_than',
          value: 3,
          description: 'Minimum mutual connections required'
        },
        {
          id: 'data-sensitivity',
          type: 'content_based',
          attribute: 'sensitivity_level',
          operator: 'in',
          value: ['public', 'internal'],
          description: 'Only non-sensitive data can be shared'
        }
      ],
      resources: [{ type: 'personal_data', identifier: '*', attributes: {} }],
      actions: [{ type: 'read', scope: 'direct', attributes: {} }],
      subjects: [{ type: 'user', identifier: '*', attributes: {} }],
      context: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system'
    };

    // Policy 5: Expiring message access control
    const expiringMessagePolicy: ABACPolicy = {
      id: 'expiring-message-control',
      name: 'Expiring Message Access Control',
      description: 'Control access to expiring messages based on context',
      enabled: true,
      priority: 220,
      effect: 'allow',
      conditions: [
        {
          id: 'message-not-expired',
          type: 'attribute_match',
          attribute: 'resource.expiresAt',
          operator: 'greater_than',
          value: 'current_timestamp',
          description: 'Message must not be expired'
        },
        {
          id: 'view-limit-check',
          type: 'attribute_match',
          attribute: 'resource.viewCount',
          operator: 'less_than',
          value: 'resource.maxViews',
          description: 'View limit not exceeded'
        },
        {
          id: 'authorized-viewer',
          type: 'attribute_match',
          attribute: 'subject.identifier',
          operator: 'in',
          value: 'resource.authorizedViewers',
          description: 'User is authorized to view message'
        }
      ],
      resources: [{ type: 'expiring_message', identifier: '*', attributes: {} }],
      actions: [{ type: 'read', scope: 'direct', attributes: {} }],
      subjects: [{ type: 'user', identifier: '*', attributes: {} }],
      context: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system'
    };

    // Policy 6: High-value transaction approval
    const highValueTransactionPolicy: ABACPolicy = {
      id: 'high-value-transaction',
      name: 'High-Value Transaction Approval',
      description: 'Enhanced security for high-value financial transactions',
      enabled: true,
      priority: 300,
      effect: 'conditional',
      conditions: [
        {
          id: 'transaction-amount',
          type: 'attribute_match',
          attribute: 'resource.amount',
          operator: 'greater_than',
          value: 1000,
          description: 'High-value transaction threshold'
        },
        {
          id: 'multi-factor-auth',
          type: 'device_based',
          attribute: 'biometric_verification',
          operator: 'equals',
          value: true,
          description: 'Multi-factor authentication required'
        },
        {
          id: 'fraud-check',
          type: 'risk_based',
          attribute: 'fraud_indicators',
          operator: 'less_than',
          value: 2,
          description: 'Low fraud risk required'
        }
      ],
      resources: [{ type: 'financial_transaction', identifier: '*', attributes: {} }],
      actions: [{ type: 'write', scope: 'self', attributes: {} }],
      subjects: [{ type: 'user', identifier: '*', attributes: {} }],
      context: {
        deviceSecurity: {
          minimumSecurityLevel: 'maximum',
          requireBiometric: true
        }
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system'
    };

    // Store all enhanced policies
    this.abacPolicies.set(enhancedSelfMessagePolicy.id, enhancedSelfMessagePolicy);
    this.abacPolicies.set(advancedFinancialPolicy.id, advancedFinancialPolicy);
    this.abacPolicies.set(groupModerationPolicy.id, groupModerationPolicy);
    this.abacPolicies.set(personalDataSharingPolicy.id, personalDataSharingPolicy);
    this.abacPolicies.set(expiringMessagePolicy.id, expiringMessagePolicy);
    this.abacPolicies.set(highValueTransactionPolicy.id, highValueTransactionPolicy);

    console.log('✅ Enhanced ABAC policies initialized with comprehensive coverage');
  }

  private createDefaultRBACRoles(): void {
    // Admin role
    const adminRole: RBACRole = {
      id: 'admin',
      name: 'Administrator',
      description: 'Full administrative access',
      permissions: [
        {
          id: 'admin-all',
          resource: 'messages',
          actions: ['read', 'write', 'delete', 'moderate'],
          scope: 'all'
        },
        {
          id: 'admin-members',
          resource: 'members',
          actions: ['read', 'write', 'delete', 'invite', 'remove', 'ban'],
          scope: 'all'
        },
        {
          id: 'admin-settings',
          resource: 'settings',
          actions: ['read', 'write'],
          scope: 'all'
        }
      ],
      isSystemRole: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Moderator role
    const moderatorRole: RBACRole = {
      id: 'moderator',
      name: 'Moderator',
      description: 'Content moderation access',
      permissions: [
        {
          id: 'mod-messages',
          resource: 'messages',
          actions: ['read', 'moderate', 'delete'],
          scope: 'group'
        },
        {
          id: 'mod-members',
          resource: 'members',
          actions: ['read', 'mute', 'remove'],
          scope: 'group'
        }
      ],
      isSystemRole: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Member role
    const memberRole: RBACRole = {
      id: 'member',
      name: 'Member',
      description: 'Basic member access',
      permissions: [
        {
          id: 'member-messages',
          resource: 'messages',
          actions: ['read', 'write'],
          scope: 'group'
        },
        {
          id: 'member-media',
          resource: 'media',
          actions: ['read', 'write', 'share'],
          scope: 'group'
        }
      ],
      isSystemRole: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.rbacRoles.set(adminRole.id, adminRole);
    this.rbacRoles.set(moderatorRole.id, moderatorRole);
    this.rbacRoles.set(memberRole.id, memberRole);
  }

  // ===== Storage Methods =====

  private async saveUserRoleAssignments(): Promise<void> {
    try {
      const data = Object.fromEntries(this.userRoleAssignments);
      await this.secureStorage.setObject('user_role_assignments', data);
    } catch (error) {
      console.error('💥 Failed to save user role assignments:', error);
    }
  }

  private async saveExpiringMessages(): Promise<void> {
    try {
      const data = Object.fromEntries(this.expiringMessages);
      await this.secureStorage.setObject('expiring_messages', data);
    } catch (error) {
      console.error('💥 Failed to save expiring messages:', error);
    }
  }

  private async saveAuditLog(): Promise<void> {
    try {
      await this.secureStorage.setObject('access_control_audit', this.auditLog);
    } catch (error) {
      console.error('💥 Failed to save audit log:', error);
    }
  }

  // ===== Public API Methods =====

  async checkMessageAccess(userId: string, messageId: string, action: string): Promise<ABACDecision> {
    const request: ABACRequest = {
      subject: { type: 'user', identifier: userId, attributes: {} },
      action: { type: action as any, scope: 'self', attributes: {} },
      resource: { type: 'message', identifier: messageId, attributes: {} },
      context: {},
      timestamp: Date.now(),
      requestId: await this.cryptoService.generateSecureId()
    };

    return this.evaluateAccess(request);
  }

  async checkGroupAccess(userId: string, groupId: string, action: string): Promise<ABACDecision> {
    const request: ABACRequest = {
      subject: { type: 'user', identifier: userId, attributes: {} },
      action: { type: action as any, scope: 'group', attributes: {} },
      resource: { type: 'group_chat', identifier: groupId, attributes: { groupId } },
      context: {},
      timestamp: Date.now(),
      requestId: await this.cryptoService.generateSecureId()
    };

    return this.evaluateAccess(request);
  }

  getExpiringMessage(messageId: string): ExpiringMessage | undefined {
    return this.expiringMessages.get(messageId);
  }

  getAuditLog(limit?: number): AccessControlAudit[] {
    if (limit) {
      return this.auditLog.slice(-limit);
    }
    return [...this.auditLog];
  }

  // ===== ENHANCED HELPER METHODS =====

  // Enhanced context matching
  private async matchesSubjectAdvanced(policySubjects: any[], requestSubject: any, context: any): Promise<{
    matches: boolean;
    confidence: number;
  }> {
    for (const subject of policySubjects) {
      if (subject.type === requestSubject.type) {
        if (subject.identifier === '*' || subject.identifier === requestSubject.identifier) {
          return { matches: true, confidence: 1.0 };
        }
        
        // Pattern matching for subject identifiers
        if (subject.identifier.includes('*')) {
          const pattern = new RegExp(subject.identifier.replace(/\*/g, '.*'));
          if (pattern.test(requestSubject.identifier)) {
            return { matches: true, confidence: 0.9 };
          }
        }
      }
    }
    return { matches: false, confidence: 0 };
  }

  private async matchesActionAdvanced(policyActions: any[], requestAction: any, context: any): Promise<{
    matches: boolean;
    confidence: number;
  }> {
    for (const action of policyActions) {
      if (action.type === requestAction.type) {
        if (action.scope === '*' || action.scope === requestAction.scope) {
          return { matches: true, confidence: 1.0 };
        }
      }
    }
    return { matches: false, confidence: 0 };
  }

  private async matchesResourceAdvanced(policyResources: any[], requestResource: any, context: any): Promise<{
    matches: boolean;
    confidence: number;
  }> {
    for (const resource of policyResources) {
      if (resource.type === requestResource.type) {
        if (resource.identifier === '*' || resource.identifier === requestResource.identifier) {
          return { matches: true, confidence: 1.0 };
        }
        
        // Pattern matching for resource identifiers
        if (resource.identifier.includes('*')) {
          const pattern = new RegExp(resource.identifier.replace(/\*/g, '.*'));
          if (pattern.test(requestResource.identifier)) {
            return { matches: true, confidence: 0.9 };
          }
        }
      }
    }
    return { matches: false, confidence: 0 };
  }

  private async matchesContextAdvanced(policyContext: any, requestContext: any): Promise<{
    matches: boolean;
    confidence: number;
  }> {
    if (!policyContext || Object.keys(policyContext).length === 0) {
      return { matches: true, confidence: 1.0 };
    }
    
    let matchCount = 0;
    let totalChecks = 0;
    
    for (const [key, value] of Object.entries(policyContext)) {
      totalChecks++;
      if (requestContext[key] && this.deepEquals(requestContext[key], value)) {
        matchCount++;
      }
    }
    
    const confidence = totalChecks > 0 ? matchCount / totalChecks : 1.0;
    return { matches: confidence >= 0.7, confidence };
  }

  // Helper methods for enhanced condition evaluation
  private getUserBehaviorContext(userId: string): any {
    // This would typically fetch from a user behavior analytics service
    return {
      averageSessionDuration: 1800000, // 30 minutes
      typicalActiveHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      typicalActiveDays: [1, 2, 3, 4, 5, 6, 7],
      riskScore: 15,
      anomalyScore: 5
    };
  }

  private getResourceSensitivityContext(resource: any): any {
    return {
      sensitivityLevel: resource.attributes.sensitivityLevel || 'public',
      dataClassification: resource.attributes.dataClassification || 'general',
      accessHistory: resource.attributes.accessHistory || []
    };
  }

  private getNetworkSecurityContext(): any {
    return {
      networkType: 'wifi', // or 'cellular', 'vpn'
      encryptionLevel: 'high',
      trustLevel: 'verified'
    };
  }

  private getSessionContext(userId: string): any {
    return {
      sessionDuration: 900000, // 15 minutes
      biometricVerified: true,
      deviceVerified: true,
      locationVerified: true
    };
  }

  private getUserRelationshipLevel(userId1: string, userId2: string): string {
    // This would typically query a relationship database
    return 'friend'; // Default for demo
  }

  private getMutualConnectionsCount(userId1: string, userId2: string): number {
    // This would typically query a social graph database
    return 5; // Default for demo
  }

  private getUserTrustScore(userId1: string, userId2: string): number {
    // This would typically calculate based on interaction history
    return 75; // Default for demo
  }

  private calculateBehaviorDeviationScore(userBehavior: any, request: ABACRequest): number {
    // Calculate how much current behavior deviates from normal patterns
    const currentHour = new Date(request.timestamp).getHours();
    const currentDay = new Date(request.timestamp).getDay();
    
    let deviationScore = 0;
    
    if (!userBehavior.typicalActiveHours.includes(currentHour)) {
      deviationScore += 20;
    }
    
    if (!userBehavior.typicalActiveDays.includes(currentDay)) {
      deviationScore += 15;
    }
    
    return deviationScore + (userBehavior.anomalyScore || 0);
  }

  private calculateRequestRiskScore(request: ABACRequest): number {
    let riskScore = 0;
    
    // Risk based on action type
    const highRiskActions = ['delete', 'admin', 'moderate', 'write'];
    if (highRiskActions.includes(request.action.type)) {
      riskScore += 25;
    }
    
    // Risk based on resource sensitivity
    const sensitivityLevel = request.resource.attributes.sensitivityLevel;
    if (sensitivityLevel === 'restricted') riskScore += 40;
    else if (sensitivityLevel === 'confidential') riskScore += 25;
    else if (sensitivityLevel === 'internal') riskScore += 10;
    
    // Risk based on time (unusual hours)
    const currentHour = new Date(request.timestamp).getHours();
    if (currentHour < 6 || currentHour > 22) {
      riskScore += 15;
    }
    
    return Math.min(riskScore, 100);
  }

  private detectFraudIndicators(request: ABACRequest): string[] {
    const indicators: string[] = [];
    
    // Check for unusual patterns
    const currentHour = new Date(request.timestamp).getHours();
    if (currentHour < 2 || currentHour > 23) {
      indicators.push('unusual_time');
    }
    
    // Check for high-risk actions
    const highRiskActions = ['delete', 'admin', 'transfer'];
    if (highRiskActions.includes(request.action.type)) {
      indicators.push('high_risk_action');
    }
    
    // Check device trust
    const deviceTrust = request.context.deviceSecurity?.trustLevel;
    if (deviceTrust === 'low' || deviceTrust === 'unknown') {
      indicators.push('untrusted_device');
    }
    
    return indicators;
  }

  private sortPoliciesWithConflictResolution(policies: ABACPolicy[]): ABACPolicy[] {
    // Sort by priority first, then by effect (deny > conditional > allow)
    return policies.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      const effectOrder = { 'deny': 3, 'conditional': 2, 'allow': 1 };
      return effectOrder[b.effect] - effectOrder[a.effect];
    });
  }

  private async applyDynamicPolicyAdjustments(
    policyEffect: 'allow' | 'deny',
    request: ABACRequest,
    confidence: number
  ): Promise<'allow' | 'deny' | 'conditional'> {
    // Apply dynamic adjustments based on context and confidence
    if (confidence < 0.6) {
      // Low confidence, be more restrictive
      return policyEffect === 'allow' ? 'conditional' : 'deny';
    }
    
    const riskScore = this.calculateRequestRiskScore(request);
    if (riskScore > 70) {
      // High risk, be more restrictive
      return policyEffect === 'allow' ? 'conditional' : 'deny';
    }
    
    return policyEffect;
  }

  private async applyRiskBasedAdjustments(
    decision: 'allow' | 'deny' | 'conditional',
    request: ABACRequest,
    appliedPolicies: string[]
  ): Promise<{
    decision: 'allow' | 'deny' | 'conditional';
    riskScore: number;
    contextualFactors: string[];
  }> {
    const riskScore = this.calculateRequestRiskScore(request);
    const fraudIndicators = this.detectFraudIndicators(request);
    const contextualFactors: string[] = [];
    
    // Add contextual factors
    if (riskScore > 50) contextualFactors.push('high_risk_score');
    if (fraudIndicators.length > 0) contextualFactors.push('fraud_indicators_detected');
    
    const currentHour = new Date(request.timestamp).getHours();
    if (currentHour < 6 || currentHour > 22) contextualFactors.push('unusual_time');
    
    // Adjust decision based on risk
    let adjustedDecision = decision;
    if (riskScore > 80 && decision === 'allow') {
      adjustedDecision = 'conditional';
      contextualFactors.push('risk_based_conditional');
    }
    
    if (fraudIndicators.length > 2) {
      adjustedDecision = 'deny';
      contextualFactors.push('fraud_prevention');
    }
    
    return {
      decision: adjustedDecision,
      riskScore,
      contextualFactors
    };
  }

  private generateAdvancedDecisionReason(
    decision: string,
    appliedPolicies: string[],
    conflicts: string[]
  ): string {
    let reason = `${decision} by policies: ${appliedPolicies.join(', ')}`;
    
    if (conflicts.length > 0) {
      reason += ` (conflicts resolved: ${conflicts.join(', ')})`;
    }
    
    return reason;
  }

  private async auditAccessDecisionAdvanced(request: ABACRequest, decision: ABACDecision): Promise<void> {
    try {
      const audit: AccessControlAudit = {
        id: await this.cryptoService.generateSecureId(),
        requestId: request.requestId,
        userId: request.subject.identifier,
        action: request.action.type,
        resource: `${request.resource.type}:${request.resource.identifier}`,
        decision: decision.decision,
        policies: decision.appliedPolicies,
        timestamp: Date.now(),
        riskScore: decision.riskScore,
        anomalyDetected: decision.warnings && decision.warnings.length > 0,
        geolocation: request.context.location,
        deviceId: request.context.deviceId,
        sessionId: request.context.sessionId
      };

      this.auditLog.push(audit);

      // Keep only last 10000 audit entries
      if (this.auditLog.length > 10000) {
        this.auditLog = this.auditLog.slice(-10000);
      }

      await this.saveAuditLog();
    } catch (error) {
      console.error('💥 Failed to audit enhanced access decision:', error);
    }
  }

  private deepEquals(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 === 'object') {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      
      if (keys1.length !== keys2.length) return false;
      
      for (const key of keys1) {
        if (!keys2.includes(key) || !this.deepEquals(obj1[key], obj2[key])) {
          return false;
        }
      }
      
      return true;
    }
    
    return false;
  }

  // ===== ENHANCED PUBLIC API METHODS =====

  // Enhanced message access check with context
  async checkMessageAccessAdvanced(
    userId: string, 
    messageId: string, 
    action: string,
    context?: any
  ): Promise<ABACDecision> {
    const request: ABACRequest = {
      subject: { type: 'user', identifier: userId, attributes: {} },
      action: { type: action as any, scope: 'self', attributes: {} },
      resource: { type: 'message', identifier: messageId, attributes: {} },
      context: context || {},
      timestamp: Date.now(),
      requestId: await this.cryptoService.generateSecureId()
    };

    return this.evaluateAccess(request);
  }

  // Enhanced group access check with role context
  async checkGroupAccessAdvanced(
    userId: string, 
    groupId: string, 
    action: string,
    context?: any
  ): Promise<ABACDecision> {
    const userRoles = this.getUserRoles(userId, groupId);
    const request: ABACRequest = {
      subject: { 
        type: 'user', 
        identifier: userId, 
        attributes: { 
          roles: userRoles.map(r => r.roleId),
          groupMembership: userRoles.length > 0
        } 
      },
      action: { type: action as any, scope: 'group', attributes: {} },
      resource: { 
        type: 'group_chat', 
        identifier: groupId, 
        attributes: { groupId, memberCount: 0 } 
      },
      context: context || {},
      timestamp: Date.now(),
      requestId: await this.cryptoService.generateSecureId()
    };

    return this.evaluateAccess(request);
  }

  // Enhanced financial transaction access check
  async checkFinancialTransactionAccess(
    userId: string,
    transactionData: any,
    action: string,
    context?: any
  ): Promise<ABACDecision> {
    const request: ABACRequest = {
      subject: { type: 'user', identifier: userId, attributes: {} },
      action: { type: action as any, scope: 'self', attributes: {} },
      resource: { 
        type: 'financial_transaction', 
        identifier: transactionData.id || 'new', 
        attributes: {
          amount: transactionData.amount,
          currency: transactionData.currency,
          sensitivityLevel: transactionData.amount > 1000 ? 'confidential' : 'internal'
        }
      },
      context: context || {},
      timestamp: Date.now(),
      requestId: await this.cryptoService.generateSecureId()
    };

    return this.evaluateAccess(request);
  }

  // Configuration
  updateConfig(newConfig: Partial<AccessControlConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Enhanced Access Control configuration updated:', this.config);
  }

  getConfig(): AccessControlConfig {
    return { ...this.config };
  }

  // Enhanced policy management
  async addCustomPolicy(policy: ABACPolicy): Promise<boolean> {
    try {
      // Validate policy structure
      if (!policy.id || !policy.name || !policy.conditions) {
        throw new Error('Invalid policy structure');
      }
      
      this.abacPolicies.set(policy.id, policy);
      console.log(`✅ Custom ABAC policy added: ${policy.name}`);
      return true;
    } catch (error) {
      console.error('💥 Failed to add custom policy:', error);
      return false;
    }
  }

  async removePolicy(policyId: string): Promise<boolean> {
    try {
      const policy = this.abacPolicies.get(policyId);
      if (!policy) {
        throw new Error(`Policy ${policyId} not found`);
      }
      
      if (policy.createdBy === 'system') {
        throw new Error('Cannot remove system policies');
      }
      
      this.abacPolicies.delete(policyId);
      console.log(`✅ Policy removed: ${policyId}`);
      return true;
    } catch (error) {
      console.error('💥 Failed to remove policy:', error);
      return false;
    }
  }

  getPolicyById(policyId: string): ABACPolicy | undefined {
    return this.abacPolicies.get(policyId);
  }

  getAllPolicies(): ABACPolicy[] {
    return Array.from(this.abacPolicies.values());
  }

  // Enhanced audit and reporting
  getAuditLogAdvanced(filters?: {
    userId?: string;
    action?: string;
    decision?: 'allow' | 'deny' | 'conditional';
    startTime?: number;
    endTime?: number;
    riskScoreMin?: number;
    riskScoreMax?: number;
    limit?: number;
  }): AccessControlAudit[] {
    let filteredLog = [...this.auditLog];
    
    if (filters) {
      if (filters.userId) {
        filteredLog = filteredLog.filter(log => log.userId === filters.userId);
      }
      if (filters.action) {
        filteredLog = filteredLog.filter(log => log.action === filters.action);
      }
      if (filters.decision) {
        filteredLog = filteredLog.filter(log => log.decision === filters.decision);
      }
      if (filters.startTime) {
        filteredLog = filteredLog.filter(log => log.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        filteredLog = filteredLog.filter(log => log.timestamp <= filters.endTime!);
      }
      if (filters.riskScoreMin !== undefined) {
        filteredLog = filteredLog.filter(log => (log.riskScore || 0) >= filters.riskScoreMin!);
      }
      if (filters.riskScoreMax !== undefined) {
        filteredLog = filteredLog.filter(log => (log.riskScore || 0) <= filters.riskScoreMax!);
      }
      if (filters.limit) {
        filteredLog = filteredLog.slice(-filters.limit);
      }
    }
    
    return filteredLog;
  }
}

export default AccessControlService;