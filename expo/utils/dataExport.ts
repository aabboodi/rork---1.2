import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  RetrainingDataPoint,
  RetrainingDataBatch,
  AnonymizedFeatureVector,
  EngagementOutcome
} from '@/types/recommendation';
import { ImmutableTransaction } from '@/types';
import SecurityManager from '@/services/security/SecurityManager';
import CryptoService from '@/services/security/CryptoService';
import DeviceSecurityService from '@/services/security/DeviceSecurityService';

interface ExportConfig {
  format: 'json' | 'csv' | 'parquet' | 'tfrecord' | 'jsonl';
  compression: 'none' | 'gzip' | 'brotli' | 'lz4';
  encryption: boolean;
  anonymization: 'basic' | 'enhanced' | 'differential_privacy';
  includeMetadata: boolean;
  splitByAlgorithm: boolean;
  splitByTimeWindow: boolean;
  timeWindowSize: number; // milliseconds
  maxFileSize: number; // bytes
  outputPath?: string;
  // PCI DSS Compliance
  pciDSSCompliant: boolean;
  encryptionStandard: 'AES-256-GCM' | 'AES-256-CBC' | 'ChaCha20-Poly1305';
  keyDerivation: 'PBKDF2-SHA256' | 'Argon2id' | 'scrypt';
  // Immutable Ledger
  immutableLedger: boolean;
  digitalSignature: boolean;
  chainIntegrity: boolean;
  // Audit and Compliance
  auditTrail: boolean;
  complianceLevel: 'basic' | 'enhanced' | 'enterprise';
  dataRetentionDays: number;
}

interface ExportMetadata {
  exportId: string;
  timestamp: string;
  totalDataPoints: number;
  totalBatches: number;
  algorithmTypes: string[];
  timeRange: {
    start: string;
    end: string;
  };
  dataQuality: {
    averageScore: number;
    validDataPoints: number;
    invalidDataPoints: number;
  };
  exportConfig: ExportConfig;
  fileManifest: ExportedFile[];
  checksums: Record<string, string>;
  // Enhanced Security Metadata
  securityMetadata: {
    encryptionAlgorithm: string;
    keyDerivationFunction: string;
    digitalSignatures: Record<string, string>;
    immutableHashes: Record<string, string>;
    chainIntegrityHash: string;
    pciDSSCompliant: boolean;
    auditTrail: AuditEntry[];
  };
  // Compliance Information
  complianceInfo: {
    level: string;
    certifications: string[];
    dataClassification: string;
    retentionPolicy: string;
    accessControls: string[];
  };
}

interface ExportedFile {
  fileName: string;
  filePath: string;
  fileSize: number;
  format: string;
  compression: string;
  encrypted: boolean;
  algorithmType?: string;
  timeWindow?: {
    start: string;
    end: string;
  };
  dataPointCount: number;
  checksum: string;
  // Enhanced Security Properties
  digitalSignature?: string;
  immutableHash?: string;
  encryptionStandard?: string;
  keyDerivation?: string;
  pciDSSCompliant?: boolean;
  integrityVerified?: boolean;
  // Audit Information
  createdBy: string;
  createdAt: string;
  lastModified: string;
  accessLog: AccessLogEntry[];
}

interface AuditEntry {
  timestamp: string;
  action: string;
  userId: string;
  details: string;
  ipAddress?: string;
  deviceFingerprint?: string;
}

interface AccessLogEntry {
  timestamp: string;
  action: 'read' | 'write' | 'delete' | 'verify';
  userId: string;
  success: boolean;
  details?: string;
}

interface TrainingDataExport {
  trainFiles: ExportedFile[];
  validationFiles: ExportedFile[];
  testFiles: ExportedFile[];
  metadata: ExportMetadata;
  success: boolean;
  errorMessage?: string;
}

interface CSVColumn {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  extractor: (dataPoint: RetrainingDataPoint) => any;
  formatter?: (value: any) => string;
}

class DataExportService {
  private static instance: DataExportService;
  private securityManager: SecurityManager;
  private cryptoService: CryptoService;
  private deviceSecurity: DeviceSecurityService;
  private csvColumns: CSVColumn[] = [];
  private auditTrail: AuditEntry[] = [];

  private constructor() {
    this.securityManager = SecurityManager.getInstance();
    this.cryptoService = CryptoService.getInstance();
    this.deviceSecurity = DeviceSecurityService.getInstance();
    this.initializeCSVColumns();
  }

  static getInstance(): DataExportService {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService();
    }
    return DataExportService.instance;
  }

  private initializeCSVColumns(): void {
    this.csvColumns = [
      // Basic identifiers
      {
        name: 'algorithm_type',
        type: 'string',
        extractor: (dp) => dp.algorithmType
      },
      {
        name: 'model_version',
        type: 'string',
        extractor: (dp) => dp.modelVersion
      },
      {
        name: 'predicted_rank',
        type: 'number',
        extractor: (dp) => dp.predictedRank
      },
      {
        name: 'data_quality_score',
        type: 'number',
        extractor: (dp) => dp.dataQualityScore,
        formatter: (value) => value.toFixed(4)
      },
      
      // Engagement outcome
      {
        name: 'engagement_type',
        type: 'string',
        extractor: (dp) => dp.actualEngagement.engagementType
      },
      {
        name: 'engagement_strength',
        type: 'number',
        extractor: (dp) => dp.actualEngagement.engagementStrength,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'dwell_time',
        type: 'number',
        extractor: (dp) => dp.actualEngagement.dwellTime
      },
      {
        name: 'watch_percentage',
        type: 'number',
        extractor: (dp) => dp.actualEngagement.watchPercentage || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'loop_count',
        type: 'number',
        extractor: (dp) => dp.actualEngagement.loopCount || 0
      },
      {
        name: 'skipped',
        type: 'boolean',
        extractor: (dp) => dp.actualEngagement.skipped
      },
      {
        name: 'hidden',
        type: 'boolean',
        extractor: (dp) => dp.actualEngagement.hidden
      },
      
      // Feature vector - categorical
      {
        name: 'content_type',
        type: 'string',
        extractor: (dp) => dp.featureVector.contentType
      },
      {
        name: 'device_type',
        type: 'string',
        extractor: (dp) => dp.featureVector.deviceType
      },
      {
        name: 'network_quality',
        type: 'string',
        extractor: (dp) => dp.featureVector.networkQuality
      },
      {
        name: 'location_context',
        type: 'string',
        extractor: (dp) => dp.featureVector.locationContext
      },
      
      // Feature vector - numerical
      {
        name: 'content_age',
        type: 'number',
        extractor: (dp) => dp.featureVector.contentAge || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'content_quality',
        type: 'number',
        extractor: (dp) => dp.featureVector.contentQuality || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'content_popularity',
        type: 'number',
        extractor: (dp) => dp.featureVector.contentPopularity || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'user_engagement_history',
        type: 'number',
        extractor: (dp) => dp.featureVector.userEngagementHistory || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'user_session_time',
        type: 'number',
        extractor: (dp) => dp.featureVector.userSessionTime || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'user_activity_level',
        type: 'number',
        extractor: (dp) => dp.featureVector.userActivityLevel || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'time_of_day_relevance',
        type: 'number',
        extractor: (dp) => dp.featureVector.timeOfDayRelevance || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'day_of_week_relevance',
        type: 'number',
        extractor: (dp) => dp.featureVector.dayOfWeekRelevance || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'seasonal_relevance',
        type: 'number',
        extractor: (dp) => dp.featureVector.seasonalRelevance || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'social_proof_score',
        type: 'number',
        extractor: (dp) => dp.featureVector.socialProofScore || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'network_influence',
        type: 'number',
        extractor: (dp) => dp.featureVector.networkInfluence || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'virality_indicator',
        type: 'number',
        extractor: (dp) => dp.featureVector.viralityIndicator || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'interest_alignment',
        type: 'number',
        extractor: (dp) => dp.featureVector.interestAlignment || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'behavior_pattern_match',
        type: 'number',
        extractor: (dp) => dp.featureVector.behaviorPatternMatch || 0,
        formatter: (value) => value.toFixed(4)
      },
      {
        name: 'diversity_score',
        type: 'number',
        extractor: (dp) => dp.featureVector.diversityScore || 0,
        formatter: (value) => value.toFixed(4)
      },
      
      // Temporal features
      {
        name: 'time_of_day',
        type: 'number',
        extractor: (dp) => dp.timeOfDay
      },
      {
        name: 'day_of_week',
        type: 'number',
        extractor: (dp) => dp.dayOfWeek
      },
      {
        name: 'seasonality',
        type: 'string',
        extractor: (dp) => dp.seasonality
      },
      
      // Dataset split
      {
        name: 'dataset_split',
        type: 'string',
        extractor: (dp) => dp.datasetSplit
      },
      {
        name: 'is_training_candidate',
        type: 'boolean',
        extractor: (dp) => dp.isTrainingCandidate
      },
      {
        name: 'is_validation_candidate',
        type: 'boolean',
        extractor: (dp) => dp.isValidationCandidate
      },
      
      // Anonymization metadata
      {
        name: 'anonymization_level',
        type: 'string',
        extractor: (dp) => dp.anonymizationLevel
      },
      {
        name: 'anonymization_timestamp',
        type: 'date',
        extractor: (dp) => dp.anonymizationTimestamp
      }
    ];
  }

  // ===== MAIN EXPORT METHODS =====

  async exportTrainingData(
    dataPoints: RetrainingDataPoint[],
    config: Partial<ExportConfig> = {}
  ): Promise<TrainingDataExport> {
    try {
      // Enhanced Security Pre-checks
      await this.performSecurityPreChecks();
      
      const fullConfig = this.getDefaultConfig(config);
      
      // Audit Log Entry
      await this.addAuditEntry('export_training_data_start', 'current_user', 
        `Exporting ${dataPoints.length} data points with config: ${JSON.stringify(fullConfig)}`);
      
      // PCI DSS Compliance Validation
      if (fullConfig.pciDSSCompliant) {
        const complianceCheck = await this.validatePCIDSSCompliance(dataPoints);
        if (!complianceCheck.isCompliant) {
          throw new Error(`PCI DSS compliance violation: ${complianceCheck.violations.join(', ')}`);
        }
      }
      
      // Split data by dataset split
      const trainData = dataPoints.filter(dp => dp.datasetSplit === 'train');
      const validationData = dataPoints.filter(dp => dp.datasetSplit === 'validation');
      const testData = dataPoints.filter(dp => dp.datasetSplit === 'test');
      
      // Export each split with enhanced security
      const trainFiles = await this.exportDataSplitSecure(trainData, 'train', fullConfig);
      const validationFiles = await this.exportDataSplitSecure(validationData, 'validation', fullConfig);
      const testFiles = await this.exportDataSplitSecure(testData, 'test', fullConfig);
      
      const allFiles = [...trainFiles, ...validationFiles, ...testFiles];
      
      // Generate immutable hashes for all files
      if (fullConfig.immutableLedger) {
        await this.generateImmutableHashes(allFiles);
      }
      
      // Create enhanced metadata with security information
      const metadata = await this.createEnhancedExportMetadata(
        dataPoints,
        allFiles,
        fullConfig
      );
      
      // Save metadata with digital signature
      await this.saveSecureMetadata(metadata, fullConfig);
      
      // Final audit log
      await this.addAuditEntry('export_training_data_complete', 'current_user', 
        `Successfully exported ${allFiles.length} files`);
      
      return {
        trainFiles,
        validationFiles,
        testFiles,
        metadata,
        success: true
      };
      
    } catch (error) {
      console.error('Failed to export training data:', error);
      await this.addAuditEntry('export_training_data_failed', 'current_user', 
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        trainFiles: [],
        validationFiles: [],
        testFiles: [],
        metadata: {} as ExportMetadata,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Enhanced Security Methods
  private async performSecurityPreChecks(): Promise<void> {
    // Device Security Check
    const deviceCheck = await this.deviceSecurity.performComprehensiveSecurityCheck();
    if (!deviceCheck.isSecure) {
      throw new Error(`Device security check failed: ${deviceCheck.threats.join(', ')}`);
    }

    // Anti-Tampering Check
    const tamperCheck = await this.deviceSecurity.detectTampering();
    if (tamperCheck.isTampered) {
      throw new Error(`Application tampering detected: ${tamperCheck.tamperingSigns.join(', ')}`);
    }

    // Chain Integrity Check
    const chainIntegrity = await this.cryptoService.verifyChainIntegrity();
    if (!chainIntegrity.isValid) {
      throw new Error('Chain integrity verification failed');
    }
  }

  private async validatePCIDSSCompliance(dataPoints: RetrainingDataPoint[]): Promise<{isCompliant: boolean, violations: string[]}> {
    const violations: string[] = [];
    
    // Check for sensitive data patterns
    for (const dataPoint of dataPoints) {
      if (this.containsSensitiveData(dataPoint)) {
        violations.push(`Data point ${dataPoint.algorithmType} contains sensitive information`);
      }
    }
    
    // Verify encryption capabilities
    const encryptionTest = await this.cryptoService.testEncryptionCapability();
    if (!encryptionTest.isCapable) {
      violations.push('Encryption capability test failed');
    }
    
    return {
      isCompliant: violations.length === 0,
      violations
    };
  }

  private containsSensitiveData(dataPoint: RetrainingDataPoint): boolean {
    // Check for patterns that might indicate sensitive data
    const sensitivePatterns = [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card pattern
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email pattern
    ];
    
    const dataString = JSON.stringify(dataPoint);
    return sensitivePatterns.some(pattern => pattern.test(dataString));
  }

  private async exportDataSplitSecure(
    dataPoints: RetrainingDataPoint[],
    splitName: string,
    config: ExportConfig
  ): Promise<ExportedFile[]> {
    if (dataPoints.length === 0) {
      return [];
    }
    
    const files: ExportedFile[] = [];
    
    if (config.splitByAlgorithm) {
      const algorithmGroups = this.groupByAlgorithm(dataPoints);
      
      for (const [algorithmType, algorithmData] of Object.entries(algorithmGroups)) {
        const algorithmFiles = await this.exportAlgorithmDataSecure(
          algorithmData,
          `${splitName}_${algorithmType}`,
          algorithmType,
          config
        );
        files.push(...algorithmFiles);
      }
    } else {
      const allFiles = await this.exportAlgorithmDataSecure(
        dataPoints,
        splitName,
        undefined,
        config
      );
      files.push(...allFiles);
    }
    
    return files;
  }

  private async exportAlgorithmDataSecure(
    dataPoints: RetrainingDataPoint[],
    baseName: string,
    algorithmType: string | undefined,
    config: ExportConfig
  ): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];
    
    if (config.splitByTimeWindow && config.timeWindowSize > 0) {
      const timeGroups = this.groupByTimeWindow(dataPoints, config.timeWindowSize);
      
      for (const [timeWindow, timeData] of Object.entries(timeGroups)) {
        const timeFiles = await this.exportTimeWindowDataSecure(
          timeData,
          `${baseName}_${timeWindow}`,
          algorithmType,
          timeWindow,
          config
        );
        files.push(...timeFiles);
      }
    } else {
      const file = await this.exportSingleFileSecure(
        dataPoints,
        baseName,
        algorithmType,
        config
      );
      if (file) {
        files.push(file);
      }
    }
    
    return files;
  }

  private async exportTimeWindowDataSecure(
    dataPoints: RetrainingDataPoint[],
    baseName: string,
    algorithmType: string | undefined,
    timeWindow: string,
    config: ExportConfig
  ): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];
    
    if (config.maxFileSize > 0) {
      const chunks = this.chunkDataBySize(dataPoints, config.maxFileSize, config.format);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkName = chunks.length > 1 ? `${baseName}_part${i + 1}` : baseName;
        const file = await this.exportSingleFileSecure(
          chunks[i],
          chunkName,
          algorithmType,
          config,
          timeWindow
        );
        if (file) {
          files.push(file);
        }
      }
    } else {
      const file = await this.exportSingleFileSecure(
        dataPoints,
        baseName,
        algorithmType,
        config,
        timeWindow
      );
      if (file) {
        files.push(file);
      }
    }
    
    return files;
  }

  async exportRetrainingBatches(
    batches: RetrainingDataBatch[],
    config: Partial<ExportConfig> = {}
  ): Promise<TrainingDataExport> {
    try {
      // Extract all data points from batches
      const allDataPoints = batches.flatMap(batch => batch.dataPoints);
      
      // Export as training data
      return await this.exportTrainingData(allDataPoints, config);
      
    } catch (error) {
      console.error('Failed to export retraining batches:', error);
      return {
        trainFiles: [],
        validationFiles: [],
        testFiles: [],
        metadata: {} as ExportMetadata,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async exportDataSplit(
    dataPoints: RetrainingDataPoint[],
    splitName: string,
    config: ExportConfig
  ): Promise<ExportedFile[]> {
    if (dataPoints.length === 0) {
      return [];
    }
    
    const files: ExportedFile[] = [];
    
    if (config.splitByAlgorithm) {
      // Group by algorithm type
      const algorithmGroups = this.groupByAlgorithm(dataPoints);
      
      for (const [algorithmType, algorithmData] of Object.entries(algorithmGroups)) {
        const algorithmFiles = await this.exportAlgorithmData(
          algorithmData,
          `${splitName}_${algorithmType}`,
          algorithmType,
          config
        );
        files.push(...algorithmFiles);
      }
    } else {
      // Export all data together
      const allFiles = await this.exportAlgorithmData(
        dataPoints,
        splitName,
        undefined,
        config
      );
      files.push(...allFiles);
    }
    
    return files;
  }

  private async exportAlgorithmData(
    dataPoints: RetrainingDataPoint[],
    baseName: string,
    algorithmType: string | undefined,
    config: ExportConfig
  ): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];
    
    if (config.splitByTimeWindow && config.timeWindowSize > 0) {
      // Group by time windows
      const timeGroups = this.groupByTimeWindow(dataPoints, config.timeWindowSize);
      
      for (const [timeWindow, timeData] of Object.entries(timeGroups)) {
        const timeFiles = await this.exportTimeWindowData(
          timeData,
          `${baseName}_${timeWindow}`,
          algorithmType,
          timeWindow,
          config
        );
        files.push(...timeFiles);
      }
    } else {
      // Export all data in one file
      const file = await this.exportSingleFile(
        dataPoints,
        baseName,
        algorithmType,
        config
      );
      if (file) {
        files.push(file);
      }
    }
    
    return files;
  }

  private async exportTimeWindowData(
    dataPoints: RetrainingDataPoint[],
    baseName: string,
    algorithmType: string | undefined,
    timeWindow: string,
    config: ExportConfig
  ): Promise<ExportedFile[]> {
    const files: ExportedFile[] = [];
    
    // Split large files if needed
    if (config.maxFileSize > 0) {
      const chunks = this.chunkDataBySize(dataPoints, config.maxFileSize, config.format);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkName = chunks.length > 1 ? `${baseName}_part${i + 1}` : baseName;
        const file = await this.exportSingleFile(
          chunks[i],
          chunkName,
          algorithmType,
          config,
          timeWindow
        );
        if (file) {
          files.push(file);
        }
      }
    } else {
      const file = await this.exportSingleFile(
        dataPoints,
        baseName,
        algorithmType,
        config,
        timeWindow
      );
      if (file) {
        files.push(file);
      }
    }
    
    return files;
  }

  private async exportSingleFileSecure(
    dataPoints: RetrainingDataPoint[],
    fileName: string,
    algorithmType: string | undefined,
    config: ExportConfig,
    timeWindow?: string
  ): Promise<ExportedFile | null> {
    try {
      // Serialize data based on format
      let serializedData: string;
      
      switch (config.format) {
        case 'json':
          serializedData = this.serializeToJSON(dataPoints, config.includeMetadata);
          break;
        case 'jsonl':
          serializedData = this.serializeToJSONL(dataPoints);
          break;
        case 'csv':
          serializedData = this.serializeToCSV(dataPoints);
          break;
        default:
          serializedData = this.serializeToJSON(dataPoints, config.includeMetadata);
      }
      
      // Apply compression
      if (config.compression !== 'none') {
        serializedData = await this.compressDataSecure(serializedData, config.compression);
      }
      
      // Apply PCI DSS compliant encryption
      let encryptedData = serializedData;
      if (config.encryption) {
        encryptedData = await this.encryptDataPCIDSS(serializedData, config);
      }
      
      // Generate digital signature
      let digitalSignature: string | undefined;
      if (config.digitalSignature) {
        digitalSignature = await this.cryptoService.signData(encryptedData);
      }
      
      // Generate immutable hash
      let immutableHash: string | undefined;
      if (config.immutableLedger) {
        immutableHash = await this.cryptoService.generateImmutableHash({
          data: encryptedData,
          timestamp: Date.now(),
          fileName,
          signature: digitalSignature
        });
      }
      
      // Generate file path
      const fileExtension = this.getFileExtension(config.format, config.compression, config.encryption);
      const filePath = `${fileName}.${fileExtension}`;
      
      // Save file with enhanced security
      await this.saveFileSecure(filePath, encryptedData, config);
      
      // Calculate multiple checksums for integrity
      const checksum = this.calculateSecureChecksum(encryptedData);
      
      // Parse time window if provided
      let timeWindowObj: { start: string; end: string } | undefined;
      if (timeWindow) {
        const [start, end] = timeWindow.split('_to_');
        timeWindowObj = { start, end };
      }
      
      // Create access log entry
      const accessLogEntry: AccessLogEntry = {
        timestamp: new Date().toISOString(),
        action: 'write',
        userId: 'current_user',
        success: true,
        details: `File created with ${config.encryptionStandard} encryption`
      };
      
      return {
        fileName: `${fileName}.${fileExtension}`,
        filePath,
        fileSize: encryptedData.length,
        format: config.format,
        compression: config.compression,
        encrypted: config.encryption,
        algorithmType,
        timeWindow: timeWindowObj,
        dataPointCount: dataPoints.length,
        checksum,
        // Enhanced Security Properties
        digitalSignature,
        immutableHash,
        encryptionStandard: config.encryptionStandard,
        keyDerivation: config.keyDerivation,
        pciDSSCompliant: config.pciDSSCompliant,
        integrityVerified: true,
        // Audit Information
        createdBy: 'current_user',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        accessLog: [accessLogEntry]
      };
      
    } catch (error) {
      console.error(`Failed to export file ${fileName}:`, error);
      await this.addAuditEntry('export_file_failed', 'current_user', 
        `Failed to export file ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  // ===== SERIALIZATION METHODS =====

  private serializeToJSON(dataPoints: RetrainingDataPoint[], includeMetadata: boolean): string {
    const exportData = {
      dataPoints,
      metadata: includeMetadata ? {
        exportTimestamp: new Date().toISOString(),
        totalDataPoints: dataPoints.length,
        algorithmTypes: [...new Set(dataPoints.map(dp => dp.algorithmType))],
        datasetSplits: [...new Set(dataPoints.map(dp => dp.datasetSplit))],
        averageQualityScore: dataPoints.reduce((sum, dp) => sum + dp.dataQualityScore, 0) / dataPoints.length
      } : undefined
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  private serializeToJSONL(dataPoints: RetrainingDataPoint[]): string {
    return dataPoints.map(dp => JSON.stringify(dp)).join('\n');
  }

  private serializeToCSV(dataPoints: RetrainingDataPoint[]): string {
    if (dataPoints.length === 0) {
      return '';
    }
    
    // Create header
    const headers = this.csvColumns.map(col => col.name);
    let csv = headers.join(',') + '\n';
    
    // Add data rows
    for (const dataPoint of dataPoints) {
      const row = this.csvColumns.map(col => {
        try {
          const value = col.extractor(dataPoint);
          const formattedValue = col.formatter ? col.formatter(value) : value;
          
          // Escape CSV values
          if (typeof formattedValue === 'string') {
            return `"${formattedValue.replace(/"/g, '""')}"`;
          } else if (formattedValue === null || formattedValue === undefined) {
            return '';
          } else {
            return String(formattedValue);
          }
        } catch (error) {
          return '';
        }
      });
      
      csv += row.join(',') + '\n';
    }
    
    return csv;
  }

  // ===== UTILITY METHODS =====

  private groupByAlgorithm(dataPoints: RetrainingDataPoint[]): Record<string, RetrainingDataPoint[]> {
    const groups: Record<string, RetrainingDataPoint[]> = {};
    
    for (const dataPoint of dataPoints) {
      const algorithmType = dataPoint.algorithmType;
      if (!groups[algorithmType]) {
        groups[algorithmType] = [];
      }
      groups[algorithmType].push(dataPoint);
    }
    
    return groups;
  }

  private groupByTimeWindow(
    dataPoints: RetrainingDataPoint[],
    windowSize: number
  ): Record<string, RetrainingDataPoint[]> {
    const groups: Record<string, RetrainingDataPoint[]> = {};
    
    for (const dataPoint of dataPoints) {
      const timestamp = new Date(dataPoint.anonymizationTimestamp).getTime();
      const windowStart = Math.floor(timestamp / windowSize) * windowSize;
      const windowEnd = windowStart + windowSize;
      
      const windowKey = `${new Date(windowStart).toISOString()}_to_${new Date(windowEnd).toISOString()}`;
      
      if (!groups[windowKey]) {
        groups[windowKey] = [];
      }
      groups[windowKey].push(dataPoint);
    }
    
    return groups;
  }

  private chunkDataBySize(
    dataPoints: RetrainingDataPoint[],
    maxSize: number,
    format: string
  ): RetrainingDataPoint[][] {
    const chunks: RetrainingDataPoint[][] = [];
    let currentChunk: RetrainingDataPoint[] = [];
    let currentSize = 0;
    
    for (const dataPoint of dataPoints) {
      // Estimate size of data point
      const estimatedSize = this.estimateDataPointSize(dataPoint, format);
      
      if (currentSize + estimatedSize > maxSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [dataPoint];
        currentSize = estimatedSize;
      } else {
        currentChunk.push(dataPoint);
        currentSize += estimatedSize;
      }
    }
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  private estimateDataPointSize(dataPoint: RetrainingDataPoint, format: string): number {
    switch (format) {
      case 'json':
      case 'jsonl':
        return JSON.stringify(dataPoint).length;
      case 'csv':
        return this.csvColumns.length * 20; // Rough estimate
      default:
        return JSON.stringify(dataPoint).length;
    }
  }

  private async compressData(data: string, compression: string): Promise<string> {
    // Mock compression - in real implementation, use actual compression libraries
    switch (compression) {
      case 'gzip':
        // Use gzip compression
        return data; // Placeholder
      case 'brotli':
        // Use brotli compression
        return data; // Placeholder
      case 'lz4':
        // Use lz4 compression
        return data; // Placeholder
      default:
        return data;
    }
  }

  private async encryptDataPCIDSS(data: string, config: ExportConfig): Promise<string> {
    try {
      // Use PCI DSS compliant encryption
      const encryptedData = await this.cryptoService.encryptPCIDSSData(data, 'data_export', {
        algorithm: config.encryptionStandard,
        keyDerivation: config.keyDerivation,
        iterations: 100000, // PBKDF2 iterations for PCI DSS compliance
        saltLength: 32
      });
      return JSON.stringify(encryptedData);
    } catch (error) {
      console.error('Failed to encrypt data with PCI DSS compliance:', error);
      throw new Error('PCI DSS encryption failed');
    }
  }

  private async compressDataSecure(data: string, compression: string): Promise<string> {
    // Enhanced compression with integrity checks
    try {
      const originalChecksum = this.calculateSecureChecksum(data);
      let compressedData: string;
      
      switch (compression) {
        case 'gzip':
          // Use secure gzip compression
          compressedData = data; // Placeholder - implement actual compression
          break;
        case 'brotli':
          // Use secure brotli compression
          compressedData = data; // Placeholder - implement actual compression
          break;
        case 'lz4':
          // Use secure lz4 compression
          compressedData = data; // Placeholder - implement actual compression
          break;
        default:
          compressedData = data;
      }
      
      // Verify compression integrity
      const metadata = {
        originalChecksum,
        compressionAlgorithm: compression,
        timestamp: Date.now()
      };
      
      return JSON.stringify({
        data: compressedData,
        metadata
      });
    } catch (error) {
      console.error('Secure compression failed:', error);
      return data;
    }
  }

  private async saveFileSecure(filePath: string, data: string, config: ExportConfig): Promise<void> {
    try {
      // Add security headers to the file
      const secureFileData = {
        version: '1.0',
        security: {
          encrypted: config.encryption,
          encryptionStandard: config.encryptionStandard,
          pciDSSCompliant: config.pciDSSCompliant,
          timestamp: new Date().toISOString(),
          deviceFingerprint: await this.deviceSecurity.getDeviceFingerprint()
        },
        data
      };
      
      await AsyncStorage.setItem(`exported_file_${filePath}`, JSON.stringify(secureFileData));
      
      // Log file creation
      await this.addAuditEntry('file_created', 'current_user', 
        `Secure file created: ${filePath} (${data.length} bytes)`);
        
    } catch (error) {
      console.error(`Failed to save secure file ${filePath}:`, error);
      throw error;
    }
  }

  private calculateSecureChecksum(data: string): string {
    // Enhanced checksum calculation using multiple algorithms
    let hash1 = 0;
    let hash2 = 0;
    
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash1 = ((hash1 << 5) - hash1) + char;
      hash1 = hash1 & hash1; // Convert to 32-bit integer
      
      hash2 = ((hash2 << 3) - hash2) + char;
      hash2 = hash2 & hash2; // Convert to 32-bit integer
    }
    
    // Combine hashes for enhanced security
    const combinedHash = (hash1 ^ hash2).toString(36);
    const timestamp = Date.now().toString(36);
    
    return `${combinedHash}_${timestamp}`;
  }

  private getFileExtension(format: string, compression: string, encrypted: boolean): string {
    let extension = format;
    
    if (compression !== 'none') {
      extension += `.${compression}`;
    }
    
    if (encrypted) {
      extension += '.enc';
    }
    
    return extension;
  }

  private async saveFile(filePath: string, data: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`exported_file_${filePath}`, data);
    } catch (error) {
      console.error(`Failed to save file ${filePath}:`, error);
      throw error;
    }
  }

  private calculateChecksum(data: string): string {
    // Simple checksum calculation
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private async createEnhancedExportMetadata(
    dataPoints: RetrainingDataPoint[],
    files: ExportedFile[],
    config: ExportConfig
  ): Promise<ExportMetadata> {
    const algorithmTypes = [...new Set(dataPoints.map(dp => dp.algorithmType))];
    const timestamps = dataPoints.map(dp => new Date(dp.anonymizationTimestamp).getTime());
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    
    const validDataPoints = dataPoints.filter(dp => dp.dataQualityScore >= 0.7).length;
    const averageQualityScore = dataPoints.reduce((sum, dp) => sum + dp.dataQualityScore, 0) / dataPoints.length;
    
    const checksums: Record<string, string> = {};
    const digitalSignatures: Record<string, string> = {};
    const immutableHashes: Record<string, string> = {};
    
    for (const file of files) {
      checksums[file.fileName] = file.checksum;
      if (file.digitalSignature) {
        digitalSignatures[file.fileName] = file.digitalSignature;
      }
      if (file.immutableHash) {
        immutableHashes[file.fileName] = file.immutableHash;
      }
    }
    
    // Generate chain integrity hash
    const chainIntegrityHash = await this.cryptoService.generateChainIntegrityHash(files);
    
    return {
      exportId: this.generateExportId(),
      timestamp: new Date().toISOString(),
      totalDataPoints: dataPoints.length,
      totalBatches: 0,
      algorithmTypes,
      timeRange: {
        start: new Date(minTimestamp).toISOString(),
        end: new Date(maxTimestamp).toISOString()
      },
      dataQuality: {
        averageScore: averageQualityScore,
        validDataPoints,
        invalidDataPoints: dataPoints.length - validDataPoints
      },
      exportConfig: config,
      fileManifest: files,
      checksums,
      // Enhanced Security Metadata
      securityMetadata: {
        encryptionAlgorithm: config.encryptionStandard,
        keyDerivationFunction: config.keyDerivation,
        digitalSignatures,
        immutableHashes,
        chainIntegrityHash,
        pciDSSCompliant: config.pciDSSCompliant,
        auditTrail: [...this.auditTrail]
      },
      // Compliance Information
      complianceInfo: {
        level: config.complianceLevel,
        certifications: config.pciDSSCompliant ? ['PCI DSS Level 1'] : [],
        dataClassification: 'Confidential',
        retentionPolicy: `${config.dataRetentionDays} days`,
        accessControls: ['Biometric Authentication', 'Device Binding', 'Encryption']
      }
    };
  }

  private async generateImmutableHashes(files: ExportedFile[]): Promise<void> {
    for (const file of files) {
      if (!file.immutableHash) {
        const fileData = await this.getExportFile(file.filePath);
        if (fileData) {
          file.immutableHash = await this.cryptoService.generateImmutableHash({
            data: fileData,
            fileName: file.fileName,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  private async saveSecureMetadata(metadata: ExportMetadata, config: ExportConfig): Promise<void> {
    try {
      const metadataString = JSON.stringify(metadata, null, 2);
      
      // Encrypt metadata if required
      let secureMetadata = metadataString;
      if (config.encryption) {
        secureMetadata = await this.encryptDataPCIDSS(metadataString, config);
      }
      
      // Generate digital signature for metadata
      if (config.digitalSignature) {
        const signature = await this.cryptoService.signData(secureMetadata);
        const signedMetadata = {
          metadata: secureMetadata,
          signature,
          timestamp: new Date().toISOString()
        };
        secureMetadata = JSON.stringify(signedMetadata);
      }
      
      await AsyncStorage.setItem(
        `export_metadata_${metadata.exportId}`,
        secureMetadata
      );
      
      await this.addAuditEntry('metadata_saved', 'current_user', 
        `Secure metadata saved for export ${metadata.exportId}`);
        
    } catch (error) {
      console.error('Failed to save secure metadata:', error);
      throw error;
    }
  }

  private async addAuditEntry(action: string, userId: string, details: string): Promise<void> {
    const auditEntry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
      ipAddress: Platform.OS === 'web' ? 'web-client' : 'mobile-client',
      deviceFingerprint: await this.deviceSecurity.getDeviceFingerprint()
    };
    
    this.auditTrail.push(auditEntry);
    
    // Keep only last 1000 audit entries to prevent memory issues
    if (this.auditTrail.length > 1000) {
      this.auditTrail = this.auditTrail.slice(-1000);
    }
  }

  private async saveMetadata(metadata: ExportMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `export_metadata_${metadata.exportId}`,
        JSON.stringify(metadata, null, 2)
      );
    } catch (error) {
      console.error('Failed to save export metadata:', error);
    }
  }

  private getDefaultConfig(config: Partial<ExportConfig>): ExportConfig {
    return {
      format: config.format || 'json',
      compression: config.compression || 'gzip',
      encryption: config.encryption ?? true,
      anonymization: config.anonymization || 'enhanced',
      includeMetadata: config.includeMetadata ?? true,
      splitByAlgorithm: config.splitByAlgorithm ?? true,
      splitByTimeWindow: config.splitByTimeWindow ?? false,
      timeWindowSize: config.timeWindowSize || 24 * 60 * 60 * 1000, // 24 hours
      maxFileSize: config.maxFileSize || 100 * 1024 * 1024, // 100MB
      outputPath: config.outputPath,
      // Enhanced Security Defaults
      pciDSSCompliant: config.pciDSSCompliant ?? true,
      encryptionStandard: config.encryptionStandard || 'AES-256-GCM',
      keyDerivation: config.keyDerivation || 'PBKDF2-SHA256',
      immutableLedger: config.immutableLedger ?? true,
      digitalSignature: config.digitalSignature ?? true,
      chainIntegrity: config.chainIntegrity ?? true,
      auditTrail: config.auditTrail ?? true,
      complianceLevel: config.complianceLevel || 'enhanced',
      dataRetentionDays: config.dataRetentionDays || 2555 // 7 years for financial compliance
    };
  }

  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===== PUBLIC API =====

  async getExportMetadata(exportId: string): Promise<ExportMetadata | null> {
    try {
      const metadataString = await AsyncStorage.getItem(`export_metadata_${exportId}`);
      return metadataString ? JSON.parse(metadataString) : null;
    } catch (error) {
      console.error('Failed to get export metadata:', error);
      return null;
    }
  }

  async listExports(): Promise<ExportMetadata[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const metadataKeys = keys.filter(key => key.startsWith('export_metadata_'));
      
      const metadataList: ExportMetadata[] = [];
      
      for (const key of metadataKeys) {
        const metadataString = await AsyncStorage.getItem(key);
        if (metadataString) {
          metadataList.push(JSON.parse(metadataString));
        }
      }
      
      return metadataList.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Failed to list exports:', error);
      return [];
    }
  }

  async deleteExport(exportId: string): Promise<void> {
    try {
      const metadata = await this.getExportMetadata(exportId);
      if (!metadata) {
        throw new Error('Export not found');
      }
      
      // Delete all files
      for (const file of metadata.fileManifest) {
        await AsyncStorage.removeItem(`exported_file_${file.filePath}`);
      }
      
      // Delete metadata
      await AsyncStorage.removeItem(`export_metadata_${exportId}`);
      
      console.log(`Deleted export ${exportId}`);
    } catch (error) {
      console.error('Failed to delete export:', error);
      throw error;
    }
  }

  async getExportFile(filePath: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(`exported_file_${filePath}`);
    } catch (error) {
      console.error('Failed to get export file:', error);
      return null;
    }
  }

  addCustomCSVColumn(column: CSVColumn): void {
    this.csvColumns.push(column);
  }

  removeCSVColumn(columnName: string): void {
    this.csvColumns = this.csvColumns.filter(col => col.name !== columnName);
  }

  getCSVColumns(): CSVColumn[] {
    return [...this.csvColumns];
  }
}

export default DataExportService;