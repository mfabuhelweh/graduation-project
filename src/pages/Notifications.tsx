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

const initialNotifications: NotificationItem[] = [
  {
    id: 'n1',
    type: 'election',
    title: 'باب التصويت مفتوح',
    message: 'تم فتح باب التصويت للانتخابات النيابية 2024. يمكنك التصويت الآن من خلال صفحة التصويت الإلكتروني.',
    time: 'منذ 5 دقائق',
    read: false,
  },
  {
    id: 'n2',
    type: 'success',
    title: 'تم التحقق من هويتك',
    message: 'تم التحقق من بياناتك في سجل الناخبين بنجاح. أنت مؤهل للمشاركة في الانتخابات.',
    time: 'منذ ساعة',
    read: false,
  },
  {
    id: 'n3',
    type: 'info',
    title: 'تحديث النظام',
    message: 'تم تحديث نظام التصويت الإلكتروني إلى الإصدار الجديد. يُنصح بمسح ذاكرة التخزين المؤقت لتجربة أفضل.',
    time: 'منذ 3 ساعات',
    read: true,
  },
  {
    id: 'n4',
    type: 'warning',
    title: 'تذكير: آخر موعد للتصويت',
    message: 'تذكير: ينتهي التصويت في انتخابات الدائرة المحلية خلال 24 ساعة. لا تفوّت حقك الانتخابي.',
    time: 'أمس',
    read: true,
  },
  {
    id: 'n5',
    type: 'info',
    title: 'نتائج مؤقتة',
    message: 'ستُعلن نتائج القائمة العامة فور اكتمال فرز الأصوات وإغلاق صناديق الاقتراع الإلكترونية.',
    time: 'منذ يومين',
    read: true,
  },
  {
    id: 'n6',
    type: 'success',
    title: 'تم تسجيل صوتك بنجاح',
    message: 'صوتك مُقيَّد في البلوكشين ولا يمكن تعديله. رقم العملية: 0x8a11...9ae7. شكرًا لمشاركتك.',
    time: 'منذ 3 أيام',
    read: true,
  },
];

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
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-indigo-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-900">الإشعارات</h2>
            <p className="text-xs text-slate-400">
              {unreadCount > 0 ? `لديك ${unreadCount} إشعارات غير مقروءة` : 'جميع الإشعارات مقروءة'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all border border-indigo-100"
            >
              <CheckCheck className="w-4 h-4" />
              تحديد الكل كمقروء
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-5 py-2 rounded-xl text-sm font-bold transition-all',
            filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          الكل ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'px-5 py-2 rounded-xl text-sm font-bold transition-all',
            filter === 'unread' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          غير مقروء ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-16 flex flex-col items-center text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
            <BellOff className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-500">لا توجد إشعارات</h3>
          <p className="text-sm text-slate-400 mt-2">ستظهر هنا إشعارات الانتخابات والنظام</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((notif) => (
            <div
              key={notif.id}
              className={cn(
                'relative bg-white rounded-3xl border p-5 transition-all group hover:shadow-md cursor-pointer',
                !notif.read ? 'border-indigo-100 shadow-sm ring-1 ring-indigo-50' : 'border-slate-100'
              )}
              onClick={() => markRead(notif.id)}
            >
              <div className="flex items-start gap-4">
                {/* Unread dot */}
                {!notif.read && (
                  <div className="absolute top-5 left-5 w-2 h-2 bg-indigo-500 rounded-full" />
                )}

                {/* Icon */}
                <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0', bgMap[notif.type])}>
                  {iconMap[notif.type]}
                </div>

                {/* Content */}
                <div className="flex-1 text-right min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[11px] text-slate-400 font-medium shrink-0 mt-0.5">{notif.time}</span>
                    <p className="font-bold text-slate-900">{notif.title}</p>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif.id);
                  }}
                  className="p-2 text-slate-300 hover:text-rose-400 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer info */}
      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 text-right">
        <p className="text-xs text-slate-400 leading-relaxed">
          يتم تحديث الإشعارات تلقائياً عند وجود أي تغيير في حالة الانتخابات أو عمليات التصويت. تبقى الإشعارات لمدة 30 يوماً.
        </p>
      </div>
    </div>
  );
};
