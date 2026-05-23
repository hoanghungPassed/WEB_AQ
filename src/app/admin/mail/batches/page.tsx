"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Database, 
  Trash2, 
  X, 
  ArrowLeft, 
  Layers, 
  AlertCircle, 
  User, 
  Calendar, 
  Mail, 
  Search,
  CheckCircle2,
  FolderOpen,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface BatchItem {
  id: string;
  name: string;
  type: "ROOT" | "SATELLITE" | "MONETIZED";
  importedAt: string;
  mailCount: number;
  importedBy: string;
  assignedTo?: string;
}

export default function BatchesManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [toastMsg, setToastMsg] = useState("");
  
  // Cascade Delete states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<BatchItem | null>(null);
  
  // Batch detail popup states
  const [selectedBatchForDetail, setSelectedBatchForDetail] = useState<BatchItem | null>(null);
  const [detailSearchTerm, setDetailSearchTerm] = useState("");
  const [detailMails, setDetailMails] = useState<any[]>([]);
  const [detailCopyToast, setDetailCopyToast] = useState("");

  // Roll-over assignment states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaffForAssign, setSelectedStaffForAssign] = useState("");
  const [selectedBatchNameForAssign, setSelectedBatchNameForAssign] = useState("Lô 1");
  const [staffList, setStaffList] = useState<any[]>([]);

  useEffect(() => {
    // Authenticate Roles
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

    const loadBatches = async () => {
      try {
        const savedBatches = localStorage.getItem("global_batches");
        const res = await fetch("/api/admin/mails");
        const data = await res.json();
        const mails = data.success && data.data ? data.data : [];

        if (!savedBatches || JSON.parse(savedBatches).length === 0) {
          // Dynamic Fallback Seeding
          const batchesMap: Record<string, BatchItem> = {};
          mails.forEach((m: any) => {
            if (m.batchName) {
              const key = m.batchId || `${m.type}-${m.batchName}`;
              if (!batchesMap[key]) {
                batchesMap[key] = {
                  id: m.batchId || `batch-seed-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  name: m.batchName,
                  type: m.type as any,
                  importedAt: m.createdAt || new Date().toISOString().split("T")[0],
                  mailCount: 0,
                  importedBy: m.importedBy || m.updatedBy || "Admin",
                  assignedTo: m.assignedTo || "Chưa phân công"
                };
              }
              batchesMap[key].mailCount++;
              if (m.assignedTo && batchesMap[key].assignedTo === "Chưa phân công") {
                batchesMap[key].assignedTo = m.assignedTo;
              }
            }
          });
          const seeded = Object.values(batchesMap);
          localStorage.setItem("global_batches", JSON.stringify(seeded));
          setBatches(seeded);
        } else {
          const parsedBatches = JSON.parse(savedBatches);
          // Sync counting to ensure accurate display
          const updated = (parsedBatches || []).map((b: BatchItem) => {
            const batchMails = (mails || []).filter((m: any) => {
              if (m.batchId) {
                return m.batchId === b.id;
              }
              return m.batchName === b.name;
            });
            const count = (batchMails || []).length;
            const assignedUsernames = Array.from(new Set((batchMails || []).map((m: any) => m.assignedTo).filter(Boolean)));
            const assignedTo = (assignedUsernames || []).length > 0 ? assignedUsernames.join(", ") : "Chưa phân công";
            return { ...b, mailCount: count, assignedTo };
          });
          setBatches(updated);
        }

        // Load Staff
        const savedUsers = localStorage.getItem("global_users");
        const list = savedUsers ? JSON.parse(savedUsers) : [];
        const filtered = (list || []).filter((u: any) => u.role === "04" || u.role === "03" || u.role === "NHÂN VIÊN" || u.role === "QUẢN LÝ NHÂN SỰ");
        setStaffList(filtered);
      } catch (err) {
        console.error("Lỗi khi load batches từ API", err);
      }
    };

    loadBatches();
    window.addEventListener("storage", loadBatches);
    return () => window.removeEventListener("storage", loadBatches);
  }, []);

  const assignmentPreview = useMemo(() => {
    if (!showAssignModal) return null;
    const savedMails = localStorage.getItem("global_mails_data");
    const allMails = savedMails ? JSON.parse(savedMails) : [];
    // Filter satellite mails only
    const satelliteMails = (allMails || []).filter((m: any) => m.type === "SATELLITE");
    
    // Find first block of 17 unassigned mails
    const unassigned = (satelliteMails || []).filter((m: any) => !m.assigneeId);
    
    // Take first 17
    const range = unassigned.slice(0, 17);
    if ((range || []).length === 0) {
      return {
        mailsToAssign: [],
        displayText: "Kho mail vệ tinh không còn mail nào trống!",
        count: 0
      };
    }
    
    const firstSTT = range[0].id - 1000;
    const lastSTT = range[(range || []).length - 1].id - 1000;
    
    return {
      mailsToAssign: range,
      displayText: `Chọn mail: ${(range || []).length} mail (${firstSTT} đến ${lastSTT})`,
      count: (range || []).length
    };
  }, [showAssignModal, batches]);

  const handleAssignBatch = async () => {
    if (!selectedStaffForAssign) {
      triggerToast("Vui lòng chọn nhân viên nhận việc trước!");
      return;
    }
    if (!assignmentPreview || assignmentPreview.count === 0) {
      triggerToast("Không có dải mail trống nào để gán!");
      return;
    }
    
    const staff = staffList.find(s => String(s.id) === String(selectedStaffForAssign) || s.username === selectedStaffForAssign);
    if (!staff) {
      triggerToast("Nhân viên không tồn tại!");
      return;
    }
    
    const savedMails = localStorage.getItem("global_mails_data");
    const allMails = savedMails ? JSON.parse(savedMails) : [];
    
    const targetIds = new Set((assignmentPreview.mailsToAssign || []).map((m: any) => m.id));
    const now = new Date().toISOString();
    
    const updatedMails = (allMails || []).map((m: any) => {
      if (targetIds.has(m.id)) {
        return {
          ...m,
          assigneeId: staff.id || staff.username,
          assignedTo: staff.name,
          batchName: selectedBatchNameForAssign,
          batchId: `batch-${selectedBatchNameForAssign.replace(/\s+/g, '-').toLowerCase()}`,
          lastUpdated: now,
          updatedAt: now,
          updatedBy: user?.name || "Admin"
        };
      }
      return m;
    });
    
    localStorage.setItem("global_mails_data", JSON.stringify(updatedMails));
    
    // Make sure the batch object is in global_batches
    const savedBatches = localStorage.getItem("global_batches");
    const existingBatches = savedBatches ? JSON.parse(savedBatches) : [];
    const batchId = `batch-${selectedBatchNameForAssign.replace(/\s+/g, '-').toLowerCase()}`;
    const hasBatch = existingBatches.some((b: any) => b.name === selectedBatchNameForAssign && b.type === "SATELLITE");
    
    let updatedBatches = [...existingBatches];
    if (!hasBatch) {
      updatedBatches.push({
        id: batchId,
        name: selectedBatchNameForAssign,
        type: "SATELLITE",
        importedAt: new Date().toISOString().split("T")[0],
        mailCount: assignmentPreview.count,
        importedBy: user?.name || "Admin"
      });
      localStorage.setItem("global_batches", JSON.stringify(updatedBatches));
    }
    
    // Dispatch storage event
    window.dispatchEvent(new Event("storage"));
    
    // Sync to backend if needed
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          global_mails_data: JSON.stringify(updatedMails),
          global_batches: JSON.stringify(updatedBatches)
        })
      });
    } catch (e) {
      // safe fallback
    }
    
    // Log system activity
    const existingLogs = localStorage.getItem("global_system_logs");
    const logsList = existingLogs ? JSON.parse(existingLogs) : [];
    const newLog = {
      id: `log-${Date.now()}`,
      user: user?.name || "Admin",
      role: "ADMIN",
      action: `Gán dải lô cuốn chiếu ${selectedBatchNameForAssign} cho ${staff.name} (${assignmentPreview.displayText})`,
      type: "SUCCESS",
      timestamp: new Date().toLocaleString("vi-VN")
    };
    localStorage.setItem("global_system_logs", JSON.stringify([newLog, ...logsList]));

    // Push real-time notification for target staff member
    const existingNotifs = localStorage.getItem("admin_notifications");
    const notifList = existingNotifs ? JSON.parse(existingNotifs) : [];
    const newNotif = {
      id: `notif-${Date.now()}`,
      title: "Giao việc Cuốn Chiếu",
      message: `Bạn được giao ${assignmentPreview.count} mail vệ tinh mới thuộc Lô "${selectedBatchNameForAssign}" (${assignmentPreview.displayText}).`,
      time: new Date().toLocaleTimeString("vi-VN") + " - " + new Date().toLocaleDateString("vi-VN"),
      type: "ASSIGNMENT",
      read: false,
      targetUsername: staff.username
    };
    localStorage.setItem("admin_notifications", JSON.stringify([newNotif, ...notifList]));
    window.dispatchEvent(new Event("storage"));
    
    setShowAssignModal(false);
    triggerToast(`Gán thành công ${assignmentPreview.count} mail cho ${staff.name}!`);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "---";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    if (!selectedBatchForDetail) return;
    const loadDetailMails = async () => {
      try {
        const res = await fetch("/api/admin/mails");
        const data = await res.json();
        const mails = data.success && data.data ? data.data : [];
        const filtered = mails.filter((m: any) => m.batchId === selectedBatchForDetail.id || m.batchName === selectedBatchForDetail.name);
        // Sort by STT
        filtered.sort((a: any, b: any) => {
          const aStt = a.stt || a.id || 0;
          const bStt = b.stt || b.id || 0;
          return aStt - bStt;
        });
        setDetailMails(filtered);
      } catch (e) {
        console.error("Lỗi khi load detail mails", e);
      }
    };
    loadDetailMails();
    // Re-fetch when localStorage changes (optional but good for sync)
    window.addEventListener("storage", loadDetailMails);
    return () => window.removeEventListener("storage", loadDetailMails);
  }, [selectedBatchForDetail]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleConfirmDelete = async () => {
    if (!batchToDelete) return;

    // Filter out deleted batch from local state and storage
    const updatedBatches = (batches || []).filter(b => b.id !== batchToDelete.id);
    setBatches(updatedBatches);
    localStorage.setItem("global_batches", JSON.stringify(updatedBatches));

    // Cascade delete mails matching this batchId or batchName
    const savedMails = localStorage.getItem("global_mails_data");
    const allMails = savedMails ? JSON.parse(savedMails) : [];
    const remainingMails = (allMails || []).filter((m: any) => 
      m.batchId !== batchToDelete.id && m.batchName !== batchToDelete.name
    );

    localStorage.setItem("global_mails_data", JSON.stringify(remainingMails));
    window.dispatchEvent(new Event("storage"));

    // Sync state
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          global_batches: JSON.stringify(updatedBatches),
          global_mails_data: JSON.stringify(remainingMails)
        })
      });

      // Delete from MongoDB
      const queryParams = new URLSearchParams();
      if (batchToDelete.id && !batchToDelete.id.startsWith("batch-seed-")) {
        queryParams.append("batchId", batchToDelete.id);
      } else {
        queryParams.append("batchName", batchToDelete.name);
      }
      
      await fetch(`/api/admin/mails?${queryParams.toString()}`, {
        method: "DELETE"
      });

    } catch (e) {
      console.error("Sync error:", e);
    }

    // Add activity log
    const existingLogs = localStorage.getItem("global_system_logs");
    const logsList = existingLogs ? JSON.parse(existingLogs) : [];
    const newLog = {
      id: `log-${Date.now()}`,
      user: user?.name || "Admin",
      role: user?.role === "01" ? "ADMIN" : "QL CÔNG VIỆC",
      action: `Xóa Lô Mail "${batchToDelete.name}" và toàn bộ ${batchToDelete.mailCount} tài khoản thuộc lô này`,
      type: "WARNING",
      timestamp: new Date().toLocaleString("vi-VN")
    };
    localStorage.setItem("global_system_logs", JSON.stringify([newLog, ...logsList]));

    setBatchToDelete(null);
    setShowDeleteConfirm(false);
    triggerToast(`Đã xóa Lô "${batchToDelete.name}" và toàn bộ ${batchToDelete.mailCount} mail thuộc lô thành công!`);
  };

  const filteredBatches = (batches || []).filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (b.importedBy || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (b.assignedTo || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "ALL" || b.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeName = (t: string) => {
    if (t === "ROOT") return "Mail Gốc";
    if (t === "SATELLITE") return "Mail Vệ Tinh";
    if (t === "MONETIZED") return "Mail BKT";
    return t;
  };

  const getTypeStyle = (t: string) => {
    if (t === "ROOT") return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    if (t === "SATELLITE") return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  };

  const getCardBorder = (t: string) => {
    if (t === "ROOT") return "border-t-indigo-500/80 hover:border-indigo-500/40";
    if (t === "SATELLITE") return "border-t-sky-500/80 hover:border-sky-500/40";
    return "border-t-emerald-500/80 hover:border-emerald-500/40";
  };

  // High-level statistics counts
  const stats = useMemo(() => {
    const total = (batches || []).length;
    const rootCount = (batches || []).filter(b => b.type === "ROOT").length;
    const satelliteCount = (batches || []).filter(b => b.type === "SATELLITE").length;
    const monetizedCount = (batches || []).filter(b => b.type === "MONETIZED").length;
    const totalMails = batches.reduce((sum, b) => sum + b.mailCount, 0);

    return { total, rootCount, satelliteCount, monetizedCount, totalMails };
  }, [batches]);

  return (
    <div className="h-full flex flex-col space-y-6 pb-6 relative">
      {/* Toast Announcement */}
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

      {/* Red Cascade Delete Warning Modal */}
      <AnimatePresence>
        {showDeleteConfirm && batchToDelete && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[150] bg-white/90 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121212] border border-red-500/30 rounded-[32px] p-8 w-full max-w-md shadow-2xl flex flex-col"
            >
              <div className="flex items-center gap-4 mb-6 flex-shrink-0">
                <div className="h-12 w-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500">
                  <AlertCircle size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Xóa Lô Mail</h3>
                  <p className="text-[10px] text-red-500/70 font-black uppercase tracking-widest mt-0.5">Cảnh báo Cascade Delete</p>
                </div>
              </div>

              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 mb-6 text-xs text-gray-700 dark:text-gray-300 font-bold leading-relaxed">
                Bạn có chắc chắn muốn xóa Lô <span className="text-red-400 font-black">"{batchToDelete.name}"</span> và toàn bộ <span className="text-red-400 font-black">{batchToDelete.mailCount} mail</span> thuộc lô này không? Hành động này không thể hoàn tác.
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setBatchToDelete(null);
                    setShowDeleteConfirm(false);
                  }} 
                  className="flex-1 h-12 rounded-xl border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white font-bold uppercase text-xs tracking-widest hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleConfirmDelete} 
                  className="flex-1 h-12 rounded-xl bg-red-500 text-gray-900 dark:text-white font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-500/10"
                >
                  Xác nhận xóa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
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
              <Database className="text-gold" size={28} />
              Quản Lý Lô Mail (Batches)
            </h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">
              Hệ thống lô import tài khoản phân bố theo ô lưới trực quan
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={16} />
            <input 
              placeholder="Tìm kiếm Lô, Người quản lý, Người import..."
              className="bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl pl-10 pr-4 h-10 text-xs text-gray-900 dark:text-white outline-none focus:border-gold/50 transition-all w-60"
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-4 h-10 text-xs text-gold font-bold uppercase tracking-wider outline-none focus:border-gold cursor-pointer transition-all"
          >
            <option value="ALL" className="bg-white dark:bg-sidebar text-gray-900 dark:text-white">Tất cả phân loại</option>
            <option value="ROOT" className="bg-white dark:bg-sidebar text-gray-900 dark:text-white">Mail Gốc</option>
            <option value="SATELLITE" className="bg-white dark:bg-sidebar text-gray-900 dark:text-white">Mail Vệ Tinh</option>
            <option value="MONETIZED" className="bg-white dark:bg-sidebar text-gray-900 dark:text-white">Mail BKT</option>
          </select>

          <button
            onClick={() => setShowAssignModal(true)}
            className="bg-gold hover:bg-gold-hover text-sidebar font-black uppercase text-xs tracking-widest px-5 h-10 rounded-xl transition-all shadow-lg shadow-gold/20 flex items-center gap-2"
          >
            <Layers size={16} />
            Gán Lô Cuốn Chiếu
          </button>
        </div>
      </div>

      {/* Premium Dashboard Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-sidebar/40 border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Tổng số Lô</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stats.total} <span className="text-xs text-gray-500">Lô</span></span>
        </div>
        <div className="bg-white dark:bg-sidebar/40 border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Lô Mail Gốc</span>
          <span className="text-2xl font-black text-indigo-400 mt-1">{stats.rootCount} <span className="text-xs text-gray-500">Lô</span></span>
        </div>
        <div className="bg-white dark:bg-sidebar/40 border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Lô Vệ Tinh</span>
          <span className="text-2xl font-black text-sky-400 mt-1">{stats.satelliteCount} <span className="text-xs text-gray-500">Lô</span></span>
        </div>
        <div className="bg-white dark:bg-sidebar/40 border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Lô Mail BKT</span>
          <span className="text-2xl font-black text-emerald-400 mt-1">{stats.monetizedCount} <span className="text-xs text-gray-500">Lô</span></span>
        </div>
        <div className="bg-white dark:bg-sidebar/40 border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-[9px] font-black text-gold uppercase tracking-widest">Tổng số Mail</span>
          <span className="text-2xl font-black text-gold mt-1">{stats.totalMails} <span className="text-xs text-gray-500">Mail</span></span>
        </div>
      </div>

      {/* Grid view of Batch Cards ("Dạng ô") */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
        {(filteredBatches || []).length > 0 ? (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence>
              {(filteredBatches || []).map((batch, index) => (
                <motion.div
                  key={batch.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setSelectedBatchForDetail(batch)}
                  className={`bg-white dark:bg-sidebar border border-gray-200 dark:border-white/5 border-t-4 ${getCardBorder(batch.type)} rounded-[24px] p-6 shadow-xl hover:shadow-2xl flex flex-col justify-between relative group transition-all cursor-pointer hover:bg-white/[0.01] hover:scale-[1.01]`}
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black tracking-widest uppercase border ${getTypeStyle(batch.type)}`}>
                        {getTypeName(batch.type)}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setBatchToDelete(batch);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white transition-all opacity-40 group-hover:opacity-100"
                        title="Xóa Lô Mail"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Batch Name */}
                    <h3 className="text-md font-black text-gray-900 dark:text-white mt-4 uppercase tracking-tight group-hover:text-gold transition-colors leading-tight">
                      {batch.name}
                    </h3>

                    {/* Dynamic Graphic Counter */}
                    <div className="flex items-baseline gap-1.5 my-3 bg-black/10 rounded-xl p-3 border border-white/[0.02]">
                      <span className="text-3xl font-black text-gold tracking-tighter leading-none">{batch.mailCount}</span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Tài khoản Mail</span>
                    </div>
                  </div>

                  {/* Footer details */}
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400 font-bold">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={12} className="text-gray-500" />
                        Ngày import:
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 font-mono">{formatDate(batch.importedAt)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400 font-bold">
                      <span className="inline-flex items-center gap-1.5">
                        <User size={12} className="text-gray-500" />
                        Người quản lý:
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 font-black text-indigo-400">{batch.assignedTo || "Chưa phân công"}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400 font-bold">
                      <span className="inline-flex items-center gap-1.5">
                        <User size={12} className="text-gray-500" />
                        Người import:
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{batch.importedBy || "Admin"}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="h-60 rounded-3xl border border-gray-200 dark:border-white/5 bg-white dark:bg-sidebar/20 flex flex-col items-center justify-center text-center p-6">
            <FolderOpen size={48} className="text-gray-600 mb-3" />
            <h4 className="text-gray-900 dark:text-white font-black uppercase tracking-tight">Không tìm thấy lô mail nào</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">Thử đổi từ khóa tìm kiếm hoặc phân loại để tìm kiếm lô tương ứng</p>
          </div>
        )}
      </div>
      {/* Detail Batch Mails Modal */}
      <AnimatePresence>
        {selectedBatchForDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-white/90 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#121212] border border-gold/25 rounded-[36px] p-6 w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col justify-between"
            >
              {/* Toast for copy inside Modal */}
              <AnimatePresence>
                {detailCopyToast && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-6 left-1/2 -translate-x-1/2 z-[200] bg-gold px-4 py-2 rounded-full text-sidebar font-black text-xs shadow-lg"
                  >
                    {detailCopyToast}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gold/15 text-gold border border-gold/20 rounded-xl flex items-center justify-center">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Chi Tiết Lô: {selectedBatchForDetail.name}</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                      Phân loại: <span className="text-gold">{getTypeName(selectedBatchForDetail.type)}</span> | Tổng: {selectedBatchForDetail.mailCount} Mail
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={14} />
                    <input 
                      placeholder="Tìm Email trong lô..."
                      className="bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl pl-9 pr-4 h-9 text-xs text-gray-900 dark:text-white outline-none focus:border-gold/50 transition-all w-48"
                      type="text" 
                      value={detailSearchTerm}
                      onChange={(e) => setDetailSearchTerm(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedBatchForDetail(null);
                      setDetailSearchTerm("");
                    }}
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Table wrapper with overflow */}
              <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar border border-gray-200 dark:border-white/5 bg-black/10 rounded-2xl mb-4">
                <table className="w-full text-left text-xs min-w-[900px]">
                  <thead className="sticky top-0 bg-white dark:bg-[#0c0c0c] text-gray-500 border-b border-gray-200 dark:border-white/5 z-10">
                    <tr>
                      <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">STT</th>
                      <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">Email</th>
                      <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">Recovery (KP)</th>
                      <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">Pass</th>
                      <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">2FA</th>
                      <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">SĐT</th>
                      <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px]">Link OTP</th>
                      <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px] text-center">Hệ thống</th>
                      <th className="py-3 px-4 font-black uppercase tracking-widest text-[9px] text-center">Công việc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-700 dark:text-gray-300">
                    {detailMails
                      .filter((m: any) => !detailSearchTerm || m.email.toLowerCase().includes(detailSearchTerm.toLowerCase()))
                      .map((mail: any, idx: number) => {
                        const copyToClipboard = (text: string, title: string) => {
                          if (!text) return;
                          navigator.clipboard.writeText(text);
                          setDetailCopyToast(`Đã sao chép ${title}!`);
                          setTimeout(() => setDetailCopyToast(""), 2000);
                        };
                        return (
                          <tr key={mail._id || mail.id || idx} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4 text-gray-500 font-bold">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold text-gray-900 dark:text-white cursor-pointer hover:text-gold transition-colors" onClick={() => copyToClipboard(mail.email, "Email")}>{mail.email}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gold transition-colors" onClick={() => copyToClipboard(mail.recovery || "", "Mail KP")}>{mail.recovery || "---"}</td>
                            <td className="py-3 px-4 font-mono text-gray-500 cursor-pointer hover:text-gold transition-colors" onClick={() => copyToClipboard(mail.pass || "", "Mật khẩu")}>{mail.pass || "---"}</td>
                            <td className="py-3 px-4 font-mono text-gray-500 cursor-pointer hover:text-gold transition-colors" onClick={() => copyToClipboard(mail.twoFA || "", "2FA Secret")}>{mail.twoFA || "---"}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-bold cursor-pointer hover:text-gold transition-colors" onClick={() => copyToClipboard(mail.phone || "", "SĐT")}>{mail.phone || "---"}</td>
                            <td className="py-3 px-4">
                              {mail.otpLink ? (
                                <a href={mail.otpLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Link OTP</a>
                              ) : <span className="text-gray-700">---</span>}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${mail.status === "LIVE" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
                                {mail.status || "LIVE"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${mail.workStatus === "Đã làm" || mail.workStatus === "Đã bán" ? "bg-green-500/10 text-green-500" : mail.workStatus === "Đang xử lí" ? "bg-yellow-500/10 text-yellow-500" : mail.workStatus === "Lỗi" ? "bg-red-500/10 text-red-500" : "bg-gray-500/10 text-gray-600 dark:text-gray-400"}`}>
                                {mail.workStatus || "Chưa làm"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    {(detailMails || []).length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-gray-600 font-bold uppercase tracking-widest">Không có mail nào trong lô này</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Close Button footer */}
              <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-white/5">
                <button
                  onClick={() => {
                    setSelectedBatchForDetail(null);
                    setDetailSearchTerm("");
                  }}
                  className="h-10 px-6 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white hover:border-gold/50 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roll-over Assignment Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[170] bg-white/95 dark:bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#121212] border border-gold/30 rounded-[36px] p-8 w-full max-w-xl shadow-2xl flex flex-col justify-between animate-fade-in"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gold/15 text-gold border border-gold/20 rounded-xl flex items-center justify-center">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Gán Lô Mail Cuốn Chiếu</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                      Tự động chọn dải mail trống từ Kho tổng
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-6 flex-1">
                {/* Select Employee */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Chọn nhân viên nhận việc</label>
                  <select
                    value={selectedStaffForAssign}
                    onChange={(e) => setSelectedStaffForAssign(e.target.value)}
                    className="w-full bg-black/40 border border-gray-300 dark:border-white/10 rounded-xl px-4 h-12 text-xs text-gold font-bold uppercase tracking-wider focus:border-gold/50 outline-none transition-all cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-sidebar text-gray-900 dark:text-white">-- Click chọn nhân viên --</option>
                    {(staffList || []).map((s) => (
                      <option key={s.id} value={s.id} className="bg-white dark:bg-sidebar text-gray-900 dark:text-white">
                        {s.name} ({s.username})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Batch Name Input/Select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Tên Lô Mail Gán</label>
                  <select
                    value={selectedBatchNameForAssign}
                    onChange={(e) => setSelectedBatchNameForAssign(e.target.value)}
                    className="w-full bg-black/40 border border-gray-300 dark:border-white/10 rounded-xl px-4 h-12 text-xs text-gold font-bold uppercase tracking-wider focus:border-gold/50 outline-none transition-all cursor-pointer"
                  >
                    {["Lô 1", "Lô 2", "Lô 3", "Lô 4", "Lô 5", "Lô 6", "Lô 7", "Lô 8", "Lô 9", "Lô 10"].map((l) => (
                      <option key={l} value={l} className="bg-white dark:bg-sidebar text-gray-900 dark:text-white">{l}</option>
                    ))}
                  </select>
                </div>

                {/* Automatic Range Preview Box */}
                {assignmentPreview && (
                  <div className="bg-gold/10 border border-gold/20 rounded-2xl p-5 space-y-3">
                    <span className="text-[9px] font-black text-gold uppercase tracking-widest block">Dải mail trống cuốn chiếu được tính toán</span>
                    
                    <p className="text-sm font-black text-gray-900 dark:text-white leading-none">
                      {assignmentPreview.displayText}
                    </p>

                    <div className="h-px bg-gray-100 dark:bg-white/5 my-2" />

                    <div className="flex items-center justify-between text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider">
                      <span>Tổng số mail gán:</span>
                      <span className="text-gold font-black font-mono">{assignmentPreview.count} Mail</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4 mt-8 pt-4 border-t border-gray-200 dark:border-white/5">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 h-12 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleAssignBatch}
                  disabled={!selectedStaffForAssign || !assignmentPreview || assignmentPreview.count === 0}
                  className="flex-1 h-12 bg-gold hover:bg-gold-hover text-sidebar font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-xl shadow-gold/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Xác nhận gán
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
