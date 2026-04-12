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
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';
import {
  castVote,
  clearAuthToken,
  completeSanadLogin,
  fetchElections,
  fetchMe,
  getAuthToken,
  loginWithBackend,
} from './lib/api';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SidebarItem } from './components/layout/SidebarItem';
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
  const [language, setLanguage] = React.useState<'ar' | 'en'>('ar');
  const [user, setUser] = React.useState<any | null>(null);
  const [userProfile, setUserProfile] = React.useState<any | null>(null);
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  const [isLoginLoading, setIsLoginLoading] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [dbElections, setDbElections] = React.useState<any[]>([]);
  const [selectedElectionId, setSelectedElectionId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isAdmin = userProfile?.role === 'admin';
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
    const bootstrap = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setIsAuthReady(true);
          return;
        }

        const profile = await fetchMe();
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
    setDbElections(elections);
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

  const handleAdminLogin = async (email: string, password: string) => {
    try {
      setIsLoginLoading(true);
      setLoginError(null);
      const result = await loginWithBackend(email, password);
      applyAuthenticatedUser(result);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Admin login failed');
      throw error;
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
    setUserProfile(null);
    setActiveTab('Dashboard');
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
          onAdminLogin={handleAdminLogin}
          isLoading={isLoginLoading}
          error={loginError}
        />
      </ErrorBoundary>
    );
  }

  const sidebarItems = isAdmin
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

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-slate-50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <aside className="flex w-72 flex-col border-l border-slate-200 bg-white">
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
              {isAdmin && (
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
                {isAdmin ? (language === 'ar' ? 'مسؤول النظام' : 'System Admin') : language === 'ar' ? 'ناخب مسجل' : 'Registered Voter'}
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

        <main className="flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              {language === 'ar' ? 'English' : 'العربية'}
            </button>
            <div className="text-right">
              <h2 className="text-xl font-black text-slate-900">
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
              <p className="text-xs font-bold text-emerald-600">
                {language === 'ar' ? 'متصل بالنظام' : 'Connected'}
              </p>
            </div>
          </header>

          <div className="p-8">
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

            {activeTab === 'Dashboard' && (
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

            {activeTab === 'Elections' && (
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

            {activeTab === 'Create Election' && (
              <CreateElectionPage
                setToast={setToast}
                onCancel={() => setActiveTab('Elections')}
                initialElection={selectedElection}
                onCreated={async (election) => {
                  await loadElections();
                  setSelectedElectionId(election.id);
                  setActiveTab('Elections');
                }}
              />
            )}

            {activeTab === 'Election Details' && selectedElectionId && (
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
                isAdmin={isAdmin}
                setToast={setToast}
                language={language}
                elections={dbElections}
                preferredElectionId={!isAdmin ? activeVotingElection?.id : null}
              />
            )}

            {activeTab === 'Audit Logs' && <AuditLogs setToast={setToast} language={language} />}
            {activeTab === 'Settings' && (
              <Settings setToast={setToast} language={language} userProfile={userProfile} setUserProfile={setUserProfile} />
            )}
            {activeTab === 'Notifications' && <Notifications language={language} />}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
