"use client";

import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import dynamic from "next/dynamic";
const ProfileModal = dynamic(() => import("@/components/admin/ProfileModal"), { ssr: false });
const AccessLock = dynamic(() => import("@/components/admin/modals/AccessLock"), { ssr: false });
import { useRouter } from "next/navigation";
import { Bell, Check, X, Clock, CheckCircle2, MessageSquare, Send, MessageCircle, Plus, FileText, Download, Paperclip, Phone, Minus, Copy, ExternalLink, ShieldAlert, Loader2, Search, UserSearch } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR, { mutate } from "swr";
import RealtimeProvider from "@/components/admin/RealtimeProvider";
import { toast } from "react-hot-toast";
import { clearAllLocalStorage } from "@/lib/clientUtils";

const lastSyncedCache: Record<string, string | null> = {};

const TypingBubble = ({ senderName }: { senderName?: string }) => {
  return (
  <div className="flex flex-col self-start items-start max-w-[80%] animate-pulse">
  {senderName && (
  <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-0.5 ml-1">
  {senderName}
  </span>
  )}
  <div className="bg-white/5 border border-white/0 p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
  <span className="text-[10px] text-gray-400 font-bold mr-1">Đang soạn</span>
  <span className="flex items-center gap-0.5 h-3">
  <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
  <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '0.8s' }} />
  <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '0.8s' }} />
  </span>
  </div>
  </div>
  );
};

const getMessageStatus = (msg: any) => {
  const msgTime = Number(msg.id?.split("_")[1]) || (msg.createdAt ? new Date(msg.createdAt).getTime() : 0);
  if (msgTime === 0) return null;

  const receiver = msg.receiverUsername || msg.receiver;
  const sender = msg.senderUsername || msg.sender;

  const readTimeStr = typeof window !== "undefined" ? localStorage.getItem(`chat_last_read_time_${receiver}_${sender}`) : null;
  const readTime = readTimeStr ? Number(readTimeStr) : 0;

  const receivedTimeStr = typeof window !== "undefined" ? localStorage.getItem(`chat_last_received_time_${receiver}_${sender}`) : null;
  const receivedTime = receivedTimeStr ? Number(receivedTimeStr) : 0;

  if (readTime >= msgTime) {
    return <span className="text-[9px] text-green-500 font-bold ml-1">✓✓ Đã xem</span>;
  }
  if (receivedTime >= msgTime) {
    return <span className="text-[9px] text-gray-400 text-zinc-500 font-bold ml-1">✓✓ Đã nhận</span>;
  }
  return <span className="text-[9px] text-gray-400 text-zinc-500 font-bold ml-1">✓ Đã gửi</span>;
};

const getStableDateString = () => {
 const d = new Date();
 const year = d.getFullYear();
 const month = String(d.getMonth() + 1).padStart(2, '0');
 const day = String(d.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
};

import { StaffData } from "@/types/admin";

export default function AdminLayoutClient({
 children,
 user: initialUser,
}: {
 children: React.ReactNode;
 user: any;
}) {

  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        if (window.innerWidth < 1200) {
          setIsCollapsed(true);
        } else {
          setIsCollapsed(false);
        }
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

 const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<StaffData | null>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return initialUser;
  });
 const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);

 useEffect(() => {
    const fetchFullUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            if (typeof window !== "undefined") {
              localStorage.setItem("user", JSON.stringify(data.user));
              sessionStorage.setItem("user", JSON.stringify(data.user));
            }
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch full user on layout load:", err);
      }
      
      // Fallback to initialUser
      if (initialUser) {
        setUser(initialUser);
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(initialUser));
        }
      }
    };

    fetchFullUser();
  }, [initialUser]);
 const [bankConfig, setBankConfig] = useState<any>(null);

 useEffect(() => {
 const loadBankConfig = () => {
 const savedBankConfig = localStorage.getItem("global_bank_config");
 if (savedBankConfig) {
 setBankConfig(JSON.parse(savedBankConfig));
 } else {
 setBankConfig({
 bankName:"MB",
 bankBin:"970422",
 accountNumber:"686820388888",
 accountHolder:"CÔNG TY TNHH AQ MEDIA"
 });
 }
 };

 loadBankConfig();
 window.addEventListener("storage", loadBankConfig);
 return () => window.removeEventListener("storage", loadBankConfig);
 }, []);

 const [realtimeToast, setRealtimeToast] = useState<string | null>(null);
 const [isChatOpen, setIsChatOpen] = useState(false);
 const [chatTab, setChatTab] = useState<"COMPANY" |"PRIVATE">("COMPANY");
 const [chatMessage, setChatMessage] = useState("");
 const [selectedChatFile, setSelectedChatFile] = useState<any>(null);
 const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
 const companyFileInputRef = React.useRef<HTMLInputElement>(null);
 const privateFileInputRef = React.useRef<HTMLInputElement>(null);
 const companyMessagesEndRef = React.useRef<HTMLDivElement>(null);
 const privateMessagesEndRef = React.useRef<HTMLDivElement>(null);
 const [companyMessages, setCompanyMessages] = useState<any[]>([]);
 const [privateMessages, setPrivateMessages] = useState<any[]>([]);
 const [activeChatUser, setActiveChatUser] = useState<any>(null);
 const [chatUsers, setChatUsers] = useState<any[]>([]);
 const [unreadCount, setUnreadCount] = useState(0);

 const scrollToBottom = React.useCallback(() => {
   setTimeout(() => {
     if (chatTab === "COMPANY") {
       companyMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
     } else {
       privateMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
     }
   }, 100);
 }, [chatTab]);

  const [brandName, setBrandName] = useState("AQ MEDIA");

  const handleMessageClick = async (partner: any) => {
    setActiveChatUser(partner);
    const partnerId = partner.id || partner._id;
    if (partnerId) {
      try {
        await fetch('/api/messages/mark-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ partnerId })
        });
        if (typeof mutateChat === 'function') {
          await mutateChat();
        }
        router.refresh();
      } catch (e) {}
    }
  };

  useEffect(() => {
    const loadAgencyConfig = () => {
      const savedConfig = localStorage.getItem("global_agency_config");
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          if (parsed.name) {
            setBrandName(parsed.name);
          }
        } catch (e) {}
      }
    };
    loadAgencyConfig();
    window.addEventListener("storage", loadAgencyConfig);
    return () => window.removeEventListener("storage", loadAgencyConfig);
  }, []);

 const safeText = (value: unknown) => {
   if (value === null || value === undefined) return "";
   if (typeof value === "object") return "";
   return String(value);
 };

 const [isPartnerTyping, setIsPartnerTyping] = useState(false);
 const [companyTypingUsers, setCompanyTypingUsers] = useState<string[]>([]);
 const prevPrivateLengthRef = React.useRef(0);
 const prevCompanyLengthRef = React.useRef(0);
 const isInitialLoadRef = React.useRef(true);
 const audioCtxRef = React.useRef<AudioContext | null>(null);

 const playChatChime = () => {
 try {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  // Reuse a single AudioContext to avoid browser suspension issues
  if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
   audioCtxRef.current = new AudioContextClass();
  }
  const ctx = audioCtxRef.current;

  // Resume if suspended (required by autoplay policy after page load)
  if (ctx.state === "suspended") {
   ctx.resume().catch(() => {});
  }

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);

  osc2.type = "sine";
  osc2.frequency.setValueAtTime(440, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 0.45);
  osc2.stop(ctx.currentTime + 0.45);
 } catch (e) {
  console.error("Audio chime error:", e);
 }
 };

 const handleInputChange = (val: string) => {
 setChatMessage(val);
 if (!user) return;

 if (chatTab ==="COMPANY") {
 const key = `chat_typing_company_${user?.username}`;
 localStorage.setItem(key, Date.now().toString());
 } else if (chatTab ==="PRIVATE" && activeChatUser) {
 const key = `chat_typing_private_${user?.username}_${activeChatUser.username}`;
 localStorage.setItem(key, Date.now().toString());
 }
 };

 useEffect(() => {
 const checkRealtimeToast = () => {
 const storedUserStr = sessionStorage.getItem("user") || localStorage.getItem("user");
 if (!storedUserStr) return;
 const currentUser = JSON.parse(storedUserStr);

 const toastDataStr = localStorage.getItem("realtime_toast");
 if (toastDataStr) {
 const toastData = JSON.parse(toastDataStr);
 if (String(toastData.userId) === String(currentUser?.id)) {
 setRealtimeToast(toastData.message ||"Bạn nhận được công việc mới");
 localStorage.removeItem("realtime_toast");
 setTimeout(() => setRealtimeToast(null), 5000);
 }
 }
 };

 checkRealtimeToast();
 window.addEventListener("storage", checkRealtimeToast);
 const pollInterval = setInterval(checkRealtimeToast, 5000); // 5s thay vì 1s

 return () => {
 window.removeEventListener("storage", checkRealtimeToast);
 clearInterval(pollInterval);
 };
 }, []);

 // useNotification: Poll API reminders
 useEffect(() => {
 const pollReminders = async () => {
 const storedUserStr = sessionStorage.getItem("user") || localStorage.getItem("user");
 if (!storedUserStr) return;
 const currentUser = JSON.parse(storedUserStr);
 // Chỉ poll nếu là nhân viên
 if (["04","05","NHÂN VIÊN","NV THỬ VIỆC"].includes(currentUser?.role)) {
 try {
 const res = await fetch('/api/admin/tasks/reminders');
 if (res.ok) {
 window.dispatchEvent(new Event("storage"));
 }
 } catch (err) {
 console.error("Reminder poll error", err);
 }
 }
 };

 // Poll mỗi 1 phút (60000ms)
 const reminderInterval = setInterval(pollReminders, 60000);
 return () => clearInterval(reminderInterval);
 }, []);

  const checkAccess = async () => {
    const activeUserStr = typeof window !== "undefined" ? (sessionStorage.getItem("user") || localStorage.getItem("user")) : null;
    if (!activeUserStr) return;
    const currentUser = JSON.parse(activeUserStr);

    const roleStr = String(currentUser?.role || "");
    const isAdminOrWorkManager = 
      roleStr === "01" || 
      roleStr === "02" || 
      roleStr.toUpperCase() === "ADMIN" || 
      roleStr.toUpperCase() === "QL CÔNG VIỆC" || 
      roleStr.toUpperCase() === "QUẢN LÝ CÔNG VIỆC" ||
      currentUser?.username === "01";

    if (isAdminOrWorkManager) {
      setAccessStatus('GRANTED');
      setIsChecking(false);
      return;
    }

    try {
      // Parallel fetch settings and check-status to verify locks securely on server
      const [settingsRes, statusRes] = await Promise.all([
        fetch('/api/admin/settings').then(r => r.json()).catch(() => null),
        fetch(`/api/auth/check-status?username=${encodeURIComponent(currentUser.username)}`).then(r => r.json()).catch(() => ({ status: "REJECTED" }))
      ]);

      const settings = settingsRes?.success ? settingsRes.data : null;
      const isApproved = statusRes && statusRes.status === "ACTIVE";

      // Set isAccessGranted strictly based on server status to close client bypasses
      setIsAccessGranted(isApproved);

      const nowTime = new Date();
      const utcTime = nowTime.getTime() + nowTime.getTimezoneOffset() * 60000;
      const vnTime = new Date(utcTime + 3600000 * 7);
      const vnTotalMinutes = vnTime.getHours() * 60 + vnTime.getMinutes();
      const isSunday = vnTime.getDay() === 0;

      let openTimeStr = "08:00";
      let closeTimeStr = "18:00";
      if (settings) {
        if (settings.startTime) openTimeStr = settings.startTime;
        if (settings.endTime) closeTimeStr = settings.endTime;
      }

      const [openH, openM] = openTimeStr.split(":").map(Number);
      const [closeH, closeM] = closeTimeStr.split(":").map(Number);
      const startMins = openH * 60 + openM - 10;
      const closeMins = closeH * 60 + closeM;

      const isWithinWorkingHours = vnTotalMinutes >= startMins && vnTotalMinutes < closeMins;
      const isRestrictedRole = roleStr === "03" || roleStr === "04" || roleStr === "05" || 
                               roleStr.includes("03") || roleStr.includes("04") || roleStr.includes("05") ||
                               ["QL NHÂN SỰ", "NHÂN VIÊN", "NV THỬ VIỆC"].includes(roleStr.toUpperCase());

      if (isSunday && isRestrictedRole && !isApproved) {
        setAccessStatus('CLOSED');
        setIsChecking(false);
        return;
      }

      if (!isWithinWorkingHours && !isApproved) {
        setAccessStatus('CLOSED');
        setIsChecking(false);
        return;
      }

      // Check locks and fines securely based on server statusRes
      if (statusRes?.isLateLocked || statusRes?.userStatus === "LOCKED" || statusRes?.status === "REJECTED") {
        setAccessStatus('LATE');
        try {
          const finesRes = await fetch('/api/admin/fines').then(r => r.json());
          const fines = Array.isArray(finesRes) ? finesRes : (finesRes?.data || []);
          const unpaidLateFine = (fines || []).find((f: any) => {
            const isLateType = f.type === 'LATE' || (f.reason && (f.reason.includes("Đi muộn") || f.reason.includes("đăng nhập ngoài giờ")));
            const isUnpaidOrPending = f.status === 'UNPAID' || f.status === 'PENDING_APPROVAL';
            return isLateType && isUnpaidOrPending;
          });
          if (unpaidLateFine) {
            setFineAmount(unpaidLateFine.amount || 50000);
            if (unpaidLateFine.lateMinutes) setLateMins(unpaidLateFine.lateMinutes);
            setActiveFine(unpaidLateFine);
          }
        } catch (fErr) {
          console.error("Fetch fines error:", fErr);
        }
      } else {
        setAccessStatus('GRANTED');
        setActiveFine(null);
      }
    } catch (err) {
      console.error("checkAccess error:", err);
      setAccessStatus('CLOSED');
    }
    setIsChecking(false);
  };

 const [isAccessGranted, setIsAccessGranted] = useState(false);
 const [accessStatus, setAccessStatus] = useState<string | null>(null);
 const [isChecking, setIsChecking] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [showManagerNotif, setShowManagerNotif] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedAccessRequest, setSelectedAccessRequest] = useState<any>(null);

  useEffect(() => {
    if ((pendingRequests || []).length > 0) {
      setShowManagerNotif(true);
    } else {
      setShowManagerNotif(false);
    }
  }, [pendingRequests]);
 const [roleUpdateNotif, setRoleUpdateNotif] = useState<{ title: string, message: string } | null>(null);
 const lastNotifCountRef = React.useRef(0);
 const isNotifInitializedRef = React.useRef(false);
 const [accessSuccessMsg, setAccessSuccessMsg] = useState<string | null>(null);
 const [isLate, setIsLate] = useState(false);
 const [lateMins, setLateMins] = useState(0);
 const [fineAmount, setFineAmount] = useState(0);
 const [activeFine, setActiveFine] = useState<any>(null);
 const [isFinePaid, setIsFinePaid] = useState(false);
 const [showQRModal, setShowQRModal] = useState(false);
 const [fineSuccessToast, setFineSuccessToast] = useState<string | null>(null);
 const [excuseReason, setExcuseReason] = useState("");
 const [finePaymentPending, setFinePaymentPending] = useState(false);
 const [isPendingApproval, setIsPendingApproval] = useState(false);
 const [isPhonePanelOpen, setIsPhonePanelOpen] = useState(false);
 const [copiedPhoneToast, setCopiedPhoneToast] = useState<string | null>(null);
 const [phoneList, setPhoneList] = useState<any[]>([]);
 const isCurrentlyLockedRef = React.useRef(false);

  useEffect(() => {
    const fetchPhones = async () => {
      if (!user) return;
      const isStaff = ["03", "04", "05"].includes(user.role || "");
      if (isStaff) {
        try {
          const res = await fetch("/api/admin/phones");
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              setPhoneList(data.data);
              localStorage.setItem("global_phones_data", JSON.stringify(data.data));
            }
          }
        } catch (err) {
          console.error("Failed to fetch phones:", err);
        }
      } else {
        const raw = localStorage.getItem("global_phones_data");
        if (raw) {
          setPhoneList(JSON.parse(raw));
        }
      }
    };

    fetchPhones();
    const interval = setInterval(fetchPhones, 10000);
    return () => clearInterval(interval);
  }, [user]);

 const handleUpdatePhoneStatus = (phoneId: string, newStatus: string) => {
 const raw = localStorage.getItem("global_phones_data");
 if (!raw) return;
 const phones = JSON.parse(raw);
 const updated = (phones || []).map((p: any) =>
 p.id === phoneId ? { ...p, status: newStatus } : p
 );
 localStorage.setItem("global_phones_data", JSON.stringify(updated));
 window.dispatchEvent(new Event("storage"));
 
 fetch("/api/admin/phones", {
   method: "PUT",
   headers: { 
     "Content-Type": "application/json"
   },
   body: JSON.stringify({ id: phoneId, status: newStatus }),
 }).catch(() => {});
 };

 const handleCopyPhone = (number: string) => {
 if (typeof navigator !=="undefined" && navigator.clipboard) {
 navigator.clipboard.writeText(number);
 setCopiedPhoneToast(`Đã copy SĐT: ${number}`);
 setTimeout(() => setCopiedPhoneToast(null), 2000);
 }
 };

 useEffect(() => {
 const getActiveUserStr = () => {
 const sess = sessionStorage.getItem("user");
 if (sess) return sess;
 const loc = localStorage.getItem("user");
 if (loc) {
 sessionStorage.setItem("user", loc);
 return loc;
 }
 return null;
 };

 const storedUserStr = getActiveUserStr();
 if (!storedUserStr) {
 router.push("/login");
 return;
 } else {
 // Khởi tạo thông tin user & kiểm tra quyền truy cập ban đầu khi load trang
 const currentUser = JSON.parse(storedUserStr);
 setIsAccessGranted(false);
 const emergencyAccess = localStorage.getItem(`access_${getStableDateString()}_${currentUser?.name}`);
 const accessResponse = localStorage.getItem(`access_response_${currentUser?.name}`);
 if (false) {
 setIsAccessGranted(true);
 }
 }

 const syncUserRole = () => {
 const activeUserStr = getActiveUserStr();
 if (!activeUserStr) return;
 const storedUser = JSON.parse(activeUserStr);

 const storedStaff = localStorage.getItem("global_users");
 if (storedStaff) {
 const allStaff = JSON.parse(storedStaff);
 const latestInfo = allStaff.find((s: any) =>
 (String(s.id) === String(storedUser.id)) ||
 (s.username?.toLowerCase() === storedUser.username?.toLowerCase()) ||
 (s.email?.toLowerCase() === storedUser.email?.toLowerCase() && s.email)
 );

 if (latestInfo) {
 const currentRole = String(storedUser.role);
 const newRole = String(latestInfo.role);

 if (newRole !== currentRole) {
 const newUser = { ...storedUser, role: latestInfo.role };
 sessionStorage.setItem("user", JSON.stringify(newUser));
 setUser(newUser);
 window.dispatchEvent(new Event("storage"));
 } else if (
 !user ||
 storedUser?.id !== user?.id ||
 storedUser?.role !== user?.role ||
 storedUser?.username !== user?.username ||
 storedUser?.name !== user?.name ||
 storedUser?.avatar !== user?.avatar
 ) {
 setUser(storedUser);
 }
 } else {
 if (!user) setUser(storedUser);
 }
 } else {
 if (!user) setUser(storedUser);
 }
 };

  const checkNewNotifications = () => {
    const activeUserStr = getActiveUserStr();
    if (!activeUserStr) return;
    const currentUser = JSON.parse(activeUserStr);

    const allNotifs = JSON.parse(localStorage.getItem("admin_notifications") || "[]");
    const myNotifs = (allNotifs || []).filter((n: any) => n.targetUsername === currentUser?.username);

    if (!isNotifInitializedRef.current) {
      lastNotifCountRef.current = (myNotifs || []).length;
      isNotifInitializedRef.current = true;
    } else if ((myNotifs || []).length > lastNotifCountRef.current) {
      const latest = myNotifs[0];
      setRoleUpdateNotif({ title: latest.title, message: latest.message });
      setTimeout(() => setRoleUpdateNotif(null), 5000);
    }
    lastNotifCountRef.current = (myNotifs || []).length;

    const isAuthorized = currentUser?.role === "ADMIN" || currentUser?.role === "01" || currentUser?.role === "02" || currentUser?.role === "03" || String(currentUser?.role).toUpperCase().includes("QUẢN LÝ");
    if (isAuthorized) {
      // 1. Sync from local storage first for immediate UI responsiveness
      const savedRequests = localStorage.getItem("pending_access_requests");
      if (savedRequests) {
        try {
          setPendingRequests(JSON.parse(savedRequests));
        } catch (e) {}
      }

      // 2. Fetch from DB for robust ground-truth synchronization
      fetch("/api/admin/notifications?type=SYSTEM")
        .then(res => {
          if (!res.ok) throw new Error("Fetch failed");
          return res.json();
        })
        .then(data => {
          const dbNotifs = Array.isArray(data) ? data : (data?.data || []);
          
          const mappedRequests = dbNotifs
            .filter((n: any) => n.type === "ACCESS_REQUEST" && !n.isRead)
            .map((n: any) => {
              const author = n.author || {};
              const messageParts = (n.message || "").split(": ");
              const reason = messageParts.slice(1).join(": ") || "Xin phép truy cập hệ thống";
              
              let subType = "ACCESS";
              if (n.title === "Báo cáo nộp phạt") {
                subType = "FINE_PAYMENT";
              } else if (n.title === "Giải trình đi muộn") {
                subType = "LATE_EXCUSE";
              }
              
              return {
                id: n._id?.toString() || n.id,
                userId: author._id?.toString() || author.id || n.recipientId || "",
                staffName: author.name || "Nhân viên",
                username: author.username || "",
                time: new Date(n.createdAt).toLocaleTimeString("vi-VN"),
                reason: reason,
                type: subType,
                status: "PENDING"
              };
            });

          // Check if there are new requests to play the chime sound
          setPendingRequests(prev => {
            const hasNew = mappedRequests.some((newReq: any) => 
              !prev.some((oldReq: any) => oldReq.id === newReq.id)
            );
            if (hasNew) {
              playChatChime();
            }
            return mappedRequests;
          });

          localStorage.setItem("pending_access_requests", JSON.stringify(mappedRequests));
        })
        .catch(err => console.error("Error syncing pending access requests from DB:", err));
    } else {
      setPendingRequests([]);
    }
  };

 const calculateWorkedHours = (checkInISO: string, checkOutISO: string, startTimeStr: string, endTimeStr: string) => {
 const dIn = new Date(checkInISO);
 const dOut = new Date(checkOutISO);
 const t_in = dIn.getHours() * 60 + dIn.getMinutes();
 const t_out = dOut.getHours() * 60 + dOut.getMinutes();
 const [startH, startM] = (startTimeStr ||"08:00").split(":").map(Number);
 const [endH, endM] = (endTimeStr ||"18:00").split(":").map(Number);
 const startWorkMins = startH * 60 + startM;
 const endWorkMins = endH * 60 + endM;
 const overlap1 = Math.max(0, Math.min(720, t_out) - Math.max(startWorkMins, t_in));
 const overlap2 = Math.max(0, Math.min(endWorkMins, t_out) - Math.max(810, t_in));
const totalWorkingMins = overlap1 + overlap2;
 return (totalWorkingMins / 60).toFixed(2);
 };

;

  const checkLateStatus = () => {
  const activeUserStr = getActiveUserStr();
  if (!activeUserStr) return;
  const currentUser = JSON.parse(activeUserStr);

  if (currentUser?.role === '01' || currentUser?.role === '02' || String(currentUser?.role).toUpperCase() === 'ADMIN' || String(currentUser?.role).toUpperCase().includes('QUẢN LÝ') || String(currentUser?.role).toUpperCase() === 'QL CÔNG VIỆC' || currentUser?.username === '01') {
    setIsLate(false);
    setIsFinePaid(true);
    return;
  }

 const isStaff = currentUser?.role ==="04" || currentUser?.role ==="05" || currentUser?.role ==="NHÂN VIÊN" || currentUser?.role ==="NV THỬ VIỆC" || String(currentUser?.role).includes("04") || String(currentUser?.role).includes("05");
 if (!isStaff) {
 setIsLate(false);
 return;
 }

 const savedUsersStr = localStorage.getItem("global_users");
 const allUsers = savedUsersStr ? JSON.parse(savedUsersStr) : [];
 const userProfile = allUsers.find((u: any) => u.username === currentUser?.username);

 let checkInISO = localStorage.getItem(`checkin_time_${currentUser?.username}`);
 let isCheckedInToday = false;
 if (checkInISO) {
 const d = new Date(checkInISO);
 const today = new Date();
 isCheckedInToday = d.getDate() === today.getDate() &&
 d.getMonth() === today.getMonth() &&
 d.getFullYear() === today.getFullYear();
 }

 if (!isCheckedInToday) {
 const fullISO = new Date().toISOString();
 localStorage.setItem(`checkin_time_${currentUser?.username}`, fullISO);
 const timeStr = new Date().toLocaleTimeString("vi-VN", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
 const updatedUsers = (allUsers || []).map((u: any) =>
 u.username === currentUser?.username ? { ...u, checkInTime: timeStr, isOnline: true } : u
 );
 localStorage.setItem("global_users", JSON.stringify(updatedUsers));
 window.dispatchEvent(new Event("storage"));
 checkInISO = fullISO;
 }

 if (checkInISO) {
 const dIn = new Date(checkInISO);
 const H = dIn.getHours();
 const M = dIn.getMinutes();
 const mins = H * 60 + M;
 if (mins > 480) { // 8:00 AM
 const diff = mins - 480;
 if (!activeFine) {
 setLateMins(diff);
 }

 let amt = 50000;
 if (diff >= 1 && diff <= 5) amt = 10000;
 else if (diff >= 6 && diff <= 19) amt = 20000;
 if (!activeFine) {
 setFineAmount(amt);
 }

 // If they are late and user profile isLateLocked hasn't been set yet
 if (userProfile && userProfile.isLateLocked === undefined) {
 const updatedUsers = (allUsers || []).map((u: any) => u.username === currentUser?.username ? { ...u, isLateLocked: true } : u);
 localStorage.setItem("global_users", JSON.stringify(updatedUsers));
 window.dispatchEvent(new Event("storage"));
 }

 const locked = userProfile ? userProfile.isLateLocked !== false : true;
 setIsLate(locked);
 } else {
 setIsLate(false);
 }
 } else {
 setIsLate(false);
 }

 const isLocked = userProfile ? userProfile.isLateLocked !== false : false;
 setIsFinePaid(!isLocked);
 if (userProfile && userProfile.finePaymentStatus ==="PENDING_APPROVAL") {
 setFinePaymentPending(true);
 } else {
 setFinePaymentPending(false);
 }
  const isPending = (userProfile ? (userProfile.finePaymentStatus ==="PENDING_APPROVAL" || userProfile.lateExcuseStatus ==="PENDING_APPROVAL" || userProfile.status === "PENDING") : false) || statusData?.userStatus === "PENDING";
  setIsPendingApproval(isPending);

 // Auto check-out based on global_work_config endTime
 const savedWorkConfigStr = localStorage.getItem("global_work_config");
 let startTimeStr ="08:00";
 let endTimeStr ="18:00";
 let closeTimeMins = 1080; // Default 18:00 (18 * 60)
 if (savedWorkConfigStr) {
 try {
 const wc = JSON.parse(savedWorkConfigStr);
 if (wc.startTime) {
 startTimeStr = wc.startTime;
 }
 if (wc.endTime) {
 endTimeStr = wc.endTime;
 const [h, m] = wc.endTime.split(":");
 closeTimeMins = parseInt(h) * 60 + parseInt(m);
 }
 } catch (e) { /* ignore */ }
 }
 
 const nowTime = new Date();
 const currentTotalMinutes = nowTime.getHours() * 60 + nowTime.getMinutes();
 
 if (currentTotalMinutes >= 1110) {
 const todayStr = nowTime.toISOString().split("T")[0];
 const doneFlag = localStorage.getItem(`auto_checkout_done_${todayStr}`);
 if (!doneFlag) {
 fetch('/api/admin/attendance/auto-checkout', { method: 'POST' })
 .then(res => res.json())
 .then(data => {
 if (data.success) {
 localStorage.setItem(`auto_checkout_done_${todayStr}`,"true");
 }
 })
 .catch(console.error);
 }
 }
 };

    
    syncUserRole();
    checkNewNotifications();
    checkLateStatus();
    checkAccess();

    const interval = setInterval(async () => {
      // Sync trước, sau đó mới kiểm tra quyền để đảm bảo data đã được kéo từ server về
      syncUserRole();
      checkNewNotifications();
      checkLateStatus();
      checkAccess();

      const activeUserStr = getActiveUserStr();
      if (activeUserStr) {
        const currentUser = JSON.parse(activeUserStr);
        // Cập nhật trạng thái chờ duyệt cho yêu cầu truy cập ngoài giờ/Chủ Nhật
        const savedRequests = localStorage.getItem("pending_access_requests");
        const currentRequests = savedRequests ? JSON.parse(savedRequests) : [];
        const hasPendingAccess = currentRequests.some((r: any) => (r.staffName === currentUser?.name || r.username === currentUser?.username) && r.status === "PENDING");
        
        if (hasPendingAccess) {
          setIsPendingApproval(true);
        }
      }
    }, 10000); // Tăng interval lên 10 giây để tối ưu hiệu suất

 const handleStorageChange = (e: StorageEvent) => {
 if (!e.key || e.key ==="global_users" || e.key ==="admin_notifications" || e.key ==="pending_access_requests" || e.key ==="request_trigger" || e.key.startsWith("checkin_time_") || e.key.startsWith("late_fine_paid_")) {
 syncUserRole();
 checkNewNotifications();
 checkLateStatus();
 checkAccess();
 }

 if ((!e.key || e.key ==="global_users" || e.key ==="request_trigger") && user) {
  try {
  const savedUsersStr = localStorage.getItem("global_users");
  if (savedUsersStr) {
  const allUsers = JSON.parse(savedUsersStr);
  const userProfile = allUsers.find((u: any) => u.username === user?.username);
  if (userProfile && userProfile.isLateLocked === false && isCurrentlyLockedRef.current) {
  isCurrentlyLockedRef.current = false;
  window.location.reload();
  }
  }
  } catch (err) {
  console.error("Storage reload trigger error:", err);
  }
 }

 if (e.key ==="pending_access_requests") {
 const activeUserStr = getActiveUserStr();
 if (activeUserStr) {
 const currentUser = JSON.parse(activeUserStr);
 const isAuthorized = currentUser?.role ==="ADMIN" || currentUser?.role ==="01" || currentUser?.role ==="02" || currentUser?.role ==="03" || String(currentUser?.role).toUpperCase().includes("QUẢN LÝ");
 if (isAuthorized) {
 setPendingRequests(JSON.parse(e.newValue ||"[]"));
 } else {
 setPendingRequests([]);
 }
 }
 }

 if (e.key?.startsWith("access_response_") || e.key?.startsWith("access_")) {
   checkAccess();
 }
 };

 window.addEventListener("storage", handleStorageChange);
 return () => {
 clearInterval(interval);
 window.removeEventListener("storage", handleStorageChange);
 };
 }, [user?.role]); // Re-run if role changes locally to keep listeners fresh

  // 2s auto-reload polling for locked tab — only reload on actual unlock transition
  useEffect(() => {
  if (!isLate) return;
  isCurrentlyLockedRef.current = true;
  const checkUnlockInterval = setInterval(() => {
  const savedUsersStr = localStorage.getItem("global_users");
  if (savedUsersStr && user) {
  const allUsers = JSON.parse(savedUsersStr);
  const userProfile = allUsers.find((u: any) => u.username === user?.username);
  if (userProfile && userProfile.isLateLocked === false && isCurrentlyLockedRef.current) {
  isCurrentlyLockedRef.current = false;
  window.location.reload();
  }
  }
  }, 2000);
  return () => clearInterval(checkUnlockInterval);
  }, [isLate, user]);

  const syncRealUsersFromDB = React.useCallback(async () => {
   try {
     const res = await fetch("/api/admin/users");
     if (res.ok) {
       const data = await res.json();
       const realUsers = data.users || data.data || [];
       if (realUsers.length > 0) {
         const formattedUsers = realUsers.map((u: any) => ({
           id: u.id || u._id || String(u.username),
           name: u.name,
           username: u.username,
           role: u.role,
           isOnline: u.isOnline || false,
           lastActive: u.lastActive,
           avatar: u.avatar || "",
           status: u.status || "ACTIVE"
         }));

         setChatUsers(formattedUsers.filter((u: any) => u.username !== user?.username));
         localStorage.setItem("global_users", JSON.stringify(formattedUsers));
       }
     }
   } catch (err) {
     console.error("Failed to sync real users from DB in layout:", err);
   }
  }, [user]);

  const loadChatData = React.useCallback(async () => {
   if (!user) return;

   try {
     // Fetch Company Chat
     const compRes = await fetch("/api/messages?isCompanyChat=true");
     if (compRes.ok) {
       const compData = await compRes.json();
       if (compData.success) setCompanyMessages(compData.data || []);
     }

     // Fetch Private Chat (this would require a more complex API to get all partners, 
     // but for now let's just fetch if there's an active chat user)
     if (activeChatUser) {
       const privRes = await fetch(`/api/messages?partnerId=${activeChatUser.id || activeChatUser._id}`);
       if (privRes.ok) {
         const privData = await privRes.json();
         if (privData.success) setPrivateMessages(privData.data || []);
       }
     }
   } catch (err) {
     console.error("Load chat data error:", err);
   }
  }, [user, activeChatUser]);



  // Realtime useSWR Polling for systemSettings (30s interval)
  const { data: systemSettings } = useSWR("/api/admin/settings", async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          localStorage.setItem("global_work_config", JSON.stringify({
            startTime: json.data.openTime,
            endTime: json.data.closeTime,
            checkInTime: json.data.checkInTime
          }));
          checkAccess();
          return json.data;
        }
      }
    } catch (err) {
      console.error("Poll settings error in layout", err);
    }
    return null;
  }, { revalidateOnFocus: false, dedupingInterval: 60000 });

  // 4. Realtime useSWR Polling for chat and active users (30s interval)

  // Only poll check-status when user is actually in a pending/locked state, not for normal active users
  const needsStatusPolling = accessStatus === 'CLOSED' || accessStatus === 'LATE' || isPendingApproval;
  const statusUrl = (user && needsStatusPolling) ? `/api/auth/check-status?username=${user?.username}` : null;
  const { data: statusData } = useSWR(statusUrl, async () => {
    if (!statusUrl) return null;
    const res = await fetch(statusUrl);
    return res.json();
  }, { revalidateOnFocus: false, dedupingInterval: 5000 });

  const prevStatusRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!statusData || !user) return;
    const currentStatus = statusData?.status || statusData?.access;
    const isNowActive = currentStatus === "ACTIVE" || currentStatus === "GRANTED";
    const wasNotActive = prevStatusRef.current !== null && prevStatusRef.current !== "ACTIVE" && prevStatusRef.current !== "GRANTED";
    
    prevStatusRef.current = currentStatus;

    // Only reload when transitioning from a non-active state to active (e.g. approval granted)
    if (isNowActive && wasNotActive) {
      const accessKey = `access_${getStableDateString()}_${user?.name}`;
      const responseKey = `access_response_${user?.name}`;
      localStorage.setItem(accessKey, "true");
      localStorage.setItem(responseKey, "APPROVED");
      
      const savedUsersStr = localStorage.getItem("global_users");
      if (savedUsersStr) {
        const allUsers = JSON.parse(savedUsersStr);
        const updatedUsers = (allUsers || []).map((u: any) => 
          u.username === user?.username ? { ...u, isLateLocked: false, status: "ACTIVE" } : u
        );
        localStorage.setItem("global_users", JSON.stringify(updatedUsers));
      }
      
      window.location.reload();
    }
  }, [statusData, user]);

  useSWR("sync_users_rlt", async () => {
    if (user) await syncRealUsersFromDB();
    return Date.now();
  }, { revalidateOnFocus: false, dedupingInterval: 5000 });

  const { mutate: mutateChat } = useSWR("sync_chat_rlt", async () => {
    if (user) loadChatData();
    return Date.now();
  }, { revalidateOnFocus: false, dedupingInterval: 5000 });

  useEffect(() => {
    if (!user) return;
    loadChatData();

    const handleChatStorage = (e: StorageEvent) => {
      if (e.key === "global_company_chat" || e.key === "global_private_messages" || e.key === "global_users") {
        loadChatData();
      }
    };

    window.addEventListener("storage", handleChatStorage);
    return () => {
      window.removeEventListener("storage", handleChatStorage);
    };
  }, [user, loadChatData]);

  // Auto kick out when system is closed (Closing time check)
  useEffect(() => {
    if (!user) return;
    
    const checkSystemClosed = async () => {
      const roleStr = String(user.role || "");
      const isStaff = roleStr === "03" || roleStr === "04";
      if (!isStaff) return;

      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            const dbSettings = data.data;
            const closeTime = dbSettings.closeTime || "18:00";
            
            const [h, m] = closeTime.split(":");
            const closeTimeMins = parseInt(h, 10) * 60 + parseInt(m, 10);

            // VN time conversion
            const now = new Date();
            const utc = now.getTime() + now.getTimezoneOffset() * 60000;
            const vnTime = new Date(utc + 3600000 * 7);
            const currentTotalMinutes = vnTime.getHours() * 60 + vnTime.getMinutes();

            if (currentTotalMinutes >= closeTimeMins) {
              // Kick out by calling logout API and cleaning state
              fetch("/api/auth/logout", { method: "POST" })
                .finally(() => {
                  if (typeof window !== "undefined") {
                    clearAllLocalStorage();
                    window.location.href = "/login?error=system_closed";
                  }
                });
            }
          }
        }
      } catch (err) {
        console.error("Auto-kick check failed:", err);
      }
    };

    checkSystemClosed();
    const interval = setInterval(checkSystemClosed, 60000); // Check every 1 minute (60000ms)
    return () => clearInterval(interval);
  }, [user]);

  // Synchronize global_users with the real MongoDB database to eliminate mock users
  useEffect(() => {
    if (!user) return;
    syncRealUsersFromDB();
    const interval = setInterval(syncRealUsersFromDB, 30000);
    return () => clearInterval(interval);
  }, [user, syncRealUsersFromDB]);

 const formatLateMins = (mins: number) => {
 if (mins < 60) return `${mins} phút`;
 const hrs = Math.floor(mins / 60);
 const rem = mins % 60;
 return rem > 0 ? `${hrs} giờ ${rem} phút` : `${hrs} giờ`;
 };

 const getUnreadCountForUser = (senderUsername: string) => {
 if (!user) return 0;
 const lastReadTimeStr = localStorage.getItem(`chat_last_read_time_${user?.username}_${senderUsername}`);
 const lastReadTime = lastReadTimeStr ? Number(lastReadTimeStr) : 0;

 let count = 0;
 privateMessages.forEach((msg: any) => {
    const sender = msg.senderUsername || msg.sender;
    const receiver = msg.receiverUsername || msg.receiver;
    if (sender === senderUsername && receiver === user?.username) {
      const msgTime = Number(msg.id.split("_")[1]) || 0;
      if (msgTime > 0 && msgTime > lastReadTime) {
        count++;
      }
    }
  });
 return count;
 };

 const getCompanyUnreadCount = () => {
 if (!user) return 0;
 const lastReadTimeStr = localStorage.getItem(`chat_last_read_time_${user?.username}`);
 const lastReadTime = lastReadTimeStr ? Number(lastReadTimeStr) : 0;

 let count = 0;
 companyMessages.forEach((msg: any) => {
 const isMe = msg.senderName === (user?.name || user?.username);
 const msgTime = Number(msg.id.split("_")[1]) || 0;
 if (!isMe && msgTime > 0 && msgTime > lastReadTime) {
 count++;
 }
 });
 return count;
 };

 const getPrivateUnreadCount = () => {
 if (!user) return 0;
 let count = 0;
 chatUsers.forEach((u: any) => {
 count += getUnreadCountForUser(u.username);
 });
 return count;
 };

 useEffect(() => {
 if (!user) return;
 if (isInitialLoadRef.current) {
 prevCompanyLengthRef.current = (companyMessages || []).length;
 prevPrivateLengthRef.current = (privateMessages || []).length;
 isInitialLoadRef.current = false;
 return;
 }

 if ((companyMessages || []).length > prevCompanyLengthRef.current) {
 const last = companyMessages[(companyMessages || []).length - 1];
 if (last && last.senderName !== (user?.name || user?.username)) {
 playChatChime();
 }
 prevCompanyLengthRef.current = (companyMessages || []).length;
 }

 if ((privateMessages || []).length > prevPrivateLengthRef.current) {
 const last = privateMessages[(privateMessages || []).length - 1];
 if (last && last.sender !== user?.username && last.receiver === user?.username) {
 playChatChime();
 }
 prevPrivateLengthRef.current = (privateMessages || []).length;
 }
 }, [companyMessages, privateMessages, user]);

 useEffect(() => {
 if (!user) return;
 const checkTyping = () => {
 // Private typing check
 if (chatTab ==="PRIVATE" && activeChatUser) {
 const key = `chat_typing_private_${activeChatUser.username}_${user?.username}`;
 const val = localStorage.getItem(key);
 if (val) {
 const diff = Date.now() - Number(val);
 setIsPartnerTyping(diff < 3000);
 } else {
 setIsPartnerTyping(false);
 }
 } else {
 setIsPartnerTyping(false);
 }

 // Company typing check
 const typingList: string[] = [];
 chatUsers.forEach((u: any) => {
 if (u.username !== user?.username) {
 const key = `chat_typing_company_${u.username}`;
 const val = localStorage.getItem(key);
 if (val && (Date.now() - Number(val)) < 3000) {
 typingList.push(u.name);
 }
 }
 });
 setCompanyTypingUsers(typingList);
 };
const typingTimer = setInterval(checkTyping, 1000);
 return () => clearInterval(typingTimer);
 }, [user, chatTab, activeChatUser, chatUsers]);

  // Update last read time when chat is open or when new message is loaded
  useEffect(() => {
    if (!isChatOpen || !user) return;

    localStorage.setItem(`chat_last_read_time_${user?.username}`, Date.now().toString());

    // If we are actively chatting with a private partner
    if (chatTab === "PRIVATE" && activeChatUser) {
      const partnerId = activeChatUser.id || activeChatUser._id;
      
      // 1. Gọi API POST mark-read để MongoDB cập nhật isRead = true cho tất cả tin nhắn từ partnerId
      if (partnerId) {
        fetch("/api/messages/mark-read", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ partnerId })
        }).catch(() => {});
      }

      localStorage.setItem(`chat_last_read_time_${user?.username}_${activeChatUser.username}`, Date.now().toString());
    }

    // Trigger a local state recalculation to instantly clear badge
    let unread = 0;
    const lastReadTimeStr = localStorage.getItem(`chat_last_read_time_${user?.username}`);
    const lastReadTime = lastReadTimeStr ? parseInt(lastReadTimeStr) : 0;

    companyMessages.forEach((msg: any) => {
      const isMe = msg.senderUsername === user?.username || msg.senderName === (user?.name || user?.username);
      const msgTime = msg.createdAt ? new Date(msg.createdAt).getTime() : (Number(msg.id?.split("_")[1]) || 0);
      if (!isMe && msgTime > lastReadTime) {
        unread++;
      }
    });

    privateMessages.forEach((msg: any) => {
      const isMe = msg.senderUsername === user?.username || msg.sender === user?.username;
      const isForMe = msg.receiverUsername === user?.username || msg.receiver === user?.username;
      const msgTime = msg.createdAt ? new Date(msg.createdAt).getTime() : (Number(msg.id?.split("_")[1]) || 0);
      
      if (!isMe && isForMe) {
        const senderReadTimeStr = localStorage.getItem(`chat_last_read_time_${user?.username}_${msg.senderUsername || msg.sender}`);
        const senderReadTime = senderReadTimeStr ? Number(senderReadTimeStr) : 0;
        if (msgTime > senderReadTime && !msg.isRead) {
          unread++;
        }
      }
    });
    
    // Check if unread really changed to prevent loop
    setUnreadCount(prev => prev !== unread ? unread : prev);
  }, [isChatOpen, chatTab, activeChatUser?.username, companyMessages, privateMessages, user?.username]);

 useEffect(() => {
 if (isChatOpen) {
 scrollToBottom();
 }
 }, [isChatOpen, chatTab, activeChatUser]);

 const safeSetLocalStorage = (key: string, data: any[]) => {
 try {
 localStorage.setItem(key, JSON.stringify(data));
 } catch (e) {
 
 const truncated = data.slice(-15);
 try {
 localStorage.setItem(key, JSON.stringify(truncated));
 } catch (err) {
 console.error("Failed to write to localStorage even after truncation", err);
 }
 }
 };

 const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 if (file.size > 200 * 1024 * 1024) {
 alert("Kích thước tệp tin không được vượt quá 200MB!");
 return;
 }

 if (file.type.startsWith("image/")) {
 const reader = new FileReader();
 reader.onload = (event) => {
 const img = new Image();
 img.onload = () => {
 const canvas = document.createElement("canvas");
 let width = img.width;
 let height = img.height;
 const maxDim = 1200;
 if (width > maxDim || height > maxDim) {
 if (width > height) {
 height = Math.round((height * maxDim) / width);
 width = maxDim;
 } else {
 width = Math.round((width * maxDim) / height);
 height = maxDim;
 }
 }
 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext("2d");
 if (ctx) {
 ctx.drawImage(img, 0, 0, width, height);
 const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
 setSelectedChatFile({
 name: file.name,
 size: (file.size / (1024 * 1024)).toFixed(2) +" MB",
 type: file.type,
 data: compressedBase64
 });
 }
 };
 img.src = event.target?.result as string;
 };
 reader.readAsDataURL(file);
 } else {
 const isZip = file.name.endsWith(".zip") || file.name.endsWith(".rar") || file.name.endsWith(".7z") || file.type.includes("zip") || file.type.includes("compressed");
 setSelectedChatFile({
 name: file.name,
 size: (file.size / (1024 * 1024)).toFixed(2) +" MB",
 type: isZip ?"application/zip" : file.type ||"application/octet-stream",
 data: isZip
 ?"data:application/zip;base64,UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA=="
 :"data:application/octet-stream;base64,U2ltdWxhdGVkIGZpbGUgY29udGVudCBmb3IgQVEgTWVkaWEgQ2hhdC4="
 });
 }
 };

 const handleSendCompanyMessage = (e: React.FormEvent) => {
 e.preventDefault();
 if (!chatMessage.trim() && !selectedChatFile) return;

 const content = chatMessage || (selectedChatFile ? `[Tệp tin] ${selectedChatFile.name}` : "[Tệp tin]");
 
 setChatMessage("");
 setSelectedChatFile(null);
 scrollToBottom();

 fetch("/api/messages", {
   method: "POST",
   headers: {
     "Content-Type": "application/json"
   },
   body: JSON.stringify({
     content,
     isCompanyChat: true
   })
 })
   .then(async (res) => {
     if (res.ok) {
       const data = await res.json();
       if (data.success && data.data) {
         setCompanyMessages(prev => {
           if (prev.some(m => m.id === data.data.id || m._id === data.data._id)) return prev;
           return [...prev, data.data];
         });
         scrollToBottom();
       }
     }
   })
   .catch(err => console.error("POST company message error:", err));
 };

 const handleSendPrivateMessage = (e: React.FormEvent) => {
 e.preventDefault();
 if (!chatMessage.trim() && !selectedChatFile) return;

 const content = chatMessage || (selectedChatFile ? `[Tệp tin] ${selectedChatFile.name}` : "[Tệp tin]");

 setChatMessage("");
 setSelectedChatFile(null);
 scrollToBottom();

  fetch("/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content,
      receiverId: activeChatUser.id || activeChatUser._id,
      isCompanyChat: false
    })
  })
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setPrivateMessages(prev => {
            if (prev.some(m => m.id === data.data.id || m._id === data.data._id)) return prev;
            return [...prev, data.data];
          });
          scrollToBottom();
        }
      }
    })
    .catch(err => console.error("POST message to DB error:", err));
  };

 // Kiểm tra giờ làm việc & ngày Chủ Nhật
 const now = new Date();
 const currentHour = now.getHours();
 const currentMinute = now.getMinutes();
 const totalMinutes = currentHour * 60 + currentMinute;

 const startTime = 7 * 60 + 50; // 7:50 AM
 const endTime = 18 * 60; // 6:00 PM

 const isSunday = now.getDay() === 0;
 const isRestrictedRole = (user?.role ==="03" || user?.role ==="04" || user?.role ==="05" || String(user?.role).includes("03") || String(user?.role).includes("04") || String(user?.role).includes("05") || user?.role ==="QL NHÂN SỰ" || user?.role ==="NHÂN VIÊN" || user?.role ==="NV THỬ VIỆC") && user?.username !== "01";
 const isWorkingHours = totalMinutes >= startTime && totalMinutes < endTime;
 const isStaff = (user?.role ==="04" || user?.role ==="05" || user?.role ==="NHÂN VIÊN" || user?.role ==="NV THỬ VIỆC" || String(user?.role).includes("04") || String(user?.role).includes("05")) && user?.username !== "01";

   const roleUpper = String(user?.role || "").toUpperCase();
   const isAdminOrWorkManager = 
     roleUpper === "01" || 
     roleUpper === "02" || 
     roleUpper === "ADMIN" || 
     roleUpper === "QL CÔNG VIỆC" || 
     roleUpper === "QUẢN LÝ CÔNG VIỆC" ||
     user?.username === "01";

  const shouldLock = !isAdminOrWorkManager && (accessStatus === 'CLOSED' || (isSunday && isRestrictedRole)) && !isAccessGranted;
  const isLateLocked = !isAdminOrWorkManager && accessStatus === 'LATE' && !isAccessGranted;
  useEffect(() => {
    isCurrentlyLockedRef.current = isLateLocked;
  }, [isLateLocked]);

 const [chatSearchTerm, setChatSearchTerm] = useState("");

 const filteredChatUsers = useMemo(() => {
   const list = (chatUsers || []).filter((u: any) => {
     if (u.status !== "ACTIVE") return false;
     if (chatSearchTerm.trim() === "") return true;
     const term = chatSearchTerm.toLowerCase();
     return (
       u.name?.toLowerCase().includes(term) ||
       u.username?.toLowerCase().includes(term)
     );
   });
   return [...list].sort((a, b) => {
     if (a.isOnline && !b.isOnline) return -1;
     if (!a.isOnline && b.isOnline) return 1;
     return 0;
   });
 }, [chatUsers, chatSearchTerm]);

  const getLockMessage = () => {
    if (isSunday) return "Hôm nay là Chủ Nhật. Hệ thống tạm khóa đối với nhân sự và quản lý nhân sự.";
    
    // Retrieve dynamic config
    const savedWorkConfigStr = localStorage.getItem("global_work_config");
    let openTimeStr = "08:00";
    if (savedWorkConfigStr) {
      try {
        const wc = JSON.parse(savedWorkConfigStr);
        if (wc.startTime) openTimeStr = wc.startTime;
      } catch (e) {}
    }

    const [openH, openM] = openTimeStr.split(":").map(Number);
    const startMins = openH * 60 + openM - 10;

    // Vietnam ICT Time
    const nowTime = new Date();
    const utcTime = nowTime.getTime() + nowTime.getTimezoneOffset() * 60000;
    const vnTime = new Date(utcTime + 3600000 * 7);
    const vnTotalMinutes = vnTime.getHours() * 60 + vnTime.getMinutes();

    if (vnTotalMinutes < startMins) {
      return `Chưa đến giờ làm việc, vui lòng đăng nhập lại vào lúc ${openTimeStr}`;
    }
    return "Đã hết giờ làm việc. Hệ thống tự động khóa để bảo mật dữ liệu.";
  };

  const handleLogout = () => {
    clearAllLocalStorage();
    window.location.href = "/login";
  };

 const handleRequestAccess = async () => {
    if (!user) return;
    const requestBody = {
      type: "ACCESS",
      reason: "Xin phép vào hệ thống làm việc ngoài giờ",
      staffName: user.name,
      username: user.username
    };

    try {
      const res = await fetch("/api/admin/attendance/request-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
      if (!res.ok) throw new Error("Gửi yêu cầu thất bại");

      setIsPendingApproval(true);
      const json = await res.json();
      const newRequest = json.data;
      const savedRequests = localStorage.getItem("pending_access_requests");
      const currentRequests = savedRequests ? JSON.parse(savedRequests) : [];
      const updatedRequests = [...currentRequests, newRequest];
      localStorage.setItem("pending_access_requests", JSON.stringify(updatedRequests));

      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("Request access error:", e);
      throw e;
    }
  };

  const handleApprove = async (request: any) => {
    if (!request) return;
    setIsAdminSubmitting(true);
    try {
      const res = await fetch(`/api/admin/attendance/approve-access/${request.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: "APPROVED",
          userId: request.userId,
          type: request.type,
          username: request.username,
          staffName: request.staffName
        })
      });

      if (!res.ok) {
        throw new Error("Duyệt thất bại, vui lòng thử lại");
      }

      mutate((key: any) => typeof key === "string" && key.startsWith("/api/admin/"));

      if (selectedAccessRequest?.id === request.id) {
        setIsAccessModalOpen(false);
        setSelectedAccessRequest(null);
      }
      const updated = (pendingRequests || []).filter((r: any) => r.id !== request.id);
      setPendingRequests(updated);
      localStorage.setItem("pending_access_requests", JSON.stringify(updated));
      localStorage.setItem(`access_response_${request.staffName}`, "APPROVED");
      localStorage.setItem(`access_${getStableDateString()}_${request.staffName}`, "true");

      if (request.type === "FINE_PAYMENT" || request.type === "LATE_EXCUSE") {
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
        window.dispatchEvent(new Event("storage"));
      }

      toast.success(`Đã duyệt yêu cầu cho ${request.staffName}`);
      mutate("admin-dashboard-data");
    } catch (err) {
      console.error("Failed to approve access request:", err);
      toast.error("Duyệt thất bại, vui lòng thử lại");
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const handleDeny = async (request: any) => {
    if (!request) return;
    setIsAdminSubmitting(true);
    try {
      const res = await fetch(`/api/admin/attendance/approve-access/${request.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: "DENIED",
          userId: request.userId,
          type: request.type,
          username: request.username,
          staffName: request.staffName
        })
      });

      if (!res.ok) {
        throw new Error("Từ chối thất bại, vui lòng thử lại");
      }

      mutate((key: any) => typeof key === "string" && key.startsWith("/api/admin/"));

      if (selectedAccessRequest?.id === request.id) {
        setIsAccessModalOpen(false);
        setSelectedAccessRequest(null);
      }
      const updated = (pendingRequests || []).filter((r: any) => r.id !== request.id);
      setPendingRequests(updated);
      localStorage.setItem("pending_access_requests", JSON.stringify(updated));
      localStorage.setItem(`access_response_${request.staffName}`, "DENIED");

      if (request.type === "FINE_PAYMENT" || request.type === "LATE_EXCUSE") {
        const savedUsersStr = localStorage.getItem("global_users");
        const allUsers = savedUsersStr ? JSON.parse(savedUsersStr) : [];
        const updatedUsers = (allUsers || []).map((u: any) =>
          u.username === request.username || u.name === request.staffName
            ? { 
                ...u, 
                finePaymentStatus: request.type === "FINE_PAYMENT" ? "DENIED" : u.finePaymentStatus,
                lateExcuseStatus: request.type === "LATE_EXCUSE" ? "DENIED" : u.lateExcuseStatus
              }
            : u
        );
        localStorage.setItem("global_users", JSON.stringify(updatedUsers));
        window.dispatchEvent(new Event("storage"));
      }

      toast.success(`Đã từ chối yêu cầu của ${request.staffName}`);
      mutate("admin-dashboard-data");
    } catch (err) {
      console.error("Failed to deny access request:", err);
      toast.error("Từ chối thất bại, vui lòng thử lại");
    } finally {
      setIsAdminSubmitting(false);
    }
  };

 // Thông tin mặc định nếu chưa load xong hoặc để modal hiển thị
 const displayUser: StaffData = user || {
 id: "loading",
 username: "loading",
 status: "ACTIVE",
 isOnline: false,
 taskCount: 0,
 kpiProgress: 0,
 name:"Đang tải...",
 email:"loading@aqmedia.vn",
 phone:"0000000000",
 address:"Đang cập nhật",
 role:"USER"
 };

 if (!user) return <div className="min-h-screen bg-[#0a0a0a]" />;

 const myAssignedPhones = (phoneList || []).filter(
    (p: any) =>
      p.assigneeId &&
      (
        (user?.id && String(p.assigneeId) === String(user.id)) ||
        (user?._id && String(p.assigneeId) === String(user._id)) ||
        ((user as any)?.userId && String(p.assigneeId) === String((user as any).userId)) ||
        (user?.username && String(p.assigneeId).toLowerCase() === user.username.toLowerCase())
      ) &&
      p.status !== "XM lần 2" &&
      p.status !== "Lỗi"
  );

 if (!user) {
 return (
 <div className="flex h-screen w-screen items-center justify-center bg-background text-white">
 <div className="flex flex-col items-center gap-4">
 <div className="h-12 w-12 animate-spin rounded-full border-4 border-gold border-t-transparent"></div>
 <p className="font-black uppercase tracking-widest text-gold text-base">Đang tải thông tin...</p>
 </div>
 </div>
 );
 }

 return (
  <div className="flex h-screen bg-background text-xl overflow-hidden">
    <RealtimeProvider
      user={user}
      setChatUsers={setChatUsers}
      setCompanyMessages={setCompanyMessages}
      setPrivateMessages={setPrivateMessages}
      setUnreadCount={setUnreadCount}
      setRoleUpdateNotif={setRoleUpdateNotif}
      setRealtimeToast={setRealtimeToast}
      playChatChime={playChatChime}
      scrollToBottom={scrollToBottom}
      setPendingRequests={setPendingRequests}
      setIsAccessModalOpen={setIsAccessModalOpen}
      setSelectedAccessRequest={setSelectedAccessRequest}
    />
 {/* Sidebar */}
 <Sidebar isCollapsed={isCollapsed} user={user} />

 {/* Main Container */}
 <div
  className={`flex flex-1 flex-col transition-all duration-300 overflow-hidden relative ${isCollapsed ? "pl-[70px] sm:pl-[100px]" : "pl-[320px]"}`}
 >
 {/* Header */}
 <Header
 isCollapsed={isCollapsed}
 onToggle={() => setIsCollapsed(!isCollapsed)}
 onOpenProfile={() => setIsModalOpen(true)}
 onOpenAccessModal={(request) => {
   setSelectedAccessRequest(request);
   setIsAccessModalOpen(true);
 }}
 user={user}
 />

 {/* Content Area */}
 <main className="flex-1 mt-16 p-4 md:p-6 overflow-y-auto custom-scrollbar">
 <div className="min-h-full mx-auto max-w-[1600px] relative">
 {/* CHẶN TUYỆT ĐỐI: Không render children khi bị khóa */}
  {isChecking ? (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 py-20 text-center">
      <Loader2 className="animate-spin text-gold" size={36} />
      <span className="text-sm font-black uppercase tracking-widest text-zinc-500 animate-pulse">Đang xác thực quyền truy cập...</span>
    </div>
  ) : (shouldLock || isLateLocked ? null : children)}

 {/* Real-time Task Notification Toast */}
 <AnimatePresence>
 {realtimeToast && (
 <motion.div
 initial={{ opacity: 0, y: -100, x:"-50%" }}
 animate={{ opacity: 1, y: 30, x:"-50%" }}
 exit={{ opacity: 0, y: -100, x:"-50%" }}
 className="fixed top-0 left-1/2 z-[9999] bg-gold text-sidebar px-8 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 font-black text-base uppercase tracking-widest border border-white/5"
 >
 <Bell size={24} className="animate-bounce" /> {safeText(realtimeToast)}
 </motion.div>
 )}
 </AnimatePresence>

 {/* Role Update Notification Toast */}
 <AnimatePresence>
 {roleUpdateNotif && (
 <motion.div
 initial={{ opacity: 0, x: 100, scale: 0.8 }}
 animate={{ opacity: 1, x: 0, scale: 1 }}
 exit={{ opacity: 0, x: 100, scale: 0.8 }}
 className="fixed bottom-10 right-10 z-[100] bg-sidebar border-2 border-white/5 p-6 rounded-[32px] shadow-[0_20px_50px_rgba(212,175,55,0.2)] w-96 backdrop-blur-xl"
 >
 <div className="flex items-center gap-4">
 <div className="h-12 w-12 bg-gold rounded-2xl flex items-center justify-center text-sidebar shadow-lg shadow-gold/20">
 <Bell size={24} className="animate-tada" />
 </div>
 <div>
 <p className="text-[10px] font-black text-gold uppercase tracking-[0.2em] mb-1">Thông báo mới</p>
 <h4 className="text-lg font-black text-white leading-tight">{safeText(roleUpdateNotif.title)}</h4>
 </div>
 </div>
 <p className="mt-4 text-gray-400 text-base font-medium leading-relaxed">{safeText(roleUpdateNotif.message)}</p>
 <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
 <motion.div initial={{ width:"100%" }} animate={{ width: 0 }} transition={{ duration: 5 }} className="h-full bg-gold" />
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 </div>
 </main>
 </div>

 {/* Access Lock Screen */}
 {shouldLock && (
 <AccessLock
  message={getLockMessage()}
  userName={user?.name ||"Nhân viên"}
  onSendRequest={handleRequestAccess}
  onLogout={handleLogout}
  isPendingApproval={isPendingApproval || statusData?.userStatus === "PENDING"}
  isDeniedApproval={statusData?.status === "REJECTED"}
  username={user?.username}
  userId={user?.id || user?._id || (user as any)?.userId}
 />
 )}

  {/* Late Access Lock Screen */}
  {!shouldLock && isLateLocked && (
    <AccessLock
      message="Báo cáo đi muộn"
      userName={user?.name || "Nhân viên"}
      onSendRequest={async () => {
        if (!user) return;
        const requestBody = {
          type: "ACCESS",
          reason: "Xin phép vào hệ thống làm việc ngoài giờ",
          staffName: user.name,
          username: user.username
        };
        try {
          const res = await fetch("/api/admin/attendance/request-access", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
          });
          if (!res.ok) throw new Error("Gửi yêu cầu thất bại");
          setIsPendingApproval(true);
        } catch (e) {
          console.error(e);
          throw e;
        }
      }}
      onLogout={handleLogout}
      isPendingApproval={isPendingApproval || statusData?.userStatus === "PENDING" || statusData?.lateExcuseStatus === "PENDING_APPROVAL" || statusData?.finePaymentStatus === "PENDING_APPROVAL"}
      isLateLock={true}
      username={user?.username}
      userId={user?.id || user?._id || (user as any)?.userId}
      fineAmount={fineAmount}
      bankConfig={bankConfig}
      lateMins={lateMins}
      onSendExcuse={async (reason) => {
        if (!user) return;
        const requestBody = {
          type: "LATE_EXCUSE",
          reason: `Giải trình đi muộn: ${reason}`,
          staffName: user.name,
          username: user.username
        };
        try {
          const res = await fetch("/api/admin/attendance/request-access", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
          });
          if (!res.ok) throw new Error("Gửi yêu cầu thất bại");
          setIsPendingApproval(true);
          const json = await res.json();
          const newRequest = json.data;
          const savedRequests = localStorage.getItem("pending_access_requests");
          const currentRequests = savedRequests ? JSON.parse(savedRequests) : [];
          const updatedRequests = [...currentRequests, newRequest];
          localStorage.setItem("pending_access_requests", JSON.stringify(updatedRequests));

          const savedUsers = localStorage.getItem("global_users");
          if (savedUsers) {
            const allUsers = JSON.parse(savedUsers);
            const updated = (allUsers || []).map((u: any) =>
              u.username === user.username ? { 
                ...u, 
                isLateLocked: true, 
                lateExcuseStatus: "PENDING_APPROVAL",
                status: "PENDING_APPROVAL" 
              } : u
            );
            localStorage.setItem("global_users", JSON.stringify(updated));
          }
          window.dispatchEvent(new Event("storage"));
        } catch (e) {
          console.error("Excuse submit error:", e);
          throw e;
        }
      }}
      onReportPayment={async () => {
        if (!user) return;
        const requestBody = {
          type: "FINE_PAYMENT",
          reason: `Nộp phạt đi muộn: ${formatLateMins(lateMins)} (${fineAmount.toLocaleString("vi-VN")} VND)`,
          staffName: user.name,
          username: user.username
        };
        try {
          const res = await fetch("/api/admin/attendance/request-access", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
          });
          if (!res.ok) throw new Error("Gửi yêu cầu thất bại");
          setIsPendingApproval(true);
          const json = await res.json();
          const newRequest = json.data;
          const savedRequests = localStorage.getItem("pending_access_requests");
          const currentRequests = savedRequests ? JSON.parse(savedRequests) : [];
          const updatedRequests = [...currentRequests, newRequest];
          localStorage.setItem("pending_access_requests", JSON.stringify(updatedRequests));

          const savedUsers = localStorage.getItem("global_users");
          if (savedUsers) {
            const allUsers = JSON.parse(savedUsers);
            const updated = (allUsers || []).map((u: any) =>
              u.username === user.username ? { 
                ...u, 
                isLateLocked: true, 
                finePaymentStatus: "PENDING_APPROVAL",
                status: "PENDING_APPROVAL"
              } : u
            );
            localStorage.setItem("global_users", JSON.stringify(updated));
          }
          window.dispatchEvent(new Event("storage"));
        } catch (e) {
          console.error("Report payment error:", e);
          throw e;
        }
      }}
      finePaymentPending={finePaymentPending}
      isDeniedApproval={statusData?.lateExcuseStatus === "DENIED" || statusData?.finePaymentStatus === "DENIED" || (() => {
        let isDeniedApproval = false;
        if (user) {
          const savedUsers = localStorage.getItem("global_users");
          if (savedUsers) {
            const allUsers = JSON.parse(savedUsers);
            const u = allUsers.find((u: any) => u.username === user?.username);
            if (u && (u.finePaymentStatus === "DENIED" || u.lateExcuseStatus === "DENIED")) {
              isDeniedApproval = true;
            }
          }
        }
        return isDeniedApproval;
      })()}
      onRetry={() => {
        if (user) {
          const savedUsers = localStorage.getItem("global_users");
          if (savedUsers) {
            const allUsers = JSON.parse(savedUsers);
            const updated = (allUsers || []).map((u: any) => 
              u.username === user?.username ? {
                ...u,
                finePaymentStatus: u.finePaymentStatus === "DENIED" ? null : u.finePaymentStatus,
                lateExcuseStatus: u.lateExcuseStatus === "DENIED" ? null : u.lateExcuseStatus
              } : u
            );
            localStorage.setItem("global_users", JSON.stringify(updated));
            window.dispatchEvent(new Event("storage"));
            window.location.reload();
          }
        }
      }}
    />
  )}

 {/* Fine Success Toast */}
 <AnimatePresence>
 {fineSuccessToast && (
 <motion.div
 initial={{ opacity: 0, y: -100, x:"-50%" }}
 animate={{ opacity: 1, y: 30, x:"-50%" }}
 exit={{ opacity: 0, y: -100, x:"-50%" }}
 className="fixed top-0 left-1/2 z-[9999] bg-green-500 text-white px-8 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 font-black text-base uppercase tracking-widest border border-white/5"
 >
 <CheckCircle2 size={24} className="animate-bounce" /> {fineSuccessToast}
 </motion.div>
 )}
 </AnimatePresence>

 {/* Copied Phone Toast */}
 <AnimatePresence>
 {copiedPhoneToast && (
 <motion.div
 initial={{ opacity: 0, y: -100, x:"-50%" }}
 animate={{ opacity: 1, y: 30, x:"-50%" }}
 exit={{ opacity: 0, y: -100, x:"-50%" }}
 className="fixed top-0 left-1/2 z-[9999] bg-gold text-sidebar px-8 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 font-black text-base uppercase tracking-widest border border-white/5"
 >
 <CheckCircle2 size={24} className="animate-bounce" /> {copiedPhoneToast}
 </motion.div>
 )}
 </AnimatePresence>

  {/* Profile Modal - Highest level for perfect centering */}
  <ProfileModal
  key={`profile_${user?.id}_${user?.role}`}
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  userData={{
  ...displayUser,
  phone: displayUser.phone ||"0987654321",
  address: displayUser.address ||"Hà Nội, Việt Nam"
  }}
  />

  {/* Access Request Approval Modal */}
  <AnimatePresence>
    {isAccessModalOpen && selectedAccessRequest && (
      <div className="fixed inset-0 z-[600] bg-black/80 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md overflow-hidden rounded-lg border border-border bg-background-secondary p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tighter">
              <span className="h-5 w-1 rounded-full bg-gold shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
              Phê duyệt yêu cầu
            </h3>
            <button
              onClick={() => {
                setIsAccessModalOpen(false);
                setSelectedAccessRequest(null);
              }}
              className="rounded-lg p-1 text-foreground-secondary hover:bg-background-tertiary hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-background rounded-md border border-border/50">
              <p className="text-[10px] font-black text-foreground-secondary uppercase mb-1 tracking-wider">Họ tên nhân viên</p>
              <p className="text-sm font-bold text-white">
                {selectedAccessRequest.staffName} (@{selectedAccessRequest.username})
              </p>
            </div>

            <div className="p-4 bg-background rounded-md border border-border/50">
              <p className="text-[10px] font-black text-foreground-secondary uppercase mb-1 tracking-wider">Loại yêu cầu</p>
              <p className="text-sm font-bold text-gold uppercase tracking-widest">
                {selectedAccessRequest.type === "FINE_PAYMENT" 
                  ? "Báo cáo nộp phạt" 
                  : selectedAccessRequest.type === "LATE_EXCUSE" 
                    ? "Giải trình đi muộn" 
                    : "Yêu cầu truy cập ngoài giờ"}
              </p>
            </div>

            <div className="p-4 bg-background rounded-md border border-border/50">
              <p className="text-[10px] font-black text-foreground-secondary uppercase mb-1 tracking-wider">Thời gian gửi</p>
              <p className="text-sm font-bold text-white">{selectedAccessRequest.time}</p>
            </div>

            <div className="p-4 bg-background rounded-md border border-border/50">
              <p className="text-[10px] font-black text-foreground-secondary uppercase mb-1 tracking-wider">Lý do / Nội dung</p>
              <p className="text-sm font-medium text-gray-300 whitespace-pre-wrap">
                {selectedAccessRequest.reason}
              </p>
            </div>
          </div>

          {/* Footer/Actions */}
          <div className="flex gap-3">
            <button
              onClick={async () => {
                await handleApprove(selectedAccessRequest);
              }}
              disabled={isAdminSubmitting}
              className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={18} /> Đồng ý / Duyệt
            </button>
            <button
              onClick={async () => {
                await handleDeny(selectedAccessRequest);
              }}
              disabled={isAdminSubmitting}
              className="flex-1 h-12 bg-red-600/15 hover:bg-red-600/25 border border-red-600/30 text-red-500 font-bold rounded-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={18} /> Từ chối
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>

 {/* Success Access Approval Modal */}
 <AnimatePresence>
 {accessSuccessMsg && (
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
 <div className="mx-auto h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-400 border border-green-500/20 mb-6 shadow-lg shadow-green-500/10">
 <motion.div
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ type:"spring", stiffness: 200, damping: 10 }}
 >
 <Check size={40} />
 </motion.div>
 </div>
 <h3 className="text-2xl font-bold text-white uppercase tracking-tight mb-3">Cấp quyền thành công</h3>
 <p className="text-gray-400 font-medium leading-relaxed mb-8">{safeText(accessSuccessMsg)}</p>
 <button
 onClick={() => setAccessSuccessMsg(null)}
 className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-zinc-50 font-bold rounded-xl transition-colors mt-4"
 >
 Đồng ý & Đóng
 </button>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Floating Chat & Phone Widgets Wrapper */}
 <div className="fixed bottom-6 right-6 z-50 flex flex-row items-center gap-4">
 {/* Floating Chat Widget */}
 {user && (
 <div className="relative flex flex-col items-end">
 <AnimatePresence>
 {isChatOpen && (
 <motion.div
 initial={{ opacity: 0, y: 50, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 50, scale: 0.95 }}
 className="absolute bottom-[100%] right-0 mb-6 w-[400px] h-[600px] bg-zinc-950/95 border border-white/0 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
 >
 {/* Header */}
 <div className="p-4 border-b border-white/0 flex items-center justify-between">
 <div className="flex flex-col">
 <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
 <MessageCircle size={16} className="text-gold" />
 {chatTab ==="COMPANY" ?"Nội Bộ Công Ty" :"Trò Chuyện Nội Bộ"}
 </h3>
 <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">{brandName} Workspace</p>
 </div>
 <button
 onClick={() => setIsChatOpen(false)}
 className="h-8 w-8 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
 >
 <X size={16} />
 </button>
 </div>

 {/* Tabs */}
 <div className="flex border-b border-white/0 p-2 gap-2 bg-[#0a0a0a]">
 <button
 onClick={() => {
 setChatTab("COMPANY");
 setActiveChatUser(null);
 }}
 className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${chatTab ==="COMPANY" ?"bg-gold text-sidebar" :"text-zinc-500 hover:bg-zinc-800 bg-zinc-900/50"}`}
 >
 Công ty
 </button>
 <button
 onClick={() => setChatTab("PRIVATE")}
 className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${chatTab ==="PRIVATE" ?"bg-gold text-sidebar" :"text-zinc-500 hover:bg-zinc-800 bg-zinc-900/50"}`}
 >
 Nhân sự
 </button>
 </div>

 {/* Content Area */}
 <div className="flex-1 flex overflow-hidden">
 {chatTab ==="COMPANY" ? (
 <div className="flex-1 flex flex-col overflow-hidden">
 {/* Messages Area */}
 <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar flex flex-col">
 {(companyMessages || []).length === 0 ? (
 <div className="py-10 text-center text-gray-500 font-bold italic text-sm">
 Chưa có thông báo/tin nhắn nào
 </div>
 ) : (companyMessages || []).map((msg: any) => {
 const isMe = msg.senderName === (user?.name || user?.username);
 return (
 <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ?"self-end items-end" :"self-start items-start"}`}>
 {!isMe && (
 <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-0.5 ml-1">
 {msg.senderName} ({msg.senderRole ==="01" ?"ADMIN" : msg.senderRole ==="02" ?"QLCV" : msg.senderRole ==="03" ?"QLNS" :"NV"})
 </span>
 )}
 <div className={`p-3 rounded-2xl text-sm font-medium leading-relaxed break-all flex flex-col gap-2 ${isMe ?"bg-gold text-sidebar rounded-tr-none" :" bg-white/5 text-white rounded-tl-none border border-white/0"}`}>
 {(msg.content || msg.text) && <span>{msg.content || msg.text}</span>}
 {msg.fileData && msg.fileType?.startsWith("image/") && (
 <div className="rounded-xl overflow-hidden border border-white/0 max-h-36">
 <img
 src={msg.fileData}
 onClick={() => setActiveLightboxImage(msg.fileData)}
 className="w-full h-full object-cover cursor-pointer hover:scale-[1.02] transition-transform"
 title="Bấm để xem ảnh lớn"
 />
 </div>
 )}
 {msg.fileData && !msg.fileType?.startsWith("image/") && (
 <div className={`flex items-center gap-2 p-2 rounded-xl text-left ${isMe ?" bg-white/10 text-sidebar" :" bg-white/5 text-white border border-white/0"}`}>
 <FileText size={16} className={isMe ?"text-sidebar shrink-0" :"text-gold shrink-0"} />
 <div className="min-w-0 flex-1">
 <p className="text-[10px] font-black truncate">{msg.fileName}</p>
 <p className={`text-[8px] font-mono font-bold ${isMe ?"text-sidebar/70" :"text-gray-500"}`}>{msg.fileSize}</p>
 </div>
 <a
 href={msg.fileData}
 download={msg.fileName}
 className={`h-6 w-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isMe ?" bg-sidebar/10 hover:bg-zinc-800 text-zinc-100" :" bg-white/5 hover:bg-gold text-gray-500 text-gray-400 hover:text-sidebar"}`}
 title="Tải xuống tệp tin"
 >
 <Download size={10} />
 </a>
 </div>
 )}
 </div>
  <span className="text-[8px] font-bold font-mono mt-1 px-1">
    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : msg.time}
  </span>
 </div>
 );
 })}
 {(companyTypingUsers || []).length > 0 && (
 <TypingBubble senderName={companyTypingUsers.join(",") +" đang soạn tin..."} />
 )}
 <div ref={companyMessagesEndRef} />
 </div>

 {/* Input Box */}
 {selectedChatFile && (
 <div className="mx-3 my-2 p-2 bg-white/5 border border-white/0 rounded-xl flex items-center justify-between gap-2">
 <div className="flex items-center gap-2 min-w-0">
 <FileText size={16} className="text-gold shrink-0" />
 <div className="min-w-0">
 <p className="text-[10px] font-black text-white truncate">{selectedChatFile.name}</p>
 <p className="text-[8px] font-bold text-gray-500 font-mono">{selectedChatFile.size}</p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setSelectedChatFile(null)}
 className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors"
 >
 <X size={12} />
 </button>
 </div>
 )}

 <form onSubmit={handleSendCompanyMessage} className="p-3 border-t border-white/0 bg-[#0e0e0e] flex gap-2 items-center">
 <input
 type="file"
 ref={companyFileInputRef}
 onChange={handleChatFileSelect}
 className="hidden"
 />
 <button
 type="button"
 onClick={() => companyFileInputRef.current?.click()}
 className="h-10 w-10 shrink-0 bg-white/5 border border-white/0 hover:border-white/0 rounded-xl flex items-center justify-center text-gray-500 text-gray-400 hover:text-gold transition-colors"
 title="Đính kèm ảnh hoặc tệp (tối đa 200MB)"
 >
 <Plus size={16} />
 </button>

 <input
 type="text"
 placeholder="Nhập nội dung tin nhắn..."
 value={chatMessage}
 onChange={(e) => handleInputChange(e.target.value)}
 className="flex-1 h-10 bg-white/5 border border-white/0 focus:border-white/5 rounded-xl px-4 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600 text-gray-400"
 />
 <button type="submit" className="h-10 w-10 bg-gold text-sidebar rounded-xl flex items-center justify-center hover:bg-amber-700 bg-amber-600 hover:text-white transition-colors shadow-lg shadow-gold/10">
 <Send size={14} />
 </button>
 </form>
 </div>
 ) : (
 <div className="flex-1 flex overflow-hidden">
 {/* Left: User Select sidebar */}
 {!activeChatUser ? (
 <div className="flex-1 flex flex-col overflow-y-auto p-2 divide-y divide-white/5 custom-scrollbar">
 <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider p-2">Chọn nhân sự (Online)</div>
 
 {/* Chat Search Input */}
 <div className="p-2 mb-2 relative">
    <div className="relative w-full">
      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-secondary w-3.5 h-3.5 pointer-events-none" />
      <input 
        type="text" 
        placeholder="Tìm tên hoặc username..."
        value={chatSearchTerm}
        onChange={(e) => setChatSearchTerm(e.target.value)}
        className="w-full pl-14 pr-4 h-10 bg-background-secondary border border-border rounded-md text-xs text-foreground placeholder-foreground-secondary/40 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
      />
    </div>
 </div>

 {(filteredChatUsers || []).length > 0 ? (
   filteredChatUsers.map((u: any) => (
   <button
   key={u.id}
   onClick={() => handleMessageClick(u)}
   className="w-full p-3 flex items-center gap-3 rounded-xl hover:bg-white/[0.08] bg-white/5 transition-all text-left group"
   >
   <div className="relative">
   <div className="h-8 w-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-sm text-gold font-black group-hover:scale-105 transition-all">
   {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover rounded-lg" onError={(e) => e.currentTarget.src ="https://ui-avatars.com/api/?name=" + (u.name ||"U") +"&background=d4af37&color=000"} /> : (u.name || u.username || "U").charAt(0)}
   </div>
   <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#161616] ${u.isOnline ? "bg-green-500" : "bg-zinc-600"}`} />
   </div>
   <div className="flex-1 min-w-0">
   <p className="text-sm font-bold text-white truncate">{u.name}</p>
   <p className="text-[8px] font-bold text-gray-500 uppercase mt-0.5">@{u.username}</p>
   </div>
   {getUnreadCountForUser(u.username) > 0 && (
   <span className="bg-red-500 text-white font-mono text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center shadow-lg shrink-0 animate-pulse">
   {getUnreadCountForUser(u.username)}
   </span>
   )}
   </button>
   ))
 ) : (
   <div className="py-20 text-center flex flex-col items-center gap-3">
     <UserSearch size={32} className="text-gray-700" />
     <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest italic">Không tìm thấy nhân sự</p>
   </div>
 )}
 </div>
 ) : (
 <div className="flex-1 flex flex-col overflow-hidden">
 {/* Active private partner header */}
 <div className="p-3 border-b border-white/0 bg-[#0e0e0e] flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="h-6 w-6 rounded bg-gold/10 flex items-center justify-center text-[10px] font-black text-gold">
 {(activeChatUser.name || activeChatUser.username || "U").charAt(0)}
 </div>
 <span className="text-[10px] font-black text-white uppercase truncate max-w-[120px]">{activeChatUser.name}</span>
 </div>
 <button
 onClick={() => setActiveChatUser(null)}
 className="text-[9px] font-bold text-gold uppercase tracking-normal"
 >
 Đổi người
 </button>
 </div>

 {/* Private Messages Area */}
 <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar flex flex-col">
 {privateMessages
  .filter((msg: any) => {
    const sender = msg.senderUsername || msg.sender;
    const receiver = msg.receiverUsername || msg.receiver;
    return (sender === user?.username && receiver === activeChatUser.username) ||
           (sender === activeChatUser.username && receiver === user?.username);
  })
  .map((msg: any) => {
    const isMe = (msg.senderUsername || msg.sender) === user?.username;
 return (
 <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ?"self-end items-end" :"self-start items-start"}`}>
 <div className={`p-3 rounded-2xl text-sm font-medium leading-relaxed break-all flex flex-col gap-2 ${isMe ?"bg-gold text-sidebar rounded-tr-none" :" bg-white/5 text-white rounded-tl-none border border-white/0"}`}>
 {(msg.content || msg.text) && <span>{msg.content || msg.text}</span>}
 {msg.fileData && msg.fileType?.startsWith("image/") && (
 <div className="rounded-xl overflow-hidden border border-white/0 max-h-36">
 <img
 src={msg.fileData}
 onClick={() => setActiveLightboxImage(msg.fileData)}
 className="w-full h-full object-cover cursor-pointer hover:scale-[1.02] transition-transform"
 title="Bấm để xem ảnh lớn"
 />
 </div>
 )}
 {msg.fileData && !msg.fileType?.startsWith("image/") && (
 <div className={`flex items-center gap-2 p-2 rounded-xl text-left ${isMe ?" bg-white/10 text-sidebar" :" bg-white/5 text-white border border-white/0"}`}>
 <FileText size={16} className={isMe ?"text-sidebar shrink-0" :"text-gold shrink-0"} />
 <div className="min-w-0 flex-1">
 <p className="text-[10px] font-black truncate">{msg.fileName}</p>
 <p className={`text-[8px] font-mono font-bold ${isMe ?"text-sidebar/70" :"text-gray-500"}`}>{msg.fileSize}</p>
 </div>
 <a
 href={msg.fileData}
 download={msg.fileName}
 className={`h-6 w-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isMe ?" bg-sidebar/10 hover:bg-sidebar text-sidebar" :" bg-white/5 hover:bg-gold text-zinc-400 hover:text-sidebar"}`}
 title="Tải xuống tệp tin"
 >
 <Download size={10} />
 </a>
 </div>
 )}
 </div>
 <div className="flex items-center gap-1 mt-1 px-1">
  <span className="text-[8px] font-bold font-mono">
    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : msg.time}
  </span>
 {isMe && getMessageStatus(msg)}
 </div>
 </div>
 );
 })}
 {isPartnerTyping && (
 <TypingBubble senderName={activeChatUser.name} />
 )}
 <div ref={privateMessagesEndRef} />
 </div>

 {/* Input box */}
 {selectedChatFile && (
 <div className="mx-3 my-2 p-2 bg-white/5 border border-white/0 rounded-xl flex items-center justify-between gap-2">
 <div className="flex items-center gap-2 min-w-0">
 <FileText size={16} className="text-gold shrink-0" />
 <div className="min-w-0">
 <p className="text-[10px] font-black text-white truncate">{selectedChatFile.name}</p>
 <p className="text-[8px] font-bold text-gray-500 font-mono">{selectedChatFile.size}</p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setSelectedChatFile(null)}
 className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors"
 >
 <X size={12} />
 </button>
 </div>
 )}

 <form onSubmit={handleSendPrivateMessage} className="p-3 border-t border-white/0 bg-[#000000] flex gap-2 items-center">
 <input
 type="file"
 ref={privateFileInputRef}
 onChange={handleChatFileSelect}
 className="hidden"
 />
 <button
 type="button"
 onClick={() => privateFileInputRef.current?.click()}
 className="h-10 w-10 shrink-0 bg-white/5 border border-white/0 hover:border-white/0 rounded-xl flex items-center justify-center text-gray-500 text-gray-400 hover:text-gold transition-colors"
 title="Đính kèm ảnh hoặc tệp (tối đa 200MB)"
 >
 <Plus size={16} />
 </button>

 <input
 type="text"
 placeholder={`Chat với ${activeChatUser.name}...`}
 value={chatMessage}
 onChange={(e) => handleInputChange(e.target.value)}
 className="flex-1 h-10 bg-white/5 border border-white/0 focus:border-white/5 rounded-xl px-4 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600 text-gray-400"
 />
 <button type="submit" className="h-10 w-10 bg-gold text-sidebar rounded-xl flex items-center justify-center hover:bg-amber-600 transition-colors shadow-lg shadow-gold/10">
 <Send size={14} />
 </button>
 </form>
 </div>
 )}
 </div>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Toggle Button */}
 <motion.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 onClick={() => {
 setIsChatOpen(!isChatOpen);
 setIsPhonePanelOpen(false);
 }}
 className="h-14 w-14 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center justify-center transition-colors relative group p-2"
 >
 <MessageCircle size={28} className="group-hover:scale-110 transition-transform duration-300" />
 {unreadCount > 0 ? (
 <span className="absolute -top-1 -right-1 bg-red-500 text-white font-mono text-[11px] font-black h-6 w-6 rounded-full flex items-center justify-center border-2 border-white border-[#161616] shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse">
 {unreadCount > 99 ?"99+" : unreadCount}
 </span>
 ) : (
 <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-white border-sidebar" />
 )}
 </motion.button>
 </div>
 )}

 {/* Floating Phone Widget */}
 {user && (user?.role ==="03" || user?.role ==="04" || user?.role ==="05" || String(user?.role).includes("03") || String(user?.role).includes("04") || String(user?.role).includes("05") || user?.role ==="NHÂN VIÊN" || user?.role ==="NV THỬ VIỆC" || String(user?.role).includes("NHÂN VIÊN") || String(user?.role).includes("THỬ VIỆC")) && (
 <div className="relative flex flex-col items-end">
 <AnimatePresence>
 {isPhonePanelOpen && (
 <motion.div
 initial={{ opacity: 0, y: 50, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 50, scale: 0.95 }}
 className="absolute bottom-[100%] right-0 mb-6 w-96 h-[500px] bg-[#161616]/95 border border-gold/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
 >
 {/* Header */}
 <div className="p-4 border-b border-white/0 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Phone size={16} className="text-gold animate-pulse shrink-0" />
 <h3 className="text-sm font-bold text-white uppercase tracking-wider">Danh sách SĐT ({(myAssignedPhones || []).length})</h3>
 </div>
 <button
 onClick={() => setIsPhonePanelOpen(false)}
 className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
 >
 <X size={16} />
 </button>
 </div>

 {/* Phone List */}
 <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
 {(myAssignedPhones || []).length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center text-center p-6">
 <Phone size={48} className="text-gold/20 mb-4 stroke-1" />
 <p className="text-base font-bold text-gray-300 uppercase tracking-normal">Không có SĐT</p>
 <p className="text-sm text-gray-500 mt-1 max-w-[200px]">Hiện không có số điện thoại nào hoạt động được gán cho bạn.</p>
 </div>
 ) : (
 (myAssignedPhones || []).map((p: any) => (
 <div
 key={p.id}
 className="p-6 bg-white/0 border border-white/0 hover:border-white/0 rounded-2xl transition-all duration-300 flex flex-col gap-3 group relative overflow-hidden"
 >
 <div className="flex items-center justify-between">
 <button
 onClick={() => handleCopyPhone(p.number)}
 className="flex items-center gap-2 group/num text-left active:scale-[0.98] transition-transform"
 title="Bấm để copy số điện thoại"
 >
 <span className="text-lg font-black text-blue-400 group-hover/num:text-blue-300 transition-colors font-mono tracking-wide">{p.number}</span>
 <Copy size={14} className="text-gray-500 group-hover/num:text-blue-400 opacity-0 group-hover/num:opacity-100 transition-all" />
 </button>

 {p.otpLink ? (
 <a
 href={p.otpLink}
 target="_blank"
 rel="noopener noreferrer"
 className="text-[10px] font-black text-gold hover:text-[#0a0a0a] transition-colors bg-gold/10 hover:bg-gold border border-gold/20 px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0"
 >
 <span>Mở OTP</span>
 <ExternalLink size={10} />
 </a>
 ) : (
 <span className="text-[10px] text-gray-500 font-bold px-3 py-1.5 bg-white/5 rounded-lg shrink-0">Không có OTP</span>
 )}
 </div>

 {/* Status buttons */}
 <div className={`grid ${p.status ==="XM lần 1" ?"grid-cols-3" :"grid-cols-2"} gap-2 border-t border-white/0 pt-3`}>
 <button
 onClick={() => handleUpdatePhoneStatus(p.id,"XM lần 1")}
 className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${p.status ==="XM lần 1" ?"bg-gold text-[#0a0a0a] shadow-lg shadow-gold/20" :"bg-gold/10 text-gold hover:bg-gold hover:text-[#0a0a0a]"}`}
 >
 XM Lần 1
 </button>
 {p.status ==="XM lần 1" && (
 <button
 onClick={() => handleUpdatePhoneStatus(p.id,"XM lần 2")}
 className="py-1.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300"
 >
 XM Lần 2
 </button>
 )}
 <button
 onClick={() => handleUpdatePhoneStatus(p.id,"Lỗi")}
 className="py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300"
 >
 Lỗi
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Phone Toggle Button */}
 <motion.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 onClick={() => {
 setIsPhonePanelOpen(!isPhonePanelOpen);
 setIsChatOpen(false);
 }}
 className="h-14 w-14 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center justify-center transition-colors relative group p-2"
 >
 <Phone size={28} className="group-hover:scale-110 transition-transform duration-300" />
 {(myAssignedPhones || []).length > 0 && (
 <span className="absolute -top-1 -right-1 bg-red-500 text-white font-mono text-[11px] font-black h-6 w-6 rounded-full flex items-center justify-center border-2 border-[#161616] shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-bounce">
 {(myAssignedPhones || []).length}
 </span>
 )}
 </motion.button>
 </div>
 )}
 </div>

 {/* Full Screen Image Lightbox */}
 <AnimatePresence>
 {activeLightboxImage && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setActiveLightboxImage(null)}
 className="fixed inset-0 z-[9999] bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
 >
 <button
 onClick={() => setActiveLightboxImage(null)}
 className="absolute top-6 right-6 h-12 w-12 rounded-full bg-white/5 border border-white/0 flex items-center justify-center text-white hover:bg-red-500 hover:border-red-500 transition-colors shadow-2xl"
 title="Đóng xem ảnh"
 >
 <X size={24} />
 </button>
 <motion.div
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 className="relative max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl border border-white/0 bg-sidebar"
 onClick={(e) => e.stopPropagation()}
 >
 <img src={activeLightboxImage} className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}
