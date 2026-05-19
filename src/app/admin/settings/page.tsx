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
  Info,
  AlertCircle
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

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passErrors, setPassErrors] = useState({ old: "", new: "", confirm: "" });

  const [activeTab, setActiveTab] = useState<"PROFILE" | "PASSWORD" | "2FA" | "SYSTEM">("PROFILE");

  // DB Reset Safety Modal States
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [safetyPhrase, setSafetyPhrase] = useState("");

  useEffect(() => {
    // Everyone can access settings
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
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

  const handleOldPasswordChange = (val: string) => {
    setOldPassword(val);
    if (!val) {
      setPassErrors(prev => ({ ...prev, old: "" }));
      return;
    }
    const savedUsers = localStorage.getItem("global_users");
    const allUsers = savedUsers ? JSON.parse(savedUsers) : [];
    const currentUser = allUsers.find((u: any) => String(u.id) === String(user?.id) || u.username === user?.username);
    
    if (currentUser && currentUser.password !== val) {
      setPassErrors(prev => ({ ...prev, old: "Mật khẩu hiện tại không đúng" }));
    } else {
      setPassErrors(prev => ({ ...prev, old: "" }));
    }
  };

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length > 6) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const validateNewPassword = (pwd: string) => {
    if (!pwd) return "";
    if (pwd.length <= 6) return "Mật khẩu phải dài hơn 6 kí tự";
    if (!/[A-Z]/.test(pwd)) return "Phải có ít nhất 1 chữ viết hoa";
    if (!/[0-9]/.test(pwd)) return "Phải có ít nhất 1 chữ số";
    if (!/[^A-Za-z0-9]/.test(pwd)) return "Phải có ít nhất 1 kí tự đặc biệt";
    return "";
  };

  const handleNewPasswordChange = (val: string) => {
    setNewPassword(val);
    setPassErrors(prev => ({ ...prev, new: validateNewPassword(val) }));
    if (confirmPassword && confirmPassword !== val) {
      setPassErrors(prev => ({ ...prev, confirm: "Mật khẩu xác nhận không khớp." }));
    } else {
      setPassErrors(prev => ({ ...prev, confirm: "" }));
    }
  };

  const handleConfirmPasswordChange = (val: string) => {
    setConfirmPassword(val);
    if (val && val !== newPassword) {
      setPassErrors(prev => ({ ...prev, confirm: "Mật khẩu xác nhận không khớp." }));
    } else {
      setPassErrors(prev => ({ ...prev, confirm: "" }));
    }
  };

  // CHANGE PASSWORD SUBMISSION
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    let hasEmpty = false;
    const newErrors = { old: passErrors.old, new: passErrors.new, confirm: passErrors.confirm };

    if (!oldPassword) {
      newErrors.old = "Vui lòng nhập mật khẩu hiện tại.";
      hasEmpty = true;
    }
    if (!newPassword) {
      newErrors.new = "Vui lòng nhập mật khẩu mới.";
      hasEmpty = true;
    }
    if (!confirmPassword) {
      newErrors.confirm = "Vui lòng xác nhận mật khẩu mới.";
      hasEmpty = true;
    }

    if (hasEmpty) {
      setPassErrors(newErrors);
      return;
    }

    if (passErrors.old || passErrors.new || passErrors.confirm) {
      triggerToast("Vui lòng sửa các lỗi hiển thị trước khi lưu.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassErrors(prev => ({ ...prev, confirm: "Mật khẩu xác nhận không khớp." }));
      return;
    }

    // Fetch users lists
    const savedUsers = localStorage.getItem("global_users");
    const allUsers = savedUsers ? JSON.parse(savedUsers) : [];
    
    // Find current user
    const currentUserIndex = allUsers.findIndex((u: any) => String(u.id) === String(user?.id) || u.username === user?.username);
    
    if (currentUserIndex === -1) {
      setPassErrors(prev => ({ ...prev, old: "Không tìm thấy thông tin tài khoản." }));
      return;
    }

    if (allUsers[currentUserIndex].password !== oldPassword) {
      setPassErrors(prev => ({ ...prev, old: "Mật khẩu hiện tại không chính xác." }));
      return;
    }

    // Update password
    const updatedUsers = [...allUsers];
    updatedUsers[currentUserIndex] = { ...updatedUsers[currentUserIndex], password: newPassword };

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

      <div className="flex flex-col md:flex-row gap-4 mb-6 pb-4 border-b border-white/5">
        <button 
          onClick={() => setActiveTab("PROFILE")}
          className={`h-10 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "PROFILE" ? "bg-gold text-sidebar shadow-lg shadow-gold/20" : "bg-white/5 text-gray-500 hover:bg-white/10"
          }`}
        >
          Thông tin cá nhân
        </button>
        <button 
          onClick={() => setActiveTab("PASSWORD")}
          className={`h-10 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "PASSWORD" ? "bg-gold text-sidebar shadow-lg shadow-gold/20" : "bg-white/5 text-gray-500 hover:bg-white/10"
          }`}
        >
          Tài khoản (Đổi MK)
        </button>
        {(user?.role === "01" || user?.role === "02" || user?.role === "ADMIN" || user?.role === "QL CÔNG VIỆC") && (
          <>
            <button 
              onClick={() => setActiveTab("2FA")}
              className={`h-10 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === "2FA" ? "bg-gold text-sidebar shadow-lg shadow-gold/20" : "bg-white/5 text-gray-500 hover:bg-white/10"
              }`}
            >
              Bảo mật 2FA
            </button>
            <button 
              onClick={() => setActiveTab("SYSTEM")}
              className={`h-10 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === "SYSTEM" ? "bg-gold text-sidebar shadow-lg shadow-gold/20" : "bg-white/5 text-gray-500 hover:bg-white/10"
              }`}
            >
              API & Cấu hình
            </button>
          </>
        )}
      </div>

      <div className="animate-fade-in">
        {activeTab === "PROFILE" && (
          <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl max-w-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
              <Info className="text-gold" size={18} />
              <h3 className="text-md font-black text-white uppercase tracking-tight">Thông tin cá nhân</h3>
            </div>
            <div className="space-y-4 text-sm text-gray-300">
              <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="font-bold text-gray-500 uppercase text-[10px] tracking-widest">Họ và tên</span>
                <span className="font-black text-white">{user?.name}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="font-bold text-gray-500 uppercase text-[10px] tracking-widest">Tên đăng nhập</span>
                <span className="font-black text-gold">@{user?.username}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="font-bold text-gray-500 uppercase text-[10px] tracking-widest">Phân quyền</span>
                <span className="px-3 py-1 bg-gold/10 text-gold border border-gold/20 rounded-lg text-[10px] font-black uppercase">
                  {user?.role === "01" ? "ADMIN" : user?.role === "02" ? "QL CÔNG VIỆC" : user?.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN"}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "PASSWORD" && (
          <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl max-w-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
              <Lock className="text-gold" size={18} />
              <h3 className="text-md font-black text-white uppercase tracking-tight">Đổi mật khẩu tài khoản</h3>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Mật khẩu hiện tại</label>
                <input 
                  type="password" 
                  value={oldPassword}
                  onChange={(e) => handleOldPasswordChange(e.target.value)}
                  className={`bg-black/20 border rounded-xl px-4 h-11 text-xs text-white outline-none focus:border-gold/50 transition-all w-full ${passErrors.old ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "border-white/10"}`}
                />
                <AnimatePresence>
                  {passErrors.old && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-1.5 mt-2 text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                      <AlertCircle size={14} className="shrink-0" />
                      <p className="text-[10.5px] font-bold tracking-wide">{passErrors.old}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Mật khẩu mới</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => handleNewPasswordChange(e.target.value)}
                  className={`bg-black/20 border rounded-xl px-4 h-11 text-xs text-white outline-none focus:border-gold/50 transition-all w-full ${passErrors.new ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "border-white/10"}`}
                  placeholder="Trên 6 kí tự, có chữ hoa, số và kí tự đặc biệt..."
                />
                {newPassword && (
                  <div className="flex gap-1.5 mt-2">
                    {[1, 2, 3, 4].map(level => (
                      <div 
                        key={level} 
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          getPasswordStrength(newPassword) >= level 
                            ? (getPasswordStrength(newPassword) <= 2 ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' : getPasswordStrength(newPassword) === 3 ? 'bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]' : 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]') 
                            : 'bg-white/10'
                        }`} 
                      />
                    ))}
                  </div>
                )}
                <AnimatePresence>
                  {passErrors.new && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-1.5 mt-2 text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                      <AlertCircle size={14} className="shrink-0" />
                      <p className="text-[10.5px] font-bold tracking-wide">{passErrors.new}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Xác nhận mật khẩu mới</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  className={`bg-black/20 border rounded-xl px-4 h-11 text-xs text-white outline-none focus:border-gold/50 transition-all w-full ${passErrors.confirm ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "border-white/10"}`}
                />
                <AnimatePresence>
                  {passErrors.confirm && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-1.5 mt-2 text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                      <AlertCircle size={14} className="shrink-0" />
                      <p className="text-[10.5px] font-bold tracking-wide">{passErrors.confirm}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="pt-4">
                <button 
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-gold text-sidebar font-black uppercase text-xs tracking-widest hover:bg-yellow-500 transition-all flex items-center gap-2 shadow-lg shadow-gold/20"
                >
                  <ShieldCheck size={16} /> Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "2FA" && (
          <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl max-w-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
              <ShieldCheck className="text-gold" size={18} />
              <h3 className="text-md font-black text-white uppercase tracking-tight">Cấu hình bảo mật 2FA</h3>
            </div>
            <div className="text-center p-10 bg-white/[0.02] border border-white/5 rounded-2xl">
              <ShieldCheck size={48} className="text-gray-600 mx-auto mb-4 opacity-50" />
              <h4 className="text-sm font-black text-white uppercase mb-2">Tính năng đang phát triển</h4>
              <p className="text-xs text-gray-500 font-bold">Bảo mật 2FA qua TOTP Authenticator sẽ sớm được ra mắt trong bản cập nhật tới.</p>
            </div>
          </div>
        )}

        {activeTab === "SYSTEM" && (
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
            </div>

            {/* Right Side: Storage Stats & Danger Hard Reset */}
            <div className="space-y-6">
              {/* Database Space Allocation Stats Widget */}
              <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl">
                <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
                  <HardDrive className="text-gold" size={18} />
                  <h3 className="text-md font-black text-white uppercase tracking-tight">Dung lượng DB Local</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold text-gray-400">
                    <span>Đã sử dụng:</span>
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
                </div>
              </div>

              {/* Hard Wipe Danger Zone */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-[32px] p-6 shadow-2xl space-y-4">
                <div className="flex items-center gap-2 border-b border-red-500/10 pb-4">
                  <AlertTriangle className="text-red-500" size={18} />
                  <h3 className="text-md font-black text-red-500 uppercase tracking-tight">Khu vực nguy hiểm</h3>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed font-bold">
                  Khôi phục toàn bộ cơ sở dữ liệu về trạng thái ban đầu của nhà phát triển. Mọi thay đổi sẽ mất.
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
        )}
      </div>
    </div>
  );
}
