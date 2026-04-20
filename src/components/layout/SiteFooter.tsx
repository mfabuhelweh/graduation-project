import * as React from 'react';
import { cn } from '../../lib/utils';

interface SiteFooterLink {
  key: string;
  label: string;
  onClick?: () => void;
}

interface SiteFooterProps {
  language: 'ar' | 'en';
  links?: SiteFooterLink[];
  className?: string;
}

export function SiteFooter({ language, links, className }: SiteFooterProps) {
  const isArabic = language === 'ar';
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const resolvedLinks: SiteFooterLink[] =
    links ||
    [
      { key: 'privacy', label: t('سياسة الخصوصية', 'Privacy policy') },
      { key: 'terms', label: t('الشروط والأحكام', 'Terms') },
      { key: 'help', label: t('مركز المساعدة', 'Help center') },
    ];

  return (
    <footer className={cn('mt-10 pb-8', className)} dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="app-panel flex flex-wrap items-center justify-between gap-3 rounded-[28px] bg-blue-900 px-6 py-4 text-sm text-white">
          <p className="font-bold text-white/95">{t('جميع الحقوق محفوظة © 2024 صوتك الأردن', 'All rights reserved © 2024 Soutak Jordan')}</p>
          <div className="flex flex-wrap items-center gap-4 text-white/85">
            {resolvedLinks.map(({ key, label, onClick }) => (
              <button key={key} type="button" onClick={onClick} className="font-bold hover:text-white">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
