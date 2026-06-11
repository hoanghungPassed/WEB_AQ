import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
}

export const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => {
  const variants = {
    default: 'bg-gray-500/15 text-gray-300 border border-gray-500/30 shadow-sm hover:shadow-md',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm hover:shadow-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm hover:shadow-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/30 shadow-sm hover:shadow-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-sm hover:shadow-blue-500/20',
    gold: 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm hover:shadow-amber-500/20',
  };

  return (
    <div
      className={cn(
        'px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border inline-flex items-center gap-1.5 transition-all duration-200 hover:scale-105',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};
