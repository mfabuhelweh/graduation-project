import * as React from 'react';
import { useState } from 'react';
import { Bell, CheckCheck, Info, AlertTriangle, ShieldCheck, Vote, Trash2, BellOff } from 'lucide-react';
import { cn } from '../lib/utils';

interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'election';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

function buildInitialNotifications(language: string): NotificationItem[] {
  const ar = language === 'ar';
  return [
    {
      id: 'n1',
      type: 'election',
      title: ar ? 'باب التصويت مفتوح' : 'Voting is now open',
      message: ar
        ? 'تم فتح باب التصويت للانتخابات النيابية 2024. يمكنك التصويت الآن من خلال صفحة التصويت الإلكتروني.'
        : 'Voting for the 2024 parliamentary election is now open. You can vote now from the e-voting page.',
      time: ar ? 'منذ 5 دقائق' : '5 minutes ago',
      read: false,
    },
    {
      id: 'n2',
      type: 'success',
      title: ar ? 'تم التحقق من هويتك' : 'Identity verified',
      message: ar
        ? 'تم التحقق من بياناتك في سجل الناخبين بنجاح. أنت مؤهل للمشاركة في الانتخابات.'
        : 'Your voter registry data has been verified successfully. You are eligible to vote.',
      time: ar ? 'منذ ساعة' : '1 hour ago',
      read: false,
    },
    {
      id: 'n3',
      type: 'info',
      title: ar ? 'تحديث النظام' : 'System update',
      message: ar
        ? 'تم تحديث نظام التصويت الإلكتروني إلى الإصدار الجديد. يُنصح بمسح ذاكرة التخزين المؤقت لتجربة أفضل.'
        : 'The e-voting system was updated to a new version. Clearing cache is recommended for best experience.',
      time: ar ? 'منذ 3 ساعات' : '3 hours ago',
      read: true,
    },
    {
      id: 'n4',
      type: 'warning',
      title: ar ? 'تذكير: آخر موعد للتصويت' : 'Reminder: Voting deadline',
      message: ar
        ? 'تذكير: ينتهي التصويت في انتخابات الدائرة المحلية خلال 24 ساعة. لا تفوّت حقك الانتخابي.'
        : 'Reminder: Local district voting closes in 24 hours. Do not miss your right to vote.',
      time: ar ? 'أمس' : 'Yesterday',
      read: true,
    },
    {
      id: 'n5',
      type: 'info',
      title: ar ? 'نتائج مؤقتة' : 'Interim results',
      message: ar
        ? 'ستُعلن نتائج القائمة العامة فور اكتمال فرز الأصوات وإغلاق صناديق الاقتراع الإلكترونية.'
        : 'General list results will be announced after counting is complete and digital ballot boxes are closed.',
      time: ar ? 'منذ يومين' : '2 days ago',
      read: true,
    },
    {
      id: 'n6',
      type: 'success',
      title: ar ? 'تم تسجيل صوتك بنجاح' : 'Vote recorded successfully',
      message: ar
        ? 'صوتك مُقيَّد في البلوكشين ولا يمكن تعديله. رقم العملية: 0x8a11...9ae7. شكرًا لمشاركتك.'
        : 'Your vote is recorded on blockchain and cannot be modified. Tx ID: 0x8a11...9ae7. Thank you.',
      time: ar ? 'منذ 3 أيام' : '3 days ago',
      read: true,
    },
  ];
}

const iconMap = {
  info: <Info className="w-5 h-5 text-blue-500" />,
  success: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  election: <Vote className="w-5 h-5 text-indigo-500" />,
};

const bgMap = {
  info: 'bg-blue-50 border-blue-100',
  success: 'bg-emerald-50 border-emerald-100',
  warning: 'bg-amber-50 border-amber-100',
  election: 'bg-indigo-50 border-indigo-100',
};

interface NotificationsProps {
  language?: string;
}

export const Notifications = ({ language = 'ar' }: NotificationsProps) => {
  const isArabic = language === 'ar';
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => buildInitialNotifications(language));
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const displayed = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  React.useEffect(() => {
    setNotifications((prev) => {
      const localized = buildInitialNotifications(language);
      return localized.map((item) => {
        const existing = prev.find((p) => p.id === item.id);
        return existing ? { ...item, read: existing.read } : item;
      });
    });
  }, [language]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 duration-500 animate-in fade-in slide-in-from-bottom-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
            <Bell className="h-6 w-6 text-indigo-600" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="min-w-0 text-right">
            <h2 className="text-lg font-black text-slate-900 md:text-xl">{t('الإشعارات', 'Notifications')}</h2>
            <p className="text-xs text-slate-400">
              {unreadCount > 0
                ? t(`لديك ${unreadCount} إشعارات غير مقروءة`, `You have ${unreadCount} unread notifications`)
                : t('جميع الإشعارات مقروءة', 'All notifications are read')}
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 sm:w-auto">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="touch-manipulation flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-600 transition-all hover:bg-indigo-100 active:opacity-90 sm:w-auto sm:py-2"
            >
              <CheckCheck className="h-4 w-4 shrink-0" />
              {t('تحديد الكل كمقروء', 'Mark all as read')}
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex w-full gap-1 rounded-2xl bg-slate-100 p-1 sm:w-fit">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'touch-manipulation min-h-11 flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-all sm:min-h-0 sm:flex-none sm:px-5 sm:py-2',
            filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {t('الكل', 'All')} ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={cn(
            'touch-manipulation min-h-11 flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-all sm:min-h-0 sm:flex-none sm:px-5 sm:py-2',
            filter === 'unread' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {t('غير مقروء', 'Unread')} ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm md:p-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 md:mb-6 md:h-20 md:w-20">
            <BellOff className="h-9 w-9 text-slate-300 md:h-10 md:w-10" />
          </div>
          <h3 className="text-base font-bold text-slate-500 md:text-lg">{t('لا توجد إشعارات', 'No notifications')}</h3>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">
            {t('ستظهر هنا إشعارات الانتخابات والنظام', 'Election and system notifications will appear here')}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 md:space-y-3">
          {displayed.map((notif) => (
            <div
              key={notif.id}
              className={cn(
                'group relative cursor-pointer rounded-2xl border bg-white p-4 transition-all active:scale-[0.99] md:rounded-3xl md:p-5 md:hover:shadow-md',
                !notif.read ? 'border-indigo-100 shadow-sm ring-1 ring-indigo-50' : 'border-slate-100',
              )}
              onClick={() => markRead(notif.id)}
            >
              <div className="flex items-start gap-3 md:gap-4">
                {!notif.read && (
                  <div className="absolute end-4 top-4 h-2 w-2 rounded-full bg-indigo-500 md:end-5 md:top-5" />
                )}

                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border md:h-11 md:w-11',
                    bgMap[notif.type],
                  )}
                >
                  {iconMap[notif.type]}
                </div>

                <div className="min-w-0 flex-1 pe-8 text-right md:pe-10">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <p className="order-2 font-bold leading-snug text-slate-900 sm:order-1">{notif.title}</p>
                    <span className="order-1 shrink-0 text-[11px] font-medium text-slate-400 sm:order-2 sm:mt-0.5">
                      {notif.time}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{notif.message}</p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif.id);
                  }}
                  className="touch-manipulation absolute end-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-400 opacity-100 transition-all hover:bg-rose-50 hover:text-rose-500 active:bg-rose-100 md:end-3 md:top-3 md:opacity-0 md:group-hover:opacity-100"
                  aria-label={t('حذف الإشعار', 'Delete notification')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer info */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right md:p-5">
        <p className="text-xs leading-relaxed text-slate-400">
          {t(
            'يتم تحديث الإشعارات تلقائياً عند وجود أي تغيير في حالة الانتخابات أو عمليات التصويت. تبقى الإشعارات لمدة 30 يوماً.',
            'Notifications update automatically when election status or voting activity changes. Notifications are kept for 30 days.',
          )}
        </p>
      </div>
    </div>
  );
};
