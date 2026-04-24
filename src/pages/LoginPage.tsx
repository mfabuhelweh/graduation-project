import * as React from 'react';
import { Capacitor } from '@capacitor/core';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  UserRound,
  Vote,
  Users,
} from 'lucide-react';
import soutakLogo from '../assets/soutak-logo.png';
import { startSanadLogin, verifySanadOtp } from '../lib/api';
import { SiteFooter } from '../components/layout/SiteFooter';
import { SiteHeader } from '../components/layout/SiteHeader';

interface LoginPageProps {
  onSanadComplete: (challengeId: string) => Promise<void>;
  onAdminPasswordLogin: (email: string, password: string) => Promise<void>;
  onAdminGoogleLogin: (credential: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  language?: 'ar' | 'en';
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  adminOnly?: boolean;
}

type LandingSectionId = 'home' | 'about' | 'features' | 'faq' | 'contact' | 'privacy' | 'terms' | 'help';

const nationalIdPattern = /^[0-9]{10}$/;
const googleIdentityScriptId = 'google-identity-services';

function SanadLogo() {
  return (
    <div className="brand-logo-from-asset mx-auto flex w-full max-w-md flex-col items-center text-center">
      <img src={soutakLogo} alt="Soutak" className="h-40 w-auto object-contain" />
      <h1 className="mt-4 text-4xl font-black text-slate-900">صوتك</h1>
      <p className="mt-1 text-sm font-bold text-blue-600">نظام الاقتراع الإلكتروني</p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4C12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5Z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.7 39.5 16.3 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.6-6 7.3l.1-.1l6.2 5.2C35.2 40.6 44 34 44 24c0-1.2-.1-2.3-.4-3.5Z"
      />
    </svg>
  );
}

export const LoginPage = ({
  onSanadComplete,
  onAdminPasswordLogin,
  onAdminGoogleLogin,
  isLoading,
  error,
  language = 'ar',
  theme = 'light',
  onToggleTheme,
  adminOnly = false,
}: LoginPageProps) => {
  const voterAppOnly = Capacitor.isNativePlatform();
  const isArabic = language === 'ar';
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const scrollToSection = React.useCallback((sectionId: LandingSectionId) => {
    if (typeof document === 'undefined') return;
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const [mode, setMode] = React.useState<'sanad' | 'admin'>(adminOnly ? 'admin' : 'sanad');
  const [showLoginPanel, setShowLoginPanel] = React.useState(voterAppOnly || adminOnly);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [formMessage, setFormMessage] = React.useState<string | null>(null);
  const [sanadLoading, setSanadLoading] = React.useState(false);
  const [isGoogleReady, setIsGoogleReady] = React.useState(false);
  const [adminForm, setAdminForm] = React.useState({
    email: '',
    password: '',
  });

  const [sanadForm, setSanadForm] = React.useState({
    nationalId: '',
    password: '',
    challengeId: '',
    otp: '',
    citizenName: '',
    maskedPhoneNumber: '',
    requestReference: '',
    expiresAt: '',
    sandboxOtp: '',
    consentAccepted: false,
    stage: 0,
  });

  const adminGoogleButtonRef = React.useRef<HTMLDivElement | null>(null);
  const googleInitializedRef = React.useRef(false);

  React.useEffect(() => {
    if (voterAppOnly || adminOnly) setShowLoginPanel(true);
    if (adminOnly) setMode('admin');
  }, [adminOnly, voterAppOnly]);

  const clearMessages = React.useCallback(() => {
    setLocalError(null);
    setFormMessage(null);
  }, []);

  const resetToSanad = React.useCallback(() => {
    setShowLoginPanel(true);
    setMode('sanad');
    clearMessages();
  }, [clearMessages]);

  const hideLoginPanel = React.useCallback(() => {
    setShowLoginPanel(false);
    clearMessages();
  }, [clearMessages]);

  const handleGoogleCredential = React.useEffectEvent(async (response: { credential?: string }) => {
    if (!response.credential) {
      setLocalError(
        t(
          'تعذر استلام بيانات اعتماد Google. حاول مرة أخرى.',
          'Google did not return a valid credential. Please try again.',
        ),
      );
      return;
    }

    clearMessages();

    try {
      await onAdminGoogleLogin(response.credential);
    } catch {
      // parent handles backend error
    }
  });

  React.useEffect(() => {
    if (voterAppOnly || !googleClientId || typeof window === 'undefined') return;

    const existingGoogle = (window as Window & { google?: unknown }).google;
    if (existingGoogle) {
      setIsGoogleReady(true);
      return;
    }

    const existingScript = document.getElementById(googleIdentityScriptId) as HTMLScriptElement | null;
    const script =
      existingScript ||
      Object.assign(document.createElement('script'), {
        id: googleIdentityScriptId,
        src: 'https://accounts.google.com/gsi/client',
        async: true,
        defer: true,
      });

    let cancelled = false;

    const onLoad = () => {
      if (!cancelled) setIsGoogleReady(true);
    };

    const onError = () => {
      if (!cancelled) {
        setLocalError(
          t(
            'تعذر تحميل خدمة Google Sign-In. تحقق من الاتصال ثم أعد المحاولة.',
            'Unable to load Google Sign-In. Check your connection and try again.',
          ),
        );
      }
    };

    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);

    if (!existingScript) document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };
  }, [googleClientId, t, voterAppOnly]);

  React.useEffect(() => {
    if (voterAppOnly || mode !== 'admin' || !isGoogleReady || !googleClientId || !adminGoogleButtonRef.current) {
      return;
    }

    const google = (window as Window & { google?: any }).google;
    if (!google?.accounts?.id) return;

    if (!googleInitializedRef.current) {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: { credential?: string }) => {
          void handleGoogleCredential(response);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin',
      });
      googleInitializedRef.current = true;
    }

    adminGoogleButtonRef.current.innerHTML = '';
    google.accounts.id.renderButton(adminGoogleButtonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      width: 320,
      locale: isArabic ? 'ar' : 'en',
    });

    return () => {
      if (adminGoogleButtonRef.current) {
        adminGoogleButtonRef.current.innerHTML = '';
      }
    };
  }, [googleClientId, handleGoogleCredential, isArabic, isGoogleReady, mode, voterAppOnly]);

  const handleSanadStart = async () => {
    if (!nationalIdPattern.test(sanadForm.nationalId.trim())) {
      setLocalError(t('أدخل رقماً وطنياً صحيحاً مكوّناً من 10 أرقام.', 'Enter a valid 10-digit national ID.'));
      return;
    }

    if (!sanadForm.password.trim()) {
      setLocalError(t('أدخل كلمة السر.', 'Enter your password.'));
      return;
    }

    try {
      setSanadLoading(true);
      clearMessages();

      const result = await startSanadLogin({
        nationalId: sanadForm.nationalId.trim(),
        password: sanadForm.password,
      });

      setSanadForm((current) => ({
        ...current,
        challengeId: result.challengeId,
        citizenName: result.citizenName,
        maskedPhoneNumber: result.maskedPhoneNumber,
        requestReference: result.requestReference,
        expiresAt: result.expiresAt,
        sandboxOtp: result.sandboxOtp || '',
        stage: 1,
      }));

      setFormMessage(
        result.sandboxOtp
          ? t(
              `تم إرسال رمز التحقق إلى الحساب المرتبط عبر سند. رمز الاختبار: ${result.sandboxOtp}`,
              `Verification code sent to your SANAD-linked account. Test code: ${result.sandboxOtp}`,
            )
          : t(
              'تم إرسال رمز التحقق إلى الحساب المرتبط عبر سند.',
              'Verification code sent to your SANAD-linked account.',
            ),
      );
    } catch (sanadError) {
      setLocalError(
        sanadError instanceof Error
          ? sanadError.message
          : t('تعذر بدء تسجيل الدخول عبر سند.', 'Unable to start SANAD login.'),
      );
    } finally {
      setSanadLoading(false);
    }
  };

  const handleAdminPasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = adminForm.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError(t('أدخل بريد الأدمن بشكل صحيح.', 'Enter a valid admin email address.'));
      return;
    }

    if (!adminForm.password.trim()) {
      setLocalError(t('أدخل كلمة سر الأدمن.', 'Enter the admin password.'));
      return;
    }

    clearMessages();
    try {
      await onAdminPasswordLogin(email, adminForm.password);
    } catch {
      // parent handles backend error
    }
  };

  const handleSanadVerifyOtp = async () => {
    if (!sanadForm.challengeId) {
      setLocalError(t('ابدأ تسجيل الدخول الموحد أولاً.', 'Start unified sign in first.'));
      return;
    }

    if (!/^[0-9]{6}$/.test(sanadForm.otp.trim())) {
      setLocalError(t('أدخل رمز تحقق مكوّناً من 6 أرقام.', 'Enter a 6-digit verification code.'));
      return;
    }

    try {
      setSanadLoading(true);
      clearMessages();

      const result = await verifySanadOtp({
        challengeId: sanadForm.challengeId,
        otp: sanadForm.otp.trim(),
      });

      setSanadForm((current) => ({
        ...current,
        citizenName: result.citizenName,
        maskedPhoneNumber: result.maskedPhoneNumber,
        requestReference: result.requestReference,
        expiresAt: result.expiresAt,
        stage: 2,
      }));

      setFormMessage(t('تم التحقق من الرمز. أكمل الموافقة للمتابعة.', 'Code verified. Complete consent to continue.'));
    } catch (sanadError) {
      setLocalError(
        sanadError instanceof Error
          ? sanadError.message
          : t('فشل التحقق من رمز سند.', 'SANAD OTP verification failed.'),
      );
    } finally {
      setSanadLoading(false);
    }
  };

  const handleSanadComplete = async () => {
    if (!sanadForm.challengeId) {
      setLocalError(t('جلسة سند غير مكتملة.', 'SANAD session is incomplete.'));
      return;
    }

    if (!sanadForm.consentAccepted) {
      setLocalError(
        t(
          'يجب الموافقة على مشاركة بيانات الهوية لإكمال الدخول.',
          'You must accept identity data sharing to continue.',
        ),
      );
      return;
    }

    clearMessages();
    await onSanadComplete(sanadForm.challengeId);
  };

  const services = [
    {
      title: t('التسجيل الموحد', 'Unified registration'),
      description: t('سجل دخولك باستخدام الرقم الوطني وكلمة السر.', 'Sign in using your national ID and password.'),
      icon: UserRound,
    },
    {
      title: t('التحقق من الهوية', 'Identity verification'),
      description: t('تحقق من هويتك بأعلى معايير الأمان.', 'Verify your identity with strong security.'),
      icon: FileCheck2,
    },
    {
      title: t('الاقتراع الإلكتروني', 'Electronic voting'),
      description: t('صوّت بكل مباشرة وسهولة.', 'Cast your vote quickly and directly.'),
      icon: Vote,
    },
    {
      title: t('متابعة النتائج', 'Results tracking'),
      description: t('تابع النتائج النهائية لحظة بلحظة.', 'Follow the final results in real time.'),
      icon: BarChart3,
    },
    {
      title: t('الإشعارات', 'Notifications'),
      description: t('احصل على تنبيهات وتحديثات مهمة.', 'Receive important alerts and updates.'),
      icon: Clock3,
    },
    {
      title: t('إعدادات الحساب', 'Account settings'),
      description: t('إدارة حسابك وتفضيلاتك.', 'Manage your account and preferences.'),
      icon: Settings,
    },
  ];

  const stats = [
    { value: '1.2M', label: t('إجمالي الناخبين', 'Total voters'), icon: Users, tone: 'text-blue-600 bg-blue-50' },
    {
      value: '87.3%',
      label: t('نسبة المشاركة المتوقعة', 'Expected turnout'),
      icon: BarChart3,
      tone: 'text-emerald-600 bg-emerald-50',
    },
    {
      value: '100%',
      label: t('أمان وتشفير متقدم', 'Advanced security'),
      icon: Shield,
      tone: 'text-violet-600 bg-violet-50',
    },
    { value: '24/7', label: t('متاح على مدار الساعة', 'Available 24/7'), icon: Clock3, tone: 'text-amber-700 bg-amber-50' },
  ];

  const highlights = [
    {
      title: t('متاح دائماً', 'Always available'),
      description: t('خدمة متاحة 24/7 من أي مكان.', 'Available 24/7 from anywhere.'),
      icon: Clock3,
    },
    {
      title: t('موثوق ومعتمد', 'Trusted and approved'),
      description: t('نظام رسمي ومعتمد من الجهات المختصة.', 'Official system approved by the competent authorities.'),
      icon: ShieldCheck,
    },
    {
      title: t('سريع وسهل', 'Fast and simple'),
      description: t('عملية تصويت مبسطة لا تستغرق دقائق.', 'A simplified voting flow that takes only minutes.'),
      icon: Vote,
    },
    {
      title: t('أعلى مستويات الأمان', 'Highest security'),
      description: t('تشفير متقدم وحماية كاملة لبياناتك.', 'Advanced encryption and full data protection.'),
      icon: LockKeyhole,
    },
  ];

  const headerNavItems = [
    { key: 'home', label: t('الرئيسية', 'Home'), onClick: () => scrollToSection('home') },
    { key: 'about', label: t('عن المشروع', 'About'), onClick: () => scrollToSection('about') },
    { key: 'features', label: t('المميزات', 'Features'), onClick: () => scrollToSection('features') },
    { key: 'faq', label: t('الأسئلة الشائعة', 'FAQ'), onClick: () => scrollToSection('faq') },
    { key: 'contact', label: t('تواصل معنا', 'Contact us'), onClick: () => scrollToSection('contact') },
  ];

  const footerLinks = [
    { key: 'privacy', label: t('سياسة الخصوصية', 'Privacy policy'), onClick: () => scrollToSection('privacy') },
    { key: 'terms', label: t('الشروط والأحكام', 'Terms & conditions'), onClick: () => scrollToSection('terms') },
    { key: 'help', label: t('مركز المساعدة', 'Help center'), onClick: () => scrollToSection('help') },
  ];

  const faqItems = [
    {
      question: t('كيف يتم التحقق من هوية الناخب؟', 'How is voter identity verified?'),
      answer: t(
        'يتم التحقق عبر تسجيل الدخول الموحد وربط الهوية الرقمية قبل السماح بالوصول إلى عملية الاقتراع.',
        'Identity is verified through unified sign-in and a digital identity check before voting is allowed.',
      ),
    },
    {
      question: t('هل أستطيع التصويت من الهاتف؟', 'Can I vote from my phone?'),
      answer: t(
        'نعم، تم تصميم التجربة لتعمل بسلاسة على الهاتف والمتصفح مع واجهات واضحة ومناسبة للشاشات الصغيرة.',
        'Yes. The experience is designed to work smoothly on both phones and browsers with mobile-friendly screens.',
      ),
    },
    {
      question: t('متى تظهر النتائج؟', 'When do results appear?'),
      answer: t(
        'تظهر النتائج النهائية بعد انتهاء التصويت واعتمادها، مع إمكانية متابعة المستجدات والإشعارات من داخل النظام.',
        'Final results appear after voting closes and are approved, with updates and notifications available in the system.',
      ),
    },
  ];

  const renderAdminSection = () => {
    if (voterAppOnly || mode !== 'admin') return null;

    return (
      <div className="space-y-5">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-end gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div className="text-right">
              <h2 className="text-base font-black text-slate-900">
                {t('تسجيل دخول الأدمن', 'Admin sign in')}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {t(
                  'هذا الرابط مخصص لمسؤولي النظام فقط. استخدم البريد وكلمة السر أو حساب Google مفوض.',
                  'This route is only for system administrators. Use email and password or an authorized Google account.',
                )}
              </p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleAdminPasswordSubmit}>
            <div>
              <label className="mb-2 block text-right text-sm font-bold text-slate-700">
                {t('البريد الإلكتروني', 'Email address')}
              </label>
              <input
                type="email"
                value={adminForm.email}
                onChange={(event) => {
                  setAdminForm((current) => ({ ...current, email: event.target.value }));
                  clearMessages();
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left text-base text-slate-900 outline-none transition focus:border-slate-900"
                dir="ltr"
                autoComplete="email"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-right text-sm font-bold text-slate-700">
                {t('كلمة السر', 'Password')}
              </label>
              <input
                type="password"
                value={adminForm.password}
                onChange={(event) => {
                  setAdminForm((current) => ({ ...current, password: event.target.value }));
                  clearMessages();
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-right text-base text-slate-900 outline-none transition focus:border-slate-900"
                dir={isArabic ? 'rtl' : 'ltr'}
                autoComplete="current-password"
                placeholder={t('أدخل كلمة السر', 'Enter password')}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex min-h-12 w-full touch-manipulation items-center justify-center gap-3 rounded-2xl bg-slate-900 px-5 py-4 text-base font-black text-white transition hover:bg-slate-800 active:opacity-90 disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}
              <span>{t('دخول الأدمن', 'Sign in as admin')}</span>
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs font-black text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            <span>{t('أو', 'OR')}</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {!googleClientId ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm text-amber-800">
              {t(
                'لم يتم ضبط VITE_GOOGLE_CLIENT_ID بعد. أضفه إلى ملف البيئة لتفعيل دخول الأدمن عبر Google.',
                'VITE_GOOGLE_CLIENT_ID is not configured yet. Add it to your environment file to enable admin Google sign-in.',
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-end gap-2 text-sm font-bold text-slate-700">
                <span>{t('الدخول عبر Google', 'Continue with Google')}</span>
                <GoogleMark />
              </div>

              <div className="relative">
                <div
                  ref={adminGoogleButtonRef}
                  className={`mx-auto flex min-h-11 max-w-[320px] items-center justify-center ${
                    isLoading ? 'pointer-events-none opacity-50' : ''
                  }`}
                />

                {!isGoogleReady && (
                  <div className="flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('جارٍ تحميل Google Sign-In...', 'Loading Google Sign-In...')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSanadSection = () => {
    if (mode !== 'sanad') return null;

    if (sanadForm.stage === 0) {
      return (
        <div className="space-y-5">
          {!voterAppOnly && (
            <button
              type="button"
              onClick={hideLoginPanel}
              className="inline-flex items-center gap-2 text-sm font-black text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('العودة إلى الصفحة الرئيسية', 'Back to home page')}</span>
            </button>
          )}

          <div>
            <label className="mb-2 block text-right text-sm font-bold text-slate-700">
              {t('الرقم الوطني', 'National ID')}
            </label>
            <input
              type="text"
              maxLength={10}
              value={sanadForm.nationalId}
              onChange={(event) => {
                setSanadForm((current) => ({
                  ...current,
                  nationalId: event.target.value.replace(/\D/g, ''),
                }));
                clearMessages();
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center text-lg tracking-[0.2em] text-slate-900 outline-none transition focus:border-[#238b84]"
              dir="ltr"
              placeholder="0000000000"
            />
          </div>

          <div>
            <label className="mb-2 block text-right text-sm font-bold text-slate-700">
              {t('كلمة السر', 'Password')}
            </label>
            <input
              type="password"
              value={sanadForm.password}
              onChange={(event) => {
                setSanadForm((current) => ({
                  ...current,
                  password: event.target.value,
                }));
                clearMessages();
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-right text-base text-slate-900 outline-none transition focus:border-[#238b84]"
              dir={isArabic ? 'rtl' : 'ltr'}
              placeholder={t('أدخل كلمة السر', 'Enter your password')}
            />
          </div>

          <button
            type="button"
            onClick={handleSanadStart}
            disabled={sanadLoading}
            className="flex min-h-12 w-full touch-manipulation items-center justify-center gap-3 rounded-2xl bg-[#238b84] px-5 py-4 text-base font-black text-white transition hover:bg-[#1f7c76] active:opacity-90 disabled:opacity-60"
          >
            {sanadLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Smartphone className="h-5 w-5" />}
            <span>{t('الدخول الموحد', 'Unified sign in')}</span>
          </button>
        </div>
      );
    }

    if (sanadForm.stage === 1) {
      return (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-right">
            <p className="font-bold text-slate-900">{sanadForm.citizenName}</p>
            <p className="mt-1 text-sm text-slate-600">
              {t('الهاتف المرتبط:', 'Linked phone:')} {sanadForm.maskedPhoneNumber}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {t('مرجع الطلب:', 'Request reference:')} {sanadForm.requestReference}
            </p>
            {sanadForm.sandboxOtp && (
              <p className="mt-2 text-xs font-bold text-[#238b84]">
                {t('رمز الاختبار:', 'Test code:')} {sanadForm.sandboxOtp}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-right text-sm font-bold text-slate-700">
              {t('رمز التحقق', 'Verification code')}
            </label>
            <input
              type="text"
              maxLength={6}
              value={sanadForm.otp}
              onChange={(event) => {
                setSanadForm((current) => ({
                  ...current,
                  otp: event.target.value.replace(/\D/g, ''),
                }));
                clearMessages();
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center text-lg tracking-[0.45em] text-slate-900 outline-none transition focus:border-[#238b84]"
              dir="ltr"
              placeholder="000000"
            />
          </div>

          <button
            type="button"
            onClick={handleSanadVerifyOtp}
            disabled={sanadLoading}
            className="flex min-h-12 w-full touch-manipulation items-center justify-center gap-3 rounded-2xl bg-[#238b84] px-5 py-4 text-base font-black text-white transition hover:bg-[#1f7c76] active:opacity-90 disabled:opacity-60"
          >
            {sanadLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Smartphone className="h-5 w-5" />}
            <span>{t('متابعة عبر سند', 'Continue with SANAD')}</span>
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-right">
          <h2 className="text-base font-black text-slate-900">
            {t('الموافقة على مشاركة بيانات الهوية', 'Consent to share identity data')}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {t(
              'سيقوم النظام بالاستفادة من بيانات الهوية الأساسية الواردة من سند لإكمال الدخول والتحقق من المستخدم.',
              'The system uses core identity data from SANAD to complete sign in and verification.',
            )}
          </p>
          <div className="mt-4 flex items-center justify-end gap-2 text-sm font-bold text-[#238b84]">
            <span>{t('تم التحقق من الرمز بنجاح', 'Code verified successfully')}</span>
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <label className="flex min-h-12 cursor-pointer touch-manipulation items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50">
          <input
            type="checkbox"
            checked={sanadForm.consentAccepted}
            onChange={(event) => {
              setSanadForm((current) => ({
                ...current,
                consentAccepted: event.target.checked,
              }));
              clearMessages();
            }}
            className="mt-1 h-5 w-5 shrink-0 accent-[#238b84]"
          />
          <span className="text-right text-sm leading-7 text-slate-700">
            {t(
              'أوافق على مشاركة بيانات الهوية الرقمية اللازمة مع النظام من أجل إتمام تسجيل الدخول فقط.',
              'I agree to share the required digital identity data only to complete sign in.',
            )}
          </span>
        </label>

        <button
          type="button"
          onClick={handleSanadComplete}
          disabled={isLoading}
          className="flex min-h-12 w-full touch-manipulation items-center justify-center gap-3 rounded-2xl bg-[#238b84] px-5 py-4 text-base font-black text-white transition hover:bg-[#1f7c76] active:opacity-90 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}
          <span>{t('إكمال الدخول الموحد', 'Complete unified sign in')}</span>
        </button>
      </div>
    );
  };

  const loginPanel = (
    <div className="app-panel login-card mx-auto w-full max-w-md rounded-[28px] px-6 py-8 sm:px-8">
      {!voterAppOnly && !adminOnly && (
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={hideLoginPanel}
            className="inline-flex items-center gap-2 text-sm font-black text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('العودة إلى الصفحة الرئيسية', 'Back to home page')}</span>
          </button>

          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{t('تسجيل الدخول', 'Sign in')}</p>
            <h3 className="text-lg font-black text-slate-900">{t('من نفس هذا القسم', 'Inside this same section')}</h3>
          </div>
        </div>
      )}

      <SanadLogo />

      {adminOnly ? (
        <p className="mt-4 text-center text-sm font-bold text-slate-600">
          {t('بوابة إدارة النظام', 'System administration portal')}
        </p>
      ) : voterAppOnly ? (
        <p className="mt-4 text-center text-sm font-bold text-slate-600">
          {t(
            'تطبيق الناخب - سجّل الدخول عبر سند. إدارة النظام متاحة من الموقع على المتصفح.',
            'Voter app - Sign in via SANAD. Admin management is available on the website.',
          )}
        </p>
      ) : null}

      <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black text-slate-900">
            {voterAppOnly || mode === 'sanad'
              ? t('تسجيل الدخول الموحد', 'Unified sign in')
              : t('دخول الأدمن', 'Admin sign in')}
          </h1>

          <p className="mt-2 text-sm leading-7 text-slate-500">
            {adminOnly
              ? t(
                  'أدخل بيانات الأدمن للوصول إلى لوحة التحكم، أو استخدم حساب Google مفوض.',
                  'Enter admin credentials to access the dashboard, or use an authorized Google account.',
                )
              : voterAppOnly || mode === 'sanad'
                ? t(
                    'الدخول إلى النظام يتم افتراضياً عبر سند للتحقق من الهوية بشكل آمن ومباشر.',
                    'By default, sign in is done using SANAD for secure identity verification.',
                )
              : t(
                  'هذا المدخل مخصص فقط لمسؤولي النظام عبر حساب Google مفوض وموجود مسبقاً في جدول admins.',
                  'This entry is for system administrators using an approved Google account already registered in the admins table.',
                )}
          </p>
        </div>

        {(error || localError || formMessage) && (
          <div
            className={`mb-5 rounded-2xl border px-4 py-3 text-right text-sm ${
              formMessage ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'
            }`}
          >
            {formMessage || localError || error}
          </div>
        )}

        {renderAdminSection()}
        {renderSanadSection()}
      </div>
    </div>
  );

  return (
    <div
      className={`login-shell flex min-h-dvh items-center justify-center px-4 py-8 ${
        voterAppOnly ? 'pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]' : ''
      }`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="w-full">
        {!voterAppOnly && !adminOnly ? (
          <div className="mx-auto flex min-h-dvh max-w-7xl flex-col">
            <SiteHeader
              language={language}
              theme={theme}
              onToggleTheme={onToggleTheme}
              onUserActionClick={resetToSanad}
              navItems={headerNavItems}
            />

            <section
              id="home"
              className="mx-auto mt-6 grid w-full max-w-7xl scroll-mt-32 gap-6 px-4 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {stats.map(({ value, label, icon: Icon, tone }) => (
                  <div key={label} className="app-panel rounded-[28px] p-5 text-right">
                    <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-3xl font-black text-slate-900">{value}</div>
                    <p className="mt-2 text-sm font-bold text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              <div className="app-panel relative overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 lg:px-10">
                <div className="absolute inset-y-0 left-0 hidden w-2/5 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_62%)] lg:block" />

                <div
                  className={`relative grid items-center gap-8 ${
                    showLoginPanel ? 'lg:grid-cols-[minmax(0,1fr)_420px]' : 'lg:grid-cols-[minmax(0,1fr)_320px]'
                  }`}
                >
                  <div className="text-right">
                    <div className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700">
                      {t('النظام الرسمي للانتخابات في الأردن', 'Jordan official election system')}
                    </div>

                    <h2 className="mt-5 text-4xl font-black leading-tight text-blue-900 sm:text-5xl">
                      {t('صوتك يصل بأمان', 'Your voice arrives safely')}
                    </h2>

                    <p className="mt-3 text-2xl font-bold text-slate-700">
                      {t('اقترع رقمياً بثقة كاملة', 'Vote digitally with full confidence')}
                    </p>

                    <p className="mt-5 max-w-2xl text-base leading-8 text-slate-500">
                      {t(
                        'منصة آمنة وموثوقة تتيح لك التصويت في الانتخابات الأردنية بسهولة وانسيابية مع نظام تحقق رقمي يحافظ على نزاهة العملية الانتخابية.',
                        'A secure and trusted platform that lets you vote in Jordanian elections with a smooth flow and reliable digital identity checks.',
                      )}
                    </p>

                    <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={resetToSanad}
                        className="inline-flex min-h-12 items-center gap-3 rounded-2xl bg-blue-600 px-6 py-3 text-base font-black text-white hover:bg-blue-700"
                      >
                        <ArrowLeft className="h-5 w-5" />
                        <span>{t('الدخول إلى النظام', 'Enter the system')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => scrollToSection('about')}
                        className="inline-flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-base font-black text-slate-700 hover:bg-slate-50"
                      >
                        <UserRound className="h-5 w-5" />
                        <span>{t('تعرف على المزيد', 'Learn more')}</span>
                      </button>
                    </div>
                  </div>

                  {showLoginPanel ? (
                    <div className="relative mx-auto w-full max-w-md">{loginPanel}</div>
                  ) : (
                    <div className="relative mx-auto">
                      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.2),transparent_60%)] blur-2xl" />
                      <div className="relative flex h-72 w-72 items-center justify-center rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.95),rgba(219,234,254,0.7),rgba(191,219,254,0.25))]">
                        <img
                          src={soutakLogo}
                          alt=""
                          className="h-60 w-60 object-contain drop-shadow-[0_12px_30px_rgba(37,99,235,0.25)]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section id="about" className="mx-auto mt-6 w-full max-w-7xl scroll-mt-32 px-4 sm:px-6 lg:px-8">
              <div className="app-panel rounded-[28px] px-5 py-6 sm:px-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <button type="button" onClick={() => scrollToSection('help')} className="text-sm font-black text-blue-700">
                    {t('عرض جميع الخدمات', 'View all services')}
                  </button>
                  <h3 className="text-2xl font-black text-slate-900">{t('خدمات النظام', 'System services')}</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                  {services.map(({ title, description, icon: Icon }) => (
                    <div key={title} className="rounded-[24px] border border-slate-200 bg-white p-5 text-right shadow-sm">
                      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-blue-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h4 className="text-base font-black text-slate-900">{title}</h4>
                      <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="features" className="mx-auto mt-6 w-full max-w-7xl scroll-mt-32 px-4 sm:px-6 lg:px-8">
              <div className="app-panel rounded-[28px] px-5 py-6 sm:px-6">
                <h3 className="text-center text-2xl font-black text-slate-900">
                  {t('لماذا صوتك الأردن؟', 'Why Soutak Jordan?')}
                </h3>

                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {highlights.map(({ title, description, icon: Icon }) => (
                    <div key={title} className="flex items-start justify-end gap-3 text-right">
                      <div>
                        <h4 className="text-base font-black text-slate-900">{title}</h4>
                        <p className="mt-1 text-sm leading-7 text-slate-500">{description}</p>
                      </div>
                      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-blue-600">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="faq" className="mx-auto mt-6 w-full max-w-7xl scroll-mt-32 px-4 sm:px-6 lg:px-8">
              <div className="app-panel rounded-[28px] px-5 py-6 sm:px-6">
                <div className="mb-6 text-right">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">{t('دعم المستخدمين', 'User support')}</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">{t('الأسئلة الشائعة', 'Frequently asked questions')}</h3>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  {faqItems.map(({ question, answer }) => (
                    <article key={question} className="rounded-[24px] border border-slate-200 bg-white p-5 text-right shadow-sm">
                      <h4 className="text-base font-black text-slate-900">{question}</h4>
                      <p className="mt-3 text-sm leading-7 text-slate-500">{answer}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section id="contact" className="mx-auto mt-6 w-full max-w-7xl scroll-mt-32 px-4 sm:px-6 lg:px-8">
              <div className="app-panel grid rounded-[28px] px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-6">
                <div className="text-right">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">{t('تواصل مباشر', 'Direct contact')}</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">{t('تواصل معنا', 'Contact us')}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {t(
                      'يمكنك الوصول إلى فريق الدعم والاستفسارات العامة من خلال القنوات الرسمية التالية، وسيتم التعامل مع الطلبات بحسب نوعها وأولويتها.',
                      'You can reach the support and general inquiries team through the following official channels, and requests will be handled based on type and priority.',
                    )}
                  </p>
                </div>

                <div className="mt-5 grid gap-4 lg:mt-0">
                  <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-right shadow-sm">
                    <p className="text-sm font-black text-slate-900">{t('البريد الإلكتروني', 'Email')}</p>
                    <p className="mt-2 text-sm text-slate-500">support@soutak.jo</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-right shadow-sm">
                    <p className="text-sm font-black text-slate-900">{t('الهاتف', 'Phone')}</p>
                    <p className="mt-2 text-sm text-slate-500">+962 6 500 0000</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-right shadow-sm">
                    <p className="text-sm font-black text-slate-900">{t('ساعات العمل', 'Working hours')}</p>
                    <p className="mt-2 text-sm text-slate-500">{t('الأحد - الخميس | 9:00 ص - 5:00 م', 'Sunday - Thursday | 9:00 AM - 5:00 PM')}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mx-auto mt-6 grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
              <article id="privacy" className="app-panel scroll-mt-32 rounded-[28px] px-5 py-6 text-right sm:px-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">{t('معلومة قانونية', 'Legal note')}</p>
                <h3 className="mt-2 text-xl font-black text-slate-900">{t('سياسة الخصوصية', 'Privacy policy')}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  {t(
                    'يتم استخدام بيانات الهوية والتحقق فقط لتنفيذ عملية الدخول والتصويت ومتابعة النتائج، مع الالتزام بحماية البيانات وعدم مشاركتها خارج نطاق الخدمة.',
                    'Identity and verification data are used only to enable sign-in, voting, and results tracking, with data protection obligations and no sharing beyond service scope.',
                  )}
                </p>
              </article>

              <article id="terms" className="app-panel scroll-mt-32 rounded-[28px] px-5 py-6 text-right sm:px-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">{t('معلومة قانونية', 'Legal note')}</p>
                <h3 className="mt-2 text-xl font-black text-slate-900">{t('الشروط والأحكام', 'Terms and conditions')}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  {t(
                    'استخدام المنصة يعني الالتزام بإدخال بيانات صحيحة، والمحافظة على سرية وسائل التحقق، وعدم إساءة استخدام النظام أو محاولة التأثير على نزاهة العملية الانتخابية.',
                    'Using the platform means providing accurate data, protecting verification methods, and avoiding any misuse or attempts to affect election integrity.',
                  )}
                </p>
              </article>

              <article id="help" className="app-panel scroll-mt-32 rounded-[28px] px-5 py-6 text-right sm:px-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">{t('دليل سريع', 'Quick guide')}</p>
                <h3 className="mt-2 text-xl font-black text-slate-900">{t('مركز المساعدة', 'Help center')}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  {t(
                    'للبدء بسرعة: ادخل رقمك الوطني، أكمل التحقق، وافق على مشاركة بيانات الهوية، ثم تابع إلى شاشة الاقتراع أو النتائج بحسب صلاحيتك.',
                    'To get started quickly: enter your national ID, complete verification, accept identity sharing, then continue to voting or results based on your access.',
                  )}
                </p>
              </article>
            </section>

            <SiteFooter language={language} links={footerLinks} />
          </div>
        ) : (
          loginPanel
        )}
      </div>
    </div>
  );
};
