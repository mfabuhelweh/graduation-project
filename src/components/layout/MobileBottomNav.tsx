import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MobileNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface MobileBottomNavProps {
  items: MobileNavItem[];
  activeItemKey: string | null;
  onSelect: (key: string) => void;
  dir: 'rtl' | 'ltr';
}

export function MobileBottomNav({
  items,
  activeItemKey,
  onSelect,
  dir,
}: MobileBottomNavProps) {
  return (
    <nav
      className={cn(
        'app-panel fixed bottom-3 left-4 right-4 z-40 flex rounded-lg backdrop-blur-md md:hidden',
        'pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1',
      )}
      dir={dir}
      aria-label="Main"
    >
      {items.map(({ key, label, icon: Icon }) => {
        const active = activeItemKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={cn(
              'flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1 transition-colors',
              active ? 'text-blue-600' : 'text-slate-500 active:bg-slate-50',
            )}
          >
            <span className={cn('rounded-2xl p-2 transition-all', active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-transparent')}>
              <Icon className={cn('h-5 w-5 shrink-0', active && 'fill-current')} strokeWidth={active ? 2.5 : 2} aria-hidden />
            </span>
            <span className="max-w-full truncate text-[10px] font-bold leading-tight">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
