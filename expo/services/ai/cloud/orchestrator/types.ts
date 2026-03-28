/**
 * Types for Cloud Orchestrator API
 */

export interface CompressedSummary {
  taskId: string;
  deviceId: string;
  taskType: 'chat' | 'classification' | 'moderation' | 'recommendation';
  compressedContext: string; // Compressed/summarized context
  query: string; // User query or input
  metadata: {
    originalSize: number; // Size before compression
    compressionRatio: number; // Compression efficiency
    priority: 'low' | 'medium' | 'high';
    timestamp: number;
    sessionId?: string;
  };
  deviceCapabilities: {
    availableMemory: number;
    processingPower: 'low' | 'medium' | 'high';
    batteryLevel: number;
    networkQuality: 'poor' | 'good' | 'excellent';
  };
}

export interface OrchestratorStrategy {
  type: 'process_local' | 'process_cloud' | 'hybrid' | 'cache_result' | 'defer';
  reasoning: string;
  parameters?: {
    modelToUse?: string;
    maxTokens?: number;
    timeout?: number;
    fallbackStrategy?: string;
    cacheKey?: string;
    deferUntil?: number;
  };
  metadata: {
    confidence: number;
    estimatedCost: number;
    estimatedLatency: number;
    privacyLevel: 'low' | 'medium' | 'high';
  };
}

export interface ProcessingResult {
  type: 'result';
  taskId: string;
  result: unknown;
  processingTime: number;
  tokensUsed: number;
  modelUsed: string;
  confidence: number;
  metadata: {
    processedInCloud: boolean;
    strategy: string;
    cacheHit?: boolean;
    [key: string]: unknown;
  };
}

export interface DynamicPolicy {
  id: string;
  version: string;
  name: string;
  deviceFilters: {
    deviceTypes?: string[];
    capabilities?: {
      minMemory?: number;
      minProcessingPower?: string;
      minBatteryLevel?: number;
    };
    regions?: string[];
  };
  rules: PolicyRule[];
  validFrom: number;
  validUntil: number;
  signature: string;
}

export interface PolicyRule {
  id: string;
  type: 'route' | 'limit' | 'cache' | 'defer' | 'deny';
  priority: number;
  condition: {
    taskTypes?: string[];
    contextSize?: { min?: number; max?: number };
    deviceBattery?: { min?: number; max?: number };
    networkQuality?: string[];
    timeOfDay?: { start: string; end: string };
    userTier?: string[];
  };
  action: {
    strategy: string;
    parameters?: Record<string, unknown>;
    message?: string;
  };
}

export interface TelemetryRecord {
  deviceId: string;
  summary: CompressedSummary;
  strategy: string;
  processingTime: number;
  success: boolean;
  error?: string;
  timestamp?: number;
}

export interface DeviceTelemetry {
  deviceId: string;
  totalRequests: number;
  successRate: number;
  averageProcessingTime: number;
  preferredStrategies: Record<string, number>;
  errorPatterns: string[];
  lastSeen: number;
  performanceMetrics: {
    memoryUsage: number[];
    batteryDrain: number[];
    networkLatency: number[];
  };
}

export interface SecurityValidationRequest {
  summary: CompressedSummary;
  deviceId: string;
  signature: string;
  timestamp: number;
}

export interface PolicyUpdateRequest {
  deviceId: string;
  policies: unknown[];
  signature: string;
  timestamp: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  details?: Record<string, unknown>;
}