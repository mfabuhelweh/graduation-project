# VoteSecure Graduation Project

نظام تصويت إلكتروني لمشروع تخرج، مبني بشكل ممتد لا استبدالي:

- PostgreSQL + Express backend
- Web admin panel الحالي كما هو
- Expo / React Native voter app داخل `mobile/`

## Current Architecture

```text
root
├─ backend/           # backend API + PostgreSQL integration
├─ database/          # schema and seed files
├─ src/               # existing React/Vite web admin panel
└─ mobile/            # new Expo voter-only mobile app
```

## What Stays Unchanged

- قاعدة البيانات PostgreSQL
- الـ backend الحالي
- لوحة الإدارة على الويب
- الـ business rules الأساسية للتصويت

## What Was Added

- تطبيق Expo منفصل للناخبين فقط داخل `mobile/`
- استهلاك نفس الـ APIs الحالية
- دعم عربي وRTL
- تخزين جلسة آمن للموبايل
- شاشات:
  - تسجيل الدخول
  - الرئيسية
  - تفاصيل الانتخاب
  - التصويت
  - النتائج
  - الإشعارات
  - الملف الشخصي

## Backend Compatibility Additions

تمت إضافة تغييرات صغيرة ومعزولة فقط لتسهيل دعم الموبايل:

- `GET /api/voters/me`
- `GET /api/notifications`

هذه الإضافات لا تغيّر المعمارية الحالية ولا تكسر لوحة الإدارة.

## Local Development

### 1. Backend

من جذر المشروع:

```bash
npm install
npm run start:backend
```

المنفذ الحالي من ملف البيئة:

- Backend: `http://localhost:3215`
- Health check: `http://localhost:3215/api/health`

### 2. Web Admin

من جذر المشروع:

```bash
npm run dev
```

### 3. Mobile App

من مجلد `mobile/`:

```bash
npm install
npm run start
```

## Mobile Environment

تم ضبط مثال الشبكة المحلية الحالية على:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.131.115:3215/api
```

ملاحظات مهمة:

- Android emulator: استخدم غالبًا `http://10.0.2.2:3215/api`
- iOS simulator: استخدم `http://localhost:3215/api`
- الهاتف الحقيقي على نفس الشبكة: استخدم عنوان الـ Wi-Fi المحلي أعلاه

## Verification Done

- `backend`: نجح `npm run build:backend`
- `mobile`: نجح `npm run typecheck`
- Expo Web: تم تشغيله محليًا بنجاح مع استجابة `HTTP 200` على `http://localhost:8089`
- backend health: عاد `success: true` من `/api/health`

## Important Notes

- المصادقة الحالية للموبايل تعتمد على JWT من الـ backend، وليس على Firebase-first flow.
- Firebase بقي موجودًا لأجزاء legacy في المشروع، لكن تطبيق الموبايل الجديد لا يفرض إعادة تصميم المصادقة.
- التصويت يحافظ على flow الحالي الذي يتطلب `verify-face` قبل إرسال الصوت النهائي.

## Useful Files

- Mobile setup guide: [mobile/MOBILE_SETUP.md](/C:/Users/MOHAMMED/Graduation-project/ggggggg/gggggg/mobile/MOBILE_SETUP.md)
- Mobile env example: [mobile/.env.example](/C:/Users/MOHAMMED/Graduation-project/ggggggg/gggggg/mobile/.env.example)
- Root mobile env example: [.env.mobile.example](/C:/Users/MOHAMMED/Graduation-project/ggggggg/gggggg/.env.mobile.example)
