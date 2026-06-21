"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Clock, Send, ShieldAlert, LogOut, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import Pusher from "pusher-js";

interface AccessLockProps {
  message: string;
  userName: string;
  onSendRequest: () => void;
  onLogout: () => void;
  isPendingApproval?: boolean;
  // Late lock props
  isLateLock?: boolean;
  username?: string;
  userId?: string;
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
  onApproved?: () => void;
  onDenied?: () => void;
}

export default function AccessLock({
  message,
  userName,
  onSendRequest,
  onLogout,
  isPendingApproval = false,
  isLateLock = false,
  username = "",
  userId = "",
  fineAmount = 50000,
  bankConfig,
  lateMins = 0,
  onSendExcuse,
  onReportPayment,
  finePaymentPending = false,
  isDeniedApproval = false,
  onRetry,
  onApproved,
  onDenied,
}: AccessLockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [excuseReason, setExcuseReason] = useState("");
  
  const [localPending, setLocalPending] = useState(isPendingApproval);
  const [localDenied, setLocalDenied] = useState(isDeniedApproval);

  useEffect(() => {
    setLocalPending(isPendingApproval);
  }, [isPendingApproval]);

  useEffect(() => {
    setLocalDenied(isDeniedApproval);
  }, [isDeniedApproval]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time listener for user-specific access approvals/denials
  useEffect(() => {
    if (!userId) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1",
    });

    const channel = pusher.subscribe(`user-${userId}`);
    channel.bind("access-response", async (data: any) => {
      if (data.status === "APPROVED") {
        try {
          await fetch("/api/auth/refresh", { method: "POST" });
        } catch (refreshErr) {
          console.error("Lỗi tự động cập nhật token khi được duyệt:", refreshErr);
        }
        setLocalPending(false);
        setLocalDenied(false);
        toast.success("Yêu cầu của bạn đã được phê duyệt!");
        if (onApproved) {
          onApproved();
        } else {
          window.location.reload();
        }
      } else if (data.status === "DENIED") {
        setLocalPending(false);
        setLocalDenied(true);
        toast.error("Yêu cầu của bạn đã bị từ chối!");
        if (onDenied) {
          onDenied();
        }
      }
    });

    return () => {
      pusher.unsubscribe(`user-${userId}`);
      pusher.disconnect();
    };
  }, [userId, onApproved, onDenied]);

  const formatLateMins = (mins: number) => {
    if (mins < 60) return `${mins} phút`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs} giờ ${rem} phút` : `${hrs} giờ`;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendRequestClick = async () => {
    setIsSubmitting(true);
    setLocalPending(true);
    setLocalDenied(false);
    try {
      await onSendRequest();
      toast.success("Đã gửi yêu cầu mở khóa thành công!");
    } catch (err) {
      console.error("Gửi yêu cầu mở khóa thất bại:", err);
      toast.error("Lỗi kết nối, vui lòng thử lại!");
      setIsSubmitting(false);
      setLocalPending(false);
    }
  };

  const handleReportPaymentClick = async () => {
    if (!onReportPayment) return;
    setIsSubmitting(true);
    setLocalPending(true);
    setLocalDenied(false);
    try {
      await onReportPayment();
      toast.success("Đã báo cáo chuyển khoản thành công!");
    } catch (err) {
      console.error("Báo cáo chuyển khoản thất bại:", err);
      toast.error("Lỗi kết nối, vui lòng thử lại!");
      setLocalPending(false);
      setIsSubmitting(false);
    }
  };

  const handleExcuseSubmit = async () => {
    if (!excuseReason.trim()) {
      toast.error("Vui lòng nhập lý do giải trình trước khi gửi!");
      return;
    }
    if (!onSendExcuse) return;
    setIsSubmitting(true);
    setLocalPending(true);
    setLocalDenied(false);
    try {
      await onSendExcuse(excuseReason);
      setExcuseReason("");
      toast.success("Đã gửi lý do giải trình thành công!");
    } catch (err) {
      console.error("Gửi giải trình thất bại:", err);
      toast.error("Lỗi kết nối, vui lòng thử lại!");
      setLocalPending(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-background/80 backdrop-blur-md text-foreground flex flex-col items-center justify-center p-6 overflow-y-auto custom-scrollbar">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.02)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-background-secondary border border-border rounded-lg p-6 md:p-8 shadow-premium relative overflow-hidden text-center my-auto"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />

        {localPending && !localDenied ? (
          <div className="py-8 px-4 space-y-6 flex flex-col items-center justify-center animate-fade-in">
            <div className="relative flex items-center justify-center mb-2">
              <div className="absolute inset-0 rounded-full bg-gold/10 blur-xl animate-pulse" />
              <div className="h-20 w-20 rounded-full border border-gold/20 border-dashed animate-[spin_25s_linear_infinite] absolute" />
              <div className="h-16 w-16 rounded-full border border-gold/30 animate-[spin_12s_linear_infinite_reverse] absolute" />
              <div className="h-12 w-12 bg-background-tertiary border border-border text-gold rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.15)] relative z-10">
                <Loader2 size={24} className="animate-spin text-gold" style={{ animationDuration: '3s' }} />
              </div>
            </div>

            <div className="space-y-2 text-center">
              <h2 className="text-xl font-bold uppercase tracking-wider text-gold">
                Đang chờ phê duyệt...
              </h2>
              <div className="w-12 h-0.5 bg-gold mx-auto rounded-full" />
            </div>

            <div className="w-full max-w-md bg-background-tertiary border border-border rounded-md p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gold animate-pulse" />
              <p className="text-foreground-secondary text-sm font-medium leading-relaxed text-left">
                Yêu cầu của bạn đã được gửi tới Ban quản trị. Vui lòng giữ nguyên màn hình này, hệ thống sẽ tự động mở khóa ngay khi Admin phê duyệt!
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
              <button
                onClick={onLogout}
                className="px-6 h-10 bg-background-tertiary hover:bg-danger/10 border border-border hover:border-danger/20 text-foreground-secondary hover:text-danger font-bold text-xs uppercase tracking-widest rounded-sm transition-all duration-200 flex items-center justify-center gap-2"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        ) : localDenied ? (
          <div className="py-8 space-y-6">
            <div className="h-16 w-16 bg-danger/10 border border-danger/20 text-danger rounded-md flex items-center justify-center mx-auto shadow-md">
              <ShieldAlert size={32} className="animate-pulse" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-danger">Yêu cầu bị từ chối</h2>
            <p className="text-foreground-secondary text-sm font-medium max-w-md mx-auto leading-relaxed">
              Yêu cầu của bạn đã bị Admin từ chối. Vui lòng kiểm tra lại lý do giải trình hoặc bằng chứng chuyển khoản và thử lại.
            </p>
            <div className="pt-4 flex gap-3 justify-center">
              <button
                onClick={() => {
                  setLocalDenied(false);
                  if (onRetry) onRetry();
                }}
                className="px-6 h-10 bg-gold text-background font-bold text-xs uppercase tracking-widest rounded-sm hover:bg-gold-dark transition-all shadow-md shadow-gold/10"
              >
                Thử gửi lại giải trình
              </button>
              <button
                onClick={onLogout}
                className="px-6 h-10 bg-danger/10 border border-danger/20 hover:bg-danger hover:text-white text-danger font-bold text-xs uppercase tracking-widest rounded-sm transition-all duration-200 shadow-md"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        ) : message.toLowerCase().includes("khóa") ? (
          <div className="py-8 space-y-6 flex flex-col items-center">
            <div className="h-16 w-16 bg-danger/10 border border-danger/20 text-danger rounded-md flex items-center justify-center shadow-lg">
              <Lock size={32} className="animate-pulse" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground tracking-tight uppercase">Tài khoản đã bị khóa</h2>
              <p className="text-foreground-secondary/70 font-bold uppercase tracking-[0.2em] text-[10px]">Liên hệ Admin để được hỗ trợ</p>
            </div>

            <div className="w-full max-w-md bg-danger/5 border border-danger/10 rounded-md p-6 text-left relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-danger/30" />
              <p className="text-foreground-secondary text-sm font-medium leading-relaxed italic">
                "{message}"
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
              <button
                onClick={handleSendRequestClick}
                disabled={isSubmitting}
                className="flex-1 h-12 bg-danger hover:bg-danger/90 text-white font-bold uppercase text-xs tracking-widest rounded-sm transition-all shadow-md shadow-danger/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} /> Gửi yêu cầu mở khóa
              </button>
              <button
                onClick={onLogout}
                disabled={isSubmitting}
                className="h-12 px-6 bg-background-tertiary border border-border text-foreground-secondary font-bold uppercase text-xs tracking-widest rounded-sm hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        ) : isLateLock ? (
          <>
            <div className="h-12 w-12 bg-danger/10 border border-danger/20 text-danger rounded-md flex items-center justify-center mx-auto mb-4 shadow-md">
              <Clock size={24} className="animate-pulse" />
            </div>

            <h2 className="text-2xl font-bold uppercase tracking-tight text-foreground mb-1">Báo cáo đi muộn</h2>
            <p className="text-foreground-secondary text-sm font-medium max-w-md mx-auto leading-relaxed mb-6">
              Hôm nay bạn check-in lúc <span className="text-danger font-bold font-mono">
                {currentTime.toLocaleTimeString("vi-VN")}
              </span>, đi muộn <span className="text-danger font-bold font-mono">{formatLateMins(lateMins)}</span> so với giờ quy định (8:00 AM).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border-t border-b border-border py-6 my-4 text-left">
              <div className="flex flex-col items-center justify-center pr-0 md:pr-6 pb-6 md:pb-0">
                {/* VietQR Protected Container: strict white background with border */}
                <div className="bg-white p-3 rounded-md border border-border shadow-md relative">
                  <img
                    src={`https://img.vietqr.io/image/${bankConfig?.bankBin || bankConfig?.bankName || "MB"}-${bankConfig?.accountNumber || "686820388888"}-compact2.png?amount=${fineAmount}&addInfo=${username || 'Guest'}_Nop_Phat&accountName=${encodeURIComponent(bankConfig?.accountHolder || "CÔNG TY TNHH AQ MEDIA")}`}
                    alt="VietQR Fine Code"
                    className="h-[180px] w-[180px] object-contain rounded-sm"
                  />
                </div>
                <p className="text-[10px] text-foreground-secondary/70 uppercase tracking-widest font-bold mt-3 text-center">Quét mã nộp phạt qua Ngân hàng</p>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[9px] font-bold text-foreground-secondary uppercase tracking-wider block">Ngân hàng thụ hưởng</span>
                  <span className="text-sm font-bold text-foreground">{bankConfig?.bankFullName || `${bankConfig?.bankName || "MB"} Bank`}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-foreground-secondary uppercase tracking-wider block">Số tài khoản</span>
                  <span className="text-sm font-bold text-gold font-mono">{bankConfig?.accountNumber || "686820388888"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-foreground-secondary uppercase tracking-wider block">Tên người nhận</span>
                  <span className="text-sm font-bold text-foreground">{bankConfig?.accountHolder || "CÔNG TY TNHH AQ MEDIA"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-foreground-secondary uppercase tracking-wider block">Số tiền nộp phạt</span>
                  <span className="text-base font-bold text-danger font-mono">
                    {fineAmount.toLocaleString("vi-VN")} VND
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-foreground-secondary uppercase tracking-wider block">Nội dung chuyển khoản</span>
                  <span className="text-xs font-bold text-foreground font-mono bg-background-tertiary border border-border px-3 py-1.5 rounded-md block overflow-hidden text-ellipsis whitespace-nowrap">
                    {username.toUpperCase()}_NOP_PHAT
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 my-4 text-left">
              <label className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider block mb-2">Hoặc gửi lý do giải trình đi muộn (Mở khóa lập tức)</label>
              <textarea
                value={excuseReason}
                onChange={(e) => setExcuseReason(e.target.value)}
                placeholder="Nhập lý do đi muộn của bạn tại đây (ví dụ: tắc đường, hỏng xe, việc gia đình đột xuất...)"
                className="w-full bg-background-secondary border border-border rounded-md p-4 text-sm text-foreground placeholder:text-foreground-secondary/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all resize-none"
                rows={3}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                disabled={finePaymentPending || isSubmitting}
                onClick={handleReportPaymentClick}
                className={`flex-1 h-12 font-bold text-xs uppercase tracking-widest rounded-sm transition-all duration-200 shadow-md ${finePaymentPending || isSubmitting ? "bg-warning/10 border border-warning/20 text-warning cursor-not-allowed opacity-50" : "bg-gold text-background hover:bg-gold-dark hover:shadow-gold/10"}`}
              >
                {finePaymentPending ? "Chờ duyệt..." : "Đã chuyển khoản"}
              </button>

              <button
                onClick={handleExcuseSubmit}
                disabled={isSubmitting}
                className="flex-1 h-12 bg-background-tertiary border border-border text-foreground hover:border-border-light font-bold text-xs uppercase tracking-widest rounded-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Gửi yêu cầu
              </button>

              <button
                onClick={onLogout}
                disabled={isSubmitting}
                className="h-12 px-4 bg-danger/10 border border-danger/20 hover:bg-danger hover:text-white text-danger font-bold text-xs uppercase tracking-widest rounded-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Đăng xuất
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 bg-gold/10 rounded-md flex items-center justify-center text-gold mb-6 border border-gold/20">
              <Lock size={32} />
            </div>

            <h1 className="text-2xl font-bold text-foreground tracking-tight mb-4 uppercase">
              Hệ thống đã khóa
            </h1>
            <div className="bg-background-tertiary border border-border rounded-md py-3 px-6 mb-6 inline-flex items-center gap-4">
              <Clock className="text-gold" size={20} />
              <span className="text-xl font-mono font-bold text-foreground">
                {currentTime.toLocaleTimeString("vi-VN")}
              </span>
            </div>

            <p className="text-base text-foreground-secondary font-medium mb-8 leading-relaxed">
              {message}
            </p>

            <div className="flex flex-col gap-6 items-center">
              <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
                <button
                  onClick={handleSendRequestClick}
                  disabled={isSubmitting}
                  className="h-12 px-6 rounded-sm bg-gold text-background font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-gold-dark transition-all shadow-md shadow-gold/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} /> Gửi yêu cầu truy cập
                </button>
                <button
                  onClick={onLogout}
                  disabled={isSubmitting}
                  className="h-12 px-6 rounded-sm bg-background-tertiary border border-border text-foreground-secondary font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut size={16} /> Đăng xuất
                </button>
              </div>
            </div>
          </>
        )}

        <p className="mt-8 text-xs font-bold uppercase tracking-widest text-foreground-secondary/70">
          AQ MEDIA Management System &copy; 2026
        </p>
      </motion.div>
    </div>
  );
}
