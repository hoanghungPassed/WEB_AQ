"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, User, Eye, EyeOff, Loader2, UserPlus, ShieldAlert, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { StaffData } from "@/types/admin";
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // 2FA States
  const [require2FA, setRequire2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [tempUserId, setTempUserId] = useState("");

  // Overtime Fine States
  const [overtimeBypassFlag, setOvertimeBypassFlag] = useState(false);
  const [showOvertimePopup, setShowOvertimePopup] = useState(false);

  useEffect(() => {
    const msg = searchParams.get("message");
    if (msg === "pending") {
      setMessage("Đăng ký thành công! Vui lòng chờ Admin phê duyệt tài khoản.");
    }
    const err = searchParams.get("error");
    if (err === "system_closed") {
      setError("Hệ thống đã đóng cửa làm việc. Bạn cần đồng ý nộp phạt 50.000 VNĐ để tiếp tục đăng nhập ngoài giờ.");
      setShowOvertimePopup(true);
    } else if (err === "2fa_required") {
      setError("Bạn cần hoàn tất xác thực 2FA để tiếp tục.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent, overtimeAgreedOption = false) => {
    if (e) e.preventDefault();
    setError("");
    setMessage("");

    if (localStorage.getItem(`access_response_${username}`) === "DENIED") {
      setError("Yêu cầu đăng nhập đã bị từ chối");
      return;
    }

    setIsLoading(true);

    try {
      if (require2FA) {
        // Step 2: Verify TOTP token / Backup code
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
        // Step 1: Normal login
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            username, 
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
            if (data.overtimeBypass) {
              setOvertimeBypassFlag(true);
            }
            setMessage("Tài khoản đã được bảo vệ bằng 2FA. Vui lòng nhập mã OTP để đăng nhập.");
          } else {
            login(data.user);
            router.push("/admin");
          }
        } else {
          if (data.error === "system_closed_fine_required") {
            setShowOvertimePopup(true);
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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] font-sans">
      {/* Real-time clock widget in the corner */}
      <RealTimeClock />

      {/* Background Orbs */}
      <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-gold/10 blur-[120px]" />
      <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-gold/5 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-[550px] p-6"
      >
        <div className="rounded-2xl border border-white/0 bg-white/5 p-12 md:p-16 backdrop-blur-3xl shadow-xl shadow-gray-900/50">
          {/* Logo Section */}
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

          {/* Messages */}
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
              {error.includes("yêu cầu duyệt") && (
                <button 
                  type="button"
                  onClick={() => {
                    const reqs = JSON.parse(localStorage.getItem("pending_access_requests") || "[]");
                    reqs.push({
                      id: Date.now(),
                      username,
                      staffName: username,
                      time: new Date().toLocaleString("vi-VN"),
                      status: "PENDING"
                    });
                    localStorage.setItem("pending_access_requests", JSON.stringify(reqs));
                    setError("");
                    setMessage("Đã gửi yêu cầu duyệt thành công. Vui lòng chờ Admin.");
                  }}
                  className="mt-2 h-10 rounded-xl bg-red-500/20 border border-red-500/30 hover:bg-red-500 text-white font-black uppercase tracking-widest transition-all text-[10px]"
                >
                  Gửi yêu cầu duyệt ngay
                </button>
              )}
            </motion.div>
          )}

          {/* Form Section */}
          <form onSubmit={handleLogin} className="space-y-6">
            {!require2FA ? (
              <>
                <div className="space-y-3">
                  <label className="text-lg font-medium text-gray-300 ml-1">
                    Tài khoản
                  </label>
                  <div className="group relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors">
                      <User size={20} />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 pl-14 text-lg text-white transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500 shadow-inner placeholder-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-lg font-medium text-gray-300">
                      Mật khẩu
                    </label>
                    <Link href="/forgot-password" className="text-[10px] font-black text-gold hover:underline uppercase tracking-tighter">
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <div className="group relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors">
                      <Lock size={20} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mật khẩu của bạn"
                      className="w-full rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 pl-14 pr-14 text-lg text-white transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500 shadow-inner placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <label className="text-lg font-medium text-gray-300 ml-1">
                  Mã xác thực 2FA hoặc Mã dự phòng
                </label>
                <div className="group relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9a-zA-Z]/g, "");
                      setTotpCode(val);
                    }}
                    placeholder="000000"
                    className="w-full rounded-2xl border border-gold/30 bg-black/40 px-6 py-5 text-4xl font-black text-gold text-center tracking-[0.5em] focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/15 transition-all shadow-inner placeholder-gold/10 font-mono uppercase"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRequire2FA(false);
                    setTotpCode("");
                    setError("");
                    setMessage("");
                  }}
                  className="text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wider block mt-2 ml-1"
                >
                  ← Quay lại đăng nhập
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full overflow-hidden rounded-xl bg-gold font-bold text-white py-3 text-lg transition-all hover:bg-gold-hover active:scale-95 disabled:opacity-70 shadow-xl shadow-gray-900/50 mt-8"
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

          {/* Register Link */}
          <div className="mt-10 text-center">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="text-gold hover:underline transition-all inline-flex items-center gap-2 ml-1">
                Đăng ký ngay <UserPlus size={16} />
              </Link>
            </p>
          </div>

          {/* Footer Info */}
          <div className="mt-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">
              Bản quyền AQ MEDIA &copy; 2026
            </p>
          </div>
        </div>
      </motion.div>
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
