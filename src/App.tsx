import * as React from 'react';
import {
  BarChart3,
  Bell,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings as SettingsIcon,
  Users,
  Vote,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';
import {
  castVote,
  clearAuthToken,
  completeSanadLogin,
  fetchAdminElections,
  fetchElections,
  fetchVoters,
  fetchMe,
  getAuthToken,
  loginAdminWithBackend,
  loginAdminWithGoogleCredential,
} from './lib/api';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ElectionCountdownCard } from './components/ElectionCountdownCard';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { SiteFooter } from './components/layout/SiteFooter';
import { SiteHeader } from './components/layout/SiteHeader';
import { SidebarItem } from './components/layout/SidebarItem';
import { useMobileShell } from './hooks/useMobileShell';
import { Dashboard } from './pages/Dashboard';
import { Results } from './pages/Results';
import { AuditLogs } from './pages/AuditLogs';
import { VotingPage } from './pages/VotingPage';
import { Settings } from './pages/Settings';
import { LoginPage } from './pages/LoginPage';
import { Notifications } from './pages/Notifications';
import { VoterRegistry } from './pages/VoterRegistry';
import { ElectionsPage } from './pages/admin/ElectionsPage';
import { CreateElectionPage } from './pages/admin/CreateElectionPage';
import { ElectionDetailsPage } from './pages/admin/ElectionDetailsPage';
import soutakEmblem from './assets/soutak-emblem.png';

type Tab =
  | 'Dashboard'
  | 'Voter Registry'
  | 'Elections'
  | 'Create Election'
  | 'Election Details'
  | 'Voting'
  | 'Results'
  | 'Audit Logs'
  | 'Settings'
  | 'Notifications';

const sensitiveResultsAdminRoles = new Set(['super_admin', 'auditor']);
const electionManagerAdminRoles = new Set(['super_admin', 'election_admin']);

function SoutakMark({ className = 'h-11 w-11' }: { className?: string }) {
  return (
    <img src={soutakEmblem} alt="" className={cn('object-contain', className)} aria-hidden="true" />
  );
}

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
  const [adminVoters, setAdminVoters] = React.useState<any[]>([]);
  const [votersLoading, setVotersLoading] = React.useState(false);
  const [voterSearchQuery, setVoterSearchQuery] = React.useState('');
  const [selectedElectionId, setSelectedElectionId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const mobileShell = useMobileShell();

  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/admin';
  const isAdmin = userProfile?.role === 'admin';
  const normalizedAdminRole = String(userProfile?.adminRole || '').toLowerCase();
  const canViewSensitiveResults = !isAdmin
    ? false
    : normalizedAdminRole
      ? sensitiveResultsAdminRoles.has(normalizedAdminRole)
      : true;
  const canManageElectionData = !isAdmin
    ? false
    : normalizedAdminRole
      ? electionManagerAdminRoles.has(normalizedAdminRole)
      : true;
  const isNativeApp = Capacitor.isNativePlatform();
  const showAdminShell = Boolean(isAdmin && !isNativeApp && isAdminRoute);
  const selectedElection = dbElections.find((election) => election.id === selectedElectionId) || null;
  const voterBoundElection =
    (!isAdmin && userProfile?.electionId
      ? dbElections.find((election) => election.id === userProfile.electionId)
      : null) || null;
  const activeVotingElection =
    voterBoundElection ||
    dbElections.find((election) => ['active', 'scheduled'].includes(String(election.status))) ||
    dbElections[0];
  const countdownElection = activeVotingElection || selectedElection || dbElections[0] || null;

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
              ? 'إدارة النظام متاحة عبر الموقع فقط. استخدم هذا التطبيق كناخب عبر سند.'
              : 'System admin is available only on the website. Use this app as a voter via SANAD.',
          );
          setIsAuthReady(true);
          return;
        }

        if (!Capacitor.isNativePlatform() && isAdminRoute && profile.role !== 'admin') {
          clearAuthToken();
          setLoginError(
            language === 'ar'
              ? 'هذا الرابط مخصص لدخول الأدمن فقط. سجّل الدخول بحساب أدمن.'
              : 'This route is for admin sign-in only. Sign in with an admin account.',
          );
          setIsAuthReady(true);
          return;
        }

        if (!Capacitor.isNativePlatform() && profile.role === 'admin' && !isAdminRoute) {
          window.history.replaceState(null, '', '/admin');
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
  }, [isAdminRoute, language]);

  const loadElections = React.useCallback(async () => {
    const shouldLoadAdminElections =
      user?.role === 'admin' || userProfile?.role === 'admin' || (!Capacitor.isNativePlatform() && isAdminRoute);
    const elections = shouldLoadAdminElections ? await fetchAdminElections() : await fetchElections();
    setDbElections(Array.isArray(elections) ? elections : []);
  }, [isAdminRoute, user?.role, userProfile?.role]);

  const loadVoters = React.useCallback(async () => {
    setVotersLoading(true);
    try {
      const voters = await fetchVoters();
      setAdminVoters(voters);
    } finally {
      setVotersLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!user) return;
    const jobs = [loadElections()];
    if (user.role === 'admin') {
      jobs.push(loadVoters());
    }

    Promise.all(jobs).catch((error) => {
      console.error('Failed to load admin data', error);
    });
  }, [user, loadElections, loadVoters]);

  React.useEffect(() => {
    if (!showAdminShell) return;
    if (!['Elections', 'Create Election', 'Election Details'].includes(activeTab)) return;

    loadElections().catch((error) => {
      console.error('Failed to refresh elections for admin shell', error);
    });
  }, [activeTab, loadElections, showAdminShell]);

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
    if (profile.role === 'admin' && !Capacitor.isNativePlatform() && !isAdminRoute) {
      window.history.replaceState(null, '', '/admin');
    }
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
            ? 'إدارة النظام متاحة عبر الموقع فقط. سجّل الدخول كناخب عبر سند من هذا التطبيق.'
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

  const handleAdminPasswordLogin = async (email: string, password: string) => {
    try {
      setIsLoginLoading(true);
      setLoginError(null);
      const result = await loginAdminWithBackend(email, password);
      applyAuthenticatedUser(result);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Admin login failed');
      throw error;
    } finally {
      setIsLoginLoading(false);
    }
  };

  const performLogout = () => {
    clearAuthToken();
    setUser(null);
    setUserProfile(null);
    setActiveTab(Capacitor.isNativePlatform() ? 'Voting' : 'Dashboard');
  };

  const handleSidebarLogout = () => {
    const confirmed = window.confirm(
      language === 'ar'
        ? 'هل أنت متأكد من تسجيل الخروج؟ سيتم إنهاء الجلسة الحالية.'
        : 'Are you sure you want to log out? The current session will end.',
    );
    if (!confirmed) return;
    performLogout();
  };

  React.useEffect(() => {
    if (!showAdminShell) return;

    if ((activeTab === 'Results' || activeTab === 'Audit Logs') && !canViewSensitiveResults) {
      setActiveTab('Dashboard');
      return;
    }

    if ((activeTab === 'Create Election' || activeTab === 'Election Details') && !canManageElectionData) {
      setActiveTab('Elections');
    }
  }, [activeTab, canManageElectionData, canViewSensitiveResults, showAdminShell]);

  React.useEffect(() => {
    if (!showAdminShell || activeTab !== 'Voter Registry') return;
    loadVoters().catch((error) => {
      console.error('Failed to refresh voters', error);
    });
  }, [activeTab, loadVoters, showAdminShell]);

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
          onAdminPasswordLogin={handleAdminPasswordLogin}
          onAdminGoogleLogin={handleAdminGoogleLogin}
          isLoading={isLoginLoading}
          error={loginError}
          language={language}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          adminOnly={isAdminRoute && !isNativeApp}
        />
      </ErrorBoundary>
    );
  }

  const adminSidebarItems = [
    { key: 'Voter Registry', label: language === 'ar' ? 'سجل الناخبين' : 'Voter Registry', icon: Users },
    { key: 'Dashboard', label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
    { key: 'Elections', label: language === 'ar' ? 'الانتخابات' : 'Elections', icon: FileText },
    ...(canViewSensitiveResults
      ? [
          { key: 'Results', label: language === 'ar' ? 'النتائج' : 'Results', icon: BarChart3 },
          { key: 'Audit Logs', label: language === 'ar' ? 'سجل العمليات' : 'Audit Logs', icon: Users },
        ]
      : []),
  ];

  const voterSidebarItems = [
    { key: 'Voting', label: language === 'ar' ? 'التصويت الإلكتروني' : 'Voting', icon: Vote },
    { key: 'Results', label: language === 'ar' ? 'النتائج النهائية' : 'Results', icon: BarChart3 },
    { key: 'Notifications', label: language === 'ar' ? 'الإشعارات' : 'Notifications', icon: Bell },
  ];

  const sidebarItems = showAdminShell ? adminSidebarItems : voterSidebarItems;

  const mappedTab: Tab =
    showAdminShell && (activeTab === 'Create Election' || activeTab === 'Election Details')
      ? 'Elections'
      : activeTab;

  const voterPrimaryTabs: Tab[] = ['Voting', 'Results', 'Notifications', 'Settings'];
  const adminPrimaryTabs: Tab[] = canViewSensitiveResults
    ? ['Dashboard', 'Voter Registry', 'Elections', 'Results', 'Settings']
    : ['Dashboard', 'Voter Registry', 'Elections', 'Settings'];
  const primaryTabs = showAdminShell ? adminPrimaryTabs : voterPrimaryTabs;

  const mobileNavItems = primaryTabs.map((tabKey) => {
    if (tabKey === 'Settings') {
      return { key: tabKey, label: language === 'ar' ? 'الإعدادات' : 'Settings', icon: SettingsIcon };
    }

    const def = sidebarItems.find((item) => item.key === tabKey);
    return {
      key: tabKey,
      label: def?.label || String(tabKey),
      icon: def?.icon || SettingsIcon,
    };
  });

  const useVoterTopNav = !showAdminShell && !mobileShell;
  const voterTopNavItems = [
    ...sidebarItems,
    { key: 'Settings', label: language === 'ar' ? 'الإعدادات' : 'Settings', icon: SettingsIcon },
  ];
  const headerNavItems = (
    useVoterTopNav
      ? voterTopNavItems
      : primaryTabs.map((tabKey) => {
          if (tabKey === 'Settings') {
            return { key: tabKey, label: language === 'ar' ? 'الإعدادات' : 'Settings', icon: SettingsIcon };
          }
          const def = sidebarItems.find((item) => item.key === tabKey);
          return { key: String(tabKey), label: def?.label || String(tabKey), icon: def?.icon };
        })
  ).map(({ key, label, icon }) => ({
    key: String(key),
    label,
    icon,
    active: mappedTab === key || activeTab === key,
    onClick: () => setActiveTab(key as Tab),
  }));

  return (
    <ErrorBoundary>
      <div
        className={cn(
          'app-shell flex min-h-dvh flex-col transition-[background-color,color,border-color] duration-300 md:min-h-screen md:flex-row',
          !showAdminShell && 'voter-web-shell',
        )}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <aside
          className={cn(
            'app-panel app-sidebar flex w-72 shrink-0 flex-col md:border-l',
            mobileShell || useVoterTopNav ? 'hidden' : 'hidden md:flex',
          )}
        >
          <div className="app-brand-card flex items-center gap-3 border-b border-slate-100 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-200">
              <SoutakMark className="h-11 w-11" />
            </div>
            <div className="text-right">
              <h1 className="font-black text-slate-900">{language === 'ar' ? 'صوتك' : 'Soutak'}</h1>
              <p className="text-xs font-bold text-blue-600">
                {language === 'ar' ? 'نظام الاقتراع الإلكتروني' : 'Electronic voting'}
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
              {showAdminShell && canViewSensitiveResults && (
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
            <div className="app-user-card rounded-lg border border-slate-100 bg-slate-50 p-4 text-right">
              <p className="font-black text-slate-900">{user.displayName}</p>
              <p className="mt-1 text-xs text-slate-500">
                {showAdminShell
                  ? language === 'ar'
                    ? 'مسؤول النظام'
                    : 'System Admin'
                  : language === 'ar'
                    ? 'ناخب مسجل'
                    : 'Registered Voter'}
              </p>
            </div>
            <button
              onClick={handleSidebarLogout}
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
          {!mobileShell && (
            <SiteHeader
              language={language}
              onToggleLanguage={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              theme={theme}
              onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              userDisplayName={user?.displayName}
              navItems={headerNavItems}
              hideNav={showAdminShell}
            />
          )}

          <div className={cn('app-content flex-1', mobileShell ? 'overflow-y-auto p-4' : 'p-8')}>
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    'mb-6 rounded-lg px-4 py-3 text-right text-sm font-bold',
                    toast.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                  )}
                >
                  {toast.message}
                </motion.div>
              )}
            </AnimatePresence>

            <ElectionCountdownCard election={countdownElection} language={language} />

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

            {showAdminShell && activeTab === 'Voter Registry' && (
              <VoterRegistry
                voters={adminVoters}
                searchQuery={voterSearchQuery}
                onSearchChange={setVoterSearchQuery}
                loading={votersLoading}
              />
            )}

            {showAdminShell && activeTab === 'Elections' && (
              <ElectionsPage
                elections={dbElections}
                language={language}
                setToast={setToast}
                canManageElectionData={canManageElectionData}
                onCreate={() => {
                  setSelectedElectionId(null);
                  setActiveTab('Create Election');
                }}
                onOpenDetails={(electionId) => {
                  setSelectedElectionId(electionId);
                  setActiveTab('Election Details');
                }}
                onEdit={(electionId) => {
                  setSelectedElectionId(electionId);
                  setActiveTab('Create Election');
                }}
                onRefresh={async () => {
                  await Promise.all([loadElections(), loadVoters()]);
                }}
              />
            )}

            {showAdminShell && activeTab === 'Create Election' && (
              <CreateElectionPage
                setToast={setToast}
                onCancel={() => {
                  setSelectedElectionId(null);
                  setActiveTab('Elections');
                }}
                initialElection={selectedElection}
                editingElectionId={selectedElectionId}
                canManageElectionData={canManageElectionData}
                onCreated={async (election) => {
                  await Promise.all([loadElections(), loadVoters()]);
                  setSelectedElectionId(election.id);
                  setActiveTab('Election Details');
                }}
                onDeleted={async () => {
                  setSelectedElectionId(null);
                  await Promise.all([loadElections(), loadVoters()]);
                  setActiveTab('Elections');
                }}
              />
            )}

            {showAdminShell && activeTab === 'Election Details' && selectedElectionId && (
              <ElectionDetailsPage
                electionId={selectedElectionId}
                setToast={setToast}
                canManageElectionData={canManageElectionData}
                onBack={() => setActiveTab('Elections')}
                onRefreshList={async () => {
                  await Promise.all([loadElections(), loadVoters()]);
                }}
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
                  setToast({
                    message: language === 'ar' ? 'تم تسجيل صوتك بنجاح' : 'Vote recorded',
                    type: 'success',
                  });
                  setTimeout(() => setToast(null), 2500);
                }}
              />
            )}

            {activeTab === 'Results' && (
              <Results
                isAdmin={showAdminShell && canViewSensitiveResults}
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
                onLogout={performLogout}
                canViewSensitiveResults={canViewSensitiveResults}
                canManageElectionData={canManageElectionData}
              />
            )}

            {activeTab === 'Notifications' && <Notifications language={language} />}
          </div>

          {!mobileShell && <SiteFooter language={language} />}
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
