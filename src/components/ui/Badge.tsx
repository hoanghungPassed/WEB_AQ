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
    default: 'bg-foreground-secondary/10 text-foreground-secondary border-border shadow-sm hover:shadow-md',
    success: 'bg-success/10 text-success border-success/20 shadow-sm hover:shadow-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20 shadow-sm hover:shadow-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20 shadow-sm hover:shadow-danger/20',
    info: 'bg-info/10 text-info border-info/20 shadow-sm hover:shadow-info/20',
    gold: 'bg-gold/10 text-gold border-gold/20 shadow-sm hover:shadow-gold/20',
  };

  return (
    <div
      className={cn(
        'px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border inline-flex items-center gap-1.5 transition-all duration-200 hover:scale-105',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};
