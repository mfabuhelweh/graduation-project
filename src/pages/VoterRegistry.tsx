import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Fingerprint,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../lib/utils";

interface VoterRegistryProps {
  voters: any[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  loading?: boolean;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .trim();
}

function getGenderLabel(gender?: string) {
  const normalized = normalizeText(gender);
  if (normalized === "male") return "ذكر";
  if (normalized === "female") return "أنثى";
  return "غير محدد";
}

function getAge(voter: any) {
  const explicitAge = Number(voter?.age);
  if (Number.isFinite(explicitAge) && explicitAge >= 18) {
    return explicitAge;
  }

  const birthDate = voter?.birthDate ? new Date(voter.birthDate) : null;
  if (!birthDate || Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 18 ? age : null;
}

function getVotingStatusLabel(voter: any) {
  return voter?.hasVoted ? "تم التصويت" : "بانتظار التصويت";
}

function getGovernorateName(voter: any) {
  return voter?.governorateName || voter?.districtName || "غير محدد";
}

export const VoterRegistry = ({
  voters,
  searchQuery,
  onSearchChange,
  loading = false,
}: VoterRegistryProps) => {
  const [selectedVoter, setSelectedVoter] = useState<any | null>(null);

  const filteredVoters = useMemo(() => {
    const query = normalizeText(searchQuery);
    if (!query) return voters;

    return voters.filter((voter) => {
      const searchableValues = [
        voter.fullName,
        voter.nationalId,
        voter.governorateName,
        voter.districtName,
        voter.districtCode,
        voter.phoneNumber,
        voter.email,
        getGenderLabel(voter.gender),
        getAge(voter.age)?.toString(),
      ];

      return searchableValues.some((value) =>
        normalizeText(value).includes(query),
      );
    });
  }, [searchQuery, voters]);

  const votedCount = voters.filter((voter) => voter.hasVoted).length;
  const maleCount = voters.filter(
    (voter) => normalizeText(voter.gender) === "male",
  ).length;
  const femaleCount = voters.filter(
    (voter) => normalizeText(voter.gender) === "female",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-900">سجل الناخبين</h2>
          <p className="mt-2 text-sm text-slate-500">
            متابعة بيانات الناخبين مع العمر والجنس والمحافظة وحالة التحقق
            البيومتري وحالة التصويت من شاشة الأدمن.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "إجمالي الناخبين",
            value: voters.length.toLocaleString(),
            color: "bg-slate-50 text-slate-700",
          },
          {
            label: "تم التصويت",
            value: votedCount.toLocaleString(),
            color: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "ذكور",
            value: maleCount.toLocaleString(),
            color: "bg-blue-50 text-blue-700",
          },
          {
            label: "إناث",
            value: femaleCount.toLocaleString(),
            color: "bg-amber-50 text-amber-700",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "rounded-2xl border border-slate-200 p-5 text-right shadow-sm",
              stat.color,
            )}
          >
            <p className="text-xs font-bold opacity-70">{stat.label}</p>
            <p className="mt-3 text-3xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="relative mr-auto max-w-md">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="ابحث بالاسم أو الرقم الوطني أو المحافظة أو العمر أو الجنس..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-10 pl-4 text-right text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-6 py-4 text-xs font-bold text-slate-400">
                  الناخب
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400">
                  الرقم الوطني
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400">
                  المحافظة
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400">
                  الجنس
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400">
                  العمر
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400">
                  الهاتف
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400">
                  الحالة
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-sm font-bold text-slate-500"
                  >
                    جاري تحميل سجلات الناخبين...
                  </td>
                </tr>
              ) : filteredVoters.length ? (
                filteredVoters.map((voter) => (
                  <tr
                    key={voter.id || voter.nationalId}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <div className="text-right">
                          <p className="font-black text-slate-900">
                            {voter.fullName}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {voter.electionTitle || "انتخاب غير محدد"}
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                          <Users className="h-4 w-4" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">
                      {voter.nationalId}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <p>{getGovernorateName(voter)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">
                      {getGenderLabel(voter.gender)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">
                      {getAge(voter) ?? "غير متوفر"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {voter.phoneNumber || "غير متوفر"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                            voter.hasVoted
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700",
                          )}
                        >
                          {voter.hasVoted ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {getVotingStatusLabel(voter)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                            voter.verifiedFace
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-600",
                          )}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {voter.verifiedFace ? "متحقق" : "غير متحقق"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <button
                        onClick={() => setSelectedVoter(voter)}
                        className="text-xs font-bold text-blue-600 transition hover:text-blue-800"
                      >
                        عرض التفاصيل
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-sm font-bold text-slate-500"
                  >
                    لا توجد سجلات مطابقة لنتيجة البحث الحالية.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedVoter && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl"
            >
              <div className="space-y-6 p-8">
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => setSelectedVoter(null)}
                    className="rounded-2xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="text-right">
                    <h3 className="text-xl font-black text-slate-900">
                      تفاصيل الناخب
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      بيانات السجل الانتخابي مع العمر والجنس والمحافظة وحالة
                      التحقق.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 rounded-3xl bg-slate-50 p-6">
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
                    <UserRound className="h-10 w-10" />
                  </div>
                  <div className="text-center">
                    <h4 className="text-lg font-black text-slate-900">
                      {selectedVoter.fullName}
                    </h4>
                    <p className="mt-1 text-sm font-bold text-blue-600">
                      {selectedVoter.nationalId}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {selectedVoter.electionTitle || "انتخاب غير محدد"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 text-right">
                    <p className="text-xs font-bold text-slate-400">المحافظة</p>
                    <p className="mt-2 text-sm font-black text-slate-900">
                      {getGovernorateName(selectedVoter)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-right">
                    <p className="text-xs font-bold text-slate-400">
                      الحالة الانتخابية
                    </p>
                    <p className="mt-2 text-sm font-black text-slate-900">
                      {getVotingStatusLabel(selectedVoter)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-right">
                    <p className="text-xs font-bold text-slate-400">الجنس</p>
                    <p className="mt-2 text-sm font-black text-slate-900">
                      {getGenderLabel(selectedVoter.gender)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-right">
                    <p className="text-xs font-bold text-slate-400">العمر</p>
                    <p className="mt-2 text-sm font-black text-slate-900">
                      {getAge(selectedVoter) ?? "غير متوفر"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-right">
                    <p className="text-xs font-bold text-slate-400">
                      تاريخ الميلاد
                    </p>
                    <p className="mt-2 text-sm font-black text-slate-900">
                      {selectedVoter.birthDate || "غير متوفر"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-right">
                    <p className="text-xs font-bold text-slate-400">
                      رقم الهاتف
                    </p>
                    <p className="mt-2 text-sm font-black text-slate-900">
                      {selectedVoter.phoneNumber || "غير متوفر"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-right">
                    <p className="text-xs font-bold text-slate-400">
                      البريد الإلكتروني
                    </p>
                    <p className="mt-2 text-sm font-black text-slate-900">
                      {selectedVoter.email || "غير متوفر"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-right">
                    <p className="text-xs font-bold text-slate-400">
                      التحقق البيومتري
                    </p>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-black text-slate-900">
                      <Fingerprint className="h-4 w-4 text-blue-600" />
                      {selectedVoter.verifiedFace ? "مكتمل" : "غير مكتمل"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedVoter(null)}
                  className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
