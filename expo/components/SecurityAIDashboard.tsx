import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Brain, AlertTriangle, Users, TrendingUp, Eye, Zap, Target } from 'lucide-react-native';
import SecurityAIService, { RiskScore, ContentAnalysisResult } from '../services/security/SecurityAIService';

const { width } = Dimensions.get('window');

interface SecurityAIDashboardProps {
  onClose?: () => void;
}

const SecurityAIDashboard: React.FC<SecurityAIDashboardProps> = ({ onClose }) => {
  const [securityAI] = useState(() => SecurityAIService.getInstance());
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [testContent, setTestContent] = useState('');
  const [analysisResult, setAnalysisResult] = useState<ContentAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoModeration, setAutoModeration] = useState(true);
  const [securityReport, setSecurityReport] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'analysis' | 'users' | 'settings'>('overview');

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      await securityAI.initialize();
      loadRiskScores();
      loadSecurityReport();
    } catch (error) {
      console.error('Failed to initialize Security AI Dashboard:', error);
    }
  };

  const loadRiskScores = () => {
    const scores = securityAI.getAllRiskScores();
    setRiskScores(scores.sort((a, b) => b.score - a.score));
  };

  const loadSecurityReport = async () => {
    try {
      const report = await securityAI.generateSecurityReport();
      setSecurityReport(report);
    } catch (error) {
      console.error('Failed to load security report:', error);
    }
  };

  const analyzeTestContent = async () => {
    if (!testContent.trim()) {
      Alert.alert('Error', 'Please enter content to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await securityAI.analyzeContent(testContent, 'test-user', 'text');
      setAnalysisResult(result);
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze content');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (category: string) => {
    switch (category) {
      case 'critical': return '#FF3B30';
      case 'high': return '#FF9500';
      case 'medium': return '#FFCC00';
      case 'low': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Security Metrics */}
      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>Security Overview</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.metricGradient}
            >
              <Users size={24} color="white" />
              <Text style={styles.metricValue}>{securityReport?.totalUsers || 0}</Text>
              <Text style={styles.metricLabel}>Total Users</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.metricCard}>
            <LinearGradient
              colors={['#f093fb', '#f5576c']}
              style={styles.metricGradient}
            >
              <AlertTriangle size={24} color="white" />
              <Text style={styles.metricValue}>{securityReport?.highRiskUsers || 0}</Text>
              <Text style={styles.metricLabel}>High Risk</Text>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <LinearGradient
              colors={['#4facfe', '#00f2fe']}
              style={styles.metricGradient}
            >
              <TrendingUp size={24} color="white" />
              <Text style={styles.metricValue}>{securityReport?.recentThreats || 0}</Text>
              <Text style={styles.metricLabel}>Recent Threats</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.metricCard}>
            <LinearGradient
              colors={['#43e97b', '#38f9d7']}
              style={styles.metricGradient}
            >
              <Brain size={24} color="white" />
              <Text style={styles.metricValue}>AI</Text>
              <Text style={styles.metricLabel}>Active</Text>
            </LinearGradient>
          </View>
        </View>
      </View>

      {/* Top Risk Factors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Risk Factors</Text>
        {securityReport?.topRiskFactors?.map((factor: any, index: number) => (
          <View key={index} style={styles.riskFactorItem}>
            <View style={styles.riskFactorInfo}>
              <Text style={styles.riskFactorType}>{factor.factor.replace('_', ' ').toUpperCase()}</Text>
              <Text style={styles.riskFactorCount}>{factor.count} incidents</Text>
            </View>
            <View style={[styles.riskFactorBadge, { backgroundColor: getRiskColor('medium') }]}>
              <Text style={styles.riskFactorBadgeText}>{factor.count}</Text>
            </View>
          </View>
        )) || []}
      </View>
    </ScrollView>
  );

  const renderAnalysisTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content Analysis</Text>
        <Text style={styles.sectionDescription}>
          Test our AI-powered content moderation system
        </Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter text to analyze for spam, hate speech, or suspicious content..."
            placeholderTextColor="#8E8E93"
            value={testContent}
            onChangeText={setTestContent}
            multiline
            numberOfLines={4}
          />
          
          <TouchableOpacity
            style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
            onPress={analyzeTestContent}
            disabled={isAnalyzing}
          >
            <LinearGradient
              colors={isAnalyzing ? ['#8E8E93', '#8E8E93'] : ['#667eea', '#764ba2']}
              style={styles.analyzeButtonGradient}
            >
              <Brain size={20} color="white" />
              <Text style={styles.analyzeButtonText}>
                {isAnalyzing ? 'Analyzing...' : 'Analyze Content'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {analysisResult && (
          <View style={styles.analysisResults}>
            <Text style={styles.resultsTitle}>Analysis Results</Text>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Spam Detection:</Text>
              <View style={[styles.resultBadge, { backgroundColor: analysisResult.isSpam ? '#FF3B30' : '#34C759' }]}>
                <Text style={styles.resultBadgeText}>{analysisResult.isSpam ? 'DETECTED' : 'CLEAN'}</Text>
              </View>
            </View>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Hate Speech:</Text>
              <View style={[styles.resultBadge, { backgroundColor: analysisResult.isHate ? '#FF3B30' : '#34C759' }]}>
                <Text style={styles.resultBadgeText}>{analysisResult.isHate ? 'DETECTED' : 'CLEAN'}</Text>
              </View>
            </View>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Suspicious Content:</Text>
              <View style={[styles.resultBadge, { backgroundColor: analysisResult.isSuspicious ? '#FF9500' : '#34C759' }]}>
                <Text style={styles.resultBadgeText}>{analysisResult.isSuspicious ? 'FLAGGED' : 'CLEAN'}</Text>
              </View>
            </View>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Confidence:</Text>
              <Text style={styles.confidenceText}>{(analysisResult.confidence * 100).toFixed(1)}%</Text>
            </View>
            
            {analysisResult.riskFactors.length > 0 && (
              <View style={styles.riskFactorsContainer}>
                <Text style={styles.riskFactorsTitle}>Risk Factors:</Text>
                {analysisResult.riskFactors.map((factor, index) => (
                  <Text key={index} style={styles.riskFactorText}>• {factor}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderUsersTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Risk Scores</Text>
        <Text style={styles.sectionDescription}>
          Monitor user behavior and risk levels
        </Text>
        
        {riskScores.length === 0 ? (
          <View style={styles.emptyState}>
            <Shield size={48} color="#8E8E93" />
            <Text style={styles.emptyStateText}>No user data available</Text>
            <Text style={styles.emptyStateSubtext}>Risk scores will appear as users interact with the system</Text>
          </View>
        ) : (
          riskScores.map((risk, index) => (
            <View key={risk.userId} style={styles.userRiskCard}>
              <View style={styles.userRiskHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userId}>User: {risk.userId}</Text>
                  <Text style={styles.lastUpdated}>
                    Updated: {risk.lastUpdated.toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.riskScoreBadge, { backgroundColor: getRiskColor(risk.category) }]}>
                  <Text style={styles.riskScoreText}>{risk.score}</Text>
                </View>
              </View>
              
              <View style={styles.riskCategory}>
                <Text style={[styles.categoryText, { color: getRiskColor(risk.category) }]}>
                  {risk.category.toUpperCase()} RISK
                </Text>
              </View>
              
              {risk.factors.length > 0 && (
                <View style={styles.factorsContainer}>
                  <Text style={styles.factorsTitle}>Recent Factors:</Text>
                  {risk.factors.slice(-3).map((factor, factorIndex) => (
                    <Text key={factorIndex} style={styles.factorText}>
                      • {factor.description} ({factor.weight} pts)
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderSettingsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Security Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Auto Moderation</Text>
            <Text style={styles.settingDescription}>
              Automatically flag and moderate suspicious content
            </Text>
          </View>
          <Switch
            value={autoModeration}
            onValueChange={setAutoModeration}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor={autoModeration ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>
        
        <TouchableOpacity style={styles.actionButton}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.actionButtonGradient}
          >
            <Target size={20} color="white" />
            <Text style={styles.actionButtonText}>Retrain AI Model</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <LinearGradient
            colors={['#f093fb', '#f5576c']}
            style={styles.actionButtonGradient}
          >
            <Eye size={20} color="white" />
            <Text style={styles.actionButtonText}>Export Security Report</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Brain size={28} color="white" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Security AI</Text>
              <Text style={styles.headerSubtitle}>Behavioral Analysis & Content Moderation</Text>
            </View>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {[
          { key: 'overview', label: 'Overview', icon: TrendingUp },
          { key: 'analysis', label: 'Analysis', icon: Brain },
          { key: 'users', label: 'Users', icon: Users },
          { key: 'settings', label: 'Settings', icon: Zap }
        ].map(tab => {
          const IconComponent = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, selectedTab === tab.key && styles.tabButtonActive]}
              onPress={() => setSelectedTab(tab.key as any)}
            >
              <IconComponent 
                size={20} 
                color={selectedTab === tab.key ? '#667eea' : '#8E8E93'} 
              />
              <Text style={[styles.tabButtonText, selectedTab === tab.key && styles.tabButtonTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      {selectedTab === 'overview' && renderOverviewTab()}
      {selectedTab === 'analysis' && renderAnalysisTab()}
      {selectedTab === 'users' && renderUsersTab()}
      {selectedTab === 'settings' && renderSettingsTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  headerTextContainer: {
    marginLeft: 12
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white'
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  tabButtonActive: {
    backgroundColor: '#F0F0F5'
  },
  tabButtonText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
    fontWeight: '500'
  },
  tabButtonTextActive: {
    color: '#667eea'
  },
  tabContent: {
    flex: 1,
    padding: 20
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16
  },
  metricsContainer: {
    marginBottom: 24
  },
  metricsGrid: {
    flexDirection: 'row',
    marginBottom: 12
  },
  metricCard: {
    flex: 1,
    marginHorizontal: 6
  },
  metricGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8
  },
  metricLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4
  },
  riskFactorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  riskFactorInfo: {
    flex: 1
  },
  riskFactorType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  riskFactorCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2
  },
  riskFactorBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  riskFactorBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  inputContainer: {
    marginBottom: 20
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    textAlignVertical: 'top',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  analyzeButton: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  analyzeButtonDisabled: {
    opacity: 0.6
  },
  analyzeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  analysisResults: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 16
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  resultLabel: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500'
  },
  resultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  resultBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea'
  },
  riskFactorsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA'
  },
  riskFactorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8
  },
  riskFactorText: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40
  },
  userRiskCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  userRiskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  userInfo: {
    flex: 1
  },
  userId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  lastUpdated: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2
  },
  riskScoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  riskScoreText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  riskCategory: {
    marginBottom: 12
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  factorsContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA'
  },
  factorsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6
  },
  factorText: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 2
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  settingInfo: {
    flex: 1,
    marginRight: 16
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  }
});

export default SecurityAIDashboard;