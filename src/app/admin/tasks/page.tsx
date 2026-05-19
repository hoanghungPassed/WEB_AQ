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
  Filter,
  ShieldCheck,
  X,
  Play,
  Check,
  ChevronLeft,
  ArrowRight,
  Database,
  RefreshCcw,
  Search
} from "lucide-react";

import { MOCK_STAFF, MOCK_TASK_ASSIGNMENTS, MOCK_MAILS, MailData } from "@/data/mockData";
import { StaffData, TaskAssignment } from "@/types/admin";
import { useRouter } from "next/navigation";

const UnifiedMailDetailModal = ({ 
  mail, 
  type, 
  user,
  onClose, 
  onSave 
}: { 
  mail: any; 
  type: "ROOT" | "SATELLITE" | "MONETIZED"; 
  user: any;
  onClose: () => void; 
  onSave: (updatedFields: any) => void; 
}) => {
  const roleUpper = String(user?.role || "").toUpperCase();
  const isAdminOrManager = roleUpper === "01" || 
                           roleUpper === "ADMIN" || 
                           roleUpper === "02" || 
                           roleUpper === "QL CÔNG VIỆC" || 
                           roleUpper === "QUẢN LÝ CÔNG VIỆC";

  // State for ROOT
  const [cccdDate, setCccdDate] = useState(mail.cccdDate || "");
  const [verificationStatus, setVerificationStatus] = useState(mail.verificationStatus || "Chưa xanh");

  // State for SATELLITE
  const [links, setLinks] = useState<string[]>(mail.links || ["", "", ""]);
  const [names, setNames] = useState<string[]>(mail.channelNames || ["", "", ""]);
  const [scanning, setScanning] = useState<boolean[]>([false, false, false]);
  const [eligibleChannels, setEligibleChannels] = useState<boolean[]>(mail.eligibleChannels || [false, false, false]);

  // State for MONETIZED
  const [reClickDate, setReClickDate] = useState(mail.reClickDate || "");
  const [step2PendingDate, setStep2PendingDate] = useState(mail.step2PendingDate || "");
  const [channelStatusDetail, setChannelStatusDetail] = useState(mail.channelStatusDetail || "Chưa Done");

  const handleLinkChange = (idx: number, val: string) => {
    const newLinks = [...links];
    newLinks[idx] = val;
    setLinks(newLinks);

    if (val.trim()) {
      const newScanning = [...scanning];
      newScanning[idx] = true;
      setScanning(newScanning);

      const newNames = [...names];
      newNames[idx] = "Đang quét thông tin kênh...";
      setNames(newNames);

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
      }, 800);
    } else {
      const newNames = [...names];
      newNames[idx] = "";
      setNames(newNames);
    }
  };

  const handleSave = () => {
    if (type === "ROOT") {
      onSave({ cccdDate, verificationStatus });
    } else if (type === "SATELLITE") {
      onSave({ 
        links, 
        channelNames: names,
        eligibleChannels
      });
    } else if (type === "MONETIZED") {
      onSave({ 
        reClickDate, 
        step2PendingDate, 
        channelStatusDetail 
      });
    }
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-sidebar border border-white/10 w-full max-w-xl rounded-[40px] p-10 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col max-h-[90vh]">
        <div className="absolute top-0 right-0 h-96 w-96 bg-gold/5 blur-[120px] -mr-48 -mt-48" />

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shadow-lg font-black">
              {type === "ROOT" ? <Database size={28} /> : type === "SATELLITE" ? <ExternalLink size={28} /> : <Mail size={28} />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                {type === "ROOT" ? "Chi tiết Mail Gốc" : type === "SATELLITE" ? "Chi tiết Mail Vệ Tinh" : "Cấu hình Kiếm Tiền"}
              </h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{mail?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center border border-white/10 transition-all"><X size={20} /></button>
        </div>

        <div className="space-y-6 relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {type === "ROOT" && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Quét lại CCCD vào ngày</label>
                <input
                  type="date"
                  value={cccdDate}
                  onChange={(e) => setCccdDate(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tình trạng xác minh</label>
                <select
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all cursor-pointer"
                >
                  <option value="Mail Veri mail" className="bg-sidebar text-white">Mail Veri mail</option>
                  <option value="Đã xanh" className="bg-sidebar text-white">Đã xanh</option>
                  <option value="Chưa xanh" className="bg-sidebar text-white">Chưa xanh</option>
                </select>
              </div>
            </>
          )}

          {type === "SATELLITE" && (
            <>
              {[0, 1, 2].map(idx => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Link YouTube {idx + 1}</label>
                    {names[idx] && (
                      <span className="text-[10px] font-black uppercase text-gold">
                        {names[idx]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      value={links[idx] || ""} 
                      onChange={(e) => handleLinkChange(idx, e.target.value)} 
                      placeholder="Dán link channel YouTube..." 
                      className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all" 
                    />
                    {isAdminOrManager && (
                      <button
                        onClick={() => {
                          const newEligible = [...eligibleChannels];
                          newEligible[idx] = !newEligible[idx];
                          setEligibleChannels(newEligible);
                        }}
                        className={`h-14 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border flex items-center gap-2 flex-shrink-0 ${
                          eligibleChannels[idx]
                            ? "bg-gold text-sidebar border-gold shadow-lg shadow-gold/20" 
                            : "bg-white/5 text-gray-400 border-white/10 hover:border-gold/30 hover:text-gold"
                        }`}
                      >
                        <CheckCircle2 size={16} />
                        {eligibleChannels[idx] ? "Đủ giờ" : "Đánh dấu"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {type === "MONETIZED" && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ngày bấm lại</label>
                <input
                  type="date"
                  value={reClickDate}
                  onChange={(e) => setReClickDate(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chờ bước 2</label>
                <input
                  type="date"
                  value={step2PendingDate}
                  onChange={(e) => setStep2PendingDate(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all cursor-pointer"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Trạng thái chi tiết</label>
                <div className="grid grid-cols-2 gap-3">
                  {["Chờ bước 3", "Mất kênh", "Chưa SUB", "DONE", "Gắn lại gà", "Die Spam", "Chưa Done"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setChannelStatusDetail(status)}
                      className={`h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                        channelStatusDetail === status 
                          ? "bg-gold/20 text-gold border-gold/45 shadow-lg shadow-gold/5" 
                          : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8 relative z-10 pt-4 border-t border-white/5">
          <button onClick={onClose} className="h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Đóng</button>
          <button 
            onClick={handleSave} 
            className="h-14 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-gold/20"
          >
            Lưu cập nhật
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

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

export default function TaskManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [staffList, setStaffList] = useState<StaffData[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState("ALL");
  const [notification, setNotification] = useState<string | null>(null);

  const [mails, setMails] = useState<any[]>([]);
  const [selectedMailForConfig, setSelectedMailForConfig] = useState<any>(null);

  // New states for template allocation flow
  const [selectedTemplate, setSelectedTemplate] = useState<string>("Check, xóa, tạo");
  const [targetStaffId, setTargetStaffId] = useState<string>("");
  const [mailTypeSelection, setMailTypeSelection] = useState<"ROOT" | "SATELLITE" | "MONETIZED">("ROOT");
  const [mailRangeStart, setMailRangeStart] = useState<number>(1);
  const [mailRangeEnd, setMailRangeEnd] = useState<number>(10);
  const [assignmentNote, setAssignmentNote] = useState<string>("Hãy kiểm tra tính hợp lệ của pass, 2FA, sđt và check xóa tạo mới.");

  const [selectedLo, setSelectedLo] = useState<string>("Lô 1");
  const [monetizedOption, setMonetizedOption] = useState<string>("Kháng kênh");
  const [selectedRootMailId, setSelectedRootMailId] = useState<string>("");
  const [selectedMoiKenhLo, setSelectedMoiKenhLo] = useState<string>("Lô 1");

  // Custom selector state for "Check, xóa, tạo"
  const [isSelectMailModalOpen, setIsSelectMailModalOpen] = useState<boolean>(false);
  const [selectedMailIdsForTask, setSelectedMailIdsForTask] = useState<number[]>([]);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>("");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = useCallback(() => {
    const savedTasks = localStorage.getItem("global_tasks_data");
    setTasks(savedTasks ? JSON.parse(savedTasks) : MOCK_TASK_ASSIGNMENTS);

    const stored = localStorage.getItem("global_users");
    const allUsers = stored ? JSON.parse(stored) : MOCK_STAFF;
    setStaffList(allUsers.filter((u: StaffData) => u.status === "ACTIVE" && u.role !== "01"));

    const savedMails = localStorage.getItem("global_mails_data");
    setMails(savedMails ? JSON.parse(savedMails) : MOCK_MAILS);
  }, []);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    loadData();
    const interval = setInterval(loadData, 4000);
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "global_tasks_data" || e.key === "global_mails_data" || e.key === "global_users") {
        loadData();
      }
    };
    window.addEventListener("storage", handleStorage);

    // Toast listener to simulate real-time notification
    const handleToastNotification = (e: StorageEvent) => {
      if (e.key === "realtime_toast" && e.newValue) {
        try {
          const toastData = JSON.parse(e.newValue);
          const currentUserStr = sessionStorage.getItem("user") || localStorage.getItem("user");
          if (currentUserStr) {
            const currentUser = JSON.parse(currentUserStr);
            if (String(toastData.userId) === String(currentUser.id)) {
              setNotification(toastData.message);
              setTimeout(() => setNotification(null), 4000);
              localStorage.removeItem("realtime_toast");
            }
          }
        } catch (err) {
          console.error("Toast notification error:", err);
        }
      }
    };
    window.addEventListener("storage", handleToastNotification);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("storage", handleToastNotification);
    };
  }, [loadData]);

  const roleUpper = String(user?.role || "").toUpperCase();
  const isAdminOrManager = roleUpper === "01" || 
                           roleUpper === "ADMIN" || 
                           roleUpper === "02" || 
                           roleUpper === "QL CÔNG VIỆC" || 
                           roleUpper === "QUẢN LÝ CÔNG VIỆC";

  const inventory = useMemo(() => {
    return {
      root: mails.filter((m: any) => m.type === "ROOT" && !m.assigneeId).length,
      satellite: mails.filter((m: any) => m.type === "SATELLITE" && !m.assigneeId).length,
      monetized: mails.filter((m: any) => m.type === "MONETIZED" && !m.assigneeId).length,
    };
  }, [mails]);

  const typeMaxTotal = useMemo(() => {
    return mails.filter((m: any) => m.type === mailTypeSelection).length;
  }, [mails, mailTypeSelection]);

  const selectTemplateAndPreset = (title: string) => {
    setSelectedTemplate(title);
    if (title === "Check, xóa, tạo") {
      setMailTypeSelection("ROOT");
      setMailRangeStart(1);
      setMailRangeEnd(10);
      setAssignmentNote("Hãy kiểm tra tính hợp lệ của pass, 2FA, sđt và check xóa tạo mới.");
    } else if (title === "Làm kênh") {
      setMailTypeSelection("SATELLITE");
      setAssignmentNote("Hãy liên kết kênh YouTube vệ tinh và cập nhật link/tên kênh.");
    } else if (title === "Kênh bật kiếm tiền") {
      setMailTypeSelection("MONETIZED");
      setMailRangeStart(1);
      setMailRangeEnd(10);
      setAssignmentNote("Kiểm tra và cấu hình liên kết tài khoản mail bật kiếm tiền.");
    } else if (title === "Mời kênh") {
      setMailTypeSelection("SATELLITE");
      setAssignmentNote("Mời kênh: Ghép cặp mail gốc với Lô vệ tinh.");
    }
  };

  const dynamicStaffBatches = useMemo(() => {
    if (!targetStaffId) return [];
    
    // Find all satellite mails assigned to this employee
    const allSatellites = mails.filter((m: any) => m.type === "SATELLITE");
    const theirSatellites = allSatellites.filter((m: any) => String(m.assigneeId) === String(targetStaffId));
    
    // Extract unique batchNames
    const batchNames = Array.from(new Set(theirSatellites.map((m: any) => m.batchName).filter(Boolean))) as string[];
    
    // For each batch name, find the range in allSatellites
    return batchNames.map(bName => {
      const batchMails = theirSatellites.filter((m: any) => m.batchName === bName);
      if (batchMails.length === 0) return null;
      
      const hasChuaLam = batchMails.some((m: any) => m.workStatus === "Chưa làm");
      if (!hasChuaLam) return null;

      const firstIdx = allSatellites.findIndex((m: any) => m.id === batchMails[0].id) + 1;
      const lastIdx = allSatellites.findIndex((m: any) => m.id === batchMails[batchMails.length - 1].id) + 1;
      return {
        name: bName,
        range: `${firstIdx}-${lastIdx}`,
        mailIds: batchMails.map((m: any) => m.id)
      };
    }).filter(Boolean) as any[];
  }, [targetStaffId, mails]);

  const targetStaffBatches = useMemo(() => {
    return dynamicStaffBatches.map(b => b.name);
  }, [dynamicStaffBatches]);

  useEffect(() => {
    if (dynamicStaffBatches.length > 0) {
      setSelectedLo(dynamicStaffBatches[0].name);
    } else {
      setSelectedLo("");
    }
  }, [dynamicStaffBatches]);

  const eligibleStaff = useMemo(() => {
    if (!user) return [];
    const is01 = user.role === "01" || user.role === "ADMIN";
    const is02 = user.role === "02" || user.role === "QUẢN LÝ CÔNG VIỆC";

    return staffList.filter((s: StaffData) => {
      // 1. Must be ONLINE
      if (!s.isOnline) return false;

      // 2. Templates restriction rules
      if (selectedTemplate === "Check, xóa, tạo" || selectedTemplate === "Kênh bật kiếm tiền") {
        return s.role === "02";
      }

      // 3. General role hierarchy restrictions
      if (is01) {
        return s.role === "02" || s.role === "03" || s.role === "04";
      }
      if (is02) {
        return s.role === "03" || s.role === "04";
      }
      return false;
    });
  }, [staffList, user, selectedTemplate]);

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

    if (selectedTask.selectedMailIds && Array.isArray(selectedTask.selectedMailIds)) {
      return mails.filter(m => selectedTask.selectedMailIds?.includes(m.id));
    }

    let filtered = mails.filter(m => m.type === mailType && String(m.assigneeId) === String(selectedTask.assigneeId));

    if (selectedTask.title === "Check, xóa, tạo" || selectedTask.title === "Kênh bật kiếm tiền") {
      if (selectedTask.mailRange) {
        const parts = selectedTask.mailRange.split("-");
        if (parts.length === 2) {
          const start = parseInt(parts[0].trim());
          const end = parseInt(parts[1].trim());
          const withSTT = mails.filter(m => m.type === mailType).map((m, idx) => ({ ...m, currentSTT: idx + 1 }));
          const idsInRange = withSTT.filter(m => m.currentSTT >= start && m.currentSTT <= end).map(m => m.id);
          filtered = filtered.filter(m => idsInRange.includes(m.id));
        }
      }
    } else if (selectedTask.title === "Làm kênh") {
      if (selectedTask.mailRange) {
        filtered = filtered.filter(m => m.batchName === selectedTask.mailRange);
      }
    } else if (selectedTask.title === "Mời kênh" && selectedTask.mailRange) {
      const parts = selectedTask.mailRange.split("+");
      const loPart = parts.pop()?.trim();
      filtered = mails.filter(m => 
        (m.type === "SATELLITE" && m.batchName === loPart && String(m.assigneeId) === String(selectedTask.assigneeId)) ||
        (m.type === "ROOT" && selectedTask.note && selectedTask.note.includes(m.email))
      );
    }

    if (user?.role === "04") {
      filtered = filtered.filter(m => String(m.assigneeId) === String(user.id));
    }

    return filtered;
  }, [mails, selectedTask, user]);

  const handleSaveUnifiedDetails = useCallback((mailId: number, updatedFields: any) => {
    const savedMails = localStorage.getItem("global_mails_data");
    let allMails = savedMails ? JSON.parse(savedMails) : MOCK_MAILS;

    allMails = allMails.map((m: any) => {
      if (m.id === mailId) {
        return { ...m, ...updatedFields };
      }
      return m;
    });

    localStorage.setItem("global_mails_data", JSON.stringify(allMails));
    setMails(allMails);

    if (selectedTask) {
      let mailType = "ROOT";
      if (selectedTask.type === "MAIL_VE_TINH") mailType = "SATELLITE";
      if (selectedTask.type === "MAIL_MONETIZED") mailType = "MONETIZED";

      let filtered = allMails.filter((m: any) => m.type === mailType && String(m.assigneeId) === String(selectedTask.assigneeId));
      if (selectedTask.selectedMailIds && Array.isArray(selectedTask.selectedMailIds)) {
        filtered = allMails.filter((m: any) => selectedTask.selectedMailIds?.includes(m.id));
      } else if (selectedTask.title === "Check, xóa, tạo" || selectedTask.title === "Kênh bật kiếm tiền") {
        if (selectedTask.mailRange) {
          const parts = selectedTask.mailRange.split("-");
          if (parts.length === 2) {
            const start = parseInt(parts[0].trim());
            const end = parseInt(parts[1].trim());
            const withSTT = allMails.filter((m: any) => m.type === mailType).map((m: any, idx: number) => ({ ...m, currentSTT: idx + 1 }));
            const idsInRange = withSTT.filter((m: any) => m.currentSTT >= start && m.currentSTT <= end).map((m: any) => m.id);
            filtered = filtered.filter((m: any) => idsInRange.includes(m.id));
          }
        }
      } else if (selectedTask.title === "Làm kênh") {
        if (selectedTask.mailRange) {
          filtered = filtered.filter((m: any) => m.batchName === selectedTask.mailRange);
        }
      } else if (selectedTask.title === "Mời kênh" && selectedTask.mailRange) {
        const parts = selectedTask.mailRange.split("+");
        const loPart = parts.pop()?.trim();
        filtered = allMails.filter((m: any) => 
          (m.type === "SATELLITE" && m.batchName === loPart && String(m.assigneeId) === String(selectedTask.assigneeId)) ||
          (m.type === "ROOT" && selectedTask.note && selectedTask.note.includes(m.email))
        );
      }

      const totalTaskMails = filtered.length;
      if (totalTaskMails > 0) {
        const completedCount = filtered.filter((m: any) => m.workStatus === "Đã làm" || m.workStatus === "Đã bán").length;
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

    setNotification("Đã cập nhật chi tiết mail thành công.");
    setTimeout(() => setNotification(null), 3000);
    window.dispatchEvent(new Event("storage"));
  }, [selectedTask]);

  const handleCustomAssignmentSubmit = useCallback(() => {
    if (!targetStaffId) {
      alert("Vui lòng chọn nhân viên nhận việc.");
      return;
    }

    const selectedStaff = staffList.find(s => String(s.id) === String(targetStaffId));
    if (!selectedStaff) return;

    const savedMails = localStorage.getItem("global_mails_data");
    let allMails = savedMails ? JSON.parse(savedMails) : MOCK_MAILS;

    let assignedIds: number[] = [];
    let note = assignmentNote;
    let mailCount = 0;
    let typeLabel = "ROOT";
    let taskType: "MAIL_GOC" | "MAIL_VE_TINH" | "MAIL_MONETIZED" = "MAIL_GOC";
    let mailRangeStr = "";

    if (selectedTemplate === "Check, xóa, tạo") {
      typeLabel = "ROOT";
      taskType = "MAIL_GOC";
      if (selectedMailIdsForTask.length === 0) {
        alert("Vui lòng click chọn ít nhất 1 mail gốc khả dụng trong popup trước!");
        return;
      }
      assignedIds = [...selectedMailIdsForTask];
      mailCount = assignedIds.length;
      
      const mailsOfType = allMails.filter((m: any) => m.type === "ROOT");
      const indices = assignedIds.map(id => mailsOfType.findIndex((m: any) => m.id === id) + 1).filter(idx => idx > 0).sort((a, b) => a - b);
      if (indices.length > 0) {
        mailRangeStr = `${indices[0]}-${indices[indices.length - 1]}`;
      } else {
        mailRangeStr = `${mailCount} mail`;
      }
    } 
    else if (selectedTemplate === "Làm kênh") {
      typeLabel = "SATELLITE";
      taskType = "MAIL_VE_TINH";
      
      const selectedBatchObj = dynamicStaffBatches.find(b => b.name === selectedLo);
      if (!selectedBatchObj) {
        alert(`Nhân sự này chưa được gán lô ${selectedLo} hoặc không tìm thấy lô.`);
        return;
      }
      
      assignedIds = selectedBatchObj.mailIds || [];
      mailCount = assignedIds.length;
      mailRangeStr = `${selectedLo} (STT ${selectedBatchObj.range})`;
      note = `${note} - Lô gán: ${selectedLo} (STT ${selectedBatchObj.range})`;
    } 
    else if (selectedTemplate === "Kênh bật kiếm tiền") {
      typeLabel = "MONETIZED";
      taskType = "MAIL_MONETIZED";
      const mailsOfType = allMails.filter((m: any) => m.type === "MONETIZED");
      const mailsWithSTT = mailsOfType.map((m: any, idx: number) => ({ ...m, currentSTT: idx + 1 }));
      assignedIds = mailsWithSTT
        .filter((m: any) => m.currentSTT >= mailRangeStart && m.currentSTT <= mailRangeEnd && !m.assigneeId)
        .map((m: any) => m.id);

      if (assignedIds.length === 0) {
        alert("Không tìm thấy mail bật kiếm tiền khả dụng trong dải STT này.");
        return;
      }
      mailCount = assignedIds.length;
      mailRangeStr = `${mailRangeStart} - ${mailRangeEnd}`;

      const is01 = user?.role === "01";
      const is02Assignee = selectedStaff.role === "02";
      if (is01 && is02Assignee) {
        note = `${note} (Phương thức: ${monetizedOption})`;
      }
    } 
    else if (selectedTemplate === "Mời kênh") {
      typeLabel = "SATELLITE";
      taskType = "MAIL_VE_TINH";
      
      if (!selectedRootMailId) {
        alert("Vui lòng chọn Mail gốc để ghép cặp.");
        return;
      }

      const rootMail = allMails.find((m: any) => String(m.id) === String(selectedRootMailId));
      if (!rootMail) return;

      const targetMails = allMails.filter((m: any) => 
        m.type === "SATELLITE" && 
        String(m.assigneeId) === String(targetStaffId) && 
        m.batchName === selectedMoiKenhLo
      );

      if (targetMails.length === 0) {
        alert(`Không tìm thấy mail vệ tinh thuộc ${selectedMoiKenhLo} của nhân sự này.`);
        return;
      }

      assignedIds = [rootMail.id, ...targetMails.map((m: any) => m.id)];
      mailCount = assignedIds.length;
      mailRangeStr = `Ghép cặp: Mail gốc (${rootMail.email}) + ${selectedMoiKenhLo}`;
      note = `${note} (Ghép cặp Mail Gốc: ${rootMail.email} với ${selectedMoiKenhLo} vệ tinh)`;
    }

    allMails = allMails.map((m: any) => {
      if (assignedIds.includes(m.id)) {
        return {
          ...m,
          assigneeId: selectedStaff.id,
          assigneeName: selectedStaff.name,
          assignedAt: new Date().toISOString(),
          assignmentNote: note,
          workStatus: m.type === "ROOT" ? "Đang xử lí" : (m.type === "MONETIZED" ? "Chưa bán" : "Chưa làm")
        };
      }
      return m;
    });
    localStorage.setItem("global_mails_data", JSON.stringify(allMails));

    const savedTasks = localStorage.getItem("global_tasks_data");
    let allTasks = savedTasks ? JSON.parse(savedTasks) : MOCK_TASK_ASSIGNMENTS;

    const selectedBatchObj = dynamicStaffBatches.find(b => b.name === selectedLo);
    const newTask: TaskAssignment & { taskName?: string; assignee?: string; assigneeName?: string; batch?: string; range?: string; selectedMailIds?: number[] } = {
      id: `task-${Date.now()}`,
      title: selectedTemplate,
      taskName: selectedTemplate,
      type: taskType,
      assigneeId: selectedStaff.id,
      assigneeName: selectedStaff.name,
      assignee: selectedStaff.name,
      progress: 0,
      status: "PENDING",
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      mailCount: mailCount,
      note: note,
      mailRange: mailRangeStr,
      batch: selectedTemplate === "Làm kênh" ? selectedLo : "",
      range: selectedTemplate === "Làm kênh" ? (selectedBatchObj?.range || "") : mailRangeStr,
      mailType: typeLabel as any,
      selectedMailIds: selectedTemplate === "Check, xóa, tạo" ? assignedIds : undefined
    };

    allTasks.push(newTask);
    localStorage.setItem("global_tasks_data", JSON.stringify(allTasks));
    setTasks(allTasks);
    setSelectedMailIdsForTask([]);

    // Sync to API server database
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        global_mails_data: JSON.stringify(allMails),
        global_tasks_data: JSON.stringify(allTasks)
      })
    }).catch(err => console.error("Sync error:", err));

    // Trigger Real-time Toast and push system notification
    localStorage.setItem("realtime_toast", JSON.stringify({
      userId: selectedStaff.id,
      message: "Bạn nhận được công việc mới"
    }));

    const existingNotifs = JSON.parse(localStorage.getItem("admin_notifications") || "[]");
    const newNotif = {
      id: Date.now(),
      title: "Nhiệm vụ mới",
      message: `Bạn đã được giao ${mailCount} mail thực hiện task: ${selectedTemplate}.`,
      time: "Vừa xong",
      type: "TASK_ASSIGNED",
      targetUsername: selectedStaff.username,
      read: false
    };
    localStorage.setItem("admin_notifications", JSON.stringify([newNotif, ...existingNotifs]));

    setNotification(`Đã giao việc thành công cho ${selectedStaff.name}!`);
    setTimeout(() => setNotification(null), 4000);
    window.dispatchEvent(new Event('storage'));
  }, [targetStaffId, selectedTemplate, selectedLo, selectedMoiKenhLo, selectedRootMailId, monetizedOption, mailRangeStart, mailRangeEnd, assignmentNote, staffList, user]);

  const updateTaskStatus = useCallback((newStatus: "IN_PROGRESS" | "COMPLETED") => {
    if (!selectedTaskId) return;

    const savedTasks = localStorage.getItem("global_tasks_data");
    let allTasks = savedTasks ? JSON.parse(savedTasks) : MOCK_TASK_ASSIGNMENTS;

    allTasks = allTasks.map((t: any) => {
      if (t.id === selectedTaskId) {
        return {
          ...t,
          status: newStatus,
          progress: newStatus === "COMPLETED" ? 100 : (t.progress === 100 ? 50 : t.progress)
        };
      }
      return t;
    });

    localStorage.setItem("global_tasks_data", JSON.stringify(allTasks));
    setTasks(allTasks);
    setNotification(`Đã chuyển trạng thái nhiệm vụ sang: ${newStatus === "COMPLETED" ? "Hoàn thành" : "Đang xử lý"}`);
    setTimeout(() => setNotification(null), 3000);
    window.dispatchEvent(new Event("storage"));
  }, [selectedTaskId]);

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4 select-none relative overflow-hidden">
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -50, x: "-50%" }} animate={{ opacity: 1, y: 30, x: "-50%" }} exit={{ opacity: 0, y: -50, x: "-50%" }} className="fixed top-0 left-1/2 z-[500] bg-gold text-sidebar px-8 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 font-black text-sm uppercase tracking-widest border border-white/20">
            <CheckCircle2 size={24} className="animate-bounce" />{notification}
          </motion.div>
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
              {isAdminOrManager && !selectedTaskId ? "Bảng chia việc AQ MEDIA" : selectedTaskId ? "Chi tiết thực hiện" : "Nhiệm vụ của tôi"}
            </h1>
            <p className="text-gray-500 font-medium mt-1 flex items-center gap-2">
              <ShieldCheck size={16} className="text-gold" />
              {isAdminOrManager && !selectedTaskId ? "Hệ thống điều phối công việc và chia lô mail tự động cho nhân sự." : selectedTaskId ? `Nhiệm vụ: ${selectedTask?.title}` : "Danh sách nhiệm vụ được giao."}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedTaskId ? (
            isAdminOrManager ? (
              // Admin/Manager view: Template cards + Assignment form
              <motion.div key="admin-delegation" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto pr-2 pb-10">
                {/* Left side: 4 Task Templates Cards */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-2 w-2 rounded-full bg-gold animate-ping" />
                    <h2 className="text-base font-black text-white uppercase tracking-widest">Chọn mẫu công việc</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { title: "Check, xóa, tạo", desc: "Mặc định Mail Gốc. Kiểm tra pass, 2FA, sđt và check xóa tạo mới.", type: "ROOT", icon: <ShieldCheck size={28} /> },
                      { title: "Làm kênh", desc: "Mặc định Mail Vệ Tinh. Liên kết kênh vệ tinh, scan thông tin.", type: "SATELLITE", icon: <Zap size={28} /> },
                      { title: "Kênh bật kiếm tiền", desc: "Mặc định Mail Bật Kiếm Tiền. Kiểm tra và cấu hình đối tác.", type: "MONETIZED", icon: <Mail size={28} /> },
                      { title: "Mời kênh", desc: "Ghép cặp mail gốc với Lô vệ tinh. Mời kênh vệ tinh vào quản lý.", type: "SATELLITE + ROOT", icon: <ExternalLink size={28} /> },
                    ].map(tmpl => (
                      <div 
                        key={tmpl.title}
                        onClick={() => selectTemplateAndPreset(tmpl.title)}
                        className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all flex flex-col h-full justify-between relative overflow-hidden group ${selectedTemplate === tmpl.title ? "bg-gold/10 border-gold shadow-[0_0_40px_rgba(212,175,55,0.15)]" : "bg-white/5 border-white/5 hover:border-white/10"}`}
                      >
                        <div className="absolute top-0 right-0 h-24 w-24 bg-gold/5 blur-[30px] -mr-12 -mt-12 group-hover:bg-gold/10 transition-all" />
                        <div>
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border mb-4 transition-all ${selectedTemplate === tmpl.title ? "bg-gold/20 text-gold border-gold/30" : "bg-white/5 text-gray-500 border-white/10"}`}>
                            {tmpl.icon}
                          </div>
                          <h3 className="text-base font-black text-white uppercase tracking-tight mb-2">{tmpl.title}</h3>
                          <p className="text-[10px] text-gray-500 leading-relaxed">{tmpl.desc}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between pt-4 border-t border-white/5">
                          <span className="text-[9px] font-black text-gold uppercase tracking-wider">{tmpl.type}</span>
                          <span className="text-[8px] font-bold text-gray-600 uppercase">Dự kiến 3 ngày</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right side: Interactive Assignment Form */}
                <div className="lg:col-span-7 bg-[#0b0b0b] border border-white/10 rounded-[48px] p-8 md:p-10 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 h-96 w-96 bg-gold/5 blur-[120px] -mr-48 -mt-48" />
                  
                  <div className="space-y-6 relative z-10">
                    <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                      <div className="h-10 w-10 bg-gold/15 text-gold border border-gold/20 rounded-xl flex items-center justify-center">
                        <Users size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">Cấu hình Giao việc</h3>
                        <p className="text-[9px] font-bold text-gray-500 uppercase mt-1 tracking-widest">Giao mẫu: <span className="text-gold">{selectedTemplate}</span></p>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1 p-4 bg-white/[0.02] border border-white/5 rounded-3xl items-center text-center">
                      <div className="col-span-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Mail Gốc</p>
                        <p className="text-sm font-black text-gold">{inventory.root} <span className="text-[8px] text-gray-500 font-bold block">Khả dụng</span></p>
                      </div>
                      <div className="col-span-1 flex justify-center text-white/5 font-light">|</div>
                      <div className="col-span-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Vệ Tinh</p>
                        <p className="text-sm font-black text-gold">{inventory.satellite} <span className="text-[8px] text-gray-500 font-bold block">Khả dụng</span></p>
                      </div>
                      <div className="col-span-1 flex justify-center text-white/5 font-light">|</div>
                      <div className="col-span-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Kiếm Tiền</p>
                        <p className="text-sm font-black text-gold">{inventory.monetized} <span className="text-[8px] text-gray-500 font-bold block">Khả dụng</span></p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chọn nhân viên thực hiện</label>
                      <select 
                        value={targetStaffId}
                        onChange={(e) => setTargetStaffId(e.target.value)}
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 cursor-pointer transition-all"
                      >
                        <option value="" className="bg-sidebar text-white">-- Chọn nhân sự ONLINE thực hiện --</option>
                        {eligibleStaff.map((staff: any) => (
                          <option key={staff.id} value={staff.id} className="bg-sidebar text-white">
                            🟢 {staff.name} ({staff.role === "02" ? "Quản lý công việc" : staff.role === "03" ? "Quản lý nhân sự" : "Nhân viên"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedTemplate === "Check, xóa, tạo" && (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chọn danh sách Mail Gốc</label>
                        <button
                          type="button"
                          onClick={() => {
                            if (!targetStaffId) {
                              alert("Vui lòng chọn nhân viên nhận việc trước!");
                              return;
                            }
                            setIsSelectMailModalOpen(true);
                          }}
                          className="w-full h-14 bg-[#0a0a0a] hover:bg-gold/5 text-gold border border-gold/20 hover:border-gold/50 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg"
                        >
                          <Mail size={16} />
                          {selectedMailIdsForTask.length > 0 
                            ? `Đã chọn: ${selectedMailIdsForTask.length} mail gốc (Nhấn để thay đổi)` 
                            : "Chọn mail"}
                        </button>
                      </div>
                    )}

                    {selectedTemplate === "Làm kênh" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chọn Lô vệ tinh giao</label>
                          <select 
                            value={selectedLo}
                            onChange={(e) => setSelectedLo(e.target.value)}
                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 cursor-pointer transition-all"
                          >
                            <option value="" className="bg-sidebar text-white">-- Chọn Lô --</option>
                            {dynamicStaffBatches.map(b => (
                              <option key={b.name} value={b.name} className="bg-sidebar text-white">
                                {b.name} (STT {b.range})
                              </option>
                            ))}
                          </select>
                          {dynamicStaffBatches.length === 0 && (
                            <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mt-1">Nhân sự này chưa được gán lô vệ tinh nào ở bước 1!</p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedTemplate === "Kênh bật kiếm tiền" && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Bắt đầu từ STT</label>
                            <input 
                              type="number"
                              value={mailRangeStart}
                              onChange={(e) => setMailRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Đến STT (Tổng {inventory.monetized})</label>
                            <input 
                              type="number"
                              value={mailRangeEnd}
                              onChange={(e) => setMailRangeEnd(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all"
                            />
                          </div>
                        </div>
                        
                        {(() => {
                          const selectedStaffObj = staffList.find(s => String(s.id) === String(targetStaffId));
                          const is01 = user?.role === "01";
                          const is02Assignee = selectedStaffObj?.role === "02";
                          if (is01 && is02Assignee) {
                            return (
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gold uppercase tracking-widest ml-1">Phương thức xử lý</label>
                                <select 
                                  value={monetizedOption}
                                  onChange={(e) => setMonetizedOption(e.target.value)}
                                  className="w-full h-14 bg-gold/10 border-2 border-gold/30 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold cursor-pointer transition-all"
                                >
                                  <option value="Kháng kênh" className="bg-sidebar text-white">Kháng kênh</option>
                                  <option value="Nối GA" className="bg-sidebar text-white">Nối GA</option>
                                </select>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    {selectedTemplate === "Mời kênh" && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chọn Mail Gốc</label>
                          <select 
                            value={selectedRootMailId}
                            onChange={(e) => setSelectedRootMailId(e.target.value)}
                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 cursor-pointer transition-all"
                          >
                            <option value="" className="bg-sidebar text-white">-- Chọn Mail Gốc trong DB --</option>
                            {mails.filter((m: any) => m.type === "ROOT" && m.verificationStatus === "Đã xanh" && !m.assigneeId).map((m: any) => (
                              <option key={m.id} value={m.id} className="bg-sidebar text-white">
                                {m.email}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chọn Lô vệ tinh ghép cặp</label>
                          <select 
                            value={selectedMoiKenhLo}
                            onChange={(e) => setSelectedMoiKenhLo(e.target.value)}
                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 cursor-pointer transition-all"
                          >
                            <option value="" className="bg-sidebar text-white">-- Chọn Lô Vệ Tinh --</option>
                            {targetStaffBatches.length > 0 ? targetStaffBatches.map(b => (
                              <option key={b} value={b} className="bg-sidebar text-white">{b}</option>
                            )) : (
                              <option disabled className="bg-sidebar text-white">Nhân viên này chưa có lô vệ tinh nào</option>
                            )}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ghi chú & Yêu cầu công việc</label>
                      <textarea
                        value={assignmentNote}
                        onChange={(e) => setAssignmentNote(e.target.value)}
                        placeholder="Nhập ghi chú hoặc yêu cầu chi tiết cho nhân viên..."
                        className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-gold/50 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="mt-8 relative z-10 pt-4 border-t border-white/5">
                    <button 
                      onClick={handleCustomAssignmentSubmit}
                      className="w-full h-14 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-gold/20"
                    >
                      <Zap size={16} /> Giao công việc & Kích hoạt real-time
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              // Staff task listing
              <motion.div key="staff-grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-10">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />)
                  ) : (
                    <div className="col-span-full py-20 text-center text-gray-500 font-bold uppercase tracking-widest">Không có nhiệm vụ được giao</div>
                  )}
                </div>
              </motion.div>
            )
          ) : (
            // Task Mail Row Details
            <motion.div key="detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex-1 flex flex-col gap-6 overflow-hidden">
              <div className="bg-white/[0.02] border border-white/10 rounded-[40px] p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shadow-2xl">
                <div className="flex flex-wrap items-center gap-6 md:gap-10">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Loại nhiệm vụ</span>
                    <span className="text-base font-black text-gold uppercase">{selectedTask?.title}</span>
                  </div>
                  <div className="h-10 w-px bg-white/10 hidden md:block" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Chi tiết công việc</span>
                    <span className="text-xs font-bold text-white max-w-md">{selectedTask?.note} ({selectedTask?.mailRange})</span>
                  </div>
                  <div className="h-10 w-px bg-white/10 hidden md:block" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Số lượng</span>
                    <span className="text-base font-black text-white">{selectedTask?.mailCount} Mail</span>
                  </div>
                  <div className="h-10 w-px bg-white/10 hidden md:block" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Tiến độ tổng</span>
                    <span className="text-base font-black text-white">{selectedTask?.progress}% ({selectedTask?.status === "COMPLETED" ? "Hoàn thành" : selectedTask?.status === "IN_PROGRESS" ? "Đang xử lý" : "Đang chờ"})</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                  {!isAdminOrManager && (
                    <>
                      <button 
                        onClick={() => updateTaskStatus("IN_PROGRESS")}
                        className={`h-14 px-6 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest border transition-all ${selectedTask?.status === "IN_PROGRESS" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-white/5 text-gray-400 border-white/10 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20"}`}
                      >
                        Đang xử lí
                      </button>
                      <button 
                        onClick={() => updateTaskStatus("COMPLETED")}
                        className={`h-14 px-6 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest border transition-all ${selectedTask?.status === "COMPLETED" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/5 text-gray-400 border-white/10 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20"}`}
                      >
                        Hoàn thành
                      </button>
                    </>
                  )}
                  
                  <button 
                    onClick={() => { setSelectedTaskId(null); }} 
                    className="h-14 px-6 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-gold/10 hover:text-gold transition-all"
                  >
                    Quay lại
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-white/[0.01] border border-white/10 rounded-[48px] flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto custom-scrollbar bg-black/10">
                  <div className="w-full overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[900px]">
                      <thead className="sticky top-0 bg-[#0d0d0d] z-30 shadow-xl">
                        <tr className="border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                          <th className="px-10 py-3 whitespace-nowrap">STT</th>
                          <th className="px-6 py-3 whitespace-nowrap">Email / Thông tin</th>
                          <th className="px-6 py-3 text-center whitespace-nowrap">Người thực hiện</th>
                          <th className="px-6 py-3 text-center whitespace-nowrap">Trạng thái</th>
                          <th className="px-10 py-3 text-right whitespace-nowrap">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {taskMails.length > 0 ? (
                          taskMails.map((mail, i) => {
                            const rowPadding = !isAdminOrManager ? "py-1 px-6" : "py-2.5 px-6";
                            const textSize = !isAdminOrManager ? "text-xs" : "text-sm";
                            return (
                              <tr key={`mail-${mail.id}`} className="group hover:bg-white/[0.02] transition-all">
                                <td className={`${rowPadding} text-[10px] font-black text-gray-700 whitespace-nowrap`}>{i + 1}</td>
                                <td className={`${rowPadding} whitespace-nowrap`}>
                                  <p className={`${textSize} font-bold text-white group-hover:text-gold transition-colors whitespace-nowrap`}>{mail.email}</p>
                                  <p className="text-[10px] text-gray-600 font-bold uppercase whitespace-nowrap">{mail.recovery}</p>
                                </td>
                                <td className={`${rowPadding} text-center whitespace-nowrap`}>
                                  <span className="text-[10px] font-black text-white uppercase whitespace-nowrap">{mail.assigneeName || "Không rõ"}</span>
                                </td>
                                <td className={`${rowPadding} text-center whitespace-nowrap`}>
                                  <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${
                                    (mail.workStatus || "Chưa làm").toLowerCase() === "đã làm" || (mail.workStatus || "Chưa làm").toLowerCase() === "đã bán"
                                      ? "bg-green-500/10 text-green-500 border-green-500/20" 
                                      : (mail.workStatus || "Chưa làm").toLowerCase() === "lỗi" 
                                        ? "bg-red-500/10 text-red-500 border-red-500/20" 
                                        : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                  }`}>
                                    {mail.workStatus || "Chưa làm"}
                                  </span>
                                </td>
                                <td className={`${rowPadding} text-right whitespace-nowrap`}>
                                  <button 
                                    onClick={() => { setSelectedMailForConfig(mail); }} 
                                    className="h-9 px-3 bg-gold/10 text-gold hover:bg-gold hover:text-sidebar rounded-xl text-[10px] font-black uppercase tracking-widest border border-gold/30 transition-all flex items-center gap-2 float-right whitespace-nowrap"
                                  >
                                    <Play size={12} /> Cấu hình
                                  </button>
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedMailForConfig && (
          <UnifiedMailDetailModal 
            mail={selectedMailForConfig} 
            type={selectedMailForConfig.type}
            user={user}
            onClose={() => setSelectedMailForConfig(null)} 
            onSave={(updatedFields) => handleSaveUnifiedDetails(selectedMailForConfig.id, updatedFields)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSelectMailModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-sidebar border border-white/10 w-full max-w-4xl rounded-[40px] p-8 md:p-10 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-0 right-0 h-96 w-96 bg-gold/5 blur-[120px] -mr-48 -mt-48" />

              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shadow-lg">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Chọn Mail Gốc</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Chỉ hiển thị mail "Đã xanh" & "Chưa làm"</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSelectMailModalOpen(false)}
                  className="h-10 w-10 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center border border-white/10 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search box inside modal */}
              <div className="mb-6 relative z-10">
                <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-2xl px-4 h-12 w-full focus-within:border-gold transition-all">
                  <Search size={16} className="text-gray-500 shrink-0" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm Email hoặc Mail KP..."
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-white w-full"
                  />
                </div>
              </div>

              {/* Table wrapper */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6 relative z-10 min-h-[250px]">
                {(() => {
                  const availableMails = mails.filter((m: any) => 
                    m.type === "ROOT" && 
                    m.verificationStatus === "Đã xanh" && 
                    (m.workStatus === "Chưa làm" || !m.workStatus) &&
                    (!modalSearchQuery || 
                     m.email.toLowerCase().includes(modalSearchQuery.toLowerCase()) || 
                     m.recovery.toLowerCase().includes(modalSearchQuery.toLowerCase()))
                  );

                  // Calculate master checkbox state
                  const allSelected = availableMails.length > 0 && availableMails.every((m: any) => selectedMailIdsForTask.includes(m.id));
                  const someSelected = availableMails.some((m: any) => selectedMailIdsForTask.includes(m.id)) && !allSelected;

                  const handleSelectAll = () => {
                    if (allSelected) {
                      // Remove all available from selection
                      setSelectedMailIdsForTask(prev => prev.filter(id => !availableMails.some((m: any) => m.id === id)));
                    } else {
                      // Add all available to selection
                      const newIds = [...selectedMailIdsForTask];
                      availableMails.forEach((m: any) => {
                        if (!newIds.includes(m.id)) newIds.push(m.id);
                      });
                      setSelectedMailIdsForTask(newIds);
                    }
                  };

                  const handleToggleRow = (id: number) => {
                    setSelectedMailIdsForTask(prev => 
                      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                    );
                  };

                  return (
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5 sticky top-0 z-20">
                        <tr>
                          <th className="py-4 px-6 text-center w-12">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someSelected;
                              }}
                              onChange={handleSelectAll}
                              className="rounded border-white/10 bg-white/5 text-gold focus:ring-0 cursor-pointer h-4 w-4"
                            />
                          </th>
                          <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px]">STT</th>
                          <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px]">STT Gốc</th>
                          <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px]">Email</th>
                          <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px]">Mail KP</th>
                          <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px] text-center">Xác Minh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300">
                        {availableMails.length > 0 ? (
                          availableMails.map((mail: any, index: number) => (
                            <tr key={mail.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="py-3 px-6 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedMailIdsForTask.includes(mail.id)}
                                  onChange={() => handleToggleRow(mail.id)}
                                  className="rounded border-white/10 bg-white/5 text-gold focus:ring-0 cursor-pointer h-4 w-4"
                                />
                              </td>
                              <td className="py-3 px-6 text-[10px] font-black text-gray-500">{index + 1}</td>
                              <td className="py-3 px-6 text-[10px] font-black text-gold/80">
                                {mail.type === "ROOT" ? mail.id 
                                  : mail.type === "SATELLITE" ? mail.id - 1000 
                                  : mail.id - 2000}
                              </td>
                              <td className="py-3 px-6 font-bold text-white cursor-pointer" onClick={() => handleToggleRow(mail.id)}>{mail.email}</td>
                              <td className="py-3 px-6 text-xs text-gray-400 font-mono">{mail.recovery}</td>
                              <td className="py-3 px-6 text-center">
                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/20">
                                  {mail.verificationStatus}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-gray-600 font-bold uppercase tracking-widest text-xs">
                              Không tìm thấy mail gốc khả dụng nào
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
                <span className="text-sm font-black text-gold uppercase tracking-wider">
                  Đã chọn: {selectedMailIdsForTask.length} mail
                </span>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setSelectedMailIdsForTask([]);
                      setIsSelectMailModalOpen(false);
                    }}
                    className="h-12 px-6 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => setIsSelectMailModalOpen(false)}
                    className="h-12 px-6 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-gold/20"
                  >
                    Xác nhận giao việc
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
