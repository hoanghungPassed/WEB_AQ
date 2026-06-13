"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, User, Eye, EyeOff, Loader2, UserPlus, ShieldAlert, CheckCircle2, AlertCircle, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

function RealTimeClock() {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      setTimeStr(`${hh}:${mm}:${ss}`);

      const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const dayName = days[now.getDay()];
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      setDateStr(`${dayName}, ${day}/${month}/${year}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute right-8 top-8 z-20 flex flex-col items-end rounded-2xl border border-white/0 bg-white/5 p-4 backdrop-blur-md text-right font-mono text-white shadow-lg">
      <div className="text-2xl font-black tracking-widest text-gold">{timeStr}</div>
      <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mt-1">{dateStr}</div>
    </div>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [require2FA, setRequire2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [tempUserId, setTempUserId] = useState("");

  const [overtimeBypassFlag, setOvertimeBypassFlag] = useState(false);

  const [isWaitingApproval, setIsWaitingApproval] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const msg = searchParams.get("message");
    if (msg === "pending") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage("Đăng ký thành công! Vui lòng chờ Admin phê duyệt tài khoản.");
    }
    const err = searchParams.get("error");
    if (err === "system_closed") {
      setError("Hệ thống đã đóng cửa làm việc. Bạn cần đồng ý nộp phạt 50.000 VNĐ để tiếp tục đăng nhập ngoài giờ.");
    } else if (err === "2fa_required") {
      setError("Bạn cần hoàn tất xác thực 2FA để tiếp tục.");
    }
  }, [isClient, searchParams]);

  const handleLogin = async (e: React.FormEvent, overtimeAgreedOption = false) => {
    if (e) e.preventDefault();
    if (!isClient) return;
    setError("");
    setMessage("");

    if (localStorage.getItem(`access_response_${username}`) === "DENIED") {
      setError("Yêu cầu đăng nhập đã bị từ chối");
      return;
    }

    setIsLoading(true);

    try {
      if (require2FA) {
        const res = await fetch("/api/admin/2fa/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            userId: tempUserId,
            token: totpCode, 
            backupCode: totpCode,
            overtimeBypass: overtimeAgreedOption || overtimeBypassFlag
          }),
        });

        const data = await res.json();

        if (res.ok) {
          login(data.user);
          router.push("/admin");
        } else {
          setError(data.error || "Mã xác thực 2FA/Backup không chính xác.");
        }
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            username: username.toLowerCase(), 
            password,
            overtimeAgreed: overtimeAgreedOption || overtimeBypassFlag
          }),
        });

        const data = await res.json();

        if (res.ok) {
          if (data.overtimeBypass) {
            setOvertimeBypassFlag(true);
          }
          if (data.require2FA) {
            setRequire2FA(true);
            setTempUserId(data.userId);
            setMessage("Tài khoản đã được bảo vệ bằng 2FA. Vui lòng nhập mã OTP để đăng nhập.");
          } else {
            login(data.user);
            router.push("/admin");
          }
        } else {
          if (data.error === "system_closed_fine_required") {
            setError("Hệ thống đã đóng cửa làm việc. Bạn cần đồng ý nộp phạt 50.000 VNĐ để tiếp tục đăng nhập ngoài giờ.");
          }
          if (data.error && data.error.includes("chờ duyệt")) {
            setIsWaitingApproval(true);
            setApprovalStatus("PENDING");
          }
          setError(data.error === "system_closed_fine_required" ? data.message : (data.error || "Sai tên đăng nhập hoặc mật khẩu"));
        }
      }
    } catch (err: any) {
      setError("Lỗi kết nối máy chủ");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isWaitingApproval || !username || !isClient) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/check-status?username=${encodeURIComponent(username.toLowerCase())}`);
        if (!res.ok) {
          if (res.status === 404) setApprovalStatus("REJECTED");
          return;
        }
        const data = await res.json();
        if (data.status === "GRANTED" || data.status === "APPROVED" || data.status === "ACTIVE") {
          setApprovalStatus("APPROVED");
          clearInterval(interval);
          try {
            const loginRes = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: username.toLowerCase(), password })
            });
            if (loginRes.ok) {
              const loginData = await loginRes.json();
              login(loginData.user);
              setTimeout(() => router.push("/admin"), 2000);
            } else {
              setIsWaitingApproval(false);
              setError("Tự động đăng nhập thất bại sau khi duyệt");
            }
          } catch (_) {
            setIsWaitingApproval(false);
            setError("Lỗi kết nối khi tự động đăng nhập");
          }
        } else if (data.status === "REJECTED" || data.status === "LOCKED") {
          setApprovalStatus("REJECTED");
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Lỗi check status:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isWaitingApproval, username, password, login, router, isClient]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] font-sans">
      {isClient && <RealTimeClock />}

      <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-gold/10 blur-[120px]" />
      <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-gold/5 blur-[120px]" />

      {!isClient ? (
        <div className="z-10 flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-gold" size={48} />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Đang tải hệ thống...</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 w-full max-w-[550px] p-6"
        >
          <div className="rounded-2xl border border-white/0 bg-white/5 p-12 md:p-16 backdrop-blur-3xl shadow-xl shadow-gray-900/50">
            <div className="mb-10 text-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[32px] bg-gold/5 border border-gold/10 overflow-hidden shadow-2xl"
              >
                <img src="/logo.png" alt="AQ MEDIA" className="h-full w-full object-contain p-2" onError={(e) => e.currentTarget.src = "https://via.placeholder.com/150/d4af37/000000?text=AQ"} />
              </motion.div>
              <h1 className="text-3xl font-bold mb-6 text-center text-white">
                AQ <span className="text-gold uppercase tracking-widest text-2xl ml-1">Media</span>
              </h1>
              <p className="mt-3 text-xs font-bold text-gray-500 uppercase tracking-[0.4em]">
                Hệ thống quản lý nội bộ
              </p>
            </div>

            {message && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-black uppercase tracking-widest text-center flex items-center gap-3">
                <CheckCircle2 size={16} /> {message}
              </motion.div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-widest text-left flex flex-col gap-3 leading-relaxed">
                <div className="flex items-center gap-3">
                  <ShieldAlert size={16} className="shrink-0" /> {error}
                </div>
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              {!require2FA ? (
                <>
                  <div className="space-y-3">
                    <label className="text-lg font-medium text-gray-300 ml-1">Tài khoản</label>
                    <div className="group relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        style={{ paddingLeft: "3.5rem", paddingRight: "1rem" }}
                        className="w-full rounded-xl border border-gray-600 bg-gray-800 py-3 pl-14 pr-4 text-lg text-white transition-all focus:border-blue-500 focus:outline-none shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-lg font-medium text-gray-300">Mật khẩu</label>
                      <Link href="/forgot-password" className="text-[10px] font-black text-gold hover:underline uppercase">Quên mật khẩu?</Link>
                    </div>
                    <div className="group relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mật khẩu của bạn"
                        style={{ paddingLeft: "3.5rem", paddingRight: "3rem" }}
                        className="w-full rounded-xl border border-gray-600 bg-gray-800 py-3 pl-14 pr-12 text-lg text-white transition-all focus:border-blue-500 focus:outline-none shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <label className="text-lg font-medium text-gray-300 ml-1">Mã xác thực 2FA / Mã dự phòng</label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
                    placeholder="Mã 6 số hoặc 8 ký tự"
                    className="w-full rounded-2xl border border-gold/30 bg-black/40 px-6 py-5 text-2xl font-black text-gold text-center tracking-[0.2em] focus:outline-none font-mono uppercase"
                  />
                  {error && error.includes("đối chiếu") && (
                    <p className="text-[10px] text-gray-400 mt-2 text-center uppercase tracking-wider">
                      Thời gian máy chủ hiện tại: <span className="text-gold">{(error.match(/\d{2}:\d{2}:\d{2}/) || [])[0]}</span>
                    </p>
                  )}
                  <button type="button" onClick={() => {setRequire2FA(false); setTotpCode(""); setError("");}} className="text-xs font-bold text-gray-400 hover:text-white uppercase mt-2 block">← Quay lại</button>
                </div>
              )}


              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-gold font-bold text-white py-3 text-lg transition-all hover:bg-gold-hover active:scale-95 disabled:opacity-70 mt-8"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Đang xác thực...</span>
                  </div>
                ) : (
                  require2FA ? "Xác nhận OTP" : "Đăng nhập ngay"
                )}
              </button>
            </form>

            <div className="mt-10 text-center">
              <p className="text-xs text-gray-500 font-bold uppercase">
                Chưa có tài khoản?{" "}
                <Link href="/register" className="text-gold hover:underline inline-flex items-center gap-2 ml-1">
                  Đăng ký ngay <UserPlus size={16} />
                </Link>
              </p>
            </div>

            <div className="mt-10 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">
                Bản quyền AQ MEDIA &copy; 2026
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {isWaitingApproval && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-md rounded-[32px] border border-white/10 bg-[#161616]/90 p-8 text-center shadow-2xl"
            >
              <div className="relative z-10 flex flex-col items-center">
                {approvalStatus === "PENDING" && (
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-gold/5 border border-gold/10">
                    <Loader2 className="h-10 w-10 text-gold animate-spin" />
                  </div>
                )}
                {approvalStatus === "APPROVED" && (
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="h-10 w-10 text-green-400" />
                  </div>
                )}
                {approvalStatus === "REJECTED" && (
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="h-10 w-10 text-red-400 animate-bounce" />
                  </div>
                )}

                <h3 className="text-2xl font-black uppercase text-white mb-3">
                  {approvalStatus === "PENDING" && "Chờ phê duyệt"}
                  {approvalStatus === "APPROVED" && "Tuyệt vời!"}
                  {approvalStatus === "REJECTED" && "Bị từ chối"}
                </h3>

                <p className="text-gray-300 font-medium text-sm mb-8 px-2">
                  {approvalStatus === "PENDING" && "Tài khoản của bạn đang chờ phê duyệt. Vui lòng chờ..."}
                  {approvalStatus === "APPROVED" && "Chúc mừng, tài khoản của bạn đã được phê duyệt thành công!"}
                  {approvalStatus === "REJECTED" && "Yêu cầu đăng ký của bạn bị từ chối"}
                </p>

                {approvalStatus === "PENDING" && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase">
                    <Clock size={14} className="animate-pulse" />
                    <span>Đang tự động kiểm tra...</span>
                  </div>
                )}

                {approvalStatus === "REJECTED" && (
                  <button
                    type="button"
                    onClick={() => { setIsWaitingApproval(false); setApprovalStatus("PENDING"); }}
                    className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 hover:border-gold hover:bg-gold/5 font-black uppercase text-white text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <ArrowLeft size={16} /> Quay lại
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={48} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
