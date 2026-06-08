"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Clock, Send, ShieldAlert, LogOut, CheckCircle2, Loader2 } from "lucide-react";

interface AccessLockProps {
  message: string;
  userName: string;
  onSendRequest: () => void;
  onLogout: () => void;
  isPendingApproval?: boolean;
  // Late lock props
  isLateLock?: boolean;
  username?: string;
  fineAmount?: number;
  bankConfig?: {
    bankName?: string;
    bankBin?: string;
    accountNumber?: string;
    accountHolder?: string;
    bankFullName?: string;
  };
  lateMins?: number;
  onSendExcuse?: (reason: string) => void;
  onReportPayment?: () => void;
  finePaymentPending?: boolean;
  isDeniedApproval?: boolean;
  onRetry?: () => void;
}

export default function AccessLock({
  message,
  userName,
  onSendRequest,
  onLogout,
  isPendingApproval = false,
  isLateLock = false,
  username = "",
  fineAmount = 50000,
  bankConfig,
  lateMins = 0,
  onSendExcuse,
  onReportPayment,
  finePaymentPending = false,
  isDeniedApproval = false,
  onRetry,
}: AccessLockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [excuseReason, setExcuseReason] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatLateMins = (mins: number) => {
    if (mins < 60) return `${mins} phút`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs} giờ ${rem} phút` : `${hrs} giờ`;
  };

  const handleExcuseSubmit = () => {
    if (!excuseReason.trim()) {
      alert("Vui lòng nhập lý do giải trình trước khi gửi!");
      return;
    }
    if (onSendExcuse) {
      onSendExcuse(excuseReason);
      setExcuseReason("");
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[#070707]/75 backdrop-blur-md text-white flex flex-col items-center justify-center p-6 overflow-y-auto custom-scrollbar">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-sidebar/85 backdrop-blur-lg border border-gold/20 rounded-[32px] p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] shadow-gold/5 relative overflow-hidden text-center my-auto"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />

        {isPendingApproval ? (
          <div className="py-10 px-4 space-y-8 flex flex-col items-center justify-center animate-fade-in">
            <div className="relative flex items-center justify-center mb-2">
              <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-xl animate-pulse" />
              <div className="h-24 w-24 rounded-full border border-amber-500/20 border-dashed animate-[spin_25s_linear_infinite] absolute" />
              <div className="h-20 w-20 rounded-full border border-amber-500/30 animate-[spin_12s_linear_infinite_reverse] absolute" />
              <div className="h-16 w-16 bg-gradient-to-b from-amber-500/10 to-amber-950/30 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.15)] relative z-10">
                <Loader2 size={36} className="animate-spin text-gold" style={{ animationDuration: '3s' }} />
              </div>
            </div>

            <div className="space-y-3 text-center">
              <h2 className="text-3xl font-extrabold uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500">
                Đang xử lý yêu cầu...
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto rounded-full" />
            </div>

            <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse" />
              <p className="text-gray-300 text-sm font-medium leading-relaxed text-left">
                Hệ thống đang tiếp nhận bằng chứng của bạn. Vui lòng chờ **Admin hoặc Quản lý** đối soát và phê duyệt yêu cầu để tự động mở khóa tài khoản!
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-widest font-black">
                <span>Trạng thái kiểm duyệt:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider animate-pulse">
                  Chờ phê duyệt
                </span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
              <button
                onClick={onLogout}
                className="px-8 h-12 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-gray-300 hover:text-red-400 font-black text-sm uppercase tracking-widest rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                Đăng xuất tài khoản
              </button>
            </div>
          </div>
        ) : isDeniedApproval ? (
          <div className="py-12 space-y-6">
            <div className="h-20 w-20 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-500/5">
              <ShieldAlert size={40} className="animate-pulse" />
            </div>
            <h2 className="text-3xl font-bold uppercase tracking-tight text-red-500">Yêu cầu bị từ chối</h2>
            <p className="text-gray-300 text-base font-medium max-w-md mx-auto leading-relaxed">
              Yêu cầu giải trình hoặc nộp phạt của bạn đã bị Admin/Quản lý từ chối. Vui lòng kiểm tra lại thông tin và thử gửi lại.
            </p>
            <div className="pt-6 flex gap-3 justify-center">
              <button
                onClick={onRetry}
                className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-zinc-50 font-bold rounded-xl transition-colors mt-4"
              >
                Thử gửi lại
              </button>
              <button
                onClick={onLogout}
                className="px-8 h-12 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-500 font-black text-sm uppercase tracking-widest rounded-xl transition-all duration-300 shadow-lg shadow-red-500/5"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        ) : isLateLock ? (
          <>
            <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/5">
              <Clock size={32} className="animate-pulse" />
            </div>

            <h2 className="text-3xl font-bold uppercase tracking-tight text-white mb-2">Báo cáo đi muộn</h2>
            <p className="text-gray-400 text-base font-medium max-w-md mx-auto leading-relaxed mb-6">
              Hôm nay bạn check-in lúc <span className="text-red-400 font-bold font-mono">
                {currentTime.toLocaleTimeString("vi-VN")}
              </span>, đi muộn <span className="text-red-400 font-bold font-mono">{formatLateMins(lateMins)}</span> so với giờ quy định (8:00 AM).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border-t border-b border-white/0 py-8 my-6 text-left">
              <div className="flex flex-col items-center justify-center border-r border-white/0 pr-0 md:pr-6 pb-6 md:pb-0">
                <div className="bg-zinc-900 p-6 rounded-2xl shadow-xl border-2 border-white/0 relative">
                  <img
                    src={`https://img.vietqr.io/image/${bankConfig?.bankBin || bankConfig?.bankName || "MB"}-${bankConfig?.accountNumber || "686820388888"}-compact2.png?amount=${fineAmount}&addInfo=${username || 'Guest'}_Nop_Phat&accountName=${encodeURIComponent(bankConfig?.accountHolder || "CÔNG TY TNHH AQ MEDIA")}`}
                    alt="VietQR Fine Code"
                    className="h-[180px] w-[180px] object-contain rounded-xl"
                  />
                </div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-3 text-center">Quét mã nộp phạt qua Ngân hàng</p>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Ngân hàng thụ hưởng</span>
                  <span className="text-base font-black text-white">{bankConfig?.bankFullName || `${bankConfig?.bankName || "MB"} Bank`}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Số tài khoản</span>
                  <span className="text-base font-black text-gold font-mono">{bankConfig?.accountNumber || "686820388888"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Tên người nhận</span>
                  <span className="text-base font-black text-white">{bankConfig?.accountHolder || "CÔNG TY TNHH AQ MEDIA"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Số tiền nộp phạt</span>
                  <span className="text-lg font-black text-red-400 font-mono">
                    {fineAmount.toLocaleString("vi-VN")} VND
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Nội dung chuyển khoản</span>
                  <span className="text-sm font-bold text-gray-300 font-mono bg-white/5 border border-white/0 px-3 py-1.5 rounded-lg block overflow-hidden text-ellipsis whitespace-nowrap">
                    {username.toUpperCase()}_NOP_PHAT
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/0 pt-6 my-6 text-left">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Hoặc gửi lý do giải trình đi muộn (Mở khóa lập tức)</label>
              <textarea
                value={excuseReason}
                onChange={(e) => setExcuseReason(e.target.value)}
                placeholder="Nhập lý do đi muộn của bạn tại đây (ví dụ: tắc đường, hỏng xe, việc gia đình đột xuất...)"
                className="w-full bg-white/5 border border-white/0 rounded-2xl p-6 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/5 focus:ring-1 focus:ring-gold/5 transition-all resize-none"
                rows={3}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                disabled={finePaymentPending}
                onClick={onReportPayment}
                className={`flex-1 h-14 font-black text-base uppercase tracking-widest rounded-2xl transition-all duration-300 shadow-lg ${finePaymentPending ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 cursor-not-allowed" : "bg-gold text-sidebar hover:bg-amber-700 bg-amber-600 hover:text-white shadow-gold/25"}`}
              >
                {finePaymentPending ? "Chờ duyệt..." : "Đã chuyển khoản"}
              </button>

              <button
                onClick={handleExcuseSubmit}
                className="flex-1 h-14 bg-white/5 border border-white/0 hover:border-white/5 text-white font-black text-base uppercase tracking-widest rounded-2xl transition-all duration-300"
              >
                Gửi yêu cầu
              </button>

              <button
                onClick={onLogout}
                className="h-14 px-6 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-500 font-black text-base uppercase tracking-widest rounded-2xl transition-all duration-300"
              >
                Đăng xuất
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto w-24 h-24 bg-gold/10 rounded-[30px] flex items-center justify-center text-gold mb-8 border border-gold/20">
              <Lock size={48} />
            </div>

            <h1 className="text-4xl font-black text-white tracking-tighter mb-4 uppercase">
              Hệ thống đã khóa
            </h1>
            <div className="bg-white/5 border border-white/0 rounded-2xl py-4 px-8 mb-8 inline-flex items-center gap-4">
              <Clock className="text-gold" size={24} />
              <span className="text-2xl font-mono font-black text-white">
                {currentTime.toLocaleTimeString("vi-VN")}
              </span>
            </div>

            <p className="text-xl text-gray-400 font-medium mb-10 leading-relaxed">
              {message}
            </p>

            <div className="flex flex-col gap-6 items-center">
              <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
                <button
                  onClick={onSendRequest}
                  className="h-16 px-10 rounded-2xl bg-gold text-[#0a0a0a] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl shadow-gold/20"
                >
                  <Send size={24} /> Gửi yêu cầu truy cập
                </button>
                <button
                  onClick={onLogout}
                  className="h-16 px-10 rounded-2xl bg-white/5 border border-white/0 text-gray-400 font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
                >
                  <LogOut size={24} /> Đăng xuất
                </button>
              </div>
            </div>
          </>
        )}

        <p className="mt-12 text-sm font-bold uppercase tracking-widest text-gray-500">
          AQ MEDIA Management System &copy; 2026
        </p>
      </motion.div>
    </div>
  );
}
