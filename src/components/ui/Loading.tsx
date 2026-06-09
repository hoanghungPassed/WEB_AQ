import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export const LoadingSpinner = ({ size = 24, className, label }: LoadingSpinnerProps) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 size={size} className="animate-spin text-gold" />
      {label && <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</p>}
    </div>
  );
};

export const LoadingOverlay = ({ label = 'Đang tải dữ liệu...' }: { label?: string }) => {
  return (
    <div className="absolute inset-0 z-50 bg-sidebar/60 backdrop-blur-sm flex items-center justify-center">
      <LoadingSpinner size={40} label={label} />
    </div>
  );
};
