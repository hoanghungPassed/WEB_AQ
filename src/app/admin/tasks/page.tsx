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
  Search,
  Copy,
  User,
  Inbox
} from "lucide-react";

import { MailData, StaffData, TaskAssignment } from "@/types/admin";
import { useRouter } from "next/navigation";
import {
  validateYouTubeUrl,
  fetchChannelName,
  cleanYouTubeUrl
} from "@/components/admin/youtubeUtils";

import MailDetailModal from "@/components/admin/MailDetailModal";
import { Badge } from "@/components/ui/Badge";
import { MailSelectorModal } from "@/components/admin/modals/MailSelectorModal";
import TOTPDisplay from "@/components/admin/TOTPDisplay";
import { toast as hotToast } from "react-hot-toast";
import { mutate } from "swr";

const TaskCard = React.memo(({ task, onClick }: { task: TaskAssignment, onClick: () => void }) => {
  const statusConfig: Record<string, { icon: React.ReactNode, variant: "default" | "success" | "warning" | "danger" | "info" | "gold", label: string }> = {
    PENDING: { icon: <Clock size={16} />, variant: "warning", label: "Đang chờ" },
    IN_PROGRESS: { icon: <Loader2 size={16} className="animate-spin" />, variant: "info", label: "Đang thực hiện" },
    COMPLETED: { icon: <CheckCircle2 size={16} />, variant: "success", label: "Hoàn thành" },
    OVERDUE: { icon: <AlertCircle size={16} />, variant: "danger", label: "Trễ hạn" },
  };

  const typeLabel = task.type === "MAIL_VE_TINH" ? "Vệ tinh" : task.type === "MAIL_MONETIZED" ? "Kiếm tiền" : "Gốc";

  return (
    <motion.div
      onClick={onClick}
      className="group relative bg-white/0 border border-white/0 rounded-[32px] p-6 cursor-pointer transition-all hover:bg-gold/5 hover:border-white/0 flex flex-col h-full shadow-2xl overflow-hidden"
    >
      <div className="absolute top-0 right-0 h-32 w-32 bg-gold/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-gold/10 transition-colors" />
      <div className="flex items-center justify-between mb-6 relative z-10">
        <Badge variant={statusConfig[task.status]?.variant || "default"}>
          {statusConfig[task.status]?.icon || <Clock size={16} />} {statusConfig[task.status]?.label || "Đang chờ"}
        </Badge>
        <div className="h-10 w-10 rounded-full bg-white/5 border border-white/0 flex items-center justify-center text-gold opacity-0 group-hover:opacity-100 transition-all">
          <ArrowRight size={20} />
        </div>
      </div>

      <h3 className="text-xl font-black text-white transition-colors mb-4 line-clamp-2 leading-tight uppercase tracking-tighter relative z-10">
        {task.title}
      </h3>

      <div className="mt-auto pt-6 border-t border-white/0 space-y-4 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{typeLabel}</span>
          <span className="text-sm font-bold text-white flex items-center gap-2">
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState("ALL");
  const [notification, setNotification] = useState<string | null>(null);

  const [mails, setMails] = useState<MailData[]>([]);
  const [selectedMailForConfig, setSelectedMailForConfig] = useState<MailData | null>(null);

  // States for template allocation flow
  const [adminTab, setAdminTab] = useState<"ASSIGN" | "TASKS">("ASSIGN");
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

  // State to store batches from database
  const [dbBatches, setDbBatches] = useState<any[]>([]);

  // Custom selector state for "Check, xóa, tạo"
  const [isSelectMailModalOpen, setIsSelectMailModalOpen] = useState<boolean>(false);
  const [selectedMailIdsForTask, setSelectedMailIdsForTask] = useState<string[]>([]);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Worksheet states for staff
  const [taskMailsList, setTaskMailsList] = useState<MailData[]>([]);
  const [loadingTaskMails, setLoadingTaskMails] = useState<boolean>(false);
  const [mailLinksState, setMailLinksState] = useState<Record<string, string[]>>({});
  const [savingMailId, setSavingMailId] = useState<string | null>(null);
  const [completingTask, setCompletingTask] = useState<boolean>(false);

  const toast = useMemo(() => ({
    success: (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
    }
  }), []);

  const handleCopy = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      toast.success("Đã sao chép!");
    } else {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      toast.success("Đã sao chép!");
    }
  };

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [staffSearch, setStaffSearch] = useState("");
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [staffOnlineFilter, setStaffOnlineFilter] = useState("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [taskPage, setTaskPage] = useState(1);
  const tasksPerPage = 8;

  const loadData = useCallback(async () => {
    try {
      const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      const roleUpper = String(currentUser?.role || "").toUpperCase();
      const isAuthorized = roleUpper === "01" || roleUpper === "ADMIN" || roleUpper === "02" || roleUpper === "QL CÔNG VIỆC" || roleUpper === "QUẢN LÝ CÔNG VIỆC";

      const fetches = [
        fetch("/api/admin/tasks").then(r => r.ok ? r.json() : null),
        fetch("/api/admin/users").then(r => r.ok ? r.json() : null),
        fetch("/api/admin/mail/satellite-batches").then(r => r.ok ? r.json() : null),
        isAuthorized ? fetch("/api/admin/mails").then(r => r.ok ? r.json() : null) : Promise.resolve(null)
      ];

      const [taskData, userData, batchesData, mailData] = await Promise.all(fetches);

      if (taskData && taskData.success) {
        const apiTasks = taskData.data.map((t: any): TaskAssignment => ({
          ...t,
          id: t._id,
          assigneeId: t.assigneeId?._id || t.assigneeId,
          assigneeName: t.assigneeId?.name || t.assigneeName
        }));
        setTasks(apiTasks);
      }
      
      if (userData && userData.success) {
        setStaffList(userData.data.filter((u: StaffData) => u.status === "ACTIVE" && u.role !== "01"));
      }

      if (batchesData && batchesData.success) {
        setDbBatches(batchesData.batches || []);
      }

      if (mailData && mailData.success) {
        const mapped = (mailData.data || []).map((m: any) => ({
          ...m,
          id: m._id
        }));
        setMails(mapped);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    loadData();
    const interval = setInterval(loadData, 30000);
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "global_tasks_data" || e.key === "global_mails_data" || e.key === "global_users") {
        loadData();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleUpper = String(user?.role || "").toUpperCase();
  const isAdminOrManager = roleUpper === "01" || 
    roleUpper === "ADMIN" || 
    roleUpper === "02" || 
    roleUpper === "QL CÔNG VIỆC" || 
    roleUpper === "QUẢN LÝ CÔNG VIỆC" ||
    roleUpper === "03" ||
    roleUpper === "QL NHÂN SỰ" ||
    roleUpper === "QUẢN LÝ NHÂN SỰ";
  const isStaff = roleUpper === "04" || roleUpper === "05" || roleUpper === "NHÂN VIÊN" || roleUpper === "NV THỬ VIỆC";

  useEffect(() => {
    if (isStaff && adminTab === "ASSIGN") {
      setAdminTab("TASKS");
    }
  }, [isStaff, adminTab]);

  const inventory = useMemo(() => {
    return {
      root: (mails || []).filter((m: MailData) => m.type === "ROOT" && !m.assigneeId).length,
      satellite: (mails || []).filter((m: MailData) => m.type === "SATELLITE" && !m.assigneeId).length,
      monetized: (mails || []).filter((m: MailData) => m.type === "MONETIZED" && !m.assigneeId).length,
    };
  }, [mails]);

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

  const satelliteBatches = useMemo(() => {
    const allSatellites = (mails || []).filter((m: MailData) => m.type === "SATELLITE");
    const batchNames = Array.from(new Set((allSatellites || []).map((m: MailData) => m.batchName).filter(Boolean))) as string[];
    
    return (batchNames || []).map((bName: string) => {
      const batchMails = allSatellites.filter((m: MailData) => m.batchName === bName);
      if (batchMails.length === 0) return null;
      
      const assignedTo = batchMails[0]?.assigneeId || "";
      const firstIdx = allSatellites.findIndex((m: MailData) => m.id === batchMails[0].id) + 1;
      const lastIdx = allSatellites.findIndex((m: MailData) => m.id === batchMails[batchMails.length - 1].id) + 1;

      return {
        name: bName,
        assignedTo: assignedTo,
        startIndex: firstIdx,
        endIndex: lastIdx
      };
    }).filter(Boolean) as any[];
  }, [mails]);

  const selectedUserId = targetStaffId;
  const filteredBatches = useMemo(() => {
    return (dbBatches || []).filter((batch: any) => batch && String(batch.assignedTo) === String(selectedUserId));
  }, [dbBatches, selectedUserId]);

  const filteredBatchesKey = useMemo(() => {
    return (filteredBatches || []).map((b: any) => b.name).join(",");
  }, [filteredBatches]);

  useEffect(() => {
    if ((filteredBatches || []).length > 0) {
      const hasCurrent = filteredBatches.some(b => b.name === selectedLo);
      if (!hasCurrent) {
        setSelectedLo(filteredBatches[0].name);
      }
    } else {
      setSelectedLo("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredBatchesKey]);

  useEffect(() => {
    if (!targetStaffId) return;
    const fetchUserBatches = async () => {
      try {
        const res = await fetch(`/api/admin/mail/satellite-batches?assignedTo=${targetStaffId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.batches) {
            setDbBatches(prev => {
              const other = prev.filter(b => String(b.assignedTo) !== String(targetStaffId));
              return [...other, ...data.batches];
            });
          }
        }
      } catch (err) {
        console.error("Lỗi fetch user batches:", err);
      }
    };
    fetchUserBatches();
  }, [targetStaffId]);

  const eligibleStaff = useMemo(() => {
    if (!user) return [];
    const is01 = user?.role === "01" || user?.role === "ADMIN";
    const is02 = user?.role === "02" || user?.role === "QUẢN LÝ CÔNG VIỆC";
    const is03 = user?.role === "03" || user?.role === "QL NHÂN SỰ" || user?.role === "QUẢN LÝ NHÂN SỰ";

    return (staffList || []).filter((s: StaffData) => {
      // Chỉ chọn nhân viên có trạng thái đang online
      if (!s.isOnline) return false;

      if (staffSearch) {
        const q = staffSearch.toLowerCase();
        const matches = s.name.toLowerCase().includes(q) || 
          s.username.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q));
        if (!matches) return false;
      }

      if (selectedTemplate === "Check, xóa, tạo" || selectedTemplate === "Kênh bật kiếm tiền") {
        return s.role === "02";
      }

      if (is01 || is03) {
        return s.role === "02" || s.role === "03" || s.role === "04" || s.role === "05";
      }
      if (is02) {
        return s.role === "03" || s.role === "04" || s.role === "05";
      }
      return false;
    });
  }, [staffList, user, selectedTemplate, staffSearch]);

  const userTasks = useMemo(() => {
    if (isAdminOrManager) {
      if (adminTab === "TASKS") {
        const vnDateStr = new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
        return (tasks || []).filter((t: TaskAssignment) => {
          const taskDate = (t as any).createdAt || (t as any).assignedAt;
          if (!taskDate) return false;
          const taskDateStr = new Date(new Date(taskDate).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
          return taskDateStr === vnDateStr;
        });
      }
      return tasks;
    }
    return (tasks || []).filter((t: TaskAssignment) => String(t.assigneeId) === String(user?.id));
  }, [tasks, user, isAdminOrManager, adminTab]);

  const todayTasksCount = useMemo(() => {
    const vnDateStr = new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return (tasks || []).filter((t: any) => {
      const taskDate = t.createdAt || t.assignedAt;
      if (!taskDate) return false;
      const taskDateStr = new Date(new Date(taskDate).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return taskDateStr === vnDateStr;
    }).length;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = userTasks;
    if (taskFilter !== "ALL") result = (result || []).filter((t: TaskAssignment) => t.status === taskFilter);
    return result;
  }, [taskFilter, userTasks]);

  const selectedTask = useMemo(() => tasks.find((t: TaskAssignment) => t.id === selectedTaskId), [selectedTaskId, tasks]);

  const taskIndex = useMemo(() => {
    if (!selectedTaskId || !selectedTask) return 0;
    // Find all tasks assigned to the same user
    const assigneeTasks = (tasks || []).filter((t: TaskAssignment) => String(t.assigneeId) === String(selectedTask.assigneeId));
    // Sort tasks in chronological order so that taskIndex is stable (oldest task is index 0)
    const sorted = [...assigneeTasks].sort((a: any, b: any) => new Date(a.createdAt || a.assignedAt || 0).getTime() - new Date(b.createdAt || b.assignedAt || 0).getTime());
    return sorted.findIndex(t => t.id === selectedTaskId);
  }, [tasks, selectedTaskId, selectedTask]);

  // Load task mails dynamically for selected task
  const selectedTaskBatch = selectedTask?.batch || (selectedTask as any)?.batchName || "";
  useEffect(() => {
    if (!selectedTaskId) {
      setTaskMailsList([]);
      return;
    }

    const fetchTaskMails = async () => {
      setLoadingTaskMails(true);
      try {
        let url = `/api/admin/mails?all=true`;
        if (selectedTaskBatch) {
          url += `&batch=${encodeURIComponent(selectedTaskBatch)}`;
        } else if (selectedTask) {
          const ids = (selectedTask.selectedMailIds || []).join(",") || 
                      ((selectedTask as any).mailIds || []).join(",");
          if (ids) {
            url += `&ids=${encodeURIComponent(ids)}`;
          } else {
            url += `&assigneeId=${encodeURIComponent(selectedTask.assigneeId || "")}`;
          }
        }

        const res = await fetch(url);
        if (res.ok) {
          const resData = await res.json();
          if (resData.success && resData.data) {
            const mapped = (resData.data || []).map((m: any) => ({
              ...m,
              id: m._id
            }));
            setTaskMailsList(mapped);
          }
        }
      } catch (err) {
        console.error("Lỗi fetch task mails:", err);
      } finally {
        setLoadingTaskMails(false);
      }
    };

    fetchTaskMails();
  }, [selectedTaskId, selectedTaskBatch]); // REMOVED selectedTask to prevent redundant re-fetching on interval updates

  const taskMailsListKey = useMemo(() => {
    return (taskMailsList || []).map((m: any) => `${m._id || m.id}-${(m.links || []).join(",")}`).join("|");
  }, [taskMailsList]);

  // Map link states when task mails load
  useEffect(() => {
    const initialState: Record<string, string[]> = {};
    if (taskMailsList && Array.isArray(taskMailsList)) {
      taskMailsList.forEach((mail: any) => {
        const mailId = mail._id || mail.id;
        initialState[mailId] = [
          mail.links?.[0] || "",
          mail.links?.[1] || "",
          mail.links?.[2] || ""
        ];
      });
    }
    setMailLinksState(initialState);
  }, [taskMailsListKey]);

  const taskMails: MailData[] = useMemo(() => {
    if (!selectedTask) return [];
    if (isStaff) {
      return taskMailsList;
    }
    
    let mailType = "ROOT";
    if (selectedTask.type === "MAIL_VE_TINH") mailType = "SATELLITE";
    if (selectedTask.type === "MAIL_MONETIZED") mailType = "MONETIZED";

    if (selectedTask.selectedMailIds && Array.isArray(selectedTask.selectedMailIds)) {
      return (mails || []).filter((m: MailData) => selectedTask.selectedMailIds?.includes(m.id));
    }

    let filtered = (mails || []).filter((m: MailData) => m.type === mailType && String(m.assigneeId) === String(selectedTask.assigneeId));

    if (selectedTask.title === "Check, xóa, tạo" || selectedTask.title === "Kênh bật kiếm tiền") {
      if (selectedTask.mailRange) {
        const parts = selectedTask.mailRange.split("-");
        if ((parts || []).length === 2) {
          const start = parseInt(parts[0].trim());
          const end = parseInt(parts[1].trim());
          const withSTT = (mails || []).filter((m: MailData) => m.type === mailType).map((m: MailData, idx: number) => ({ ...m, currentSTT: idx + 1 }));
          const idsInRange = (withSTT || []).filter((m: any) => m.currentSTT >= start && m.currentSTT <= end).map((m: any) => m.id);
          filtered = (filtered || []).filter((m: MailData) => idsInRange.includes(m.id));
        }
      }
    } else if (selectedTask.title === "Làm kênh") {
      if (selectedTask.mailRange) {
        const cleanBatch = (selectedTask as any).batch || selectedTask.mailRange.split(" (")[0];
        filtered = (filtered || []).filter((m: MailData) => m.batchName === cleanBatch);
      }
    } else if (selectedTask.title === "Mời kênh" && selectedTask.mailRange) {
      const parts = selectedTask.mailRange.split("+");
      const loPart = parts.pop()?.trim();
      filtered = (mails || []).filter((m: MailData) => 
        (m.type === "SATELLITE" && m.batchName === loPart && String(m.assigneeId) === String(selectedTask.assigneeId)) ||
        (m.type === "ROOT" && selectedTask.note && selectedTask.note.includes(m.email))
      );
    }

    if (user?.role === "03" || user?.role === "04" || user?.role === "05") {
      filtered = (filtered || []).filter((m: MailData) => String(m.assigneeId) === String(user.id));
    }

    return filtered;
  }, [mails, selectedTask, user, taskMailsList, isStaff]);

  const handleSaveUnifiedDetails = useCallback(async (mailId: string | number, updatedFields: any) => {
    try {
      const additionalFields: any = {};
      if (updatedFields.workStatus) {
        additionalFields.workStatus = updatedFields.workStatus;
        if (updatedFields.workStatus === "Đã làm") {
          additionalFields.status = "USED";
        }
      } else if (updatedFields.links && Array.isArray(updatedFields.links) && updatedFields.links.filter(Boolean).length === 3) {
        additionalFields.status = "USED";
        additionalFields.workStatus = "Đã làm";
      }

      const res = await fetch(`/api/admin/mails/${mailId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updatedFields, ...additionalFields })
      });

      if (res.ok) {
        hotToast.success("Lưu dữ liệu thành công");
        hotToast.success("Đã cập nhật!");
        toast.success("Lưu dữ liệu thành công");
        
        // Refresh local task mails list
        setTaskMailsList(prev => prev.map((m: any) => {
          const mId = m._id || m.id;
          if (String(mId) === String(mailId)) {
            return { ...m, ...updatedFields, ...additionalFields };
          }
          return m;
        }));

        setMails((prevMails: MailData[]) => prevMails.map((m: MailData) => {
          const mId = m._id || m.id;
          return String(mId) === String(mailId) ? { ...m, ...updatedFields, ...additionalFields } : m;
        }));

        mutate("/api/admin/tasks");
        try {
          mutate((key: any) => typeof key === "string" && key.includes("/api/admin/mails"));
        } catch (e) {
          console.error("SWR mutate filter error:", e);
        }

        window.dispatchEvent(new Event("storage"));
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Cập nhật chi tiết mail thất bại.");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối máy chủ khi lưu chi tiết mail!");
    }
  }, []);

  const handleLinkChange = (mailId: string, index: number, value: string) => {
    setMailLinksState(prev => {
      const current = prev[mailId] ? [...prev[mailId]] : ["", "", ""];
      current[index] = value;
      return { ...prev, [mailId]: current };
    });
  };

  const handleSaveMailLinks = async (mail: any) => {
    const mailId = mail._id || mail.id;
    const links = mailLinksState[mailId] || ["", "", ""];

    // Validation
    const linksCount = (links || []).filter(l => typeof l === 'string' && l.trim() !== "").length;
    const isLoiStatus = (mail.workStatus || "").toLowerCase() === "lỗi";
    if (!isLoiStatus && linksCount < 3) {
      hotToast.error("Thiếu kênh hoặc sai định dạng! Vui lòng điền đủ 3 link kênh hợp lệ trước khi cập nhật.");
      return;
    }

    setSavingMailId(mailId);
    try {
      const res = await fetch(`/api/admin/mails/${mailId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          links: links.map(l => l.trim()),
          status: "USED",
          workStatus: "Đã làm"
        })
      });

      if (res.ok) {
        setNotification(`Đã lưu báo cáo cho mail ${mail.email} thành công!`);
        setTimeout(() => setNotification(null), 3000);
        // Refresh local task mails list
        setTaskMailsList(prev => prev.map((m: any) => {
          const mId = m._id || m.id;
          if (mId === mailId) {
            return { ...m, links, status: "USED", workStatus: "Đã làm" };
          }
          return m;
        }));
      } else {
        const errData = await res.json();
        alert(errData.error || "Lưu thất bại!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối máy chủ khi lưu mail!");
    } finally {
      setSavingMailId(null);
    }
  };

  const isTaskCompleteEligible = useMemo(() => {
    if (!isStaff || taskMailsList.length === 0) return false;
    return taskMailsList.every((mail: any) => {
      if (mail.workStatus === "Lỗi") return true;
      const hasLinks = mail.links && 
        mail.links[0]?.trim() !== "" && 
        mail.links[1]?.trim() !== "" && 
        mail.links[2]?.trim() !== "";
      return (mail.workStatus === "Đã làm" || mail.status === "USED") && hasLinks;
    });
  }, [taskMailsList, isStaff]);

  const handleCompleteTask = async () => {
    if (!selectedTaskId || !selectedTask) return;
    setCompletingTask(true);
    try {
      const res = await fetch(`/api/admin/tasks/${selectedTaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED"
        })
      });

      if (res.ok) {
        setNotification("Chúc mừng! Bạn đã hoàn thành nhiệm vụ xuất sắc!");
        setTimeout(() => setNotification(null), 4000);
        setSelectedTaskId(null); // Go back to task list
        loadData(); // Reload tasks
      } else {
        const errData = await res.json();
        alert(errData.error || "Cập nhật trạng thái nhiệm vụ thất bại!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối máy chủ khi hoàn thành nhiệm vụ!");
    } finally {
      setCompletingTask(false);
    }
  };

  const handleCustomAssignmentSubmit = useCallback(() => {
    if (!targetStaffId) {
      alert("Vui lòng chọn nhân viên nhận việc.");
      return;
    }

    const selectedStaff = staffList.find((s: StaffData) => String(s.id) === String(targetStaffId));
    if (!selectedStaff) return;

    let assignedIds: string[] = [];
    let assignedStts: number[] = [];
    let note = assignmentNote;
    let mailCount = 0;
    let typeLabel = "ROOT";
    let taskType: "MAIL_GOC" | "MAIL_VE_TINH" | "MAIL_MONETIZED" = "MAIL_GOC";
    let mailRangeStr = "";

    if (selectedTemplate === "Check, xóa, tạo") {
      typeLabel = "ROOT";
      taskType = "MAIL_GOC";
      if ((selectedMailIdsForTask || []).length === 0) {
        alert("Vui lòng chọn nhân viên nhận việc trước!");
        return;
      }
      assignedIds = [...selectedMailIdsForTask];
      mailCount = assignedIds.length;
      
      const mailsOfType = (mails || []).filter((m: MailData) => m.type === "ROOT");
      assignedStts = assignedIds.map(id => {
        const mailObj = mails.find(m => String(m._id || m.id) === id);
        return mailObj ? (mailObj.stt || 0) : 0;
      }).filter(Boolean);

      const indices = assignedIds.map((id: string) => mailsOfType.findIndex((m: MailData) => String(m._id || m.id) === id) + 1).filter((idx: number) => idx > 0).sort((a: number, b: number) => a - b);
      mailRangeStr = indices.length > 0 ? `${indices[0]}-${indices[indices.length - 1]}` : `${mailCount} mail`;
    } 
    else if (selectedTemplate === "Làm kênh") {
      typeLabel = "SATELLITE";
      taskType = "MAIL_VE_TINH";
      
      const allSatellites = [...(mails || []).filter((m: MailData) => m.type === "SATELLITE")]
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      const batchMails = allSatellites.filter((m: MailData) => m.batchName === selectedLo);
      if (batchMails.length === 0) {
        alert(`Lô ${selectedLo} không hợp lệ hoặc không tìm thấy mail vệ tinh nào.`);
        return;
      }
      
      const currentBatch = dbBatches.find((b: any) => b.name === selectedLo);
      let batchRange = "";
      if (currentBatch && currentBatch.startIndex !== undefined && currentBatch.endIndex !== undefined) {
        batchRange = `${currentBatch.startIndex}-${currentBatch.endIndex}`;
      } else {
        const firstIdx = allSatellites.findIndex((m: MailData) => String(m._id || m.id) === String(batchMails[0]._id || batchMails[0].id)) + 1;
        const lastIdx = allSatellites.findIndex((m: MailData) => String(m._id || m.id) === String(batchMails[batchMails.length - 1]._id || batchMails[batchMails.length - 1].id)) + 1;
        batchRange = `${firstIdx}-${lastIdx}`;
      }
      
      assignedIds = batchMails.map((m: MailData) => String(m._id || m.id));
      assignedStts = batchMails.map((m: MailData) => m.stt || m.id || 0);
      mailCount = assignedIds.length;
      mailRangeStr = `${selectedLo} (STT ${batchRange})`;
      note = `${note} - Lô gán: ${selectedLo} (STT ${batchRange})`;
    } 
    else if (selectedTemplate === "Kênh bật kiếm tiền") {
      typeLabel = "MONETIZED";
      taskType = "MAIL_MONETIZED";
      const mailsOfType = (mails || []).filter((m: MailData) => m.type === "MONETIZED");
      const mailsWithSTT = mailsOfType.map((m: MailData, idx: number) => ({ ...m, currentSTT: idx + 1 }));
      const selectedMails = mailsWithSTT
        .filter((m: any) => m.currentSTT >= mailRangeStart && m.currentSTT <= mailRangeEnd && !m.assigneeId);

      assignedIds = selectedMails.map((m: any) => String(m._id || m.id));
      assignedStts = selectedMails.map((m: any) => m.stt || m.id || 0);

      if (assignedIds.length === 0) {
        alert("Không tìm thấy mail bật kiếm tiền khả dụng trong dải STT này.");
        return;
      }
      mailCount = assignedIds.length;
      mailRangeStr = `${mailRangeStart} - ${mailRangeEnd}`;

      if (user?.role === "01" && selectedStaff.role === "02") {
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

      const rootMail = mails.find((m: MailData) => String(m._id || m.id) === String(selectedRootMailId));
      if (!rootMail) return;

      const targetMails = (mails || []).filter((m: MailData) => 
        m.type === "SATELLITE" && 
        (String(m.assigneeId) === String(targetStaffId) || !m.assigneeId) && 
        m.batchName === selectedMoiKenhLo
      );

      if (targetMails.length === 0) {
        alert(`Không tìm thấy mail vệ tinh thuộc ${selectedMoiKenhLo} của nhân sự này.`);
        return;
      }

      const selectedMails = [rootMail, ...targetMails];
      assignedIds = selectedMails.map((m: MailData) => String(m._id || m.id));
      assignedStts = selectedMails.map((m: MailData) => m.stt || m.id || 0);
      mailCount = assignedIds.length;
      mailRangeStr = `Ghép cặp: Mail gốc (${rootMail.email}) + ${selectedMoiKenhLo}`;
      note = `${note} (Ghép cặp Mail Gốc: ${rootMail.email} với ${selectedMoiKenhLo} vệ tinh)`;
    }

    const newTask: any = {
      title: selectedTemplate,
      type: taskType,
      assigneeId: selectedStaff.id,
      assigneeName: selectedStaff.name,
      progress: 0,
      status: "PENDING",
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      mailCount: mailCount,
      note: note,
      mailRange: mailRangeStr,
      batch: selectedTemplate === "Làm kênh" ? selectedLo : "",
      range: mailRangeStr,
      mailType: typeLabel as any,
      selectedMailIds: selectedTemplate === "Check, xóa, tạo" ? assignedStts : undefined,
      mailIds: assignedIds
    };

    setIsSubmitting(true);
    fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask)
    })
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        try {
          await fetch("/api/admin/mails/batch-update", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ids: assignedIds,
              updateData: {
                assigneeId: selectedStaff.id,
                assignedTo: selectedStaff.name,
                assignmentNote: note,
                workStatus: typeLabel === "ROOT" ? "Đang xử lý" : (typeLabel === "MONETIZED" ? "Chưa bán" : "Chưa làm"),
                updatedBy: user?.name || "Admin"
              }
            })
          });
        } catch (dbErr) {
          console.error("Lỗi đồng bộ gán mail xuống DB:", dbErr);
        }

        setNotification(`Đã giao việc thành công cho ${selectedStaff.name}!`);
        setTimeout(() => setNotification(null), 4000);
        setSelectedMailIdsForTask([]);
        loadData();
      } else {
        const errData = await res.json().catch(() => ({}));
        setNotification(errData.error || "Giao việc thất bại");
        setTimeout(() => setNotification(null), 4000);
      }
    })
    .catch(err => {
      console.error("Lỗi giao việc:", err);
    })
    .finally(() => {
      setIsSubmitting(false);
    });
  }, [targetStaffId, selectedTemplate, selectedLo, selectedMoiKenhLo, selectedRootMailId, monetizedOption, mailRangeStart, mailRangeEnd, assignmentNote, staffList, user, mails, selectedMailIdsForTask, loadData]);

  const updateTaskStatus = useCallback((newStatus: "IN_PROGRESS" | "COMPLETED") => {
    if (!selectedTaskId || !selectedTask) return;

    if (newStatus === "COMPLETED" && selectedTask?.type === "MAIL_VE_TINH") {
      const errorMails: string[] = [];
      taskMails.forEach((m: MailData) => {
        if (m.workStatus === "Lỗi") return;
        const activeLinks = (m.links || []).filter((l: string) => typeof l === 'string' && l.trim() !== "");
        if (activeLinks.length < 3) {
          errorMails.push(`- ${m.email} (thiếu ${3 - activeLinks.length} kênh)`);
        } else if (activeLinks.some((l: string) => !validateYouTubeUrl(l))) {
          errorMails.push(`- ${m.email} (có link kênh sai định dạng YouTube)`);
        }
      });

      if (errorMails.length > 0) {
        alert("KHÔNG THỂ HOÀN THÀNH!\nCác mail vệ tinh sau chưa đúng yêu cầu:\n" + errorMails.join("\n"));
        return;
      }
    }

    fetch(`/api/admin/tasks/${selectedTaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        progress: newStatus === "COMPLETED" ? 100 : (selectedTask.progress === 100 ? 50 : selectedTask.progress)
      })
    })
    .then(async (res) => {
      if (res.ok) {
        setNotification(`Đã chuyển trạng thái nhiệm vụ sang: ${newStatus === "COMPLETED" ? "Hoàn thành" : "Đang xử lý"}`);
        setTimeout(() => setNotification(null), 3000);
        loadData();
      }
    });
  }, [selectedTaskId, selectedTask, taskMails, loadData]);

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4 select-none relative overflow-hidden">
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -50, x: "-50%" }} animate={{ opacity: 1, y: 30, x: "-50%" }} exit={{ opacity: 0, y: -50, x: "-50%" }} className="fixed top-0 left-1/2 z-[500] bg-gold text-sidebar px-8 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 font-black text-base uppercase tracking-widest border border-white/5">
            <CheckCircle2 size={24} className="animate-bounce" />{notification}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between flex-shrink-0 gap-4">
        <div className="flex items-center gap-6">
          {selectedTaskId && (
            <button onClick={() => setSelectedTaskId(null)} className="h-14 w-14 rounded-2xl bg-white/5 border border-white/0 flex items-center justify-center text-gray-500 hover:text-gold hover:border-white/0 transition-all shadow-xl">
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
        {isAdminOrManager && !selectedTaskId && (
          <div className="flex bg-white/5 rounded-2xl p-1 border border-white/0">
            <button 
              onClick={() => setAdminTab("ASSIGN")}
              className={`px-4 py-2 rounded-xl text-sm font-black uppercase transition-all ${adminTab === "ASSIGN" ? "bg-gold text-sidebar shadow-lg" : " text-gray-400 hover:text-white"}`}
            >
              Giao việc
            </button>
            <button 
              onClick={() => setAdminTab("TASKS")}
              className={`px-4 py-2 rounded-xl text-sm font-black uppercase transition-all ${adminTab === "TASKS" ? "bg-gold text-sidebar shadow-lg" : " text-gray-400 hover:text-white"}`}
            >
              Task hôm nay ({todayTasksCount})
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden mt-4">
        <AnimatePresence mode="wait">
          {!selectedTaskId ? (
            isAdminOrManager && adminTab === "ASSIGN" ? (
              <motion.div key="admin-delegation" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto pr-2 pb-10">
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
                        className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all flex flex-col h-full justify-between relative overflow-hidden group ${selectedTemplate === tmpl.title ? "bg-gold/10 border-gold shadow-[0_0_40px_rgba(212,175,55,0.15)]" : " bg-white/5 border-white/0 hover:border-white/10"}`}
                      >
                        <div className="absolute top-0 right-0 h-24 w-24 bg-gold/5 blur-[30px] -mr-12 -mt-12 group-hover:bg-gold/10 transition-all" />
                        <div>
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border mb-4 transition-all ${selectedTemplate === tmpl.title ? "bg-gold/20 text-gold border-white/0" : " bg-white/5 text-gray-500 border-white/0"}`}>
                            {tmpl.icon}
                          </div>
                          <h3 className="text-base font-black text-white uppercase tracking-tight mb-2">{tmpl.title}</h3>
                          <p className="text-[10px] text-gray-500 leading-relaxed">{tmpl.desc}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between pt-4 border-t border-white/0">
                          <span className="text-[9px] font-black text-gold uppercase tracking-wider">{tmpl.type}</span>
                          <span className="text-[8px] font-bold uppercase">Dự kiến 3 ngày</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-7 bg-[#0b0b0b] border border-white/0 rounded-[48px] p-8 md:p-10 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 h-96 w-96 bg-gold/5 blur-[120px] -mr-48 -mt-48" />
                  
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-4 border-b border-white/0 pb-4">
                      <div className="h-10 w-10 bg-gold/15 text-gold border border-gold/20 rounded-xl flex items-center justify-center">
                        <Users size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">Cấu hình Giao việc</h3>
                        <p className="text-[9px] font-bold text-gray-500 uppercase mt-1 tracking-widest">Giao mẫu: <span className="text-gold">{selectedTemplate}</span></p>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1 p-6 bg-white/0 border border-white/0 rounded-3xl items-center text-center">
                      <div className="col-span-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Mail Gốc</p>
                        <p className="text-base font-black text-gold">{inventory.root} <span className="text-[8px] text-gray-500 font-bold block">Khả dụng</span></p>
                      </div>
                      <div className="col-span-1 flex justify-center text-white/5 font-light">|</div>
                      <div className="col-span-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Vệ Tinh</p>
                        <p className="text-base font-black text-gold">{inventory.satellite} <span className="text-[8px] text-gray-500 font-bold block">Khả dụng</span></p>
                      </div>
                      <div className="col-span-1 flex justify-center text-white/5 font-light">|</div>
                      <div className="col-span-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Kiếm Tiền</p>
                        <p className="text-base font-black text-gold">{inventory.monetized} <span className="text-[8px] text-gray-500 font-bold block">Khả dụng</span></p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-4 relative z-50">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tìm kiếm & Chọn nhân viên thực hiện (Chỉ hiển thị người online)</label>
                        <div className="relative w-full">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-secondary w-5 h-5 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Nhập tên nhân viên đang online..."
                            value={staffSearch}
                            onChange={(e) => {
                              setStaffSearch(e.target.value);
                              setShowStaffDropdown(true);
                            }}
                            onFocus={() => setShowStaffDropdown(true)}
                            className="w-full pl-14 pr-4 h-14 bg-background-secondary border border-border rounded-md text-foreground text-base placeholder-foreground-secondary/40 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                          />
                        </div>

                        <AnimatePresence>
                          {showStaffDropdown && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowStaffDropdown(false)}></div>
                              <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden"
                              >
                                {(eligibleStaff || []).length === 0 ? (
                                  <div className="p-4 text-center text-gray-500 text-sm">Không tìm thấy nhân viên online phù hợp.</div>
                                ) : (
                                  (eligibleStaff || []).map((staff: StaffData) => (
                                    <button
                                      key={staff.id}
                                      type="button"
                                      onClick={() => {
                                        setTargetStaffId(staff.id);
                                        setStaffSearch(`${staff.name} (@${staff.username})`);
                                        setShowStaffDropdown(false);
                                      }}
                                      className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-3 ${targetStaffId === staff.id ? 'bg-gold/10 text-gold' : 'text-white'}`}
                                    >
                                      <div className="relative">
                                        <div className="w-8 h-8 rounded-full bg-sidebar flex items-center justify-center border border-white/10">
                                          <User size={14} className={targetStaffId === staff.id ? 'text-gold' : 'text-gray-400'} />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#121212]"></div>
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold">{staff.name}</p>
                                        <p className="text-xs text-gray-500">@{staff.username} • {staff.role === "02" ? "QL Công Việc" : staff.role === "03" ? "QL Nhân Sự" : "Nhân viên"}</p>
                                      </div>
                                    </button>
                                  ))
                                )}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
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
                          className="w-full h-14 bg-[#0a0a0a] hover:bg-gold/5 text-gold border border-gold/20 hover:border-white/5 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg"
                        >
                          <Mail size={16} />
                          {(selectedMailIdsForTask || []).length > 0 
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
                            disabled={!selectedUserId}
                            className={`w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 cursor-pointer transition-all ${!selectedUserId ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            <option value="" className="bg-zinc-900 text-white">
                              {!selectedUserId ? '-- Vui lòng chọn nhân viên trước --' : '-- Chọn Lô --'}
                            </option>
                            {(filteredBatches || []).map(batch => {
                              const bNameClean = (batch.name || "").replace(/\s*\(.*\)$/, "");
                              return (
                                <option key={batch.name} value={batch.name} className="bg-zinc-900 text-white">
                                  {bNameClean} ({batch.mailCount || 0} mail ({batch.startIndex || 0} - {batch.endIndex || 0}))
                                </option>
                              );
                            })}
                          </select>
                          {targetStaffId && (filteredBatches || []).length === 0 && (
                            <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mt-1">Không có lô vệ tinh chưa gán nào khả dụng cho nhân viên này!</p>
                          )}
                          {!targetStaffId && (
                            <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mt-1">⚠️ Hãy chọn nhân viên phía trên trước khi chọn Lô vệ tinh.</p>
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
                              className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Đến STT (Tổng {inventory.monetized})</label>
                            <input 
                              type="number"
                              value={mailRangeEnd}
                              onChange={(e) => setMailRangeEnd(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 transition-all"
                            />
                          </div>
                        </div>
                        
                        {user?.role === "01" && eligibleStaff.find(s => s.id === targetStaffId)?.role === "02" && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gold uppercase tracking-widest ml-1">Phương thức xử lý</label>
                            <select 
                              value={monetizedOption}
                              onChange={(e) => setMonetizedOption(e.target.value)}
                              className="w-full h-14 bg-gold/10 border-2 border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-gold cursor-pointer transition-all"
                            >
                              <option value="Kháng kênh" className="bg-zinc-900 text-white">Kháng kênh</option>
                              <option value="Nối GA" className="bg-zinc-900 text-white">Nối GA</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedTemplate === "Mời kênh" && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chọn Mail Gốc</label>
                          <select 
                            value={selectedRootMailId}
                            onChange={(e) => setSelectedRootMailId(e.target.value)}
                            className="w-full h-14 bg-black/20 border border-white/10 rounded-2xl px-6 text-white text-base outline-none focus:border-gold cursor-pointer transition-all"
                          >
                            <option value="" className="bg-zinc-900 text-white">-- Chọn Mail Gốc trong DB --</option>
                            {(mails || []).filter((m: MailData) => m.type === "ROOT" && m.verificationStatus === "Đã xanh" && !m.assigneeId).map((m: MailData) => (
                              <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
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
                            disabled={!targetStaffId}
                            className={`w-full h-14 bg-black/20 border border-white/10 rounded-2xl px-6 text-white text-base outline-none focus:border-gold cursor-pointer transition-all ${!targetStaffId ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            <option value="" className="bg-zinc-900 text-white">{!targetStaffId ? '-- Vui lòng chọn nhân viên trước --' : '-- Chọn Lô Vệ Tinh --'}</option>
                            {(filteredBatches || []).map(b => (
                              <option key={b.name} value={b.name} className="bg-zinc-900 text-white">{b.name}</option>
                            ))}
                          </select>
                          {!targetStaffId && (
                            <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mt-1">⚠️ Hãy chọn nhân viên phía trên trước khi chọn Lô vệ tinh.</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ghi chú & Yêu cầu công việc</label>
                      <textarea
                        value={assignmentNote}
                        onChange={(e) => setAssignmentNote(e.target.value)}
                        placeholder="Nhập ghi chú hoặc yêu cầu chi tiết cho nhân viên..."
                        className="w-full h-24 bg-white/5 border border-white/0 rounded-2xl p-6 text-white text-base outline-none focus:border-white/5 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="mt-8 relative z-10 pt-4 border-t border-white/0">
                    <button 
                      onClick={handleCustomAssignmentSubmit}
                      disabled={isSubmitting}
                      className="w-full h-14 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-gold/20 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Zap size={16} />}
                      {isSubmitting ? "Đang xử lý..." : "Giao công việc & Kích hoạt real-time"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : isStaff ? (
              <motion.div key="staff-table" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 bg-zinc-950/10 border border-white/5 rounded-[32px] overflow-hidden flex flex-col shadow-2xl">
                <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="sticky top-0 bg-[#0d0d0d] z-30 shadow-xl">
                      <tr className="border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                        <th className="px-8 py-5">Tên công việc</th>
                        <th className="px-6 py-5">Lô mail được giao</th>
                        <th className="px-6 py-5 text-center">Trạng thái</th>
                        <th className="px-6 py-5 text-center">Ngày giao</th>
                        <th className="px-8 py-5 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center">
                            <div className="py-16 flex flex-col items-center justify-center gap-3">
                              <Loader2 size={32} className="animate-spin text-gold" />
                              <p className="text-foreground-secondary font-black uppercase text-[10px] tracking-widest animate-pulse">Đang tải danh sách nhiệm vụ...</p>
                            </div>
                          </td>
                        </tr>
                      ) : filteredTasks.length > 0 ? (
                        filteredTasks.map((task: TaskAssignment) => {
                          const dateStr = (task as any).createdAt || (task as any).assignedAt ? new Date((task as any).createdAt || (task as any).assignedAt).toLocaleDateString("vi-VN") : "---";
                          const batchName = (task as any).batch || (task as any).batchName || (task as any).mailRange || "---";
                          return (
                            <tr key={task.id} className="group hover:bg-zinc-800/30 bg-zinc-900/[0.01] transition-all">
                              <td className="px-8 py-5">
                                <span className="text-base font-black text-white uppercase tracking-tight group-hover:text-gold transition-all">{task.title}</span>
                              </td>
                              <td className="px-6 py-5 text-zinc-300 font-bold">
                                {batchName}
                              </td>
                              <td className="px-6 py-5 text-center">
                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                                  task.status === "COMPLETED"
                                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                                    : task.status === "IN_PROGRESS"
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                }`}>
                                  {task.status === "COMPLETED" ? "Hoàn thành" : task.status === "IN_PROGRESS" ? "Đang làm" : "Đang chờ"}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-center text-sm text-gray-400 font-medium">
                                {dateStr}
                              </td>
                              <td className="px-8 py-5 text-right">
                                <button
                                  onClick={() => setSelectedTaskId(task.id)}
                                  className="h-10 px-5 bg-gold/15 text-gold hover:bg-gold hover:text-sidebar rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2"
                                >
                                  ▶️ Bắt đầu làm
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4">
                            <div className="border border-dashed border-gold/30 bg-black/50 p-8 text-center rounded-lg my-2">
                              <Inbox size={48} className="mx-auto text-gold/50 mb-4 animate-bounce" />
                              <h4 className="text-gold font-bold uppercase text-sm tracking-wider mb-2">KHÔNG CÓ NHIỆM VỤ ĐƯỢC GIAO</h4>
                              <p className="text-gray-400 text-xs max-w-md mx-auto mb-4 leading-relaxed">
                                Bạn chưa được giao nhiệm vụ nào hoặc đã hoàn thành toàn bộ công việc được phân công.
                              </p>
                              <span className="inline-block px-3 py-1 bg-white/5 border border-border text-foreground-secondary uppercase tracking-widest text-[9px] font-black rounded-sm">
                                Vui lòng liên hệ quản lý để nhận việc
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              <motion.div key="staff-grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-10">
                  {isLoading ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center gap-3">
                      <Loader2 size={36} className="animate-spin text-gold" />
                      <p className="text-foreground-secondary font-black uppercase text-xs tracking-widest animate-pulse">Đang tải danh sách nhiệm vụ...</p>
                    </div>
                  ) : filteredTasks.length > 0 ? (
                    filteredTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />)
                  ) : (
                    <div className="col-span-full">
                      <div className="border border-dashed border-gold/30 bg-black/50 p-10 text-center rounded-lg max-w-xl mx-auto my-10">
                        <ClipboardList size={56} className="mx-auto text-gold/50 mb-4 animate-pulse" />
                        <h3 className="text-gold font-bold uppercase text-lg tracking-wider mb-2">CHƯA CÓ NHIỆM VỤ NÀO</h3>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                          Hệ thống chưa tạo lập hay giao nhiệm vụ nào cho nhân sự trong ngày hôm nay.
                        </p>
                        {isAdminOrManager && (
                          <button
                            onClick={() => setAdminTab("ASSIGN")}
                            className="px-6 py-3 bg-gold hover:bg-yellow-500 text-sidebar font-black uppercase text-xs tracking-widest rounded-sm transition-all shadow-lg shadow-gold/10"
                          >
                            Giao công việc ngay
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          ) : (
            <motion.div key="detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex-1 flex flex-col gap-6 overflow-hidden">
              <div className="bg-white/0 border border-white/0 rounded-[40px] p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shadow-2xl">
                <div className="flex flex-wrap items-center gap-6 md:gap-10">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Loại nhiệm vụ</span>
                    <span className="text-base font-black text-gold uppercase">{selectedTask?.title}</span>
                  </div>
                  <div className="h-10 w-px bg-white/0 hidden md:block" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Chi tiết công việc</span>
                    <span className="text-sm font-bold text-white max-w-md">{selectedTask?.note} ({selectedTask?.mailRange})</span>
                  </div>
                  <div className="h-10 w-px bg-white/0 hidden md:block" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Số lượng</span>
                    <span className="text-base font-black text-white">{selectedTask?.mailCount} Mail</span>
                  </div>
                  <div className="h-10 w-px bg-white/0 hidden md:block" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Tiến độ tổng</span>
                    <span className="text-base font-black text-white">{selectedTask?.progress}% ({selectedTask?.status === "COMPLETED" ? "Hoàn thành" : selectedTask?.status === "IN_PROGRESS" ? "Đang xử lý" : "Đang chờ"})</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                  {isStaff && isTaskCompleteEligible && selectedTask?.status !== "COMPLETED" && (
                    <button 
                      onClick={handleCompleteTask}
                      disabled={completingTask}
                      className="h-14 px-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 rounded-2xl flex items-center justify-center gap-2 font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-green-500/20 animate-pulse disabled:opacity-50"
                    >
                      {completingTask ? <Loader2 className="animate-spin" size={18} /> : "🎯 Hoàn thành Nhiệm Vụ"}
                    </button>
                  )}

                  {isStaff && selectedTask?.status === "PENDING" && (
                    <button 
                      onClick={() => updateTaskStatus("IN_PROGRESS")}
                      className="h-14 px-6 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest hover:bg-blue-500/30 transition-all"
                    >
                      Báo: Đang xử lý
                    </button>
                  )}
                  
                  {!isAdminOrManager && !isStaff && (
                    <>
                      <button 
                        onClick={() => updateTaskStatus("IN_PROGRESS")}
                        className={`h-14 px-6 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest border transition-all ${selectedTask?.status === "IN_PROGRESS" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : " bg-white/5 text-gray-400 border-white/0 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20"}`}
                      >
                        Đang xử lý
                      </button>
                      <button 
                        onClick={() => updateTaskStatus("COMPLETED")}
                        className={`h-14 px-6 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest border transition-all ${selectedTask?.status === "COMPLETED" ? "bg-green-500/20 text-green-400 border-green-500/30" : " bg-white/5 text-gray-400 border-white/0 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20"}`}
                      >
                        Hoàn thành
                      </button>
                    </>
                  )}
                  
                  <button 
                    onClick={() => setSelectedTaskId(null)} 
                    className="h-14 px-6 bg-white/5 border border-white/0 rounded-2xl flex items-center justify-center text-white gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-gold/10 hover:text-gold transition-all"
                  >
                    Quay lại
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-zinc-950/10 border border-white/0 rounded-[48px] flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto custom-scrollbar bg-black/10">
                  <div className="w-full overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[900px]">
                      <thead className="sticky top-0 bg-[#0d0d0d] z-30 shadow-xl">
                        {isStaff ? (
                          <tr className="border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                            <th className="px-10 py-3 whitespace-nowrap">STT</th>
                            <th className="px-6 py-3 whitespace-nowrap">Email Vệ Tinh</th>
                            <th className="px-6 py-3 whitespace-nowrap">Mật khẩu</th>
                            <th className="px-6 py-3 whitespace-nowrap">Mail KP</th>
                            <th className="px-6 py-3 whitespace-nowrap">Mã 2FA</th>
                            <th className="px-6 py-3 whitespace-nowrap">Số điện thoại</th>
                            <th className="px-6 py-3 whitespace-nowrap">Link OTP</th>
                            <th className="px-6 py-3 text-center whitespace-nowrap">Trạng thái</th>
                            <th className="px-10 py-3 text-right whitespace-nowrap">Hành động</th>
                          </tr>
                        ) : (
                          <tr className="border-b border-white/0 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                            <th className="px-10 py-3 whitespace-nowrap">STT</th>
                            <th className="px-6 py-3 whitespace-nowrap">Email / Thông tin</th>
                            <th className="px-6 py-3 text-center whitespace-nowrap">Người thực hiện</th>
                            <th className="px-6 py-3 text-center whitespace-nowrap">Trạng thái</th>
                            <th className="px-10 py-3 text-right whitespace-nowrap">Hành động</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {isStaff ? (
                          taskMails.length > 0 ? (
                            taskMails.map((mail: MailData, i: number) => {
                              const mailId = String(mail._id || mail.id);
                              const links = mailLinksState[mailId] || ["", "", ""];
                              const isMailCompleted = (mail.workStatus === "Đã làm" || (mail as any).status === "USED") && 
                                links[0]?.trim() !== "" && 
                                links[1]?.trim() !== "" && 
                                links[2]?.trim() !== "";

                              const passwordVal = mail.password || mail.pass || "";
                              const recoveryVal = mail.recoveryMail || mail.recovery || "";
                              const twoFAVal = mail.twoFA || "";
                              const phoneVal = mail.phone || "";
                              const phoneLinkVal = mail.phoneLink || mail.otpLink || "";

                              return (
                                <tr key={`mail-${mailId}`} className="group hover:bg-zinc-800/50 bg-zinc-900/[0.02] transition-all">
                                  <td className="py-3 px-10 text-[10px] font-black whitespace-nowrap">
                                    {selectedTask?.type === "MAIL_VE_TINH"
                                      ? (taskIndex * 17) + i + 1
                                      : i + 1}
                                  </td>
                                  <td className="py-3 px-6 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5 group/copy">
                                      <span 
                                        onClick={() => handleCopy(mail.email)}
                                        className="cursor-pointer border-b border-dashed border-zinc-700/50 hover:border-gold hover:text-gold transition-all text-sm font-bold text-white max-w-[180px] truncate"
                                        title="Bấm để sao chép Email"
                                      >
                                        {mail.email}
                                      </span>
                                      <button
                                        onClick={() => handleCopy(mail.email)}
                                        className="p-1 text-gray-500 hover:text-gold hover:bg-white/5 rounded-md transition-all shrink-0"
                                        title="Sao chép Email"
                                      >
                                        <Copy size={12} />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-3 px-6 whitespace-nowrap">
                                    {passwordVal ? (
                                      <div className="flex items-center gap-1.5 group/copy">
                                        <span 
                                          onClick={() => handleCopy(passwordVal)}
                                          className="cursor-pointer border-b border-dashed border-zinc-700/50 hover:border-gold hover:text-gold transition-all font-mono text-xs text-zinc-300 max-w-[150px] truncate"
                                          title="Bấm để sao chép mật khẩu"
                                        >
                                          {passwordVal}
                                        </span>
                                        <button
                                          onClick={() => handleCopy(passwordVal)}
                                          className="p-1 text-gray-500 hover:text-gold hover:bg-white/5 rounded-md transition-all shrink-0"
                                          title="Sao chép mật khẩu"
                                        >
                                          <Copy size={12} />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-zinc-600 italic">---</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-6 whitespace-nowrap">
                                    {recoveryVal ? (
                                      <div className="flex items-center gap-1.5 group/copy">
                                        <span 
                                          onClick={() => handleCopy(recoveryVal)}
                                          className="cursor-pointer border-b border-dashed border-zinc-700/50 hover:border-gold hover:text-gold transition-all text-xs text-zinc-300 max-w-[150px] truncate"
                                          title="Bấm để sao chép mail khôi phục"
                                        >
                                          {recoveryVal}
                                        </span>
                                        <button
                                          onClick={() => handleCopy(recoveryVal)}
                                          className="p-1 text-gray-500 hover:text-gold hover:bg-white/5 rounded-md transition-all shrink-0"
                                          title="Sao chép mail khôi phục"
                                        >
                                          <Copy size={12} />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-zinc-600 italic">---</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-6 whitespace-nowrap">
                                    {twoFAVal ? (
                                      <div className="w-max">
                                        <TOTPDisplay secret={twoFAVal} compact={true} onCopy={handleCopy} />
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-zinc-600 italic">---</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-6 whitespace-nowrap">
                                    {phoneVal ? (
                                      <div className="flex items-center gap-1.5 group/copy">
                                        <span 
                                          onClick={() => handleCopy(phoneVal)}
                                          className="cursor-pointer border-b border-dashed border-zinc-700/50 hover:border-gold hover:text-gold transition-all font-mono text-xs text-zinc-300 max-w-[120px] truncate"
                                          title="Bấm để sao chép SĐT"
                                        >
                                          {phoneVal}
                                        </span>
                                        <button
                                          onClick={() => handleCopy(phoneVal)}
                                          className="p-1 text-gray-500 hover:text-gold hover:bg-white/5 rounded-md transition-all shrink-0"
                                          title="Sao chép SĐT"
                                        >
                                          <Copy size={12} />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-zinc-600 italic">---</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-6 whitespace-nowrap">
                                    {phoneLinkVal ? (
                                      <a 
                                        href={phoneLinkVal} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-blue-400 hover:text-gold hover:underline transition-all flex items-center gap-1 font-bold text-xs w-max"
                                        title="Mở link OTP trong tab mới"
                                      >
                                        Link OTP <ExternalLink size={12} className="inline-block" />
                                      </a>
                                    ) : (
                                      <span className="text-[10px] text-zinc-600 italic">---</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-6 text-center whitespace-nowrap">
                                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${
                                      mail.workStatus === "Đã làm"
                                      ? "bg-green-500/10 text-green-500 border-green-500/20" 
                                      : mail.workStatus === "Lỗi"
                                      ? "bg-red-500/10 text-red-500 border-red-500/20"
                                      : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                    }`}>
                                      {mail.workStatus || "Chưa làm"}
                                    </span>
                                  </td>
                                  <td className="py-3 px-10 text-right whitespace-nowrap">
                                    {selectedTask?.status === "COMPLETED" ? (
                                      <button 
                                        onClick={() => setSelectedMailForConfig(mail)} 
                                        className="h-9 px-3.5 bg-white/10 text-white hover:bg-gold hover:text-sidebar rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/0 transition-all inline-flex items-center gap-1.5 float-right whitespace-nowrap"
                                      >
                                        Chi tiết
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => setSelectedMailForConfig(mail)} 
                                        className="h-9 px-3.5 bg-gold/15 text-gold hover:bg-gold hover:text-sidebar rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/0 transition-all inline-flex items-center gap-1.5 float-right whitespace-nowrap"
                                      >
                                        Nhập Link
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-10 py-20 text-center">
                                {loadingTaskMails ? (
                                  <div className="flex flex-col items-center gap-4 opacity-50">
                                    <Loader2 className="animate-spin text-gold" size={40} />
                                    <p className="text-sm font-black uppercase tracking-[0.2em]">Đang tải danh sách mail...</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-4 opacity-20">
                                    <Mail size={60} className="text-gold" />
                                    <p className="text-xl font-black uppercase tracking-[0.2em] text-white">Chưa có dữ liệu Lô mail</p>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        ) : taskMails.length > 0 ? (
                          taskMails.map((mail: MailData, i: number) => {
                            const rowPadding = !isAdminOrManager ? "py-1 px-6" : "py-2.5 px-6";
                            const textSize = !isAdminOrManager ? "text-sm" : "text-base";
                            return (
                              <tr key={`mail-${mail.id}`} className="group hover:bg-zinc-800/50 bg-zinc-900/[0.02] transition-all">
                                <td className={`${rowPadding} text-[10px] font-black whitespace-nowrap`}>{i + 1}</td>
                                <td className={`${rowPadding} whitespace-nowrap`}>
                                  {mail.type === "SATELLITE" && (() => {
                                    const linksCount = (mail.links || []).filter((l: string) => typeof l === 'string' && l.trim() !== "").length;
                                    const missingCount = 3 - linksCount;
                                    if (missingCount > 0) {
                                      return (
                                        <div className="mb-1">
                                          <span className="text-[10px] font-black uppercase text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-lg animate-pulse inline-flex items-center gap-1">
                                            ⚠️ Thiếu {missingCount} kênh
                                          </span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  <div className="flex items-center gap-2 group/copy">
                                    <p className={`${textSize} font-bold text-white transition-colors whitespace-nowrap`}>{mail.email}</p>
                                    <button
                                      onClick={() => handleCopy(mail.email)}
                                      className="text-gray-500 hover:text-gold transition-colors p-1"
                                      title="Sao chép email"
                                    >
                                      <Copy size={14} />
                                    </button>
                                  </div>
                                  <p className="text-[10px] font-bold uppercase whitespace-nowrap">{mail.recovery}</p>
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
                                    onClick={() => setSelectedMailForConfig(mail)} 
                                    className="h-9 px-3 bg-gold/10 text-gold hover:bg-gold hover:text-sidebar rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/0 transition-all flex items-center gap-2 float-right whitespace-nowrap"
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
                                <p className="text-xl font-black uppercase tracking-[0.2em] text-white">Chưa có dữ liệu</p>
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
          <MailDetailModal 
            mail={selectedMailForConfig} 
            type={selectedMailForConfig.type}
            user={user}
            viewOnly={selectedTask?.status === "COMPLETED"}
            onClose={() => setSelectedMailForConfig(null)} 
            onSave={(updatedFields) => handleSaveUnifiedDetails(selectedMailForConfig._id || selectedMailForConfig.id, updatedFields)}
          />
        )}
      </AnimatePresence>

      <MailSelectorModal
        isOpen={isSelectMailModalOpen}
        onClose={() => setIsSelectMailModalOpen(false)}
        mails={mails}
        selectedMailIds={selectedMailIdsForTask}
        setSelectedMailIds={setSelectedMailIdsForTask}
        modalSearchQuery={modalSearchQuery}
        setModalSearchQuery={setModalSearchQuery}
      />
    </div>
  );
}
