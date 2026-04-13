import * as React from 'react';
import { Bell, ChevronLeft, Lock, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface SettingsProps {
  language: 'ar' | 'en';
  userProfile: any;
  setUserProfile: React.Dispatch<React.SetStateAction<any>>;
  setToast: (t: any) => void;
}

export const Settings = ({ language, userProfile, setUserProfile, setToast }: SettingsProps) => {
  const [activeSettingsSubTab, setActiveSettingsSubTab] = React.useState<'menu' | 'profile' | 'security'>('menu');
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [editProfileData, setEditProfileData] = React.useState({
    displayName: userProfile?.displayName || '',
    email: userProfile?.email || '',
    nationalId: userProfile?.nationalId || '',
  });

  const t = {
    ar: {
      settings: 'الإعدادات',
      profile: 'الملف الشخصي',
      security: 'الأمان والخصوصية',
      notifications: 'الإشعارات',
      back: 'العودة',
      editProfile: 'تعديل معلومات الحساب',
      manageSecurity: 'إدارة إعدادات الأمان وحماية الدخول',
      customize: 'خصص إعدادات حسابك وتفضيلات النظام',
      nationalId: 'الرقم الوطني',
      fullName: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      save: 'حفظ التغييرات',
      cancel: 'إلغاء',
      verifiedId: 'هذا الرقم موثّق ومرتبط بهويتك الرقمية.',
    },
    en: {
      settings: 'Settings',
      profile: 'Profile',
      security: 'Security & Privacy',
      notifications: 'Notifications',
      back: 'Back',
      editProfile: 'Edit account information',
      manageSecurity: 'Manage security settings',
      customize: 'Customize your system preferences',
      nationalId: 'National ID',
      fullName: 'Full Name',
      email: 'Email Address',
      save: 'Save Changes',
      cancel: 'Cancel',
      verifiedId: 'This number is verified and linked to your identity.',
    },
  }[language];

  const handleSaveProfile = () => {
    setUserProfile((previous: any) => ({
      ...previous,
      displayName: editProfileData.displayName,
      email: editProfileData.email,
      nationalId: editProfileData.nationalId,
    }));
    setIsEditingProfile(false);
    setToast({ message: language === 'ar' ? 'تم حفظ التغييرات' : 'Changes saved', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-in fade-in slide-in-from-bottom-4 md:space-y-8">
      <div className={cn(language === 'ar' ? 'text-right' : 'text-left')}>
        <div className="mb-2 flex min-h-11 items-center justify-between">
          {activeSettingsSubTab !== 'menu' && (
            <button
              type="button"
              onClick={() => setActiveSettingsSubTab('menu')}
              className="touch-manipulation inline-flex min-h-11 items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 active:bg-blue-100 md:min-h-0 md:px-0 md:py-0 md:hover:bg-transparent md:hover:underline"
            >
              <ChevronLeft className={cn('h-4 w-4 shrink-0', language === 'ar' ? 'rotate-180' : '')} />
              {t.back}
            </button>
          )}
        </div>

        <h2 className="text-xl font-black text-slate-900 md:text-2xl">
          {activeSettingsSubTab === 'profile'
            ? t.profile
            : activeSettingsSubTab === 'security'
              ? t.security
              : t.settings}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500 md:text-base">
          {activeSettingsSubTab === 'profile'
            ? t.editProfile
            : activeSettingsSubTab === 'security'
              ? t.manageSecurity
              : t.customize}
        </p>
      </div>

      {activeSettingsSubTab === 'menu' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:rounded-3xl">
          <button
            type="button"
            onClick={() => {
              setEditProfileData({
                displayName: userProfile?.displayName || '',
                email: userProfile?.email || '',
                nationalId: userProfile?.nationalId || '',
              });
              setIsEditingProfile(false);
              setActiveSettingsSubTab('profile');
            }}
            className={cn(
              'touch-manipulation flex min-h-[4.25rem] w-full items-center justify-between border-b border-slate-100 px-4 py-4 transition-all hover:bg-slate-50 active:bg-slate-100 md:min-h-0 md:p-6',
              language === 'ar' ? 'flex-row' : 'flex-row-reverse',
            )}
          >
            <div className={cn('flex min-w-0 items-center gap-3 md:gap-4', language === 'ar' ? 'flex-row' : 'flex-row-reverse')}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 md:h-12 md:w-12">
                <User className="h-6 w-6" />
              </div>
              <div className={cn('min-w-0', language === 'ar' ? 'text-right' : 'text-left')}>
                <p className="font-bold text-slate-900">{t.profile}</p>
                <p className="text-xs text-slate-500">{t.editProfile}</p>
              </div>
            </div>
            <ChevronLeft className={cn('h-5 w-5 shrink-0 text-slate-300', language === 'en' && 'rotate-180')} />
          </button>

          <button
            type="button"
            onClick={() => setActiveSettingsSubTab('security')}
            className={cn(
              'touch-manipulation flex min-h-[4.25rem] w-full items-center justify-between border-b border-slate-100 px-4 py-4 transition-all hover:bg-slate-50 active:bg-slate-100 md:min-h-0 md:p-6',
              language === 'ar' ? 'flex-row' : 'flex-row-reverse',
            )}
          >
            <div className={cn('flex min-w-0 items-center gap-3 md:gap-4', language === 'ar' ? 'flex-row' : 'flex-row-reverse')}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 md:h-12 md:w-12">
                <Lock className="h-6 w-6" />
              </div>
              <div className={cn('min-w-0', language === 'ar' ? 'text-right' : 'text-left')}>
                <p className="font-bold text-slate-900">{t.security}</p>
                <p className="text-xs text-slate-500">{t.manageSecurity}</p>
              </div>
            </div>
            <ChevronLeft className={cn('h-5 w-5 shrink-0 text-slate-300', language === 'en' && 'rotate-180')} />
          </button>

          <button
            type="button"
            onClick={() => {
              setToast({
                message: language === 'ar' ? 'سيتم إضافة إعدادات الإشعارات لاحقًا.' : 'Notifications settings coming soon.',
                type: 'success',
              });
              setTimeout(() => setToast(null), 2500);
            }}
            className={cn(
              'touch-manipulation flex min-h-[4.25rem] w-full items-center justify-between px-4 py-4 transition-all hover:bg-slate-50 active:bg-slate-100 md:min-h-0 md:p-6',
              language === 'ar' ? 'flex-row' : 'flex-row-reverse',
            )}
          >
            <div className={cn('flex min-w-0 items-center gap-3 md:gap-4', language === 'ar' ? 'flex-row' : 'flex-row-reverse')}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 md:h-12 md:w-12">
                <Bell className="h-6 w-6" />
              </div>
              <div className={cn('min-w-0', language === 'ar' ? 'text-right' : 'text-left')}>
                <p className="font-bold text-slate-900">{t.notifications}</p>
                <p className="text-xs text-slate-500">{t.customize}</p>
              </div>
            </div>
            <ChevronLeft className={cn('h-5 w-5 shrink-0 text-slate-300', language === 'en' && 'rotate-180')} />
          </button>
        </div>
      )}

      {activeSettingsSubTab === 'profile' && (
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:space-y-8 md:rounded-3xl md:p-8">
          <div className="flex flex-col items-center space-y-3 md:space-y-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-3xl font-black text-blue-600 shadow-inner md:h-28 md:w-28 md:text-4xl">
              {(userProfile?.displayName || 'U').charAt(0)}
            </div>
            <div className="max-w-full px-2 text-center">
              <h3 className="break-words text-lg font-bold text-slate-900 md:text-xl">
                {userProfile?.displayName || 'User'}
              </h3>
              <p className="mt-1 break-all text-sm text-slate-500">{userProfile?.email || 'user@example.com'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">{t.nationalId}</label>
              <input
                type="text"
                value={isEditingProfile ? editProfileData.nationalId : userProfile?.nationalId || ''}
                onChange={(event) => setEditProfileData((previous) => ({ ...previous, nationalId: event.target.value }))}
                readOnly={!isEditingProfile}
                className={cn(
                  'min-h-12 w-full rounded-xl border px-4 py-3 text-base transition-all focus:outline-none md:text-sm',
                  isEditingProfile
                    ? 'border-blue-200 bg-white ring-4 ring-blue-50 focus:border-blue-500'
                    : 'border-slate-200 bg-slate-50 text-slate-600',
                )}
              />
              {!isEditingProfile && <p className="text-[10px] text-slate-400">{t.verifiedId}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">{t.fullName}</label>
              <input
                type="text"
                value={isEditingProfile ? editProfileData.displayName : userProfile?.displayName || ''}
                onChange={(event) => setEditProfileData((previous) => ({ ...previous, displayName: event.target.value }))}
                readOnly={!isEditingProfile}
                className={cn(
                  'min-h-12 w-full rounded-xl border px-4 py-3 text-base transition-all focus:outline-none md:text-sm',
                  isEditingProfile
                    ? 'border-blue-200 bg-white ring-4 ring-blue-50 focus:border-blue-500'
                    : 'border-slate-200 bg-slate-50 text-slate-600',
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">{t.email}</label>
              <input
                type="email"
                value={isEditingProfile ? editProfileData.email : userProfile?.email || ''}
                onChange={(event) => setEditProfileData((previous) => ({ ...previous, email: event.target.value }))}
                readOnly={!isEditingProfile}
                className={cn(
                  'min-h-12 w-full rounded-xl border px-4 py-3 text-base transition-all focus:outline-none md:text-sm',
                  isEditingProfile
                    ? 'border-blue-200 bg-white ring-4 ring-blue-50 focus:border-blue-500'
                    : 'border-slate-200 bg-slate-50 text-slate-600',
                )}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
            {isEditingProfile ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="touch-manipulation min-h-12 w-full rounded-xl bg-slate-100 px-5 py-3.5 font-bold text-slate-700 transition-all hover:bg-slate-200 active:bg-slate-300 md:w-auto md:py-3"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="touch-manipulation min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white transition-all hover:bg-blue-700 active:opacity-90 md:w-auto md:py-3"
                >
                  {t.save}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="touch-manipulation min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white transition-all hover:bg-blue-700 active:opacity-90 md:w-auto md:py-3"
              >
                {t.editProfile}
              </button>
            )}
          </div>
        </div>
      )}

      {activeSettingsSubTab === 'security' && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm md:space-y-5 md:rounded-3xl md:p-8">
          <h3 className="text-base font-bold text-slate-900 md:text-lg">{t.security}</h3>
          <div className="grid gap-3 md:gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-bold text-slate-800">توثيق الحساب</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">الحساب مربوط بالبريد الإلكتروني والرقم الوطني.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-bold text-slate-800">جلسات الدخول</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">يتم الاعتماد على التحقق من الخادم والرموز الموقعة.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-bold text-slate-800">الخصوصية</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">لا يتم تخزين هوية الناخب داخل جدول الأصوات.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
