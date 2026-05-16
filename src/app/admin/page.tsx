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
  Clock,
  X,
  ExternalLink,
  ClipboardCheck,
  Sweep // Giả lập icon trực nhật
} from "lucide-react";
import { 
  MOCK_DASHBOARD_STATS, 
  MOCK_KPI_DATA, 
  MOCK_STAFF_ATTENDANCE, 
  MOCK_MAILS,
  MailData 
} from "@/data/mockData";

export default function AdminDashboard() {
  const [kpi, setKpi] = useState(MOCK_KPI_DATA);
  const [user, setUser] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [stats, setStats] = useState(MOCK_DASHBOARD_STATS);
  
  // State quản lý bảng mail trên Dashboard
  const [selectedMailType, setSelectedMailType] = useState<"ALL" | "LIVE" | "DIE" | "MONETIZED" | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    const savedStats = localStorage.getItem("dashboard_stats");
    if (savedStats) setStats(JSON.parse(savedStats));
    
    const savedKPI = localStorage.getItem("global_kpi_data");
    if (savedKPI) setKpi(JSON.parse(savedKPI));

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "global_kpi_data" && e.newValue) setKpi(JSON.parse(e.newValue));
      if (e.key === "dashboard_stats" && e.newValue) setStats(JSON.parse(e.newValue));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleSaveKPI = () => {
    localStorage.setItem("global_kpi_data", JSON.stringify(kpi));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const isHR = user?.role === "QUẢN LÝ NHÂN SỰ";

  // Lọc dữ liệu mail cho bảng
  const getFilteredMails = () => {
    if (!selectedMailType) return [];
    return MOCK_MAILS.filter(m => {
      if (selectedMailType === "ALL") return true;
      if (selectedMailType === "LIVE") return m.status === "LIVE";
      if (selectedMailType === "DIE") return m.status === "DIE";
      if (selectedMailType === "MONETIZED") return m.type === "MONETIZED";
      return true;
    });
  };

  const getChannelStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    let colorClass = "bg-gray-500/10 text-gray-400 border-gray-500/20";
    
    if (["Chờ B2", "Chờ B3", "quay video"].some(word => status.includes(word))) {
      colorClass = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    } else if (["Lỗi B2", "Die Spam", "Chưa SUB", "Mất kênh"].some(word => status.includes(word))) {
      colorClass = "bg-red-500/10 text-red-500 border-red-500/20";
    } else if (["Đã bật", "Đã Kháng"].some(word => status.includes(word))) {
      colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }

    return (
      <span className={`px-2 py-1 rounded-lg text-[10px] font-black border uppercase tracking-tighter ${colorClass}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-10 relative">
      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: "-50%" }} animate={{ opacity: 1, y: 20, x: "-50%" }} exit={{ opacity: 0, y: -100, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[100] bg-sidebar border border-green-500/50 p-5 rounded-[24px] shadow-2xl flex items-center gap-4 min-w-[400px]"
          >
            <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center text-sidebar"><CheckCircle size={28} /></div>
            <div>
              <p className="text-xs font-bold text-green-500 uppercase tracking-widest">Thành công</p>
              <p className="text-base font-black text-white">Đã xác nhận và cập nhật KPI cho toàn hệ thống!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Bảng điều khiển</h1>
          <p className="text-lg text-gray-500 mt-1 font-medium italic">Chào mừng trở lại! Đây là tình hình AQ MEDIA hôm nay.</p>
        </div>
        <div className="hidden lg:flex items-center gap-3 bg-sidebar p-1.5 rounded-2xl border border-border-custom shadow-xl">
          <div className="bg-gold/10 p-2.5 rounded-xl text-gold"><Calendar size={20} /></div>
          <div className="pr-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ngày hiện tại</p>
            <p className="text-xs font-black text-white">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {isHR ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* HR Only: Staff Online Card */}
          <div className="lg:col-span-1">
            <StatCard 
              title="Nhân viên Online" 
              value={stats.staffOnline} 
              icon={<Users size={32} />} 
              color="purple"
              subtitle="Đang trong ca làm việc"
            />
          </div>
          
          {/* HR Only: Lịch trực nhật Section */}
          <div className="lg:col-span-2 rounded-[32px] border border-border-custom bg-sidebar p-8 shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 h-48 w-48 bg-purple-500/5 blur-[80px] -mr-24 -mt-24" />
            <div className="relative z-10 flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
                  <ClipboardCheck size={28} className="text-purple-400" />
                  Lịch trực nhật & Ca trực
                </h2>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Phân công vệ sinh & trực văn phòng</p>
              </div>
              <button className="h-10 px-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 text-xs font-bold uppercase tracking-widest hover:bg-purple-500/20 transition-all">
                Cập nhật lịch
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 border-b border-white/5 uppercase text-[10px] font-black tracking-widest">
                    <th className="pb-4 px-2">Thứ</th>
                    <th className="pb-4 px-2">Nhân viên</th>
                    <th className="pb-4 px-2">Khu vực</th>
                    <th className="pb-4 px-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { day: "Thứ Hai", name: "Nguyễn Văn A", area: "Khu vực làm việc 1", status: "Hoàn thành" },
                    { day: "Thứ Ba", name: "Trần Thị B", area: "Khu vực Pantry", status: "Chờ thực hiện" },
                    { day: "Thứ Tư", name: "Lê Văn C", area: "Phòng họp lớn", status: "Chờ thực hiện" },
                  ].map((row, i) => (
                    <tr key={i} className="group hover:bg-white/[0.02]">
                      <td className="py-4 px-2 text-sm font-bold text-white">{row.day}</td>
                      <td className="py-4 px-2 text-sm font-medium text-gray-400">{row.name}</td>
                      <td className="py-4 px-2 text-sm text-gray-500">{row.area}</td>
                      <td className="py-4 px-2">
                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${row.status === "Hoàn thành" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* General View: Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Tổng mail" 
              value={stats.totalMail} 
              icon={<Mail size={32} />} 
              color="blue"
              subtitle="Toàn hệ thống"
              onClick={() => setSelectedMailType("ALL")}
            />
            <StatCard 
              title="Mail Live" 
              value={stats.mailLive} 
              icon={<CheckCircle size={32} />} 
              color="green"
              subtitle="Đang hoạt động"
              onClick={() => setSelectedMailType("LIVE")}
            />
            <StatCard 
              title="Mail Die" 
              value={stats.mailDie} 
              icon={<XCircle size={32} />} 
              color="red"
              subtitle="Cần kiểm tra lại"
              onClick={() => setSelectedMailType("DIE")}
            />
            <StatCard 
              title="Bật kiếm tiền" 
              value={stats.mailMonetized} 
              icon={<DollarSign size={32} />} 
              color="gold"
              subtitle="Đã bật quảng cáo"
              onClick={() => setSelectedMailType("MONETIZED")}
            />
          </div>

          {/* General View: Tasks & Online Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {user?.role !== "NHÂN VIÊN" && (
              <StatCard 
                title="Nhân viên Online" 
                value={stats.staffOnline} 
                icon={<Users size={32} />} 
                color="purple"
                subtitle="Đang làm việc"
              />
            )}
            <StatCard 
              title="Task hôm nay" 
              value={stats.tasksToday} 
              icon={<ClipboardList size={32} />} 
              color="indigo"
              subtitle="Công việc cần làm"
            />
            {user?.role !== "NHÂN VIÊN" && (
               <div className="rounded-[32px] border border-gold/20 bg-gold/5 p-6 flex flex-col justify-center text-center space-y-3">
                  <div className="mx-auto h-14 w-14 bg-gold rounded-full flex items-center justify-center shadow-xl shadow-gold/20 text-sidebar">
                    <Target size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tighter uppercase">Mục tiêu quý II</h3>
                    <p className="text-gray-400 text-[11px] font-medium leading-relaxed mt-1">Đẩy mạnh tỉ lệ Mail Live & Kênh đủ giờ.</p>
                  </div>
               </div>
            )}
          </div>

          {/* KPI Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-[32px] border border-border-custom bg-sidebar p-8 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 h-48 w-48 bg-gold/5 blur-[80px] -mr-24 -mt-24 transition-all group-hover:bg-gold/10" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
                  <TrendingUp size={32} className="text-gold" />
                  KPI Hệ Thống
                </h2>
                <p className="text-gray-500 mt-1 font-bold text-xs uppercase tracking-widest">Thiết lập & Theo dõi mục tiêu</p>
              </div>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-3 bg-white/5 p-1.5 rounded-xl border border-white/5 ${ (user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC") ? "opacity-75" : ""}`}>
                  <input type="date" value={kpi.startDate} disabled={user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC"} onChange={(e) => setKpi({...kpi, startDate: e.target.value})} className="bg-transparent text-white text-xs font-bold p-1 focus:outline-none cursor-pointer" />
                  <ChevronRight size={14} className="text-gray-500" />
                  <input type="date" value={kpi.endDate} disabled={user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC"} onChange={(e) => setKpi({...kpi, endDate: e.target.value})} className="bg-transparent text-white text-xs font-bold p-1 focus:outline-none cursor-pointer" />
                </div>
                {(user?.role === "ADMIN" || user?.role === "QUẢN LÝ CÔNG VIỆC") && (
                  <button onClick={handleSaveKPI} className="h-10 px-5 bg-gold hover:bg-gold/80 text-sidebar rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-gold/20">
                    <CheckCircle size={16} /> Xác nhận
                  </button>
                )}
              </div>
            </div>

            <div className={`grid gap-12 ${ (user?.role === "ADMIN" || user?.role === "QUẢN LÝ CÔNG VIỆC") ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
              {(user?.role === "ADMIN" || user?.role === "QUẢN LÝ CÔNG VIỆC") && (
                <KPIInputCard label="Kênh bật kiếm tiền" target={kpi.targetMonetized} current={kpi.currentMonetized} onChange={(val: any) => setKpi({...kpi, targetMonetized: val})} unit="kênh" readonly={false} />
              )}
              <div className={(user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC") ? "max-w-xl mx-auto w-full" : ""}>
                <KPIInputCard label="Kênh đủ giờ" target={kpi.targetWatchHours} current={kpi.currentWatchHours} onChange={(val: any) => setKpi({...kpi, targetWatchHours: val})} unit="kênh" readonly={user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC"} />
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Dynamic Data Table (Render at bottom) */}
      <AnimatePresence>
        {selectedMailType && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="rounded-[32px] border border-border-custom bg-sidebar shadow-2xl overflow-hidden mt-10"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gold/10 rounded-xl flex items-center justify-center text-gold"><Mail size={20} /></div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Chi tiết {selectedMailType} Mail</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Hiển thị {getFilteredMails().length} bản ghi</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMailType(null)}
                className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[500px] overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Email</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Mail Khôi phục</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Pass</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">2FA</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">SĐT</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Link (OTP)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Người phụ trách</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Trạng thái kênh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {getFilteredMails().map((mail, i) => (
                    <tr key={mail.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-sm font-bold text-white group-hover:text-gold transition-colors">{mail.email}</td>
                      <td className="px-6 py-4 text-xs text-gray-400">{mail.recovery}</td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">{mail.pass}</td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">{mail.twoFA || "---"}</td>
                      <td className="px-6 py-4 text-xs text-gray-400">{mail.phone || "---"}</td>
                      <td className="px-6 py-4">
                        <a href={mail.otpLink} target="_blank" className="text-gold hover:text-white transition-colors"><ExternalLink size={16} /></a>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gold/10 text-gold flex items-center justify-center text-[10px] font-black">
                            {mail.assignedTo?.charAt(0) || "U"}
                          </div>
                          <span className="text-xs font-bold text-gray-300">{mail.assignedTo || "Chưa giao"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getChannelStatusBadge(mail.channelStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon, color, subtitle, onClick }: any) {
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
      onClick={onClick}
      className={`group rounded-[32px] border border-border-custom bg-sidebar p-6 transition-all hover:shadow-2xl ${onClick ? "cursor-pointer" : ""}`}
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
      <div className="min-h-[40px] lg:min-h-[32px] flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <span className="text-base font-bold text-white uppercase tracking-widest lg:whitespace-nowrap leading-tight">{label}</span>
        <span className="text-xs font-black text-gold whitespace-nowrap leading-none mb-0.5">{percent}% Hoàn thành</span>
      </div>
      <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner flex-shrink-0">
        <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 1, ease: "easeOut" }} className="absolute h-full bg-gradient-to-r from-gold/50 to-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
      </div>
      <div className="flex items-center gap-4 mt-auto">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block ml-1">Tiến độ hiện tại</label>
          <div className="h-14 w-full rounded-2xl bg-white/5 border border-white/5 flex items-center px-4 text-white font-bold text-base shadow-sm">{current} {unit}</div>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block ml-1">Mục tiêu (Admin)</label>
          {readonly ? (
            <div className="h-14 w-full rounded-2xl bg-gold/5 border border-gold/10 px-4 flex items-center text-gold/50 font-black text-base">{target}</div>
          ) : (
            <input type="number" value={target || ""} onChange={(e) => { const val = e.target.value === "" ? 0 : parseInt(e.target.value); onChange(val); }} className="h-14 w-full rounded-2xl bg-gold/10 border border-gold/30 px-4 text-gold font-black focus:outline-none focus:border-gold text-base transition-all shadow-lg shadow-gold/5" />
          )}
        </div>
      </div>
    </div>
  );
}
