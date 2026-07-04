"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Bell, UserPlus, ShieldAlert, CheckCircle2, X, UserSearch, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import Pusher from "pusher-js";
import { createPortal } from "react-dom";
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
  const [isAllNotifsModalOpen, setIsAllNotifsModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [modalFilterTab, setModalFilterTab] = useState<"all" | "unread" | "access" | "system">("all");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(modalSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [modalSearchTerm]);

  const playNotificationSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(660, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(330, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.6);
      osc2.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.error("Audio play error:", e);
    }
  }, []);

  const pushToSync = async (data: Record<string, string>) => {
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.error("Sync error:", err);
    }
  };

  const getStableDateString = () => {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const vnTime = new Date(utc + 3600000 * 7); // Vietnam GMT+7
    const year = vnTime.getFullYear();
    const month = String(vnTime.getMonth() + 1).padStart(2, '0');
    const day = String(vnTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleApproveRequestDirect = async (request: any, isApprove: boolean) => {
    if (!request) return;
    const rawId = request.id || request._id || String(request.id).replace("access-", "");
    const cleanId = String(rawId).replace("access-", "");
    const status = isApprove ? "APPROVED" : "DENIED";

    toast.loading(isApprove ? "Đang phê duyệt..." : "Đang từ chối...", { id: `action-${cleanId}` });
    try {
      const res = await fetch(`/api/admin/attendance/approve-access/${cleanId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status,
          userId: request.userId || request.data?.userId,
          type: request.type || request.data?.type || "ACCESS",
          username: request.username || request.data?.username,
          staffName: request.staffName || request.data?.staffName
        })
      });

      toast.dismiss(`action-${cleanId}`);
      if (!res.ok) {
        throw new Error("Thao tác thất bại");
      }

      // Update notifications locally
      setNotifications(prev => prev.map(item => (item.id === request.id || item.id === `access-${cleanId}`) ? { ...item, read: true, data: { ...item.data, status } } : item));

      // Remove from pending_access_requests in local storage
      const accessReqs = JSON.parse(localStorage.getItem("pending_access_requests") || "[]");
      const updatedAccess = accessReqs.filter((r: any) => String(r.id) !== cleanId);
      localStorage.setItem("pending_access_requests", JSON.stringify(updatedAccess));
      
      const savedSync: any = { pending_access_requests: JSON.stringify(updatedAccess) };

      if (isApprove) {
        localStorage.setItem(`access_response_${request.staffName}`, "APPROVED");
        localStorage.setItem(`access_${getStableDateString()}_${request.staffName}`, "true");

        const savedUsersStr = localStorage.getItem("global_users");
        const allUsers = savedUsersStr ? JSON.parse(savedUsersStr) : [];
        const updatedUsers = (allUsers || []).map((u: any) =>
          u.username === request.username || u.name === request.staffName
            ? { 
                ...u, 
                isLateLocked: false, 
                finePaymentStatus: request.type === "FINE_PAYMENT" ? "APPROVED" : u.finePaymentStatus,
                lateExcuseStatus: request.type === "LATE_EXCUSE" ? "APPROVED" : u.lateExcuseStatus
              }
            : u
        );
        localStorage.setItem("global_users", JSON.stringify(updatedUsers));
        savedSync.global_users = JSON.stringify(updatedUsers);
      } else {
        const savedUsersStr = localStorage.getItem("global_users");
        const allUsers = savedUsersStr ? JSON.parse(savedUsersStr) : [];
        const updatedUsers = (allUsers || []).map((u: any) =>
          u.username === request.username || u.name === request.staffName
            ? { 
                ...u, 
                isLateLocked: true, 
                finePaymentStatus: request.type === "FINE_PAYMENT" ? "DENIED" : u.finePaymentStatus,
                lateExcuseStatus: request.type === "LATE_EXCUSE" ? "DENIED" : u.lateExcuseStatus
              }
            : u
        );
        localStorage.setItem("global_users", JSON.stringify(updatedUsers));
        savedSync.global_users = JSON.stringify(updatedUsers);
      }

      await pushToSync(savedSync);
      window.dispatchEvent(new Event("storage"));
      
      mutate('/api/admin/notifications?type=SYSTEM');
      mutate('/api/admin/users');
      toast.success(isApprove ? `Đã duyệt yêu cầu của ${request.staffName}` : `Đã từ chối yêu cầu của ${request.staffName}`);
    } catch (err) {
      console.error(err);
      toast.error("Thao tác thất bại, vui lòng thử lại");
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(item => ({ ...item, read: true })));

    // Update pending_access_requests in localStorage
    try {
      const accessReqs = JSON.parse(localStorage.getItem("pending_access_requests") || "[]");
      const updatedAccess = accessReqs.map((req: any) => ({ ...req, read: true, isRead: true }));
      localStorage.setItem("pending_access_requests", JSON.stringify(updatedAccess));
      await pushToSync({ pending_access_requests: JSON.stringify(updatedAccess) });
    } catch (err) {
      console.error("Failed to mark local access requests read:", err);
    }

    // Update admin_notifications in localStorage
    try {
      const adminNotifs = JSON.parse(localStorage.getItem("admin_notifications") || "[]");
      const updatedAdmin = adminNotifs.map((item: any) => ({ ...item, read: true, isRead: true }));
      localStorage.setItem("admin_notifications", JSON.stringify(updatedAdmin));
      await pushToSync({ admin_notifications: JSON.stringify(updatedAdmin) });
    } catch (err) {
      console.error("Failed to mark local admin notifications read:", err);
    }

    // Dispatch storage event to trigger reactivity locally
    window.dispatchEvent(new Event("storage"));

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

  const handleNotificationClick = async (n: any) => {
    // 1. Mark as read in local state
    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));

    // 2. Mark as read in localStorage
    if (n.id && String(n.id).startsWith("access-")) {
      const accessId = String(n.id).replace("access-", "");
      try {
        const accessReqs = JSON.parse(localStorage.getItem("pending_access_requests") || "[]");
        const updated = accessReqs.map((req: any) => {
          if (String(req.id) === accessId) {
            return { ...req, read: true, isRead: true };
          }
          return req;
        });
        localStorage.setItem("pending_access_requests", JSON.stringify(updated));
        await pushToSync({ pending_access_requests: JSON.stringify(updated) });
        window.dispatchEvent(new Event("storage"));
      } catch (err) {
        console.error(err);
      }
    } else if (n.id) {
      // Check if it exists in local admin_notifications
      try {
        const adminNotifs = JSON.parse(localStorage.getItem("admin_notifications") || "[]");
        const exists = adminNotifs.some((item: any) => (item.id || item._id) === n.id);
        if (exists) {
          const updated = adminNotifs.map((item: any) => {
            if ((item.id || item._id) === n.id) {
              return { ...item, read: true, isRead: true };
            }
            return item;
          });
          localStorage.setItem("admin_notifications", JSON.stringify(updated));
          await pushToSync({ admin_notifications: JSON.stringify(updated) });
          window.dispatchEvent(new Event("storage"));
        }
      } catch (err) {
        console.error(err);
      }

      // If it's a DB notification (doesn't start with access-), call backend
      if (!String(n.id).startsWith("access-")) {
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
    }

    // 3. Execute actions
    if (n.type === "ACCESS_REQUEST" || n.link === "#approval-modal") {
      const authorObj = typeof n.author === 'object' ? n.author : null;
      const authorId = authorObj ? (authorObj._id || authorObj.id || "") : (n.userId || n.author || "");
      const authorName = authorObj ? authorObj.name : "Nhân viên";
      const authorUsername = authorObj ? authorObj.username : "";
      
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
      setIsAllNotifsModalOpen(false);
    } else if (n.type === "REGISTRATION") {
      const authorObj = typeof n.author === 'object' ? n.author : null;
      setPendingApproveUser(authorObj || {
        _id: n.userId || n.author || "",
        name: n.title?.includes("đăng ký") ? n.message?.split("Tài khoản ")[1]?.split(" đang chờ duyệt")[0] || "Tài khoản mới" : "Tài khoản mới",
        username: n.title?.includes("đăng ký") ? n.message?.split("Tài khoản ")[1]?.split(" đang chờ duyệt")[0] || "" : ""
      });
      setIsNotifOpen(false);
      setIsAllNotifsModalOpen(false);
    } else if (n.link && n.link !== "#" && n.link !== "#approval-modal") {
      router.push(n.link);
      setIsNotifOpen(false);
      setIsAllNotifsModalOpen(false);
    }
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
        title: req.type === "FINE_PAYMENT" 
          ? "Báo cáo nộp phạt" 
          : req.type === "LATE_EXCUSE" 
            ? "Giải trình đi muộn" 
            : "Yêu cầu truy cập ngoài giờ",
        message: `Nhân viên ${req.staffName} đang xin phép vào hệ thống.`,
        time: req.time,
        type: "ACCESS_REQUEST",
        read: req.read || req.isRead || false,
        data: req
      }));
    }

    const dbRaw = Array.isArray(dbNotifs) ? dbNotifs : (dbNotifs?.data || []);
    const normalizedDb = dbRaw.map((n: any) => ({ ...n, id: n.id || n._id, read: n.read || n.isRead || false }));
    const normalizedAdmin = adminNotifs.map((n: any) => ({ ...n, id: n.id || n._id, read: n.read || n.isRead || false }));

    const dbIds = new Set(normalizedDb.map((n: any) => String(n.id)));
    const filteredAccessNotifs = accessNotifs.filter((an: any) => {
      const cleanId = String(an.id).replace("access-", "");
      return !dbIds.has(cleanId);
    });
    const filteredAdminNotifs = normalizedAdmin.filter((an: any) => !dbIds.has(String(an.id)));

    const merged = [...normalizedDb, ...filteredAdminNotifs, ...filteredAccessNotifs];
    const seenMessages = new Set<string>();
    const finalNotifs = merged.filter((n: any) => {
      const msgKey = `${n.title || ""}:${n.message || ""}`;
      if (seenMessages.has(msgKey)) return false;
      seenMessages.add(msgKey);
      return true;
    });

    setNotifications(finalNotifs);
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

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1",
      authEndpoint: "/api/pusher/auth"
    });

    const roleUpper = String(user?.role || "").toUpperCase();
    const isAuthorizedManager = ["01", "02", "03", "ADMIN"].some(r => roleUpper.includes(r));

    const handleNewNotif = (notif: any) => {
      console.log("[Pusher HeaderNotifications] Received notification:", notif);
      
      // Filter by recipient if set
      if (notif.recipientId && String(notif.recipientId) !== String(user.id || user._id)) {
        return;
      }

      // Ignore ACCESS_REQUEST and REGISTRATION in raw system notifications to prevent double chimes,
      // as they are already handled by custom system events in RealtimeProvider
      if (notif.type === "ACCESS_REQUEST" || notif.type === "REGISTRATION") {
        console.log("[HeaderNotifications] Ignoring duplicate ACCESS_REQUEST/REGISTRATION notification in handleNewNotif");
        return;
      }

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

      playNotificationSound();

      mutate('/api/admin/notifications?type=SYSTEM');
    };

    let notifChannel: any;
    let privateChannel: any;

    if (isAuthorizedManager) {
      notifChannel = pusher.subscribe("system-notifications");
      notifChannel.bind("new-notification", handleNewNotif);
      notifChannel.bind("new_notification", handleNewNotif);
    }

    const currentUserId = user.id || user._id;
    if (currentUserId) {
      privateChannel = pusher.subscribe(`private-${currentUserId}`);
      privateChannel.bind("new-notification", handleNewNotif);
      privateChannel.bind("new_notification", handleNewNotif);
    }

    return () => {
      if (isAuthorizedManager && notifChannel) {
        pusher.unsubscribe("system-notifications");
      }
      if (privateChannel) {
        pusher.unsubscribe(`private-${currentUserId}`);
      }
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

      // Hiển thị Toast có 2 nút [ĐỒNG Ý] và [TỪ CHỐI] để duyệt nhanh
      toast((t) => (
        <div 
          className="flex flex-col p-4 bg-[#0d0d0f] border border-gold/30 hover:border-gold rounded-lg shadow-[0_0_15px_rgba(212,163,89,0.15)] transition-all min-w-[300px]"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <p className="font-black text-xs uppercase text-gold tracking-wider">{title}</p>
          </div>
          <p className="text-[10px] text-gray-300 font-medium mb-3">
            Nhân viên <span className="text-white font-bold">{data.name || data.staffName || "Nhân viên"}</span> đang chờ duyệt.
          </p>
          <div className="flex gap-2 justify-end">
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                toast.dismiss(t.id);
                await handleApproveRequestDirect(newNotif.data, true);
              }}
              className="px-3 py-1.5 bg-gold text-background hover:bg-gold-hover text-[9px] font-black uppercase tracking-wider rounded transition-all"
            >
              Đồng ý
            </button>
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                toast.dismiss(t.id);
                await handleApproveRequestDirect(newNotif.data, false);
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider rounded transition-all"
            >
              Từ chối
            </button>
          </div>
        </div>
      ), { 
        duration: 12000, 
        position: "top-right",
        style: { padding: 0, background: "transparent", boxShadow: "none", border: "none" }
      });

      playNotificationSound();
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
      playNotificationSound();
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

      // Hiển thị Toast Đăng ký mới có nút bấm trực tiếp
      toast((t) => (
        <div 
          className="flex flex-col p-4 bg-[#0d0d0f] border border-gold/30 hover:border-gold rounded-lg shadow-[0_0_15px_rgba(212,163,89,0.15)] transition-all min-w-[300px]"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <p className="font-black text-xs uppercase text-gold tracking-wider">Yêu cầu đăng ký mới</p>
          </div>
          <p className="text-[10px] text-gray-300 font-medium mb-3">
            Tài khoản <span className="text-white font-bold">@{data.username}</span> ({data.name}) đang chờ duyệt.
          </p>
          <div className="flex gap-2 justify-end">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(t.id);
                setPendingApproveUser({
                  _id: data.userId || data._id || data.id,
                  name: data.name,
                  username: data.username
                });
              }}
              className="px-3 py-1.5 bg-gold text-background hover:bg-gold-hover text-[9px] font-black uppercase tracking-wider rounded transition-all"
            >
              Phê duyệt
            </button>
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                toast.dismiss(t.id);
                const userId = data.userId || data._id || data.id;
                if (!userId) return;
                toast.loading("Đang từ chối...", { id: "reject-reg-toast" });
                try {
                  const res = await fetch(`/api/admin/users/${userId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "LOCKED" })
                  });
                  toast.dismiss("reject-reg-toast");
                  if (res.ok) {
                    toast.success("Đã từ chối tài khoản!");
                    mutate('/api/admin/users');
                  } else {
                    toast.error("Từ chối thất bại");
                  }
                } catch (err) {
                  toast.dismiss("reject-reg-toast");
                  toast.error("Lỗi kết nối");
                }
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider rounded transition-all"
            >
              Từ chối
            </button>
          </div>
        </div>
      ), { 
        duration: 12000, 
        position: "top-right",
        style: { padding: 0, background: "transparent", boxShadow: "none", border: "none" }
      });

      playNotificationSound();
    };

    const handleNewNotification = (e: Event) => {
      const data = (e as CustomEvent).detail;
      console.log("[HeaderNotifications] Received new-notification via CustomEvent:", data);
      
      // Filter by recipient if set
      if (data.recipientId && String(data.recipientId) !== String(user.id || user._id)) {
        return;
      }

      const newNotif = {
        id: data.id || data._id || String(Date.now()),
        title: data.title || "Thông báo hệ thống",
        message: data.message || "",
        time: data.time || new Date().toLocaleTimeString("vi-VN"),
        type: data.type || "SYSTEM",
        read: data.isRead || false,
        link: data.link || "",
        data: data.data
      };
      
      setNotifications(prev => {
        if (prev.some(n => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
      
      playNotificationSound();
      
      mutate('/api/admin/notifications?type=SYSTEM');
    };

    window.addEventListener("pusher-access-request", handleAccessRequest);
    window.addEventListener("pusher-new-fine", handleNewFine);
    window.addEventListener("pusher-register-request", handleRegisterRequest);
    window.addEventListener("pusher-new-notification", handleNewNotification);

    return () => {
      window.removeEventListener("pusher-access-request", handleAccessRequest);
      window.removeEventListener("pusher-new-fine", handleNewFine);
      window.removeEventListener("pusher-register-request", handleRegisterRequest);
      window.removeEventListener("pusher-new-notification", handleNewNotification);
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
                        onClick={() => handleNotificationClick(n)}
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
              <div className="border-t border-border p-3 text-center bg-black/10 flex-shrink-0">
                <button
                  onClick={() => {
                    setIsAllNotifsModalOpen(true);
                    setIsNotifOpen(false);
                  }}
                  className="text-xs font-bold text-gold hover:underline transition-all"
                >
                  Xem tất cả thông báo
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* All Notifications Modal */}
      {isMounted && typeof window !== "undefined" && createPortal(
        <AnimatePresence>
          {isAllNotifsModalOpen && (
            <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-gold/25 rounded-xl p-6 w-full max-w-4xl max-h-[85vh] shadow-[0_0_50px_rgba(251,191,36,0.1)] flex flex-col relative overflow-hidden"
            >
              {/* Decorative Cyber Grid Accent */}
              <div className="absolute top-0 right-0 h-32 w-32 bg-gold/5 blur-[40px] pointer-events-none" />

              {/* Title Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/80 flex-shrink-0 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
                    <Bell size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-wider font-mono">Bảng điều khiển thông báo</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                      Hệ thống ghi nhận <span className="text-gold">{notifications.length}</span> sự kiện, <span className="text-red-500">{unreadCount}</span> chưa đọc
                    </p>
                  </div>
                </div>
                {/* Close Button */}
                <button
                  onClick={() => setIsAllNotifsModalOpen(false)}
                  className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-gray-400 hover:text-gold hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search and Action Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-zinc-900/60 p-4 rounded-lg border border-zinc-800/80 flex-shrink-0 relative z-10">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={16} />
                  <input
                    placeholder="Tìm kiếm nội dung thông báo..."
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 h-11 bg-zinc-950 border border-zinc-800 rounded-md text-white text-sm placeholder-zinc-650 focus:border-gold outline-none transition-all font-medium"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="h-11 px-5 rounded-sm bg-gold text-zinc-950 text-xs font-black uppercase tracking-wider hover:bg-gold/90 transition-all cursor-pointer shadow-lg shadow-gold/10"
                    >
                      Đánh dấu tất cả đã đọc
                    </button>
                  )}
                  <button
                    onClick={() => setIsAllNotifsModalOpen(false)}
                    className="h-11 px-5 rounded-sm bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 border-b border-zinc-900 mb-6 pb-2 overflow-x-auto flex-shrink-0 relative z-10 custom-scrollbar">
                {[
                  { id: "all", label: "Tất cả" },
                  { id: "unread", label: "Chưa đọc" },
                  { id: "access", label: "Yêu cầu mở khóa" },
                  { id: "system", label: "Hệ thống" }
                ].map((tab) => {
                  let count = 0;
                  if (tab.id === "all") count = notifications.length;
                  else if (tab.id === "unread") count = unreadCount;
                  else if (tab.id === "access") count = notifications.filter(n => n.type === "ACCESS_REQUEST").length;
                  else if (tab.id === "system") count = notifications.filter(n => n.type !== "ACCESS_REQUEST").length;

                  const isActive = modalFilterTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setModalFilterTab(tab.id as any)}
                      className={`h-9 px-4 rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
                        isActive
                          ? "bg-gold text-zinc-950 border-gold font-black"
                          : "bg-zinc-900/30 border-zinc-800 text-gray-400 hover:text-white hover:border-zinc-700"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${isActive ? "bg-zinc-950 text-gold" : "bg-zinc-800 text-gray-400"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 relative z-10">
                {notifications.filter(n => {
                  const titleMatch = (n.title || "").toLowerCase().includes(debouncedSearchQuery.toLowerCase());
                  const messageMatch = (n.message || "").toLowerCase().includes(debouncedSearchQuery.toLowerCase());
                  const matchesSearch = titleMatch || messageMatch;

                  let matchesTab = true;
                  if (modalFilterTab === "unread") {
                    matchesTab = !n.read;
                  } else if (modalFilterTab === "access") {
                    matchesTab = n.type === "ACCESS_REQUEST";
                  } else if (modalFilterTab === "system") {
                    matchesTab = n.type !== "ACCESS_REQUEST";
                  }

                  return matchesSearch && matchesTab;
                }).length > 0 ? (
                  <div className="space-y-3 pb-4">
                    {notifications.filter(n => {
                      const titleMatch = (n.title || "").toLowerCase().includes(debouncedSearchQuery.toLowerCase());
                      const messageMatch = (n.message || "").toLowerCase().includes(debouncedSearchQuery.toLowerCase());
                      const matchesSearch = titleMatch || messageMatch;

                      let matchesTab = true;
                      if (modalFilterTab === "unread") {
                        matchesTab = !n.read;
                      } else if (modalFilterTab === "access") {
                        matchesTab = n.type === "ACCESS_REQUEST";
                      } else if (modalFilterTab === "system") {
                        matchesTab = n.type !== "ACCESS_REQUEST";
                      }

                      return matchesSearch && matchesTab;
                    }).map((n, i) => {
                      // Color coding & borders based on type
                      let borderClass = "border-l-4 border-l-blue-500 border-zinc-800 hover:border-l-blue-400";
                      let bgClass = "bg-zinc-900/30 hover:bg-zinc-900/60";
                      let iconColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
                      
                      if (n.type === "ACCESS_REQUEST") {
                        borderClass = "border-l-4 border-l-amber-500 border-zinc-800 hover:border-l-amber-400";
                        bgClass = "bg-amber-950/5 hover:bg-amber-950/15";
                        iconColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                      } else if (n.type === "REGISTRATION") {
                        borderClass = "border-l-4 border-l-green-500 border-zinc-800 hover:border-l-green-400";
                        bgClass = "bg-green-950/5 hover:bg-green-950/15";
                        iconColor = "text-green-400 bg-green-500/10 border-green-500/20";
                      } else if (n.title?.includes("phạt") || n.message?.includes("Đi muộn")) {
                        borderClass = "border-l-4 border-l-red-500 border-zinc-800 hover:border-l-red-400";
                        bgClass = "bg-red-950/5 hover:bg-red-950/15";
                        iconColor = "text-red-400 bg-red-500/10 border-red-500/20";
                      }

                      if (!n.read) {
                        bgClass += " border-gold/10";
                      }

                      return (
                        <div
                          key={n.id || i}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-4 rounded-md border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${borderClass} ${bgClass}`}
                        >
                          <div className="flex items-start gap-4 min-w-0 flex-1">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border ${iconColor}`}>
                              {n.type === "ACCESS_REQUEST" ? (
                                <UserSearch size={18} />
                              ) : n.type === "REGISTRATION" ? (
                                <UserPlus size={18} />
                              ) : (
                                <Bell size={18} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center flex-wrap gap-2 mb-1">
                                <p className="text-sm font-bold text-white font-mono">{n.title}</p>
                                {!n.read && (
                                  <span className="px-2 py-0.5 rounded-sm bg-gold/10 border border-gold/30 text-[8px] font-black uppercase tracking-wider text-gold">MỚI</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed font-medium">{n.message}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t border-zinc-800/50 pt-3 md:pt-0 md:border-0">
                            {/* Inline quick actions for ACCESS_REQUEST */}
                            {n.type === "ACCESS_REQUEST" && (!n.read || n.data?.status === "PENDING") && (
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={async () => {
                                    await handleApproveRequestDirect(n.data, true);
                                  }}
                                  className="px-3 h-8 bg-green-500 hover:bg-green-600 text-zinc-950 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all cursor-pointer"
                                >
                                  Duyệt
                                </button>
                                <button
                                  onClick={async () => {
                                    await handleApproveRequestDirect(n.data, false);
                                  }}
                                  className="px-3 h-8 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-all cursor-pointer"
                                >
                                  Từ chối
                                </button>
                              </div>
                            )}

                            {/* Inline quick actions for REGISTRATION */}
                            {n.type === "REGISTRATION" && !n.read && (
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    const authorObj = typeof n.author === 'object' ? n.author : null;
                                    setPendingApproveUser(authorObj || {
                                      _id: n.userId || n.author || "",
                                      name: n.title?.includes("đăng ký") ? n.message?.split("Tài khoản ")[1]?.split(" đang chờ duyệt")[0] || "Tài khoản mới" : "Tài khoản mới",
                                      username: n.title?.includes("đăng ký") ? n.message?.split("Tài khoản ")[1]?.split(" đang chờ duyệt")[0] || "" : ""
                                    });
                                  }}
                                  className="px-3 h-8 bg-gold hover:bg-gold-hover text-zinc-950 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all cursor-pointer"
                                >
                                  Duyệt
                                </button>
                                <button
                                  onClick={async () => {
                                    const authorObj = typeof n.author === 'object' ? n.author : null;
                                    const userId = n.userId || n.author || (authorObj ? authorObj._id || authorObj.id : "");
                                    if (!userId) return;
                                    toast.loading("Đang từ chối...", { id: "reject-reg" });
                                    try {
                                      const res = await fetch(`/api/admin/users/${userId}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ status: "LOCKED" })
                                      });
                                      toast.dismiss("reject-reg");
                                      if (res.ok) {
                                        toast.success("Đã từ chối tài khoản này!");
                                        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                                        mutate('/api/admin/users');
                                      } else {
                                        toast.error("Từ chối thất bại");
                                      }
                                    } catch (err) {
                                      toast.dismiss("reject-reg");
                                      toast.error("Lỗi kết nối");
                                    }
                                  }}
                                  className="px-3 h-8 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-all cursor-pointer"
                                >
                                  Từ chối
                                </button>
                              </div>
                            )}

                            <div className="text-right">
                              <p className="text-[10px] text-gray-500 font-bold font-mono uppercase">{n.time || "Vừa xong"}</p>
                              {n.data?.status && (
                                <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-wider ${
                                  n.data.status === "PENDING"
                                    ? "bg-amber-500/10 text-amber-400"
                                    : n.data.status === "APPROVED"
                                      ? "bg-green-500/10 text-green-400"
                                      : "bg-red-500/10 text-red-400"
                                }`}>
                                  {n.data.status}
                                </span>
                              )}
                            </div>

                            {!n.read && (
                              <span className="flex h-2 w-2 relative shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-24 text-center text-gray-500 flex flex-col items-center justify-center">
                    <Bell size={48} className="text-zinc-800 mb-4 animate-bounce" />
                    <p className="text-sm font-black uppercase tracking-widest text-zinc-600">Không tìm thấy thông báo nào</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

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
