"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import ProfileModal from "@/components/admin/ProfileModal";
import AccessLock from "@/components/admin/modals/AccessLock";
import { useRouter } from "next/navigation";
import { MOCK_ACCESS_REQUESTS, initMockDB } from "@/data/mockData";
import { Bell, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>(MOCK_ACCESS_REQUESTS);
  const [showManagerNotif, setShowManagerNotif] = useState(false);
  const [roleUpdateNotif, setRoleUpdateNotif] = useState<{title: string, message: string} | null>(null);
  const [lastNotifCount, setLastNotifCount] = useState(0);
  const [isNotifInitialized, setIsNotifInitialized] = useState(false);

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

    syncUserRole();
    checkNewNotifications();
    const interval = setInterval(() => {
      syncUserRole();
      checkNewNotifications();
    }, 2000); 

    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || e.key === "global_users" || e.key === "admin_notifications" || e.key === "pending_access_requests" || e.key === "request_trigger") {
        syncUserRole();
        checkNewNotifications();
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
      
      if (e.key?.startsWith("access_response_")) {
        const activeUserStr = getActiveUserStr();
        if (activeUserStr) {
          const currentUser = JSON.parse(activeUserStr);
          const emergencyAccess = localStorage.getItem(`access_${new Date().toLocaleDateString()}_${currentUser.name}`);
          if (emergencyAccess) setIsAccessGranted(true);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user?.role, isNotifInitialized, lastNotifCount]); // Re-run if role changes locally to keep listeners fresh

  // Kiểm tra giờ làm việc
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const totalMinutes = currentHour * 60 + currentMinute;
  
  const startTime = 7 * 60 + 50; // 7:50 AM
  const endTime = 18 * 60; // 6:00 PM
  
  const isWorkingHours = totalMinutes >= startTime && totalMinutes < endTime;
  const isStaff = user?.role === "04" || user?.role === "NHÂN VIÊN" || String(user?.role).includes("04");
  const shouldLock = isStaff && !isWorkingHours && !isAccessGranted;

  const getLockMessage = () => {
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
  };

  const handleApprove = (request: any) => {
    const updated = pendingRequests.filter(r => r.id !== request.id);
    setPendingRequests(updated);
    localStorage.setItem("pending_access_requests", JSON.stringify(updated));
    // Cấp quyền và thông báo cho nhân viên
    localStorage.setItem(`access_response_${request.staffName}`, "APPROVED");
    localStorage.setItem(`access_${new Date().toLocaleDateString()}_${request.staffName}`, "true");
    alert(`Đã cấp quyền truy cập cho ${request.staffName}`);
  };

  const handleDeny = (request: any) => {
    const updated = pendingRequests.filter(r => r.id !== request.id);
    setPendingRequests(updated);
    localStorage.setItem("pending_access_requests", JSON.stringify(updated));
    // Thông báo từ chối cho nhân viên
    localStorage.setItem(`access_response_${request.staffName}`, "DENIED");
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
      <Sidebar isCollapsed={isCollapsed} user={user} />

      {/* Main Container */}
      <div 
        className="flex flex-1 flex-col transition-all duration-300 overflow-hidden relative"
        style={{ paddingLeft: isCollapsed ? "100px" : "320px" }}
      >
        {/* Header */}
        <Header 
          isCollapsed={isCollapsed} 
          onToggle={() => setIsCollapsed(!isCollapsed)} 
          onOpenProfile={() => setIsModalOpen(true)}
          user={user}
        />

        {/* Content Area */}
        <main className="flex-1 mt-16 p-4 md:p-6 overflow-y-auto custom-scrollbar">
          <div className="min-h-full mx-auto max-w-[1600px] relative">
            {children}

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
    </div>
  );
}
