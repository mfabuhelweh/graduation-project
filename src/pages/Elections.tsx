import * as React from 'react';
import { useMemo, useState } from 'react';
import { MoreVertical, PlusCircle, Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface ElectionsProps {
  setActiveTab: (tab: string) => void;
  setToast: (t: any) => void;
  language: string;
  elections: any[];
  onRefresh: () => Promise<void>;
}

const statusLabelMap: Record<string, string> = {
  Active: 'نشط',
  active: 'نشط',
  Draft: 'مسودة',
  draft: 'مسودة',
  Closed: 'مغلق',
  closed: 'مغلق',
  'Voting Open': 'التصويت مفتوح',
  scheduled: 'مجدول',
  Scheduled: 'مجدول',
  'Results Published': 'النتائج منشورة',
  archived: 'مؤرشف',
  Archived: 'مؤرشف',
};

const normalizeStatusGroup = (status: string) => {
  const value = String(status || '').toLowerCase();
  if (value.includes('result')) return 'النتائج';
  if (value.includes('active') || value.includes('open')) return 'نشط';
  if (value.includes('draft')) return 'مسودة';
  if (value.includes('closed')) return 'مغلق';
  return 'الكل';
};

export const Elections = ({ setActiveTab, setToast, language, elections, onRefresh }: ElectionsProps) => {
  const [activeFilter, setActiveFilter] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');

  const filters = ['الكل', 'نشط', 'مسودة', 'مغلق', 'النتائج'];

  const filteredElections = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return elections.filter((election) => {
      const matchesFilter =
        activeFilter === 'الكل' || normalizeStatusGroup(String(election.status || '')) === activeFilter;

      const matchesQuery =
        !normalizedQuery ||
        String(election.title || '').toLowerCase().includes(normalizedQuery) ||
        String(election.faculty || '').toLowerCase().includes(normalizedQuery) ||
        String(election.type || '').toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, elections, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center flex-row-reverse">
        <div className="text-right">
          <h2 className="text-2xl font-bold text-slate-900">قائمة الانتخابات</h2>
          <p className="text-sm text-slate-500">
            متابعة وإدارة جميع العمليات الانتخابية النشطة والمحفوظة.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('Create Election')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          إنشاء انتخابات جديدة
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-right">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 flex-row-reverse">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ابحث في الانتخابات..."
              className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 flex-row-reverse">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
                  activeFilter === filter ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100',
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">عنوان الانتخابات</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">النوع</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">الدائرة</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">الناخبون</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">الأصوات</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">نسبة المشاركة</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredElections.map((election) => {
                const turnout = Number(election.turnout || 0);
                const status = String(election.status || '');
                const statusLabel = statusLabelMap[status] || status || 'غير معروف';

                return (
                  <tr key={election.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{election.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                        {election.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{election.faculty}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 text-center font-medium">
                      {Number(election.voters || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 text-center font-medium">
                      {Number(election.votes || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              turnout > 80 ? 'bg-emerald-500' : turnout > 50 ? 'bg-blue-500' : 'bg-amber-500',
                            )}
                            style={{ width: `${turnout}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{turnout}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                          status === 'Active' || status === 'Voting Open'
                            ? 'bg-emerald-50 text-emerald-600'
                            : status === 'Results Published'
                              ? 'bg-indigo-50 text-indigo-600'
                              : status === 'Closed'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-amber-50 text-amber-600',
                        )}
                      >
                        <div
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            status === 'Active' || status === 'Voting Open'
                              ? 'bg-emerald-500 animate-pulse'
                              : status === 'Results Published'
                                ? 'bg-indigo-500'
                                : status === 'Closed'
                                  ? 'bg-slate-400'
                                  : 'bg-amber-500',
                          )}
                        />
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setToast({
                            message: `${language === 'ar' ? 'خيارات' : 'Options'}: ${election.title}`,
                            type: 'success',
                          });
                          setTimeout(() => setToast(null), 2000);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredElections.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">
                    لا توجد انتخابات مطابقة للبحث الحالي.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/30">
          <p className="text-xs font-medium text-slate-500">
            عرض {filteredElections.length} من {elections.length} انتخابات
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              className="px-3 h-8 flex items-center justify-center rounded-md bg-blue-600 text-white text-xs font-bold shadow-sm"
            >
              تحديث
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
