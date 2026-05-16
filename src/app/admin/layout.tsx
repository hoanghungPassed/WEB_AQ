"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import ProfileModal from "@/components/admin/ProfileModal";
import AccessLock from "@/components/admin/modals/AccessLock";
import { useRouter } from "next/navigation";
import { MOCK_ACCESS_REQUESTS } from "@/data/mockData";
import { Bell, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<{name: string, role: string, email: string} | null>(null);
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(MOCK_ACCESS_REQUESTS);
  const [showManagerNotif, setShowManagerNotif] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
    } else {
      setUser(JSON.parse(storedUser));
      // Kiểm tra xem đã được duyệt truy cập khẩn cấp chưa
      const emergencyAccess = localStorage.getItem(`access_${new Date().toLocaleDateString()}_${JSON.parse(storedUser).name}`);
      if (emergencyAccess) setIsAccessGranted(true);
    }

    // Lắng nghe yêu cầu mới từ các tab khác (Cùng trình duyệt)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "pending_access_requests") {
        setPendingRequests(JSON.parse(e.newValue || "[]"));
      }
      if (e.key?.startsWith("access_response_")) {
        // Cập nhật trạng thái truy cập nếu được duyệt từ tab khác
        const emergencyAccess = localStorage.getItem(`access_${new Date().toLocaleDateString()}_${user?.name}`);
        if (emergencyAccess) setIsAccessGranted(true);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [router, user?.name]);

  // Kiểm tra giờ làm việc
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const totalMinutes = currentHour * 60 + currentMinute;
  
  const startTime = 7 * 60 + 50; // 7:50 AM
  const endTime = 18 * 60; // 6:00 PM
  
  const isWorkingHours = totalMinutes >= startTime && totalMinutes < endTime;
  const isStaff = user?.role?.toUpperCase() === "NHÂN VIÊN";
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
    setPendingRequests(prev => prev.filter(r => r.id !== request.id));
    // Cấp quyền và thông báo cho nhân viên
    localStorage.setItem(`access_response_${request.staffName}`, "APPROVED");
    localStorage.setItem(`access_${new Date().toLocaleDateString()}_${request.staffName}`, "true");
    alert(`Đã cấp quyền truy cập cho ${request.staffName}`);
  };

  const handleDeny = (request: any) => {
    setPendingRequests(prev => prev.filter(r => r.id !== request.id));
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
        <main className="flex-1 mt-20 p-6 overflow-y-auto custom-scrollbar">
          <div className="min-h-full mx-auto max-w-[1600px] relative">
            {children}

            {/* Manager Approval Notification */}
            {(user?.role === "ADMIN" || user?.role.includes("QUẢN LÝ")) && pendingRequests.length > 0 && (
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
