"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  User as UserIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import type { PhoneItem, PhoneStatus } from "@/types/admin";

// ─── Constants ──────────────────────────────────────────────
const STANDARD_QUOTA = 25;
const LS_KEY = "global_phones_data";

// ─── Helpers ────────────────────────────────────────────────
function loadPhones(): PhoneItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function savePhones(phones: PhoneItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(phones));
  window.dispatchEvent(new Event("storage"));
  fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [LS_KEY]: JSON.stringify(phones) }),
  }).catch(() => {});
}

function pushLog(user: any, action: string, type: "SUCCESS" | "WARNING" = "SUCCESS") {
  const logs = JSON.parse(localStorage.getItem("global_system_logs") || "[]");
  logs.unshift({
    id: `log-${Date.now()}`,
    user: user?.name || "Admin",
    role: "ADMIN",
    action,
    type,
    timestamp: new Date().toLocaleString("vi-VN"),
  });
  localStorage.setItem("global_system_logs", JSON.stringify(logs));
  window.dispatchEvent(new Event("storage"));
}

// ─── Status Badge ───────────────────────────────────────────
function StatusBadge({ status }: { status: PhoneStatus }) {
  const cls =
    status === "XM lần 1"
      ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      : status === "XM lần 2"
      ? "bg-green-500/10 text-green-500 border-green-500/20"
      : status === "Lỗi"
      ? "bg-red-500/10 text-red-500 border-red-500/20"
      : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/5";
  return (
    <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase border ${cls}`}>
      {status}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function PhoneBatchesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [historyTab, setHistoryTab] = useState<"ALL" | "MAIL" | "SĐT">("ALL");

  useEffect(() => {
    const loadHistory = () => {
      const saved = localStorage.getItem("global_import_history");
      setImportHistory(saved ? JSON.parse(saved) : []);
    };
    loadHistory();
    window.addEventListener("storage", loadHistory);
    return () => window.removeEventListener("storage", loadHistory);
  }, []);

  const filteredHistory = useMemo(() => {
    if (historyTab === "ALL") return importHistory;
    return (importHistory || []).filter((item) => item.type === historyTab);
  }, [importHistory, historyTab]);

  const handleDeleteHistoryRow = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa dòng lịch sử import này? (Không ảnh hưởng đến dữ liệu đã import)")) return;
    const updated = (importHistory || []).filter((item) => item.id !== id);
    setImportHistory(updated);
    localStorage.setItem("global_import_history", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));

    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ global_import_history: JSON.stringify(updated) })
      });
    } catch (err) {
      console.error("Sync history deletion error:", err);
    }
  };

  const handleClearAllHistory = async () => {
    if (!confirm("Xác nhận xóa TOÀN BỘ lịch sử import? Hành động này không thể hoàn tác.")) return;
    setImportHistory([]);
    localStorage.setItem("global_import_history", JSON.stringify([]));
    window.dispatchEvent(new Event("storage"));

    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ global_import_history: JSON.stringify([]) })
      });
    } catch (err) {
      console.error("Sync history clear error:", err);
    }
  };

  // ─── Auth ─────────────────────────────────────────────────
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!raw) { window.location.href = "/login"; return; }
    const parsed = JSON.parse(raw);
    const role = String(parsed.role || "").toUpperCase();
    if (!["01", "02", "ADMIN", "QUẢN LÝ CÔNG VIỆC", "QL CÔNG VIỆC"].includes(role)) {
      window.location.href = "/admin";
      return;
    }
    setUser(parsed);
  }, []);

  // ─── Data ─────────────────────────────────────────────────
  const [phones, setPhones] = useState<PhoneItem[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [toastMsg, setToastMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"warehouse" | "staff">("warehouse");
  const [selectedEmpUsername, setSelectedEmpUsername] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [staffSearch, setStaffSearch] = useState("");

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  // Load data
  useEffect(() => {
    const load = () => {
      setPhones(loadPhones());
      const raw = localStorage.getItem("global_users");
      if (raw) {
        const all = JSON.parse(raw);
        setEmployees(
          (all || []).filter((u: any) =>
            u.role === "03" || u.role === "04" || u.role === "05" || u.role === "NHÂN VIÊN" || u.role === "NV THỬ VIỆC" || u.role === "QUẢN LÝ NHÂN SỰ"
          )
        );
      }
    };
    load();
    const handler = () => load();
    window.addEventListener("storage", handler);
    const iv = setInterval(load, 3000);
    return () => { window.removeEventListener("storage", handler); clearInterval(iv); };
  }, []);

  // ─── Stats ────────────────────────────────────────────────
  const globalStats = useMemo(() => {
    const total = (phones || []).length;
    const unassigned = (phones || []).filter((p) => !p.assigneeId).length;
    const assigned = total - unassigned;
    const xm1 = (phones || []).filter((p) => p.status === "XM lần 1").length;
    const xm2 = (phones || []).filter((p) => p.status === "XM lần 2").length;
    const err = (phones || []).filter((p) => p.status === "Lỗi").length;
    return { total, unassigned, assigned, xm1, xm2, err };
  }, [phones]);

  // ─── Warehouse (unassigned) ───────────────────────────────
  const warehousePhones = useMemo(() => {
    return (phones || []).filter((p) => !p.assigneeId);
  }, [phones]);

  const filteredWarehouse = useMemo(() => {
    if (!searchTerm) return warehousePhones;
    const q = searchTerm.toLowerCase();
    return (warehousePhones || []).filter(
      (p) => p.number.includes(q) || p.otpLink.toLowerCase().includes(q)
    );
  }, [warehousePhones, searchTerm]);

  // ─── IMPORT .TXT ──────────────────────────────────────────
  const handleImportTxt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".txt")) {
      triggerToast("Chỉ chấp nhận file .txt!");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text || !text.trim()) {
        triggerToast("File trống, không có dữ liệu!");
        return;
      }

      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      const now = new Date().toISOString().split("T")[0];
      const newItems: PhoneItem[] = [];
      let duplicateCount = 0;

      for (const line of lines) {
        const parts = line.split("|");
        const phoneNumber = (parts[0] || "").trim();
        const otpLink = (parts[1] || "").trim();
        if (!phoneNumber) continue; // skip blank lines

        // Check if duplicate in newItems or existing phones
        const isDuplicate = newItems.some(ni => ni.number === phoneNumber) ||
                            phones.some(p => p.number === phoneNumber);

        if (isDuplicate) {
          duplicateCount++;
          continue;
        }

        newItems.push({
          id: `phone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          number: phoneNumber,
          otpLink,
          status: "Chưa làm",
          assigneeId: null,
          assignedTo: null,
          assignedAt: null,
          importedAt: now,
        });
      }

      if ((newItems || []).length === 0) {
        if (duplicateCount > 0) {
          triggerToast(`Bỏ qua tất cả ${duplicateCount} SĐT do bị trùng lặp!`);
        } else {
          triggerToast("Không tìm được SĐT hợp lệ nào trong file!");
        }
        return;
      }

      if (duplicateCount > 0) {
        triggerToast(`Đã bỏ qua ${duplicateCount} SĐT bị trùng!`);
      }

      const updated = [...phones, ...newItems];
      savePhones(updated);
      setPhones(updated);

      // Save import history
      const historyEntry = {
        id: `import-${Date.now()}`,
        type: "SĐT" as const,
        fileName: file.name,
        quantity: (newItems || []).length,
        importedAt: new Date().toLocaleString("vi-VN"),
        importedBy: user?.name || user?.username || "Admin"
      };

      const savedHistory = localStorage.getItem("global_import_history");
      const currentHistory = savedHistory ? JSON.parse(savedHistory) : [];
      const updatedHistory = [historyEntry, ...currentHistory];
      localStorage.setItem("global_import_history", JSON.stringify(updatedHistory));

      pushLog(user, `Import thành công ${(newItems || []).length} SĐT từ file ${file.name}`);
      triggerToast(`Đã import ${(newItems || []).length} SĐT mới vào Tổng kho!`);
      window.dispatchEvent(new Event("storage"));

      // Push history update to server
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "global_import_history": JSON.stringify(updatedHistory) }),
      }).catch((err) => console.error("Sync history error:", err));
    };
    reader.readAsText(file, "UTF-8");

    // reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Employee detail view ─────────────────────────────────
  const selectedEmp = useMemo(() => {
    if (!selectedEmpUsername) return null;
    return employees.find((e) => e.username?.toLowerCase() === selectedEmpUsername.toLowerCase()) || null;
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
    const pending = (empPhones || []).filter((p) => p.status === "Chưa làm").length;
    const xm1 = (empPhones || []).filter((p) => p.status === "XM lần 1").length;
    const xm2 = (empPhones || []).filter((p) => p.status === "XM lần 2").length;
    const err = (empPhones || []).filter((p) => p.status === "Lỗi").length;
    return { total, pending, xm1, xm2, err };
  }, [empPhones]);

  // Assign 25 phones to employee from warehouse
  const handleAssign25 = () => {
    if (!selectedEmp) return;
    const unassigned = (phones || []).filter((p) => !p.assigneeId);
    if ((unassigned || []).length < STANDARD_QUOTA) {
      triggerToast(`Kho chỉ còn ${(unassigned || []).length} SĐT trống, không đủ ${STANDARD_QUOTA}!`);
      return;
    }
    const toAssign = unassigned.slice(0, STANDARD_QUOTA);
    const ids = new Set((toAssign || []).map((p) => p.id));
    const now = new Date().toISOString().split("T")[0];

    const updated = (phones || []).map((p) =>
      ids.has(p.id)
        ? { ...p, assigneeId: selectedEmp.username, assignedTo: selectedEmp.name, assignedAt: now }
        : p
    );
    savePhones(updated);
    setPhones(updated);

    // notification
    const notifs = JSON.parse(localStorage.getItem("admin_notifications") || "[]");
    notifs.unshift({
      id: `notif-${Date.now()}`,
      title: "Giao Lô Số Điện Thoại",
      message: `Bạn được phân công ${STANDARD_QUOTA} SĐT mới để xác minh.`,
      time: `${new Date().toLocaleTimeString("vi-VN")} - ${new Date().toLocaleDateString("vi-VN")}`,
      type: "ASSIGNMENT",
      read: false,
      targetUsername: selectedEmp.username,
    });
    localStorage.setItem("admin_notifications", JSON.stringify(notifs));

    pushLog(user, `Bàn giao ${STANDARD_QUOTA} SĐT cho ${selectedEmp.name} (@${selectedEmp.username})`);
    triggerToast(`Đã bàn giao ${STANDARD_QUOTA} SĐT cho ${selectedEmp.name}!`);
  };

  // ─── QUÉT VÀ BƠM LẠI ─────────────────────────────────────
  const handleScanAndRefill = () => {
    if (!selectedEmpUsername || !selectedEmp) return;

    // Step 1: Find phones with status "Lỗi" or "XM lần 2" for this employee
    const toRemovePhones = (empPhones || []).filter(
      (p) => p.status === "Lỗi" || p.status === "XM lần 2"
    );
    const toRemoveIds = new Set((toRemovePhones || []).map((p) => p.id));

    if (toRemoveIds.size === 0) {
      triggerToast("Không có SĐT nào cần thay thế (Lỗi hoặc XM lần 2)!");
      return;
    }

    // Step 2: Clean up (completely delete) these phones from the global list
    let working = (phones || []).filter((p) => !toRemoveIds.has(p.id));

    // Step 3: Count how many active phones the employee has remaining (Chưa làm or XM lần 1)
    const currentActiveCount = (empPhones || []).length - toRemoveIds.size;
    const deficit = STANDARD_QUOTA - currentActiveCount;

    if (deficit <= 0) {
      savePhones(working);
      setPhones(working);
      pushLog(user, `Quét và dọn dẹp ${toRemoveIds.size} SĐT (Lỗi/Done) của ${selectedEmp.name}. Không cần bơm thêm.`);
      triggerToast(`Đã dọn dẹp ${toRemoveIds.size} SĐT. Nhân viên đã đủ ${STANDARD_QUOTA} số.`);
      return;
    }

    // Step 4: Extract brand new phone numbers (status "Chưa làm" and unassigned) from warehouse
    const unassignedNewStock = (working || []).filter(
      (p) => !p.assigneeId && p.status === "Chưa làm"
    );

    const canFill = Math.min(deficit, (unassignedNewStock || []).length);
    if (canFill === 0) {
      savePhones(working);
      setPhones(working);
      pushLog(user, `Quét và dọn dẹp ${toRemoveIds.size} SĐT của ${selectedEmp.name}. Kho trống không đủ SĐT mới để bơm lại.`, "WARNING");
      triggerToast(`Đã dọn dẹp ${toRemoveIds.size} SĐT nhưng Tổng kho đã hết số mới!`);
      return;
    }

    const refillSlice = unassignedNewStock.slice(0, canFill);
    const refillIds = new Set((refillSlice || []).map((p) => p.id));
    const now = new Date().toISOString().split("T")[0];

    working = (working || []).map((p) =>
      refillIds.has(p.id)
        ? {
            ...p,
            assigneeId: selectedEmp.username,
            assignedTo: selectedEmp.name,
            assignedAt: now,
            status: "Chưa làm" as PhoneStatus
          }
        : p
    );

    savePhones(working);
    setPhones(working);

    const remainingDeficit = deficit - canFill;
    const suffix = remainingDeficit > 0 ? ` (còn thiếu ${remainingDeficit} SĐT do kho không đủ)` : "";
    pushLog(user, `Quét dọn dẹp ${toRemoveIds.size} SĐT → Bơm ${canFill} SĐT mới cho ${selectedEmp.name}${suffix}`);
    triggerToast(`Đã dọn dẹp ${toRemoveIds.size}, bơm lại ${canFill} SĐT mới cho ${selectedEmp.name}!${suffix}`);
  };

  // ─── Employee list stats ──────────────────────────────────
  const employeeBreakdown = useMemo(() => {
    return (employees || []).map((emp) => {
      const ep = (phones || []).filter((p) => 
        p.assigneeId && emp.username && (
          p.assigneeId.toLowerCase() === emp.username.toLowerCase() ||
          (emp.id && String(p.assigneeId) === String(emp.id))
        )
      );
      return {
        ...emp,
        total: (ep || []).length,
        pending: (ep || []).filter((p) => p.status === "Chưa làm").length,
        xm1: (ep || []).filter((p) => p.status === "XM lần 1").length,
        xm2: (ep || []).filter((p) => p.status === "XM lần 2").length,
        err: (ep || []).filter((p) => p.status === "Lỗi").length,
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
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 30, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[200] bg-gold px-6 py-3 rounded-full text-sidebar font-black text-sm shadow-2xl flex items-center gap-2"
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
            className="p-2 rounded-xl bg-white dark:bg-sidebar border border-border-custom text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white transition-all shadow-md"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
              <Phone className="text-gold" size={28} />
              Quản lý lô SĐT
            </h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">
              Kho tổng & phân phối số điện thoại cho nhân viên
            </p>
          </div>
        </div>
      </div>

      {/* ── Global Stats Row ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: "Tổng kho SĐT", value: globalStats.total, color: "text-gray-900 dark:text-white" },
          { label: "SĐT chưa giao", value: globalStats.unassigned, color: "text-gold" },
          { label: "Đang bàn giao", value: globalStats.assigned, color: "text-indigo-400" },
          { label: "XM lần 1", value: globalStats.xm1, color: "text-yellow-500" },
          { label: "XM lần 2", value: globalStats.xm2, color: "text-green-500" },
          { label: "Bị Lỗi", value: globalStats.err, color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-sidebar/40 border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between">
            <span className={`text-[9px] font-black uppercase tracking-widest ${s.color}`}>{s.label}</span>
            <span className={`text-2xl font-black mt-1 ${s.color}`}>
              {s.value} <span className="text-xs text-gray-500">Số</span>
            </span>
          </div>
        ))}
      </div>

      {/* ── Tab Switcher ──────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white dark:bg-sidebar/60 border border-gray-200 dark:border-white/5 rounded-2xl p-1.5 w-fit">
        {[
          { key: "warehouse" as const, icon: <Warehouse size={16} />, label: "Tổng kho" },
          { key: "staff" as const, icon: <Users size={16} />, label: "Nhân viên" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedEmpUsername(null); setSearchTerm(""); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab.key
                ? "bg-gold text-sidebar shadow-lg shadow-gold/20"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
           TAB 1: TỔNG KHO
         ══════════════════════════════════════════════════════ */}
      {activeTab === "warehouse" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-sidebar border border-gray-200 dark:border-white/5 rounded-[32px] p-6 shadow-xl space-y-4 flex-1 flex flex-col"
        >
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-md font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Warehouse size={18} className="text-gold" />
              Kho SĐT trống ({(warehousePhones || []).length} số)
            </h3>

            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={14} />
                <input
                  placeholder="Tìm SĐT, OTP Link..."
                  className="bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl pl-9 pr-4 h-9 text-xs text-gray-900 dark:text-white outline-none focus:border-gold/50 transition-all w-full sm:w-60"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-300 dark:border-white/10 hover:border-gold/50 text-gray-900 dark:text-white font-black uppercase text-[10px] tracking-widest px-4 h-9 rounded-xl transition-all flex items-center gap-2"
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
          <div className="flex-1 overflow-y-auto max-h-[450px] custom-scrollbar border border-gray-200 dark:border-white/5 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white dark:bg-[#0c0c0c] text-gray-500 uppercase font-black text-[9px] tracking-wider z-10 border-b border-gray-200 dark:border-white/5">
                <tr>
                  <th className="py-3 px-4">STT</th>
                  <th className="py-3 px-4">Số điện thoại</th>
                  <th className="py-3 px-4">Link OTP</th>
                  <th className="py-3 px-4">Ngày import</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-700 dark:text-gray-300">
                {(filteredWarehouse || []).map((p, idx) => (
                  <tr key={p.id} className="hover:bg-white/[0.01]">
                    <td className="py-3 px-4 text-gray-500 font-bold">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white font-mono text-sm">{p.number}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono text-[10px] max-w-[280px] truncate">
                      {p.otpLink ? (
                        <a href={p.otpLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
                          {p.otpLink}
                        </a>
                      ) : (
                        <span className="text-gray-600 italic">—</span>
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
                    <td colSpan={5} className="py-12 text-center text-gray-600 font-bold uppercase tracking-widest">
                      {(warehousePhones || []).length === 0
                        ? "Kho trống — Hãy import file .txt để bắt đầu"
                        : "Không tìm thấy kết quả"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Import guide */}
          <div className="bg-gold/5 border border-gold/10 rounded-2xl p-4 text-[11px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed space-y-1">
            <div className="flex gap-2 text-gold font-black uppercase text-[10px] tracking-widest items-center">
              <FileText size={13} /> Hướng dẫn Import
            </div>
            <p>File <span className="text-gray-900 dark:text-white font-bold">.txt</span>, mỗi dòng chứa 1 SĐT theo định dạng: <code className="text-gold font-mono bg-gold/10 px-1.5 py-0.5 rounded">SĐT|LinkOTP</code></p>
            <p>Ví dụ: <code className="text-indigo-400 font-mono bg-indigo-400/10 px-1.5 py-0.5 rounded">5093810744|https://sms222.us?token=1JT15yAhcw04232054</code></p>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════
           TAB 2: NHÂN VIÊN
         ══════════════════════════════════════════════════════ */}
      {activeTab === "staff" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1"
        >
          {/* ── Left: Employee List ───────────────────────── */}
          <div className="lg:col-span-4 bg-white dark:bg-sidebar border border-gray-200 dark:border-white/5 rounded-[32px] p-6 shadow-xl space-y-4">
            <h3 className="text-md font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Users size={18} className="text-gold" />
              Nhân viên Online
            </h3>

            {/* Search employees */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={14} />
              <input
                placeholder="Tìm tên hoặc username..."
                className="w-full bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl pl-9 pr-4 h-9 text-xs text-gray-900 dark:text-white outline-none focus:border-gold/50 transition-all"
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {(employeeBreakdown || []).filter((e) => {
                if (!e.isOnline) return false;
                if (!staffSearch.trim()) return true;
                const q = staffSearch.toLowerCase();
                return (e.name || "").toLowerCase().includes(q) || (e.username || "").toLowerCase().includes(q);
              }).length === 0 && (
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest text-center py-6">
                  {staffSearch.trim() ? "Không tìm thấy nhân viên" : "Không có nhân viên nào online"}
                </p>
              )}
              {employeeBreakdown
                .filter((e) => {
                  if (!e.isOnline) return false;
                  if (!staffSearch.trim()) return true;
                  const q = staffSearch.toLowerCase();
                  return (e.name || "").toLowerCase().includes(q) || (e.username || "").toLowerCase().includes(q);
                })
                .map((emp) => {
                  const isSelected = selectedEmpUsername === emp.username;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmpUsername(emp.username)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all group ${
                        isSelected
                          ? "bg-gold/5 border-gold/30 shadow-lg shadow-gold/5"
                          : "bg-white/[0.01] border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`text-sm font-black ${isSelected ? "text-gold" : "text-gray-900 dark:text-white"}`}>
                            {emp.name}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">@{emp.username}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`text-xs font-black ${emp.total > 0 ? "text-indigo-400" : "text-gray-600"}`}>
                            {emp.total} SĐT
                          </div>
                          <ChevronRight
                            size={14}
                            className={`transition-colors ${isSelected ? "text-gold" : "text-gray-600 group-hover:text-gray-900 dark:group-hover:text-gray-900 dark:text-white"}`}
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
              <div className="bg-white dark:bg-sidebar border border-gray-200 dark:border-white/5 rounded-[32px] p-12 shadow-xl flex flex-col items-center justify-center text-center">
                <UserCheck size={48} className="text-gray-700 mb-4" />
                <h3 className="text-lg font-black text-gray-500 uppercase tracking-widest">
                  Chọn nhân viên để xem chi tiết
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Bấm vào tên nhân viên bên trái để quản lý SĐT của họ
                </p>
              </div>
            ) : (
              <>
                {/* Employee Header + Actions */}
                <div className="bg-white dark:bg-sidebar border border-gray-200 dark:border-white/5 rounded-[32px] p-6 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
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
                          className="h-10 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-gray-900 dark:text-white font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
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
                      { label: "Tổng", value: empStats.total, color: "text-indigo-400" },
                      { label: "Chưa làm", value: empStats.pending, color: "text-gray-600 dark:text-gray-400" },
                      { label: "XM lần 1", value: empStats.xm1, color: "text-yellow-500" },
                      { label: "XM lần 2", value: empStats.xm2, color: "text-green-500" },
                      { label: "Lỗi", value: empStats.err, color: "text-red-500" },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl p-3 text-center">
                        <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                        <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest mt-0.5">{s.label}</div>
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
                <div className="bg-white dark:bg-sidebar border border-gray-200 dark:border-white/5 rounded-[32px] p-6 shadow-xl">
                  <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mb-4">
                    <Phone size={16} className="text-gold" />
                    Danh sách SĐT của {selectedEmp.name}
                  </h4>
                  <div className="overflow-y-auto max-h-[400px] custom-scrollbar border border-gray-200 dark:border-white/5 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-white dark:bg-[#0c0c0c] text-gray-500 uppercase font-black text-[9px] tracking-wider z-10 border-b border-gray-200 dark:border-white/5">
                        <tr>
                          <th className="py-3 px-4">STT</th>
                          <th className="py-3 px-4">Số điện thoại</th>
                          <th className="py-3 px-4">Link OTP</th>
                          <th className="py-3 px-4">Ngày giao</th>
                          <th className="py-3 px-4 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-700 dark:text-gray-300">
                        {(empPhones || []).map((p, idx) => (
                          <tr
                            key={p.id}
                            className={`hover:bg-white/[0.01] transition-colors ${
                              p.status === "Lỗi"
                                ? "bg-red-500/[0.03]"
                                : p.status === "XM lần 2"
                                ? "bg-green-500/[0.03]"
                                : ""
                            }`}
                          >
                            <td className="py-3 px-4 text-gray-500 font-bold">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold text-gray-900 dark:text-white font-mono text-sm">{p.number}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono text-[10px] max-w-[240px] truncate">
                              {p.otpLink ? (
                                <a href={p.otpLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
                                  {p.otpLink}
                                </a>
                              ) : (
                                <span className="text-gray-600 italic">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-500 font-mono">{p.assignedAt || "—"}</td>
                            <td className="py-3 px-4 text-center">
                              <StatusBadge status={p.status} />
                            </td>
                          </tr>
                        ))}
                        {(empPhones || []).length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-gray-600 font-bold uppercase tracking-widest">
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

      {/* Import History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 text-left"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-sidebar border border-gray-300 dark:border-white/10 rounded-[32px] p-8 w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
                    <FileText className="text-gold" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">LỊCH SỬ IMPORT HỆ THỐNG</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Nhật ký danh sách nhập dữ liệu</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(importHistory || []).length > 0 && (
                    <button
                      onClick={handleClearAllHistory}
                      className="h-9 px-3.5 bg-red-500/10 border border-red-500/25 hover:bg-red-500/25 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                    >
                      <Trash2 size={13} /> Xóa tất cả
                    </button>
                  )}
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 mb-6 bg-gray-100 dark:bg-white/5 p-1 rounded-xl w-fit">
                {["ALL", "MAIL", "SĐT"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setHistoryTab(tab as any)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      historyTab === tab
                        ? "bg-gold text-sidebar shadow-md"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white"
                    }`}
                  >
                    {tab === "ALL" ? "Tất cả" : tab}
                  </button>
                ))}
              </div>

              {/* List Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 scrollbar-hide">
                {(filteredHistory || []).length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 border border-gray-300 dark:border-white/10">
                      <FileText className="text-gray-600" size={28} />
                    </div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Không có lịch sử nhập dữ liệu</p>
                    <p className="text-[10px] text-gray-600 mt-1">Các lượt import mới sẽ tự động được ghi nhận tại đây.</p>
                  </div>
                ) : (
                  (filteredHistory || []).map((item: any) => (
                    <div
                      key={item.id}
                      className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-gray-300 dark:hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon / Badge */}
                        <div
                          className={`h-11 w-11 rounded-xl flex items-center justify-center border font-mono text-[10px] font-black tracking-widest ${
                            item.type === "MAIL"
                              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                              : "bg-gold/10 text-gold border-gold/20"
                          }`}
                        >
                          {item.type}
                        </div>
                        
                        {/* Details */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black text-gray-900 dark:text-white font-mono break-all">{item.fileName}</span>
                            <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/25 px-2 py-0.5 rounded-md font-black">
                              +{item.quantity} {item.type === "MAIL" ? "mail" : "số"}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-[10px] text-gray-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} className="text-gray-600" />
                              {item.importedAt}
                            </span>
                            <span className="flex items-center gap-1">
                              <UserIcon size={12} className="text-gray-600" />
                              Người nhập: <strong className="text-gray-600 dark:text-gray-400">{item.importedBy}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Delete Individual Row */}
                      <button
                        onClick={() => handleDeleteHistoryRow(item.id)}
                        className="h-8 w-8 rounded-lg bg-red-500/5 hover:bg-red-500/10 text-red-500/60 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-red-500/0 hover:border-red-500/20"
                        title="Xóa dòng lịch sử này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
