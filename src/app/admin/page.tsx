"use client";

import React, { useState, useEffect, useMemo, useCallback } from"react";
import { motion, AnimatePresence } from"framer-motion";
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
 XCircle,
 Play,
 ShieldAlert,
 Check,
 MessageSquare,
 Send,
 LogOut,
 Loader2
} from"lucide-react";

import { StaffData, MailData, TaskAssignment } from"@/types/admin";
import { useRouter } from"next/navigation";
import MailDetailModal from"@/components/admin/MailDetailModal";
import TOTPDisplay from"@/components/admin/TOTPDisplay";
import { useSWR } from "@/lib/useSWR";
import { LoadingOverlay } from "@/components/ui/Loading";
import { Badge } from "@/components/ui/Badge";

const getStableDateString = () => {
 const d = new Date();
 const year = d.getFullYear();
 const month = String(d.getMonth() + 1).padStart(2, '0');
 const day = String(d.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
};

const getMailsForTask = (t: any, allMails: any[]) => {
 if (!t) return [];
 let mailType ="ROOT";
 if (t.type ==="MAIL_VE_TINH") mailType ="SATELLITE";
 if (t.type ==="MAIL_MONETIZED") mailType ="MONETIZED";

 if (t.selectedMailIds && Array.isArray(t.selectedMailIds)) {
 return (allMails || []).filter((m: any) => t.selectedMailIds.includes(m.id || m._id));
 }
 
 let filtered = (allMails || []).filter((m: any) => m.type === mailType && String(m.assigneeId) === String(t.assigneeId));
 return filtered;
};

export default function AdminDashboard() {
 const router = useRouter();
 const [user, setUser] = useState<StaffData | null>(null);
 
 // State
 const [kpi, setKpi] = useState<any>({});
 const [stats, setStats] = useState<any>({});
 const [staffList, setStaffList] = useState<StaffData[]>([]);
 const [mails, setMails] = useState<MailData[]>([]);
 const [tasksList, setTasksList] = useState<TaskAssignment[]>([]);
 const [pendingRequests, setPendingRequests] = useState<any[]>([]);
 const [checkInTime, setCheckInTime] = useState<string | null>(null);
 const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
 const [timekeepingModal, setTimekeepingModal] = useState<{ type:"in" |"out"; time: string; warning?: string } | null>(null);
 const [missingLinksWarning, setMissingLinksWarning] = useState<{stt: number; email: string; missing: number}[]>([]);
 const [showSuccess, setShowSuccess] = useState(false);
 const [copyToast, setCopyToast] = useState<string | null>(null);
 const [selectedViewType, setSelectedViewType] = useState<"LIVE" |"DIE" |"STAFF" |"TASKS" | null>(null);
 const [searchQuery, setSearchQuery] = useState("");
 const [filterStatus, setFilterStatus] = useState("all");
 const [filterMailType, setFilterMailType] = useState("ALL");
 const [currentPage, setCurrentPage] = useState(1);
 const [selectedStaffTask, setSelectedStaffTask] = useState<any>(null);
 const [selectedMailForModal, setSelectedMailForModal] = useState<MailData | null>(null);
 const [isEligibleChannelsModalOpen, setIsEligibleChannelsModalOpen] = useState(false);

 // Newsfeed summary (brief)
 const [posts, setPosts] = useState<any[]>([]);

 // Data Fetching
 const refreshStats = useCallback(async () => {
    try {
      const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
      const currentUserObj = storedUser ? JSON.parse(storedUser) : null;
      if (!currentUserObj) return;

      const [statsRes, kpisRes, tasksRes, mailsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { 'x-user-id': (currentUserObj as any).id || (currentUserObj as any)._id || '' } }),
        fetch('/api/admin/kpis'),
        fetch('/api/admin/tasks', { headers: { 'x-user-id': (currentUserObj as any).id || (currentUserObj as any)._id || '' } }),
        fetch('/api/admin/mails?limit=200', { headers: { 'x-user-id': (currentUserObj as any).id || (currentUserObj as any)._id || '' } })
      ]);
      
      const statsData = await statsRes.json();
      const kpisData = await kpisRes.json();
      const tasksData = await tasksRes.json();
      const mailsData = await mailsRes.json();

      if (statsData.success) {
        setStats(statsData.data);
        if (statsData.data.checkInTime) setCheckInTime(statsData.data.checkInTime);
        if (statsData.data.checkOutTime) setCheckOutTime(statsData.data.checkOutTime);
      }
      if (kpisData.success) setKpi(kpisData.kpi || {});
      if (tasksData.success) setTasksList(tasksData.data || tasksData.tasks || []);
      if (mailsData.success) setMails(mailsData.data || mailsData.mails || []);

      // Load newsfeed for summary
      const nfRes = await fetch('/api/admin/notifications?type=INFO&limit=3');
      if (nfRes.ok) {
        const nfData = await nfRes.json();
        setPosts(Array.isArray(nfData) ? nfData : []);
      }
    } catch (error) {
      console.error("Error refreshing stats", error);
    }
 }, []);

 const { isValidating: isLoadingData } = useSWR('admin-dashboard-stats-v2', refreshStats, { refreshInterval: 60000 });

 useEffect(() => {
  const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
  if (storedUser) {
    setUser(JSON.parse(storedUser));
    refreshStats();
  } else {
    router.push("/login");
  }
 }, [router, refreshStats]);

 const loadStaff = useCallback(async () => {
  if (user?.role !== "01" && user?.role !== "02") return;
  try {
    const res = await fetch("/api/admin/users?all=true");
    const data = await res.json();
    if (data.success) {
      const allUsers = data.data || data.users || [];
      setStaffList(allUsers.filter((u: any, idx: number, self: any[]) => 
        idx === self.findIndex((t) => t._id === u._id)
      ));
    }
  } catch (error) {
    console.error("Error loading staff", error);
  }
 }, [user?.role]);

 const loadRequests = useCallback(() => {
   const saved = localStorage.getItem("pending_access_requests");
   if (saved) setPendingRequests(JSON.parse(saved));
   else setPendingRequests([]);
 }, []);

 useEffect(() => {
   if (user) {
     loadStaff();
     loadRequests();
   }
 }, [user, loadStaff, loadRequests]);

 const handleApproveRequest = (request: any) => {
    const saved = localStorage.getItem("pending_access_requests") || "[]";
    const reqs = JSON.parse(saved);
    const updated = (reqs || []).filter((r: any) => r.id !== request.id);
    setPendingRequests(updated);
    localStorage.setItem("pending_access_requests", JSON.stringify(updated));
    localStorage.setItem(`access_response_${request.staffName}`, "APPROVED");
    
    // Call API if it's a lock request
    if (request.type === "FINE_PAYMENT" || request.type === "LATE_EXCUSE") {
      fetch("/api/admin/users/" + request.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLateLocked: false })
      }).catch(console.error);
    }
    
    setCopyToast(`Đã duyệt yêu cầu của ${request.staffName}`);
    setTimeout(() => setCopyToast(null), 3000);
 };

 const handleDenyRequest = (request: any) => {
    const saved = localStorage.getItem("pending_access_requests") || "[]";
    const reqs = JSON.parse(saved);
    const updated = (reqs || []).filter((r: any) => r.id !== request.id);
    setPendingRequests(updated);
    localStorage.setItem("pending_access_requests", JSON.stringify(updated));
    localStorage.setItem(`access_response_${request.staffName}`, "DENIED");
    setCopyToast(`Đã từ chối yêu cầu của ${request.staffName}`);
    setTimeout(() => setCopyToast(null), 3000);
 };

 const handleCheckIn = async () => {
    if (!user) return;
    try {
      await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user?.id || (user as any)?._id || "" },
        body: JSON.stringify({ action: "CHECK_IN" })
      });
      refreshStats();
      setTimekeepingModal({ type: "in", time: new Date().toLocaleTimeString("vi-VN") });
    } catch (err) {
      console.error(err);
    }
 };

 const handleCheckOut = async () => {
    if (!user) return;
    try {
      await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user?.id || (user as any)?._id || "" },
        body: JSON.stringify({ action: "CHECK_OUT" })
      });
      refreshStats();
      setTimekeepingModal({ type: "out", time: new Date().toLocaleTimeString("vi-VN") });
    } catch (err) {
      console.error(err);
    }
 };

 const handleSaveKPI = () => {
   fetch("/api/admin/kpis", {
     method: "PUT",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify(kpi)
   }).then(() => {
     setShowSuccess(true);
     setTimeout(() => setShowSuccess(false), 3000);
   }).catch(console.error);
 };

 const handleTaskStatusChange = async (taskId: string, newStatus: "IN_PROGRESS" | "COMPLETED") => {
   try {
     await fetch(`/api/admin/tasks/${taskId}`, {
       method: "PUT",
       headers: { "Content-Type": "application/json", "x-user-id": user?.id || (user as any)?._id || "" },
       body: JSON.stringify({ status: newStatus, progress: newStatus === "COMPLETED" ? 100 : 50 })
     });
     refreshStats();
     setCopyToast("Cập nhật nhiệm vụ thành công!");
     setTimeout(() => setCopyToast(null), 3000);
   } catch (err) {
     console.error(err);
   }
 };

 const isAdminOrManager = user?.role === "01" || user?.role === "02";
 const isStaff = user?.role === "04" || user?.role === "05";

 const filteredMails = useMemo(() => {
   return (mails || []).filter((m: MailData) => {
     const matchesSearch = m.email.toLowerCase().includes(searchQuery.toLowerCase());
     const matchesView = selectedViewType === "LIVE" ? m.status === "LIVE" : selectedViewType === "DIE" ? m.status === "DIE" : true;
     return matchesSearch && matchesView;
   });
 }, [mails, searchQuery, selectedViewType]);

 const itemsPerPage = 10;
 const currentItems = filteredMails.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
 const totalPages = Math.ceil(filteredMails.length / itemsPerPage);

 const myTasks = useMemo(() => {
   return tasksList.filter((t: TaskAssignment) => String(t.assigneeId) === String(user?.id || (user as any)?._id));
 }, [tasksList, user]);

 if (selectedViewType) {
   return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setSelectedViewType(null)} className="h-10 w-10 bg-gold/10 rounded-xl flex items-center justify-center text-gold hover:bg-gold/20 transition-all shadow-lg">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
          {selectedViewType === "STAFF" ? "Quản lý nhân sự" : selectedViewType === "TASKS" ? "Nhiệm vụ hệ thống" : "Danh sách Mail"}
        </h2>
      </div>

      <div className="bg-sidebar border border-white/0 rounded-[32px] overflow-hidden shadow-2xl">
        <div className="p-6 bg-black/20 border-b border-white/0 flex items-center justify-between">
           <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                placeholder="Tìm kiếm..."
                className="w-full bg-white/5 border border-white/0 rounded-xl pl-10 pr-4 h-10 text-sm text-white outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
           <button onClick={() => setSelectedViewType(null)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-500 hover:text-red-500 transition-all"><X size={20} /></button>
        </div>
        
        <div className="overflow-x-auto">
          {selectedViewType === "STAFF" ? (
            <table className="w-full text-left">
               <thead className="bg-[#0c0c0c] text-[10px] font-black uppercase text-gray-500 tracking-widest border-b border-white/0">
                 <tr>
                   <th className="p-6">Nhân viên</th>
                   <th className="p-6">Vai trò</th>
                   <th className="p-6">Trạng thái</th>
                   <th className="p-6">Online</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5 text-gray-300">
                 {staffList.filter(s => s.role !== "01").map(s => (
                   <tr key={s.id || (s as any)._id} className="hover:bg-white/[0.02]">
                     <td className="p-6 font-bold text-white">{s.name} <span className="text-gray-500 font-mono text-xs block">@{s.username}</span></td>
                     <td className="p-6 text-sm text-gold font-black">{s.role === "02" ? "QL CÔNG VIỆC" : s.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN"}</td>
                     <td className="p-6"><Badge variant={s.status === "ACTIVE" ? "success" : "danger"}>{s.status}</Badge></td>
                     <td className="p-6">
                        <div className={`h-2.5 w-2.5 rounded-full ${s.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
               <thead className="bg-[#0c0c0c] text-[10px] font-black uppercase text-gray-500 tracking-widest border-b border-white/0">
                 <tr>
                   <th className="p-6">Email</th>
                   <th className="p-6">Loại</th>
                   <th className="p-6">Trạng thái</th>
                   <th className="p-6">Cập nhật bởi</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5 text-gray-300">
                 {currentItems.map(m => (
                   <tr key={m.id || m._id} className="hover:bg-white/[0.02]">
                     <td className="p-6 font-bold text-white">{m.email}</td>
                     <td className="p-6 text-[10px] font-black text-gold">{m.type}</td>
                     <td className="p-6"><Badge variant={m.status === "LIVE" ? "success" : "danger"}>{m.status}</Badge></td>
                     <td className="p-6 text-sm text-gray-500">{m.updatedBy || "---"}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
          )}
        </div>

        {selectedViewType !== "STAFF" && (
           <div className="p-6 border-t border-white/0 flex justify-between items-center text-xs text-gray-500 font-bold">
              <span>Trang {currentPage} / {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 bg-white/5 rounded-lg disabled:opacity-30"><ChevronLeft size={16} /></button>
                <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 bg-white/5 rounded-lg disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
           </div>
        )}
      </div>
    </div>
   );
 }

 if (isStaff) {
  return (
    <div className="space-y-8 pb-20">
      <AnimatePresence>
        {timekeepingModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-900 border border-white/10 rounded-[32px] p-10 max-w-sm w-full text-center shadow-2xl">
               <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center mb-6 ${timekeepingModal.type === 'in' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  <CheckCircle2 size={40} />
               </div>
               <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">{timekeepingModal.type === 'in' ? 'Đã Check-in' : 'Đã Check-out'}</h3>
               <p className="text-gray-400 font-bold text-sm mb-8">Lúc: <span className="text-white font-mono">{timekeepingModal.time}</span></p>
               <button onClick={() => setTimekeepingModal(null)} className="w-full h-14 bg-gold text-sidebar font-black uppercase text-xs tracking-widest rounded-2xl">Xác nhận</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
            <Activity className="text-gold" size={40} /> Nhân viên Dashboard
          </h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Chào mừng, <span className="text-gold">{user?.name}</span></p>
        </div>
        <div className="flex gap-4 p-2 bg-sidebar/50 rounded-[28px] border border-white/5 backdrop-blur-md">
          <button onClick={handleCheckIn} disabled={!!checkInTime} className={`h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${!checkInTime ? 'bg-green-500 text-sidebar' : 'bg-zinc-800 text-gray-600 opacity-50'}`}>Check-in</button>
          <button onClick={handleCheckOut} disabled={!checkInTime || !!checkOutTime} className={`h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${checkInTime && !checkOutTime ? 'bg-red-500 text-white' : 'bg-zinc-800 text-gray-600 opacity-50'}`}>Check-out</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Vào làm" value={checkInTime ? new Date(checkInTime).toLocaleTimeString("vi-VN") : "---"} icon={<Clock size={24} />} color="blue" subtitle="Giờ điểm danh" />
        <StatCard title="Task hôm nay" value={stats.myTasks || 0} icon={<ClipboardList size={24} />} color="indigo" subtitle="Nhiệm vụ cần xử lý" />
        <StatCard title="Mail đã làm" value={stats.myMails || 0} icon={<Mail size={24} />} color="gold" subtitle="Số lượng trong ngày" />
        <StatCard title="Kênh đủ giờ" value={stats.mailWatchHours || 0} icon={<Target size={24} />} color="green" subtitle="Chỉ tiêu đạt được" />
      </div>

      <div className="bg-sidebar/80 border border-white/0 rounded-[40px] p-10 shadow-2xl backdrop-blur-md">
         <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
           <Zap size={24} className="text-gold" /> Nhiệm vụ hiện tại
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myTasks.length > 0 ? myTasks.map(task => (
              <div key={task.id || (task as any)._id} onClick={() => setSelectedStaffTask(task)} className="p-6 rounded-[32px] bg-white/5 border border-white/0 hover:border-gold/40 transition-all cursor-pointer group">
                 <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20"><Database size={20} /></div>
                    <Badge variant={task.status === 'COMPLETED' ? 'success' : 'warning'}>{task.status}</Badge>
                 </div>
                 <p className="text-lg font-bold text-white mb-1 group-hover:text-gold transition-colors">{task.title}</p>
                 <p className="text-xs text-gray-500 line-clamp-2 mb-6">{task.note}</p>
                 <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-2">
                    <div className="bg-gold h-full" style={{ width: `${task.progress}%` }} />
                 </div>
                 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tiến độ: {task.progress}%</span>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center opacity-30">
                 <ClipboardCheck size={48} className="mx-auto mb-4" />
                 <p className="text-sm font-bold uppercase tracking-widest">Không có nhiệm vụ nào</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
 }

 return (
  <div className="space-y-10 pb-24">
    {/* Admin Header */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
      <div>
        <h1 className="text-5xl font-black text-white uppercase tracking-tighter flex items-center gap-5">
          <Database className="text-gold" size={48} /> Dashboard Quản Trị
        </h1>
        <p className="text-gray-500 font-bold uppercase tracking-[0.3em] mt-2">Hệ thống vận hành AQ MEDIA - Live Monitoring</p>
      </div>
      <div className="flex gap-3 p-3 bg-sidebar/40 border border-white/5 rounded-[32px] backdrop-blur-md">
         <div className="px-8 border-r border-white/5 text-center">
            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Tổng Mail</p>
            <p className="text-2xl font-black text-white">{stats.totalMails?.toLocaleString() || 0}</p>
         </div>
         <div className="px-8 border-r border-white/5 text-center">
            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Nhân sự Online</p>
            <p className="text-2xl font-black text-green-400">{stats.onlineUsers || 0}</p>
         </div>
         <div className="px-8 text-center">
            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Quỹ Tiền Phạt</p>
            <p className="text-2xl font-black text-red-500">{stats.totalFines?.toLocaleString('vi-VN') || 0}đ</p>
         </div>
      </div>
    </div>

    {/* Primary Stats */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
       <StatCard title="Task Đang Chờ" value={stats.tasks?.pending || 0} icon={<Activity size={24} />} color="indigo" subtitle="Nhiệm vụ chưa hoàn thành" onClick={() => setSelectedViewType("TASKS")} />
       <StatCard title="Kênh Đã BKT" value={stats.monCount || 0} icon={<DollarSign size={24} />} color="gold" subtitle="Bật kiếm tiền thành công" onClick={() => router.push("/admin/mail/monetized")} />
       <StatCard title="Nhân Sự Active" value={stats.activeStaff || 0} icon={<Users size={24} />} color="purple" subtitle="Đội ngũ nhân sự" onClick={() => setSelectedViewType("STAFF")} />
       <StatCard title="Tài Khoản Die" value={stats.totalDie || 0} icon={<XCircle size={24} />} color="red" subtitle="Mail gặp lỗi hệ thống" onClick={() => setSelectedViewType("DIE")} />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
      {/* KPI Section */}
      <div className="xl:col-span-2 bg-sidebar/80 border border-white/0 rounded-[48px] p-12 shadow-2xl relative overflow-hidden group backdrop-blur-md">
        <div className="absolute top-0 right-0 h-80 w-80 bg-gold/5 blur-[120px] -mr-40 -mt-40 group-hover:bg-gold/10 transition-all" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
              <TrendingUp size={32} className="text-gold" /> Chỉ tiêu hệ thống
            </h2>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-2">Theo dõi công suất toàn công ty</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 bg-black/40 p-4 rounded-3xl border border-white/5">
             <div className="flex items-center gap-3">
               <Calendar size={16} className="text-gray-500" />
               <input type="date" value={kpi.startDate ||""} onChange={(e) => setKpi({...kpi, startDate: e.target.value})} className="bg-transparent text-white text-[10px] font-black outline-none" />
               <div className="h-4 w-px bg-white/10" />
               <input type="date" value={kpi.endDate ||""} onChange={(e) => setKpi({...kpi, endDate: e.target.value})} className="bg-transparent text-white text-[10px] font-black outline-none" />
             </div>
             <button onClick={handleSaveKPI} className="h-10 px-6 bg-gold hover:bg-gold-hover text-sidebar rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Lưu Mục Tiêu</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <KPIInputCard label="Kênh Bật Kiếm Tiền" target={kpi.targetMonetized} current={stats.monCount || 0} unit="kênh" onChange={(v:any) => setKpi({...kpi, targetMonetized: v})} />
          <KPIInputCard label="Kênh Đạt Giờ Xem" target={kpi.targetWatchHours} current={stats.satCount || 0} unit="kênh" onChange={(v:any) => setKpi({...kpi, targetWatchHours: v})} />
        </div>
      </div>

      {/* Side Alerts */}
      <div className="space-y-10">
         <div className="bg-sidebar/80 border border-white/0 rounded-[48px] p-10 shadow-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-red-500/5 blur-[60px] -mr-16 -mt-16" />
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <ShieldAlert className="text-red-500" size={24} /> Lệnh chờ duyệt
               </h3>
               <Badge variant="warning" className="h-6 px-3 font-black">{(pendingRequests || []).length}</Badge>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {pendingRequests.length > 0 ? pendingRequests.map(req => (
                <div key={req.id} className="p-6 rounded-[32px] bg-black/40 border border-white/0 hover:border-white/10 transition-all">
                   <div className="flex justify-between items-start mb-6">
                      <p className="font-black text-white text-base leading-none">{req.staffName}</p>
                      <span className="text-[10px] font-black text-gold uppercase">{req.time}</span>
                   </div>
                   <div className="flex gap-3">
                      <button onClick={() => handleApproveRequest(req)} className="flex-1 h-12 bg-green-500 hover:bg-green-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-green-500/20">Chấp thuận</button>
                      <button onClick={() => handleDenyRequest(req)} className="h-12 w-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><X size={20} /></button>
                   </div>
                </div>
              )) : (
                <div className="py-20 text-center opacity-30">
                   <CheckCircle2 size={40} className="mx-auto mb-4" />
                   <p className="text-xs font-black uppercase tracking-widest">Không có yêu cầu nào</p>
                </div>
              )}
            </div>
         </div>
      </div>
    </div>
  </div>
 );
}

function StatCard({ title, value, icon, color, subtitle, onClick }: any) {
 const colors: any = {
 blue:"text-blue-400 bg-blue-500/15 border-blue-500/30 group-hover:border-blue-500/60 group-hover:shadow-blue-500/20",
 green:"text-emerald-400 bg-emerald-500/15 border-emerald-500/30 group-hover:border-emerald-500/60 group-hover:shadow-emerald-500/20",
 red:"text-red-400 bg-red-500/15 border-red-500/30 group-hover:border-red-500/60 group-hover:shadow-red-500/20",
 gold:"text-amber-400 bg-amber-500/15 border-amber-500/30 group-hover:border-amber-500/60 group-hover:shadow-amber-500/20",
 purple:"text-purple-400 bg-purple-500/15 border-purple-500/30 group-hover:border-purple-500/60 group-hover:shadow-purple-500/20",
 indigo:"text-indigo-400 bg-indigo-500/15 border-indigo-500/30 group-hover:border-indigo-500/60 group-hover:shadow-indigo-500/20",
 };
 return (
 <motion.div 
 whileHover={{ y: -8, scale: 1.02 }} 
 onClick={onClick} 
 className={`group rounded-3xl border border-gray-700/50 bg-gradient-to-br from-gray-900/40 to-gray-800/20 backdrop-blur-lg p-8 transition-all duration-300 hover:shadow-2xl hover:border-gray-600/80 ${onClick ? 'cursor-pointer' : ''}`}
 >
 <div className="flex items-center justify-between mb-6">
 <div className={`h-16 w-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${colors[color] || colors.blue}`}>{icon}</div>
 <div className="text-right min-w-0 flex-1 ml-4">
 <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 truncate" title={title}>{title}</p>
 <h3 className="text-3xl xl:text-4xl font-bold text-white tracking-tight truncate" title={String(value)}>{typeof value ==="number" ? value.toLocaleString() : value}</h3>
 </div>
 </div>
 <div className="flex items-center justify-between pt-6 border-t border-gray-700/30 mt-2">
 <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-400 transition-colors uppercase tracking-wider">{subtitle}</span>
 <div className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)] animate-pulse" />
 </div>
 </motion.div>
 );
}

function KPIInputCard({ label, target, current, onChange, unit, readonly }: any) {
 const percent = Math.min(Math.round((current / (target || 1)) * 100) || 0, 100);
 return (
 <div className="flex flex-col space-y-6 h-full">
 <div className="flex items-end justify-between gap-4">
 <span className="text-lg font-black text-white uppercase tracking-tighter">{label}</span>
 <span className="text-sm font-black text-gold uppercase tracking-widest">{percent}%</span>
 </div>
 <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
 <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 1.5, ease:"circOut" }} className="absolute h-full bg-gradient-to-r from-gold/40 via-gold to-white/40 shadow-[0_0_20px_rgba(212,175,55,0.4)]" />
 </div>
 <div className="grid grid-cols-2 gap-6 mt-2">
 <div className="space-y-2">
 <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Đã đạt</label>
 <div className="h-14 w-full rounded-2xl bg-white/5 border border-white/0 flex items-center px-5 text-white font-black text-lg shadow-inner">{current.toLocaleString()} {unit}</div>
 </div>
 <div className="space-y-2">
 <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Mục tiêu</label>
 {readonly ? (
 <div className="h-14 w-full rounded-2xl bg-gold/5 border border-gold/10 px-5 flex items-center text-gold/40 font-black text-lg italic">{target?.toLocaleString()}</div>
 ) : (
 <input type="number" value={target ||""} onChange={(e) => { const val = e.target.value ==="" ? 0 : parseInt(e.target.value); onChange(val); }} className="h-14 w-full rounded-2xl bg-gold/10 border border-white/0 px-5 text-gold font-black focus:outline-none focus:border-gold text-lg transition-all shadow-xl shadow-gold/5" />
 )}
 </div>
 </div>
 </div>
 );
}
