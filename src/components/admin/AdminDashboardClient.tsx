"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
 Mail, DollarSign, Users, ClipboardList, TrendingUp, Calendar, ChevronRight, ChevronLeft, Target, AlertTriangle, Clock, X, ExternalLink, Search, Filter, ArrowLeft, ClipboardCheck, Activity, Database, Zap, CheckCircle2, XCircle, Play, ShieldAlert, Check, MessageSquare, Send, LogOut, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import MailDetailModal from "@/components/admin/MailDetailModal";
import TOTPDisplay from "@/components/admin/TOTPDisplay";
import { LoadingOverlay } from "@/components/ui/Loading";
import { Badge } from "@/components/ui/Badge";

// --- Sub-components ---

function StatCard({ title, value, icon, color, subtitle, onClick }: any) {
  const colorMap: any = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    gold: "text-gold bg-gold/10 border-gold/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  };

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.01 }} 
      onClick={onClick} 
      className={`card-style group cursor-pointer flex flex-col justify-between ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className={`h-14 w-14 rounded-2xl border flex items-center justify-center transition-all duration-300 ${colorMap[color] || colorMap.gold}`}>
          {icon}
        </div>
        <div className="text-right min-w-0 flex-1 ml-4">
          <p className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest mb-1 truncate">{title}</p>
          <h3 className="text-3xl font-black text-white tracking-tighter truncate">
            {typeof value === "number" ? value.toLocaleString() : value}
          </h3>
        </div>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider">{subtitle}</span>
        <div className="h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_rgba(251,191,36,0.4)] animate-pulse" />
      </div>
    </motion.div>
  );
}

function KPIInputCard({ label, target, current, onChange, unit, readonly }: any) {
  const percent = Math.min(Math.round((current / (target || 1)) * 100) || 0, 100);
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-end justify-between">
        <span className="text-sm font-black text-white uppercase tracking-widest">{label}</span>
        <span className="text-sm font-black text-gold tracking-widest">{percent}%</span>
      </div>
      <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-border">
        <motion.div 
          initial={{ width: 0 }} 
          animate={{ width: `${percent}%` }} 
          transition={{ duration: 1, ease: "circOut" }} 
          className="absolute h-full bg-gold shadow-[0_0_15px_rgba(251,191,36,0.3)]" 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-foreground-secondary uppercase tracking-widest">Đã đạt</label>
          <div className="h-12 w-full rounded-xl bg-white/5 border border-border flex items-center px-4 text-white font-black text-sm">{current.toLocaleString()} {unit}</div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-foreground-secondary uppercase tracking-widest">Mục tiêu</label>
          <input 
            type="number" 
            value={target || ""} 
            readOnly={readonly}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)} 
            className="h-12 w-full rounded-xl bg-gold/5 border border-gold/20 px-4 text-gold font-black focus:border-gold outline-none transition-all" 
          />
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function AdminDashboardClient({ user: initialUser }: { user: any }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(initialUser);
  const [stats, setStats] = useState<any>({});
  const [kpi, setKpi] = useState<any>({});
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [mails, setMails] = useState<any[]>([]);
  const [selectedViewType, setSelectedViewType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isEligibleModalOpen, setIsEligibleModalOpen] = useState(false);

  // Load user
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    } else {
      const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
      else router.push("/login");
    }
  }, [initialUser, router]);

  // Fetch data
  const refreshStats = useCallback(async () => {
    if (!user) return;
    try {
      const [sRes, kRes, tRes, mRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/kpis'),
        fetch('/api/admin/tasks'),
        fetch('/api/admin/mails?limit=100')
      ]);
      const [s, k, t, m] = await Promise.all([sRes.json(), kRes.json(), tRes.json(), mRes.json()]);
      if (s.success) setStats(s.data);
      if (k.success) setKpi(k.kpi || {});
      if (t.success) setTasksList(t.data || []);
      if (m.success) setMails(m.data || []);
    } catch (e) { console.error(e); }
  }, [user]);

  useSWR(user ? 'admin-dashboard-data' : null, refreshStats, { revalidateOnFocus: false, dedupingInterval: 5000 });

  const filteredItems = useMemo(() => {
    const list = selectedViewType === "STAFF" ? [] : mails; // Staff logic simplified for brevity
    return list.filter((m: any) => m.email?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [mails, searchQuery, selectedViewType]);

  const itemsPerPage = 10;
  const currentItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const isAdmin = user?.role === "01" || user?.role === "02" || user?.role === "ADMIN";

  if (selectedViewType) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedViewType(null)} className="h-10 w-10 bg-gold/10 rounded-xl flex items-center justify-center text-gold hover:bg-gold/20 transition-all">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
            {selectedViewType === "TASKS" ? "Nhiệm vụ hệ thống" : "Danh sách Mail"}
          </h2>
        </div>

        <div className="card-style !p-0 overflow-hidden">
          <div className="p-6 bg-white/5 border-b border-border flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-secondary" />
              <input 
                placeholder="Tìm kiếm nhanh..."
                className="w-full bg-white/5 border border-border rounded-xl pl-14 pr-4 h-11 text-sm text-white focus:border-gold outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-[10px] font-black uppercase text-foreground-secondary tracking-widest border-b border-border">
                <tr>
                  <th className="p-6">Dữ liệu</th>
                  <th className="p-6">Loại</th>
                  <th className="p-6">Trạng thái</th>
                  <th className="p-6">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground-secondary">
                {currentItems.map((m: any) => (
                  <tr key={m.id || m._id} className="hover:bg-white/5 transition-colors">
                    <td className="p-6 font-bold text-white">{m.email}</td>
                    <td className="p-6 font-black text-[10px] text-gold">{m.type}</td>
                    <td className="p-6"><Badge variant={m.status === "LIVE" ? "success" : "danger"}>{m.status}</Badge></td>
                    <td className="p-6"><button className="text-gold hover:underline font-bold text-xs">Chi tiết</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 border-t border-border flex justify-between items-center text-xs font-bold text-foreground-secondary">
            <span>Trang {currentPage} / {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-10 px-4 bg-white/5 rounded-xl disabled:opacity-30">Trước</button>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-10 px-4 bg-white/5 rounded-xl disabled:opacity-30">Sau</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-5xl font-black text-white uppercase tracking-tighter flex items-center gap-5 leading-none">
            <Database className="text-gold" size={48} /> 
            <span>Dashboard <span className="text-gold">Admin</span></span>
          </h1>
          <p className="text-foreground-secondary font-black uppercase tracking-[0.3em] mt-4 text-xs">Hệ thống vận hành AQ MEDIA • Real-time Monitoring</p>
        </div>
        <div className="flex gap-2 p-2 bg-background-secondary border border-border rounded-2xl">
          <div className="px-6 py-2 border-r border-border text-center">
            <p className="text-[8px] font-black text-foreground-secondary uppercase tracking-widest mb-1">Mail Online</p>
            <p className="text-xl font-black text-white">{stats.totalMails?.toLocaleString() || 0}</p>
          </div>
          <div className="px-6 py-2 text-center">
            <p className="text-[8px] font-black text-foreground-secondary uppercase tracking-widest mb-1">Quỹ Phạt</p>
            <p className="text-xl font-black text-red-500">{stats.totalFines?.toLocaleString('vi-VN') || 0}đ</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Task Đang Chờ" value={stats.tasks?.pending || 0} icon={<Activity size={24} />} color="indigo" subtitle="Nhiệm vụ chưa hoàn thành" onClick={() => setSelectedViewType("TASKS")} />
        <StatCard title="Kênh Đã BKT" value={stats.monCount || 0} icon={<DollarSign size={24} />} color="gold" subtitle="Bật kiếm tiền thành công" onClick={() => router.push("/admin/mail/monetized")} />
        <StatCard title="Kênh Đủ Giờ" value={stats.eligibleChannelsCount || 0} icon={<Zap size={24} />} color="green" subtitle="Kênh đạt chỉ tiêu đủ giờ" onClick={() => setIsEligibleModalOpen(true)} />
        <StatCard title="Nhân Sự Active" value={stats.activeStaff || 0} icon={<Users size={24} />} color="purple" subtitle="Đội ngũ nhân sự đang làm việc" />
        <StatCard title="Tài Khoản Die" value={stats.totalDie || 0} icon={<XCircle size={24} />} color="red" subtitle="Mail gặp lỗi hệ thống" onClick={() => setSelectedViewType("DIE")} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* KPI Section */}
        <div className="xl:col-span-2 card-style relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-64 w-64 bg-gold/5 blur-[100px] -mr-32 -mt-32 transition-all group-hover:bg-gold/10" />
          <div className="relative z-10 space-y-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <TrendingUp size={28} className="text-gold" /> Chỉ tiêu công suất
                </h2>
                <p className="text-foreground-secondary font-bold text-[10px] uppercase tracking-widest mt-1">Theo dõi vận hành toàn bộ hệ thống</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-black/40 rounded-2xl border border-border">
                <Calendar size={16} className="text-foreground-secondary" />
                <span className="text-[10px] font-black text-white uppercase">{kpi.startDate || "---"} → {kpi.endDate || "---"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <KPIInputCard label="Kênh Bật Kiếm Tiền" target={kpi.targetMonetized} current={stats.monCount || 0} unit="kênh" onChange={(v:any) => setKpi({...kpi, targetMonetized: v})} />
              <KPIInputCard label="Kênh Đạt Giờ Xem" target={kpi.targetWatchHours} current={stats.satCount || 0} unit="kênh" onChange={(v:any) => setKpi({...kpi, targetWatchHours: v})} />
            </div>
          </div>
        </div>

        {/* Action Center */}
        <div className="card-style space-y-8">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Zap size={24} className="text-gold" /> Trung tâm xử lý
          </h3>
          <div className="space-y-4">
            <button onClick={() => router.push("/admin/tasks")} className="w-full h-14 bg-white/5 border border-border hover:border-gold/50 rounded-2xl flex items-center justify-between px-6 transition-all group">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center group-hover:bg-gold group-hover:text-background transition-all"><ClipboardCheck size={20} /></div>
                <span className="text-xs font-black uppercase tracking-widest text-foreground-secondary group-hover:text-white">Phân công việc</span>
              </div>
              <ChevronRight size={16} className="text-foreground-secondary group-hover:text-gold group-hover:translate-x-1 transition-all" />
            </button>
            <button onClick={() => router.push("/admin/staff")} className="w-full h-14 bg-white/5 border border-border hover:border-gold/50 rounded-2xl flex items-center justify-between px-6 transition-all group">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center group-hover:bg-gold group-hover:text-background transition-all"><Users size={20} /></div>
                <span className="text-xs font-black uppercase tracking-widest text-foreground-secondary group-hover:text-white">Quản lý nhân sự</span>
              </div>
              <ChevronRight size={16} className="text-foreground-secondary group-hover:text-gold group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
      {/* Eligible Channels Detail Modal */}
      <AnimatePresence>
        {isEligibleModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsEligibleModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-sidebar border border-white/10 rounded-[32px] shadow-2xl p-8 overflow-hidden"
            >
              <button 
                onClick={() => setIsEligibleModalOpen(false)}
                className="absolute top-6 right-6 h-10 w-10 bg-white/5 border border-white/0 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-xl bg-green-500/10 text-emerald-400 flex items-center justify-center border border-green-500/20 shrink-0">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Chi Tiết Kênh Đủ Giờ</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Danh sách chi tiết kênh đã đạt tiêu chuẩn thời gian xem</p>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[60vh] custom-scrollbar rounded-2xl border border-white/5 bg-black/30">
                <table className="w-full text-left">
                  <thead className="bg-[#0c0c0c] text-[10px] font-black uppercase text-gray-500 tracking-widest border-b border-white/5 sticky top-0">
                    <tr>
                      <th className="p-4">Nhân sự</th>
                      <th className="p-4">Lô mail</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Tên kênh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300 text-sm font-medium">
                    {stats.eligibleChannelsList && stats.eligibleChannelsList.length > 0 ? (
                      stats.eligibleChannelsList.map((item: any) => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-bold text-white">{item.assignedTo}</td>
                          <td className="p-4 text-xs font-black uppercase text-gold">{item.batchName}</td>
                          <td className="p-4 font-mono text-zinc-400 text-xs">{item.email}</td>
                          <td className="p-4 text-emerald-400 font-bold">{item.channelName}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                          Chưa có kênh nào đủ giờ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
