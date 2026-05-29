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
 Building2,
 XCircle
} from"lucide-react";
import { motion, AnimatePresence } from"framer-motion";
import { useRouter } from"next/navigation";

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

 // Password states
 const [oldPassword, setOldPassword] = useState("");
 const [newPassword, setNewPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [passErrors, setPassErrors] = useState({ old:"", new:"", confirm:"" });

 // Bank Config States
 const [bankAccountNumber, setBankAccountNumber] = useState("");
 const [bankName, setBankName] = useState("MB");
 const [bankAccountHolder, setBankAccountHolder] = useState("");
 const [banksList, setBanksList] = useState<any[]>([]);
 const [selectedBank, setSelectedBank] = useState<any>(null);
 const [bankSearchTerm, setBankSearchTerm] = useState("");
 const [isDropdownOpen, setIsDropdownOpen] = useState(false);
 const [isLookingUp, setIsLookingUp] = useState(false);
 const [lookupSuccess, setLookupSuccess] = useState<boolean | null>(null);

 // Tabs
 const [activeTab, setActiveTab] = useState<"PROFILE" |"HE_THONG">("PROFILE");

 // Collapsible section states
 const [openSections, setOpenSections] = useState<Record<string, boolean>>({
   "2FA": true, "API": true, "BANK": true, "WORK_CONFIG": true, "AGENCY_CONFIG": true, "PASSWORD": true,
 });

 // DB Reset states
 const [showResetConfirm, setShowResetConfirm] = useState(false);
 const [safetyPhrase, setSafetyPhrase] = useState("");

 // Work schedule & fine config states
 const [workStartTime, setWorkStartTime] = useState("08:00");
 const [workEndTime, setWorkEndTime] = useState("18:00");
 const [systemCloseTime, setSystemCloseTime] = useState("17:30");
 const [fineTier1, setFineTier1] = useState(10000);
 const [fineTier2, setFineTier2] = useState(20000);
 const [fineTier3, setFineTier3] = useState(50000);

  // Agency name config state
  const [agencyConfigName, setAgencyConfigName] = useState("AQ MEDIA");

  // 2FA States
  const [twoFAEnabledState, setTwoFAEnabledState] = useState<boolean>(false);
  const [twoFAStep, setTwoFAStep] = useState<"IDLE" | "SETUP" | "VERIFYING">("IDLE");
  const [twoFAQrUrl, setTwoFAQrUrl] = useState("");
  const [twoFABackupCodes, setTwoFABackupCodes] = useState<string[]>([]);
  const [twoFAInputCode, setTwoFAInputCode] = useState("");
  const [isActivating2FA, setIsActivating2FA] = useState(false);
  const [totpError, setTotpError] = useState("");

  useEffect(() => {
    if (user) setTwoFAEnabledState(!!user.twoFAEnabled);
  }, [user]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeBank = useMemo(() => {
    if (selectedBank) return selectedBank;
    return banksList.find((b: any) => b.code === bankName || b.shortName === bankName) || {
      code:"MB", shortName:"MBBank", name:"Ngân hàng Quân đội", logo:"https://api.vietqr.io/img/MB.png"
    };
  }, [banksList, bankName, selectedBank]);

  const handleInitiate2FA = async () => {
    if (!user) return;
    setIsActivating2FA(true);
    try {
      const res = await fetch("/api/admin/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id || user._id || "" },
        body: JSON.stringify({ email: user.email || `${user.username}@aqmedia.vn`, userId: user.id || user._id || "" })
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFAQrUrl(data.qrDataUrl);
        setTwoFABackupCodes(data.backupCodes || []);
        setTwoFAStep("SETUP");
        triggerToast("Khởi tạo 2FA thành công!");
      }
    } catch (err) { console.error(err); }
    finally { setIsActivating2FA(false); }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !twoFAInputCode) return;
    setIsActivating2FA(true);
    try {
      const res = await fetch("/api/admin/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id || user._id || "" },
        body: JSON.stringify({ token: twoFAInputCode, userId: user.id || user._id || "" })
      });
      if (res.ok) {
        setTwoFAEnabledState(true);
        setTwoFAStep("IDLE");
        const updatedUser = { ...user, twoFAEnabled: true };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        triggerToast("Kích hoạt 2FA thành công!");
      } else { setTotpError("Mã không chính xác"); }
    } catch (err) { console.error(err); }
    finally { setIsActivating2FA(false); }
  };

  const handleDisable2FA = async () => {
    if (!confirm("Tắt 2FA?")) return;
    setIsActivating2FA(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id || user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twoFAEnabled: false })
      });
      if (res.ok) {
        setTwoFAEnabledState(false);
        const updatedUser = { ...user, twoFAEnabled: false };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        triggerToast("Đã tắt 2FA");
      }
    } catch (err) { console.error(err); }
    finally { setIsActivating2FA(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || confirmPassword !== newPassword) {
      triggerToast("Thông tin không hợp lệ");
      return;
    }
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      if (res.ok) {
        triggerToast("Đổi mật khẩu thành công!");
        setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      } else {
        const data = await res.json();
        triggerToast(data.error || "Thất bại");
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    else router.push("/login");

    fetch("/api/admin/settings").then(res => res.json()).then(data => {
      if (data.success && data.data) {
        setAgencyName(data.data.brandName || "AQ MEDIA");
        setAgencyConfigName(data.data.brandName || "AQ MEDIA");
        setWorkStartTime(data.data.openTime || "08:00");
        setWorkEndTime(data.data.closeTime || "18:00");
        setSystemCloseTime(data.data.checkInTime || "17:30");
      }
    }).catch(console.error);

    fetch("https://api.vietqr.io/v2/banks").then(res => res.json()).then(data => {
      if (data && data.code === "00") setBanksList(data.data);
    }).catch(console.error);
  }, []);

  const [storageUsage, setStorageUsage] = useState({ text:"0 MB / 512 MB", percentage: 0 });
  useEffect(() => {
    fetch("/api/admin/db-stats").then(res => res.json()).then(data => {
      if (data.success) {
        const sizeMB = (data.dataSize / (1024 * 1024)).toFixed(2);
        setStorageUsage({ text: `${sizeMB} MB / 512 MB`, percentage: Math.min(100, Math.round((Number(sizeMB) / 512) * 100)) });
      }
    }).catch(console.error);
  }, []);

  const handleSaveSettings = async () => {
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: agencyName, openTime: workStartTime, closeTime: workEndTime, checkInTime: systemCloseTime })
      });
      triggerToast("Đã lưu cài đặt!");
    } catch (err) { console.error(err); }
  };

  return (
    <div className="h-full flex flex-col space-y-6 pb-6 relative">
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity: 0, y: -20, x:"-50%" }} animate={{ opacity: 1, y: 30, x:"-50%" }} exit={{ opacity: 0, y: -20, x:"-50%" }} className="fixed top-0 left-1/2 z-[200] bg-gold px-6 py-3 rounded-full text-sidebar font-black text-base shadow-2xl flex items-center gap-2">
            <CheckCircle2 size={18} /> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResetConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#121212] border-2 border-red-500/50 rounded-[32px] p-8 w-full max-w-md shadow-2xl flex flex-col">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center text-red-500 animate-pulse"><AlertTriangle size={32} /></div>
                <h3 className="text-xl font-black text-red-500 uppercase">CẢNH BÁO NGUY HIỂM</h3>
              </div>
              <p className="text-red-400 font-bold mb-6">XÓA TOÀN BỘ dữ liệu hệ thống. Nhập "XACNHAN" để xác nhận:</p>
              <input type="text" value={safetyPhrase} onChange={(e) => setSafetyPhrase(e.target.value)} className="bg-black/40 border-2 border-red-500/30 rounded-xl px-4 h-14 text-white font-black text-center mb-6 outline-none" />
              <div className="flex gap-4">
                <button onClick={() => setShowResetConfirm(false)} className="flex-1 h-12 rounded-xl text-white font-bold uppercase text-sm hover:bg-white/5">Hủy</button>
                <button disabled={safetyPhrase !=="XACNHAN"} onClick={async () => {
                  const res = await fetch("/api/admin/reset-db", { method:"POST" });
                  if (res.ok) { triggerToast("Thành công!"); setTimeout(() => window.location.reload(), 1500); }
                }} className="flex-1 h-12 rounded-xl bg-red-600 text-white font-black uppercase text-sm disabled:opacity-30">Xác nhận</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/admin")} className="p-2 rounded-xl bg-sidebar text-zinc-400 hover:text-gold transition-all"><ArrowLeft size={20} /></button>
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3"><Settings className="text-gold" size={28} />Cài Đặt</h2>
          <p className="text-sm text-gray-500 font-medium uppercase tracking-widest mt-1">Quản lý hệ thống và tài khoản</p>
        </div>
      </div>

      {(user?.role === "01" || user?.role === "02") && (
        <div className="flex gap-4 mb-6 pb-4 border-b border-white/5">
          <button onClick={() => setActiveTab("PROFILE")} className={`h-10 px-6 rounded-xl text-sm font-black uppercase transition-all ${activeTab ==="PROFILE" ?"bg-gold text-sidebar" :" bg-white/5 text-gray-500"}`}>Cá nhân</button>
          <button onClick={() => setActiveTab("HE_THONG")} className={`h-10 px-6 rounded-xl text-sm font-black uppercase transition-all ${activeTab ==="HE_THONG" ?"bg-gold text-sidebar" :" bg-white/5 text-gray-500"}`}>Hệ thống</button>
        </div>
      )}

      <div className="animate-fade-in">
        {(user?.role === "01" || user?.role === "02") ? (
          <>
            {activeTab ==="PROFILE" && (
              <div className="bg-sidebar border border-white/5 rounded-[32px] p-8 shadow-2xl max-w-2xl space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4"><Info className="text-gold" size={24} /><h3 className="text-xl font-black text-white uppercase">Thông tin cá nhân</h3></div>
                <div className="grid gap-4">
                  <div className="flex justify-between p-4 bg-black/20 rounded-2xl"><span className="text-gray-500 font-bold uppercase text-xs">Họ tên</span><span className="font-black text-white">{user?.name}</span></div>
                  <div className="flex justify-between p-4 bg-black/20 rounded-2xl"><span className="text-gray-500 font-bold uppercase text-xs">Username</span><span className="font-black text-gold">@{user?.username}</span></div>
                </div>
              </div>
            )}

            {activeTab ==="HE_THONG" && (
              <div className="grid grid-cols-1 gap-6">
                <CollapsibleSection id="PASSWORD" icon={Lock} title="Đổi Mật Khẩu" openSections={openSections} toggleSection={toggleSection}>
                  <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Mật khẩu cũ" className="bg-black/40 border border-white/10 rounded-xl px-4 h-12 text-white outline-none" required />
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mật khẩu mới" className="bg-black/40 border border-white/10 rounded-xl px-4 h-12 text-white outline-none" required />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Xác nhận" className="bg-black/40 border border-white/10 rounded-xl px-4 h-12 text-white outline-none" required />
                    <div className="md:col-span-3"><button type="submit" className="h-12 px-8 bg-gold text-sidebar rounded-xl font-black uppercase text-xs">Cập nhật</button></div>
                  </form>
                </CollapsibleSection>

                <CollapsibleSection id="2FA" icon={ShieldCheck} title="Bảo Mật 2FA" openSections={openSections} toggleSection={toggleSection}>
                  <div className="pt-4">
                    {twoFAEnabledState ? (
                      <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6 flex justify-between items-center">
                        <div><h4 className="text-green-500 font-black uppercase">2FA Đang Bật</h4></div>
                        <button onClick={handleDisable2FA} className="h-10 px-4 bg-red-500/10 text-red-500 rounded-lg text-xs font-black">Tắt</button>
                      </div>
                    ) : twoFAStep === "IDLE" ? (
                      <button onClick={handleInitiate2FA} className="h-12 px-8 bg-gold text-sidebar rounded-xl font-black uppercase text-xs">Bật 2FA</button>
                    ) : (
                      <div className="flex flex-col items-center gap-6">
                        {twoFAQrUrl && <img src={twoFAQrUrl} alt="2FA" className="w-48 h-48 bg-white p-4 rounded-2xl" />}
                        <form onSubmit={handleVerify2FA} className="flex gap-4">
                          <input type="text" maxLength={6} value={twoFAInputCode} onChange={(e) => setTwoFAInputCode(e.target.value)} className="w-32 h-12 bg-black/40 border border-white/10 rounded-xl text-center text-xl text-white" />
                          <button type="submit" className="h-12 px-6 bg-gold text-sidebar rounded-xl font-black uppercase text-xs">Xác nhận</button>
                        </form>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection id="WORK_CONFIG" icon={Clock} title="Giờ Làm Việc & Phạt" openSections={openSections} toggleSection={toggleSection}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    <input type="time" value={workStartTime} onChange={(e) => setWorkStartTime(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 h-12 text-white" />
                    <input type="time" value={workEndTime} onChange={(e) => setWorkEndTime(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 h-12 text-white" />
                    <input type="time" value={systemCloseTime} onChange={(e) => setSystemCloseTime(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 h-12 text-white" />
                    <div className="md:col-span-3"><button onClick={handleSaveSettings} className="h-12 px-8 bg-gold text-sidebar rounded-xl font-black uppercase text-xs">Lưu</button></div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection id="AGENCY_CONFIG" icon={Building2} title="Tên Thương Hiệu" openSections={openSections} toggleSection={toggleSection}>
                  <div className="flex gap-4 pt-4">
                    <input type="text" value={agencyConfigName} onChange={(e) => setAgencyConfigName(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 h-12 text-white" />
                    <button onClick={handleSaveSettings} className="h-12 px-8 bg-gold text-sidebar rounded-xl font-black uppercase text-xs">Lưu</button>
                  </div>
                </CollapsibleSection>

                <div className="mt-12 bg-red-500/5 border border-red-500/20 rounded-[32px] p-8 flex flex-col items-center">
                  <AlertTriangle size={48} className="text-red-500 mb-4" />
                  <h3 className="text-xl font-black text-red-500 uppercase">Vùng Nguy Hiểm</h3>
                  <button onClick={() => setShowResetConfirm(true)} className="mt-4 h-12 px-8 bg-red-600 text-white rounded-xl font-black uppercase text-xs">Reset Toàn Bộ Dữ Liệu</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-white/5 pb-6 mb-6"><Lock className="text-gold" size={24} /><h3 className="text-xl font-black text-white uppercase">Đổi Mật Khẩu</h3></div>
              <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Mật khẩu cũ" className="bg-black/40 border border-white/10 rounded-xl px-4 h-14 text-white outline-none" required />
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mật khẩu mới" className="bg-black/40 border border-white/10 rounded-xl px-4 h-14 text-white outline-none" required />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Xác nhận" className="bg-black/40 border border-white/10 rounded-xl px-4 h-14 text-white outline-none" required />
                <div className="md:col-span-3"><button type="submit" className="h-14 px-8 bg-gold text-sidebar rounded-2xl font-black uppercase text-sm">Cập nhật mật khẩu</button></div>
              </form>
            </div>
            <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-white/5 pb-6 mb-6"><ShieldCheck className="text-gold" size={24} /><h3 className="text-xl font-black text-white uppercase">Bảo Mật 2FA</h3></div>
              {twoFAEnabledState ? (
                <div className="bg-green-500/5 border border-green-500/20 rounded-3xl p-8 flex justify-between items-center">
                  <div><h4 className="text-lg font-black text-green-500 uppercase">2FA ĐANG HOẠT ĐỘNG</h4><p className="text-sm text-gray-400 font-medium">Tài khoản được bảo vệ tối đa.</p></div>
                  <button onClick={handleDisable2FA} className="h-12 px-6 bg-red-500/10 text-red-500 rounded-xl font-black uppercase text-xs">Tắt 2FA</button>
                </div>
              ) : (
                <button onClick={handleInitiate2FA} className="h-14 px-8 bg-gold text-sidebar rounded-2xl font-black uppercase text-sm">Kích hoạt bảo mật 2FA</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
