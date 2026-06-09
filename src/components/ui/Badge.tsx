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
    default: 'bg-white/10 text-white border-white/20',
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    danger: 'bg-red-500/10 text-red-500 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    gold: 'bg-gold/10 text-gold border-gold/20',
  };

  return (
    <div
      className={cn(
        'px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-widest border inline-flex items-center gap-1.5',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};
