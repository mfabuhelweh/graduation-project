import * as React from 'react';
import {
  Activity,
  BarChart3,
  BellRing,
  Loader2,
  PieChart as PieChartIcon,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
  Vote,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchDashboardSummary, resetSystemData } from '../lib/api';

interface DashboardProps {
  onReset: () => Promise<void>;
  onRefresh: () => void | Promise<void>;
  dbElections: any[];
  setToast: (toast: any) => void;
  language: string;
  showActions?: boolean;
  title?: string;
  subtitle?: string;
}

const emptySummary = {
  activeElection: null,
  totalVotes: 0,
  totalVoters: 0,
  turnout: 0,
  verifiedVoters: 0,
  votedVoters: 0,
  issuedTokens: 0,
  usedTokens: 0,
  districtTurnout: [],
  seatsDistribution: {
    totalSeats: 0,
    localSeats: 0,
    partySeats: 0,
    quotas: [],
  },
  topCandidates: [],
  leadingLists: [],
  demographics: {
    genderAvailable: false,
    ageAvailable: false,
    genderBreakdown: [],
    ageGroups: [],
  },
  systemHealth: {
    serverStatus: 'healthy',
    pendingVerificationRequests: 0,
    suspiciousAttempts: 0,
    blockedVoters: 0,
    securityAlerts: 0,
    activeVotingTokens: 0,
    tokenUsageRate: 0,
  },
  recentActivity: [],
  lastUpdatedAt: null,
};

const jordanGovernorates = [
  { id: 'irbid', name: 'إربد', aliases: ['اربد', 'إربد', 'irbid'] },
  { id: 'ajloun', name: 'عجلون', aliases: ['عجلون', 'ajloun'] },
  { id: 'jerash', name: 'جرش', aliases: ['جرش', 'jerash'] },
  { id: 'mafraq', name: 'المفرق', aliases: ['المفرق', 'mafraq'] },
  { id: 'amman', name: 'العاصمة', aliases: ['العاصمة', 'عمان', 'amman'] },
  { id: 'zarqa', name: 'الزرقاء', aliases: ['الزرقاء', 'zarqa'] },
  { id: 'balqa', name: 'البلقاء', aliases: ['البلقاء', 'السلط', 'balqa', 'salt'] },
  { id: 'madaba', name: 'مادبا', aliases: ['مادبا', 'madaba'] },
  { id: 'karak', name: 'الكرك', aliases: ['الكرك', 'karak'] },
  { id: 'tafileh', name: 'الطفيلة', aliases: ['الطفيلة', 'tafileh'] },
  { id: 'maan', name: 'معان', aliases: ['معان', 'maan'] },
  { id: 'aqaba', name: 'العقبة', aliases: ['العقبة', 'aqaba'] },
];

const governorateBarColors = ['#1f5aa9', '#2f75d6', '#5f97e4', '#8bb6ed', '#bcd4f6'];
const demographicColors = ['#1f5aa9', '#b88a2c', '#2f75d6', '#9f6f73', '#6b7280', '#cbd5e1'];

function normalizeGovernorateName(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function resolveGovernorateId(districtName: string) {
  const normalized = normalizeGovernorateName(districtName);
  const match = jordanGovernorates.find((governorate) =>
    governorate.aliases.some((alias) => normalized.includes(normalizeGovernorateName(alias))),
  );
  return match?.id || null;
}

function formatActivityLabel(event: string) {
  const normalized = String(event || '').toLowerCase();
  const labels: Record<string, string> = {
    election_created: 'تم إنشاء انتخاب جديد',
    election_updated: 'تم تحديث بيانات الانتخاب',
    election_deleted: 'تم حذف انتخاب',
    election_status_changed: 'تم تغيير حالة الانتخاب',
    vote_cast: 'تم تسجيل صوت جديد',
    voter_registered: 'تمت إضافة ناخب جديد',
    voter_face_verified: 'تم التحقق البيومتري من ناخب',
    voter_blocked: 'تم حظر ناخب',
    import_completed: 'اكتمل استيراد بيانات',
    import_rolled_back: 'تم التراجع عن دفعة استيراد',
  };

  if (labels[normalized]) {
    return labels[normalized];
  }

  return normalized.replace(/_/g, ' ') || 'نشاط جديد على النظام';
}

function formatActorLabel(actorType: string) {
  if (actorType === 'admin') return 'إداري';
  if (actorType === 'voter') return 'ناخب';
  return 'النظام';
}

function formatServerStatus(status: string) {
  if (status === 'critical') return 'حرجة';
  if (status === 'warning') return 'تحتاج متابعة';
  return 'مستقرة';
}

function getServerTone(status: string) {
  if (status === 'critical') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function getAlertTone(count: number, highThreshold = 1) {
  if (count >= highThreshold) return 'border-rose-200 bg-rose-50 text-rose-700';
  if (count > 0) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function formatTime(value: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' });
}

export const Dashboard = ({
  onReset,
  onRefresh,
  dbElections,
  setToast,
  showActions = true,
  title = 'لوحة التحكم',
  subtitle = 'ملخص حي لبيانات الاقتراع',
}: DashboardProps) => {
  const [summary, setSummary] = React.useState<any>(emptySummary);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const shouldLoadRemoteSummary = showActions;

  const load = React.useCallback(async () => {
    if (!shouldLoadRemoteSummary) {
      const activeElection =
        dbElections.find((election) => String(election?.status) === 'active') ||
        dbElections.find((election) => String(election?.status) === 'closed') ||
        dbElections[0] ||
        null;
      const totalVotes = Number(activeElection?.ballotsCount || 0);
      const totalVoters = Number(activeElection?.votersCount || 0);

      setSummary({
        ...emptySummary,
        activeElection,
        totalVotes,
        totalVoters,
        turnout: totalVoters > 0 ? Number(((totalVotes / totalVoters) * 100).toFixed(1)) : 0,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetchDashboardSummary();
      setSummary({ ...emptySummary, ...response });
    } finally {
      setLoading(false);
    }
  }, [dbElections, shouldLoadRemoteSummary]);

  React.useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([onRefresh(), load()]);
      setToast({ message: 'تم تحديث لوحة التحكم', type: 'success' });
      setTimeout(() => setToast(null), 2000);
    } finally {
      setRefreshing(false);
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      'تحذير: سيتم حذف جميع بيانات الاقتراع (الأصوات، التوكنات، سجلات التحقق) مع الإبقاء على الانتخابات والمرشحين والناخبين.\n\nهل أنت متأكد من المتابعة؟',
    );
    if (!confirmed) return;
    setResetting(true);
    try {
      await resetSystemData();
      await load();
      await onRefresh();
      setToast({ message: 'تمت إعادة تهيئة بيانات الاقتراع بنجاح', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'فشل في إعادة التهيئة', type: 'error' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setResetting(false);
    }
  };

  const governorateStats = React.useMemo(() => {
    const grouped = new Map<string, { id: string; name: string; districtCount: number; votes: number; registeredVoters: number; turnout: number }>();

    jordanGovernorates.forEach((governorate) => {
      grouped.set(governorate.id, {
        id: governorate.id,
        name: governorate.name,
        districtCount: 0,
        votes: 0,
        registeredVoters: 0,
        turnout: 0,
      });
    });

    for (const district of summary?.districtTurnout || []) {
      const governorateId = resolveGovernorateId(String(district?.name || district?.districtName || ''));
      if (!governorateId) continue;
      const current = grouped.get(governorateId);
      if (!current) continue;
      current.districtCount += 1;
      current.votes += Number(district?.votes || 0);
      current.registeredVoters += Number(district?.registeredVoters || 0);
      current.turnout = current.registeredVoters
        ? Number(((current.votes / current.registeredVoters) * 100).toFixed(1))
        : 0;
    }

    return jordanGovernorates.map((governorate) => ({
      ...governorate,
      ...grouped.get(governorate.id),
    }));
  }, [summary?.districtTurnout]);

  const topGovernorates = React.useMemo(
    () =>
      governorateStats
        .filter((governorate) => governorate.registeredVoters > 0)
        .sort((left, right) => right.turnout - left.turnout || right.votes - left.votes)
        .slice(0, 5),
    [governorateStats],
  );

  const demographicChartData = React.useMemo(() => {
    const genderBreakdown = summary?.demographics?.genderBreakdown || [];
    if (genderBreakdown.length) {
      return genderBreakdown;
    }
    return summary?.demographics?.ageGroups || [];
  }, [summary?.demographics]);

  const demographicChartTitle = summary?.demographics?.genderBreakdown?.length
    ? 'التوزيع الديموغرافي حسب الجنس'
    : 'التوزيع الديموغرافي حسب العمر';

  const leadingLists = React.useMemo(
    () =>
      (summary?.leadingLists || []).map((entry: any) => ({
        ...entry,
        voteShare: summary?.totalVotes
          ? Number(((Number(entry?.votes || 0) / Number(summary.totalVotes || 1)) * 100).toFixed(1))
          : 0,
      })),
    [summary?.leadingLists, summary?.totalVotes],
  );

  const systemHealth = summary?.systemHealth || emptySummary.systemHealth;
  const recentActivity = summary?.recentActivity || [];
  const liveStatusActive = String(summary?.activeElection?.status || '').toLowerCase() === 'active';

  const alertCards = [
    {
      id: 'server',
      label: 'حالة السيرفرات',
      value: formatServerStatus(systemHealth.serverStatus),
      hint: summary?.lastUpdatedAt ? `آخر مزامنة ${formatTime(summary.lastUpdatedAt)}` : 'يتم التحديث مباشرة',
      tone: getServerTone(systemHealth.serverStatus),
      icon: <Server className="h-4 w-4" />,
    },
    {
      id: 'verification',
      label: 'طلبات التحقق قيد الانتظار',
      value: systemHealth.pendingVerificationRequests,
      hint: 'طلبات تحتاج متابعة من فريق الإدارة',
      tone: getAlertTone(Number(systemHealth.pendingVerificationRequests || 0), 5),
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      id: 'security',
      label: 'تنبيهات الأمان',
      value: systemHealth.securityAlerts,
      hint: `${systemHealth.suspiciousAttempts || 0} محاولات حساسة و ${systemHealth.blockedVoters || 0} حالات حظر`,
      tone: getAlertTone(Number(systemHealth.securityAlerts || 0), 1),
      icon: <ShieldAlert className="h-4 w-4" />,
    },
    {
      id: 'tokens',
      label: 'الرموز النشطة',
      value: systemHealth.activeVotingTokens,
      hint: `معدل استخدام التوكنات ${Number(systemHealth.tokenUsageRate || 0).toFixed(1)}%`,
      tone: getAlertTone(0),
      icon: <Vote className="h-4 w-4" />,
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="text-right">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <span className={`h-2.5 w-2.5 rounded-full bg-emerald-500 ${liveStatusActive ? 'animate-pulse' : ''}`} />
              {liveStatusActive ? 'نظام الاقتراع نشط - بيانات مباشرة' : 'النظام غير نشط حالياً'}
            </span>
            {summary?.lastUpdatedAt && (
              <span className="text-xs font-bold text-slate-400">
                آخر تحديث: {formatTime(summary.lastUpdatedAt)}
              </span>
            )}
          </div>
          <h2 className="mt-3 text-2xl font-black text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>

        {showActions && (
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
            >
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              إعادة تهيئة
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['الأصوات المُسجلة', summary.totalVotes, <Vote className="h-5 w-5" />],
          ['الناخبون المسجلون', summary.totalVoters, <Users className="h-5 w-5" />],
          ['نسبة الاقتراع', `${Number(summary.turnout || 0).toFixed(1)}%`, <TrendingUp className="h-5 w-5" />],
          ['التحقق البيومتري', summary.verifiedVoters, <ShieldCheck className="h-5 w-5" />],
        ].map(([label, value, icon]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-slate-50 p-3 text-blue-600">{icon}</div>
              <div>
                <p className="text-xs font-bold text-slate-400">{label}</p>
                <p className="mt-3 text-3xl font-black text-slate-900">{value as React.ReactNode}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr,0.75fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="text-right">
                <h3 className="text-lg font-black text-slate-900">أعلى 5 محافظات في نسبة التصويت</h3>
                <p className="mt-1 text-sm text-slate-500">
                  مقارنة مباشرة تسهّل قراءة الترتيب من الأعلى مشاركةً إلى الأقل بدل العرض الجغرافي التقليدي.
                </p>
              </div>
            </div>

            {topGovernorates.length ? (
              <div className="mt-6 h-[340px] w-full">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={[...topGovernorates].reverse()} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tickLine={false} axisLine={false} unit="%" />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={82} />
                    <Tooltip
                      formatter={(value: number, _name: string, payload: any) => [
                        `${Number(value || 0).toFixed(1)}%`,
                        `${payload?.payload?.votes || 0} صوت من أصل ${payload?.payload?.registeredVoters || 0}`,
                      ]}
                      cursor={{ fill: 'rgba(31, 90, 169, 0.06)' }}
                    />
                    <Bar dataKey="turnout" radius={[10, 10, 10, 10]} barSize={26}>
                      {topGovernorates.map((entry: any, index: number) => (
                        <Cell key={entry.id} fill={governorateBarColors[index] || governorateBarColors.at(-1) || '#1f5aa9'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-6 text-right text-sm font-bold text-slate-500">
                لا توجد بيانات كافية لعرض مقارنة المحافظات بعد.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr,1.05fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <PieChartIcon className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-black text-slate-900">{demographicChartTitle}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    مخطط دائري يوضح طبيعة المشاركين الحاليين، مع ملخص إضافي للفئات العمرية أسفل الرسم.
                  </p>
                </div>
              </div>

              {demographicChartData.length ? (
                <div className="mt-5">
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={demographicChartData}
                          dataKey="count"
                          nameKey="label"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={3}
                        >
                          {demographicChartData.map((entry: any, index: number) => (
                            <Cell key={entry.key || entry.label} fill={demographicColors[index] || demographicColors.at(-1) || '#1f5aa9'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value} ناخب`, 'عدد المشاركين']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {demographicChartData.map((entry: any, index: number) => (
                      <div key={entry.key || entry.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-right">
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: demographicColors[index] || demographicColors.at(-1) || '#1f5aa9' }}
                          />
                          <div>
                            <p className="text-sm font-black text-slate-900">{entry.label}</p>
                            <p className="mt-1 text-xs font-bold text-slate-500">{entry.count} ناخب</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-right text-sm font-bold leading-relaxed text-amber-800">
                  بيانات الديموغرافيا غير متوفرة حالياً، وسيظهر المخطط تلقائياً عند توفر الجنس أو تاريخ الميلاد في سجلات الناخبين.
                </div>
              )}

              {!!summary?.demographics?.ageGroups?.length && (
                <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-black text-slate-900">ملخص الفئات العمرية</p>
                    <p className="text-xs font-bold text-slate-400">توزيع المشاركين</p>
                  </div>
                  <div className="space-y-3">
                    {summary.demographics.ageGroups.map((entry: any) => {
                      const ratio = demographicChartData.length
                        ? Math.max(...summary.demographics.ageGroups.map((item: any) => Number(item.count || 0)))
                        : 0;
                      return (
                        <div key={entry.key} className="text-right">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-black text-slate-900">{entry.label}</span>
                            <span className="text-xs font-bold text-slate-500">{entry.count}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-white">
                            <div
                              className="h-2 rounded-full bg-blue-600"
                              style={{ width: `${ratio ? (Number(entry.count || 0) / ratio) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <Vote className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-black text-slate-900">توزيع المقاعد والقوائم المتصدرة</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    بطاقات سريعة توضّح بنية المقاعد الحالية وأبرز القوائم التي تتقدم في النتائج الأولية.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right">
                  <p className="text-xs font-bold text-slate-400">المقاعد المحلية</p>
                  <p className="mt-2 text-3xl font-black text-emerald-600">{summary.seatsDistribution?.localSeats || 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right">
                  <p className="text-xs font-bold text-slate-400">مقاعد الأحزاب</p>
                  <p className="mt-2 text-3xl font-black text-blue-600">{summary.seatsDistribution?.partySeats || 0}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-900">القوائم المتصدرة حالياً</p>
                  <p className="text-xs font-bold text-slate-400">حصة من إجمالي الأصوات</p>
                </div>

                <div className="mt-4 space-y-3">
                  {leadingLists.length ? (
                    leadingLists.map((entry: any, index: number) => (
                      <div key={entry.id || `${entry.name}-${index}`} className="rounded-xl border border-white bg-white p-4 text-right shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-left">
                            <p className="text-lg font-black text-blue-600">{entry.voteShare}%</p>
                            <p className="mt-1 text-xs text-slate-500">{entry.votes} صوت</p>
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{entry.name}</p>
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {entry.type === 'party' ? 'قائمة حزبية' : 'قائمة محلية'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{ width: `${Math.min(100, Number(entry.voteShare || 0))}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm font-bold text-slate-500">
                      لا توجد قوائم متقدمة يمكن عرضها بعد.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <Server className="h-5 w-5" />
              </div>
              <div className="text-right">
                <h3 className="text-lg font-black text-slate-900">حالة النظام والتنبيهات</h3>
                <p className="mt-1 text-sm text-slate-500">
                  مؤشرات تقنية فورية لمتابعة الاستقرار، التحقق المعلق، ومحاولات الوصول الحساسة.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {alertCards.map((card) => (
                <div key={card.id} className={`rounded-2xl border p-4 text-right ${card.tone}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-xl bg-white/70 p-2">{card.icon}</div>
                    <div>
                      <p className="text-xs font-bold opacity-80">{card.label}</p>
                      <p className="mt-2 text-2xl font-black">{card.value}</p>
                      <p className="mt-1 text-xs font-bold opacity-80">{card.hint}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <BellRing className="h-5 w-5" />
              </div>
              <div className="text-right">
                <h3 className="text-lg font-black text-slate-900">آخر الأنشطة</h3>
                <p className="mt-1 text-sm text-slate-500">
                  موجز سريع لآخر العمليات التي التقطها النظام ليسهل على الأدمن متابعة الحركة أولاً بأول.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {recentActivity.length ? (
                recentActivity.map((activity: any, index: number) => (
                  <div key={activity.id || `${activity.event}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right">
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-xl bg-white p-2 text-blue-600 shadow-sm">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{formatActivityLabel(activity.event)}</p>
                        <div className="mt-1 flex flex-wrap items-center justify-end gap-2 text-xs font-bold text-slate-500">
                          <span>{formatActorLabel(activity.actorType)}</span>
                          <span>•</span>
                          <span>{formatTime(activity.time)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  لا توجد أنشطة حديثة لعرضها حالياً.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
