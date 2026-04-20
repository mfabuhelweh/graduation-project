import * as React from 'react';
import {
  Bell,
  ChevronLeft,
  Globe2,
  Lock,
  LogOut,
  MoonStar,
  ShieldCheck,
  Sparkles,
  SunMedium,
  User,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SettingsProps {
  language: 'ar' | 'en';
  setLanguage: React.Dispatch<React.SetStateAction<'ar' | 'en'>>;
  theme: 'light' | 'dark';
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
  userProfile: any;
  setUserProfile: React.Dispatch<React.SetStateAction<any>>;
  setToast: (toast: any) => void;
  onLogout?: () => void;
  canViewSensitiveResults?: boolean;
  canManageElectionData?: boolean;
}

type SettingsSubTab = 'menu' | 'profile' | 'preferences' | 'security' | 'notifications';

export const Settings = ({
  language,
  setLanguage,
  theme,
  setTheme,
  userProfile,
  setUserProfile,
  setToast,
  onLogout,
  canViewSensitiveResults = false,
  canManageElectionData = false,
}: SettingsProps) => {
  const [activeSettingsSubTab, setActiveSettingsSubTab] = React.useState<SettingsSubTab>('menu');
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [notificationPrefs, setNotificationPrefs] = React.useState({
    electionAlerts: true,
    votingReminders: true,
    resultsAnnouncements: true,
    securityAlerts: true,
    soundEnabled: false,
  });
  const [editProfileData, setEditProfileData] = React.useState({
    displayName: userProfile?.displayName || '',
    email: userProfile?.email || '',
    nationalId: userProfile?.nationalId || '',
  });

  const isAdmin = userProfile?.role === 'admin';
  const adminRoleLabel =
    userProfile?.adminRole === 'super_admin'
      ? language === 'ar'
        ? 'مشرف رفيع'
        : 'Super admin'
      : userProfile?.adminRole === 'auditor'
        ? language === 'ar'
          ? 'مدقق'
          : 'Auditor'
        : userProfile?.adminRole === 'election_admin'
          ? language === 'ar'
            ? 'مدير انتخابات'
            : 'Election admin'
          : language === 'ar'
            ? 'مستخدم'
            : 'User';

  const copy = {
    ar: {
      settings: 'الإعدادات',
      profile: 'الملف الشخصي',
      preferences: 'اللغة والمظهر',
      security: 'الأمان والخصوصية',
      notifications: 'الإشعارات',
      notificationsSettings: 'إعدادات الإشعارات',
      back: 'العودة',
      editProfile: 'تعديل معلومات الحساب',
      personalizeExperience: 'خصص اللغة والثيم بالشكل الذي يناسبك',
      manageSecurity: 'إدارة إعدادات الأمان وحماية تسجيل الدخول',
      customize: 'خصص إعدادات حسابك وتفضيلات النظام',
      nationalId: 'الرقم الوطني',
      fullName: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      save: 'حفظ التغييرات',
      cancel: 'إلغاء',
      verifiedId: 'هذا الرقم موثق ومرتبط بهويتك الرقمية.',
      logout: 'تسجيل الخروج',
      logoutDanger: 'إنهاء الجلسة الحالية',
      logoutConfirmTitle: 'تأكيد تسجيل الخروج',
      logoutConfirmBody: 'هل أنت متأكد من تسجيل الخروج؟ سيتم إنهاء الجلسة الحالية.',
      notificationsDesc: 'تحكم بالتنبيهات التي تريد استلامها على التطبيق',
      electionAlerts: 'تنبيهات الانتخابات',
      electionAlertsHint: 'إشعارات فتح وإغلاق باب التصويت وتحديثات الحالة',
      votingReminders: 'تذكيرات التصويت',
      votingRemindersHint: 'تنبيه قبل انتهاء الوقت المتبقي للتصويت',
      resultsAnnouncements: 'إعلانات النتائج',
      resultsAnnouncementsHint: 'إشعار عند نشر النتائج المرحلية أو النهائية',
      securityAlerts: 'تنبيهات الأمان',
      securityAlertsHint: 'تنبيهات محاولات الدخول أو تحديثات الجلسة',
      soundEnabled: 'صوت الإشعارات',
      soundEnabledHint: 'تشغيل نغمة عند وصول إشعار جديد',
      saveNotifications: 'حفظ إعدادات الإشعارات',
      languageSection: 'لغة الواجهة',
      languageHint: 'انتقل بين العربية والإنجليزية بشكل فوري.',
      arabic: 'العربية',
      english: 'English',
      appearanceSection: 'وضع العرض',
      appearanceHint: 'اختر بين الوضع الفاتح والوضع الداكن.',
      lightMode: 'وضع فاتح',
      darkMode: 'وضع داكن',
      preferencesSaved: 'تم حفظ تفضيلاتك',
      autoSaved: 'يتم حفظ التغييرات تلقائيًا',
      appearanceTitle: 'خلّ التجربة على ذوقك',
      appearanceCopy: 'اختر لغتك المفضلة والثيم المناسب لراحتك أثناء الاستخدام.',
      accountVerification: 'توثيق الحساب',
      accountVerificationHint: 'الحساب مربوط بالبريد الإلكتروني والرقم الوطني.',
      loginSessions: 'جلسات الدخول',
      loginSessionsHint: 'يتم الاعتماد على التحقق من الخادم والرموز الموقعة.',
      privacy: 'الخصوصية',
      privacyHint: 'لا يتم تخزين هوية الناخب داخل جدول الأصوات.',
      lightDescription: 'نظيف ومشرق',
      darkDescription: 'أنيق ومريح للعين',
      roleAccess: 'صلاحيات الوصول',
      roleAccessHint: 'هذه الصلاحيات تُطبَّق عبر الـ middleware في الخادم وتحدد ما الذي يمكن لهذا الأدمن رؤيته أو تعديله.',
      canManageElectionData: 'إدارة الانتخابات والاستيراد',
      canViewSensitiveResults: 'الوصول إلى النتائج الحساسة والسجلات',
      enabled: 'مسموح',
      disabled: 'غير مسموح',
    },
    en: {
      settings: 'Settings',
      profile: 'Profile',
      preferences: 'Language & Appearance',
      security: 'Security & Privacy',
      notifications: 'Notifications',
      notificationsSettings: 'Notification Settings',
      back: 'Back',
      editProfile: 'Edit account information',
      personalizeExperience: 'Customize language and theme your way',
      manageSecurity: 'Manage security settings and sign-in protection',
      customize: 'Customize your system preferences',
      nationalId: 'National ID',
      fullName: 'Full Name',
      email: 'Email Address',
      save: 'Save Changes',
      cancel: 'Cancel',
      verifiedId: 'This number is verified and linked to your identity.',
      logout: 'Logout',
      logoutDanger: 'End current session',
      logoutConfirmTitle: 'Confirm logout',
      logoutConfirmBody: 'Are you sure you want to log out? The current session will end.',
      notificationsDesc: 'Control which alerts you receive in the app',
      electionAlerts: 'Election alerts',
      electionAlertsHint: 'Voting open/close and status updates',
      votingReminders: 'Voting reminders',
      votingRemindersHint: 'Remind me before voting ends',
      resultsAnnouncements: 'Results announcements',
      resultsAnnouncementsHint: 'Notify me when results are published',
      securityAlerts: 'Security alerts',
      securityAlertsHint: 'Login and session security events',
      soundEnabled: 'Notification sound',
      soundEnabledHint: 'Play a sound when a new notification arrives',
      saveNotifications: 'Save notification settings',
      languageSection: 'Interface language',
      languageHint: 'Switch instantly between Arabic and English.',
      arabic: 'Arabic',
      english: 'English',
      appearanceSection: 'Appearance mode',
      appearanceHint: 'Choose between light mode and dark mode.',
      lightMode: 'Light Mode',
      darkMode: 'Dark Mode',
      preferencesSaved: 'Your preferences were saved',
      autoSaved: 'Changes are saved automatically',
      appearanceTitle: 'Make the app feel like yours',
      appearanceCopy: 'Pick the language and theme that feel most comfortable while you browse and vote.',
      accountVerification: 'Account verification',
      accountVerificationHint: 'The account is linked to email and national ID.',
      loginSessions: 'Login sessions',
      loginSessionsHint: 'Session validation relies on server checks and signed tokens.',
      privacy: 'Privacy',
      privacyHint: 'Voter identity is not stored in the votes table.',
      lightDescription: 'Clean and bright',
      darkDescription: 'Elegant and easy on the eyes',
      roleAccess: 'Role access',
      roleAccessHint: 'These permissions are enforced by backend middleware and define what this admin can see or modify.',
      canManageElectionData: 'Manage elections and imports',
      canViewSensitiveResults: 'Access sensitive results and logs',
      enabled: 'Allowed',
      disabled: 'Not allowed',
    },
  }[language];

  const withToastTimeout = (message: string) => {
    setToast({ message, type: 'success' });
    setTimeout(() => setToast(null), 2200);
  };

  const handleSaveProfile = () => {
    setUserProfile((previous: any) => ({
      ...previous,
      displayName: editProfileData.displayName,
      email: editProfileData.email,
      nationalId: editProfileData.nationalId,
    }));
    setIsEditingProfile(false);
    withToastTimeout(language === 'ar' ? 'تم حفظ التغييرات' : 'Changes saved');
  };

  const updateLanguage = (nextLanguage: 'ar' | 'en') => {
    if (nextLanguage === language) return;
    setLanguage(nextLanguage);
    withToastTimeout(nextLanguage === 'ar' ? 'تم حفظ تفضيلاتك' : 'Your preferences were saved');
  };

  const updateTheme = (nextTheme: 'light' | 'dark') => {
    if (nextTheme === theme) return;
    setTheme(nextTheme);
    withToastTimeout(copy.preferencesSaved);
  };

  const menuItems = [
    {
      key: 'profile' as const,
      title: copy.profile,
      description: copy.editProfile,
      icon: User,
      iconWrap: 'bg-blue-50 text-blue-600',
    },
    {
      key: 'preferences' as const,
      title: copy.preferences,
      description: copy.personalizeExperience,
      icon: Sparkles,
      iconWrap: 'bg-violet-50 text-violet-600',
    },
    {
      key: 'security' as const,
      title: copy.security,
      description: copy.manageSecurity,
      icon: Lock,
      iconWrap: 'bg-emerald-50 text-emerald-600',
    },
    {
      key: 'notifications' as const,
      title: copy.notifications,
      description: copy.notificationsDesc,
      icon: Bell,
      iconWrap: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="mx-auto max-w-2xl animate-in space-y-5 fade-in slide-in-from-bottom-4 md:space-y-8">
      <div className={cn(language === 'ar' ? 'text-right' : 'text-left')}>
        <div className="mb-2 flex min-h-11 items-center justify-between">
          {activeSettingsSubTab !== 'menu' && (
            <button
              type="button"
              onClick={() => setActiveSettingsSubTab('menu')}
              className="touch-manipulation inline-flex min-h-11 items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 active:bg-blue-100 md:min-h-0 md:px-0 md:py-0 md:hover:bg-transparent md:hover:underline"
            >
              <ChevronLeft className={cn('h-4 w-4 shrink-0', language === 'ar' ? 'rotate-180' : '')} />
              {copy.back}
            </button>
          )}
        </div>

        <h2 className="text-xl font-black text-slate-900 md:text-2xl">
          {activeSettingsSubTab === 'profile'
            ? copy.profile
            : activeSettingsSubTab === 'preferences'
              ? copy.preferences
              : activeSettingsSubTab === 'notifications'
                ? copy.notificationsSettings
                : activeSettingsSubTab === 'security'
                  ? copy.security
                  : copy.settings}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500 md:text-base">
          {activeSettingsSubTab === 'profile'
            ? copy.editProfile
            : activeSettingsSubTab === 'preferences'
              ? copy.personalizeExperience
              : activeSettingsSubTab === 'notifications'
                ? copy.notificationsDesc
                : activeSettingsSubTab === 'security'
                  ? copy.manageSecurity
                  : copy.customize}
        </p>
      </div>

      {activeSettingsSubTab === 'menu' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:rounded-3xl">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (item.key === 'profile') {
                      setEditProfileData({
                        displayName: userProfile?.displayName || '',
                        email: userProfile?.email || '',
                        nationalId: userProfile?.nationalId || '',
                      });
                      setIsEditingProfile(false);
                    }
                    setActiveSettingsSubTab(item.key);
                  }}
                  className={cn(
                    'touch-manipulation flex min-h-[4.25rem] w-full items-center justify-between px-4 py-4 transition-all hover:bg-slate-50 active:bg-slate-100 md:min-h-0 md:p-6',
                    index !== menuItems.length - 1 && 'border-b border-slate-100',
                    language === 'ar' ? 'flex-row' : 'flex-row-reverse',
                  )}
                >
                  <div className={cn('flex min-w-0 items-center gap-3 md:gap-4', language === 'ar' ? 'flex-row' : 'flex-row-reverse')}>
                    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl md:h-12 md:w-12', item.iconWrap)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className={cn('min-w-0', language === 'ar' ? 'text-right' : 'text-left')}>
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                  </div>
                  <ChevronLeft className={cn('h-5 w-5 shrink-0 text-slate-300', language === 'en' && 'rotate-180')} />
                </button>
              );
            })}
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="touch-manipulation inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-4 font-bold text-white shadow-sm transition-all hover:bg-rose-700 active:opacity-90"
            >
              <LogOut className="h-5 w-5" />
              {copy.logoutDanger}
            </button>
          )}
        </div>
      )}

      {activeSettingsSubTab === 'preferences' && (
        <div className="space-y-5 md:space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-5 text-white shadow-xl shadow-slate-300/30 md:rounded-3xl md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className={cn('max-w-xl', language === 'ar' ? 'text-right' : 'text-left')}>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-200">{copy.autoSaved}</p>
                <h3 className="mt-3 text-2xl font-black md:text-3xl">{copy.appearanceTitle}</h3>
                <p className="mt-3 max-w-lg text-sm leading-7 text-slate-200 md:text-base">{copy.appearanceCopy}</p>
              </div>
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur md:flex">
                <Sparkles className="h-7 w-7 text-blue-100" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-6">
            <div className={cn('mb-4', language === 'ar' ? 'text-right' : 'text-left')}>
              <h3 className="text-base font-black text-slate-900 md:text-lg">{copy.languageSection}</h3>
              <p className="mt-1 text-sm text-slate-500">{copy.languageHint}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { value: 'ar' as const, label: copy.arabic, description: 'RTL' },
                { value: 'en' as const, label: copy.english, description: 'LTR' },
              ].map((option) => {
                const isActive = language === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateLanguage(option.value)}
                    className={cn(
                      'rounded-2xl border px-4 py-4 transition-all',
                      isActive
                        ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100/80'
                        : 'border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-blue-50/60',
                      language === 'ar' ? 'text-right' : 'text-left',
                    )}
                  >
                    <div className={cn('flex items-start justify-between gap-3', language === 'en' && 'flex-row-reverse')}>
                      <div>
                        <p className={cn('font-bold', isActive ? 'text-blue-700' : 'text-slate-900')}>{option.label}</p>
                        <p className={cn('mt-1 text-xs font-semibold', isActive ? 'text-blue-500' : 'text-slate-500')}>
                          {option.description}
                        </p>
                      </div>
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl transition-all', isActive ? 'bg-blue-600 text-white' : 'bg-white text-slate-500')}>
                        <Globe2 className="h-5 w-5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-6">
            <div className={cn('mb-4', language === 'ar' ? 'text-right' : 'text-left')}>
              <h3 className="text-base font-black text-slate-900 md:text-lg">{copy.appearanceSection}</h3>
              <p className="mt-1 text-sm text-slate-500">{copy.appearanceHint}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { value: 'light' as const, label: copy.lightMode, description: copy.lightDescription, icon: SunMedium },
                { value: 'dark' as const, label: copy.darkMode, description: copy.darkDescription, icon: MoonStar },
              ].map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateTheme(option.value)}
                    className={cn(
                      'rounded-2xl border px-4 py-4 transition-all',
                      isActive
                        ? option.value === 'dark'
                          ? 'border-slate-700 bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                          : 'border-amber-300 bg-amber-50 shadow-lg shadow-amber-100/80'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/70',
                      language === 'ar' ? 'text-right' : 'text-left',
                    )}
                  >
                    <div className={cn('flex items-start justify-between gap-3', language === 'en' && 'flex-row-reverse')}>
                      <div>
                        <p className={cn('font-bold', isActive ? (option.value === 'dark' ? 'text-white' : 'text-amber-900') : 'text-slate-900')}>
                          {option.label}
                        </p>
                        <p className={cn('mt-1 text-xs font-semibold', isActive ? (option.value === 'dark' ? 'text-slate-300' : 'text-amber-700') : 'text-slate-500')}>
                          {option.description}
                        </p>
                      </div>
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl transition-all', isActive ? (option.value === 'dark' ? 'bg-white/10 text-white' : 'bg-amber-500 text-white') : 'bg-white text-slate-500')}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeSettingsSubTab === 'profile' && (
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:space-y-8 md:rounded-3xl md:p-8">
          <div className="flex flex-col items-center space-y-3 md:space-y-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-3xl font-black text-blue-600 shadow-inner md:h-28 md:w-28 md:text-4xl">
              {(userProfile?.displayName || 'U').charAt(0)}
            </div>
            <div className="max-w-full px-2 text-center">
              <h3 className="break-words text-lg font-bold text-slate-900 md:text-xl">{userProfile?.displayName || 'User'}</h3>
              <p className="mt-1 break-all text-sm text-slate-500">{userProfile?.email || 'user@example.com'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">{copy.nationalId}</label>
              <input
                type="text"
                aria-label={copy.nationalId}
                title={copy.nationalId}
                value={isEditingProfile ? editProfileData.nationalId : userProfile?.nationalId || ''}
                onChange={(event) => setEditProfileData((previous) => ({ ...previous, nationalId: event.target.value }))}
                readOnly={!isEditingProfile}
                className={cn(
                  'min-h-12 w-full rounded-xl border px-4 py-3 text-base transition-all focus:outline-none md:text-sm',
                  isEditingProfile ? 'border-blue-200 bg-white ring-4 ring-blue-50 focus:border-blue-500' : 'border-slate-200 bg-slate-50 text-slate-600',
                )}
              />
              {!isEditingProfile && <p className="text-[10px] text-slate-400">{copy.verifiedId}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">{copy.fullName}</label>
              <input
                type="text"
                aria-label={copy.fullName}
                title={copy.fullName}
                value={isEditingProfile ? editProfileData.displayName : userProfile?.displayName || ''}
                onChange={(event) => setEditProfileData((previous) => ({ ...previous, displayName: event.target.value }))}
                readOnly={!isEditingProfile}
                className={cn(
                  'min-h-12 w-full rounded-xl border px-4 py-3 text-base transition-all focus:outline-none md:text-sm',
                  isEditingProfile ? 'border-blue-200 bg-white ring-4 ring-blue-50 focus:border-blue-500' : 'border-slate-200 bg-slate-50 text-slate-600',
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">{copy.email}</label>
              <input
                type="email"
                aria-label={copy.email}
                title={copy.email}
                value={isEditingProfile ? editProfileData.email : userProfile?.email || ''}
                onChange={(event) => setEditProfileData((previous) => ({ ...previous, email: event.target.value }))}
                readOnly={!isEditingProfile}
                className={cn(
                  'min-h-12 w-full rounded-xl border px-4 py-3 text-base transition-all focus:outline-none md:text-sm',
                  isEditingProfile ? 'border-blue-200 bg-white ring-4 ring-blue-50 focus:border-blue-500' : 'border-slate-200 bg-slate-50 text-slate-600',
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
                  {copy.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="touch-manipulation min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white transition-all hover:bg-blue-700 active:opacity-90 md:w-auto md:py-3"
                >
                  {copy.save}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="touch-manipulation min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white transition-all hover:bg-blue-700 active:opacity-90 md:w-auto md:py-3"
              >
                {copy.editProfile}
              </button>
            )}
          </div>
        </div>
      )}

      {activeSettingsSubTab === 'security' && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:space-y-5 md:rounded-3xl md:p-8">
          <h3 className={cn('text-base font-bold text-slate-900 md:text-lg', language === 'ar' ? 'text-right' : 'text-left')}>
            {copy.security}
          </h3>
          <div className="grid gap-3 md:gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-bold text-slate-800">{copy.accountVerification}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{copy.accountVerificationHint}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-bold text-slate-800">{copy.loginSessions}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{copy.loginSessionsHint}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-bold text-slate-800">{copy.privacy}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{copy.privacyHint}</p>
            </div>

            {isAdmin && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center justify-end gap-3">
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{copy.roleAccess}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{copy.roleAccessHint}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-2 text-blue-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-white p-4 text-right">
                  <p className="text-xs font-bold text-slate-400">{language === 'ar' ? 'الدور الحالي' : 'Current role'}</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{adminRoleLabel}</p>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {[
                    { label: copy.canManageElectionData, enabled: canManageElectionData },
                    { label: copy.canViewSensitiveResults, enabled: canViewSensitiveResults },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-white p-4 text-right">
                      <p className="text-sm font-bold text-slate-900">{item.label}</p>
                      <p className={cn('mt-2 text-sm font-black', item.enabled ? 'text-emerald-600' : 'text-rose-600')}>
                        {item.enabled ? copy.enabled : copy.disabled}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSettingsSubTab === 'notifications' && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:space-y-5 md:rounded-3xl md:p-8">
          {[
            { key: 'electionAlerts', label: copy.electionAlerts, hint: copy.electionAlertsHint },
            { key: 'votingReminders', label: copy.votingReminders, hint: copy.votingRemindersHint },
            { key: 'resultsAnnouncements', label: copy.resultsAnnouncements, hint: copy.resultsAnnouncementsHint },
            { key: 'securityAlerts', label: copy.securityAlerts, hint: copy.securityAlertsHint },
            { key: 'soundEnabled', label: copy.soundEnabled, hint: copy.soundEnabledHint },
          ].map((item) => {
            const checked = notificationPrefs[item.key as keyof typeof notificationPrefs];
            return (
              <label key={item.key} className="flex cursor-pointer items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    setNotificationPrefs((previous) => ({
                      ...previous,
                      [item.key]: event.target.checked,
                    }))
                  }
                  className="mt-1 h-5 w-5 shrink-0 accent-blue-600"
                />
                <div className={cn('min-w-0 flex-1', language === 'ar' ? 'text-right' : 'text-left')}>
                  <p className="font-bold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.hint}</p>
                </div>
              </label>
            );
          })}

          <button
            type="button"
            onClick={() => withToastTimeout(language === 'ar' ? 'تم حفظ إعدادات الإشعارات' : 'Notification settings saved')}
            className="touch-manipulation min-h-12 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white transition-all hover:bg-blue-700 active:opacity-90 md:w-auto md:py-3"
          >
            {copy.saveNotifications}
          </button>
        </div>
      )}

      {showLogoutConfirm && onLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="text-right">
              <h3 className="text-xl font-black text-slate-900">{copy.logoutConfirmTitle}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">{copy.logoutConfirmBody}</p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="min-h-11 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
              >
                {copy.logout}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
