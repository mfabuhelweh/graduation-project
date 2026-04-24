import * as React from 'react';
import {
  CalendarDays,
  Eye,
  FileSpreadsheet,
  Pencil,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Users,
  Vote,
} from 'lucide-react';

interface ElectionsPageProps {
  elections: any[];
  language: 'ar' | 'en';
  setToast: (toast: any) => void;
  onCreate: () => void;
  onOpenDetails: (electionId: string) => void;
  onEdit: (electionId: string) => void;
  onRefresh: () => Promise<void>;
  canManageElectionData: boolean;
}

const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  scheduled: 'مجدول',
  active: 'نشط',
  closed: 'مغلق',
  archived: 'مؤرشف',
};

export const ElectionsPage = ({
  elections,
  setToast,
  onCreate,
  onOpenDetails,
  onEdit,
  onRefresh,
  canManageElectionData,
}: ElectionsPageProps) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const showToast = React.useCallback(
    (message: string, type: 'success' | 'error') => {
      setToast({ message, type });
      window.setTimeout(() => setToast(null), type === 'success' ? 2000 : 3500);
    },
    [setToast],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      showToast('تم تحديث قائمة الانتخابات.', 'success');
    } finally {
      setIsRefreshing(false);
    }
  };

  const statCards = [
    {
      label: 'إجمالي الانتخابات',
      value: elections.length,
      icon: FileSpreadsheet,
      tone: 'text-slate-700',
    },
    {
      label: 'الانتخابات النشطة',
      value: elections.filter((item) => item.status === 'active').length,
      icon: Vote,
      tone: 'text-emerald-600',
    },
    {
      label: 'الأحزاب المسجلة',
      value: elections.reduce((sum, item) => sum + Number(item.partiesCount || 0), 0),
      icon: ShieldCheck,
      tone: 'text-blue-600',
    },
    {
      label: 'الناخبون المستوردون',
      value: elections.reduce((sum, item) => sum + Number(item.votersCount || 0), 0),
      icon: Users,
      tone: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-900">إدارة الانتخابات</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            أنشئ انتخابًا جديدًا من هنا، ثم افتح خيار التفاصيل لإضافة ملفات الدوائر والقوائم والأحزاب والناخبين الخاصة به.
          </p>
          {!canManageElectionData && (
            <div className="mt-3 inline-flex rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              وضع القراءة فقط: لا يمكنك تعديل بيانات الانتخابات بهذا الدور الإداري.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {canManageElectionData && (
            <button
              onClick={onCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              <PlusCircle className="h-4 w-4" />
              إنشاء انتخاب جديد
            </button>
          )}

          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className={`rounded-2xl bg-slate-50 p-3 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400">{card.label}</p>
                  <p className={`mt-3 text-3xl font-black ${card.tone}`}>{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {elections.map((election) => (
          <div key={election.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-row-reverse items-start justify-between gap-4">
              <div className="text-right">
                <h3 className="text-xl font-black text-slate-900">{election.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{election.description || 'لا يوجد وصف مضاف بعد.'}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {statusLabels[election.status] || election.status}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-right md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">الدوائر</p>
                <p className="mt-2 text-lg font-black text-slate-900">{Number(election.districtsCount || 0)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">الأحزاب</p>
                <p className="mt-2 text-lg font-black text-slate-900">{Number(election.partiesCount || 0)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">القوائم المحلية</p>
                <p className="mt-2 text-lg font-black text-slate-900">{Number(election.districtListsCount || 0)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">الناخبون</p>
                <p className="mt-2 text-lg font-black text-slate-900">{Number(election.votersCount || 0)}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center justify-end gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  البداية: {new Date(election.startAt || election.startDate).toLocaleString('ar-JO')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Vote className="h-3.5 w-3.5" />
                  النهاية: {new Date(election.endAt || election.endDate).toLocaleString('ar-JO')}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => onOpenDetails(election.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="h-4 w-4" />
                  التفاصيل
                </button>
                {canManageElectionData && (
                  <button
                    onClick={() => onEdit(election.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  >
                    <Pencil className="h-4 w-4" />
                    تعديل
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {elections.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center text-sm font-medium text-slate-500">
            لا توجد انتخابات حالية في النظام.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {elections.slice(0, 3).map((election) => (
          <div key={`summary-${election.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-row-reverse items-start justify-between gap-3">
              <div className="text-right">
                <h3 className="text-base font-black text-slate-900">{election.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{election.description || 'بدون وصف مضاف بعد.'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-2 text-slate-500">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-right text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">أصوات مجهولة</p>
                <p className="mt-2 font-black text-slate-900">{Number(election.ballotsCount || 0)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">الناخبون</p>
                <p className="mt-2 font-black text-slate-900">{Number(election.votersCount || 0)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
