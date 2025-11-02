# دليل حل المشاكل - تطبيق مدى

## 🚨 مشاكل شائعة وحلولها

### المشكلة 1: خطأ Metro Bundler (TerminalReporter)

**الخطأ:**
```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './src/lib/TerminalReporter' is not defined by "exports" in /home/user/rork-app/node_modules/metro/package.json
```

**السبب:**
- تضارب في إصدارات حزم Expo
- نسخة Metro غير متوافقة مع إصدار Expo

**الحل:**

1. **حذف node_modules وإعادة التثبيت:**
```bash
# حذف المجلدات القديمة
rm -rf node_modules
rm bun.lockb

# إعادة التثبيت
bun install

# أو استخدام npm
npm install
```

2. **التأكد من إصدارات الحزم المطلوبة:**
يجب أن تكون package.json بها الإصدارات التالية:
```json
{
  "dependencies": {
    "expo": "~53.0.23",
    "expo-router": "~5.1.7",
    "expo-constants": "~16.0.2",
    "expo-secure-store": "~14.2.4",
    "expo-system-ui": "~5.0.11",
    "expo-web-browser": "~15.0.8",
    "react-native": "0.81.5"
  },
  "devDependencies": {
    "@babel/core": "^7.26.0"
  }
}
```

3. **تنظيف ذاكرة التخزين المؤقت:**
```bash
# تنظيف Expo cache
bunx expo start -c

# أو
npx expo start --clear
```

---

### المشكلة 2: التطبيق لا يفتح على Android

**الخطأ:**
```
[runtime not ready]: TypeError: getDevServer is not a function
```

**السبب:**
- مشكلة في Metro bundler
- ذاكرة التخزين المؤقت تالفة
- تضارب في إصدارات الحزم

**الحل:**

1. **إعادة تشغيل Metro Bundler:**
```bash
# إيقاف جميع العمليات
pkill -f "expo\|metro"

# بدء جديد مع تنظيف
bunx expo start --clear --tunnel
```

2. **مسح البيانات من Expo Go:**
- افتح Expo Go على Android
- اذهب إلى Settings
- اختر "Clear app data"
- أعد تشغيل التطبيق

3. **التأكد من الاتصال:**
```bash
# التأكد من أن Tunnel يعمل
bunx expo start --tunnel

# إذا فشل، جرب بدون tunnel
bunx expo start
```

---

### المشكلة 3: فيضان في Console Logs

**المشكلة:**
رسائل logs كثيرة جداً تملأ الشاشة:
```
LOG  🚀 Initializing comprehensive security...
LOG  ✅ SecurityManager initialized
LOG  📊 Initializing monitoring services...
...
```

**الحل:**

✅ **تم حل هذه المشكلة في آخر تحديث**

الملف `app/_layout.tsx` تم تعديله لتقليل الlogs في وضع التطوير. جميع رسائل الlogs محمية الآن بشرط `__DEV__`:

```typescript
if (__DEV__) {
  console.log('🚀 Initializing security services...');
}
```

إذا كنت لا تزال ترى logs كثيرة، يمكنك تعطيلها بالكامل بإضافة هذا الكود في بداية `app/_layout.tsx`:

```typescript
if (__DEV__) {
  console.log = () => {};  // تعطيل console.log
  console.warn = () => {}; // تعطيل console.warn
  // احتفظ بـ console.error للأخطاء الحقيقية
}
```

---

### المشكلة 4: Security Services تُبطئ التطبيق

**المشكلة:**
التطبيق بطيء عند البدء بسبب تحميل security services

**الحل:**

1. **تعطيل UEBA في التطوير:**
أضف هذا في `.env`:
```
EXPO_PUBLIC_ENABLE_UEBA_DEV=false
EXPO_PUBLIC_ENABLE_THREAT_INTEL_DEV=false
```

2. **تأخير تحميل Security Services:**
تم تحديث `app/_layout.tsx` لتحميل security services في الخلفية دون منع ظهور الصفحة الأولى.

---

### المشكلة 5: خطأ في نطاق الدخول (Route Index)

**الخطأ:**
```
Project structure error: Project must have only one index file. Found 2: app/(tabs)/index.tsx, app/index.tsx
```

**السبب:**
وجود ملفين index.tsx في المشروع

**الحل:**

هذا التحذير **طبيعي** ومتوقع. التطبيق يستخدم:
- `app/index.tsx`: صفحة تسجيل الدخول (Login screen)
- `app/(tabs)/index.tsx`: الصفحة الرئيسية داخل التطبيق (Home screen)

expo-router سيوجه تلقائياً إلى الصفحة الصحيحة بناءً على حالة المصادقة.

---

## 🔧 خطوات عامة لاستكشاف الأخطاء

### 1. التحقق من البيئة

```bash
# التحقق من إصدار Node
node --version  # يجب أن يكون 18+ أو 20+

# التحقق من إصدار Bun (إذا كنت تستخدمه)
bun --version

# التحقق من إصدار Expo CLI
bunx expo --version
```

### 2. تنظيف شامل

```bash
# حذف كل شيء
rm -rf node_modules
rm bun.lockb  # أو rm package-lock.json إذا كنت تستخدم npm

# إعادة التثبيت
bun install  # أو npm install

# تنظيف cache
bunx expo start --clear
```

### 3. التحقق من الاتصال

```bash
# تأكد من أنك متصل بالإنترنت
ping google.com

# جرب tunnel mode
bunx expo start --tunnel

# إذا فشل، جرب بدون tunnel
bunx expo start
```

### 4. فحص السجلات (Logs)

```bash
# تشغيل مع logs مفصلة
DEBUG=expo* bunx expo start

# فتح DevTools
# اضغط على 'j' في terminal بعد تشغيل التطبيق
```

---

## 📱 مشاكل خاصة بـ Platform

### Android

**المشكلة: التطبيق يتجمد (Freeze) عند البدء**
```bash
# مسح بيانات Expo Go
adb shell pm clear host.exp.exponent

# إعادة تشغيل ADB server
adb kill-server
adb start-server
```

**المشكلة: لا يمكن الاتصال بـ Metro**
```bash
# إعادة توجيه المنافذ (Port forwarding)
adb reverse tcp:8081 tcp:8081
```

### iOS

**المشكلة: Cannot connect to Metro**
- تأكد من أنك على نفس شبكة WiFi
- استخدم tunnel mode:
```bash
bunx expo start --tunnel
```

### Web

**المشكلة: خطأ في CSP (Content Security Policy)**
- افتح Console في المتصفح
- ابحث عن أخطاء CSP
- التطبيق يتعامل معها تلقائياً، لكن إذا كان هناك مشكلة، يمكنك تعطيل CSP مؤقتاً

---

## 🆘 الحصول على المساعدة

إذا لم تنجح أي من الحلول أعلاه:

1. **افحص السجلات بالكامل** وابحث عن أول خطأ يظهر
2. **اجمع المعلومات التالية:**
   - نظام التشغيل والإصدار
   - إصدار Node.js
   - إصدار Expo CLI
   - كامل رسالة الخطأ
   - الخطوات التي قمت بها قبل ظهور الخطأ

3. **افتح issue في GitHub** مع هذه المعلومات
4. **راجع الdocumentation:**
   - [Expo Documentation](https://docs.expo.dev/)
   - [React Native Documentation](https://reactnative.dev/)

---

## 📚 موارد إضافية

- [Expo Troubleshooting Guide](https://docs.expo.dev/troubleshooting/overview/)
- [Metro Bundler Troubleshooting](https://facebook.github.io/metro/docs/troubleshooting)
- [React Native Debugging](https://reactnative.dev/docs/debugging)

---

## ✅ التأكد من نجاح التشغيل

عندما يعمل التطبيق بنجاح، يجب أن ترى:

1. **في Terminal:**
```
› Metro waiting on exp://192.168.x.x:8081
› Web is waiting on http://localhost:8081
```

2. **في Expo Go على الهاتف:**
- QR code يفتح التطبيق
- صفحة تسجيل الدخول تظهر

3. **في الWeb Browser:**
- صفحة تسجيل الدخول تظهر بدون أخطاء console (أو أخطاء بسيطة فقط)

---

تم التحديث: 2025
النسخة: 1.0.0
