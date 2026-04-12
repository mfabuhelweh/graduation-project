import * as React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  // ✅ إصلاح: تغيير نوع icon من any إلى React.ElementType
  icon?: React.ElementType;
  color?: string;
  // ✅ إضافة: language prop للترجمة
  language?: 'ar' | 'en';
}

export const StatCard = ({ 
  title, 
  value, 
  subValue = "", 
  trend, 
  trendValue, 
  icon: Icon, 
  color = "bg-blue-50 text-blue-600",
  language = 'ar'
}: StatCardProps) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
        {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
      </div>
      {Icon && (
        <div className={cn("p-2.5 rounded-xl", color)}>
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
    {(trend && trendValue) && (
      <div className="flex items-center gap-1.5">
        {trend === 'up' ? (
          <TrendingUp className="w-4 h-4 text-emerald-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-rose-500" />
        )}
        <span className={cn("text-xs font-bold", trend === 'up' ? "text-emerald-600" : "text-rose-600")}>
          {trendValue}
        </span>
        {/* ✅ إصلاح: ترجمة النص حسب اللغة */}
        <span className="text-xs text-slate-400 font-medium">
          {language === 'ar' ? 'مقارنة بالأمس' : 'vs yesterday'}
        </span>
      </div>
    )}
  </div>
);