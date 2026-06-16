import React, { Suspense } from "react";
import LoginFormClient from "@/components/auth/LoginFormClient";

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 relative overflow-hidden">
      {/* Decorative blurred backgrounds */}
      <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-gold/5 blur-[120px]" />
      <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-gold/5 blur-[120px]" />
      
      {/* Impeccable Custom Spinner */}
      <div className="relative flex items-center justify-center h-20 w-20 z-10">
        <div className="absolute animate-ping h-12 w-12 rounded-full border-2 border-gold/20 opacity-75" />
        <div className="absolute animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold" />
        <img src="/logo.png" alt="AQ" className="h-6 w-6 object-contain animate-pulse" />
      </div>

      <div className="text-center z-10 space-y-1 animate-pulse">
        <h2 className="text-sm font-black text-white uppercase tracking-[0.25em]">AQ Media</h2>
        <p className="text-[9px] font-black uppercase text-foreground-secondary tracking-widest">Đang khởi tạo kết nối an toàn...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginFormClient />
    </Suspense>
  );
}
