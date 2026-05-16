"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ClipboardList, 
  Users, 
  Info, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Mail, 
  ExternalLink, 
  UserPlus, 
  Zap, 
  Target,
  Search,
  Filter,
  CheckCircle,
  MoreVertical
} from "lucide-react";
import { MOCK_STAFF, MOCK_TASK_ASSIGNMENTS, MOCK_MAILS } from "@/data/mockData";
import { StaffData, TaskAssignment } from "@/types/admin";

export default function TaskManagementPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState("ALL");
  const [staffList, setStaffList] = useState<StaffData[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskAssignment[]>(MOCK_TASK_ASSIGNMENTS);

  // Load staff from localStorage
  useEffect(() => {
    const loadData = () => {
      const stored = localStorage.getItem("global_users");
      let allUsers: StaffData[] = [];
      if (stored) {
        allUsers = JSON.parse(stored);
      } else {
        allUsers = MOCK_STAFF;
      }
      
      // Deduplicate by ID (Normalize to string to prevent numeric/string collisions)
      const uniqueUsers = allUsers.filter((item, index, self) =>
        index === self.findIndex((t) => String(t.id) === String(item.id))
      );

      // Chỉ lấy nhân viên đã ACTIVE
      setStaffList(uniqueUsers.filter((u: StaffData) => u.status === "ACTIVE"));
    };
    loadData();
    const interval = setInterval(loadData, 5000); // Sync data every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedTaskId && tasks.length > 0) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [tasks]);

  const selectedTask = useMemo(() => 
    tasks.find(t => t.id === selectedTaskId), 
  [selectedTaskId, tasks]);

  const filteredTasks = useMemo(() => {
    if (taskFilter === "ALL") return tasks;
    return tasks.filter(t => t.status === taskFilter);
  }, [taskFilter, tasks]);

  const handleAssignTask = (assigneeId: string) => {
    if (!selectedTaskId) return;
    setTasks(prev => prev.map(t => 
      t.id === selectedTaskId ? { ...t, assigneeId, status: "IN_PROGRESS" as any } : t
    ));
    setIsAssignModalOpen(false);
  };

  const getRoleLabel = (role?: string) => {
    if (role === "01") return "ADMIN";
    if (role === "02") return "QL CÔNG VIỆC";
    if (role === "03") return "QL NHÂN SỰ";
    if (role === "04") return "NHÂN VIÊN";
    return "NHÂN VIÊN";
  };

  const onlineStaff = useMemo(() => staffList.filter(s => s.isOnline), [staffList]);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Chia việc hệ thống</h1>
          <p className="text-gray-500 font-medium mt-1">Phân bổ nguồn lực cho đội ngũ nhân sự đang trực tuyến.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              // Auto assign logic: assign PENDING tasks to online staff with lowest workload
              const pendingTasks = tasks.filter(t => t.status === "PENDING");
              if (pendingTasks.length === 0 || onlineStaff.length === 0) return;
              
              setTasks(prev => prev.map(t => {
                if (t.status === "PENDING") {
                  const randomStaff = onlineStaff[Math.floor(Math.random() * onlineStaff.length)];
                  return { ...t, assigneeId: String(randomStaff.id), status: "IN_PROGRESS" as any };
                }
                return t;
              }));
            }}
            className="h-12 px-6 bg-gold hover:bg-gold/80 text-sidebar rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-gold/20"
          >
            <Zap size={18} strokeWidth={3} /> Auto Assign
          </button>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* Column 1: Tasks */}
        <div className="w-80 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <ClipboardList size={16} className="text-gold" /> Danh sách Task
            </h2>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
              <Filter size={12} className="text-gray-500 ml-1" />
              <select 
                className="bg-transparent border-none outline-none text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer"
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
              >
                <option value="ALL">Tất cả</option>
                <option value="PENDING">Chờ</option>
                <option value="IN_PROGRESS">Làm</option>
                <option value="COMPLETED">Xong</option>
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {filteredTasks.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                isActive={selectedTaskId === task.id} 
                onClick={() => setSelectedTaskId(task.id)} 
              />
            ))}
          </div>
        </div>

        {/* Column 2: Staff */}
        <div className="w-72 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Users size={16} className="text-gold" /> Nhân sự khả dụng
            </h2>
            <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-tighter">
              {onlineStaff.length} Online
            </span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {staffList.length > 0 ? staffList.map((staff) => (
              <StaffSmallCard key={String(staff.id)} staff={staff} roleLabel={getRoleLabel(staff.role)} />
            )) : (
              <div className="text-center py-10 opacity-20">
                <Users size={40} className="mx-auto mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">Không có nhân sự</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Task Details */}
        <div className="flex-1 bg-sidebar border border-border-custom rounded-[40px] shadow-2xl flex flex-col overflow-hidden relative group">
          <div className="absolute top-0 right-0 h-64 w-64 bg-gold/5 blur-[100px] -mr-32 -mt-32" />
          
          {selectedTask ? (
            <>
              <div className="p-8 border-b border-white/5 relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20 shadow-lg">
                      <Target size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tighter uppercase">{selectedTask.title}</h2>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                          <Clock size={12} /> Deadline: {selectedTask.deadline}
                        </span>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                          <Mail size={12} /> {selectedTask.mailCount} Mail
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsAssignModalOpen(true)}
                      className="h-10 px-5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs uppercase tracking-widest border border-white/10 transition-all flex items-center gap-2"
                    >
                      <UserPlus size={16} /> Giao việc
                    </button>
                    <button 
                      onClick={() => {
                        setTasks(prev => prev.map(t => 
                          t.id === selectedTaskId ? { ...t, status: "COMPLETED" as any, progress: 100 } : t
                        ));
                      }}
                      className="h-10 px-5 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest border border-green-500/20 transition-all flex items-center gap-2"
                    >
                      <CheckCircle size={16} /> Hoàn thành
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-black/20 p-4 rounded-3xl border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Tiến độ tổng thể</p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${selectedTask.progress}%` }} className="h-full bg-gold rounded-full shadow-[0_0_10px_#d4af37]" />
                      </div>
                      <span className="text-sm font-black text-white">{selectedTask.progress}%</span>
                    </div>
                  </div>
                  <div className="bg-black/20 p-4 rounded-3xl border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Người phụ trách</p>
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-gold/20 flex items-center justify-center text-[10px] font-black text-gold uppercase">
                        {staffList.find(s => s.id === selectedTask.assigneeId)?.name.charAt(0) || "?"}
                      </div>
                      <span className="text-sm font-black text-white truncate max-w-[120px]">
                        {staffList.find(s => s.id === selectedTask.assigneeId)?.name || "Chưa giao"}
                      </span>
                    </div>
                  </div>
                  <div className="bg-black/20 p-4 rounded-3xl border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Trạng thái</p>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${
                      selectedTask.status === "COMPLETED" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                      selectedTask.status === "IN_PROGRESS" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                      selectedTask.status === "OVERDUE" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                      "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    }`}>
                      {selectedTask.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar p-0">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#0a0a0a] z-20">
                    <tr className="border-b border-white/5 uppercase text-[10px] font-black tracking-widest text-gray-500">
                      <th className="px-8 py-4">Email</th>
                      <th className="px-6 py-4">Loại Mail</th>
                      <th className="px-6 py-4">Trạng thái</th>
                      <th className="px-8 py-4 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {MOCK_MAILS
                      .filter(m => {
                        if (selectedTask?.type === "MAIL_VE_TINH") return m.type === "SATELLITE";
                        if (selectedTask?.type === "MAIL_MONETIZED") return m.type === "MONETIZED";
                        if (selectedTask?.type === "MAIL_GOC") return m.type === "ROOT";
                        return true;
                      })
                      .slice(0, 10).map((mail, i) => (
                      <tr key={i} className="group hover:bg-white/[0.01] transition-all">
                        <td className="px-8 py-4">
                          <p className="text-sm font-bold text-white group-hover:text-gold transition-colors">{mail.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{mail.type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`h-2 w-2 rounded-full ${mail.status === "LIVE" ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"}`} />
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button className="h-8 w-8 rounded-lg bg-white/5 text-gray-500 hover:text-gold hover:bg-gold/10 flex items-center justify-center transition-all"><ExternalLink size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-20">
              <Info size={80} strokeWidth={1} />
              <h3 className="text-2xl font-black uppercase tracking-tighter mt-4">Chọn Task để xem chi tiết</h3>
            </div>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAssignModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#161616] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden p-10"
            >
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mb-6">
                  <UserPlus size={32} className="text-gold" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Giao việc nhân sự</h3>
                <p className="text-gray-400 font-medium text-xs leading-relaxed italic">Chỉ nhân viên đang trực tuyến mới xuất hiện trong danh sách này.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block ml-1 mb-2">Chọn nhân viên phụ trách</label>
                  <div className="relative group">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={18} />
                    <select 
                      id="assignee-select"
                      className="h-14 w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 text-sm text-white font-bold outline-none focus:border-gold transition-all appearance-none cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled>-- Chọn người phụ trách --</option>
                      {onlineStaff.length > 0 ? onlineStaff.map(s => (
                        <option key={String(s.id)} value={s.id} className="bg-sidebar py-2">
                           🟢 {s.name} ({getRoleLabel(s.role)})
                        </option>
                      )) : (
                        <option value="" disabled>Không có nhân viên online để chia việc</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsAssignModalOpen(false)}
                    className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    disabled={onlineStaff.length === 0}
                    onClick={() => {
                      const select = document.getElementById("assignee-select") as HTMLSelectElement;
                      if (select.value) handleAssignTask(select.value);
                    }}
                    className="flex-1 h-14 rounded-2xl bg-gold text-sidebar font-black uppercase text-[10px] tracking-widest hover:bg-gold-hover transition-all shadow-lg shadow-gold/20 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskCard({ task, isActive, onClick }: any) {
  const statusConfig: any = {
    PENDING: { icon: <Clock size={14} />, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
    IN_PROGRESS: { icon: <Loader2 size={14} className="animate-spin" />, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    COMPLETED: { icon: <CheckCircle2 size={14} />, color: "text-green-500 bg-green-500/10 border-green-500/20" },
    OVERDUE: { icon: <AlertCircle size={14} />, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`p-5 rounded-[28px] border cursor-pointer transition-all ${
        isActive ? "bg-gold/10 border-gold shadow-2xl shadow-gold/5" : "bg-sidebar border-white/5 hover:border-gold/30"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${statusConfig[task.status].color}`}>
          {statusConfig[task.status].icon} {task.status}
        </span>
        <span className="text-[10px] font-black text-gray-500">{task.mailCount} Mail</span>
      </div>
      <h3 className={`text-sm font-black leading-tight mb-4 ${isActive ? "text-white" : "text-gray-300"}`}>{task.title}</h3>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
          <span>Tiến độ</span>
          <span className={isActive ? "text-gold" : ""}>{task.progress}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${task.progress}%` }} className={`h-full rounded-full ${isActive ? "bg-gold" : "bg-gray-600"}`} />
        </div>
      </div>
    </motion.div>
  );
}

function StaffSmallCard({ staff, roleLabel }: any) {
  return (
    <div className="p-4 rounded-3xl bg-sidebar border border-white/5 group hover:border-gold/30 transition-all flex items-center justify-between">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="relative shrink-0">
          <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-xs font-black text-gray-400 group-hover:bg-gold/10 group-hover:text-gold transition-all">
            {staff.avatar ? <img src={staff.avatar} className="w-full h-full object-cover rounded-xl" /> : staff.name.charAt(0)}
          </div>
          <div className={`absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-sidebar ${staff.isOnline ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"}`} />
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-black text-white group-hover:text-gold transition-colors truncate">{staff.name}</p>
          <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5 truncate">{roleLabel}</p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Tải việc</p>
        <p className={`text-xs font-black ${staff.taskCount > 10 ? "text-red-500" : staff.taskCount > 5 ? "text-gold" : "text-green-500"}`}>
          {Math.min(100, Math.round(staff.taskCount * 8.5))}%
        </p>
      </div>
    </div>
  );
}
