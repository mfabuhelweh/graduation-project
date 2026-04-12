import * as React from 'react';
import { Loader2, RefreshCw, ShieldCheck, TrendingUp, Users, Vote } from 'lucide-react';
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
  seatsDistribution: {
    totalSeats: 0,
    localSeats: 0,
    partySeats: 0,
    quotas: [],
  },
  topCandidates: [],
};

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
      'تحذير: سيتم حذف جميع بيانات الاقتراع (الأصوات، التوكنات، سجلات التحقق) مع الإبقاء على الانتخابات والمرشحين والناخبين.\n\nهل أنت متأكد من المتابعة؟'
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

  const chartData = summary.hourlyVotes?.length ? summary.hourlyVotes : [{ time: '--', votes: 0 }];

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-row-reverse items-start justify-between gap-4">
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-900">{title}</h2>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr,1fr]">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-right">
            <h3 className="text-lg font-black text-slate-900">نشاط التصويت بالساعة</h3>
            <p className="mt-1 text-sm text-slate-500">مأخوذ من جدول ballots حسب وقت الإرسال.</p>
          </div>
          <div className="mt-6 h-[320px] w-full">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="votes" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
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
                <p className="mt-2 text-2xl font-black text-emerald-600">
                  {summary.seatsDistribution?.localSeats || 0}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">الأحزاب الوطنية</p>
                <p className="mt-2 text-2xl font-black text-blue-600">
                  {summary.seatsDistribution?.partySeats || 0}
                </p>
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
