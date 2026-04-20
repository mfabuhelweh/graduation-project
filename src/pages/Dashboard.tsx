import * as React from 'react';
import {
  Activity,
  Loader2,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  Vote,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
  hourlyVotes: [],
  districtTurnout: [],
  seatsDistribution: {
    totalSeats: 0,
    localSeats: 0,
    partySeats: 0,
    quotas: [],
  },
  topCandidates: [],
  lastUpdatedAt: null,
};

const jordanGovernorates = [
  { id: 'irbid', name: 'إربد', aliases: ['اربد', 'إربد', 'irbid'], top: '10%', right: '18%' },
  { id: 'ajloun', name: 'عجلون', aliases: ['عجلون', 'ajloun'], top: '18%', right: '23%' },
  { id: 'jerash', name: 'جرش', aliases: ['جرش', 'jerash'], top: '24%', right: '19%' },
  { id: 'mafraq', name: 'المفرق', aliases: ['المفرق', 'mafraq'], top: '16%', right: '6%' },
  { id: 'amman', name: 'العاصمة', aliases: ['العاصمة', 'عمان', 'amman'], top: '38%', right: '20%' },
  { id: 'zarqa', name: 'الزرقاء', aliases: ['الزرقاء', 'zarqa'], top: '35%', right: '9%' },
  { id: 'balqa', name: 'البلقاء', aliases: ['البلقاء', 'balqa', 'salt', 'السلط'], top: '40%', right: '30%' },
  { id: 'madaba', name: 'مادبا', aliases: ['مادبا', 'madaba'], top: '50%', right: '24%' },
  { id: 'karak', name: 'الكرك', aliases: ['الكرك', 'karak'], top: '62%', right: '25%' },
  { id: 'tafileh', name: 'الطفيلة', aliases: ['الطفيلة', 'tafileh'], top: '72%', right: '22%' },
  { id: 'maan', name: 'معان', aliases: ['معان', 'maan'], top: '82%', right: '16%' },
  { id: 'aqaba', name: 'العقبة', aliases: ['العقبة', 'aqaba'], top: '92%', right: '22%' },
];

function getTurnoutTone(turnout: number) {
  if (turnout >= 65) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (turnout >= 40) return 'border-blue-200 bg-blue-50 text-blue-700';
  if (turnout > 0) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-white text-slate-500';
}

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

function buildExpectedHourlyData(summary: any, chartData: Array<{ time: string; votes: number }>) {
  const activeElection = summary?.activeElection;
  const startAt = activeElection?.startAt ? new Date(activeElection.startAt) : null;
  const endAt = activeElection?.endAt ? new Date(activeElection.endAt) : null;

  const hasRange = startAt && endAt && !Number.isNaN(startAt.getTime()) && !Number.isNaN(endAt.getTime());
  if (!hasRange || !summary?.totalVoters) {
    return chartData.map((entry) => ({ ...entry, expectedVotes: Math.round(summary?.totalVotes / Math.max(chartData.length, 1)) || 0 }));
  }

  const durationHours = Math.max(1, Math.ceil((endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60)));
  const targetTurnout = 0.6;
  const expectedVotesPerHour = Math.round((Number(summary.totalVoters || 0) * targetTurnout) / durationHours);

  return chartData.map((entry) => ({
    ...entry,
    expectedVotes: expectedVotesPerHour,
  }));
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
  const [showExpectedAverage, setShowExpectedAverage] = React.useState(true);
  const [hoveredGovernorateId, setHoveredGovernorateId] = React.useState<string | null>(null);
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
      setSummary(response);
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
      'تحذير: سيتم حذف جميع بيانات الاقتراع (الأصوات، التوكِنات، سجلات التحقق) مع الإبقاء على الانتخابات والمرشحين والناخبين.\n\nهل أنت متأكد من المتابعة؟',
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

  const chartDataBase = React.useMemo(
    () =>
      (summary.hourlyVotes?.length ? summary.hourlyVotes : [{ time: '--', votes: 0 }]).map((entry: any) => ({
        time: entry.time,
        votes: Number(entry.votes || 0),
      })),
    [summary.hourlyVotes],
  );
  const chartData = React.useMemo(() => buildExpectedHourlyData(summary, chartDataBase), [summary, chartDataBase]);

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

  const hoveredGovernorate =
    governorateStats.find((governorate) => governorate.id === hoveredGovernorateId) || null;
  const liveStatusActive = String(summary?.activeElection?.status || '').toLowerCase() === 'active';

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
              {liveStatusActive ? 'نظام الاقتراع نشط - بيانات مباشرة' : 'النظام غير نشط حاليًا'}
            </span>
            {summary?.lastUpdatedAt && (
              <span className="text-xs font-bold text-slate-400">
                آخر تحديث: {new Date(summary.lastUpdatedAt).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
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
          ['الأصوات المفرزة', summary.totalVotes, <Vote className="h-5 w-5" />],
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,1.1fr,0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <MapPinned className="h-5 w-5" />
            </div>
            <div className="text-right">
              <h3 className="text-lg font-black text-slate-900">خريطة المحافظات التفاعلية</h3>
              <p className="mt-1 text-sm text-slate-500">مرّر المؤشر فوق أي محافظة لرؤية نسبة الاقتراع وعدد الدوائر.</p>
            </div>
          </div>

          <div className="relative mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,#f8fbff,transparent_55%),linear-gradient(180deg,#f8fafc,#eef4ff)] p-4">
            <div className="relative h-[380px] rounded-[24px] border border-dashed border-slate-200 bg-white/70">
              <div className="absolute inset-[10%] rounded-[38%_48%_44%_50%] bg-[linear-gradient(180deg,rgba(59,130,246,0.08),rgba(15,23,42,0.02))]" />

              {governorateStats.map((governorate) => (
                <button
                  key={governorate.id}
                  type="button"
                  onMouseEnter={() => setHoveredGovernorateId(governorate.id)}
                  onMouseLeave={() => setHoveredGovernorateId((current) => (current === governorate.id ? null : current))}
                  onFocus={() => setHoveredGovernorateId(governorate.id)}
                  onBlur={() => setHoveredGovernorateId((current) => (current === governorate.id ? null : current))}
                  className={`absolute min-w-[88px] -translate-y-1/2 rounded-2xl border px-3 py-2 text-right shadow-sm transition-all hover:-translate-y-[56%] ${getTurnoutTone(governorate.turnout)}`}
                  style={{ top: governorate.top, right: governorate.right }}
                >
                  <p className="text-xs font-black">{governorate.name}</p>
                  <p className="mt-1 text-[11px] font-bold">{governorate.turnout}%</p>
                </button>
              ))}

              {hoveredGovernorate && (
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div className="text-right">
                      <h4 className="font-black text-slate-900">{hoveredGovernorate.name}</h4>
                      <p className="mt-1 text-sm text-slate-500">لمحة سريعة عن المحافظة المختارة</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-3 text-right">
                      <p className="text-xs text-slate-400">نسبة الاقتراع</p>
                      <p className="mt-2 text-lg font-black text-slate-900">{hoveredGovernorate.turnout}%</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-right">
                      <p className="text-xs text-slate-400">عدد الدوائر</p>
                      <p className="mt-2 text-lg font-black text-slate-900">{hoveredGovernorate.districtCount}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-right">
                      <p className="text-xs text-slate-400">الأصوات الحالية</p>
                      <p className="mt-2 text-lg font-black text-slate-900">{hoveredGovernorate.votes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExpectedAverage((current) => !current)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  showExpectedAverage
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {showExpectedAverage ? 'إخفاء المعدل المتوقع' : 'مقارنة مع المعدل المتوقع'}
              </button>
            </div>
            <div className="w-full text-right">
              <h3 className="text-lg font-black text-slate-900">نشاط التصويت بالساعة</h3>
              <p className="mt-1 text-sm text-slate-500">
                يعرض المسار الأزرق النشاط الفعلي، ويمكن مقارنة الأداء مع متوسط إقبال متوقع لكل ساعة.
              </p>
            </div>
          </div>

          <div className="mt-6 h-[320px] w-full">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="votes" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                {showExpectedAverage && (
                  <Line
                    type="monotone"
                    dataKey="expectedVotes"
                    stroke="#f59e0b"
                    strokeDasharray="6 6"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-right">
            <h3 className="text-lg font-black text-slate-900">توزيع المقاعد</h3>
            <div className="mt-5 space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">القوائم المحلية</p>
                <p className="mt-2 text-2xl font-black text-emerald-600">{summary.seatsDistribution?.localSeats || 0}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">الأحزاب الوطنية</p>
                <p className="mt-2 text-2xl font-black text-blue-600">{summary.seatsDistribution?.partySeats || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-right">
            <h3 className="text-lg font-black text-slate-900">أعلى المرشحين والقوائم</h3>
            <div className="mt-4 space-y-3">
              {(summary.topCandidates || []).slice(0, 6).map((candidate: any, index: number) => (
                <div
                  key={candidate.id || `${candidate.name}-${candidate.kind}-${index}`}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="font-black text-slate-900">{candidate.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{candidate.listName || candidate.kind}</p>
                  <p className="mt-2 text-lg font-black text-blue-600">{candidate.votes}</p>
                </div>
              ))}

              {!summary.topCandidates?.length && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  لا توجد أصوات مفرزة بعد.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
