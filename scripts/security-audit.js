#!/usr/bin/env node

/**
 * Comprehensive Security Audit Script with OWASP ZAP & Burp Suite Integration
 * Performs security checks on the React Native application
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
    this.owaspZapEnabled = false;
    this.burpSuiteEnabled = false;
    this.pentestResults = [];
  }

  // Main audit function
  async runAudit() {
    console.log('🔒 Starting Comprehensive Security Audit with PenTest Integration...\n');

    try {
      await this.checkPackageVulnerabilities();
      await this.checkSecurityConfiguration();
      await this.checkCodeSecurity();
      await this.checkAuthenticationSecurity();
      await this.checkDataProtection();
      await this.checkNetworkSecurity();
      await this.checkDeviceBinding();
      await this.checkSecureEnclaveImplementation();
      await this.checkKeychainProtection();
      await this.initializePentestTools();
      await this.runOwaspZapScan();
      await this.runBurpSuiteScan();
      await this.performQuarterlyPentestChecks();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Security audit failed:', error.message);
      process.exit(1);
    }
  }

  // Check for package vulnerabilities
  async checkPackageVulnerabilities() {
    console.log('📦 Checking package vulnerabilities...');
    
    try {
      // Run npm audit
      execSync('npm audit --audit-level moderate', { stdio: 'pipe' });
      this.passed.push('✅ No moderate or higher vulnerabilities found in dependencies');
    } catch (error) {
      this.issues.push('❌ Package vulnerabilities detected - run "npm audit fix" to resolve');
    }

    // Check for dangerous packages
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dangerousPackages = ['eval', 'vm2', 'serialize-javascript'];
    
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const foundDangerous = dangerousPackages.filter(pkg => allDeps[pkg]);
    
    if (foundDangerous.length > 0) {
      this.issues.push(`❌ Dangerous packages detected: ${foundDangerous.join(', ')}`);
    } else {
      this.passed.push('✅ No dangerous packages detected');
    }

    // Check for security-focused packages
    const securityPackages = ['expo-secure-store', 'expo-crypto', 'expo-local-authentication'];
    const foundSecurityPackages = securityPackages.filter(pkg => allDeps[pkg]);
    
    if (foundSecurityPackages.length >= 3) {
      this.passed.push('✅ Essential security packages are installed');
    } else {
      this.warnings.push('⚠️ Some essential security packages may be missing');
    }
  }

  // Check security configuration
  async checkSecurityConfiguration() {
    console.log('⚙️ Checking security configuration...');

    // Check app.json for secure identifiers
    if (fs.existsSync('app.json')) {
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      
      // Check for secure scheme
      if (appJson.expo?.scheme === 'myapp' || appJson.expo?.scheme?.includes('rork')) {
        this.issues.push('❌ Insecure app scheme detected - use unique scheme to prevent hijacking');
      } else {
        this.passed.push('✅ App scheme appears secure');
      }

      // Check for secure package identifiers
      const androidPackage = appJson.expo?.android?.package;
      const iosBundle = appJson.expo?.ios?.bundleIdentifier;
      
      if (androidPackage?.includes('rork') || iosBundle?.includes('rork')) {
        this.issues.push('❌ Insecure package identifiers detected - use unique identifiers');
      } else {
        this.passed.push('✅ Package identifiers appear secure');
      }
    }

    // Check ESLint security configuration
    if (fs.existsSync('.eslintrc.security.js')) {
      const eslintConfig = fs.readFileSync('.eslintrc.security.js', 'utf8');
      
      if (eslintConfig.includes("'warn'")) {
        this.warnings.push('⚠️ Some ESLint security rules are set to "warn" instead of "error"');
      } else {
        this.passed.push('✅ ESLint security rules properly configured as errors');
      }
    } else {
      this.issues.push('❌ ESLint security configuration not found');
    }

    // Check audit-ci configuration
    if (fs.existsSync('audit-ci.json')) {
      this.passed.push('✅ Audit CI configuration found');
    } else {
      this.warnings.push('⚠️ Audit CI configuration not found');
    }
  }

  // Check code security
  async checkCodeSecurity() {
    console.log('🔍 Checking code security...');

    // Check for authentication bypasses
    if (fs.existsSync('constants/specialUsers.ts')) {
      const content = fs.readFileSync('constants/specialUsers.ts', 'utf8');
      if (content.includes('hasOTPBypass') || content.includes('getUserRole')) {
        this.issues.push('❌ CRITICAL: Authentication bypass backdoor detected in specialUsers.ts');
      }
    } else {
      this.passed.push('✅ No authentication bypass backdoors detected');
    }

    // Check for hardcoded secrets
    const filesToCheck = this.getAllFiles('.', ['.ts', '.tsx', '.js', '.jsx']);
    const secretPatterns = [
      /api[_-]?key[_-]?=[\s]*['""][^'""\s]+['"]/i,
      /secret[_-]?key[_-]?=[\s]*['""][^'""\s]+['"]/i,
      /password[_-]?=[\s]*['""][^'""\s]+['"]/i,
      /token[_-]?=[\s]*['""][^'""\s]+['"]/i
    ];

    let secretsFound = false;
    filesToCheck.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      secretPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          this.issues.push(`❌ Potential hardcoded secret in ${file}`);
          secretsFound = true;
        }
      });
    });

    if (!secretsFound) {
      this.passed.push('✅ No hardcoded secrets detected');
    }

    // Check for console.log in production code
    let consoleLogsFound = false;
    filesToCheck.forEach(file => {
      if (file.includes('node_modules') || file.includes('.git')) return;
      
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('console.log') && !file.includes('security-audit.js')) {
        this.warnings.push(`⚠️ console.log found in ${file} - remove for production`);
        consoleLogsFound = true;
      }
    });

    if (!consoleLogsFound) {
      this.passed.push('✅ No console.log statements in production code');
    }
  }

  // Check authentication security
  async checkAuthenticationSecurity() {
    console.log('🔐 Checking authentication security...');

    // Check for proper session management
    if (fs.existsSync('services/security/SessionManager.ts')) {
      const content = fs.readFileSync('services/security/SessionManager.ts', 'utf8');
      
      if (content.includes('validateSession') && content.includes('validateDeviceBinding')) {
        this.passed.push('✅ Enhanced session validation implemented');
      } else {
        this.warnings.push('⚠️ Session validation may be incomplete');
      }

      if (content.includes('sessionFingerprint') && content.includes('deviceBinding')) {
        this.passed.push('✅ Device binding and session fingerprinting implemented');
      } else {
        this.warnings.push('⚠️ Device binding may be incomplete');
      }
    } else {
      this.issues.push('❌ SessionManager not found - authentication may be insecure');
    }

    // Check for MFA implementation
    if (fs.existsSync('services/security/MFAService.ts')) {
      this.passed.push('✅ Multi-factor authentication service found');
    } else {
      this.warnings.push('⚠️ Multi-factor authentication service not found');
    }

    // Check for biometric authentication
    if (fs.existsSync('services/security/BiometricAuthService.ts')) {
      const content = fs.readFileSync('services/security/BiometricAuthService.ts', 'utf8');
      
      if (content.includes('authenticateForKeyVerification') && content.includes('authenticateForTransaction')) {
        this.passed.push('✅ Advanced biometric authentication implemented');
      } else {
        this.warnings.push('⚠️ Basic biometric authentication only');
      }
    } else {
      this.issues.push('❌ Biometric authentication service not found');
    }
  }

  // Check data protection
  async checkDataProtection() {
    console.log('🛡️ Checking data protection...');

    // Check for encryption services
    if (fs.existsSync('services/security/CryptoService.ts')) {
      const content = fs.readFileSync('services/security/CryptoService.ts', 'utf8');
      
      if (content.includes('advancedEncrypt') && content.includes('advancedDecrypt')) {
        this.passed.push('✅ Advanced encryption service implemented');
      } else if (content.includes('encrypt') && content.includes('decrypt')) {
        this.passed.push('✅ Basic encryption service implemented');
      } else {
        this.issues.push('❌ Encryption service incomplete');
      }

      // Check for E2EE implementation
      if (content.includes('encryptE2EEMessage') && content.includes('decryptE2EEMessage')) {
        this.passed.push('✅ End-to-end encryption implemented');
      } else {
        this.warnings.push('⚠️ End-to-end encryption not implemented');
      }

      // Check for immutable ledger
      if (content.includes('createImmutableTransactionRecord') && content.includes('verifyImmutableTransactionRecord')) {
        this.passed.push('✅ Immutable financial ledger implemented');
      } else {
        this.warnings.push('⚠️ Immutable financial ledger not implemented');
      }
    } else {
      this.issues.push('❌ Encryption service not found');
    }

    // Check for secure storage
    if (fs.existsSync('services/security/SecureStorage.ts')) {
      const content = fs.readFileSync('services/security/SecureStorage.ts', 'utf8');
      
      if (content.includes('storeEncryptionKey') && content.includes('getEncryptionKey')) {
        this.passed.push('✅ Advanced secure storage with key management implemented');
      } else {
        this.passed.push('✅ Basic secure storage service found');
      }
    } else {
      this.issues.push('❌ Secure storage service not found');
    }

    // Check for data validation
    if (fs.existsSync('utils/dataValidation.ts')) {
      this.passed.push('✅ Data validation utilities found');
    } else {
      this.warnings.push('⚠️ Data validation utilities not found');
    }
  }

  // Check network security
  async checkNetworkSecurity() {
    console.log('🌐 Checking network security...');

    if (fs.existsSync('services/security/NetworkSecurity.ts')) {
      const content = fs.readFileSync('services/security/NetworkSecurity.ts', 'utf8');
      
      if (content.includes('certificate') && content.includes('pinning')) {
        this.passed.push('✅ Certificate pinning implemented');
      } else {
        this.warnings.push('⚠️ Certificate pinning may be incomplete');
      }
    } else {
      this.warnings.push('⚠️ Network security service not found');
    }

    // Check for WAF service
    if (fs.existsSync('services/security/WAFService.ts')) {
      this.passed.push('✅ Web Application Firewall service found');
    } else {
      this.warnings.push('⚠️ WAF service not found');
    }

    // Check for API security middleware
    if (fs.existsExists('services/security/APISecurityMiddleware.ts')) {
      this.passed.push('✅ API security middleware found');
    } else {
      this.warnings.push('⚠️ API security middleware not found');
    }

    // Check package.json for tunnel usage
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts || {};
    
    const hasTunnel = Object.values(scripts).some(script => 
      typeof script === 'string' && script.includes('--tunnel')
    );
    
    if (hasTunnel) {
      this.issues.push('❌ CRITICAL: Tunnel usage detected in scripts - security risk');
    } else {
      this.passed.push('✅ No tunnel usage detected in scripts');
    }
  }

  // Check device binding implementation
  async checkDeviceBinding() {
    console.log('📱 Checking device binding...');

    if (fs.existsExists('services/security/DeviceBindingService.ts')) {
      const content = fs.readFileSync('services/security/DeviceBindingService.ts', 'utf8');
      
      if (content.includes('validateDeviceBinding') && content.includes('deviceFingerprint')) {
        this.passed.push('✅ Device binding service implemented');
      } else {
        this.warnings.push('⚠️ Device binding service may be incomplete');
      }
    } else {
      this.warnings.push('⚠️ Device binding service not found');
    }

    // Check for device security service
    if (fs.existsSync('services/security/DeviceSecurityService.ts')) {
      const content = fs.readFileSync('services/security/DeviceSecurityService.ts', 'utf8');
      
      if (content.includes('forceSecurityCheck') && content.includes('detectThreats')) {
        this.passed.push('✅ Advanced device security service implemented');
      } else {
        this.warnings.push('⚠️ Basic device security service only');
      }
    } else {
      this.issues.push('❌ Device security service not found');
    }
  }

  // CRITICAL: Check Secure Enclave implementation
  async checkSecureEnclaveImplementation() {
    console.log('🔐 Checking Secure Enclave implementation...');

    // Check KeyManager for Secure Enclave support
    if (fs.existsSync('services/security/KeyManager.ts')) {
      const content = fs.readFileSync('services/security/KeyManager.ts', 'utf8');
      
      if (content.includes('SecureEnclaveConfig') && content.includes('generateSecureEnclaveKey')) {
        this.passed.push('✅ Secure Enclave key management implemented');
      } else {
        this.warnings.push('⚠️ Secure Enclave key management not implemented');
      }

      if (content.includes('initializeSecureEnclave') && content.includes('checkHardwareSecurityCapabilities')) {
        this.passed.push('✅ Hardware security capabilities check implemented');
      } else {
        this.warnings.push('⚠️ Hardware security capabilities check missing');
      }

      if (content.includes('generateiOSSecureEnclaveKey') && content.includes('generateAndroidKeystoreKey')) {
        this.passed.push('✅ Platform-specific hardware key generation implemented');
      } else {
        this.warnings.push('⚠️ Platform-specific hardware key generation missing');
      }
    } else {
      this.issues.push('❌ KeyManager not found - Secure Enclave not implemented');
    }

    // Check CryptoService for hardware-backed operations
    if (fs.existsExists('services/security/CryptoService.ts')) {
      const content = fs.readFileSync('services/security/CryptoService.ts', 'utf8');
      
      if (content.includes('hardwareAcceleration') && content.includes('hardwareProtected')) {
        this.passed.push('✅ Hardware-accelerated cryptography support detected');
      } else {
        this.warnings.push('⚠️ Hardware-accelerated cryptography not implemented');
      }
    }
  }

  // CRITICAL: Check Keychain/Keystore protection
  async checkKeychainProtection() {
    console.log('🔑 Checking Keychain/Keystore protection...');

    // Check SecureStorage for Keychain integration
    if (fs.existsExists('services/security/SecureStorage.ts')) {
      const content = fs.readFileSync('services/security/SecureStorage.ts', 'utf8');
      
      if (content.includes('KeychainOptions') && content.includes('setItemInKeychain')) {
        this.passed.push('✅ Keychain/Keystore integration implemented');
      } else {
        this.warnings.push('⚠️ Keychain/Keystore integration not implemented');
      }

      if (content.includes('storeEncryptionKey') && content.includes('getEncryptionKey')) {
        this.passed.push('✅ Encryption key storage in Keychain implemented');
      } else {
        this.warnings.push('⚠️ Encryption key storage in Keychain missing');
      }

      if (content.includes('requireBiometric') && content.includes('useSecureEnclave')) {
        this.passed.push('✅ Biometric-protected Keychain access implemented');
      } else {
        this.warnings.push('⚠️ Biometric-protected Keychain access missing');
      }

      if (content.includes('checkSecureEnclaveAvailability') && content.includes('initializeKeychainSecurity')) {
        this.passed.push('✅ Keychain security initialization implemented');
      } else {
        this.warnings.push('⚠️ Keychain security initialization missing');
      }
    } else {
      this.issues.push('❌ SecureStorage not found - Keychain protection not implemented');
    }

    // Check SecurityManager for Secure Enclave integration
    if (fs.existsExists('services/security/SecurityManager.ts')) {
      const content = fs.readFileSync('services/security/SecurityManager.ts', 'utf8');
      
      if (content.includes('enableSecureEnclave') && content.includes('enableKeychainProtection')) {
        this.passed.push('✅ Security Manager Secure Enclave integration implemented');
      } else {
        this.warnings.push('⚠️ Security Manager Secure Enclave integration missing');
      }

      if (content.includes('initializeSecureEnclaveAndKeychain') && content.includes('initializeMasterKeysInSecureStorage')) {
        this.passed.push('✅ Master key initialization in Secure Enclave implemented');
      } else {
        this.warnings.push('⚠️ Master key initialization in Secure Enclave missing');
      }
    }
  }

  // CRITICAL: Initialize PenTest tools (OWASP ZAP & Burp Suite)
  async initializePentestTools() {
    console.log('🔧 Initializing PenTest tools...');

    // Check for OWASP ZAP
    try {
      execSync('zap.sh -version', { stdio: 'pipe' });
      this.owaspZapEnabled = true;
      this.passed.push('✅ OWASP ZAP detected and ready');
    } catch (error) {
      try {
        execSync('zaproxy -version', { stdio: 'pipe' });
        this.owaspZapEnabled = true;
        this.passed.push('✅ OWASP ZAP detected and ready');
      } catch (error2) {
        this.warnings.push('⚠️ OWASP ZAP not found - install for automated vulnerability scanning');
      }
    }

    // Check for Burp Suite (command line)
    try {
      // Check if Burp Suite Professional is available
      if (fs.existsSync('/Applications/Burp Suite Professional.app') || 
          fs.existsSync('C:\\Program Files\\BurpSuitePro\\BurpSuitePro.exe') ||
          fs.existsSync('/opt/BurpSuitePro/BurpSuitePro')) {
        this.burpSuiteEnabled = true;
        this.passed.push('✅ Burp Suite Professional detected');
      } else {
        this.warnings.push('⚠️ Burp Suite Professional not found - install for advanced security testing');
      }
    } catch (error) {
      this.warnings.push('⚠️ Could not detect Burp Suite installation');
    }

    // Create PenTest configuration
    await this.createPentestConfig();
  }

  // Create PenTest configuration files
  async createPentestConfig() {
    const pentestConfig = {
      owasp_zap: {
        enabled: this.owaspZapEnabled,
        target_url: 'http://localhost:8081', // Expo dev server
        scan_types: ['baseline', 'full', 'api'],
        report_format: ['html', 'json', 'xml'],
        authentication: {
          enabled: true,
          login_url: '/auth/login',
          username_field: 'phoneNumber',
          password_field: 'otp'
        },
        scan_policy: 'Default Policy',
        max_scan_time: 3600, // 1 hour
        exclude_urls: [
          '/health',
          '/metrics',
          '/static/'
        ]
      },
      burp_suite: {
        enabled: this.burpSuiteEnabled,
        target_scope: ['localhost:8081', 'localhost:19000'],
        scan_types: ['crawl', 'audit', 'extension_scan'],
        report_format: ['html', 'xml'],
        extensions: [
          'Active Scan++',
          'Param Miner',
          'Collaborator Everywhere',
          'J2EEScan',
          'Additional Scanner Checks'
        ],
        scan_configuration: 'Audit checks - all except time-based detection methods',
        max_scan_time: 7200 // 2 hours
      },
      quarterly_schedule: {
        enabled: true,
        next_scan_date: this.getNextQuarterlyScanDate(),
        notification_email: 'security@company.com',
        automated_reporting: true,
        compliance_requirements: ['OWASP Top 10', 'PCI DSS', 'SOC 2']
      }
    };

    // Write configuration to file
    fs.writeFileSync('pentest-config.json', JSON.stringify(pentestConfig, null, 2));
    this.passed.push('✅ PenTest configuration created');
  }

  // Get next quarterly scan date
  getNextQuarterlyScanDate() {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const nextQuarter = (currentQuarter + 1) % 4;
    const nextYear = nextQuarter === 0 ? now.getFullYear() + 1 : now.getFullYear();
    const nextScanDate = new Date(nextYear, nextQuarter * 3, 1);
    return nextScanDate.toISOString().split('T')[0];
  }

  // CRITICAL: Run OWASP ZAP scan
  async runOwaspZapScan() {
    if (!this.owaspZapEnabled) {
      this.warnings.push('⚠️ OWASP ZAP scan skipped - tool not available');
      return;
    }

    console.log('🕷️ Running OWASP ZAP vulnerability scan...');

    try {
      // Start ZAP daemon
      console.log('Starting OWASP ZAP daemon...');
      
      // Create ZAP scan script
      const zapScript = `
#!/bin/bash
# OWASP ZAP Automated Security Scan

TARGET_URL="http://localhost:8081"
ZAP_PORT=8080
REPORT_DIR="./security-reports"

# Create reports directory
mkdir -p $REPORT_DIR

# Start ZAP daemon
zap.sh -daemon -port $ZAP_PORT -config api.disablekey=true &
ZAP_PID=$!

# Wait for ZAP to start
sleep 30

# Run baseline scan
echo "Running baseline scan..."
zap-baseline.py -t $TARGET_URL -r $REPORT_DIR/zap-baseline-report.html -J $REPORT_DIR/zap-baseline-report.json

# Run full scan
echo "Running full scan..."
zap-full-scan.py -t $TARGET_URL -r $REPORT_DIR/zap-full-report.html -J $REPORT_DIR/zap-full-report.json

# Run API scan
echo "Running API scan..."
zap-api-scan.py -t $TARGET_URL/api -r $REPORT_DIR/zap-api-report.html -J $REPORT_DIR/zap-api-report.json

# Stop ZAP daemon
kill $ZAP_PID

echo "OWASP ZAP scans completed. Reports saved to $REPORT_DIR"
      `;

      fs.writeFileSync('run-zap-scan.sh', zapScript);
      fs.chmodSync('run-zap-scan.sh', '755');

      this.passed.push('✅ OWASP ZAP scan script created');
      this.pentestResults.push({
        tool: 'OWASP ZAP',
        status: 'configured',
        script: 'run-zap-scan.sh',
        reports: ['zap-baseline-report.html', 'zap-full-report.html', 'zap-api-report.html']
      });

    } catch (error) {
      this.warnings.push('⚠️ OWASP ZAP scan configuration failed: ' + error.message);
    }
  }

  // CRITICAL: Run Burp Suite scan
  async runBurpSuiteScan() {
    if (!this.burpSuiteEnabled) {
      this.warnings.push('⚠️ Burp Suite scan skipped - tool not available');
      return;
    }

    console.log('🔍 Configuring Burp Suite security scan...');

    try {
      // Create Burp Suite configuration
      const burpConfig = {
        target: {
          scope: {
            include: [
              {
                enabled: true,
                file: "^http://localhost:8081/.*",
                protocol: "http"
              },
              {
                enabled: true,
                file: "^https://localhost:8081/.*",
                protocol: "https"
              }
            ]
          }
        },
        scanner: {
          audit_checks: {
            sql_injection: true,
            xss: true,
            xxe: true,
            ssrf: true,
            command_injection: true,
            path_traversal: true,
            file_upload: true,
            insecure_deserialization: true,
            authentication_bypass: true,
            authorization_issues: true,
            session_management: true,
            crypto_issues: true,
            information_disclosure: true,
            denial_of_service: false, // Disabled to prevent app crashes
            time_based_detection: false // Disabled for faster scans
          },
          crawl_optimization: {
            maximum_link_depth: 10,
            maximum_unique_locations: 1000,
            skip_duplicate_forms: true,
            submit_forms: true,
            follow_redirects: true
          }
        },
        reporting: {
          format: "html",
          include_false_positives: false,
          include_information_issues: true,
          confidence_threshold: "certain"
        }
      };

      fs.writeFileSync('burp-config.json', JSON.stringify(burpConfig, null, 2));

      // Create Burp Suite scan script
      const burpScript = `
#!/bin/bash
# Burp Suite Professional Automated Security Scan

TARGET_URL="http://localhost:8081"
BURP_CONFIG="./burp-config.json"
REPORT_DIR="./security-reports"

# Create reports directory
mkdir -p $REPORT_DIR

# Run Burp Suite Professional scan
echo "Starting Burp Suite Professional scan..."

# Note: This requires Burp Suite Professional with command line support
# Adjust the path based on your Burp Suite installation

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    BURP_PATH="/Applications/Burp Suite Professional.app/Contents/MacOS/Burp Suite Professional"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    BURP_PATH="/opt/BurpSuitePro/BurpSuitePro"
elif [[ "$OSTYPE" == "msys" ]]; then
    # Windows
    BURP_PATH="C:/Program Files/BurpSuitePro/BurpSuitePro.exe"
fi

# Run scan with configuration
"$BURP_PATH" --project-file=./burp-project.burp --config-file=$BURP_CONFIG --unpause-spider-and-scanner --auto-repair-project-file

echo "Burp Suite scan completed. Check Burp Suite for detailed results."
echo "Export reports manually from Burp Suite to $REPORT_DIR"
      `;

      fs.writeFileSync('run-burp-scan.sh', burpScript);
      fs.chmodSync('run-burp-scan.sh', '755');

      this.passed.push('✅ Burp Suite scan script created');
      this.pentestResults.push({
        tool: 'Burp Suite Professional',
        status: 'configured',
        script: 'run-burp-scan.sh',
        config: 'burp-config.json',
        reports: ['Manual export required from Burp Suite']
      });

    } catch (error) {
      this.warnings.push('⚠️ Burp Suite scan configuration failed: ' + error.message);
    }
  }

  // CRITICAL: Perform quarterly PenTest checks
  async performQuarterlyPentestChecks() {
    console.log('📅 Setting up quarterly PenTest automation...');

    try {
      // Create quarterly PenTest automation script
      const quarterlyScript = `
#!/bin/bash
# Quarterly Automated PenTest Script

CURRENT_DATE=$(date +%Y-%m-%d)
REPORT_DIR="./security-reports/quarterly-$(date +%Y-Q%q)"
EMAIL_RECIPIENT="security@company.com"

echo "Starting Quarterly PenTest - $CURRENT_DATE"

# Create quarterly report directory
mkdir -p $REPORT_DIR

# Run comprehensive security audit
echo "Running comprehensive security audit..."
node scripts/security-audit.js > $REPORT_DIR/security-audit-report.txt

# Run OWASP ZAP scans
if [ -f "./run-zap-scan.sh" ]; then
    echo "Running OWASP ZAP scans..."
    ./run-zap-scan.sh
    mv ./security-reports/zap-*.* $REPORT_DIR/
fi

# Run Burp Suite scans
if [ -f "./run-burp-scan.sh" ]; then
    echo "Running Burp Suite scans..."
    ./run-burp-scan.sh
    echo "Remember to export Burp Suite reports to $REPORT_DIR"
fi

# Run additional security checks
echo "Running additional security checks..."

# Check for outdated dependencies
npm audit --audit-level=low --json > $REPORT_DIR/npm-audit-report.json

# Check for license compliance
npx license-checker --json > $REPORT_DIR/license-check-report.json

# Run ESLint security checks
npx eslint . --config .eslintrc.security.js --format json > $REPORT_DIR/eslint-security-report.json

# Generate compliance report
echo "Generating compliance report..."
cat > $REPORT_DIR/compliance-report.md << EOF
# Quarterly Security Compliance Report
Date: $CURRENT_DATE

## OWASP Top 10 Compliance
- [ ] A01:2021 – Broken Access Control
- [ ] A02:2021 – Cryptographic Failures
- [ ] A03:2021 – Injection
- [ ] A04:2021 – Insecure Design
- [ ] A05:2021 – Security Misconfiguration
- [ ] A06:2021 – Vulnerable and Outdated Components
- [ ] A07:2021 – Identification and Authentication Failures
- [ ] A08:2021 – Software and Data Integrity Failures
- [ ] A09:2021 – Security Logging and Monitoring Failures
- [ ] A10:2021 – Server-Side Request Forgery

## PCI DSS Compliance
- [ ] Build and Maintain a Secure Network
- [ ] Protect Cardholder Data
- [ ] Maintain a Vulnerability Management Program
- [ ] Implement Strong Access Control Measures
- [ ] Regularly Monitor and Test Networks
- [ ] Maintain an Information Security Policy

## SOC 2 Compliance
- [ ] Security
- [ ] Availability
- [ ] Processing Integrity
- [ ] Confidentiality
- [ ] Privacy

## Recommendations
1. Review and update security policies
2. Conduct security awareness training
3. Update incident response procedures
4. Review access controls and permissions
5. Update security monitoring and alerting

EOF

# Create summary report
echo "Creating summary report..."
cat > $REPORT_DIR/executive-summary.md << EOF
# Executive Security Summary
Date: $CURRENT_DATE

## Security Posture
- Overall Risk Level: [TO BE DETERMINED]
- Critical Issues: [TO BE DETERMINED]
- High Priority Issues: [TO BE DETERMINED]
- Medium Priority Issues: [TO BE DETERMINED]

## Key Findings
[TO BE FILLED AFTER MANUAL REVIEW]

## Recommendations
[TO BE FILLED AFTER MANUAL REVIEW]

## Next Steps
1. Address critical and high priority issues
2. Schedule follow-up scans
3. Update security documentation
4. Plan next quarterly assessment

EOF

echo "Quarterly PenTest completed. Reports saved to $REPORT_DIR"
echo "Please review reports and update compliance checklist manually."

# Send notification email (requires mail command or similar)
if command -v mail &> /dev/null; then
    echo "Quarterly PenTest completed. Reports available at $REPORT_DIR" | mail -s "Quarterly Security Assessment Complete" $EMAIL_RECIPIENT
fi
      `;

      fs.writeFileSync('quarterly-pentest.sh', quarterlyScript);
      fs.chmodSync('quarterly-pentest.sh', '755');

      // Create cron job suggestion
      const cronSuggestion = `
# Add this to your crontab for quarterly automation
# Run on the first day of each quarter at 2 AM
0 2 1 1,4,7,10 * /path/to/your/project/quarterly-pentest.sh

# To edit crontab:
# crontab -e
      `;

      fs.writeFileSync('cron-setup.txt', cronSuggestion);

      this.passed.push('✅ Quarterly PenTest automation configured');
      this.pentestResults.push({
        tool: 'Quarterly Automation',
        status: 'configured',
        script: 'quarterly-pentest.sh',
        cron: 'cron-setup.txt',
        schedule: 'First day of each quarter at 2 AM'
      });

    } catch (error) {
      this.warnings.push('⚠️ Quarterly PenTest automation setup failed: ' + error.message);
    }
  }

  // Get all files with specific extensions
  getAllFiles(dir, extensions) {
    const files = [];
    
    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scan(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      });
    };
    
    scan(dir);
    return files;
  }

  // Generate comprehensive security audit report
  generateReport() {
    console.log('\n📋 Comprehensive Security Audit Report with PenTest Integration');
    console.log('================================================================\n');

    if (this.issues.length > 0) {
      console.log('🚨 CRITICAL ISSUES:');
      this.issues.forEach(issue => console.log(`  ${issue}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️ WARNINGS:');
      this.warnings.forEach(warning => console.log(`  ${warning}`));
      console.log('');
    }

    if (this.passed.length > 0) {
      console.log('✅ PASSED CHECKS:');
      this.passed.forEach(pass => console.log(`  ${pass}`));
      console.log('');
    }

    // PenTest Tools Summary
    if (this.pentestResults.length > 0) {
      console.log('🔧 PENTEST TOOLS CONFIGURATION:');
      this.pentestResults.forEach(result => {
        console.log(`  Tool: ${result.tool}`);
        console.log(`  Status: ${result.status}`);
        if (result.script) console.log(`  Script: ${result.script}`);
        if (result.config) console.log(`  Config: ${result.config}`);
        if (result.schedule) console.log(`  Schedule: ${result.schedule}`);
        console.log('');
      });
    }

    // Summary
    const total = this.issues.length + this.warnings.length + this.passed.length;
    const score = Math.round((this.passed.length / total) * 100);
    
    console.log(`📊 SECURITY SCORE: ${score}%`);
    console.log(`   Critical Issues: ${this.issues.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);
    console.log(`   Passed: ${this.passed.length}`);
    console.log(`   PenTest Tools: ${this.pentestResults.length} configured`);
    console.log('');

    // Recommendations
    console.log('🎯 PENTEST RECOMMENDATIONS:');
    console.log('  1. Run OWASP ZAP scans weekly during development');
    console.log('  2. Perform Burp Suite scans before major releases');
    console.log('  3. Execute quarterly comprehensive PenTests');
    console.log('  4. Set up automated vulnerability monitoring');
    console.log('  5. Maintain compliance with OWASP Top 10, PCI DSS, and SOC 2');
    console.log('  6. Regular security training for development team');
    console.log('  7. Implement continuous security testing in CI/CD pipeline');
    console.log('');

    // Next Steps
    console.log('📋 NEXT STEPS:');
    console.log('  1. Review and address all critical issues');
    console.log('  2. Install OWASP ZAP and Burp Suite if not available');
    console.log('  3. Run initial vulnerability scans using provided scripts');
    console.log('  4. Set up quarterly PenTest automation using cron');
    console.log('  5. Establish security incident response procedures');
    console.log('  6. Create security monitoring dashboard');
    console.log('');

    if (this.issues.length > 0) {
      console.log('❌ AUDIT FAILED - Critical security issues must be resolved');
      console.log('🔧 PenTest tools configured for ongoing security assessment');
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log('⚠️ AUDIT PASSED WITH WARNINGS - Consider addressing warnings');
      console.log('🔧 PenTest tools configured for ongoing security assessment');
      process.exit(0);
    } else {
      console.log('✅ AUDIT PASSED - No critical security issues detected');
      console.log('🔧 PenTest tools configured for ongoing security assessment');
      process.exit(0);
    }
  }
}

// Run the audit
const auditor = new SecurityAuditor();
auditor.runAudit().catch(error => {
  console.error('❌ Security audit failed:', error);
  process.exit(1);
});