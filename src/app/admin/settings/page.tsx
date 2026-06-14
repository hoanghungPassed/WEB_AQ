"use client";

import React, { useState, useEffect, useMemo } from"react";
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
 Zap,
 ChevronDown,
 ChevronRight,
 Clock,
 Building2
} from"lucide-react";
import { motion, AnimatePresence } from"framer-motion";
import { useRouter } from"next/navigation";
import QRCodeDisplay from"@/components/admin/QRCodeDisplay";
import TOTPDisplay from "@/components/admin/TOTPDisplay";
import toast from "react-hot-toast";

interface SystemSettings {
 agencyName: string;
 kpiTargetMails: number;
 kpiTargetWatchHours: number;
 chunkSize: number;
 apiSyncEndpoint: string;
}

interface CollapsibleSectionProps {
  id: string;
  icon: any;
  title: string;
  children: React.ReactNode;
  iconColor?: string;
  openSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
}

const CollapsibleSection = ({
  id,
  icon: Icon,
  title,
  children,
  iconColor = "text-amber-500",
  openSections,
  toggleSection
}: CollapsibleSectionProps) => (
  <div className="bg-zinc-900 border border-white/0 rounded-[24px] shadow-2xl overflow-hidden">
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-6 hover:bg-zinc-800/20 bg-zinc-900/[0.02] transition-all"
    >
      <div className="flex items-center gap-2">
        <Icon className={iconColor} size={18} />
        <h3 className="text-md font-black text-white uppercase tracking-tight">{title}</h3>
      </div>
      <motion.div animate={{ rotate: openSections[id] ? 180 : 0 }} transition={{ duration: 0.2 }}>
        <ChevronDown size={18} className="text-gray-400" />
      </motion.div>
    </button>
    <AnimatePresence initial={false}>
      {openSections[id] && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="px-6 pb-6 border-t border-white/0">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

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

 // Password states kept for handler (now used in ProfileModal, handler stays here for logs)
 const [oldPassword, setOldPassword] = useState("");
 const [newPassword, setNewPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [passErrors, setPassErrors] = useState({ old:"", new:"", confirm:"" });

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

 // Tabs: PROFILE and HE_THONG (system, merging 2FA + API & Cấu hình + Ngân Hàng & QR)
 const [activeTab, setActiveTab] = useState<"PROFILE" |"HE_THONG">("PROFILE");

 // Collapsible section states inside Hệ Thống
 const [openSections, setOpenSections] = useState<Record<string, boolean>>({"2FA": true,"API": true,"BANK": true,"WORK_CONFIG": true,"AGENCY_CONFIG": true,"PASSWORD": true,
 });

 // DB Reset Safety Modal States
 const [showResetConfirm, setShowResetConfirm] = useState(false);
 const [safetyPhrase, setSafetyPhrase] = useState("");

 // Work schedule & fine config states
 const [workStartTime, setWorkStartTime] = useState("08:00");
 const [workEndTime, setWorkEndTime] = useState("17:30");
 const [breakStartTime, setBreakStartTime] = useState("12:00");
 const [breakEndTime, setBreakEndTime] = useState("13:30");
 const [systemCloseTime, setSystemCloseTime] = useState("17:30");
 const [fineTier1, setFineTier1] = useState(10000);
 const [fineTier2, setFineTier2] = useState(20000);
 const [fineTier3, setFineTier3] = useState(50000);

  // Agency name config state
  const [agencyConfigName, setAgencyConfigName] = useState("AQ MEDIA");
  const [rulesUrl, setRulesUrl] = useState("");

  // 2FA States
  const [twoFAEnabledState, setTwoFAEnabledState] = useState<boolean>(false);
  const [twoFAStep, setTwoFAStep] = useState<"IDLE" | "SETUP" | "VERIFYING">("IDLE");
  const [twoFAQrUrl, setTwoFAQrUrl] = useState("");
  const [twoFAEncSecret, setTwoFAEncSecret] = useState("");
  const [twoFABackupCodes, setTwoFABackupCodes] = useState<string[]>([]);
  const [twoFAInputCode, setTwoFAInputCode] = useState("");
  const [twoFAManualSecret, setTwoFAManualSecret] = useState("");
  const [isActivating2FA, setIsActivating2FA] = useState(false);
  const [totpError, setTotpError] = useState("");

  // Sync 2FA from loaded user
   useEffect(() => {
     if (user) {
       setTwoFAEnabledState(!!user.twoFAEnabled);
     }
   }, [user]);

   // Warn high-privilege users without 2FA enabled
   const warned2FARef = React.useRef(false);
   useEffect(() => {
     if (user) {
       const isHighPrivilege = user.role === "01" || user.role === "02";
       const is2FADisabled = !user.twoFAEnabled && !user.isTwoFactorEnabled;

       if (isHighPrivilege && is2FADisabled && !warned2FARef.current) {
         warned2FARef.current = true;
         toast('⚠️ Vui lòng bật Xác thực 2 bước (2FA) trong mục Bảo mật để bảo vệ tài khoản Admin', {
           icon: '🛡️',
           duration: 6000,
           id: "admin-2fa-warning"
         });
       }
     }
   }, [user]);

  // Initiate 2FA Setup
  const handleInitiate2FA = async () => {
    if (!user) return;
    setIsActivating2FA(true);
    setTotpError("");
    try {
      const res = await fetch("/api/admin/2fa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id || user._id || ""
        },
        body: JSON.stringify({
          email: user.email || `${user.username}@aqmedia.vn`,
          userId: user.id || user._id || ""
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFAQrUrl(data.qrDataUrl);
        setTwoFAEncSecret(data.encryptedSecret);
        setTwoFABackupCodes(data.backupCodes || []);
        setTwoFAManualSecret(data.manualSecret || "");
        setTwoFAStep("SETUP");
        triggerToast("Đã khởi tạo thiết lập 2FA!");
      } else {
        setTotpError(data.error || "Không thể khởi tạo 2FA");
      }
    } catch (err) {
      setTotpError("Lỗi kết nối máy chủ");
    } finally {
      setIsActivating2FA(false);
    }
  };

  // Verify and Confirm 2FA
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !twoFAInputCode) return;
    setIsActivating2FA(true);
    setTotpError("");
    try {
      const res = await fetch("/api/admin/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id || user._id || ""
        },
        body: JSON.stringify({
          token: twoFAInputCode,
          userId: user.id || user._id || ""
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFAEnabledState(true);
        setTwoFAStep("IDLE");
        // Update user state in sessionStorage/localStorage
        const updatedUser = { ...user, twoFAEnabled: true };
        setUser(updatedUser);
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
        localStorage.setItem("user", JSON.stringify(updatedUser));
        triggerToast("Kích hoạt 2FA thành công!");
      } else {
        setTotpError(data.error || "Mã xác thực không chính xác");
      }
    } catch (err) {
      setTotpError("Lỗi kết nối");
    } finally {
      setIsActivating2FA(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (!confirm("Bạn có chắc chắn muốn TẮT bảo mật 2FA? Tài khoản của bạn sẽ giảm độ an toàn.")) return;
    if (!user) return;
    setIsActivating2FA(true);
    setTotpError("");
    try {
      // Direct update of User properties
      const res = await fetch(`/api/admin/users/${user.id || user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id || user._id || ""
        },
        body: JSON.stringify({
          twoFAEnabled: false
        })
      });
      if (res.ok) {
        setTwoFAEnabledState(false);
        const updatedUser = { ...user, twoFAEnabled: false };
        setUser(updatedUser);
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
        localStorage.setItem("user", JSON.stringify(updatedUser));
        triggerToast("Đã tắt bảo mật 2FA thành công.");
      } else {
        triggerToast("Không thể tắt 2FA.");
      }
    } catch (err) {
      triggerToast("Lỗi kết nối");
    } finally {
      setIsActivating2FA(false);
    }
  };

 const toggleSection = (key: string) => {
 setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
 };

 const activeBank = useMemo(() => {
 if (selectedBank) return selectedBank;
 return banksList.find((b: any) => b.code === bankName || b.shortName === bankName) || {
 code:"MB",
 bin:"970422",
 shortName:"MBBank",
 name:"Ngân hàng Quân đội",
 logo:"https://api.vietqr.io/img/MB.png"
 };
 }, [banksList, bankName, selectedBank]);

 // Fetch bank list on mount
 useEffect(() => {
 const fetchBanks = async () => {
 try {
 const res = await fetch("https://api.vietqr.io/v2/banks");
 const resData = await res.json();
 if (resData && resData.code ==="00" && Array.isArray(resData.data)) {
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
 
 const fallbacks = [
 { code:"MB", bin:"970422", shortName:"MBBank", name:"Ngân hàng Quân đội", logo:"https://api.vietqr.io/img/MB.png" },
 { code:"VCB", bin:"970436", shortName:"Vietcombank", name:"Ngân hàng Ngoại thương Việt Nam", logo:"https://api.vietqr.io/img/VCB.png" },
 { code:"TCB", bin:"970407", shortName:"Techcombank", name:"Ngân hàng Kỹ thương Việt Nam", logo:"https://api.vietqr.io/img/TCB.png" },
 { code:"ACB", bin:"970416", shortName:"ACB", name:"Ngân hàng Á Châu", logo:"https://api.vietqr.io/img/ACB.png" },
 { code:"BIDV", bin:"970418", shortName:"BIDV", name:"Ngân hàng Đầu tư và Phát triển Việt Nam", logo:"https://api.vietqr.io/img/BIDV.png" },
 { code:"CTG", bin:"970415", shortName:"VietinBank", name:"Ngân hàng Công thương Việt Nam", logo:"https://api.vietqr.io/img/ICB.png" },
 { code:"VPB", bin:"970432", shortName:"VPBank", name:"Ngân hàng Thịnh vượng Việt Nam", logo:"https://api.vietqr.io/img/VPB.png" },
 { code:"TPB", bin:"970423", shortName:"TPBank", name:"Ngân hàng Tiên Phong", logo:"https://api.vietqr.io/img/TPB.png" }
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
   // In a real app, this would call a banking API. 
   // Removing mock name generation as requested.
   setBankAccountHolder("Tài khoản đã nhập"); 
   setIsLookingUp(false);
   setLookupSuccess(true);
   triggerToast("Đã ghi nhận thông tin tài khoản!");
 }, 800);
 };

 useEffect(() => {
 // Everyone can access settings
 const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
 if (storedUser) {
 const parsedUser = JSON.parse(storedUser);
 setUser(parsedUser);
 } else {
 window.location.href ="/login";
 }

 const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const dbSettings = data.data;
          setAgencyName(dbSettings.brandName || "AQ MEDIA");
          setAgencyConfigName(dbSettings.brandName || "AQ MEDIA");
          setWorkStartTime(dbSettings.openTime || "08:00");
          setWorkEndTime(dbSettings.closeTime || "17:30");
          setBreakStartTime(dbSettings.breakStartTime || "12:00");
          setBreakEndTime(dbSettings.breakEndTime || "13:30");
          setSystemCloseTime(dbSettings.checkInTime || "17:30");
          setRulesUrl(dbSettings.rulesUrl || "");

          // Sync work config
          const workConfig = {
            startTime: dbSettings.openTime || "08:00",
            endTime: dbSettings.closeTime || "17:30",
            breakStartTime: dbSettings.breakStartTime || "12:00",
            breakEndTime: dbSettings.breakEndTime || "13:30",
            systemCloseTime: dbSettings.checkInTime || "17:30"
          };
          localStorage.setItem("global_work_config", JSON.stringify(workConfig));

          // Set time cookie
          document.cookie = `close_time=${dbSettings.closeTime || "17:30"}; path=/; max-age=31536000`;
        }
      }
    } catch (err) {
      console.error("API settings load failed, using local storage", err);
    }

    const savedSettings = localStorage.getItem("global_system_settings");
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setAgencyName(parsed.agencyName ||"AQ MEDIA");
      setKpiTargetMails(parsed.kpiTargetMails || 500);
      setKpiTargetWatchHours(parsed.kpiTargetWatchHours || 2000);
      setChunkSize(parsed.chunkSize || 17);
      setApiSyncEndpoint(parsed.apiSyncEndpoint ||"/api/sync");
    }

    // Load Bank Config
    const savedBankConfig = localStorage.getItem("global_bank_config");
    if (savedBankConfig) {
      const bankConfig = JSON.parse(savedBankConfig);
      setBankAccountNumber(bankConfig.accountNumber ||"");
      setBankName(bankConfig.bankName ||"MB");
      setBankAccountHolder(bankConfig.accountHolder ||"");
      setBankQRCode(bankConfig.qrCode ||"");
      setBankQrImageUrl(bankConfig.qrImageUrl ||"");
    }

    // Load Work Config
    const savedWorkConfig = localStorage.getItem("global_work_config");
    if (savedWorkConfig) {
      const workConfig = JSON.parse(savedWorkConfig);
      setWorkStartTime(workConfig.startTime ||"08:00");
      setWorkEndTime(workConfig.endTime ||"18:00");
      setSystemCloseTime(workConfig.systemCloseTime ||"17:30");
      setFineTier1(workConfig.fineTier1 ?? 10000);
      setFineTier2(workConfig.fineTier2 ?? 20000);
      setFineTier3(workConfig.fineTier3 ?? 50000);
    }

    // Load Agency Config
    const savedAgencyConfig = localStorage.getItem("global_agency_config");
    if (savedAgencyConfig) {
      const agencyConfig = JSON.parse(savedAgencyConfig);
      setAgencyConfigName(agencyConfig.name ||"AQ MEDIA");
      setRulesUrl(agencyConfig.rulesUrl || "");
    }
  };

  loadSettings();
 }, []);

 const triggerToast = (msg: string) => {
 setToastMsg(msg);
 setTimeout(() => setToastMsg(""), 3000);
 };

 // MongoDB Space Usage Calculator
 const [storageUsage, setStorageUsage] = useState({ text:"0 MB / 512 MB", percentage: 0 });

 useEffect(() => {
 const fetchDbStats = async () => {
 try {
 const res = await fetch("/api/admin/db-stats");
 const data = await res.json();
 if (data.success) {
 const sizeMB = (data.dataSize / (1024 * 1024)).toFixed(2);
 const percentage = Math.min(100, Math.round((Number(sizeMB) / 512) * 100)); // 512MB max for example
 setStorageUsage({ text: `${sizeMB} MB / 512 MB`, percentage });
 }
 } catch (err) {
 console.error("Fetch DB stats error:", err);
 }
 };
 fetchDbStats();
 }, []);

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
 user: user?.name ||"Admin",
 role: user?.role ==="01" ?"ADMIN" :"QL CÔNG VIỆC",
 action:"Cập nhật cấu hình chung của hệ thống AQ MEDIA",
 type:"INFO",
 timestamp: new Date().toLocaleString("vi-VN")
 };
 localStorage.setItem("global_system_logs", JSON.stringify([newLog, ...logsList]));

 // Sync to database
 try {
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandName: agencyName })
    });
  } catch (err) {
    console.error("PUT general settings sync error:", err);
  }

 // Sync state
 try {
  await fetch("/api/sync", {
  method:"POST",
  headers: {"Content-Type":"application/json" },
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

 // Password change handler kept for backward compatibility / logging
 const handleOldPasswordChange = (val: string) => {
 setOldPassword(val);
 if (!val) {
 setPassErrors(prev => ({ ...prev, old:"" }));
 return;
 }
 const savedUsers = localStorage.getItem("global_users");
 const allUsers = savedUsers ? JSON.parse(savedUsers) : [];
 const currentUser = allUsers.find((u: any) => String(u.id) === String(user?.id) || u.username === user?.username);
 
 if (currentUser && currentUser.password !== val) {
 setPassErrors(prev => ({ ...prev, old:"Mật khẩu hiện tại không đúng" }));
 } else {
 setPassErrors(prev => ({ ...prev, old:"" }));
 }
 };

 const getPasswordStrength = (pwd: string) => {
 let score = 0;
 if ((pwd || []).length > 6) score++;
 if (/[A-Z]/.test(pwd)) score++;
 if (/[0-9]/.test(pwd)) score++;
 if (/[^A-Za-z0-9]/.test(pwd)) score++;
 return score;
 };

 const validateNewPassword = (pwd: string) => {
 if (!pwd) return"";
 if ((pwd || []).length <= 6) return"Mật khẩu phải dài hơn 6 kí tự";
 if (!/[A-Z]/.test(pwd)) return"Phải có ít nhất 1 chữ viết hoa";
 if (!/[0-9]/.test(pwd)) return"Phải có ít nhất 1 chữ số";
 if (!/[^A-Za-z0-9]/.test(pwd)) return"Phải có ít nhất 1 kí tự đặc biệt";
 return"";
 };

 const handleNewPasswordChange = (val: string) => {
 setNewPassword(val);
 setPassErrors(prev => ({ ...prev, new: validateNewPassword(val) }));
 if (confirmPassword && confirmPassword !== val) {
 setPassErrors(prev => ({ ...prev, confirm:"Mật khẩu xác nhận không khớp." }));
 } else {
 setPassErrors(prev => ({ ...prev, confirm:"" }));
 }
 };

 const handleConfirmPasswordChange = (val: string) => {
 setConfirmPassword(val);
 if (val && val !== newPassword) {
 setPassErrors(prev => ({ ...prev, confirm:"Mật khẩu xác nhận không khớp." }));
 } else {
 setPassErrors(prev => ({ ...prev, confirm:"" }));
 }
 };

 // CHANGE PASSWORD SUBMISSION
 const handleChangePassword = async (e: React.FormEvent) => {
   e.preventDefault();
   setPassErrors({ old: "", new: "", confirm: "" });

   if (!oldPassword || !newPassword || !confirmPassword) {
     triggerToast("Vui lòng điền đầy đủ thông tin");
     return;
   }

   if (newPassword !== confirmPassword) {
     setPassErrors(prev => ({ ...prev, confirm: "Mật khẩu xác nhận không khớp" }));
     return;
   }

   try {
     const res = await fetch("/api/auth/change-password", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ oldPassword, newPassword })
     });
     const data = await res.json();

     if (res.ok) {
       triggerToast("Thay đổi mật khẩu đăng nhập thành công!");
       setOldPassword("");
       setNewPassword("");
       setConfirmPassword("");
       
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
     } else {
       triggerToast(data.error || "Lỗi khi đổi mật khẩu");
     }
   } catch (err) {
     triggerToast("Lỗi kết nối máy chủ");
   }
 };

 // UPGRADED HARD WIPE & RESET DATABASE - requires typing"XACNHAN"
 const handleHardResetDatabase = async () => {
 if (safetyPhrase !=="XACNHAN") {
 return;
 }

 triggerToast("Hệ thống đang tiến hành hard-reset toàn bộ dữ liệu...");
 try {
 const res = await fetch("/api/admin/reset-db", { method:"POST" });
 const data = await res.json();
 if (!res.ok) {
 triggerToast(data.error ||"Lỗi khi reset database");
 return;
 }
 
 triggerToast(data.message ||"Đã reset database thành công!");
 
 sessionStorage.clear();
 localStorage.clear();
 
 setShowResetConfirm(false);
 setSafetyPhrase("");

 setTimeout(() => {
 window.location.reload();
 }, 1500);
 } catch (error) {
 triggerToast("Lỗi kết nối API reset-db");
 }
 };

 // SAVE WORK CONFIG
 const handleSaveWorkConfig = async () => {
  try {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        openTime: workStartTime,
        breakStartTime: breakStartTime,
        breakEndTime: breakEndTime,
        checkInTime: systemCloseTime
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
         setWorkEndTime(data.data.closeTime);
         
         const workConfig = {
          startTime: workStartTime,
          endTime: data.data.closeTime,
          breakStartTime: breakStartTime,
          breakEndTime: breakEndTime,
          systemCloseTime: systemCloseTime,
          fineTier1: Number(fineTier1),
          fineTier2: Number(fineTier2),
          fineTier3: Number(fineTier3),
          updatedAt: new Date().toLocaleString("vi-VN"),
         };
         localStorage.setItem("global_work_config", JSON.stringify(workConfig));
         window.dispatchEvent(new Event("storage"));
         document.cookie = `close_time=${data.data.closeTime}; path=/; max-age=31536000`;
      }
    }
  } catch (err) {
    console.error("PUT work settings sync error:", err);
  }

  triggerToast("Đã lưu cấu hình giờ giấc & phạt thành công!");

  // Add activity log
  const existingLogs = localStorage.getItem("global_system_logs");
  const logsList = existingLogs ? JSON.parse(existingLogs) : [];
  const newLog = {
  id: `log-${Date.now()}`,
  user: user?.name ||"Admin",
  role: user?.role ==="01" ?"ADMIN" :"QL CÔNG VIỆC",
  action:"Cập nhật cấu hình giờ giấc làm việc & mức phạt",
  type:"INFO",
  timestamp: new Date().toLocaleString("vi-VN"),
  };
  localStorage.setItem("global_system_logs", JSON.stringify([newLog, ...logsList]));
  };

  // SAVE AGENCY CONFIG
  const handleSaveAgencyConfig = async () => {
    const agencyConfig = {
      name: agencyConfigName,
      rulesUrl: rulesUrl,
      updatedAt: new Date().toLocaleString("vi-VN"),
    };
    localStorage.setItem("global_agency_config", JSON.stringify(agencyConfig));

    // Dispatch storage event so Header/Sidebar can pick up the change
    window.dispatchEvent(new StorageEvent("storage", {
      key: "global_agency_config",
      newValue: JSON.stringify(agencyConfig),
    }));

    // Sync to database
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: agencyConfigName, rulesUrl: rulesUrl })
      });
    } catch (err) {
      console.error("PUT brand settings sync error:", err);
    }

    triggerToast("Đã lưu cấu hình Agency và nội quy thành công!");

    // Add activity log
    const existingLogs = localStorage.getItem("global_system_logs");
    const logsList = existingLogs ? JSON.parse(existingLogs) : [];
    const newLog = {
      id: `log-${Date.now()}`,
      user: user?.name || "Admin",
      role: user?.role === "01" ? "ADMIN" : "QL CÔNG VIỆC",
      action: `Đổi tên Agency thành "${agencyConfigName}"`,
      type: "INFO",
      timestamp: new Date().toLocaleString("vi-VN"),
    };
    localStorage.setItem("global_system_logs", JSON.stringify([newLog, ...logsList]));
  };

 // GENERATE QR CODE FOR BANK TRANSFER
 const generateQRCode = async (e: React.FormEvent) => {
 e.preventDefault();

 if (!bankAccountNumber || !bankAccountHolder) {
 triggerToast("Vui lòng nhập STK và tên chủ tài khoản");
 return;
 }

 const formatLength = (value: string) => (value || []).length.toString().padStart(2,"0");
 const formatTag = (id: string, value: string) => `${id}${formatLength(value)}${value}`;

 const crc16 = (input: string) => {
 let crc = 0xFFFF;
 for (let i = 0; i < (input || []).length; i++) {
 crc ^= input.charCodeAt(i) << 8;
 for (let j = 0; j < 8; j++) {
 crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : (crc << 1);
 crc &= 0xFFFF;
 }
 }
 return crc.toString(16).toUpperCase().padStart(4,"0");
 };

 const accountNumber = bankAccountNumber.replace(/\s+/g,"");
 const accountHolder = bankAccountHolder.trim().toUpperCase().slice(0, 25);

 const merchantAccountInfo = `${formatTag("00","A000000727010111")}${formatTag("01", accountNumber)}`;
 const additionalData = formatTag("01", activeBank.code || activeBank.shortName ||"MB");

 const qrPayload = [
 formatTag("00","01"),
 formatTag("01","12"),
 formatTag("26", merchantAccountInfo),
 formatTag("52","0000"),
 formatTag("53","704"),
 formatTag("58","VN"),
 formatTag("59", accountHolder ||"KHONG XAC DINH"),
 formatTag("60","HO CHI MINH"),
 formatTag("62", additionalData),"6304"
 ].join("");

 const crc = crc16(qrPayload);
 const qrData = `${qrPayload}${crc}`;
 setBankQRCode(qrData);

 const bankConfig = {
 accountNumber,
 bankName: activeBank.code || activeBank.shortName ||"MB",
 bankFullName: activeBank.name ||"Ngân hàng Quân đội",
 bankBin: activeBank.bin ||"970422",
 accountHolder,
 qrCode: qrData,
 qrImageUrl: `https://img.vietqr.io/image/${activeBank.code || activeBank.shortName ||"MB"}-${accountNumber}-compact2.png`,
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
 user: user?.name ||"Admin",
 role: user?.role ==="01" ?"ADMIN" :"QL CÔNG VIỆC",
 action: `Cập nhật cấu hình tài khoản ngân hàng ${activeBank.shortName || activeBank.code}`,
 type:"SUCCESS",
 timestamp: new Date().toLocaleString("vi-VN")
 };
 localStorage.setItem("global_system_logs", JSON.stringify([newLog, ...logsList]));
 };

 // CollapsibleSection defined globally above to prevent input focus loss on state change

  return (
 <div className="h-full flex flex-col space-y-6 pb-6 relative">
 {/* Toast Notification */}
 <AnimatePresence>
 {toastMsg && (
 <motion.div 
 initial={{ opacity: 0, y: -20, x:"-50%" }} 
 animate={{ opacity: 1, y: 30, x:"-50%" }} 
 exit={{ opacity: 0, y: -20, x:"-50%" }}
 className="fixed top-0 left-1/2 z-[200] bg-gold px-6 py-3 rounded-full text-sidebar font-black text-base shadow-2xl flex items-center gap-2"
 >
 <CheckCircle2 size={18} /> {toastMsg}
 </motion.div>
 )}
 </AnimatePresence>

 {/* Upgraded DB Hard Reset safety alert Modal */}
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
 className="bg-[#121212] border-2 border-red-500/50 rounded-[32px] p-8 w-full max-w-md shadow-2xl shadow-red-500/10 flex flex-col"
 >
 <div className="flex items-center gap-4 mb-6 flex-shrink-0">
 <div className="h-14 w-14 rounded-2xl bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center text-red-500 animate-pulse">
 <AlertTriangle size={32} />
 </div>
 <div>
 <h3 className="text-xl font-black text-red-500 uppercase tracking-tighter">⚠️ CẢNH BÁO NGUY HIỂM</h3>
 <p className="text-[10px] text-red-400/70 font-black uppercase tracking-widest mt-0.5">Hành động không thể hoàn tác</p>
 </div>
 </div>

 <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-5 mb-6 text-sm text-gray-200 font-bold leading-relaxed space-y-3">
 <p className="text-red-400 font-black text-base">CẢNH BÁO: Thao tác này sẽ XÓA TOÀN BỘ dữ liệu hệ thống bao gồm Mail, SĐT, Kênh, và Nhân Viên. Hành động này KHÔNG THỂ HOÀN TÁC!</p>
 <div className="border-t border-red-500/20 pt-3 space-y-1 text-[11px] text-zinc-400">
 <p>• Danh sách Mail, SĐT, Kênh</p>
 <p>• Dữ liệu nhân viên & phân công</p>
 <p>• Lịch sử chat & tin nhắn</p>
 <p>• Bài đăng newsfeed & thông báo</p>
 <p>• Cấu hình hệ thống & KPI</p>
 </div>
 <p className="pt-2 border-t border-red-500/20">Để xác nhận, vui lòng nhập chữ <span className="text-red-400 font-black text-base">&quot;XACNHAN&quot;</span> vào ô bên dưới:</p>
 </div>

 <input 
 type="text"
 placeholder='Nhập XACNHAN để tiếp tục...'
 value={safetyPhrase}
 onChange={(e) => setSafetyPhrase(e.target.value)}
 className="bg-black/40 border-2 border-red-500/30 rounded-xl px-4 h-14 text-lg text-white font-black text-center mb-6 outline-none focus:border-red-500 transition-all placeholder:text-red-500/30"
 />

 <div className="flex gap-4">
 <button 
 onClick={() => {
 setShowResetConfirm(false);
 setSafetyPhrase("");
 }} 
 className="flex-1 h-12 rounded-xl border border-white/0 text-white font-bold uppercase text-sm tracking-widest hover:bg-zinc-800/40 bg-zinc-900/5 transition-all"
 >
 Hủy bỏ
 </button>
 <button 
 disabled={safetyPhrase !=="XACNHAN"}
 onClick={handleHardResetDatabase} 
 className="flex-1 h-12 rounded-xl bg-red-600 text-white font-black uppercase text-sm tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
 >
 <AlertTriangle size={16} /> Xác nhận XÓA
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
 className="p-2 rounded-xl bg-sidebar border border-white/0 text-zinc-400 hover:text-amber-500 text-zinc-100 transition-all shadow-md"
 >
 <ArrowLeft size={20} />
 </button>
 <div>
 <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
 <Settings className="text-gold" size={28} />
 Hệ Thống & Cài Đặt (Settings)
 </h2>
 <p className="text-sm text-gray-500 font-medium uppercase tracking-widest mt-1">
 Thiết lập các cấu hình thông số kỹ thuật toàn cục và tài khoản
 </p>
 </div>
 </div>

 {/* Tab buttons - only PROFILE and HE_THONG */}
 <div className="flex flex-col md:flex-row gap-4 mb-6 pb-4 border-b border-white/0">
 <button 
 onClick={() => setActiveTab("PROFILE")}
 className={`h-10 px-6 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
 activeTab ==="PROFILE" ?"bg-gold text-sidebar shadow-lg shadow-gold/20" :" bg-white/5 text-gray-500 hover:bg-zinc-800/40/10"
 }`}
 >
 Thông tin cá nhân
 </button>
 <button 
 onClick={() => setActiveTab("HE_THONG")}
 className={`h-10 px-6 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
 activeTab ==="HE_THONG" ?"bg-gold text-sidebar shadow-lg shadow-gold/20" :" bg-white/5 text-gray-500 hover:bg-zinc-800/40/10"
 }`}
 >
 {(user?.role === "01" || user?.role === "02") ? "Hệ Thống & Cài Đặt" : "Bảo Mật & Mật Khẩu"}
 </button>
 </div>

 <div className="animate-fade-in">
 {activeTab ==="PROFILE" && (
 <div className="bg-sidebar border border-white/0 rounded-[32px] p-6 shadow-2xl max-w-2xl">
 <div className="flex items-center gap-2 border-b border-white/0 pb-4 mb-6">
 <Info className="text-gold" size={18} />
 <h3 className="text-md font-black text-white uppercase tracking-tight">Thông tin cá nhân</h3>
 </div>
 <div className="space-y-4 text-base text-gray-300">
 <div className="flex items-center justify-between p-6 bg-white/0 border border-white/0 rounded-2xl">
 <span className="font-bold text-gray-500 uppercase text-[10px] tracking-widest">Họ và tên</span>
 <span className="font-black text-white">{user?.name}</span>
 </div>
 <div className="flex items-center justify-between p-6 bg-white/0 border border-white/0 rounded-2xl">
 <span className="font-bold text-gray-500 uppercase text-[10px] tracking-widest">Tên đăng nhập</span>
 <span className="font-black text-gold">@{user?.username}</span>
 </div>
 <div className="flex items-center justify-between p-6 bg-white/0 border border-white/0 rounded-2xl">
 <span className="font-bold text-gray-500 uppercase text-[10px] tracking-widest">Phân quyền</span>
 <span className="px-3 py-1 bg-gold/10 text-gold border border-gold/20 rounded-lg text-[10px] font-black uppercase">
 {user?.role ==="01" ?"ADMIN" : user?.role ==="02" ?"QL CÔNG VIỆC" : user?.role ==="03" ?"QL NHÂN SỰ" :"NHÂN VIÊN"}
 </span>
 </div>
 </div>
 </div>
 )}



 {activeTab ==="HE_THONG" && (
 <div className="space-y-6">
        {/* Section: Đổi Mật Khẩu - Visible to everyone */}
        <CollapsibleSection id="PASSWORD" icon={Lock} title="Đổi Mật Khẩu" openSections={openSections} toggleSection={toggleSection}>
          <div className="pt-5 space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
              <p className="text-base text-amber-400 font-medium leading-relaxed">
                🔐 Bạn nên đổi mật khẩu định kỳ để đảm bảo an toàn cho tài khoản.
              </p>
            </div>
            <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Mật khẩu cũ</label>
                <input 
                  type="password" 
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-zinc-900 border border-white/10 text-zinc-100 rounded-2xl px-5 h-14 text-base outline-none focus:border-amber-500/50 transition-all w-full font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Mật khẩu mới</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-zinc-900 border border-white/10 text-zinc-100 rounded-2xl px-5 h-14 text-base outline-none focus:border-amber-500/50 transition-all w-full font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Xác nhận mật khẩu mới</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-zinc-900 border border-white/10 text-zinc-100 rounded-2xl px-5 h-14 text-base outline-none focus:border-amber-500/50 transition-all w-full font-bold"
                  required
                />
              </div>
              <div className="md:col-span-3">
                <button 
                  type="submit"
                  className="h-14 px-8 rounded-2xl bg-gold text-[#0a0a0a] font-black uppercase text-base tracking-widest hover:bg-amber-700 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)] w-full md:w-auto"
                >
                  <RefreshCw size={18} /> Cập nhật mật khẩu
                </button>
              </div>
            </form>
          </div>
        </CollapsibleSection>

 {/* Section: 2FA - Visible to everyone */}
  <CollapsibleSection id="2FA" icon={ShieldCheck} title="Bảo Mật 2FA" openSections={openSections} toggleSection={toggleSection}>
    <div className="pt-5 space-y-6">
      {twoFAEnabledState ? (
        <div className="bg-[#121212] border border-green-500/30 rounded-[24px] p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center text-green-400 shrink-0">
              <ShieldCheck size={36} />
            </div>
            <div>
              <h4 className="text-lg font-black text-green-400 uppercase tracking-tighter">BẢO MẬT 2FA ĐANG BẬT</h4>
              <p className="text-sm text-gray-400 font-bold mt-1 max-w-md">
                Tài khoản của bạn đã được bảo vệ tối đa bằng xác thực 2 lớp (TOTP). Khi đăng nhập, mã OTP từ ứng dụng Authenticator là bắt buộc.
              </p>
            </div>
          </div>
          <button
            onClick={handleDisable2FA}
            disabled={isActivating2FA}
            className="w-full md:w-auto h-12 px-6 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-600 hover:text-white text-red-500 font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2"
          >
            {isActivating2FA ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : null}
            Tắt Bảo Mật 2FA
          </button>
        </div>
      ) : twoFAStep === "IDLE" ? (
        <div className="bg-[#121212] border border-white/5 rounded-[24px] p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center text-gray-400 shrink-0">
              <Lock size={30} />
            </div>
            <div>
              <h4 className="text-base font-black text-white uppercase tracking-tighter">CHƯA BẬT XÁC THỰC 2 LỚP 2FA</h4>
              <p className="text-xs text-gray-400 font-medium mt-1 max-w-md leading-relaxed">
                Tăng cường bảo mật cho tài khoản của bạn bằng cách yêu cầu mã xác minh OTP 6 chữ số từ điện thoại di động của bạn tại mỗi lượt đăng nhập.
              </p>
            </div>
          </div>
          <button
            onClick={handleInitiate2FA}
            disabled={isActivating2FA}
            className="w-full md:w-auto h-12 px-8 rounded-xl bg-gold text-[#0a0a0a] font-black uppercase text-xs tracking-wider hover:bg-amber-700 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] shrink-0"
          >
            {isActivating2FA ? (
              <RefreshCw className="animate-spin text-[#0a0a0a]" size={14} />
            ) : null}
            Bật bảo mật 2FA
          </button>
        </div>
      ) : (
        <div className="bg-[#121212] border border-white/5 rounded-[28px] p-8 shadow-2xl space-y-8">
          <div className="border-b border-white/5 pb-4">
            <h4 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="text-gold" size={20} />
              Cấu hình Xác thực 2 lớp (TOTP Authenticator)
            </h4>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Hoàn thành 3 bước sau để hoàn tất kích hoạt</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Step 1: QR & Manual Secret */}
            <div className="space-y-4">
              <h5 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-gold/10 text-gold text-xs font-black flex items-center justify-center shrink-0">1</span>
                Quét mã QR Code hoặc Nhập thủ công
              </h5>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-zinc-950/40 p-6 rounded-2xl border border-white/5">
                {twoFAQrUrl ? (
                  <div className="bg-white p-3 rounded-xl shrink-0 shadow-lg relative">
                    <img src={twoFAQrUrl} alt="Mã QR 2FA" className="h-32 w-32 object-contain" />
                  </div>
                ) : (
                  <div className="h-32 w-32 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center">
                    <RefreshCw className="animate-spin text-gray-500" size={24} />
                  </div>
                )}
                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <p className="text-xs text-zinc-400 font-bold leading-relaxed">
                    Mở ứng dụng xác thực của bạn (Google Authenticator, Microsoft Authenticator, Authy...) trên điện thoại và quét mã QR ở bên.
                  </p>
                  {twoFAManualSecret && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Mã nhập thủ công (nếu không quét được):</p>
                      <div className="flex items-center gap-2">
                        <span className="bg-black border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono font-black text-gold tracking-wider select-all block break-all flex-1">{twoFAManualSecret}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(twoFAManualSecret);
                            // Simulating Toast inside browser would require triggerToast, we just call it on web page
                          }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black text-white uppercase tracking-wider transition-all"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Backup codes */}
            <div className="space-y-4">
              <h5 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-gold/10 text-gold text-xs font-black flex items-center justify-center shrink-0">2</span>
                Lưu trữ mã dự phòng (Backup Codes)
              </h5>
              
              <div className="bg-zinc-950/40 p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                  {twoFABackupCodes.map((code, idx) => (
                    <div key={idx} className="bg-black/60 border border-white/5 rounded-lg py-1 px-3 text-center text-xs font-mono text-white font-bold select-all tracking-widest">
                      {code}
                    </div>
                  ))}
                </div>
                
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2 text-[10px] text-red-400 font-bold leading-normal">
                  <AlertCircle size={14} className="shrink-0 text-red-400 mt-0.5" />
                  <p>
                    LƯU Ý: Hãy sao chép 10 mã dự phòng trên và lưu vào nơi an toàn. Mỗi mã chỉ dùng để đăng nhập 1 lần trong trường hợp bạn mất điện thoại.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(twoFABackupCodes.join("\n"));
                  }}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black text-white uppercase tracking-wider transition-all"
                >
                  Sao chép toàn bộ mã
                </button>
              </div>
            </div>
          </div>

          {/* Step 3: Verify OTP */}
          <div className="pt-6 border-t border-white/5 max-w-md mx-auto space-y-4">
            <h5 className="text-sm font-black text-white uppercase tracking-tight text-center flex items-center justify-center gap-2">
              <span className="h-6 w-6 rounded-full bg-gold/10 text-gold text-xs font-black flex items-center justify-center shrink-0">3</span>
              Xác thực mã để kích hoạt
            </h5>

            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block text-center">Mã OTP 6 chữ số từ app Authenticator</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={twoFAInputCode}
                  onChange={(e) => setTwoFAInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="bg-black border-2 border-white/10 rounded-2xl h-14 text-2xl text-white outline-none focus:border-amber-500/50 focus:bg-[#161616] transition-all w-full text-center font-mono tracking-[0.3em] font-black placeholder:text-zinc-700"
                />
              </div>

              {totpError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-wider rounded-xl p-3 text-center flex items-center justify-center gap-2 leading-relaxed">
                  <AlertCircle size={14} className="shrink-0" />
                  {totpError}
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTwoFAStep("IDLE");
                    setTotpError("");
                    setTwoFAInputCode("");
                  }}
                  className="flex-1 h-12 rounded-xl border border-white/0 hover:bg-zinc-800 text-white font-bold uppercase text-xs tracking-wider transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isActivating2FA || twoFAInputCode.length !== 6}
                  className="flex-1 h-12 rounded-xl bg-gold text-[#0a0a0a] font-black uppercase text-xs tracking-wider hover:bg-amber-700 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isActivating2FA ? (
                    <RefreshCw className="animate-spin text-[#0a0a0a]" size={14} />
                  ) : null}
                  Xác nhận & Kích hoạt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  </CollapsibleSection>

  {/* Admin Only Sections */}
  {(user?.role === "01" || user?.role === "02") && (
    <>
 {/* Section: Work Schedule & Fine Config */}
 <CollapsibleSection id="WORK_CONFIG" icon={Clock} title="Cấu Hình Giờ Giấc & Phạt" openSections={openSections} toggleSection={toggleSection}>
 <div className="pt-5 space-y-6">
 <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
 <p className="text-base text-amber-400 font-medium leading-relaxed">
 ⏰ Thiết lập giờ làm việc và mức phạt đi muộn cho nhân viên. Giờ kết thúc làm việc sẽ tự động tính toán (8 tiếng + Thời gian nghỉ trưa).
 </p>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="space-y-2">
 <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Giờ bắt đầu làm việc</label>
 <div className="relative">
 <input 
 type="time" 
 value={workStartTime}
 onChange={(e) => setWorkStartTime(e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 className="bg-zinc-900 border border-white/0 text-zinc-100 rounded-2xl px-5 h-14 text-lg outline-none focus:border-white/5 focus:bg-[#161616] transition-all w-full font-bold [color-scheme:dark]"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Bắt đầu nghỉ trưa</label>
 <div className="relative">
 <input 
 type="time" 
 value={breakStartTime}
 onChange={(e) => setBreakStartTime(e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 className="bg-zinc-900 border border-white/0 text-zinc-100 rounded-2xl px-5 h-14 text-lg outline-none focus:border-white/5 focus:bg-[#161616] transition-all w-full font-bold [color-scheme:dark]"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Kết thúc nghỉ trưa</label>
 <div className="relative">
 <input 
 type="time" 
 value={breakEndTime}
 onChange={(e) => setBreakEndTime(e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 className="bg-zinc-900 border border-white/0 text-zinc-100 rounded-2xl px-5 h-14 text-lg outline-none focus:border-white/5 focus:bg-[#161616] transition-all w-full font-bold [color-scheme:dark]"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Giờ kết thúc làm việc</label>
 <div className="relative">
 <input 
 type="time" 
 value={workEndTime}
 disabled
 className="bg-zinc-900/50 border border-white/0 text-zinc-500 rounded-2xl px-5 h-14 text-lg outline-none w-full font-bold [color-scheme:dark] cursor-not-allowed"
 />
 </div>
 </div>
 <div className="space-y-2 md:col-span-4">
 <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Hệ thống sẽ đóng vào lúc</label>
 <div className="relative">
 <input 
 type="time" 
 value={systemCloseTime}
 onChange={(e) => setSystemCloseTime(e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 className="bg-zinc-900 border border-white/0 text-zinc-100 rounded-2xl px-5 h-14 text-lg text-amber-500 outline-none focus:border-white/5 focus:bg-[#161616] transition-all w-full font-bold [color-scheme:dark]"
 />
 </div>
 </div>
 </div>
 <div className="space-y-3 pt-4 border-t border-white/0">
 <label className="text-[12px] text-zinc-400 font-bold uppercase tracking-widest mb-4 block">Mức phạt đi muộn (VNĐ)</label>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="space-y-2">
 <p className="text-base text-amber-400 font-black">Muộn 1-5 phút</p>
 <div className="relative">
 <input 
 type="text" 
 value={Number(fineTier1).toLocaleString("vi-VN")}
 onChange={(e) => setFineTier1(Math.max(0, Number(e.target.value.replace(/\D/g,""))))}
 onMouseDown={(e) => e.stopPropagation()}
 className="bg-zinc-900 border border-white/0 text-zinc-100 rounded-2xl pl-5 pr-12 h-14 text-lg text-gold outline-none focus:border-white/5 focus:bg-[#161616] transition-all w-full font-black tracking-wider"
 />
 <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-base">VND</span>
 </div>
 </div>
 <div className="space-y-2">
 <p className="text-base text-orange-400 font-black">Muộn 6-19 phút</p>
 <div className="relative">
 <input 
 type="text" 
 value={Number(fineTier2).toLocaleString("vi-VN")}
 onChange={(e) => setFineTier2(Math.max(0, Number(e.target.value.replace(/\D/g,""))))}
 onMouseDown={(e) => e.stopPropagation()}
 className="bg-zinc-900 border border-white/0 text-zinc-100 rounded-2xl pl-5 pr-12 h-14 text-lg text-gold outline-none focus:border-white/5 focus:bg-[#161616] transition-all w-full font-black tracking-wider"
 />
 <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-base">VND</span>
 </div>
 </div>
 <div className="space-y-2">
 <p className="text-base text-red-400 font-black">Muộn 20+ phút</p>
 <div className="relative">
 <input 
 type="text" 
 value={Number(fineTier3).toLocaleString("vi-VN")}
 onChange={(e) => setFineTier3(Math.max(0, Number(e.target.value.replace(/\D/g,""))))}
 onMouseDown={(e) => e.stopPropagation()}
 className="bg-zinc-900 border border-white/0 text-zinc-100 rounded-2xl pl-5 pr-12 h-14 text-lg text-gold outline-none focus:border-white/5 focus:bg-[#161616] transition-all w-full font-black tracking-wider"
 />
 <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-base">VND</span>
 </div>
 </div>
 </div>
 </div>
 <button 
 onClick={handleSaveWorkConfig}
 className="h-14 mt-4 px-8 rounded-2xl bg-gold text-[#0a0a0a] font-black uppercase text-base tracking-widest hover:bg-amber-700 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] w-full md:w-auto"
 >
 <Save size={18} /> Lưu Cấu Hình Giờ Giấc
 </button>
 </div>
 </CollapsibleSection>

 {/* Section: Agency Config */}
 <CollapsibleSection id="AGENCY_CONFIG" icon={Building2} title="Thương hiệu & Nội quy công ty" openSections={openSections} toggleSection={toggleSection}>
 <div className="pt-5 space-y-6">
 <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5">
 <p className="text-base text-blue-400 font-medium leading-relaxed">
 🌟 Thiết lập tên thương hiệu hiển thị trên toàn hệ thống và đường dẫn tải nội quy công ty.
 </p>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Tên Thương Hiệu</label>
 <input 
 type="text" 
 value={agencyConfigName}
 onChange={(e) => setAgencyConfigName(e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 placeholder="VD: AQ MEDIA"
 className="bg-zinc-900 text-zinc-100 border border-white/0 rounded-2xl px-5 h-14 text-lg outline-none focus:border-amber-500/50 transition-all w-full font-bold"
 />
 </div>
 <div className="space-y-2">
 <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Đường dẫn Nội quy công ty (URL)</label>
 <input 
 type="url" 
 value={rulesUrl}
 onChange={(e) => setRulesUrl(e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 placeholder="VD: https://docs.google.com/document/d/... (hoặc link PDF)"
 className="bg-zinc-900 text-zinc-100 border border-white/0 rounded-2xl px-5 h-14 text-lg outline-none focus:border-amber-500/50 transition-all w-full font-bold"
 />
 </div>
 </div>
 <button 
 onClick={handleSaveAgencyConfig}
 className="h-14 mt-4 px-8 rounded-2xl bg-gold text-[#0a0a0a] font-black uppercase text-base tracking-widest hover:bg-amber-700 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)] w-full md:w-auto"
 >
 <Save size={18} /> Lưu Cấu Hình
 </button>
 </div>
 </CollapsibleSection>

 {/* Section: API & System Config */}
 <CollapsibleSection id="API" icon={Database} title="API & Cấu Hình Hệ Thống" openSections={openSections} toggleSection={toggleSection}>
 <div className="pt-5">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
 {/* Left Side: General System Settings */}
 <div className="lg:col-span-2 space-y-6">
 <form onSubmit={handleSaveSettings} className="space-y-5">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Số lượng gán Mail mỗi đợt</label>
 <input 
 type="number" 
 value={chunkSize}
 onChange={(e) => setChunkSize(Math.max(1, Number(e.target.value)))}
 onMouseDown={(e) => e.stopPropagation()}
 className="bg-zinc-900 border border-white/0 text-zinc-100 rounded-2xl px-5 h-14 text-base text-gold outline-none focus:border-white/5 focus:bg-[#161616] transition-all w-full font-black tracking-wider"
 required
 />
 </div>
 <div className="space-y-2">
 <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">KPI Target (Mail Hàng tháng)</label>
 <input 
 type="number" 
 value={kpiTargetMails}
 onChange={(e) => setKpiTargetMails(Math.max(1, Number(e.target.value)))}
 onMouseDown={(e) => e.stopPropagation()}
 className="bg-zinc-900 border border-white/0 text-zinc-100 rounded-2xl px-5 h-14 text-base text-white outline-none focus:border-white/5 focus:bg-[#161616] transition-all w-full font-bold"
 required
 />
 </div>
 <div className="space-y-2 md:col-span-2">
 <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">KPI Target (Watch Hours tích lũy)</label>
 <input 
 type="number" 
 value={kpiTargetWatchHours}
 onChange={(e) => setKpiTargetWatchHours(Math.max(1, Number(e.target.value)))}
 onMouseDown={(e) => e.stopPropagation()}
 className="bg-zinc-900 border border-white/0 text-zinc-100 rounded-2xl px-5 h-14 text-base text-white outline-none focus:border-white/5 focus:bg-[#161616] transition-all w-full font-bold"
 required
 />
 </div>
 </div>
 <div className="space-y-2 pt-2">
 <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">API Server Sync Endpoint</label>
 <input 
 type="text" 
 value={apiSyncEndpoint}
 onChange={(e) => setApiSyncEndpoint(e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 className="bg-zinc-900 border border-white/0 text-zinc-100 rounded-2xl px-5 h-14 text-base text-gray-300 font-mono outline-none focus:border-white/5 focus:bg-[#161616] transition-all w-full"
 required
 />
 </div>
 <div className="pt-2">
 <button 
 type="submit"
 className="h-11 px-6 rounded-xl bg-amber-600 text-white font-black uppercase text-sm tracking-widest hover:bg-amber-700 transition-all flex items-center gap-2 shadow-lg shadow-amber-600/20"
 >
 <Save size={14} /> Lưu Cấu Hình
 </button>
 </div>
 </form>
 </div>

 {/* Right Side: Storage Stats & Danger Hard Reset */}
 <div className="space-y-6">
 {/* Database Space Allocation Stats Widget */}
 <div className="bg-white/0 border border-white/0 rounded-2xl p-5">
 <div className="flex items-center gap-2 border-b border-white/0 pb-3 mb-4">
 <HardDrive className="text-gold" size={16} />
 <h4 className="text-sm font-black text-white uppercase tracking-tight">Dung lượng DB Local</h4>
 </div>
 <div className="space-y-3">
 <div className="flex justify-between text-sm font-bold text-zinc-400">
 <span>Đã sử dụng:</span>
 <span className="text-white font-mono">{storageUsage.text}</span>
 </div>
 <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
 <div 
 className={`h-full rounded-full ${
 storageUsage.percentage > 80 ?"bg-red-500" :
 storageUsage.percentage > 50 ?"bg-gold" :"bg-indigo-500"
 }`}
 style={{ width: `${storageUsage.percentage}%` }}
 />
 </div>
 </div>
 </div>

 </div>
 </div>
 </div>
 </CollapsibleSection>

 {/* Section: Bank & QR Config */}
 <CollapsibleSection id="BANK" icon={DollarSign} title="Ngân Hàng & QR Code" openSections={openSections} toggleSection={toggleSection}>
 <div className="pt-5">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Bank Configuration Form */}
 <div className="lg:col-span-2 space-y-6">
 <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 mb-2">
 <p className="text-sm text-indigo-300 font-bold leading-relaxed">
 ℹ️ Nhập thông tin tài khoản ngân hàng thụ hưởng để hệ thống tự động cập nhật mã QR Code thanh toán phạt đi muộn cho nhân viên. Dữ liệu được đồng bộ an toàn.
 </p>
 </div>

 <form onSubmit={generateQRCode} className="space-y-5">
 {/* Custom search-select dropdown for banks */}
 <div className="space-y-2 relative">
 <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Ngân Hàng Thụ Hưởng</label>
 <div 
 onClick={() => setIsDropdownOpen(!isDropdownOpen)}
 className="bg-zinc-900 text-zinc-100 border border-white/0 rounded-2xl px-5 h-14 text-base outline-none focus:border-amber-500/50 transition-all w-full font-bold flex items-center justify-between cursor-pointer hover:bg-zinc-800/30"
 >
 <div className="flex items-center gap-2 overflow-hidden">
 {activeBank.logo ? (
 <img src={activeBank.logo} alt={activeBank.shortName} className="h-5 w-auto object-contain rounded bg-zinc-950 px-1 py-0.5" />
 ) : (
 <div className="w-5 h-5 bg-gold/10 text-gold flex items-center justify-center rounded text-[10px]">{activeBank.shortName?.slice(0, 2)}</div>
 )}
 <span className="truncate">{activeBank.shortName} - {activeBank.name}</span>
 </div>
 <span className="text-zinc-400 text-[10px]">{isDropdownOpen ?"▲" :"▼"}</span>
 </div>

 {isDropdownOpen && (
 <div className="absolute left-0 right-0 mt-2 bg-zinc-950/95 backdrop-blur-md border border-white/0 rounded-2xl shadow-2xl z-[100] max-h-64 flex flex-col overflow-hidden animate-fade-in">
 <div className="p-2 border-b border-white/0 flex-shrink-0">
 <input 
 type="text" 
 placeholder="Tìm tên hoặc mã ngân hàng..."
 value={bankSearchTerm}
 onChange={(e) => setBankSearchTerm(e.target.value)}
 onClick={(e) => e.stopPropagation()}
 className="bg-zinc-900 border border-white/0 rounded-xl px-3 h-9 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500/30 w-full"
 />
 </div>
 <div className="overflow-y-auto custom-scrollbar flex-1">
 {(banksList || []).filter((b: any) => 
 b.shortName?.toLowerCase().includes(bankSearchTerm.toLowerCase()) ||
 b.name?.toLowerCase().includes(bankSearchTerm.toLowerCase()) ||
 b.code?.toLowerCase().includes(bankSearchTerm.toLowerCase())
 ).length === 0 ? (
 <div className="p-4 text-center text-sm text-gray-500 font-bold">Không tìm thấy ngân hàng</div>
 ) : (
 (banksList || []).filter((b: any) => 
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
 className={`flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800 bg-zinc-900/[0.10] transition-colors cursor-pointer border-b border-white/0 last:border-0 ${activeBank.bin === b.bin ? 'bg-amber-500/10' : ''}`}
 >
 {b.logo ? (
 <img src={b.logo} alt={b.shortName} className="h-6 w-10 object-contain rounded bg-zinc-950 px-1 py-0.5 shrink-0" />
 ) : (
 <div className="w-10 h-6 bg-gold/10 text-gold flex items-center justify-center rounded text-[10px] shrink-0 font-bold">{b.shortName?.slice(0, 3)}</div>
 )}
 <div className="text-left">
 <div className="text-sm font-black text-white">{b.shortName}</div>
 <div className="text-[10px] text-gray-500 font-medium truncate max-w-[280px]">{b.name}</div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 )}
 </div>

 <div className="space-y-2 relative pt-2">
 <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Số Tài Khoản (STK)</label>
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
 onMouseDown={(e) => e.stopPropagation()}
 placeholder="Ví dụ: 0123456789"
 className="bg-zinc-900 text-zinc-100 border border-white/0 rounded-2xl pl-5 pr-12 h-14 text-base outline-none focus:border-amber-500/50 transition-all w-full font-bold"
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
 className="h-14 px-6 bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 rounded-2xl text-base font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center shrink-0 disabled:opacity-40 cursor-pointer shadow-lg shadow-gold/5"
 >
 {isLookingUp ?"Đang tìm..." :"Tra cứu"}
 </button>
 </div>
 {lookupSuccess && (
 <p className="text-[9px] text-green-400 font-black flex items-center gap-1 animate-pulse">
 <CheckCircle2 size={12} className="text-green-400" /> Tên tài khoản đã được xác thực thành công
 </p>
 )}
 </div>

 <div className="space-y-2 pt-2">
 <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Tên Chủ Tài Khoản</label>
 <input 
 type="text" 
 value={bankAccountHolder}
 onChange={(e) => setBankAccountHolder(e.target.value.toUpperCase())}
 onMouseDown={(e) => e.stopPropagation()}
 placeholder="Ví dụ: NGUYEN VAN A"
 className="bg-zinc-900 text-zinc-100 border border-white/0 rounded-2xl px-5 h-14 text-base outline-none focus:border-amber-500/50 transition-all w-full font-bold"
 required
 />
 <p className="text-[9px] text-gray-500">Tên viết in hoa không dấu - Hệ thống tự động tra cứu khi nhập đủ STK</p>
 </div>

 <div className="pt-4 space-y-3">
 <button 
 type="submit"
 className="h-11 w-full px-6 rounded-xl bg-amber-600 text-white font-black uppercase text-sm tracking-widest hover:bg-amber-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
 >
 <Save size={16} /> Xác Nhận & Lưu Ngân Hàng
 </button>
 </div>
 </form>
 </div>

 {/* QR Code Display */}
 <div className="space-y-6">
 <div className="bg-white/0 border border-white/0 rounded-2xl p-5">
 <div className="flex items-center gap-2 border-b border-white/0 pb-3 mb-4">
 <Zap className="text-gold" size={16} />
 <h4 className="text-sm font-black text-white uppercase tracking-tight">QR Code Thanh Toán</h4>
 </div>

 {bankAccountNumber ? (
 <div className="flex flex-col items-center gap-4">
 <div className="bg-zinc-900 p-6 rounded-2xl shadow-xl border border-white/0 relative">
 <img 
 src={`https://img.vietqr.io/image/${activeBank.code || bankName ||"MB"}-${bankAccountNumber}-compact2.png?accountName=${encodeURIComponent(bankAccountHolder ||"")}`}
 alt="VietQR Dynamic Fine Code"
 className="h-[180px] w-[180px] object-contain rounded-xl"
 />
 </div>
 <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black text-center mt-2">Mã QR Code Thụ Hưởng Bản Gốc</p>
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-12">
 <Zap size={40} className="opacity-30 mb-3" />
 <p className="text-gray-500 font-bold text-base text-center">Cấu hình STK để tạo QR Code</p>
 <p className="font-medium text-[10px] text-center mt-2">Nhập thông tin tài khoản ở bên trái</p>
 </div>
 )}
 </div>

 {/* Bank Info Display */}
 <div className="bg-white/0 border border-gold/20 rounded-2xl p-5">
 <div className="flex items-center gap-2 border-b border-gold/10 pb-3 mb-4">
 <CheckCircle2 className="text-gold" size={16} />
 <h4 className="text-sm font-black text-white uppercase tracking-tight">Thông Tin Đã Lưu</h4>
 </div>
 
 {bankAccountNumber ? (
 <div className="space-y-3">
 <div className="flex justify-between text-sm">
 <span className="text-gray-500 font-bold">Ngân Hàng:</span>
 <span className="text-white font-black">{activeBank.shortName || bankName}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-gray-500 font-bold">STK:</span>
 <span className="text-amber-500 font-black">{bankAccountNumber}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-gray-500 font-bold">Chủ TK:</span>
 <span className="text-white font-black">{bankAccountHolder}</span>
 </div>
 <div className="pt-2 border-t border-white/0">
 <p className="text-[9px] text-green-400 font-black">✓ Đã được cấu hình & đồng bộ thành công</p>
 </div>
 </div>
 ) : (
 <p className="text-gray-500 text-sm text-center py-4 font-medium">Chưa có dữ liệu</p>
 )}
 </div>
 </div>
 </div>
 </div>
 </CollapsibleSection>

 {/* Danger Zone */}
 <div className="mt-12 bg-red-500/5 border border-red-500/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
 <AlertTriangle size={48} className="text-red-500 mb-4 animate-pulse" />
 <h3 className="text-xl font-black text-red-500 uppercase tracking-widest mb-2">Vùng Nguy Hiểm (Danger Zone)</h3>
 <p className="text-sm text-zinc-400 max-w-lg mb-6">
 Thao tác xóa toàn bộ dữ liệu (trừ Users). Không thể khôi phục sau khi thực hiện. Vui lòng cân nhắc kỹ trước khi sử dụng.
 </p>
 <button 
 onClick={() => setShowResetConfirm(true)}
 className="h-14 px-8 rounded-2xl bg-red-600 text-white font-black uppercase text-sm tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 flex items-center gap-2"
 >
 <AlertTriangle size={18} /> Reset Database Gốc
 </button>
 </div>
    </>
  )}
 </div>
 )}
 </div>
 </div>
 );
}
