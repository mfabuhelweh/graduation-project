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
        'fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden',
        'pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_24px_rgba(15,23,42,0.06)]',
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
              'flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors',
              active ? 'text-blue-600' : 'text-slate-500 active:bg-slate-50',
            )}
          >
            <Icon className="h-6 w-6 shrink-0" strokeWidth={active ? 2.5 : 2} aria-hidden />
            <span className="max-w-full truncate text-[10px] font-bold leading-tight">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
