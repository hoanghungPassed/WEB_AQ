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
  XCircle,
  Play,
  ShieldAlert,
  Check
} from "lucide-react";
import { MOCK_DASHBOARD_STATS, MOCK_KPI_DATA, MOCK_MAILS, MOCK_STAFF, MOCK_TASK_ASSIGNMENTS } from "@/data/mockData";

const getStableDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
import { StaffData } from "@/types/admin";
import { useRouter } from "next/navigation";
import MailDetailModal from "@/components/admin/MailDetailModal";
import TOTPDisplay from "@/components/admin/TOTPDisplay";

export default function AdminDashboard() {
  const router = useRouter();
  const [kpi, setKpi] = useState(MOCK_KPI_DATA);
  const [user, setUser] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [stats, setStats] = useState(MOCK_DASHBOARD_STATS);
  
  // States quản lý bảng tập trung
  const [selectedViewType, setSelectedViewType] = useState<"LIVE" | "DIE" | "STAFF" | "TASKS" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMailType, setFilterMailType] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [staffList, setStaffList] = useState<StaffData[]>([]);
  const [mails, setMails] = useState<any[]>([]);
  const [showStaffTasksView, setShowStaffTasksView] = useState(false);
  const [showStaffMailsView, setShowStaffMailsView] = useState(false);
  const [selectedStaffTask, setSelectedStaffTask] = useState<any>(null);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [isEligibleChannelsModalOpen, setIsEligibleChannelsModalOpen] = useState(false);
  const [selectedMailForModal, setSelectedMailForModal] = useState<any>(null);
  const [missingLinksWarning, setMissingLinksWarning] = useState<{stt: number; email: string; missing: number}[]>([]);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [timekeepingModal, setTimekeepingModal] = useState<{ type: "in" | "out"; time: string; warning?: string } | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const loadRequests = () => {
    const saved = localStorage.getItem("pending_access_requests");
    if (saved) setPendingRequests(JSON.parse(saved));
    else setPendingRequests([]);
  };

  const handleApproveRequest = (request: any) => {
    const saved = localStorage.getItem("pending_access_requests") || "[]";
    const reqs = JSON.parse(saved);
    const updated = reqs.filter((r: any) => r.id !== request.id);
    setPendingRequests(updated);
    localStorage.setItem("pending_access_requests", JSON.stringify(updated));
    localStorage.setItem(`access_response_${request.staffName}`, "APPROVED");
    localStorage.setItem(`access_${getStableDateString()}_${request.staffName}`, "true");
    
    localStorage.setItem("request_trigger", Date.now().toString());
    setCopyToast(`Đã cấp quyền truy cập cho ${request.staffName}`);
    setTimeout(() => setCopyToast(null), 3000);
  };

  const handleDenyRequest = (request: any) => {
    const saved = localStorage.getItem("pending_access_requests") || "[]";
    const reqs = JSON.parse(saved);
    const updated = reqs.filter((r: any) => r.id !== request.id);
    setPendingRequests(updated);
    localStorage.setItem("pending_access_requests", JSON.stringify(updated));
    localStorage.setItem(`access_response_${request.staffName}`, "DENIED");
    
    localStorage.setItem("request_trigger", Date.now().toString());
    setCopyToast(`Đã từ chối quyền truy cập cho ${request.staffName}`);
    setTimeout(() => setCopyToast(null), 3000);
  };

  useEffect(() => {
    if (user?.username) {
      setCheckInTime(localStorage.getItem(`checkin_time_${user.username}`));
      setCheckOutTime(localStorage.getItem(`checkout_time_${user.username}`));
    }
  }, [user]);

  const itemsPerPage = 10;

  // Helper: quét toàn bộ mail thuộc task hiện tại, trả về danh sách STT thiếu link
  const runMissingLinksCheck = React.useCallback((allMails: any[], task: any) => {
    if (!task) return;
    const mailType = task.type === "MAIL_VE_TINH" ? "SATELLITE"
      : task.type === "MAIL_MONETIZED" ? "MONETIZED" : "ROOT";
    if (mailType !== "SATELLITE") return; // chỉ kiểm tra SATELLITE

    const taskMails = allMails.filter((m: any) => {
      const belongsToUser = String(m.assigneeId) === String(task.assigneeId);
      if (!belongsToUser) return false;
      if (task.selectedMailIds && Array.isArray(task.selectedMailIds))
        return task.selectedMailIds.includes(m.id);
      return m.type === mailType;
    });

    const result: {stt: number; email: string; missing: number}[] = [];
    taskMails.forEach((m: any, idx: number) => {
      const links: string[] = m.links || [];
      const emptyCount = [0, 1, 2].filter(i => !links[i] || links[i].trim() === "").length;
      if (emptyCount > 0) {
        result.push({ stt: idx + 1, email: m.email, missing: emptyCount });
      }
    });
    setMissingLinksWarning(result);
  }, []);

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

  const refreshStats = () => {
    const savedMails = localStorage.getItem("global_mails_data");
    const currentMails = savedMails ? JSON.parse(savedMails) : MOCK_MAILS;
    
    const savedTasks = localStorage.getItem("global_tasks_data");
    const currentTasks = savedTasks ? JSON.parse(savedTasks) : MOCK_TASK_ASSIGNMENTS;

    // Check current user role dynamically
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    const currentUserObj = storedUser ? JSON.parse(storedUser) : null;
    const isMinimalRole = currentUserObj?.role === "03" || currentUserObj?.role === "04" || currentUserObj?.role === "NHÂN VIÊN" || currentUserObj?.role === "QUẢN LÝ NHÂN SỰ";

    setTasksList(currentTasks);
    const eligibleCount = currentMails.reduce((sum: number, m: any) => {
      if (m.type === "SATELLITE" && Array.isArray(m.eligibleChannels)) {
        return sum + m.eligibleChannels.filter(Boolean).length;
      }
      return sum;
    }, 0);
    if (isMinimalRole && currentUserObj) {
      const myMails = currentMails.filter((m: any) => String(m.assigneeId) === String(currentUserObj?.id));
      const myTasks = currentTasks.filter((t: any) => String(t.assigneeId) === String(currentUserObj?.id) && (t.status === "IN_PROGRESS" || t.status === "PENDING" || t.status === "COMPLETED"));
      setStats({
        totalMail: myMails.length,
        mailLive: myMails.filter((m: any) => m.status === "LIVE").length,
        mailDie: myMails.filter((m: any) => m.status === "DIE").length,
        mailRoot: 0,
        mailSatellite: 0,
        mailMonetized: 0,
        tasksToday: myTasks.filter((t: any) => t.status === "IN_PROGRESS" || t.status === "PENDING").length,
        staffOnline: 0,
        mailWatchHours: eligibleCount
      });
    } else {
      setStats(prev => ({
        ...prev,
        totalMail: currentMails.length,
        mailLive: currentMails.filter((m: any) => m.status === "LIVE").length,
        mailDie: currentMails.filter((m: any) => m.status === "DIE").length,
        mailRoot: currentMails.filter((m: any) => m.type === "ROOT").length,
        mailSatellite: currentMails.filter((m: any) => m.type === "SATELLITE").length,
        mailMonetized: currentMails.filter((m: any) => m.type === "MONETIZED").length,
        tasksToday: currentTasks.filter((t: any) => t.status === "IN_PROGRESS" || t.status === "PENDING").length,
        mailWatchHours: eligibleCount
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
    
    const onlineCount = unique.filter((u: any) => u.isOnline && u.role !== "01").length;
    setStats(prev => ({ ...prev, staffOnline: onlineCount }));
  };

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    const savedKPI = localStorage.getItem("global_kpi_data");
    if (savedKPI) setKpi(JSON.parse(savedKPI));

    refreshStats();
    loadStaff();
    loadRequests();
    const staffInterval = setInterval(() => {
      loadStaff();
      loadRequests();
    }, 2000);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "global_kpi_data" && e.newValue) {
        setKpi(JSON.parse(e.newValue));
      }
      if ((e.key === "global_mails_data" || e.key === "global_tasks_data") && e.newValue) {
        refreshStats();
      }
      if (e.key === "dashboard_stats" && e.newValue) {
        setStats(JSON.parse(e.newValue));
      }
      if (e.key === "global_users") {
        loadStaff();
      }
      if (e.key === "pending_access_requests" || e.key === "request_trigger") {
        loadRequests();
      }
      if (e.key === "user" && e.newValue) {
        const newUserObj = JSON.parse(e.newValue);
        const currentSessionUser = JSON.parse(sessionStorage.getItem("user") || "{}");
        if (newUserObj.username === currentSessionUser.username) {
          setUser(newUserObj);
        }
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
              setCopyToast(toastData.message);
              setTimeout(() => setCopyToast(null), 4000);
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
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("storage", handleToastNotification);
      clearInterval(staffInterval);
    };
  }, []);

  // Reset trang khi đổi loại view
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery("");
    setFilterStatus("all");
    setFilterMailType("ALL");
  }, [selectedViewType]);

  const syncDatabase = async () => {
    try {
      const keys = ["global_users", "global_mails_data", "global_tasks_data", "global_kpi_data", "admin_notifications", "realtime_toast", "pending_access_requests"];
      const payload: Record<string, string> = {};
      keys.forEach(k => {
        const val = localStorage.getItem(k);
        if (val !== null) payload[k] = val;
      });
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("Sync error:", err);
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;
    const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const fullISO = new Date().toISOString();
    localStorage.setItem(`checkin_time_${user.username}`, fullISO);
    setCheckInTime(fullISO);
    
    // Trigger real-time modal
    setTimekeepingModal({ type: "in", time: timeStr });
    
    // Sync with online status or user info
    const savedUsers = localStorage.getItem("global_users");
    if (savedUsers) {
      const allUsers = JSON.parse(savedUsers);
      const updated = allUsers.map((u: any) => 
        u.username === user.username ? { ...u, checkInTime: timeStr, isOnline: true } : u
      );
      localStorage.setItem("global_users", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
      await syncDatabase();
    }
  };

  const handleCheckOut = async () => {
    if (!user) return;
    const checkInISO = localStorage.getItem(`checkin_time_${user.username}`);
    if (!checkInISO) return;
    
    const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const fullISO = new Date().toISOString();
    localStorage.setItem(`checkout_time_${user.username}`, fullISO);
    setCheckOutTime(fullISO);
    
    // Calculate total hours
    const dIn = new Date(checkInISO);
    const dOut = new Date(fullISO);
    const t_in = dIn.getHours() * 60 + dIn.getMinutes();
    const t_out = dOut.getHours() * 60 + dOut.getMinutes();
    
    // Overlaps for 8:00 - 12:00 (480 to 720) and 13:30 - 17:30 (810 to 1050)
    const overlap1 = Math.max(0, Math.min(720, t_out) - Math.max(480, t_in));
    const overlap2 = Math.max(0, Math.min(1050, t_out) - Math.max(810, t_in));
    const totalWorkingMins = overlap1 + overlap2;
    
    let warning = undefined;
    if (totalWorkingMins < 480) {
      const missing = 480 - totalWorkingMins;
      warning = `Hôm nay bạn chưa làm đủ 8 tiếng, còn thiếu ${missing} phút nữa.`;
    }
    
    // Trigger real-time modal
    setTimekeepingModal({ type: "out", time: timeStr, warning });
    
    // Sync with online status or user info
    const savedUsers = localStorage.getItem("global_users");
    if (savedUsers) {
      const allUsers = JSON.parse(savedUsers);
      const updated = allUsers.map((u: any) => 
        u.username === user.username ? { ...u, checkOutTime: timeStr, totalHours: (totalWorkingMins / 60).toFixed(2) } : u
      );
      localStorage.setItem("global_users", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
      await syncDatabase();
    }
  };

  const handleSaveKPI = () => {
    localStorage.setItem("global_kpi_data", JSON.stringify(kpi));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleStaffMailStatusChange = async (mailId: number, newWorkStatus: string) => {
    const savedMails = localStorage.getItem("global_mails_data");
    const currentMails = savedMails ? JSON.parse(savedMails) : MOCK_MAILS;

    const updatedMails = currentMails.map((m: any) => {
      if (m.id === mailId) {
        let status = m.status;
        const norm = (newWorkStatus || "").toUpperCase();
        if (norm === "ĐÃ LÀM KÊNH" || norm === "HOÀN THÀNH" || norm === "ĐÃ LÀM" || norm === "CHƯA LÀM" || norm === "ĐANG XỬ LÍ") {
          status = "LIVE";
        } else if (norm === "LỖI") {
          status = "DIE";
        }
        return { 
          ...m, 
          workStatus: newWorkStatus, 
          status,
          lastUpdated: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: user?.name || user?.username || "Hệ thống"
        };
      }
      return m;
    });

    localStorage.setItem("global_mails_data", JSON.stringify(updatedMails));
    setMails(updatedMails);

    const myMails = updatedMails.filter((m: any) => String(m.assigneeId) === String(user?.id));
    setStats(prev => ({
      ...prev,
      totalMail: myMails.length,
      mailLive: myMails.filter((m: any) => m.status === "LIVE").length,
      mailDie: myMails.filter((m: any) => m.status === "DIE").length,
    }));

    // Recalculate progress for all tasks that contain this mail
    const savedTasks = localStorage.getItem("global_tasks_data");
    let currentTasks = savedTasks ? JSON.parse(savedTasks) : MOCK_TASK_ASSIGNMENTS;
    
    currentTasks = currentTasks.map((t: any) => {
      let mailType = "ROOT";
      if (t.type === "MAIL_VE_TINH") mailType = "SATELLITE";
      if (t.type === "MAIL_MONETIZED") mailType = "MONETIZED";

      let filtered = updatedMails.filter((m: any) => m.type === mailType && String(m.assigneeId) === String(t.assigneeId));
      if (t.selectedMailIds && Array.isArray(t.selectedMailIds)) {
        filtered = updatedMails.filter((m: any) => t.selectedMailIds?.includes(m.id));
      } else if (t.title === "Check, xóa, tạo" || t.title === "Kênh bật kiếm tiền") {
        if (t.mailRange) {
          const parts = t.mailRange.split("-");
          if (parts.length === 2) {
            const start = parseInt(parts[0].trim());
            const end = parseInt(parts[1].trim());
            const withSTT = updatedMails.filter((m: any) => m.type === mailType).map((m: any, idx: number) => ({ ...m, currentSTT: idx + 1 }));
            const idsInRange = withSTT.filter((m: any) => m.currentSTT >= start && m.currentSTT <= end).map((m: any) => m.id);
            filtered = filtered.filter((m: any) => idsInRange.includes(m.id));
          }
        }
      } else if (t.title === "Làm kênh") {
        if (t.mailRange) {
          filtered = filtered.filter((m: any) => m.batchName === t.mailRange);
        }
      } else if (t.title === "Mời kênh" && t.mailRange) {
        const parts = t.mailRange.split("+");
        const loPart = parts.pop()?.trim();
        filtered = updatedMails.filter((m: any) => 
          (m.type === "SATELLITE" && m.batchName === loPart && String(m.assigneeId) === String(t.assigneeId)) ||
          (m.type === "ROOT" && t.note && t.note.includes(m.email))
        );
      }

      const totalTaskMails = filtered.length;
      if (totalTaskMails > 0) {
        const completedCount = filtered.filter((m: any) => {
          const normStatus = (m.workStatus || "").toUpperCase();
          return normStatus === "ĐÃ LÀM" || normStatus === "ĐÃ BÁN" || normStatus === "HOÀN THÀNH" || normStatus === "ĐÃ LÀM KÊNH";
        }).length;
        const progressPercent = Math.round((completedCount / totalTaskMails) * 100);
        return {
          ...t,
          progress: progressPercent,
          status: progressPercent === 100 ? "COMPLETED" : (progressPercent > 0 ? "IN_PROGRESS" : "PENDING")
        };
      }
      return t;
    });

    localStorage.setItem("global_tasks_data", JSON.stringify(currentTasks));
    setTasksList(currentTasks);

    // Sync selectedStaffTask if active
    setSelectedStaffTask((prev: any) => {
      if (!prev) return null;
      const found = currentTasks.find((t: any) => t.id === prev.id);
      return found || prev;
    });

    window.dispatchEvent(new Event("storage"));

    // Kiểm tra link bị thiếu: chỉ khi chọn "Đã làm" cho mail đó
    if (selectedStaffTask) {
      const norm = (newWorkStatus || "").toUpperCase();
      if (norm === "ĐÃ LÀM") {
        // Chỉ kiểm tra mail vừa được cập nhật
        const mailType = selectedStaffTask.type === "MAIL_VE_TINH" ? "SATELLITE" : "OTHER";
        if (mailType === "SATELLITE") {
          const taskMails = updatedMails.filter((m: any) => {
            const belongsToUser = String(m.assigneeId) === String(selectedStaffTask.assigneeId || user?.id);
            if (!belongsToUser) return false;
            if (selectedStaffTask.selectedMailIds && Array.isArray(selectedStaffTask.selectedMailIds))
              return selectedStaffTask.selectedMailIds.includes(m.id);
            return m.type === "SATELLITE";
          });
          const idx = taskMails.findIndex((m: any) => m.id === mailId);
          const changedMail = taskMails[idx];
          if (changedMail) {
            const links: string[] = changedMail.links || [];
            const emptyCount = [0, 1, 2].filter(i => !links[i] || links[i].trim() === "").length;
            if (emptyCount > 0) {
              setMissingLinksWarning([{ stt: idx + 1, email: changedMail.email, missing: emptyCount }]);
            } else {
              setMissingLinksWarning([]);
            }
          }
        }
      } else {
        // Trạng thái khác (Đang xử lí, Chưa làm, Lỗi) → xóa cảnh báo
        setMissingLinksWarning([]);
      }
    }

    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          global_mails_data: JSON.stringify(updatedMails),
          global_tasks_data: JSON.stringify(currentTasks)
        })
      });
    } catch (err) {
      console.error("Sync error:", err);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: "IN_PROGRESS" | "COMPLETED") => {
    const savedTasks = localStorage.getItem("global_tasks_data");
    const currentTasks = savedTasks ? JSON.parse(savedTasks) : MOCK_TASK_ASSIGNMENTS;
    const targetTask = currentTasks.find((t: any) => t.id === taskId);

    const updatedTasks = currentTasks.map((t: any) => {
      if (t.id === taskId) {
        return { ...t, status: newStatus, progress: newStatus === "COMPLETED" ? 100 : t.progress };
      }
      return t;
    });

    localStorage.setItem("global_tasks_data", JSON.stringify(updatedTasks));
    setTasksList(updatedTasks);

    setSelectedStaffTask((prev: any) => {
      if (prev && prev.id === taskId) {
        return { ...prev, status: newStatus, progress: newStatus === "COMPLETED" ? 100 : prev.progress };
      }
      return prev;
    });

    const now = new Date().toISOString();
    const savedMails = localStorage.getItem("global_mails_data");
    const currentMails = savedMails ? JSON.parse(savedMails) : MOCK_MAILS;

    // Xác định mail IDs thuộc task
    let taskMailIds: number[] = [];
    if (targetTask) {
      if (targetTask.selectedMailIds && Array.isArray(targetTask.selectedMailIds)) {
        taskMailIds = targetTask.selectedMailIds;
      } else {
        const mailType = targetTask.type === "MAIL_VE_TINH" ? "SATELLITE"
          : targetTask.type === "MAIL_MONETIZED" ? "MONETIZED" : "ROOT";
        let filtered = currentMails.filter((m: any) =>
          m.type === mailType && String(m.assigneeId) === String(targetTask.assigneeId)
        );
        if (targetTask.mailRange) {
          const parts = targetTask.mailRange.split("-");
          if (parts.length === 2 && !isNaN(parseInt(parts[0]))) {
            const start = parseInt(parts[0].trim());
            const end = parseInt(parts[1].trim());
            const withSTT = currentMails
              .filter((m: any) => m.type === mailType)
              .map((m: any, idx: number) => ({ ...m, _stt: idx + 1 }));
            const idsInRange = withSTT
              .filter((m: any) => m._stt >= start && m._stt <= end)
              .map((m: any) => m.id);
            filtered = filtered.filter((m: any) => idsInRange.includes(m.id));
          } else {
            filtered = filtered.filter((m: any) =>
              m.batchName === targetTask.mailRange ||
              (targetTask.mailRange && targetTask.mailRange.includes(m.batchName))
            );
          }
        }
        taskMailIds = filtered.map((m: any) => m.id);
      }
    }

    // Khi COMPLETED và task SATELLITE: kiểm tra link từng mail
    // Đủ 3 link → "Đã làm"; thiếu bất kỳ link nào → "Lỗi"
    const isSatelliteTask = targetTask?.type === "MAIL_VE_TINH";
    const newWorkStatus = newStatus === "COMPLETED" ? "Đã làm" : "Đang xử lí";

    const updatedMails = currentMails.map((m: any) => {
      if (!taskMailIds.includes(m.id)) return m;
      if (newStatus === "COMPLETED" && isSatelliteTask) {
        const links: string[] = m.links || [];
        const hasAllLinks = [0, 1, 2].every(i => links[i] && links[i].trim() !== "");
        const resolvedStatus = hasAllLinks ? "Đã làm" : "Lỗi";
        return { ...m, workStatus: resolvedStatus, lastUpdated: now, updatedBy: user?.name || user?.id || m.updatedBy };
      }
      return { ...m, workStatus: newWorkStatus, lastUpdated: now, updatedBy: user?.name || user?.id || m.updatedBy };
    });

    localStorage.setItem("global_mails_data", JSON.stringify(updatedMails));
    setMails(updatedMails);

    // Kiểm tra link bị thiếu: chỉ khi COMPLETED → quét toàn bộ; IN_PROGRESS → xóa cảnh báo
    if (newStatus === "COMPLETED") {
      runMissingLinksCheck(updatedMails, targetTask);
    } else {
      setMissingLinksWarning([]);
    }

    let finalKpi = localStorage.getItem("global_kpi_data") || "";
    if (newStatus === "COMPLETED") {
      const currentTaskObj = currentTasks.find((t: any) => t.id === taskId);
      if (currentTaskObj && currentTaskObj.mailType === "MONETIZED") {
        setKpi(prev => {
          const updatedKpi = { ...prev, currentMonetized: Math.min(prev.targetMonetized, prev.currentMonetized + 1) };
          finalKpi = JSON.stringify(updatedKpi);
          localStorage.setItem("global_kpi_data", finalKpi);
          return updatedKpi;
        });
      } else {
        setKpi(prev => {
          const updatedKpi = { ...prev, currentWatchHours: Math.min(prev.targetWatchHours, prev.currentWatchHours + 1) };
          finalKpi = JSON.stringify(updatedKpi);
          localStorage.setItem("global_kpi_data", finalKpi);
          return updatedKpi;
        });
      }
    }

    setCopyToast(`✓ Đã cập nhật ${taskMailIds.length} mail sang "${newWorkStatus}"`);
    setTimeout(() => setCopyToast(null), 3000);

    window.dispatchEvent(new Event("storage"));

    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          global_tasks_data: JSON.stringify(updatedTasks),
          global_mails_data: JSON.stringify(updatedMails),
          global_kpi_data: finalKpi
        })
      });
    } catch (err) {
      console.error("Sync error:", err);
    }
  };

  const handleInviteStatusChange = (mailId: number, chIdx: number, newInviteStatus: string) => {
    const savedMails = localStorage.getItem("global_mails_data");
    const currentMails = savedMails ? JSON.parse(savedMails) : MOCK_MAILS;

    const updatedMails = currentMails.map((m: any) => {
      if (m.id === mailId) {
        const inviteStatuses = m.inviteStatuses || ["Chưa mời", "Chưa mời", "Chưa mời"];
        inviteStatuses[chIdx] = newInviteStatus;
        return { ...m, inviteStatuses };
      }
      return m;
    });

    localStorage.setItem("global_mails_data", JSON.stringify(updatedMails));
    setMails(updatedMails);

    const eligibleCount = updatedMails.reduce((sum: number, m: any) => {
      if (m.type === "SATELLITE" && Array.isArray(m.eligibleChannels)) {
        return sum + m.eligibleChannels.filter(Boolean).length;
      }
      return sum;
    }, 0);
    setStats(prev => ({ ...prev, mailWatchHours: eligibleCount }));

    setCopyToast("Đã cập nhật trạng thái mời!");
    setTimeout(() => setCopyToast(null), 2000);

    window.dispatchEvent(new Event("storage"));
  };

  const roleLabel = getRoleLabel(user?.role);
  const isAdminOrManager = user?.role === "01" || user?.role === "02";
  const isHRManager = user?.role === "03" || user?.role === "QUẢN LÝ NHÂN SỰ";

  const filteredMails = useMemo(() => {
    if (!selectedViewType || selectedViewType === "STAFF") return [];
    
    return mails.filter(m => {
      let matchesType = true;
      if (selectedViewType === "LIVE") matchesType = m.status === "LIVE";
      else if (selectedViewType === "DIE") matchesType = m.status === "DIE";
      else if (selectedViewType === "TASKS") matchesType = m.workStatus === "ĐANG LÀM" || m.workStatus === "CHƯA LÀM";

      let matchesMailType = true;
      if (filterMailType !== "ALL") {
        matchesMailType = m.type === filterMailType;
      }

      const matchesSearch = m.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           m.recovery.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterStatus === "all" || (m.channelStatus && m.channelStatus.includes(filterStatus));

      return matchesType && matchesMailType && matchesSearch && matchesStatus;
    });
  }, [selectedViewType, searchQuery, filterStatus, filterMailType, mails]);

  const totalPages = Math.ceil(filteredMails.length / itemsPerPage);
  const currentItems = filteredMails.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredTasks = useMemo(() => {
    if (selectedViewType !== "TASKS" || !isAdminOrManager) return [];
    return tasksList.filter(t => {
      const titleMatch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
      const noteMatch = t.note ? t.note.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const staffName = (() => {
        const assignee = staffList.find(s => String(s.id) === String(t.assigneeId));
        return assignee ? assignee.name.toLowerCase() : "chưa giao";
      })();
      const staffMatch = staffName.includes(searchQuery.toLowerCase());
      return titleMatch || noteMatch || staffMatch;
    });
  }, [selectedViewType, tasksList, searchQuery, isAdminOrManager, staffList]);

  const totalTasksPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const currentTasksItems = filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getChannelStatusColor = (status: string) => {
    if (!status) return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    const lower = status.toLowerCase();
    if (lower.includes("chờ b2") || lower.includes("chờ b3") || lower.includes("quay video")) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    if (lower.includes("lỗi b2") || lower.includes("die spam") || lower.includes("chưa sub") || lower.includes("mất kênh")) return "bg-red-500/10 text-red-500 border-red-500/30";
    if (lower.includes("đã bật") || lower.includes("đã kháng")) return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  };

  // ============================================================
  // FULL-SCREEN TASK DETAIL for Role 03/04
  // ============================================================
  // Lock scroll on the main element when task detail is open
  React.useEffect(() => {
    const mainEl = document.querySelector("main");
    if (!mainEl) return;
    if (selectedStaffTask && (user?.role === "03" || user?.role === "04")) {
      mainEl.style.overflow = "hidden";
    } else {
      mainEl.style.overflow = "";
    }
    return () => { mainEl.style.overflow = ""; };
  }, [selectedStaffTask, user?.role]);

  if (selectedStaffTask && (user?.role === "03" || user?.role === "04")) {
    const taskMails = mails.filter((m: any) => {
      const belongsToUser = String(m.assigneeId) === String(user?.id);
      if (!belongsToUser) return false;
      if (selectedStaffTask.selectedMailIds && Array.isArray(selectedStaffTask.selectedMailIds)) {
        return selectedStaffTask.selectedMailIds.includes(m.id);
      }
      return selectedStaffTask.type === "MAIL_VE_TINH" ? m.type === "SATELLITE" :
             selectedStaffTask.type === "MAIL_MONETIZED" ? m.type === "MONETIZED" :
             m.type === "ROOT";
    });

    const mailType: "ROOT" | "SATELLITE" | "MONETIZED" =
      selectedStaffTask.type === "MAIL_VE_TINH" ? "SATELLITE" :
      selectedStaffTask.type === "MAIL_MONETIZED" ? "MONETIZED" : "ROOT";

    const getStatusStyle = (ws: string) => {
      const v = (ws || "").toLowerCase();
      if (v === "đã làm") return "bg-green-500/10 text-green-500 border-green-500/20";
      if (v === "lỗi") return "bg-red-500/10 text-red-500 border-red-500/20";
      if (v === "đang xử lí") return "bg-zinc-800/50 text-zinc-400 border-zinc-700";
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    };

    return (
      <div
        className="flex flex-col overflow-hidden bg-background"
        style={{ height: "calc(100vh - 80px)", margin: "-1rem -1rem -1rem -1rem" }}
      >
        {/* Toast */}
        <AnimatePresence>
          {copyToast && (
            <motion.div initial={{ opacity: 0, y: -40, x: "-50%" }} animate={{ opacity: 1, y: 20, x: "-50%" }} exit={{ opacity: 0, y: -40, x: "-50%" }}
              className="fixed top-0 left-1/2 z-[500] bg-gold px-6 py-2.5 rounded-full text-sidebar font-black text-sm shadow-2xl flex items-center gap-2">
              <CheckCircle2 size={18} /> {copyToast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* MailDetailModal */}
        <AnimatePresence>
          {selectedMailForModal && (
            <MailDetailModal
              mail={selectedMailForModal}
              type={mailType}
              user={user}
              onClose={() => setSelectedMailForModal(null)}
              onSave={(updatedFields: any) => {
                const saved = localStorage.getItem("global_mails_data");
                const all = saved ? JSON.parse(saved) : [];
                const now = new Date().toISOString();
                const updated = all.map((m: any) =>
                  m.id === selectedMailForModal.id ? { ...m, ...updatedFields, lastUpdated: now, updatedBy: user?.name || user?.id } : m
                );
                localStorage.setItem("global_mails_data", JSON.stringify(updated));
                setMails(updated);
                window.dispatchEvent(new Event("storage"));
                setSelectedMailForModal(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* Sticky Header */}
        <div className="flex-shrink-0 bg-sidebar border-b border-white/10 px-6 py-4 shadow-2xl z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedStaffTask(null)}
                className="h-10 w-10 bg-gold/10 rounded-xl flex items-center justify-center text-gold hover:bg-gold/20 transition-all shadow-lg"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-black text-white uppercase tracking-tighter">
                  Nhiệm vụ được giao: {selectedStaffTask.title} ({taskMails.length} mail)
                </h1>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                  {selectedStaffTask.note || "Xử lý danh sách mail được giao"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleTaskStatusChange(selectedStaffTask.id, "IN_PROGRESS")}
                className={`h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  selectedStaffTask.status === "IN_PROGRESS"
                    ? "bg-yellow-500 text-sidebar border-yellow-500"
                    : "bg-white/5 text-gray-400 border-white/10 hover:border-yellow-500/50 hover:text-yellow-500"
                }`}
              >
                Đang xử lí
              </button>
              <button
                onClick={() => handleTaskStatusChange(selectedStaffTask.id, "COMPLETED")}
                className={`h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  selectedStaffTask.status === "COMPLETED"
                    ? "bg-green-500 text-sidebar border-green-500"
                    : "bg-white/5 text-gray-400 border-white/10 hover:border-green-500/50 hover:text-green-500"
                }`}
              >
                Hoàn thành
              </button>
            </div>
          </div>
        </div>

        {/* Missing Links Warning Panel */}
        {missingLinksWarning.length > 0 && (
          <div className="flex-shrink-0 mx-4 mt-3">
            <div className="bg-gradient-to-r from-red-950/60 to-orange-950/40 border border-red-500/40 rounded-2xl overflow-hidden shadow-lg shadow-red-500/10">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-400 font-black text-lg">!</span>
                  </div>
                  <div>
                    <p className="text-red-300 font-black text-sm uppercase tracking-widest">
                      {missingLinksWarning.length} mail chưa điền đủ link kênh YouTube
                    </p>
                    <p className="text-red-500/70 text-xs font-bold uppercase tracking-wider mt-1">
                      Các mail thiếu link sẽ bị đánh dấu Lỗi — bổ sung link trong popup "Xem chi tiết"
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMissingLinksWarning([])}
                  className="h-7 w-7 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 hover:text-white transition-all flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
              {/* STT Badges */}
              <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-red-500/60 uppercase tracking-widest mr-2">STT thiếu link:</span>
                {missingLinksWarning.map((w) => (
                  <span
                    key={w.stt}
                    title={`${w.email} - thiếu ${w.missing} link`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 font-black text-sm cursor-default hover:bg-red-500/30 transition-colors"
                  >
                    <span className="font-black text-white text-base">{w.stt}</span>
                    <span className="text-red-500/40 font-normal text-xs">|</span>
                    <span className="text-red-400/80 font-bold text-xs">{w.missing} link trống</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Scrollable mail table */}
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
            <thead className="sticky top-0 bg-[#0a0a0a] text-gray-500 border-b border-white/5 z-10">
              <tr>
                <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">STT</th>
                <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Email</th>
                <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">KP</th>
                <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Pass</th>
                <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">2FA</th>
                <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">SĐT</th>
                <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Link OTP</th>
                <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] text-center whitespace-nowrap">Trạng thái</th>
                <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] text-center whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {taskMails.length === 0 ? (
                <tr><td colSpan={9} className="py-20 text-center text-gray-600 font-bold uppercase tracking-widest">Không có mail nào</td></tr>
              ) : taskMails.map((mail: any, idx: number) => (
                <tr key={mail.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3 px-6 text-[10px] font-black text-gray-500 whitespace-nowrap">{idx + 1}</td>
                  <td className="py-3 px-6 font-bold text-white text-xs cursor-pointer hover:text-gold transition-colors whitespace-nowrap" onClick={() => copyToClipboard(mail.email, "Email")}>{mail.email}</td>
                  <td className="py-3 px-6 text-xs text-gray-400 cursor-pointer hover:text-gold transition-colors whitespace-nowrap" onClick={() => copyToClipboard(mail.recovery || "", "KP")}>{mail.recovery || "---"}</td>
                  <td className="py-3 px-6 text-xs text-gray-500 font-mono cursor-pointer hover:text-gold transition-colors whitespace-nowrap" onClick={() => copyToClipboard(mail.pass, "Pass")}>{mail.pass || "---"}</td>
                  <td className="py-3 px-6 text-xs text-gray-500 font-mono whitespace-nowrap">
                    <TOTPDisplay secret={mail.twoFA || ""} compact onCopy={copyToClipboard} />
                  </td>
                  <td className="py-3 px-6 text-xs text-gray-500 font-bold cursor-pointer hover:text-gold transition-colors whitespace-nowrap" onClick={() => copyToClipboard(mail.phone || "", "SĐT")}>{mail.phone || "---"}</td>
                  <td className="py-3 px-6 whitespace-nowrap">
                    {mail.otpLink ? (
                      <a href={mail.otpLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-white transition-all flex items-center gap-1 font-bold text-xs cursor-pointer">Link OTP <ExternalLink size={12} /></a>
                    ) : <span className="text-gray-700">---</span>}
                  </td>
                  <td className="py-3 px-6 text-center whitespace-nowrap">
                    <select
                      value={mail.workStatus || "Chưa làm"}
                      onChange={(e) => handleStaffMailStatusChange(mail.id, e.target.value)}
                      className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase border outline-none cursor-pointer transition-all ${getStatusStyle(mail.workStatus || "Chưa làm")}`}
                    >
                      <option value="Chưa làm" className="bg-sidebar text-white">Chưa làm</option>
                      <option value="Đang xử lí" className="bg-sidebar text-white">Đang xử lí</option>
                      <option value="Đã làm" className="bg-sidebar text-white">Đã làm</option>
                      <option value="Lỗi" className="bg-sidebar text-white">Lỗi</option>
                    </select>
                  </td>
                  <td className="py-3 px-6 text-center whitespace-nowrap">
                    <button
                      onClick={() => setSelectedMailForModal(mail)}
                      className="px-4 py-1 rounded-xl bg-gold/10 hover:bg-gold hover:text-sidebar text-gold border border-gold/30 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

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
              {(selectedViewType === "LIVE" || selectedViewType === "DIE") && (
                <select
                  value={filterMailType}
                  onChange={(e) => {
                    setFilterMailType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-black/20 border border-white/10 rounded-xl px-4 h-10 text-xs text-gold font-bold uppercase tracking-wider outline-none focus:border-gold transition-all cursor-pointer hidden md:block"
                >
                  <option value="ALL" className="bg-sidebar text-white">Tất cả loại</option>
                  <option value="ROOT" className="bg-sidebar text-white">Gốc</option>
                  <option value="SATELLITE" className="bg-sidebar text-white">Vệ tinh</option>
                  <option value="MONETIZED" className="bg-sidebar text-white">BKT</option>
                </select>
              )}
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
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Check-in</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Check-out</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Tổng giờ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {staffList
                    .filter(s => s.status === "ACTIVE" && s.role !== "01")
                    .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((staff: any, index) => (
                    <tr key={`staff-${staff.id}`} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-6 text-[10px] font-black text-gray-500">{index + 1}</td>
                      <td className="py-4 px-6 text-sm font-bold text-white flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center font-black text-xs text-gold uppercase shrink-0">
                          {staff.name ? staff.name.slice(0, 2) : "NV"}
                        </div>
                        {staff.name}
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-400 uppercase font-black">{getRoleLabel(staff.role)}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${staff.isOnline ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                          {staff.isOnline ? "ONLINE" : "OFFLINE"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-400 font-mono font-bold">{staff.checkInTime || "---"}</td>
                      <td className="py-4 px-6 text-xs text-gray-400 font-mono font-bold">{staff.checkOutTime || "---"}</td>
                      <td className="py-4 px-6 text-xs text-gold font-mono font-black">{staff.totalHours ? `${staff.totalHours}h` : "---"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : selectedViewType === "TASKS" && isAdminOrManager ? (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5">
                  <tr>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">STT</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Tiêu đề</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Loại công việc</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Nhân sự được giao</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Số lượng mail</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Tiến độ</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Trạng thái</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Hạn chót</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {currentTasksItems.map((task: any, index: number) => {
                    const assignee = staffList.find(s => String(s.id) === String(task.assigneeId));
                    const taskTypeLabel = task.type === "MAIL_GOC" ? "Mail Gốc" : (task.type === "MAIL_VE_TINH" ? "Mail Vệ Tinh" : "Mail BKT");
                    return (
                      <tr key={`task-row-${task.id}`} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4 px-6 text-[10px] font-black text-gray-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td className="py-4 px-6 text-sm font-bold text-white">
                          <div>
                            <span className="block">{task.title}</span>
                            {task.note && <span className="text-[10px] text-gray-500 block font-normal whitespace-pre-wrap">{task.note}</span>}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gold">{taskTypeLabel}</td>
                        <td className="py-4 px-6 text-xs text-gray-400 font-bold">{assignee ? assignee.name : "Chưa giao"}</td>
                        <td className="py-4 px-6 text-xs text-gray-400 font-bold">{task.mailCount || 0} Mail</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div className="h-full bg-gold" style={{ width: `${task.progress || 0}%` }} />
                            </div>
                            <span className="text-[10px] font-black text-gold">{task.progress || 0}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${
                            task.status === "COMPLETED" 
                              ? "bg-green-500/10 text-green-500 border-green-500/20" 
                              : task.status === "IN_PROGRESS"
                              ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                              : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                          }`}>
                            {task.status === "COMPLETED" ? "Hoàn thành" : task.status === "IN_PROGRESS" ? "Đang xử lý" : "Chưa làm"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs text-gray-500 font-bold">{task.deadline || "---"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5">
                  <tr>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">STT</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Email</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Loại Mail</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Trạng thái</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Chi tiết</th>
                    <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px]">Người cập nhật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {currentItems.map((mail: any, index: number) => {
                    const assignee = staffList.find(s => String(s.id) === String(mail.assigneeId));
                    return (
                      <tr key={`mail-${mail.id}`} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4 px-6 text-[10px] font-black text-gray-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td className="py-4 px-6 text-sm font-bold text-white">{mail.email}</td>
                        <td className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gold">
                          {mail.type === "ROOT" ? "Gốc" : mail.type === "SATELLITE" ? "Vệ Tinh" : "BKT"}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${mail.status === 'LIVE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                            {mail.status || "LIVE"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {mail.workStatus || (mail.status === 'DIE' ? "Lỗi" : "Chưa làm")}
                        </td>
                        <td className="py-4 px-6 text-xs text-gray-400 font-medium">
                          {mail.updatedBy ? mail.updatedBy : (assignee ? assignee.name : "---")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          {selectedViewType !== "STAFF" && (
            <div className="p-6 border-t border-white/5 bg-black/20 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Trang <span className="text-white font-black">{currentPage}</span> / {selectedViewType === "TASKS" && isAdminOrManager ? totalTasksPages || 1 : totalPages || 1}</span>
              <div className="flex gap-2">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:border-gold transition-all"><ChevronLeft size={18} /></button>
                <button disabled={currentPage >= (selectedViewType === "TASKS" && isAdminOrManager ? totalTasksPages : totalPages)} onClick={() => setCurrentPage(p => p + 1)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:border-gold transition-all"><ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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

      {/* Timekeeping Success Modal */}
      <AnimatePresence>
        {timekeepingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-sidebar border border-gold/30 rounded-[32px] p-8 w-full max-w-md shadow-2xl relative text-center"
            >
              <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center border mb-6 shadow-lg ${
                timekeepingModal.type === "in" 
                  ? "bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/10" 
                  : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-yellow-500/10"
              }`}>
                <CheckCircle2 size={40} className="animate-pulse" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-3">
                {timekeepingModal.type === "in" ? "Check-in thành công" : "Check-out thành công"}
              </h3>
              <p className="text-gray-400 font-medium leading-relaxed mb-6">
                Bạn đã check {timekeepingModal.type === "in" ? "in" : "out"} lúc <span className="text-gold font-bold font-mono text-lg">{timekeepingModal.time}</span>.
              </p>
              
              {timekeepingModal.warning && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 flex items-start gap-3 text-left">
                  <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-xs font-black text-red-400 uppercase tracking-widest">Cảnh báo thiếu giờ</p>
                    <p className="text-xs text-gray-300 font-medium leading-relaxed mt-1">{timekeepingModal.warning}</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setTimekeepingModal(null)}
                className="w-full h-14 bg-gold text-sidebar font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-white hover:text-sidebar transition-all duration-300 shadow-lg shadow-gold/25"
              >
                Đồng ý & Đóng
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Bảng điều khiển</h1>
          <p className="text-lg text-gray-500 mt-1 font-medium italic">Chào mừng trở lại! Đây là tình hình AQ MEDIA hôm nay.</p>
        </motion.div>
      </div>

      {user?.role === "03" || user?.role === "04" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            
            {/* Chấm công card */}
            <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl relative overflow-hidden group flex flex-col justify-between min-h-[160px]">
              <div className="absolute top-0 right-0 h-32 w-32 bg-gold/5 blur-[50px] -mr-16 -mt-16 transition-all group-hover:bg-gold/10" />
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Thời gian làm việc</p>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mt-1">Chấm công</h3>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shadow-lg shadow-gold/5">
                    <Clock size={24} />
                  </div>
                </div>
                <div className="mt-4 text-xs font-bold text-gray-400 space-y-1">
                  <p>Trạng thái: <span className={`uppercase tracking-wider text-[10px] px-2 py-0.5 rounded font-black ${!checkInTime ? "bg-red-500/10 text-red-400 border border-red-500/20" : !checkOutTime ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"}`}>{!checkInTime ? "Chưa Check-in" : !checkOutTime ? "Đang làm việc" : "Đã Check-out"}</span></p>
                  {checkInTime && <p>Check-in lúc: <span className="text-white font-mono font-bold">{new Date(checkInTime).toLocaleTimeString("vi-VN")}</span></p>}
                  {checkOutTime && <p>Check-out lúc: <span className="text-white font-mono font-bold">{new Date(checkOutTime).toLocaleTimeString("vi-VN")}</span></p>}
                </div>
              </div>
              <div className="flex gap-3 mt-6 relative z-10">
                <button
                  onClick={handleCheckIn}
                  disabled={!!checkInTime}
                  className={`flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    !checkInTime 
                      ? "bg-gold text-sidebar hover:bg-white hover:text-sidebar shadow-lg shadow-gold/25" 
                      : "bg-white/5 text-gray-600 cursor-not-allowed border border-white/5"
                  }`}
                >
                  Check-in
                </button>
                <button
                  onClick={handleCheckOut}
                  disabled={!checkInTime || !!checkOutTime}
                  className={`flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    checkInTime && !checkOutTime 
                      ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white" 
                      : "bg-white/5 text-gray-600 cursor-not-allowed border border-white/5"
                  }`}
                >
                  Check-out
                </button>
              </div>
            </div>
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
                    {tasksList.filter(t => String(t.assigneeId) === String(user?.id)).length > 0 ? (
                      tasksList.filter(t => String(t.assigneeId) === String(user?.id)).map((task: any) => (
                        <div
                          key={task.id}
                          onClick={() => setSelectedStaffTask(task)}
                          className="p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group bg-white/[0.02] border-white/5 hover:border-gold/30"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter">{task.title}</h3>
                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border tracking-widest ${
                              task.status === "COMPLETED" 
                                ? "bg-green-500/10 text-green-500 border-green-500/20" 
                                : task.status === "IN_PROGRESS"
                                ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                            }`}>
                              {task.status === "COMPLETED" ? "Hoàn thành" : task.status === "IN_PROGRESS" ? "Đang xử lý" : "Chưa bắt đầu"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mb-4 font-medium leading-relaxed space-y-1.5">
                            {task.title === "Làm kênh" && task.batch ? (
                              <div className="flex items-center gap-1.5 text-gold font-bold">
                                <span className="text-[10px] uppercase tracking-wider text-gray-500">Chi tiết:</span>
                                <span className="bg-gold/10 px-2.5 py-0.5 rounded-lg border border-gold/20 text-[10px] tracking-wide font-black uppercase text-gold">
                                  {task.batch} (STT: {task.range})
                                </span>
                              </div>
                            ) : task.mailRange ? (
                              <div className="flex items-center gap-1.5 text-gold font-bold">
                                <span className="text-[10px] uppercase tracking-wider text-gray-500">Chi tiết:</span>
                                <span className="bg-gold/15 text-gold px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                  STT: {task.mailRange}
                                </span>
                              </div>
                            ) : null}
                            <div className="pt-1">
                              <b>Ghi chú:</b> {task.note || "Tiến hành check tạo xóa và xử lý các mail vệ tinh/gốc được giao. Đảm bảo đúng tiến độ và báo cáo lỗi nếu có."}
                            </div>
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
                    <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
                      <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/5">
                        <tr>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">STT</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">STT Gốc</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Email</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">KP</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Pass</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">2FA</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">SĐT</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Link OTP</th>
                          <th className="py-5 px-6 font-black uppercase tracking-widest text-[10px] text-center whitespace-nowrap">Trạng thái công việc</th>
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
                              <td className="py-4 px-6 text-[10px] font-black text-gray-500 whitespace-nowrap">{index + 1}</td>
                              <td className="py-4 px-6 text-[10px] font-black text-gold/80 whitespace-nowrap">
                                {mail.type === "ROOT" ? mail.id 
                                  : mail.type === "SATELLITE" ? mail.id - 1000 
                                  : mail.id - 2000}
                              </td>
                              <td className="py-4 px-6 font-bold text-white cursor-pointer hover:text-gold transition-colors whitespace-nowrap" onClick={() => copyToClipboard(mail.email, "Email")}>{mail.email}</td>
                              <td className="py-4 px-6 text-xs text-gray-400 cursor-pointer hover:text-gold transition-colors whitespace-nowrap" onClick={() => copyToClipboard(mail.recovery, "KP")}>{mail.recovery}</td>
                              <td className="py-4 px-6 text-xs text-gray-500 font-mono cursor-pointer hover:text-gold transition-colors whitespace-nowrap" onClick={() => copyToClipboard(mail.pass, "Mật khẩu")}>{mail.pass}</td>
                              <td className="py-4 px-6 text-xs text-gray-500 font-mono whitespace-nowrap">
                                <TOTPDisplay secret={mail.twoFA || ""} compact onCopy={copyToClipboard} />
                              </td>
                              <td className="py-4 px-6 text-xs text-gray-500 font-bold cursor-pointer hover:text-gold transition-colors whitespace-nowrap" onClick={() => copyToClipboard(mail.phone || "", "SĐT")}>{mail.phone || "---"}</td>
                              <td className="py-4 px-6 text-xs text-gray-500 whitespace-nowrap">
                                {mail.otpLink ? (
                                  <a href={mail.otpLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-white transition-all flex items-center gap-1 font-bold text-xs cursor-pointer">Link OTP <ExternalLink size={12} /></a>
                                ) : <span className="text-gray-700">---</span>}
                              </td>
                              <td className="py-4 px-6 text-center whitespace-nowrap">
                                 <div className="flex items-center justify-center gap-2">
                                  {mail.workStatus === "Đang xử lí" && (
                                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase border border-amber-500/30 bg-amber-500/10 text-amber-500">
                                      Đang xử lí
                                    </span>
                                  )}
                                  <button 
                                    onClick={() => handleStaffMailStatusChange(mail.id, "Đã làm")}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border ${
                                      mail.workStatus === "ĐÃ LÀM KÊNH" || mail.workStatus === "HOÀN THÀNH" || mail.workStatus === "Đã làm" || mail.workStatus === "ĐÃ LÀM" || mail.workStatus === "ĐÃ MỜI MAIL"
                                        ? "bg-green-500/10 text-green-500 border-green-500/30 font-bold"
                                        : "bg-white/5 text-gray-400 border-white/10 hover:border-green-500/30 hover:text-green-500"
                                    }`}
                                  >
                                    Đã làm
                                  </button>
                                  {mail.workStatus !== "Đang xử lí" && (
                                    <button 
                                      onClick={() => handleStaffMailStatusChange(mail.id, "Chưa làm")}
                                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border ${
                                        mail.workStatus === "Chưa làm" || mail.workStatus === "CHƯA LÀM" || mail.workStatus === "CHƯA LÀM KÊNH" || mail.workStatus === "CHƯA MỜI MAIL" || !mail.workStatus
                                          ? "bg-amber-500/10 text-amber-500 border-amber-500/30 font-bold"
                                          : "bg-white/5 text-gray-400 border-white/10 hover:border-amber-500/30 hover:text-amber-500"
                                      }`}
                                    >
                                      Chưa làm
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleStaffMailStatusChange(mail.id, "Lỗi")}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border ${
                                      mail.workStatus === "Lỗi" || mail.workStatus === "LỖI"
                                        ? "bg-red-500/10 text-red-500 border-red-500/30 font-bold"
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
                          <tr><td colSpan={9} className="py-10 text-center text-gray-600 font-bold uppercase tracking-widest">Bạn chưa được gán tài khoản mail nào</td></tr>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Tổng mail" value={stats.totalMail} icon={<Mail size={32} />} color="blue" subtitle="Toàn hệ thống" onClick={() => router.push("/admin/mail/all")} />
            <StatCard title="Mail Gốc" value={stats.mailRoot} icon={<Database size={32} />} color="indigo" subtitle="Tồn kho mail gốc" onClick={() => router.push("/admin/mail/root")} />
            <StatCard title="Mail Vệ Tinh" value={stats.mailSatellite} icon={<Zap size={32} />} color="purple" subtitle="Tồn kho mail vệ tinh" onClick={() => router.push("/admin/mail/satellite")} />
            {!(user?.role === "03" || user?.role === "04") && (
              <StatCard title="Bật kiếm tiền" value={stats.mailMonetized} icon={<DollarSign size={32} />} color="gold" subtitle="Kênh đã bật QC" onClick={() => router.push("/admin/mail/monetized")} />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <StatCard title="Task hôm nay" value={stats.tasksToday} icon={<ClipboardList size={32} />} color="green" subtitle="Công việc đang chạy" onClick={() => setSelectedViewType("TASKS")} />
            
            {user?.role !== "04" && (
              <StatCard title="Nhân viên Online" value={stats.staffOnline} icon={<Users size={32} />} color="blue" subtitle="Đang làm việc" onClick={() => setSelectedViewType("STAFF")} />
            )}

            {isAdminOrManager && (
              <StatCard 
                title="Kênh đủ giờ" 
                value={stats.mailWatchHours || 0} 
                icon={<Target size={32} />} 
                color="gold" 
                subtitle="Đạt điều kiện & thư mời" 
                onClick={() => setIsEligibleChannelsModalOpen(true)} 
              />
            )}

            <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-6 flex items-center justify-between shadow-inner col-span-1">
               <div 
                 onClick={() => setSelectedViewType("LIVE")}
                 className="flex items-center gap-4 cursor-pointer group hover:opacity-80 transition-all"
               >
                  <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20 group-hover:bg-green-500/20"><CheckCircle2 size={24} /></div>
                  <div><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Hệ thống</p><h4 className="text-sm font-black text-white uppercase tracking-tighter">Live: {stats.mailLive}</h4></div>
               </div>
               <div className="h-10 w-px bg-white/5" />
               <div 
                 onClick={() => setSelectedViewType("DIE")}
                 className="flex items-center gap-4 cursor-pointer group hover:opacity-80 transition-all"
               >
                  <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 group-hover:bg-red-500/20"><XCircle size={24} /></div>
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
            <div className="flex flex-col gap-6">
              {/* Approval Center Card */}
              {isAdminOrManager && (
                <div className="rounded-[32px] border border-border-custom bg-sidebar p-6 shadow-2xl relative overflow-hidden group text-left">
                  <div className="absolute top-0 right-0 h-32 w-32 bg-gold/5 blur-[50px] pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldAlert className="text-gold" size={18} />
                      Yêu cầu truy cập ngoài giờ
                    </h3>
                    <span className="bg-gold/10 text-gold border border-gold/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      {pendingRequests.length} Đang chờ
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                    {pendingRequests.length > 0 ? (
                      pendingRequests.map((req: any) => (
                        <div key={`req-card-${req.id}`} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 hover:border-gold/30 transition-all">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-black text-white">{req.staffName}</p>
                              <p className="text-[9px] text-gray-500 font-mono mt-0.5">{req.time}</p>
                            </div>
                            <span className="text-[8px] font-black uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-md">
                              Chờ duyệt
                            </span>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveRequest(req)}
                              className="flex-1 h-9 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                            >
                              <Check size={12} /> Đồng ý
                            </button>
                            <button
                              onClick={() => handleDenyRequest(req)}
                              className="h-9 w-9 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-gray-600 text-xs font-bold uppercase tracking-widest leading-relaxed">
                        Không có yêu cầu nào cần duyệt
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Original Objectives Card */}
              <div className="rounded-[32px] border border-gold/20 bg-gold/5 p-6 flex flex-col justify-center text-center space-y-4">
                <div className="mx-auto h-16 w-16 bg-gold rounded-full flex items-center justify-center shadow-2xl shadow-gold/20 text-sidebar"><Target size={28} /></div>
                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Mục tiêu quý II</h3>
                <p className="text-gray-400 text-xs leading-relaxed">Tối ưu hóa tỷ lệ <b>Mail Live</b> và tăng tốc các kênh vệ tinh đạt 4000 giờ xem.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Premium Kênh Đủ Giờ Details Modal Popup */}
      <AnimatePresence>
        {isEligibleChannelsModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              className="bg-sidebar border border-white/10 w-full max-w-4xl rounded-[40px] p-10 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="absolute top-0 right-0 h-96 w-96 bg-gold/5 blur-[120px] -mr-48 -mt-48" />

              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shadow-lg">
                    <Target size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                      Danh sách Kênh Đủ Giờ
                    </h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Tổng hợp kênh vệ tinh đạt điều kiện và trạng thái gửi thư mời</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEligibleChannelsModalOpen(false)} 
                  className="h-10 w-10 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center border border-white/10 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-auto flex-1 custom-scrollbar relative z-10 border border-white/5 rounded-3xl bg-black/10">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="sticky top-0 bg-[#0d0d0d] z-20 border-b border-white/5">
                    <tr className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                      <th className="py-5 px-6">STT</th>
                      <th className="py-5 px-6">Tên kênh</th>
                      <th className="py-5 px-6">Link kênh</th>
                      <th className="py-5 px-6 text-center">Trạng thái mời</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {mails
                      .filter((m: any) => m.type === "SATELLITE" && Array.isArray(m.eligibleChannels) && m.eligibleChannels.some(Boolean))
                      .flatMap((m: any, mailIdx: number) => {
                        const activeChannels = [];
                        for (let i = 0; i < 3; i++) {
                          if (m.eligibleChannels[i] && m.links && m.links[i]) {
                            activeChannels.push({
                              stt: `${mailIdx + 1}.${i + 1}`,
                              name: m.channelNames && m.channelNames[i] ? m.channelNames[i] : `Kênh vệ tinh #${i + 1}`,
                              link: m.links[i],
                              mailId: m.id,
                              chIdx: i,
                              inviteStatus: (m.inviteStatuses && m.inviteStatuses[i]) ? m.inviteStatuses[i] : "Chưa mời"
                            });
                          }
                        }
                        return activeChannels;
                      })
                      .map((row: any, idx: number) => (
                        <tr key={`${row.mailId}-${row.chIdx}-${idx}`} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="py-4 px-6 text-[10px] font-black text-gray-500">{row.stt}</td>
                          <td className="py-4 px-6 font-bold text-gold uppercase tracking-tighter text-xs">
                            {row.name.replace("Tên kênh: ", "")}
                          </td>
                          <td className="py-4 px-6 text-xs text-gray-400 font-mono">
                            <a 
                              href={row.link} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 underline font-bold"
                            >
                              <span>{row.link.length > 35 ? `${row.link.substring(0, 35)}...` : row.link}</span>
                              <ExternalLink size={12} />
                            </a>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <select 
                              value={row.inviteStatus}
                              onChange={(e) => handleInviteStatusChange(row.mailId, row.chIdx, e.target.value)}
                              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl outline-none border transition-all cursor-pointer ${
                                row.inviteStatus === "Đã mời" 
                                  ? "bg-green-500/10 text-green-500 border-green-500/20" 
                                  : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                              }`}
                            >
                              <option value="Chưa mời" className="bg-sidebar text-white">Chưa mời</option>
                              <option value="Đã mời" className="bg-sidebar text-white">Đã mời</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    {mails.filter((m: any) => m.type === "SATELLITE" && Array.isArray(m.eligibleChannels) && m.eligibleChannels.some(Boolean)).length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-500 font-bold uppercase tracking-widest">
                          Không có kênh nào đủ điều kiện hiện tại
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 relative z-10 pt-4 border-t border-white/5 text-right">
                <button 
                  onClick={() => setIsEligibleChannelsModalOpen(false)} 
                  className="h-14 px-8 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
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
