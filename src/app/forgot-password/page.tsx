"use client";

import React, { useState } from"react";
import { useRouter } from"next/navigation";
import { motion, AnimatePresence } from"framer-motion";
import { Phone, Lock, ArrowLeft, Loader2, CheckCircle2, ShieldCheck } from"lucide-react";
import Link from"next/link";

export default function ForgotPasswordPage() {
 const router = useRouter();
 const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: New Pass
 const [phone, setPhone] = useState("");
 const [otp, setOtp] = useState("");
 const [newPassword, setNewPassword] = useState("");
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState("");

 const handleSendOTP = async (e: React.FormEvent) => {
 e.preventDefault();
 setError("");
 setIsLoading(true);
 // Giả lập gửi OTP
 await new Promise(resolve => setTimeout(resolve, 1500));
 setStep(2);
 setIsLoading(false);
 };

 const handleVerifyOTP = async (e: React.FormEvent) => {
 e.preventDefault();
 setError("");
 setIsLoading(true);
 // Mã mặc định giả lập
 await new Promise(resolve => setTimeout(resolve, 1000));
 if (otp ==="123456") {
 setStep(3);
 } else {
 setError(`Mã OTP không đúng. Thử lại với 123456`);
 }
 setIsLoading(false);
 };

 const handleResetPassword = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsLoading(true);
 await new Promise(resolve => setTimeout(resolve, 1500));
 // Cập nhật mật khẩu trong localStorage (giả lập)
 const users = JSON.parse(localStorage.getItem("all_users") ||"[]");
 const userIdx = users.findIndex((u: any) => u.username === phone);
 if (userIdx !== -1) {
 users[userIdx].password = newPassword;
 localStorage.setItem("all_users", JSON.stringify(users));
 }
 setStep(4); // Success
 setIsLoading(false);
 setTimeout(() => router.push("/login"), 3000);
 };

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
 <div className="rounded-[50px] border border-white/10 bg-white/5 p-12 md:p-16 backdrop-blur-3xl shadow-2xl">
 {/* Header */}
 <div className="mb-10 text-center">
 <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-[40px] bg-gold/5 border border-gold/10 overflow-hidden shadow-2xl">
 <img src="/logo.png" alt="AQ MEDIA" className="h-full w-full object-contain p-2" onError={(e) => e.currentTarget.src ="https://via.placeholder.com/150/d4af37/000000?text=AQ"} />
 </div>
 <h1 className="text-3xl font-black tracking-tighter text-white uppercase">
 {step === 4 ?"Thành công!" :"Quên mật khẩu"}
 </h1>
 <p className="mt-3 text-sm font-bold text-gray-500 uppercase tracking-[0.2em]">
 {step === 1 &&"Nhập số điện thoại để nhận mã OTP"}
 {step === 2 && `Mã OTP đã gửi tới ${phone}`}
 {step === 3 &&"Thiết lập mật khẩu mới cho tài khoản"}
 {step === 4 &&"Mật khẩu đã được thay đổi"}
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
 <label className="text-sm font-black uppercase tracking-widest text-gray-500 ml-1">Số điện thoại</label>
 <div className="group relative">
 <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={24} />
 <input
 type="tel"
 required
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 placeholder="09xx xxx xxx"
 className="h-16 w-full rounded-2xl border border-white/10 bg-white/5 pl-14 pr-6 text-lg text-white focus:border-gold/50 focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all"
 />
 </div>
 </div>
 <button type="submit" disabled={isLoading} className="relative h-18 w-full overflow-hidden rounded-2xl bg-gold font-black uppercase tracking-[0.2em] text-[#0a0a0a] text-lg transition-all hover:bg-gold-hover shadow-2xl">
 {isLoading ? <Loader2 className="animate-spin mx-auto" /> :"Gửi mã OTP"}
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
 <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={24} />
 <input
 type="text"
 required
 value={otp}
 onChange={(e) => setOtp(e.target.value)}
 placeholder="Thử 123456"
 className="h-16 w-full rounded-2xl border border-white/10 bg-white/5 pl-14 pr-6 text-center text-2xl tracking-[0.5em] text-white focus:border-gold/50 focus:outline-none transition-all"
 />
 </div>
 {error && <p className="text-center text-xs font-bold text-red-500 uppercase tracking-widest">{error}</p>}
 </div>
 <button type="submit" disabled={isLoading} className="relative h-18 w-full overflow-hidden rounded-2xl bg-gold font-black uppercase tracking-[0.2em] text-[#0a0a0a] text-lg transition-all hover:bg-gold-hover shadow-2xl">
 {isLoading ? <Loader2 className="animate-spin mx-auto" /> :"Xác nhận mã"}
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
 <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={24} />
 <input
 type="password"
 required
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 placeholder="••••••••"
 className="h-16 w-full rounded-2xl border border-white/10 bg-white/5 pl-14 pr-6 text-lg text-white focus:border-gold/50 focus:outline-none transition-all"
 />
 </div>
 </div>
 <button type="submit" disabled={isLoading} className="relative h-18 w-full overflow-hidden rounded-2xl bg-gold font-black uppercase tracking-[0.2em] text-[#0a0a0a] text-lg transition-all hover:bg-gold-hover shadow-2xl">
 {isLoading ? <Loader2 className="animate-spin mx-auto" /> :"Đổi mật khẩu"}
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
