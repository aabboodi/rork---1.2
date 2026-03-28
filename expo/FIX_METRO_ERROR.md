# حل مشكلة Metro Bundler - خطأ TerminalReporter

## المشكلة:
```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './src/lib/TerminalReporter' 
is not defined by "exports" in node_modules/metro/package.json
```

## الحل الأكيد - خطوة بخطوة:

### الخطوة 1: حذف جميع الملفات القديمة

```bash
# في terminal (Git Bash أو PowerShell)
rm -rf node_modules
rm bun.lockb
# أو إذا كنت تستخدم npm
rm package-lock.json
```

**في PowerShell على Windows:**
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force bun.lockb
# أو
Remove-Item -Force package-lock.json
```

### الخطوة 2: تحديث package.json

يرجى التأكد من أن ملف `package.json` يحتوي على هذه الإصدارات:

```json
{
  "dependencies": {
    "expo": "~53.0.23",
    "expo-router": "~5.1.7",
    "expo-constants": "~16.0.2",
    "react-native": "0.81.5",
    "@babel/core": "^7.26.0"
  }
}
```

### الخطوة 3: إعادة التثبيت

```bash
# باستخدام bun
bun install

# أو باستخدام npm (إذا كان bun يواجه مشاكل)
npm install --legacy-peer-deps
```

### الخطوة 4: تشغيل التطبيق بشكل نظيف

```bash
# مع تنظيف cache
bunx expo start --clear --tunnel

# أو بدون tunnel
bunx expo start --clear
```

---

## إذا لم ينجح الحل أعلاه:

### الحل البديل 1: استخدام npx بدلاً من bunx

```bash
# تثبيت باستخدام npm
npm install

# تشغيل باستخدام npx
npx expo start --clear
```

### الحل البديل 2: تثبيت إصدار محدد من @expo/metro-config

```bash
npm install @expo/metro-config@0.18.11 --save-dev
```

### الحل البديل 3: إنشاء metro.config.js يدوياً

قم بإنشاء ملف `metro.config.js` في مجلد المشروع الرئيسي:

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
```

---

## التحقق من نجاح الحل:

بعد تطبيق الحل، يجب أن ترى:

✅ **إذا نجح:**
```
Starting Metro Bundler
Tunnel ready.
Metro waiting on exp://xxxxx.exp.direct
Web is waiting on http://localhost:8081
```

❌ **إذا فشل، ستظهر:**
```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './src/lib/TerminalReporter'
```

---

## ملاحظات هامة:

1. **عدم توافق Expo Go:** بعض الإصدارات قد لا تعمل في Expo Go. إذا استمرت المشكلة، قد تحتاج إلى:
   - استخدام Development Build بدلاً من Expo Go
   - أو الرجوع إلى إصدار أقدم من Expo SDK (مثل 52)

2. **تضارب Node.js:** تأكد من أنك تستخدم Node.js إصدار 18+ أو 20+
   ```bash
   node --version
   ```

3. **مشاكل bun:** إذا كان bun يسبب مشاكل، استخدم npm بدلاً منه:
   ```bash
   npm install
   npx expo start
   ```

---

## الحل النهائي (إذا فشل كل شيء):

إذا لم ينجح أي من الحلول أعلاه، قد تحتاج إلى:

### الخيار 1: الرجوع إلى Expo SDK 52

قم بتعديل `package.json`:
```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "react-native": "0.76.0"
  }
}
```

ثم:
```bash
rm -rf node_modules
npm install
npx expo start --clear
```

### الخيار 2: إنشاء Development Build

```bash
# تثبيت expo-dev-client
bunx expo install expo-dev-client

# بناء Development Build
bunx eas build --profile development --platform android

# أو لنظام iOS
bunx eas build --profile development --platform ios
```

**ملاحظة:** هذا يتطلب حساب EAS Build

---

## اختبار نهائي:

بعد تطبيق أي حل، جرب:

```bash
# إيقاف جميع العمليات
pkill -f "expo\|metro"

# بدء جديد تماماً
bunx expo start --clear --tunnel

# افتح Expo Go على الهاتف
# امسح QR code
```

إذا رأيت شاشة تسجيل الدخول، تهانينا! 🎉

---

تم إنشاؤه: 2025
للمساعدة: راجع TROUBLESHOOTING_GUIDE.md
