# 📱 VoteSecure — تطبيق الناخبين (Android + iOS)

تطبيق موبايل للناخبين مبني بـ **Expo React Native**، يدعم Android وiOS والويب من نفس الكود المصدري.

---

## 🏗️ معمارية التطبيق

```
mobile/
├── app/
│   ├── _layout.tsx          ← الـ Root Layout (Providers)
│   ├── index.tsx            ← Redirect التلقائي
│   ├── (auth)/
│   │   └── login.tsx        ← تسجيل الدخول عبر سَنَد
│   └── (voter)/
│       ├── _layout.tsx      ← حماية الشاشات بـ Auth Guard
│       ├── home.tsx         ← الصفحة الرئيسية (قائمة الانتخابات)
│       ├── results.tsx      ← نتائج الانتخابات
│       ├── notifications.tsx← الإشعارات
│       ├── profile.tsx      ← الملف الشخصي
│       ├── election/
│       │   └── [id].tsx    ← تفاصيل انتخاب محدد
│       └── vote/
│           └── [id].tsx    ← شاشة التصويت الكاملة
├── components/              ← مكونات واجهة مشتركة
├── constants/               ← الألوان، الـ endpoints، الـ config
├── hooks/                   ← React Hooks مخصصة
├── services/                ← API + Auth + Storage
├── store/                   ← Zustand (إدارة حالة المصادقة)
├── types/                   ← TypeScript type definitions
├── utils/                   ← دوال مساعدة
└── assets/                  ← الأيقونات والـ Splash Screen
```

---

## 🚀 تشغيل التطبيق

### من مجلد `mobile/`:

```bash
# تثبيت الحزم (مرة واحدة)
npm install

# تشغيل على Android (يفتح Expo Go أو محاكي)
npx expo start --android

# تشغيل على iOS
npx expo start --ios

# تشغيل على الويب
npx expo start --web

# تشغيل Expo Dev Tools (اختر المنصة يدويًا)
npx expo start
```

### من المجلد الجذر:

```bash
npm run mobile             # Expo Dev Tools
npm run mobile:android     # تشغيل مباشر على Android
npm run mobile:ios         # تشغيل مباشر على iOS
npm run mobile:web         # تشغيل على الويب
```

---

## 📡 إعداد عنوان الـ API

عدّل ملف `mobile/.env` بحسب بيئتك:

```env
# للمحاكي Android (Android Emulator)
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3215/api

# للمحاكي iOS (iOS Simulator)
EXPO_PUBLIC_API_BASE_URL=https://graduation-project-xcuy.onrender.com//api

# للهاتف الحقيقي على نفس الشبكة
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3215/api
```

> ⚠️ **مهم:** الـ backend يجب أن يكون شغّالاً أولاً:
> ```bash
> npm run start:backend   # من المجلد الجذر
> ```

---

## 📦 بناء APK للأندرويد (للنشر أو التسليم)

### الطريقة 1: Expo Go (للاختبار السريع)
1. حمّل **Expo Go** من Google Play
2. شغّل `npx expo start` من داخل `mobile/`
3. امسح الـ QR Code

### الطريقة 2: بناء APK محلي بـ EAS Build

```bash
# تثبيت EAS CLI (مرة واحدة)
npm install -g eas-cli

# تسجيل الدخول لـ Expo
eas login

# إنشاء ملف إعدادات EAS (مرة واحدة)
eas build:configure

# بناء APK للأندرويد
eas build --platform android --profile preview
```

### الطريقة 3: بناء APK محلي (بدون EAS)

```bash
# تحتاج Java JDK + Android SDK مثبتة
npx expo run:android
```

---

## 🔐 تدفق المصادقة

```
1. الناخب يدخل رقمه الوطني (10 أرقام)
2. Backend يرسل OTP عبر سَنَد / SMS
3. الناخب يدخل OTP (6 أرقام)
4. الناخب يوافق على مشاركة البيانات
5. Backend يُعيد JWT Token
6. Token يُحفظ في expo-secure-store (آمن)
7. التطبيق يحيّد الجلسة عند كل فتح
```

---

## 📱 الشاشات والميزات

| الشاشة | الميزات |
|--------|---------|
| 🔑 تسجيل الدخول | سَنَد + OTP بـ 3 مراحل، RTL كامل |
| 🏠 الرئيسية | انتخابات نشطة + قادمة، Pull-to-Refresh |
| 📋 تفاصيل الانتخاب | معلومات + زر الذهاب للتصويت |
| 🗳️ التصويت | اختيار حزب + قائمة + مرشحين + تأكيد |
| 📊 النتائج | إحصائيات الأحزاب والقوائم والمرشحين |
| 🔔 الإشعارات | إشعارات الانتخابات |
| 👤 الملف الشخصي | بيانات الناخب + تسجيل الخروج |

---

## 🛠️ التقنيات المستخدمة

| التقنية | الغرض | الإصدار |
|---------|-------|---------|
| Expo | منصة React Native + بناء التطبيق | ~54 |
| React Native | واجهة المستخدم | 0.81.5 |
| Expo Router | التوجيه المبني على الملفات | ~6 |
| expo-secure-store | تخزين JWT بأمان | ~15 |
| Zustand | إدارة حالة المصادقة | ^5 |
| TanStack Query | إدارة حالة الخادم | ^5 |
| React Native Paper | مكونات Material Design | ^5 |
| Axios | HTTP Client | ^1 |

---

## ✅ التحقق من الجودة

```bash
# TypeScript typecheck (لا أخطاء)
npm run typecheck

# التأكد من عمل الـ API
curl https://graduation-project-xcuy.onrender.com//api/health
```
