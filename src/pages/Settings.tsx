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
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className={cn(language === 'ar' ? 'text-right' : 'text-left')}>
        <div className="flex items-center justify-between mb-2">
          {activeSettingsSubTab !== 'menu' && (
            <button
              onClick={() => setActiveSettingsSubTab('menu')}
              className="flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline"
            >
              <ChevronLeft className={cn('w-4 h-4', language === 'ar' ? 'rotate-180' : '')} />
              {t.back}
            </button>
          )}
        </div>

        <h2 className="text-2xl font-black text-slate-900">
          {activeSettingsSubTab === 'profile'
            ? t.profile
            : activeSettingsSubTab === 'security'
              ? t.security
              : t.settings}
        </h2>
        <p className="text-slate-500">
          {activeSettingsSubTab === 'profile'
            ? t.editProfile
            : activeSettingsSubTab === 'security'
              ? t.manageSecurity
              : t.customize}
        </p>
      </div>

      {activeSettingsSubTab === 'menu' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <button
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
              'w-full p-6 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-all',
              language === 'ar' ? 'flex-row' : 'flex-row-reverse',
            )}
          >
            <div className={cn('flex items-center gap-4', language === 'ar' ? 'flex-row' : 'flex-row-reverse')}>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div className={cn(language === 'ar' ? 'text-right' : 'text-left')}>
                <p className="font-bold text-slate-900">{t.profile}</p>
                <p className="text-xs text-slate-500">{t.editProfile}</p>
              </div>
            </div>
            <ChevronLeft className={cn('w-5 h-5 text-slate-300', language === 'en' && 'rotate-180')} />
          </button>

          <button
            onClick={() => setActiveSettingsSubTab('security')}
            className={cn(
              'w-full p-6 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-all',
              language === 'ar' ? 'flex-row' : 'flex-row-reverse',
            )}
          >
            <div className={cn('flex items-center gap-4', language === 'ar' ? 'flex-row' : 'flex-row-reverse')}>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <div className={cn(language === 'ar' ? 'text-right' : 'text-left')}>
                <p className="font-bold text-slate-900">{t.security}</p>
                <p className="text-xs text-slate-500">{t.manageSecurity}</p>
              </div>
            </div>
            <ChevronLeft className={cn('w-5 h-5 text-slate-300', language === 'en' && 'rotate-180')} />
          </button>

          <button
            onClick={() => {
              setToast({
                message: language === 'ar' ? 'سيتم إضافة إعدادات الإشعارات لاحقًا.' : 'Notifications settings coming soon.',
                type: 'success',
              });
              setTimeout(() => setToast(null), 2500);
            }}
            className={cn(
              'w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-all',
              language === 'ar' ? 'flex-row' : 'flex-row-reverse',
            )}
          >
            <div className={cn('flex items-center gap-4', language === 'ar' ? 'flex-row' : 'flex-row-reverse')}>
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <div className={cn(language === 'ar' ? 'text-right' : 'text-left')}>
                <p className="font-bold text-slate-900">{t.notifications}</p>
                <p className="text-xs text-slate-500">{t.customize}</p>
              </div>
            </div>
            <ChevronLeft className={cn('w-5 h-5 text-slate-300', language === 'en' && 'rotate-180')} />
          </button>
        </div>
      )}

      {activeSettingsSubTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-28 h-28 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-4xl font-black shadow-inner">
              {(userProfile?.displayName || 'U').charAt(0)}
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-900">{userProfile?.displayName || 'User'}</h3>
              <p className="text-sm text-slate-500">{userProfile?.email || 'user@example.com'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">{t.nationalId}</label>
              <input
                type="text"
                value={isEditingProfile ? editProfileData.nationalId : userProfile?.nationalId || ''}
                onChange={(event) => setEditProfileData((previous) => ({ ...previous, nationalId: event.target.value }))}
                readOnly={!isEditingProfile}
                className={cn(
                  'w-full px-4 py-3 border rounded-xl focus:outline-none transition-all',
                  isEditingProfile
                    ? 'bg-white border-blue-200 focus:border-blue-500 ring-4 ring-blue-50'
                    : 'bg-slate-50 border-slate-200 text-slate-600',
                )}
              />
              {!isEditingProfile && <p className="text-[10px] text-slate-400">{t.verifiedId}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">{t.fullName}</label>
              <input
                type="text"
                value={isEditingProfile ? editProfileData.displayName : userProfile?.displayName || ''}
                onChange={(event) => setEditProfileData((previous) => ({ ...previous, displayName: event.target.value }))}
                readOnly={!isEditingProfile}
                className={cn(
                  'w-full px-4 py-3 border rounded-xl focus:outline-none transition-all',
                  isEditingProfile
                    ? 'bg-white border-blue-200 focus:border-blue-500 ring-4 ring-blue-50'
                    : 'bg-slate-50 border-slate-200 text-slate-600',
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">{t.email}</label>
              <input
                type="email"
                value={isEditingProfile ? editProfileData.email : userProfile?.email || ''}
                onChange={(event) => setEditProfileData((previous) => ({ ...previous, email: event.target.value }))}
                readOnly={!isEditingProfile}
                className={cn(
                  'w-full px-4 py-3 border rounded-xl focus:outline-none transition-all',
                  isEditingProfile
                    ? 'bg-white border-blue-200 focus:border-blue-500 ring-4 ring-blue-50'
                    : 'bg-slate-50 border-slate-200 text-slate-600',
                )}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            {isEditingProfile ? (
              <>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                >
                  {t.save}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                {t.editProfile}
              </button>
            )}
          </div>
        </div>
      )}

      {activeSettingsSubTab === 'security' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-5 text-right">
          <h3 className="text-lg font-bold text-slate-900">{t.security}</h3>
          <div className="grid gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="font-bold text-slate-800">توثيق الحساب</p>
              <p className="text-sm text-slate-500 mt-1">الحساب مربوط بالبريد الإلكتروني والرقم الوطني.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="font-bold text-slate-800">جلسات الدخول</p>
              <p className="text-sm text-slate-500 mt-1">يتم الاعتماد على التحقق من الخادم والرموز الموقعة.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="font-bold text-slate-800">الخصوصية</p>
              <p className="text-sm text-slate-500 mt-1">لا يتم تخزين هوية الناخب داخل جدول الأصوات.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
