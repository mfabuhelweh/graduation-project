import * as React from 'react';
import { Loader2, Save, X } from 'lucide-react';
import {
  createAdminElection,
  updateAdminElection,
  type ElectionFormPayload,
} from '../../lib/api';

interface CreateElectionPageProps {
  setToast: (toast: any) => void;
  onCreated: (election: any) => Promise<void> | void;
  onCancel: () => void;
  initialElection?: any | null;
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

export const CreateElectionPage = ({
  setToast,
  onCreated,
  onCancel,
  initialElection,
}: CreateElectionPageProps) => {
  const [form, setForm] = React.useState<ElectionFormPayload>(() => mapElectionToForm(initialElection));
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setForm(mapElectionToForm(initialElection));
  }, [initialElection]);

  const isEditMode = Boolean(initialElection?.id);

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

  const submit = async () => {
    if (!form.title.trim() || !form.startAt || !form.endAt) {
      showToast('أدخل عنوان الانتخاب وتاريخ البداية والنهاية.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const saved = isEditMode
        ? await updateAdminElection(initialElection.id, form)
        : await createAdminElection(form);

      showToast(isEditMode ? 'تم تحديث بيانات الانتخاب بنجاح.' : 'تم إنشاء الانتخاب بنجاح.', 'success');
      await onCreated(saved);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ بيانات الانتخاب.', 'error');
    } finally {
      setIsSaving(false);
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
            : 'أدخل معلومات الانتخاب الأساسية ثم احفظه.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="space-y-2 text-right md:col-span-2">
                <span className="text-sm font-bold text-slate-700">عنوان الانتخاب</span>
                <input
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-blue-500 focus:bg-white focus:outline-none"
                  placeholder="انتخابات مجلس النواب الأردني 2026"
                />
              </label>

              <label className="space-y-2 text-right md:col-span-2">
                <span className="text-sm font-bold text-slate-700">الوصف</span>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-blue-500 focus:bg-white focus:outline-none"
                  placeholder="وصف مختصر للانتخاب"
                />
              </label>

              <label className="space-y-2 text-right">
                <span className="text-sm font-bold text-slate-700">تاريخ البداية</span>
                <input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(event) => updateField('startAt', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </label>

              <label className="space-y-2 text-right">
                <span className="text-sm font-bold text-slate-700">تاريخ النهاية</span>
                <input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(event) => updateField('endAt', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </label>

              <label className="space-y-2 text-right">
                <span className="text-sm font-bold text-slate-700">الحالة</span>
                <select
                  value={form.status}
                  onChange={(event) => updateField('status', event.target.value as ElectionFormPayload['status'])}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-blue-500 focus:bg-white focus:outline-none"
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
                  checked={form.enableParties}
                  onChange={(event) => updateField('enableParties', event.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-bold text-slate-700">تفعيل الأحزاب الوطنية</span>
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
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
                  value={form.districtCandidateSelectionCount || 1}
                  onChange={(event) =>
                    updateField('districtCandidateSelectionCount', Number(event.target.value || 1))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </label>

              <label className="space-y-2 text-right">
                <span className="text-sm font-bold text-slate-700">عدد مقاعد الأحزاب الوطنية</span>
                <input
                  type="number"
                  min={1}
                  value={form.totalNationalPartySeats}
                  onChange={(event) => updateField('totalNationalPartySeats', Number(event.target.value || 41))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.showTurnoutPublicly}
                  onChange={(event) => updateField('showTurnoutPublicly', event.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-bold text-slate-700">إظهار نسبة الاقتراع</span>
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
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
                <span className="font-bold text-slate-900">
                  {form.enableDistrictLists ? 'مفعلة' : 'معطلة'}
                </span>
              </div>
              <div className="flex flex-row-reverse justify-between">
                <span>مقاعد الأحزاب</span>
                <span className="font-bold text-slate-900">{form.totalNationalPartySeats}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <button
              onClick={submit}
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEditMode ? 'حفظ التعديلات' : 'إنشاء الانتخاب'}
            </button>

            <button
              onClick={onCancel}
              disabled={isSaving}
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
