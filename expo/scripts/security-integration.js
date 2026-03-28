#!/usr/bin/env node

/**
 * Security Integration Script
 * Orchestrates multiple security tools and generates unified reports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SecurityIntegration {
  constructor() {
    this.config = this.loadConfig();
    this.results = {};
    this.reportDir = './reports/security-integration';
    this.ensureDirectories();
  }

  loadConfig() {
    try {
      return JSON.parse(fs.readFileSync('security-config.json', 'utf8'));
    } catch (error) {
      console.warn('⚠️ Security config not found, using defaults');
      return this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      tools: {
        semgrep: { enabled: true, failOnError: true },
        snyk: { enabled: true, failOnError: false },
        retire: { enabled: true, failOnError: true },
        eslint: { enabled: true, failOnError: true },
        jscpd: { enabled: true, failOnError: false }
      },
      thresholds: {
        critical: 0,
        high: 5,
        medium: 20,
        duplications: 15
      },
      compliance: {
        frameworks: ['OWASP', 'PCI-DSS', 'SOC2'],
        required: true
      }
    };
  }

  ensureDirectories() {
    const dirs = [this.reportDir, './reports/sast', './reports/compliance'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async runSecurityScan() {
    console.log('🛡️ Starting integrated security scan...\n');

    const scanResults = {
      timestamp: new Date().toISOString(),
      tools: {},
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        passed: true,
        failureReasons: []
      }
    };

    // Run each enabled tool
    for (const [toolName, toolConfig] of Object.entries(this.config.tools)) {
      if (toolConfig.enabled) {
        console.log(`🔍 Running ${toolName}...`);
        try {
          const result = await this.runTool(toolName);
          scanResults.tools[toolName] = result;
          this.aggregateResults(scanResults.summary, result);
        } catch (error) {
          console.error(`❌ ${toolName} failed:`, error.message);
          scanResults.tools[toolName] = { error: error.message, passed: false };
          
          if (toolConfig.failOnError) {
            scanResults.summary.passed = false;
            scanResults.summary.failureReasons.push(`${toolName} failed: ${error.message}`);
          }
        }
      }
    }

    // Check thresholds
    this.checkThresholds(scanResults);

    // Generate reports
    await this.generateReports(scanResults);

    return scanResults;
  }

  async runTool(toolName) {
    switch (toolName) {
      case 'semgrep':
        return this.runSemgrep();
      case 'snyk':
        return this.runSnyk();
      case 'retire':
        return this.runRetire();
      case 'eslint':
        return this.runESLint();
      case 'jscpd':
        return this.runJSCPD();
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async runSemgrep() {
    const command = 'semgrep --config=semgrep.yml --json --output=semgrep-results.json .';
    execSync(command, { stdio: 'pipe' });
    
    if (fs.existsSync('semgrep-results.json')) {
      const results = JSON.parse(fs.readFileSync('semgrep-results.json', 'utf8'));
      return {
        passed: results.results.length === 0,
        issues: results.results.length,
        details: results.results,
        tool: 'semgrep'
      };
    }
    
    return { passed: true, issues: 0, details: [], tool: 'semgrep' };
  }

  async runSnyk() {
    try {
      const output = execSync('snyk test --json', { stdio: 'pipe', encoding: 'utf8' });
      const results = JSON.parse(output);
      
      return {
        passed: results.vulnerabilities.length === 0,
        issues: results.vulnerabilities.length,
        details: results.vulnerabilities,
        tool: 'snyk'
      };
    } catch (error) {
      // Snyk returns non-zero exit code when vulnerabilities found
      if (error.stdout) {
        const results = JSON.parse(error.stdout);
        return {
          passed: false,
          issues: results.vulnerabilities?.length || 0,
          details: results.vulnerabilities || [],
          tool: 'snyk'
        };
      }
      throw error;
    }
  }

  async runRetire() {
    const command = 'retire --js --node --outputformat json --outputpath retire-results.json';
    execSync(command, { stdio: 'pipe' });
    
    if (fs.existsSync('retire-results.json')) {
      const results = JSON.parse(fs.readFileSync('retire-results.json', 'utf8'));
      const vulnerabilities = results.data || [];
      
      return {
        passed: vulnerabilities.length === 0,
        issues: vulnerabilities.length,
        details: vulnerabilities,
        tool: 'retire'
      };
    }
    
    return { passed: true, issues: 0, details: [], tool: 'retire' };
  }

  async runESLint() {
    const command = 'eslint . --config .eslintrc.security.js --format json --output-file eslint-security-results.json';
    execSync(command, { stdio: 'pipe' });
    
    if (fs.existsSync('eslint-security-results.json')) {
      const results = JSON.parse(fs.readFileSync('eslint-security-results.json', 'utf8'));
      const totalIssues = results.reduce((sum, file) => sum + file.messages.length, 0);
      
      return {
        passed: totalIssues === 0,
        issues: totalIssues,
        details: results,
        tool: 'eslint'
      };
    }
    
    return { passed: true, issues: 0, details: [], tool: 'eslint' };
  }

  async runJSCPD() {
    const command = 'jscpd --reporters json --output ./reports/';
    execSync(command, { stdio: 'pipe' });
    
    const reportPath = './reports/jscpd/jscpd-report.json';
    if (fs.existsSync(reportPath)) {
      const results = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      const duplications = results.statistics?.total?.duplicates || 0;
      
      return {
        passed: duplications <= this.config.thresholds.duplications,
        issues: duplications,
        details: results,
        tool: 'jscpd'
      };
    }
    
    return { passed: true, issues: 0, details: {}, tool: 'jscpd' };
  }

  aggregateResults(summary, toolResult) {
    if (toolResult.tool === 'jscpd') {
      // Handle code duplication separately
      return;
    }

    summary.totalIssues += toolResult.issues;

    // Categorize issues based on tool and severity
    if (toolResult.details && Array.isArray(toolResult.details)) {
      toolResult.details.forEach(issue => {
        const severity = this.getSeverity(issue, toolResult.tool);
        switch (severity) {
          case 'CRITICAL':
            summary.criticalIssues++;
            break;
          case 'HIGH':
            summary.highIssues++;
            break;
          case 'MEDIUM':
            summary.mediumIssues++;
            break;
          case 'LOW':
            summary.lowIssues++;
            break;
        }
      });
    }
  }

  getSeverity(issue, tool) {
    switch (tool) {
      case 'semgrep':
        return issue.extra?.severity?.toUpperCase() || 'MEDIUM';
      case 'snyk':
        return issue.severity?.toUpperCase() || 'MEDIUM';
      case 'retire':
        return issue.results?.[0]?.vulnerabilities?.[0]?.severity?.toUpperCase() || 'MEDIUM';
      case 'eslint':
        return issue.severity === 2 ? 'HIGH' : 'MEDIUM';
      default:
        return 'MEDIUM';
    }
  }

  checkThresholds(scanResults) {
    const { summary } = scanResults;
    const { thresholds } = this.config;

    if (summary.criticalIssues > thresholds.critical) {
      summary.passed = false;
      summary.failureReasons.push(`Critical issues (${summary.criticalIssues}) exceed threshold (${thresholds.critical})`);
    }

    if (summary.highIssues > thresholds.high) {
      summary.passed = false;
      summary.failureReasons.push(`High issues (${summary.highIssues}) exceed threshold (${thresholds.high})`);
    }

    if (summary.mediumIssues > thresholds.medium) {
      summary.passed = false;
      summary.failureReasons.push(`Medium issues (${summary.mediumIssues}) exceed threshold (${thresholds.medium})`);
    }
  }

  async generateReports(scanResults) {
    // JSON Report
    const jsonPath = path.join(this.reportDir, 'security-scan-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(scanResults, null, 2));

    // HTML Report
    await this.generateHTMLReport(scanResults);

    // Compliance Report
    await this.generateComplianceReport(scanResults);

    // Executive Summary
    await this.generateExecutiveSummary(scanResults);

    console.log(`\n📊 Reports generated in: ${this.reportDir}`);
  }

  async generateHTMLReport(scanResults) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Security Integration Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
        .passed { background: #4caf50; }
        .failed { background: #f44336; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #ddd; }
        .metric.critical { border-left-color: #d32f2f; }
        .metric.high { border-left-color: #f57c00; }
        .metric.medium { border-left-color: #fbc02d; }
        .metric.low { border-left-color: #388e3c; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; color: #666; }
        .tools { padding: 0 30px 30px 30px; }
        .tool { background: #f8f9fa; margin: 15px 0; padding: 20px; border-radius: 8px; border-left: 4px solid #ddd; }
        .tool.passed { border-left-color: #4caf50; }
        .tool.failed { border-left-color: #f44336; }
        .tool h3 { margin: 0 0 10px 0; display: flex; justify-content: space-between; align-items: center; }
        .recommendations { padding: 0 30px 30px 30px; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .footer { background: #f8f9fa; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Security Integration Report</h1>
            <p>Generated: ${scanResults.timestamp}</p>
            <span class="status ${scanResults.summary.passed ? 'passed' : 'failed'}">
                ${scanResults.summary.passed ? '✅ PASSED' : '❌ FAILED'}
            </span>
        </div>
        
        <div class="metrics">
            <div class="metric critical">
                <h3>Critical Issues</h3>
                <div class="value">${scanResults.summary.criticalIssues}</div>
            </div>
            <div class="metric high">
                <h3>High Issues</h3>
                <div class="value">${scanResults.summary.highIssues}</div>
            </div>
            <div class="metric medium">
                <h3>Medium Issues</h3>
                <div class="value">${scanResults.summary.mediumIssues}</div>
            </div>
            <div class="metric low">
                <h3>Low Issues</h3>
                <div class="value">${scanResults.summary.lowIssues}</div>
            </div>
        </div>
        
        <div class="tools">
            <h2>🔧 Tool Results</h2>
            ${Object.entries(scanResults.tools).map(([tool, result]) => `
                <div class="tool ${result.passed ? 'passed' : 'failed'}">
                    <h3>
                        ${tool.toUpperCase()}
                        <span>${result.passed ? '✅' : '❌'} ${result.issues || 0} issues</span>
                    </h3>
                    ${result.error ? `<p style="color: #f44336;">Error: ${result.error}</p>` : ''}
                </div>
            `).join('')}
        </div>
        
        ${scanResults.summary.failureReasons.length > 0 ? `
            <div class="recommendations">
                <h2>⚠️ Failure Reasons</h2>
                ${scanResults.summary.failureReasons.map(reason => `
                    <div class="recommendation">${reason}</div>
                `).join('')}
            </div>
        ` : ''}
        
        <div class="footer">
            <p>Security scan completed with ${Object.keys(scanResults.tools).length} tools</p>
        </div>
    </div>
</body>
</html>`;

    const htmlPath = path.join(this.reportDir, 'security-report.html');
    fs.writeFileSync(htmlPath, html);
  }

  async generateComplianceReport(scanResults) {
    const compliance = {
      timestamp: scanResults.timestamp,
      frameworks: {},
      overall: scanResults.summary.passed ? 'COMPLIANT' : 'NON_COMPLIANT',
      recommendations: []
    };

    // OWASP Top 10 Compliance
    compliance.frameworks['OWASP Top 10'] = {
      status: scanResults.summary.criticalIssues === 0 && scanResults.summary.highIssues < 5 ? 'COMPLIANT' : 'NON_COMPLIANT',
      criticalIssues: scanResults.summary.criticalIssues,
      highIssues: scanResults.summary.highIssues,
      requirements: [
        'A01:2021 – Broken Access Control',
        'A02:2021 – Cryptographic Failures',
        'A03:2021 – Injection',
        'A04:2021 – Insecure Design',
        'A05:2021 – Security Misconfiguration'
      ]
    };

    // PCI DSS Compliance
    compliance.frameworks['PCI DSS'] = {
      status: scanResults.summary.criticalIssues === 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
      criticalIssues: scanResults.summary.criticalIssues,
      requirements: [
        'Install and maintain network security controls',
        'Apply secure configurations to all system components',
        'Protect stored account data'
      ]
    };

    const compliancePath = path.join(this.reportDir, 'compliance-report.json');
    fs.writeFileSync(compliancePath, JSON.stringify(compliance, null, 2));
  }

  async generateExecutiveSummary(scanResults) {
    const summary = {
      executiveSummary: {
        overallStatus: scanResults.summary.passed ? 'SECURE' : 'REQUIRES_ATTENTION',
        riskLevel: this.calculateRiskLevel(scanResults.summary),
        keyFindings: this.getKeyFindings(scanResults),
        recommendations: this.getExecutiveRecommendations(scanResults),
        nextSteps: this.getNextSteps(scanResults)
      },
      technicalSummary: {
        toolsUsed: Object.keys(scanResults.tools).length,
        totalIssues: scanResults.summary.totalIssues,
        issueBreakdown: {
          critical: scanResults.summary.criticalIssues,
          high: scanResults.summary.highIssues,
          medium: scanResults.summary.mediumIssues,
          low: scanResults.summary.lowIssues
        }
      }
    };

    const summaryPath = path.join(this.reportDir, 'executive-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  }

  calculateRiskLevel(summary) {
    if (summary.criticalIssues > 0) return 'CRITICAL';
    if (summary.highIssues > 5) return 'HIGH';
    if (summary.mediumIssues > 15) return 'MEDIUM';
    return 'LOW';
  }

  getKeyFindings(scanResults) {
    const findings = [];
    
    if (scanResults.summary.criticalIssues > 0) {
      findings.push(`${scanResults.summary.criticalIssues} critical security vulnerabilities require immediate attention`);
    }
    
    if (scanResults.summary.highIssues > 0) {
      findings.push(`${scanResults.summary.highIssues} high-severity issues identified`);
    }
    
    const failedTools = Object.entries(scanResults.tools).filter(([_, result]) => !result.passed);
    if (failedTools.length > 0) {
      findings.push(`${failedTools.length} security tools reported failures`);
    }
    
    return findings;
  }

  getExecutiveRecommendations(scanResults) {
    const recommendations = [];
    
    if (scanResults.summary.criticalIssues > 0) {
      recommendations.push('Immediately address all critical security vulnerabilities before deployment');
    }
    
    if (scanResults.summary.highIssues > 5) {
      recommendations.push('Implement a security remediation plan for high-severity issues');
    }
    
    recommendations.push('Integrate security scanning into CI/CD pipeline');
    recommendations.push('Conduct regular security training for development team');
    
    return recommendations;
  }

  getNextSteps(scanResults) {
    const steps = [];
    
    if (!scanResults.summary.passed) {
      steps.push('Fix all critical and high-severity security issues');
      steps.push('Re-run security scan to verify fixes');
    }
    
    steps.push('Schedule quarterly security assessments');
    steps.push('Implement automated security monitoring');
    steps.push('Review and update security policies');
    
    return steps;
  }

  printResults(scanResults) {
    console.log('\n' + '='.repeat(80));
    console.log('🛡️  INTEGRATED SECURITY SCAN RESULTS');
    console.log('='.repeat(80));
    
    const statusIcon = scanResults.summary.passed ? '✅' : '❌';
    const statusText = scanResults.summary.passed ? 'PASSED' : 'FAILED';
    console.log(`\n📊 Overall Status: ${statusIcon} ${statusText}`);
    
    console.log('\n📈 Issue Summary:');
    console.log(`  🔴 Critical: ${scanResults.summary.criticalIssues}`);
    console.log(`  🟠 High: ${scanResults.summary.highIssues}`);
    console.log(`  🟡 Medium: ${scanResults.summary.mediumIssues}`);
    console.log(`  🟢 Low: ${scanResults.summary.lowIssues}`);
    console.log(`  📊 Total: ${scanResults.summary.totalIssues}`);
    
    console.log('\n🔧 Tool Results:');
    Object.entries(scanResults.tools).forEach(([tool, result]) => {
      const icon = result.passed ? '✅' : '❌';
      const issues = result.issues || 0;
      console.log(`  ${tool.toUpperCase()}: ${icon} (${issues} issues)`);
    });
    
    if (scanResults.summary.failureReasons.length > 0) {
      console.log('\n⚠️  Failure Reasons:');
      scanResults.summary.failureReasons.forEach(reason => {
        console.log(`  • ${reason}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }
}

// Run if called directly
if (require.main === module) {
  const integration = new SecurityIntegration();
  integration.runSecurityScan()
    .then(results => {
      integration.printResults(results);
      process.exit(results.summary.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Security integration failed:', error);
      process.exit(1);
    });
}

module.exports = SecurityIntegration;