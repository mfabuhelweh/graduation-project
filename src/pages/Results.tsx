import * as React from 'react';
import { BarChart3, Lock, MapPinned, RefreshCw, Trophy, UserRound, Users, Vote } from 'lucide-react';
import { fetchResults } from '../lib/api';
import { Dashboard } from './Dashboard';

interface ResultsProps {
  isAdmin: boolean;
  setToast: (toast: any) => void;
  language: string;
  elections?: any[];
  preferredElectionId?: string | null;
}

const resultsVisibleStatuses = new Set(['active', 'closed', 'archived']);

function toMetric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toTimestamp(election: any) {
  const candidate = election?.updatedAt || election?.endAt || election?.startAt || election?.createdAt;
  const parsed = candidate ? new Date(candidate).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickResultsElection(elections: any[], preferredElectionId?: string | null) {
  const preferredElection = preferredElectionId
    ? elections.find((election) => election?.id === preferredElectionId)
    : null;

  if (preferredElection) {
    return preferredElection;
  }

  const pool = elections.filter((election) => resultsVisibleStatuses.has(String(election?.status)));
  const candidates = (pool.length ? pool : elections).filter(Boolean);

  if (!candidates.length) {
    return null;
  }

  return [...candidates].sort((left, right) => {
    const ballotsDiff = toMetric(right?.ballotsCount) - toMetric(left?.ballotsCount);
    if (ballotsDiff !== 0) return ballotsDiff;

    const votersDiff = toMetric(right?.votersCount) - toMetric(left?.votersCount);
    if (votersDiff !== 0) return votersDiff;

    const listsDiff = toMetric(right?.districtListsCount) - toMetric(left?.districtListsCount);
    if (listsDiff !== 0) return listsDiff;

    return toTimestamp(right) - toTimestamp(left);
  })[0];
}

export const Results = ({ isAdmin, setToast, elections = [], preferredElectionId }: ResultsProps) => {
  const [view, setView] = React.useState<'general' | 'local'>('general');
  const [results, setResults] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const activeElection = React.useMemo(
    () => pickResultsElection(elections, preferredElectionId),
    [elections, preferredElectionId],
  );
  const isGeneralLocked =
    !isAdmin &&
    activeElection?.status === 'active' &&
    !activeElection?.allowResultsVisibilityBeforeClose;

  const load = React.useCallback(async () => {
    if (!activeElection?.id || isGeneralLocked) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetchResults(activeElection.id);
      setResults(response);
    } catch (error) {
      setResults(null);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to load election results',
        type: 'error',
      });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  }, [activeElection?.id, isGeneralLocked, setToast]);

  React.useEffect(() => {
    load();
  }, [load]);

  const rows = view === 'general' ? results?.parties || [] : results?.districtLists || [];
  const demographics = results?.analytics?.demographics || {};
  const genderBreakdown = demographics.genderBreakdown || [];
  const ageGroups = demographics.ageGroups || [];
  const districtTurnout = React.useMemo(() => {
    const analyticsDistrictTurnout = results?.analytics?.districtTurnout || [];
    if (analyticsDistrictTurnout.length) {
      return analyticsDistrictTurnout;
    }

    const grouped = new Map<string, { id: string; name: string; registeredVoters: number; votes: number; turnout: number }>();
    for (const row of results?.districtLists || []) {
      const districtName = String(row?.districtName || '').trim();
      if (!districtName) continue;

      const current = grouped.get(districtName) || {
        id: districtName,
        name: districtName,
        registeredVoters: 0,
        votes: 0,
        turnout: 0,
      };

      current.votes += Number(row?.votes || 0);
      grouped.set(districtName, current);
    }

    return [...grouped.values()].sort((left, right) => right.votes - left.votes || left.name.localeCompare(right.name, 'ar'));
  }, [results]);
  const votedDistrictsCount = districtTurnout.filter((district: any) => Number(district?.votes || 0) > 0).length;
  const topDistrict = districtTurnout[0] || null;

  const maxVotes = React.useMemo(
    () => rows.reduce((highest: number, row: any) => Math.max(highest, Number(row?.votes || 0)), 1),
    [rows],
  );

  const touchBtn =
    'touch-manipulation inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-100 md:min-h-0 md:py-2';
  const touchBtnPrimary =
    'touch-manipulation inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 active:opacity-90 sm:w-auto md:min-h-0 md:py-2';

  return (
    <div className="space-y-5 md:space-y-6" dir="rtl">
      {isGeneralLocked && (
        <Dashboard
          onReset={async () => {}}
          onRefresh={async () => {}}
          dbElections={elections}
          setToast={setToast}
          language="ar"
          showActions={false}
          title="ملخص الاقتراع"
          subtitle="بيانات عامة متاحة للناخبين أثناء فترة التصويت"
        />
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm md:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="rounded-xl bg-slate-50 p-2.5 text-blue-600 md:p-3">
                <Vote className="h-5 w-5 md:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 md:text-xs">إجمالي المصوتين</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-slate-900 md:mt-3 md:text-3xl">
                  {results?.totalVotes || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm md:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="rounded-xl bg-slate-50 p-2.5 text-emerald-600 md:p-3">
                <MapPinned className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 md:text-xs">دوائر فيها تصويت</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-slate-900 md:mt-3 md:text-3xl">{votedDistrictsCount}</p>
              </div>
            </div>
          </div>

          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm md:col-span-1 md:p-5 xl:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <div className="rounded-xl bg-slate-50 p-2.5 text-amber-500 md:p-3">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 md:text-xs">أعلى دائرة تصويتًا</p>
                <p className="mt-1 truncate text-base font-black text-slate-900 md:mt-3 md:text-lg" title={topDistrict?.name}>
                  {topDistrict?.name || 'لا يوجد'}
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm md:col-span-1 md:p-5 xl:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <div className="rounded-xl bg-slate-50 p-2.5 text-fuchsia-600 md:p-3">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 md:text-xs">نسبة أعلى دائرة</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-slate-900 md:mt-3 md:text-3xl">
                  {topDistrict ? `${topDistrict.turnout}%` : '0%'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <MapPinned className="h-5 w-5 shrink-0 text-emerald-600" />
              <h3 className="text-base font-black leading-snug text-slate-900 md:text-lg">عدد المصوتين من كل دائرة</h3>
            </div>

            <div className="mt-4 space-y-2 md:mt-5 md:space-y-3">
              {districtTurnout.map((district: any) => (
                <div
                  key={district.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 md:p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-left">
                      <p className="text-base font-black tabular-nums text-blue-600 md:text-lg">{district.votes}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 md:text-xs">{district.turnout}% نسبة مشاركة</p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="font-black leading-snug text-slate-900">{district.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500 md:text-xs">{district.registeredVoters} ناخب مسجل</p>
                    </div>
                  </div>
                </div>
              ))}

              {!districtTurnout.length && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  لا توجد بيانات دوائر متاحة بعد.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <Users className="h-5 w-5 shrink-0 text-fuchsia-600" />
                <h3 className="text-base font-black leading-snug text-slate-900 md:text-lg">إحصائيات الذكور والإناث</h3>
              </div>

              {demographics.genderAvailable ? (
                <div className="mt-4 space-y-2 md:mt-5 md:space-y-3">
                  {genderBreakdown.map((entry: any) => (
                    <div key={entry.key} className="rounded-xl bg-slate-50 p-3.5 md:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-lg font-black tabular-nums text-slate-900 md:text-xl">{entry.count}</p>
                        <p className="font-black text-slate-700">{entry.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-800 md:mt-5">
                  بيانات الجنس غير متوفرة حاليًا لأن جدول الناخبين لا يحتوي هذا الحقل بعد.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <BarChart3 className="h-5 w-5 shrink-0 text-indigo-600" />
                <h3 className="text-base font-black leading-snug text-slate-900 md:text-lg">إحصائيات الأعمار</h3>
              </div>

              {demographics.ageAvailable ? (
                <div className="mt-4 space-y-2 md:mt-5 md:space-y-3">
                  {ageGroups.map((entry: any) => (
                    <div key={entry.key} className="rounded-xl bg-slate-50 p-3.5 md:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-lg font-black tabular-nums text-slate-900 md:text-xl">{entry.count}</p>
                        <p className="font-black text-slate-700">{entry.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-800 md:mt-5">
                  بيانات العمر غير متوفرة حاليًا لأن تاريخ الميلاد غير مخزن مع الناخبين بعد.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6 md:flex-row-reverse">
        <div className="min-w-0 text-right">
          <h2 className="text-xl font-black text-slate-900 md:text-2xl">النتائج النهائية</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 md:mt-2">
            عرض نتائج الأحزاب الوطنية ونتائج القوائم المحلية بصورة منفصلة.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
          <button type="button" onClick={load} className={touchBtn}>
            <RefreshCw className={`h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <button type="button" onClick={() => setView(view === 'general' ? 'local' : 'general')} className={touchBtnPrimary}>
            {view === 'general' ? 'نتائج القوائم المحلية' : 'نتائج الأحزاب الوطنية'}
          </button>
        </div>
      </div>

      {isGeneralLocked && view === 'general' ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-right shadow-sm">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-700" />
            <h3 className="text-lg font-black text-amber-900">نتائج الأحزاب الوطنية غير متاحة بعد</h3>
          </div>
          <p className="mt-3 text-sm font-medium text-amber-800">
            ستظهر للناخبين بعد انتهاء التصويت وإغلاق الانتخاب. الأدمن فقط يمكنه متابعتها أثناء فترة الاقتراع.
          </p>
          <button
            type="button"
            onClick={() => setView('local')}
            className="mt-4 w-full min-h-11 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 touch-manipulation active:opacity-90 sm:w-auto md:min-h-0 md:py-2"
          >
            عرض نتائج القوائم المحلية
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <BarChart3 className="h-5 w-5 shrink-0 text-blue-600" />
              <h3 className="text-base font-black leading-snug text-slate-900 md:text-lg">
                {view === 'general' ? 'نتائج الأحزاب الوطنية' : 'نتائج القوائم المحلية'}
              </h3>
            </div>

            <div className="mt-4 space-y-2.5 md:mt-6 md:space-y-3">
              {rows.map((row: any, index: number) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-right md:p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-left">
                      <p className="text-base font-black tabular-nums text-blue-600 md:text-sm">{row.votes}</p>
                      {view === 'local' && row.districtName && (
                        <p className="mt-0.5 text-[11px] text-slate-500 md:text-xs">{row.districtName}</p>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black leading-snug text-slate-900">{row.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500 md:text-xs">{row.code || row.districtName || ''}</p>
                    </div>
                  </div>

                  <div className="mt-3 h-2.5 rounded-full bg-slate-200 md:h-2">
                    <div
                      className="h-2.5 rounded-full bg-blue-600 md:h-2"
                      style={{
                        width: `${rows.length ? (Number(row.votes || 0) / maxVotes) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-bold text-slate-400 md:text-xs">الترتيب الحالي: #{index + 1}</p>
                </div>
              ))}

              {!rows.length && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  لا توجد نتائج متاحة بعد.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <Vote className="h-5 w-5 shrink-0 text-blue-600" />
                <h3 className="text-base font-black leading-snug text-slate-900 md:text-lg">إحصاءات سريعة</h3>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:mt-5 md:grid-cols-1 md:gap-4">
                <div className="rounded-xl bg-slate-50 p-3.5 md:p-4">
                  <p className="text-[10px] text-slate-400 md:text-xs">إجمالي البطاقات المجهولة</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-slate-900 md:mt-2 md:text-2xl">
                    {results?.totalVotes || 0}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5 md:p-4">
                  <p className="text-[10px] text-slate-400 md:text-xs">عدد الكيانات المعروضة</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-slate-900 md:mt-2 md:text-2xl">{rows.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <Trophy className="h-5 w-5 shrink-0 text-amber-500" />
                <h3 className="text-base font-black leading-snug text-slate-900 md:text-lg">الفائزون التلقائيون للأحزاب</h3>
              </div>
              <div className="mt-3 space-y-2 md:mt-4 md:space-y-3">
                {(results?.partyWinners || []).slice(0, 8).map((winner: any) => (
                  <div key={winner.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 md:p-4">
                    <p className="font-black leading-snug text-slate-900">{winner.name}</p>
                    <p className="mt-1 text-[11px] text-slate-500 md:text-xs">
                      {winner.partyName} - الترتيب {winner.candidateOrder}
                    </p>
                  </div>
                ))}

                {!results?.partyWinners?.length && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                    لم تُحتسب نتائج المقاعد الحزبية بعد.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
