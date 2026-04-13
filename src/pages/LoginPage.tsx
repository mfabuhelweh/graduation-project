import * as React from 'react';
import { Capacitor } from '@capacitor/core';
import { CheckCircle2, Loader2, LockKeyhole, ShieldCheck, Smartphone } from 'lucide-react';
import { startSanadLogin, verifySanadOtp } from '../lib/api';

interface LoginPageProps {
  onSanadComplete: (challengeId: string) => Promise<void>;
  onAdminLogin: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const nationalIdPattern = /^[0-9]{10}$/;

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

export const LoginPage = ({ onSanadComplete, onAdminLogin, isLoading, error }: LoginPageProps) => {
  const voterAppOnly = Capacitor.isNativePlatform();
  const [mode, setMode] = React.useState<'sanad' | 'admin'>('sanad');
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [formMessage, setFormMessage] = React.useState<string | null>(null);
  const [sanadLoading, setSanadLoading] = React.useState(false);
  const [adminForm, setAdminForm] = React.useState({
    email: '',
    password: '',
  });
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

  const clearMessages = () => {
    setLocalError(null);
    setFormMessage(null);
  };

  const handleSanadStart = async () => {
    if (!nationalIdPattern.test(sanadForm.nationalId.trim())) {
      setLocalError('أدخل رقمًا وطنيًا صحيحًا مكوّنًا من 10 أرقام.');
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
      setFormMessage('تم إرسال رمز التحقق إلى حساب سند المرتبط بالمستخدم.');
    } catch (sanadError) {
      setLocalError(sanadError instanceof Error ? sanadError.message : 'تعذر بدء تسجيل الدخول عبر سند.');
    } finally {
      setSanadLoading(false);
    }
  };

  const handleSanadVerifyOtp = async () => {
    if (!sanadForm.challengeId) {
      setLocalError('ابدأ تسجيل الدخول الموحد أولًا.');
      return;
    }

    if (!/^[0-9]{6}$/.test(sanadForm.otp.trim())) {
      setLocalError('أدخل رمز تحقق مكوّنًا من 6 أرقام.');
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
      setFormMessage('تم التحقق من الرمز. أكمل الموافقة للمتابعة.');
    } catch (sanadError) {
      setLocalError(sanadError instanceof Error ? sanadError.message : 'فشل التحقق من رمز سند.');
    } finally {
      setSanadLoading(false);
    }
  };

  const handleSanadComplete = async () => {
    if (!sanadForm.challengeId) {
      setLocalError('جلسة سند غير مكتملة.');
      return;
    }

    if (!sanadForm.consentAccepted) {
      setLocalError('يجب الموافقة على مشاركة بيانات الهوية لإكمال الدخول.');
      return;
    }

    clearMessages();
    await onSanadComplete(sanadForm.challengeId);
  };

  const handleAdminSubmit = async () => {
    if (!adminForm.email.trim() || !adminForm.password) {
      setLocalError('أدخل البريد الإلكتروني وكلمة المرور الخاصة بالأدمن.');
      return;
    }

    clearMessages();
    await onAdminLogin(adminForm.email.trim(), adminForm.password);
  };

  return (
    <div
      className={`flex min-h-dvh items-center justify-center bg-[#f5f7f6] px-4 py-8 ${
        voterAppOnly ? 'pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]' : ''
      }`}
      dir="rtl"
    >
      <div className="w-full max-w-2xl rounded-[32px] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-10">
        <SanadLogo />

        {voterAppOnly ? (
          <p className="mt-4 text-center text-sm font-bold text-slate-600">
            تطبيق الناخب — سجّل الدخول عبر سند. إدارة النظام من الموقع على المتصفح.
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
                الدخول عبر سند
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
                دخول الأدمن
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-[28px] bg-[#f8fbfa] p-5 sm:p-7">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-black text-slate-900">
              {voterAppOnly || mode === 'sanad' ? 'تسجيل الدخول الموحد' : 'دخول المسؤول'}
            </h1>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {voterAppOnly || mode === 'sanad'
                ? 'الدخول إلى النظام يتم افتراضيًا عبر سند للتحقق من الهوية بشكل آمن ومباشر.'
                : 'هذا المدخل مخصص فقط لمسؤولي النظام باستخدام البريد الإلكتروني وكلمة المرور.'}
            </p>
          </div>

          {(error || localError || formMessage) && (
            <div
              className={`mb-5 rounded-2xl border px-4 py-3 text-right text-sm ${
                formMessage
                  ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                  : 'border-rose-100 bg-rose-50 text-rose-700'
              }`}
            >
              {formMessage || localError || error}
            </div>
          )}

          {!voterAppOnly && mode === 'admin' && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-right text-sm font-bold text-slate-700">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(event) => {
                    setAdminForm((current) => ({ ...current, email: event.target.value }));
                    clearMessages();
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left text-base text-slate-900 outline-none transition focus:border-slate-900"
                  dir="ltr"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-right text-sm font-bold text-slate-700">كلمة المرور</label>
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(event) => {
                    setAdminForm((current) => ({ ...current, password: event.target.value }));
                    clearMessages();
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left text-base text-slate-900 outline-none transition focus:border-slate-900"
                  dir="ltr"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="button"
                onClick={handleAdminSubmit}
                disabled={isLoading}
                className="flex min-h-12 w-full touch-manipulation items-center justify-center gap-3 rounded-2xl bg-slate-900 px-5 py-4 text-base font-black text-white transition hover:bg-slate-800 active:opacity-90 disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                <span>دخول الأدمن</span>
              </button>
            </div>
          )}

          {mode === 'sanad' && sanadForm.stage === 0 && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-right text-sm font-bold text-slate-700">الرقم الوطني</label>
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
                <span>الدخول الموحد</span>
              </button>
            </div>
          )}

          {mode === 'sanad' && sanadForm.stage === 1 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-right">
                <p className="font-bold text-slate-900">{sanadForm.citizenName}</p>
                <p className="mt-1 text-sm text-slate-600">الهاتف المرتبط: {sanadForm.maskedPhoneNumber}</p>
                <p className="mt-1 text-xs text-slate-500">مرجع الطلب: {sanadForm.requestReference}</p>
                {sanadForm.sandboxOtp && (
                  <p className="mt-2 text-xs font-bold text-[#238b84]">رمز الاختبار: {sanadForm.sandboxOtp}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-right text-sm font-bold text-slate-700">رمز التحقق</label>
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
                <span>متابعة عبر سند</span>
              </button>
            </div>
          )}

          {mode === 'sanad' && sanadForm.stage === 2 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-right">
                <h2 className="text-base font-black text-slate-900">الموافقة على مشاركة بيانات الهوية</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  سيقوم النظام بالاستفادة من بيانات الهوية الأساسية الواردة من سند لإكمال الدخول والتحقق من المستخدم.
                </p>
                <div className="mt-4 flex items-center justify-end gap-2 text-sm font-bold text-[#238b84]">
                  <span>تم التحقق من الرمز بنجاح</span>
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
                  أوافق على مشاركة بيانات الهوية الرقمية اللازمة مع النظام من أجل إتمام تسجيل الدخول فقط.
                </span>
              </label>

              <button
                type="button"
                onClick={handleSanadComplete}
                disabled={isLoading}
                className="flex min-h-12 w-full touch-manipulation items-center justify-center gap-3 rounded-2xl bg-[#238b84] px-5 py-4 text-base font-black text-white transition hover:bg-[#1f7c76] active:opacity-90 disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}
                <span>إكمال الدخول الموحد</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
