# دليل التثبيت والتشغيل - تطبيق مدى 1.2

<div align="center">

![مدى Logo](./assets/images/icon.png)

**تطبيق محمول احترافي للتواصل الآمن والمحفظة الرقمية**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-53.0.23-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6.svg)](https://www.typescriptlang.org/)

</div>

---

## 📋 جدول المحتويات

- [متطلبات النظام](#-متطلبات-النظام)
- [التثبيت على Windows](#️-التثبيت-على-windows)
  - [باستخدام PowerShell](#1-باستخدام-powershell)
  - [باستخدام Git Bash](#2-باستخدام-git-bash)
  - [باستخدام Anaconda](#3-باستخدام-anaconda-prompt)
- [التثبيت على Linux/macOS](#-التثبيت-على-linuxmacos)
- [التشغيل](#-التشغيل)
- [استكشاف الأخطاء](#-استكشاف-الأخطاء)

---

## 💻 متطلبات النظام

### الأساسيات:
- **Node.js**: الإصدار 18.x أو 20.x ([تحميل](https://nodejs.org/))
- **Git**: أحدث إصدار ([تحميل](https://git-scm.com/))
- **مدير الحزم**: أحد الخيارات التالية:
  - [Bun](https://bun.sh/) (مُوصى به للسرعة)
  - [npm](https://www.npmjs.com/) (يأتي مع Node.js)
  - [Yarn](https://yarnpkg.com/)

### اختياري (للتطوير المتقدم):
- **Anaconda** ([تحميل](https://www.anaconda.com/download))
- **Android Studio** (للتطوير على Android)
- **Xcode** (للتطوير على iOS - macOS فقط)

### للتشغيل على الهاتف:
- **Android:** تطبيق [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS:** تطبيق [Expo Go](https://apps.apple.com/app/expo-go/id982107779)

---

## 🖥️ التثبيت على Windows

### 1. باستخدام PowerShell

#### الخطوة 1: فتح PowerShell
```powershell
# اضغط Windows + X ثم اختر "Windows PowerShell (Admin)"
# أو ابحث عن "PowerShell" في قائمة ابدأ
```

#### الخطوة 2: التحقق من التثبيتات
```powershell
# التحقق من Node.js
node --version
# يجب أن يظهر: v18.x.x أو v20.x.x

# التحقق من Git
git --version
# يجب أن يظهر: git version 2.x.x

# التحقق من Bun (إذا كنت تستخدمه)
bun --version
# أو npm
npm --version
```

#### الخطوة 3: استنساخ المشروع
```powershell
# اذهب إلى المجلد الذي تريد حفظ المشروع فيه
cd C:\Users\YourName\Documents

# استنساخ المشروع (استبدل YOUR_REPO_URL برابط المشروع)
git clone YOUR_REPO_URL rork-app
cd rork-app
```

#### الخطوة 4: تثبيت الاعتماديات
```powershell
# باستخدام Bun (مُوصى به)
bun install

# أو باستخدام npm
npm install --legacy-peer-deps
```

#### الخطوة 5: تشغيل التطبيق
```powershell
# تشغيل مع tunnel (للاتصال من الهاتف)
bunx expo start --tunnel

# أو بدون tunnel (شبكة محلية فقط)
bunx expo start
```

---

### 2. باستخدام Git Bash

#### الخطوة 1: فتح Git Bash
```bash
# افتح Git Bash من قائمة ابدأ
# أو انقر بزر الماوس الأيمن في المجلد واختر "Git Bash Here"
```

#### الخطوة 2: التحقق من التثبيتات
```bash
node --version
git --version
bun --version  # أو npm --version
```

#### الخطوة 3: استنساخ المشروع
```bash
# اذهب إلى المجلد المطلوب
cd /c/Users/YourName/Documents

# استنساخ المشروع
git clone YOUR_REPO_URL rork-app
cd rork-app
```

#### الخطوة 4: تثبيت الاعتماديات
```bash
# تنظيف (إذا كان هناك تثبيت سابق)
rm -rf node_modules
rm -f bun.lockb  # أو rm -f package-lock.json

# تثبيت
bun install  # أو npm install --legacy-peer-deps
```

#### الخطوة 5: تشغيل التطبيق
```bash
# تشغيل مع تنظيف cache
bunx expo start --clear --tunnel

# أو
npx expo start --clear --tunnel
```

---

### 3. باستخدام Anaconda Prompt

#### الخطوة 1: فتح Anaconda Prompt
```bash
# ابحث عن "Anaconda Prompt" في قائمة ابدأ
```

#### الخطوة 2: إنشاء بيئة جديدة (اختياري لكن مُوصى به)
```bash
# إنشاء بيئة بأسم rork-env مع Node.js 20
conda create -n rork-env nodejs=20 -y

# تفعيل البيئة
conda activate rork-env
```

#### الخطوة 3: التحقق من التثبيتات
```bash
node --version
npm --version

# تثبيت Bun إذا لم يكن موجوداً
npm install -g bun
```

#### الخطوة 4: استنساخ المشروع
```bash
cd C:\Users\YourName\Documents
git clone YOUR_REPO_URL rork-app
cd rork-app
```

#### الخطوة 5: تثبيت وتشغيل
```bash
# تثبيت
bun install  # أو npm install --legacy-peer-deps

# تشغيل
bunx expo start --tunnel
```

---

## 🐧 التثبيت على Linux/macOS

### الطريقة 1: باستخدام Terminal العادي

#### الخطوة 1: فتح Terminal
```bash
# Linux: Ctrl + Alt + T
# macOS: Cmd + Space ثم اكتب "Terminal"
```

#### الخطوة 2: التحقق من التثبيتات
```bash
node --version
git --version

# تثبيت Bun إذا لم يكن موجوداً
curl -fsSL https://bun.sh/install | bash

# أعد فتح Terminal ثم تحقق
bun --version
```

#### الخطوة 3: استنساخ المشروع
```bash
# اذهب إلى المجلد المطلوب
cd ~/Documents

# استنساخ المشروع
git clone YOUR_REPO_URL rork-app
cd rork-app
```

#### الخطوة 4: تثبيت الاعتماديات
```bash
# تنظيف إذا لزم الأمر
rm -rf node_modules bun.lockb

# تثبيت
bun install
```

#### الخطوة 5: تشغيل التطبيق
```bash
bunx expo start --tunnel
```

---

### الطريقة 2: باستخدام Homebrew (macOS)

```bash
# تثبيت Node.js
brew install node

# تثبيت Bun
brew install bun

# تثبيت Git (إذا لم يكن موجوداً)
brew install git

# ثم اتبع الخطوات 3-5 من الطريقة 1
```

---

## 🚀 التشغيل

### تشغيل بأوضاع مختلفة:

#### 1. التشغيل العادي (شبكة محلية)
```bash
bunx expo start
```
**الاستخدام:** عندما يكون الهاتف والكمبيوتر على نفس الWiFi

---

#### 2. التشغيل مع Tunnel (يعمل في أي شبكة)
```bash
bunx expo start --tunnel
```
**الاستخدام:** عندما يكون الهاتف والكمبيوتر على شبكات مختلفة

---

#### 3. التشغيل مع تنظيف Cache
```bash
bunx expo start --clear
```
**الاستخدام:** عند حدوث مشاكل أو بعد تحديث الكود

---

#### 4. التشغيل للويب فقط
```bash
bunx expo start --web
```
**الاستخدام:** للتطوير على المتصفح فقط

---

### فتح التطبيق:

#### على الهاتف (Android/iOS):
1. افتح تطبيق **Expo Go**
2. **Android:** امسح QR code من Terminal
3. **iOS:** امسح QR code من تطبيق Camera
4. انتظر تحميل التطبيق

#### على الويب:
1. في Terminal، اضغط `w`
2. أو افتح المتصفح على: `http://localhost:8081`

#### على Android Emulator:
1. شغّل Android Studio Emulator
2. في Terminal، اضغط `a`

#### على iOS Simulator (macOS):
1. في Terminal، اضغط `i`

---

## 🔧 استكشاف الأخطاء

### المشكلة: التطبيق لا يبدأ

#### الحل 1: تنظيف شامل
```bash
# حذف جميع الملفات المؤقتة
rm -rf node_modules
rm -f bun.lockb  # أو rm -f package-lock.json
rm -rf .expo

# إعادة التثبيت
bun install

# تشغيل مع تنظيف
bunx expo start --clear
```

---

#### الحل 2: استخدام npm بدلاً من bun
```bash
# حذف الملفات
rm -rf node_modules
rm -f bun.lockb

# تثبيت باستخدام npm
npm install --legacy-peer-deps

# تشغيل
npx expo start --clear
```

---

### المشكلة: خطأ "Module not found"

#### الحل:
```bash
# تأكد من تثبيت جميع الاعتماديات
bun install

# أو
npm install --force
```

---

### المشكلة: لا يمكن الاتصال بالهاتف

#### الحل 1: استخدام Tunnel
```bash
bunx expo start --tunnel
```

#### الحل 2: التحقق من الشبكة
- تأكد أن الهاتف والكمبيوتر على نفس WiFi
- عطّل VPN إن وجد
- عطّل Firewall مؤقتاً

---

### المشكلة: خطأ Metro Bundler

#### الحل:
```bash
# إيقاف جميع عمليات Metro
# Windows PowerShell:
Stop-Process -Name "node" -Force
Stop-Process -Name "bun" -Force

# Linux/macOS:
pkill -f "expo|metro"

# ثم أعد التشغيل
bunx expo start --clear
```

---

### المشكلة: التطبيق بطيء

#### الحل:
```bash
# تنظيف cache الكامل
bunx expo start --clear

# حذف .expo folder
rm -rf .expo

# إعادة التشغيل
bunx expo start
```

---

## 📱 التشغيل على Expo Go

### Android:
1. حمّل [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. افتح التطبيق
3. امسح QR code من Terminal

### iOS:
1. حمّل [Expo Go](https://apps.apple.com/app/expo-go/id982107779)
2. افتح تطبيق Camera
3. وجّه الكاميرا على QR code
4. اضغط على الإشعار الذي يظهر

---

## 🎯 أوامر مفيدة

### أثناء تشغيل Expo:

| المفتاح | الوظيفة |
|---------|---------|
| `a` | فتح على Android emulator |
| `i` | فتح على iOS simulator |
| `w` | فتح على Web browser |
| `r` | إعادة تحميل التطبيق |
| `m` | فتح قائمة Developer |
| `c` | مسح console |
| `j` | فتح Chrome DevTools |
| `?` | عرض جميع الأوامر |

---

## 📚 موارد إضافية

### التوثيق:
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

### دليل استكشاف الأخطاء:
- [`TROUBLESHOOTING_GUIDE.md`](./TROUBLESHOOTING_GUIDE.md) - دليل شامل
- [`FIX_METRO_ERROR.md`](./FIX_METRO_ERROR.md) - حل مشاكل Metro
- [`QUICK_FIX_SUMMARY.md`](./QUICK_FIX_SUMMARY.md) - حلول سريعة

---

## 🆘 الحصول على المساعدة

إذا واجهت مشكلة:

1. **راجع ملفات التوثيق:**
   - [`TROUBLESHOOTING_GUIDE.md`](./TROUBLESHOOTING_GUIDE.md)
   - [`FIX_METRO_ERROR.md`](./FIX_METRO_ERROR.md)

2. **ابحث في Issues:**
   - تحقق من GitHub Issues

3. **أنشئ Issue جديد:**
   - صف المشكلة بالتفصيل
   - أرفق screenshots إن أمكن
   - اذكر نظام التشغيل والإصدارات

---

## ✅ التحقق من نجاح التثبيت

عند تشغيل `bunx expo start --tunnel`، يجب أن ترى:

```
✅ Starting Metro Bundler
✅ Tunnel connected
✅ Metro waiting on exp://xxxxxxx.exp.direct
✅ Web is waiting on http://localhost:8081

› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

وعند فتح التطبيق على الهاتف:
- ✅ شاشة تسجيل الدخول تظهر
- ✅ شعار "مدى" واضح
- ✅ أزرار التفاعل تعمل

---

<div align="center">

**تهانينا! 🎉**

التطبيق الآن يعمل بنجاح!

لمزيد من المعلومات، راجع [`README.md`](./README.md)

</div>

---

**آخر تحديث:** 2025-01-04
**النسخة:** 1.0.0
