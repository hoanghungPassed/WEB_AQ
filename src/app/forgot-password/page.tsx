"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Pass, 4: Success
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoOtp, setDemoOtp] = useState("");

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val) {
      setEmailError("Email không được để trống");
      return false;
    } else if (!emailRegex.test(val)) {
      setEmailError("Email không hợp lệ");
      return false;
    } else {
      setEmailError("");
      return true;
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    validateEmail(val);
  };

  const validatePassword = (val: string) => {
    if (val.length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return false;
    } else {
      setPasswordError("");
      return true;
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewPassword(val);
    validatePassword(val);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;
    setError("");
    setIsLoading(true);

    const generated = Math.floor(100000 + Math.random() * 900000).toString();
    setDemoOtp(generated);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: generated })
      });
      if (res.ok) {
        toast.success("Mã OTP đã được gửi đến email của bạn!");
        setStep(2);
      } else {
        const data = await res.json();
        setError(data.error || "Gửi mã OTP thất bại");
        toast.error(data.error || "Gửi mã OTP thất bại");
      }
    } catch (err) {
      setError("Không thể kết nối máy chủ");
      toast.error("Không thể kết nối máy chủ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    if (otp === demoOtp) {
      setStep(3);
    } else {
      setError("Mã OTP không chính xác");
      toast.error("Mã OTP không chính xác");
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword(newPassword)) return;
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword })
      });
      if (res.ok) {
        setStep(4); // Success
        setTimeout(() => router.push("/login"), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Đổi mật khẩu thất bại");
        toast.error(data.error || "Đổi mật khẩu thất bại");
      }
    } catch (err) {
      setError("Lỗi kết nối máy chủ");
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailValid = email && !emailError;
  const isPasswordValid = newPassword && !passwordError;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] font-sans p-4">
      {/* Background Orbs */}
      <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-gold/10 blur-[120px]" />
      <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-gold/5 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-[550px]"
      >
        <div className="rounded-[50px] border border-white/0 bg-white/5 p-12 md:p-16 backdrop-blur-3xl shadow-2xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-[40px] bg-gold/5 border border-gold/10 overflow-hidden shadow-2xl">
              <img src="/logo.png" alt="AQ MEDIA" className="h-full w-full object-contain p-2" onError={(e) => e.currentTarget.src = "https://via.placeholder.com/150/d4af37/000000?text=AQ"} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase">
              {step === 4 ? "Thành công!" : "Quên mật khẩu"}
            </h1>
            <p className="mt-3 text-sm font-bold text-gray-500 uppercase tracking-[0.2em]">
              {step === 1 && "Nhập Email để nhận mã OTP"}
              {step === 2 && `Mã OTP đã gửi tới email ${email}`}
              {step === 3 && "Thiết lập mật khẩu mới cho tài khoản"}
              {step === 4 && "Mật khẩu đã được thay đổi"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSendOTP}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <label className="text-sm font-black uppercase tracking-widest text-gray-500 ml-1">Email của bạn</label>
                  <div className="group relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={18} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={handleEmailChange}
                      placeholder="username@gmail.com"
                      style={{ paddingLeft: "3.5rem" }}
                      className="h-16 w-full rounded-2xl border border-white/0 bg-white/5 pl-14 pr-6 text-lg text-white focus:border-white/5 focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all"
                    />
                  </div>
                  {emailError && (
                    <p className="text-red-500 text-[10px] mt-1 text-left ml-2">{emailError}</p>
                  )}
                  {error && (
                    <p className="text-red-500 text-xs font-bold uppercase tracking-widest text-center">{error}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !isEmailValid}
                  className="relative h-18 w-full overflow-hidden rounded-2xl bg-gold font-black uppercase tracking-[0.2em] text-[#0a0a0a] text-lg transition-all hover:bg-gold-hover shadow-2xl disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "Gửi mã OTP"}
                </button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOTP}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <label className="text-sm font-black uppercase tracking-widest text-gray-500 ml-1">Mã xác thực OTP</label>
                  <div className="group relative">
                    <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={18} />
                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Nhập 6 số OTP"
                      style={{ paddingLeft: "3.5rem" }}
                      className="h-16 w-full rounded-2xl border border-white/0 bg-white/5 pl-14 pr-6 text-center text-2xl tracking-[0.5em] text-white focus:border-white/5 focus:outline-none transition-all"
                    />
                  </div>
                  {error && <p className="text-center text-xs font-bold text-red-500 uppercase tracking-widest">{error}</p>}
                </div>
                <button type="submit" disabled={isLoading || otp.length < 6} className="relative h-18 w-full overflow-hidden rounded-2xl bg-gold font-black uppercase tracking-[0.2em] text-[#0a0a0a] text-lg transition-all hover:bg-gold-hover shadow-2xl disabled:opacity-50">
                  {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "Xác nhận mã"}
                </button>
              </motion.form>
            )}

            {step === 3 && (
              <motion.form
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleResetPassword}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <label className="text-sm font-black uppercase tracking-widest text-gray-500 ml-1">Mật khẩu mới</label>
                  <div className="group relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={18} />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={handlePasswordChange}
                      placeholder="••••••••"
                      style={{ paddingLeft: "3.5rem" }}
                      className="h-16 w-full rounded-2xl border border-white/0 bg-white/5 pl-14 pr-6 text-lg text-white focus:border-white/5 focus:outline-none transition-all"
                    />
                  </div>
                  {passwordError && (
                    <p className="text-red-500 text-[10px] mt-1 text-left ml-2">{passwordError}</p>
                  )}
                  {error && (
                    <p className="text-red-500 text-xs font-bold uppercase tracking-widest text-center">{error}</p>
                  )}
                </div>
                <button type="submit" disabled={isLoading || !isPasswordValid} className="relative h-18 w-full overflow-hidden rounded-2xl bg-gold font-black uppercase tracking-[0.2em] text-[#0a0a0a] text-lg transition-all hover:bg-gold-hover shadow-2xl disabled:opacity-50">
                  {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "Đổi mật khẩu"}
                </button>
              </motion.form>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 space-y-6"
              >
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20 text-green-500 shadow-2xl shadow-green-500/20">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-2xl font-bold text-white">Xác nhận thành công!</h2>
                <p className="text-gray-400">Bạn sẽ được chuyển về trang đăng nhập sau vài giây.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 text-center">
            <Link href="/login" className="text-sm font-bold text-gray-500 hover:text-gold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest">
              <ArrowLeft size={16} /> Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
