import * as React from 'react';
import { ArrowDownUp, BarChart3, Lock, MapPinned, RefreshCw, Trophy, UserRound, Users, Vote } from 'lucide-react';
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

type ResultEntityType = 'party' | 'list' | 'candidate';

function getEntitySeed(entity: any, type: ResultEntityType) {
  return encodeURIComponent(`${type}-${entity?.id || entity?.candidateNumber || entity?.code || entity?.name || entity?.fullName || 'result'}`);
}

function getGeneratedEntityImage(entity: any, type: ResultEntityType) {
  const seed = getEntitySeed(entity, type);

  if (type === 'candidate') {
    return `https://i.pravatar.cc/160?u=${seed}`;
  }

  return `https://api.dicebear.com/9.x/shapes/png?seed=${seed}&backgroundColor=ffffff,dbeafe,e0f2fe&radius=8`;
}

function getEntityImage(entity: any, type: ResultEntityType) {
  const inferredType = entity?.partyName || entity?.candidateOrder ? 'candidate' : type;
  return entity?.photoUrl || entity?.logoUrl || entity?.imageUrl || entity?.avatarUrl || getGeneratedEntityImage(entity, inferredType);
}

function ResultAvatar({ entity, fallback = 'ص' }: { entity: any; fallback?: string }) {
  const imageUrl = getEntityImage(entity, fallback === 'م' ? 'candidate' : fallback === 'ح' ? 'party' : 'list');
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-sm font-black text-blue-600">
      {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : fallback}
    </div>
  );
}

function ResultsBarChart({
  rows,
  maxVotes,
  fallback,
  emptyLabel,
}: {
  rows: any[];
  maxVotes: number;
  fallback: string;
  emptyLabel: string;
}) {
  const topRows = rows.slice(0, 6);

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:mt-6">
      {topRows.length ? (
        <div className="flex h-48 items-end justify-end gap-3 overflow-x-auto px-1 pb-2 pt-3">
          {topRows.map((row) => {
            const percent = Math.max(8, (Number(row.votes || 0) / Math.max(maxVotes, 1)) * 100);
            return (
              <div key={row.id} className="flex min-w-[58px] flex-col items-center gap-2">
                <div className="text-xs font-black tabular-nums text-slate-700">{row.votes || 0}</div>
                <div className="flex h-28 w-8 items-end rounded-full bg-white shadow-inner">
                  <div className="w-full rounded-full bg-blue-600" style={{ height: `${percent}%` }} title={row.name} />
                </div>
                <ResultAvatar entity={row} fallback={fallback} />
                <p className="line-clamp-2 text-center text-[10px] font-bold leading-4 text-slate-500">{row.name}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-sm font-bold text-slate-500">{emptyLabel}</div>
      )}
    </div>
  );
}

export const Results = ({ isAdmin, setToast, language = 'ar', elections = [], preferredElectionId }: ResultsProps) => {
  const isArabic = language === 'ar';
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [view, setView] = React.useState<'general' | 'local'>('general');
  const [districtSort, setDistrictSort] = React.useState<'highest' | 'lowest' | 'alphabetical'>('highest');
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

    return [...grouped.values()];
  }, [results]);
  const sortedDistrictTurnout = React.useMemo(() => {
    return [...districtTurnout].sort((left, right) => {
      if (districtSort === 'lowest') {
        return left.votes - right.votes || left.name.localeCompare(right.name, 'ar');
      }
      if (districtSort === 'alphabetical') {
        return left.name.localeCompare(right.name, 'ar');
      }
      return right.votes - left.votes || left.name.localeCompare(right.name, 'ar');
    });
  }, [districtSort, districtTurnout]);
  const votedDistrictsCount = districtTurnout.filter((district: any) => Number(district?.votes || 0) > 0).length;
  const topDistrict = [...districtTurnout].sort((left: any, right: any) => right.votes - left.votes)[0] || null;

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
          title={t('ملخص الاقتراع', 'Election Summary')}
          subtitle={t('بيانات عامة متاحة للناخبين أثناء فترة التصويت', 'Public data available to voters during the voting period')}
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
                <p className="text-[10px] font-bold text-slate-400 md:text-xs">{t('إجمالي المصوتين', 'Total voters')}</p>
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
                <p className="text-[10px] font-bold text-slate-400 md:text-xs">{t('دوائر فيها تصويت', 'Districts with votes')}</p>
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
                <p className="text-[10px] font-bold text-slate-400 md:text-xs">{t('أعلى دائرة تصويتًا', 'Top voting district')}</p>
                <p className="mt-1 truncate text-base font-black text-slate-900 md:mt-3 md:text-lg" title={topDistrict?.name}>
                  {topDistrict?.name || t('لا يوجد', 'None')}
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
                <p className="text-[10px] font-bold text-slate-400 md:text-xs">{t('نسبة أعلى دائرة', 'Top district turnout')}</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-slate-900 md:mt-3 md:text-3xl">
                  {topDistrict ? `${topDistrict.turnout}%` : '0%'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 md:gap-3">
                <MapPinned className="h-5 w-5 shrink-0 text-emerald-600" />
                <h3 className="text-base font-black leading-snug text-slate-900 md:text-lg">{t('عدد المصوتين من كل دائرة', 'Voters by district')}</h3>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {[
                  { key: 'highest' as const, label: t('الأعلى تصويتًا', 'Highest votes') },
                  { key: 'lowest' as const, label: t('الأقل تصويتًا', 'Lowest votes') },
                  { key: 'alphabetical' as const, label: t('أبجدي', 'Alphabetical') },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setDistrictSort(option.key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      districtSort === option.key
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <ArrowDownUp className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2 md:mt-5 md:space-y-3">
              {sortedDistrictTurnout.map((district: any) => (
                <div key={district.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 md:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-left">
                      <p className="text-base font-black tabular-nums text-blue-600 md:text-lg">{district.votes}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 md:text-xs">{district.turnout}% {t('نسبة مشاركة', 'turnout')}</p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="font-black leading-snug text-slate-900">{district.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500 md:text-xs">{district.registeredVoters} {t('ناخب مسجل', 'registered voters')}</p>
                    </div>
                  </div>
                </div>
              ))}

              {!sortedDistrictTurnout.length && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  {t('لا توجد بيانات دوائر متاحة بعد.', 'No district data available yet.')}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <Users className="h-5 w-5 shrink-0 text-fuchsia-600" />
                <h3 className="text-base font-black leading-snug text-slate-900 md:text-lg">{t('إحصائيات الذكور والإناث', 'Gender statistics')}</h3>
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
                  {t('بيانات الجنس غير متوفرة حاليًا لأن جدول الناخبين لا يحتوي هذا الحقل بعد.', 'Gender data is currently unavailable because this field is missing in voter records.')}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <BarChart3 className="h-5 w-5 shrink-0 text-indigo-600" />
                <h3 className="text-base font-black leading-snug text-slate-900 md:text-lg">{t('إحصائيات الأعمار', 'Age statistics')}</h3>
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
                  {t('بيانات العمر غير متوفرة حاليًا لأن تاريخ الميلاد غير مخزن مع الناخبين بعد.', 'Age data is currently unavailable because birth dates are not stored yet.')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6 md:flex-row-reverse">
        <div className="min-w-0 text-right">
          <h2 className="text-xl font-black text-slate-900 md:text-2xl">{t('النتائج النهائية', 'Final Results')}</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 md:mt-2">
            {t('عرض نتائج الأحزاب الوطنية ونتائج القوائم المحلية بصورة منفصلة.', 'National parties and local lists are shown separately.')}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
          <button type="button" onClick={load} className={touchBtn}>
            <RefreshCw className={`h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`} />
            {t('تحديث', 'Refresh')}
          </button>
          <button type="button" onClick={() => setView(view === 'general' ? 'local' : 'general')} className={touchBtnPrimary}>
            {view === 'general' ? t('نتائج القوائم المحلية', 'Local list results') : t('نتائج الأحزاب الوطنية', 'National party results')}
          </button>
        </div>
      </div>

      {isGeneralLocked && view === 'general' ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-right shadow-sm">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-700" />
            <h3 className="text-lg font-black text-amber-900">{t('نتائج الأحزاب الوطنية غير متاحة بعد', 'National party results are not available yet')}</h3>
          </div>
          <p className="mt-3 text-sm font-medium text-amber-800">
            {t('ستظهر للناخبين بعد انتهاء التصويت وإغلاق الانتخاب. الأدمن فقط يمكنه متابعتها أثناء فترة الاقتراع.', 'They will be visible to voters after voting ends and election closes. Only admins can view them during voting.')}
          </p>
          <button
            type="button"
            onClick={() => setView('local')}
            className="mt-4 w-full min-h-11 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 touch-manipulation active:opacity-90 sm:w-auto md:min-h-0 md:py-2"
          >
            {t('عرض نتائج القوائم المحلية', 'Show local list results')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <BarChart3 className="h-5 w-5 shrink-0 text-blue-600" />
              <h3 className="text-base font-black leading-snug text-slate-900 md:text-lg">
                {view === 'general' ? t('نتائج الأحزاب الوطنية', 'National party results') : t('نتائج القوائم المحلية', 'Local list results')}
              </h3>
            </div>

            <ResultsBarChart
              rows={rows}
              maxVotes={maxVotes}
              fallback={view === 'general' ? 'ح' : 'ق'}
              emptyLabel={t('لا توجد نتائج متاحة بعد.', 'No results available yet.')}
            />

            <div className="mt-4 space-y-2.5 md:mt-6 md:space-y-3">
              {rows.map((row: any, index: number) => (
                <div key={row.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-right md:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-left">
                      <p className="text-base font-black tabular-nums text-blue-600 md:text-sm">{row.votes}</p>
                      {view === 'local' && row.districtName && <p className="mt-0.5 text-[11px] text-slate-500 md:text-xs">{row.districtName}</p>}
                    </div>
                    <div className="flex min-w-0 flex-1 items-start justify-end gap-3">
                      <div className="min-w-0">
                        <p className="font-black leading-snug text-slate-900">{row.name}</p>
                        <p className="mt-1 text-[11px] text-slate-500 md:text-xs">{row.code || row.districtName || ''}</p>
                      </div>
                      <ResultAvatar entity={row} fallback={view === 'general' ? 'ح' : 'ق'} />
                    </div>
                  </div>

                  <div className="mt-3 h-2.5 rounded-full bg-slate-200 md:h-2">
                    <div
                      className="h-2.5 rounded-full bg-blue-600 md:h-2"
                      style={{ width: `${rows.length ? (Number(row.votes || 0) / maxVotes) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-bold text-slate-400 md:text-xs">{t('الترتيب الحالي', 'Current rank')}: #{index + 1}</p>
                </div>
              ))}

              {!rows.length && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  {t('لا توجد نتائج متاحة بعد.', 'No results available yet.')}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <Vote className="h-5 w-5 shrink-0 text-blue-600" />
                <h3 className="text-base font-black leading-snug text-slate-900 md:text-lg">{t('إحصاءات سريعة', 'Quick stats')}</h3>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:mt-5 md:grid-cols-1 md:gap-4">
                <div className="rounded-xl bg-slate-50 p-3.5 md:p-4">
                  <p className="text-[10px] text-slate-400 md:text-xs">{t('إجمالي البطاقات المجهولة', 'Total anonymous ballots')}</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-slate-900 md:mt-2 md:text-2xl">{results?.totalVotes || 0}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5 md:p-4">
                  <p className="text-[10px] text-slate-400 md:text-xs">{t('عدد الكيانات المعروضة', 'Displayed entities')}</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-slate-900 md:mt-2 md:text-2xl">{rows.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-right md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <Trophy className="h-5 w-5 shrink-0 text-amber-500" />
                <h3 className="text-base font-black leading-snug text-slate-900 md:text-lg">{t('الفائزون التلقائيون للأحزاب', 'Automatic party winners')}</h3>
              </div>
              <div className="mt-3 space-y-2 md:mt-4 md:space-y-3">
                {(results?.partyWinners || []).slice(0, 8).map((winner: any) => (
                  <div key={winner.id} className="flex items-center justify-end gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 md:p-4">
                    <div>
                      <p className="font-black leading-snug text-slate-900">{winner.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500 md:text-xs">
                        {winner.partyName} - {t('الترتيب', 'rank')} {winner.candidateOrder}
                      </p>
                    </div>
                    <ResultAvatar entity={winner} fallback="م" />
                  </div>
                ))}

                {!results?.partyWinners?.length && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                    {t('لم تُحتسب نتائج المقاعد الحزبية بعد.', 'Party seat results are not computed yet.')}
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
