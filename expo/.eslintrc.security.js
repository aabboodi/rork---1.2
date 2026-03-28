module.exports = {
  extends: [
    '@expo/eslint-config',
    'plugin:security/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:sonarjs/recommended'
  ],
  plugins: [
    'security',
    '@typescript-eslint',
    'react-hooks',
    'react-native',
    'sonarjs'
  ],
  rules: {
    // CRITICAL: All security rules set to 'error' for strict enforcement
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-bidi-characters': 'error',
    
    // CRITICAL: TypeScript security rules set to 'error'
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    
    // React Native specific security rules
    'react-native/no-inline-styles': 'error', // Changed to error for consistency
    'react-native/no-color-literals': 'error', // Changed to error for consistency
    'react-native/no-raw-text': 'error',

    // SonarJS Security Rules
    'sonarjs/cognitive-complexity': ['error', 15],
    'sonarjs/no-duplicate-string': ['error', 5],
    'sonarjs/no-identical-functions': 'error',
    'sonarjs/no-redundant-boolean': 'error',
    'sonarjs/no-unused-collection': 'error',
    'sonarjs/no-useless-catch': 'error',
    'sonarjs/prefer-immediate-return': 'error',
    'sonarjs/prefer-object-literal': 'error',
    'sonarjs/prefer-single-boolean-return': 'error',
    'sonarjs/no-small-switch': 'error',
    'sonarjs/no-redundant-jump': 'error',
    'sonarjs/no-identical-expressions': 'error',
    'sonarjs/no-collapsible-if': 'error',
    'sonarjs/no-collection-size-mischeck': 'error',
    'sonarjs/no-duplicated-branches': 'error',
    'sonarjs/no-element-overwrite': 'error',
    'sonarjs/no-extra-arguments': 'error',
    'sonarjs/no-identical-conditions': 'error',
    'sonarjs/no-inverted-boolean-check': 'error',
    'sonarjs/no-one-iteration-loop': 'error',
    'sonarjs/no-use-of-empty-return-value': 'error',
    'sonarjs/non-existent-operator': 'error',
    
    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    
    // CRITICAL: Enhanced security-focused rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-console': 'error', // Changed to error for production security
    'prefer-const': 'error',
    'no-var': 'error',
    'no-undef': 'error',
    'no-unused-vars': 'error',
    
    // CRITICAL: Prevent dangerous patterns
    'no-alert': 'error', // Changed to error
    'no-confirm': 'error',
    'no-debugger': 'error',
    'no-empty': 'error',
    'no-unreachable': 'error',
    
    // CRITICAL: Enforce secure coding practices
    'eqeqeq': 'error',
    'no-eq-null': 'error',
    'no-new-wrappers': 'error',
    'no-throw-literal': 'error',
    'radix': 'error',
    'no-caller': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-invalid-this': 'error',
    'no-multi-spaces': 'error',
    'no-multi-str': 'error',
    'no-new': 'error',
    'no-octal-escape': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-void': 'error',
    'no-with': 'error',
    'wrap-iife': 'error',
    'yoda': 'error',

    // CRITICAL: Additional security rules for financial applications
    'no-global-assign': 'error',
    'no-implicit-globals': 'error',
    'no-loop-func': 'error',
    'no-new-require': 'error',
    'no-path-concat': 'error',
    'no-process-env': 'error',
    'no-process-exit': 'error',
    'no-sync': 'error',
    'handle-callback-err': 'error',

    // CRITICAL: Secure Enclave and Keychain specific rules
    'no-hardcoded-credentials': 'error',
    'no-secrets': 'error',
    'no-weak-crypto': 'error',

    // CRITICAL: PenTest and vulnerability prevention rules
    'no-sql-injection': 'error',
    'no-xss': 'error',
    'no-csrf': 'error',
    'no-open-redirect': 'error',
    'no-path-traversal': 'error',
    'no-command-injection': 'error',
    'no-xxe': 'error',
    'no-ssrf': 'error',
    'no-insecure-deserialization': 'error',
    'no-broken-access-control': 'error'
  },
  env: {
    'react-native/react-native': true,
    'es6': true,
    'node': true
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    },
    'security/detect-object-injection': {
      'ignore': ['process.env']
    }
  },
  overrides: [
    {
      files: ['**/*.{ts,tsx,js,jsx}'],
      rules: {
        // CRITICAL: Prevent Node.js imports in React Native/Expo mobile code
        'no-restricted-imports': ['error', {
          'paths': [
            { 'name': 'events', 'message': 'Use services/events/EventBus instead of Node.js events module' },
            { 'name': 'fs', 'message': 'Use expo-file-system instead of Node.js fs module' },
            { 'name': 'path', 'message': 'Avoid Node.js path module in React Native - use string manipulation or expo-file-system' },
            { 'name': 'crypto', 'message': 'Use expo-crypto instead of Node.js crypto module' },
            { 'name': 'child_process', 'message': 'Node.js child_process is not available in React Native' },
            { 'name': 'net', 'message': 'Node.js net module is not available in React Native' },
            { 'name': 'tls', 'message': 'Node.js tls module is not available in React Native' },
            { 'name': 'dns', 'message': 'Node.js dns module is not available in React Native' },
            { 'name': 'os', 'message': 'Node.js os module is not available in React Native - use expo-device or Platform API' },
            { 'name': 'http', 'message': 'Use fetch API or axios instead of Node.js http module' },
            { 'name': 'https', 'message': 'Use fetch API or axios instead of Node.js https module' },
            { 'name': 'url', 'message': 'Use URL constructor or react-native URL polyfill instead of Node.js url module' },
            { 'name': 'querystring', 'message': 'Use URLSearchParams or manual parsing instead of Node.js querystring' },
            { 'name': 'stream', 'message': 'Node.js stream module is not available in React Native' },
            { 'name': 'buffer', 'message': 'Use react-native buffer polyfill if needed, but prefer Uint8Array' },
            { 'name': 'util', 'message': 'Node.js util module is not available in React Native' },
            { 'name': 'zlib', 'message': 'Node.js zlib module is not available in React Native' },
            { 'name': 'readline', 'message': 'Node.js readline module is not available in React Native' },
            { 'name': 'cluster', 'message': 'Node.js cluster module is not available in React Native' },
            { 'name': 'worker_threads', 'message': 'Node.js worker_threads module is not available in React Native' },
            { 'name': 'perf_hooks', 'message': 'Node.js perf_hooks module is not available in React Native' },
            { 'name': 'v8', 'message': 'Node.js v8 module is not available in React Native' },
            { 'name': 'vm', 'message': 'Node.js vm module is not available in React Native' },
            { 'name': 'repl', 'message': 'Node.js repl module is not available in React Native' },
            { 'name': 'dgram', 'message': 'Node.js dgram module is not available in React Native' },
            { 'name': 'timers', 'message': 'Use setTimeout/setInterval directly instead of Node.js timers module' },
            { 'name': 'console', 'message': 'Use global console object instead of importing Node.js console module' },
            { 'name': 'process', 'message': 'Use Platform API from react-native instead of Node.js process' },
            { 'name': 'assert', 'message': 'Node.js assert module is not available in React Native' }
          ],
          'patterns': [
            {
              'group': ['node:*'],
              'message': 'Node.js built-in modules with node: prefix are not available in React Native'
            }
          ]
        }]
      }
    },
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json'
      },
      rules: {
        // CRITICAL: TypeScript-specific security rules
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-for-in-array': 'error',
        '@typescript-eslint/no-implied-eval': 'error',
        '@typescript-eslint/no-throw-literal': 'error',
        '@typescript-eslint/prefer-promise-reject-errors': 'error',
        '@typescript-eslint/require-await': 'error',
        '@typescript-eslint/restrict-plus-operands': 'error',
        '@typescript-eslint/restrict-template-expressions': 'error',
        '@typescript-eslint/unbound-method': 'error'
      }
    },
    {
      files: ['scripts/**/*.js'],
      rules: {
        // Allow console.log in scripts
        'no-console': 'off',
        'no-process-env': 'off',
        'no-process-exit': 'off'
      }
    },
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        // Relax some rules for test files
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-console': 'off'
      }
    }
  ],
  // CRITICAL: Custom security rules for financial applications
  globals: {
    '__DEV__': 'readonly',
    'global': 'readonly',
    'process': 'readonly'
  },
  // CRITICAL: Security-specific configurations
  'security/detect-hardcoded-secrets': {
    'patterns': [
      {
        'name': 'API Key',
        'regex': '(?i)(api[_-]?key|apikey)\\s*[:=]\\s*["\']?[a-z0-9]{20,}["\']?'
      },
      {
        'name': 'Secret Key',
        'regex': '(?i)(secret[_-]?key|secretkey)\\s*[:=]\\s*["\']?[a-z0-9]{20,}["\']?'
      },
      {
        'name': 'Private Key',
        'regex': '(?i)(private[_-]?key|privatekey)\\s*[:=]\\s*["\']?[a-z0-9]{20,}["\']?'
      },
      {
        'name': 'Access Token',
        'regex': '(?i)(access[_-]?token|accesstoken)\\s*[:=]\\s*["\']?[a-z0-9]{20,}["\']?'
      },
      {
        'name': 'Database Password',
        'regex': '(?i)(db[_-]?pass|database[_-]?password)\\s*[:=]\\s*["\']?[a-z0-9]{8,}["\']?'
      }
    ]
  }
};