"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from"react";
import {
 Phone,
 Upload,
 Users,
 Search,
 CheckCircle2,
 ArrowLeft,
 Layers,
 TrendingUp,
 AlertTriangle,
 RefreshCw,
 ChevronRight,
 Warehouse,
 UserCheck,
 FileText,
 Trash2,
 Zap,
 X,
 Calendar,
 User as UserIcon,
 Download,
 Loader2
} from"lucide-react";
import { motion, AnimatePresence } from"framer-motion";
import { useRouter } from"next/navigation";
import type { PhoneItem, PhoneStatus, StaffData } from"@/types/admin";
import { useSWR } from "@/lib/useSWR";
import { LoadingOverlay } from "@/components/ui/Loading";
import { Badge } from "@/components/ui/Badge";
import { ImportHistoryModal, type ImportHistoryItem } from "@/components/admin/modals/ImportHistoryModal";

// ─── Helpers ────────────────────────────────────────────────
async function fetchPhonesFromAPI(): Promise<PhoneItem[]> {
 try {
 const res = await fetch("/api/admin/phones");
 if (res.ok) {
 const data = await res.json();
 return (data.data || []).map((p: any) => ({
 ...p,
 id: p._id?.toString() || p.id,
 importBatch: p.batch || p.importBatch ||"",
 }));
 }
 } catch (err) {
 console.error("Error loading phones from API:", err);
 }
 return [];
}

async function updatePhonesAPI(ids: string[], update: Record<string, any>) {
 try {
 await fetch("/api/admin/phones", {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ ids, update }),
 });
 } catch (err) {
 console.error("Phone update error:", err);
 }
}

// ─── Status Badge ───────────────────────────────────────────
function StatusBadge({ status }: { status: PhoneStatus }) {
 const cls =
 status === "XM lần 1"
 ?"bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
 : status === "XM lần 2"
 ?"bg-green-500/10 text-green-500 border-green-500/20"
 : status === "Lỗi"
 ?"bg-red-500/10 text-red-500 border-red-500/20"
 :"bg-gray-500/10 text-gray-400 border-white/0";
 return (
 <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase border ${cls}`}>
 {status}
 </span>
 );
}

// ─── Constants ──────────────────────────────────────────────
const STANDARD_QUOTA = 25;

// ─── Main Component ─────────────────────────────────────────
export default function PhoneBatchesPage() {
 const router = useRouter();
 const fileInputRef = useRef<HTMLInputElement>(null);

 // ─── Auth State ───
 const [user, setUser] = useState<StaffData | null>(null);
 useEffect(() => {
  const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
  if (!raw) { router.push("/login"); return; }
  const parsed = JSON.parse(raw) as StaffData;
  const role = String(parsed.role || "").toUpperCase();
  if (!["01", "02", "ADMIN", "QUẢN LÝ CÔNG VIỆC", "QL CÔNG VIỆC"].includes(role)) {
    router.push("/admin");
    return;
  }
  setUser(parsed);
 }, [router]);

 // ─── Data Fetching ───
 const fetchPhones = useCallback(async () => {
    return await fetchPhonesFromAPI();
 }, []);

 const reloadPhones = useCallback(async () => {
    mutatePhones();
 }, []);

 const fetchEmployees = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) throw new Error("Failed to fetch employees");
    const data = await res.json();
    const all = data.users || data || [];
    return (all || []).filter((u: any) =>
      u.role === "03" || u.role === "04" || u.role === "05"
    ).map((u: any) => ({ ...u, id: u.id || u._id?.toString() }));
 }, []);

 const { data: rawPhones, mutate: mutatePhones, isValidating: isPhonesLoading } = useSWR('phones-all', fetchPhones, { refreshInterval: 30000 });
 const { data: rawEmployees, mutate: mutateEmployees, isValidating: isEmployeesLoading } = useSWR('employees-staff', fetchEmployees, { refreshInterval: 60000 });

 const phones = rawPhones || [];
 const employees = rawEmployees || [];

 const isLoading = (!rawPhones && isPhonesLoading) || (!rawEmployees && isEmployeesLoading);

 const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
 useEffect(() => {
   const loadHistory = () => {
     const saved = localStorage.getItem("global_import_history");
     setImportHistory(saved ? JSON.parse(saved) : []);
   };
   loadHistory();
   window.addEventListener("storage", loadHistory);
   return () => window.removeEventListener("storage", loadHistory);
 }, []);

 // ─── UI State ───
 const [toastMsg, setToastMsg] = useState("");
 const [activeTab, setActiveTab] = useState<"warehouse" | "batches" | "staff">("warehouse");
 const [selectedEmpUsername, setSelectedEmpUsername] = useState<string | null>(null);
 const [searchTerm, setSearchTerm] = useState("");
 const [staffSearch, setStaffSearch] = useState("");
 const [showHistoryModal, setShowHistoryModal] = useState(false);
 const [expandedBatches, setExpandedBatches] = useState<string[]>([]);
 const [batchToDelete, setBatchToDelete] = useState<string | null>(null);

 const triggerToast = (msg: string) => {
   setToastMsg(msg);
   setTimeout(() => setToastMsg(""), 4000);
 };

 const pushLog = useCallback((action: string, type: "SUCCESS" | "WARNING" = "SUCCESS") => {
  if (!user) return;
  fetch("/api/admin/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: user.id || user.name || "Admin",
      role: user.role || "ADMIN",
      action,
      type,
      timestamp: new Date().toLocaleString("vi-VN"),
    }),
  }).catch(console.error);
 }, [user]);
 const [batchName, setBatchName] = useState("");
 const [historyRowToDelete, setHistoryRowToDelete] = useState<string | null>(null);
 const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);

 const globalStats = useMemo(() => {
 const total = (phones || []).length;
 const unassigned = (phones || []).filter((p) => !p.assigneeId).length;
 const assigned = total - unassigned;
 const xm1 = (phones || []).filter((p) => p.status ==="XM lần 1").length;
 const xm2 = (phones || []).filter((p) => p.status ==="XM lần 2").length;
 const err = (phones || []).filter((p) => p.status ==="Lỗi").length;
 return { total, unassigned, assigned, xm1, xm2, err };
 }, [phones]);

 // ─── Warehouse (unassigned) ───────────────────────────────
 const warehousePhones = useMemo(() => {
 return (phones || []).filter((p) => !p.assigneeId);
 }, [phones]);

 const filteredWarehouse = useMemo(() => {
 if (!searchTerm) return warehousePhones;
 const q = searchTerm.toLowerCase();
 return (warehousePhones || []).filter((p) => 
 p.number.toLowerCase().includes(q) || 
 (p.importBatch && p.importBatch.toLowerCase().includes(q)) ||
 (p.otpLink && p.otpLink.toLowerCase().includes(q))
 );
 }, [warehousePhones, searchTerm]);

 // ─── Batches ───────────────────────────────
 const groupedWarehouse = useMemo(() => {
 const groups: Record<string, PhoneItem[]> = {};
 warehousePhones.forEach(p => {
 const b = p.importBatch ||"Chưa phÃ¢n lô";
 if (!groups[b]) groups[b] = [];
 groups[b].push(p);
 });
 return groups;
 }, [warehousePhones]);

 const handleDeleteBatch = (batch: string) => {
 setBatchToDelete(batch);
 };

 const executeDeleteBatch = async () => {
 if (!batchToDelete) return;
 try {
 const res = await fetch(`/api/admin/phones?batch=${encodeURIComponent(batchToDelete)}&username=${encodeURIComponent(user?.username ||"Admin")}`, {
 method:"DELETE"
 });
 const data = await res.json();
 if (res.ok) {
 triggerToast(`Đã xóa ${data.deletedCount} SÄT khá»i lô"${batchToDelete}"!`);
 mutatePhones();
 } else {
 triggerToast(`Lỗi: ${data.error}`);
 }
 } catch (err) {
 console.error(err);
 triggerToast("Lỗi khi xóa lô SÄT");
 } finally {
 setBatchToDelete(null);
 }
 };

 const executeDeleteHistoryRow = async () => {
 if (!historyRowToDelete) return;
 const updated = (importHistory || []).filter((item) => item.id !== historyRowToDelete);
 setImportHistory(updated);
 localStorage.setItem("global_import_history", JSON.stringify(updated));
 window.dispatchEvent(new Event("storage"));

 try {
 await fetch("/api/sync", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ global_import_history: JSON.stringify(updated) })
 });
 } catch (err) {
 console.error(err);
 } finally {
 setHistoryRowToDelete(null);
 }
 };

 const handleExportExcel = (batch: string, p: PhoneItem[]) => {
 let csv ="STT,Số Điện Thoại,Link OTP,Trạng Thái\\n";
 p.forEach((item, i) => {
 csv += `${i+1},${item.number},${item.otpLink},${item.status}\\n`;
 });
 const blob = new Blob(["\\ufeff" + csv], { type:"text/csv;charset=utf-8;" });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.href = url;
 link.download = `Lô_${batch}.csv`;
 link.click();
 };

 // ─── IMPORT .TXT ──────────────────────────────────────────
 const handleImportTxt = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 if (!file.name.endsWith(".txt")) {
 triggerToast("Chỉ chấp nhận file .txt!");
 return;
 }
 const reader = new FileReader();
 reader.onload = async (ev) => {
 const text = ev.target?.result as string;
 if (!text || !text.trim()) {
 triggerToast("File trống, không có dữ liệu!");
 return;
 }

 const lines = text.split(/\\r?\\n/).filter((l) => l.trim() !=="");
 const newItems: any[] = [];

 for (const line of lines) {
 const parts = line.split("|");
 const phoneNumber = (parts[0] ||"").trim();
 const otpLink = (parts[1] ||"").trim();
 if (!phoneNumber) continue;

 newItems.push({ number: phoneNumber, otpLink });
 }

 if (newItems.length === 0) {
 triggerToast("Không tìm được SĐT hợp lệ nào trong file!");
 return;
 }

 const importBatchName = batchName.trim() || `Lô_${new Date().toISOString().replace(/[:.]/g,"-")}`;
 
 try {
 const res = await fetch("/api/admin/phones", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ batch: importBatchName, phones: newItems, username: user?.username ||"Admin" })
 });
 const data = await res.json();
 if (data.success) {
 triggerToast(data.message ||"Import thành công!");
 
 // Save import history
 if (data.imported > 0) {
 const historyEntry = {
 id: `import-${Date.now()}`,
 type:"SĐT" as const,
 fileName: importBatchName,
 quantity: data.imported,
 importedAt: new Date().toLocaleString("vi-VN"),
 importedBy: user?.name || user?.username ||"Admin"
 };

 const savedHistory = localStorage.getItem("global_import_history");
 const currentHistory = savedHistory ? JSON.parse(savedHistory) : [];
 const updatedHistory = [historyEntry, ...currentHistory];
 localStorage.setItem("global_import_history", JSON.stringify(updatedHistory));
 window.dispatchEvent(new Event("storage"));
 fetch("/api/sync", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({"global_import_history": JSON.stringify(updatedHistory) }),
 }).catch(() => {});
 }

 window.location.reload();
 } else {
 triggerToast("Lỗi:" + data.error);
 }
 } catch (err) {
 console.error(err);
 triggerToast("Lỗi hệ thống khi import SĐT");
 }
 };
 reader.readAsText(file,"UTF-8");

 if (fileInputRef.current) fileInputRef.current.value ="";
 };

 // ─── Employee detail view ─────────────────────────────────
 const selectedEmp = useMemo(() => {
 if (!selectedEmpUsername) return null;
 return employees.find((e: StaffData) => e.username?.toLowerCase() === selectedEmpUsername.toLowerCase()) || null;
 }, [employees, selectedEmpUsername]);

 const empPhones = useMemo(() => {
 if (!selectedEmpUsername) return [];
 return (phones || []).filter((p) => 
 p.assigneeId && (
 p.assigneeId.toLowerCase() === selectedEmpUsername.toLowerCase() ||
 (selectedEmp?.id && String(p.assigneeId) === String(selectedEmp.id))
 )
 );
 }, [phones, selectedEmpUsername, selectedEmp]);

 const empStats = useMemo(() => {
 const total = (empPhones || []).length;
 const pending = (empPhones || []).filter((p) => p.status ==="Chưa làm").length;
 const xm1 = (empPhones || []).filter((p) => p.status ==="XM lần 1").length;
 const xm2 = (empPhones || []).filter((p) => p.status ==="XM lần 2").length;
 const err = (empPhones || []).filter((p) => p.status ==="Lỗi").length;
 return { total, pending, xm1, xm2, err };
 }, [empPhones]);

 // Assign 25 phones to employee from warehouse
 const handleAssign25 = async () => {
 if (!selectedEmp) return;
 const unassigned = (phones || []).filter((p) => !p.assigneeId);
 if ((unassigned || []).length < STANDARD_QUOTA) {
 triggerToast(`Kho chỉ còn ${(unassigned || []).length} SĐT trống, không đủ ${STANDARD_QUOTA}!`);
 return;
 }
 const toAssign = unassigned.slice(0, STANDARD_QUOTA);
 const ids = (toAssign || []).map((p) => p.id);
 const now = new Date().toISOString().split("T")[0];

 await updatePhonesAPI(ids, {
 assigneeId: selectedEmp.username,
 assignedTo: selectedEmp.name,
 assignedAt: now
 });
 await reloadPhones();

 // notification via sync
 const notifs = JSON.parse(localStorage.getItem("admin_notifications") ||"[]");
 notifs.unshift({
 id: `notif-${Date.now()}`,
 title:"Giao Lô Số Điện Thoại",
 message: `Bạn được phân công ${STANDARD_QUOTA} SĐT mới để xác minh.`,
 time: `${new Date().toLocaleTimeString("vi-VN")} - ${new Date().toLocaleDateString("vi-VN")}`,
 type:"ASSIGNMENT",
 read: false,
 targetUsername: selectedEmp.username,
 });
 localStorage.setItem("admin_notifications", JSON.stringify(notifs));
 fetch("/api/sync", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ admin_notifications: JSON.stringify(notifs) })
 }).catch(() => {});

 pushLog(`BÃ n giao ${STANDARD_QUOTA} SÄT cho ${selectedEmp.name} (@${selectedEmp.username})`);
 triggerToast(`Đã bàn giao ${STANDARD_QUOTA} SĐT cho ${selectedEmp.name}!`);
 };

 // ─── QUÉT VÀ BƠM LẠI ─────────────────────────────────────
 const handleScanAndRefill = async () => {
 if (!selectedEmpUsername || !selectedEmp) return;

 // Step 1: Find phones with status"Lỗi" or"XM lần 2" for this employee
 const toRemovePhones = (empPhones || []).filter(
 (p) => p.status ==="Lỗi" || p.status ==="XM lần 2"
 );
 const toRemoveIds = (toRemovePhones || []).map((p) => p.id);

 if (toRemoveIds.length === 0) {
 triggerToast("Không có SĐT nào cần thay thế (Lỗi hoặc XM lần 2)!");
 return;
 }

 // Step 2: Delete these phones from DB
 for (const phoneId of toRemoveIds) {
 try {
 await fetch(`/api/admin/phones?batch=__single_${phoneId}`, { method:"DELETE" });
 } catch (e) { /* individual delete fallback */ }
 }
 // Actually we need to use the PUT to unassign or we delete individually
 // Better approach: use bulk update to mark them as unassigned + update status
 // For now let's reload after changes
 
 // Step 3: Count how many active phones the employee has remaining
 const currentActiveCount = (empPhones || []).length - toRemoveIds.length;
 const deficit = STANDARD_QUOTA - currentActiveCount;

 if (deficit <= 0) {
 await reloadPhones();
 pushLog(`QuÃ©t vÃ  dá»n dáp ${toRemoveIds.length} SÄT (Lỗi/Done) của ${selectedEmp.name}. KhÃ´ng cáº§n bÆ¡m thÃªm.`);
 triggerToast(`Đã dọn dẹp ${toRemoveIds.length} SĐT. Nhân viên đã đủ ${STANDARD_QUOTA} số.`);
 return;
 }

 // Step 4: Reload to get fresh data, then assign new phones
 const freshPhones = await fetchPhonesFromAPI();
 const unassignedNewStock = (freshPhones || []).filter(
 (p) => !p.assigneeId && p.status ==="Chưa làm"
 );

 const canFill = Math.min(deficit, (unassignedNewStock || []).length);
 if (canFill > 0) {
 const refillIds = unassignedNewStock.slice(0, canFill).map(p => p.id);
 const now = new Date().toISOString().split("T")[0];
 await updatePhonesAPI(refillIds, {
 assigneeId: selectedEmp.username,
 assignedTo: selectedEmp.name,
 assignedAt: now,
 status:"Chưa làm"
 });
 }

 await reloadPhones();
 const remainingDeficit = deficit - canFill;
 const suffix = remainingDeficit > 0 ? ` (còn thiếu ${remainingDeficit} SĐT do kho không đủ)` :"";
 pushLog(`QuÃ©t dá»n dáp ${toRemoveIds.length} SÄT â†’ BÆ¡m ${canFill} SÄT mới cho ${selectedEmp.name}${suffix}`);
 triggerToast(`Đã dọn dẹp ${toRemoveIds.length}, bơm lại ${canFill} SĐT mới cho ${selectedEmp.name}!${suffix}`);
 };

 // ─── Employee list stats ──────────────────────────────────
 const employeeBreakdown = useMemo(() => {
 return (employees || []).map((emp: StaffData) => {
 const ep = (phones || []).filter((p) => 
 p.assigneeId && emp.username && (
 p.assigneeId.toLowerCase() === emp.username.toLowerCase() ||
 (emp.id && String(p.assigneeId) === String(emp.id))
 )
 );
 return {
 ...emp,
 total: (ep || []).length,
 pending: (ep || []).filter((p) => p.status ==="Chưa làm").length,
 xm1: (ep || []).filter((p) => p.status ==="XM lần 1").length,
 xm2: (ep || []).filter((p) => p.status ==="XM lần 2").length,
 err: (ep || []).filter((p) => p.status ==="Lỗi").length,
 };
 });
 }, [employees, phones]);

 // ═══════════════════════════════════════════════════════════
 // RENDER
 // ═══════════════════════════════════════════════════════════
 return (
 <div className="h-full flex flex-col space-y-6 pb-6 relative">
 {/* Toast */}
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

 {/* Hidden file input */}
 <input
 ref={fileInputRef}
 type="file"
 accept=".txt"
 className="hidden"
 onChange={handleImportTxt}
 />

 {/* ── Header ────────────────────────────────────────── */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <button
 onClick={() => router.push("/admin")}
 className="p-2 rounded-xl bg-sidebar border border-white/0 text-gray-400 hover:text-white transition-all shadow-md"
 >
 <ArrowLeft size={20} />
 </button>
 <div>
 <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
 <Phone className="text-gold" size={28} />
 Quản lý lô SĐT
 </h2>
 <p className="text-sm text-gray-500 font-medium uppercase tracking-widest mt-1">
 Kho tổng & phân phối số điện thoại cho nhân viên
 </p>
 </div>
 </div>
 </div>

 {/* ── Global Stats Row ──────────────────────────────── */}
 <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
 {[
 { label:"Tổng kho SĐT", value: globalStats.total, color:" text-white" },
 { label:"SĐT chưa giao", value: globalStats.unassigned, color:"text-gold" },
 { label:"Đang bàn giao", value: globalStats.assigned, color:"text-indigo-400" },
 { label:"XM lần 1", value: globalStats.xm1, color:"text-yellow-500" },
 { label:"XM lần 2", value: globalStats.xm2, color:"text-green-500" },
 { label:"Bị Lỗi", value: globalStats.err, color:"text-red-500" },
 ].map((s) => (
 <div key={s.label} className="bg-sidebar/40 border border-white/0 rounded-2xl p-6 flex flex-col justify-between">
 <span className={`text-[9px] font-black uppercase tracking-widest ${s.color}`}>{s.label}</span>
 <span className={`text-2xl font-black mt-1 ${s.color}`}>
 {s.value} <span className="text-sm text-gray-500">Số</span>
 </span>
 </div>
 ))}
 </div>

 {/* ── Tab Switcher ──────────────────────────────────── */}
 <div className="flex items-center gap-1 bg-sidebar/60 border border-white/0 rounded-2xl p-1.5 w-fit">
 {[
 { key:"warehouse" as const, icon: <Warehouse size={16} />, label:"Tổng kho" },
 { key:"batches" as const, icon: <Layers size={16} />, label:"Lô SĐT" },
 { key:"staff" as const, icon: <Users size={16} />, label:"Nhân viên" },
 ].map((tab) => (
 <button
 key={tab.key}
 onClick={() => { setActiveTab(tab.key as any); setSelectedEmpUsername(null); setSearchTerm(""); }}
 className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
 activeTab === tab.key
 ?"bg-gold text-sidebar shadow-lg shadow-gold/20"
 :"text-gray-500 hover:text-white hover:bg-zinc-800/50 bg-zinc-900/5"
 }`}
 >
 {tab.icon} {tab.label}
 </button>
 ))}
 </div>

 {/* ══════════════════════════════════════════════════════
 TAB 1: TỔNG KHO
 ══════════════════════════════════════════════════════ */}
 {activeTab ==="warehouse" && (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-sidebar border border-white/0 rounded-[32px] p-6 shadow-xl space-y-4 flex-1 flex flex-col"
 >
 {/* Toolbar */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <h3 className="text-md font-black text-white uppercase tracking-tight flex items-center gap-2">
 <Warehouse size={18} className="text-gold" />
 Kho SĐT trống ({(warehousePhones || []).length} số)
 </h3>

 <div className="flex items-center gap-3">
 <div className="relative group">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={14} />
 <input
 placeholder="Tìm SĐT, OTP Link..."
 className="bg-black/20 border border-white/0 rounded-xl pl-9 pr-4 h-9 text-sm text-white outline-none focus:border-white/5 transition-all w-full sm:w-60"
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 <div className="flex items-center gap-3">
 <input
 placeholder="Nhập tên lô mới..."
 className="bg-black/20 border border-white/0 rounded-xl px-4 h-9 text-sm text-white outline-none focus:border-white/5 transition-all w-full sm:w-60"
 type="text"
 value={batchName}
 onChange={(e) => setBatchName(e.target.value)}
 />
 </div>
 <button
 onClick={() => setShowHistoryModal(true)}
 className="bg-white/5 hover:bg-white/10 border border-white/0 hover:border-white/5 text-white font-black uppercase text-[10px] tracking-widest px-4 h-9 rounded-xl transition-all flex items-center gap-2"
 >
 <FileText size={14} className="text-gold" />
 Lịch sử Import
 </button>
 <button
 onClick={() => fileInputRef.current?.click()}
 className="bg-gold hover:bg-gold-hover text-sidebar font-black uppercase text-[10px] tracking-widest px-4 h-9 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-gold/20"
 >
 <Upload size={14} />
 Import SĐT (.txt)
 </button>
 </div>
 </div>

 {/* Table */}
 <div className="flex-1 overflow-y-auto max-h-[450px] custom-scrollbar border border-white/0 rounded-2xl">
 <table className="w-full text-left text-sm">
 <thead className="sticky top-0 bg-[#0c0c0c] text-gray-500 uppercase font-black text-[9px] tracking-wider z-10 border-b border-white/0">
 <tr>
 <th className="py-3 px-4">STT</th>
 <th className="py-3 px-4">Số điện thoại</th>
 <th className="py-3 px-4">Link OTP</th>
 <th className="py-3 px-4">Ngày import</th>
 <th className="py-3 px-4 text-center">Trạng thái</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-gray-300">
 {(filteredWarehouse || []).map((p, idx) => (
 <tr key={p.id} className="hover:bg-zinc-800/50">
 <td className="py-3 px-4 text-gray-500 font-bold">{idx + 1}</td>
 <td className="py-3 px-4 font-bold text-white font-mono text-base">{p.number}</td>
 <td className="py-3 px-4 text-gray-400 font-mono text-[10px] max-w-[280px] truncate">
 {p.otpLink ? (
 <a href={p.otpLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
 {p.otpLink}
 </a>
 ) : (
 <span className="italic">—</span>
 )}
 </td>
 <td className="py-3 px-4 text-gray-500 font-mono">{p.importedAt}</td>
 <td className="py-3 px-4 text-center">
 <StatusBadge status={p.status} />
 </td>
 </tr>
 ))}
 {(filteredWarehouse || []).length === 0 && (
 <tr>
 <td colSpan={5} className="py-12 text-center font-bold uppercase tracking-widest">
 {(warehousePhones || []).length === 0
 ?"Kho trống — Hãy import file .txt để bắt đầu"
 :"Không tìm thấy kết quả"}
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Import guide */}
 <div className="bg-gold/5 border border-gold/10 rounded-2xl p-6 text-[11px] text-gray-400 font-medium leading-relaxed space-y-1">
 <div className="flex gap-2 text-gold font-black uppercase text-[10px] tracking-widest items-center">
 <FileText size={13} /> Hướng dẫn Import
 </div>
 <p>File <span className="text-white font-bold">.txt</span>, mỗi dòng chứa 1 SĐT theo định dạng: <code className="text-gold font-mono bg-gold/10 px-1.5 py-0.5 rounded">SĐT|LinkOTP</code></p>
 <p>Ví dụ: <code className="text-indigo-400 font-mono bg-indigo-400/10 px-1.5 py-0.5 rounded">5093810744|https://sms222.us?token=1JT15yAhcw04232054</code></p>
 </div>
 </motion.div>
 )}

 {/* ══════════════════════════════════════════════════════
 TAB: LÔ SĐT
 ══════════════════════════════════════════════════════ */}
 {activeTab ==="batches" && (
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-sidebar border border-white/0 rounded-[32px] p-6 shadow-xl space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <h3 className="text-md font-black text-white uppercase tracking-tight flex items-center gap-2">
 <Layers size={18} className="text-gold" />
 Danh sách Lô SĐT
 </h3>
 <div className="flex items-center gap-3">
 <input placeholder="Nhập tên lô mới..." className="bg-black/20 border border-white/0 rounded-xl px-4 h-9 text-sm text-white outline-none focus:border-white/5 transition-all w-full sm:w-60" value={batchName} onChange={(e) => setBatchName(e.target.value)} />
 <button onClick={() => fileInputRef.current?.click()} className="bg-gold hover:bg-gold-hover text-sidebar font-black uppercase text-[10px] tracking-widest px-4 h-9 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-gold/20">
 <Upload size={14} /> Import Txt
 </button>
 </div>
 </div>
 <div className="space-y-4">
 {Object.entries(groupedWarehouse).map(([batch, bPhones]) => (
 <div key={batch} className="border border-white/0 rounded-2xl overflow-hidden bg-[#0c0c0c]">
 <div 
 onClick={() => setExpandedBatches(prev => prev.includes(batch) ? prev.filter(b => b !== batch) : [...prev, batch])}
 className="flex flex-wrap items-center justify-between bg-zinc-900 px-4 py-3 border-b border-white/0 gap-2 cursor-pointer hover:bg-zinc-800 transition-colors"
 >
 <h4 className="font-bold text-white uppercase flex items-center gap-2 select-none">
 <Layers size={16} className="text-gold" />
 Lô: {batch} <span className="text-gray-500 text-xs normal-case ml-2">({bPhones.length} số)</span>
 </h4>
 <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
 <button onClick={() => handleExportExcel(batch, bPhones)} className="bg-green-500/10 hover:bg-green-500/20 text-green-600 text-green-400 font-bold uppercase text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
 <Download size={12} /> Xuất Excel
 </button>
 <button onClick={() => handleDeleteBatch(batch)} className="bg-red-500/10 hover:bg-red-500/20 text-red-600 text-red-400 font-bold uppercase text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
 <Trash2 size={12} /> Xóa Lô Này
 </button>
 </div>
 </div>
 {expandedBatches.includes(batch) && (
 <div className="overflow-x-auto border-t border-white/0 bg-[#0c0c0c]">
 <table className="w-full text-left text-sm">
 <thead className="bg-[#0c0c0c] text-gray-500 uppercase font-black text-[9px] tracking-wider border-b border-white/0">
 <tr>
 <th className="py-2 px-4 whitespace-nowrap">STT</th>
 <th className="py-2 px-4 whitespace-nowrap">Số điện thoại</th>
 <th className="py-2 px-4 whitespace-nowrap">Link OTP</th>
 <th className="py-2 px-4 whitespace-nowrap">Ngày import</th>
 <th className="py-2 px-4 text-center whitespace-nowrap">Trạng thái</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-gray-300">
 {bPhones.map((p, idx) => (
 <tr key={p.id} className="hover:bg-zinc-800/50">
 <td className="py-2 px-4 text-gray-500 font-bold">{idx + 1}</td>
 <td className="py-2 px-4 font-bold text-white font-mono text-base">{p.number}</td>
 <td className="py-2 px-4 text-gray-400 font-mono text-[10px] max-w-[280px] truncate">
 {p.otpLink ? (
 <a href={p.otpLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
 {p.otpLink}
 </a>
 ) : (
 <span className="italic">—</span>
 )}
 </td>
 <td className="py-2 px-4 text-gray-500 font-mono text-xs">{new Date(p.importedAt).toLocaleString("vi-VN")}</td>
 <td className="py-2 px-4 text-center">
 <StatusBadge status={p.status} />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 ))}
 {Object.keys(groupedWarehouse).length === 0 && (
 <div className="py-12 text-center font-bold uppercase tracking-widest">
 Chưa có lô SĐT nào.
 </div>
 )}
 </div>
 </motion.div>
 )}

 {/* ══════════════════════════════════════════════════════
 TAB 2: NHÂN VIÊN
 ══════════════════════════════════════════════════════ */}
 {activeTab ==="staff" && (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1"
 >
 {/* ── Left: Employee List ───────────────────────── */}
 <div className="lg:col-span-4 bg-sidebar border border-white/0 rounded-[32px] p-6 shadow-xl space-y-4">
 <h3 className="text-md font-black text-white uppercase tracking-tight flex items-center gap-2">
 <Users size={18} className="text-gold" />
 Nhân viên Online
 </h3>

 {/* Search employees */}
 <div className="relative group">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={14} />
 <input
 placeholder="Tìm tên hoặc username..."
 className="w-full bg-black/20 border border-white/0 rounded-xl pl-9 pr-4 h-9 text-sm text-white outline-none focus:border-white/5 transition-all"
 type="text"
 value={staffSearch}
 onChange={(e) => setStaffSearch(e.target.value)}
 />
 </div>

 <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
 {(employeeBreakdown || []).filter((e: any) => {
 if (!e.isOnline) return false;
 if (!staffSearch.trim()) return true;
 const q = staffSearch.toLowerCase();
 return (e.name ||"").toLowerCase().includes(q) || (e.username ||"").toLowerCase().includes(q);
 }).length === 0 && (
 <p className="text-sm font-bold uppercase tracking-widest text-center py-6">
 {staffSearch.trim() ?"Không tìm thấy nhân viên" :"Không có nhân viên nào online"}
 </p>
 )}
 {employeeBreakdown
 .filter((e: any) => {
 if (!e.isOnline) return false;
 if (!staffSearch.trim()) return true;
 const q = staffSearch.toLowerCase();
 return (e.name ||"").toLowerCase().includes(q) || (e.username ||"").toLowerCase().includes(q);
 })
 .map((emp: any) => {
 const isSelected = selectedEmpUsername === emp.username;
 return (
 <button
 key={emp.id}
 onClick={() => setSelectedEmpUsername(emp.username)}
 className={`w-full text-left p-6 rounded-2xl border transition-all group ${
 isSelected
 ?"bg-gold/5 border-white/0 shadow-lg shadow-gold/5"
 :" border-white/0 hover:border-white/0 hover:bg-zinc-800/50 bg-zinc-900/[0.02]"
 }`}
 >
 <div className="flex items-center justify-between">
 <div>
 <div className={`text-base font-black ${isSelected ?"text-gold" :" text-white"}`}>
 {emp.name}
 </div>
 <div className="text-[10px] text-gray-500 font-mono">@{emp.username}</div>
 </div>
 <div className="flex items-center gap-2">
 <div className={`text-sm font-black ${emp.total > 0 ?"text-indigo-400" :""}`}>
 {emp.total} SĐT
 </div>
 <ChevronRight
 size={14}
 className={`transition-colors ${isSelected ?"text-gold" :"text-white"}`}
 />
 </div>
 </div>

 {/* Mini breakdown */}
 {emp.total > 0 && (
 <div className="flex items-center gap-3 mt-2 text-[9px] font-black uppercase tracking-wider">
 <span className="text-gray-500">{emp.pending} chưa</span>
 <span className="text-yellow-500">{emp.xm1} XM1</span>
 <span className="text-green-500">{emp.xm2} XM2</span>
 <span className="text-red-500">{emp.err} Lỗi</span>
 </div>
 )}
 </button>
 );
 })}
 </div>
 </div>

 {/* ── Right: Selected Employee Detail ───────────── */}
 <div className="lg:col-span-8 space-y-6">
 {!selectedEmp ? (
 <div className="bg-sidebar border border-white/0 rounded-[32px] p-12 shadow-xl flex flex-col items-center justify-center text-center">
 <UserCheck size={48} className="mb-4" />
 <h3 className="text-lg font-black text-gray-500 uppercase tracking-widest">
 Chọn nhân viên để xem chi tiết
 </h3>
 <p className="text-sm mt-1">
 Bấm vào tên nhân viên bên trái để quản lý SĐT của họ
 </p>
 </div>
 ) : (
 <>
 {/* Employee Header + Actions */}
 <div className="bg-sidebar border border-white/0 rounded-[32px] p-6 shadow-xl">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h3 className="text-xl font-black text-white uppercase tracking-tight">
 {selectedEmp.name}
 </h3>
 <p className="text-[10px] text-gray-500 font-mono">
 @{selectedEmp.username} · {empStats.total} SĐT đang giữ
 </p>
 </div>

 <div className="flex items-center gap-3">
 {/* Quét và bơm lại */}
 {empStats.total > 0 && (
 <button
 onClick={handleScanAndRefill}
 className="h-10 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
 >
 <RefreshCw size={14} />
 Quét và bơm lại
 </button>
 )}

 {/* Bàn giao 25 SĐT - only if employee has 0 */}
 {empStats.total === 0 && (
 <button
 onClick={handleAssign25}
 disabled={globalStats.unassigned < STANDARD_QUOTA}
 className="h-10 px-4 rounded-xl bg-gold hover:bg-gold-hover text-sidebar font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-gold/20 disabled:opacity-40 disabled:cursor-not-allowed"
 >
 <TrendingUp size={14} />
 Bàn giao {STANDARD_QUOTA} SĐT
 </button>
 )}
 </div>
 </div>

 {/* Mini stats */}
 <div className="grid grid-cols-5 gap-3 mt-4">
 {[
 { label:"Tổng", value: empStats.total, color:"text-indigo-400" },
 { label:"Chưa làm", value: empStats.pending, color:" text-gray-400" },
 { label:"XM lần 1", value: empStats.xm1, color:"text-yellow-500" },
 { label:"XM lần 2", value: empStats.xm2, color:"text-green-500" },
 { label:"Lỗi", value: empStats.err, color:"text-red-500" },
 ].map((s) => (
 <div key={s.label} className="bg-white/0 border border-white/0 rounded-xl p-3 text-center">
 <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
 <div className="text-[8px] font-black uppercase tracking-widest mt-0.5">{s.label}</div>
 </div>
 ))}
 </div>

 {/* Quét và bơm lại info box */}
 {empStats.total > 0 && (empStats.err > 0 || empStats.xm2 > 0) && (
 <div className="mt-4 bg-orange-500/5 border border-orange-500/15 rounded-2xl p-3 text-[11px] text-orange-400 font-medium flex items-start gap-2">
 <AlertTriangle size={14} className="mt-0.5 shrink-0" />
 <span>
 Phát hiện <span className="font-black">{empStats.err + empStats.xm2}</span> SĐT có thể thay thế ({empStats.err} Lỗi, {empStats.xm2} XM2 done).
 Bấm <span className="font-black">"Quét và bơm lại"</span> để tự động gỡ và bổ sung từ kho.
 </span>
 </div>
 )}
 </div>

 {/* Employee Phone Table */}
 <div className="bg-sidebar border border-white/0 rounded-[32px] p-6 shadow-xl">
 <h4 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2 mb-4">
 <Phone size={16} className="text-gold" />
 Danh sách SĐT của {selectedEmp.name}
 </h4>
 <div className="overflow-y-auto max-h-[400px] custom-scrollbar border border-white/0 rounded-2xl">
 <table className="w-full text-left text-sm">
 <thead className="sticky top-0 bg-[#0c0c0c] text-gray-500 uppercase font-black text-[9px] tracking-wider z-10 border-b border-white/0">
 <tr>
 <th className="py-3 px-4">STT</th>
 <th className="py-3 px-4">Số điện thoại</th>
 <th className="py-3 px-4">Link OTP</th>
 <th className="py-3 px-4">Ngày giao</th>
 <th className="py-3 px-4 text-center">Trạng thái</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-gray-300">
 {(empPhones || []).map((p, idx) => (
 <tr
 key={p.id}
 className={`hover:bg-zinc-800/50 transition-colors ${
 p.status ==="Lỗi"
 ?"bg-red-500/[0.03]"
 : p.status ==="XM lần 2"
 ?"bg-green-500/[0.03]"
 :""
 }`}
 >
 <td className="py-3 px-4 text-gray-500 font-bold">{idx + 1}</td>
 <td className="py-3 px-4 font-bold text-white font-mono text-base">{p.number}</td>
 <td className="py-3 px-4 text-gray-400 font-mono text-[10px] max-w-[240px] truncate">
 {p.otpLink ? (
 <a href={p.otpLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
 {p.otpLink}
 </a>
 ) : (
 <span className="italic">—</span>
 )}
 </td>
 <td className="py-3 px-4 text-gray-500 font-mono">{p.assignedAt ||"—"}</td>
 <td className="py-3 px-4 text-center">
 <StatusBadge status={p.status} />
 </td>
 </tr>
 ))}
 {(empPhones || []).length === 0 && (
 <tr>
 <td colSpan={5} className="py-12 text-center font-bold uppercase tracking-widest">
 Nhân viên chưa được bàn giao SĐT nào
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </>
 )}
 </div>
 </motion.div>
 )}

 <ImportHistoryModal
    isOpen={showHistoryModal}
    onClose={() => setShowHistoryModal(false)}
    importHistory={importHistory}
    onDeleteRow={(id) => {
      if (!confirm("Bạn có chắc chắn muốn xóa dòng lá»‹ch sá»­ nÃ y?")) return;
      const updated = (importHistory || []).filter(h => h.id !== id);
      setImportHistory(updated);
      localStorage.setItem("global_import_history", JSON.stringify(updated));
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ global_import_history: JSON.stringify(updated) })
      }).catch(console.error);
    }}
    onClearAll={async () => {
      if (!confirm("Xác nhận xóa TOÃ€N Bá»˜ lá»‹ch sá»­ import?")) return;
      setImportHistory([]);
      localStorage.setItem("global_import_history", JSON.stringify([]));
      try {
        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ global_import_history: JSON.stringify([]) })
        });
      } catch (err) {
        console.error(err);
      }
    }}
  />

 {isLoading && <LoadingOverlay />}
 </div>
 );
}
