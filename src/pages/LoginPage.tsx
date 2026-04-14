import * as React from 'react';
import { Capacitor } from '@capacitor/core';
import { CheckCircle2, Loader2, LockKeyhole, ShieldCheck, Smartphone } from 'lucide-react';
import { startSanadLogin, verifySanadOtp } from '../lib/api';

interface LoginPageProps {
  onSanadComplete: (challengeId: string) => Promise<void>;
  onAdminGoogleLogin: (credential: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  language?: 'ar' | 'en';
}

const nationalIdPattern = /^[0-9]{10}$/;
const googleIdentityScriptId = 'google-identity-services';

function SanadLogo() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center">
      <svg viewBox="0 0 420 160" className="h-auto w-full" role="img" aria-label="Sanad">
        <path
          d="M80 95 C115 75, 155 105, 210 92 C258 80, 302 43, 360 18"
          fill="none"
          stroke="#2fb876"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M332 16 L360 18 L345 48"
          fill="none"
          stroke="#2fb876"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M66 92 C63 86, 62 79, 64 73"
          fill="none"
          stroke="#2fb876"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle cx="96" cy="55" r="6" fill="#2fb876" />
        <circle cx="278" cy="26" r="4.5" fill="#2fb876" />
        <text x="146" y="114" textAnchor="middle" fontSize="48" fontWeight="700" fill="#2fb876" direction="rtl">
          سند
        </text>
        <text x="212" y="144" textAnchor="middle" fontSize="28" fontWeight="500" fill="#2a2a2a">
          SANAD
        </text>
      </svg>
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
  onAdminGoogleLogin,
  isLoading,
  error,
  language = 'ar',
}: LoginPageProps) => {
  const voterAppOnly = Capacitor.isNativePlatform();
  const isArabic = language === 'ar';
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const [mode, setMode] = React.useState<'sanad' | 'admin'>('sanad');
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [formMessage, setFormMessage] = React.useState<string | null>(null);
  const [sanadLoading, setSanadLoading] = React.useState(false);
  const [isGoogleReady, setIsGoogleReady] = React.useState(false);
  const [sanadForm, setSanadForm] = React.useState({
    nationalId: '',
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

  const clearMessages = React.useCallback(() => {
    setLocalError(null);
    setFormMessage(null);
  }, []);

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
      // Parent state already exposes the backend error.
    }
  });

  React.useEffect(() => {
    if (voterAppOnly || !googleClientId || typeof window === 'undefined') {
      return;
    }

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
      if (!cancelled) {
        setIsGoogleReady(true);
      }
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

    if (!existingScript) {
      document.head.appendChild(script);
    }

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
    if (!google?.accounts?.id) {
      return;
    }

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

    try {
      setSanadLoading(true);
      clearMessages();
      const result = await startSanadLogin({ nationalId: sanadForm.nationalId.trim() });
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
        t(
          'تم إرسال رمز التحقق إلى الحساب المرتبط عبر سند.',
          'Verification code sent to your SANAD-linked account.',
        ),
      );
    } catch (sanadError) {
      setLocalError(
        sanadError instanceof Error ? sanadError.message : t('تعذر بدء تسجيل الدخول عبر سند.', 'Unable to start SANAD login.'),
      );
    } finally {
      setSanadLoading(false);
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
      setFormMessage(
        t(
          'تم التحقق من الرمز. أكمل الموافقة للمتابعة.',
          'Code verified. Complete consent to continue.',
        ),
      );
    } catch (sanadError) {
      setLocalError(
        sanadError instanceof Error ? sanadError.message : t('فشل التحقق من رمز سند.', 'SANAD OTP verification failed.'),
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

  return (
    <div
      className={`flex min-h-dvh items-center justify-center bg-[#f5f7f6] px-4 py-8 ${
        voterAppOnly ? 'pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]' : ''
      }`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-2xl rounded-[32px] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-10">
        <SanadLogo />

        {voterAppOnly ? (
          <p className="mt-4 text-center text-sm font-bold text-slate-600">
            {t(
              'تطبيق الناخب - سجّل الدخول عبر سند. إدارة النظام متاحة من الموقع على المتصفح.',
              'Voter app - Sign in via SANAD. Admin management is available on the website.',
            )}
          </p>
        ) : (
          <div className="mt-6 flex justify-center">
            <div className="inline-flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('sanad');
                  clearMessages();
                }}
                className={`min-h-11 touch-manipulation rounded-2xl px-4 py-3 text-sm font-black transition active:opacity-90 sm:px-5 ${
                  mode === 'sanad' ? 'bg-[#238b84] text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                {t('الدخول عبر سند', 'Sign in with SANAD')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('admin');
                  clearMessages();
                }}
                className={`min-h-11 touch-manipulation rounded-2xl px-4 py-3 text-sm font-black transition active:opacity-90 sm:px-5 ${
                  mode === 'admin' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                {t('دخول الأدمن', 'Admin sign in')}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-[28px] bg-[#f8fbfa] p-5 sm:p-7">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-black text-slate-900">
              {voterAppOnly || mode === 'sanad' ? t('تسجيل الدخول الموحد', 'Unified sign in') : t('دخول المسؤول', 'Admin sign in')}
            </h1>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {voterAppOnly || mode === 'sanad'
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

          {!voterAppOnly && mode === 'admin' && (
            <div className="space-y-5">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-end gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <h2 className="text-base font-black text-slate-900">
                      {t('تسجيل دخول الأدمن عبر Google', 'Admin sign in with Google')}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {t(
                        'يتم السماح فقط للحسابات الموجودة في admins. بعد التحقق يصدر النظام JWT بصلاحية admin.',
                        'Only accounts listed in admins are allowed. After verification, the system issues an admin JWT session.',
                      )}
                    </p>
                  </div>
                </div>

                {!googleClientId ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm text-amber-800">
                    {t(
                      'لم يتم ضبط VITE_GOOGLE_CLIENT_ID بعد. أضفه إلى ملف البيئة لتفعيل دخول الأدمن عبر Google.',
                      'VITE_GOOGLE_CLIENT_ID is not configured yet. Add it to your environment file to enable admin Google sign-in.',
                    )}
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-end gap-2 text-sm font-bold text-slate-700">
                        <span>{t('الحساب المفوض', 'Authorized account')}</span>
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

                    <p className="text-right text-xs leading-6 text-slate-500">
                      {t(
                        'إذا لم يكن الإيميل موجوداً في جدول admins داخل الباك إند فسيتم رفض الدخول حتى لو نجح تسجيل Google.',
                        'If the email is not present in the backend admins table, access will be denied even if Google sign-in succeeds.',
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'sanad' && sanadForm.stage === 0 && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-right text-sm font-bold text-slate-700">{t('الرقم الوطني', 'National ID')}</label>
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
          )}

          {mode === 'sanad' && sanadForm.stage === 1 && (
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
                <label className="mb-2 block text-right text-sm font-bold text-slate-700">{t('رمز التحقق', 'Verification code')}</label>
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
          )}

          {mode === 'sanad' && sanadForm.stage === 2 && (
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
          )}
        </div>
      </div>
    </div>
  );
};
