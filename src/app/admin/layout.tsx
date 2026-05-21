"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import ProfileModal from "@/components/admin/ProfileModal";
import AccessLock from "@/components/admin/modals/AccessLock";
import { useRouter } from "next/navigation";
import { MOCK_ACCESS_REQUESTS, initMockDB } from "@/data/mockData";
import { Bell, Check, X, Clock, CheckCircle2, MessageSquare, Send, MessageCircle, Plus, FileText, Download, Paperclip, Phone, Minus, Copy, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const lastSyncedCache: Record<string, string | null> = {};

const getStableDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    initMockDB();
  }, []);
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(1200);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowWidth(window.innerWidth);
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
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
  const [user, setUser] = useState<any>(null);
  const [bankConfig, setBankConfig] = useState<any>(null);

  useEffect(() => {
    const loadBankConfig = () => {
      const savedBankConfig = localStorage.getItem("global_bank_config");
      if (savedBankConfig) {
        setBankConfig(JSON.parse(savedBankConfig));
      } else {
        setBankConfig({
          bankName: "MB",
          bankBin: "970422",
          accountNumber: "686820388888",
          accountHolder: "CÔNG TY TNHH AQ MEDIA"
        });
      }
    };

    loadBankConfig();
    window.addEventListener("storage", loadBankConfig);
    return () => window.removeEventListener("storage", loadBankConfig);
  }, []);

  const [realtimeToast, setRealtimeToast] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTab, setChatTab] = useState<"COMPANY" | "PRIVATE">("COMPANY");
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

  useEffect(() => {
    const checkRealtimeToast = () => {
      const storedUserStr = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (!storedUserStr) return;
      const currentUser = JSON.parse(storedUserStr);

      const toastDataStr = localStorage.getItem("realtime_toast");
      if (toastDataStr) {
        const toastData = JSON.parse(toastDataStr);
        if (String(toastData.userId) === String(currentUser.id)) {
          setRealtimeToast(toastData.message || "Bạn nhận được công việc mới");
          localStorage.removeItem("realtime_toast");
          setTimeout(() => setRealtimeToast(null), 5000);
        }
      }
    };

    checkRealtimeToast();
    window.addEventListener("storage", checkRealtimeToast);
    const pollInterval = setInterval(checkRealtimeToast, 1000);

    return () => {
      window.removeEventListener("storage", checkRealtimeToast);
      clearInterval(pollInterval);
    };
  }, []);
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>(MOCK_ACCESS_REQUESTS);
  const [showManagerNotif, setShowManagerNotif] = useState(false);
  const [roleUpdateNotif, setRoleUpdateNotif] = useState<{ title: string, message: string } | null>(null);
  const lastNotifCountRef = React.useRef(0);
  const isNotifInitializedRef = React.useRef(false);
  const [accessSuccessMsg, setAccessSuccessMsg] = useState<string | null>(null);
  const [isLate, setIsLate] = useState(false);
  const [lateMins, setLateMins] = useState(0);
  const [fineAmount, setFineAmount] = useState(0);
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
    const loadPhones = () => {
      const raw = localStorage.getItem("global_phones_data");
      if (raw) {
        setPhoneList(JSON.parse(raw));
      }
    };
    loadPhones();
    window.addEventListener("storage", loadPhones);
    const interval = setInterval(loadPhones, 2000);
    return () => {
      window.removeEventListener("storage", loadPhones);
      clearInterval(interval);
    };
  }, []);

  const handleUpdatePhoneStatus = (phoneId: string, newStatus: string) => {
    const raw = localStorage.getItem("global_phones_data");
    if (!raw) return;
    const phones = JSON.parse(raw);
    const updated = phones.map((p: any) =>
      p.id === phoneId ? { ...p, status: newStatus } : p
    );
    localStorage.setItem("global_phones_data", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
    
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ global_phones_data: JSON.stringify(updated) }),
    }).catch(() => {});
  };

  const handleCopyPhone = (number: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(number);
      setCopiedPhoneToast(`Đã copy SĐT: ${number}`);
      setTimeout(() => setCopiedPhoneToast(null), 2000);
    }
  };

  const syncDatabase = React.useCallback(async () => {
    try {
      const standardKeys = [
        "global_users",
        "global_mails_data",
        "global_tasks_data",
        "global_kpi_data",
        "admin_notifications",
        "realtime_toast",
        "pending_access_requests",
        "global_company_chat",
        "global_private_messages",
        "global_newsfeed_posts",
        "global_phones_data",
        "global_import_history"
      ];

      // Quét các key truy cập ngoài giờ hiện có trong localStorage để đồng bộ
      const localAccessKeys: string[] = [];
      if (typeof window !== "undefined") {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("access_") || key.startsWith("access_response_"))) {
            localAccessKeys.push(key);
          }
        }
      }

      const res = await fetch("/api/sync");
      if (!res.ok) return;
      const serverStore = await res.json();

      // Thêm cả các key access hiện có trên server
      const serverAccessKeys = Object.keys(serverStore).filter(key =>
        key.startsWith("access_") || key.startsWith("access_response_")
      );

      const keys = Array.from(new Set([...standardKeys, ...localAccessKeys, ...serverAccessKeys]));

      const localUpdates: Record<string, string> = {};
      let hasLocalChanges = false;
      let hasRemoteChanges = false;

      keys.forEach(key => {
        const localVal = localStorage.getItem(key);
        const serverVal = serverStore[key];
        const prevSyncedVal = lastSyncedCache[key];

        if (localVal !== null && localVal !== prevSyncedVal && localVal !== serverVal) {
          // Local value has changed! Push to server
          if (localVal !== null) {
            localUpdates[key] = localVal;
            lastSyncedCache[key] = localVal;
            hasLocalChanges = true;
          }
        } else if (serverVal !== prevSyncedVal && serverVal !== localVal) {
          // Server value has changed! Pull to local
          if (serverVal !== undefined && serverVal !== null) {
            try {
              localStorage.setItem(key, serverVal);
            } catch (err) {
              if (key === "global_private_messages" || key === "global_company_chat") {
                try {
                  const parsed = JSON.parse(serverVal);
                  if (Array.isArray(parsed)) {
                    const truncated = parsed.slice(-15);
                    localStorage.setItem(key, JSON.stringify(truncated));
                  }
                } catch (e2) {
                  console.error(`Failed to truncate chat key ${key}`, e2);
                }
              }
            }
            lastSyncedCache[key] = serverVal;
            hasRemoteChanges = true;
          }
        } else {
          // No changes, just sync our tracker cache
          if (serverVal) {
            lastSyncedCache[key] = serverVal;
          } else if (localVal) {
            lastSyncedCache[key] = localVal;
            localUpdates[key] = localVal;
            hasLocalChanges = true;
          }
        }
      });

      if (hasLocalChanges) {
        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(localUpdates)
        });
      }

      if (hasRemoteChanges) {
        window.dispatchEvent(new Event("storage"));
      }
    } catch (err) {
      console.error("Sync error:", err);
    }
  }, []);

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
      const emergencyAccess = localStorage.getItem(`access_${getStableDateString()}_${currentUser.name}`);
      const accessResponse = localStorage.getItem(`access_response_${currentUser.name}`);
      if (emergencyAccess === "true" || accessResponse === "APPROVED") {
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
            storedUser?.name !== user?.name
          ) {
            setUser(storedUser);
          }
        }
      }
    };

    const checkNewNotifications = () => {
      const activeUserStr = getActiveUserStr();
      if (!activeUserStr) return;
      const currentUser = JSON.parse(activeUserStr);

      const allNotifs = JSON.parse(localStorage.getItem("admin_notifications") || "[]");
      const myNotifs = allNotifs.filter((n: any) => n.targetUsername === currentUser.username);

      if (!isNotifInitializedRef.current) {
        lastNotifCountRef.current = myNotifs.length;
        isNotifInitializedRef.current = true;
        return;
      }

      if (myNotifs.length > lastNotifCountRef.current) {
        const latest = myNotifs[0];
        setRoleUpdateNotif({ title: latest.title, message: latest.message });
        setTimeout(() => setRoleUpdateNotif(null), 5000);
      }
      lastNotifCountRef.current = myNotifs.length;

      const isAuthorized = currentUser.role === "ADMIN" || currentUser.role === "01" || currentUser.role === "02";
      if (isAuthorized) {
        const savedRequests = localStorage.getItem("pending_access_requests");
        if (savedRequests) {
          setPendingRequests(JSON.parse(savedRequests));
        }
      } else {
        setPendingRequests([]);
      }
    };

    const checkLateStatus = () => {
      const activeUserStr = getActiveUserStr();
      if (!activeUserStr) return;
      const currentUser = JSON.parse(activeUserStr);
      const isStaff = currentUser.role === "04" || currentUser.role === "NHÂN VIÊN" || String(currentUser.role).includes("04");
      if (!isStaff) {
        setIsLate(false);
        return;
      }

      const savedUsersStr = localStorage.getItem("global_users");
      const allUsers = savedUsersStr ? JSON.parse(savedUsersStr) : [];
      const userProfile = allUsers.find((u: any) => u.username === currentUser.username);

      let checkInISO = localStorage.getItem(`checkin_time_${currentUser.username}`);
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
        localStorage.setItem(`checkin_time_${currentUser.username}`, fullISO);
        const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const updatedUsers = allUsers.map((u: any) =>
          u.username === currentUser.username ? { ...u, checkInTime: timeStr, isOnline: true } : u
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
          setLateMins(diff);

          let amt = 50000;
          if (diff >= 1 && diff <= 5) amt = 10000;
          else if (diff >= 6 && diff <= 19) amt = 20000;
          setFineAmount(amt);

          // If they are late and user profile isLateLocked hasn't been set yet
          if (userProfile && userProfile.isLateLocked === undefined) {
            const updatedUsers = allUsers.map((u: any) => u.username === currentUser.username ? { ...u, isLateLocked: true } : u);
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
      if (userProfile && userProfile.finePaymentStatus === "PENDING_APPROVAL") {
        setFinePaymentPending(true);
      } else {
        setFinePaymentPending(false);
      }
      const isPending = userProfile ? (userProfile.finePaymentStatus === "PENDING_APPROVAL" || userProfile.lateExcuseStatus === "PENDING_APPROVAL") : false;
      setIsPendingApproval(isPending);
    };

    syncDatabase();
    syncUserRole();
    checkNewNotifications();
    checkLateStatus();

    const interval = setInterval(async () => {
      // Sync trước, sau đó mới kiểm tra quyền để đảm bảo data đã được kéo từ server về
      await syncDatabase();
      syncUserRole();
      checkNewNotifications();
      checkLateStatus();

      // Kiểm tra định kỳ và cập nhật isAccessGranted từ localStorage đã được đồng bộ
      const activeUserStr = getActiveUserStr();
      if (activeUserStr) {
        const currentUser = JSON.parse(activeUserStr);
        const emergencyAccess = localStorage.getItem(`access_${getStableDateString()}_${currentUser.name}`);
        const accessResponse = localStorage.getItem(`access_response_${currentUser.name}`);
        if (emergencyAccess === "true" || accessResponse === "APPROVED") {
          setIsAccessGranted(true);
        } else {
          setIsAccessGranted(false);
        }
      }
    }, 1500);

    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || e.key === "global_users" || e.key === "admin_notifications" || e.key === "pending_access_requests" || e.key === "request_trigger" || e.key.startsWith("checkin_time_") || e.key.startsWith("late_fine_paid_")) {
        syncUserRole();
        checkNewNotifications();
        checkLateStatus();
      }

      if ((!e.key || e.key === "global_users" || e.key === "request_trigger") && user) {
        try {
          const savedUsersStr = localStorage.getItem("global_users");
          if (savedUsersStr) {
            const allUsers = JSON.parse(savedUsersStr);
            const userProfile = allUsers.find((u: any) => u.username === user.username);
            if (userProfile && userProfile.isLateLocked === false && isCurrentlyLockedRef.current) {
              window.location.reload();
            }
          }
        } catch (err) {
          console.error("Storage reload trigger error:", err);
        }
      }

      if (e.key === "pending_access_requests") {
        const activeUserStr = getActiveUserStr();
        if (activeUserStr) {
          const currentUser = JSON.parse(activeUserStr);
          const isAuthorized = currentUser.role === "ADMIN" || currentUser.role === "01" || currentUser.role === "02";
          if (isAuthorized) {
            setPendingRequests(JSON.parse(e.newValue || "[]"));
          } else {
            setPendingRequests([]);
          }
        }
      }

      if (e.key?.startsWith("access_response_") || e.key?.startsWith("access_")) {
        const activeUserStr = getActiveUserStr();
        if (activeUserStr) {
          const currentUser = JSON.parse(activeUserStr);
          const emergencyAccess = localStorage.getItem(`access_${getStableDateString()}_${currentUser.name}`);
          const accessResponse = localStorage.getItem(`access_response_${currentUser.name}`);
          if (emergencyAccess === "true" || accessResponse === "APPROVED") {
            setIsAccessGranted(true);
          } else {
            setIsAccessGranted(false);
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user?.role]); // Re-run if role changes locally to keep listeners fresh

  // 2s auto-reload polling for locked tab
  useEffect(() => {
    if (!isLate) return;
    const checkUnlockInterval = setInterval(() => {
      const savedUsersStr = localStorage.getItem("global_users");
      if (savedUsersStr && user) {
        const allUsers = JSON.parse(savedUsersStr);
        const userProfile = allUsers.find((u: any) => u.username === user.username);
        if (userProfile && userProfile.isLateLocked === false) {
          window.location.reload();
        }
      }
    }, 2000);
    return () => clearInterval(checkUnlockInterval);
  }, [isLate, user]);

  const formatLateMins = (mins: number) => {
    if (mins < 60) return `${mins} phút`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs} giờ ${rem} phút` : `${hrs} giờ`;
  };

  const getUnreadCountForUser = (senderUsername: string) => {
    if (!user) return 0;
    const lastReadTimeStr = localStorage.getItem(`chat_last_read_time_${user.username}_${senderUsername}`);
    const lastReadTime = lastReadTimeStr ? Number(lastReadTimeStr) : 0;

    let count = 0;
    privateMessages.forEach((msg: any) => {
      if (msg.sender === senderUsername && msg.receiver === user.username) {
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
    const lastReadTimeStr = localStorage.getItem(`chat_last_read_time_${user.username}`);
    const lastReadTime = lastReadTimeStr ? Number(lastReadTimeStr) : 0;

    let count = 0;
    companyMessages.forEach((msg: any) => {
      const isMe = msg.senderName === (user.name || user.username);
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
    const loadChatData = () => {
      const savedCompany = localStorage.getItem("global_company_chat");
      let companyArr = [];
      if (savedCompany) {
        companyArr = JSON.parse(savedCompany);
        setCompanyMessages(companyArr);
      } else {
        const defaultCompany = [
          { id: "company_1715000000000", senderName: "Admin", senderRole: "01", text: "Chào mừng mọi người đến với AQ MEDIA!", time: "08:00" },
          { id: "company_1715000000001", senderName: "HR Manager", senderRole: "03", text: "Chúc mọi người ngày làm việc hiệu quả nhé!", time: "08:05" }
        ];
        localStorage.setItem("global_company_chat", JSON.stringify(defaultCompany));
        setCompanyMessages(defaultCompany);
        companyArr = defaultCompany;
      }

      const savedPrivate = localStorage.getItem("global_private_messages");
      let privateArr = [];
      if (savedPrivate) {
        privateArr = JSON.parse(savedPrivate);
        setPrivateMessages(privateArr);
      } else {
        localStorage.setItem("global_private_messages", "[]");
        setPrivateMessages([]);
      }

      const savedUsers = localStorage.getItem("global_users");
      if (savedUsers) {
        const allUsers = JSON.parse(savedUsers);
        if (user) {
          setChatUsers(allUsers.filter((u: any) => u.username !== user.username));
        } else {
          setChatUsers(allUsers);
        }
      }

      // Calculate unread count
      let unread = 0;
      if (user) {
        const lastReadTimeStr = localStorage.getItem(`chat_last_read_time_${user.username}`);
        const lastReadTime = lastReadTimeStr ? Number(lastReadTimeStr) : 0;

        companyArr.forEach((msg: any) => {
          const isMe = msg.senderName === (user.name || user.username);
          const msgTime = Number(msg.id.split("_")[1]) || 0;
          if (!isMe && msgTime > 0 && msgTime > lastReadTime) {
            unread++;
          }
        });

        privateArr.forEach((msg: any) => {
          const isMe = msg.sender === user.username;
          const isForMe = msg.receiver === user.username;
          const msgTime = Number(msg.id.split("_")[1]) || 0;
          if (!isMe && isForMe && msgTime > 0) {
            const senderReadTimeStr = localStorage.getItem(`chat_last_read_time_${user.username}_${msg.sender}`);
            const senderReadTime = senderReadTimeStr ? Number(senderReadTimeStr) : 0;
            if (msgTime > senderReadTime) {
              unread++;
            }
          }
        });
      }
      setUnreadCount(unread);
    };

    loadChatData();

    const handleChatStorage = (e: StorageEvent) => {
      if (e.key === "global_company_chat" || e.key === "global_private_messages" || e.key === "global_users") {
        loadChatData();
      }
    };

    window.addEventListener("storage", handleChatStorage);
    const interval = setInterval(loadChatData, 2000);

    return () => {
      window.removeEventListener("storage", handleChatStorage);
      clearInterval(interval);
    };
  }, [user]);

  // Update last read time when chat is open or when new message is loaded
  useEffect(() => {
    if (isChatOpen && user) {
      localStorage.setItem(`chat_last_read_time_${user.username}`, Date.now().toString());

      // If we are actively chatting with a private partner
      if (chatTab === "PRIVATE" && activeChatUser) {
        localStorage.setItem(`chat_last_read_time_${user.username}_${activeChatUser.username}`, Date.now().toString());
      }

      // Trigger a local state recalculation to instantly clear badge
      const savedCompany = localStorage.getItem("global_company_chat");
      const savedPrivate = localStorage.getItem("global_private_messages");
      let unread = 0;

      const companyArr = savedCompany ? JSON.parse(savedCompany) : [];
      companyArr.forEach((msg: any) => {
        const isMe = msg.senderName === (user.name || user.username);
        const msgTime = Number(msg.id.split("_")[1]) || 0;
        if (!isMe && msgTime > 0 && msgTime > Date.now()) {
          unread++;
        }
      });

      const privateArr = savedPrivate ? JSON.parse(savedPrivate) : [];
      privateArr.forEach((msg: any) => {
        const isMe = msg.sender === user.username;
        const isForMe = msg.receiver === user.username;
        const msgTime = Number(msg.id.split("_")[1]) || 0;
        if (!isMe && isForMe && msgTime > 0) {
          const senderReadTimeStr = localStorage.getItem(`chat_last_read_time_${user.username}_${msg.sender}`);
          const senderReadTime = senderReadTimeStr ? Number(senderReadTimeStr) : 0;
          if (msgTime > senderReadTime) {
            unread++;
          }
        }
      });
      setUnreadCount(unread);
    }
  }, [isChatOpen, chatTab, activeChatUser, companyMessages, privateMessages, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatTab === "COMPANY") {
        companyMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        privateMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

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
              size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
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
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        type: isZip ? "application/zip" : file.type || "application/octet-stream",
        data: isZip
          ? "data:application/zip;base64,UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA=="
          : "data:application/octet-stream;base64,U2ltdWxhdGVkIGZpbGUgY29udGVudCBmb3IgQVEgTWVkaWEgQ2hhdC4="
      });
    }
  };

  const handleSendCompanyMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() && !selectedChatFile) return;

    const newMsg = {
      id: `company_${Date.now()}`,
      senderName: user.name || user.username,
      senderRole: user.role,
      text: chatMessage,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      fileName: selectedChatFile?.name,
      fileSize: selectedChatFile?.size,
      fileType: selectedChatFile?.type,
      fileData: selectedChatFile?.data
    };

    const updated = [...companyMessages, newMsg];
    safeSetLocalStorage("global_company_chat", updated);
    setCompanyMessages(updated);
    setChatMessage("");
    setSelectedChatFile(null);
    window.dispatchEvent(new Event("storage"));
    scrollToBottom();

    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ global_company_chat: JSON.stringify(updated) })
    }).catch(err => console.error("Chat sync error:", err));
  };

  const handleSendPrivateMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() && !selectedChatFile) return;

    const newMsg = {
      id: `private_${Date.now()}`,
      sender: user.username,
      receiver: activeChatUser.username,
      text: chatMessage,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      fileName: selectedChatFile?.name,
      fileSize: selectedChatFile?.size,
      fileType: selectedChatFile?.type,
      fileData: selectedChatFile?.data
    };

    const updated = [...privateMessages, newMsg];
    safeSetLocalStorage("global_private_messages", updated);
    setPrivateMessages(updated);
    setChatMessage("");
    setSelectedChatFile(null);
    window.dispatchEvent(new Event("storage"));
    scrollToBottom();

    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ global_private_messages: JSON.stringify(updated) })
    }).catch(err => console.error("Chat sync error:", err));
  };

  // Kiểm tra giờ làm việc & ngày Chủ Nhật
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const totalMinutes = currentHour * 60 + currentMinute;

  const startTime = 7 * 60 + 50; // 7:50 AM
  const endTime = 18 * 60; // 6:00 PM

  const isSunday = now.getDay() === 0;
  const isSundayLockedRole = user?.role === "03" || user?.role === "04" || String(user?.role).includes("03") || String(user?.role).includes("04");
  const isWorkingHours = totalMinutes >= startTime && totalMinutes < endTime;
  const isStaff = user?.role === "04" || user?.role === "NHÂN VIÊN" || String(user?.role).includes("04");

  const shouldLock = ((isSunday && isSundayLockedRole) || (isStaff && !isWorkingHours)) && !isAccessGranted;
  const isLateLocked = isStaff && isLate && !isFinePaid && !isAccessGranted;
  isCurrentlyLockedRef.current = isLateLocked;

  const getLockMessage = () => {
    if (isSunday) return "Hôm nay là Chủ Nhật. Hệ thống tạm khóa đối với nhân sự và quản lý nhân sự.";
    if (totalMinutes < startTime) return "Chưa đến giờ làm việc, vui lòng đăng nhập lại vào lúc 7:50 AM";
    return "Đã hết giờ làm việc. Hệ thống tự động khóa để bảo mật dữ liệu.";
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleRequestAccess = () => {
    if (!user) return;
    const newRequest = {
      id: Date.now(),
      staffName: user.name,
      time: new Date().toLocaleTimeString(),
      reason: "Xin phép vào hệ thống làm việc ngoài giờ",
      status: "PENDING"
    };

    const updatedRequests = [...pendingRequests, newRequest];
    setPendingRequests(updatedRequests);
    localStorage.setItem("pending_access_requests", JSON.stringify(updatedRequests));
    // Tạo trigger để các tab khác nhận được
    localStorage.setItem("request_trigger", Date.now().toString());

    // Đồng bộ lên server ngay lập tức để Admin nhận được yêu cầu
    syncDatabase();
  };

  const handleApprove = (request: any) => {
    const updated = pendingRequests.filter(r => r.id !== request.id);
    setPendingRequests(updated);
    localStorage.setItem("pending_access_requests", JSON.stringify(updated));
    // Cấp quyền và thông báo cho nhân viên
    localStorage.setItem(`access_response_${request.staffName}`, "APPROVED");
    localStorage.setItem(`access_${getStableDateString()}_${request.staffName}`, "true");

    // Nếu đây là yêu cầu nộp phạt hoặc giải trình đi muộn
    if (request.type === "FINE_PAYMENT" || request.type === "LATE_EXCUSE") {
      const savedUsers = localStorage.getItem("global_users");
      if (savedUsers) {
        const allUsers = JSON.parse(savedUsers);
        const updatedUsers = allUsers.map((u: any) =>
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
      }
    }

    // Đồng bộ lên server ngay lập tức để Nhân viên nhận được quyền mở khóa!
    syncDatabase();

    setAccessSuccessMsg(`Đã duyệt yêu cầu cho ${request.staffName}`);
  };

  const handleDeny = (request: any) => {
    const updated = pendingRequests.filter(r => r.id !== request.id);
    setPendingRequests(updated);
    localStorage.setItem("pending_access_requests", JSON.stringify(updated));
    // Thông báo từ chối cho nhân viên
    localStorage.setItem(`access_response_${request.staffName}`, "DENIED");

    // Nếu đây là yêu cầu nộp phạt hoặc giải trình đi muộn
    if (request.type === "FINE_PAYMENT" || request.type === "LATE_EXCUSE") {
      const savedUsers = localStorage.getItem("global_users");
      if (savedUsers) {
        const allUsers = JSON.parse(savedUsers);
        const updatedUsers = allUsers.map((u: any) =>
          u.username === request.username || u.name === request.staffName
            ? { 
                ...u, 
                finePaymentStatus: request.type === "FINE_PAYMENT" ? "DENIED" : u.finePaymentStatus,
                lateExcuseStatus: request.type === "LATE_EXCUSE" ? "DENIED" : u.lateExcuseStatus
              }
            : u
        );
        localStorage.setItem("global_users", JSON.stringify(updatedUsers));
      }
    }

    // Đồng bộ lên server ngay lập tức
    syncDatabase();
  };

  // Thông tin mặc định nếu chưa load xong hoặc để modal hiển thị
  const displayUser = user || {
    name: "Đang tải...",
    email: "loading@aqmedia.vn",
    phone: "0000000000",
    address: "Đang cập nhật",
    role: "USER"
  };

  if (!user) return <div className="min-h-screen bg-[#0a0a0a]" />;

  const myAssignedPhones = phoneList.filter(
    (p: any) =>
      p.assigneeId &&
      user?.username &&
      (p.assigneeId.toLowerCase() === user.username.toLowerCase() ||
        (user.id && String(p.assigneeId) === String(user.id))) &&
      p.status !== "XM lần 2" &&
      p.status !== "Lỗi"
  );

  return (
    <div className="flex h-screen bg-background text-xl overflow-hidden">
      {/* Sidebar */}
      <Sidebar isCollapsed={isCollapsed} user={user} windowWidth={windowWidth} />

      {/* Main Container */}
      <div
        className="flex flex-1 flex-col transition-all duration-300 overflow-hidden relative"
        style={{ paddingLeft: isCollapsed ? (windowWidth < 640 ? "70px" : "100px") : "320px" }}
      >
        {/* Header */}
        <Header
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          onOpenProfile={() => setIsModalOpen(true)}
          user={user}
          windowWidth={windowWidth}
        />

        {/* Content Area */}
        <main className="flex-1 mt-16 p-4 md:p-6 overflow-y-auto custom-scrollbar">
          <div className="min-h-full mx-auto max-w-[1600px] relative">
            {children}

            {/* Real-time Task Notification Toast */}
            <AnimatePresence>
              {realtimeToast && (
                <motion.div
                  initial={{ opacity: 0, y: -100, x: "-50%" }}
                  animate={{ opacity: 1, y: 30, x: "-50%" }}
                  exit={{ opacity: 0, y: -100, x: "-50%" }}
                  className="fixed top-0 left-1/2 z-[9999] bg-gold text-sidebar px-8 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 font-black text-sm uppercase tracking-widest border border-white/20"
                >
                  <Bell size={24} className="animate-bounce" /> {realtimeToast}
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
                  className="fixed bottom-10 right-10 z-[100] bg-sidebar border-2 border-gold/50 p-6 rounded-[32px] shadow-[0_20px_50px_rgba(212,175,55,0.2)] w-96 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gold rounded-2xl flex items-center justify-center text-sidebar shadow-lg shadow-gold/20">
                      <Bell size={24} className="animate-tada" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gold uppercase tracking-[0.2em] mb-1">Thông báo mới</p>
                      <h4 className="text-lg font-black text-white leading-tight">{roleUpdateNotif.title}</h4>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-400 text-sm font-medium leading-relaxed">{roleUpdateNotif.message}</p>
                  <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: "100%" }} animate={{ width: 0 }} transition={{ duration: 5 }} className="h-full bg-gold" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Manager Approval Notification */}
            {(user?.role === "ADMIN" || user?.role === "01" || user?.role === "02" || String(user?.role).toUpperCase().includes("QUẢN LÝ")) && pendingRequests.length > 0 && (
              <div className="fixed bottom-10 right-10 z-50">
                <div className="bg-sidebar border border-gold/30 p-6 rounded-[32px] shadow-2xl w-96">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 bg-gold rounded-full flex items-center justify-center text-sidebar">
                      <Bell size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gold uppercase tracking-widest">Yêu cầu truy cập mới</p>
                      <p className="text-lg font-black text-white">{pendingRequests[0].staffName}</p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-6 font-medium">Nhân viên này đang xin phép truy cập hệ thống ngoài giờ làm việc.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(pendingRequests[0])}
                      className="flex-1 h-12 bg-green-500 rounded-xl text-white font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-all"
                    >
                      <Check size={18} /> Đồng ý
                    </button>
                    <button
                      onClick={() => handleDeny(pendingRequests[0])}
                      className="flex-1 h-12 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all"
                    >
                      <X size={18} /> Từ chối
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Access Lock Screen */}
      {shouldLock && (
        <AccessLock
          message={getLockMessage()}
          userName={user?.name || "Nhân viên"}
          onSendRequest={handleRequestAccess}
          onLogout={handleLogout}
        />
      )}

      {/* Late Access Lock Screen */}
      {!shouldLock && isLateLocked && (
        <div className="fixed inset-0 z-[500] bg-[#070707] text-white flex flex-col items-center justify-center p-6 overflow-y-auto custom-scrollbar">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />

          <div className="w-full max-w-2xl bg-sidebar border border-gold/20 rounded-[32px] p-8 shadow-[0_20px_50px_rgba(212,175,55,0.1)] relative overflow-hidden text-center my-auto">
            {isPendingApproval ? (
              <div className="py-12 space-y-6">
                <div className="h-20 w-20 bg-gold/10 border border-gold/30 text-gold rounded-full flex items-center justify-center mx-auto shadow-lg shadow-gold/5">
                  <Clock size={40} className="animate-pulse" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Đang chờ phê duyệt</h2>
                <p className="text-gray-300 text-sm font-medium max-w-md mx-auto leading-relaxed">
                  Yêu cầu của bạn đã được gửi. Vui lòng đợi Admin hoặc Quản lý phê duyệt để vào hệ thống.
                </p>
                <div className="pt-6">
                  <button
                    onClick={handleLogout}
                    className="px-8 h-12 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-500 font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-300 shadow-lg shadow-red-500/5"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Header info */}
                <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/5">
                  <Clock size={32} className="animate-pulse" />
                </div>

                <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">Báo cáo đi muộn</h2>
                <p className="text-gray-400 text-sm font-medium max-w-md mx-auto leading-relaxed mb-6">
                  Hôm nay bạn check-in lúc <span className="text-red-400 font-bold font-mono">
                    {user ? new Date(localStorage.getItem(`checkin_time_${user.username}`) || "").toLocaleTimeString("vi-VN") : "---"}
                  </span>, đi muộn <span className="text-red-400 font-bold font-mono">{formatLateMins(lateMins)}</span> so với giờ quy định (8:00 AM).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border-t border-b border-white/5 py-8 my-6 text-left">
                  {/* QR Code and Payment details */}
                  <div className="flex flex-col items-center justify-center border-r border-white/5 pr-0 md:pr-6 pb-6 md:pb-0">
                    <div className="bg-white p-4 rounded-2xl shadow-xl border-2 border-gold/40 relative">
                      <img
                        src={`https://img.vietqr.io/image/${bankConfig?.bankBin || bankConfig?.bankName || "MB"}-${bankConfig?.accountNumber || "686820388888"}-compact2.png?amount=${fineAmount}&addInfo=${user?.username || 'Guest'}_Nop_Phat&accountName=${encodeURIComponent(bankConfig?.accountHolder || "CÔNG TY TNHH AQ MEDIA")}`}
                        alt="VietQR Fine Code"
                        className="h-[180px] w-[180px] object-contain rounded-xl"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-3 text-center">Quét mã nộp phạt qua Ngân hàng</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Ngân hàng thụ hưởng</span>
                      <span className="text-sm font-black text-white">{bankConfig?.bankFullName || `${bankConfig?.bankName || "MB"} Bank`}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Số tài khoản</span>
                      <span className="text-sm font-black text-gold font-mono">{bankConfig?.accountNumber || "686820388888"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Tên người nhận</span>
                      <span className="text-sm font-black text-white">{bankConfig?.accountHolder || "CÔNG TY TNHH AQ MEDIA"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Số tiền nộp phạt</span>
                      <span className="text-lg font-black text-red-400 font-mono">
                        {fineAmount.toLocaleString("vi-VN")} VND
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Nội dung chuyển khoản</span>
                      <span className="text-xs font-bold text-gray-300 font-mono bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg block overflow-hidden text-ellipsis whitespace-nowrap">
                        {user?.username.toUpperCase()}_NOP_PHAT
                      </span>
                    </div>
                  </div>
                </div>

                {/* excuse reason textarea */}
                <div className="border-t border-white/5 pt-6 my-6 text-left">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Hoặc gửi lý do giải trình đi muộn (Mở khóa lập tức)</label>
                  <textarea
                    value={excuseReason}
                    onChange={(e) => setExcuseReason(e.target.value)}
                    placeholder="Nhập lý do đi muộn của bạn tại đây (ví dụ: tắc đường, hỏng xe, việc gia đình đột xuất...)"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/5 transition-all resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    disabled={finePaymentPending}
                    onClick={() => {
                      if (user) {
                        const newRequest = {
                          id: Date.now(),
                          staffName: user.name,
                          username: user.username,
                          time: new Date().toLocaleTimeString(),
                          reason: `Nộp phạt đi muộn: ${formatLateMins(lateMins)} (${fineAmount.toLocaleString("vi-VN")} VND)`,
                          status: "PENDING",
                          type: "FINE_PAYMENT"
                        };
                        const savedRequests = localStorage.getItem("pending_access_requests");
                        const currentRequests = savedRequests ? JSON.parse(savedRequests) : [];
                        const updatedRequests = [...currentRequests, newRequest];
                        localStorage.setItem("pending_access_requests", JSON.stringify(updatedRequests));

                        const savedUsers = localStorage.getItem("global_users");
                        if (savedUsers) {
                          const allUsers = JSON.parse(savedUsers);
                          const updated = allUsers.map((u: any) =>
                            u.username === user.username ? { 
                              ...u, 
                              isLateLocked: true, 
                              finePaymentStatus: "PENDING_APPROVAL",
                              lateExcuseStatus: "PENDING_APPROVAL",
                              status: "PENDING_APPROVAL"
                            } : u
                          );
                          localStorage.setItem("global_users", JSON.stringify(updated));
                        }
                        window.dispatchEvent(new Event("storage"));
                        syncDatabase();
                        setFineSuccessToast("Yêu cầu của bạn đã được gửi. Vui lòng đợi Admin hoặc Quản lý phê duyệt để vào hệ thống.");
                        setTimeout(() => setFineSuccessToast(null), 5000);
                      }
                    }}
                    className={`flex-1 h-14 font-black text-sm uppercase tracking-widest rounded-2xl transition-all duration-300 shadow-lg ${finePaymentPending ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 cursor-not-allowed" : "bg-gold text-sidebar hover:bg-white hover:text-sidebar shadow-gold/25"}`}
                  >
                    {finePaymentPending ? "Chờ duyệt..." : "Đã chuyển khoản"}
                  </button>

                  <button
                    onClick={() => {
                      if (!excuseReason.trim()) {
                        alert("Vui lòng nhập lý do giải trình trước khi gửi!");
                        return;
                      }
                      if (user) {
                        const newRequest = {
                          id: Date.now(),
                          staffName: user.name,
                          username: user.username,
                          time: new Date().toLocaleTimeString(),
                          reason: `Giải trình đi muộn: ${excuseReason}`,
                          status: "PENDING",
                          type: "LATE_EXCUSE"
                        };
                        const savedRequests = localStorage.getItem("pending_access_requests");
                        const currentRequests = savedRequests ? JSON.parse(savedRequests) : [];
                        const updatedRequests = [...currentRequests, newRequest];
                        localStorage.setItem("pending_access_requests", JSON.stringify(updatedRequests));

                        const savedUsers = localStorage.getItem("global_users");
                        if (savedUsers) {
                          const allUsers = JSON.parse(savedUsers);
                          const updated = allUsers.map((u: any) =>
                            u.username === user.username ? { 
                              ...u, 
                              isLateLocked: true, 
                              finePaymentStatus: "PENDING_APPROVAL",
                              lateExcuseStatus: "PENDING_APPROVAL",
                              status: "PENDING_APPROVAL" 
                            } : u
                          );
                          localStorage.setItem("global_users", JSON.stringify(updated));
                        }
                        window.dispatchEvent(new Event("storage"));
                        syncDatabase();
                        setExcuseReason("");
                        setFineSuccessToast("Yêu cầu của bạn đã được gửi. Vui lòng đợi Admin hoặc Quản lý phê duyệt để vào hệ thống.");
                        setTimeout(() => setFineSuccessToast(null), 5000);
                      }
                    }}
                    className="flex-1 h-14 bg-white/5 border border-white/10 hover:border-gold/50 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all duration-300"
                  >
                    Gửi yêu cầu
                  </button>

                  <button
                    onClick={handleLogout}
                    className="h-14 px-6 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-500 font-black text-sm uppercase tracking-widest rounded-2xl transition-all duration-300"
                  >
                    Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Fine Success Toast */}
      <AnimatePresence>
        {fineSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: "-50%" }}
            animate={{ opacity: 1, y: 30, x: "-50%" }}
            exit={{ opacity: 0, y: -100, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[9999] bg-green-500 text-white px-8 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 font-black text-sm uppercase tracking-widest border border-white/20"
          >
            <CheckCircle2 size={24} className="animate-bounce" /> {fineSuccessToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copied Phone Toast */}
      <AnimatePresence>
        {copiedPhoneToast && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: "-50%" }}
            animate={{ opacity: 1, y: 30, x: "-50%" }}
            exit={{ opacity: 0, y: -100, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[9999] bg-gold text-sidebar px-8 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 font-black text-sm uppercase tracking-widest border border-white/20"
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
          phone: (displayUser as any).phone || "0987654321",
          address: (displayUser as any).address || "Hà Nội, Việt Nam"
        }}
      />
      {/* Success Access Approval Modal */}
      <AnimatePresence>
        {accessSuccessMsg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-sidebar border border-gold/30 rounded-[32px] p-8 w-full max-w-md shadow-2xl relative text-center"
            >
              <div className="mx-auto h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-400 border border-green-500/20 mb-6 shadow-lg shadow-green-500/10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                >
                  <Check size={40} />
                </motion.div>
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-3">Cấp quyền thành công</h3>
              <p className="text-gray-400 font-medium leading-relaxed mb-8">{accessSuccessMsg}</p>
              <button
                onClick={() => setAccessSuccessMsg(null)}
                className="w-full h-14 bg-gold text-sidebar font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-white hover:text-sidebar transition-all duration-300 shadow-lg shadow-gold/20"
              >
                Đồng ý & Đóng
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Widget */}
      {user && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                className="w-96 h-[500px] bg-[#161616]/95 border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden mb-4 backdrop-blur-xl"
              >
                {/* Header */}
                <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">AQ CHAT BOX</h3>
                  </div>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-2 border-b border-white/5 text-center">
                  <button
                    onClick={() => setChatTab("COMPANY")}
                    className={`py-3 text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${chatTab === "COMPANY" ? "text-gold border-b-2 border-gold bg-white/[0.01]" : "text-gray-500 hover:text-white"}`}
                  >
                    <span>Công ty</span>
                    {getCompanyUnreadCount() > 0 && (
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    )}
                  </button>
                  <button
                    onClick={() => setChatTab("PRIVATE")}
                    className={`py-3 text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${chatTab === "PRIVATE" ? "text-gold border-b-2 border-gold bg-white/[0.01]" : "text-gray-500 hover:text-white"}`}
                  >
                    <span>Chat với</span>
                    {getPrivateUnreadCount() > 0 && (
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    )}
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex overflow-hidden">
                  {chatTab === "COMPANY" ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Messages Area */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar flex flex-col">
                        {companyMessages.map((msg: any) => {
                          const isMe = msg.senderName === (user?.name || user?.username);
                          return (
                            <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? "self-end items-end" : "self-start items-start"}`}>
                              {!isMe && (
                                <span className="text-[8px] font-black uppercase tracking-wider text-gray-500 mb-0.5 ml-1">
                                  {msg.senderName} ({msg.senderRole === "01" ? "ADMIN" : msg.senderRole === "02" ? "QLCV" : msg.senderRole === "03" ? "QLNS" : "NV"})
                                </span>
                              )}
                              <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed break-all flex flex-col gap-2 ${isMe ? "bg-gold text-sidebar rounded-tr-none" : "bg-white/5 text-white rounded-tl-none border border-white/5"}`}>
                                {msg.text && <span>{msg.text}</span>}
                                {msg.fileData && msg.fileType?.startsWith("image/") && (
                                  <div className="rounded-xl overflow-hidden border border-white/10 max-h-36">
                                    <img
                                      src={msg.fileData}
                                      onClick={() => setActiveLightboxImage(msg.fileData)}
                                      className="w-full h-full object-cover cursor-pointer hover:scale-[1.02] transition-transform"
                                      title="Bấm để xem ảnh lớn"
                                    />
                                  </div>
                                )}
                                {msg.fileData && !msg.fileType?.startsWith("image/") && (
                                  <div className={`flex items-center gap-2 p-2 rounded-xl text-left ${isMe ? "bg-white/10 text-sidebar" : "bg-white/5 text-white border border-white/5"}`}>
                                    <FileText size={16} className={isMe ? "text-sidebar shrink-0" : "text-gold shrink-0"} />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[10px] font-black truncate">{msg.fileName}</p>
                                      <p className={`text-[8px] font-mono font-bold ${isMe ? "text-sidebar/70" : "text-gray-500"}`}>{msg.fileSize}</p>
                                    </div>
                                    <a
                                      href={msg.fileData}
                                      download={msg.fileName}
                                      className={`h-6 w-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isMe ? "bg-sidebar/10 hover:bg-sidebar text-sidebar hover:text-white" : "bg-white/5 hover:bg-gold text-gray-400 hover:text-sidebar"}`}
                                      title="Tải xuống tệp tin"
                                    >
                                      <Download size={10} />
                                    </a>
                                  </div>
                                )}
                              </div>
                              <span className="text-[8px] font-bold text-gray-600 font-mono mt-1 px-1">{msg.time}</span>
                            </div>
                          );
                        })}
                        <div ref={companyMessagesEndRef} />
                      </div>

                      {/* Input Box */}
                      {selectedChatFile && (
                        <div className="mx-3 my-2 p-2 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-2">
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
                            className="h-6 w-6 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleSendCompanyMessage} className="p-3 border-t border-white/5 bg-[#0e0e0e] flex gap-2 items-center">
                        <input
                          type="file"
                          ref={companyFileInputRef}
                          onChange={handleChatFileSelect}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => companyFileInputRef.current?.click()}
                          className="h-10 w-10 shrink-0 bg-white/5 border border-white/5 hover:border-gold/30 rounded-xl flex items-center justify-center text-gray-400 hover:text-gold transition-colors"
                          title="Đính kèm ảnh hoặc tệp (tối đa 200MB)"
                        >
                          <Plus size={16} />
                        </button>

                        <input
                          type="text"
                          placeholder="Nhập nội dung tin nhắn..."
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          className="flex-1 h-10 bg-white/5 border border-white/5 focus:border-gold/50 rounded-xl px-4 text-xs text-white focus:outline-none transition-all placeholder:text-gray-600"
                        />
                        <button type="submit" className="h-10 w-10 bg-gold text-sidebar rounded-xl flex items-center justify-center hover:bg-white hover:text-sidebar transition-colors shadow-lg shadow-gold/10">
                          <Send size={14} />
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="flex-1 flex overflow-hidden">
                      {/* Left: User Select sidebar */}
                      {!activeChatUser ? (
                        <div className="flex-1 flex flex-col overflow-y-auto p-2 divide-y divide-white/5 custom-scrollbar">
                          <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest p-2">Chọn nhân sự</div>
                          {chatUsers.map((u: any) => (
                            <button
                              key={u.id}
                              onClick={() => setActiveChatUser(u)}
                              className="w-full p-3 flex items-center gap-3 rounded-xl hover:bg-white/5 transition-all text-left group"
                            >
                              <div className="relative">
                                <div className="h-8 w-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-xs text-gold font-black group-hover:scale-105 transition-all">
                                  {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover rounded-lg" /> : u.name.charAt(0)}
                                </div>
                                <div className={`absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-[#161616] ${u.isOnline ? "bg-green-500" : "bg-red-500"}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-white truncate group-hover:text-gold transition-colors">{u.name}</p>
                                <p className="text-[8px] font-bold text-gray-500 uppercase mt-0.5">@{u.username}</p>
                              </div>
                              {getUnreadCountForUser(u.username) > 0 && (
                                <span className="bg-red-500 text-white font-mono text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center shadow-lg shrink-0 animate-pulse">
                                  {getUnreadCountForUser(u.username)}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                          {/* Active private partner header */}
                          <div className="p-3 border-b border-white/5 bg-[#0e0e0e] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded bg-gold/10 flex items-center justify-center text-[10px] font-black text-gold">
                                {activeChatUser.name.charAt(0)}
                              </div>
                              <span className="text-[10px] font-black text-white uppercase truncate max-w-[120px]">{activeChatUser.name}</span>
                            </div>
                            <button
                              onClick={() => setActiveChatUser(null)}
                              className="text-[9px] font-black text-gold uppercase tracking-wider hover:text-white"
                            >
                              Đổi người
                            </button>
                          </div>

                          {/* Private Messages Area */}
                          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar flex flex-col">
                            {privateMessages
                              .filter((msg: any) =>
                                (msg.sender === user?.username && msg.receiver === activeChatUser.username) ||
                                (msg.sender === activeChatUser.username && msg.receiver === user?.username)
                              )
                              .map((msg: any) => {
                                const isMe = msg.sender === user?.username;
                                return (
                                  <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? "self-end items-end" : "self-start items-start"}`}>
                                    <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed break-all flex flex-col gap-2 ${isMe ? "bg-gold text-sidebar rounded-tr-none" : "bg-white/5 text-white rounded-tl-none border border-white/5"}`}>
                                      {msg.text && <span>{msg.text}</span>}
                                      {msg.fileData && msg.fileType?.startsWith("image/") && (
                                        <div className="rounded-xl overflow-hidden border border-white/10 max-h-36">
                                          <img
                                            src={msg.fileData}
                                            onClick={() => setActiveLightboxImage(msg.fileData)}
                                            className="w-full h-full object-cover cursor-pointer hover:scale-[1.02] transition-transform"
                                            title="Bấm để xem ảnh lớn"
                                          />
                                        </div>
                                      )}
                                      {msg.fileData && !msg.fileType?.startsWith("image/") && (
                                        <div className={`flex items-center gap-2 p-2 rounded-xl text-left ${isMe ? "bg-white/10 text-sidebar" : "bg-white/5 text-white border border-white/5"}`}>
                                          <FileText size={16} className={isMe ? "text-sidebar shrink-0" : "text-gold shrink-0"} />
                                          <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-black truncate">{msg.fileName}</p>
                                            <p className={`text-[8px] font-mono font-bold ${isMe ? "text-sidebar/70" : "text-gray-500"}`}>{msg.fileSize}</p>
                                          </div>
                                          <a
                                            href={msg.fileData}
                                            download={msg.fileName}
                                            className={`h-6 w-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isMe ? "bg-sidebar/10 hover:bg-sidebar text-sidebar hover:text-white" : "bg-white/5 hover:bg-gold text-gray-400 hover:text-sidebar"}`}
                                            title="Tải xuống tệp tin"
                                          >
                                            <Download size={10} />
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-[8px] font-bold text-gray-600 font-mono mt-1 px-1">{msg.time}</span>
                                  </div>
                                );
                              })}
                              <div ref={privateMessagesEndRef} />
                          </div>

                          {/* Input box */}
                          {selectedChatFile && (
                            <div className="mx-3 my-2 p-2 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-2">
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
                                className="h-6 w-6 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}

                          <form onSubmit={handleSendPrivateMessage} className="p-3 border-t border-white/5 bg-[#000000] flex gap-2 items-center">
                            <input
                              type="file"
                              ref={privateFileInputRef}
                              onChange={handleChatFileSelect}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => privateFileInputRef.current?.click()}
                              className="h-10 w-10 shrink-0 bg-white/5 border border-white/5 hover:border-gold/30 rounded-xl flex items-center justify-center text-gray-400 hover:text-gold transition-colors"
                              title="Đính kèm ảnh hoặc tệp (tối đa 200MB)"
                            >
                              <Plus size={16} />
                            </button>

                            <input
                              type="text"
                              placeholder={`Chat với ${activeChatUser.name}...`}
                              value={chatMessage}
                              onChange={(e) => setChatMessage(e.target.value)}
                              className="flex-1 h-10 bg-white/5 border border-white/5 focus:border-gold/50 rounded-xl px-4 text-xs text-white focus:outline-none transition-all placeholder:text-gray-600"
                            />
                            <button type="submit" className="h-10 w-10 bg-gold text-sidebar rounded-xl flex items-center justify-center hover:bg-white hover:text-sidebar transition-colors shadow-lg shadow-gold/10">
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
            className="h-14 w-14 bg-sidebar border border-gold/20 hover:border-gold text-gold rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(212,175,55,0.2)] hover:bg-gold hover:text-sidebar transition-all duration-300 relative group"
          >
            <MessageCircle size={24} />
            {unreadCount > 0 ? (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white font-mono text-[10px] font-black h-6 w-6 rounded-full flex items-center justify-center border-2 border-sidebar shadow-lg animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-sidebar" />
            )}
          </motion.button>
        </div>
      )}

      {/* Floating Phone Widget */}
      {user && (user.role === "03" || user.role === "04" || String(user.role).includes("03") || String(user.role).includes("04") || user.role === "NHÂN VIÊN" || String(user.role).includes("NHÂN VIÊN")) && (
        <div className="fixed bottom-6 right-[88px] z-50 flex flex-col items-end">
          <AnimatePresence>
            {isPhonePanelOpen && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                className="w-96 h-[500px] bg-zinc-900/90 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden mb-4 backdrop-blur-md"
              >
                {/* Header */}
                <div className="p-4 border-b border-zinc-800/50 bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-amber-500 animate-pulse shrink-0" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Danh sách SĐT ({myAssignedPhones.length})</h3>
                  </div>
                  <button
                    onClick={() => setIsPhonePanelOpen(false)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                </div>

                {/* Phone List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {myAssignedPhones.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <Phone size={48} className="text-zinc-700 mb-4 stroke-1" />
                      <p className="text-sm font-black text-zinc-300 uppercase tracking-wider">Không có SĐT</p>
                      <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">Hiện không có số điện thoại nào hoạt động được gán cho bạn.</p>
                    </div>
                  ) : (
                    myAssignedPhones.map((p: any) => (
                      <div
                        key={p.id}
                        className="p-4 bg-zinc-800/30 border border-zinc-800/50 hover:border-amber-500/30 rounded-xl transition-all duration-300 flex flex-col gap-3 group relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleCopyPhone(p.number)}
                            className="flex items-center gap-2 group/num text-left active:scale-[0.98] transition-transform"
                            title="Bấm để copy số điện thoại"
                          >
                            <span className="text-lg font-black text-white group-hover/num:text-amber-500 transition-colors font-mono tracking-wide">
                              {p.number}
                            </span>
                            <Copy size={14} className="text-zinc-500 group-hover/num:text-amber-500 transition-colors" />
                          </button>

                          {p.otpLink ? (
                            <a
                              href={p.otpLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-black text-amber-500 hover:text-zinc-900 transition-colors bg-amber-500/10 hover:bg-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0"
                            >
                              <span>Mở OTP</span>
                              <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-[10px] text-zinc-500 font-bold px-3 py-1.5 bg-zinc-800/50 rounded-lg shrink-0">Không có OTP</span>
                          )}
                        </div>

                        {/* Status buttons */}
                        <div className={`grid ${p.status === "XM lần 1" ? "grid-cols-3" : "grid-cols-2"} gap-2 border-t border-zinc-800/50 pt-3`}>
                          <button
                            onClick={() => handleUpdatePhoneStatus(p.id, "XM lần 1")}
                            className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${p.status === "XM lần 1" ? "bg-amber-500 text-zinc-900 shadow-lg shadow-amber-500/20" : "bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-zinc-900"}`}
                          >
                            XM Lần 1
                          </button>
                          {p.status === "XM lần 1" && (
                            <button
                              onClick={() => handleUpdatePhoneStatus(p.id, "XM lần 2")}
                              className="py-1.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-zinc-900 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300"
                            >
                              XM Lần 2
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdatePhoneStatus(p.id, "Lỗi")}
                            className="py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300"
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
            className="h-14 w-14 bg-zinc-900 border border-amber-500/20 hover:border-amber-500 text-amber-500 rounded-xl flex items-center justify-center shadow-[0_4px_20px_rgba(245,158,11,0.15)] hover:bg-amber-500 hover:text-zinc-900 transition-all duration-300 relative group backdrop-blur-md"
          >
            <Phone size={24} />
            {myAssignedPhones.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-amber-500 text-zinc-900 font-mono text-[10px] font-black h-6 w-6 rounded-full flex items-center justify-center border-2 border-zinc-900 shadow-lg animate-pulse">
                {myAssignedPhones.length}
              </span>
            )}
          </motion.button>
        </div>
      )}

      {/* Full Screen Image Lightbox */}
      <AnimatePresence>
        {activeLightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveLightboxImage(null)}
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setActiveLightboxImage(null)}
              className="absolute top-6 right-6 h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-red-500 hover:border-red-500 transition-colors shadow-2xl"
              title="Đóng xem ảnh"
            >
              <X size={24} />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl border border-white/5 bg-sidebar"
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
