"use client";

import React, { useEffect, useState } from "react";
import { Search, Bell, Menu, User, PanelLeftClose, PanelLeftOpen, LogOut, UserSearch, UserPlus, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface HeaderProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onOpenProfile: () => void;
  user: any;
}

const Header = ({ isCollapsed, onToggle, onOpenProfile, user }: HeaderProps) => {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const loadNotifs = () => {
      const stored = JSON.parse(localStorage.getItem("admin_notifications") || "[]");
      const isAuthorizedManager = user?.role === "01" || user?.role === "02" || user?.role === "ADMIN";
      let accessNotifs: any[] = [];
      if (isAuthorizedManager) {
        const accessReqs = JSON.parse(localStorage.getItem("pending_access_requests") || "[]");
        accessNotifs = accessReqs.map((req: any) => ({
          id: `access-${req.id}`,
          title: "Yêu cầu truy cập ngoài giờ",
          message: `Nhân viên ${req.staffName} đang xin phép vào hệ thống.`,
          time: req.time,
          type: "ACCESS_REQUEST",
          read: false,
          data: req
        }));
      }
      setNotifications([...stored, ...accessNotifs]);
    };

    loadNotifs();
    const interval = setInterval(loadNotifs, 3000); 
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "admin_notifications" || e.key === "pending_access_requests" || e.key === "request_trigger") loadNotifs();
    };
    window.addEventListener("storage", handleStorage);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, [user?.role]);

  const filteredNotifications = notifications.filter(n => {
    // Chỉ Admin và QL Công việc được nhận thông báo duyệt đăng ký tài khoản
    if (n.type === "REGISTRATION") {
      return user?.role === "01" || user?.role === "02" || user?.role === "ADMIN";
    }
    return !n.targetUsername || n.targetUsername?.toLowerCase() === user?.username?.toLowerCase();
  });
  // Loại bỏ các thông báo trùng ID (do dữ liệu cũ trong localStorage)
  const uniqueNotifications = filteredNotifications.filter((n, index, self) =>
    index === self.findIndex((t) => t.id === n.id)
  );
  const unreadCount = uniqueNotifications.filter(n => !n.read).length;

  const markAllRead = () => {
    const updated = notifications.map(n => {
      if (!n.targetUsername || n.targetUsername === user?.username) {
        return { ...n, read: true };
      }
      return n;
    });
    setNotifications(updated);
    localStorage.setItem("admin_notifications", JSON.stringify(updated));
  };

  const handleNotificationClick = (notif: any) => {
    if (notif.type === "REGISTRATION") {
      router.push("/admin/staff?tab=pending");
    }
    setIsNotifOpen(false);
  };

  const getRoleLabel = (role?: string) => {
    if (role === "01") return "ADMIN";
    if (role === "02") return "QL CÔNG VIỆC";
    if (role === "03") return "QL NHÂN SỰ";
    if (role === "04") return "NHÂN VIÊN";
    return "GUEST";
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <motion.header 
      animate={{ width: isCollapsed ? "calc(100% - 100px)" : "calc(100% - 320px)" }}
      className="fixed top-0 right-0 z-30 flex h-20 items-center justify-between border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md px-10"
    >
      <div className="flex items-center gap-8 flex-1">
        <button 
          onClick={onToggle}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-sidebar border border-white/5 text-gray-500 hover:text-gold hover:border-gold transition-all shadow-lg"
        >
          {isCollapsed ? <PanelLeftOpen size={24} /> : <PanelLeftClose size={24} />}
        </button>

        <div className="flex w-full max-w-xl items-center gap-4">
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
        {/* Static Time Display */}
        <div className="hidden xl:flex items-center gap-3 px-6 border-l border-white/5 h-10">
           <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-gold uppercase tracking-[0.2em] leading-none mb-1">Hệ thống</span>
             <div className="flex items-center gap-2">
               <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
               <span className="text-sm font-black text-white tracking-tighter">16:20 (4:20 PM)</span>
             </div>
           </div>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              if (!isNotifOpen) markAllRead();
            }}
            className="relative flex h-12 w-12 items-center justify-center rounded-xl text-gray-500 transition-all hover:bg-white/5 hover:text-gold border border-transparent hover:border-white/5"
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500 ring-4 ring-[#0a0a0a] animate-pulse"></span>
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
                  className="absolute right-0 top-full mt-4 z-20 w-80 rounded-[32px] border border-white/10 bg-[#161616] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between mb-4 px-2">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Thông báo</p>
                    <span className="text-[10px] font-bold text-gold px-2 py-1 rounded-full bg-gold/10">{unreadCount} mới</span>
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                    {uniqueNotifications.length > 0 ? (
                      uniqueNotifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => handleNotificationClick(n)}
                          className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all cursor-pointer group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                              {n.type === "REGISTRATION" ? <UserPlus size={18} className="text-gold" /> : <CheckCircle2 size={18} className="text-green-500" />}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-white group-hover:text-gold transition-colors">{n.title}</p>
                              <p className="text-[10px] text-gray-500 font-bold mt-1 leading-relaxed">{n.message}</p>
                              <p className="text-[9px] text-gray-700 font-black uppercase tracking-widest mt-2">{n.time}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center text-gray-600">
                        <p className="text-xs font-bold italic">Không có thông báo mới</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile */}
        <div className="relative flex items-center gap-4 pl-8 border-l border-white/5">
          <div className="text-right hidden lg:block overflow-hidden">
            <p className="text-sm font-black text-white leading-none uppercase tracking-tighter">{user?.name || "Người dùng"}</p>
            <p className="text-[10px] font-black text-gold mt-1.5 uppercase tracking-[0.2em]">{getRoleLabel(user?.role)}</p>
          </div>
          
          <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="h-14 w-14 rounded-2xl border border-white/10 bg-white/[0.05] p-1 flex items-center justify-center overflow-hidden cursor-pointer hover:border-gold/50 hover:bg-gold/5 transition-all shadow-xl active:scale-95"
          >
            {user?.avatar ? (
              <img src={user.avatar} className="h-full w-full object-cover rounded-xl" />
            ) : (
              <div className="h-full w-full rounded-xl bg-sidebar flex items-center justify-center text-gold">
                 <User size={28} />
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
                  className="absolute right-0 top-full mt-4 z-20 w-64 rounded-3xl border border-white/10 bg-sidebar p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                >
                  <div className="p-4 border-b border-white/5 mb-2">
                    <p className="text-[10px] font-black text-gold uppercase tracking-[0.3em]">{getRoleLabel(user?.role)}</p>
                    <p className="text-sm font-black text-white mt-1 uppercase truncate">{user?.name}</p>
                    <p className="text-[10px] font-bold text-gray-600 mt-0.5 tracking-wider truncate">@{user?.username}</p>
                  </div>

                  <button 
                    onClick={() => {
                      onOpenProfile();
                      setIsProfileOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-500 transition-colors hover:bg-white/5 hover:text-gold"
                  >
                    <UserSearch size={18} />
                    Hồ sơ chi tiết
                  </button>
                  
                  <div className="h-px bg-white/5 my-2" />
                  
                  <button 
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-red-500 transition-colors hover:bg-red-500/10"
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
  );
};

export default Header;
