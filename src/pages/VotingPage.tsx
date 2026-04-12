import * as React from 'react';
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  Fingerprint,
  Loader2,
  Shield,
  Sparkles,
  UserRound,
  Vote,
} from 'lucide-react';
import {fetchBallotOptions, verifyFaceAndIssueToken} from '../lib/api';
import {cn} from '../lib/utils';

interface VotingPageProps {
  electionId?: string;
  initialNationalId?: string;
  voterName?: string;
  lockNationalId?: boolean;
  onVoteComplete: (payload: {
    nationalId: string;
    partyId: string;
    districtListId: string;
    districtCandidateIds: string[];
    votingToken?: string;
  }) => Promise<void> | void;
}

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const VotingPage = ({
  electionId,
  initialNationalId,
  voterName,
  lockNationalId = false,
  onVoteComplete,
}: VotingPageProps) => {
  const [step, setStep] = React.useState<Step>(0);
  const [nationalId, setNationalId] = React.useState(initialNationalId || '');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [verificationMessage, setVerificationMessage] = React.useState<string | null>(null);
  const [verificationScore, setVerificationScore] = React.useState<number | null>(null);
  const [votingToken, setVotingToken] = React.useState<string | null>(null);
  const [ballotOptions, setBallotOptions] = React.useState<any | null>(null);
  const [selectedParty, setSelectedParty] = React.useState<string | null>(null);
  const [selectedDistrictList, setSelectedDistrictList] = React.useState<string | null>(null);
  const [selectedDistrictCandidates, setSelectedDistrictCandidates] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (initialNationalId) {
      setNationalId(initialNationalId);
    }
  }, [initialNationalId]);

  const displayName = voterName?.trim() || 'المستخدم';
  const parties = ballotOptions?.parties || [];
  const districtLists = ballotOptions?.districtLists || [];
  const selectionLimit = Number(ballotOptions?.districtCandidateSelectionCount || 1);
  const selectedList = districtLists.find((item: any) => item.id === selectedDistrictList);

  const progressSteps = [
    'بيانات سند',
    'التحقق من الهوية',
    'الحزب الوطني',
    'القائمة المحلية',
    'مرشحو القائمة',
    'المراجعة',
    'تم',
  ];

  const handleSanadLinkedVerification = async () => {
    if (!electionId) {
      setVerificationMessage('لا يوجد انتخاب مرتبط بصفحة التصويت حاليًا.');
      return;
    }

    if (nationalId.length !== 10) {
      setVerificationMessage('تعذر قراءة الرقم الوطني من جلسة سند الحالية.');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await verifyFaceAndIssueToken({
        electionId,
        nationalId,
      });

      setVotingToken(response.votingToken);
      setVerificationScore(response.score ?? 96);

      const options = await fetchBallotOptions(electionId);
      setBallotOptions(options);
      setSelectedParty(null);
      setSelectedDistrictList(null);
      setSelectedDistrictCandidates([]);

      const missingParties = !options.parties?.length;
      const missingDistrictLists = !options.districtLists?.length;

      if (missingParties && missingDistrictLists) {
        setVerificationMessage('تم التحقق التجريبي، لكن لا توجد أحزاب أو قوائم محلية جاهزة لهذا الانتخاب.');
      } else if (missingParties) {
        setVerificationMessage('تم التحقق التجريبي، لكن لا توجد أحزاب وطنية متاحة في هذا الانتخاب.');
      } else if (missingDistrictLists) {
        setVerificationMessage('تم التحقق التجريبي، لكن لا توجد قوائم محلية متاحة لدائرتك.');
      } else {
        setVerificationMessage('تمت مقارنة صورة الوجه التجريبية مع صورة الوجه في سند وإصدار رمز الاقتراع بنجاح.');
      }

      setStep(2);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل التحقق من الهوية.';
      setVerificationMessage(message);
      setVerificationScore(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDistrictCandidateToggle = (candidateId: string) => {
    setSelectedDistrictCandidates((current) => {
      if (current.includes(candidateId)) {
        return current.filter((id) => id !== candidateId);
      }
      if (current.length >= selectionLimit) {
        return current;
      }
      return [...current, candidateId];
    });
  };

  const handleSubmitVote = async () => {
    if (!selectedParty) {
      setVerificationMessage('اختر حزبًا وطنيًا واحدًا قبل المتابعة.');
      return;
    }

    if (!selectedDistrictList) {
      setVerificationMessage('اختر قائمة محلية واحدة من دائرتك.');
      return;
    }

    if (!selectedDistrictCandidates.length) {
      setVerificationMessage('اختر مرشحًا واحدًا على الأقل من القائمة المحلية المحددة.');
      return;
    }

    if (!votingToken) {
      setVerificationMessage('رمز الاقتراع غير متاح. أعد التحقق من الهوية أولًا.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onVoteComplete({
        nationalId,
        partyId: selectedParty,
        districtListId: selectedDistrictList,
        districtCandidateIds: selectedDistrictCandidates,
        votingToken,
      });
      setStep(6);
    } catch (error) {
      setVerificationMessage(
        error instanceof Error ? error.message : 'تعذر إرسال الصوت. حاول مرة أخرى.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6" dir="rtl">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {progressSteps.map((label, index) => (
            <div key={`${label}-${index}`} className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-black',
                  step > index
                    ? 'bg-emerald-500 text-white'
                    : step === index
                      ? 'bg-[#238b84] text-white'
                      : 'bg-slate-200 text-slate-500',
                )}
              >
                {step > index ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className="text-sm font-bold text-slate-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {verificationMessage && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-right text-sm font-bold text-emerald-800">
          {verificationMessage}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === 0 && (
          <div className="space-y-6 text-right">
            <div className="rounded-[28px] bg-[linear-gradient(135deg,#238b84,#32b67a)] p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="text-right">
                  <p className="text-sm font-bold text-white/80">مرحبًا بك في التصويت الإلكتروني</p>
                  <h2 className="mt-2 text-3xl font-black">{displayName}</h2>
                  <p className="mt-3 text-sm leading-7 text-white/85">
                    تم التعرف عليك من خلال حساب سند المرتبط بالرقم الوطني المستخدم في تسجيل الدخول.
                  </p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
                  <BadgeCheck className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold text-slate-400">الاسم المرتبط بسند</p>
                <p className="mt-3 text-lg font-black text-slate-900">{displayName}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold text-slate-400">الرقم الوطني</p>
                <input
                  value={nationalId}
                  maxLength={10}
                  disabled={lockNationalId}
                  onChange={(event) => setNationalId(event.target.value.replace(/\D/g, ''))}
                  className="mt-2 w-full border-0 bg-transparent p-0 text-lg font-black tracking-[0.2em] text-slate-900 outline-none"
                  dir="ltr"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold text-slate-400">حالة الجلسة</p>
                <p className="mt-3 text-lg font-black text-[#238b84]">موثقة عبر سند</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(1)}
                className="rounded-2xl bg-[#238b84] px-5 py-3 text-sm font-black text-white hover:bg-[#1f7c76]"
              >
                متابعة إلى التحقق من الهوية
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 text-right">
            <div className="flex items-center gap-3">
              <Fingerprint className="h-6 w-6 text-[#238b84]" />
              <h2 className="text-xl font-black text-slate-900">التحقق من الهوية</h2>
            </div>

            <p className="text-sm leading-7 text-slate-500">
              سنستخدم في هذه الخطوة صورة الوجه التجريبية للمستخدم الحالي، ثم نقارنها مع صورة الوجه المرتبطة بسند لإتمام
              التحقق بشكل تجريبي.
            </p>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-900">صورة الوجه التي ستتم مقارنتها مع صورة الوجه في سند - وضع تجريبي</p>
              <div className="mt-4 flex h-64 items-center justify-center rounded-3xl bg-white">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[linear-gradient(135deg,#238b84,#32b67a)] text-white shadow-lg">
                    <UserRound className="h-12 w-12" />
                  </div>
                  <p className="text-base font-black text-slate-800">{displayName}</p>
                  <p className="text-xs text-slate-500">مطابقة تجريبية مع صورة الوجه المرتبطة بسند</p>
                </div>
              </div>
              <p className="mt-4 text-xs font-bold text-slate-500">هذه البطاقة تمثل صورة الوجه الحالية التي ستتم مقارنتها مع صورة سند بشكل تجريبي.</p>
            </div>

            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              التحقق هنا تجريبي الآن، وتتم المقارنة اعتمادًا على بيانات جلسة سند الحالية.
            </div>

            {verificationScore !== null && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-800">
                درجة المطابقة الحالية: {verificationScore}%
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(0)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                رجوع
              </button>

              <button
                onClick={handleSanadLinkedVerification}
                disabled={isVerifying}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#238b84] px-5 py-3 text-sm font-black text-white hover:bg-[#1f7c76] disabled:opacity-60"
              >
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                بدء التحقق التجريبي
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 text-right">
            <div className="flex items-center gap-3">
              <Vote className="h-6 w-6 text-[#238b84]" />
              <h2 className="text-xl font-black text-slate-900">أولًا: التصويت للحزب الوطني</h2>
            </div>
            <p className="text-sm text-slate-500">اختر حزبًا وطنيًا واحدًا فقط على مستوى المملكة.</p>

            {parties.length ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {parties.map((party: any) => (
                  <button
                    key={party.id}
                    onClick={() => setSelectedParty(party.id)}
                    className={cn(
                      'rounded-2xl border p-5 text-right transition-all',
                      selectedParty === party.id
                        ? 'border-[#238b84] bg-emerald-50 ring-2 ring-emerald-100'
                        : 'border-slate-200 bg-white hover:border-emerald-200',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-right">
                        <h3 className="font-black text-slate-900">{party.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {party.description || 'حزب وطني مشارك في هذه الانتخابات'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                لا توجد أحزاب وطنية متاحة في هذا الانتخاب.
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                رجوع
              </button>
              <button
                onClick={() => setStep(3)}
                className="rounded-2xl bg-[#238b84] px-5 py-3 text-sm font-black text-white hover:bg-[#1f7c76]"
              >
                التالي: القائمة المحلية
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-right">
            <div className="flex items-center gap-3">
              <Vote className="h-6 w-6 text-[#238b84]" />
              <h2 className="text-xl font-black text-slate-900">ثانيًا: اختيار القائمة المحلية</h2>
            </div>
            <p className="text-sm text-slate-500">
              تظهر هنا فقط القوائم التابعة لدائرتك: {ballotOptions?.voterDistrict?.name || 'غير محددة'}.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {districtLists.map((list: any) => (
                <button
                  key={list.id}
                  onClick={() => {
                    setSelectedDistrictList(list.id);
                    setSelectedDistrictCandidates([]);
                  }}
                  className={cn(
                    'rounded-2xl border p-5 text-right transition-all',
                    selectedDistrictList === list.id
                      ? 'border-[#238b84] bg-emerald-50 ring-2 ring-emerald-100'
                      : 'border-slate-200 bg-white hover:border-emerald-200',
                  )}
                >
                  <h3 className="font-black text-slate-900">{list.name}</h3>
                  <p className="mt-2 text-xs text-slate-500">{list.description || 'قائمة محلية ضمن دائرة الناخب'}</p>
                  <p className="mt-3 text-xs font-bold text-slate-400">
                    {list.districtName} - {list.candidates?.length || 0} مرشح
                  </p>
                </button>
              ))}
            </div>

            {!districtLists.length && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                لا توجد قوائم محلية لهذه الدائرة داخل هذا الانتخاب.
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                رجوع
              </button>
              <button
                onClick={() => setStep(4)}
                className="rounded-2xl bg-[#238b84] px-5 py-3 text-sm font-black text-white hover:bg-[#1f7c76]"
              >
                التالي: مرشحو القائمة
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 text-right">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-[#238b84]" />
              <h2 className="text-xl font-black text-slate-900">ثالثًا: اختيار مرشحي القائمة المحلية</h2>
            </div>
            <p className="text-sm text-slate-500">يمكنك اختيار {selectionLimit} مرشح كحد أقصى من نفس القائمة فقط.</p>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
              القائمة المختارة: {selectedList?.name || 'لم يتم اختيار قائمة بعد'}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(selectedList?.candidates || []).map((candidate: any) => {
                const selected = selectedDistrictCandidates.includes(candidate.id);
                return (
                  <button
                    key={candidate.id}
                    onClick={() => handleDistrictCandidateToggle(candidate.id)}
                    className={cn(
                      'flex items-center justify-between gap-4 rounded-2xl border p-4 text-right transition-all',
                      selected
                        ? 'border-[#238b84] bg-emerald-50 ring-2 ring-emerald-100'
                        : 'border-slate-200 bg-white hover:border-emerald-200',
                    )}
                  >
                    <div className="text-right">
                      <p className="font-black text-slate-900">{candidate.fullName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        الترتيب {candidate.candidateOrder}
                        {candidate.candidateNumber ? ` - الرقم ${candidate.candidateNumber}` : ''}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full border',
                        selected ? 'border-[#238b84] bg-[#238b84] text-white' : 'border-slate-300 text-slate-400',
                      )}
                    >
                      {selected ? <Check className="h-4 w-4" /> : selectedDistrictCandidates.length + 1}
                    </div>
                  </button>
                );
              })}
            </div>

            {!selectedList?.candidates?.length && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                لا يوجد مرشحون داخل القائمة المختارة، أو لم يتم اختيار قائمة بعد.
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(3)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                رجوع
              </button>
              <button
                onClick={() => setStep(5)}
                className="rounded-2xl bg-[#238b84] px-5 py-3 text-sm font-black text-white hover:bg-[#1f7c76]"
              >
                مراجعة الاختيارات
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 text-right">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-[#238b84]" />
              <h2 className="text-xl font-black text-slate-900">مراجعة نهائية قبل الإرسال</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold text-slate-400">الناخب</p>
                <p className="mt-3 font-black text-slate-900">{displayName}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold text-slate-400">الرقم الوطني</p>
                <p className="mt-3 font-black text-slate-900">{nationalId}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold text-slate-400">الحزب الوطني</p>
                <p className="mt-3 font-black text-slate-900">
                  {parties.find((party: any) => party.id === selectedParty)?.name || 'غير محدد'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold text-slate-400">القائمة المحلية</p>
                <p className="mt-3 font-black text-slate-900">{selectedList?.name || 'غير محددة'}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-400">مرشحو القائمة المحلية المختارون</p>
              <div className="mt-3 space-y-2">
                {(selectedList?.candidates || [])
                  .filter((candidate: any) => selectedDistrictCandidates.includes(candidate.id))
                  .map((candidate: any) => (
                    <div
                      key={candidate.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
                    >
                      {candidate.fullName}
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(4)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                رجوع
              </button>
              <button
                onClick={handleSubmitVote}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                تأكيد وإرسال الصوت
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5 py-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">تم تسجيل صوتك بنجاح</h2>
            <p className="text-sm leading-7 text-slate-500">
              شكرًا {displayName}. تم حفظ الصوت بشكل مجهول وربط الجلسة فقط بمعاملة التصويت دون طلب الرقم الوطني منك مرة أخرى.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
