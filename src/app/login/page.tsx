"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, User, Eye, EyeOff, Loader2, UserPlus, ShieldAlert, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { StaffData } from "@/types/admin";
import { MOCK_STAFF, initMockDB } from "@/data/mockData";

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
    <div className="absolute right-8 top-8 z-20 flex flex-col items-end rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md text-right font-mono text-white shadow-lg">
      <div className="text-2xl font-black tracking-widest text-gold">{timeStr}</div>
      <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mt-1">{dateStr}</div>
    </div>
  );
}

function LoginForm() {
  const syncDatabaseFromServer = async () => {
    try {
      const res = await fetch("/api/sync");
      if (res.ok) {
        const serverStore = await res.json();
        if (serverStore.global_users) {
          localStorage.setItem("global_users", serverStore.global_users);
        }
        if (serverStore.global_mails_data) {
          localStorage.setItem("global_mails_data", serverStore.global_mails_data);
        }
        if (serverStore.global_tasks_data) {
          localStorage.setItem("global_tasks_data", serverStore.global_tasks_data);
        }
        if (serverStore.global_phones_data) {
          localStorage.setItem("global_phones_data", serverStore.global_phones_data);
        }
        if (serverStore.global_import_history) {
          localStorage.setItem("global_import_history", serverStore.global_import_history);
        }
      }
    } catch (err) {
      console.error("Login page sync error:", err);
    }
  };

  useEffect(() => {
    // Thứ tự quan trọng: SYNC SERVER TRƯỚC để lấy data mới nhất, 
    // sau đó initMockDB chỉ điền những gì còn thiếu
    syncDatabaseFromServer().then(() => {
      initMockDB();
    });
  }, []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const msg = searchParams.get("message");
    if (msg === "pending") {
      setMessage("Đăng ký thành công! Vui lòng chờ Admin phê duyệt tài khoản.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    // Đồng bộ lại database trước khi kiểm tra đăng nhập để nhận trạng thái phê duyệt mới nhất từ Admin!
    await syncDatabaseFromServer();

    // Giả lập độ trễ mạng ngắn
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Lấy dữ liệu từ localStorage (đã được đồng bộ với server)
    const allUsers: StaffData[] = JSON.parse(localStorage.getItem("global_users") || "[]");

    const user = allUsers.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      if (user.status === "PENDING") {
        setError("Tài khoản của bạn đang chờ Admin cấp quyền. Vui lòng liên hệ quản trị viên.");
        setIsLoading(false);
        return;
      }

      if (user.status === "LOCKED") {
        setError("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.");
        setIsLoading(false);
        return;
      }


      // Tự động Check-in ngay khi đăng nhập thành công
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      let checkInISO = localStorage.getItem(`checkin_time_${user.username}_${dateKey}`);
      if (!checkInISO) {
        checkInISO = today.toISOString();
        localStorage.setItem(`checkin_time_${user.username}_${dateKey}`, checkInISO);
      }
      const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      // Cập nhật trạng thái isOnline trong global_users
      // Lấy data mới nhất từ server NGAY TRƯỚC KHI cập nhật để giảm thiểu tối đa lỗi Race Condition (ghi đè dữ liệu của nhân viên khác)
      await syncDatabaseFromServer();
      const freshUsers: StaffData[] = JSON.parse(localStorage.getItem("global_users") || "[]");

      const updatedUsers = freshUsers.map((u) => {
        if (u.id === user.id) {
          return { 
            ...u, 
            isOnline: true, 
            lastActive: "Vừa xong",
            checkInTime: u.checkInTime || timeStr
          };
        }
        return u;
      });
      localStorage.setItem("global_users", JSON.stringify(updatedUsers));

      // Đồng bộ trạng thái online lên server
      try {
        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            global_users: JSON.stringify(updatedUsers)
          })
        });
      } catch (err) {
        console.error("Login online status sync error:", err);
      }

      // Lưu session giả lập với isOnline = true
      const onlineUser = { ...user, isOnline: true, lastActive: "Vừa xong" };
      sessionStorage.setItem("user", JSON.stringify(onlineUser));
      localStorage.setItem("user", JSON.stringify(onlineUser));
      router.push("/admin");
    } else {
      setError("Tên đăng nhập hoặc mật khẩu không đúng!");
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
        <div className="rounded-[50px] border border-white/10 bg-white/5 p-12 md:p-16 backdrop-blur-3xl shadow-2xl">
          {/* Logo Section */}
          <div className="mb-10 text-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[32px] bg-gold/5 border border-gold/10 overflow-hidden shadow-2xl"
            >
              <img src="/logo.png" alt="AQ MEDIA" className="h-full w-full object-contain p-2" onError={(e) => e.currentTarget.src = "https://via.placeholder.com/150/d4af37/000000?text=AQ"} />
            </motion.div>
            <h1 className="text-4xl font-black tracking-tighter text-white">
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
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-widest text-center flex items-center gap-3 leading-relaxed">
              <ShieldAlert size={16} className="shrink-0" /> {error}
            </motion.div>
          )}

          {/* Form Section */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">
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
                  className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 pl-14 pr-6 text-sm text-white transition-all focus:border-gold/50 focus:outline-none focus:ring-4 focus:ring-gold/5 shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
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
                  placeholder="đủ 6 kí tự, có số và chữ và kí tự đặc biệt"
                  className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 pl-14 pr-14 text-sm text-white transition-all focus:border-gold/50 focus:outline-none focus:ring-4 focus:ring-gold/5 shadow-inner"
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

            <button
              type="submit"
              disabled={isLoading}
              className="relative h-16 w-full overflow-hidden rounded-2xl bg-gold font-black uppercase tracking-[0.2em] text-[#0a0a0a] text-sm transition-all hover:bg-gold-hover active:scale-95 disabled:opacity-70 shadow-2xl shadow-gold/20"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="animate-spin" size={20} />
                  <span>Đang xác thực...</span>
                </div>
              ) : (
                "Đăng nhập ngay"
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
            <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.3em]">
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
