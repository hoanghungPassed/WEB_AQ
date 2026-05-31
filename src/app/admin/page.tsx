"use client";

import React, { useState, useEffect, useMemo } from"react";
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
 Heart,
 MessageSquare,
 Send,
 Image,
 LogOut
} from"lucide-react";


const getStableDateString = () => {
 const d = new Date();
 const year = d.getFullYear();
 const month = String(d.getMonth() + 1).padStart(2, '0');
 const day = String(d.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
};
import { StaffData } from"@/types/admin";
import { useRouter } from"next/navigation";
import MailDetailModal from"@/components/admin/MailDetailModal";
import TOTPDisplay from"@/components/admin/TOTPDisplay";

const getMailsForTask = (t: any, allMails: any[]) => {
 if (!t) return [];
 let mailType ="ROOT";
 if (t.type ==="MAIL_VE_TINH") mailType ="SATELLITE";
 if (t.type ==="MAIL_MONETIZED") mailType ="MONETIZED";

 if (t.selectedMailIds && Array.isArray(t.selectedMailIds)) {
 return (allMails || []).filter((m: any) => t.selectedMailIds.includes(m.id));
 }
 
 let filtered = (allMails || []).filter((m: any) => m.type === mailType && String(m.assigneeId) === String(t.assigneeId));
 if (t.title ==="Check, xóa, tạo" || t.title ==="Kênh bật kiếm tiền") {
 if (t.mailRange) {
 const parts = t.mailRange.split("-");
 if ((parts || []).length === 2) {
 const start = parseInt(parts[0].trim());
 const end = parseInt(parts[1].trim());
 const withSTT = (allMails || []).filter((m: any) => m.type === mailType).map((m: any, idx: number) => ({ ...m, currentSTT: idx + 1 }));
 const idsInRange = (withSTT || []).filter((m: any) => m.currentSTT >= start && m.currentSTT <= end).map((m: any) => m.id);
 filtered = (filtered || []).filter((m: any) => idsInRange.includes(m.id));
 }
 }
 } else if (t.title ==="Làm kênh") {
 if (t.mailRange) {
 const cleanBatch = t.batch || t.mailRange.split(" (")[0];
 filtered = (filtered || []).filter((m: any) => m.batchName === cleanBatch);
 }
 } else if (t.title ==="Mời kênh" && t.mailRange) {
 const parts = t.mailRange.split("+");
 const loPart = parts.pop()?.trim();
 filtered = (allMails || []).filter((m: any) => 
 (m.type ==="SATELLITE" && m.batchName === loPart && String(m.assigneeId) === String(t.assigneeId)) ||
 (m.type ==="ROOT" && t.note && t.note.includes(m.email))
 );
 }
 return filtered;
};

export default function AdminDashboard() {
 const router = useRouter();
 const [kpi, setKpi] = useState<any>({});
 const [user, setUser] = useState<any>(null);
 const [showSuccess, setShowSuccess] = useState(false);
 const [stats, setStats] = useState<any>({});
 
 // States quản lý bảng tập trung
 const [selectedViewType, setSelectedViewType] = useState<"LIVE" |"DIE" |"STAFF" |"TASKS" | null>(null);
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
 const [timekeepingModal, setTimekeepingModal] = useState<{ type:"in" |"out"; time: string; warning?: string } | null>(null);
 const [pendingRequests, setPendingRequests] = useState<any[]>([]);

 // Duty Roster
 const [dutyRosterData, setDutyRosterData] = useState<any>(null);

 // Newsfeed States
 const [posts, setPosts] = useState<any[]>([]);
 const [newPostText, setNewPostText] = useState("");
 const [selectedMockImage, setSelectedMockImage] = useState<string | null>(null);
 const [showImagePresets, setShowImagePresets] = useState(false);
 const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

 const getEligibleChannelsBreakdown = () => {
 if (!user) return { total: 0, list: [] };
 
 // Filter satellite mails assigned to this employee
 const myMails = (mails || []).filter((m: any) => 
 m.type ==="SATELLITE" && String(m.assigneeId) === String(user?.id)
 );

 let total = 0;
 const batchCounts: Record<string, number> = {};

 myMails.forEach((m: any) => {
 const eligibleCount = Array.isArray(m.eligibleChannels) 
 ? (m.eligibleChannels || []).filter(Boolean).length 
 : 0;
 
 if (eligibleCount > 0) {
 total += eligibleCount;
 const batchName = m.batchName ||"Chưa phân lô";
 batchCounts[batchName] = (batchCounts[batchName] || 0) + eligibleCount;
 }
 });

 // Also populate batches from tasks to make sure we show 0 for assigned batches with no eligible channels
 const myTasks = (tasksList || []).filter((t: any) => 
 String(t.assigneeId) === String(user?.id) && t.batch
 );
 myTasks.forEach((t: any) => {
 if (!batchCounts[t.batch]) {
 batchCounts[t.batch] = 0;
 }
 });

 const list = Object.entries(batchCounts).map(([name, count]) => ({
 name,
 count
 }));

 return { total, list };
 };

 const eligibleBreakdown = getEligibleChannelsBreakdown();

 const loadPosts = () => {
 const saved = localStorage.getItem("global_newsfeed_posts");
 if (saved) {
 setPosts(JSON.parse(saved));
 } else {
 setPosts([]);
 }
 };

 const handleCreatePost = () => {
 if (!newPostText.trim() && !selectedMockImage) return;
 
 const newPost = {
 id: `post_${Date.now()}`,
 authorName: user?.name ||"Anonymous",
 authorRole: user?.role ==="01" ?"ADMIN" : user?.role ==="02" ?"QL CÔNG VIỆC" : user?.role ==="03" ?"QL NHÂN SỰ" :"NHÂN VIÊN",
 text: newPostText,
 imageUrl: selectedMockImage,
 likes: 0,
 likedBy: [],
 comments: [],
 timestamp:"Vừa xong"
 };

 const updated = [newPost, ...posts];
 setPosts(updated);
 localStorage.setItem("global_newsfeed_posts", JSON.stringify(updated));
 localStorage.setItem("newsfeed_trigger", Date.now().toString());
 
 setNewPostText("");
 setSelectedMockImage(null);
 setShowImagePresets(false);
 };

 const handleLikePost = (postId: string) => {
 const updated = (posts || []).map(p => {
 if (p.id === postId) {
 const likedBy = Array.isArray(p.likedBy) ? p.likedBy : [];
 const userId = user?.id ||"anon";
 const hasLiked = likedBy.includes(userId);
 
 let newLikedBy;
 let newLikes = p.likes || 0;
 if (hasLiked) {
 newLikedBy = (likedBy || []).filter((id: string) => id !== userId);
 newLikes = Math.max(0, newLikes - 1);
 } else {
 newLikedBy = [...likedBy, userId];
 newLikes += 1;
 }

 return { ...p, likes: newLikes, likedBy: newLikedBy };
 }
 return p;
 });

 setPosts(updated);
 localStorage.setItem("global_newsfeed_posts", JSON.stringify(updated));
 localStorage.setItem("newsfeed_trigger", Date.now().toString());
 };

 const handleAddComment = (postId: string) => {
 const text = commentInputs[postId] ||"";
 if (!text.trim()) return;

 const updated = (posts || []).map(p => {
 if (p.id === postId) {
 const comments = Array.isArray(p.comments) ? p.comments : [];
 const newCmt = {
 id: `cmt_${Date.now()}`,
 authorName: user?.name ||"Anonymous",
 authorRole: user?.role ==="01" ?"ADMIN" : user?.role ==="02" ?"QL CÔNG VIỆC" : user?.role ==="03" ?"QL NHÂN SỰ" :"NHÂN VIÊN",
 text: text,
 timestamp:"Vừa xong"
 };
 return { ...p, comments: [...comments, newCmt] };
 }
 return p;
 });

 setPosts(updated);
 localStorage.setItem("global_newsfeed_posts", JSON.stringify(updated));
 localStorage.setItem("newsfeed_trigger", Date.now().toString());
 
 setCommentInputs((prev: any) => ({ ...prev, [postId]:"" }));
 };

 const loadRequests = () => {
 const saved = localStorage.getItem("pending_access_requests");
 if (saved) setPendingRequests(JSON.parse(saved));
 else setPendingRequests([]);
 };

 const loadDutyRoster = () => {
 const saved = localStorage.getItem("duty_roster");
 if (saved) setDutyRosterData(JSON.parse(saved));
 };

 const handleApproveRequest = (request: any) => {
 const saved = localStorage.getItem("pending_access_requests") ||"[]";
 const reqs = JSON.parse(saved);
 const updated = (reqs || []).filter((r: any) => r.id !== request.id);
 setPendingRequests(updated);
 localStorage.setItem("pending_access_requests", JSON.stringify(updated));
 localStorage.setItem(`access_response_${request.staffName}`,"APPROVED");
 localStorage.setItem(`access_${getStableDateString()}_${request.staffName}`,"true");

 // Nếu đây là yêu cầu nộp phạt hoặc giải trình đi muộn
 if (request.type ==="FINE_PAYMENT" || request.type ==="LATE_EXCUSE") {
 const savedUsers = null;
 if (savedUsers) {
 const allUsers = JSON.parse(savedUsers);
 const updatedUsers = (allUsers || []).map((u: any) =>
 u.username === request.username || u.name === request.staffName
 ? { 
 ...u, 
 isLateLocked: false, 
 finePaymentStatus: request.type ==="FINE_PAYMENT" ?"APPROVED" : u.finePaymentStatus,
 lateExcuseStatus: request.type ==="LATE_EXCUSE" ?"APPROVED" : u.lateExcuseStatus
 }
 : u
 );
 
 }
 }
 
 localStorage.setItem("request_trigger", Date.now().toString());
 setCopyToast(`Đã cấp quyền truy cập cho ${request.staffName}`);
 setTimeout(() => setCopyToast(null), 3000);
 };

 const handleDenyRequest = (request: any) => {
 const saved = localStorage.getItem("pending_access_requests") ||"[]";
 const reqs = JSON.parse(saved);
 const updated = (reqs || []).filter((r: any) => r.id !== request.id);
 setPendingRequests(updated);
 localStorage.setItem("pending_access_requests", JSON.stringify(updated));
 localStorage.setItem(`access_response_${request.staffName}`,"DENIED");

 // Nếu đây là yêu cầu nộp phạt hoặc giải trình đi muộn
 if (request.type ==="FINE_PAYMENT" || request.type ==="LATE_EXCUSE") {
 const savedUsers = null;
 if (savedUsers) {
 const allUsers = JSON.parse(savedUsers);
 const updatedUsers = (allUsers || []).map((u: any) =>
 u.username === request.username || u.name === request.staffName
 ? { 
 ...u, 
 finePaymentStatus: request.type ==="FINE_PAYMENT" ?"DENIED" : u.finePaymentStatus,
 lateExcuseStatus: request.type ==="LATE_EXCUSE" ?"DENIED" : u.lateExcuseStatus
 }
 : u
 );
 
 }
 }
 
 localStorage.setItem("request_trigger", Date.now().toString());
 setCopyToast(`Đã từ chối quyền truy cập cho ${request.staffName}`);
 setTimeout(() => setCopyToast(null), 3000);
 };

 useEffect(() => {
 if (user?.username) {
 setCheckInTime(localStorage.getItem(`checkin_time_${user?.username}`));
 setCheckOutTime(localStorage.getItem(`checkout_time_${user?.username}`));
 }
 }, [user]);

 const itemsPerPage = 10;

 // Helper: quét toàn bộ mail thuộc task hiện tại, trả về danh sách STT thiếu link
 const runMissingLinksCheck = React.useCallback((allMails: any[], task: any) => {
 if (!task) return;
 const mailType = task.type ==="MAIL_VE_TINH" ?"SATELLITE"
 : task.type ==="MAIL_MONETIZED" ?"MONETIZED" :"ROOT";
 if (mailType !=="SATELLITE") return; // chỉ kiểm tra SATELLITE

 const taskMails = getMailsForTask(task, allMails);

 const result: {stt: number; email: string; missing: number}[] = [];
 taskMails.forEach((m: any, idx: number) => {
 const links: string[] = m.links || [];
 const emptyCount = [0, 1, 2].filter(i => !links[i] || links[i].trim() ==="").length;
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
 if (role ==="01") return"ADMIN";
 if (role ==="02") return"QL CÔNG VIỆC";
 if (role ==="03") return"QL NHÂN SỰ";
 if (role ==="04") return"NHÂN VIÊN";
 if (role ==="05") return"NV THỬ VIỆC";
 return"GUEST";
 };

 const todayDutyTask = useMemo(() => {
 if (!dutyRosterData || !dutyRosterData.roster) return null;
 const date = new Date();
 let dayIdx = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
 if (dayIdx === 0) return null; // Sunday no duty
 
 let dayName = ["","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"][dayIdx];
 const assignedItem = dutyRosterData.roster.find((r: any) => r.day === dayName);
 
 if (dayIdx === 6) {
 return {
 id:"duty_weekend",
 isForAll: true,
 title:"Tổng vệ sinh toàn công ty",
 note: dutyRosterData.taskWeekend ||"Tổng vệ sinh, lau kính, giặt rèm...",
 status:"IN_PROGRESS"
 };
 } else {
 if (!assignedItem) return null;
 if (user && String(assignedItem.staffId) === String(user?.id)) {
 return {
 id:"duty_weekday",
 isForAll: false,
 title:"Trực nhật văn phòng",
 note: dutyRosterData.taskWeek ||"Dọn vệ sinh hàng ngày, đổ rác...",
 status:"IN_PROGRESS"
 };
 }
 return null;
 }
 }, [dutyRosterData, user]);

 const refreshStats = async () => {
 try {
 const [mailsRes, tasksRes, statsRes] = await Promise.all([
 fetch('/api/admin/mails'),
 fetch('/api/admin/tasks'),
 fetch('/api/admin/stats')
 ]);
 const mailsData = await mailsRes.json();
 const tasksData = await tasksRes.json();
 const apiStatsData = await statsRes.json();
 
 const currentMails = mailsData.success ? mailsData.data : [];
 const currentTasks = tasksData.success ? tasksData.data : [];

 const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
 const currentUserObj = storedUser ? JSON.parse(storedUser) : null;
 const isMinimalRole = currentUserObj?.role ==="03" || currentUserObj?.role ==="04" || currentUserObj?.role ==="05" || currentUserObj?.role ==="NHÂN VIÊN" || currentUserObj?.role ==="NV THỬ VIỆC" || currentUserObj?.role ==="QUẢN LÝ NHÂN SỰ";

 setTasksList(currentTasks);
 setMails(currentMails);

 const eligibleCount = currentMails.reduce((sum: number, m: any) => {
 if (m.type ==="SATELLITE" && Array.isArray(m.eligibleChannels)) {
 return sum + (m.eligibleChannels || []).filter(Boolean).length;
 }
 return sum;
 }, 0);

 if (isMinimalRole && currentUserObj) {
 const myMails = (currentMails || []).filter((m: any) => String(m.assigneeId) === String(currentUserObj?.id));
 const myTasks = (currentTasks || []).filter((t: any) => String(t.assigneeId) === String(currentUserObj?.id) && (t.status ==="IN_PROGRESS" || t.status ==="PENDING" || t.status ==="COMPLETED"));
 setStats({
 totalMail: (myMails || []).length,
 mailLive: (myMails || []).filter((m: any) => m.status ==="LIVE").length,
 mailDie: (myMails || []).filter((m: any) => m.status ==="DIE").length,
 mailRoot: 0,
 mailSatellite: 0,
 mailMonetized: 0,
 tasksToday: (myTasks || []).filter((t: any) => t.status ==="IN_PROGRESS" || t.status ==="PENDING").length,
 staffOnline: 0,
 mailWatchHours: eligibleCount
 });
 } else {
 setStats((prev: any) => ({
 ...prev,
 totalMail: (currentMails || []).length,
 mailLive: (currentMails || []).filter((m: any) => m.status ==="LIVE").length,
 mailDie: (currentMails || []).filter((m: any) => m.status ==="DIE").length,
 mailRoot: (currentMails || []).filter((m: any) => m.type ==="ROOT").length,
 mailSatellite: (currentMails || []).filter((m: any) => m.type ==="SATELLITE").length,
 mailMonetized: (currentMails || []).filter((m: any) => m.type ==="MONETIZED").length,
 tasksToday: (currentTasks || []).filter((t: any) => t.status ==="IN_PROGRESS" || t.status ==="PENDING").length,
 mailWatchHours: eligibleCount
 }));
 }

 // Apply API stats
 if (apiStatsData.success && apiStatsData.data) {
   setStats((prev: any) => ({ ...prev, ...apiStatsData.data }));
   if (apiStatsData.data.checkInTime) setCheckInTime(apiStatsData.data.checkInTime);
   if (apiStatsData.data.checkOutTime) setCheckOutTime(apiStatsData.data.checkOutTime);
 } else {
   setStats((prev: any) => ({ ...prev, ...apiStatsData }));
 }
 
 } catch (error) {
 console.error("Error refreshing stats", error);
 }
 };

 const loadStaff = async () => {
 try {
 const res = await fetch("/api/admin/users");
 const data = await res.json();
 if (data.success) {
 const allUsers = data.data;
 const unique = (allUsers || []).filter((item: any, index: number, self: any[]) =>
 index === self.findIndex((t: any) => String(t.id) === String(item.id))
 );
 setStaffList(unique);
 const onlineCount = (unique || []).filter((u: any) => u.isOnline && u.role !=="01").length;
 setStats((prev: any) => ({ ...prev, staffOnline: onlineCount }));
 }
 } catch (error) {
 console.error("Error loading staff", error);
 }
 };

 const loadRequests = () => {
  const saved = localStorage.getItem("pending_access_requests");
  if (saved) setPendingRequests(JSON.parse(saved));
  else setPendingRequests([]);
  };
 
  const loadDutyRoster = () => {
  const saved = localStorage.getItem("duty_roster");
  if (saved) setDutyRosterData(JSON.parse(saved));
  };

 useEffect(() => {
 const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
 if (storedUser) setUser(JSON.parse(storedUser));

 // Parallel load all data
 Promise.all([
   refreshStats(),
   loadStaff(),
   loadRequests(),
   loadPosts(),
   loadDutyRoster()
 ]).catch(err => console.error("Initial data load error:", err));

 const staffInterval = setInterval(() => {
 loadStaff();
 loadRequests();
 loadDutyRoster();
 const saved = localStorage.getItem("global_newsfeed_posts");
 if (saved) setPosts(JSON.parse(saved));
 }, 10000); // Increased interval to 10s for performance

 const handleStorage = (e: StorageEvent) => {
 if (e.key ==="global_kpi_data" && e.newValue) {
 setKpi(JSON.parse(e.newValue));
 }
 if ((e.key ==="global_mails_data" || e.key ==="global_tasks_data") && e.newValue) {
 refreshStats();
 }
 if (e.key ==="dashboard_stats" && e.newValue) {
 setStats(JSON.parse(e.newValue));
 }
 if (e.key ==="global_users") {
 loadStaff();
 }
 if (e.key ==="global_newsfeed_posts" || e.key ==="newsfeed_trigger") {
 const saved = localStorage.getItem("global_newsfeed_posts");
 if (saved) setPosts(JSON.parse(saved));
 }
 if (e.key ==="pending_access_requests" || e.key ==="request_trigger") {
 loadRequests();
 }
 if (e.key ==="duty_roster") {
 loadDutyRoster();
 }
 if (e.key ==="user" && e.newValue) {
 const newUserObj = JSON.parse(e.newValue);
 const currentSessionUser = JSON.parse(sessionStorage.getItem("user") ||"{}");
 if (newUserObj.username === currentSessionUser.username) {
 setUser(newUserObj);
 }
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
 if (String(toastData.userId) === String(currentUser?.id)) {
 setCopyToast(toastData.message);
 setTimeout(() => setCopyToast(null), 4000);
 
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
 const keys = ["global_users","global_mails_data","global_tasks_data","global_kpi_data","admin_notifications","realtime_toast","pending_access_requests"];
 const payload: Record<string, string> = {};
 keys.forEach(k => {
 const val = localStorage.getItem(k);
 if (val !== null) payload[k] = val;
 });
 await fetch("/api/sync", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(payload)
 });
 } catch (err) {
 console.error("Sync error:", err);
 }
 };

 const handleCheckIn = async () => {
 if (!user) return;
 const timeStr = new Date().toLocaleTimeString("vi-VN", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
 const fullISO = new Date().toISOString();
 localStorage.setItem(`checkin_time_${user?.username}`, fullISO);
 setCheckInTime(fullISO);
 
 // Trigger real-time modal
 setTimekeepingModal({ type:"in", time: timeStr });
 
 try {
 await fetch("/api/admin/attendance", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ userId: user?.id, type:"CHECK_IN", time: timeStr, isoTime: fullISO })
 });
 await loadStaff();
 } catch (err) {
 console.error("Check in error", err);
 }
 };

 const handleCheckOut = async () => {
 if (!user) return;
 const checkInISO = localStorage.getItem(`checkin_time_${user?.username}`);
 if (!checkInISO) return;
 
 const timeStr = new Date().toLocaleTimeString("vi-VN", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
 const fullISO = new Date().toISOString();
 localStorage.setItem(`checkout_time_${user?.username}`, fullISO);
 setCheckOutTime(fullISO);
 
 // Load config
 const savedWorkConfigStr = localStorage.getItem("global_work_config");
 let startTimeStr ="08:00";
 let endTimeStr ="18:00";
 if (savedWorkConfigStr) {
 try {
 const wc = JSON.parse(savedWorkConfigStr);
 if (wc.startTime) startTimeStr = wc.startTime;
 if (wc.endTime) endTimeStr = wc.endTime;
 } catch (e) {}
 }
 
 const dIn = new Date(checkInISO);
 const dOut = new Date(fullISO);
 const t_in = dIn.getHours() * 60 + dIn.getMinutes();
 const t_out = dOut.getHours() * 60 + dOut.getMinutes();
 
 const [startH, startM] = startTimeStr.split(":").map(Number);
 const [endH, endM] = endTimeStr.split(":").map(Number);
 const startWorkMins = startH * 60 + startM;
 const endWorkMins = endH * 60 + endM;
 
 const overlap1 = Math.max(0, Math.min(720, t_out) - Math.max(startWorkMins, t_in));
 const overlap2 = Math.max(0, Math.min(endWorkMins, t_out) - Math.max(810, t_in));
 const totalWorkingMins = overlap1 + overlap2;
 
 const expectedMins = Math.max(0, 720 - startWorkMins) + Math.max(0, endWorkMins - 810);
 
 let warning = undefined;
 if (totalWorkingMins < expectedMins) {
 const missing = expectedMins - totalWorkingMins;
 warning = `Hôm nay bạn chưa làm đủ thời gian quy định, còn thiếu ${missing} phút nữa.`;
 }
 
 // Trigger real-time modal
 setTimekeepingModal({ type:"out", time: timeStr, warning });
 
 try {
 await fetch("/api/admin/attendance", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ userId: user?.id, type:"CHECK_OUT", time: timeStr, isoTime: fullISO, totalHours: (totalWorkingMins / 60).toFixed(2) })
 });
 await loadStaff();
 } catch (err) {
 console.error("Check out error", err);
 }
 };

 const handleSaveKPI = () => {
 
 setShowSuccess(true);
 setTimeout(() => setShowSuccess(false), 3000);
 };

 const handleStaffMailStatusChange = async (mailId: string, newWorkStatus: string) => {
 // Phase 3.1: Validate 3 links before allowing"Đã làm" for SATELLITE mails (Role 03, 04 only)
 const normNew = (newWorkStatus ||"").toUpperCase();
 if (normNew ==="ĐÃ LÀM" && (user?.role ==="03" || user?.role ==="04" || user?.role ==="05")) {
 const targetMail = mails.find((m: any) => m.id === mailId || m._id === mailId);
 if (targetMail && targetMail.type ==="SATELLITE") {
 const links: string[] = targetMail.links || [];
 const filledCount = [0, 1, 2].filter(i => links[i] && links[i].trim() !=="").length;
 if (filledCount < 3) {
 setCopyToast("Thiếu kênh! Vui lòng điền đủ 3 link kênh trước khi chuyển trạng thái.");
 setTimeout(() => setCopyToast(null), 4000);
 return;
 }
 }
 }

 let nextStatus ="DIE";
 if (normNew ==="ĐÃ LÀM KÊNH" || normNew ==="HOÀN THÀNH" || normNew ==="ĐÃ LÀM" || normNew ==="CHƯA LÀM" || normNew ==="ĐANG XỬ LÍ") {
 nextStatus ="LIVE";
 }

 try {
 await fetch(`/api/admin/mails/${mailId}`, {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({
 workStatus: newWorkStatus,
 status: nextStatus,
 updatedBy: user?.name || user?.username ||"Hệ thống"
 })
 });

 // Update mails locally to recalculate tasks
 const updatedMails = mails.map((m: any) => {
 if (m.id === mailId || m._id === mailId) {
 return { ...m, workStatus: newWorkStatus, status: nextStatus };
 }
 return m;
 });
 
 const changedTasks: any[] = [];
 const updatedTasks = tasksList.map((t: any) => {
 let mailType ="ROOT";
 if (t.type ==="MAIL_VE_TINH") mailType ="SATELLITE";
 if (t.type ==="MAIL_MONETIZED") mailType ="MONETIZED";

 let filtered = (updatedMails || []).filter((m: any) => m.type === mailType && String(m.assigneeId) === String(t.assigneeId));
 if (t.selectedMailIds && Array.isArray(t.selectedMailIds)) {
 filtered = (updatedMails || []).filter((m: any) => t.selectedMailIds?.includes(m.id || m._id));
 } else if (t.title ==="Check, xóa, tạo" || t.title ==="Kênh bật kiếm tiền") {
 if (t.mailRange) {
 const parts = t.mailRange.split("-");
 if ((parts || []).length === 2) {
 const start = parseInt(parts[0].trim());
 const end = parseInt(parts[1].trim());
 const withSTT = (updatedMails || []).filter((m: any) => m.type === mailType).map((m: any, idx: number) => ({ ...m, currentSTT: idx + 1 }));
 const idsInRange = (withSTT || []).filter((m: any) => m.currentSTT >= start && m.currentSTT <= end).map((m: any) => m.id || m._id);
 filtered = (filtered || []).filter((m: any) => idsInRange.includes(m.id || m._id));
 }
 }
 } else if (t.title ==="Làm kênh") {
 if (t.mailRange) {
 const cleanBatch = t.batch || t.mailRange.split(" (")[0];
 filtered = (filtered || []).filter((m: any) => m.batchName === cleanBatch);
 }
 } else if (t.title ==="Mời kênh" && t.mailRange) {
 const parts = t.mailRange.split("+");
 const loPart = parts.pop()?.trim();
 filtered = (updatedMails || []).filter((m: any) => 
 (m.type ==="SATELLITE" && m.batchName === loPart && String(m.assigneeId) === String(t.assigneeId)) ||
 (m.type ==="ROOT" && t.note && t.note.includes(m.email))
 );
 }

 const totalTaskMails = (filtered || []).length;
 if (totalTaskMails > 0) {
 const completedCount = (filtered || []).filter((m: any) => {
 const normStatus = (m.workStatus ||"").toUpperCase();
 return normStatus ==="ĐÃ LÀM" || normStatus ==="ĐÃ BÁN" || normStatus ==="HOÀN THÀNH" || normStatus ==="ĐÃ LÀM KÊNH";
 }).length;
 const progressPercent = Math.round((completedCount / totalTaskMails) * 100);
 const newStatus = progressPercent === 100 ?"COMPLETED" : (progressPercent > 0 ?"IN_PROGRESS" :"PENDING");
 
 if (t.progress !== progressPercent || t.status !== newStatus) {
 const updatedTask = { ...t, progress: progressPercent, status: newStatus };
 changedTasks.push(updatedTask);
 return updatedTask;
 }
 }
 return t;
 });

 // Update tasks via API
 for (const t of changedTasks) {
 await fetch(`/api/admin/tasks/${t.id || t._id}`, {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ progress: t.progress, status: t.status })
 });
 }

 await refreshStats();

 // Kiểm tra link bị thiếu: chỉ khi chọn"Đã làm" cho mail đó
 if (selectedStaffTask) {
 const norm = (newWorkStatus ||"").toUpperCase();
 if (norm ==="ĐÃ LÀM") {
 // Chỉ kiểm tra mail vừa được cập nhật
 const mailType = selectedStaffTask.type ==="MAIL_VE_TINH" ?"SATELLITE" :"OTHER";
 if (mailType ==="SATELLITE") {
 const taskMails = (updatedMails || []).filter((m: any) => {
 const belongsToUser = String(m.assigneeId) === String(selectedStaffTask.assigneeId || user?.id);
 if (!belongsToUser) return false;
 if (selectedStaffTask.selectedMailIds && Array.isArray(selectedStaffTask.selectedMailIds))
 return selectedStaffTask.selectedMailIds.includes(m.id);
 return m.type ==="SATELLITE";
 });
 const idx = taskMails.findIndex((m: any) => m.id === mailId);
 const changedMail = taskMails[idx];
 if (changedMail) {
 const links: string[] = changedMail.links || [];
 const emptyCount = [0, 1, 2].filter(i => !links[i] || links[i].trim() ==="").length;
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
 } catch (err) {
 console.error("Error in handleStaffMailStatusChange", err);
 }
 };



 const handleTaskStatusChange = async (taskId: string, newStatus:"IN_PROGRESS" |"COMPLETED") => {
 const targetTask = tasksList.find((t: any) => t.id === taskId);
 if (!targetTask) return;

 if (newStatus ==="COMPLETED" && targetTask?.type ==="MAIL_VE_TINH") {
 const taskMails = getMailsForTask(targetTask, mails);
 let errorMails: string[] = [];
 taskMails.forEach((m: any) => {
 const linksCount = (m.links || []).filter((l: string) => typeof l === 'string' && l.trim() !=="").length;
 if (linksCount < 3) {
 errorMails.push(`- ${m.email} (thiếu ${3 - linksCount} kênh)`);
 }
 });
 if ((errorMails || []).length > 0) {
 alert("KHÔNG THỂ HOÀN THÀNH!\nCác mail vệ tinh sau chưa nhập đủ 3 kênh:\n" + errorMails.join("\n"));
 return;
 }
 }

 try {
 // 1. Cập nhật trạng thái Task
 const taskRes = await fetch(`/api/admin/tasks/${taskId}`, {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ status: newStatus, progress: newStatus ==="COMPLETED" ? 100 : targetTask.progress })
 });
 
 if (!taskRes.ok) throw new Error("Cập nhật Task thất bại");

 const updatedTasks = tasksList.map((t: any) => {
 if (t.id === taskId) {
 return { ...t, status: newStatus, progress: newStatus ==="COMPLETED" ? 100 : t.progress };
 }
 return t;
 });
 setTasksList(updatedTasks);
 setSelectedStaffTask((prev: any) => prev?.id === taskId ? { ...prev, status: newStatus, progress: newStatus ==="COMPLETED" ? 100 : prev.progress } : prev);

 const now = new Date().toISOString();
 const taskMails = getMailsForTask(targetTask, mails);
 const taskMailIds = (taskMails || []).map((m: any) => m.id);

 const isSatelliteTask = targetTask?.type ==="MAIL_VE_TINH";
 const newWorkStatus = newStatus ==="COMPLETED" ?"Đã làm" :"Đang xử lí";

 // 2. Cập nhật trạng thái Mails
 const mailUpdates = taskMailIds.map((mailId: string) => {
 const m = mails.find((mail: any) => mail.id === mailId);
 if (!m) return null;
 let resolvedStatus = newWorkStatus;
 if (newStatus ==="COMPLETED" && isSatelliteTask) {
 const links: string[] = m.links || [];
 const hasAllLinks = [0, 1, 2].every(i => links[i] && links[i].trim() !=="");
 resolvedStatus = hasAllLinks ?"Đã làm" :"Lỗi";
 }
 return fetch(`/api/admin/mails/${mailId}`, {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ workStatus: resolvedStatus, lastUpdated: now, updatedBy: user?.name || user?.id || m.updatedBy })
 });
 }).filter(Boolean);

 await Promise.all(mailUpdates);

 const updatedMails = mails.map((m: any) => {
 if (!taskMailIds.includes(m.id)) return m;
 let resolvedStatus = newWorkStatus;
 if (newStatus ==="COMPLETED" && isSatelliteTask) {
 const links: string[] = m.links || [];
 const hasAllLinks = [0, 1, 2].every(i => links[i] && links[i].trim() !=="");
 resolvedStatus = hasAllLinks ?"Đã làm" :"Lỗi";
 }
 return { ...m, workStatus: resolvedStatus, lastUpdated: now, updatedBy: user?.name || user?.id || m.updatedBy };
 });
 setMails(updatedMails);

 if (newStatus ==="COMPLETED") {
 runMissingLinksCheck(updatedMails, targetTask);
 } else {
 setMissingLinksWarning([]);
 }

 // 3. Cập nhật KPI
 if (newStatus ==="COMPLETED") {
 const kpiUpdate = targetTask.mailType ==="MONETIZED" 
 ? { currentMonetized: Math.min(kpi?.targetMonetized || 0, (kpi?.currentMonetized || 0) + 1) }
 : { currentWatchHours: Math.min(kpi?.targetWatchHours || 0, (kpi?.currentWatchHours || 0) + 1) };
 
 setKpi((prev: any) => {
 const updatedKpi = { ...prev, ...kpiUpdate };
 fetch("/api/admin/kpis", {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(updatedKpi)
 }).catch(console.error);
 return updatedKpi;
 });
 }


 setCopyToast(`✓ Đã cập nhật ${(taskMailIds || []).length} mail sang"${newWorkStatus}"`);
 setTimeout(() => setCopyToast(null), 3000);
 } catch (err) {
 console.error("Error updating task status:", err);
 alert("Lỗi cập nhật trạng thái");
 }
 };

 const handleInviteStatusChange = async (mailId: string, chIdx: number, newInviteStatus: string) => {
 const targetMail = mails.find((m: any) => m.id === mailId);
 if (!targetMail) return;

 const inviteStatuses = targetMail.inviteStatuses || ["Chưa mời","Chưa mời","Chưa mời"];
 inviteStatuses[chIdx] = newInviteStatus;

 try {
 const res = await fetch(`/api/admin/mails/${mailId}`, {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ inviteStatuses })
 });
 if (!res.ok) throw new Error("Cập nhật thất bại");

 const updatedMails = mails.map((m: any) => m.id === mailId ? { ...m, inviteStatuses } : m);
 setMails(updatedMails);

 const eligibleCount = updatedMails.reduce((sum: number, m: any) => {
 if (m.type ==="SATELLITE" && Array.isArray(m.eligibleChannels)) {
 return sum + (m.eligibleChannels || []).filter(Boolean).length;
 }
 return sum;
 }, 0);
 setStats((prev: any) => ({ ...prev, mailWatchHours: eligibleCount }));

 setCopyToast("Đã cập nhật trạng thái mời!");
 setTimeout(() => setCopyToast(null), 2000);
 } catch (error) {
 console.error("Lỗi:", error);
 alert("Lỗi cập nhật trạng thái mời");
 }
 };

 const roleLabel = getRoleLabel(user?.role);
 const isAdminOrManager = user?.role ==="01" || user?.role ==="02";
 const isHRManager = user?.role ==="03" || user?.role ==="QUẢN LÝ NHÂN SỰ";

 const filteredMails = useMemo(() => {
 if (!selectedViewType || selectedViewType ==="STAFF") return [];
 
 return (mails || []).filter(m => {
 let matchesType = true;
 if (selectedViewType ==="LIVE") matchesType = m.status ==="LIVE";
 else if (selectedViewType ==="DIE") matchesType = m.status ==="DIE";
 else if (selectedViewType ==="TASKS") matchesType = true;

 let matchesMailType = true;
 if (filterMailType !=="ALL") {
 matchesMailType = m.type === filterMailType;
 }

 const matchesSearch = m.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
 m.recovery.toLowerCase().includes(searchQuery.toLowerCase());

 const matchesStatus = filterStatus ==="all" || (m.channelStatus && m.channelStatus.includes(filterStatus));

 return matchesType && matchesMailType && matchesSearch && matchesStatus;
 });
 }, [selectedViewType, searchQuery, filterStatus, filterMailType, mails]);

 const totalPages = Math.ceil((filteredMails || []).length / itemsPerPage);
 const currentItems = filteredMails.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

 const filteredTasks = useMemo(() => {
 if (selectedViewType !=="TASKS" || !isAdminOrManager) return [];
 return (tasksList || []).filter(t => {
 const titleMatch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
 const noteMatch = t.note ? t.note.toLowerCase().includes(searchQuery.toLowerCase()) : false;
 const staffName = (() => {
 const assignee = staffList.find(s => String(s.id) === String(t.assigneeId));
 return assignee ? assignee.name.toLowerCase() :"chưa giao";
 })();
 const staffMatch = staffName.includes(searchQuery.toLowerCase());
 return titleMatch || noteMatch || staffMatch;
 });
 }, [selectedViewType, tasksList, searchQuery, isAdminOrManager, staffList]);

 const totalTasksPages = Math.ceil((filteredTasks || []).length / itemsPerPage);
 const currentTasksItems = filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

 const getChannelStatusColor = (status: string) => {
 if (!status) return"bg-gray-500/10 text-gray-400 border-gray-500/20";
 const lower = status.toLowerCase();
 if (lower.includes("chờ b2") || lower.includes("chờ b3") || lower.includes("quay video")) return"bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
 if (lower.includes("lỗi b2") || lower.includes("die spam") || lower.includes("chưa sub") || lower.includes("mất kênh")) return"bg-red-500/10 text-red-500 border-red-500/30";
 if (lower.includes("đã bật") || lower.includes("đã kháng")) return"bg-blue-500/10 text-blue-400 border-blue-500/30";
 return"bg-gray-500/10 text-gray-400 border-gray-500/20";
 };

 // ============================================================
 // FULL-SCREEN TASK DETAIL for Role 03/04
 // ============================================================
 // Lock scroll on the main element when task detail is open
 React.useEffect(() => {
 const mainEl = document.querySelector("main");
 if (!mainEl) return;
 if (selectedStaffTask && (user?.role ==="03" || user?.role ==="04" || user?.role ==="05")) {
 mainEl.style.overflow ="hidden";
 } else {
 mainEl.style.overflow ="";
 }
 return () => { mainEl.style.overflow =""; };
 }, [selectedStaffTask, user?.role]);

 

 // ============================================================
 // Lock scroll on the main element when task detail is open
 

 

 if (selectedViewType) {
 return (
 <div className="h-full flex flex-col space-y-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-6">
 <button 
 onClick={() => setSelectedViewType(null)}
 className="flex items-center gap-2 text-gold font-bold uppercase text-sm tracking-wider transition-all group"
 >
 <div className="h-10 w-10 bg-gold/10 rounded-xl flex items-center justify-center group-hover:bg-gold/20 transition-all shadow-lg">
 <ArrowLeft size={20} />
 </div>
 Quay lại bảng điều khiển
 </button>
 <h2 className="text-3xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
 {selectedViewType ==="STAFF" ? <Users className="text-gold" size={28} /> : <Mail className="text-gold" size={28} />}
 {selectedViewType ==="STAFF" ?"Danh sách Nhân viên" : selectedViewType ==="TASKS" ?"Task Công việc" : `Danh sách ${selectedViewType} Mail`}
 </h2>
 </div>
 </div>

 <div className="bg-sidebar border border-white/0 rounded-[32px] overflow-hidden shadow-2xl">
 <div className="p-6 border-b border-white/0 bg-white/0 flex flex-col md:flex-row items-center justify-between gap-4">
 <div className="flex items-center gap-4 w-full md:w-auto">
 <h3 className="text-xl font-bold text-white uppercase tracking-tight hidden md:block">Dữ liệu chi tiết</h3>
 <div className="h-8 w-px bg-white/0 hidden md:block" />
 <div className="flex items-center gap-2 bg-black/20 border border-white/0 rounded-xl px-3 h-10 w-full md:w-64 focus-within:border-white/5 transition-all">
 <Search size={16} className="text-gray-500" />
 <input 
 placeholder={selectedViewType ==="STAFF" ?"Tìm tên nhân viên..." :"Tìm kiếm Email..."}
 className="bg-transparent border-none outline-none text-sm text-white w-full" 
 type="text" 
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 />
 </div>
 {(selectedViewType ==="LIVE" || selectedViewType ==="DIE") && (
 <select
 value={filterMailType}
 onChange={(e) => {
 setFilterMailType(e.target.value);
 setCurrentPage(1);
 }}
 className="bg-black/20 border border-white/0 rounded-xl px-4 h-10 text-sm text-gold font-bold uppercase tracking-wider outline-none focus:border-gold transition-all cursor-pointer hidden md:block"
 >
 <option value="ALL" className="bg-zinc-900 text-white hover:bg-zinc-700">Tất cả loại</option>
 <option value="ROOT" className="bg-zinc-900 text-white hover:bg-zinc-700">Gốc</option>
 <option value="SATELLITE" className="bg-zinc-900 text-white hover:bg-zinc-700">Vệ tinh</option>
 <option value="MONETIZED" className="bg-zinc-900 text-white hover:bg-zinc-700">BKT</option>
 </select>
 )}
 </div>
 <button onClick={() => setSelectedViewType(null)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-500 hover:bg-red-500/20 hover:text-red-500 transition-all shadow-inner"><X size={20} /></button>
 </div>

 <div className="overflow-x-auto custom-scrollbar">
 {selectedViewType ==="STAFF" ? (
 <table className="w-full text-left text-base whitespace-nowrap">
 <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/0">
 <tr>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">STT</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Tên nhân viên</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Vai trò</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Trạng thái</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Check-in</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Check-out</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Tổng giờ</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-gray-300">
 {staffList
 .filter(s => s.status ==="ACTIVE" && s.role !=="01")
 .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
 .map((staff: any, index) => (
 <tr key={`staff-${staff.id}`} className="hover:bg-white/5 bg-zinc-900/[0.02] transition-colors group">
 <td className="py-4 px-6 text-[10px] font-black text-gray-500">{index + 1}</td>
 <td className="py-4 px-6 text-base font-bold text-white flex items-center gap-3">
 <div className="h-8 w-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center font-black text-sm text-gold uppercase shrink-0">
 {staff.name ? staff.name.slice(0, 2) :"NV"}
 </div>
 {staff.name}
 </td>
 <td className="py-4 px-6 text-sm text-gray-400 font-bold">{getRoleLabel(staff.role)}</td>
 <td className="py-4 px-6">
 <span className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${staff.isOnline ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
 {staff.isOnline ?"ONLINE" :"OFFLINE"}
 </span>
 </td>
 <td className="py-4 px-6 text-sm text-gray-400 font-mono font-bold">{staff.checkInTime ||"---"}</td>
 <td className="py-4 px-6 text-sm text-gray-400 font-mono font-bold">{staff.checkOutTime ||"---"}</td>
 <td className="py-4 px-6 text-sm text-gold font-mono font-black">{staff.totalHours ? `${staff.totalHours}h` :"---"}</td>
 </tr>
 ))}
 </tbody>
 </table>
 ) : selectedViewType ==="TASKS" && isAdminOrManager ? (
 <table className="w-full text-left text-base whitespace-nowrap">
 <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/0">
 <tr>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">STT</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Tiêu đề</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Loại công việc</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Nhân sự được giao</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Số lượng mail</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Tiến độ</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Trạng thái</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Hạn chót</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-gray-300">
 {(currentTasksItems || []).map((task: any, index: number) => {
 const assignee = staffList.find(s => String(s.id) === String(task.assigneeId));
 const taskTypeLabel = task.type ==="MAIL_GOC" ?"Mail Gốc" : (task.type ==="MAIL_VE_TINH" ?"Mail Vệ Tinh" :"Mail BKT");
 return (
 <tr key={`task-row-${task.id}`} className="hover:bg-white/5 bg-zinc-900/[0.02] transition-colors group">
 <td className="py-4 px-6 text-[10px] font-black text-gray-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
 <td className="py-4 px-6 text-base font-bold text-white">
 <div>
 <span className="block">{task.title}</span>
 {task.note && <span className="text-[10px] text-gray-500 block font-normal whitespace-pre-wrap">{task.note}</span>}
 </div>
 </td>
 <td className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gold">{taskTypeLabel}</td>
 <td className="py-4 px-6 text-sm text-gray-400 font-bold">{assignee ? assignee.name :"Chưa giao"}</td>
 <td className="py-4 px-6 text-sm text-gray-400 font-bold">{task.mailCount || 0} Mail</td>
 <td className="py-4 px-6">
 <div className="flex items-center gap-2">
 <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/0">
 <div className="h-full bg-gold" style={{ width: `${task.progress || 0}%` }} />
 </div>
 <span className="text-[10px] font-black text-gold">{task.progress || 0}%</span>
 </div>
 </td>
 <td className="py-4 px-6">
 <span className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${
 task.status ==="COMPLETED" 
 ?"bg-green-500/10 text-green-500 border-green-500/20" 
 : task.status ==="IN_PROGRESS"
 ?"bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
 :"bg-gray-500/10 text-gray-400 border-gray-500/20"
 }`}>
 {task.status ==="COMPLETED" ?"Hoàn thành" : task.status ==="IN_PROGRESS" ?"Đang xử lý" :"Chưa làm"}
 </span>
 </td>
 <td className="py-4 px-6 text-sm text-gray-500 font-bold">{task.deadline ||"---"}</td>
 </tr>
 );
 })}
 </tbody>
 </table>
 ) : (
 <table className="w-full text-left text-base whitespace-nowrap">
 <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/0">
 <tr>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">STT</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Email</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Loại Mail</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Trạng thái</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Chi tiết</th>
 <th className="py-5 px-6 font-bold uppercase tracking-wider text-[10px]">Người cập nhật</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-gray-300">
 {(currentItems || []).map((mail: any, index: number) => {
 const assignee = staffList.find(s => String(s.id) === String(mail.assigneeId));
 return (
 <tr key={`mail-${mail.id}`} className="hover:bg-white/5 bg-zinc-900/[0.02] transition-colors group">
 <td className="py-4 px-6 text-[10px] font-black text-gray-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
 <td className="py-4 px-6 text-base font-bold text-white">
 <div>{mail.email}</div>
 {mail.type ==="SATELLITE" && (() => {
 const links = mail.links || [];
 const filledCount = [0, 1, 2].filter(i => links[i] && links[i].trim() !=="").length;
 if (filledCount < 3) {
 return (
 <div className="text-[10px] text-red-500 font-extrabold uppercase animate-pulse flex items-center gap-1 mt-0.5">
 <span className="text-[8px]">⚠️</span> Thiếu {3 - filledCount} kênh
 </div>
 );
 }
 return null;
 })()}
 </td>
 <td className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gold">
 {mail.type ==="ROOT" ?"Gốc" : mail.type ==="SATELLITE" ?"Vệ Tinh" :"BKT"}
 </td>
 <td className="py-4 px-6">
 <span className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${mail.status === 'LIVE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
 {mail.status ||"LIVE"}
 </span>
 </td>
 <td className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
 {mail.workStatus || (mail.status === 'DIE' ?"Lỗi" :"Chưa làm")}
 </td>
 <td className="py-4 px-6 text-sm text-gray-400 font-medium">
 {mail.updatedBy ? (typeof mail.updatedBy === 'object' ? (mail.updatedBy.name || mail.updatedBy.username || "Hệ thống") : mail.updatedBy) : (assignee ? assignee.name :"---")}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 )}
 </div>
 
 {selectedViewType !=="STAFF" && (
 <div className="p-6 border-t border-white/0 bg-black/20 flex items-center justify-between">
 <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trang <span className="text-white font-black">{currentPage}</span> / {selectedViewType ==="TASKS" && isAdminOrManager ? totalTasksPages || 1 : totalPages || 1}</span>
 <div className="flex gap-2">
 <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/0 text-white disabled:opacity-30 hover:border-gold transition-all"><ChevronLeft size={18} /></button>
 <button disabled={currentPage >= (selectedViewType ==="TASKS" && isAdminOrManager ? totalTasksPages : totalPages)} onClick={() => setCurrentPage(p => p + 1)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/0 text-white disabled:opacity-30 hover:border-gold transition-all"><ChevronRight size={18} /></button>
 </div>
 </div>
 )}
 </div>
 </div>
 );
 }

 

if (selectedStaffTask && (user?.role ==="03" || user?.role ==="04" || user?.role ==="05")) {
 const taskMails = (mails || []).filter((m: any) => {
 const belongsToUser = String(m.assigneeId) === String(user?.id);
 if (!belongsToUser) return false;
 if (selectedStaffTask.selectedMailIds && Array.isArray(selectedStaffTask.selectedMailIds)) {
 return selectedStaffTask.selectedMailIds.includes(m.id);
 }
 return selectedStaffTask.type ==="MAIL_VE_TINH" ? m.type ==="SATELLITE" :
 selectedStaffTask.type ==="MAIL_MONETIZED" ? m.type ==="MONETIZED" :
 m.type ==="ROOT";
 });

 const mailType:"ROOT" |"SATELLITE" |"MONETIZED" =
 selectedStaffTask.type ==="MAIL_VE_TINH" ?"SATELLITE" :
 selectedStaffTask.type ==="MAIL_MONETIZED" ?"MONETIZED" :"ROOT";

 const getStatusStyle = (ws: string) => {
 const v = (ws ||"").toLowerCase();
 if (v ==="đã làm") return"bg-green-500/10 text-green-500 border-green-500/20";
 if (v ==="lỗi") return"bg-red-500/10 text-red-500 border-red-500/20";
 if (v ==="đang xử lí") return"bg-zinc-800/50 text-zinc-400 border-zinc-700";
 return"bg-gray-500/10 text-gray-400 border-gray-500/20";
 };

 return (
 <div
 className="flex flex-col overflow-hidden bg-background"
 style={{ height:"calc(100vh - 80px)", margin:"-1rem -1rem -1rem -1rem" }}
 >
 {/* Toast */}
 <AnimatePresence>
 {copyToast && (
 <motion.div initial={{ opacity: 0, y: -40, x:"-50%" }} animate={{ opacity: 1, y: 20, x:"-50%" }} exit={{ opacity: 0, y: -40, x:"-50%" }}
 className="fixed top-0 left-1/2 z-[500] bg-gold px-6 py-2.5 rounded-full text-sidebar font-black text-base shadow-2xl flex items-center gap-2">
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
 onSave={async (updatedFields: any) => {
 try {
 const now = new Date().toISOString();
 const payload = { ...updatedFields, lastUpdated: now, updatedBy: user?.name || user?.id };
 const res = await fetch(`/api/admin/mails/${selectedMailForModal.id}`, {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(payload)
 });
 if (!res.ok) throw new Error("Cập nhật thất bại");
 
 const updated = mails.map((m: any) =>
 m.id === selectedMailForModal.id ? { ...m, ...payload } : m
 );
 setMails(updated);
 setSelectedMailForModal(null);
 } catch (error) {
 console.error("Lỗi:", error);
 alert("Cập nhật thất bại!");
 }
 }}
 />
 )}
 </AnimatePresence>

 {/* Sticky Header */}
 <div className="flex-shrink-0 bg-sidebar border-b border-white/0 px-6 py-4 shadow-2xl z-10">
 <div className="flex items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <button
 onClick={() => setSelectedStaffTask(null)}
 className="h-10 w-10 bg-gold/10 rounded-xl flex items-center justify-center text-gold hover:bg-gold/20 transition-all shadow-lg"
 >
 <ArrowLeft size={20} />
 </button>
 <div>
 <h1 className="text-xl font-bold text-white uppercase tracking-tight">
 Nhiệm vụ được giao: {selectedStaffTask.title} ({(taskMails || []).length} mail)
 </h1>
 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
 {selectedStaffTask.note ||"Xử lý danh sách mail được giao"}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <button
 onClick={() => handleTaskStatusChange(selectedStaffTask.id,"IN_PROGRESS")}
 className={`h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
 selectedStaffTask.status ==="IN_PROGRESS"
 ?"bg-yellow-500 text-sidebar border-yellow-500"
 :" bg-white/5 text-gray-400 border-white/0 hover:border-yellow-500/50 hover:text-yellow-500"
 }`}
 >
 Đang xử lí
 </button>
 <button
 onClick={() => handleTaskStatusChange(selectedStaffTask.id,"COMPLETED")}
 className={`h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
 selectedStaffTask.status ==="COMPLETED"
 ?"bg-green-500 text-sidebar border-green-500"
 :" bg-white/5 text-gray-400 border-white/0 hover:border-green-500/50 hover:text-green-500"
 }`}
 >
 Hoàn thành
 </button>
 </div>
 </div>
 </div>

 {/* Missing Links Warning Panel */}
 {(missingLinksWarning || []).length > 0 && (
 <div className="flex-shrink-0 mx-4 mt-3">
 <div className="bg-gradient-to-r from-red-950/60 to-orange-950/40 border border-red-500/40 rounded-2xl overflow-hidden shadow-lg shadow-red-500/10">
 {/* Header */}
 <div className="flex items-center justify-between px-5 py-3 border-b border-red-500/20">
 <div className="flex items-center gap-3">
 <div className="h-9 w-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
 <span className="text-red-400 font-black text-lg">!</span>
 </div>
 <div>
 <p className="text-red-300 font-black text-base uppercase tracking-widest">
 {(missingLinksWarning || []).length} mail chưa điền đủ link kênh YouTube
 </p>
 <p className="text-red-500/70 text-sm font-bold uppercase tracking-wider mt-1">
 Các mail thiếu link sẽ bị đánh dấu Lỗi — bổ sung link trong popup"Xem chi tiết"
 </p>
 </div>
 </div>
 <button
 onClick={() => setMissingLinksWarning([])}
 className="h-7 w-7 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 transition-all flex items-center justify-center"
 >
 <X size={14} />
 </button>
 </div>
 {/* STT Badges */}
 <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
 <span className="text-sm font-black text-red-500/60 uppercase tracking-widest mr-2">STT thiếu link:</span>
 {(missingLinksWarning || []).map((w) => (
 <span
 key={w.stt}
 title={`${w.email} - thiếu ${w.missing} link`}
 className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 font-black text-base cursor-default hover:bg-red-500/30 transition-colors"
 >
 <span className="font-black text-white text-base">{w.stt}</span>
 <span className="text-red-500/40 font-normal text-sm">|</span>
 <span className="text-red-400/80 font-bold text-sm">{w.missing} link trống</span>
 </span>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Scrollable mail table */}
 <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
 <table className="w-full text-left text-base whitespace-nowrap min-w-[1000px]">
 <thead className="sticky top-0 bg-[#0a0a0a] text-gray-500 border-b border-white/0 z-10">
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
 {(taskMails || []).length === 0 ? (
 <tr><td colSpan={9} className="py-20 text-center font-bold uppercase tracking-widest">Không có mail nào</td></tr>
 ) : (taskMails || []).map((mail: any, idx: number) => (
 <tr key={mail.id} className="hover:bg-white/5 bg-zinc-900/[0.02] transition-colors group">
 <td className="py-3 px-6 text-[10px] font-black text-gray-500 whitespace-nowrap">{idx + 1}</td>
 <td className="py-3 px-6 font-bold text-white text-sm cursor-pointer hover:text-gold transition-colors whitespace-nowrap" onClick={() => copyToClipboard(mail.email,"Email")}>
 <div>{mail.email}</div>
 {mail.type ==="SATELLITE" && (() => {
 const links = mail.links || [];
 const filledCount = [0, 1, 2].filter(i => links[i] && links[i].trim() !=="").length;
 if (filledCount < 3) {
 return (
 <div className="text-[10px] text-red-500 font-extrabold uppercase animate-pulse flex items-center gap-1 mt-0.5">
 <span className="text-[8px]">⚠️</span> Thiếu {3 - filledCount} kênh
 </div>
 );
 }
 return null;
 })()}
 </td>
 <td className="py-3 px-6 text-sm text-gray-400 cursor-pointer hover:text-gold transition-colors whitespace-nowrap" onClick={() => copyToClipboard(mail.recovery ||"","KP")}>{mail.recovery ||"---"}</td>
 <td className="py-3 px-6 text-sm text-gray-500 font-mono cursor-pointer hover:text-gold transition-colors whitespace-nowrap" onClick={() => copyToClipboard(mail.pass,"Pass")}>{mail.pass ||"---"}</td>
 <td className="py-3 px-6 text-sm text-gray-500 font-mono whitespace-nowrap">
 <TOTPDisplay secret={mail.twoFA ||""} compact onCopy={copyToClipboard} />
 </td>
 <td className="py-3 px-6 text-sm text-gray-500 font-bold cursor-pointer hover:text-gold transition-colors whitespace-nowrap" onClick={() => copyToClipboard(mail.phone ||"","SĐT")}>{mail.phone ||"---"}</td>
 <td className="py-3 px-6 whitespace-nowrap">
 {mail.otpLink ? (
 <a href={mail.otpLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-all flex items-center gap-1 font-bold text-sm cursor-pointer">Link OTP <ExternalLink size={12} /></a>
 ) : <span className="">---</span>}
 </td>
 <td className="py-3 px-6 text-center whitespace-nowrap">
 <select
 value={mail.workStatus ||"Chưa làm"}
 onChange={(e) => handleStaffMailStatusChange(mail.id, e.target.value)}
 className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase border outline-none cursor-pointer transition-all ${getStatusStyle(mail.workStatus ||"Chưa làm")}`}
 >
 <option value="Chưa làm" className="bg-zinc-900 text-white hover:bg-zinc-700">Chưa làm</option>
 <option value="Đang xử lí" className="bg-zinc-900 text-white hover:bg-zinc-700">Đang xử lí</option>
 <option value="Đã làm" className="bg-zinc-900 text-white hover:bg-zinc-700">Đã làm</option>
 <option value="Lỗi" className="bg-zinc-900 text-white hover:bg-zinc-700">Lỗi</option>
 </select>
 </td>
 <td className="py-3 px-6 text-center whitespace-nowrap">
 <button
 onClick={() => setSelectedMailForModal(mail)}
 className="px-4 py-1 rounded-xl bg-gold/10 hover:bg-gold hover:text-sidebar text-gold border border-white/0 text-[10px] font-black uppercase tracking-widest transition-all"
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

if (user?.role === "03" || user?.role === "04" || user?.role === "05") {
  return (
    <div className="space-y-6 pb-20 relative">
      <AnimatePresence>
        {copyToast && (
          <motion.div initial={{ opacity: 0, y: -40, x: "-50%" }} animate={{ opacity: 1, y: 20, x: "-50%" }} exit={{ opacity: 0, y: -40, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[500] bg-gold px-6 py-2.5 rounded-full text-sidebar font-black text-base shadow-2xl flex items-center gap-2">
            <CheckCircle2 size={18} /> {copyToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timekeeping Modal */}
      <AnimatePresence>
        {timekeepingModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[600] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 border border-white/0 rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
              <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center border mb-6 shadow-lg ${timekeepingModal.type === "in" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
                <CheckCircle2 size={40} className="animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-white uppercase tracking-tight mb-3">{timekeepingModal.type === "in" ? "Check-in thành công" : "Check-out thành công"}</h3>
              <p className="text-gray-400 font-medium leading-relaxed mb-6">Bạn đã check {timekeepingModal.type === "in" ? "in" : "out"} lúc <span className="text-gold font-bold font-mono text-lg">{timekeepingModal.time}</span>.</p>
              <button onClick={() => setTimekeepingModal(null)} className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-zinc-50 font-bold rounded-xl transition-colors mt-4">Xác nhận</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Activity className="text-gold" size={32} />
            Bảng điều khiển nhân viên
          </h1>
          <p className="text-sm text-gray-500 font-medium uppercase tracking-widest mt-1">
            Chào mừng trở lại, <span className="text-gold font-bold">{user?.name}</span>
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleCheckIn}
            disabled={!!checkInTime}
            className={`h-12 px-6 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
              !checkInTime 
              ?"bg-gold text-sidebar hover:bg-white shadow-lg shadow-gold/20" 
              :"bg-white/5 text-gray-500 cursor-not-allowed border border-white/5"
            }`}
          >
            Check-in
          </button>
          <button
            onClick={handleCheckOut}
            disabled={!checkInTime || !!checkOutTime}
            className={`h-12 px-6 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
              checkInTime && !checkOutTime 
              ?"bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20" 
              :"bg-white/5 text-gray-500 cursor-not-allowed border border-white/5"
            }`}
          >
            Check-out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Giờ Check-in" 
          value={checkInTime ? new Date(checkInTime).toLocaleTimeString("vi-VN") : "---"} 
          icon={<Clock size={32} />} 
          color="blue" 
          subtitle="Thời gian bắt đầu làm việc" 
        />
        <StatCard 
          title="Giờ Check-out" 
          value={checkOutTime ? new Date(checkOutTime).toLocaleTimeString("vi-VN") : "---"} 
          icon={<LogOut size={32} />} 
          color="red" 
          subtitle="Thời gian kết thúc làm việc" 
        />
        <StatCard 
          title="Tổng Task hôm nay" 
          value={stats.myTasks || 0} 
          icon={<ClipboardList size={32} />} 
          color="indigo" 
          subtitle="Nhiệm vụ cần hoàn thành" 
          onClick={() => router.push("/admin/tasks")}
        />
        <StatCard 
          title="Tổng Mail hôm nay" 
          value={stats.myMails || 0} 
          icon={<Mail size={32} />} 
          color="gold" 
          subtitle="Mail đã xử lý trong ngày" 
        />
        <StatCard 
          title="Mail Live" 
          value={stats.liveMails || 0} 
          icon={<CheckCircle2 size={32} />} 
          color="green" 
          subtitle="Tài khoản đang hoạt động" 
        />
        <StatCard 
          title="Mail Die" 
          value={stats.dieMails || 0} 
          icon={<XCircle size={32} />} 
          color="red" 
          subtitle="Tài khoản bị lỗi" 
        />
      </div>
    </div>
  );
 }

return (
 <div className="space-y-6 pb-24 relative">
 <AnimatePresence>
 {showSuccess && (
 <motion.div
 initial={{ opacity: 0, y: -100, x:"-50%" }} animate={{ opacity: 1, y: 20, x:"-50%" }} exit={{ opacity: 0, y: -100, x:"-50%" }}
 className="fixed top-0 left-1/2 z-[100] bg-sidebar border border-green-500/50 p-5 rounded-[24px] shadow-2xl flex items-center gap-4 min-w-[400px]"
 >
 <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center text-sidebar"><CheckCircle2 size={28} /></div>
 <div>
 <p className="text-sm font-bold text-green-500 uppercase tracking-widest">Thành công</p>
 <p className="text-base font-black text-white">Đã xác nhận và cập nhật KPI cho toàn hệ thống!</p>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 <AnimatePresence>
 {copyToast && (
 <motion.div
 initial={{ opacity: 0, y: -100, x:"-50%" }} animate={{ opacity: 1, y: 20, x:"-50%" }} exit={{ opacity: 0, y: -100, x:"-50%" }}
 className="fixed top-0 left-1/2 z-[500] bg-gold px-6 py-2.5 rounded-full text-sidebar font-black text-base shadow-2xl flex items-center gap-2"
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
 className="fixed inset-0 z-[600] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
 >
 <motion.div
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 className="bg-zinc-900 border border-white/0 rounded-2xl p-8 w-full max-w-md shadow-2xl text-center relative"
 >
 <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center border mb-6 shadow-lg ${
 timekeepingModal.type ==="in" 
 ?"bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/10" 
 :"bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-yellow-500/10"
 }`}>
 <CheckCircle2 size={40} className="animate-pulse" />
 </div>
 <h3 className="text-2xl font-bold text-white uppercase tracking-tight mb-3">
 {timekeepingModal.type ==="in" ?"Check-in thành công" :"Check-out thành công"}
 </h3>
 <p className="text-gray-400 font-medium leading-relaxed mb-6">
 Bạn đã check {timekeepingModal.type ==="in" ?"in" :"out"} lúc <span className="text-gold font-bold font-mono text-lg">{timekeepingModal.time}</span>.
 </p>
 
 {timekeepingModal.warning && (
 <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-6 flex items-start gap-3 text-left">
 <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
 <div>
 <p className="text-sm font-black text-red-400 uppercase tracking-widest">Cảnh báo thiếu giờ</p>
 <p className="text-sm text-gray-300 font-medium leading-relaxed mt-1">{timekeepingModal.warning}</p>
 </div>
 </div>
 )}

 <button
 onClick={() => setTimekeepingModal(null)}
 className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-zinc-50 font-bold rounded-xl transition-colors mt-4"
 >
 Xác nhận
 </button>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {isHRManager ? (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-1">
 <StatCard title="Nhân viên Online" value={stats.staffOnline} icon={<Users size={32} />} color="purple" subtitle="Đang làm việc" onClick={() => setSelectedViewType("STAFF")} />
 </div>
 <div className="lg:col-span-2 rounded-[32px] border border-white/0 bg-sidebar p-8 shadow-2xl overflow-hidden relative group min-h-[350px]">
 <div className="absolute top-0 right-0 h-48 w-48 bg-purple-500/5 blur-[80px] -mr-24 -mt-24 transition-all group-hover:bg-purple-500/10" />
 <div className="relative z-10 flex items-center justify-between mb-6">
 <div>
 <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
 <ClipboardCheck size={28} className="text-purple-400" />
 Lịch trực nhật & Ca trực
 </h2>
 <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">Phân công vệ sinh & trực văn phòng</p>
 </div>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="text-gray-500 border-b border-white/0 uppercase text-[10px] font-black tracking-widest">
 <th className="pb-4 px-2">Thứ</th>
 <th className="pb-4 px-2">Nhân viên</th>
 <th className="pb-4 px-2">Khu vực</th>
 <th className="pb-4 px-2">Trạng thái</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {[
 { day:"Thứ Hai", name:"Nguyễn Văn A", area:"Khu vực làm việc 1", status:"Hoàn thành" },
 { day:"Thứ Ba", name:"Trần Thị B", area:"Khu vực Pantry", status:"Chờ thực hiện" },
 { day:"Thứ Tư", name:"Lê Văn C", area:"Phòng họp lớn", status:"Chờ thực hiện" },
 ].map((row, i) => (
 <tr key={`schedule-${i}`} className="group hover:bg-zinc-800/50 bg-zinc-900/[0.02]">
 <td className="py-4 px-2 text-base font-bold text-white">{row.day}</td>
 <td className="py-4 px-2 text-base font-medium text-gray-400">{row.name}</td>
 <td className="py-4 px-2 text-base text-gray-500">{row.area}</td>
 <td className="py-4 px-2">
 <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${row.status ==="Hoàn thành" ?"bg-green-500/10 text-green-500" :"bg-yellow-500/10 text-yellow-500"}`}>
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
 <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdminOrManager ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-6 mb-6`}>
 {isAdminOrManager ? (
 <>
 <StatCard title="Tổng kho Mail" value={stats.totalMail} icon={<Mail size={32} />} color="blue" subtitle="Tất cả kho dữ liệu" onClick={() => router.push("/admin/mail/all")} />
 <StatCard title="Kênh đã BKT" value={stats.mailMonetized} icon={<DollarSign size={32} />} color="gold" subtitle="Mail kiếm tiền" onClick={() => router.push("/admin/mail/monetized")} />
 <StatCard title="Task hôm nay" value={stats.tasksToday} icon={<ClipboardList size={32} />} color="indigo" subtitle="Theo dõi nhiệm vụ" onClick={() => setSelectedViewType("TASKS")} />
 <StatCard title="Quỹ tiền phạt" value={stats?.totalFines ? `${stats.totalFines.toLocaleString('vi-VN')}đ` :"0đ"} icon={<AlertTriangle size={32} />} color="red" subtitle="Quỹ đi muộn" onClick={() => {}} />
 <StatCard title="Nhân sự Online" value={stats.staffOnline} icon={<Users size={32} />} color="green" subtitle="Đang làm việc" onClick={() => setSelectedViewType("STAFF")} />
 </>
 ) : (
 <>
 <StatCard title="Số Task hôm nay" value={stats.tasksToday} icon={<ClipboardList size={32} />} color="blue" subtitle="Nhiệm vụ cần xử lý" onClick={() => setSelectedViewType("TASKS")} />
 <StatCard title="Lô đang làm" value={selectedStaffTask?.mailRange ||"---"} icon={<Database size={32} />} color="indigo" subtitle="Lô mail phân công" onClick={() => setSelectedViewType("TASKS")} />
 <StatCard title="Số kênh đủ giờ" value={stats.mailWatchHours || 0} icon={<Target size={32} />} color="gold" subtitle="Đã đủ điều kiện" onClick={() => setIsEligibleChannelsModalOpen(true)} />
 <StatCard title="Bảng Tin Nội Bộ" value={(posts || []).length || 0} icon={<MessageSquare size={32} />} color="purple" subtitle="Cập nhật tin tức" onClick={() => router.push("/admin/newsfeed")} />
 </>
 )}
 </div>

 <div className="grid grid-cols-1 gap-6">
 {/* Live/Die Stats - Grid Style */}
 <div className="rounded-2xl border border-white/0 bg-zinc-900/80 p-6 flex items-center justify-around shadow-lg backdrop-blur-md">
 <div 
 onClick={() => setSelectedViewType("LIVE")}
 className="flex flex-col items-center gap-2 cursor-pointer group transition-all"
 >
 <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20 group-hover:bg-green-500 group-hover:text-zinc-900 transition-colors shadow-lg"><CheckCircle2 size={28} /></div>
 <div className="text-center"><p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mail Hoạt Động</p><h4 className="text-xl font-black text-green-400 uppercase tracking-tighter">{stats.mailLive}</h4></div>
 </div>
 <div className="h-20 w-px bg-zinc-800" />
 <div 
 onClick={() => setSelectedViewType("DIE")}
 className="flex flex-col items-center gap-2 cursor-pointer group transition-all"
 >
 <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 group-hover:bg-red-500 group-hover:text-zinc-900 transition-colors shadow-lg"><XCircle size={28} /></div>
 <div className="text-center"><p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mail Bị Lỗi</p><h4 className="text-xl font-black text-red-400 uppercase tracking-tighter">{stats.mailDie}</h4></div>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
 <motion.div className="xl:col-span-2 rounded-[32px] border border-white/0 bg-sidebar p-8 shadow-2xl relative overflow-hidden group">
 <div className="absolute top-0 right-0 h-48 w-48 bg-gold/5 blur-[80px] -mr-24 -mt-24 transition-all group-hover:bg-gold/10" />
 <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
 <div><h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter uppercase"><TrendingUp size={32} className="text-gold" /> KPI Hệ Thống</h2><p className="text-gray-500 mt-1 font-medium text-base">Thiết lập mục tiêu và theo dõi tiến độ công việc</p></div>
 <div className={`flex flex-wrap items-center gap-4`}>
 <div className={`flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/0 ${!isAdminOrManager ?"opacity-75" :""}`}>
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-2">Từ</span>
 <input 
 type="date" 
 value={kpi.startDate ||""} 
 disabled={!isAdminOrManager} 
 onChange={(e) => setKpi({ ...kpi, startDate: e.target.value })} 
 className="bg-black/40 text-white text-sm font-black p-2 rounded-xl outline-none border border-white/0 focus:border-white/5 transition-all cursor-pointer" 
 />
 </div>
 <ChevronRight size={14} className="text-gray-500" />
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Đến</span>
 <input 
 type="date" 
 value={kpi.endDate ||""} 
 disabled={!isAdminOrManager} 
 onChange={(e) => setKpi({ ...kpi, endDate: e.target.value })} 
 className="bg-black/40 text-white text-sm font-black p-2 rounded-xl outline-none border border-white/0 focus:border-white/5 transition-all cursor-pointer" 
 />
 </div>
 </div>
 {isAdminOrManager && (
 <button 
 onClick={handleSaveKPI} 
 className="h-12 px-6 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl shadow-gold/20 flex items-center gap-2"
 >
 <CheckCircle2 size={18} /> Xác nhận
 </button>
 )}
 </div>
 </div>
 <div className={`grid gap-8 ${isAdminOrManager ?"grid-cols-1 xl:grid-cols-2" :"grid-cols-1"}`}>
 {isAdminOrManager && !(user?.role ==="03" || user?.role ==="04" || user?.role ==="05") && (
 <KPIInputCard label="Kênh bật kiếm tiền" target={kpi.targetMonetized} current={kpi.currentMonetized} onChange={(val: any) => setKpi({ ...kpi, targetMonetized: val })} unit="kênh" readonly={false} />
 )}
 <div className={!isAdminOrManager ?"max-w-md mx-auto w-full" :""}>
 <KPIInputCard label="Kênh đủ giờ" target={kpi.targetWatchHours} current={kpi.currentWatchHours} onChange={(val: any) => setKpi({ ...kpi, targetWatchHours: val })} unit="kênh" readonly={!isAdminOrManager} />
 </div>
 </div>
 </motion.div>
 <div className="flex flex-col gap-6">
 {/* Approval Center Card */}
 {isAdminOrManager && (
 <div className="rounded-[32px] border border-white/0 bg-sidebar p-6 shadow-2xl relative overflow-hidden group text-left">
 <div className="absolute top-0 right-0 h-32 w-32 bg-gold/5 blur-[50px] pointer-events-none" />
 
 <div className="flex items-center justify-between mb-4 relative z-10">
 <h3 className="text-base font-bold text-white uppercase tracking-normal flex items-center gap-2">
 <ShieldAlert className="text-gold" size={18} />
 Yêu cầu truy cập ngoài giờ
 </h3>
 <span className="bg-gold/10 text-gold border border-white/0 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
 {(pendingRequests || []).length} Đang chờ
 </span>
 </div>

 <div className="space-y-4 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
 {(pendingRequests || []).length > 0 ? (
 (pendingRequests || []).map((req: any) => (
 <div key={`req-card-${req.id}`} className="bg-white/0 border border-white/0 rounded-2xl p-6 flex flex-col gap-3 hover:border-white/0 transition-all">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-sm font-semibold text-white">{req.staffName}</p>
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
 <div className="py-8 text-center text-sm font-bold uppercase tracking-widest leading-relaxed">
 Không có yêu cầu nào cần duyệt
 </div>
 )}
 </div>
 </div>
 )}

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
 className="fixed inset-0 z-[400] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
 >
 <motion.div 
 initial={{ scale: 0.95, y: 20 }} 
 animate={{ scale: 1, y: 0 }} 
 className="bg-sidebar border border-white/0 w-full max-w-4xl rounded-[40px] p-10 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col max-h-[85vh]"
 >
 <div className="absolute top-0 right-0 h-96 w-96 bg-gold/5 blur-[120px] -mr-48 -mt-48" />

 <div className="flex items-center justify-between mb-8 relative z-10">
 <div className="flex items-center gap-4">
 <div className="h-14 w-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shadow-lg">
 <Target size={28} />
 </div>
 <div>
 <h2 className="text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
 Danh sách Kênh Đủ Giờ
 </h2>
 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Tổng hợp kênh vệ tinh đạt điều kiện và trạng thái gửi thư mời</p>
 </div>
 </div>
 <button 
 onClick={() => setIsEligibleChannelsModalOpen(false)} 
 className="h-10 w-10 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center border border-white/0 transition-all"
 >
 <X size={20} />
 </button>
 </div>

 <div className="overflow-auto flex-1 custom-scrollbar relative z-10 space-y-6">
 {(() => {
 const eligibleMails = (mails || []).filter((m: any) => m.type ==="SATELLITE" && Array.isArray(m.eligibleChannels) && m.eligibleChannels.some(Boolean));
 if ((eligibleMails || []).length === 0) {
 return <div className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest bg-black/10 rounded-3xl border border-white/0">Không có kênh nào đủ điều kiện hiện tại</div>;
 }
 
 const byBatch = eligibleMails.reduce((acc: any, m: any) => {
 const b = m.batchName ||"Chưa phân lô";
 if (!acc[b]) acc[b] = [];
 acc[b].push(m);
 return acc;
 }, {});

 return Object.entries(byBatch).map(([batchName, bMails]: [string, any]) => {
 const channelsInBatch = bMails.flatMap((m: any) => {
 const activeChannels = [];
 for (let i = 0; i < 3; i++) {
 if (m.eligibleChannels[i] && m.links && m.links[i]) {
 activeChannels.push({
 stt: `${m.id - 1000}.${i + 1}`,
 mailEmail: m.email,
 name: m.channelNames && m.channelNames[i] ? m.channelNames[i] : `Kênh vệ tinh #${i + 1}`,
 link: m.links[i],
 mailId: m.id,
 chIdx: i,
 inviteStatus: (m.inviteStatuses && m.inviteStatuses[i]) ? m.inviteStatuses[i] :"Chưa mời"
 });
 }
 }
 return activeChannels;
 });

 return (
 <div key={batchName} className="border border-white/0 rounded-3xl bg-black/10 overflow-hidden">
 <div className="bg-[#0d0d0d] border-b border-white/0 p-4 flex items-center justify-between">
 <h3 className="text-base font-bold text-white uppercase tracking-tight">Lô: <span className="text-gold">{batchName}</span></h3>
 </div>
 <table className="w-full text-left whitespace-nowrap">
 <thead className="bg-[#0a0a0a] border-b border-white/0">
 <tr className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
 <th className="py-3 px-6 w-16">STT</th>
 <th className="py-3 px-6">Email Gốc</th>
 <th className="py-3 px-6">Tên kênh</th>
 <th className="py-3 px-6">Link kênh</th>
 <th className="py-3 px-6 text-center">Trạng thái mời</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-gray-300">
 {(channelsInBatch || []).map((row: any, idx: number) => (
 <tr key={`${row.mailId}-${row.chIdx}-${idx}`} className="hover:bg-zinc-800/50 bg-zinc-900/[0.02] transition-colors group">
 <td className="py-3 px-6 text-[10px] font-black text-gray-500">{row.stt}</td>
 <td className="py-3 px-6 text-sm text-white font-bold">{row.mailEmail}</td>
 <td className="py-3 px-6 font-bold text-gold uppercase tracking-tighter text-[10px]">
 {row.name.replace("Tên kênh:","")}
 </td>
 <td className="py-3 px-6 text-sm text-gray-400 font-mono">
 <a 
 href={row.link} 
 target="_blank" 
 rel="noreferrer" 
 className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 underline font-bold"
 >
 <span>{(row.link || []).length > 25 ? `${row.link.substring(0, 25)}...` : row.link}</span>
 <ExternalLink size={12} />
 </a>
 </td>
 <td className="py-3 px-6 text-center">
 <select 
 value={row.inviteStatus}
 onChange={(e) => handleInviteStatusChange(row.mailId, row.chIdx, e.target.value)}
 className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-2xl outline-none border transition-all cursor-pointer ${
 row.inviteStatus ==="Đã mời" 
 ?"bg-green-500/10 text-green-500 border-green-500/20" 
 :"bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
 }`}
 >
 <option value="Chưa mời" className="bg-zinc-900 text-white hover:bg-zinc-700">Chưa mời</option>
 <option value="Đã mời" className="bg-zinc-900 text-white hover:bg-zinc-700">Đã mời</option>
 </select>
 </td>
 </tr>
 ))}
 </tbody>
 <tfoot className="bg-[#0a0a0a] border-t border-white/0">
 <tr>
 <td colSpan={5} className="py-4 px-6 text-right">
 <span className="text-sm font-black text-gray-400 uppercase tracking-widest">
 Tổng kênh đủ giờ của lô: <span className="text-gold text-base">{(channelsInBatch || []).length} kênh</span>
 </span>
 </td>
 </tr>
 </tfoot>
 </table>
 </div>
 );
 });
 })()}
 </div>

 <div className="mt-8 relative z-10 pt-4 border-t border-white/0 text-right">
 <button 
 onClick={() => setIsEligibleChannelsModalOpen(false)} 
 className="h-14 px-8 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase text-sm tracking-wider transition-all"
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
 blue:"text-blue-400 bg-blue-500/10 border-blue-500/20 group-hover:border-blue-500/50",
 green:"text-green-400 bg-green-500/10 border-green-500/20 group-hover:border-green-500/50",
 red:"text-red-400 bg-red-500/10 border-red-500/20 group-hover:border-red-500/50",
 gold:"text-amber-500 bg-amber-500/10 border-amber-500/20 group-hover:border-amber-500/50",
 purple:"text-purple-400 bg-purple-500/10 border-purple-500/20 group-hover:border-purple-500/50",
 indigo:"text-indigo-400 bg-indigo-500/10 border-indigo-500/20 group-hover:border-indigo-500/50",
 };
 return (
 <motion.div 
 whileHover={{ y: -4 }} 
 onClick={onClick} 
 className={`group rounded-2xl border border-white/0 bg-zinc-900/80 backdrop-blur-md p-6 transition-all hover:shadow-2xl hover:border-zinc-700/80 ${onClick ? 'cursor-pointer hover:bg-zinc-800/60' : ''}`}
 >
 <div className="flex items-center justify-between mb-4">
 <div className={`p-6 rounded-xl border transition-all shrink-0 ${colors[color] || colors.blue}`}>{icon}</div>
 <div className="text-right min-w-0 flex-1 ml-4">
 <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1 truncate" title={title}>{title}</p>
 <h3 className="text-2xl xl:text-3xl font-black text-zinc-50 tracking-tighter truncate" title={String(value)}>{typeof value ==="number" ? value.toLocaleString() : value}</h3>
 </div>
 </div>
 <div className="flex items-center justify-between pt-4 border-t border-white/0 mt-4">
 <span className="text-sm font-medium text-zinc-500 group-hover:text-zinc-400 transition-colors">{subtitle}</span>
 <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] group-hover:scale-125 transition-transform" />
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
 <span className="text-sm font-black text-gold whitespace-nowrap leading-none mb-0.5">{percent}% Hoàn thành</span>
 </div>
 <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/0 shadow-inner flex-shrink-0">
 <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 1, ease:"easeOut" }} className="absolute h-full bg-gradient-to-r from-gold/50 to-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
 </div>
 <div className="flex items-center gap-4 mt-auto">
 <div className="flex-1 space-y-2">
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block ml-1">Tiến độ hiện tại</label>
 <div className="h-14 w-full rounded-2xl bg-white/5 border border-white/0 flex items-center px-4 text-white font-bold text-base shadow-sm">{current} {unit}</div>
 </div>
 <div className="flex-1 space-y-2">
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block ml-1">Mục tiêu (Admin)</label>
 {readonly ? (
 <div className="h-14 w-full rounded-2xl bg-gold/5 border border-gold/10 px-4 flex items-center text-gold/50 font-black text-base">{target}</div>
 ) : (
 <input type="number" value={target ||""} onChange={(e) => { const val = e.target.value ==="" ? 0 : parseInt(e.target.value); onChange(val); }} className="h-14 w-full rounded-2xl bg-gold/10 border border-white/0 px-4 text-gold font-black focus:outline-none focus:border-gold text-base transition-all shadow-lg shadow-gold/5" />
 )}
 </div>
 </div>
 </div>
 );
}
