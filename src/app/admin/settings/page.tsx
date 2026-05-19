"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, 
  Settings, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  Lock, 
  ShieldCheck, 
  HardDrive,
  RefreshCw,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface SystemSettings {
  agencyName: string;
  kpiTargetMails: number;
  kpiTargetWatchHours: number;
  chunkSize: number;
  apiSyncEndpoint: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState("");
  
  // Settings Form States
  const [agencyName, setAgencyName] = useState("AQ MEDIA");
  const [kpiTargetMails, setKpiTargetMails] = useState(500);
  const [kpiTargetWatchHours, setKpiTargetWatchHours] = useState(2000);
  const [chunkSize, setChunkSize] = useState(17);
  const [apiSyncEndpoint, setApiSyncEndpoint] = useState("/api/sync");

  // Password States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");

  // DB Reset Safety Modal States
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [safetyPhrase, setSafetyPhrase] = useState("");

  useEffect(() => {
    // Authenticate Roles (Roles 01 and 02 can access Settings)
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      const role = String(parsedUser.role || "").toUpperCase();
      if (role !== "01" && role !== "02" && role !== "ADMIN" && role !== "QUẢN LÝ CÔNG VIỆC" && role !== "QL CÔNG VIỆC") {
        window.location.href = "/admin";
      }
    } else {
      window.location.href = "/login";
    }

    const loadSettings = () => {
      const savedSettings = localStorage.getItem("global_system_settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setAgencyName(parsed.agencyName || "AQ MEDIA");
        setKpiTargetMails(parsed.kpiTargetMails || 500);
        setKpiTargetWatchHours(parsed.kpiTargetWatchHours || 2000);
        setChunkSize(parsed.chunkSize || 17);
        setApiSyncEndpoint(parsed.apiSyncEndpoint || "/api/sync");
      }
    };

    loadSettings();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // LocalStorage Space Usage Calculator
  const storageUsage = useMemo(() => {
    if (typeof window === "undefined") return { text: "0 KB", percentage: 0 };
    let totalLength = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalLength += (localStorage.getItem(key) || "").length + key.length;
      }
    }
    // Convert to KB
    const kb = Math.round((totalLength / 1024) * 100) / 100;
    const percentage = Math.min(100, Math.round((kb / 5120) * 100)); // 5MB standard storage cap
    return { text: `${kb} KB / 5.0 MB`, percentage };
  }, [toastMsg]);

  // SAVE GENERAL SETTINGS
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings: SystemSettings = {
      agencyName,
      kpiTargetMails: Number(kpiTargetMails),
      kpiTargetWatchHours: Number(kpiTargetWatchHours),
      chunkSize: Number(chunkSize),
      apiSyncEndpoint
    };

    localStorage.setItem("global_system_settings", JSON.stringify(newSettings));
    
    // Write dynamic updates to related targets (like global KPI data targets)
    const savedKPI = localStorage.getItem("global_kpi_data");
    if (savedKPI) {
      const parsed = JSON.parse(savedKPI);
      parsed.targetMonetized = Number(kpiTargetMails);
      parsed.targetWatchHours = Number(kpiTargetWatchHours);
      localStorage.setItem("global_kpi_data", JSON.stringify(parsed));
    }

    // Trigger storage event for synchronization
    window.dispatchEvent(new Event("storage"));

    // Add activity log
    const existingLogs = localStorage.getItem("global_system_logs");
    const logsList = existingLogs ? JSON.parse(existingLogs) : [];
    const newLog = {
      id: `log-${Date.now()}`,
      user: user?.name || "Admin",
      role: user?.role === "01" ? "ADMIN" : "QL CÔNG VIỆC",
      action: "Cập nhật cấu hình chung của hệ thống AQ MEDIA",
      type: "INFO",
      timestamp: new Date().toLocaleString("vi-VN")
    };
    localStorage.setItem("global_system_logs", JSON.stringify([newLog, ...logsList]));

    // Sync state
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          global_system_settings: JSON.stringify(newSettings),
          global_kpi_data: localStorage.getItem("global_kpi_data")
        })
      });
    } catch (e) {
      console.error("Sync settings error:", e);
    }

    triggerToast("Đã lưu và đồng bộ cài đặt hệ thống thành công!");
  };

  // CHANGE PASSWORD SUBMISSION
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPassError("Vui lòng điền đầy đủ tất cả các trường mật khẩu.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError("Mật khẩu mới và mật khẩu xác nhận không khớp.");
      return;
    }

    // Fetch users lists
    const savedUsers = localStorage.getItem("global_users");
    const allUsers = savedUsers ? JSON.parse(savedUsers) : [];
    
    // Match current profile user
    const updatedUsers = allUsers.map((u: any) => {
      if (String(u.id) === String(user?.id) || u.username === user?.username) {
        if (u.password !== oldPassword) {
          setPassError("Mật khẩu hiện tại không chính xác.");
          return u;
        }
        return { ...u, password: newPassword };
      }
      return u;
    });

    if (passError) return;

    // Check if matching failed (no change done due to wrong old pass)
    const isSuccess = updatedUsers.some((u: any) => u.password === newPassword && (String(u.id) === String(user?.id) || u.username === user?.username));
    
    if (!isSuccess && !passError) {
      setPassError("Mật khẩu hiện tại không chính xác.");
      return;
    }

    localStorage.setItem("global_users", JSON.stringify(updatedUsers));
    
    // Reset Form
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    triggerToast("Thay đổi mật khẩu đăng nhập thành công!");

    // Add activity log
    const existingLogs = localStorage.getItem("global_system_logs");
    const logsList = existingLogs ? JSON.parse(existingLogs) : [];
    const newLog = {
      id: `log-${Date.now()}`,
      user: user?.name || "Admin",
      role: user?.role === "01" ? "ADMIN" : "QL CÔNG VIỆC",
      action: "Cập nhật mật khẩu bảo mật tài khoản cá nhân",
      type: "SUCCESS",
      timestamp: new Date().toLocaleString("vi-VN")
    };
    localStorage.setItem("global_system_logs", JSON.stringify([newLog, ...logsList]));
  };

  // HARD WIPE & RESET DATABASE
  const handleHardResetDatabase = () => {
    if (safetyPhrase !== "CONFIRM") {
      alert("Cụm từ xác thực không chính xác.");
      return;
    }

    // Wipe all local storage variables
    localStorage.clear();
    sessionStorage.clear();
    
    setShowResetConfirm(false);
    setSafetyPhrase("");

    // Trigger complete redirect to login to seed data freshly on reload
    triggerToast("Hệ thống đang tiến hành hard-reset toàn bộ dữ liệu...");
    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col space-y-6 pb-6 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: "-50%" }} 
            animate={{ opacity: 1, y: 30, x: "-50%" }} 
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[200] bg-gold px-6 py-3 rounded-full text-sidebar font-black text-sm shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 size={18} /> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DB Hard Reset safety alert Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121212] border border-red-500/30 rounded-[32px] p-8 w-full max-w-md shadow-2xl flex flex-col"
            >
              <div className="flex items-center gap-4 mb-6 flex-shrink-0">
                <div className="h-12 w-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500">
                  <AlertTriangle size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Wipe Cơ Sở Dữ Liệu</h3>
                  <p className="text-[10px] text-red-500/70 font-black uppercase tracking-widest mt-0.5">Hành động nguy hiểm</p>
                </div>
              </div>

              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 mb-6 text-xs text-gray-300 font-bold leading-relaxed space-y-2">
                <p>Hành động này sẽ <span className="text-red-400 font-black">XÓA TOÀN BỘ</span> dữ liệu cấu hình hệ thống bao gồm: Danh sách Mail, Lô Mail, Nhật ký, Phân công công việc và tài khoản!</p>
                <p>Để xác nhận, vui lòng nhập chữ <span className="text-red-400 font-black">"CONFIRM"</span> dưới ô sau:</p>
              </div>

              <input 
                type="text"
                placeholder="Nhập CONFIRM để tiếp tục..."
                value={safetyPhrase}
                onChange={(e) => setSafetyPhrase(e.target.value)}
                className="bg-black/40 border border-red-500/20 rounded-xl px-4 h-12 text-sm text-white font-black text-center mb-6 outline-none focus:border-red-500 transition-all"
              />

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setShowResetConfirm(false);
                    setSafetyPhrase("");
                  }} 
                  className="flex-1 h-12 rounded-xl border border-white/10 text-white font-bold uppercase text-xs tracking-widest hover:bg-white/5 transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  disabled={safetyPhrase !== "CONFIRM"}
                  onClick={handleHardResetDatabase} 
                  className="flex-1 h-12 rounded-xl bg-red-500 text-white font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Xác nhận Wipe
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push("/admin")}
          className="p-2 rounded-xl bg-sidebar border border-border-custom text-gray-400 hover:text-white transition-all shadow-md"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Settings className="text-gold" size={28} />
            Hệ Thống & Cài Đặt (Settings)
          </h2>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">
            Thiết lập các cấu hình thông số kỹ thuật toàn cục và tài khoản
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: General System Settings & Storage */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
              <Database className="text-gold" size={18} />
              <h3 className="text-md font-black text-white uppercase tracking-tight">Cấu hình thông số Hệ thống</h3>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Tên Agency / Trang Web</label>
                  <input 
                    type="text" 
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-xl px-4 h-11 text-xs text-white outline-none focus:border-gold/50 transition-all w-full font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Số lượng gán Mail mỗi đợt (Chunk Size)</label>
                  <input 
                    type="number" 
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Math.max(1, Number(e.target.value)))}
                    className="bg-black/20 border border-white/10 rounded-xl px-4 h-11 text-xs text-gold outline-none focus:border-gold/50 transition-all w-full font-black tracking-wider"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">KPI Target (Mail BKT Hàng tháng)</label>
                  <input 
                    type="number" 
                    value={kpiTargetMails}
                    onChange={(e) => setKpiTargetMails(Math.max(1, Number(e.target.value)))}
                    className="bg-black/20 border border-white/10 rounded-xl px-4 h-11 text-xs text-white outline-none focus:border-gold/50 transition-all w-full font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">KPI Target (Watch Hours tích lũy)</label>
                  <input 
                    type="number" 
                    value={kpiTargetWatchHours}
                    onChange={(e) => setKpiTargetWatchHours(Math.max(1, Number(e.target.value)))}
                    className="bg-black/20 border border-white/10 rounded-xl px-4 h-11 text-xs text-white outline-none focus:border-gold/50 transition-all w-full font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">API Server Sync Endpoint</label>
                <input 
                  type="text" 
                  value={apiSyncEndpoint}
                  onChange={(e) => setApiSyncEndpoint(e.target.value)}
                  className="bg-black/20 border border-white/10 rounded-xl px-4 h-11 text-xs text-gray-400 font-mono outline-none focus:border-gold/50 transition-all w-full"
                  required
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-gold text-sidebar font-black uppercase text-xs tracking-widest hover:bg-yellow-500 transition-all flex items-center gap-2 shadow-lg shadow-gold/5"
                >
                  <Save size={14} /> Lưu Cấu Hình
                </button>
              </div>
            </form>
          </div>

          {/* Database Space Allocation Stats Widget */}
          <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
              <HardDrive className="text-gold" size={18} />
              <h3 className="text-md font-black text-white uppercase tracking-tight">Dung lượng Cơ sở Dữ liệu (LocalStorage)</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>Dung lượng đã sử dụng:</span>
                <span className="text-white font-mono">{storageUsage.text}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    storageUsage.percentage > 80 ? "bg-red-500" :
                    storageUsage.percentage > 50 ? "bg-gold" : "bg-indigo-500"
                  }`}
                  style={{ width: `${storageUsage.percentage}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                Mọi dữ liệu hệ thống được đồng bộ hóa hoàn hảo trong LocalStorage và tự động đồng bộ hóa lên API Server Database khi máy chủ hoạt động.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Password Manager & Danger Hard Reset */}
        <div className="space-y-6">
          {/* Security & Password section */}
          <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
              <Lock className="text-gold" size={18} />
              <h3 className="text-md font-black text-white uppercase tracking-tight">Bảo mật & Đổi mật khẩu</h3>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {passError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold">
                  {passError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Mật khẩu hiện tại</label>
                <input 
                  type="password" 
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="bg-black/20 border border-white/10 rounded-xl px-4 h-10 text-xs text-white outline-none focus:border-gold/50 transition-all w-full"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Mật khẩu mới</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-black/20 border border-white/10 rounded-xl px-4 h-10 text-xs text-white outline-none focus:border-gold/50 transition-all w-full"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Xác nhận mật khẩu mới</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-black/20 border border-white/10 rounded-xl px-4 h-10 text-xs text-white outline-none focus:border-gold/50 transition-all w-full"
                  required
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-indigo-500 text-white font-black uppercase text-xs tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2 w-full justify-center shadow-lg shadow-indigo-500/10"
                >
                  <ShieldCheck size={14} /> Đổi Mật Khẩu
                </button>
              </div>
            </form>
          </div>

          {/* Hard Wipe Danger Zone */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-[32px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-red-500/10 pb-4">
              <AlertTriangle className="text-red-500" size={18} />
              <h3 className="text-md font-black text-red-500 uppercase tracking-tight">Khu vực nguy hiểm</h3>
            </div>
            
            <p className="text-[11px] text-gray-400 leading-relaxed font-bold">
              Tính năng khôi phục toàn bộ cơ sở dữ liệu về trạng thái ban đầu của nhà phát triển. Mọi thay đổi hiện hữu sẽ biến mất vĩnh viễn.
            </p>

            <button 
              onClick={() => setShowResetConfirm(true)}
              className="h-11 rounded-xl bg-red-500 text-white font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all flex items-center gap-2 w-full justify-center shadow-lg shadow-red-500/15"
            >
              <RefreshCw size={14} /> Reset Database gốc
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
