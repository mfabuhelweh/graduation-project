import * as React from 'react';
import {
  Download,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  deleteImportBatch,
  fetchImportBatches,
  fetchImportConfig,
  uploadImportFile,
} from '../../lib/api';

interface ImportCenterProps {
  electionId?: string;
  onImported: () => Promise<void> | void;
  setToast: (toast: any) => void;
}

const labels: Record<string, string> = {
  elections: 'elections.xlsx',
  districts: 'districts.xlsx',
  quotas: 'quotas.xlsx',
  parties: 'parties.xlsx',
  party_candidates: 'party_candidates.xlsx',
  district_lists: 'district_lists.xlsx',
  district_list_candidates: 'district_list_candidates.xlsx',
  voters: 'voters.xlsx',
};

const entityNames: Record<string, string> = {
  elections: 'الانتخابات',
  districts: 'الدوائر',
  quotas: 'الكوتا',
  parties: 'الأحزاب',
  party_candidates: 'مرشحو الأحزاب',
  district_lists: 'القوائم المحلية',
  district_list_candidates: 'مرشحو القوائم المحلية',
  voters: 'الناخبون',
};

function formatDateTime(value?: string | null) {
  if (!value) return 'غير متوفر';
  return new Date(value).toLocaleString('ar-JO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ImportCenter = ({ electionId, onImported, setToast }: ImportCenterProps) => {
  const [config, setConfig] = React.useState<any>(null);
  const [loadingKey, setLoadingKey] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<Record<string, any>>({});
  const [selectedFiles, setSelectedFiles] = React.useState<Record<string, File | null>>({});
  const [batches, setBatches] = React.useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = React.useState(false);
  const [deletingBatchId, setDeletingBatchId] = React.useState<string | null>(null);

  const loadImportConfig = React.useCallback(async () => {
    const response = await fetchImportConfig();
    setConfig(response);
  }, []);

  const loadImportBatches = React.useCallback(async () => {
    setLoadingBatches(true);
    try {
      const response = await fetchImportBatches(electionId);
      setBatches(response);
    } catch (error) {
      console.error('Failed to load import batches', error);
    } finally {
      setLoadingBatches(false);
    }
  }, [electionId]);

  React.useEffect(() => {
    loadImportConfig().catch((error) => {
      console.error('Import config failed', error);
    });
    loadImportBatches().catch((error) => {
      console.error('Import batches failed', error);
    });
  }, [loadImportConfig, loadImportBatches]);

  const showToast = React.useCallback(
    (message: string, type: 'success' | 'error') => {
      setToast({ message, type });
      window.setTimeout(() => setToast(null), type === 'success' ? 2500 : 3500);
    },
    [setToast],
  );

  const handleDownload = (kind: string) => {
    const columns: string[] = config?.templates?.[kind] || [];
    const csv = `${columns.join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${kind}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleChooseFile = (kind: string, file: File | null) => {
    if (!file) return;
    setSelectedFiles((current) => ({ ...current, [kind]: file }));
  };

  const handleClearFile = (kind: string) => {
    setSelectedFiles((current) => ({ ...current, [kind]: null }));
  };

  const handleUpload = async (kind: string) => {
    const file = selectedFiles[kind];
    if (!file) {
      showToast('اختر ملفًا أولًا قبل تنفيذ الرفع.', 'error');
      return;
    }

    setLoadingKey(kind);
    try {
      const result = await uploadImportFile(kind.replace(/_/g, '-'), file);
      setResults((current) => ({
        ...current,
        [kind]: {
          ...result,
          entityType: kind,
          uploadedFileName: file.name,
          uploadedFileSize: file.size,
        },
      }));
      setSelectedFiles((current) => ({ ...current, [kind]: null }));
      await Promise.all([loadImportBatches(), onImported()]);
      showToast(`تم استيراد ${labels[kind]} بنجاح.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تنفيذ عملية الاستيراد.', 'error');
    } finally {
      setLoadingKey(null);
    }
  };

  const handleRollbackBatch = async (batch: any) => {
    const batchId = batch.batchId || batch.id;
    const batchFileName = batch.uploadedFileName || batch.fileName || 'الملف المحدد';
    const batchEntityType = batch.entityType;

    const confirmed = window.confirm(
      `سيتم حذف كل البيانات التي أدخلها الملف "${batchFileName}" من قاعدة البيانات. هل تريد المتابعة؟`,
    );

    if (!confirmed) return;

    setDeletingBatchId(batchId);
    try {
      await deleteImportBatch(batchId);
      setResults((current) => {
        const next = { ...current };
        if (batchEntityType && next[batchEntityType]?.batchId === batchId) {
          next[batchEntityType] = {
            ...next[batchEntityType],
            rolledBackAt: new Date().toISOString(),
            rollbackNote: 'تم حذف البيانات المستوردة من هذا الملف.',
          };
        }
        return next;
      });
      await Promise.all([loadImportBatches(), onImported()]);
      showToast('تم حذف بيانات هذا الملف من قاعدة البيانات.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حذف بيانات هذا الملف.', 'error');
    } finally {
      setDeletingBatchId(null);
    }
  };

  const order: string[] = config?.order || [];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right">
        <h4 className="text-base font-black text-slate-900">ترتيب الاستيراد المطلوب</h4>
        <p className="mt-2 text-sm text-slate-500">
          {order.map((item) => labels[item] || item).join(' ← ')}
        </p>
      </div>

      <div className="space-y-3">
        {order.map((kind) => {
          const result = results[kind];
          const selectedFile = selectedFiles[kind];

          return (
            <div key={kind} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-row-reverse items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="mt-1 h-5 w-5 text-blue-600" />
                  <div className="text-right">
                    <p className="font-black text-slate-900">{labels[kind]}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      الأعمدة المطلوبة: {(config?.templates?.[kind] || []).join('، ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(kind)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    تنزيل القالب
                  </button>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">
                    <UploadCloud className="h-4 w-4" />
                    اختيار ملف
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      className="hidden"
                      onChange={(event) => handleChooseFile(kind, event.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              {selectedFile && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-right">
                  <div className="flex flex-row-reverse items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-400">الملف المحدد</p>
                      <p className="mt-1 truncate text-sm font-black text-slate-900">{selectedFile.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        الحجم: {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleClearFile(kind)}
                        disabled={loadingKey === kind}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف الملف
                      </button>

                      <button
                        onClick={() => handleUpload(kind)}
                        disabled={loadingKey === kind}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {loadingKey === kind ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UploadCloud className="h-4 w-4" />
                        )}
                        رفع الآن
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-xs font-medium text-blue-800">
                    يمكنك حذف الملف واختيار نسخة معدلة قبل تنفيذ عملية الاستيراد.
                  </p>
                </div>
              )}

              {result && (
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-right">
                  <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    آخر ملف تم رفعه: {result.uploadedFileName || result.fileName || labels[kind]}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-400">الصفوف المضافة</p>
                      <p className="mt-1 text-lg font-black text-emerald-600">{result.insertedRows}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">الصفوف المتجاوزة</p>
                      <p className="mt-1 text-lg font-black text-amber-600">{result.skippedRows}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">أخطاء التحقق</p>
                      <p className="mt-1 text-lg font-black text-rose-600">{result.errors?.length || 0}</p>
                    </div>
                  </div>

                  {result.batchId && !result.rolledBackAt && (
                    <div className="mt-4">
                      <button
                        onClick={() => handleRollbackBatch(result)}
                        disabled={deletingBatchId === result.batchId}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                      >
                        {deletingBatchId === result.batchId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        حذف البيانات التي جاء بها هذا الملف
                      </button>
                    </div>
                  )}

                  {result.rollbackNote && (
                    <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                      {result.rollbackNote}
                    </div>
                  )}

                  {result.errors?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {result.errors.map((error: any) => (
                        <div
                          key={`${kind}-${error.rowNumber}-${error.message}`}
                          className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                        >
                          الصف {error.rowNumber}: {error.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-row-reverse items-start justify-between gap-4">
          <div className="text-right">
            <h4 className="text-base font-black text-slate-900">سجل الملفات المرفوعة</h4>
            <p className="mt-1 text-sm text-slate-500">
              من هنا يمكنك مراجعة كل دفعة استيراد وحذف البيانات التي أضافها ملف معين من قاعدة البيانات.
            </p>
          </div>
          {loadingBatches && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
        </div>

        <div className="mt-4 space-y-3">
          {batches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-right text-sm font-medium text-slate-500">
              لا توجد دفعات استيراد محفوظة حتى الآن.
            </div>
          ) : (
            batches.map((batch) => {
              const isRolledBack = batch.status === 'rolled_back';
              return (
                <div
                  key={batch.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-right"
                >
                  <div className="flex flex-row-reverse items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-700">
                          {entityNames[batch.entityType] || batch.entityType}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                            isRolledBack
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isRolledBack ? 'تم حذف بياناته' : 'نشط'}
                        </span>
                      </div>

                      <p className="mt-3 truncate text-sm font-black text-slate-900">{batch.fileName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        تاريخ الرفع: {formatDateTime(batch.createdAt)}
                      </p>
                      {batch.rolledBackAt && (
                        <p className="mt-1 text-xs text-amber-700">
                          تاريخ حذف البيانات: {formatDateTime(batch.rolledBackAt)}
                        </p>
                      )}
                    </div>

                    {!isRolledBack && (
                      <button
                        onClick={() => handleRollbackBatch(batch)}
                        disabled={deletingBatchId === batch.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        {deletingBatchId === batch.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        حذف بيانات الملف
                      </button>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-400">الصفوف المضافة</p>
                      <p className="mt-1 text-lg font-black text-emerald-600">{batch.insertedRows}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">الصفوف المتجاوزة</p>
                      <p className="mt-1 text-lg font-black text-amber-600">{batch.skippedRows}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">أخطاء الملف</p>
                      <p className="mt-1 text-lg font-black text-rose-600">{batch.errors?.length || 0}</p>
                    </div>
                  </div>

                  {batch.rollbackNote && (
                    <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                      {batch.rollbackNote}
                    </div>
                  )}

                  {batch.errors?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {batch.errors.map((error: any, index: number) => (
                        <div
                          key={`${batch.id}-${index}`}
                          className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                        >
                          الصف {error.rowNumber}: {error.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
