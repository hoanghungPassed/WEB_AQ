"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import ProfileModal from "@/components/admin/ProfileModal";
import AccessLock from "@/components/admin/modals/AccessLock";
import { useRouter } from "next/navigation";
import { MOCK_ACCESS_REQUESTS, initMockDB } from "@/data/mockData";
import { Bell, Check, X, Clock, CheckCircle2 } from "lucide-react";
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
  const [realtimeToast, setRealtimeToast] = useState<string | null>(null);

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
  const [roleUpdateNotif, setRoleUpdateNotif] = useState<{title: string, message: string} | null>(null);
  const [lastNotifCount, setLastNotifCount] = useState(0);
  const [isNotifInitialized, setIsNotifInitialized] = useState(false);
  const [accessSuccessMsg, setAccessSuccessMsg] = useState<string | null>(null);
  const [isLate, setIsLate] = useState(false);
  const [lateMins, setLateMins] = useState(0);
  const [fineAmount, setFineAmount] = useState(0);
  const [isFinePaid, setIsFinePaid] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [fineSuccessToast, setFineSuccessToast] = useState<string | null>(null);

  const syncDatabase = React.useCallback(async () => {
    try {
      const standardKeys = [
        "global_users",
        "global_mails_data",
        "global_tasks_data",
        "global_kpi_data",
        "admin_notifications",
        "realtime_toast",
        "pending_access_requests"
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

        if (localVal !== prevSyncedVal && localVal !== serverVal) {
          // Local value has changed! Push to server
          if (localVal !== null) {
            localUpdates[key] = localVal;
            lastSyncedCache[key] = localVal;
            hasLocalChanges = true;
          }
        } else if (serverVal !== prevSyncedVal && serverVal !== localVal) {
          // Server value has changed! Pull to local
          if (serverVal !== undefined && serverVal !== null) {
            localStorage.setItem(key, serverVal);
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
            console.log(`[SYNC] Role change detected for ${storedUser.username}: ${currentRole} -> ${newRole}`);
            const newUser = { ...storedUser, role: latestInfo.role };
            sessionStorage.setItem("user", JSON.stringify(newUser));
            setUser(newUser);
            window.dispatchEvent(new Event("storage"));
          } else if (JSON.stringify(storedUser) !== JSON.stringify(user)) {
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
      
      if (!isNotifInitialized) {
        setLastNotifCount(myNotifs.length);
        setIsNotifInitialized(true);
        return;
      }

      if (myNotifs.length > lastNotifCount) {
        const latest = myNotifs[0];
        setRoleUpdateNotif({ title: latest.title, message: latest.message });
        setTimeout(() => setRoleUpdateNotif(null), 5000);
      }
      setLastNotifCount(myNotifs.length);

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

      const checkInISO = localStorage.getItem(`checkin_time_${currentUser.username}`);
      if (checkInISO) {
        const dIn = new Date(checkInISO);
        const H = dIn.getHours();
        const M = dIn.getMinutes();
        const mins = H * 60 + M;
        if (mins > 480) { // 8:00 AM
          setIsLate(true);
          const diff = mins - 480;
          setLateMins(diff);
          
          let amt = 50000;
          if (diff >= 1 && diff <= 5) amt = 10000;
          else if (diff >= 6 && diff <= 19) amt = 20000;
          setFineAmount(amt);
        } else {
          setIsLate(false);
        }
      } else {
        setIsLate(false);
      }

      const paid = localStorage.getItem(`late_fine_paid_${getStableDateString()}_${currentUser.username}`) === "true";
      setIsFinePaid(paid);
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
  }, [user?.role, isNotifInitialized, lastNotifCount]); // Re-run if role changes locally to keep listeners fresh

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
    
    // Đồng bộ lên server ngay lập tức để Nhân viên nhận được quyền mở khóa!
    syncDatabase();
    
    setAccessSuccessMsg(`Đã cấp quyền truy cập cho ${request.staffName}`);
  };

  const handleDeny = (request: any) => {
    const updated = pendingRequests.filter(r => r.id !== request.id);
    setPendingRequests(updated);
    localStorage.setItem("pending_access_requests", JSON.stringify(updated));
    // Thông báo từ chối cho nhân viên
    localStorage.setItem(`access_response_${request.staffName}`, "DENIED");
    
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
            {/* Header info */}
            <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/5">
              <Clock size={32} className="animate-pulse" />
            </div>
            
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">Báo cáo đi muộn</h2>
            <p className="text-gray-400 text-sm font-medium max-w-md mx-auto leading-relaxed mb-6">
              Hôm nay bạn check-in lúc <span className="text-red-400 font-bold font-mono">
                {user ? new Date(localStorage.getItem(`checkin_time_${user.username}`) || "").toLocaleTimeString("vi-VN") : "---"}
              </span>, đi muộn <span className="text-red-400 font-bold font-mono">{lateMins} phút</span> so với giờ quy định (8:00 AM).
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border-t border-b border-white/5 py-8 my-6 text-left">
              {/* QR Code and Payment details */}
              <div className="flex flex-col items-center justify-center border-r border-white/5 pr-0 md:pr-6 pb-6 md:pb-0">
                <div className="bg-white p-4 rounded-2xl shadow-xl border-2 border-gold/40 relative">
                  {/* Styled Mock QR Code using SVGs */}
                  <svg width="180" height="180" viewBox="0 0 180 180" className="text-sidebar">
                    <rect width="180" height="180" fill="white" />
                    {/* Outer corners */}
                    <rect x="15" y="15" width="40" height="40" fill="currentColor" />
                    <rect x="25" y="25" width="20" height="20" fill="white" />
                    <rect x="30" y="30" width="10" height="10" fill="currentColor" />
                    
                    <rect x="125" y="15" width="40" height="40" fill="currentColor" />
                    <rect x="135" y="25" width="20" height="20" fill="white" />
                    <rect x="140" y="30" width="10" height="10" fill="currentColor" />
                    
                    <rect x="15" y="125" width="40" height="40" fill="currentColor" />
                    <rect x="25" y="135" width="20" height="20" fill="white" />
                    <rect x="130" y="130" width="10" height="10" fill="currentColor" />
                    
                    {/* Random beautiful mock data QR squares */}
                    <rect x="65" y="20" width="15" height="15" fill="currentColor" />
                    <rect x="90" y="35" width="20" height="10" fill="currentColor" />
                    <rect x="70" y="60" width="10" height="30" fill="currentColor" />
                    <rect x="20" y="70" width="30" height="15" fill="currentColor" />
                    <rect x="110" y="65" width="40" height="15" fill="currentColor" />
                    <rect x="120" y="90" width="15" height="30" fill="currentColor" />
                    <rect x="65" y="110" width="30" height="20" fill="currentColor" />
                    <rect x="15" y="100" width="15" height="15" fill="currentColor" />
                    <rect x="145" y="145" width="20" height="20" fill="currentColor" />
                    <rect x="100" y="135" width="20" height="20" fill="currentColor" />
                    <rect x="65" y="145" width="25" height="15" fill="currentColor" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-gold text-sidebar text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-white tracking-widest shadow-md">AQ MEDIA</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-3 text-center">Quét mã nộp phạt qua Ngân hàng</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Ngân hàng thụ hưởng</span>
                  <span className="text-sm font-black text-white">MB BANK (Ngân hàng Quân Đội)</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Số tài khoản</span>
                  <span className="text-sm font-black text-gold font-mono">19030000000</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Tên người nhận</span>
                  <span className="text-sm font-black text-white">CÔNG TY TNHH AQ MEDIA</span>
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
                    PHAT DI MUON {user?.username.toUpperCase()} {lateMins} PHUT
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  localStorage.setItem(`late_fine_paid_${getStableDateString()}_${user?.username}`, "true");
                  setIsFinePaid(true);
                  setFineSuccessToast("Thanh toán thành công! Chào mừng bạn đến ngày làm việc mới.");
                  setTimeout(() => setFineSuccessToast(null), 5000);
                  syncDatabase();
                }}
                className="flex-1 h-14 bg-gold text-sidebar font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-white hover:text-sidebar transition-all duration-300 shadow-lg shadow-gold/25"
              >
                Đã chuyển khoản
              </button>
              
              <button
                onClick={handleRequestAccess}
                className="flex-1 h-14 bg-white/5 border border-white/10 hover:border-gold/50 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all duration-300"
              >
                Gửi yêu cầu Quản lý
              </button>
              
              <button
                onClick={handleLogout}
                className="h-14 px-6 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-500 font-black text-sm uppercase tracking-widest rounded-2xl transition-all duration-300"
              >
                Đăng xuất
              </button>
            </div>
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
    </div>
  );
}
