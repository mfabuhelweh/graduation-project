import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { CircleHelp, Menu, Moon, Sun, UserRound } from 'lucide-react';
import { cn } from '../../lib/utils';
import soutakEmblem from '../../assets/soutak-emblem.png';

export type SiteHeaderNavItem = {
  key: string;
  label: string;
  icon?: LucideIcon;
  active?: boolean;
  onClick?: () => void;
};

interface SiteHeaderProps {
  language: 'ar' | 'en';
  onToggleLanguage?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  /** When set, shows a pill with user name; otherwise shows "تسجيل دخول". */
  userDisplayName?: string | null;
  onUserActionClick?: () => void;
  navItems?: SiteHeaderNavItem[];
  hideNav?: boolean;
  className?: string;
}

export function SiteHeader({
  language,
  onToggleLanguage,
  theme = 'light',
  onToggleTheme,
  userDisplayName,
  onUserActionClick,
  navItems = [],
  hideNav = false,
  className,
}: SiteHeaderProps) {
  const isArabic = language === 'ar';
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const defaultNav: SiteHeaderNavItem[] = [
    { key: 'home', label: t('الرئيسية', 'Home'), icon: Menu },
    { key: 'about', label: t('عن المشروع', 'About'), icon: Menu },
    { key: 'features', label: t('المميزات', 'Features'), icon: Menu },
    { key: 'faq', label: t('الأسئلة الشائعة', 'FAQ'), icon: CircleHelp },
    { key: 'contact', label: t('تواصل معنا', 'Contact us'), icon: Menu },
  ];

  const resolvedNav = navItems.length ? navItems : defaultNav;
  const actionLabel = userDisplayName?.trim() ? userDisplayName.trim() : t('تسجيل دخول', 'Sign in');
  const hasLanguageToggle = typeof onToggleLanguage === 'function';
  const hasThemeToggle = typeof onToggleTheme === 'function';
  const ThemeIcon = theme === 'dark' ? Sun : Moon;

  return (
    <header className={cn('sticky top-0 z-40', className)} dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="app-panel flex flex-wrap items-center justify-between gap-4 rounded-[28px] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onUserActionClick}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200"
            >
              <UserRound className="h-4 w-4 text-blue-600" />
              <span className="max-w-40 truncate">{actionLabel}</span>
            </button>

            <button
              type="button"
              onClick={onToggleLanguage}
              disabled={!hasLanguageToggle}
              className={cn(
                'inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700',
                hasLanguageToggle ? 'hover:bg-slate-200' : 'opacity-80',
              )}
              aria-label={t('تبديل اللغة', 'Toggle language')}
            >
              {isArabic ? 'AR' : 'EN'}
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              disabled={!hasThemeToggle}
              className={cn(
                'inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700',
                hasThemeToggle ? 'hover:bg-slate-200' : 'opacity-80',
              )}
              aria-label={theme === 'dark' ? t('تفعيل الوضع الفاتح', 'Switch to light mode') : t('تفعيل الوضع الداكن', 'Switch to dark mode')}
              title={theme === 'dark' ? t('الوضع الفاتح', 'Light mode') : t('الوضع الداكن', 'Dark mode')}
            >
              <ThemeIcon className="h-4 w-4" />
            </button>
          </div>

          {!hideNav ? (
            <nav className="hidden flex-1 items-center justify-center gap-2 lg:flex" aria-label="Main">
              {resolvedNav.map(({ key, label, icon: Icon, onClick, active }) => (
                <button
                  key={key}
                  type="button"
                  onClick={onClick}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition',
                    active ? 'bg-slate-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-700',
                  )}
                >
                  {Icon ? (
                    <span className={cn('rounded-xl p-1.5', active ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-transparent')}>
                      <Icon className={cn('h-4 w-4', active && 'fill-current')} />
                    </span>
                  ) : null}
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          ) : (
            <div className="hidden flex-1 lg:block" aria-hidden="true" />
          )}

          <div className="flex items-center gap-3 text-right">
            <div>
              <h1 className="text-lg font-black leading-tight text-slate-900 sm:text-xl">
                {t('صوتك الأردن', 'Soutak Jordan')}
              </h1>
              <p className="text-[11px] font-bold text-slate-500">{t('بوابة الاقتراع الرقمية الكاملة', 'Full digital voting portal')}</p>
            </div>
            <img src={soutakEmblem} alt="" className="h-12 w-12 rounded-xl object-contain sm:h-14 sm:w-14" />
          </div>
        </div>
      </div>
    </header>
  );
}
