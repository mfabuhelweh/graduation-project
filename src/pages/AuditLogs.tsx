import * as React from 'react';
import { Download, RefreshCw, ShieldCheck } from 'lucide-react';
import { fetchAuditLogs } from '../lib/api';
import { cn } from '../lib/utils';

interface AuditLogsProps {
  setToast: (t: any) => void;
  language: string;
}

function formatTime(value: string, language: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-JO' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatActor(log: any) {
  if (log?.details?.actor) return String(log.details.actor);
  if (log?.actorType === 'admin') return 'مسؤول النظام';
  if (log?.actorType === 'voter') return 'ناخب';
  return 'النظام';
}

function formatDetails(details: any) {
  if (!details) return '-';
  if (typeof details === 'string') return details;
  if (details.details && typeof details.details === 'string') return details.details;

  const entries = Object.entries(details)
    .filter(([key]) => key !== 'actor')
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`);

  return entries.length ? entries.join(' | ') : '-';
}

function exportLogs(logs: any[]) {
  const headers = ['event', 'actorType', 'actorId', 'time', 'details'];
  const lines = logs.map((log) =>
    [
      log.event,
      log.actorType || '',
      log.actorId || '',
      log.time || '',
      JSON.stringify(log.details || {}),
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(','),
  );

  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'audit-logs.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const AuditLogs = ({ setToast, language }: AuditLogsProps) => {
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const loadLogs = React.useCallback(async () => {
    try {
      const logs = await fetchAuditLogs();
      setAuditLogs(logs);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to load audit logs',
        type: 'error',
      });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [setToast]);

  React.useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadLogs();
  };

  const handleExport = () => {
    exportLogs(auditLogs);
    setToast({
      message: language === 'ar' ? 'تم تصدير سجل العمليات' : 'Audit logs exported',
      type: 'success',
    });
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <div className="flex items-center justify-between flex-row-reverse">
        <div className="text-right">
          <h2 className="text-2xl font-bold text-slate-900">سجل العمليات</h2>
          <p className="text-sm text-slate-500">
            سجل غير قابل للتعديل لجميع الحركات والإجراءات الحساسة داخل النظام.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={!auditLogs.length}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            تصدير السجل
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            تحديث
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">العملية</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">المستخدم</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">الوقت</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">التفاصيل</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                    جاري تحميل سجل العمليات...
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                    {language === 'ar' ? 'لا توجد سجلات بعد.' : 'No logs yet.'}
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <span className="font-bold text-slate-900">{String(log.event || '').replaceAll('_', ' ')}</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatActor(log)}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-600">{formatTime(log.time, language)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDetails(log.details)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                        <div className="h-1 w-1 rounded-full bg-emerald-500" />
                        موثق
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
