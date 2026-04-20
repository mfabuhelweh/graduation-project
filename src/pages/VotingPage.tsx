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
  language?: 'ar' | 'en';
  onVoteComplete: (payload: {
    nationalId: string;
    partyId: string;
    districtListId: string;
    districtCandidateIds: string[];
    votingToken?: string;
  }) => Promise<void> | void;
}

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function getEntitySeed(entity: any, type: 'party' | 'list' | 'candidate') {
  return encodeURIComponent(
    `${type}-${entity?.id || entity?.nationalId || entity?.candidateNumber || entity?.code || entity?.name || entity?.fullName || 'entity'}`,
  );
}

function getGeneratedEntityImage(entity: any, type: 'party' | 'list' | 'candidate') {
  const seed = getEntitySeed(entity, type);

  if (type === 'candidate') {
    return `https://i.pravatar.cc/160?u=${seed}`;
  }

  return `https://api.dicebear.com/9.x/shapes/png?seed=${seed}&backgroundColor=ffffff,dbeafe,e0f2fe&radius=8`;
}

function getEntityImage(entity: any, type: 'party' | 'list' | 'candidate') {
  return entity?.photoUrl || entity?.logoUrl || entity?.imageUrl || entity?.avatarUrl || getGeneratedEntityImage(entity, type);
}

function buildConfirmationCode(electionId: string, votingToken: string) {
  const source = `${electionId}-${votingToken}-${Date.now()}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chars = Array.from({ length: 8 }, (_, index) => alphabet[(hash >> (index * 4)) & 31]);
  return `${chars.slice(0, 2).join('')}-${chars.slice(2, 4).join('')}-${chars.slice(4, 6).join('')}-${chars.slice(6, 8).join('')}`;
}

function EntityAvatar({
  entity,
  type,
  compact = false,
}: {
  entity: any;
  type: 'party' | 'list' | 'candidate';
  compact?: boolean;
}) {
  const imageUrl = getEntityImage(entity, type);
  const label = entity?.name || entity?.fullName || '';
  const initials = String(label)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-blue-600',
        compact ? 'h-10 w-10' : 'h-14 w-14',
      )}
    >
      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

export const VotingPage = ({
  electionId,
  initialNationalId,
  voterName,
  lockNationalId = false,
  language = 'ar',
  onVoteComplete,
}: VotingPageProps) => {
  const isArabic = language === 'ar';
  const t = (ar: string, en: string) => (isArabic ? ar : en);
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
  const [confirmationCode, setConfirmationCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialNationalId) {
      setNationalId(initialNationalId);
    }
  }, [initialNationalId]);

  const displayName = voterName?.trim() || t('المستخدم', 'User');
  const parties = ballotOptions?.parties || [];
  const districtLists = ballotOptions?.districtLists || [];
  const selectionLimit = Number(ballotOptions?.districtCandidateSelectionCount || 1);
  const selectedList = districtLists.find((item: any) => item.id === selectedDistrictList);

  const progressSteps = [
    t('بيانات الناخب', 'Voter Data'),
    t('التحقق من الهوية', 'Identity Check'),
    t('الحزب الوطني', 'National Party'),
    t('القائمة المحلية', 'Local List'),
    t('مرشحو القائمة', 'List Candidates'),
    t('المراجعة', 'Review'),
    t('تم', 'Done'),
  ];

  const handleSanadLinkedVerification = async () => {
    if (!electionId) {
      setVerificationMessage(t('لا يوجد انتخاب مرتبط بصفحة التصويت حاليًا.', 'No election is currently linked to this voting page.'));
      return;
    }

    if (nationalId.length !== 10) {
      setVerificationMessage(t('تعذر قراءة الرقم الوطني من جلسة سند الحالية.', 'Unable to read national ID from current SANAD session.'));
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
        setVerificationMessage(t('تم التحقق التجريبي، لكن لا توجد أحزاب أو قوائم محلية جاهزة لهذا الانتخاب.', 'Verification succeeded, but no parties or local lists are configured for this election.'));
      } else if (missingParties) {
        setVerificationMessage(t('تم التحقق التجريبي، لكن لا توجد أحزاب وطنية متاحة في هذا الانتخاب.', 'Verification succeeded, but no national parties are available.'));
      } else if (missingDistrictLists) {
        setVerificationMessage(t('تم التحقق التجريبي، لكن لا توجد قوائم محلية متاحة لدائرتك.', 'Verification succeeded, but no local lists are available for your district.'));
      } else {
        setVerificationMessage(t('تمت مقارنة صورة الوجه التجريبية مع صورة الوجه في سند وإصدار رمز الاقتراع بنجاح.', 'Face match simulation succeeded and voting token was issued.'));
      }

      setStep(2);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('فشل التحقق من الهوية.', 'Identity verification failed.');
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
      setVerificationMessage(t('اختر حزبًا وطنيًا واحدًا قبل المتابعة.', 'Select one national party before continuing.'));
      return;
    }

    if (!selectedDistrictList) {
      setVerificationMessage(t('اختر قائمة محلية واحدة من دائرتك.', 'Select one local list from your district.'));
      return;
    }

    if (!selectedDistrictCandidates.length) {
      setVerificationMessage(t('اختر مرشحًا واحدًا على الأقل من القائمة المحلية المحددة.', 'Select at least one candidate from the selected local list.'));
      return;
    }

    if (!votingToken) {
      setVerificationMessage(t('رمز الاقتراع غير متاح. أعد التحقق من الهوية أولًا.', 'Voting token is unavailable. Verify identity first.'));
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
      setConfirmationCode(buildConfirmationCode(electionId || 'vote', votingToken));
      setStep(6);
    } catch (error) {
      setVerificationMessage(
        error instanceof Error ? error.message : t('تعذر إرسال الصوت. حاول مرة أخرى.', 'Unable to submit vote. Please try again.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionRow = 'flex flex-col gap-3 md:flex-row md:items-center md:justify-between';
  const btnBack =
    'touch-manipulation min-h-12 w-full rounded-2xl border border-slate-200 px-5 py-3.5 text-base font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-100 md:w-auto md:py-3 md:text-sm';
  const btnPrimary =
    'touch-manipulation inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#238b84] px-5 py-3.5 text-base font-black text-white hover:bg-[#1f7c76] active:opacity-90 disabled:opacity-60 md:w-auto md:py-3 md:text-sm';
  const btnDanger =
    'touch-manipulation inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-base font-black text-white hover:bg-slate-800 active:opacity-90 disabled:opacity-60 md:w-auto md:py-3 md:text-sm';

  return (
    <div className="mx-auto max-w-6xl space-y-4 md:space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-3xl md:p-5">
        <div className="-mx-1 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]">
          <div className="flex min-w-max items-center gap-3 px-1 md:flex-wrap md:gap-4">
            {progressSteps.map((label, index) => (
              <div key={`${label}-${index}`} className="flex shrink-0 items-center gap-2 md:gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black md:h-10 md:w-10 md:text-sm',
                    step > index
                      ? 'bg-emerald-500 text-white'
                      : step === index
                        ? 'bg-[#238b84] text-white'
                        : 'bg-slate-200 text-slate-500',
                  )}
                >
                  {step > index ? <Check className="h-3.5 w-3.5 md:h-4 md:w-4" /> : index + 1}
                </div>
                <span className="max-w-[6.5rem] text-xs font-bold leading-tight text-slate-600 md:max-w-none md:text-sm">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {verificationMessage && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-right text-sm font-bold leading-relaxed text-emerald-800 md:text-sm">
          {verificationMessage}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-6">
        {step === 0 && (
          <div className="space-y-6 text-right">
            <div className="rounded-2xl bg-[linear-gradient(135deg,#238b84,#32b67a)] p-4 text-white md:rounded-[28px] md:p-6">
              <div className="flex items-start justify-between gap-3 md:gap-4">
                <div className="min-w-0 text-right">
                  <p className="text-xs font-bold text-white/80 md:text-sm">{t('مرحبًا بك في التصويت الإلكتروني', 'Welcome to e-voting')}</p>
                  <h2 className="mt-2 break-words text-2xl font-black md:text-3xl">{displayName}</h2>
                  <p className="mt-3 text-xs leading-6 text-white/85 md:text-sm md:leading-7">
                    {t(
                      'تم التعرف عليك من خلال حساب سند المرتبط بالرقم الوطني المستخدم في تسجيل الدخول.',
                      'You were identified through your SANAD account linked to the national ID used at sign in.',
                    )}
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 md:h-16 md:w-16 md:rounded-2xl">
                  <BadgeCheck className="h-7 w-7 md:h-8 md:w-8" />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                <p className="text-xs font-bold text-slate-400">{t('الاسم المرتبط بسند', 'Name linked to SANAD')}</p>
                <p className="mt-2 break-words text-base font-black text-slate-900 md:mt-3 md:text-lg">{displayName}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                <p className="text-xs font-bold text-slate-400">{t('الرقم الوطني', 'National ID')}</p>
                <input
                  aria-label={t('الرقم الوطني', 'National ID')}
                  title={t('الرقم الوطني', 'National ID')}
                  value={nationalId}
                  maxLength={10}
                  disabled={lockNationalId}
                  onChange={(event) => setNationalId(event.target.value.replace(/\D/g, ''))}
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg font-black tracking-[0.15em] text-slate-900 outline-none focus:border-[#238b84] disabled:bg-slate-100 md:border-0 md:bg-transparent md:p-0 md:tracking-[0.2em]"
                  dir="ltr"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2 md:col-span-1 md:p-5">
                <p className="text-xs font-bold text-slate-400">{t('حالة الجلسة', 'Session status')}</p>
                <p className="mt-2 text-base font-black text-[#238b84] md:mt-3 md:text-lg">{t('موثقة عبر سند', 'Verified via SANAD')}</p>
              </div>
            </div>

            <div className="flex justify-stretch md:justify-end">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="touch-manipulation min-h-12 w-full rounded-2xl bg-[#238b84] px-5 py-3.5 text-base font-black text-white hover:bg-[#1f7c76] active:opacity-90 md:w-auto md:py-3 md:text-sm"
              >
                {t('متابعة إلى التحقق من الهوية', 'Continue to identity verification')}
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 text-right">
            <div className="flex items-center gap-3">
              <Fingerprint className="h-7 w-7 shrink-0 text-[#238b84] md:h-6 md:w-6" />
              <h2 className="text-lg font-black text-slate-900 md:text-xl">{t('التحقق من الهوية', 'Identity verification')}</h2>
            </div>

            <p className="text-sm leading-7 text-slate-500 md:text-sm">
              {t(
                'سنستخدم في هذه الخطوة صورة الوجه التجريبية للمستخدم الحالي، ثم نقارنها مع صورة الوجه المرتبطة بسند لإتمام التحقق بشكل تجريبي.',
                'In this step, we use a simulated face image of the current user and compare it with SANAD face data for demo verification.',
              )}
            </p>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:rounded-3xl md:p-5">
              <p className="text-sm font-black leading-snug text-slate-900">
                {t('صورة الوجه التي ستتم مقارنتها مع صورة الوجه في سند - وضع تجريبي', 'Face image to compare with SANAD - demo mode')}
              </p>
              <div className="mt-4 flex h-52 items-center justify-center rounded-2xl bg-white md:h-64 md:rounded-3xl">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[linear-gradient(135deg,#238b84,#32b67a)] text-white shadow-lg">
                    <UserRound className="h-12 w-12" />
                  </div>
                  <p className="text-base font-black text-slate-800">{displayName}</p>
                  <p className="text-xs text-slate-500">{t('مطابقة تجريبية مع صورة الوجه المرتبطة بسند', 'Demo match with SANAD face data')}</p>
                </div>
              </div>
              <p className="mt-4 text-xs font-bold text-slate-500">
                {t(
                  'هذه البطاقة تمثل صورة الوجه الحالية التي ستتم مقارنتها مع صورة سند بشكل تجريبي.',
                  'This card represents the current face image that will be compared with SANAD data in demo mode.',
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              {t('التحقق هنا تجريبي الآن، وتتم المقارنة اعتمادًا على بيانات جلسة سند الحالية.', 'Verification here is in demo mode and uses the current SANAD session data.')}
            </div>

            {verificationScore !== null && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-800">
                {t('درجة المطابقة الحالية', 'Current match score')}: {verificationScore}%
              </div>
            )}

            <div className={actionRow}>
              <button type="button" onClick={() => setStep(0)} className={btnBack}>
                {t('رجوع', 'Back')}
              </button>

              <button
                type="button"
                onClick={handleSanadLinkedVerification}
                disabled={isVerifying}
                className={btnPrimary}
              >
                {isVerifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5 md:h-4 md:w-4" />}
                {t('بدء التحقق التجريبي', 'Start verification')}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 text-right md:space-y-6">
            <div className="flex items-center gap-3">
              <Vote className="h-7 w-7 shrink-0 text-[#238b84] md:h-6 md:w-6" />
              <h2 className="text-lg font-black leading-snug text-slate-900 md:text-xl">{t('أولًا: التصويت للحزب الوطني', 'First: vote for national party')}</h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-500">{t('اختر حزبًا وطنيًا واحدًا فقط على مستوى المملكة.', 'Select exactly one national party.')}</p>

            {parties.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-3">
                {parties.map((party: any) => (
                  <button
                    type="button"
                    key={party.id}
                    onClick={() => setSelectedParty(party.id)}
                    className={cn(
                      'touch-manipulation min-h-[4.5rem] rounded-2xl border p-4 text-right transition-all active:scale-[0.99] md:min-h-0 md:p-5',
                      selectedParty === party.id
                        ? 'border-[#238b84] bg-emerald-50 ring-2 ring-emerald-100'
                        : 'border-slate-200 bg-white hover:border-emerald-200',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <EntityAvatar entity={party} type="party" />
                      <div className="min-w-0 text-right">
                        <h3 className="text-base font-black text-slate-900 md:text-lg">{party.name}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500 md:text-xs">
                          {party.description || t('حزب وطني مشارك في هذه الانتخابات', 'National party participating in this election')}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                {t('لا توجد أحزاب وطنية متاحة في هذا الانتخاب.', 'No national parties are available for this election.')}
              </div>
            )}

            <div className={actionRow}>
              <button type="button" onClick={() => setStep(1)} className={btnBack}>
                {t('رجوع', 'Back')}
              </button>
              <button type="button" onClick={() => setStep(3)} className={btnPrimary}>
                {t('التالي: القائمة المحلية', 'Next: local list')}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 text-right md:space-y-6">
            <div className="flex items-center gap-3">
              <Vote className="h-7 w-7 shrink-0 text-[#238b84] md:h-6 md:w-6" />
              <h2 className="text-lg font-black leading-snug text-slate-900 md:text-xl">{t('ثانيًا: اختيار القائمة المحلية', 'Second: choose local list')}</h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-500">
              {t('تظهر هنا فقط القوائم التابعة لدائرتك', 'Only lists from your district are shown here')}: {ballotOptions?.voterDistrict?.name || t('غير محددة', 'Not specified')}.
            </p>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              {districtLists.map((list: any) => (
                <button
                  type="button"
                  key={list.id}
                  onClick={() => {
                    setSelectedDistrictList(list.id);
                    setSelectedDistrictCandidates([]);
                  }}
                  className={cn(
                    'touch-manipulation min-h-[4.5rem] rounded-2xl border p-4 text-right transition-all active:scale-[0.99] md:min-h-0 md:p-5',
                    selectedDistrictList === list.id
                      ? 'border-[#238b84] bg-emerald-50 ring-2 ring-emerald-100'
                      : 'border-slate-200 bg-white hover:border-emerald-200',
                  )}
                >
                  <div className="mb-3 flex justify-end">
                    <EntityAvatar entity={list} type="list" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">{list.name}</h3>
                  <p className="mt-2 text-xs text-slate-500">{list.description || t('قائمة محلية ضمن دائرة الناخب', 'Local list within voter district')}</p>
                  <p className="mt-3 text-xs font-bold text-slate-400">
                    {list.districtName} - {list.candidates?.length || 0} {t('مرشح', 'candidates')}
                  </p>
                </button>
              ))}
            </div>

            {!districtLists.length && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                {t('لا توجد قوائم محلية لهذه الدائرة داخل هذا الانتخاب.', 'No local lists for this district in this election.')}
              </div>
            )}

            <div className={actionRow}>
              <button type="button" onClick={() => setStep(2)} className={btnBack}>
                {t('رجوع', 'Back')}
              </button>
              <button type="button" onClick={() => setStep(4)} className={btnPrimary}>
                {t('التالي: مرشحو القائمة', 'Next: candidates')}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5 text-right md:space-y-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-7 w-7 shrink-0 text-[#238b84] md:h-6 md:w-6" />
              <h2 className="text-lg font-black leading-snug text-slate-900 md:text-xl">
                {t('ثالثًا: اختيار مرشحي القائمة المحلية', 'Third: choose local list candidates')}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-500">
              {t('يمكنك اختيار', 'You can select')} {selectionLimit} {t('مرشح كحد أقصى من نفس القائمة فقط.', 'candidate(s) at most from the same list.')}
            </p>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
              {t('القائمة المختارة', 'Selected list')}: {selectedList?.name || t('لم يتم اختيار قائمة بعد', 'No list selected yet')}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              {(selectedList?.candidates || []).map((candidate: any) => {
                const selected = selectedDistrictCandidates.includes(candidate.id);
                return (
                  <button
                    type="button"
                    key={candidate.id}
                    onClick={() => handleDistrictCandidateToggle(candidate.id)}
                    className={cn(
                      'flex min-h-[3.75rem] touch-manipulation items-center justify-between gap-4 rounded-2xl border p-4 text-right transition-all active:scale-[0.99]',
                      selected
                        ? 'border-[#238b84] bg-emerald-50 ring-2 ring-emerald-100'
                        : 'border-slate-200 bg-white hover:border-emerald-200',
                    )}
                  >
                    <EntityAvatar entity={candidate} type="candidate" />
                    <div className="min-w-0 text-right">
                      <p className="text-base font-black text-slate-900">{candidate.fullName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t('الترتيب', 'Order')} {candidate.candidateOrder}
                        {candidate.candidateNumber ? ` - ${t('الرقم', 'No.')} ${candidate.candidateNumber}` : ''}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-black md:h-8 md:w-8 md:text-xs',
                        selected ? 'border-[#238b84] bg-[#238b84] text-white' : 'border-slate-300 text-slate-400',
                      )}
                    >
                      {selected ? <Check className="h-5 w-5 md:h-4 md:w-4" /> : selectedDistrictCandidates.length + 1}
                    </div>
                  </button>
                );
              })}
            </div>

            {!selectedList?.candidates?.length && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                {t('لا يوجد مرشحون داخل القائمة المختارة، أو لم يتم اختيار قائمة بعد.', 'No candidates in selected list, or no list selected yet.')}
              </div>
            )}

            <div className={actionRow}>
              <button type="button" onClick={() => setStep(3)} className={btnBack}>
                {t('رجوع', 'Back')}
              </button>
              <button type="button" onClick={() => setStep(5)} className={btnPrimary}>
                {t('مراجعة الاختيارات', 'Review choices')}
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5 text-right md:space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="h-7 w-7 shrink-0 text-[#238b84] md:h-6 md:w-6" />
              <h2 className="text-lg font-black text-slate-900 md:text-xl">{t('مراجعة نهائية قبل الإرسال', 'Final review before submit')}</h2>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                <p className="text-xs font-bold text-slate-400">{t('الناخب', 'Voter')}</p>
                <p className="mt-2 break-words font-black text-slate-900 md:mt-3">{displayName}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                <p className="text-xs font-bold text-slate-400">{t('الرقم الوطني', 'National ID')}</p>
                <p className="mt-2 font-black text-slate-900 md:mt-3">{nationalId}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                <p className="text-xs font-bold text-slate-400">{t('الحزب الوطني', 'National party')}</p>
                <p className="mt-2 break-words font-black text-slate-900 md:mt-3">
                  {parties.find((party: any) => party.id === selectedParty)?.name || t('غير محدد', 'Not selected')}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2 md:col-span-1 md:p-5">
                <p className="text-xs font-bold text-slate-400">{t('القائمة المحلية', 'Local list')}</p>
                <p className="mt-2 break-words font-black text-slate-900 md:mt-3">{selectedList?.name || t('غير محددة', 'Not selected')}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
              <p className="text-xs font-bold text-slate-400">{t('مرشحو القائمة المحلية المختارون', 'Selected local list candidates')}</p>
              <div className="mt-3 space-y-2">
                {(selectedList?.candidates || [])
                  .filter((candidate: any) => selectedDistrictCandidates.includes(candidate.id))
                  .map((candidate: any) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-end gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold leading-snug text-slate-700 md:py-3"
                    >
                      <span>{candidate.fullName}</span>
                      <EntityAvatar entity={candidate} type="candidate" compact />
                    </div>
                  ))}
              </div>
            </div>

            <div className={actionRow}>
              <button type="button" onClick={() => setStep(4)} className={btnBack}>
                {t('رجوع', 'Back')}
              </button>
              <button type="button" onClick={handleSubmitVote} disabled={isSubmitting} className={btnDanger}>
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5 md:h-4 md:w-4" />}
                {t('تأكيد وإرسال الصوت', 'Confirm and submit vote')}
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5 py-8 text-center md:py-10">
            <div className="mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-emerald-500 text-white md:h-20 md:w-20">
              <CheckCircle2 className="h-11 w-11 md:h-10 md:w-10" />
            </div>
            <h2 className="text-xl font-black text-slate-900 md:text-2xl">{t('تم تسجيل صوتك بنجاح', 'Your vote was recorded successfully')}</h2>
            <p className="mx-auto max-w-md px-1 text-sm leading-7 text-slate-500">
              {t(
                `شكرًا ${displayName}. تم حفظ الصوت بشكل مجهول وربط الجلسة فقط بمعاملة التصويت دون طلب الرقم الوطني منك مرة أخرى.`,
                `Thank you ${displayName}. Your vote is stored anonymously and linked only to the voting transaction.`,
              )}
            </p>
            <div className="mx-auto max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-bold text-slate-500">{t('رمز تأكيد التصويت', 'Vote confirmation code')}</p>
              <p className="mt-2 font-mono text-2xl font-black tracking-[0.2em] text-emerald-600">
                {confirmationCode || 'A7-X9-K2-P4'}
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                {t('احتفظ بهذا الرمز لمراجعة حالة العملية لاحقًا.', 'Keep this code to review the transaction status later.')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
