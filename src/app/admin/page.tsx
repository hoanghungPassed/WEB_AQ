"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Users, 
  ClipboardList, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  Target,
  AlertTriangle,
  Clock
} from "lucide-react";
import Link from "next/link";
import { MOCK_DASHBOARD_STATS, MOCK_KPI_DATA, MOCK_STAFF_ATTENDANCE } from "@/data/mockData";

export default function AdminDashboard() {
  const [kpi, setKpi] = useState(MOCK_KPI_DATA);
  const [user, setUser] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [stats, setStats] = useState(MOCK_DASHBOARD_STATS);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    // Load stats từ localStorage nếu có (do import mail cập nhật)
    const savedStats = localStorage.getItem("dashboard_stats");
    if (savedStats) setStats(JSON.parse(savedStats));
    
    // Load KPI từ localStorage nếu có
    const savedKPI = localStorage.getItem("global_kpi_data");
    if (savedKPI) setKpi(JSON.parse(savedKPI));

    // Lắng nghe thay đổi từ các tab khác
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "global_kpi_data" && e.newValue) {
        setKpi(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleSaveKPI = () => {
    localStorage.setItem("global_kpi_data", JSON.stringify(kpi));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Tìm kiếm thông tin chấm công của user hiện tại (nếu là nhân viên)
  const userAttendance = MOCK_STAFF_ATTENDANCE.find(s => s.name === user?.name);
  const showWarning = user?.role === "Nhân viên" && userAttendance && userAttendance.totalHours < 8;

  return (
    <div className="space-y-6 pb-4 relative">
      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: "-50%" }}
            animate={{ opacity: 1, y: 20, x: "-50%" }}
            exit={{ opacity: 0, y: -100, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[100] bg-sidebar border border-green-500/50 p-5 rounded-[24px] shadow-2xl flex items-center gap-4 min-w-[400px]"
          >
            <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center text-sidebar">
              <CheckCircle size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-green-500 uppercase tracking-widest">Thành công</p>
              <p className="text-base font-black text-white">Đã xác nhận và cập nhật KPI cho toàn hệ thống!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning Alert for Staff */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-500/10 border border-orange-500/50 p-4 rounded-2xl flex items-center gap-4 mb-6 shadow-2xl shadow-orange-500/10"
          >
            <div className="h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center text-sidebar flex-shrink-0 animate-pulse">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-orange-500 font-black text-lg uppercase tracking-tighter">Cảnh báo kỷ luật</h3>
              <p className="text-orange-200/80 text-sm font-medium">Bạn chưa làm đủ 8 tiếng hôm nay. Hãy làm việc nghiêm túc và đúng giờ để đảm bảo KPI!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-black text-white tracking-tighter">Bảng điều khiển</h1>
          <p className="text-lg text-gray-500 mt-1 font-medium">Chào mừng trở lại! Đây là tình hình hệ thống hôm nay.</p>
        </motion.div>
        <div className="hidden lg:flex items-center gap-3 bg-sidebar p-1.5 rounded-2xl border border-border-custom shadow-xl">
          <div className="bg-gold/10 p-2.5 rounded-xl text-gold">
            <Calendar size={20} />
          </div>
          <div className="pr-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ngày hiện tại</p>
            <p className="text-xs font-black text-white">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <Link href="/admin/mail/all" className="block">
          <StatCard 
            title="Tổng mail" 
            value={stats.totalMail} 
            icon={<Mail size={32} />} 
            color="blue"
            subtitle="Toàn hệ thống"
          />
        </Link>
        <Link href="/admin/mail/satellite" className="block">
          <StatCard 
            title="Mail Live" 
            value={stats.mailLive} 
            icon={<CheckCircle size={32} />} 
            color="green"
            subtitle="Đang hoạt động"
          />
        </Link>
        <Link href="/admin/mail/all" className="block">
          <StatCard 
            title="Mail Die" 
            value={stats.mailDie} 
            icon={<XCircle size={32} />} 
            color="red"
            subtitle="Cần kiểm tra lại"
          />
        </Link>

        {(user?.role === "ADMIN" || user?.role === "QUẢN LÝ CÔNG VIỆC") ? (
          <Link href="/admin/mail/monetized" className="block">
            <StatCard 
              title="Bật kiếm tiền" 
              value={MOCK_DASHBOARD_STATS.mailMonetized} 
              icon={<DollarSign size={32} />} 
              color="gold"
              subtitle="Đã bật quảng cáo"
            />
          </Link>
        ) : (
          <StatCard 
            title="Kênh đủ giờ" 
            value={stats.mailWatchHours} 
            icon={<Clock size={32} />} 
            color="gold"
            subtitle="Chờ bật kiếm tiền"
          />
        )}

        {user?.role !== "NHÂN VIÊN" && (
          <Link href="/admin/staff" className="block">
            <StatCard 
              title="Nhân viên Online" 
              value={stats.staffOnline} 
              icon={<Users size={32} />} 
              color="purple"
              subtitle="Đang làm việc"
            />
          </Link>
        )}
        <StatCard 
          title="Task hôm nay" 
          value={stats.tasksToday} 
          icon={<ClipboardList size={32} />} 
          color="indigo"
          subtitle="Công việc cần làm"
        />
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-2 rounded-[32px] border border-border-custom bg-sidebar p-8 shadow-2xl relative overflow-hidden group"
        >
          {/* Decorative background */}
          <div className="absolute top-0 right-0 h-48 w-48 bg-gold/5 blur-[80px] -mr-24 -mt-24 transition-all group-hover:bg-gold/10" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
                <TrendingUp size={32} className="text-gold" />
                KPI Hệ Thống
              </h2>
              <p className="text-gray-500 mt-1 font-medium text-sm">Thiết lập mục tiêu và theo dõi tiến độ công việc</p>
            </div>
            <div className={`flex items-center gap-3 bg-white/5 p-1.5 rounded-xl border border-white/5 ${ (user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC") ? "opacity-75" : ""}`}>
               <input 
                type="date" 
                value={kpi.startDate}
                disabled={user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC"}
                onChange={(e) => setKpi({...kpi, startDate: e.target.value})}
                className={`bg-transparent text-white text-xs font-bold p-1 focus:outline-none ${ (user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC") ? "cursor-default" : "cursor-pointer"}`}
               />
               <ChevronRight size={14} className="text-gray-500" />
               <input 
                type="date" 
                value={kpi.endDate}
                disabled={user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC"}
                onChange={(e) => setKpi({...kpi, endDate: e.target.value})}
                className={`bg-transparent text-white text-xs font-bold p-1 focus:outline-none ${ (user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC") ? "cursor-default" : "cursor-pointer"}`}
               />
            </div>
            
            {(user?.role === "ADMIN" || user?.role === "QUẢN LÝ CÔNG VIỆC") && (
              <button 
                onClick={handleSaveKPI}
                className="h-10 px-4 bg-gold hover:bg-gold/80 text-sidebar rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-gold/20"
              >
                <CheckCircle size={16} /> Xác nhận
              </button>
            )}
          </div>

          <div className={`grid gap-8 ${ (user?.role === "ADMIN" || user?.role === "QUẢN LÝ CÔNG VIỆC") ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
            {/* KPI Field 1 - Chỉ hiện cho 01, 02 */}
            {(user?.role === "ADMIN" || user?.role === "QUẢN LÝ CÔNG VIỆC") && (
              <KPIInputCard 
                label="Kênh bật kiếm tiền"
                target={kpi.targetMonetized}
                current={kpi.currentMonetized}
                onChange={(val: any) => setKpi({...kpi, targetMonetized: val})}
                unit="kênh"
                readonly={user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC"}
              />
            )}
            {/* KPI Field 2 - Hiện cho tất cả */}
            <div className={(user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC") ? "max-w-md mx-auto w-full" : ""}>
              <KPIInputCard 
                label="Kênh đủ giờ"
                target={kpi.targetWatchHours}
                current={kpi.currentWatchHours}
                onChange={(val: any) => setKpi({...kpi, targetWatchHours: val})}
                unit="kênh"
                readonly={user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC"}
              />
            </div>
          </div>
        </motion.div>

        {/* Shortcut Info */}
        <div className="rounded-[32px] border border-gold/20 bg-gold/5 p-8 flex flex-col justify-center text-center space-y-4">
          <div className="mx-auto h-20 w-20 bg-gold rounded-full flex items-center justify-center shadow-2xl shadow-gold/20 text-sidebar">
             <Target size={36} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Mục tiêu quý II</h3>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed line-clamp-3">
              Tập trung tối ưu hóa tỉ lệ <b>Mail Live</b> và đẩy mạnh các kênh đạt đủ 4000 giờ xem.
            </p>
          </div>
          <button className="h-12 w-full bg-white/10 hover:bg-white/20 transition-all rounded-xl font-bold text-white uppercase tracking-widest text-xs">
            Xem báo cáo chi tiết
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, subtitle }: any) {
  const colors: any = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20 group-hover:border-blue-500",
    green: "text-green-400 bg-green-500/10 border-green-500/20 group-hover:border-green-500",
    red: "text-red-400 bg-red-500/10 border-red-500/20 group-hover:border-red-500",
    gold: "text-gold bg-gold/10 border-gold/20 group-hover:border-gold",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20 group-hover:border-purple-500",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20 group-hover:border-indigo-500",
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="group rounded-[32px] border border-border-custom bg-sidebar p-6 transition-all hover:shadow-2xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-4 rounded-2xl transition-all ${colors[color]}`}>
          {icon}
        </div>
        <div className="text-right">
           <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{title}</p>
           <h3 className="text-2xl font-black text-white tracking-tighter">{value.toLocaleString()}</h3>
        </div>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-border-custom">
        <span className="text-xs font-medium text-gray-500 italic">{subtitle}</span>
        <div className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_8px_#d4af37]" />
      </div>
    </motion.div>
  );
}

function KPIInputCard({ label, target, current, onChange, unit, readonly }: any) {
  const percent = Math.min(Math.round((current / target) * 100), 100);

  return (
    <div className="flex flex-col space-y-5 h-full">
      {/* Header with min-height to allow wrapping on small screens but lock baseline on large screens */}
      <div className="min-h-[40px] lg:min-h-[32px] flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <span className="text-base font-bold text-white uppercase tracking-widest lg:whitespace-nowrap leading-tight">{label}</span>
        <span className="text-xs font-black text-gold whitespace-nowrap leading-none mb-0.5">{percent}% Hoàn thành</span>
      </div>
      
      {/* Progress Bar Container */}
      <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner flex-shrink-0">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute h-full bg-gradient-to-r from-gold/50 to-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]" 
        />
      </div>

      {/* Input/Display Section */}
      <div className="flex items-center gap-4 mt-auto">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block ml-1">Tiến độ hiện tại</label>
          <div className="h-14 w-full rounded-2xl bg-white/5 border border-white/5 flex items-center px-4 text-white font-bold text-base shadow-sm">
            {current} {unit}
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block ml-1">Mục tiêu (Admin)</label>
          {readonly ? (
            <div className="h-14 w-full rounded-2xl bg-gold/5 border border-gold/10 px-4 flex items-center text-gold/50 font-black text-base">
              {target}
            </div>
          ) : (
            <input 
              type="number"
              value={target || ""}
              onChange={(e) => {
                const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                onChange(val);
              }}
              className="h-14 w-full rounded-2xl bg-gold/10 border border-gold/30 px-4 text-gold font-black focus:outline-none focus:border-gold text-base transition-all shadow-lg shadow-gold/5"
            />
          )}
        </div>
      </div>
    </div>
  );
}
