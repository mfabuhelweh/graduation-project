import * as React from 'react';
import { Download, FileText, RefreshCw, Search, ShieldCheck } from 'lucide-react';
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

function exportLogsCsv(logs: any[]) {
  const headers = ['event', 'actorType', 'actorId', 'time', 'details'];
  const lines = logs.map((log) =>
    [log.event, log.actorType || '', log.actorId || '', log.time || '', JSON.stringify(log.details || {})]
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

function exportLogsPdf(logs: any[], language: string) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
  if (!popup) {
    throw new Error(language === 'ar' ? 'تعذر فتح نافذة التصدير' : 'Could not open export window');
  }

  const rows = logs
    .map(
      (log) => `
        <tr>
          <td>${String(log.event || '').replaceAll('_', ' ')}</td>
          <td>${formatActor(log)}</td>
          <td>${formatTime(log.time, language)}</td>
          <td>${formatDetails(log.details)}</td>
        </tr>`,
    )
    .join('');

  popup.document.write(`
    <html dir="rtl">
      <head>
        <title>Audit Logs</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin-bottom: 8px; }
          p { color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: right; vertical-align: top; }
          th { background: #eff6ff; }
        </style>
      </head>
      <body>
        <h1>${language === 'ar' ? 'سجل العمليات' : 'Audit Logs'}</h1>
        <p>${language === 'ar' ? 'نسخة جاهزة للطباعة أو الحفظ بصيغة PDF.' : 'Printable copy ready for PDF save.'}</p>
        <table>
          <thead>
            <tr>
              <th>${language === 'ar' ? 'العملية' : 'Event'}</th>
              <th>${language === 'ar' ? 'المستخدم' : 'Actor'}</th>
              <th>${language === 'ar' ? 'الوقت' : 'Time'}</th>
              <th>${language === 'ar' ? 'التفاصيل' : 'Details'}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

export const AuditLogs = ({ setToast, language }: AuditLogsProps) => {
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [actorFilter, setActorFilter] = React.useState('all');
  const [actionFilter, setActionFilter] = React.useState('all');
  const [timeFilter, setTimeFilter] = React.useState<'all' | '1h' | '24h' | '7d'>('all');

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

  const actorOptions = React.useMemo(() => {
    const actors = new Set(auditLogs.map((log) => formatActor(log)));
    return ['all', ...Array.from(actors)];
  }, [auditLogs]);

  const actionOptions = React.useMemo(() => {
    const actions = new Set(auditLogs.map((log) => String(log.event || '').replaceAll('_', ' ')));
    return ['all', ...Array.from(actions)];
  }, [auditLogs]);

  const filteredLogs = React.useMemo(() => {
    const now = Date.now();
    return auditLogs.filter((log) => {
      const actor = formatActor(log);
      const action = String(log.event || '').replaceAll('_', ' ');
      const time = formatTime(log.time, language);
      const details = formatDetails(log.details);
      const haystack = `${actor} ${action} ${time} ${details}`.toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      if (query && !haystack.includes(query)) return false;
      if (actorFilter !== 'all' && actor !== actorFilter) return false;
      if (actionFilter !== 'all' && action !== actionFilter) return false;

      if (timeFilter !== 'all') {
        const logTime = new Date(log.time).getTime();
        if (Number.isNaN(logTime)) return false;
        const diff = now - logTime;
        if (timeFilter === '1h' && diff > 60 * 60 * 1000) return false;
        if (timeFilter === '24h' && diff > 24 * 60 * 60 * 1000) return false;
        if (timeFilter === '7d' && diff > 7 * 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  }, [actionFilter, actorFilter, auditLogs, language, searchQuery, timeFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadLogs();
  };

  const handleExportCsv = () => {
    exportLogsCsv(filteredLogs);
    setToast({
      message: language === 'ar' ? 'تم تصدير السجل بصيغة CSV' : 'Audit logs exported as CSV',
      type: 'success',
    });
    setTimeout(() => setToast(null), 2000);
  };

  const handleExportPdf = () => {
    try {
      exportLogsPdf(filteredLogs, language);
      setToast({
        message: language === 'ar' ? 'تم تجهيز نسخة PDF للطباعة أو الحفظ' : 'PDF export prepared',
        type: 'success',
      });
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to export PDF',
        type: 'error',
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="text-right">
          <h2 className="text-2xl font-bold text-slate-900">سجل العمليات</h2>
          <p className="text-sm text-slate-500">
            سجل غير قابل للتعديل لجميع الحركات والإجراءات الحساسة داخل النظام.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={handleExportCsv}
            disabled={!filteredLogs.length}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>

          <button
            onClick={handleExportPdf}
            disabled={!filteredLogs.length}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            PDF
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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr,0.8fr,0.8fr,0.8fr]">
          <label className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={language === 'ar' ? 'ابحث باسم المستخدم أو العملية أو الوقت' : 'Search by user, action, or time'}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-3 text-right text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </label>

          <select
            value={actorFilter}
            onChange={(event) => setActorFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
          >
            {actorOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? (language === 'ar' ? 'كل المستخدمين' : 'All actors') : option}
              </option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
          >
            {actionOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? (language === 'ar' ? 'كل العمليات' : 'All actions') : option}
              </option>
            ))}
          </select>

          <select
            value={timeFilter}
            onChange={(event) => setTimeFilter(event.target.value as 'all' | '1h' | '24h' | '7d')}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
          >
            <option value="all">{language === 'ar' ? 'كل الأوقات' : 'All time'}</option>
            <option value="1h">{language === 'ar' ? 'آخر ساعة' : 'Last hour'}</option>
            <option value="24h">{language === 'ar' ? 'آخر 24 ساعة' : 'Last 24 hours'}</option>
            <option value="7d">{language === 'ar' ? 'آخر 7 أيام' : 'Last 7 days'}</option>
          </select>
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
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                    {language === 'ar' ? 'لا توجد سجلات مطابقة للفلاتر الحالية.' : 'No logs match the current filters.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
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
