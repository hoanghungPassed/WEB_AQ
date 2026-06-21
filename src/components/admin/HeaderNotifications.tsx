"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Bell, UserPlus, ShieldAlert, CheckCircle2, X, UserSearch } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import Pusher from "pusher-js";
import { StaffData } from "@/types/admin";
import { toast } from "react-hot-toast";

interface HeaderNotificationsProps {
  user: StaffData;
  onOpenAccessModal?: (request: any) => void;
}

export default function HeaderNotifications({ user, onOpenAccessModal }: HeaderNotificationsProps) {
  const router = useRouter();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingApproveUser, setPendingApproveUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("04");
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(item => ({ ...item, read: true })));
    try {
      await fetch("/api/admin/notifications/mark-read", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
    mutate("/api/admin/notifications?type=SYSTEM");
  };

  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data: dbNotifs } = useSWR(
    user ? '/api/admin/notifications?type=SYSTEM' : null,
    fetcher,
    {
      dedupingInterval: 10000,
      revalidateOnFocus: false
    }
  );

  const loadLocalNotifs = useCallback(() => {
    let adminNotifs = [];
    try {
      adminNotifs = JSON.parse(localStorage.getItem("admin_notifications") || "[]");
    } catch (err) {}

    const roleUpper = String(user?.role || "").toUpperCase();
    const isAuthorizedManager = ["01", "02", "03", "ADMIN"].some(r => roleUpper.includes(r));
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

    const dbRaw = Array.isArray(dbNotifs) ? dbNotifs : (dbNotifs?.data || []);
    const normalizedDb = dbRaw.map((n: any) => ({ ...n, id: n.id || n._id, read: n.read || n.isRead || false }));
    const normalizedAdmin = adminNotifs.map((n: any) => ({ ...n, id: n.id || n._id, read: n.read || n.isRead || false }));

    setNotifications([...normalizedDb, ...normalizedAdmin, ...accessNotifs]);
  }, [user?.role, dbNotifs]);

  useEffect(() => {
    loadLocalNotifs();
    window.addEventListener("storage", loadLocalNotifs);
    return () => window.removeEventListener("storage", loadLocalNotifs);
  }, [loadLocalNotifs]);

  // Single Pusher instance ONLY for system-notifications channel (bell counter)
  // The 'system' channel is already handled by RealtimeProvider - NO DUPLICATE
  useEffect(() => {
    if (!user) return;

    const roleUpper = String(user?.role || "").toUpperCase();
    const isAuthorizedManager = ["01", "02", "03", "ADMIN"].some(r => roleUpper.includes(r));
    if (!isAuthorizedManager) return; // Only managers/admins get real-time notifications

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1",
    });

    // ONLY subscribe to system-notifications for the bell counter
    const notifChannel = pusher.subscribe("system-notifications");
    notifChannel.bind("new-notification", (notif: any) => {
      console.log("[Pusher HeaderNotifications] Received new-notification:", notif);
      
      const newNotif = {
        id: notif.id || notif._id || String(Date.now()),
        title: notif.title || "Thông báo hệ thống",
        message: notif.message || "",
        time: notif.time || new Date().toLocaleTimeString("vi-VN"),
        type: notif.type || "SYSTEM",
        read: notif.isRead || false,
        link: notif.link || "",
        data: notif.data
      };

      setNotifications(prev => {
        if (prev.some(n => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });

      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});

      mutate('/api/admin/notifications?type=SYSTEM');
    });

    return () => {
      pusher.unsubscribe("system-notifications");
      pusher.disconnect();
    };
  }, [user]);

  // Listen for custom DOM events dispatched by RealtimeProvider (no duplicate Pusher)
  useEffect(() => {
    const roleUpper = String(user?.role || "").toUpperCase();
    const isAuthorizedManager = ["01", "02", "03", "ADMIN"].some(r => roleUpper.includes(r));
    if (!isAuthorizedManager) return;

    // Handle access-request events from RealtimeProvider
    const handleAccessRequest = (e: Event) => {
      const data = (e as CustomEvent).detail;
      console.log("[HeaderNotifications] Received access-request via CustomEvent:", data);

      const reqId = data.id || data.notificationId || String(Date.now());
      const title = data.type === "FINE_PAYMENT" 
        ? "Báo cáo nộp phạt" 
        : data.type === "LATE_EXCUSE" 
          ? "Giải trình đi muộn" 
          : "Yêu cầu truy cập ngoài giờ";

      const newNotif = {
        id: `access-${reqId}`,
        title: title,
        message: `Nhân viên ${data.name || data.staffName || "Nhân viên"} (@${data.username || "user"}) đang xin phép vào hệ thống.`,
        time: new Date(data.createdAt || Date.now()).toLocaleTimeString("vi-VN"),
        type: "ACCESS_REQUEST",
        read: false,
        data: {
          id: reqId,
          userId: data.userId || "",
          staffName: data.name || data.staffName || "Nhân viên",
          username: data.username || "",
          time: new Date(data.createdAt || Date.now()).toLocaleTimeString("vi-VN"),
          reason: data.reason || "Xin phép truy cập hệ thống",
          type: data.type || "ACCESS",
          status: "PENDING"
        }
      };

      setNotifications(prev => {
        if (prev.some(n => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });

      // Thay vì tự động mở Modal đè đập, hiển thị Toast góc trên bên phải để Admin click mở
      toast((t) => (
        <div 
          onClick={() => {
            if (onOpenAccessModal) onOpenAccessModal(newNotif.data);
            toast.dismiss(t.id);
          }}
          className="flex flex-col p-4 bg-[#0d0d0f] border border-gold/30 hover:border-gold rounded-lg shadow-[0_0_15px_rgba(212,163,89,0.15)] transition-all cursor-pointer select-none min-w-[280px]"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <p className="font-black text-xs uppercase text-gold tracking-wider">{title}</p>
          </div>
          <p className="text-[10px] text-gray-300 font-medium">
            Nhân viên <span className="text-white font-bold">{data.name || data.staffName || "Nhân viên"}</span> đang chờ duyệt. Click để mở.
          </p>
        </div>
      ), { 
        duration: 8000, 
        position: "top-right",
        style: { padding: 0, background: "transparent", boxShadow: "none", border: "none" }
      });

      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});
    };

    // Handle new-fine events from RealtimeProvider
    const handleNewFine = (e: Event) => {
      const data = (e as CustomEvent).detail;
      console.log("[HeaderNotifications] Received new-fine via CustomEvent:", data);
      const newNotif = {
        id: `fine-${Date.now()}`,
        title: "Thông báo xử phạt",
        message: `Nhân viên bị phạt ${data.amount ? data.amount.toLocaleString("vi-VN") : "50.000"}đ lý do: ${data.reason}`,
        time: new Date().toLocaleTimeString("vi-VN"),
        type: "WARNING",
        read: false,
        data: data
      };
      setNotifications(prev => [newNotif, ...prev]);
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});
    };

    // Handle register-request events from RealtimeProvider
    const handleRegisterRequest = (e: Event) => {
      const data = (e as CustomEvent).detail;
      console.log("[HeaderNotifications] Received register-request via CustomEvent:", data);

      const newNotif = {
        id: data.id || String(Date.now()),
        title: "Yêu cầu đăng ký mới",
        message: `Tài khoản ${data.username} đang chờ duyệt.`,
        time: new Date(data.createdAt || Date.now()).toLocaleTimeString("vi-VN"),
        type: "REGISTRATION",
        read: false,
        data: data
      };

      setNotifications(prev => {
        if (prev.some(n => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });

      // Thay vì tự động mở Modal đè đập, hiển thị Toast góc trên bên phải để Admin click mở
      toast((t) => (
        <div 
          onClick={() => {
            setPendingApproveUser({
              _id: data.userId || data._id || data.id,
              name: data.name,
              username: data.username
            });
            toast.dismiss(t.id);
          }}
          className="flex flex-col p-4 bg-[#0d0d0f] border border-gold/30 hover:border-gold rounded-lg shadow-[0_0_15px_rgba(212,163,89,0.15)] transition-all cursor-pointer select-none min-w-[280px]"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <p className="font-black text-xs uppercase text-gold tracking-wider">Yêu cầu đăng ký mới</p>
          </div>
          <p className="text-[10px] text-gray-300 font-medium">
            Tài khoản <span className="text-white font-bold">@{data.username}</span> đang chờ duyệt. Click để mở.
          </p>
        </div>
      ), { 
        duration: 8000, 
        position: "top-right",
        style: { padding: 0, background: "transparent", boxShadow: "none", border: "none" }
      });

      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});
    };

    window.addEventListener("pusher-access-request", handleAccessRequest);
    window.addEventListener("pusher-new-fine", handleNewFine);
    window.addEventListener("pusher-register-request", handleRegisterRequest);

    return () => {
      window.removeEventListener("pusher-access-request", handleAccessRequest);
      window.removeEventListener("pusher-new-fine", handleNewFine);
      window.removeEventListener("pusher-register-request", handleRegisterRequest);
    };
  }, [user, onOpenAccessModal]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleApproveRegistration = async () => {
    if (!pendingApproveUser || isActionSubmitting) return;
    setIsActionSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${pendingApproveUser._id || pendingApproveUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE", role: selectedRole })
      });
      if (res.ok) {
        setPendingApproveUser(null);
        mutate('/api/admin/users');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsNotifOpen(!isNotifOpen)}
        className="h-12 w-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-gold hover:bg-white/10 transition-all relative group"
      >
        <Bell size={20} className="group-hover:rotate-12 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-red-500 text-[8px] font-black text-white flex items-center justify-center border-2 border-background shadow-lg animate-bounce">
            {unreadCount}
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
              className="absolute right-0 mt-3 w-80 max-h-[500px] overflow-hidden rounded-2xl bg-background-secondary border border-border shadow-premium z-20 flex flex-col"
            >
              <div className="p-4 bg-black/20 border-b border-border flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Thông báo</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-gold hover:underline transition-all"
                    >
                      Đánh dấu tất cả là đã đọc
                    </button>
                  )}
                </div>
                <div className="flex border-b border-border/50">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`flex-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-center transition-all ${
                      activeTab === "all"
                        ? "text-gold border-b-2 border-gold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setActiveTab("unread")}
                    className={`flex-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-center transition-all ${
                      activeTab === "unread"
                        ? "text-gold border-b-2 border-gold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Chưa đọc ({unreadCount})
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {notifications.filter(n => activeTab === "all" || !n.read).length > 0 ? (
                  notifications
                    .filter(n => activeTab === "all" || !n.read)
                    .map((n, i) => (
                      <div
                        key={n.id || i}
                        onClick={async () => {
                          // Mark as read in local state
                          setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));

                          // Mark as read in DB if it's a DB notification
                          if (n.id && !String(n.id).startsWith("access-")) {
                            try {
                              await fetch(`/api/admin/notifications/mark-read`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ id: n.id })
                              });
                            } catch (err) {
                              console.error("Failed to mark notification as read:", err);
                            }
                            mutate('/api/admin/notifications?type=SYSTEM');
                          }

                          if (n.type === "ACCESS_REQUEST" || n.link === "#approval-modal") {
                            const authorObj = typeof n.author === 'object' ? n.author : null;
                            const authorId = authorObj ? (authorObj._id || authorObj.id || "") : (n.userId || n.author || "");
                            const authorName = authorObj ? authorObj.name : "Nhân viên";
                            const authorUsername = authorObj ? authorObj.username : "";
                            
                            // Determine type of request from title/message
                            let reqType = "ACCESS";
                            if (n.title?.includes("phạt") || n.message?.includes("phạt")) reqType = "FINE_PAYMENT";
                            else if (n.title?.includes("muộn") || n.message?.includes("muộn")) reqType = "LATE_EXCUSE";

                            const requestData = n.data || {
                              id: String(n.id || "").replace("access-", ""),
                              userId: authorId,
                              staffName: authorName,
                              username: authorUsername,
                              time: n.time || new Date(n.createdAt || Date.now()).toLocaleTimeString("vi-VN"),
                              reason: n.message || "Xin phép truy cập hệ thống",
                              type: reqType,
                              status: "PENDING"
                            };

                            if (onOpenAccessModal) {
                              onOpenAccessModal(requestData);
                            }
                            setIsNotifOpen(false);
                          } else if (n.type === "REGISTRATION") {
                            const authorObj = typeof n.author === 'object' ? n.author : null;
                            setPendingApproveUser(authorObj || {
                              _id: n.userId || n.author || "",
                              name: n.title?.includes("đăng ký") ? n.message?.split("Tài khoản ")[1]?.split(" đang chờ duyệt")[0] || "Tài khoản mới" : "Tài khoản mới",
                              username: n.title?.includes("đăng ký") ? n.message?.split("Tài khoản ")[1]?.split(" đang chờ duyệt")[0] || "" : ""
                            });
                            setIsNotifOpen(false);
                          } else if (n.link && n.link !== "#" && n.link !== "#approval-modal") {
                            router.push(n.link);
                            setIsNotifOpen(false);
                          }
                        }}
                        className={`p-4 border-b border-border/50 hover:bg-white/10 transition-all cursor-pointer flex items-start justify-between gap-3 ${!n.read ? 'bg-white/5' : 'bg-transparent'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white mb-1">{n.title}</p>
                          <p className="text-[10px] text-gray-500 line-clamp-2">{n.message}</p>
                          <p className="text-[8px] text-gray-600 mt-2 font-black uppercase">{n.time || "Vừa xong"}</p>
                        </div>
                        {!n.read && (
                          <span className="flex h-2 w-2 relative mt-1.5 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                          </span>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="p-10 text-center opacity-20">
                    <Bell size={32} className="mx-auto mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Không có thông báo</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Approval Modal */}
      <AnimatePresence>
        {pendingApproveUser && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background-secondary border border-border rounded-3xl p-8 max-w-md w-full shadow-premium">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Phê duyệt nhân sự</h3>
                <button onClick={() => setPendingApproveUser(null)}><X size={24} className="text-gray-500" /></button>
              </div>
              <div className="space-y-4 mb-8">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Họ tên</p>
                  <p className="text-sm font-bold text-white">{pendingApproveUser.name}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block ml-1">Phân quyền</label>
                  <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full h-12">
                    <option value="04">Nhân viên chính thức</option>
                    <option value="05">Nhân viên thử việc</option>
                    <option value="03">Quản lý nhân sự</option>
                    <option value="02">Quản lý công việc</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleApproveRegistration} disabled={isActionSubmitting} className="flex-1 h-12 bg-gold text-background rounded-xl font-black uppercase text-[10px] tracking-widest">Xác nhận</button>
                <button onClick={() => setPendingApproveUser(null)} className="h-12 px-6 bg-white/5 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Hủy</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
