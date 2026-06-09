"use client";

import React, { useState, useMemo, useEffect, useCallback } from"react";
import { motion, AnimatePresence } from"framer-motion";
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
} from"lucide-react";

import { MailData, StaffData, TaskAssignment } from"@/types/admin";

import { useRouter } from"next/navigation";
import {
 validateYouTubeUrl,
 fetchChannelName,
 cleanYouTubeUrl
} from"@/components/admin/youtubeUtils";

import MailDetailModal from "@/components/admin/MailDetailModal";
import { Badge } from "@/components/ui/Badge";

const TaskCard = React.memo(({ task, onClick }: { task: TaskAssignment, onClick: () => void }) => {
 const statusConfig: Record<string, { icon: React.ReactNode, variant: "default" | "success" | "warning" | "danger" | "info" | "gold", label: string }> = {
 PENDING: { icon: <Clock size={16} />, variant: "warning", label: "Äang chá»" },
 IN_PROGRESS: { icon: <Loader2 size={16} className="animate-spin" />, variant: "info", label: "Äang thá»±c hiá»‡n" },
 COMPLETED: { icon: <CheckCircle2 size={16} />, variant: "success", label: "HoÃ n thÃ nh" },
 OVERDUE: { icon: <AlertCircle size={16} />, variant: "danger", label: "Trá»… háº¡n" },
 };

 const typeLabel = task.type ==="MAIL_VE_TINH" ?"Vá»‡ tinh" : task.type ==="MAIL_MONETIZED" ?"Kiáº¿m tiá»n" :"Gá»‘c";

 return (
 <motion.div
 onClick={onClick}
 className="group relative bg-white/0 border border-white/0 rounded-[32px] p-6 cursor-pointer transition-all hover:bg-gold/5 hover:border-white/0 flex flex-col h-full shadow-2xl overflow-hidden"
 >
 <div className="absolute top-0 right-0 h-32 w-32 bg-gold/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-gold/10 transition-colors" />
 <div className="flex items-center justify-between mb-6 relative z-10">
 <Badge variant={statusConfig[task.status].variant}>
 {statusConfig[task.status].icon} {statusConfig[task.status].label}
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
 <span>Tiáº¿n Ä‘á»™ hoÃ n thÃ nh</span>
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

TaskCard.displayName ="TaskCard";

import { MailSelectorModal } from "@/components/admin/modals/MailSelectorModal";

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
 const [adminTab, setAdminTab] = useState<"ASSIGN" |"TASKS">("ASSIGN");
 const [selectedTemplate, setSelectedTemplate] = useState<string>("Check, xÃ³a, táº¡o");
 const [targetStaffId, setTargetStaffId] = useState<string>("");
 const [mailTypeSelection, setMailTypeSelection] = useState<"ROOT" |"SATELLITE" |"MONETIZED">("ROOT");
 const [mailRangeStart, setMailRangeStart] = useState<number>(1);
 const [mailRangeEnd, setMailRangeEnd] = useState<number>(10);
 const [assignmentNote, setAssignmentNote] = useState<string>("HÃ£y kiá»ƒm tra tÃ­nh há»£p lá»‡ cá»§a pass, 2FA, sÄ‘t vÃ  check xÃ³a táº¡o má»›i.");

 const [selectedLo, setSelectedLo] = useState<string>("LÃ´ 1");
 const [monetizedOption, setMonetizedOption] = useState<string>("KhÃ¡ng kÃªnh");
 const [selectedRootMailId, setSelectedRootMailId] = useState<string>("");
 const [selectedMoiKenhLo, setSelectedMoiKenhLo] = useState<string>("LÃ´ 1");

 // Custom selector state for"Check, xÃ³a, táº¡o"
 const [isSelectMailModalOpen, setIsSelectMailModalOpen] = useState<boolean>(false);
 const [selectedMailIdsForTask, setSelectedMailIdsForTask] = useState<number[]>([]);
 const [modalSearchQuery, setModalSearchQuery] = useState<string>("");

 // Filter States
 const [searchQuery, setSearchQuery] = useState("");
 const [roleFilter, setRoleFilter] = useState("ALL");
 const [staffSearch, setStaffSearch] = useState("");
 const [staffOnlineFilter, setStaffOnlineFilter] = useState("ALL");

 // Pagination State
 const [currentPage, setCurrentPage] = useState(1);
 const itemsPerPage = 10;
 const [taskPage, setTaskPage] = useState(1);
 const tasksPerPage = 8;

 const loadData = useCallback(async () => {
 try {
 const taskRes = await fetch("/api/admin/tasks");
 if (taskRes.ok) {
 const taskData = await taskRes.json();
 if (taskData.success) {
 const apiTasks = taskData.data.map((t: any) => ({
 ...t,
 id: t._id,
 assigneeId: t.assigneeId?._id || t.assigneeId,
 assigneeName: t.assigneeId?.name || t.assigneeName
 }));
 setTasks(apiTasks);
 }
 }
 
 const userRes = await fetch("/api/admin/users");
 if (userRes.ok) {
 const userData = await userRes.json();
 if (userData.success) {
 setStaffList(userData.data.filter((u: any) => u.status ==="ACTIVE" && u.role !=="01"));
 }
 }

  const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const roleUpper = String(currentUser?.role || "").toUpperCase();
  const isAuthorized = roleUpper === "01" || roleUpper === "ADMIN" || roleUpper === "02" || roleUpper === "QL CÃ”NG VIá»†C" || roleUpper === "QUáº¢N LÃ CÃ”NG VIá»†C";

  if (isAuthorized) {
    const mailRes = await fetch("/api/admin/mails");
    if (mailRes.ok) {
      const mailData = await mailRes.json();
      if (mailData.success) {
        setMails(mailData.data);
      }
    }
  }
 } catch (err) {
 console.error("Error fetching data:", err);
 }
 }, []);

 useEffect(() => {
 const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
 if (storedUser) setUser(JSON.parse(storedUser));

 loadData();
 const interval = setInterval(loadData, 30000);
 
 const handleStorage = (e: StorageEvent) => {
 if (e.key ==="global_tasks_data" || e.key ==="global_mails_data" || e.key ==="global_users") {
 loadData();
 }
 };
 window.addEventListener("storage", handleStorage);

 // Toast listener to simulate real-time notification
 const handleToastNotification = (e: StorageEvent) => {
 if (e.key ==="realtime_toast" && e.newValue) {
 try {
 const toastData = JSON.parse(e.newValue);
 const currentUserStr = sessionStorage.getItem("user") || localStorage.getItem("user");
 if (currentUserStr) {
 const currentUser = JSON.parse(currentUserStr);
 if (String(toastData.userId) === String(currentUser.id)) {
 setNotification(toastData.message);
 setTimeout(() => setNotification(null), 4000);
 
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

 const roleUpper = String(user?.role ||"").toUpperCase();
 const isAdminOrManager = roleUpper ==="01" || 
 roleUpper ==="ADMIN" || 
 roleUpper ==="02" || 
 roleUpper ==="QL CÃ”NG VIá»†C" || 
 roleUpper ==="QUáº¢N LÃ CÃ”NG VIá»†C";

 const inventory = useMemo(() => {
 return {
 root: (mails || []).filter((m: any) => m.type ==="ROOT" && !m.assigneeId).length,
 satellite: (mails || []).filter((m: any) => m.type ==="SATELLITE" && !m.assigneeId).length,
 monetized: (mails || []).filter((m: any) => m.type ==="MONETIZED" && !m.assigneeId).length,
 };
 }, [mails]);

 const typeMaxTotal = useMemo(() => {
 return (mails || []).filter((m: any) => m.type === mailTypeSelection).length;
 }, [mails, mailTypeSelection]);

 const selectTemplateAndPreset = (title: string) => {
 setSelectedTemplate(title);
 if (title ==="Check, xÃ³a, táº¡o") {
 setMailTypeSelection("ROOT");
 setMailRangeStart(1);
 setMailRangeEnd(10);
 setAssignmentNote("HÃ£y kiá»ƒm tra tÃ­nh há»£p lá»‡ cá»§a pass, 2FA, sÄ‘t vÃ  check xÃ³a táº¡o má»›i.");
 } else if (title ==="LÃ m kÃªnh") {
 setMailTypeSelection("SATELLITE");
 setAssignmentNote("HÃ£y liÃªn káº¿t kÃªnh YouTube vá»‡ tinh vÃ  cáº­p nháº­t link/tÃªn kÃªnh.");
 } else if (title ==="KÃªnh báº­t kiáº¿m tiá»n") {
 setMailTypeSelection("MONETIZED");
 setMailRangeStart(1);
 setMailRangeEnd(10);
 setAssignmentNote("Kiá»ƒm tra vÃ  cáº¥u hÃ¬nh liÃªn káº¿t tÃ i khoáº£n mail báº­t kiáº¿m tiá»n.");
 } else if (title ==="Má»i kÃªnh") {
 setMailTypeSelection("SATELLITE");
 setAssignmentNote("Má»i kÃªnh: GhÃ©p cáº·p mail gá»‘c vá»›i LÃ´ vá»‡ tinh.");
 }
 };

  const dynamicStaffBatches = useMemo(() => {
    // We want to list all SATELLITE lots that have NOT been assigned to any employee (i.e. assigneeId is empty or isAssigned: false)
    const allSatellites = (mails || []).filter((m: any) => m.type === "SATELLITE");
    const unassignedSatellites = (allSatellites || []).filter(
      (m: any) => !m.assigneeId || m.assigneeId.trim() === ""
    );
    
    // Extract unique batchNames from these unassigned satellite mails
    const batchNames = Array.from(new Set((unassignedSatellites || []).map((m: any) => m.batchName).filter(Boolean))) as string[];
    
    // For each batch name, find the range in allSatellites
    return (batchNames || []).map(bName => {
      // Check if this batch is already assigned as a task
      const isAlreadyTask = tasks.some(
        (t: any) => t.type === "MAIL_VE_TINH" && t.mailRange && t.mailRange.startsWith(bName)
      );
      if (isAlreadyTask) return null;

      const batchMails = (unassignedSatellites || []).filter((m: any) => m.batchName === bName);
      if ((batchMails || []).length === 0) return null;
      
      const hasChuaLam = batchMails.some((m: any) => m.workStatus === "ChÆ°a lÃ m");
      if (!hasChuaLam) return null;

      const firstIdx = allSatellites.findIndex((m: any) => m.id === batchMails[0].id) + 1;
      const lastIdx = allSatellites.findIndex((m: any) => m.id === batchMails[(batchMails || []).length - 1].id) + 1;
      return {
        name: bName,
        range: `${firstIdx}-${lastIdx}`,
        mailIds: (batchMails || []).map((m: any) => m.id)
      };
    }).filter(Boolean) as any[];
  }, [mails, tasks]);

  const targetStaffBatches = useMemo(() => {
    return (dynamicStaffBatches || []).map(b => b.name);
  }, [dynamicStaffBatches]);

  const satelliteBatches = useMemo(() => {
    const allSatellites = (mails || []).filter((m: any) => m.type === "SATELLITE");
    const batchNames = Array.from(new Set((allSatellites || []).map((m: any) => m.batchName).filter(Boolean))) as string[];
    
    return (batchNames || []).map(bName => {
      const batchMails = allSatellites.filter((m: any) => m.batchName === bName);
      if (batchMails.length === 0) return null;
      
      const assignedTo = batchMails[0]?.assigneeId || "";
      const firstIdx = allSatellites.findIndex((m: any) => m.id === batchMails[0].id) + 1;
      const lastIdx = allSatellites.findIndex((m: any) => m.id === batchMails[batchMails.length - 1].id) + 1;

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
    return (satelliteBatches || []).filter(batch => batch.assignedTo === selectedUserId);
  }, [satelliteBatches, selectedUserId]);

  useEffect(() => {
    if ((filteredBatches || []).length > 0) {
      setSelectedLo(filteredBatches[0].name);
    } else {
      setSelectedLo("");
    }
  }, [filteredBatches]);

 const eligibleStaff = useMemo(() => {
 if (!user) return [];
 const is01 = user?.role ==="01" || user?.role ==="ADMIN";
 const is02 = user?.role ==="02" || user?.role ==="QUáº¢N LÃ CÃ”NG VIá»†C";

 return (staffList || []).filter((s: StaffData) => {
 // 1. Online Filter
 if (staffOnlineFilter ==="ONLINE" && !s.isOnline) return false;
 if (staffOnlineFilter ==="OFFLINE" && s.isOnline) return false;

 // 2. Search Filter
 if (staffSearch) {
 const q = staffSearch.toLowerCase();
 const matches = s.name.toLowerCase().includes(q) || 
 s.username.toLowerCase().includes(q) ||
 (s.phone && s.phone.includes(q));
 if (!matches) return false;
 }

 // 3. Templates restriction rules
 if (selectedTemplate ==="Check, xÃ³a, táº¡o" || selectedTemplate ==="KÃªnh báº­t kiáº¿m tiá»n") {
 return s.role ==="02";
 }

 // 4. General role hierarchy restrictions
 if (is01) {
 return s.role ==="02" || s.role ==="03" || s.role ==="04" || s.role ==="05";
 }
 if (is02) {
 return s.role ==="03" || s.role ==="04" || s.role ==="05";
 }
 return false;
 });
 }, [staffList, user, selectedTemplate, staffSearch, staffOnlineFilter]);

 const filteredStaff = useMemo(() => {
 return (staffList || []).filter(staff => {
 const matchesSearch =
 staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 staff.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (staff.phone && staff.phone.includes(searchQuery));

 const matchesRole = roleFilter ==="ALL" || staff.role === roleFilter;

 return matchesSearch && matchesRole;
 });
 }, [staffList, searchQuery, roleFilter]);

 // Reset page when filtering
 useEffect(() => {
 setCurrentPage(1);
 }, [searchQuery, roleFilter]);

 const totalPages = Math.ceil((filteredStaff || []).length / itemsPerPage);
 const paginatedStaff = useMemo(() => {
 const start = (currentPage - 1) * itemsPerPage;
 return filteredStaff.slice(start, start + itemsPerPage);
 }, [filteredStaff, currentPage]);

 const userTasks = useMemo(() => {
 if (isAdminOrManager) {
 if (adminTab ==="TASKS") {
 const todayStr = new Date().toISOString().slice(0, 10);
 return (tasks || []).filter(t => t.assignedAt && t.assignedAt.startsWith(todayStr));
 }
 return tasks;
 }
 return (tasks || []).filter(t => String(t.assigneeId) === String(user?.id));
 }, [tasks, user, isAdminOrManager, adminTab]);

  const filteredTasks = useMemo(() => {
    let result = userTasks;
    if (taskFilter !== "ALL") result = (result || []).filter(t => t.status === taskFilter);
    return result;
  }, [taskFilter, userTasks]);

  const paginatedTasks = useMemo(() => {
    const start = (taskPage - 1) * tasksPerPage;
    return (filteredTasks || []).slice(start, start + tasksPerPage);
  }, [filteredTasks, taskPage, tasksPerPage]);

  const totalTaskPages = useMemo(() => {
    return Math.ceil((filteredTasks || []).length / tasksPerPage) || 1;
  }, [filteredTasks, tasksPerPage]);

  useEffect(() => {
    setTaskPage(1);
  }, [taskFilter]);

 const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId), [selectedTaskId, tasks]);

 const taskMails = useMemo(() => {
 if (!selectedTask) return [];
 
 let mailType ="ROOT";
 if (selectedTask.type ==="MAIL_VE_TINH") mailType ="SATELLITE";
 if (selectedTask.type ==="MAIL_MONETIZED") mailType ="MONETIZED";

 if (selectedTask.selectedMailIds && Array.isArray(selectedTask.selectedMailIds)) {
 return (mails || []).filter(m => selectedTask.selectedMailIds?.includes(m.id));
 }

 let filtered = (mails || []).filter(m => m.type === mailType && String(m.assigneeId) === String(selectedTask.assigneeId));

 if (selectedTask.title ==="Check, xÃ³a, táº¡o" || selectedTask.title ==="KÃªnh báº­t kiáº¿m tiá»n") {
 if (selectedTask.mailRange) {
 const parts = selectedTask.mailRange.split("-");
 if ((parts || []).length === 2) {
 const start = parseInt(parts[0].trim());
 const end = parseInt(parts[1].trim());
 const withSTT = (mails || []).filter(m => m.type === mailType).map((m, idx) => ({ ...m, currentSTT: idx + 1 }));
 const idsInRange = (withSTT || []).filter(m => m.currentSTT >= start && m.currentSTT <= end).map(m => m.id);
 filtered = (filtered || []).filter(m => idsInRange.includes(m.id));
 }
 }
 } else if (selectedTask.title ==="LÃ m kÃªnh") {
 if (selectedTask.mailRange) {
 const cleanBatch = (selectedTask as any).batch || selectedTask.mailRange.split(" (")[0];
 filtered = (filtered || []).filter(m => m.batchName === cleanBatch);
 }
 } else if (selectedTask.title ==="Má»i kÃªnh" && selectedTask.mailRange) {
 const parts = selectedTask.mailRange.split("+");
 const loPart = parts.pop()?.trim();
 filtered = (mails || []).filter(m => 
 (m.type ==="SATELLITE" && m.batchName === loPart && String(m.assigneeId) === String(selectedTask.assigneeId)) ||
 (m.type ==="ROOT" && selectedTask.note && selectedTask.note.includes(m.email))
 );
 }

 if (user?.role ==="04" || user?.role ==="05") {
 filtered = (filtered || []).filter(m => String(m.assigneeId) === String(user.id));
 }

 return filtered;
 }, [mails, selectedTask, user]);

 const handleSaveUnifiedDetails = useCallback((mailId: number, updatedFields: any) => {
 const savedMails = null;
 let allMails = savedMails ? JSON.parse(savedMails) : [];

 allMails = (allMails || []).map((m: any) => {
 if (m.id === mailId) {
 return { ...m, ...updatedFields };
 }
 return m;
 });

 
 setMails(allMails);

 if (selectedTask) {
 let mailType ="ROOT";
 if (selectedTask.type ==="MAIL_VE_TINH") mailType ="SATELLITE";
 if (selectedTask.type ==="MAIL_MONETIZED") mailType ="MONETIZED";

 let filtered = (allMails || []).filter((m: any) => m.type === mailType && String(m.assigneeId) === String(selectedTask.assigneeId));
 if (selectedTask.selectedMailIds && Array.isArray(selectedTask.selectedMailIds)) {
 filtered = (allMails || []).filter((m: any) => selectedTask.selectedMailIds?.includes(m.id));
 } else if (selectedTask.title ==="Check, xÃ³a, táº¡o" || selectedTask.title ==="KÃªnh báº­t kiáº¿m tiá»n") {
 if (selectedTask.mailRange) {
 const parts = selectedTask.mailRange.split("-");
 if ((parts || []).length === 2) {
 const start = parseInt(parts[0].trim());
 const end = parseInt(parts[1].trim());
 const withSTT = (allMails || []).filter((m: any) => m.type === mailType).map((m: any, idx: number) => ({ ...m, currentSTT: idx + 1 }));
 const idsInRange = (withSTT || []).filter((m: any) => m.currentSTT >= start && m.currentSTT <= end).map((m: any) => m.id);
 filtered = (filtered || []).filter((m: any) => idsInRange.includes(m.id));
 }
 }
 } else if (selectedTask.title ==="LÃ m kÃªnh") {
 if (selectedTask.mailRange) {
 const cleanBatch = (selectedTask as any).batch || selectedTask.mailRange.split(" (")[0];
 filtered = (filtered || []).filter((m: any) => m.batchName === cleanBatch);
 }
 } else if (selectedTask.title ==="Má»i kÃªnh" && selectedTask.mailRange) {
 const parts = selectedTask.mailRange.split("+");
 const loPart = parts.pop()?.trim();
 filtered = (allMails || []).filter((m: any) => 
 (m.type ==="SATELLITE" && m.batchName === loPart && String(m.assigneeId) === String(selectedTask.assigneeId)) ||
 (m.type ==="ROOT" && selectedTask.note && selectedTask.note.includes(m.email))
 );
 }

 const totalTaskMails = (filtered || []).length;
 if (totalTaskMails > 0) {
 const completedCount = (filtered || []).filter((m: any) => m.workStatus ==="ÄÃ£ lÃ m" || m.workStatus ==="ÄÃ£ bÃ¡n").length;
 const progressPercent = Math.round((completedCount / totalTaskMails) * 100);

 const savedTasks = null;
 let allTasks = savedTasks ? JSON.parse(savedTasks) : [];

 allTasks = (allTasks || []).map((t: any) => {
 if (t.id === selectedTask.id) {
 return { 
 ...t, 
 progress: progressPercent,
 status: progressPercent === 100 ?"COMPLETED" : (progressPercent > 0 ?"IN_PROGRESS" :"PENDING")
 };
 }
 return t;
 });

 
 setTasks(allTasks);
 }
 }

setNotification("ÄÃ£ cáº­p nháº­t chi tiáº¿t mail thÃ nh cÃ´ng.");
 setTimeout(() => setNotification(null), 3000);
 window.dispatchEvent(new Event("storage"));
 }, [selectedTask]);

  const handleCustomAssignmentSubmit = useCallback(() => {
    if (!targetStaffId) {
      alert("Vui lÃ²ng chá»n nhÃ¢n viÃªn nháº­n viá»‡c.");
      return;
    }

    const selectedStaff = staffList.find(s => String(s.id) === String(targetStaffId));
    if (!selectedStaff) return;

    let allMails = [...mails];

    let assignedIds: number[] = [];
    let note = assignmentNote;
    let mailCount = 0;
    let typeLabel = "ROOT";
    let taskType: "MAIL_GOC" | "MAIL_VE_TINH" | "MAIL_MONETIZED" = "MAIL_GOC";
    let mailRangeStr = "";

    if (selectedTemplate === "Check, xÃ³a, táº¡o") {
      typeLabel = "ROOT";
      taskType = "MAIL_GOC";
      if ((selectedMailIdsForTask || []).length === 0) {
        alert("Vui lÃ²ng click chá»n Ã­t nháº¥t 1 mail gá»‘c kháº£ dá»¥ng trong popup trÆ°á»›c!");
        return;
      }
      assignedIds = [...selectedMailIdsForTask];
      mailCount = (assignedIds || []).length;
      
      const mailsOfType = (allMails || []).filter((m: any) => m.type === "ROOT");
      const indices = (assignedIds || []).map(id => mailsOfType.findIndex((m: any) => m.id === id) + 1).filter(idx => idx > 0).sort((a, b) => a - b);
      if ((indices || []).length > 0) {
        mailRangeStr = `${indices[0]}-${indices[(indices || []).length - 1]}`;
      } else {
        mailRangeStr = `${mailCount} mail`;
      }
    } 
    else if (selectedTemplate === "LÃ m kÃªnh") {
      typeLabel = "SATELLITE";
      taskType = "MAIL_VE_TINH";
      
      const allSatellites = (allMails || []).filter((m: any) => m.type === "SATELLITE");
      const batchMails = allSatellites.filter((m: any) => m.batchName === selectedLo);
      if (batchMails.length === 0) {
        alert(`LÃ´ ${selectedLo} khÃ´ng há»£p lá»‡ hoáº·c khÃ´ng tÃ¬m tháº¥y mail vá»‡ tinh nÃ o.`);
        return;
      }
      
      const firstIdx = allSatellites.findIndex((m: any) => m.id === batchMails[0].id) + 1;
      const lastIdx = allSatellites.findIndex((m: any) => m.id === batchMails[batchMails.length - 1].id) + 1;
      const batchRange = `${firstIdx}-${lastIdx}`;
      
      assignedIds = batchMails.map((m: any) => m.id);
      mailCount = assignedIds.length;
      mailRangeStr = `${selectedLo} (STT ${batchRange})`;
      note = `${note} - LÃ´ gÃ¡n: ${selectedLo} (STT ${batchRange})`;
    } 
    else if (selectedTemplate === "KÃªnh báº­t kiáº¿m tiá»n") {
      typeLabel = "MONETIZED";
      taskType = "MAIL_MONETIZED";
      const mailsOfType = (allMails || []).filter((m: any) => m.type === "MONETIZED");
      const mailsWithSTT = (mailsOfType || []).map((m: any, idx: number) => ({ ...m, currentSTT: idx + 1 }));
      assignedIds = mailsWithSTT
        .filter((m: any) => m.currentSTT >= mailRangeStart && m.currentSTT <= mailRangeEnd && !m.assigneeId)
        .map((m: any) => m.id);

      if ((assignedIds || []).length === 0) {
        alert("KhÃ´ng tÃ¬m tháº¥y mail báº­t kiáº¿m tiá»n kháº£ dá»¥ng trong dáº£i STT nÃ y.");
        return;
      }
      mailCount = (assignedIds || []).length;
      mailRangeStr = `${mailRangeStart} - ${mailRangeEnd}`;

      const is01 = user?.role === "01";
      const is02Assignee = selectedStaff.role === "02";
      if (is01 && is02Assignee) {
        note = `${note} (PhÆ°Æ¡ng thá»©c: ${monetizedOption})`;
      }
    } 
    else if (selectedTemplate === "Má»i kÃªnh") {
      typeLabel = "SATELLITE";
      taskType = "MAIL_VE_TINH";
      
      if (!selectedRootMailId) {
        alert("Vui lÃ²ng chá»n Mail gá»‘c Ä‘á»ƒ ghÃ©p cáº·p.");
        return;
      }

      const rootMail = allMails.find((m: any) => String(m.id) === String(selectedRootMailId));
      if (!rootMail) return;

      const targetMails = (allMails || []).filter((m: any) => 
        m.type === "SATELLITE" && 
        (String(m.assigneeId) === String(targetStaffId) || !m.assigneeId || m.assigneeId.trim() === "") && 
        m.batchName === selectedMoiKenhLo
      );

      if ((targetMails || []).length === 0) {
        alert(`KhÃ´ng tÃ¬m tháº¥y mail vá»‡ tinh thuá»™c ${selectedMoiKenhLo} cá»§a nhÃ¢n sá»± nÃ y.`);
        return;
      }

      assignedIds = [rootMail.id, ...(targetMails || []).map((m: any) => m.id)];
      mailCount = (assignedIds || []).length;
      mailRangeStr = `GhÃ©p cáº·p: Mail gá»‘c (${rootMail.email}) + ${selectedMoiKenhLo}`;
      note = `${note} (GhÃ©p cáº·p Mail Gá»‘c: ${rootMail.email} vá»›i ${selectedMoiKenhLo} vá»‡ tinh)`;
    }

    allMails = (allMails || []).map((m: any) => {
      if (assignedIds.includes(m.id)) {
        return {
          ...m,
          assigneeId: selectedStaff.id,
          assigneeName: selectedStaff.name,
          assignedAt: new Date().toISOString(),
          assignmentNote: note,
          workStatus: m.type === "ROOT" ? "Äang xá»­ lÃ­" : (m.type === "MONETIZED" ? "ChÆ°a bÃ¡n" : "ChÆ°a lÃ m")
        };
      }
      return m;
    });

    const savedTasks = null;
    let allTasks = savedTasks ? JSON.parse(savedTasks) : [];

    let rangeVal = mailRangeStr;
    if (selectedTemplate === "LÃ m kÃªnh") {
      const allSatellites = (allMails || []).filter((m: any) => m.type === "SATELLITE");
      const batchMails = allSatellites.filter((m: any) => m.batchName === selectedLo);
      if (batchMails.length > 0) {
        const firstIdx = allSatellites.findIndex((m: any) => m.id === batchMails[0].id) + 1;
        const lastIdx = allSatellites.findIndex((m: any) => m.id === batchMails[batchMails.length - 1].id) + 1;
        rangeVal = `${firstIdx}-${lastIdx}`;
      }
    }

    const newTask: any = {
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
      batch: selectedTemplate === "LÃ m kÃªnh" ? selectedLo : "",
      range: rangeVal,
      mailType: typeLabel as any,
      selectedMailIds: selectedTemplate === "Check, xÃ³a, táº¡o" ? assignedIds : undefined
    };

    allTasks.push(newTask);
    
    setTasks(allTasks);
    setSelectedMailIdsForTask([]);

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
                workStatus: typeLabel === "ROOT" ? "Äang xá»­ lÃ­" : (typeLabel === "MONETIZED" ? "ChÆ°a bÃ¡n" : "ChÆ°a lÃ m"),
                updatedBy: user?.name || "Admin"
              }
            })
          });
        } catch (dbErr) {
          console.error("Lá»—i Ä‘á»“ng bá»™ gÃ¡n mail xuá»‘ng DB:", dbErr);
        }

        setNotification(`ÄÃ£ giao viá»‡c thÃ nh cÃ´ng cho ${selectedStaff.name}!`);
        setTimeout(() => setNotification(null), 4000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setNotification(errData.error || "Giao viá»‡c tháº¥t báº¡i");
        setTimeout(() => setNotification(null), 4000);
      }
    })
    .catch(err => {
      console.error("Lá»—i giao viá»‡c:", err);
    });
    window.dispatchEvent(new Event('storage'));
  }, [targetStaffId, selectedTemplate, selectedLo, selectedMoiKenhLo, selectedRootMailId, monetizedOption, mailRangeStart, mailRangeEnd, assignmentNote, staffList, user, mails, dynamicStaffBatches]);

 const updateTaskStatus = useCallback((newStatus:"IN_PROGRESS" |"COMPLETED") => {
 if (!selectedTaskId || !selectedTask) return;

 if (newStatus ==="COMPLETED" && selectedTask?.type ==="MAIL_VE_TINH") {
 let errorMails: string[] = [];
 taskMails.forEach((m: any) => {
 const activeLinks = (m.links || []).filter((l: string) => typeof l === 'string' && l.trim() !=="");
 const linksCount = (activeLinks || []).length;
 
 if (linksCount < 3) {
 errorMails.push(`- ${m.email} (thiáº¿u ${3 - linksCount} kÃªnh)`);
 } else {
 const hasInvalid = activeLinks.some((l: string) => !validateYouTubeUrl(l));
 if (hasInvalid) {
 errorMails.push(`- ${m.email} (cÃ³ link kÃªnh sai Ä‘á»‹nh dáº¡ng YouTube)`);
 }
 }
 });

 if ((errorMails || []).length > 0) {
 alert("KHÃ”NG THá»‚ HOÃ€N THÃ€NH!\nCÃ¡c mail vá»‡ tinh sau chÆ°a Ä‘Ãºng yÃªu cáº§u:\n" + errorMails.join("\n"));
 return;
 }
 }

 const savedTasks = null;
 let allTasks = savedTasks ? JSON.parse(savedTasks) : [];

 allTasks = (allTasks || []).map((t: any) => {
 if (t.id === selectedTaskId) {
 return {
 ...t,
 status: newStatus,
 progress: newStatus ==="COMPLETED" ? 100 : (t.progress === 100 ? 50 : t.progress)
 };
 }
 return t;
 });

 
 setTasks(allTasks);
 setNotification(`ÄÃ£ chuyá»ƒn tráº¡ng thÃ¡i nhiá»‡m vá»¥ sang: ${newStatus ==="COMPLETED" ?"HoÃ n thÃ nh" :"Äang xá»­ lÃ½"}`);
 setTimeout(() => setNotification(null), 3000);
 window.dispatchEvent(new Event("storage"));
 }, [selectedTaskId, selectedTask, taskMails]);

 return (
 <div className="h-[calc(100vh-100px)] flex flex-col gap-4 select-none relative overflow-hidden">
 <AnimatePresence>
 {notification && (
 <motion.div initial={{ opacity: 0, y: -50, x:"-50%" }} animate={{ opacity: 1, y: 30, x:"-50%" }} exit={{ opacity: 0, y: -50, x:"-50%" }} className="fixed top-0 left-1/2 z-[500] bg-gold text-sidebar px-8 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 font-black text-base uppercase tracking-widest border border-white/5">
 <CheckCircle2 size={24} className="animate-bounce" />{notification}
 </motion.div>
 )}
 </AnimatePresence>

 {/* Header Section */}
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
 {isAdminOrManager && !selectedTaskId ?"Báº£ng chia viá»‡c AQ MEDIA" : selectedTaskId ?"Chi tiáº¿t thá»±c hiá»‡n" :"Nhiá»‡m vá»¥ cá»§a tÃ´i"}
 </h1>
 <p className="text-gray-500 font-medium mt-1 flex items-center gap-2">
 <ShieldCheck size={16} className="text-gold" />
 {isAdminOrManager && !selectedTaskId ?"Há»‡ thá»‘ng Ä‘iá»u phá»‘i cÃ´ng viá»‡c vÃ  chia lÃ´ mail tá»± Ä‘á»™ng cho nhÃ¢n sá»±." : selectedTaskId ? `Nhiá»‡m vá»¥: ${selectedTask?.title}` :"Danh sÃ¡ch nhiá»‡m vá»¥ Ä‘Æ°á»£c giao."}
 </p>
 </div>
 </div>
 {isAdminOrManager && !selectedTaskId && (
 <div className="flex bg-white/5 rounded-2xl p-1 border border-white/0">
 <button 
 onClick={() => setAdminTab("ASSIGN")}
 className={`px-4 py-2 rounded-xl text-sm font-black uppercase transition-all ${adminTab ==="ASSIGN" ?"bg-gold text-sidebar shadow-lg" :" text-gray-400 hover:text-white"}`}
 >
 Giao viá»‡c
 </button>
 <button 
 onClick={() => setAdminTab("TASKS")}
 className={`px-4 py-2 rounded-xl text-sm font-black uppercase transition-all ${adminTab ==="TASKS" ?"bg-gold text-sidebar shadow-lg" :" text-gray-400 hover:text-white"}`}
 >
 Task hÃ´m nay
 </button>
 </div>
 )}
 </div>

 {/* Main Content Area */}
 <div className="flex-1 flex flex-col overflow-hidden mt-4">
 <AnimatePresence mode="wait">
 {!selectedTaskId ? (
 isAdminOrManager && adminTab ==="ASSIGN" ? (
 // Admin/Manager view: Template cards + Assignment form
 <motion.div key="admin-delegation" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto pr-2 pb-10">
 {/* Left side: 4 Task Templates Cards */}
 <div className="lg:col-span-5 space-y-6">
 <div className="flex items-center gap-3 mb-2">
 <div className="h-2 w-2 rounded-full bg-gold animate-ping" />
 <h2 className="text-base font-black text-white uppercase tracking-widest">Chá»n máº«u cÃ´ng viá»‡c</h2>
 </div>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {[
 { title:"Check, xÃ³a, táº¡o", desc:"Máº·c Ä‘á»‹nh Mail Gá»‘c. Kiá»ƒm tra pass, 2FA, sÄ‘t vÃ  check xÃ³a táº¡o má»›i.", type:"ROOT", icon: <ShieldCheck size={28} /> },
 { title:"LÃ m kÃªnh", desc:"Máº·c Ä‘á»‹nh Mail Vá»‡ Tinh. LiÃªn káº¿t kÃªnh vá»‡ tinh, scan thÃ´ng tin.", type:"SATELLITE", icon: <Zap size={28} /> },
 { title:"KÃªnh báº­t kiáº¿m tiá»n", desc:"Máº·c Ä‘á»‹nh Mail Báº­t Kiáº¿m Tiá»n. Kiá»ƒm tra vÃ  cáº¥u hÃ¬nh Ä‘á»‘i tÃ¡c.", type:"MONETIZED", icon: <Mail size={28} /> },
 { title:"Má»i kÃªnh", desc:"GhÃ©p cáº·p mail gá»‘c vá»›i LÃ´ vá»‡ tinh. Má»i kÃªnh vá»‡ tinh vÃ o quáº£n lÃ½.", type:"SATELLITE + ROOT", icon: <ExternalLink size={28} /> },
 ].map(tmpl => (
 <div 
 key={tmpl.title}
 onClick={() => selectTemplateAndPreset(tmpl.title)}
 className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all flex flex-col h-full justify-between relative overflow-hidden group ${selectedTemplate === tmpl.title ?"bg-gold/10 border-gold shadow-[0_0_40px_rgba(212,175,55,0.15)]" :" bg-white/5 border-white/0 hover:border-gray-300 hover:border-white/0"}`}
 >
 <div className="absolute top-0 right-0 h-24 w-24 bg-gold/5 blur-[30px] -mr-12 -mt-12 group-hover:bg-gold/10 transition-all" />
 <div>
 <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border mb-4 transition-all ${selectedTemplate === tmpl.title ?"bg-gold/20 text-gold border-white/0" :" bg-white/5 text-gray-500 border-white/0"}`}>
 {tmpl.icon}
 </div>
 <h3 className="text-base font-black text-white uppercase tracking-tight mb-2">{tmpl.title}</h3>
 <p className="text-[10px] text-gray-500 leading-relaxed">{tmpl.desc}</p>
 </div>
 <div className="mt-4 flex items-center justify-between pt-4 border-t border-white/0">
 <span className="text-[9px] font-black text-gold uppercase tracking-wider">{tmpl.type}</span>
 <span className="text-[8px] font-bold uppercase">Dá»± kiáº¿n 3 ngÃ y</span>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Right side: Interactive Assignment Form */}
 <div className="lg:col-span-7 bg-[#0b0b0b] border border-white/0 rounded-[48px] p-8 md:p-10 relative overflow-hidden flex flex-col justify-between">
 <div className="absolute top-0 right-0 h-96 w-96 bg-gold/5 blur-[120px] -mr-48 -mt-48" />
 
 <div className="space-y-6 relative z-10">
 <div className="flex items-center gap-4 border-b border-white/0 pb-4">
 <div className="h-10 w-10 bg-gold/15 text-gold border border-gold/20 rounded-xl flex items-center justify-center">
 <Users size={20} />
 </div>
 <div>
 <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">Cáº¥u hÃ¬nh Giao viá»‡c</h3>
 <p className="text-[9px] font-bold text-gray-500 uppercase mt-1 tracking-widest">Giao máº«u: <span className="text-gold">{selectedTemplate}</span></p>
 </div>
 </div>

 <div className="grid grid-cols-5 gap-1 p-6 bg-white/0 border border-white/0 rounded-3xl items-center text-center">
 <div className="col-span-1">
 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Mail Gá»‘c</p>
 <p className="text-base font-black text-gold">{inventory.root} <span className="text-[8px] text-gray-500 font-bold block">Kháº£ dá»¥ng</span></p>
 </div>
 <div className="col-span-1 flex justify-center text-white/5 font-light">|</div>
 <div className="col-span-1">
 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Vá»‡ Tinh</p>
 <p className="text-base font-black text-gold">{inventory.satellite} <span className="text-[8px] text-gray-500 font-bold block">Kháº£ dá»¥ng</span></p>
 </div>
 <div className="col-span-1 flex justify-center text-white/5 font-light">|</div>
 <div className="col-span-1">
 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Kiáº¿m Tiá»n</p>
 <p className="text-base font-black text-gold">{inventory.monetized} <span className="text-[8px] text-gray-500 font-bold block">Kháº£ dá»¥ng</span></p>
 </div>
 </div>

           <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">TÃƒÂ¬m nhÃƒÂ¢n viÃƒÂªn</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder="TÃƒÂªn nhÃƒÂ¢n viÃƒÂªn..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl pl-12 pr-6 text-white text-base outline-none focus:border-white/5 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">LÃ¡Â»dc trÃ¡ÂºÂ¡ng thÃƒÂ¡i</label>
              <select
                value={staffOnlineFilter}
                onChange={(e) => setStaffOnlineFilter(e.target.value)}
                className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 cursor-pointer transition-all"
              >
                <option value="ALL" className="bg-zinc-900">TÃ¡ÂºÂ¥t cÃ¡ÂºÂ£</option>
                <option value="ONLINE" className="bg-zinc-900">Ã„Â»ang Online</option>
                <option value="OFFLINE" className="bg-zinc-900">NgoÃ¡ÂºÂ¡i tuyÃ¡ÂºÂ¿n</option>
              </select>
            </div>
          </div>
<div className="space-y-2">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chá»n nhÃ¢n viÃªn thá»±c hiá»‡n</label>
 <select 
 value={targetStaffId}
 onChange={(e) => setTargetStaffId(e.target.value)}
 className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 cursor-pointer transition-all"
 >
 <option value="" className="bg-zinc-900 text-white hover:bg-zinc-700">-- Chá»n nhÃ¢n sá»± ONLINE thá»±c hiá»‡n --</option>
 {(eligibleStaff || []).map((staff: any) => (
 <option key={staff.id} value={staff.id} className="bg-zinc-900 text-white hover:bg-zinc-700">
 ðŸŸ¢ {staff.name} ({staff.role ==="02" ?"Quáº£n lÃ½ cÃ´ng viá»‡c" : staff.role ==="03" ?"Quáº£n lÃ½ nhÃ¢n sá»±" :"NhÃ¢n viÃªn"})
 </option>
 ))}
 </select>
 </div>

 {selectedTemplate ==="Check, xÃ³a, táº¡o" && (
 <div className="space-y-4">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chá»n danh sÃ¡ch Mail Gá»‘c</label>
 <button
 type="button"
 onClick={() => {
 if (!targetStaffId) {
 alert("Vui lÃ²ng chá»n nhÃ¢n viÃªn nháº­n viá»‡c trÆ°á»›c!");
 return;
 }
 setIsSelectMailModalOpen(true);
 }}
 className="w-full h-14 bg-[#0a0a0a] hover:bg-gold/5 text-gold border border-gold/20 hover:border-white/5 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg"
 >
 <Mail size={16} />
 {(selectedMailIdsForTask || []).length > 0 
 ? `ÄÃ£ chá»n: ${(selectedMailIdsForTask || []).length} mail gá»‘c (Nháº¥n Ä‘á»ƒ thay Ä‘á»•i)` 
 :"Chá»n mail"}
 </button>
 </div>
 )}

 {selectedTemplate ==="LÃ m kÃªnh" && (
 <div className="space-y-4">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chá»n LÃ´ vá»‡ tinh giao</label>
 <select 
  value={selectedLo}
  onChange={(e) => setSelectedLo(e.target.value)}
  disabled={!selectedUserId}
  className={`w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 cursor-pointer transition-all ${!selectedUserId ? 'opacity-40 cursor-not-allowed' : ''}`}
  >
  <option value="" className="bg-zinc-900 text-white hover:bg-zinc-700">
    {!selectedUserId ? '-- Vui lÃ²ng chá»n nhÃ¢n viÃªn trÆ°á»›c --' : '-- Chá»n LÃ´ --'}
  </option>
  {(filteredBatches || []).map(batch => (
  <option key={batch.name} value={batch.name} className="bg-zinc-900 text-white hover:bg-zinc-700">
    {batch.name} (STT {batch.startIndex} - {batch.endIndex})
  </option>
  ))}
  </select>
 {targetStaffId && (dynamicStaffBatches || []).length === 0 && (
 <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mt-1">KhÃ´ng cÃ³ lÃ´ vá»‡ tinh chÆ°a gÃ¡n nÃ o kháº£ dá»¥ng trong há»‡ thá»‘ng!</p>
 )}
 {!targetStaffId && (
 <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mt-1">âš  HÃ£y chá»n nhÃ¢n viÃªn phÃ­a trÃªn trÆ°á»›c khi chá»n LÃ´ vá»‡ tinh.</p>
 )}
 </div>
 </div>
 )}

 {selectedTemplate ==="KÃªnh báº­t kiáº¿m tiá»n" && (
 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Báº¯t Ä‘áº§u tá»« STT</label>
 <input 
 type="number"
 value={mailRangeStart}
 onChange={(e) => setMailRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
 className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 transition-all"
 />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Äáº¿n STT (Tá»•ng {inventory.monetized})</label>
 <input 
 type="number"
 value={mailRangeEnd}
 onChange={(e) => setMailRangeEnd(Math.max(1, parseInt(e.target.value) || 1))}
 className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 transition-all"
 />
 </div>
 </div>
 
 {(() => {
 const selectedStaffObj = staffList.find(s => String(s.id) === String(targetStaffId));
 const is01 = user?.role ==="01";
 const is02Assignee = selectedStaffObj?.role ==="02";
 if (is01 && is02Assignee) {
 return (
 <div className="space-y-2">
 <label className="text-[10px] font-black text-gold uppercase tracking-widest ml-1">PhÆ°Æ¡ng thá»©c xá»­ lÃ½</label>
 <select 
 value={monetizedOption}
 onChange={(e) => setMonetizedOption(e.target.value)}
 className="w-full h-14 bg-gold/10 border-2 border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-gold cursor-pointer transition-all"
 >
 <option value="KhÃ¡ng kÃªnh" className="bg-zinc-900 text-white hover:bg-zinc-700">KhÃ¡ng kÃªnh</option>
 <option value="Ná»‘i GA" className="bg-zinc-900 text-white hover:bg-zinc-700">Ná»‘i GA</option>
 </select>
 </div>
 );
 }
 return null;
 })()}
 </div>
 )}

 {selectedTemplate ==="Má»i kÃªnh" && (
 <div className="space-y-6">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chá»n Mail Gá»‘c</label>
 <select 
 value={selectedRootMailId}
 onChange={(e) => setSelectedRootMailId(e.target.value)}
 className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 cursor-pointer transition-all"
 >
 <option value="" className="bg-zinc-900 text-white hover:bg-zinc-700">-- Chá»n Mail Gá»‘c trong DB --</option>
 {(mails || []).filter((m: any) => m.type ==="ROOT" && m.verificationStatus ==="ÄÃ£ xanh" && !m.assigneeId).map((m: any) => (
 <option key={m.id} value={m.id} className="bg-zinc-900 text-white hover:bg-zinc-700">
 {m.email}
 </option>
 ))}
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chá»n LÃ´ vá»‡ tinh ghÃ©p cáº·p</label>
 <select 
 value={selectedMoiKenhLo}
 onChange={(e) => setSelectedMoiKenhLo(e.target.value)}
 disabled={!targetStaffId}
 className={`w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 cursor-pointer transition-all ${!targetStaffId ? 'opacity-40 cursor-not-allowed' : ''}`}
 >
 <option value="" className="bg-zinc-900 text-white hover:bg-zinc-700">{!targetStaffId ? '-- Vui lÃ²ng chá»n nhÃ¢n viÃªn trÆ°á»›c --' : '-- Chá»n LÃ´ Vá»‡ Tinh --'}</option>
 {(filteredBatches || []).length > 0 ? (filteredBatches || []).map(b => (
 <option key={b.name} value={b.name} className="bg-zinc-900 text-white hover:bg-zinc-700">{b.name}</option>
 )) : (
 <option disabled className="bg-zinc-900 text-white hover:bg-zinc-700">KhÃ´ng cÃ³ lÃ´ vá»‡ tinh kháº£ dá»¥ng</option>
 )}
 </select>
 {!targetStaffId && (
 <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mt-1">âš  HÃ£y chá»n nhÃ¢n viÃªn phÃ­a trÃªn trÆ°á»›c khi chá»n LÃ´ vá»‡ tinh.</p>
 )}
 </div>
 </div>
 )}

 <div className="space-y-2">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ghi chÃº & YÃªu cáº§u cÃ´ng viá»‡c</label>
 <textarea
 value={assignmentNote}
 onChange={(e) => setAssignmentNote(e.target.value)}
 placeholder="Nháº­p ghi chÃº hoáº·c yÃªu cáº§u chi tiáº¿t cho nhÃ¢n viÃªn..."
 className="w-full h-24 bg-white/5 border border-white/0 rounded-2xl p-6 text-white text-base outline-none focus:border-white/5 transition-all resize-none"
 />
 </div>
 </div>

 <div className="mt-8 relative z-10 pt-4 border-t border-white/0">
 <button 
 onClick={handleCustomAssignmentSubmit}
 className="w-full h-14 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-gold/20"
 >
 <Zap size={16} /> Giao cÃ´ng viá»‡c & KÃ­ch hoáº¡t real-time
 </button>
 </div>
 </div>
 </motion.div>
 ) : (
 // Staff task listing
 <motion.div key="staff-grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 overflow-y-auto custom-scrollbar pr-2">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-10">
 {(filteredTasks || []).length > 0 ? (
 (filteredTasks || []).map(task => <TaskCard key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} />)
 ) : (
 <div className="col-span-full py-20 text-center text-gray-500 font-bold uppercase tracking-widest">KhÃ´ng cÃ³ nhiá»‡m vá»¥ Ä‘Æ°á»£c giao</div>
 )}
 </div>
 </motion.div>
 )
 ) : (
 // Task Mail Row Details
 <motion.div key="detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex-1 flex flex-col gap-6 overflow-hidden">
 <div className="bg-white/0 border border-white/0 rounded-[40px] p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shadow-2xl">
 <div className="flex flex-wrap items-center gap-6 md:gap-10">
 <div className="flex flex-col gap-1">
 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Loáº¡i nhiá»‡m vá»¥</span>
 <span className="text-base font-black text-gold uppercase">{selectedTask?.title}</span>
 </div>
 <div className="h-10 w-px bg-white/0 hidden md:block" />
 <div className="flex flex-col gap-1">
 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Chi tiáº¿t cÃ´ng viá»‡c</span>
 <span className="text-sm font-bold text-white max-w-md">{selectedTask?.note} ({selectedTask?.mailRange})</span>
 </div>
 <div className="h-10 w-px bg-white/0 hidden md:block" />
 <div className="flex flex-col gap-1">
 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sá»‘ lÆ°á»£ng</span>
 <span className="text-base font-black text-white">{selectedTask?.mailCount} Mail</span>
 </div>
 <div className="h-10 w-px bg-white/0 hidden md:block" />
 <div className="flex flex-col gap-1">
 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Tiáº¿n Ä‘á»™ tá»•ng</span>
 <span className="text-base font-black text-white">{selectedTask?.progress}% ({selectedTask?.status ==="COMPLETED" ?"HoÃ n thÃ nh" : selectedTask?.status ==="IN_PROGRESS" ?"Äang xá»­ lÃ½" :"Äang chá»"})</span>
 </div>
 </div>
 
 <div className="flex items-center gap-4 w-full md:w-auto justify-end">
 {!isAdminOrManager && (
 <>
 <button 
 onClick={() => updateTaskStatus("IN_PROGRESS")}
 className={`h-14 px-6 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest border transition-all ${selectedTask?.status ==="IN_PROGRESS" ?"bg-blue-500/20 text-blue-400 border-blue-500/30" :" bg-white/5 text-gray-400 border-white/0 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20"}`}
 >
 Äang xá»­ lÃ­
 </button>
 <button 
 onClick={() => updateTaskStatus("COMPLETED")}
 className={`h-14 px-6 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest border transition-all ${selectedTask?.status ==="COMPLETED" ?"bg-green-500/20 text-green-400 border-green-500/30" :" bg-white/5 text-gray-400 border-white/0 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20"}`}
 >
 HoÃ n thÃ nh
 </button>
 </>
 )}
 
 <button 
 onClick={() => { setSelectedTaskId(null); }} 
 className="h-14 px-6 bg-white/5 border border-white/0 rounded-2xl flex items-center justify-center text-white gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-gold/10 hover:text-gold transition-all"
 >
 Quay láº¡i
 </button>
 </div>
 </div>
 
 <div className="flex-1 bg-zinc-950/10 border border-white/0 rounded-[48px] flex flex-col overflow-hidden">
 <div className="flex-1 overflow-auto custom-scrollbar bg-black/10">
 <div className="w-full overflow-x-auto custom-scrollbar">
 <table className="w-full text-left min-w-[900px]">
 <thead className="sticky top-0 bg-[#0d0d0d] z-30 shadow-xl">
 <tr className="border-b border-white/0 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
 <th className="px-10 py-3 whitespace-nowrap">STT</th>
 <th className="px-6 py-3 whitespace-nowrap">Email / ThÃ´ng tin</th>
 <th className="px-6 py-3 text-center whitespace-nowrap">NgÆ°á»i thá»±c hiá»‡n</th>
 <th className="px-6 py-3 text-center whitespace-nowrap">Tráº¡ng thÃ¡i</th>
 <th className="px-10 py-3 text-right whitespace-nowrap">HÃ nh Ä‘á»™ng</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {(taskMails || []).length > 0 ? (
 (taskMails || []).map((mail, i) => {
 const rowPadding = !isAdminOrManager ?"py-1 px-6" :"py-2.5 px-6";
 const textSize = !isAdminOrManager ?"text-sm" :"text-base";
 return (
 <tr key={`mail-${mail.id}`} className="group hover:bg-zinc-800/50 bg-zinc-900/[0.02] transition-all">
 <td className={`${rowPadding} text-[10px] font-black whitespace-nowrap`}>{i + 1}</td>
 <td className={`${rowPadding} whitespace-nowrap`}>
 {mail.type ==="SATELLITE" && (() => {
 const linksCount = (mail.links || []).filter((l: string) => typeof l === 'string' && l.trim() !=="").length;
 const missingCount = 3 - linksCount;
 if (missingCount > 0) {
 return (
 <div className="mb-1">
 <span className="text-[10px] font-black uppercase text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-lg animate-pulse inline-flex items-center gap-1">
 âš ï¸ Thiáº¿u {missingCount} kÃªnh
 </span>
 </div>
 );
 }
 return null;
 })()}
 <p className={`${textSize} font-bold text-white transition-colors whitespace-nowrap`}>{mail.email}</p>
 <p className="text-[10px] font-bold uppercase whitespace-nowrap">{mail.recovery}</p>
 </td>
 <td className={`${rowPadding} text-center whitespace-nowrap`}>
 <span className="text-[10px] font-black text-white uppercase whitespace-nowrap">{mail.assigneeName ||"KhÃ´ng rÃµ"}</span>
 </td>
 <td className={`${rowPadding} text-center whitespace-nowrap`}>
 <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${
 (mail.workStatus ||"ChÆ°a lÃ m").toLowerCase() ==="Ä‘Ã£ lÃ m" || (mail.workStatus ||"ChÆ°a lÃ m").toLowerCase() ==="Ä‘Ã£ bÃ¡n"
 ?"bg-green-500/10 text-green-500 border-green-500/20" 
 : (mail.workStatus ||"ChÆ°a lÃ m").toLowerCase() ==="lá»—i" 
 ?"bg-red-500/10 text-red-500 border-red-500/20" 
 :"bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
 }`}>
 {mail.workStatus ||"ChÆ°a lÃ m"}
 </span>
 </td>
 <td className={`${rowPadding} text-right whitespace-nowrap`}>
 <button 
 onClick={() => { setSelectedMailForConfig(mail); }} 
 className="h-9 px-3 bg-gold/10 text-gold hover:bg-gold hover:text-sidebar rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/0 transition-all flex items-center gap-2 float-right whitespace-nowrap"
 >
 <Play size={12} /> Cáº¥u hÃ¬nh
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
 <p className="text-xl font-black uppercase tracking-[0.2em] text-white">ChÆ°a cÃ³ dá»¯ liá»‡u</p>
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
 onClose={() => setSelectedMailForConfig(null)} 
 onSave={(updatedFields) => handleSaveUnifiedDetails(selectedMailForConfig.id, updatedFields)}
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

