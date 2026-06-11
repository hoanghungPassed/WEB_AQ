import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export const LoadingSpinner = ({ size = 24, className, label }: LoadingSpinnerProps) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className="relative">
        <Loader2 size={size} className="animate-spin text-amber-400" strokeWidth={1.5} />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400/40 animate-spin" style={{ animationDirection: 'reverse' }}></div>
      </div>
      {label && <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-center">{label}</p>}
    </div>
  );
};

export const LoadingOverlay = ({ label = 'Đang tải dữ liệu...' }: { label?: string }) => {
  return (
    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center rounded-lg">
      <div className="flex flex-col items-center gap-6">
        <LoadingSpinner size={48} />
        {label && <p className="text-sm font-semibold text-gray-300">{label}</p>}
      </div>
    </div>
  );
};
