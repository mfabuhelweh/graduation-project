import * as React from 'react';
import {
  BarChart3,
  Bell,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
  Vote,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';
import { filterFixedElections } from './lib/fixedElections';
import {
  castVote,
  clearAuthToken,
  completeSanadLogin,
  fetchElections,
  fetchMe,
  getAuthToken,
  loginAdminWithGoogleCredential,
} from './lib/api';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { SidebarItem } from './components/layout/SidebarItem';
import { useMobileShell } from './hooks/useMobileShell';
import { Dashboard } from './pages/Dashboard';
import { Results } from './pages/Results';
import { AuditLogs } from './pages/AuditLogs';
import { VotingPage } from './pages/VotingPage';
import { Settings } from './pages/Settings';
import { LoginPage } from './pages/LoginPage';
import { Notifications } from './pages/Notifications';
import { ElectionsPage } from './pages/admin/ElectionsPage';
import { CreateElectionPage } from './pages/admin/CreateElectionPage';
import { ElectionDetailsPage } from './pages/admin/ElectionDetailsPage';

type Tab =
  | 'Dashboard'
  | 'Elections'
  | 'Create Election'
  | 'Election Details'
  | 'Voting'
  | 'Results'
  | 'Audit Logs'
  | 'Settings'
  | 'Notifications';

export default function App() {
  const [activeTab, setActiveTab] = React.useState<Tab>('Dashboard');
  const [language, setLanguage] = React.useState<'ar' | 'en'>(() => {
    if (typeof window === 'undefined') return 'ar';
    const storedLanguage = window.localStorage.getItem('votesecure-language');
    return storedLanguage === 'en' ? 'en' : 'ar';
  });
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem('votesecure-theme') === 'dark' ? 'dark' : 'light';
  });
  const [user, setUser] = React.useState<any | null>(null);
  const [userProfile, setUserProfile] = React.useState<any | null>(null);
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  const [isLoginLoading, setIsLoginLoading] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [dbElections, setDbElections] = React.useState<any[]>([]);
  const [selectedElectionId, setSelectedElectionId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const mobileShell = useMobileShell();

  const isAdmin = userProfile?.role === 'admin';
  /** Admin UI is web-only; Capacitor/Android uses Sanad (voter) flow only. */
  const isNativeApp = Capacitor.isNativePlatform();
  const showAdminShell = Boolean(isAdmin && !isNativeApp);
  const selectedElection = dbElections.find((election) => election.id === selectedElectionId) || null;
  const voterBoundElection =
    (!isAdmin && userProfile?.electionId
      ? dbElections.find((election) => election.id === userProfile.electionId)
      : null) || null;
  const activeVotingElection =
    voterBoundElection ||
    dbElections.find((election) => ['active', 'scheduled'].includes(String(election.status))) ||
    dbElections[0];

  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.documentElement.lang = language;
    window.localStorage.setItem('votesecure-theme', theme);
    window.localStorage.setItem('votesecure-language', language);
  }, [language, theme]);

  React.useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setIsAuthReady(true);
          return;
        }

        const profile = await fetchMe();
        if (Capacitor.isNativePlatform() && profile.role === 'admin') {
          clearAuthToken();
          setLoginError(
            language === 'ar'
              ? 'إدارة النظام من الموقع على المتصفح فقط. استخدم هذا التطبيق للدخول كناخب عبر سند.'
              : 'System admin is available only on the website. Use this app as a voter via SANAD.',
          );
          setIsAuthReady(true);
          return;
        }
        const normalized = {
          uid: profile.uid,
          displayName: profile.fullName || profile.email || 'User',
          email: profile.email,
          role: profile.role,
          adminRole: profile.adminRole,
          electionId: profile.electionId,
          nationalId: profile.nationalId,
        };
        setUser(normalized);
        setUserProfile(normalized);
        setActiveTab(profile.role === 'admin' ? 'Dashboard' : 'Voting');
      } catch (error) {
        console.error('Failed to restore session', error);
        clearAuthToken();
      } finally {
        setIsAuthReady(true);
      }
    };

    bootstrap();
  }, []);

  const loadElections = React.useCallback(async () => {
    const elections = await fetchElections();
    setDbElections(filterFixedElections(elections));
  }, []);

  React.useEffect(() => {
    if (!user) return;
    loadElections().catch((error) => {
      console.error('Failed to load elections', error);
    });
  }, [user, loadElections]);

  const applyAuthenticatedUser = (result: any) => {
    const profile = {
      uid: result.user.id,
      displayName: result.user.displayName || result.user.fullName || result.user.email,
      email: result.user.email,
      role: result.user.role,
      adminRole: result.user.adminRole,
      electionId: result.user.electionId,
      nationalId: result.user.nationalId,
    };
    setUser(profile);
    setUserProfile(profile);
    setActiveTab(profile.role === 'admin' ? 'Dashboard' : 'Voting');
  };

  const handleSanadComplete = async (challengeId: string) => {
    try {
      setIsLoginLoading(true);
      setLoginError(null);
      const result = await completeSanadLogin(challengeId);
      applyAuthenticatedUser(result);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Sanad login failed');
      throw error;
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleAdminGoogleLogin = async (credential: string) => {
    try {
      setIsLoginLoading(true);
      setLoginError(null);
      const result = await loginAdminWithGoogleCredential(credential);
      if (Capacitor.isNativePlatform() && result.user.role === 'admin') {
        clearAuthToken();
        setLoginError(
          language === 'ar'
            ? 'إدارة النظام من الموقع على المتصفح فقط. سجّل الدخول كناخب عبر سند من هذا التطبيق.'
            : 'System admin is available only on the website. Sign in as a voter via SANAD in this app.',
        );
        return;
      }
      applyAuthenticatedUser(result);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Admin Google login failed');
      throw error;
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
    setUserProfile(null);
    setActiveTab(Capacitor.isNativePlatform() ? 'Voting' : 'Dashboard');
  };

  if (!isAuthReady) {
    return (
      <ErrorBoundary>
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      </ErrorBoundary>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <LoginPage
          onSanadComplete={handleSanadComplete}
          onAdminGoogleLogin={handleAdminGoogleLogin}
          isLoading={isLoginLoading}
          error={loginError}
          language={language}
        />
      </ErrorBoundary>
    );
  }

  const sidebarItems = showAdminShell
    ? [
        { key: 'Dashboard', label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
        { key: 'Elections', label: language === 'ar' ? 'الانتخابات' : 'Elections', icon: FileText },
        { key: 'Results', label: language === 'ar' ? 'النتائج' : 'Results', icon: BarChart3 },
        { key: 'Audit Logs', label: language === 'ar' ? 'سجل العمليات' : 'Audit Logs', icon: Users },
      ]
    : [
        { key: 'Voting', label: language === 'ar' ? 'التصويت الإلكتروني' : 'Voting', icon: Vote },
        { key: 'Results', label: language === 'ar' ? 'النتائج النهائية' : 'Results', icon: BarChart3 },
        { key: 'Notifications', label: language === 'ar' ? 'الإشعارات' : 'Notifications', icon: Bell },
      ];

  const mappedTab: Tab =
    showAdminShell && (activeTab === 'Create Election' || activeTab === 'Election Details')
      ? 'Elections'
      : activeTab;

  const voterPrimaryTabs: Tab[] = ['Voting', 'Results', 'Notifications', 'Settings'];
  const adminPrimaryTabs: Tab[] = ['Dashboard', 'Elections', 'Results', 'Settings'];
  const primaryTabs = showAdminShell ? adminPrimaryTabs : voterPrimaryTabs;

  const mobileNavItems = primaryTabs.map((tabKey) => {
    if (tabKey === 'Settings') {
      return { key: tabKey, label: language === 'ar' ? 'الإعدادات' : 'Settings', icon: SettingsIcon };
    }
    const def = sidebarItems.find((s) => s.key === tabKey);
    return {
      key: tabKey,
      label: def?.label || String(tabKey),
      icon: def?.icon || SettingsIcon,
    };
  });

  return (
    <ErrorBoundary>
      <div
        className="app-shell flex min-h-dvh flex-col bg-slate-50 transition-[background-color,color,border-color] duration-300 md:min-h-screen md:flex-row"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <aside
          className={cn(
            'flex w-72 shrink-0 flex-col border-slate-200 bg-white md:border-l',
            mobileShell ? 'hidden' : 'hidden md:flex',
          )}
        >
          <div className="flex items-center gap-3 border-b border-slate-100 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="text-right">
              <h1 className="font-black text-slate-900">{language === 'ar' ? 'نظام الاقتراع' : 'Voting System'}</h1>
              <p className="text-xs font-bold text-blue-600">
                {language === 'ar' ? 'المملكة الأردنية' : 'Jordan'}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-1 p-4">
            {sidebarItems.map((item) => (
              <SidebarItem
                key={item.key}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.key}
                onClick={() => setActiveTab(item.key as Tab)}
              />
            ))}

            <div className="mt-6 border-t border-slate-100 pt-4">
              <SidebarItem
                icon={SettingsIcon}
                label={language === 'ar' ? 'الإعدادات' : 'Settings'}
                active={activeTab === 'Settings'}
                onClick={() => setActiveTab('Settings')}
              />
              {showAdminShell && (
                <SidebarItem
                  icon={Bell}
                  label={language === 'ar' ? 'الإشعارات' : 'Notifications'}
                  active={activeTab === 'Notifications'}
                  onClick={() => setActiveTab('Notifications')}
                />
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 p-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right">
              <p className="font-black text-slate-900">{user.displayName}</p>
              <p className="mt-1 text-xs text-slate-500">
                {showAdminShell ? (language === 'ar' ? 'مسؤول النظام' : 'System Admin') : language === 'ar' ? 'ناخب مسجل' : 'Registered Voter'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4" />
              {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            </button>
          </div>
        </aside>

        <main
          className={cn(
            'flex min-h-0 flex-1 flex-col',
            mobileShell && 'pb-[calc(3.5rem+max(0.75rem,env(safe-area-inset-bottom)))]',
          )}
        >
          <header
            className={cn(
              'sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md',
              mobileShell
                ? 'px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]'
                : 'px-8 py-5',
            )}
          >
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className={cn(
                'rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200',
                mobileShell ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm',
              )}
            >
              {language === 'ar' ? 'English' : 'العربية'}
            </button>
            <div className={cn('min-w-0', language === 'ar' ? 'text-right' : 'text-left')}>
              <h2
                className={cn(
                  'truncate font-black text-slate-900',
                  mobileShell ? 'max-w-[65vw] text-base' : 'text-xl',
                )}
              >
                {{
                  Dashboard: language === 'ar' ? 'لوحة التحكم' : 'Dashboard',
                  Elections: language === 'ar' ? 'الانتخابات' : 'Elections',
                  'Create Election': language === 'ar' ? 'تعديل الانتخاب' : 'Edit Election',
                  'Election Details': language === 'ar' ? 'تفاصيل الانتخاب' : 'Election Details',
                  Voting: language === 'ar' ? 'التصويت الإلكتروني' : 'Voting',
                  Results: language === 'ar' ? 'النتائج النهائية' : 'Results',
                  'Audit Logs': language === 'ar' ? 'سجل العمليات' : 'Audit Logs',
                  Settings: language === 'ar' ? 'الإعدادات' : 'Settings',
                  Notifications: language === 'ar' ? 'الإشعارات' : 'Notifications',
                }[activeTab]}
              </h2>
              <p className="text-[10px] font-bold text-emerald-600 md:text-xs">
                {language === 'ar' ? 'متصل بالنظام' : 'Connected'}
              </p>
            </div>
          </header>

          <div className={cn('flex-1', mobileShell ? 'overflow-y-auto p-4' : 'p-8')}>
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    'mb-6 rounded-xl px-4 py-3 text-right text-sm font-bold',
                    toast.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                  )}
                >
                  {toast.message}
                </motion.div>
              )}
            </AnimatePresence>

            {showAdminShell && activeTab === 'Dashboard' && (
              <Dashboard
                onReset={async () => {}}
                onRefresh={loadElections}
                dbElections={dbElections}
                setToast={setToast}
                language={language}
                title={language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                subtitle={activeVotingElection?.title}
              />
            )}

            {showAdminShell && activeTab === 'Elections' && (
              <ElectionsPage
                elections={dbElections}
                language={language}
                setToast={setToast}
                onOpenDetails={(electionId) => {
                  setSelectedElectionId(electionId);
                  setActiveTab('Election Details');
                }}
                onEdit={(electionId) => {
                  setSelectedElectionId(electionId);
                  setActiveTab('Create Election');
                }}
                onRefresh={loadElections}
              />
            )}

            {showAdminShell && activeTab === 'Create Election' && (
              <CreateElectionPage
                setToast={setToast}
                onCancel={() => setActiveTab('Elections')}
                initialElection={selectedElection}
                onCreated={async (election) => {
                  await loadElections();
                  setSelectedElectionId(election.id);
                  setActiveTab('Elections');
                }}
                onDeleted={async () => {
                  setSelectedElectionId(null);
                  await loadElections();
                  setActiveTab('Elections');
                }}
              />
            )}

            {showAdminShell && activeTab === 'Election Details' && selectedElectionId && (
              <ElectionDetailsPage
                electionId={selectedElectionId}
                setToast={setToast}
                onBack={() => setActiveTab('Elections')}
                onRefreshList={loadElections}
              />
            )}

            {activeTab === 'Voting' && (
              <VotingPage
                electionId={activeVotingElection?.id}
                initialNationalId={userProfile?.nationalId}
                voterName={userProfile?.displayName || userProfile?.fullName}
                lockNationalId={Boolean(userProfile?.nationalId)}
                language={language}
                onVoteComplete={async (payload) => {
                  await castVote({
                    electionId: activeVotingElection?.id,
                    voterNationalId: payload.nationalId,
                    partyId: payload.partyId,
                    districtListId: payload.districtListId,
                    districtCandidateIds: payload.districtCandidateIds,
                    token: payload.votingToken,
                  });
                  await loadElections();
                  setToast({ message: language === 'ar' ? 'تم تسجيل صوتك بنجاح' : 'Vote recorded', type: 'success' });
                  setTimeout(() => setToast(null), 2500);
                }}
              />
            )}

            {activeTab === 'Results' && (
              <Results
                isAdmin={showAdminShell}
                setToast={setToast}
                language={language}
                elections={dbElections}
                preferredElectionId={!showAdminShell ? activeVotingElection?.id : null}
              />
            )}

            {showAdminShell && activeTab === 'Audit Logs' && <AuditLogs setToast={setToast} language={language} />}
            {activeTab === 'Settings' && (
              <Settings
                setToast={setToast}
                language={language}
                setLanguage={setLanguage}
                theme={theme}
                setTheme={setTheme}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                onLogout={handleLogout}
              />
            )}
            {activeTab === 'Notifications' && <Notifications language={language} />}
          </div>
        </main>

        {mobileShell && (
          <MobileBottomNav
            items={mobileNavItems}
            activeItemKey={primaryTabs.includes(mappedTab) ? mappedTab : null}
            onSelect={(key) => setActiveTab(key as Tab)}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
