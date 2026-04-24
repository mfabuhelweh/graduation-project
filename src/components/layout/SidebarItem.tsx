import * as React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react'; 

interface SidebarItemProps {
  icon: LucideIcon; 
  label: string;
  active?: boolean;
  onClick: () => void; // بنرجع نعتمد على الـ onClick اللي جاي من برا
  badge?: number;
  collapsed?: boolean;
}

export const SidebarItem = ({ icon: Icon, label, active, onClick, badge, collapsed }: SidebarItemProps) => (
  <button 
    onClick={onClick}
    type="button"
    className={cn(
      "sidebar-nav-item flex items-center w-full px-4 py-2.5 my-0.5 rounded-lg transition-all duration-200 group",
      active
        ? "sidebar-nav-item-active bg-blue-600 text-white shadow-md shadow-blue-200"
        : "text-slate-500 hover:bg-slate-50 hover:text-blue-600"
    )}
  >
    <div
      className={cn(
        "flex items-center justify-center rounded-xl transition-all",
        active ? "bg-white/15 p-2 text-white" : "p-2 text-current",
        collapsed ? "mx-auto" : "ml-3",
      )}
    >
      <Icon size={20} strokeWidth={active ? 2.5 : 2} className={cn(active && "fill-current")} />
    </div>
    
    {!collapsed && (
      <span className={cn("flex-1 text-right text-sm overflow-hidden whitespace-nowrap", active ? "font-bold" : "font-medium")}>
        {label}
      </span>
    )}

    {!collapsed && Boolean(badge) && (
      <span className={cn(
        "px-2 py-0.5 text-[10px] font-bold rounded-full",
        active ? "bg-white text-blue-600" : "bg-blue-100 text-blue-600"
      )}>
        {badge}
      </span>
    )}
  </button>
);
