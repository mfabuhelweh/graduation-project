import * as React from 'react';
import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Download, Search, Users, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';

interface VoterRegistryProps {
  voters: any[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const VoterRegistry = ({ voters, searchQuery, onSearchChange }: VoterRegistryProps) => {
  const [selectedVoter, setSelectedVoter] = useState<any | null>(null);

  const filteredVoters = useMemo(
    () =>
      voters.filter((voter) =>
        (voter.fullName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (voter.nationalId || '').includes(searchQuery) ||
        (voter.district || '').includes(searchQuery),
      ),
    [searchQuery, voters],
  );

  const votedCount = voters.filter((voter) => voter.hasVoted).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div className="text-right w-full md:w-auto">
          <h2 className="text-2xl font-bold text-slate-900">سجل الناخبين</h2>
          <p className="text-sm text-slate-500">إدارة بيانات الناخبين وحالة التحقق البيومتري والتصويت.</p>
        </div>
        <button
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv';
            input.onchange = (event: any) => {
              const file = event.target.files?.[0];
              if (file) {
                alert(`تم اختيار الملف: ${file.name}`);
              }
            };
            input.click();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          استيراد سجل CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الناخبين', value: voters.length.toLocaleString(), color: 'bg-slate-50 text-slate-700' },
          { label: 'تم التصويت', value: votedCount.toLocaleString(), color: 'bg-emerald-50 text-emerald-600' },
          { label: 'بانتظار التصويت', value: Math.max(voters.length - votedCount, 0).toLocaleString(), color: 'bg-amber-50 text-amber-600' },
          { label: 'التحقق مكتمل', value: voters.filter((voter) => voter.verifiedFace).length.toLocaleString(), color: 'bg-blue-50 text-blue-600' },
        ].map((stat) => (
          <div key={stat.label} className={cn('p-4 rounded-xl border border-slate-200 shadow-sm text-right', stat.color)}>
            <p className="text-[11px] font-bold mb-1 opacity-70">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-end">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="ابحث بالاسم أو الرقم الوطني أو الدائرة..."
              className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">الناخب</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">الرقم الوطني</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">الدائرة</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">رقم الهاتف</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">حالة التصويت</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVoters.map((voter, index) => (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <span className="font-bold text-slate-900">{voter.fullName}</span>
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{voter.nationalId}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{voter.district}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{voter.phone || '079XXXXXXX'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        voter.hasVoted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
                      )}
                    >
                      {voter.hasVoted ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {voter.hasVoted ? 'تم التصويت' : 'بانتظار التصويت'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <button onClick={() => setSelectedVoter(voter)} className="text-blue-600 hover:text-blue-800 font-bold text-xs">
                      عرض التفاصيل
                    </button>
                  </td>
                </tr>
              ))}

              {filteredVoters.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">
                    لا توجد بيانات مطابقة للبحث الحالي.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedVoter && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <button
                    onClick={() => setSelectedVoter(null)}
                    className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="text-right">
                    <h3 className="text-xl font-bold text-slate-900">تفاصيل الناخب</h3>
                    <p className="text-sm text-slate-500">بيانات السجل المدني والانتخابي</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 text-3xl font-black shadow-inner">
                    {selectedVoter.fullName?.charAt(0) || 'ن'}
                  </div>
                  <div className="text-center">
                    <h4 className="text-lg font-bold text-slate-900">{selectedVoter.fullName}</h4>
                    <p className="text-sm text-blue-600 font-bold">{selectedVoter.nationalId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl text-right">
                    <p className="text-[10px] text-slate-400 font-bold mb-1">الدائرة الانتخابية</p>
                    <p className="text-sm font-bold text-slate-700">{selectedVoter.district}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl text-right">
                    <p className="text-[10px] text-slate-400 font-bold mb-1">حالة التصويت</p>
                    <p className={cn('text-sm font-bold', selectedVoter.hasVoted ? 'text-emerald-600' : 'text-slate-500')}>
                      {selectedVoter.hasVoted ? 'مكتمل' : 'غير مكتمل'}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl text-right">
                    <p className="text-[10px] text-slate-400 font-bold mb-1">التحقق البيومتري</p>
                    <p className={cn('text-sm font-bold', selectedVoter.verifiedFace ? 'text-blue-600' : 'text-slate-500')}>
                      {selectedVoter.verifiedFace ? 'متحقق' : 'غير متحقق'}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl text-right">
                    <p className="text-[10px] text-slate-400 font-bold mb-1">البريد الإلكتروني</p>
                    <p className="text-sm font-bold text-slate-700">{selectedVoter.email || 'غير متوفر'}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedVoter(null)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
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
