"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Mail, DollarSign, ClipboardList, Calendar, Search, 
  ArrowLeft, CheckCircle2, Clock, Play, Loader2, RefreshCw, AlertTriangle
} from "lucide-react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/Badge";

// Helper components
function StatCard({ title, value, icon, color, subtitle }: any) {
  const colorMap: any = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    gold: "text-gold bg-gold/10 border-gold/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.01 }} 
      className="card-style flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-6">
        <div className={`h-14 w-14 rounded-xl border flex items-center justify-center transition-all duration-300 ${colorMap[color] || colorMap.gold}`}>
          {icon}
        </div>
        <div className="text-right min-w-0 flex-1 ml-4">
          <p className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest mb-1 truncate">{title}</p>
          <h3 className="text-3xl font-black text-white tracking-tighter truncate">
            {value}
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

export default function StaffDashboardClient({ user }: { user: any }) {
  const [taskSearch, setTaskSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const fetcherWithHeaders = useCallback(async (url: string) => {
    const res = await fetch(url, {
      headers: {
        "x-user-id": user?.id || user?._id || "",
        "x-user-role": user?.role || ""
      }
    });
    if (!res.ok) throw new Error("Failed to fetch data");
    return res.json();
  }, [user]);

  // SWR hooks for staff data
  const { data: statsData, error: statsError, isValidating: statsValidating } = useSWR(
    user ? "/api/admin/stats" : null,
    fetcherWithHeaders,
    { revalidateOnFocus: false, refreshInterval: 30000, dedupingInterval: 5000 }
  );

  const { data: tasksData, error: tasksError, isValidating: tasksValidating } = useSWR(
    user ? "/api/admin/tasks" : null,
    fetcherWithHeaders,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const { data: attendanceData, error: attendanceError, isValidating: attendanceValidating } = useSWR(
    user ? "/api/admin/attendance?history=true" : null,
    fetcherWithHeaders,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const handleRefresh = () => {
    mutate("/api/admin/stats");
    mutate("/api/admin/tasks");
    mutate("/api/admin/attendance?history=true");
  };

  const stats = statsData?.data || {};
  const tasksList = tasksData?.success ? tasksData.data : (Array.isArray(tasksData) ? tasksData : []);
  const attendanceHistory = attendanceData?.data || [];

  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasksList)) return [];
    return tasksList.filter((t: any) => 
      t.title?.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.batchName?.toLowerCase().includes(taskSearch.toLowerCase())
    );
  }, [tasksList, taskSearch]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success" className="rounded-sm">Hoàn thành</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="warning" className="rounded-sm">Đang làm</Badge>;
      case "PENDING":
        return <Badge variant="info" className="rounded-sm">Chờ xử lý</Badge>;
      case "OVERDUE":
        return <Badge variant="danger" className="rounded-sm">Quá hạn</Badge>;
      default:
        return <Badge className="rounded-sm">{status}</Badge>;
    }
  };

  const getAttendanceStatusBadge = (status: string) => {
    switch (status) {
      case "Đúng giờ":
        return <Badge variant="success" className="rounded-sm">Đúng giờ</Badge>;
      case "Đi muộn":
        return <Badge variant="danger" className="rounded-sm">Đi muộn</Badge>;
      case "Vắng mặt":
        return <Badge variant="default" className="rounded-sm">Vắng mặt</Badge>;
      default:
        return <Badge className="rounded-sm">{status}</Badge>;
    }
  };

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case "MAIL_GOC":
        return "Mail gốc";
      case "MAIL_VE_TINH":
        return "Mail vệ tinh";
      case "MAIL_MONETIZED":
        return "Mail kiếm tiền";
      default:
        return type;
    }
  };

  if (selectedTask) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedTask(null)} 
            className="h-10 w-10 bg-gold/10 rounded-sm flex items-center justify-center text-gold hover:bg-gold/20 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Chi tiết nhiệm vụ</h2>
            <p className="text-xs text-foreground-secondary uppercase tracking-widest">{selectedTask.title}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-style md:col-span-2 space-y-6">
            <div>
              <span className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest">Tiêu đề công việc</span>
              <h3 className="text-xl font-bold text-white mt-1">{selectedTask.title}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest">Loại mail</span>
                <p className="text-sm font-bold text-gold mt-1">{getTaskTypeLabel(selectedTask.type)}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest">Trạng thái</span>
                <div className="mt-1">{getStatusBadge(selectedTask.status)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest">Lô Mail / Batch</span>
                <p className="text-sm text-white font-mono mt-1">{selectedTask.batchName || "N/A"}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest">Dải Mail / Range</span>
                <p className="text-sm text-white font-mono mt-1">{selectedTask.mailRange || "N/A"}</p>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest">Ghi chú</span>
              <p className="text-sm text-white whitespace-pre-wrap mt-2 p-4 bg-white/5 border border-border rounded-md">
                {selectedTask.note || "Không có ghi chú nào từ quản lý."}
              </p>
            </div>
          </div>

          <div className="card-style space-y-6">
            <h4 className="text-sm font-black text-white uppercase tracking-widest border-b border-border pb-3">Thông tin bổ sung</h4>
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest block">Số lượng mail giao</span>
                <span className="text-2xl font-black text-white">{selectedTask.mailCount || 0} mail</span>
              </div>

              <div>
                <span className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest block">Hạn chót (Deadline)</span>
                <span className="text-sm font-bold text-red-400">
                  {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleString("vi-VN") : "N/A"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest block">Thời gian giao</span>
                <span className="text-xs text-white">
                  {selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleString("vi-VN") : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isLoading = statsValidating || tasksValidating || attendanceValidating;

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">BẢNG ĐIỀU KHIỂN CÁ NHÂN</h1>
          <p className="text-sm text-gold font-mono uppercase tracking-widest">Xin chào, {user?.name || "Nhân viên"}</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={isLoading}
          className="h-10 px-4 bg-white/5 border border-border text-foreground hover:bg-gold hover:text-background rounded-sm font-bold text-[10px] tracking-widest uppercase flex items-center gap-2 transition-all"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Làm mới
        </button>
      </div>

      {/* Stats cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Nhiệm vụ đang làm"
          value={stats.myTasks ?? 0}
          icon={<ClipboardList size={28} />}
          color="blue"
          subtitle="Task cần hoàn thành"
        />
        <StatCard 
          title="Tiền phạt chưa nộp"
          value={formatCurrency(stats.myFines || 0)}
          icon={<DollarSign size={28} />}
          color="red"
          subtitle="Khoản phạt phát sinh"
        />
        <StatCard 
          title="Mail đã làm hôm nay"
          value={stats.myMails ?? 0}
          icon={<Mail size={28} />}
          color="gold"
          subtitle="Năng suất hôm nay"
        />
        <StatCard 
          title="Điểm danh hôm nay"
          value={stats.checkInTime ? `Check-in: ${new Date(stats.checkInTime).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}` : "Chưa Check-in"}
          icon={<Calendar size={28} />}
          color={stats.checkInTime ? "green" : "purple"}
          subtitle={stats.checkOutTime ? `Check-out: ${new Date(stats.checkOutTime).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}` : "Đang làm việc"}
        />
      </div>

      {/* Mails status subgrid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-style !p-4 border border-emerald-500/10 bg-emerald-500/5 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black text-foreground-secondary uppercase tracking-widest">Mail Live</span>
            <p className="text-xl font-black text-emerald-400 mt-1">{stats.liveMails ?? 0}</p>
          </div>
          <div className="h-8 w-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            ✓
          </div>
        </div>
        <div className="card-style !p-4 border border-red-500/10 bg-red-500/5 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black text-foreground-secondary uppercase tracking-widest">Mail Die</span>
            <p className="text-xl font-black text-red-400 mt-1">{stats.dieMails ?? 0}</p>
          </div>
          <div className="h-8 w-8 rounded-md bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            ✗
          </div>
        </div>
      </div>

      {/* Main lists section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Task list section */}
        <div className="xl:col-span-2 card-style space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
            <h3 className="text-base font-black text-white uppercase tracking-widest">Danh sách nhiệm vụ</h3>
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-secondary w-4 h-4 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Tìm kiếm nhiệm vụ..." 
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-4 text-xs bg-background border border-border rounded-md text-white placeholder-foreground-secondary/70 focus:border-gold outline-none transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[9px] font-black uppercase text-foreground-secondary tracking-widest">
                  <th className="py-3 px-4">Tên nhiệm vụ</th>
                  <th className="py-3 px-4">Loại mail</th>
                  <th className="py-3 px-4 text-center">Số lượng</th>
                  <th className="py-3 px-4">Hạn chót</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task: any) => (
                    <tr key={task._id || task.id} className="hover:bg-white/5 transition-all group">
                      <td className="py-3.5 px-4 font-bold text-white max-w-[200px] truncate">
                        {task.title}
                        {task.batchName && (
                          <span className="block text-[10px] font-mono text-gold-dark mt-0.5">{task.batchName}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-foreground-secondary">{getTaskTypeLabel(task.type)}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-white">{task.mailCount || 0}</td>
                      <td className="py-3.5 px-4 text-foreground-secondary font-mono">
                        {task.deadline ? new Date(task.deadline).toLocaleDateString("vi-VN") : "N/A"}
                      </td>
                      <td className="py-3.5 px-4 text-center">{getStatusBadge(task.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button 
                          onClick={() => setSelectedTask(task)}
                          className="h-7 w-7 rounded-sm bg-gold/10 text-gold flex items-center justify-center hover:bg-gold hover:text-background transition-all"
                        >
                          <Play size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-foreground-secondary/50 uppercase tracking-widest font-black text-[10px]">
                      {tasksValidating ? "Đang tải dữ liệu..." : "Không có nhiệm vụ nào"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance history section */}
        <div className="card-style space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="text-base font-black text-white uppercase tracking-widest">Lịch sử điểm danh</h3>
            <p className="text-[10px] text-foreground-secondary uppercase tracking-widest mt-1">Gần đây (Tối đa 30 ngày)</p>
          </div>

          <div className="overflow-y-auto max-h-[350px] custom-scrollbar space-y-3 pr-1">
            {attendanceHistory.length > 0 ? (
              attendanceHistory.slice(0, 30).map((record: any, idx: number) => (
                <div key={record._id || idx} className="p-3 bg-white/5 border border-border/50 rounded-md flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-white">{record.date}</span>
                    <div className="flex gap-2.5 text-[9px] text-foreground-secondary">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock size={10} />
                        {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                      </span>
                      {record.checkOutTime && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock size={10} className="text-gray-500" />
                          {new Date(record.checkOutTime).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div>{getAttendanceStatusBadge(record.status)}</div>
                    {record.totalHours > 0 && (
                      <span className="block text-[9px] font-black font-mono text-gold-dark">{record.totalHours}h làm việc</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-foreground-secondary/40 font-black uppercase text-[10px] tracking-widest">
                {attendanceValidating ? "Đang tải dữ liệu..." : "Chưa có lịch sử điểm danh"}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
