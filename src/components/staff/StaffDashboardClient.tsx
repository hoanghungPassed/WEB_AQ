"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, DollarSign, ClipboardList, Calendar, Search, 
  ArrowLeft, CheckCircle2, Clock, Play, Loader2, RefreshCw, AlertTriangle, Inbox,
  Copy, ExternalLink, Lock, X, Trash2, CalendarDays, CheckCircle, XCircle, Minus
} from "lucide-react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/Badge";
import dynamic from "next/dynamic";
const TOTPDisplay = dynamic(() => import("@/components/admin/TOTPDisplay"), { ssr: false });
const MailDetailModal = dynamic(() => import("@/components/admin/MailDetailModal"), { ssr: false });
import { toast } from "react-hot-toast";

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

const formatDeadline = (dateStr: string) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${hh}:${mm} - ${dd}/${MM}/${yyyy}`;
  } catch {
    return dateStr;
  }
};

export default function StaffDashboardClient({ user }: { user: any }) {
  const [taskSearch, setTaskSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  
  const [taskMailsList, setTaskMailsList] = useState<any[]>([]);
  const [loadingTaskMails, setLoadingTaskMails] = useState<boolean>(false);
  const [completingTask, setCompletingTask] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [selectedMailForConfig, setSelectedMailForConfig] = useState<any | null>(null);

  const [activeDetailDay, setActiveDetailDay] = useState<any | null>(null);
  const [appealReason, setAppealReason] = useState("");
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  const handleCopy = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      toast.success("Đã sao chép!");
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      toast.success("Đã sao chép!");
    }
  };

  const selectedTaskBatch = selectedTask?.batch || selectedTask?.batchName || "";
  
  useEffect(() => {
    if (!selectedTask) {
      setTaskMailsList([]);
      return;
    }

    const fetchTaskMails = async () => {
      setLoadingTaskMails(true);
      try {
        let url = `/api/admin/mails?all=true`;
        if (selectedTaskBatch) {
          url += `&batch=${encodeURIComponent(selectedTaskBatch)}`;
        } else {
          const ids = (selectedTask.selectedMailIds || []).join(",") || 
                      ((selectedTask as any).mailIds || []).join(",");
          if (ids) {
            url += `&ids=${encodeURIComponent(ids)}`;
          } else {
            url += `&assigneeId=${encodeURIComponent(selectedTask.assigneeId || user?.id || "")}`;
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
  }, [selectedTask, selectedTaskBatch, user]);

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
        toast.success("Lưu dữ liệu thành công");
        
        // Refresh local task mails list
        setTaskMailsList(prev => prev.map((m: any) => {
          const mId = m._id || m.id;
          if (String(mId) === String(mailId)) {
            return { ...m, ...updatedFields, ...additionalFields };
          }
          return m;
        }));

        mutate("/api/admin/tasks");
        window.dispatchEvent(new Event("storage"));
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Cập nhật chi tiết mail thất bại.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ khi lưu chi tiết mail!");
    }
  }, []);

  const isTaskCompleteEligible = useMemo(() => {
    if (taskMailsList.length === 0) return false;
    const taskType = selectedTask?.type;
    
    // Only enforce 3 links requirement for SATELLITE / MAIL_VE_TINH
    if (taskType === "MAIL_VE_TINH" || taskType === "SATELLITE") {
      return taskMailsList.every((mail: any) => {
        if (mail.workStatus === "Lỗi") return true;
        const hasLinks = mail.links && 
          mail.links[0]?.trim() !== "" && 
          mail.links[1]?.trim() !== "" && 
          mail.links[2]?.trim() !== "";
        return (mail.workStatus === "Đã làm" || mail.status === "USED") && hasLinks;
      });
    }
    
    // For other task types (MAIL_GOC, MAIL_MONETIZED), they can be completed
    return true;
  }, [taskMailsList, selectedTask]);

  const handleCompleteTask = async () => {
    if (!selectedTask) return;
    const taskId = selectedTask._id || selectedTask.id;
    setCompletingTask(true);
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED"
        })
      });

      if (res.ok) {
        toast.success("Chúc mừng! Bạn đã hoàn thành nhiệm vụ xuất sắc!");
        setSelectedTask(null); // Go back to task list
        mutate("/api/admin/tasks");
        window.dispatchEvent(new Event("storage"));
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Cập nhật trạng thái nhiệm vụ thất bại!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ khi hoàn thành nhiệm vụ!");
    } finally {
      setCompletingTask(false);
    }
  };

  const updateTaskStatus = async (newStatus: string) => {
    if (!selectedTask || isUpdatingStatus) return;
    const taskId = selectedTask._id || selectedTask.id;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Đã cập nhật trạng thái: ${newStatus === "IN_PROGRESS" ? "Đang làm" : newStatus === "CANCELLED" ? "Đã hủy" : newStatus}`);
        const data = await res.json();
        if (data.success && data.data) {
          setSelectedTask(data.data);
        }
        mutate("/api/admin/tasks");
        window.dispatchEvent(new Event("storage"));
      } else {
        const err = await res.json();
        toast.error(err.error || "Cập nhật thất bại");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi kết nối");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const fetcher = useCallback(async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch data");
    return res.json();
  }, []);

  // SWR hooks for staff data
  const { data: statsData, error: statsError, isValidating: statsValidating } = useSWR(
    user ? "/api/admin/stats" : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 120000, dedupingInterval: 10000 }
  );

  const { data: tasksData, error: tasksError, isValidating: tasksValidating } = useSWR(
    user ? "/api/admin/tasks" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const { data: rawAttendanceData, error: attendanceError, isValidating: attendanceValidating } = useSWR(
    user ? "/api/admin/attendance?history=true" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const handleRefresh = () => {
    mutate("/api/admin/stats");
    mutate("/api/admin/tasks");
    mutate("/api/admin/attendance?history=true");
  };

  const stats = statsData?.data || {};
  const tasksList = tasksData?.success ? tasksData.data : (Array.isArray(tasksData) ? tasksData : []);
  const attendanceHistory = rawAttendanceData?.data || [];

  const handleSubmitAppeal = async (dateKey: string) => {
    if (!appealReason.trim()) {
      toast.error("Vui lòng nhập lý do khiếu nại");
      return;
    }
    setSubmittingAppeal(true);
    try {
      const res = await fetch("/api/staff/attendance/appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateKey, reason: appealReason.trim() })
      });
      if (res.ok) {
        toast.success("Gửi khiếu nại thành công!");
        setAppealReason("");
        setActiveDetailDay(null);
        mutate("/api/admin/attendance?history=true");
      } else {
        const err = await res.json();
        toast.error(err.error || "Gửi khiếu nại thất bại");
      }
    } catch (e) {
      toast.error("Lỗi kết nối");
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const attendanceData = useMemo(() => {
    const list: any[] = [];
    let present = 0;
    let absent = 0;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthIdx = today.getMonth();
    const totalDays = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
    const monthStr = String(currentMonthIdx + 1).padStart(2, '0');

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const dayStr = String(dayNum).padStart(2, '0');
      const dateKey = `${currentYear}-${monthStr}-${dayStr}`;
      const currentDate = new Date(currentYear, currentMonthIdx, dayNum);
      const isSunday = currentDate.getDay() === 0;
      const isToday = dayNum === today.getDate() && currentMonthIdx === today.getMonth() && currentYear === today.getFullYear();
      const isFuture = currentDate > today && !isToday;

      let isNotStarted = false;
      if (user?.createdAt) {
        const createdDate = new Date(user.createdAt);
        const currentZeroTime = new Date(currentYear, currentMonthIdx, dayNum);
        const createdZeroTime = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
        if (currentZeroTime < createdZeroTime) {
          isNotStarted = true;
        }
      }

      const dbRecord = (attendanceHistory || []).find((r: any) => r.date === dateKey);
      let hasCheckedIn = false;
      let actualTime = "";
      let checkoutTime = "";

      if (dbRecord) {
        if (dbRecord.checkInTime || (dbRecord.status && dbRecord.status !== "Vắng mặt")) {
          hasCheckedIn = true;
          if (dbRecord.checkInTime) {
            const dIn = new Date(dbRecord.checkInTime);
            actualTime = dIn.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          } else {
            actualTime = "Đã vào hệ thống";
          }
          if (dbRecord.checkOutTime) {
            const dOut = new Date(dbRecord.checkOutTime);
            checkoutTime = dOut.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          }
        }
      }

      let status = "ABSENT";
      if (isSunday) {
        status = "SUNDAY";
      } else if (isFuture) {
        status = "FUTURE";
      } else if (isNotStarted) {
        status = "NOT_STARTED";
      } else if (hasCheckedIn) {
        status = "PRESENT";
        present++;
      } else {
        status = "ABSENT";
        absent++;
      }

      let workLog: any[] = [];
      if (hasCheckedIn) {
        workLog = [
          { time: actualTime, title: "Điểm danh sáng (Check-in)", desc: dbRecord?.status === "Đi muộn" ? "Bắt đầu ca làm việc (Muộn giờ)." : "Bắt đầu ca làm việc." },
          { time: checkoutTime || "---", title: "Điểm danh chiều (Check-out)", desc: checkoutTime ? "Hoàn tất ca làm việc." : "Đang làm việc..." }
        ];
      } else if (status === "SUNDAY") {
        workLog = [
          { time: "N/A", title: "Chủ nhật nghỉ", desc: "Ngày nghỉ cuối tuần theo quy định, không tính công làm việc." }
        ];
      } else if (status === "NOT_STARTED") {
        workLog = [
          { time: "N/A", title: "Chưa đi làm", desc: "Nhân sự chưa bắt đầu làm việc tại công ty trước ngày đăng ký tài khoản." }
        ];
      } else if (status === "FUTURE") {
        workLog = [
          { time: "N/A", title: "Chưa đến ngày", desc: "Ngày trong tương lai của tháng hiện tại, chưa có dữ liệu chấm công." }
        ];
      } else {
        workLog = [
          { time: "N/A", title: "Vắng mặt", desc: "Không có dữ liệu hoạt động trong ngày này. Nhân sự nghỉ phép hoặc chưa chấm công." }
        ];
      }

      list.push({
        dayNum,
        dateKey,
        isToday,
        hasCheckedIn,
        checkinTime: actualTime || "---",
        checkoutTime: checkoutTime || "---",
        status,
        workLog,
        dbRecord
      });
    }

    return { list, present, absent };
  }, [user, attendanceHistory]);

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
      case "CANCELLED":
        return <Badge variant="danger" className="rounded-sm">Đã hủy</Badge>;
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
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedTask(null)} 
            className="h-10 w-10 bg-gold/10 rounded-sm flex items-center justify-center text-gold hover:bg-gold hover:text-background transition-all cursor-pointer"
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

          <div className="card-style flex flex-col justify-between space-y-6">
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest border-b border-border pb-3 mb-4">Thông tin bổ sung</h4>
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest block">Số lượng mail giao</span>
                  <span className="text-2xl font-black text-white">{selectedTask.mailCount || 0} mail</span>
                </div>

                <div>
                  <span className="text-[10px] font-black text-foreground-secondary uppercase tracking-widest block">Hạn chót (Deadline)</span>
                  <span className="text-sm font-bold text-red-400">
                    {formatDeadline(selectedTask.deadline)}
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

            {/* Task Action Buttons */}
            <div className="pt-6 border-t border-border space-y-3">
              {selectedTask.status === "PENDING" && (
                <button
                  onClick={() => updateTaskStatus("IN_PROGRESS")}
                  disabled={isUpdatingStatus}
                  className={`w-full h-12 text-white font-bold rounded-md uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                    isUpdatingStatus 
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50" 
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/10"
                  }`}
                >
                  {isUpdatingStatus ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Bắt đầu thực hiện
                </button>
              )}

              {selectedTask.status !== "COMPLETED" && selectedTask.status !== "CANCELLED" && (
                <button
                  onClick={handleCompleteTask}
                  disabled={completingTask || !isTaskCompleteEligible}
                  className={`w-full h-12 text-white font-bold rounded-md uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                    isTaskCompleteEligible 
                      ? "bg-green-600 hover:bg-green-700 shadow-green-600/10 animate-pulse" 
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
                  }`}
                >
                  {completingTask ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Hoàn thành Nhiệm vụ
                </button>
              )}

              {selectedTask.status !== "COMPLETED" && selectedTask.status !== "CANCELLED" && (
                <button
                  onClick={async () => {
                    const confirmCancel = window.confirm("Bạn có chắc chắn muốn hủy nhiệm vụ này? Hành động này sẽ trả lại toàn bộ mail của nhiệm vụ này về kho và không thể hoàn tác!");
                    if (!confirmCancel) return;
                    await updateTaskStatus("CANCELLED");
                    setSelectedTask(null);
                  }}
                  disabled={isUpdatingStatus}
                  className={`w-full h-12 text-white font-bold rounded-md uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                    isUpdatingStatus 
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50" 
                      : "bg-red-600 hover:bg-red-700 shadow-red-600/10"
                  }`}
                >
                  {isUpdatingStatus ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />} Hủy nhiệm vụ
                </button>
              )}
              
              {!isTaskCompleteEligible && selectedTask.status !== "COMPLETED" && (selectedTask.type === "MAIL_VE_TINH" || selectedTask.type === "SATELLITE") && (
                <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider text-center">
                  * Yêu cầu nhập đầy đủ 3 link kênh cho tất cả các mail để hoàn thành.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Task Mails List (Worksheet) */}
        <div className="card-style !p-0 overflow-hidden flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-border bg-[#0d0d0d]">
            <h3 className="text-base font-black text-white uppercase tracking-widest">Danh sách Email trong Lô</h3>
            <span className="text-xs font-mono font-bold text-gold">{taskMailsList.length} Mail</span>
          </div>
          
          {selectedTask.status === "PENDING" ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-black/30 border border-dashed border-gold/10 rounded-b-xl min-h-[300px]">
              <div className="h-16 w-16 bg-gold/10 text-gold rounded-full flex items-center justify-center border border-gold/20 mb-4 animate-pulse">
                <Lock size={32} />
              </div>
              <h4 className="text-lg font-black text-white uppercase tracking-tight">Danh sách mail đang bị khóa</h4>
              <p className="text-xs text-gray-500 max-w-sm mt-2 leading-relaxed font-semibold uppercase tracking-wider">
                Bạn cần phải nhấn nút <span className="text-gold font-bold">"Bắt đầu thực hiện"</span> ở trên để xem danh sách tài khoản và nhận phân công nhiệm vụ.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-border text-[9px] font-black uppercase text-foreground-secondary tracking-widest bg-black/20">
                  <th className="px-6 py-4">STT</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Mật khẩu</th>
                  <th className="px-6 py-4">Mail khôi phục</th>
                  <th className="px-6 py-4">Mã 2FA</th>
                  <th className="px-6 py-4">Số điện thoại</th>
                  <th className="px-6 py-4">Link OTP</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs bg-black/10">
                {loadingTaskMails ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center">
                      <div className="py-8 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="animate-spin text-gold" size={24} />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Đang tải danh sách mail...</span>
                      </div>
                    </td>
                  </tr>
                ) : taskMailsList.length > 0 ? (
                  taskMailsList.map((mail: any, index: number) => {
                    const mailId = mail._id || mail.id;
                    const passwordVal = mail.password || mail.pass || "";
                    const recoveryVal = mail.recoveryMail || mail.recovery || "";
                    const twoFAVal = mail.twoFA || "";
                    const phoneVal = mail.phone || "";
                    const phoneLinkVal = mail.phoneLink || mail.otpLink || "";

                    return (
                      <tr key={mailId} className="hover:bg-white/5 transition-all group">
                        <td className="px-6 py-3.5 font-bold text-white">{index + 1}</td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 group/copy">
                            <span 
                              onClick={() => handleCopy(mail.email)}
                              className="cursor-pointer border-b border-dashed border-zinc-700/50 hover:border-gold hover:text-gold transition-all text-sm font-bold text-white max-w-[180px] truncate"
                              title="Bấm để sao chép"
                            >
                              {mail.email}
                            </span>
                            <button onClick={() => handleCopy(mail.email)} className="p-1 text-gray-500 hover:text-gold rounded-md opacity-0 group-hover/copy:opacity-100 transition-all cursor-pointer">
                              <Copy size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          {passwordVal ? (
                            <div className="flex items-center gap-1.5 group/copy">
                              <span 
                                onClick={() => handleCopy(passwordVal)}
                                className="cursor-pointer border-b border-dashed border-zinc-700/50 hover:border-gold hover:text-gold transition-all font-mono text-zinc-300"
                                title="Bấm để sao chép"
                              >
                                {passwordVal}
                              </span>
                              <button onClick={() => handleCopy(passwordVal)} className="p-1 text-gray-500 hover:text-gold rounded-md opacity-0 group-hover/copy:opacity-100 transition-all cursor-pointer">
                                <Copy size={12} />
                              </button>
                            </div>
                          ) : <span className="text-zinc-600 italic">---</span>}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          {recoveryVal ? (
                            <div className="flex items-center gap-1.5 group/copy">
                              <span 
                                onClick={() => handleCopy(recoveryVal)}
                                className="cursor-pointer border-b border-dashed border-zinc-700/50 hover:border-gold hover:text-gold transition-all text-zinc-300"
                                title="Bấm để sao chép"
                              >
                                {recoveryVal}
                              </span>
                              <button onClick={() => handleCopy(recoveryVal)} className="p-1 text-gray-500 hover:text-gold rounded-md opacity-0 group-hover/copy:opacity-100 transition-all cursor-pointer">
                                <Copy size={12} />
                              </button>
                            </div>
                          ) : <span className="text-zinc-600 italic">---</span>}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          {twoFAVal ? (
                            <div className="w-max">
                              <TOTPDisplay secret={twoFAVal} compact={true} onCopy={handleCopy} />
                            </div>
                          ) : <span className="text-zinc-600 italic">---</span>}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          {phoneVal ? (
                            <div className="flex items-center gap-1.5 group/copy">
                              <span 
                                onClick={() => handleCopy(phoneVal)}
                                className="cursor-pointer border-b border-dashed border-zinc-700/50 hover:border-gold hover:text-gold transition-all font-mono text-zinc-300"
                                title="Bấm để sao chép"
                              >
                                {phoneVal}
                              </span>
                              <button onClick={() => handleCopy(phoneVal)} className="p-1 text-gray-500 hover:text-gold rounded-md opacity-0 group-hover/copy:opacity-100 transition-all cursor-pointer">
                                <Copy size={12} />
                              </button>
                            </div>
                          ) : <span className="text-zinc-600 italic">---</span>}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          {phoneLinkVal ? (
                            <a 
                              href={phoneLinkVal} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-400 hover:text-gold hover:underline transition-all flex items-center gap-1 font-bold text-xs"
                            >
                              Link OTP <ExternalLink size={12} />
                            </a>
                          ) : <span className="text-zinc-600 italic">---</span>}
                        </td>
                        <td className="px-6 py-3.5 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            mail.workStatus === "Đã làm"
                            ? "bg-green-500/10 text-green-500 border-green-500/20" 
                            : mail.workStatus === "Lỗi"
                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                          }`}>
                            {mail.workStatus || "Chưa làm"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right whitespace-nowrap">
                          {selectedTask.status === "COMPLETED" ? (
                            <button 
                              onClick={() => setSelectedMailForConfig(mail)} 
                              className="h-8 px-3 bg-white/10 text-white hover:bg-gold hover:text-sidebar rounded-md text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                            >
                              Chi tiết
                            </button>
                          ) : (
                            <button 
                              onClick={() => setSelectedMailForConfig(mail)} 
                              className="h-8 px-3 bg-gold/15 text-gold hover:bg-gold hover:text-sidebar rounded-md text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
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
                    <td colSpan={9} className="p-8 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-30">
                        <Mail size={40} />
                        <span className="text-xs font-bold uppercase tracking-wider">Không tìm thấy mail nào trong lô này</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {selectedMailForConfig && (
          <MailDetailModal
            mail={selectedMailForConfig}
            type={
              selectedTask.type === "MAIL_GOC"
                ? "ROOT"
                : selectedTask.type === "MAIL_MONETIZED"
                ? "MONETIZED"
                : "SATELLITE"
            }
            user={user}
            viewOnly={selectedTask.status === "COMPLETED"}
            onClose={() => setSelectedMailForConfig(null)}
            onSave={(updatedFields) => {
              const mailId = selectedMailForConfig._id || selectedMailForConfig.id;
              handleSaveUnifiedDetails(mailId, updatedFields);
            }}
          />
        )}
      </div>
    );
  }

  const isLoading = statsValidating || tasksValidating || attendanceValidating;

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase flex items-center gap-3 flex-wrap">
            BẢNG ĐIỀU KHIỂN CÁ NHÂN
            {stats.warehouseMailsCount !== undefined && (
              <span className="px-3 py-1 text-xs font-black bg-gold/10 text-gold border border-gold/30 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-pulse shrink-0">
                Kho còn: {stats.warehouseMailsCount} mail
              </span>
            )}
          </h1>
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
                className="w-full h-9 pl-14 pr-4 text-xs bg-background border border-border rounded-md text-white placeholder-foreground-secondary/70 focus:border-gold outline-none transition-all"
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
                        {formatDeadline(task.deadline)}
                      </td>
                      <td className="py-3.5 px-4 text-center">{getStatusBadge(task.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedTask(task)}
                            className="h-7 w-7 rounded-sm bg-gold/10 text-gold flex items-center justify-center hover:bg-gold hover:text-sidebar transition-all cursor-pointer"
                            title="Làm nhiệm vụ"
                          >
                            <Play size={12} />
                          </button>
                          {task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                const confirmCancel = window.confirm("Bạn có chắc chắn muốn hủy nhiệm vụ này? Hành động này sẽ trả lại toàn bộ mail của nhiệm vụ này về kho và không thể hoàn tác!");
                                if (!confirmCancel) return;
                                try {
                                  const res = await fetch(`/api/admin/tasks/${task._id || task.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ status: "CANCELLED" })
                                  });
                                  if (res.ok) {
                                    toast.success("Đã hủy nhiệm vụ thành công!");
                                    mutate("/api/admin/tasks");
                                  } else {
                                    const err = await res.json();
                                    toast.error(err.error || "Hủy thất bại");
                                  }
                                } catch (errVal) {
                                  toast.error("Lỗi kết nối");
                                }
                              }}
                              className="h-7 w-7 rounded-sm bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                              title="Hủy / Xóa nhiệm vụ"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-4">
                      {tasksValidating ? (
                        <div className="py-16 flex flex-col items-center justify-center gap-3">
                          <Loader2 size={32} className="animate-spin text-gold" />
                          <p className="text-foreground-secondary font-black uppercase text-[10px] tracking-widest animate-pulse">Đang tải dữ liệu nhiệm vụ...</p>
                        </div>
                      ) : (
                        <div className="border border-dashed border-gold/30 bg-black/50 p-8 text-center rounded-lg my-2">
                          <Inbox size={48} className="mx-auto text-gold/50 mb-4 animate-bounce" />
                          <h4 className="text-gold font-bold uppercase text-sm tracking-wider mb-2">CHƯA CÓ NHIỆM VỤ ĐƯỢC GIAO</h4>
                          <p className="text-gray-400 text-xs max-w-md mx-auto mb-4 leading-relaxed">
                            Hệ thống chưa phân công nhiệm vụ mới hoặc bạn đã hoàn thành xuất sắc tất cả công việc được giao.
                          </p>
                          <span className="inline-block px-3 py-1 bg-white/5 border border-border text-foreground-secondary uppercase tracking-widest text-[9px] font-black rounded-sm">
                            Vui lòng liên hệ quản lý hoặc kiểm tra lại sau
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance history section */}
        <div className="card-style space-y-6">
          <div className="border-b border-border pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-widest">Bảng chấm công</h3>
              <p className="text-[10px] text-foreground-secondary uppercase tracking-widest mt-1">Tháng hiện tại</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-green-400 block">Có mặt: {attendanceData.present} ngày</span>
              <span className="text-xs font-bold text-red-400 block">Vắng: {attendanceData.absent} ngày</span>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 bg-black/20 border border-white/0 rounded-2xl p-3 max-h-[350px] overflow-y-auto custom-scrollbar">
            {attendanceValidating ? (
              <div className="py-16 col-span-4 sm:col-span-7 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin text-gold" />
                <p className="text-foreground-secondary font-black uppercase text-[9px] tracking-widest animate-pulse">Đang tải bảng công...</p>
              </div>
            ) : (attendanceData.list || []).map((day) => {
              const isToday = day.isToday;
              let borderStyle = "bg-white/0 border-white/0";
              let statusText = "Vắng";
              let statusColor = "text-red-500/80";
              let statusIcon = <XCircle size={14} className="text-red-500" />;

              if (isToday) {
                borderStyle = "bg-gold/10 border-gold shadow-md";
              }

              if (day.status === "PRESENT") {
                statusText = "Có mặt";
                statusColor = "text-green-500/80";
                statusIcon = <CheckCircle size={14} className="text-green-500" />;
              } else if (day.status === "NOT_STARTED") {
                statusText = "Chưa làm";
                statusColor = "text-zinc-500";
                statusIcon = <Minus size={14} className="text-zinc-500" />;
                if (!isToday) borderStyle = "bg-white/5 border-white/0 opacity-55";
              } else if (day.status === "SUNDAY") {
                statusText = "Chủ nhật";
                statusColor = "text-amber-500/80";
                statusIcon = <CalendarDays size={14} className="text-amber-500" />;
                if (!isToday) borderStyle = "bg-amber-500/5 border-amber-500/10";
              } else if (day.status === "FUTURE") {
                statusText = "Chưa đến";
                statusColor = "text-zinc-600";
                statusIcon = <Clock size={14} className="text-zinc-600" />;
                if (!isToday) borderStyle = "bg-white/0 border-white/0 opacity-40";
              }

              const hasPendingAppeal = day.dbRecord?.complainStatus === "PENDING";
              if (hasPendingAppeal) {
                borderStyle += " animate-pulse bg-amber-500/10 border-amber-500";
              } else if (day.dbRecord?.complainStatus === "RESOLVED") {
                borderStyle += " bg-green-500/5 border-green-500/30";
              } else if (day.dbRecord?.complainStatus === "REJECTED") {
                borderStyle += " bg-red-500/5 border-red-500/30";
              }

              return (
                <button 
                  key={`staff-cal-day-${day.dayNum}`}
                  onClick={() => setActiveDetailDay(day)}
                  className={`group/day flex flex-col items-center justify-between p-2 rounded-xl border text-center transition-all hover:scale-105 hover:bg-white/[0.06] active:scale-95 ${borderStyle}`}
                >
                  <span className={`text-[10px] font-bold ${isToday ?"text-gold" :"text-gray-500"}`}>{day.dayNum}</span>
                  <div className="my-1 flex items-center justify-center">
                    {statusIcon}
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-wider truncate max-w-full ${statusColor}`}>
                    {statusText}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      {activeDetailDay && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setActiveDetailDay(null); setAppealReason(""); }}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-sidebar border border-white/15 rounded-[32px] shadow-2xl p-8 overflow-hidden"
          >
            <button 
              onClick={() => { setActiveDetailDay(null); setAppealReason(""); }}
              className="absolute top-6 right-6 h-10 w-10 bg-white/5 border border-white/0 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shrink-0">
                <CalendarDays size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Chi Tiết Ngày {activeDetailDay.dayNum}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">Ngày: {activeDetailDay.dateKey}</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border mb-6 flex items-center gap-3 ${
              activeDetailDay.hasCheckedIn 
                ? "bg-green-500/10 border-green-500/20 text-green-400" 
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              {activeDetailDay.hasCheckedIn ? <CheckCircle size={24} /> : <XCircle size={24} />}
              <div>
                <p className="text-xs font-black uppercase tracking-wider">
                  {activeDetailDay.hasCheckedIn ? "Có mặt làm việc" : "Vắng mặt"}
                </p>
                {activeDetailDay.hasCheckedIn && (
                  <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                    {activeDetailDay.checkinTime} - {activeDetailDay.checkoutTime}
                  </p>
                )}
              </div>
            </div>

            {/* Appeal Section */}
            {activeDetailDay.status !== "FUTURE" && activeDetailDay.status !== "SUNDAY" && activeDetailDay.status !== "NOT_STARTED" && (
              <div className="space-y-4 border-t border-white/5 pt-4">
                <h4 className="text-xs font-black text-white uppercase tracking-widest">Khiếu nại chuyên cần</h4>
                
                {activeDetailDay.dbRecord?.complainStatus ? (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase">
                      <span className="text-gray-400">Trạng thái:</span>
                      <span className={
                        activeDetailDay.dbRecord.complainStatus === "PENDING" ? "text-yellow-500 animate-pulse" :
                        activeDetailDay.dbRecord.complainStatus === "RESOLVED" ? "text-green-500" : "text-red-500"
                      }>
                        {activeDetailDay.dbRecord.complainStatus === "PENDING" ? "ĐANG CHỜ" :
                         activeDetailDay.dbRecord.complainStatus === "RESOLVED" ? "ĐÃ DUYỆT" : "TỪ CHỐI"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 leading-relaxed">
                      <span className="font-bold text-gray-500 block uppercase mb-1">Nội dung khiếu nại:</span>
                      {activeDetailDay.dbRecord.complainText}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      placeholder="Nhập nội dung khiếu nại công (ví dụ: tôi có check-in nhưng hệ thống bị lỗi, hoặc xin đi làm muộn đã báo trước...)"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-gold transition-all h-24 resize-none"
                    />
                    <button
                      onClick={() => handleSubmitAppeal(activeDetailDay.dateKey)}
                      disabled={submittingAppeal || !appealReason.trim()}
                      className="w-full h-11 bg-gold hover:bg-gold-hover text-sidebar font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingAppeal ? <Loader2 size={14} className="animate-spin" /> : "Gửi khiếu nại công"}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => { setActiveDetailDay(null); setAppealReason(""); }}
                className="h-11 px-6 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}

      </div>
    </div>
  );
}
