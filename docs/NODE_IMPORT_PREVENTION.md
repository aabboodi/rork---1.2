# Node.js Import Prevention Guide

## Overview

This guide provides comprehensive strategies to prevent Node.js built-in module imports in React Native/Expo applications, ensuring cross-platform compatibility and preventing bundling failures.

## Why Prevent Node.js Imports?

React Native and Expo run in a JavaScript environment that **does not include Node.js built-in modules**. Attempting to import these modules causes:

1. **Metro Bundler Failures**: `Unable to resolve module 'events'`
2. **Runtime Crashes**: Module not found errors
3. **Platform Inconsistencies**: Code that works in development but fails in production
4. **Web Compatibility Issues**: React Native Web doesn't support Node.js modules

## Blocked Node.js Modules

### Core System Modules
- `events` → Use `services/events/EventBus` (eventemitter3)
- `fs` → Use `expo-file-system`
- `path` → Use string manipulation or `expo-file-system`
- `crypto` → Use `expo-crypto`
- `os` → Use `expo-device` or `Platform` API

### Network & HTTP
- `http` → Use `fetch` API or `axios`
- `https` → Use `fetch` API or `axios`
- `net` → Not available in React Native
- `tls` → Not available in React Native
- `dns` → Not available in React Native
- `url` → Use `URL` constructor or manual parsing
- `querystring` → Use `URLSearchParams`

### Process & System
- `child_process` → Not available in React Native
- `cluster` → Not available in React Native
- `worker_threads` → Not available in React Native
- `process` → Use `Platform` API from `react-native`
- `console` → Use global `console` object
- `timers` → Use global `setTimeout`/`setInterval`

### Data & Streams
- `stream` → Not available in React Native
- `buffer` → Use `Uint8Array` or React Native buffer polyfill
- `util` → Not available in React Native
- `zlib` → Not available in React Native

### Advanced Modules
- `perf_hooks` → Not available in React Native
- `v8` → Not available in React Native
- `vm` → Not available in React Native
- `repl` → Not available in React Native
- `readline` → Not available in React Native
- `dgram` → Not available in React Native
- `assert` → Use custom assertion functions

## React Native Alternatives

### Event Handling

❌ **Node.js (Causes bundling failure)**
```typescript
import { EventEmitter } from 'events';

class MyService extends EventEmitter {
  constructor() {
    super();
  }
  
  doSomething() {
    this.emit('done', { data: 'result' });
  }
}
```

✅ **React Native Compatible**
```typescript
import { EventBus } from '@/services/events/EventBus';

class MyService {
  doSomething() {
    EventBus.instance.emit('service:done', { data: 'result' });
  }
}

// Usage
EventBus.instance.on('service:done', (payload) => {
  console.log('Service completed:', payload.data);
});
```

### File System Operations

❌ **Node.js (Causes bundling failure)**
```typescript
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, 'data.json');
const data = fs.readFileSync(filePath, 'utf8');
```

✅ **React Native Compatible**
```typescript
import * as FileSystem from 'expo-file-system';

const filePath = `${FileSystem.documentDirectory}data.json`;
const data = await FileSystem.readAsStringAsync(filePath);
```

### Cryptographic Operations

❌ **Node.js (Causes bundling failure)**
```typescript
import * as crypto from 'crypto';

const hash = crypto.createHash('sha256').update(data).digest('hex');
const randomBytes = crypto.randomBytes(32);
```

✅ **React Native Compatible**
```typescript
import * as Crypto from 'expo-crypto';

const hash = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  data
);
const randomBytes = await Crypto.getRandomBytesAsync(32);
```

### HTTP Requests

❌ **Node.js (Causes bundling failure)**
```typescript
import * as http from 'http';
import * as https from 'https';

const req = https.request(options, (res) => {
  // Handle response
});
```

✅ **React Native Compatible**
```typescript
// Using fetch API (built-in)
const response = await fetch('https://api.example.com/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});

// Or using axios
import axios from 'axios';
const response = await axios.post('https://api.example.com/data', data);
```

### Platform Information

❌ **Node.js (Causes bundling failure)**
```typescript
import * as os from 'os';

const platform = os.platform();
const arch = os.arch();
const cpus = os.cpus();
```

✅ **React Native Compatible**
```typescript
import { Platform } from 'react-native';
import * as Device from 'expo-device';

const platform = Platform.OS; // 'ios', 'android', 'web'
const deviceInfo = {
  brand: Device.brand,
  modelName: Device.modelName,
  osName: Device.osName,
  osVersion: Device.osVersion,
};
```

## Prevention Strategies

### 1. ESLint Configuration

The `.eslintrc.security.js` already includes comprehensive Node.js import restrictions:

```javascript
'no-restricted-imports': ['error', {
  'paths': [
    { 'name': 'events', 'message': 'Use services/events/EventBus instead' },
    { 'name': 'fs', 'message': 'Use expo-file-system instead' },
    { 'name': 'crypto', 'message': 'Use expo-crypto instead' },
    { 'name': 'path', 'message': 'Use string manipulation or expo-file-system' },
    { 'name': 'os', 'message': 'Use expo-device or Platform API instead' },
    { 'name': 'http', 'message': 'Use fetch API or axios instead' },
    { 'name': 'https', 'message': 'Use fetch API or axios instead' },
    // ... 20+ more Node.js modules blocked
  ],
  'patterns': [
    {
      'group': ['node:*'],
      'message': 'Node.js built-in modules with node: prefix are not available in React Native'
    }
  ]
}]
```

### 2. TypeScript Configuration

Exclude Node.js types from mobile code:

```json
{
  "compilerOptions": {
    "types": ["react", "react-native", "expo"],
    "skipLibCheck": true
  },
  "exclude": [
    "node_modules",
    "scripts/**/*",
    "tools/**/*"
  ]
}
```

### 3. Validation Scripts

Run comprehensive validation:

```bash
# Enhanced Phase B validation
./scripts/validate-phase-b.sh

# Legacy Node.js import check
./scripts/check-node-imports.sh
```

### 4. Package.json Scripts

Add validation commands:

```json
{
  "scripts": {
    "validate:phase-b": "./scripts/validate-phase-b.sh",
    "pre-commit": "npm run validate:phase-b && npm run lint:security",
    "build": "npm run validate:phase-b && expo build"
  }
}
```

## EventBus Implementation

The project includes a React Native compatible event system at `services/events/EventBus.ts`:

```typescript
import EE from "eventemitter3";

export type EventMap = {
  // Security events
  "security:incident": { 
    severity: "low" | "medium" | "high" | "critical"; 
    details: any;
    timestamp: number;
  };
  
  // Monitoring events
  "monitor:metric": { 
    name: string; 
    value: number; 
    tags?: Record<string, string>;
    timestamp: number;
  };
  
  // User events
  "user:login": { userId: string; timestamp: number };
  "user:logout": { userId: string; timestamp: number };
  
  // App events
  "app:foreground": { timestamp: number };
  "app:background": { timestamp: number };
};

export class EventBus {
  private static _instance: EventBus;
  private ee = new EE();

  static get instance(): EventBus {
    if (!EventBus._instance) {
      EventBus._instance = new EventBus();
    }
    return EventBus._instance;
  }

  on<K extends keyof EventMap>(
    event: K, 
    listener: (payload: EventMap[K]) => void
  ): void {
    this.ee.on(event, listener as any);
  }

  emit<K extends keyof EventMap>(
    event: K, 
    payload: EventMap[K]
  ): void {
    this.ee.emit(event, payload as any);
  }
}
```

## Common Migration Patterns

### Service Classes

❌ **Before (Node.js EventEmitter)**
```typescript
import { EventEmitter } from 'events';

export class SecurityService extends EventEmitter {
  constructor() {
    super();
  }

  detectThreat(threat: any) {
    this.emit('threat-detected', threat);
  }
}
```

✅ **After (EventBus)**
```typescript
import { EventBus } from '@/services/events/EventBus';

export class SecurityService {
  detectThreat(threat: any) {
    EventBus.instance.emit('security:incident', {
      severity: 'high',
      details: threat,
      timestamp: Date.now()
    });
  }
}
```

### File Operations

❌ **Before (Node.js fs)**
```typescript
import * as fs from 'fs';
import * as path from 'path';

export class ConfigService {
  private configPath = path.join(__dirname, 'config.json');

  loadConfig() {
    return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
  }

  saveConfig(config: any) {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }
}
```

✅ **After (Expo FileSystem)**
```typescript
import * as FileSystem from 'expo-file-system';

export class ConfigService {
  private configPath = `${FileSystem.documentDirectory}config.json`;

  async loadConfig() {
    try {
      const content = await FileSystem.readAsStringAsync(this.configPath);
      return JSON.parse(content);
    } catch (error) {
      return {}; // Default config
    }
  }

  async saveConfig(config: any) {
    await FileSystem.writeAsStringAsync(
      this.configPath, 
      JSON.stringify(config, null, 2)
    );
  }
}
```

## Validation Tools

### Enhanced Validation Script

The `scripts/validate-phase-b.sh` provides comprehensive checking:

- ✅ Checks ESLint configuration completeness
- ✅ Validates TypeScript setup
- ✅ Scans all mobile code for Node.js imports (23+ modules)
- ✅ Verifies EventBus implementation
- ✅ Checks package dependencies
- ✅ Provides detailed error messages and fix suggestions

### ESLint Integration

Run ESLint to catch imports:

```bash
npx eslint . --ext .ts,.tsx,.js,.jsx
```

### Build Validation

Test bundling to ensure no Node.js imports:

```bash
expo start -c  # Clear cache and start
```

## Troubleshooting

### Common Error Messages

1. **"Unable to resolve module 'events'"**
   - Replace with EventBus implementation
   - Check for indirect imports through other packages

2. **"Module not found: Can't resolve 'fs'"**
   - Replace with expo-file-system
   - Ensure no build tools are importing fs in mobile code

3. **"Cannot resolve module 'crypto'"**
   - Replace with expo-crypto
   - Check for crypto usage in dependencies

### Debugging Steps

1. **Run validation script**: `./scripts/validate-phase-b.sh`
2. **Check ESLint**: `npx eslint . --ext .ts,.tsx`
3. **Clear Metro cache**: `expo start -c`
4. **Check dependencies**: Look for packages that might import Node.js modules
5. **Review build logs**: Look for specific import failures

## Best Practices

1. **Use Platform Checks**: When necessary, use `Platform.OS` to provide different implementations
2. **Prefer Expo APIs**: Use Expo's cross-platform APIs when available
3. **Validate Early**: Run checks in development and CI/CD
4. **Document Alternatives**: Maintain a team guide for Node.js → React Native migrations
5. **Test on All Platforms**: Ensure code works on iOS, Android, and Web

## Related Documentation

- [Phase B TypeScript Guard](./PHASE_B_TYPESCRIPT_GUARD.md)
- [ESLint Security Configuration](../.eslintrc.security.js)
- [EventBus Implementation](../services/events/EventBus.ts)
- [Expo File System Documentation](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Expo Crypto Documentation](https://docs.expo.dev/versions/latest/sdk/crypto/)