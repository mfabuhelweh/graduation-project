import * as React from 'react';
import { useMemo, useState } from 'react';
import { AlertCircle, Loader2, PlusCircle, X } from 'lucide-react';
import { validateGeneralList } from '../lib/electionLogic';
import { createElection } from '../lib/api';

interface CreateElectionProps {
  setToast: (t: any) => void;
  language: string;
  onCreated: () => Promise<void>;
  setActiveTab: (tab: string) => void;
}

const districts = [
  'عمّان',
  'إربد',
  'الزرقاء',
  'البلقاء',
  'الكرك',
  'معان',
  'المفرق',
  'الطفيلة',
  'مادبا',
  'جرش',
  'عجلون',
  'العقبة',
  'بدو الشمال',
  'بدو الوسط',
  'بدو الجنوب',
];

export const CreateElection = ({ setToast, language, onCreated, setActiveTab }: CreateElectionProps) => {
  const [electionType, setElectionType] = useState('دائرة محلية');
  const [electionTitle, setElectionTitle] = useState('');
  const [district, setDistrict] = useState('عمّان');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidateGender, setNewCandidateGender] = useState<'male' | 'female'>('male');
  const [newCandidateAge, setNewCandidateAge] = useState(30);
  const [isSaving, setIsSaving] = useState(false);

  const isGeneralElection = electionType === 'قائمة حزبية وطنية';
  const validation = useMemo(
    () => (isGeneralElection ? validateGeneralList(candidates) : { isValid: true, errors: [] }),
    [candidates, isGeneralElection],
  );

  const addCandidate = () => {
    if (!newCandidateName.trim()) return;

    setCandidates((current) => [
      ...current,
      {
        id: Date.now().toString(),
        name: newCandidateName.trim(),
        gender: newCandidateGender,
        age: newCandidateAge,
      },
    ]);
    setNewCandidateName('');
  };

  const removeCandidate = (id: string) => {
    setCandidates((current) => current.filter((candidate) => candidate.id !== id));
  };

  const buildPayload = (status: 'Draft' | 'Voting Open') => ({
    title: electionTitle,
    type: isGeneralElection ? ('general' as const) : ('local' as const),
    districtId: district,
    faculty: district,
    voters: 0,
    candidates,
    status,
    startDate,
    endDate,
    description,
  });

  const saveElection = async (status: 'Draft' | 'Voting Open') => {
    if (!electionTitle || !startDate || !endDate) {
      setToast({
        message: language === 'ar' ? 'يرجى تعبئة جميع الحقول المطلوبة.' : 'Please fill all required fields.',
        type: 'error',
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (!validation.isValid) {
      setToast({
        message: language === 'ar' ? 'يرجى تصحيح أخطاء القائمة قبل النشر.' : 'Please fix list errors.',
        type: 'error',
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    try {
      setIsSaving(true);
      await createElection(buildPayload(status));
      await onCreated();
      setToast({
        message:
          status === 'Draft'
            ? language === 'ar'
              ? 'تم حفظ المسودة بنجاح.'
              : 'Draft saved successfully.'
            : language === 'ar'
              ? 'تم نشر الانتخابات بنجاح.'
              : 'Election published successfully.',
        type: 'success',
      });
      setTimeout(() => setToast(null), 3000);
      setActiveTab('Elections');
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to save election',
        type: 'error',
      });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-right">
        <h2 className="text-2xl font-bold text-slate-900">إنشاء انتخابات جديدة</h2>
        <p className="text-sm text-slate-500">
          أضف بيانات الانتخاب، الدائرة، المرشحين، ثم احفظه كمسودة أو افتح التصويت.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-3 text-right">
              <label className="block text-sm font-bold text-slate-700">عنوان الانتخابات</label>
              <input
                type="text"
                value={electionTitle}
                onChange={(event) => setElectionTitle(event.target.value)}
                placeholder="مثال: انتخابات الدائرة الأولى - عمّان 2026"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 text-right">
                <label className="block text-sm font-bold text-slate-700">نوع الانتخاب</label>
                <select
                  value={electionType}
                  onChange={(event) => setElectionType(event.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option>دائرة محلية</option>
                  <option>قائمة حزبية وطنية</option>
                </select>
              </div>

              <div className="space-y-3 text-right">
                <label className="block text-sm font-bold text-slate-700">المحافظة / الدائرة</label>
                <select
                  value={district}
                  onChange={(event) => setDistrict(event.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  {districts.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 text-right">
                <label className="block text-sm font-bold text-slate-700">تاريخ البدء</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div className="space-y-3 text-right">
                <label className="block text-sm font-bold text-slate-700">تاريخ الانتهاء</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-3 text-right">
              <label className="block text-sm font-bold text-slate-700">وصف مختصر</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="أدخل وصفًا موجزًا للانتخاب، نوع المقاعد، أو ملاحظات الإدارة."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="text-right">
              <h3 className="text-lg font-bold text-slate-900">
                {isGeneralElection ? 'مرشحو القائمة الحزبية' : 'مرشحو الدائرة'}
              </h3>
              <p className="text-sm text-slate-500">
                أضف المرشحين بالترتيب المطلوب. عند إنشاء قائمة حزبية سيتم فحص شروط الترتيب.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2 space-y-2 text-right">
                <label className="block text-xs font-bold text-slate-500">اسم المرشح</label>
                <input
                  type="text"
                  value={newCandidateName}
                  onChange={(event) => setNewCandidateName(event.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-right text-sm"
                />
              </div>

              <div className="space-y-2 text-right">
                <label className="block text-xs font-bold text-slate-500">الجنس</label>
                <select
                  value={newCandidateGender}
                  onChange={(event) => setNewCandidateGender(event.target.value as 'male' | 'female')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-right text-sm"
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>

              <div className="space-y-2 text-right">
                <label className="block text-xs font-bold text-slate-500">العمر</label>
                <input
                  type="number"
                  min={18}
                  value={newCandidateAge}
                  onChange={(event) => setNewCandidateAge(Number(event.target.value || 18))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-right text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={addCandidate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                إضافة مرشح
              </button>
            </div>

            {candidates.length > 0 && (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">الترتيب</th>
                        <th className="px-4 py-3">الاسم</th>
                        <th className="px-4 py-3">الجنس</th>
                        <th className="px-4 py-3">العمر</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((candidate, index) => (
                        <tr key={candidate.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3 font-bold text-blue-600">#{index + 1}</td>
                          <td className="px-4 py-3 font-medium">{candidate.name}</td>
                          <td className="px-4 py-3">{candidate.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                          <td className="px-4 py-3">{candidate.age}</td>
                          <td className="px-4 py-3 text-left">
                            <button onClick={() => removeCandidate(candidate.id)} className="text-rose-500 hover:text-rose-700">
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!validation.isValid && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-2">
                    {validation.errors.map((error, index) => (
                      <div key={index} className="flex items-center gap-2 justify-end text-rose-600 text-xs font-bold">
                        <span>{error}</span>
                        <AlertCircle className="w-3.5 h-3.5" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-right space-y-4">
            <h3 className="text-lg font-bold text-slate-900">ملخص سريع</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between flex-row-reverse">
                <span>نوع الانتخاب</span>
                <span className="font-bold text-slate-900">{electionType}</span>
              </div>
              <div className="flex justify-between flex-row-reverse">
                <span>الدائرة</span>
                <span className="font-bold text-slate-900">{district}</span>
              </div>
              <div className="flex justify-between flex-row-reverse">
                <span>عدد المرشحين</span>
                <span className="font-bold text-slate-900">{candidates.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <button
              onClick={() => saveElection('Voting Open')}
              disabled={isSaving}
              className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              نشر الانتخابات
            </button>

            <button
              onClick={() => saveElection('Draft')}
              disabled={isSaving}
              className="w-full py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-60"
            >
              حفظ كمسودة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
