"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  ExternalLink,
  Zap,
  Target,
  Filter,
  GripVertical,
  ShieldCheck,
  TrendingUp,
  LayoutGrid,
  Activity,
  MoreVertical,
  Plus,
  X,
  Play,
  Save,
  Trash2,
  RefreshCcw,
  Check,
  ChevronLeft,
  ArrowRight,
  Calendar,
  Search,
  Link as LinkIcon,
  MessageSquare,
  Bell,
  Hash,
  ArrowRightLeft,
  Database
} from "lucide-react";

import { MOCK_STAFF, MOCK_TASK_ASSIGNMENTS, MOCK_MAILS } from "@/data/mockData";
import { StaffData, TaskAssignment } from "@/types/admin";
import { useRouter } from "next/navigation";

// --- Types & Constants ---
const WORK_STATUSES = [
  { id: "CHUA_LAM_KENH", label: "Chưa làm kênh", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  { id: "DA_LAM_KENH", label: "Đã làm kênh", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  { id: "CHUA_MOI_MAIL", label: "Chưa mời mail", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  { id: "DA_MOI_MAIL", label: "Đã mời mail", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { id: "LOI", label: "Lỗi", color: "bg-red-500/10 text-red-500 border-red-500/20" },
];

// --- Static Sub-Components (Defined outside to prevent flickering) ---

const TaskCard = React.memo(({ task, onClick }: { task: TaskAssignment, onClick: () => void }) => {
  const statusConfig: any = {
    PENDING: { icon: <Clock size={16} />, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20", label: "Đang chờ" },
    IN_PROGRESS: { icon: <Loader2 size={16} className="animate-spin" />, color: "text-blue-400 bg-blue-500/10 border-blue-500/20", label: "Đang thực hiện" },
    COMPLETED: { icon: <CheckCircle2 size={16} />, color: "text-green-500 bg-green-500/10 border-green-500/20", label: "Hoàn thành" },
    OVERDUE: { icon: <AlertCircle size={16} />, color: "text-red-500 bg-red-500/10 border-red-500/20", label: "Trễ hạn" },
  };

  const typeLabel = task.type === "MAIL_VE_TINH" ? "Vệ tinh" : task.type === "MAIL_MONETIZED" ? "Kiếm tiền" : "Gốc";

  return (
    <motion.div
      onClick={onClick}
      className="group relative bg-white/[0.02] border border-white/5 rounded-[32px] p-6 cursor-pointer transition-all hover:bg-gold/5 hover:border-gold/30 flex flex-col h-full shadow-2xl overflow-hidden"
    >
      <div className="absolute top-0 right-0 h-32 w-32 bg-gold/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-gold/10 transition-colors" />
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${statusConfig[task.status].color}`}>
          {statusConfig[task.status].icon} {statusConfig[task.status].label}
        </div>
        <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gold opacity-0 group-hover:opacity-100 transition-all">
          <ArrowRight size={20} />
        </div>
      </div>

      <h3 className="text-xl font-black text-white group-hover:text-gold transition-colors mb-4 line-clamp-2 leading-tight uppercase tracking-tighter relative z-10">
        {task.title}
      </h3>

      <div className="mt-auto pt-6 border-t border-white/5 space-y-4 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{typeLabel}</span>
          <span className="text-xs font-bold text-white flex items-center gap-2">
            <Mail size={14} className="text-gold" /> {task.mailCount} Mail
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-500">
            <span>Tiến độ hoàn thành</span>
            <span>{task.progress}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${task.progress}%` }} className="h-full bg-gradient-to-r from-gold/40 to-gold rounded-full" />
          </div>
        </div>
      </div>
    </motion.div>
  );
});

TaskCard.displayName = "TaskCard";

const AssignWorkModal = ({ staff, assigner, onClose, onSubmit }: { staff: StaffData, assigner: any, onClose: () => void, onSubmit: (type: string, start: number, end: number, note: string) => void }) => {
  const isStaff = (staff.role as any) === "04" || (staff.role as any) === "NHÂN VIÊN";
  const isManager = (staff.role as any) === "02" || (staff.role as any) === "QUẢN LÝ CÔNG VIỆC";

  const [mailType, setMailType] = useState(isStaff ? "SATELLITE" : "ROOT");
  const [startIdx, setStartIdx] = useState(1);
  const [endIdx, setEndIdx] = useState(10);
  const [note, setNote] = useState("");

  const [inventory, setInventory] = useState({ root: 0, satellite: 0, monetized: 0 });
  const currentMax = mailType === "ROOT" ? inventory.root : mailType === "SATELLITE" ? inventory.satellite : inventory.monetized;
  
  // Tổng số lượng dựa trên khoảng STT
  const total = (startIdx > 0 && endIdx >= startIdx && endIdx <= currentMax) ? (endIdx - startIdx + 1) : 0;

  useEffect(() => {
    const saved = localStorage.getItem("global_mails_data");
    const allMails = saved ? JSON.parse(saved) : MOCK_MAILS;
    setInventory({
      root: allMails.filter((m: any) => m.type === "ROOT" && !m.assigneeId).length,
      satellite: allMails.filter((m: any) => m.type === "SATELLITE" && !m.assigneeId).length,
      monetized: allMails.filter((m: any) => m.type === "MONETIZED" && !m.assigneeId).length,
    });
  }, []);

  const handleIndexChange = (setter: (v: number) => void, val: string) => {
    if (val === "") { setter(0); return; }
    const num = Math.floor(Math.abs(parseInt(val)));
    setter(num);
  };

  const allowedTypes = [
    { id: "ROOT", label: "Mail Gốc", icon: <Database size={24} />, count: inventory.root, allowed: isManager || (!isStaff && !isManager) },
    { id: "SATELLITE", label: "Vệ Tinh", icon: <Zap size={24} />, count: inventory.satellite, allowed: isStaff || (!isStaff && !isManager) },
    { id: "MONETIZED", label: "Kiếm Tiền", icon: <Mail size={24} />, count: inventory.monetized, allowed: isManager || (!isStaff && !isManager) },
  ].filter(t => t.allowed);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-sidebar border border-white/10 w-full max-w-2xl rounded-[56px] p-10 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col max-h-[96vh]">
        <div className="absolute top-0 right-0 h-96 w-96 bg-gold/5 blur-[120px] -mr-48 -mt-48" />

        {/* Header nén lại để tiết kiệm diện tích */}
        <div className="flex items-start justify-between mb-6 relative z-10">
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Phân công công việc</h2>
            <div className="mt-2 inline-flex items-center gap-2 bg-gold/10 border border-gold/20 px-3 py-1 rounded-full">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Người giao:</span>
              <span className="text-[9px] text-gold font-black uppercase tracking-widest">{assigner?.name || "NGUYỄN ADMIN"}</span>
            </div>
          </div>
          <button onClick={onClose} className="h-12 w-12 bg-white/5 rounded-full flex items-center justify-center text-gray-500 hover:text-white border border-white/10 transition-all"><X size={24} /></button>
        </div>

        <div className="space-y-5 relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {/* Nhân viên nhận việc */}
          <div className="p-6 bg-white/[0.04] border border-white/10 rounded-[32px] flex items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shadow-lg">
              <Users size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Nhân viên nhận việc</p>
              <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">{staff.name} ({isStaff ? "NHÂN VIÊN" : isManager ? "QUẢN LÝ CV" : "VAI TRÒ KHÁC"})</h3>
            </div>
          </div>

          {/* Chọn Loại Mail */}
          <div className="grid grid-cols-3 gap-4">
            {allowedTypes.map((t) => (
              <button 
                key={t.id}
                onClick={() => { setMailType(t.id); setStartIdx(1); setEndIdx(Math.min(10, t.count)); }}
                className={`p-5 rounded-[32px] border-2 transition-all flex flex-col items-center gap-2 ${mailType === t.id ? "bg-gold/10 border-gold shadow-[0_0_30px_rgba(212,175,55,0.15)]" : "bg-white/5 border-white/5 hover:border-white/10"}`}
              >
                <div className={`${mailType === t.id ? "text-gold" : "text-gray-500"}`}>{t.icon}</div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${mailType === t.id ? "text-white" : "text-gray-500"}`}>{t.label}</span>
                <span className="text-[9px] font-bold text-gray-600">Kho: {t.count}</span>
              </button>
            ))}
          </div>

          {/* Cấu hình STT */}
          <div className="bg-white/[0.04] border border-white/10 rounded-[40px] p-8 shadow-inner">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-2.5 w-2.5 bg-gold rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
              <h4 className="text-base font-black text-white uppercase tracking-widest">Chọn dải Mail thực hiện</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Bắt đầu (STT)</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    value={startIdx || ""} 
                    onChange={(e) => handleIndexChange(setStartIdx, e.target.value)}
                    className="w-full h-20 bg-black/40 border border-white/10 rounded-3xl px-8 text-4xl text-white font-black focus:border-gold outline-none transition-all shadow-2xl"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-gold/30">FROM</div>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Kết thúc (STT)</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    value={endIdx || ""} 
                    onChange={(e) => handleIndexChange(setEndIdx, e.target.value)}
                    className={`w-full h-20 bg-black/40 border rounded-3xl px-8 text-4xl font-black focus:border-gold outline-none transition-all shadow-2xl ${endIdx > currentMax ? "border-red-500 text-red-500" : "border-white/10 text-white"}`}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-gold/30 uppercase">To {currentMax}</div>
                </div>
              </div>
            </div>

            {/* Preview Box */}
            <div className={`mt-10 p-6 rounded-[32px] border-2 border-dashed transition-all flex items-center justify-between ${total > 0 ? "border-gold/30 bg-gold/5" : "border-red-500/20 bg-red-500/5"}`}>
              <div className="flex items-center gap-5">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg ${total > 0 ? "bg-gold text-sidebar" : "bg-red-500 text-white"}`}>
                  <Mail size={32} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1.5">Số lượng phân bổ</p>
                  <p className={`text-4xl font-black leading-none ${total > 0 ? "text-white" : "text-red-500"}`}>{total} <span className="text-xs uppercase ml-1 opacity-40">Acc</span></p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1.5 text-right">Phạm vi STT chọn</p>
                <p className={`text-lg font-black tracking-tighter ${total > 0 ? "text-gold" : "text-red-500/60"}`}>
                  {total > 0 ? `${startIdx} ➜ ${endIdx}` : "Dải số không hợp lệ"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Yêu cầu thực hiện (Ghi chú)</label>
            <textarea 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              placeholder="Ví dụ: Check kỹ bảo mật, đổi pass sau khi login..." 
              className="w-full h-24 bg-white/[0.02] border border-white/10 rounded-[32px] p-6 text-sm text-white outline-none focus:border-gold transition-all resize-none shadow-inner" 
            />
          </div>
        </div>

        <button
          disabled={total <= 0 || endIdx > currentMax}
          onClick={() => onSubmit(mailType, startIdx, endIdx, note)}
          className={`w-full h-20 rounded-[32px] font-black uppercase text-base tracking-[0.4em] shadow-2xl transition-all flex items-center justify-center gap-5 mt-8 flex-shrink-0 ${total > 0 && endIdx <= currentMax ? "bg-gold hover:bg-gold-hover text-sidebar shadow-gold/40 active:scale-95" : "bg-white/5 text-gray-600 cursor-not-allowed shadow-none"}`}
        >
          {total > 0 && endIdx <= currentMax ? "Xác nhận giao việc" : "Kiểm tra lại dải STT"} <Check size={28} />
        </button>
      </motion.div>
    </motion.div>
  );
};

const ConfigChannelModal = ({ mail, onClose, onSave }: { mail: any, onClose: () => void, onSave: (links: string[]) => void }) => {
  const [links, setLinks] = useState<string[]>(mail?.links || mail?.channelLinks || ["", "", ""]);
  const [names, setNames] = useState<string[]>(mail?.channelNames || ["", "", ""]);
  const [scanning, setScanning] = useState<boolean[]>([false, false, false]);

  const handleLinkPaste = (idx: number, val: string) => {
    const nl = [...links]; 
    nl[idx] = val; 
    setLinks(nl);
    if (val.trim()) {
      const ns = [...scanning];
      ns[idx] = true;
      setScanning(ns);

      const nNames = [...names];
      nNames[idx] = "Đang quét thông tin kênh...";
      setNames(nNames);

      setTimeout(() => {
        const finalScanning = [...scanning];
        finalScanning[idx] = false;
        setScanning(finalScanning);

        const finalNames = [...names];
        const mockNames = [
          "AQ Vlogs Premium",
          "AQ Media Official",
          "Thế Giới Công Nghệ AQ",
          "Ẩm Thực Ba Miền",
          "Góc Thư Giãn Daily",
          "Kênh Chia Sẻ Kiến Thức"
        ];
        finalNames[idx] = `Tên kênh: ${mockNames[Math.floor(Math.random() * mockNames.length)]}`;
        setNames(finalNames);
      }, 1000);
    } else {
      const nNames = [...names];
      nNames[idx] = "";
      setNames(nNames);
    }
  };

  const handleSave = () => {
    onSave(links);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-sidebar border border-white/10 w-full max-w-xl rounded-[40px] p-10 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20"><Play size={28} /></div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Cấu hình liên kết Kênh</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{mail?.email}</p>
          </div>
        </div>
        <div className="space-y-6">
          {[0, 1, 2].map(idx => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Link YouTube {idx + 1}</label>
                {names[idx] && (
                  <span className="text-[11px] font-black text-gold uppercase flex items-center gap-2">
                    {names[idx]}
                  </span>
                )}
              </div>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-gold transition-colors">
                  <LinkIcon size={18} />
                </div>
                <input 
                  value={links[idx] || ""} 
                  onChange={(e) => handleLinkPaste(idx, e.target.value)} 
                  placeholder="Dán link channel YouTube..." 
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-white text-sm outline-none focus:border-gold/50" 
                />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 mt-10">
          <button onClick={onClose} className="h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Hủy</button>
          <button onClick={handleSave} className="h-14 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">Lưu cập nhật</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Main Page ---
export default function TaskManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [staffList, setStaffList] = useState<StaffData[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState("ALL");
  const [notification, setNotification] = useState<string | null>(null);

  const [mails, setMails] = useState<any[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStaffToAssign, setSelectedStaffToAssign] = useState<StaffData | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedMailForConfig, setSelectedMailForConfig] = useState<any>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    const loadData = () => {
      const savedTasks = localStorage.getItem("global_tasks_data");
      setTasks(savedTasks ? JSON.parse(savedTasks) : MOCK_TASK_ASSIGNMENTS);

      const stored = localStorage.getItem("global_users");
      const allUsers = stored ? JSON.parse(stored) : MOCK_STAFF;
      // Exclude ADMIN (01) from assignment list
      setStaffList(allUsers.filter((u: StaffData) => u.status === "ACTIVE" && u.isOnline && u.role !== "01"));

      const savedMails = localStorage.getItem("global_mails_data");
      setMails(savedMails ? JSON.parse(savedMails) : MOCK_MAILS);
    };
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const isAdminOrManager = user?.role === "01" || user?.role === "02";

  const filteredStaff = useMemo(() => {
    return staffList.filter(staff => {
      const matchesSearch =
        staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (staff.phone && staff.phone.includes(searchQuery));

      const matchesRole = roleFilter === "ALL" || staff.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [staffList, searchQuery, roleFilter]);

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter]);

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStaff.slice(start, start + itemsPerPage);
  }, [filteredStaff, currentPage]);

  const userTasks = useMemo(() => {
    if (isAdminOrManager) return tasks;
    return tasks.filter(t => String(t.assigneeId) === String(user?.id));
  }, [tasks, user, isAdminOrManager]);

  const filteredTasks = useMemo(() => {
    let result = userTasks;
    if (taskFilter !== "ALL") result = result.filter(t => t.status === taskFilter);
    return result;
  }, [taskFilter, userTasks]);

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId), [selectedTaskId, tasks]);

  const taskMails = useMemo(() => {
    if (!selectedTask) return [];
    
    let mailType = "ROOT";
    if (selectedTask.type === "MAIL_VE_TINH") mailType = "SATELLITE";
    if (selectedTask.type === "MAIL_MONETIZED") mailType = "MONETIZED";

    let filtered = mails.filter(m => m.type === mailType && m.assigneeId);

    if (user?.role === "04") {
      filtered = filtered.filter(m => String(m.assigneeId) === String(user.id));
    }

    return filtered;
  }, [mails, selectedTask, user]);

  // --- Logic Functions ---
  const handleStatusChange = useCallback((mailId: number, newStatus: string) => {
    const savedMails = localStorage.getItem("global_mails_data");
    let allMails = savedMails ? JSON.parse(savedMails) : MOCK_MAILS;

    allMails = allMails.map((m: any) => {
      if (m.id === mailId) {
        return { ...m, workStatus: newStatus };
      }
      return m;
    });

    localStorage.setItem("global_mails_data", JSON.stringify(allMails));
    setMails(allMails);

    if (selectedTask) {
      let mailType = "ROOT";
      if (selectedTask.type === "MAIL_VE_TINH") mailType = "SATELLITE";
      if (selectedTask.type === "MAIL_MONETIZED") mailType = "MONETIZED";

      const taskMailsList = allMails.filter((m: any) => m.type === mailType && m.assigneeId);
      const totalTaskMails = taskMailsList.length;
      
      if (totalTaskMails > 0) {
        const completedCount = taskMailsList.filter((m: any) => m.workStatus === "DA_LAM_KENH" || m.workStatus === "DA_MOI_MAIL").length;
        const progressPercent = Math.round((completedCount / totalTaskMails) * 100);

        const savedTasks = localStorage.getItem("global_tasks_data");
        let allTasks = savedTasks ? JSON.parse(savedTasks) : MOCK_TASK_ASSIGNMENTS;

        allTasks = allTasks.map((t: any) => {
          if (t.id === selectedTask.id) {
            return { 
              ...t, 
              progress: progressPercent,
              status: progressPercent === 100 ? "COMPLETED" : (progressPercent > 0 ? "IN_PROGRESS" : "PENDING")
            };
          }
          return t;
        });

        localStorage.setItem("global_tasks_data", JSON.stringify(allTasks));
        setTasks(allTasks);
      }
    }

    setNotification("Đã cập nhật trạng thái và đồng bộ tiến độ.");
    setTimeout(() => setNotification(null), 3000);
    window.dispatchEvent(new Event('storage'));
  }, [selectedTask, tasks]);

  const handleSaveChannels = useCallback((mailId: number, links: string[]) => {
    const savedMails = localStorage.getItem("global_mails_data");
    const currentMails = savedMails ? JSON.parse(savedMails) : MOCK_MAILS;

    const updatedMails = currentMails.map((m: any) => {
      if (m.id === mailId) {
        return {
          ...m,
          channelLinks: links,
          links: links,
          channelNames: links.map((lnk: string, idx: number) => lnk.trim() ? `Kênh #${idx + 1}` : ""),
          channelStatus: links.filter(l => l.trim()).join(", ") || m.channelStatus
        };
      }
      return m;
    });

    localStorage.setItem("global_mails_data", JSON.stringify(updatedMails));
    setMails(updatedMails);
    setNotification("Đã lưu liên kết kênh YouTube thành công.");
    setTimeout(() => setNotification(null), 3000);
    window.dispatchEvent(new Event("storage"));
  }, []);

  const handleAssignWork = useCallback((staff: StaffData) => {
    setSelectedStaffToAssign(staff);
    setIsAssignModalOpen(true);
  }, []);

  const submitAssignment = useCallback((type: string, start: number, end: number, note: string) => {

    // 1. Cập nhật dữ liệu mail trong localStorage
    const savedMails = localStorage.getItem("global_mails_data");
    let allMails = savedMails ? JSON.parse(savedMails) : MOCK_MAILS;

    // Lấy danh sách mail theo loại (bao gồm cả đã giao để tính đúng STT tuyệt đối)
    const mailsOfType = allMails.filter((m: any) => m.type === type);
    
    // Gắn STT giả định để tìm đúng mail theo dải người dùng nhập
    const mailsWithSTT = mailsOfType.map((m: any, idx: number) => ({ ...m, currentSTT: idx + 1 }));

    // Lấy danh sách ID của những mail nằm trong dải STT và CHƯA được giao
    const assignedIds = mailsWithSTT
      .filter((m: any) => m.currentSTT >= start && m.currentSTT <= end && !m.assigneeId)
      .map((m: any) => m.id);

    if (assignedIds.length === 0) {
      alert("Dải STT này không chứa mail nào khả dụng (có thể đã được giao trước đó).");
      return;
    }

    const total = assignedIds.length;

    // Cập nhật lại danh sách tổng
    allMails = allMails.map((m: any) => {
      if (assignedIds.includes(m.id)) {
        return {
          ...m,
          assigneeId: selectedStaffToAssign?.id,
          assigneeName: selectedStaffToAssign?.name,
          assignedAt: new Date().toISOString(),
          assignmentNote: note,
          workStatus: "CHƯA LÀM"
        };
      }
      return m;
    });

    localStorage.setItem("global_mails_data", JSON.stringify(allMails));

    // 2. Tạo một task mới trong danh sách task nếu cần, hoặc cập nhật task tổng
    // Ở đây ta có thể giả định task-1 là task tổng để điều phối

    setNotification(`Đã giao ${total} mail cho ${selectedStaffToAssign?.name}. Kho mail đã được cập nhật.`);
    setTimeout(() => setNotification(null), 5000);
    setIsAssignModalOpen(false);
    setSelectedStaffToAssign(null);

    // Kích hoạt sự kiện storage để các tab khác (Dashboard) cập nhật
    window.dispatchEvent(new Event('storage'));
  }, [selectedStaffToAssign]);

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4 select-none relative overflow-hidden">
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -50, x: "-50%" }} animate={{ opacity: 1, y: 30, x: "-50%" }} exit={{ opacity: 0, y: -50, x: "-50%" }} className="fixed top-0 left-1/2 z-[500] bg-gold text-sidebar px-8 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 font-black text-sm uppercase tracking-widest border border-white/20">
            <CheckCircle2 size={24} className="animate-bounce" />{notification}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAssignModalOpen && selectedStaffToAssign && (
          <AssignWorkModal
            staff={selectedStaffToAssign}
            assigner={user}
            onClose={() => setIsAssignModalOpen(false)}
            onSubmit={submitAssignment}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isConfigModalOpen && selectedMailForConfig && (
          <ConfigChannelModal 
            mail={selectedMailForConfig} 
            onClose={() => setIsConfigModalOpen(false)} 
            onSave={(links) => handleSaveChannels(selectedMailForConfig.id, links)}
          />
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-6">
          {selectedTaskId && (
            <button onClick={() => setSelectedTaskId(null)} className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-gold hover:border-gold/30 transition-all shadow-xl">
              <ChevronLeft size={28} />
            </button>
          )}
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
              <ClipboardList className="text-gold" size={36} />
              {selectedTaskId === "task-1" ? "Giao việc Check/Xóa/Tạo" : selectedTaskId ? "Chi tiết thực hiện" : "Danh sách việc làm"}
            </h1>
            <p className="text-gray-500 font-medium mt-1 flex items-center gap-2">
              <ShieldCheck size={16} className="text-gold" />
              {selectedTaskId === "task-1" ? "Chọn nhân sự online để điều phối lô mail mới." : selectedTaskId ? `Nhiệm vụ: ${selectedTask?.title}` : "Hệ thống quản lý và điều phối luồng công việc tự động."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!selectedTaskId && (
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
              <Filter size={16} className="text-gray-500 ml-4" />
              <select className="bg-transparent border-none outline-none text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 h-12 min-w-[180px] cursor-pointer" value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)}>
                <option value="ALL">Tất cả nhiệm vụ</option>
                <option value="PENDING">Chưa bắt đầu</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
                <option value="COMPLETED">Đã hoàn thành</option>
              </select>
            </div>
          )}
          {!selectedTaskId && <button onClick={() => { setNotification("Đang chạy thuật toán tự động chia việc..."); setTimeout(() => setNotification(null), 3000); }} className="h-14 px-6 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase text-xs flex items-center gap-2 hover:bg-white/10 transition-all"><Zap size={18} /> Auto Assign</button>}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedTaskId ? (
            <motion.div key="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-10">
                {filteredTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />)}
              </div>
            </motion.div>
          ) : selectedTaskId === "task-1" ? (
            <motion.div key="staff-grid" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1 flex flex-col gap-4 overflow-hidden">
               {/* Header Section - Redesigned for horizontal layout */}
               <div className="bg-white/[0.02] border border-white/10 p-5 md:p-6 rounded-[32px] flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-1.5 bg-gold rounded-full shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
                      <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Nhân sự đang Online</h2>
                        <p className="text-[9px] font-bold text-gray-500 mt-1.5 uppercase tracking-[0.2em]">Chọn một nhân viên để bắt đầu giao lô mail mới.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20 self-start sm:self-center">
                      <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                      <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">{filteredStaff.length} Nhân viên sẵn sàng</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    {/* Search Bar */}
                    <div className="relative flex-1 w-full group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={18} />
                      <input 
                        type="text" 
                        placeholder="Tìm tên, SĐT, User..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-sm text-white focus:border-gold/50 outline-none transition-all shadow-inner"
                      />
                    </div>

                    {/* Role Filter */}
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 w-full md:w-auto">
                      <ShieldCheck size={16} className="text-gray-500 ml-4" />
                      <select 
                        className="bg-transparent border-none outline-none text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 h-12 min-w-[150px] cursor-pointer flex-1 md:flex-none"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                      >
                        <option value="ALL">Tất cả chức vụ</option>
                        <option value="02">QL CÔNG VIỆC</option>
                        <option value="03">QL NHÂN SỰ</option>
                        <option value="04">NHÂN VIÊN</option>
                      </select>
                    </div>
                  </div>
               </div>

               <div className="flex-1 overflow-hidden flex flex-col gap-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
                    {paginatedStaff.map(staff => (
                      <div key={staff.id} onClick={() => handleAssignWork(staff)} className="bg-white/[0.02] border border-white/5 rounded-[24px] p-4 cursor-pointer hover:bg-gold/5 hover:border-gold/40 hover:shadow-xl hover:shadow-gold/5 transition-all group flex flex-col items-center text-center h-full justify-between">
                        <div className="h-16 w-16 rounded-[20px] bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black text-gold mb-3 group-hover:scale-110 transition-transform">{staff.name.charAt(0)}</div>
                        <div className="flex-1 flex flex-col items-center">
                          <h3 className="text-sm font-black text-white mb-0.5 group-hover:text-gold transition-colors line-clamp-1">{staff.name}</h3>
                          <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mb-3">
                            {staff.role === "02" ? "QL CÔNG VIỆC" : staff.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN"}
                          </p>
                        </div>
                        <button className="w-full h-8 bg-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest text-gray-500 group-hover:bg-gold group-hover:text-sidebar transition-all">Giao việc</button>
                      </div>
                    ))}
                    {paginatedStaff.length < 10 && Array.from({ length: 10 - paginatedStaff.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="bg-white/[0.01] border border-white/[0.02] rounded-[24px] border-dashed" />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between bg-white/[0.02] border border-white/10 p-3 rounded-[20px] mb-1">
                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-4">
                      Trang <span className="text-white">{currentPage}</span> / {totalPages || 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-30 transition-all"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`h-9 w-9 rounded-lg text-[9px] font-black transition-all ${currentPage === i + 1 ? "bg-gold text-sidebar" : "bg-white/5 text-gray-500 hover:bg-white/10"}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button 
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-30 transition-all"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
               </div>
            </motion.div>
        ) : (
        <motion.div key="detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="bg-white/[0.02] border border-white/10 rounded-[40px] p-8 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Loại nhiệm vụ</span>
                <span className="text-base font-black text-gold uppercase">{selectedTask?.title}</span>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Tiến độ tổng</span>
                <span className="text-base font-black text-white">{selectedTask?.progress}%</span>
              </div>
            </div>
            <button className="h-14 px-8 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-gold/10 hover:text-gold transition-all"><RefreshCcw size={18} /> Làm mới bảng</button>
          </div>
          <div className="flex-1 bg-white/[0.01] border border-white/10 rounded-[48px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto custom-scrollbar bg-black/10">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-[#0d0d0d] z-30 shadow-xl">
                  <tr className="border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                    <th className="px-10 py-6">STT</th>
                    <th className="px-6 py-6">Email / Thông tin</th>
                    <th className="px-6 py-6 text-center">Người thực hiện</th>
                    <th className="px-6 py-6">Trạng thái</th>
                    <th className="px-10 py-6 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {taskMails.length > 0 ? (
                    taskMails.map((mail, i) => {
                      const currentStatus = WORK_STATUSES.find(ws => ws.id === mail.workStatus) || WORK_STATUSES[0];
                      return (
                        <tr key={`mail-${mail.id}`} className="group hover:bg-white/[0.02] transition-all">
                          <td className="px-10 py-5 text-[10px] font-black text-gray-700">{i + 1}</td>
                          <td className="px-6 py-5">
                            <p className="text-sm font-bold text-white group-hover:text-gold transition-colors">{mail.email}</p>
                            <p className="text-[10px] text-gray-600 font-bold uppercase">{mail.recovery}</p>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="text-[10px] font-black text-white uppercase">{mail.assigneeName || "Không rõ"}</span>
                          </td>
                          <td className="px-6 py-5">
                            <select 
                              value={mail.workStatus || WORK_STATUSES[0].id}
                              onChange={(e) => handleStatusChange(mail.id, e.target.value)}
                              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl outline-none border transition-all cursor-pointer ${currentStatus.color}`}
                            >
                              {WORK_STATUSES.map(ws => (
                                <option key={ws.id} value={ws.id} className="bg-sidebar text-white">
                                  {ws.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-10 py-5 text-right">
                            <button onClick={() => { setSelectedMailForConfig(mail); setIsConfigModalOpen(true); }} className="h-10 px-4 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gold transition-all flex items-center gap-2 float-right"><Play size={14} /> Cấu hình</button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-10 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-20">
                          <Mail size={60} className="text-gold" />
                          <p className="text-xl font-black uppercase tracking-[0.2em] text-white">Chưa có mail nào được giao</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
          )}
      </AnimatePresence>
    </div>
    </div >
  );
}
