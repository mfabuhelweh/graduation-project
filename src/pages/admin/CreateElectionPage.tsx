import * as React from 'react';
import { CalendarClock, Clock3, Info, Loader2, Save, Trash2, X } from 'lucide-react';
import {
  createAdminElection,
  deleteAdminElection,
  fetchAdminElectionDetails,
  updateAdminElection,
  type ElectionFormPayload,
} from '../../lib/api';

interface CreateElectionPageProps {
  setToast: (toast: any) => void;
  onCreated: (election: any) => Promise<void> | void;
  onDeleted?: () => Promise<void> | void;
  onCancel: () => void;
  initialElection?: any | null;
  editingElectionId?: string | null;
  canManageElectionData: boolean;
}

const initialForm: ElectionFormPayload = {
  title: '',
  description: '',
  startAt: '',
  endAt: '',
  status: 'draft',
  enableParties: true,
  enableDistrictLists: true,
  districtCandidateSelectionCount: 3,
  totalNationalPartySeats: 41,
  showTurnoutPublicly: true,
  allowResultsVisibilityBeforeClose: false,
};

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function mapElectionToForm(election: any | null | undefined): ElectionFormPayload {
  if (!election) return initialForm;

  return {
    title: election.title || '',
    description: election.description || '',
    startAt: toDateTimeLocal(election.startAt || election.startDate),
    endAt: toDateTimeLocal(election.endAt || election.endDate),
    status: election.status || 'draft',
    enableParties: election.enableParties ?? true,
    enableDistrictLists: election.enableDistrictLists ?? true,
    districtCandidateSelectionCount: election.districtCandidateSelectionCount ?? 3,
    totalNationalPartySeats: election.totalNationalPartySeats ?? 41,
    showTurnoutPublicly: election.showTurnoutPublicly ?? true,
    allowResultsVisibilityBeforeClose: election.allowResultsVisibilityBeforeClose ?? false,
  };
}

function addHours(localDateTime: string, hours: number) {
  if (!localDateTime) return '';
  const date = new Date(localDateTime);
  if (Number.isNaN(date.getTime())) return '';
  date.setHours(date.getHours() + hours);
  return toDateTimeLocal(date.toISOString());
}

function DateTimeField({
  label,
  value,
  onChange,
  hint,
  min,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
  min?: string;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2 text-right">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 focus-within:bg-white">
        <CalendarClock className="h-5 w-5 text-blue-600" />
        <input
          type="datetime-local"
          value={value}
          min={min}
          step={60}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent text-right outline-none disabled:cursor-not-allowed"
        />
      </div>
      <p className="text-xs text-slate-500">{hint}</p>
    </label>
  );
}

export const CreateElectionPage = ({
  setToast,
  onCreated,
  onDeleted,
  onCancel,
  initialElection,
  editingElectionId,
  canManageElectionData,
}: CreateElectionPageProps) => {
  const [form, setForm] = React.useState<ElectionFormPayload>(() => mapElectionToForm(initialElection));
  const [loadedElection, setLoadedElection] = React.useState<any | null>(initialElection || null);
  const [isLoadingElection, setIsLoadingElection] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const editElectionId = editingElectionId || initialElection?.id || null;
  const isEditMode = Boolean(editElectionId);

  React.useEffect(() => {
    let cancelled = false;

    if (!editElectionId) {
      setLoadedElection(null);
      setForm(mapElectionToForm(null));
      setIsLoadingElection(false);
      return () => {
        cancelled = true;
      };
    }

    if (initialElection?.id === editElectionId) {
      setLoadedElection(initialElection);
      setForm(mapElectionToForm(initialElection));
      setIsLoadingElection(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoadingElection(true);
    fetchAdminElectionDetails(editElectionId)
      .then((election) => {
        if (cancelled) return;
        setLoadedElection(election);
        setForm(mapElectionToForm(election));
      })
      .catch((error) => {
        if (cancelled) return;
        showToast(error instanceof Error ? error.message : 'تعذر تحميل بيانات الانتخاب للتعديل.', 'error');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingElection(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editElectionId, initialElection]);

  const updateField = <K extends keyof ElectionFormPayload>(field: K, value: ElectionFormPayload[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const showToast = React.useCallback(
    (message: string, type: 'success' | 'error') => {
      setToast({ message, type });
      window.setTimeout(() => setToast(null), type === 'success' ? 2500 : 3500);
    },
    [setToast],
  );

  const setStartPreset = (hoursFromNow: number) => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + hoursFromNow);
    updateField('startAt', toDateTimeLocal(now.toISOString()));
  };

  const submit = async () => {
    if (!canManageElectionData) {
      showToast('هذا الدور الإداري لا يملك صلاحية تعديل بيانات الانتخابات.', 'error');
      return;
    }

    if (!form.title.trim() || !form.startAt || !form.endAt) {
      showToast('أدخل عنوان الانتخاب وتاريخ البداية والنهاية.', 'error');
      return;
    }

    if (new Date(form.endAt).getTime() <= new Date(form.startAt).getTime()) {
      showToast('يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const saved = isEditMode
        ? await updateAdminElection(editElectionId as string, form)
        : await createAdminElection(form);

      showToast(isEditMode ? 'تم تحديث بيانات الانتخاب بنجاح.' : 'تم إنشاء الانتخاب بنجاح.', 'success');
      await onCreated(saved);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ بيانات الانتخاب.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !editElectionId || !canManageElectionData) return;

    const confirmed = window.confirm(
      `سيتم حذف الانتخاب "${loadedElection?.title || form.title}" وكل البيانات المرتبطة به من قاعدة البيانات.\n\nهل تريد المتابعة؟`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteAdminElection(editElectionId);
      showToast('تم حذف الانتخاب بنجاح.', 'success');
      await onDeleted?.();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حذف الانتخاب.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-right">
        <h2 className="text-2xl font-black text-slate-900">
          {isEditMode ? 'تعديل بيانات الانتخاب' : 'إنشاء انتخاب جديد'}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {isEditMode
            ? 'عدّل الاسم والوصف ووقت البداية والنهاية والحالة والإعدادات العامة لهذا الانتخاب.'
            : 'أدخل معلومات الانتخاب الأساسية ثم احفظها.'}
        </p>
      </div>

      {!canManageElectionData && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-right text-sm font-bold text-amber-800">
          دورك الحالي يسمح بالاطلاع فقط. تعديل تواريخ الانتخابات أو حذفها يتطلب صلاحية
          <span className="mx-1">`super_admin`</span>
          أو
          <span className="mx-1">`election_admin`</span>.
        </div>
      )}

      {isLoadingElection && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>جارٍ تحميل بيانات الانتخاب للتعديل...</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="space-y-2 text-right md:col-span-2">
                <span className="text-sm font-bold text-slate-700">عنوان الانتخاب</span>
                <input
                  value={form.title}
                  disabled={!canManageElectionData}
                  onChange={(event) => updateField('title', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-blue-500 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="انتخابات مجلس النواب الأردني 2026"
                />
              </label>

              <label className="space-y-2 text-right md:col-span-2">
                <span className="text-sm font-bold text-slate-700">الوصف</span>
                <textarea
                  value={form.description}
                  disabled={!canManageElectionData}
                  onChange={(event) => updateField('description', event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-blue-500 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="وصف مختصر للانتخاب"
                />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-base font-black text-slate-900">محدد التاريخ والوقت</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      استخدم المحدد الموحد أدناه بدل إدخال التاريخ يدويًا لتقليل أخطاء التنسيق.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={!canManageElectionData}
                    onClick={() => setStartPreset(0)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    ابدأ الآن
                  </button>
                  <button
                    type="button"
                    disabled={!canManageElectionData || !form.startAt}
                    onClick={() => updateField('endAt', addHours(form.startAt, 12))}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    انتهاء بعد 12 ساعة
                  </button>
                  <button
                    type="button"
                    disabled={!canManageElectionData || !form.startAt}
                    onClick={() => updateField('endAt', addHours(form.startAt, 24))}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    انتهاء بعد 24 ساعة
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <DateTimeField
                    label="تاريخ البدء"
                    value={form.startAt}
                    disabled={!canManageElectionData}
                    onChange={(value) => updateField('startAt', value)}
                    hint="يتم حفظ الوقت المحلي كما يظهر لك في الواجهة."
                  />
                  <DateTimeField
                    label="تاريخ الانتهاء"
                    value={form.endAt}
                    min={form.startAt || undefined}
                    disabled={!canManageElectionData}
                    onChange={(value) => updateField('endAt', value)}
                    hint="الحد الأدنى يساوي وقت البدء الحالي لمنع الأخطاء."
                  />
                </div>
              </div>

              <label className="space-y-2 text-right">
                <span className="text-sm font-bold text-slate-700">الحالة</span>
                <select
                  value={form.status}
                  disabled={!canManageElectionData}
                  onChange={(event) => updateField('status', event.target.value as ElectionFormPayload['status'])}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-blue-500 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="draft">مسودة</option>
                  <option value="scheduled">مجدول</option>
                  <option value="active">نشط</option>
                  <option value="closed">مغلق</option>
                  <option value="archived">مؤرشف</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 text-right">
              <h3 className="text-lg font-black text-slate-900">إعدادات الانتخاب</h3>
              <p className="mt-1 text-sm text-slate-500">يمكنك تعديل هذه القيم في أي وقت لهذا الانتخاب.</p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  disabled={!canManageElectionData}
                  checked={form.enableParties}
                  onChange={(event) => updateField('enableParties', event.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-bold text-slate-700">تفعيل الأحزاب الوطنية</span>
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  disabled={!canManageElectionData}
                  checked={form.enableDistrictLists}
                  onChange={(event) => updateField('enableDistrictLists', event.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-bold text-slate-700">تفعيل القوائم المحلية</span>
              </label>

              <label className="space-y-2 text-right">
                <span className="text-sm font-bold text-slate-700">الحد الأقصى لاختيار مرشحي الدائرة</span>
                <input
                  type="number"
                  min={1}
                  disabled={!canManageElectionData}
                  value={form.districtCandidateSelectionCount || 1}
                  onChange={(event) =>
                    updateField('districtCandidateSelectionCount', Number(event.target.value || 1))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-blue-500 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>

              <label className="space-y-2 text-right">
                <span className="text-sm font-bold text-slate-700">عدد مقاعد الأحزاب الوطنية</span>
                <input
                  type="number"
                  min={1}
                  disabled={!canManageElectionData}
                  value={form.totalNationalPartySeats}
                  onChange={(event) => updateField('totalNationalPartySeats', Number(event.target.value || 41))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-blue-500 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  disabled={!canManageElectionData}
                  checked={form.showTurnoutPublicly}
                  onChange={(event) => updateField('showTurnoutPublicly', event.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-bold text-slate-700">إظهار نسبة الاقتراع</span>
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  disabled={!canManageElectionData}
                  checked={form.allowResultsVisibilityBeforeClose}
                  onChange={(event) =>
                    updateField('allowResultsVisibilityBeforeClose', event.target.checked)
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm font-bold text-slate-700">إظهار النتائج قبل الإغلاق</span>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-right shadow-sm">
            <h3 className="text-lg font-black text-slate-900">ملخص سريع</h3>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex flex-row-reverse justify-between">
                <span>الحالة</span>
                <span className="font-bold text-slate-900">{form.status}</span>
              </div>
              <div className="flex flex-row-reverse justify-between">
                <span>الأحزاب الوطنية</span>
                <span className="font-bold text-slate-900">{form.enableParties ? 'مفعلة' : 'معطلة'}</span>
              </div>
              <div className="flex flex-row-reverse justify-between">
                <span>القوائم المحلية</span>
                <span className="font-bold text-slate-900">{form.enableDistrictLists ? 'مفعلة' : 'معطلة'}</span>
              </div>
              <div className="flex flex-row-reverse justify-between">
                <span>مقاعد الأحزاب</span>
                <span className="font-bold text-slate-900">{form.totalNationalPartySeats}</span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <p className="text-sm leading-7 text-blue-900">
                  يتم ضبط تواريخ البدء والانتهاء من خلال محدد موحد. هذا يمنع أخطاء الإدخال اليدوي
                  ويحافظ على تنسيق زمني ثابت في النظام كله.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <button
              onClick={submit}
              disabled={!canManageElectionData || isLoadingElection || isSaving || isDeleting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEditMode ? 'حفظ التعديلات' : 'إنشاء الانتخاب'}
            </button>

            {isEditMode && (
              <button
                onClick={handleDelete}
                disabled={!canManageElectionData || isLoadingElection || isSaving || isDeleting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                حذف الانتخاب
              </button>
            )}

            <button
              onClick={onCancel}
              disabled={isSaving || isDeleting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              رجوع
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
