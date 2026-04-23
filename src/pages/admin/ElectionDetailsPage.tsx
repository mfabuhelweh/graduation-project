import * as React from 'react';
import { Archive, ArrowRight, CheckCircle2, FileDown, Loader2, ShieldAlert, Trash2, TriangleAlert } from 'lucide-react';
import {
  deleteAdminElection,
  fetchAdminElectionDetails,
  fetchElectionSetupSummary,
  fetchResults,
  resetSystemData,
  updateAdminElectionStatus,
} from '../../lib/api';
import { ImportCenter } from './ImportCenter';

interface ElectionDetailsPageProps {
  electionId: string;
  setToast: (toast: any) => void;
  onBack: () => void;
  onRefreshList: () => Promise<void>;
  canManageElectionData: boolean;
}

const statusActions = [
  { status: 'active', label: 'تفعيل الانتخاب' },
  { status: 'closed', label: 'إغلاق الانتخاب' },
  { status: 'archived', label: 'أرشفة الانتخاب' },
];

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 90) || 'election-results';
}

function toRows(items: any[] = [], mapper: (item: any, index: number) => Record<string, unknown>) {
  return items.map((item, index) => mapper(item, index));
}

export const ElectionDetailsPage = ({
  electionId,
  setToast,
  onBack,
  onRefreshList,
  canManageElectionData,
}: ElectionDetailsPageProps) => {
  const [details, setDetails] = React.useState<any>(null);
  const [summary, setSummary] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [statusLoading, setStatusLoading] = React.useState<string | null>(null);
  const [exportingResults, setExportingResults] = React.useState(false);
  const [deletingElection, setDeletingElection] = React.useState(false);
  const [resettingSystem, setResettingSystem] = React.useState(false);

  const showToast = React.useCallback(
    (message: string, type: 'success' | 'error') => {
      setToast({ message, type });
      window.setTimeout(() => setToast(null), type === 'success' ? 2500 : 3500);
    },
    [setToast],
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [detailsResponse, summaryResponse] = await Promise.all([
        fetchAdminElectionDetails(electionId),
        fetchElectionSetupSummary(electionId),
      ]);
      setDetails(detailsResponse);
      setSummary(summaryResponse);
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const uniqueWarnings = React.useMemo(
    () => Array.from(new Set((summary?.warnings || []).filter(Boolean))),
    [summary?.warnings],
  );

  const changeStatus = async (status: string) => {
    if (!canManageElectionData) {
      showToast('هذا الدور الإداري لا يملك صلاحية تغيير حالة الانتخاب.', 'error');
      return;
    }

    setStatusLoading(status);
    try {
      await updateAdminElectionStatus(electionId, status);
      await Promise.all([load(), onRefreshList()]);
      showToast(`تم تحديث حالة الانتخاب إلى ${status}.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تحديث حالة الانتخاب.', 'error');
    } finally {
      setStatusLoading(null);
    }
  };

  const handleResetSystem = async () => {
    if (!canManageElectionData) {
      showToast('إعادة ضبط النظام تتطلب صلاحية إدارة كاملة.', 'error');
      return;
    }

    const confirmed = window.confirm(
      'سيتم حذف جميع بيانات الجداول التشغيلية من قاعدة البيانات، مع الإبقاء على حسابات الأدمن فقط. هل تريد المتابعة؟',
    );

    if (!confirmed) return;

    setResettingSystem(true);
    try {
      await resetSystemData();
      await onRefreshList();
      showToast('تم حذف بيانات النظام من الجداول مع الإبقاء على حسابات الأدمن.', 'success');
      onBack();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حذف بيانات النظام.', 'error');
    } finally {
      setResettingSystem(false);
    }
  };

  const handleDeleteElection = async () => {
    if (!canManageElectionData) {
      showToast('حذف الانتخاب يتطلب صلاحية إدارة الانتخابات.', 'error');
      return;
    }

    const confirmed = window.confirm(
      `سيتم حذف الانتخاب "${details?.election?.title || ''}" وكل البيانات المرتبطة به.\n\nهل تريد المتابعة؟`,
    );
    if (!confirmed) return;

    setDeletingElection(true);
    try {
      await deleteAdminElection(electionId);
      await onRefreshList();
      showToast('تم حذف الانتخاب بنجاح.', 'success');
      onBack();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حذف الانتخاب.', 'error');
    } finally {
      setDeletingElection(false);
    }
  };

  const handleExportResults = async () => {
    if (!details?.election?.id) return;

    setExportingResults(true);
    try {
      const [XLSX, results] = await Promise.all([import('xlsx'), fetchResults(electionId)]);
      const workbook = XLSX.utils.book_new();
      const electionTitle = details.election.title || 'Election';

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet([
          {
            'اسم الانتخاب': electionTitle,
            'الحالة': details.election.status,
            'بداية التصويت': details.election.startAt,
            'نهاية التصويت': details.election.endAt,
            'إجمالي الأصوات': results.totalVotes || 0,
            'عدد الدوائر': summary?.counts?.districts || 0,
            'عدد الأحزاب': summary?.counts?.parties || 0,
            'عدد القوائم المحلية': summary?.counts?.districtLists || 0,
            'عدد الناخبين': summary?.counts?.voters || 0,
          },
        ]),
        'Summary',
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          toRows(results.parties || [], (row, index) => ({
            '#': index + 1,
            'اسم الحزب': row.name,
            'رمز الحزب': row.code,
            'الأصوات': row.votes,
          })),
        ),
        'Party Results',
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          toRows(results.districtLists || [], (row, index) => ({
            '#': index + 1,
            'الدائرة': row.districtName,
            'القائمة المحلية': row.name,
            'رمز القائمة': row.code,
            'الأصوات': row.votes,
          })),
        ),
        'Local Lists',
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          toRows(results.districtCandidates || [], (row, index) => ({
            '#': index + 1,
            'الدائرة': row.districtName,
            'القائمة': row.listName,
            'المرشح': row.name,
            'الأصوات': row.votes,
          })),
        ),
        'Local Candidates',
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          toRows(results.partyWinners || [], (row, index) => ({
            '#': index + 1,
            'المرشح الفائز': row.name,
            'الحزب': row.partyName,
            'ترتيب المرشح': row.candidateOrder,
            'أصوات الحزب': row.partyVotes,
          })),
        ),
        'Party Winners',
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          toRows(results.analytics?.districtTurnout || [], (row) => ({
            'الدائرة': row.name,
            'الناخبون المسجلون': row.registeredVoters,
            'الأصوات': row.votes,
            'نسبة المشاركة': row.turnout,
          })),
        ),
        'Turnout',
      );

      XLSX.writeFile(workbook, `${sanitizeFileName(electionTitle)}-results.xlsx`);
      showToast('تم تصدير النتائج إلى ملف Excel.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تصدير النتائج.', 'error');
    } finally {
      setExportingResults(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-right text-sm font-bold text-rose-700">
        تعذر تحميل تفاصيل الانتخاب.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="text-right">
          <button
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowRight className="h-4 w-4" />
            العودة إلى قائمة الانتخابات
          </button>
          <h2 className="text-2xl font-black text-slate-900">{details.election.title}</h2>
          <p className="mt-2 text-sm text-slate-500">{details.election.description || 'لا يوجد وصف مضاف بعد.'}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {statusActions.map((action) => (
            <button
              key={action.status}
              onClick={() => changeStatus(action.status)}
              disabled={!canManageElectionData || statusLoading === action.status}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${
                action.status === 'archived' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {action.status === 'archived' && statusLoading !== action.status ? <Archive className="h-4 w-4" /> : null}
              {statusLoading === action.status ? 'جارٍ التنفيذ...' : action.label}
            </button>
          ))}
          <button
            onClick={handleExportResults}
            disabled={exportingResults}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
          >
            {exportingResults ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            تصدير النتائج Excel
          </button>
        </div>
      </div>

      {!canManageElectionData && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-right text-sm font-bold text-amber-800">
          هذه الصفحة مفتوحة لك بوضع القراءة فقط. يمكنك مراجعة البيانات وملخص الاستيراد، لكن رفع الملفات أو
          تغيير الحالة أو إعادة ضبط النظام يتطلب صلاحيات أعلى.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['الدوائر', summary?.counts?.districts || 0],
          ['الحصص', summary?.counts?.quotas || 0],
          ['الأحزاب', summary?.counts?.parties || 0],
          ['القوائم المحلية', summary?.counts?.districtLists || 0],
          ['الناخبون', summary?.counts?.voters || 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm">
            <p className="text-xs font-bold text-slate-400">{label}</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{value as React.ReactNode}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-right text-lg font-black text-slate-900">ملخص الانتخاب</h3>
            <div className="mt-5 grid grid-cols-1 gap-4 text-right text-sm md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">فترة الاقتراع</p>
                <p className="mt-2 font-bold text-slate-900">{new Date(details.election.startAt).toLocaleString('ar-JO')}</p>
                <p className="mt-1 font-bold text-slate-900">{new Date(details.election.endAt).toLocaleString('ar-JO')}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">إعدادات الانتخاب</p>
                <p className="mt-2 text-slate-700">الأحزاب الوطنية: {details.election.enableParties ? 'مفعلة' : 'معطلة'}</p>
                <p className="mt-1 text-slate-700">القوائم المحلية: {details.election.enableDistrictLists ? 'مفعلة' : 'معطلة'}</p>
                <p className="mt-1 text-slate-700">
                  الحد الأقصى لاختيار مرشحي الدائرة:{' '}
                  {details.election.districtCandidateSelectionCount || 'حسب إعدادات الدائرة'}
                </p>
                <p className="mt-1 text-slate-700">مقاعد الأحزاب الوطنية: {details.election.totalNationalPartySeats}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-right text-lg font-black text-slate-900">مركز الاستيراد</h3>
            <p className="mt-2 text-right text-sm text-slate-500">
              ارفع الملفات بالترتيب المطلوب، ويمكنك لاحقًا حذف بيانات أي ملف تم استيراده إذا أردت رفع نسخة
              معدلة بدلًا منه.
            </p>
            <div className="mt-5">
              <ImportCenter
                electionId={electionId}
                canManageElectionData={canManageElectionData}
                onImported={async () => {
                  await Promise.all([load(), onRefreshList()]);
                }}
                setToast={setToast}
              />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-right text-lg font-black text-slate-900">تحذيرات التحقق</h3>
            <div className="mt-4 space-y-3">
              {uniqueWarnings.length ? (
                uniqueWarnings.map((warning: string, index: number) => (
                  <div
                    key={`${warning}-${index}`}
                    className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-right text-sm font-bold text-amber-800"
                  >
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-right text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>لا توجد تحذيرات بنيوية حاليًا لهذا الانتخاب.</span>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-right">
            <h3 className="text-lg font-black text-slate-900">محتوى الانتخاب</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>عدد مرشحي الأحزاب: {details.partyCandidates?.length || 0}</p>
              <p>عدد القوائم المحلية: {details.districtLists?.length || 0}</p>
              <p>عدد مرشحي القوائم المحلية: {details.districtListCandidates?.length || 0}</p>
              <p>عدد الأحزاب: {details.parties?.length || 0}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm text-right">
            <div className="flex items-center justify-end gap-3">
              <h3 className="text-lg font-black text-rose-800">إجراءات خطرة</h3>
              <ShieldAlert className="h-5 w-5 text-rose-700" />
            </div>
            <p className="mt-2 text-sm text-rose-700">
              هذا الزر يحذف جميع بيانات الجداول التشغيلية من قاعدة البيانات دفعة واحدة، ويُبقي فقط على حسابات
              الأدمن حتى لا تنفصلوا عن لوحة التحكم.
            </p>
            <button
              onClick={handleDeleteElection}
              disabled={!canManageElectionData || deletingElection || resettingSystem}
              className="mt-4 ml-2 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              {deletingElection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              حذف هذا الانتخاب
            </button>
            <button
              onClick={handleResetSystem}
              disabled={!canManageElectionData || deletingElection || resettingSystem}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {resettingSystem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              حذف كل بيانات الجداول
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
