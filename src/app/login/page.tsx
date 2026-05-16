"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, User, Eye, EyeOff, Loader2, UserPlus, Phone } from "lucide-react";
import Link from "next/link";
import { MOCK_USERS } from "@/data/mockData";


export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Giả lập độ trễ mạng
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const existingUsers = JSON.parse(localStorage.getItem("all_users") || "[]");
    const allUsers = [...MOCK_USERS, ...existingUsers];

    const user = allUsers.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      // Lưu session giả lập
      localStorage.setItem("user", JSON.stringify(user));
      router.push("/admin");
    } else {
      setError("Tên đăng nhập hoặc mật khẩu không đúng!");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] font-sans">
      {/* Background Orbs */}
      <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-gold/10 blur-[120px]" />
      <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-gold/5 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-[550px] p-6"
      >
        <div className="rounded-[50px] border border-white/10 bg-white/5 p-12 md:p-16 backdrop-blur-3xl shadow-2xl">
          {/* Logo Section */}
          <div className="mb-10 text-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-[40px] bg-gold/5 border border-gold/10 overflow-hidden shadow-2xl"
            >
              <img src="/logo.png" alt="AQ MEDIA" className="h-full w-full object-contain p-2" onError={(e) => e.currentTarget.src = "https://via.placeholder.com/150/d4af37/000000?text=AQ"} />
            </motion.div>
            <h1 className="text-4xl font-black tracking-tighter text-white">
              AQ <span className="text-gold uppercase">Media</span>
            </h1>
            <p className="mt-3 text-base font-bold text-gray-500 uppercase tracking-[0.3em]">
              Hệ thống quản lý nội bộ
            </p>
          </div>

          {/* Form Section */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-black uppercase tracking-widest text-gray-500 ml-1">
                Số điện thoại
              </label>
              <div className="group relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors">
                  <Phone size={24} />
                </div>
                <input
                  type="tel"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="09xx xxx xxx"
                  className="h-16 w-full rounded-2xl border border-white/10 bg-white/5 pl-14 pr-6 text-lg text-white transition-all focus:border-gold/50 focus:outline-none focus:ring-4 focus:ring-gold/5"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-black uppercase tracking-widest text-gray-500">
                  Mật khẩu
                </label>
                <Link href="/forgot-password" className="text-xs font-bold text-gold hover:underline uppercase tracking-tighter">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="group relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors">
                  <Lock size={24} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-16 w-full rounded-2xl border border-white/10 bg-white/5 pl-14 pr-14 text-lg text-white transition-all focus:border-gold/50 focus:outline-none focus:ring-4 focus:ring-gold/5"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-[10px] font-bold uppercase tracking-wider text-red-500"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="relative h-18 w-full overflow-hidden rounded-2xl bg-gold font-black uppercase tracking-[0.2em] text-[#0a0a0a] text-lg transition-all hover:bg-gold-hover active:scale-95 disabled:opacity-70 shadow-2xl shadow-gold/20"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="animate-spin" size={24} />
                  <span>Đang kiểm tra...</span>
                </div>
              ) : (
                "Đăng nhập ngay"
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500 font-bold">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="text-gold hover:underline transition-all inline-flex items-center gap-2">
                Đăng ký ngay <UserPlus size={16} />
              </Link>
            </p>
          </div>

          {/* Footer Info */}
          <div className="mt-10 text-center">
            <p className="text-[10px] font-medium text-gray-600 uppercase tracking-tighter">
              Bản quyền thuộc về AQ MEDIA &copy; 2026
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
