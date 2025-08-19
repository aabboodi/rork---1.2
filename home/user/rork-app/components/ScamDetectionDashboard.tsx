import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  TextInput,
  Modal,
  Platform
} from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import ScamDetectionService, { ScamDetectionResult, ScamReport } from '@/services/security/ScamDetectionService';
import { formatRelativeTime } from '@/utils/formatRelativeTime';
import { 
  Shield, 
  AlertTriangle, 
  Search, 
  Eye, 
  FileText, 
  Link, 
  Image as ImageIcon,
  User,
  TrendingUp,
  Activity,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react-native';

interface ScamDetectionDashboardProps {
  showTestingTools?: boolean;
}

export const ScamDetectionDashboard: React.FC<ScamDetectionDashboardProps> = ({
  showTestingTools = true
}) => {
  const { colors } = useThemeStore();
  const [stats, setStats] = useState<any>(null);
  const [recentReports, setRecentReports] = useState<ScamReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [testText, setTestText] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<ScamDetectionResult | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testType, setTestType] = useState<'text' | 'url' | 'image'>('text');

  const scamDetectionService = ScamDetectionService.getInstance();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Initialize service if needed
      await scamDetectionService.initialize();
      
      // Load statistics
      const statistics = await scamDetectionService.getScamDetectionStats();
      setStats(statistics);
      
      // Load recent reports
      const reports = await scamDetectionService.getScamReports(10);
      setRecentReports(reports);
      
    } catch (error) {
      console.error('Failed to load scam detection dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const runTextTest = async () => {
    if (!testText.trim()) {
      Alert.alert('Error', 'Please enter text to analyze');
      return;
    }

    try {
      setLoading(true);
      const result = await scamDetectionService.analyzeText(testText);
      setTestResult(result);
      setShowTestModal(true);
    } catch (error) {
      console.error('Text analysis failed:', error);
      Alert.alert('Error', 'Failed to analyze text');
    } finally {
      setLoading(false);
    }
  };

  const runUrlTest = async () => {
    if (!testUrl.trim()) {
      Alert.alert('Error', 'Please enter URL to analyze');
      return;
    }

    try {
      setLoading(true);
      const result = await scamDetectionService.analyzeURL(testUrl);
      setTestResult(result);
      setShowTestModal(true);
    } catch (error) {
      console.error('URL analysis failed:', error);
      Alert.alert('Error', 'Failed to analyze URL');
    } finally {
      setLoading(false);
    }
  };

  const updateThreatIntelligence = async () => {
    try {
      setLoading(true);
      await scamDetectionService.updatePatternsFromThreatIntelligence();
      await loadDashboardData();
      Alert.alert('Success', 'Threat intelligence patterns updated successfully');
    } catch (error) {
      console.error('Failed to update threat intelligence:', error);
      Alert.alert('Error', 'Failed to update threat intelligence');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return colors.error;
    if (riskScore >= 40) return colors.warning;
    if (riskScore >= 20) return '#FFA500';
    return colors.success;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return colors.error;
      case 'false_positive':
        return colors.success;
      case 'resolved':
        return colors.info;
      case 'pending':
      default:
        return colors.warning;
    }
  };

  const renderStatsCard = (title: string, value: string | number, icon: any, color: string) => {
    const IconComponent = icon;
    
    return (
      <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statsHeader}>
          <IconComponent size={24} color={color} />
          <Text style={[styles.statsTitle, { color: colors.textSecondary }]}>{title}</Text>
        </View>
        <Text style={[styles.statsValue, { color: colors.text }]}>{value}</Text>
      </View>
    );
  };

  const renderRecentReport = (report: ScamReport) => {
    const riskColor = getRiskColor(report.detectionResult.riskScore);
    const statusColor = getStatusColor(report.status);

    return (
      <View key={report.id} style={[styles.reportItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.reportHeader}>
          <View style={styles.reportType}>
            {report.contentType === 'text' && <FileText size={16} color={colors.textSecondary} />}
            {report.contentType === 'url' && <Link size={16} color={colors.textSecondary} />}
            {report.contentType === 'image' && <ImageIcon size={16} color={colors.textSecondary} />}
            {report.contentType === 'profile' && <User size={16} color={colors.textSecondary} />}
            <Text style={[styles.reportTypeText, { color: colors.textSecondary }]}>
              {report.contentType.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.reportTime, { color: colors.textTertiary }]}>
            {formatRelativeTime(report.timestamp)}
          </Text>
        </View>

        <Text style={[styles.reportContent, { color: colors.text }]} numberOfLines={2}>
          {report.content.length > 100 ? `${report.content.substring(0, 100)}...` : report.content}
        </Text>

        <View style={styles.reportMetrics}>
          <View style={styles.riskScore}>
            <Text style={[styles.riskLabel, { color: colors.textSecondary }]}>Risk Score:</Text>
            <Text style={[styles.riskValue, { color: riskColor }]}>
              {report.detectionResult.riskScore}%
            </Text>
          </View>
          
          <View style={styles.reportStatus}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {report.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {report.detectionResult.detectedPatterns.length > 0 && (
          <View style={styles.detectedPatterns}>
            <Text style={[styles.patternsLabel, { color: colors.textSecondary }]}>Detected Patterns:</Text>
            <View style={styles.patternsList}>
              {report.detectionResult.detectedPatterns.slice(0, 3).map((pattern, index) => (
                <View key={index} style={[styles.patternChip, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.patternText, { color: colors.text }]}>
                    {pattern.type.replace('_', ' ')}
                  </Text>
                </View>
              ))}
              {report.detectionResult.detectedPatterns.length > 3 && (
                <Text style={[styles.morePatterns, { color: colors.textTertiary }]}>
                  +{report.detectionResult.detectedPatterns.length - 3} more
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderTestModal = () => {
    if (!testResult) return null;

    const riskColor = getRiskColor(testResult.riskScore);

    return (
      <Modal
        visible={showTestModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTestModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Scam Analysis Result</Text>
            <TouchableOpacity
              onPress={() => setShowTestModal(false)}
              style={[styles.closeButton, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.closeButtonText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.resultSection}>
              <View style={styles.resultHeader}>
                {testResult.isScam ? (
                  <XCircle size={32} color={colors.error} />
                ) : (
                  <CheckCircle size={32} color={colors.success} />
                )}
                <Text style={[styles.resultTitle, { color: testResult.isScam ? colors.error : colors.success }]}>
                  {testResult.isScam ? 'SCAM DETECTED' : 'CONTENT APPEARS SAFE'}
                </Text>
              </View>

              <View style={styles.resultMetrics}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Risk Score</Text>
                  <Text style={[styles.metricValue, { color: riskColor }]}>
                    {testResult.riskScore}%
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Confidence</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {Math.round(testResult.confidence * 100)}%
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Analysis Time</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {testResult.metadata.analysisTime}ms
                  </Text>
                </View>
              </View>

              {testResult.detectedPatterns.length > 0 && (
                <View style={styles.patternsSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Detected Patterns</Text>
                  {testResult.detectedPatterns.map((pattern, index) => (
                    <View key={index} style={[styles.patternDetail, { backgroundColor: colors.surface }]}>
                      <View style={styles.patternHeader}>
                        <Text style={[styles.patternType, { color: colors.text }]}>
                          {pattern.type.replace('_', ' ').toUpperCase()}
                        </Text>
                        <Text style={[styles.patternSeverity, { color: getRiskColor(pattern.confidence * 100) }]}>
                          {pattern.severity.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.patternDescription, { color: colors.textSecondary }]}>
                        {pattern.description}
                      </Text>
                      <Text style={[styles.patternConfidence, { color: colors.textTertiary }]}>
                        Confidence: {Math.round(pattern.confidence * 100)}%
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.recommendationsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommendations</Text>
                {testResult.recommendations.map((recommendation, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Text style={[styles.recommendationText, { color: colors.text }]}>
                      • {recommendation}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.metadataSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Analysis Metadata</Text>
                <View style={[styles.metadataContent, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                    Content Type: {testResult.metadata.contentType}
                  </Text>
                  <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                    AI Analysis: {testResult.metadata.aiAnalysisUsed ? 'Yes' : 'No'}
                  </Text>
                  <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                    Vision Analysis: {testResult.metadata.visionAnalysisUsed ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading && !stats) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Activity size={32} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading scam detection dashboard...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>🛡️ AI Scam Detection</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Advanced AI-powered protection against scams and fraud
          </Text>
        </View>

        {/* Statistics */}
        {stats && (
          <View style={styles.statsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Detection Statistics</Text>
            <View style={styles.statsGrid}>
              {renderStatsCard('Total Analyses', stats.totalAnalyses, Activity, colors.primary)}
              {renderStatsCard('Scams Detected', stats.scamsDetected, AlertTriangle, colors.error)}
              {renderStatsCard('False Positives', stats.falsePositives, CheckCircle, colors.warning)}
              {renderStatsCard('Avg Risk Score', `${Math.round(stats.averageRiskScore)}%`, TrendingUp, colors.info)}
            </View>
          </View>
        )}

        {/* Testing Tools */}
        {showTestingTools && (
          <View style={styles.testingSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Testing Tools</Text>
            
            <View style={styles.testTabs}>
              <TouchableOpacity
                style={[
                  styles.testTab,
                  {
                    backgroundColor: testType === 'text' ? colors.primary : colors.surface,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setTestType('text')}
              >
                <FileText size={16} color={testType === 'text' ? colors.textInverse : colors.text} />
                <Text style={[
                  styles.testTabText,
                  { color: testType === 'text' ? colors.textInverse : colors.text }
                ]}>
                  Text
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.testTab,
                  {
                    backgroundColor: testType === 'url' ? colors.primary : colors.surface,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setTestType('url')}
              >
                <Link size={16} color={testType === 'url' ? colors.textInverse : colors.text} />
                <Text style={[
                  styles.testTabText,
                  { color: testType === 'url' ? colors.textInverse : colors.text }
                ]}>
                  URL
                </Text>
              </TouchableOpacity>
            </View>

            {testType === 'text' && (
              <View style={styles.testInput}>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder=\"Enter text to analyze for scams...\"
                  placeholderTextColor={colors.placeholder}
                  value={testText}
                  onChangeText={setTestText}
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity
                  style={[styles.testButton, { backgroundColor: colors.primary }]}
                  onPress={runTextTest}
                  disabled={loading}
                >
                  <Search size={16} color={colors.textInverse} />
                  <Text style={[styles.testButtonText, { color: colors.textInverse }]}>
                    Analyze Text
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {testType === 'url' && (
              <View style={styles.testInput}>
                <TextInput
                  style={[styles.urlInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder=\"Enter URL to analyze...\"
                  placeholderTextColor={colors.placeholder}
                  value={testUrl}
                  onChangeText={setTestUrl}
                  autoCapitalize=\"none\"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.testButton, { backgroundColor: colors.primary }]}
                  onPress={runUrlTest}
                  disabled={loading}
                >
                  <Search size={16} color={colors.textInverse} />
                  <Text style={[styles.testButtonText, { color: colors.textInverse }]}>
                    Analyze URL
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Threat Intelligence Update */}
        <View style={styles.threatIntelSection}>
          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={updateThreatIntelligence}
            disabled={loading}
          >
            <Shield size={20} color={colors.primary} />
            <Text style={[styles.updateButtonText, { color: colors.primary }]}>
              Update Threat Intelligence
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Reports */}
        <View style={styles.reportsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Scam Reports</Text>
          {recentReports.length === 0 ? (
            <View style={styles.emptyState}>
              <Shield size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No recent scam reports
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                The AI system is actively monitoring for threats
              </Text>
            </View>
          ) : (
            recentReports.map(renderRecentReport)
          )}
        </View>
      </ScrollView>

      {/* Test Result Modal */}
      {renderTestModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  testingSection: {
    marginBottom: 24,
  },
  testTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  testTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  testTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  testInput: {
    gap: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  threatIntelSection: {
    marginBottom: 24,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reportsSection: {
    marginBottom: 24,
  },
  reportItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportTime: {
    fontSize: 12,
  },
  reportContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  reportMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riskLabel: {
    fontSize: 12,
  },
  riskValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  reportStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detectedPatterns: {
    gap: 8,
  },
  patternsLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  patternsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  patternChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  patternText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  morePatterns: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  resultSection: {
    gap: 24,
  },
  resultHeader: {
    alignItems: 'center',
    gap: 12,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  resultMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  patternsSection: {
    gap: 12,
  },
  patternDetail: {
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patternType: {
    fontSize: 14,
    fontWeight: '600',
  },
  patternSeverity: {
    fontSize: 12,
    fontWeight: '700',
  },
  patternDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  patternConfidence: {
    fontSize: 11,
  },
  recommendationsSection: {
    gap: 12,
  },
  recommendationItem: {
    paddingLeft: 8,
  },
  recommendationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  metadataSection: {
    gap: 12,
  },
  metadataContent: {
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  metadataText: {
    fontSize: 13,
  },
});

export default ScamDetectionDashboard;