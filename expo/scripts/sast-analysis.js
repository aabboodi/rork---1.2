#!/usr/bin/env node

/**
 * Comprehensive Static Application Security Testing (SAST) Analysis Script
 * Integrates multiple security analysis tools for React Native applications
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SASTAnalyzer {
  constructor() {
    this.results = {
      semgrep: null,
      retire: null,
      snyk: null,
      jscpd: null,
      eslint: null,
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        infoIssues: 0
      }
    };
    
    this.reportDir = './reports/sast';
    this.ensureReportDirectory();
  }

  ensureReportDirectory() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async runSemgrepAnalysis() {
    console.log('🔍 Running Semgrep SAST analysis...');
    
    try {
      const command = 'semgrep --config=semgrep.yml --json --output=semgrep-results.json .';
      execSync(command, { stdio: 'pipe' });
      
      if (fs.existsSync('semgrep-results.json')) {
        const results = JSON.parse(fs.readFileSync('semgrep-results.json', 'utf8'));
        this.results.semgrep = results;
        
        const issues = results.results || [];
        issues.forEach(issue => {
          this.categorizeIssue(issue.extra?.severity || 'INFO');
        });
        
        console.log(`✅ Semgrep found ${issues.length} security issues`);
        return issues.length;
      }
    } catch (error) {
      console.error('❌ Semgrep analysis failed:', error.message);
      return -1;
    }
    
    return 0;
  }

  async runRetireJSAnalysis() {
    console.log('🔍 Running Retire.js vulnerability scan...');
    
    try {
      const command = 'retire --js --node --outputformat json --outputpath retire-results.json';
      execSync(command, { stdio: 'pipe' });
      
      if (fs.existsSync('retire-results.json')) {
        const results = JSON.parse(fs.readFileSync('retire-results.json', 'utf8'));
        this.results.retire = results;
        
        const vulnerabilities = results.data || [];
        vulnerabilities.forEach(vuln => {
          const severity = this.mapRetireSeverity(vuln.results?.[0]?.vulnerabilities?.[0]?.severity);
          this.categorizeIssue(severity);
        });
        
        console.log(`✅ Retire.js found ${vulnerabilities.length} vulnerable dependencies`);
        return vulnerabilities.length;
      }
    } catch (error) {
      console.error('❌ Retire.js analysis failed:', error.message);
      return -1;
    }
    
    return 0;
  }

  async runSnykAnalysis() {
    console.log('🔍 Running Snyk security test...');
    
    try {
      const command = 'snyk test --json';
      const output = execSync(command, { stdio: 'pipe', encoding: 'utf8' });
      
      const results = JSON.parse(output);
      this.results.snyk = results;
      
      const vulnerabilities = results.vulnerabilities || [];
      vulnerabilities.forEach(vuln => {
        this.categorizeIssue(vuln.severity?.toUpperCase() || 'MEDIUM');
      });
      
      fs.writeFileSync('snyk-results.json', JSON.stringify(results, null, 2));
      console.log(`✅ Snyk found ${vulnerabilities.length} vulnerabilities`);
      return vulnerabilities.length;
    } catch (error) {
      // Snyk returns non-zero exit code when vulnerabilities are found
      try {
        const results = JSON.parse(error.stdout || '{}');
        if (results.vulnerabilities) {
          this.results.snyk = results;
          fs.writeFileSync('snyk-results.json', JSON.stringify(results, null, 2));
          console.log(`✅ Snyk found ${results.vulnerabilities.length} vulnerabilities`);
          return results.vulnerabilities.length;
        }
      } catch (parseError) {
        console.error('❌ Snyk analysis failed:', error.message);
        return -1;
      }
    }
    
    return 0;
  }

  async runJSCPDAnalysis() {
    console.log('🔍 Running JSCPD code duplication analysis...');
    
    try {
      const command = 'jscpd --reporters json --output ./reports/';
      execSync(command, { stdio: 'pipe' });
      
      const reportPath = './reports/jscpd/jscpd-report.json';
      if (fs.existsSync(reportPath)) {
        const results = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        this.results.jscpd = results;
        
        const duplicates = results.statistics?.total?.duplicates || 0;
        if (duplicates > 10) {
          this.categorizeIssue('MEDIUM');
        }
        
        console.log(`✅ JSCPD found ${duplicates} code duplications`);
        return duplicates;
      }
    } catch (error) {
      console.error('❌ JSCPD analysis failed:', error.message);
      return -1;
    }
    
    return 0;
  }

  async runESLintSecurityAnalysis() {
    console.log('🔍 Running ESLint security analysis...');
    
    try {
      const command = 'eslint . --config .eslintrc.security.js --format json --output-file eslint-security-results.json';
      execSync(command, { stdio: 'pipe' });
      
      if (fs.existsSync('eslint-security-results.json')) {
        const results = JSON.parse(fs.readFileSync('eslint-security-results.json', 'utf8'));
        this.results.eslint = results;
        
        let totalIssues = 0;
        results.forEach(file => {
          file.messages?.forEach(message => {
            totalIssues++;
            const severity = message.severity === 2 ? 'HIGH' : 'MEDIUM';
            this.categorizeIssue(severity);
          });
        });
        
        console.log(`✅ ESLint found ${totalIssues} security issues`);
        return totalIssues;
      }
    } catch (error) {
      console.error('❌ ESLint security analysis failed:', error.message);
      return -1;
    }
    
    return 0;
  }

  categorizeIssue(severity) {
    this.results.summary.totalIssues++;
    
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        this.results.summary.criticalIssues++;
        break;
      case 'HIGH':
      case 'ERROR':
        this.results.summary.highIssues++;
        break;
      case 'MEDIUM':
      case 'WARNING':
        this.results.summary.mediumIssues++;
        break;
      case 'LOW':
        this.results.summary.lowIssues++;
        break;
      default:
        this.results.summary.infoIssues++;
    }
  }

  mapRetireSeverity(severity) {
    const mapping = {
      'high': 'HIGH',
      'medium': 'MEDIUM',
      'low': 'LOW'
    };
    return mapping[severity?.toLowerCase()] || 'MEDIUM';
  }

  generateConsolidatedReport() {
    console.log('\n📊 Generating consolidated security report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      tools: {
        semgrep: {
          enabled: this.results.semgrep !== null,
          issues: this.results.semgrep?.results?.length || 0
        },
        retire: {
          enabled: this.results.retire !== null,
          vulnerabilities: this.results.retire?.data?.length || 0
        },
        snyk: {
          enabled: this.results.snyk !== null,
          vulnerabilities: this.results.snyk?.vulnerabilities?.length || 0
        },
        jscpd: {
          enabled: this.results.jscpd !== null,
          duplications: this.results.jscpd?.statistics?.total?.duplicates || 0
        },
        eslint: {
          enabled: this.results.eslint !== null,
          issues: this.results.eslint?.reduce((total, file) => total + (file.messages?.length || 0), 0) || 0
        }
      },
      recommendations: this.generateRecommendations(),
      compliance: this.checkCompliance()
    };
    
    const reportPath = path.join(this.reportDir, 'consolidated-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.generateHTMLReport(report);
    this.printSummary(report);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.summary.criticalIssues > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Immediately fix all critical security vulnerabilities',
        impact: 'High risk of security breach'
      });
    }
    
    if (this.results.summary.highIssues > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Address high-severity security issues within 24 hours',
        impact: 'Potential security vulnerabilities'
      });
    }
    
    if (this.results.snyk?.vulnerabilities?.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Update vulnerable dependencies to latest secure versions',
        impact: 'Known vulnerabilities in dependencies'
      });
    }
    
    if (this.results.jscpd?.statistics?.total?.duplicates > 10) {
      recommendations.push({
        priority: 'LOW',
        action: 'Refactor duplicated code to improve maintainability',
        impact: 'Code quality and maintainability concerns'
      });
    }
    
    return recommendations;
  }

  checkCompliance() {
    const compliance = {
      'OWASP Top 10': {
        status: this.results.summary.criticalIssues === 0 && this.results.summary.highIssues < 5 ? 'COMPLIANT' : 'NON_COMPLIANT',
        issues: this.results.summary.criticalIssues + this.results.summary.highIssues
      },
      'PCI DSS': {
        status: this.results.summary.criticalIssues === 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
        issues: this.results.summary.criticalIssues
      },
      'SOC 2': {
        status: this.results.summary.totalIssues < 20 ? 'COMPLIANT' : 'NON_COMPLIANT',
        issues: this.results.summary.totalIssues
      }
    };
    
    return compliance;
  }

  generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>SAST Security Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; flex: 1; }
        .critical { border-left: 5px solid #d32f2f; }
        .high { border-left: 5px solid #f57c00; }
        .medium { border-left: 5px solid #fbc02d; }
        .low { border-left: 5px solid #388e3c; }
        .tools { margin: 20px 0; }
        .tool { background: #f9f9f9; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .recommendations { margin: 20px 0; }
        .recommendation { margin: 10px 0; padding: 15px; border-radius: 5px; }
        .compliance { margin: 20px 0; }
        .compliant { background: #e8f5e8; }
        .non-compliant { background: #ffeaea; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SAST Security Analysis Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Total Issues Found: ${report.summary.totalIssues}</p>
    </div>
    
    <div class="summary">
        <div class="metric critical">
            <h3>Critical</h3>
            <p>${report.summary.criticalIssues}</p>
        </div>
        <div class="metric high">
            <h3>High</h3>
            <p>${report.summary.highIssues}</p>
        </div>
        <div class="metric medium">
            <h3>Medium</h3>
            <p>${report.summary.mediumIssues}</p>
        </div>
        <div class="metric low">
            <h3>Low</h3>
            <p>${report.summary.lowIssues}</p>
        </div>
    </div>
    
    <div class="tools">
        <h2>Tool Results</h2>
        ${Object.entries(report.tools).map(([tool, data]) => `
            <div class="tool">
                <h3>${tool.toUpperCase()}</h3>
                <p>Status: ${data.enabled ? '✅ Enabled' : '❌ Disabled'}</p>
                <p>Issues: ${data.issues || data.vulnerabilities || data.duplications || 0}</p>
            </div>
        `).join('')}
    </div>
    
    <div class="recommendations">
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation ${rec.priority.toLowerCase()}">
                <h4>${rec.priority} Priority</h4>
                <p><strong>Action:</strong> ${rec.action}</p>
                <p><strong>Impact:</strong> ${rec.impact}</p>
            </div>
        `).join('')}
    </div>
    
    <div class="compliance">
        <h2>Compliance Status</h2>
        ${Object.entries(report.compliance).map(([framework, status]) => `
            <div class="tool ${status.status.toLowerCase().replace('_', '-')}">
                <h3>${framework}</h3>
                <p>Status: ${status.status}</p>
                <p>Issues: ${status.issues}</p>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
    
    const htmlPath = path.join(this.reportDir, 'security-report.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`📄 HTML report generated: ${htmlPath}`);
  }

  printSummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('🛡️  SAST SECURITY ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Total Issues: ${report.summary.totalIssues}`);
    console.log(`🔴 Critical: ${report.summary.criticalIssues}`);
    console.log(`🟠 High: ${report.summary.highIssues}`);
    console.log(`🟡 Medium: ${report.summary.mediumIssues}`);
    console.log(`🟢 Low: ${report.summary.lowIssues}`);
    console.log(`ℹ️  Info: ${report.summary.infoIssues}`);
    console.log('='.repeat(60));
    
    console.log('\n🔧 TOOL RESULTS:');
    Object.entries(report.tools).forEach(([tool, data]) => {
      const issues = data.issues || data.vulnerabilities || data.duplications || 0;
      console.log(`  ${tool.toUpperCase()}: ${data.enabled ? '✅' : '❌'} (${issues} issues)`);
    });
    
    console.log('\n📋 COMPLIANCE STATUS:');
    Object.entries(report.compliance).forEach(([framework, status]) => {
      const icon = status.status === 'COMPLIANT' ? '✅' : '❌';
      console.log(`  ${framework}: ${icon} ${status.status} (${status.issues} issues)`);
    });
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 TOP RECOMMENDATIONS:');
      report.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.priority}] ${rec.action}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
  }

  async runFullAnalysis() {
    console.log('🚀 Starting comprehensive SAST analysis...\n');
    
    const results = await Promise.allSettled([
      this.runSemgrepAnalysis(),
      this.runRetireJSAnalysis(),
      this.runSnykAnalysis(),
      this.runJSCPDAnalysis(),
      this.runESLintSecurityAnalysis()
    ]);
    
    const report = this.generateConsolidatedReport();
    
    // Determine exit code based on critical issues
    const exitCode = report.summary.criticalIssues > 0 ? 1 : 0;
    
    if (exitCode === 1) {
      console.log('\n❌ SAST analysis failed due to critical security issues!');
    } else {
      console.log('\n✅ SAST analysis completed successfully!');
    }
    
    return exitCode;
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new SASTAnalyzer();
  analyzer.runFullAnalysis()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('❌ SAST analysis failed:', error);
      process.exit(1);
    });
}

module.exports = SASTAnalyzer;