"use client";

import React, { useEffect, useState } from"react";
import { Search, Bell, Menu, User, PanelLeftClose, PanelLeftOpen, LogOut, UserSearch, UserPlus, CheckCircle2, Sun, Moon, X } from"lucide-react";
import { motion, AnimatePresence } from"framer-motion";
import { useRouter } from"next/navigation";
interface HeaderProps {
 isCollapsed: boolean;
 onToggle: () => void;
 onOpenProfile: () => void;
 user: any;
 windowWidth?: number;
}

const Header = ({ isCollapsed, onToggle, onOpenProfile, user, windowWidth }: HeaderProps) => {
 const router = useRouter();
 const [mounted, setMounted] = useState(false);
 const [isProfileOpen, setIsProfileOpen] = useState(false);
 const [isNotifOpen, setIsNotifOpen] = useState(false);
 const [notifications, setNotifications] = useState<any[]>([]);
 const [showAllNotificationsModal, setShowAllNotificationsModal] = useState(false);
 const [notifTab, setNotifTab] = useState<"UNREAD" |"READ">("UNREAD");
 const [dateTimeStr, setDateTimeStr] = useState("");

 const safeText = (value: unknown) => {
   if (value === null || value === undefined) return "";
   if (typeof value === "object") return "";
   return String(value);
 };

 useEffect(() => {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setMounted(true);
 }, []);

 // Real-time Date and Time Widget
 useEffect(() => {
 const updateTime = () => {
 const now = new Date();
 const hh = String(now.getHours()).padStart(2,"0");
 const mm = String(now.getMinutes()).padStart(2,"0");
 const ss = String(now.getSeconds()).padStart(2,"0");
 
 const day = String(now.getDate()).padStart(2,"0");
 const month = String(now.getMonth() + 1).padStart(2,"0");
 const year = now.getFullYear();
 
 const days = ["CN","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"];
 const dayName = days[now.getDay()];
 
 setDateTimeStr(`${dayName}, ${day}/${month}/${year} - ${hh}:${mm}:${ss}`);
 };
 updateTime();
 const interval = setInterval(updateTime, 1000);
 return () => clearInterval(interval);
 }, []);

 useEffect(() => {
 const loadNotifs = async () => {
 let stored = [];
 try {
 const res = await fetch('/api/admin/notifications');
 if (res.ok) stored = await res.json();
 } catch(err) {}
 const roleUpper = String(user?.role ||"").toUpperCase();
 const isAuthorizedManager = roleUpper ==="01" || roleUpper ==="02" || roleUpper ==="ADMIN" || roleUpper ==="QUẢN LÝ CÔNG VIỆC" || roleUpper ==="QL CÔNG VIỆC";
 let accessNotifs: any[] = [];
 if (isAuthorizedManager) {
 const accessReqs = JSON.parse(localStorage.getItem("pending_access_requests") ||"[]");
 accessNotifs = (accessReqs || []).map((req: any) => ({
 id: `access-${req.id}`,
 title:"Yêu cầu truy cập ngoài giờ",
 message: `Nhân viên ${req.staffName} đang xin phép vào hệ thống.`,
 time: req.time,
 type:"ACCESS_REQUEST",
 read: false,
 data: req
 }));
 }
 setNotifications([...stored, ...accessNotifs]);
 };

 loadNotifs();
 const interval = setInterval(loadNotifs, 3000); 
 
 const handleStorage = (e: StorageEvent) => {
 if (e.key ==="admin_notifications" || e.key ==="pending_access_requests" || e.key ==="request_trigger") loadNotifs();
 };
 window.addEventListener("storage", handleStorage);
 
 return () => {
 clearInterval(interval);
 window.removeEventListener("storage", handleStorage);
 };
 }, [user?.role]);

 const filteredNotifications = (notifications || []).filter(n => {
 if (n.type ==="REGISTRATION") {
 const roleUpper = String(user?.role ||"").toUpperCase();
 return roleUpper ==="01" || roleUpper ==="02" || roleUpper ==="ADMIN" || roleUpper ==="QUẢN LÝ CÔNG VIỆC" || roleUpper ==="QL CÔNG VIỆC";
 }
 return !n.targetUsername || n.targetUsername?.toLowerCase() === user?.username?.toLowerCase();
 });

 const uniqueNotifications = (filteredNotifications || []).filter((n, index, self) =>
 index === self.findIndex((t) => t.id === n.id)
 );

 const unreadCount = (uniqueNotifications || []).filter(n => !n.read).length;

 const markAllRead = () => {
 const updated = (notifications || []).map(n => {
 if (!n.targetUsername || n.targetUsername.toLowerCase() === user?.username?.toLowerCase()) {
 return { ...n, read: true };
 }
 return n;
 });
 setNotifications(updated);
 const persistable = (updated || []).filter(n => !String(n.id).startsWith("access-"));
 localStorage.setItem("admin_notifications", JSON.stringify(persistable));
 window.dispatchEvent(new Event("storage"));
 };

 const markSingleAsRead = (id: string) => {
 const updated = (notifications || []).map(n => {
 if (n.id === id) {
 return { ...n, read: true };
 }
 return n;
 });
 setNotifications(updated);
 const persistable = (updated || []).filter(n => !String(n.id).startsWith("access-"));
 localStorage.setItem("admin_notifications", JSON.stringify(persistable));
 window.dispatchEvent(new Event("storage"));
 };

 const handleNotificationClick = (notif: any) => {
 // Mark as read
 markSingleAsRead(notif.id);
 
 if (notif.type ==="REGISTRATION") {
 router.push("/admin/staff?tab=pending");
 } else if (notif.type ==="NEWSFEED") {
 if (notif.postId) {
 localStorage.setItem("highlighted_post_id", notif.postId);
 }
 router.push("/admin/newsfeed");
 } else if (notif.type ==="TASK" || notif.type ==="SATELLITE_ASSIGNMENT") {
 router.push("/admin/mail/satellite-batches");
 }
 setIsNotifOpen(false);
 };

 const getRoleLabel = (role?: string) => {
 const r = String(role ||"").toUpperCase();
 if (r ==="01" || r ==="ADMIN") return"ADMIN";
 if (r ==="02" || r ==="QL CÔNG VIỆC" || r ==="QUẢN LÝ CÔNG VIỆC") return"QL CÔNG VIỆC";
 if (r ==="03" || r ==="QL NHÂN SỰ" || r ==="QUẢN LÝ NHÂN SỰ") return"QL NHÂN SỰ";
 if (r ==="04" || r ==="NHÂN VIÊN") return"NHÂN VIÊN";
 if (r ==="05" || r ==="NV THỬ VIỆC") return"NV THỬ VIỆC";
 return"GUEST";
 };

 const handleLogout = () => {
 sessionStorage.removeItem("user");
 localStorage.removeItem("user");
 window.location.href ="/login";
 };

 return (
 <>
 <motion.header 
 animate={{ width: isCollapsed ? `calc(100% - ${windowWidth && windowWidth < 640 ? 70 : 100}px)` :"calc(100% - 320px)" }}
 className="fixed top-0 right-0 z-30 flex h-20 items-center justify-between border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md px-4 sm:px-10"
 >
 <div className="flex items-center gap-8 flex-1">
 <button 
 onClick={onToggle}
 className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-white/5 text-gray-500 hover:text-gold hover:border-gold transition-all shadow-lg"
 >
 {isCollapsed ? <PanelLeftOpen size={24} /> : <PanelLeftClose size={24} />}
 </button>

 <div className="hidden sm:flex w-full max-w-xl items-center gap-4">
 <div className="relative w-full group">
 <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" />
 <input
 type="text"
 placeholder="Tìm kiếm nội dung..."
 className="h-14 w-full rounded-2xl border border-white/5 bg-white/[0.03] pl-12 pr-6 text-base text-white placeholder-gray-600 transition-all focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/5"
 />
 </div>
 </div>
 </div>

 <div className="flex items-center gap-6">
 {/* Real-time DateTime Widget (merged and cleaned) */}
 <div className="hidden xl:flex items-center gap-3 px-6 border-l border-white/5 h-10">
 <div className="flex flex-col items-end">
 <span className="text-[10px] font-black text-gold uppercase tracking-[0.2em] leading-none mb-1">Thời gian hệ thống</span>
 <div className="flex items-center gap-2">
 <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
 <span className="text-base font-black text-white font-mono tracking-wider">{dateTimeStr}</span>
 </div>
 </div>
 </div>

 {/* Notifications Dropdown */}
 <div className="relative">
 <button 
 onClick={() => {
 setIsNotifOpen(!isNotifOpen);
 }}
 className="relative flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 transition-all hover:bg-white bg-zinc-900/5 hover:text-gold border border-transparent hover:border-gray-200 hover:border-white/5"
 >
 <Bell size={20} />
 {unreadCount > 0 && (
 <span className="absolute -top-1.5 -right-1.5 flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white border-2 border-white border-[#0a0a0a] shadow-md animate-pulse">
 {unreadCount > 9 ? '9+' : unreadCount}
 </span>
 )}
 </button>

 <AnimatePresence>
 {isNotifOpen && (
 <>
 <div className="fixed inset-0 z-10" onClick={() => setIsNotifOpen(false)} />
 <motion.div
 initial={{ opacity: 0, y: 10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 10, scale: 0.95 }}
 className="absolute right-0 top-full mt-4 z-20 w-80 rounded-[32px] border border-white/10 bg-gray-900 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-fade-in"
 >
 <div className="flex items-center justify-between mb-4 px-2">
 <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Thông báo</p>
 <button onClick={markAllRead} className="text-[10px] font-black text-gold hover:underline uppercase">Đọc tất cả</button>
 </div>
 
 <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
 {(uniqueNotifications || []).length > 0 ? (
 (uniqueNotifications || []).map((n) => (
 <div 
 key={n.id} 
 onClick={() => {
 markSingleAsRead(n.id);
 handleNotificationClick(n);
 }}
 className={`p-6 rounded-2xl border transition-all cursor-pointer group flex flex-col ${
 !n.read 
 ?"bg-gold/5 border-gold/20 hover:bg-gold/10" 
 :" bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
 }`}
 >
 <div className="flex items-start gap-3">
 <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
 {n.type ==="REGISTRATION" ? <UserPlus size={18} className="text-gold" /> : <CheckCircle2 size={18} className="text-green-500" />}
 </div>
 <div className="flex-1">
 <p className="text-[11px] font-black text-white group-hover:text-gold transition-colors">{safeText(n.title)}</p>
 <p className="text-[10px] text-gray-500 font-bold mt-1 leading-relaxed">{safeText(n.message)}</p>
 <p className="text-[9px] font-black uppercase tracking-widest mt-2">{safeText(n.time)}</p>
 </div>
 </div>
 </div>
 ))
 ) : (
 <div className="py-10 text-center">
 <p className="text-sm font-bold italic">Không có thông báo mới</p>
 </div>
 )}
 </div>

 {/* View All Notifications Button */}
 <div className="border-t border-white/5 pt-3 mt-3">
 <button 
 onClick={() => {
 setIsNotifOpen(false);
 setShowAllNotificationsModal(true);
 }}
 className="w-full h-11 rounded-xl bg-gold/10 border border-gold/20 text-gold text-sm font-black uppercase tracking-widest hover:bg-gold/20 transition-all flex items-center justify-center gap-2"
 >
 Xem tất cả thông báo
 </button>
 </div>
 </motion.div>
 </>
 )}
 </AnimatePresence>
 </div>

 {/* User Profile */}
 <div className="relative flex items-center gap-4 pl-8 border-l border-white/5">
 <div className="text-right hidden lg:block overflow-hidden">
 <p className="text-base font-black text-white leading-none uppercase tracking-tighter">{safeText(user?.name) || "Người dùng"}</p>
 <p className="text-[10px] font-black text-gold mt-1.5 uppercase tracking-[0.2em]">{getRoleLabel(user?.role)}</p>
 </div>
 
 <div 
 onClick={() => setIsProfileOpen(!isProfileOpen)}
 className="h-11 w-11 rounded-xl border border-white/10 bg-white/[0.05] p-0.5 flex items-center justify-center overflow-hidden cursor-pointer hover:border-gold/50 hover:bg-gold/5 transition-all shadow-xl active:scale-95"
 >
 {user?.avatar ? (
 <img src={user?.avatar} className="h-full w-full object-cover rounded-lg" onError={(e) => e.currentTarget.src ="https://ui-avatars.com/api/?name=" + (user?.name ||"U") +"&background=d4af37&color=000"} />
 ) : (
 <div className="h-full w-full rounded-lg bg-zinc-900 flex items-center justify-center text-gold">
 <User size={20} />
 </div>
 )}
 </div>

 <AnimatePresence>
 {isProfileOpen && (
 <>
 <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
 <motion.div
 initial={{ opacity: 0, y: 10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 10, scale: 0.95 }}
 className="absolute right-0 top-full mt-4 z-20 w-64 rounded-3xl border border-white/10 bg-gray-900 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
 >
 <div className="p-4 border-b border-white/5 mb-2">
 <p className="text-[10px] font-black text-gold uppercase tracking-[0.3em]">{getRoleLabel(user?.role)}</p>
 <p className="text-base font-black text-white mt-1 uppercase truncate">{safeText(user?.name)}</p>
 <p className="text-[10px] font-bold mt-0.5 tracking-wider truncate">@{safeText(user?.username)}</p>
 </div>

 <button 
 onClick={() => {
 onOpenProfile();
 setIsProfileOpen(false);
 }}
 className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-widest text-gray-500 transition-colors hover:bg-white bg-zinc-900/5 hover:text-gold"
 >
 <UserSearch size={18} />
 Hồ sơ chi tiết
 </button>
 
 <div className="h-px bg-white/5 my-2" />
 
 <button 
 onClick={handleLogout}
 className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-widest text-red-500 transition-colors hover:bg-red-500/10"
 >
 <LogOut size={18} />
 Đăng xuất hệ thống
 </button>
 </motion.div>
 </>
 )}
 </AnimatePresence>
 </div>
 </div>
 </motion.header>

 {/* View All Notifications Modal */}
 <AnimatePresence>
 {showAllNotificationsModal && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[160] bg-white/90 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
 >
 <motion.div
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 className="bg-zinc-900 border border-white/10 rounded-[32px] p-8 w-full max-w-2xl shadow-2xl relative max-h-[85vh] flex flex-col"
 >
 <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
 <div className="flex items-center gap-3">
 <Bell className="text-gold" size={28} />
 <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Trung tâm thông báo</h3>
 </div>
 <div className="flex items-center gap-4">
 <button
 onClick={markAllRead}
 className="text-sm font-black text-gold hover:underline uppercase tracking-wider flex items-center gap-2 bg-gold/10 px-4 py-2 rounded-xl border border-gold/20 hover:bg-gold/20 transition-all"
 >
 Đọc tất cả
 </button>
 <button
 onClick={() => setShowAllNotificationsModal(false)}
 className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-gray-900 text-white hover:bg-white/10 transition-all"
 >
 <X size={20} />
 </button>
 </div>
 </div>

 {/* Tabs switcher */}
 <div className="flex gap-4 mb-6 bg-black/30 p-1.5 rounded-2xl border border-white/5">
 <button
 onClick={() => setNotifTab("UNREAD")}
 className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
 notifTab ==="UNREAD"
 ?"bg-gold text-sidebar shadow-lg shadow-gold/20 font-black"
 :" text-gray-400 hover:text-gray-900 text-white"
 }`}
 >
 Chưa đọc ({(uniqueNotifications || []).filter(n => !n.read).length})
 </button>
 <button
 onClick={() => setNotifTab("READ")}
 className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
 notifTab ==="READ"
 ?"bg-gold text-sidebar shadow-lg shadow-gold/20 font-black"
 :" text-gray-400 hover:text-gray-900 text-white"
 }`}
 >
 Đã đọc ({(uniqueNotifications || []).filter(n => n.read).length})
 </button>
 </div>

 {/* Notifications List */}
 <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
 {(notifTab ==="UNREAD"
 ? (uniqueNotifications || []).filter(n => !n.read)
 : (uniqueNotifications || []).filter(n => n.read)
 ).length > 0 ? (
 (notifTab ==="UNREAD"
 ? (uniqueNotifications || []).filter(n => !n.read)
 : (uniqueNotifications || []).filter(n => n.read)
 ).map((n) => (
 <div
 key={n.id}
 onClick={() => {
 markSingleAsRead(n.id);
 handleNotificationClick(n);
 if (n.type ==="REGISTRATION") {
 setShowAllNotificationsModal(false);
 }
 }}
 className={`p-5 rounded-2xl border transition-all cursor-pointer group flex items-start gap-4 ${
 !n.read
 ?"bg-gold/5 border-gold/20 hover:bg-gold/10"
 :" bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
 }`}
 >
 <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
 n.type ==="REGISTRATION" ?"bg-gold/20 text-gold" :"bg-green-500/20 text-green-400"
 }`}>
 {n.type ==="REGISTRATION" ? <UserPlus size={20} /> : <CheckCircle2 size={20} />}
 </div>
 <div className="flex-1">
 <div className="flex items-center justify-between">
 <p className="text-sm font-black text-white group-hover:text-gold transition-colors">{safeText(n.title)}</p>
 <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{safeText(n.time)}</span>
 </div>
 <p className="text-sm text-gray-400 mt-1.5 leading-relaxed font-medium">{safeText(n.message)}</p>
 {!n.read && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 markSingleAsRead(n.id);
 }}
 className="mt-3 text-[10px] font-black text-gold hover:underline uppercase tracking-widest"
 >
 Đánh dấu đã đọc
 </button>
 )}
 </div>
 </div>
 ))
 ) : (
 <div className="py-16 text-center border border-dashed border-white/5 rounded-2xl bg-black/10">
 <Bell className="mx-auto mb-3" size={40} />
 <p className="text-base font-bold italic">Không có thông báo nào trong mục này</p>
 </div>
 )}
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </>
 );
};

export default Header;
