"use client";

import React, { useEffect, useState } from "react";
import { Search, Bell, Menu, User, PanelLeftClose, PanelLeftOpen, LogOut, UserSearch, UserPlus, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import Pusher from "pusher-js";

interface HeaderProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onOpenProfile: () => void;
  user: any;
  windowWidth?: number;
}

const Header = ({ isCollapsed, onToggle, onOpenProfile, user, windowWidth }: HeaderProps) => {
  const router = useRouter();
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data: messagesData } = useSWR('/api/messages', fetcher, {
    refreshInterval: 10000, // Poll every 10 seconds
    dedupingInterval: 5000  // Dedup requests within 5 seconds
  });
  const messagesArray: any[] = Array.isArray(messagesData?.data)
    ? messagesData.data
    : Array.isArray(messagesData)
    ? (messagesData as any[])
    : [];
  const currentUser = user;
  const unreadMsgCount = messagesArray.filter((m) => !m.isRead && m.receiverId === currentUser?._id).length;

  const [mounted, setMounted] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showAllNotificationsModal, setShowAllNotificationsModal] = useState(false);
  const [notifTab, setNotifTab] = useState<"UNREAD" | "READ">("UNREAD");
  const [pendingApproveUser, setPendingApproveUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("04");
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [dateTimeStr, setDateTimeStr] = useState("");

  const safeText = (value: unknown) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return "";
    return String(value);
  };

  useEffect(() => {
    setMounted(true);
    
    // Subscribe to Pusher notifications
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1",
    });

    const notifChannel = pusher.subscribe("system-notifications");
    notifChannel.bind("new-notification", (notif: any) => {
      // Only process registration notifications for admins
      if (notif.type === "REGISTRATION") {
        const roleUpper = String(user?.role || "").toUpperCase();
        if (roleUpper === "01" || roleUpper === "02" || roleUpper === "ADMIN" || roleUpper === "QUẢN LÝ CÔNG VIỆC" || roleUpper === "QL CÔNG VIỆC") {
          mutate('/api/admin/notifications');
          // Add a local notification instantly
          setNotifications(prev => {
            if (prev.some(n => n.id === notif.id || n._id === notif._id)) return prev;
            return [{ ...notif, read: false }, ...prev];
          });
          
          // Custom toast or alert logic
          const audio = new Audio('/notification.mp3');
          audio.play().catch(e => {});

          // Auto-open approval modal if it's a registration
          fetch(`/api/admin/users/${notif.author}`, {
            headers: {
              'x-user-id': user?.id || user?._id || '',
              'x-user-role': user?.role || ''
            }
          }).then(res => res.json()).then(resData => {
            if (resData.success && resData.data) {
              setPendingApproveUser(resData.data);
              setSelectedRole("04");
            }
          }).catch(console.error);
        }
      } else if (!notif.targetUsername || notif.targetUsername?.toLowerCase() === user?.username?.toLowerCase()) {
        mutate('/api/admin/notifications');
        setNotifications(prev => {
          if (prev.some(n => n.id === notif.id || n._id === notif._id)) return prev;
          return [{ ...notif, read: false }, ...prev];
        });
      }
    });

    return () => {
      pusher.unsubscribe("system-notifications");
      pusher.disconnect();
    };
  }, [user]);

  // Real-time Date and Time Widget
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      
      const days = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      const dayName = days[now.getDay()];
      
      setDateTimeStr(`${dayName}, ${day}/${month}/${year} - ${hh}:${mm}:${ss}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Use SWR for notifications to optimize performance
  const { data: dbNotifs } = useSWR('/api/admin/notifications', fetcher, {
    refreshInterval: 30000,
    dedupingInterval: 10000
  });

  useEffect(() => {
    const loadLocalNotifs = () => {
      let adminNotifs = [];
      try {
        adminNotifs = JSON.parse(localStorage.getItem("admin_notifications") || "[]");
      } catch (err) {}

      const roleUpper = String(user?.role || "").toUpperCase();
      const isAuthorizedManager = roleUpper === "01" || roleUpper === "02" || roleUpper === "ADMIN" || roleUpper === "QUẢN LÝ CÔNG VIỆC" || roleUpper === "QL CÔNG VIỆC";
      let accessNotifs: any[] = [];
      if (isAuthorizedManager) {
        const accessReqs = JSON.parse(localStorage.getItem("pending_access_requests") || "[]");
        accessNotifs = (accessReqs || []).map((req: any) => ({
          id: `access-${req.id}`,
          title: "Yêu cầu truy cập ngoài giờ",
          message: `Nhân viên ${req.staffName} đang xin phép vào hệ thống.`,
          time: req.time,
          type: "ACCESS_REQUEST",
          read: false,
          data: req
        }));
      }

      const dbNotifications = Array.isArray(dbNotifs) ? dbNotifs : (dbNotifs?.data || []);
      setNotifications([...dbNotifications, ...adminNotifs, ...accessNotifs]);
    };

    loadLocalNotifs();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "admin_notifications" || e.key === "pending_access_requests" || e.key === "request_trigger") loadLocalNotifs();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user?.role, dbNotifs]);

  const filteredNotifications = (notifications || []).filter(n => {
    if (n.type === "REGISTRATION") {
      const roleUpper = String(user?.role || "").toUpperCase();
      return roleUpper === "01" || roleUpper === "02" || roleUpper === "ADMIN" || roleUpper === "QUẢN LÝ CÔNG VIỆC" || roleUpper === "QL CÔNG VIỆC";
    }
    return !n.targetUsername || n.targetUsername?.toLowerCase() === user?.username?.toLowerCase();
  });

  const uniqueNotifications = (filteredNotifications || []).filter((n, index, self) =>
    index === self.findIndex((t) => t.id === n.id)
  );

  const unreadCount = (uniqueNotifications || []).filter(n => !n.read).length;

  const markAllRead = async () => {
    const updated = await Promise.all((notifications || []).map(async (n) => {
      if (!n.targetUsername || n.targetUsername.toLowerCase() === user?.username?.toLowerCase()) {
        if (!n.read && (n._id || n.id) && !String(n._id || n.id).startsWith("access-")) {
          try {
            await fetch('/api/admin/notifications/' + n.id, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "x-user-id": user?.id || user?._id || ""
              },
              body: JSON.stringify({ isRead: true })
            });
            mutate('/api/admin/notifications');
            router.refresh();
          } catch (err) {
            console.error("Error setting notification read in DB:", err);
          }
        }
        return { ...n, read: true };
      }
      return n;
    }));
    setNotifications(updated);
    
    // Chỉ cập nhật trạng thái đã đọc cho các thông báo hệ thống nằm trong localStorage
    try {
      const originalAdminNotifs = JSON.parse(localStorage.getItem("admin_notifications") || "[]");
      const updatedAdminNotifs = originalAdminNotifs.map((an: any) => {
        const match = updated.find(u => String(u.id) === String(an.id));
        return match ? { ...an, read: match.read } : an;
      });
      localStorage.setItem("admin_notifications", JSON.stringify(updatedAdminNotifs));
    } catch (e) {
      console.error("Error saving admin_notifications:", e);
    }
    window.dispatchEvent(new Event("storage"));
  };

  const markSingleAsRead = async (id: string) => {
    const updated = (notifications || []).map(n => {
      if (n.id === id) {
        return { ...n, read: true };
      }
      return n;
    });
    setNotifications(updated);

    if (id && !String(id).startsWith("access-")) {
      try {
        await fetch('/api/admin/notifications/' + id, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user?.id || user?._id || ""
          },
          body: JSON.stringify({ isRead: true })
        });
        mutate('/api/admin/notifications');
        router.refresh();
      } catch (err) {
        console.error("Error setting notification read in DB:", err);
      }
    }
    
    // Chỉ cập nhật trạng thái đã đọc cho đúng thông báo hệ thống trong localStorage
    try {
      const originalAdminNotifs = JSON.parse(localStorage.getItem("admin_notifications") || "[]");
      const updatedAdminNotifs = originalAdminNotifs.map((an: any) => {
        if (String(an.id) === String(id)) {
          return { ...an, read: true };
        }
        return an;
      });
      localStorage.setItem("admin_notifications", JSON.stringify(updatedAdminNotifs));
    } catch (e) {
      console.error("Error saving single admin_notification:", e);
    }
    window.dispatchEvent(new Event("storage"));
  };

  const handleNotificationClick = async (notif: any) => {
    markSingleAsRead(notif.id);
    
    if (notif.type === "REGISTRATION") {
      try {
        const res = await fetch(`/api/admin/users/${notif.author}`, {
          headers: {
            'x-user-id': currentUser?.id || currentUser?._id || '',
            'x-user-role': currentUser?.role || ''
          }
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.success && resData.data) {
            setPendingApproveUser(resData.data);
            setSelectedRole("04");
            setIsNotifOpen(false);
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching user details:", err);
      }
      router.push("/admin/staff?tab=pending");
    } else if (notif.type === "NEWSFEED") {
      if (notif.postId) {
        localStorage.setItem("highlighted_post_id", notif.postId);
      }
      router.push("/admin/newsfeed");
    } else if (notif.type === "TASK" || notif.type === "SATELLITE_ASSIGNMENT") {
      router.push("/admin/mail/satellite-batches");
    } else if (notif.type === "LATE_WARNING") {
      router.push("/admin/staff");
    }
    setIsNotifOpen(false);
  };

  const getRoleLabel = (role?: string) => {
    const r = String(role || "").toUpperCase();
    if (r === "01" || r === "ADMIN") return "ADMIN";
    if (r === "02" || r === "QL CÔNG VIỆC" || r === "QUẢN LÝ CÔNG VIỆC") return "QL CÔNG VIỆC";
    if (r === "03" || r === "QL NHÂN SỰ" || r === "QUẢN LÝ NHÂN SỰ") return "QL NHÂN SỰ";
    if (r === "04" || r === "NHÂN VIÊN") return "NHÂN VIÊN";
    if (r === "05" || r === "NV THỬ VIỆC") return "NV THỬ VIỆC";
    return "GUEST";
  };

  const handleLogout = async () => {
    try {
      // Gọi API logout để backend set lastActive=null, isOnline=false TRƯỚC
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error("Logout API error:", err);
    }
    sessionStorage.removeItem("user");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleMessageClick = async (partnerId?: string) => {
    try {
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || user?._id || ''
        },
        body: JSON.stringify({ partnerId })
      });
      if (typeof (window as any).mutateMessages === 'function') {
        (window as any).mutateMessages();
      }
      mutate('/api/messages');
    } catch (err) {}
  };

  return (
    <>
      <motion.header 
        animate={{ width: isCollapsed ? `calc(100% - ${windowWidth && windowWidth < 640 ? 0 : 80}px)` : "calc(100% - 280px)" }}
        className="fixed top-0 right-0 z-30 flex h-20 items-center justify-between border-b border-white/0 bg-[#09090b]/80 backdrop-blur-md px-6 sm:px-10"
      >
        <div className="flex items-center gap-6 flex-1">
          <button 
            onClick={onToggle}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-white/0 text-zinc-400 hover:text-[#a07800] hover:border-[#a07800] transition-all shadow-sm"
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>

          <div className="hidden sm:flex w-full max-w-lg items-center gap-4">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#a07800] transition-colors" />
              <input
                type="text"
                placeholder="Tìm kiếm nội dung..."
                className="h-11 w-full rounded-xl border border-white/0 bg-zinc-900/50 pl-11 pr-6 text-sm text-zinc-100 placeholder-zinc-500 transition-all focus:border-[#a07800] focus:outline-none focus:ring-2 focus:ring-[#a07800]/10"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Real-time DateTime Widget */}
          <div className="hidden xl:flex items-center gap-3 px-6 border-l border-white/0 h-8">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-[#a07800] uppercase tracking-[0.2em] leading-none mb-1">Thời gian hệ thống</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                <span className="text-sm font-bold text-zinc-100 font-mono tracking-wider">{dateTimeStr}</span>
              </div>
            </div>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-all hover:bg-zinc-800/60 bg-zinc-900 border border-white/0 hover:text-[#a07800]"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white border-2 border-[#09090b] shadow-md animate-pulse">
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
                    className="absolute right-0 top-full mt-3 z-20 w-80 rounded-2xl border border-white/0 bg-[#18181b] p-5 shadow-2xl backdrop-blur-md animate-fade-in"
                  >
                    <div className="flex items-center justify-between mb-4 px-1">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-zinc-100">Thông báo</p>
                      <button onClick={markAllRead} className="text-[9px] font-black text-[#a07800] hover:underline uppercase">Đọc tất cả</button>
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
                            className={`p-4 rounded-xl border transition-all cursor-pointer group flex flex-col ${
                              !n.read 
                                ? "bg-[#a07800]/5 border-[#a07800]/15 hover:bg-[#a07800]/10" 
                                : "bg-zinc-950/20 border-white/0 hover:bg-zinc-800/40"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 rounded-lg bg-[#a07800]/10 flex items-center justify-center shrink-0">
                                {n.type === "REGISTRATION" ? <UserPlus size={16} className="text-[#a07800]" /> : <CheckCircle2 size={16} className="text-green-500" />}
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="text-[11px] font-bold text-zinc-100 group-hover:text-[#a07800] transition-colors truncate">{safeText(n.title)}</p>
                                <p className="text-[10px] text-zinc-400 font-semibold mt-1 leading-relaxed line-clamp-2">{safeText(n.message)}</p>
                                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-1.5">{safeText(n.time)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center">
                          <p className="text-xs font-bold text-zinc-500 italic">Không có thông báo mới</p>
                        </div>
                      )}
                    </div>

                    {/* View All Notifications Button */}
                    <div className="border-t border-white/0 pt-3 mt-3">
                      <button 
                        onClick={() => {
                          setIsNotifOpen(false);
                          setShowAllNotificationsModal(true);
                        }}
                        className="w-full h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
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
          <div className="relative flex items-center gap-4 pl-6 border-l border-white/0">
            <div className="text-right hidden lg:block overflow-hidden">
              <p className="text-sm font-semibold text-zinc-100 leading-none uppercase tracking-tight">{safeText(user?.name) || "Người dùng"}</p>
              <p className="text-[8px] font-bold text-[#a07800] mt-1 uppercase tracking-[0.2em]">{getRoleLabel(user?.role)}</p>
            </div>
            
            <div 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="h-10 w-10 rounded-xl border border-white/0 bg-zinc-900/50 p-0.5 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#a07800]/50 hover:bg-[#a07800]/5 transition-all shadow-sm active:scale-95"
            >
              {user?.avatar ? (
                <img src={user?.avatar} className="h-full w-full object-cover rounded-lg" alt="" onError={(e) => e.currentTarget.src = "https://ui-avatars.com/api/?name=" + (user?.name || "U") + "&background=18181b&color=a07800"} />
              ) : (
                <div className="h-full w-full rounded-lg bg-zinc-900 flex items-center justify-center text-[#a07800]">
                  <User size={18} />
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
                    className="absolute right-0 top-full mt-3 z-20 w-60 rounded-2xl border border-white/0 bg-[#18181b] p-2 shadow-2xl backdrop-blur-md"
                  >
                    <div className="p-3 border-b border-white/0 mb-1">
                      <p className="text-[8px] font-bold text-[#a07800] uppercase tracking-wider">{getRoleLabel(user?.role)}</p>
                      <p className="text-sm font-bold text-zinc-100 mt-1 uppercase truncate">{safeText(user?.name)}</p>
                      <p className="text-[8px] font-medium text-zinc-500 mt-0.5 tracking-wider truncate">@{safeText(user?.username)}</p>
                    </div>

                    <button 
                      onClick={() => {
                        onOpenProfile();
                        setIsProfileOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-zinc-800/40 hover:text-zinc-100"
                    >
                      <UserSearch size={16} />
                      Hồ sơ chi tiết
                    </button>
                    
                    <div className="h-px bg-zinc-800/80 my-1.5" />
                    
                    <button 
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      <LogOut size={16} />
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
            className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#18181b] border border-white/0 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6 border-b border-white/0 pb-4">
                <div className="flex items-center gap-3">
                  <Bell className="text-[#a07800]" size={24} />
                  <h3 className="text-xl font-bold text-zinc-100 uppercase tracking-tight">Trung tâm thông báo</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={markAllRead}
                    className="text-xs font-semibold text-[#a07800] hover:underline uppercase tracking-wider flex items-center gap-2 bg-[#a07800]/10 px-4 py-2 rounded-xl border border-[#a07800]/20 hover:bg-[#a07800]/20 transition-all"
                  >
                    Đọc tất cả
                  </button>
                  <button
                    onClick={() => setShowAllNotificationsModal(false)}
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Tabs switcher */}
              <div className="flex gap-3 mb-6 bg-zinc-950/40 p-1.5 rounded-xl border border-white/0">
                <button
                  onClick={() => setNotifTab("UNREAD")}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    notifTab === "UNREAD"
                      ? "bg-[#a07800] text-white shadow-sm font-black"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Chưa đọc ({(uniqueNotifications || []).filter(n => !n.read).length})
                </button>
                <button
                  onClick={() => setNotifTab("READ")}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    notifTab === "READ"
                      ? "bg-[#a07800] text-white shadow-sm font-black"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Đã đọc ({(uniqueNotifications || []).filter(n => n.read).length})
                </button>
              </div>

              {/* Notifications List */}
              <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
                {(notifTab === "UNREAD"
                  ? (uniqueNotifications || []).filter(n => !n.read)
                  : (uniqueNotifications || []).filter(n => n.read)
                ).length > 0 ? (
                  (notifTab === "UNREAD"
                    ? (uniqueNotifications || []).filter(n => !n.read)
                    : (uniqueNotifications || []).filter(n => n.read)
                  ).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markSingleAsRead(n.id);
                        handleNotificationClick(n);
                        if (n.type === "REGISTRATION") {
                          setShowAllNotificationsModal(false);
                        }
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer group flex items-start gap-4 ${
                        !n.read
                          ? "bg-[#a07800]/5 border-[#a07800]/15 hover:bg-[#a07800]/10"
                          : "bg-zinc-950/20 border-white/0 hover:bg-zinc-800/40"
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                        n.type === "REGISTRATION" ? "bg-[#a07800]/20 text-[#a07800]" : "bg-green-500/20 text-green-400"
                      }`}>
                        {n.type === "REGISTRATION" ? <UserPlus size={18} /> : <CheckCircle2 size={18} />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-zinc-100 group-hover:text-[#a07800] transition-colors truncate">{safeText(n.title)}</p>
                          <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider shrink-0">{safeText(n.time)}</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed font-semibold">{safeText(n.message)}</p>
                        {!n.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markSingleAsRead(n.id);
                            }}
                            className="mt-2 text-[9px] font-black text-[#a07800] hover:underline uppercase tracking-wider"
                          >
                            Đánh dấu đã đọc
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center border border-dashed border-white/0 rounded-xl bg-zinc-950/20">
                    <Bell className="mx-auto mb-2 text-zinc-500" size={32} />
                    <p className="text-xs font-bold text-zinc-500 italic">Không có thông báo nào trong mục này</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Registration Approval Modal */}
      {pendingApproveUser && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-[#a07800]/25 w-full max-w-lg rounded-[32px] p-8 shadow-[0_0_50px_rgba(160,120,0,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 bg-[#a07800]/5 blur-[50px] -mr-20 -mt-20" />
            
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-[#a07800]/10 text-[#a07800] flex items-center justify-center border border-[#a07800]/20">
                <UserPlus size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Duyệt Đăng Ký Nhân Sự</h3>
                <p className="text-[10px] text-[#a07800] font-bold uppercase tracking-wider">Phê duyệt quyền truy cập hệ thống</p>
              </div>
            </div>

            <div className="space-y-4 mb-8 text-sm text-gray-300 font-medium relative z-10 leading-relaxed bg-zinc-950/40 p-6 rounded-2xl border border-white/0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">Họ và tên</span>
                  <span className="text-white font-bold text-base">{pendingApproveUser.name}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">Tên đăng nhập</span>
                  <span className="text-[#a07800] font-mono font-bold text-base">@{pendingApproveUser.username}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">Số điện thoại</span>
                  <span className="text-white font-semibold">{pendingApproveUser.phone || "---"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">Năm sinh</span>
                  <span className="text-white font-semibold">{pendingApproveUser.birthYear || "---"}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">Địa chỉ</span>
                <span className="text-white font-semibold text-xs leading-relaxed">{pendingApproveUser.address || "---"}</span>
              </div>
            </div>

            {/* Role Selector */}
            <div className="flex flex-col gap-2 mb-8 relative z-10">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 ml-1">Chọn chức vụ (Role)</label>
              <div className="relative group">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full h-12 bg-black/40 border border-white/0 rounded-xl px-4 text-sm font-bold text-white uppercase outline-none focus:border-[#a07800]/30 cursor-pointer"
                >
                  <option value="04">Nhân viên chính Thức</option>
                  <option value="05">Nhân viên thử việc</option>
                  <option value="03">QL Nhân sự</option>
                  <option value="02">QL Công việc</option>
                  <option value="01">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 relative z-10">
              <button
                onClick={async () => {
                  if (isActionSubmitting) return;
                  setIsActionSubmitting(true);
                  try {
                    const res = await fetch(`/api/admin/users/${pendingApproveUser.id || pendingApproveUser._id}`, {
                      method: "DELETE",
                      headers: {
                        'x-user-id': user?.id || user?._id || '',
                        'x-user-role': user?.role || ''
                      }
                    });
                    if (res.ok) {
                      mutate('/api/admin/users?page=1&limit=10&search=&status=ACTIVE_OR_LOCKED&role=ALL');
                      mutate('/api/admin/users?all=true');
                      setPendingApproveUser(null);
                      window.dispatchEvent(new Event("storage"));
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsActionSubmitting(false);
                  }
                }}
                disabled={isActionSubmitting}
                className="flex-1 h-12 bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
              >
                Từ chối
              </button>
              <button
                onClick={async () => {
                  if (isActionSubmitting) return;
                  setIsActionSubmitting(true);
                  try {
                    const res = await fetch(`/api/admin/users/${pendingApproveUser.id || pendingApproveUser._id}`, {
                      method: "PUT",
                      headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': user?.id || user?._id || '',
                        'x-user-role': user?.role || ''
                      },
                      body: JSON.stringify({
                        status: "ACTIVE",
                        role: selectedRole
                      })
                    });
                    if (res.ok) {
                      mutate('/api/admin/users?page=1&limit=10&search=&status=ACTIVE_OR_LOCKED&role=ALL');
                      mutate('/api/admin/users?all=true');
                      setPendingApproveUser(null);
                      window.dispatchEvent(new Event("storage"));
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsActionSubmitting(false);
                  }
                }}
                disabled={isActionSubmitting}
                className="flex-1 h-12 bg-[#a07800] hover:bg-[#a07800]/80 text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-xl shadow-[#a07800]/20 disabled:opacity-50"
              >
                Phê duyệt & Đồng ý
              </button>
            </div>

            {/* Link directly to staff page */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setPendingApproveUser(null);
                  router.push("/admin/staff?tab=pending");
                }}
                className="text-[10px] font-black text-gray-500 hover:text-[#a07800] uppercase tracking-widest transition-all bg-transparent border-none outline-none cursor-pointer"
              >
                Xem chi tiết tại trang Quản trị Nhân sự →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;


