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
  AlertCircle,
  DollarSign,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import QRCodeDisplay from "@/components/admin/QRCodeDisplay";

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

  // Bank Config States
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("MB");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankQRCode, setBankQRCode] = useState("");
  const [bankQrImageUrl, setBankQrImageUrl] = useState("");

  const [banksList, setBanksList] = useState<any[]>([]);
  const [bankBin, setBankBin] = useState("970422");
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [bankSearchTerm, setBankSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupSuccess, setLookupSuccess] = useState<boolean | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [activeTab, setActiveTab] = useState<"PROFILE" | "PASSWORD" | "2FA" | "SYSTEM" | "BANK_CONFIG">("PROFILE");

  // DB Reset Safety Modal States
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [safetyPhrase, setSafetyPhrase] = useState("");

  const activeBank = useMemo(() => {
    if (selectedBank) return selectedBank;
    return banksList.find((b: any) => b.code === bankName || b.shortName === bankName) || {
      code: "MB",
      bin: "970422",
      shortName: "MBBank",
      name: "Ngân hàng Quân đội",
      logo: "https://api.vietqr.io/img/MB.png"
    };
  }, [banksList, bankName, selectedBank]);

  // Fetch bank list on mount
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await fetch("https://api.vietqr.io/v2/banks");
        const resData = await res.json();
        if (resData && resData.code === "00" && Array.isArray(resData.data)) {
          setBanksList(resData.data);
          const savedBankConfig = localStorage.getItem("global_bank_config");
          if (savedBankConfig) {
            const config = JSON.parse(savedBankConfig);
            const found = resData.data.find((b: any) => b.code === config.bankName || b.shortName === config.bankName);
            if (found) {
              setSelectedBank(found);
              setBankBin(found.bin);
            }
          }
        } else {
          throw new Error("Invalid API structure");
        }
      } catch (err) {
        console.warn("Failed to fetch banks list, using fallback:", err);
        const fallbacks = [
          { code: "MB", bin: "970422", shortName: "MBBank", name: "Ngân hàng Quân đội", logo: "https://api.vietqr.io/img/MB.png" },
          { code: "VCB", bin: "970436", shortName: "Vietcombank", name: "Ngân hàng Ngoại thương Việt Nam", logo: "https://api.vietqr.io/img/VCB.png" },
          { code: "TCB", bin: "970407", shortName: "Techcombank", name: "Ngân hàng Kỹ thương Việt Nam", logo: "https://api.vietqr.io/img/TCB.png" },
          { code: "ACB", bin: "970416", shortName: "ACB", name: "Ngân hàng Á Châu", logo: "https://api.vietqr.io/img/ACB.png" },
          { code: "BIDV", bin: "970418", shortName: "BIDV", name: "Ngân hàng Đầu tư và Phát triển Việt Nam", logo: "https://api.vietqr.io/img/BIDV.png" },
          { code: "CTG", bin: "970415", shortName: "VietinBank", name: "Ngân hàng Công thương Việt Nam", logo: "https://api.vietqr.io/img/ICB.png" },
          { code: "VPB", bin: "970432", shortName: "VPBank", name: "Ngân hàng Thịnh vượng Việt Nam", logo: "https://api.vietqr.io/img/VPB.png" },
          { code: "TPB", bin: "970423", shortName: "TPBank", name: "Ngân hàng Tiên Phong", logo: "https://api.vietqr.io/img/TPB.png" }
        ];
        setBanksList(fallbacks);
        const savedBankConfig = localStorage.getItem("global_bank_config");
        if (savedBankConfig) {
          const config = JSON.parse(savedBankConfig);
          const found = fallbacks.find((b: any) => b.code === config.bankName || b.shortName === config.bankName);
          if (found) {
            setSelectedBank(found);
            setBankBin(found.bin);
          }
        }
      }
    };
    fetchBanks();
  }, []);

  // Account holder simulated lookup triggered manually
  const handleLookupAccount = () => {
    if (!bankAccountNumber || bankAccountNumber.length < 6) {
      triggerToast("Vui lòng nhập STK hợp lệ để tra cứu!");
      return;
    }

    setIsLookingUp(true);
    setLookupSuccess(null);

    setTimeout(() => {
      const lastNamePool = ["NGUYEN", "TRAN", "PHAM", "LE", "HOANG", "VU", "PHAN", "DANG", "BUI", "DO"];
      const middleNamePool = ["VAN", "THI", "MINH", "ANH", "DUC", "HONG", "XUAN", "HUY", "HAI", "NGOC"];
      const firstNamePool = ["HUNG", "DUNG", "LAN", "MAI", "PHONG", "NAM", "LONG", "VY", "LINH", "TRANG", "THANG", "TUAN", "MINH", "THAO", "TUNG"];
      
      let hash = 0;
      for (let i = 0; i < bankAccountNumber.length; i++) {
        hash += bankAccountNumber.charCodeAt(i) * (i + 1);
      }
      
      const ln = lastNamePool[hash % lastNamePool.length];
      const mn = middleNamePool[(hash >> 2) % middleNamePool.length];
      const fn = firstNamePool[(hash >> 4) % firstNamePool.length];
      
      const simulatedName = `${ln} ${mn} ${fn}`;
      setBankAccountHolder(simulatedName);
      setIsLookingUp(false);
      setLookupSuccess(true);
      triggerToast("Đã tra cứu & xác thực tài khoản!");
    }, 800);
  };

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

      // Load Bank Config
      const savedBankConfig = localStorage.getItem("global_bank_config");
      if (savedBankConfig) {
        const bankConfig = JSON.parse(savedBankConfig);
        setBankAccountNumber(bankConfig.accountNumber || "");
        setBankName(bankConfig.bankName || "MB");
        setBankAccountHolder(bankConfig.accountHolder || "");
        setBankQRCode(bankConfig.qrCode || "");
        setBankQrImageUrl(bankConfig.qrImageUrl || "");
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

  // GENERATE QR CODE FOR BANK TRANSFER
  const generateQRCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankAccountNumber || !bankAccountHolder) {
      triggerToast("Vui lòng nhập STK và tên chủ tài khoản");
      return;
    }

    const formatLength = (value: string) => value.length.toString().padStart(2, "0");
    const formatTag = (id: string, value: string) => `${id}${formatLength(value)}${value}`;

    const crc16 = (input: string) => {
      let crc = 0xFFFF;
      for (let i = 0; i < input.length; i++) {
        crc ^= input.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
          crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : (crc << 1);
          crc &= 0xFFFF;
        }
      }
      return crc.toString(16).toUpperCase().padStart(4, "0");
    };

    const accountNumber = bankAccountNumber.replace(/\s+/g, "");
    const accountHolder = bankAccountHolder.trim().toUpperCase().slice(0, 25);

    const merchantAccountInfo = `${formatTag("00", "A000000727010111")}${formatTag("01", accountNumber)}`;
    const additionalData = formatTag("01", activeBank.code || activeBank.shortName || "MB");

    const qrPayload = [
      formatTag("00", "01"),
      formatTag("01", "12"),
      formatTag("26", merchantAccountInfo),
      formatTag("52", "0000"),
      formatTag("53", "704"),
      formatTag("58", "VN"),
      formatTag("59", accountHolder || "KHONG XAC DINH"),
      formatTag("60", "HO CHI MINH"),
      formatTag("62", additionalData),
      "6304"
    ].join("");

    const crc = crc16(qrPayload);
    const qrData = `${qrPayload}${crc}`;
    setBankQRCode(qrData);

    const bankConfig = {
      accountNumber,
      bankName: activeBank.code || activeBank.shortName || "MB",
      bankFullName: activeBank.name || "Ngân hàng Quân đội",
      bankBin: activeBank.bin || "970422",
      accountHolder,
      qrCode: qrData,
      qrImageUrl: `https://img.vietqr.io/image/${activeBank.code || activeBank.shortName || "MB"}-${accountNumber}-compact2.png`,
      createdAt: new Date().toLocaleString("vi-VN")
    };

    localStorage.setItem("global_bank_config", JSON.stringify(bankConfig));
    window.dispatchEvent(new Event("storage"));

    triggerToast("Cấu hình ngân hàng đã được lưu thành công!");

    // Add activity log
    const existingLogs = localStorage.getItem("global_system_logs");
    const logsList = existingLogs ? JSON.parse(existingLogs) : [];
    const newLog = {
      id: `log-${Date.now()}`,
      user: user?.name || "Admin",
      role: user?.role === "01" ? "ADMIN" : "QL CÔNG VIỆC",
      action: `Cập nhật cấu hình tài khoản ngân hàng ${activeBank.shortName || activeBank.code}`,
      type: "SUCCESS",
      timestamp: new Date().toLocaleString("vi-VN")
    };
    localStorage.setItem("global_system_logs", JSON.stringify([newLog, ...logsList]));
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
            <button 
              onClick={() => setActiveTab("BANK_CONFIG")}
              className={`h-10 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === "BANK_CONFIG" ? "bg-gold text-sidebar shadow-lg shadow-gold/20" : "bg-white/5 text-gray-500 hover:bg-white/10"
              }`}
            >
              Ngân Hàng & QR
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

        {activeTab === "BANK_CONFIG" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bank Configuration Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl">
                <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
                  <DollarSign className="text-gold" size={18} />
                  <h3 className="text-md font-black text-white uppercase tracking-tight">Cấu Hinh Tài Khoản Ngân Hàng</h3>
                </div>
                
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 mb-6">
                  <p className="text-xs text-indigo-300 font-bold leading-relaxed">
                    ℹ️ Nhập thông tin tài khoản ngân hàng thụ hưởng để hệ thống tự động cập nhật mã QR Code thanh toán phạt đi muộn cho nhân viên. Dữ liệu được đồng bộ an toàn.
                  </p>
                </div>

                <form onSubmit={generateQRCode} className="space-y-5">
                  {/* Custom search-select dropdown for banks */}
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Ngân Hàng Thụ Hưởng</label>
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="bg-black/20 border border-white/10 rounded-xl px-4 h-11 text-xs text-white outline-none focus:border-gold/50 transition-all w-full font-bold flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        {activeBank.logo ? (
                          <img src={activeBank.logo} alt={activeBank.shortName} className="h-5 w-auto object-contain rounded bg-white px-1 py-0.5" />
                        ) : (
                          <div className="w-5 h-5 bg-gold/10 text-gold flex items-center justify-center rounded text-[10px]">{activeBank.shortName?.slice(0, 2)}</div>
                        )}
                        <span className="truncate">{activeBank.shortName} - {activeBank.name}</span>
                      </div>
                      <span className="text-gray-400 text-[10px]">{isDropdownOpen ? "▲" : "▼"}</span>
                    </div>

                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-2 bg-sidebar border border-border-custom rounded-2xl shadow-2xl z-[100] max-h-64 flex flex-col overflow-hidden animate-fade-in">
                        <div className="p-2 border-b border-white/5 flex-shrink-0">
                          <input 
                            type="text" 
                            placeholder="Tìm tên hoặc mã ngân hàng..."
                            value={bankSearchTerm}
                            onChange={(e) => setBankSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-black/40 border border-white/10 rounded-xl px-3 h-9 text-xs text-white placeholder:text-gray-600 outline-none focus:border-gold/30 w-full"
                          />
                        </div>
                        <div className="overflow-y-auto custom-scrollbar flex-1">
                          {banksList.filter((b: any) => 
                            b.shortName?.toLowerCase().includes(bankSearchTerm.toLowerCase()) ||
                            b.name?.toLowerCase().includes(bankSearchTerm.toLowerCase()) ||
                            b.code?.toLowerCase().includes(bankSearchTerm.toLowerCase())
                          ).length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-500 font-bold">Không tìm thấy ngân hàng</div>
                          ) : (
                            banksList.filter((b: any) => 
                              b.shortName?.toLowerCase().includes(bankSearchTerm.toLowerCase()) ||
                              b.name?.toLowerCase().includes(bankSearchTerm.toLowerCase()) ||
                              b.code?.toLowerCase().includes(bankSearchTerm.toLowerCase())
                            ).map((b: any) => (
                              <div 
                                key={b.bin}
                                onClick={() => {
                                  setSelectedBank(b);
                                  setBankName(b.code || b.shortName);
                                  setBankBin(b.bin);
                                  setIsDirty(true);
                                  setIsDropdownOpen(false);
                                  setBankSearchTerm("");
                                }}
                                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer border-b border-white/[0.02] last:border-0 ${activeBank.bin === b.bin ? 'bg-gold/10' : ''}`}
                              >
                                {b.logo ? (
                                  <img src={b.logo} alt={b.shortName} className="h-6 w-10 object-contain rounded bg-white px-1 py-0.5 shrink-0" />
                                ) : (
                                  <div className="w-10 h-6 bg-gold/10 text-gold flex items-center justify-center rounded text-[10px] shrink-0 font-bold">{b.shortName?.slice(0, 3)}</div>
                                )}
                                <div className="text-left">
                                  <div className="text-xs font-black text-white">{b.shortName}</div>
                                  <div className="text-[10px] text-gray-500 font-medium truncate max-w-[280px]">{b.name}</div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Số Tài Khoản (STK)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          value={bankAccountNumber}
                          onChange={(e) => {
                            setBankAccountNumber(e.target.value);
                            setIsDirty(true);
                            setLookupSuccess(null);
                          }}
                          placeholder="Ví dụ: 0123456789"
                          className="bg-black/20 border border-white/10 rounded-xl pl-4 pr-10 h-11 text-xs text-white outline-none focus:border-gold/50 transition-all w-full font-bold"
                          required
                        />
                        {isLookingUp && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                            <svg className="animate-spin h-4 w-4 text-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleLookupAccount}
                        disabled={isLookingUp}
                        className="h-11 px-4 bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center shrink-0 disabled:opacity-40 cursor-pointer shadow-lg shadow-gold/5"
                      >
                        {isLookingUp ? "Đang tìm..." : "Tra cứu"}
                      </button>
                    </div>
                    {lookupSuccess && (
                      <p className="text-[9px] text-green-400 font-black flex items-center gap-1 animate-pulse">
                        <CheckCircle2 size={12} className="text-green-400" /> Tên tài khoản đã được xác thực thành công
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Tên Chủ Tài Khoản</label>
                    <input 
                      type="text" 
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value.toUpperCase())}
                      placeholder="Ví dụ: NGUYEN VAN A"
                      className="bg-black/20 border border-white/10 rounded-xl px-4 h-11 text-xs text-white outline-none focus:border-gold/50 transition-all w-full font-bold"
                      required
                    />
                    <p className="text-[9px] text-gray-500">Tên viết in hoa không dấu - Hệ thống tự động tra cứu khi nhập đủ STK</p>
                  </div>

                  <div className="pt-4 space-y-3">
                    <button 
                      type="submit"
                      className="h-11 w-full px-6 rounded-xl bg-gold text-sidebar font-black uppercase text-xs tracking-widest hover:bg-yellow-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold/20"
                    >
                      <Save size={16} /> Xác Nhận & Lưu Ngân Hàng
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* QR Code Display */}
            <div className="space-y-6">
              <div className="bg-sidebar border border-border-custom rounded-[32px] p-6 shadow-2xl">
                <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
                  <Zap className="text-gold" size={18} />
                  <h3 className="text-md font-black text-white uppercase tracking-tight">QR Code Thanh Toán</h3>
                </div>

                {bankAccountNumber ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-2xl shadow-xl border border-gold/40 relative">
                      <img 
                        src={`https://img.vietqr.io/image/${activeBank.code || bankName || "MB"}-${bankAccountNumber}-compact2.png?accountName=${encodeURIComponent(bankAccountHolder || "")}`}
                        alt="VietQR Dynamic Fine Code"
                        className="h-[180px] w-[180px] object-contain rounded-xl"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black text-center mt-2">Mã QR Code Thụ Hưởng Bản Gốc</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Zap size={40} className="text-gray-600 opacity-30 mb-3" />
                    <p className="text-gray-500 font-bold text-sm text-center">Cấu hình STK để tạo QR Code</p>
                    <p className="text-gray-600 font-medium text-[10px] text-center mt-2">Nhập thông tin tài khoản ở bên trái</p>
                  </div>
                )}
              </div>

              {/* Bank Info Display */}
              <div className="bg-sidebar border border-gold/20 rounded-[32px] p-6 shadow-2xl">
                <div className="flex items-center gap-2 border-b border-gold/10 pb-4 mb-4">
                  <CheckCircle2 className="text-gold" size={18} />
                  <h3 className="text-md font-black text-white uppercase tracking-tight">Thông Tin Đã Lưu</h3>
                </div>
                
                {bankAccountNumber ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-bold">Ngân Hàng:</span>
                      <span className="text-white font-black">{activeBank.shortName || bankName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-bold">STK:</span>
                      <span className="text-gold font-black">{bankAccountNumber}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-bold">Chủ TK:</span>
                      <span className="text-white font-black">{bankAccountHolder}</span>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-[9px] text-green-400 font-black">✓ Đã được cấu hình & đồng bộ thành công</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs text-center py-4 font-medium">Chưa có thông tin</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
