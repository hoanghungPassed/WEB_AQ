"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  ChevronLeft,
  Target,
  AlertTriangle,
  Clock,
  X,
  ExternalLink,
  Search,
  Filter,
  ArrowLeft,
  ClipboardCheck
} from "lucide-react";
import { MOCK_DASHBOARD_STATS, MOCK_KPI_DATA, MOCK_STAFF_ATTENDANCE, MOCK_MAILS, MailData } from "@/data/mockData";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [kpi, setKpi] = useState(MOCK_KPI_DATA);
  const [user, setUser] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [stats, setStats] = useState(MOCK_DASHBOARD_STATS);
  
  // States quản lý bảng tập trung (Dành cho các view xem nhanh tại Dashboard)
  const [selectedViewType, setSelectedViewType] = useState<"LIVE" | "DIE" | "STAFF" | "TASKS" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    const savedKPI = localStorage.getItem("global_kpi_data");
    if (savedKPI) setKpi(JSON.parse(savedKPI));

    // Tính toán stats từ danh sách mail thực tế (Đảm bảo con số luôn chính xác)
    const refreshStats = () => {
      const savedMails = localStorage.getItem("global_mails_data");
      const currentMails = savedMails ? JSON.parse(savedMails) : MOCK_MAILS;
      
      setStats(prev => ({
        ...prev,
        totalMail: currentMails.length,
        mailLive: currentMails.filter((m: any) => m.status === "LIVE").length,
        mailDie: currentMails.filter((m: any) => m.status === "DIE").length,
        mailMonetized: currentMails.filter((m: any) => m.type === "MONETIZED").length,
      }));
    };

    refreshStats();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "global_kpi_data" && e.newValue) {
        setKpi(JSON.parse(e.newValue));
      }
      if (e.key === "global_mails_data" && e.newValue) {
        refreshStats();
      }
      if (e.key === "dashboard_stats" && e.newValue) {
        setStats(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Reset trang khi đổi loại view
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery("");
    setFilterStatus("all");
  }, [selectedViewType]);

  const handleSaveKPI = () => {
    localStorage.setItem("global_kpi_data", JSON.stringify(kpi));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const isHRManager = user?.role === "QUẢN LÝ NHÂN SỰ" || user?.role === "03";

  // Lọc dữ liệu mail tổng hợp cho các view xem nhanh (Live/Die)
  const filteredMails = useMemo(() => {
    if (!selectedViewType || selectedViewType === "STAFF") return [];
    
    return MOCK_MAILS.filter(m => {
      let matchesType = true;
      if (selectedViewType === "LIVE") matchesType = m.status === "LIVE";
      else if (selectedViewType === "DIE") matchesType = m.status === "DIE";
      else if (selectedViewType === "TASKS") matchesType = m.workStatus === "ĐANG LÀM" || m.workStatus === "CHƯA LÀM";

      const matchesSearch = m.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           m.recovery.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterStatus === "all" || (m.channelStatus && m.channelStatus.includes(filterStatus));

      return matchesType && matchesSearch && matchesStatus;
    });
  }, [selectedViewType, searchQuery, filterStatus]);

  const getChannelStatusColor = (status: string) => {
    if (!status) return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    const lower = status.toLowerCase();
    if (lower.includes("chờ b2") || lower.includes("chờ b3") || lower.includes("quay video")) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    if (lower.includes("lỗi b2") || lower.includes("die spam") || lower.includes("chưa sub") || lower.includes("mất kênh")) return "bg-red-500/10 text-red-500 border-red-500/30";
    if (lower.includes("đã bật") || lower.includes("đã kháng")) return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  };

  // MÀN HÌNH CHI TIẾT TẬP TRUNG (Dành cho các view xem nhanh tại Dashboard)
  if (selectedViewType) {
    return (
      <div className="h-full flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSelectedViewType(null)}
              className="flex items-center gap-2 text-gold hover:text-white font-black uppercase text-xs tracking-widest transition-all group"
            >
              <div className="h-10 w-10 bg-gold/10 rounded-xl flex items-center justify-center group-hover:bg-gold/20 transition-all shadow-lg">
                <ArrowLeft size={20} />
              </div>
              Quay lại bảng điều khiển
            </button>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              {selectedViewType === "STAFF" ? <Users className="text-gold" size={28} /> : <Mail className="text-gold" size={28} />}
              {selectedViewType === "STAFF" ? "Danh sách Nhân viên" : selectedViewType === "TASKS" ? "Task Công việc" : `Danh sách ${selectedViewType} Mail`}
            </h2>
          </div>
        </div>

        <div className="bg-sidebar border border-border-custom rounded-[32px] overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter hidden md:block">Dữ liệu chi tiết</h3>
              <div className="h-8 w-px bg-white/10 hidden md:block" />
              <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-3 h-10 w-full md:w-64 focus-within:border-gold/50 transition-all">
                <Search size={16} className="text-gray-500" />
                <input 
                  placeholder={selectedViewType === "STAFF" ? "Tìm tên nhân viên..." : "Tìm kiếm Email..."}
                  className="bg-transparent border-none outline-none text-xs text-white w-full" 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <button onClick={() => setSelectedViewType(null)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-500 hover:bg-red-500/20 hover:text-red-500 transition-all shadow-inner"><X size={20} /></button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            {selectedViewType === "STAFF" ? (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5">
                  <tr>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">STT</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Tên nhân viên</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Vai trò</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {MOCK_STAFF_ATTENDANCE.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((staff, index) => (
                    <tr key={staff.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-6 text-[10px] font-black text-gray-500">{index + 1}</td>
                      <td className="py-4 px-6 text-sm font-bold text-white">{staff.name}</td>
                      <td className="py-4 px-6 text-xs text-gray-400 uppercase font-black">{staff.role}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${staff.status === 'ONLINE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                          {staff.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5">
                  <tr>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">STT</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Email</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Mail KP</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {filteredMails.slice(0, 10).map((mail, index) => (
                    <tr key={mail.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-6 text-[10px] font-black text-gray-500">{index + 1}</td>
                      <td className="py-4 px-6 text-sm font-bold text-white">{mail.email}</td>
                      <td className="py-4 px-6 text-xs text-gray-400">{mail.recovery}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${mail.channelStatus ? getChannelStatusColor(mail.channelStatus) : (mail.status === 'LIVE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20')}`}>
                          {mail.channelStatus || mail.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MÀN HÌNH CHÍNH (DASHBOARD)
  return (
    <div className="space-y-6 pb-10 relative">
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

      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Bảng điều khiển</h1>
          <p className="text-lg text-gray-500 mt-1 font-medium italic">Chào mừng trở lại! Đây là tình hình AQ MEDIA hôm nay.</p>
        </motion.div>
        <div className="hidden lg:flex items-center gap-3 bg-sidebar p-1.5 rounded-2xl border border-border-custom shadow-xl">
          <div className="bg-gold/10 p-2.5 rounded-xl text-gold"><Calendar size={20} /></div>
          <div className="pr-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ngày hiện tại</p>
            <p className="text-xs font-black text-white">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {isHRManager ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <StatCard title="Nhân viên Online" value={stats.staffOnline} icon={<Users size={32} />} color="purple" subtitle="Đang làm việc" onClick={() => setSelectedViewType("STAFF")} />
          </div>
          <div className="lg:col-span-2 rounded-[32px] border border-border-custom bg-sidebar p-8 shadow-2xl overflow-hidden relative group min-h-[350px]">
            <div className="absolute top-0 right-0 h-48 w-48 bg-purple-500/5 blur-[80px] -mr-24 -mt-24 transition-all group-hover:bg-purple-500/10" />
            <div className="relative z-10 flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
                  <ClipboardCheck size={28} className="text-purple-400" />
                  Lịch trực nhật & Ca trực
                </h2>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Phân công vệ sinh & trực văn phòng</p>
              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <StatCard title="Tổng mail" value={stats.totalMail} icon={<Mail size={32} />} color="blue" subtitle="Toàn hệ thống" onClick={() => router.push("/admin/mail/all")} />
            <StatCard title="Mail Live" value={stats.mailLive} icon={<CheckCircle size={32} />} color="green" subtitle="Đang hoạt động" onClick={() => setSelectedViewType("LIVE")} />
            <StatCard title="Mail Die" value={stats.mailDie} icon={<XCircle size={32} />} color="red" subtitle="Cần kiểm tra lại" onClick={() => setSelectedViewType("DIE")} />
            {(user?.role === "ADMIN" || user?.role === "QUẢN LÝ CÔNG VIỆC") ? (
              <StatCard title="Bật kiếm tiền" value={stats.mailMonetized} icon={<DollarSign size={32} />} color="gold" subtitle="Đã bật quảng cáo" onClick={() => router.push("/admin/mail/monetized")} />
            ) : (
              <StatCard title="Kênh đủ giờ" value={stats.mailWatchHours} icon={<Clock size={32} />} color="gold" subtitle="Chờ bật kiếm tiền" />
            )}
            <StatCard title="Task hôm nay" value={stats.tasksToday} icon={<ClipboardList size={32} />} color="indigo" subtitle="Công việc cần làm" onClick={() => setSelectedViewType("TASKS")} />
            {user?.role !== "NHÂN VIÊN" && (
              <StatCard title="Nhân viên Online" value={stats.staffOnline} icon={<Users size={32} />} color="purple" subtitle="Đang làm việc" onClick={() => setSelectedViewType("STAFF")} />
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <motion.div className="xl:col-span-2 rounded-[32px] border border-border-custom bg-sidebar p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-48 w-48 bg-gold/5 blur-[80px] -mr-24 -mt-24 transition-all group-hover:bg-gold/10" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div><h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter uppercase"><TrendingUp size={32} className="text-gold" /> KPI Hệ Thống</h2><p className="text-gray-500 mt-1 font-medium text-sm">Thiết lập mục tiêu và theo dõi tiến độ công việc</p></div>
                <div className={`flex items-center gap-4`}>
                  <div className={`flex items-center gap-3 bg-white/5 p-1.5 rounded-xl border border-white/5 ${(user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC") ? "opacity-75" : ""}`}>
                    <input type="date" value={kpi.startDate} disabled={user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC"} onChange={(e) => setKpi({ ...kpi, startDate: e.target.value })} className="bg-transparent text-white text-xs font-bold p-1 outline-none" />
                    <ChevronRight size={14} className="text-gray-500" />
                    <input type="date" value={kpi.endDate} disabled={user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC"} onChange={(e) => setKpi({ ...kpi, endDate: e.target.value })} className="bg-transparent text-white text-xs font-bold p-1 outline-none" />
                  </div>
                  {(user?.role === "ADMIN" || user?.role === "QUẢN LÝ CÔNG VIỆC") && (
                    <button onClick={handleSaveKPI} className="h-10 px-4 bg-gold hover:bg-gold/80 text-sidebar rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-gold/20 flex items-center gap-2"><CheckCircle size={16} /> Xác nhận</button>
                  )}
                </div>
              </div>
              <div className={`grid gap-8 ${(user?.role === "ADMIN" || user?.role === "QUẢN LÝ CÔNG VIỆC") ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
                {(user?.role === "ADMIN" || user?.role === "QUẢN LÝ CÔNG VIỆC") && (
                  <KPIInputCard label="Kênh bật kiếm tiền" target={kpi.targetMonetized} current={kpi.currentMonetized} onChange={(val: any) => setKpi({ ...kpi, targetMonetized: val })} unit="kênh" readonly={false} />
                )}
                <div className={(user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC") ? "max-w-md mx-auto w-full" : ""}>
                  <KPIInputCard label="Kênh đủ giờ" target={kpi.targetWatchHours} current={kpi.currentWatchHours} onChange={(val: any) => setKpi({ ...kpi, targetWatchHours: val })} unit="kênh" readonly={user?.role !== "ADMIN" && user?.role !== "QUẢN LÝ CÔNG VIỆC"} />
                </div>
              </div>
            </motion.div>
            <div className="rounded-[32px] border border-gold/20 bg-gold/5 p-8 flex flex-col justify-center text-center space-y-4">
              <div className="mx-auto h-20 w-20 bg-gold rounded-full flex items-center justify-center shadow-2xl shadow-gold/20 text-sidebar"><Target size={36} /></div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Mục tiêu quý II</h3>
              <p className="text-gray-400 mt-2 text-sm leading-relaxed">Tập trung tối ưu hóa tỉ lệ <b>Mail Live</b> và đẩy mạnh các kênh đạt đủ 4000 giờ xem.</p>
              <button className="h-12 w-full bg-white/10 hover:bg-white/20 transition-all rounded-xl font-bold text-white uppercase tracking-widest text-xs">Xem báo cáo chi tiết</button>
            </div>
          </div>
        </>
      )}
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
      className={`group rounded-[32px] border border-border-custom bg-sidebar p-6 transition-all hover:shadow-2xl ${onClick ? 'cursor-pointer hover:bg-white/5' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-4 rounded-2xl transition-all ${colors[color]}`}>{icon}</div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-2xl font-black text-white tracking-tighter">{value?.toLocaleString() || 0}</h3>
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
  const percent = Math.min(Math.round((current / (target || 1)) * 100) || 0, 100);
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
