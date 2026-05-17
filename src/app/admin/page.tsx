"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, 
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
  ClipboardCheck,
  Activity,
  Database,
  Zap,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { MOCK_DASHBOARD_STATS, MOCK_KPI_DATA, MOCK_MAILS, MOCK_STAFF, MOCK_TASK_ASSIGNMENTS, MailData } from "@/data/mockData";
import { StaffData } from "@/types/admin";
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
  const [staffList, setStaffList] = useState<StaffData[]>([]);
  const [mails, setMails] = useState<any[]>([]);
  const [showStaffTasksView, setShowStaffTasksView] = useState(false);
  const [showStaffMailsView, setShowStaffMailsView] = useState(false);
  const [selectedStaffTask, setSelectedStaffTask] = useState<any>(null);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const itemsPerPage = 10;

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyToast(`Đã sao chép ${label}`);
    setTimeout(() => setCopyToast(null), 2000);
  };

  const getRoleLabel = (role?: string) => {
    if (role === "01") return "ADMIN";
    if (role === "02") return "QL CÔNG VIỆC";
    if (role === "03") return "QL NHÂN SỰ";
    if (role === "04") return "NHÂN VIÊN";
    return "GUEST";
  };

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    const savedKPI = localStorage.getItem("global_kpi_data");
    if (savedKPI) setKpi(JSON.parse(savedKPI));

    const refreshStats = () => {
      const savedMails = localStorage.getItem("global_mails_data");
      const currentMails = savedMails ? JSON.parse(savedMails) : MOCK_MAILS;
      
      const savedTasks = localStorage.getItem("global_tasks_data");
      const currentTasks = savedTasks ? JSON.parse(savedTasks) : MOCK_TASK_ASSIGNMENTS;

      // Check current user role dynamically
      const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
      const currentUserObj = storedUser ? JSON.parse(storedUser) : null;
      const isMinimalRole = currentUserObj?.role === "03" || currentUserObj?.role === "04" || currentUserObj?.role === "NHÂN VIÊN" || currentUserObj?.role === "QUẢN LÝ NHÂN SỰ";

      let processedTasks = [...currentTasks];
      if (isMinimalRole && currentUserObj) {
        const myMails = currentMails.filter((m: any) => String(m.assigneeId) === String(currentUserObj?.id));
        const myMailsTypes = new Set(myMails.map((m: any) => m.type));
        
        processedTasks = processedTasks.map((t: any) => {
          const isAssigned = String(t.assigneeId) === String(currentUserObj?.id);
          if (isAssigned) return t;

          const typeMatch = (t.type === "MAIL_VE_TINH" && myMailsTypes.has("SATELLITE")) ||
                            (t.type === "MAIL_MONETIZED" && myMailsTypes.has("MONETIZED")) ||
                            (t.type === "MAIL_GOC" && myMailsTypes.has("ROOT"));

          if (typeMatch) {
            return { 
              ...t, 
              assigneeId: currentUserObj?.id, 
              assigneeName: currentUserObj?.name,
              status: "IN_PROGRESS" 
            };
          }
          return t;
        });
      }

      setTasksList(processedTasks);

      if (isMinimalRole && currentUserObj) {
        const myMails = currentMails.filter((m: any) => String(m.assigneeId) === String(currentUserObj?.id));
        const myTasks = processedTasks.filter((t: any) => String(t.assigneeId) === String(currentUserObj?.id) && t.status === "IN_PROGRESS");
        setStats({
          totalMail: myMails.length,
          mailLive: myMails.filter((m: any) => m.status === "LIVE").length,
          mailDie: myMails.filter((m: any) => m.status === "DIE").length,
          mailRoot: 0,
          mailSatellite: 0,
          mailMonetized: 0,
          tasksToday: myTasks.length,
          staffOnline: 0,
          mailWatchHours: 0
        });
      } else {
        setStats(prev => ({
          ...prev,
          totalMail: currentMails.length,
          mailLive: currentMails.filter((m: any) => m.status === "LIVE").length,
          mailDie: currentMails.filter((m: any) => m.status === "DIE").length,
          mailRoot: currentMails.filter((m: any) => m.type === "ROOT" && !m.assigneeId).length,
          mailSatellite: currentMails.filter((m: any) => m.type === "SATELLITE" && !m.assigneeId).length,
          mailMonetized: currentMails.filter((m: any) => m.type === "MONETIZED").length,
          tasksToday: currentTasks.filter((t: any) => t.status === "IN_PROGRESS").length,
        }));
      }
      setMails(currentMails);
    };

    const loadStaff = () => {
      const stored = localStorage.getItem("global_users");
      const allUsers = stored ? JSON.parse(stored) : MOCK_STAFF;
      
      const unique = allUsers.filter((item: any, index: number, self: any[]) =>
        index === self.findIndex((t) => String(t.id) === String(item.id))
      );
      setStaffList(unique);
      
      // Update online count in stats
      const onlineCount = unique.filter((u: any) => u.isOnline && u.role !== "01").length;
      setStats(prev => ({ ...prev, staffOnline: onlineCount }));
    };

    refreshStats();
    loadStaff();
    const staffInterval = setInterval(loadStaff, 5000);

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
      if (e.key === "global_users") {
        loadStaff();
      }
      if (e.key === "user") {
        setUser(JSON.parse(e.newValue || "{}"));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(staffInterval);
    };
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

  const handleStaffMailStatusChange = (mailId: number, newWorkStatus: string) => {
    const savedMails = localStorage.getItem("global_mails_data");
    const currentMails = savedMails ? JSON.parse(savedMails) : MOCK_MAILS;

    const updatedMails = currentMails.map((m: any) => {
      if (m.id === mailId) {
        let status = m.status;
        if (newWorkStatus === "ĐÃ LÀM KÊNH" || newWorkStatus === "HOÀN THÀNH" || newWorkStatus === "ĐÃ LÀM") {
          status = "LIVE";
        } else if (newWorkStatus === "LỖI") {
          status = "DIE";
        }
        return { ...m, workStatus: newWorkStatus, status };
      }
      return m;
    });

    localStorage.setItem("global_mails_data", JSON.stringify(updatedMails));
    setMails(updatedMails);

    // Sync stats
    const myMails = updatedMails.filter((m: any) => String(m.assigneeId) === String(user?.id));
    setStats(prev => ({
      ...prev,
      totalMail: myMails.length,
      mailLive: myMails.filter((m: any) => m.status === "LIVE").length,
      mailDie: myMails.filter((m: any) => m.status === "DIE").length,
    }));

    window.dispatchEvent(new Event("storage"));
  };

  const roleLabel = getRoleLabel(user?.role);
  const isAdminOrManager = user?.role === "01" || user?.role === "02";
  const isHRManager = user?.role === "03" || user?.role === "QUẢN LÝ NHÂN SỰ";

  // Lọc dữ liệu mail tổng hợp cho các view xem nhanh (Live/Die)
  const filteredMails = useMemo(() => {
    if (!selectedViewType || selectedViewType === "STAFF") return [];
    
    return mails.filter(m => {
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
                  {staffList
                    .filter(s => s.status === "ACTIVE" && s.role !== "01")
                    .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((staff, index) => (
                    <tr key={`staff-${staff.id}`} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-6 text-[10px] font-black text-gray-500">{index + 1}</td>
                      <td className="py-4 px-6 text-sm font-bold text-white">{staff.name}</td>
                      <td className="py-4 px-6 text-xs text-gray-400 uppercase font-black">{getRoleLabel(staff.role)}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${staff.isOnline ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                          {staff.isOnline ? "ONLINE" : "OFFLINE"}
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
                  {filteredMails.slice(0, 10).map((mail: any, index: number) => (
                    <tr key={`mail-${mail.id}`} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-6 text-[10px] font-black text-gray-500">{index + 1}</td>
                      <td className="py-4 px-6 text-sm font-bold text-white">{mail.email}</td>
                      <td className="py-4 px-6 text-xs text-gray-400">{mail.recovery}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${mail.channelStatus ? getChannelStatusColor(mail.channelStatus) : (mail.status === 'LIVE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20')}`}>
                          {mail.channelStatus || mail.status || "LIVE"}
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
    <div className="space-y-6 pb-24 relative">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: "-50%" }} animate={{ opacity: 1, y: 20, x: "-50%" }} exit={{ opacity: 0, y: -100, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[100] bg-sidebar border border-green-500/50 p-5 rounded-[24px] shadow-2xl flex items-center gap-4 min-w-[400px]"
          >
            <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center text-sidebar"><CheckCircle2 size={28} /></div>
            <div>
              <p className="text-xs font-bold text-green-500 uppercase tracking-widest">Thành công</p>
              <p className="text-base font-black text-white">Đã xác nhận và cập nhật KPI cho toàn hệ thống!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {copyToast && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: "-50%" }} animate={{ opacity: 1, y: 20, x: "-50%" }} exit={{ opacity: 0, y: -100, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[500] bg-gold px-6 py-2.5 rounded-full text-sidebar font-black text-sm shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 size={18} /> {copyToast}
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
            <p className="text-xs font-black text-white uppercase flex items-center gap-2">
              <Clock size={12} className="text-gold" />
              16:20 (4:20 PM) - {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {user?.role === "03" || user?.role === "04" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard 
              title="Tổng mail được giao" 
              value={stats.totalMail} 
              icon={<Mail size={32} />} 
              color="blue" 
              subtitle="Nhấp để xem chi tiết kho mail được giao" 
              onClick={() => {
                setShowStaffMailsView(!showStaffMailsView);
                setShowStaffTasksView(false);
              }}
            />
            <StatCard 
              title="Task hôm nay" 
              value={stats.tasksToday} 
              icon={<ClipboardList size={32} />} 
              color="green" 
              subtitle="Nhấp để xem chi tiết danh sách nhiệm vụ" 
              onClick={() => {
                setShowStaffTasksView(!showStaffTasksView);
                setShowStaffMailsView(false);
              }}
            />
          </div>

          <AnimatePresence>
            {showStaffTasksView && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-6">
                <div className="bg-sidebar border border-border-custom rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 h-48 w-48 bg-green-500/5 blur-[80px] -mr-24 -mt-24 transition-all group-hover:bg-green-500/10" />
                  <div className="relative z-10 flex flex-col gap-2 mb-6">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
                      <ClipboardList className="text-green-500" size={28} />
                      Nhiệm vụ được giao
                    </h2>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Danh sách các ca trực và nhiệm vụ đang thực hiện</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tasksList.filter(t => String(t.assigneeId) === String(user?.id) && t.status === "IN_PROGRESS").length > 0 ? (
                      tasksList.filter(t => String(t.assigneeId) === String(user?.id) && t.status === "IN_PROGRESS").map((task: any) => (
                        <div 
                          key={task.id} 
                          onClick={() => setSelectedStaffTask(selectedStaffTask?.id === task.id ? null : task)}
                          className={`p-6 rounded-2xl border transition-all cursor-pointer ${selectedStaffTask?.id === task.id ? 'bg-gold/10 border-gold shadow-lg shadow-gold/5' : 'bg-white/[0.02] border-white/5 hover:border-gold/30'}`}
                        >
                          <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2">{task.title}</h3>
                          <div className="text-xs text-gray-400 mb-4 font-medium leading-relaxed">
                            <b>Ghi chú ca trực:</b> {task.note || "Tiến hành check tạo xóa và xử lý các mail vệ tinh/gốc được giao. Đảm bảo đúng tiến độ và báo cáo lỗi nếu có."}
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <span>{task.mailCount || 0} Mail</span>
                            <span className="text-gold">Xem chi tiết & danh sách mail</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="md:col-span-2 py-10 text-center text-gray-600 font-bold uppercase tracking-widest">Không có nhiệm vụ nào được giao</div>
                    )}
                  </div>
                </div>

                {selectedStaffTask && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-sidebar border border-border-custom rounded-[32px] overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Danh sách Mail - {selectedStaffTask.title}</h3>
                        <p className="text-xs text-gray-500 font-medium mt-1">Danh sách mail bạn cần xử lý cho nhiệm vụ này</p>
                      </div>
                      <button onClick={() => setSelectedStaffTask(null)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5">
                          <tr>
                            <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">STT</th>
                            <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Email</th>
                            <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Mail KP</th>
                            <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Trạng thái công việc</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-gray-300">
                          {mails
                            .filter((m: any) => String(m.assigneeId) === String(user?.id) && (
                              selectedStaffTask.type === "MAIL_VE_TINH" ? m.type === "SATELLITE" : 
                              selectedStaffTask.type === "MAIL_MONETIZED" ? m.type === "MONETIZED" : 
                              m.type === "ROOT"
                            ))
                            .map((mail: any, index: number) => (
                              <tr key={mail.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="py-4 px-6 text-[10px] font-black text-gray-500">{index + 1}</td>
                                <td className="py-4 px-6 font-bold text-white cursor-pointer hover:text-gold transition-colors animate-pulse-subtle" onClick={() => copyToClipboard(mail.email, "Email")}>{mail.email}</td>
                                <td className="py-4 px-6 text-xs text-gray-400 cursor-pointer hover:text-gold transition-colors" onClick={() => copyToClipboard(mail.recovery, "Mail KP")}>{mail.recovery}</td>
                                <td className="py-4 px-6 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button 
                                      onClick={() => handleStaffMailStatusChange(mail.id, "ĐÃ LÀM")}
                                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border ${
                                        mail.workStatus === "ĐÃ LÀM KÊNH" || mail.workStatus === "HOÀN THÀNH" || mail.workStatus === "ĐÃ LÀM"
                                          ? "bg-green-500/10 text-green-500 border-green-500/30"
                                          : "bg-white/5 text-gray-400 border-white/10 hover:border-green-500/30 hover:text-green-500"
                                      }`}
                                    >
                                      Đã làm
                                    </button>
                                    <button 
                                      onClick={() => handleStaffMailStatusChange(mail.id, "CHƯA LÀM")}
                                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border ${
                                        mail.workStatus === "CHƯA LÀM" || !mail.workStatus
                                          ? "bg-gray-500/10 text-gray-400 border-gray-500/30"
                                          : "bg-white/5 text-gray-400 border-white/10 hover:border-gray-500/30 hover:text-gray-400"
                                      }`}
                                    >
                                      Chưa làm
                                    </button>
                                    <button 
                                      onClick={() => handleStaffMailStatusChange(mail.id, "LỖI")}
                                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border ${
                                        mail.workStatus === "LỖI"
                                          ? "bg-red-500/10 text-red-500 border-red-500/30"
                                          : "bg-white/5 text-gray-400 border-white/10 hover:border-red-500/30 hover:text-red-500"
                                      }`}
                                    >
                                      Lỗi
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          {mails.filter((m: any) => String(m.assigneeId) === String(user?.id) && (
                            selectedStaffTask.type === "MAIL_VE_TINH" ? m.type === "SATELLITE" : 
                            selectedStaffTask.type === "MAIL_MONETIZED" ? m.type === "MONETIZED" : 
                            m.type === "ROOT"
                          )).length === 0 && (
                            <tr><td colSpan={4} className="py-10 text-center text-gray-600 font-bold uppercase tracking-widest">Không có mail nào được gán cho nhiệm vụ này</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {showStaffMailsView && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-6">
                <div className="bg-sidebar border border-border-custom rounded-[32px] overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                        <Mail className="text-gold" size={24} />
                        Danh sách Mail được giao
                      </h3>
                      <p className="text-xs text-gray-500 font-medium mt-1">Danh sách tất cả tài khoản mail do Admin/QL Công việc gán cho bạn</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-4 h-10 w-full md:w-64 focus-within:border-gold transition-all">
                        <Search size={14} className="text-gray-500" />
                        <input 
                          type="text" 
                          placeholder="Tìm kiếm Email hoặc Mail KP..." 
                          value={searchQuery} 
                          onChange={(e) => setSearchQuery(e.target.value)} 
                          className="bg-transparent border-none outline-none text-xs text-white w-full" 
                        />
                      </div>
                      <button onClick={() => setShowStaffMailsView(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                    </div>
                  </div>

                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5">
                        <tr>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">STT</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">STT Gốc</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Email</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Mail KP</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Pass</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">2FA</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">SĐT</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center">Trạng thái công việc</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300">
                        {mails
                          .filter((m: any) => String(m.assigneeId) === String(user?.id))
                          .filter((m: any) => 
                            !searchQuery || 
                            m.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            m.recovery.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((mail: any, index: number) => (
                            <tr key={mail.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="py-4 px-6 text-[10px] font-black text-gray-500">{index + 1}</td>
                              <td className="py-4 px-6 text-[10px] font-black text-gold/80">{mail.originalSTT || mail.id}</td>
                              <td className="py-4 px-6 font-bold text-white cursor-pointer hover:text-gold transition-colors" onClick={() => copyToClipboard(mail.email, "Email")}>{mail.email}</td>
                              <td className="py-4 px-6 text-xs text-gray-400 cursor-pointer hover:text-gold transition-colors" onClick={() => copyToClipboard(mail.recovery, "Mail KP")}>{mail.recovery}</td>
                              <td className="py-4 px-6 text-xs text-gray-500 font-mono cursor-pointer hover:text-gold transition-colors" onClick={() => copyToClipboard(mail.pass, "Mật khẩu")}>{mail.pass}</td>
                              <td className="py-4 px-6 text-xs text-gray-500 font-mono cursor-pointer hover:text-gold transition-colors" onClick={() => copyToClipboard(mail.twoFA || "", "2FA")}>{mail.twoFA || "---"}</td>
                              <td className="py-4 px-6 text-xs text-gray-500 font-bold cursor-pointer hover:text-gold transition-colors" onClick={() => copyToClipboard(mail.phone || "", "SĐT")}>{mail.phone || "---"}</td>
                              <td className="py-4 px-6 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => handleStaffMailStatusChange(mail.id, "ĐÃ LÀM")}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border ${
                                      mail.workStatus === "ĐÃ LÀM KÊNH" || mail.workStatus === "HOÀN THÀNH" || mail.workStatus === "ĐÃ LÀM" || mail.workStatus === "ĐÃ MỜI MAIL"
                                        ? "bg-green-500/10 text-green-500 border-green-500/30"
                                        : "bg-white/5 text-gray-400 border-white/10 hover:border-green-500/30 hover:text-green-500"
                                    }`}
                                  >
                                    Đã làm
                                  </button>
                                  <button 
                                    onClick={() => handleStaffMailStatusChange(mail.id, "CHƯA LÀM")}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border ${
                                      mail.workStatus === "CHƯA LÀM" || mail.workStatus === "CHƯA LÀM KÊNH" || mail.workStatus === "CHƯA MỜI MAIL" || !mail.workStatus
                                        ? "bg-gray-500/10 text-gray-400 border-gray-500/30"
                                        : "bg-white/5 text-gray-400 border-white/10 hover:border-gray-500/30 hover:text-gray-400"
                                    }`}
                                  >
                                    Chưa làm
                                  </button>
                                  <button 
                                    onClick={() => handleStaffMailStatusChange(mail.id, "LỖI")}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border ${
                                      mail.workStatus === "LỖI"
                                        ? "bg-red-500/10 text-red-500 border-red-500/30"
                                        : "bg-white/5 text-gray-400 border-white/10 hover:border-red-500/30 hover:text-red-500"
                                    }`}
                                  >
                                    Lỗi
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        {mails.filter((m: any) => String(m.assigneeId) === String(user?.id)).length === 0 && (
                          <tr><td colSpan={8} className="py-10 text-center text-gray-600 font-bold uppercase tracking-widest">Bạn chưa được gán tài khoản mail nào</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : isHRManager ? (
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
                    <tr key={`schedule-${i}`} className="group hover:bg-white/[0.02]">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Tổng mail" value={stats.totalMail} icon={<Mail size={32} />} color="blue" subtitle="Toàn hệ thống" onClick={() => router.push("/admin/mail/all")} />
            <StatCard title="Mail Gốc" value={stats.mailRoot} icon={<Database size={32} />} color="indigo" subtitle="Tồn kho mail gốc" onClick={() => router.push("/admin/mail/root")} />
            <StatCard title="Mail Vệ Tinh" value={stats.mailSatellite} icon={<Zap size={32} />} color="purple" subtitle="Tồn kho mail vệ tinh" onClick={() => router.push("/admin/mail/satellite")} />
            {!(user?.role === "03" || user?.role === "04") && (
              <StatCard title="Bật kiếm tiền" value={stats.mailMonetized} icon={<DollarSign size={32} />} color="gold" subtitle="Kênh đã bật QC" onClick={() => router.push("/admin/mail/monetized")} />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Task hôm nay" value={stats.tasksToday} icon={<ClipboardList size={32} />} color="green" subtitle="Công việc đang chạy" onClick={() => setSelectedViewType("TASKS")} />
            {user?.role !== "04" && (
              <StatCard title="Nhân viên Online" value={stats.staffOnline} icon={<Users size={32} />} color="blue" subtitle="Đang làm việc" onClick={() => setSelectedViewType("STAFF")} />
            )}
            <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-6 flex items-center justify-between shadow-inner">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20"><CheckCircle2 size={24} /></div>
                  <div><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Hệ thống</p><h4 className="text-sm font-black text-white uppercase tracking-tighter">Live: {stats.mailLive}</h4></div>
               </div>
               <div className="h-10 w-px bg-white/5" />
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20"><XCircle size={24} /></div>
                  <div><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Lỗi</p><h4 className="text-sm font-black text-white uppercase tracking-tighter">Die: {stats.mailDie}</h4></div>
               </div>
            </div>
            </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <motion.div className="xl:col-span-2 rounded-[32px] border border-border-custom bg-sidebar p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-48 w-48 bg-gold/5 blur-[80px] -mr-24 -mt-24 transition-all group-hover:bg-gold/10" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div><h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter uppercase"><TrendingUp size={32} className="text-gold" /> KPI Hệ Thống</h2><p className="text-gray-500 mt-1 font-medium text-sm">Thiết lập mục tiêu và theo dõi tiến độ công việc</p></div>
                <div className={`flex flex-wrap items-center gap-4`}>
                  <div className={`flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 ${!isAdminOrManager ? "opacity-75" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Từ</span>
                      <input 
                        type="date" 
                        value={kpi.startDate} 
                        disabled={!isAdminOrManager} 
                        onChange={(e) => setKpi({ ...kpi, startDate: e.target.value })} 
                        className="bg-black/40 text-white text-xs font-black p-2 rounded-xl outline-none border border-white/5 focus:border-gold/50 transition-all cursor-pointer" 
                      />
                    </div>
                    <ChevronRight size={14} className="text-gray-500" />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Đến</span>
                      <input 
                        type="date" 
                        value={kpi.endDate} 
                        disabled={!isAdminOrManager} 
                        onChange={(e) => setKpi({ ...kpi, endDate: e.target.value })} 
                        className="bg-black/40 text-white text-xs font-black p-2 rounded-xl outline-none border border-white/5 focus:border-gold/50 transition-all cursor-pointer" 
                      />
                    </div>
                  </div>
                  {isAdminOrManager && (
                    <button 
                      onClick={handleSaveKPI} 
                      className="h-12 px-6 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-gold/20 flex items-center gap-2"
                    >
                      <CheckCircle2 size={18} /> Xác nhận
                    </button>
                  )}
                </div>
              </div>
              <div className={`grid gap-8 ${isAdminOrManager ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
                {isAdminOrManager && !(user?.role === "03" || user?.role === "04") && (
                  <KPIInputCard label="Kênh bật kiếm tiền" target={kpi.targetMonetized} current={kpi.currentMonetized} onChange={(val: any) => setKpi({ ...kpi, targetMonetized: val })} unit="kênh" readonly={false} />
                )}
                <div className={!isAdminOrManager ? "max-w-md mx-auto w-full" : ""}>
                  <KPIInputCard label="Kênh đủ giờ" target={kpi.targetWatchHours} current={kpi.currentWatchHours} onChange={(val: any) => setKpi({ ...kpi, targetWatchHours: val })} unit="kênh" readonly={!isAdminOrManager} />
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
