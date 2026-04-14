import * as React from 'react';
import { LogOut, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MoreSheetItem {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface MobileMoreSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  items: MoreSheetItem[];
  logoutLabel: string;
  onLogout: () => void;
  dir: 'rtl' | 'ltr';
}

export function MobileMoreSheet({
  open,
  onClose,
  title,
  items,
  logoutLabel,
  onLogout,
  dir,
}: MobileMoreSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" dir={dir}>
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl',
          'pb-[max(1rem,env(safe-area-inset-bottom))] pt-2',
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="px-2 py-2">
          {items.map(({ key, label, icon: Icon, onClick, variant }) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => {
                  onClick();
                  onClose();
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-start text-sm font-bold transition-colors',
                  variant === 'danger'
                    ? 'text-rose-700 hover:bg-rose-50'
                    : 'text-slate-800 hover:bg-slate-50',
                )}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-70" />
                <span className="flex-1">{label}</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-start text-sm font-bold text-rose-700 hover:bg-rose-50"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="flex-1">{logoutLabel}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
