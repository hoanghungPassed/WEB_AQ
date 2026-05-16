"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, User, Mail, Loader2, ArrowLeft, Phone } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    role: "NHÂN VIÊN"
  });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Giả lập lưu dữ liệu vào localStorage (Thêm vào danh sách users)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const existingUsers = JSON.parse(localStorage.getItem("all_users") || "[]");
    existingUsers.push(formData);
    localStorage.setItem("all_users", JSON.stringify(existingUsers));

    setSuccess(true);
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] font-sans p-4">
      {/* Background Orbs */}
      <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-gold/10 blur-[120px]" />
      <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-gold/5 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="z-10 w-full max-w-2xl"
      >
        <div className="rounded-[50px] border border-white/10 bg-white/5 p-10 md:p-16 backdrop-blur-3xl shadow-2xl">
          {/* Logo Section */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-[40px] bg-gold/5 border border-gold/10 overflow-hidden shadow-2xl">
              <img src="/logo.png" alt="AQ MEDIA" className="h-full w-full object-contain p-2" onError={(e) => e.currentTarget.src = "https://via.placeholder.com/150/d4af37/000000?text=AQ"} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase">
              Đăng ký tài khoản
            </h1>
            <p className="mt-3 text-sm font-medium text-gray-500 uppercase tracking-[0.3em]">
              Gia nhập đội ngũ AQ MEDIA
            </p>
          </div>

          {success ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-10 space-y-4"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                <User size={40} />
              </div>
              <h2 className="text-xl font-bold text-white">Đăng ký thành công!</h2>
              <p className="text-gray-400">Đang chuyển hướng về trang đăng nhập...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4 md:col-span-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Họ và tên</label>
                <div className="group relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={24} />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Nguyễn Văn A"
                    className="h-16 w-full rounded-2xl border border-white/5 bg-white/5 pl-14 pr-6 text-lg text-white focus:border-gold/50 focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Số điện thoại</label>
                <div className="group relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={24} />
                  <input
                    type="tel"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    placeholder="09xx xxx xxx"
                    className="h-16 w-full rounded-2xl border border-white/5 bg-white/5 pl-14 pr-6 text-lg text-white focus:border-gold/50 focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Mật khẩu</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="h-16 w-full rounded-2xl border border-white/5 bg-white/5 px-6 text-lg text-white focus:border-gold/50 focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all"
                />
              </div>

              <div className="space-y-4 md:col-span-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Email công ty</label>
                <div className="group relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={24} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="example@aqmedia.vn"
                    className="h-16 w-full rounded-2xl border border-white/5 bg-white/5 pl-14 pr-6 text-lg text-white focus:border-gold/50 focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="md:col-span-2 mt-4 relative h-18 w-full overflow-hidden rounded-2xl bg-gold font-black uppercase tracking-[0.2em] text-[#0a0a0a] text-lg transition-all hover:bg-gold-hover active:scale-95 disabled:opacity-70 shadow-2xl shadow-gold/20"
              >
                {isLoading ? <Loader2 className="animate-spin mx-auto" size={24} /> : "Tạo tài khoản ngay"}
              </button>

              <div className="md:col-span-2 text-center pt-4">
                <Link href="/login" className="text-sm font-bold text-gray-500 hover:text-gold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest">
                  <ArrowLeft size={16} /> Quay lại đăng nhập
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
