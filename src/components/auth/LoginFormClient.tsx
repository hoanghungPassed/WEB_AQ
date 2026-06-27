"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, User, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

function RealTimeClock() {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setDateStr(now.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="absolute right-8 top-8 z-20 flex flex-col items-end card-style !p-4 backdrop-blur-md text-right font-mono border border-border bg-background-secondary/95 shadow-premium"
    >
      <div className="text-2xl font-black tracking-widest text-gold">{timeStr}</div>
      <div className="text-[10px] font-black uppercase tracking-wider text-foreground-secondary mt-1">{dateStr}</div>
    </motion.div>
  );
}

export default function LoginFormClient() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [require2FA, setRequire2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [tempUserId, setTempUserId] = useState("");

  useEffect(() => {
    const msg = searchParams.get("message");
    if (msg === "pending") setMessage("Đăng ký thành công! Vui lòng chờ phê duyệt.");
    const err = searchParams.get("error");
    if (err === "system_closed") setError("Hệ thống đã đóng cửa làm việc.");
    if (err === "session_expired") setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const url = require2FA ? "/api/admin/2fa/login" : "/api/auth/login";
      const body = require2FA ? { userId: tempUserId, token: totpCode } : { username: username.toLowerCase().trim(), password };
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.require2FA) {
          setRequire2FA(true);
          setTempUserId(data.userId);
        } else {
          login(data.user);
          toast.success("Đăng nhập thành công!");
          router.push("/admin");
        }
      } else {
        setError(data.error || "Sai thông tin đăng nhập");
      }
    } catch (err) {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <RealTimeClock />
      
      <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-gold/5 blur-[120px]" />
      <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-gold/5 blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="z-10 w-full max-w-md p-6"
      >
        <div className="card-style !p-12 shadow-premium bg-background-secondary border border-border rounded-xl">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 border border-border overflow-hidden shadow-inner">
              <img src="/logo.png" alt="AQ" className="h-full w-full object-contain p-2" />
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">AQ <span className="text-gold">Media</span></h1>
            <p className="mt-2 text-[10px] font-black text-foreground-secondary uppercase tracking-[0.4em]">Hệ thống quản lý nội bộ</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <AnimatePresence mode="wait">
              {!require2FA ? (
                <motion.div
                  key="login-fields"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest ml-1">Tài khoản</label>
                    <div className="relative w-full">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-secondary w-5 h-5 pointer-events-none" />
                      <input 
                        type="text" 
                        required 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        placeholder="Username" 
                        className="w-full pl-14 pr-4 h-14 bg-background-secondary border border-border rounded-md text-foreground placeholder-foreground-secondary/40 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest">Mật khẩu</label>
                      <Link href="/forgot-password" className="text-[8px] font-black text-gold hover:underline uppercase tracking-widest transition-all">Quên mật khẩu?</Link>
                    </div>
                    <div className="relative w-full">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-secondary w-5 h-5 pointer-events-none" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="••••••••" 
                        className="w-full pl-14 pr-12 h-14 bg-background-secondary border border-border rounded-md text-foreground placeholder-foreground-secondary/40 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                        disabled={isLoading}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="2fa-fields"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <label className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest text-center block">Xác thực 2FA</label>
                  <input 
                    type="text" 
                    required 
                    value={totpCode} 
                    onChange={(e) => setTotpCode(e.target.value)} 
                    placeholder="000000" 
                    className="w-full h-16 text-2xl font-black text-gold text-center tracking-[0.5em] focus:border-gold focus:ring-1 focus:ring-gold outline-none bg-background-secondary border border-border rounded-md transition-all"
                    disabled={isLoading}
                    autoFocus
                  />
                  <button 
                    type="button" 
                    onClick={() => setRequire2FA(false)} 
                    className="text-[10px] font-black text-foreground-secondary hover:text-foreground uppercase mx-auto block mt-4 transition-all"
                  >
                    ← Quay lại
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {message && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                {message}
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                <ShieldAlert size={16} /> {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading} 
              className="w-full h-14 bg-gold text-background rounded-xl font-black uppercase tracking-widest hover:bg-gold-light active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold/10"
            >
              {isLoading ? <Loader2 className="animate-spin mx-auto text-background" size={20} /> : (require2FA ? "Xác nhận OTP" : "Đăng nhập")}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] font-black text-foreground-secondary uppercase">
              Chưa có tài khoản? <Link href="/register" className="text-gold hover:underline ml-1 transition-all">Đăng ký ngay</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
